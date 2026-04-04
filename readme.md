# AI Scam Detection System - Hệ Thống Phát Hiện Lừa Đảo AI

Hệ thống AI thông minh giúp bảo vệ người dùng (đặc biệt là học sinh) khỏi các hành vi lừa đảo trực tuyến (Scam/Phishing) thông qua phân tích nội dung văn bản và hình ảnh đa chiều.

## 🚀 Tính Năng Chính
- **Phân Tích Đa Chiều (8 Perspectives):** AI không chỉ nói "đúng" hay "sai" mà còn phân tích từ 8 góc độ chuyên gia (Bảo mật, Ngôn ngữ, Tâm lý, Kẻ tấn công, Nạn nhân, Giáo dục, Quyền riêng tư và Hành động).
- **Hỗ Trợ Đa Phương Thức (Multimodal):** Phân tích cả văn bản thuần túy và hình ảnh (ảnh chụp màn hình tin nhắn, email lừa đảo, trang web giả mạo).
- **Báo Cáo Thời Gian Thực:** Giao diện Glassmorphism hiện đại, hiển thị kết quả phân tích ngay lập tức với mức độ rủi ro (Low, Medium, High, Critical).
- **Dashboard Thống Kê:** Trực quan hóa dữ liệu về xu hướng lừa đảo, tỷ lệ lừa đảo và mức độ nguy hiểm thông qua các biểu đồ động (Chart.js).
- **Lịch Sử Quét:** Tự động lưu trữ và cho phép xem lại các nội dung đã được quét để rút kinh nghiệm.

## 🛠️ Công Nghệ Sử Dụng
- **Backend:** Flask (Python)
- **AI Core:** Google Gemini 2.5 Flash
- **Frontend:** Vanilla CSS (Glassmorphism), JavaScript (ES6+), Chart.js
- **Database:** SQLite
- **Security:** Flask-Limiter, Bleach (Input Sanitization)

## 📦 Cấu Trúc Dự Án
```text
├── app.py              # File chính chạy ứng dụng Flask
├── engine/             # Logic cốt lõi
│   ├── ai_core.py      # Xử lý kết nối và Prompt cho Gemini AI
│   └── db_manager.py   # Quản lý cơ sở dữ liệu SQLite
├── static/             # Assets (CSS, JS, Images)
├── templates/          # Giao diện HTML
├── uploads/            # Thư mục lưu trữ hình ảnh tạm thời
├── .env                # Cấu hình biến môi trường và API Key
└── requirements.txt    # Danh sách thư viện cần thiết
```

## ⚙️ Cài Đặt Và Chạy Thử
1. Cài đặt các thư viện cần thiết:
   ```bash
   pip install -r requirements.txt
   ```
2. Cấu hình khóa API:
   Tạo file `.env` và thêm khóa API của Gemini:
   ```env
   SECRET_KEY=your_flask_secret_key
   GEMINI_API_KEY=your_gemini_api_key
   ```
3. Khởi chạy ứng dụng:
   ```bash
   python app.py
   ```
4. Truy cập: `http://127.0.0.1:5000`

## 🛡️ Bảo Mật & Đạo Đức
Dự án được xây dựng với mục tiêu giáo dục, giúp học sinh nhận diện các thủ đoạn lừa đảo phổ biến. Mọi dữ liệu cá nhân nhạy cảm trong hình ảnh sẽ được AI khuyến cáo và không lưu trữ lâu dài (tự động xóa nếu cần thiết).
