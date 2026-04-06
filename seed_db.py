import sqlite3
import json
import random
import os
from datetime import datetime, timedelta

DB_PATH = os.environ.get('DATABASE_PATH', 'database.db')

scam_templates = [
    {
        "text": "Sự kiện đặc biệt: Nhận ngay 999,999 Kim cương Free Fire miễn phí chỉ cần đăng nhập tại http://nhankimcuong-ff.com. Nhanh tay số lượng có hạn!",
        "risk": "Critical", "is_scam": True, "summary": "Lừa đảo nạp Kim cương lậu (Game)"
    },
    {
        "text": "[THÔNG BÁO] Tài khoản Facebook của em đang vi phạm tiêu chuẩn cộng đồng và sẽ bị khóa sau 24h. Xác minh ngay tại: http://hotro-taikhoan-fb.top",
        "risk": "High", "is_scam": True, "summary": "Giả mạo hỗ trợ Facebook để hack nick"
    },
    {
        "text": "Tuyển các bạn học sinh làm CTV duyệt đơn hàng online tại nhà. Lương 50k-100k/giờ, chỉ cần điện thoại. Nhắn tin Zalo để nhận việc ngay!",
        "risk": "High", "is_scam": True, "summary": "Lừa đảo tuyển dụng 'việc nhẹ lương cao'"
    },
    {
        "text": "Chào em, chị thấy ảnh em rất xinh. Bên chị đang tuyển người mẫu ảnh nhí cho shop quần áo. Em nhấn vào link này để đăng ký nhé...",
        "risk": "Medium", "is_scam": True, "summary": "Dụ dỗ trẻ em tham gia mạng lưới lừa đảo/phản cảm"
    },
    {
        "text": "Chúc mừng em! Em là người may mắn nhận được 1 thẻ cào 500k từ sự kiện 'Học sinh giỏi'. Nhấn vào đây để nhận mã thẻ: http://nhanthecao-free.net",
        "risk": "High", "is_scam": True, "summary": "Lừa đảo tặng thẻ cào điện thoại"
    },
    {
        "text": "Mình có bộ tài liệu ôn thi học kỳ 2 cực chuẩn cho lớp 8, ai cần thì nhấn vào link drive này mình share free nhé!",
        "risk": "Low", "is_scam": False, "summary": "Chia sẻ tài liệu học tập an toàn"
    },
    {
        "text": "Lớp mình ơi, cô dặn mai mang đầy đủ sách bài tập Toán và mặc đồng phục đúng quy định nhé các em.",
        "risk": "Low", "is_scam": False, "summary": "Thông báo nhắc nhở từ giáo viên"
    },
    {
        "text": "Tớ nghe nói có cách xem được ai đang thầm thương trộm nhớ mình trên Facebook ấy, cậu thử không? Link này này: http://ai-crush-you.com",
        "risk": "Medium", "is_scam": True, "summary": "Dùng tính tò mò lứa tuổi để cài mã độc"
    }
]

def seed_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("Sowing seed data...")
    
    for i in range(25):
        template = random.choice(scam_templates)
        # Tạo thời gian ngẫu nhiên trong 7 ngày qua
        days_ago = random.randint(0, 7)
        hours_ago = random.randint(0, 23)
        timestamp = (datetime.now() - timedelta(days=days_ago, hours=hours_ago)).strftime('%Y-%m-%d %H:%M:%S')
        
        perspectives = {
            "security": "Phát hiện link lạ hoặc dấu hiệu giả mạo cấu trúc.",
            "linguistic": "Văn phong hối thúc hoặc lỗi chính tả cơ bản.",
            "psychology": "Đánh vào lòng tham hoặc nỗi sợ hãi.",
            "attacker": "Muốn chiếm đoạt tài khoản hoặc tiền.",
            "victim": "Mất tiền hoặc lộ thông tin cá nhân.",
            "educator": "Cần kiểm tra lại nguồn tin chính thống.",
            "privacy": "Dữ liệu cá nhân có thể bị bán cho bên thứ ba.",
            "action": "Tuyệt đối không click vào link và chặn số."
        }
        
        cursor.execute('''
            INSERT INTO scan_history (timestamp, text_content, is_scam, risk_level, summary, perspectives)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            timestamp,
            template['text'],
            1 if template['is_scam'] else 0,
            template['risk'],
            template['summary'],
            json.dumps(perspectives)
        ))
    
    conn.commit()
    conn.close()
    print("Successfully added 25 seed records!")

if __name__ == '__main__':
    seed_data()
