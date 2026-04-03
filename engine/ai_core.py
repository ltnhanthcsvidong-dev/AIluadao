import os
import json
import google.generativeai as genai
from PIL import Image

# Configure Gemini API
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    # Note: The user MUST set this environment variable to use the AI features.
    print("WARNING: GEMINI_API_KEY environment variable not set.")

genai.configure(api_key=API_KEY)

# Define the model
model = genai.GenerativeModel('gemini-2.5-flash')

PROMPT_8_PERSPECTIVES = """
Bạn là một hệ thống AI chuyên gia bảo mật đa năng, chuyên bảo vệ học sinh khỏi các hành vi lừa đảo trực tuyến (Scam/Phishing).
Hãy phân tích nội dung được cung cấp (văn bản và/hoặc hình ảnh) dưới đúng 8 góc nhìn chuyên sâu sau đây:

1. Security Expert (Chuyên gia Bảo mật): Phân tích kỹ thuật, dấu hiệu giả mạo, links đáng ngờ.
2. Linguistic Analyst (Chuyên gia Ngôn ngữ): Soi xét văn phong, lỗi chính tả, sự hối thúc hoặc đe dọa/dụ dỗ.
3. Behavioral Psychologist (Nhà Tâm lý học): Bóc tách đòn tâm lý đang được sử dụng (tham lam, sợ hãi, tò mò).
4. Attacker Perspective (Góc nhìn Kẻ tấn công): Hắn đang muốn chiếm đoạt cái gì? (OTP, tài khoản, tiền, dữ liệu).
5. Victim Perspective (Góc nhìn Nạn nhân): Nếu làm theo, hậu quả xấu nhất có thể xảy ra là gì?
6. Educator (Nhà Giáo dục): Bài học kinh nghiệm rút ra từ trường hợp này là gì?
7. Privacy Officer (Cán bộ Quyền riêng tư): Những dữ liệu cá nhân nào đang bị đe dọa?
8. Action Sidekick (Trợ lý Hành động): 3-5 bước hành động ngay lập tức (Chặn, báo cáo, đổi mật khẩu...).

QUY ĐỊNH PHẢN HỒI:
- Trả về kết quả dưới định dạng JSON duy nhất.
- Ngôn ngữ phản hồi: Tiếng Việt.
- Sử dụng ký tự xuống dòng (\n) để tách các ý chính (ví dụ: 1..., 2...). Trình bày theo dạng danh sách gạch đầu dòng hoặc đánh số để dễ đọc.
- Nếu nội dung HOÀN TOÀN AN TOÀN, hãy ghi nhận và giải thích lý do tại sao an toàn dưới 8 góc nhìn này.

Cấu trúc JSON mong muốn:
{
  "is_scam": boolean,
  "risk_level": "Low" | "Medium" | "High" | "Critical",
  "summary": "Tóm tắt ngắn gọn trong 1 câu",
  "perspectives": {
    "security": "...",
    "linguistic": "...",
    "psychology": "...",
    "attacker": "...",
    "victim": "...",
    "educator": "...",
    "privacy": "...",
    "action": "..."
  }
}
"""

def analyze_content(text="", image_path=None):
    if not API_KEY:
        return {"error": "GEMINI_API_KEY chưa được thiết lập. Vui lòng cấu hình biến môi trường."}

    content = [PROMPT_8_PERSPECTIVES]
    
    if text:
        content.append(f"NỘI DUNG VĂN BẢN: {text}")
    
    if image_path:
        img = Image.open(image_path)
        content.append(img)

    try:
        response = model.generate_content(content, generation_config={"response_mime_type": "application/json"})
        
        # Clean response text (handling potential unescaped control characters)
        raw_text = response.text.strip()
        
        # Sometime models wrap in markdown ```json ... ``` despite mime_type
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
        
        # Final safety strip
        raw_text = raw_text.strip()
        
        # Parse result
        result_json = json.loads(raw_text, strict=False) # strict=False handles some control chars
        return result_json
    except Exception as e:
        print(f"Error in Gemini: {str(e)}")
        # Fallback if JSON mode fails
        return {"error": f"Lỗi phân tích kết quả từ AI: {str(e)}"}
