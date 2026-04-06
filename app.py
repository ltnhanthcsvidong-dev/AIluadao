import os
import uuid
import logging
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import bleach

# Nạp biến môi trường từ file .env (nếu có)
load_dotenv()

# Kiểm tra SECRET_KEY
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("❌ FATAL: SECRET_KEY environment variable is required!")

from engine.ai_core import analyze_content
from engine.db_manager import save_scan, get_all_history, get_scan_by_id

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max
app.secret_key = SECRET_KEY

# Initialize rate limiter
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def sanitize_text(text, max_length=5000):
    """Sanitize and validate user input text"""
    if not text:
        return ""
    
    # Limit text length
    text = text[:max_length]
    
    # Remove HTML tags and potentially dangerous content
    text = bleach.clean(text, tags=[], strip=True)
    
    return text.strip()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
@limiter.limit("10 per minute")
def analyze():
    try:
        text_content = request.form.get('text_content', '').strip()
        image_file = request.files.get('image_file')
        
        # Validate input
        if not text_content and not image_file:
            return jsonify({"error": "Vui lòng cung cấp nội dung văn bản hoặc hình ảnh"}), 400
        
        # Sanitize text
        text_content = sanitize_text(text_content) if text_content else ""
        
        image_path = None
        if image_file:
            # Validate file
            if not allowed_file(image_file.filename):
                return jsonify({"error": "Định dạng ảnh không được hỗ trợ. Chỉ PNG, JPG, JPEG, WEBP được chấp nhận"}), 400
            
            if image_file.content_length and image_file.content_length > 16 * 1024 * 1024:
                return jsonify({"error": "Kích thước ảnh quá lớn (max 16MB)"}), 400
            
            # Save secured filename
            filename = secure_filename(f"{uuid.uuid4()}_{image_file.filename}")
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            image_file.save(image_path)
            logger.info(f"Image uploaded: {filename}")

        # Call AI Engine
        result = analyze_content(text_content, image_path)
        
        if not result.get("error"):
            try:
                save_scan(text_content, image_path, result)
            except Exception as db_error:
                logger.error(f"Database error: {db_error}")
                # Don't fail the response, but log the error
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Analyze endpoint error: {str(e)}", exc_info=True)
        return jsonify({"error": "Lỗi xử lý yêu cầu. Vui lòng thử lại sau."}), 500

@app.route('/history')
@limiter.limit("30 per minute")
def history():
    try:
        data = get_all_history()
        return jsonify(data)
    except Exception as e:
        logger.error(f"History endpoint error: {str(e)}")
        return jsonify({"error": "Lỗi lấy lịch sử. Vui lòng thử lại sau."}), 500

@app.route('/history/<int:scan_id>')
@limiter.limit("30 per minute")
def history_detail(scan_id):
    try:
        data = get_scan_by_id(scan_id)
        if data:
            return jsonify(data)
        return jsonify({"error": "Không tìm thấy"}), 404
    except Exception as e:
        logger.error(f"History detail endpoint error: {str(e)}")
        return jsonify({"error": "Lỗi lấy chi tiết lịch sử. Vui lòng thử lại sau."}), 500

@app.route('/api/top-scams')
@limiter.limit("30 per minute")
def top_scams():
    try:
        # Lấy 6 vụ lừa đảo nguy hiểm nhất (Risk level Critical/High), đảm bảo không trùng lặp tiêu đề
        data = get_all_history()
        unique_summaries = set()
        top = []
        for item in data:
            summary = item.get('summary', '').strip()
            if not summary:
                continue
                
            if item.get('risk_level') in ['Critical', 'High'] and summary not in unique_summaries:
                top.append(item)
                unique_summaries.add(summary)
            
            if len(top) >= 6:
                break
        return jsonify(top)
    except Exception as e:
        logger.error(f"Top scams endpoint error: {str(e)}")
        return jsonify({"error": "Lỗi lấy top scams. Vui lòng thử lại sau."}), 500

@app.route('/api/stats')
@limiter.limit("30 per minute")
def stats():
    try:
        from engine.db_manager import get_stats as fetch_stats, get_daily_trends
        data = fetch_stats()
        data['trends'] = get_daily_trends()
        return jsonify(data)
    except Exception as e:
        logger.error(f"Stats endpoint error: {str(e)}")
        return jsonify({"error": "Lỗi lấy thống kê. Vui lòng thử lại sau."}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
