// State management
let currentImageBlob = null;
let stream = null;

// Theme Management
const themeToggle = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme') || 'dark';

if (currentTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    themeToggle.innerText = '☀️';
}

themeToggle.addEventListener('click', () => {
    let theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeToggle.innerText = '🌙';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        themeToggle.innerText = '☀️';
    }
});

// DOM Elements
const btnUpload = document.getElementById('btn-upload');
const btnCamera = document.getElementById('btn-camera');
const btnCapture = document.getElementById('btn-capture');
const fileInput = document.getElementById('file-input');
const videoStream = document.getElementById('video-stream');
const cameraBox = document.getElementById('camera-preview-container');
const previewBox = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const btnScan = document.getElementById('btn-scan');
const textInput = document.getElementById('text-input');
const loader = document.getElementById('loader');
const btnText = document.getElementById('btn-text');

// 1. Handle Upload
btnUpload.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        currentImageBlob = file;
        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            previewBox.style.display = 'block';
            cameraBox.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
});

// 2. Handle Camera
btnCamera.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStream.srcObject = stream;
        cameraBox.style.display = 'block';
        previewBox.style.display = 'none';
    } catch (err) {
        alert("Không thể truy cập Camera: " + err.message);
    }
});

btnCapture.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoStream.videoWidth;
    canvas.height = videoStream.videoHeight;
    canvas.getContext('2d').drawImage(videoStream, 0, 0);
    
    canvas.toBlob((blob) => {
        currentImageBlob = blob;
        imagePreview.src = canvas.toDataURL('image/webp');
        previewBox.style.display = 'block';
        cameraBox.style.display = 'none';
        
        // Stop stream
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    }, 'image/webp');
});

// 3. Handle Scan
btnScan.addEventListener('click', async () => {
    const text = textInput.value;
    if (!text && !currentImageBlob) {
        alert("Vui lòng nhập bối cảnh văn bản hoặc tải ảnh lên để phân tích.");
        return;
    }

    // UI Loading State
    loader.style.display = 'block';
    btnText.style.display = 'none';
    btnScan.disabled = true;

    const formData = new FormData();
    formData.append('text_content', text);
    if (currentImageBlob) {
        formData.append('image_file', currentImageBlob, 'scan.webp');
    }

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result.error) {
            alert(result.error);
        } else {
            renderResult(result);
        }
    } catch (err) {
        alert("Đã có lỗi xảy ra trong quá trình kết nối AI: " + err.message);
    } finally {
        loader.style.display = 'none';
        btnText.style.display = 'block';
        btnScan.disabled = false;
    }
});

// 4. Render Result
function renderResult(data) {
    document.getElementById('input-section').style.display = 'none';
    document.getElementById('result-section').style.display = 'block';

    const riskBadge = document.getElementById('risk-badge');
    riskBadge.innerText = data.risk_level.toUpperCase();
    riskBadge.className = 'risk-badge ' + (data.is_scam ? 'risk-high' : 'risk-low');
    
    document.getElementById('result-summary').innerText = data.summary;

    const grid = document.getElementById('perspective-grid');
    grid.innerHTML = '';

    const labels = {
        security: "🛡️ Chuyên gia Bảo mật",
        linguistic: "✍️ Chuyên gia Ngôn ngữ",
        psychology: "🧠 Nhà Tâm lý học",
        attacker: "👿 Góc nhìn Kẻ tấn công",
        victim: "🤕 Góc nhìn Nạn nhân",
        educator: "🎓 Nhà Giáo dục",
        privacy: "🔐 Quyền riêng tư",
        action: "⚡ Trợ lý Hành động"
    };

    for (const [key, label] of Object.entries(labels)) {
        const card = document.createElement('div');
        card.className = 'perspective-card';
        card.innerHTML = `
            <h3>${label}</h3>
            <p>${data.perspectives[key] || "Đang xử lý..."}</p>
        `;
        grid.appendChild(card);
    }
    
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 5. History Management
const btnHistoryToggle = document.getElementById('btn-history-toggle');
const btnCloseHistory = document.getElementById('btn-close-history');
const historySidebar = document.getElementById('history-sidebar');
const historyList = document.getElementById('history-list');

btnHistoryToggle.addEventListener('click', () => {
    historySidebar.classList.add('active');
    loadHistory();
});

btnCloseHistory.addEventListener('click', () => {
    historySidebar.classList.remove('active');
});

async function loadHistory() {
    try {
        const response = await fetch('/history');
        const data = await response.json();
        
        if (data.length === 0) {
            historyList.innerHTML = '<p class="empty-msg">Chưa có lịch sử quét nào.</p>';
            return;
        }

        historyList.innerHTML = '';
        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <span class="date">${new Date(item.timestamp).toLocaleString()}</span>
                <div class="summary">${item.summary || "Kết quả quét"}</div>
            `;
            div.onclick = () => {
                renderResult(item);
                historySidebar.classList.remove('active');
            };
            historyList.appendChild(div);
        });
    } catch (err) {
        console.error("Lỗi khi tải lịch sử:", err);
    }
}

// Load history count/indicator on page load
window.addEventListener('DOMContentLoaded', () => {
    // Optional: add a badge to the history icon if there are new items
});
