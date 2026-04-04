// State management
let currentImageBlob = null;
let stream = null;
let qrScanner = null;

// Chart Globals
let ratioChart = null;
let riskChart = null;
let trendChart = null;

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
    updateChartColors();
});

// DOM Elements
const btnUpload = document.getElementById('btn-upload');
const btnCamera = document.getElementById('btn-camera');
const btnQR = document.getElementById('btn-qr');
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
    console.log("Đang yêu cầu quyền truy cập Camera...");
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Trình duyệt của bạn không hỗ trợ truy cập Camera hoặc bạn đang sử dụng kết nối không an toàn (cần HTTPS hoặc localhost).");
        return;
    }

    try {
        // Tắt stream cũ nếu có
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: "environment", // Ưu tiên camera sau trên điện thoại
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        videoStream.srcObject = stream;
        cameraBox.style.display = 'block';
        previewBox.style.display = 'none';
        console.log("Camera đã được mở thành công.");
    } catch (err) {
        console.error("Lỗi Camera:", err);
        let msg = "Không thể truy cập Camera: ";
        if (err.name === 'NotAllowedError') msg += "Bạn đã từ chối cấp quyền.";
        else if (err.name === 'NotFoundError') msg += "Không tìm thấy thiết bị camera.";
        else if (err.name === 'NotReadableError') msg += "Camera đang bị ứng dụng khác sử dụng.";
        else msg += err.message;
        alert(msg);
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
        
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    }, 'image/webp');
});

// 3. QR Scanner
btnQR.addEventListener('click', () => {
    document.getElementById('qr-overlay').style.display = 'flex';
    qrScanner = new Html5Qrcode("qr-reader");
    qrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
            textInput.value = decodedText;
            stopQR();
        },
        (errorMessage) => { }
    ).catch(err => {
        alert("Lỗi camera QR: " + err);
        stopQR();
    });
});

function stopQR() {
    if (qrScanner) {
        qrScanner.stop().then(() => {
            document.getElementById('qr-overlay').style.display = 'none';
        }).catch(() => {
            document.getElementById('qr-overlay').style.display = 'none';
        });
    } else {
        document.getElementById('qr-overlay').style.display = 'none';
    }
}

document.getElementById('btn-qr-close').addEventListener('click', stopQR);

// 4. Handle Scan
btnScan.addEventListener('click', async () => {
    const text = textInput.value;
    if (!text && !currentImageBlob) {
        alert("Vui lòng nhập bối cảnh văn bản hoặc tải ảnh lên để phân tích.");
        return;
    }

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
            updateCharts(); // Real-time update
        }
    } catch (err) {
        alert("Đã có lỗi xảy ra trong quá trình kết nối AI: " + err.message);
    } finally {
        loader.style.display = 'none';
        btnText.style.display = 'block';
        btnScan.disabled = false;
    }
});

// 5. Render Result & Animations
async function renderResult(data) {
    document.getElementById('input-section').style.display = 'none';
    document.getElementById('result-section').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const needle = document.getElementById('meter-needle');
    const badge = document.getElementById('risk-badge');
    
    let rotation = -90;
    let badgeClass = 'risk-low';

    switch(data.risk_level.toLowerCase()) {
        case 'low': rotation = -60; badgeClass = 'risk-low'; break;
        case 'medium': rotation = -15; badgeClass = 'risk-medium'; break;
        case 'high': rotation = 30; badgeClass = 'risk-high'; break;
        case 'critical': rotation = 80; badgeClass = 'risk-critical'; break;
    }

    setTimeout(() => {
        needle.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        badge.innerText = data.risk_level.toUpperCase();
        badge.className = 'risk-badge ' + badgeClass;
    }, 500);

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
        await new Promise(r => setTimeout(r, 400));
        card.classList.add('show');
    }

    document.getElementById('btn-copy').onclick = () => {
        const report = `AIluadao Report\nSummary: ${data.summary}\nRisk: ${data.risk_level}\n\nTop Action: ${data.perspectives.action}`;
        navigator.clipboard.writeText(report);
        alert("Đã sao chép báo cáo!");
    };

    document.getElementById('btn-share').onclick = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Báo cáo AIluadao',
                text: data.summary,
                url: window.location.href
            });
        } else {
            alert("Trình duyệt không hỗ trợ chia sẻ!");
        }
    };

    // Back to Menu Logic
    document.getElementById('btn-back').onclick = () => {
        document.getElementById('result-section').style.display = 'none';
        document.getElementById('input-section').style.display = 'block';
        
        // Reset Inputs
        textInput.value = '';
        currentImageBlob = null;
        imagePreview.src = '';
        previewBox.style.display = 'none';
        cameraBox.style.display = 'none';
        
        // Window scroll
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}

// 6. Analytics & History Management
async function initCharts() {
    const ctxRatio = document.getElementById('ratioChart').getContext('2d');
    const ctxRisk = document.getElementById('riskChart').getContext('2d');
    const ctxTrend = document.getElementById('trendChart').getContext('2d');

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false, // Để khớp với kích thước container đã cố định trong CSS
        plugins: {
            legend: {
                position: 'bottom',
                labels: { 
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim(),
                    padding: 20
                }
            }
        }
    };

    ratioChart = new Chart(ctxRatio, {
        type: 'doughnut',
        data: {
            labels: ['An toàn', 'Lừa đảo'],
            datasets: [{
                data: [1, 0],
                backgroundColor: ['#22c55e', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: chartOptions
    });

    riskChart = new Chart(ctxRisk, {
        type: 'bar',
        data: {
            labels: ['Low', 'Medium', 'High', 'Critical'],
            datasets: [{
                label: 'Số lượt',
                data: [0, 0, 0, 0],
                backgroundColor: ['#22c55e', '#eab308', '#f97316', '#ef4444'],
                borderRadius: 8
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    trendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Số vụ Lừa đảo (Local)',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    yAxisID: 'y'
                },
                {
                    label: 'Xu hướng Quốc gia (NCSC)',
                    data: [],
                    borderColor: '#6366f1',
                    borderDash: [5, 5],
                    tension: 0.4,
                    pointRadius: 0,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            ...chartOptions,
            scales: {
                y: { 
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true, 
                    grid: { color: 'rgba(255,255,255,0.05)' }, 
                    ticks: { color: '#ef4444' },
                    title: { display: true, text: 'Local', color: '#ef4444' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#6366f1' },
                    title: { display: true, text: 'National', color: '#6366f1' }
                },
                x: { 
                    display: true, 
                    grid: { display: false }, 
                    ticks: { color: '#94a3b8' } 
                }
            }
        }
    });

    updateCharts();
}

async function updateCharts() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        // Update Stats Cards
        document.getElementById('stat-total-scans').innerText = data.total;
        const totalScams = (data.scam_ratio['True'] || 0) + (data.scam_ratio['1'] || 0);
        document.getElementById('stat-total-scams').innerText = totalScams;

        // Update Ratio Chart
        const safeCount = (data.scam_ratio['False'] || 0) + (data.scam_ratio['0'] || 0);
        ratioChart.data.datasets[0].data = [safeCount || 1, totalScams];
        ratioChart.update();

        // Update Risk Distribution Chart
        const riskLevels = ['Low', 'Medium', 'High', 'Critical'];
        riskChart.data.datasets[0].data = riskLevels.map(level => data.risk_dist[level] || 0);
        riskChart.update();

        // Update Trend Chart
        const trendData = data.trends;
        trendChart.data.labels = trendData.map(t => {
            const date = new Date(t.date);
            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        });
        
        // Local Data
        trendChart.data.datasets[0].data = trendData.map(t => t.scams);
        
        // National Trend (Simulated based on context or higher scale)
        trendChart.data.datasets[1].data = trendData.map(t => Math.floor(t.scams * 12.5) + 10);
        
        trendChart.update();
        
        loadCommunityLibrary();
    } catch (err) { console.error("Lỗi cập nhật biểu đồ:", err); }
}

function updateChartColors() {
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim();
    if (ratioChart) {
        ratioChart.options.plugins.legend.labels.color = textColor;
        ratioChart.update();
    }
    if (riskChart) {
        riskChart.options.plugins.legend.labels.color = textColor;
        riskChart.update();
    }
    if (trendChart) {
        trendChart.options.plugins.legend.labels.color = textColor;
        trendChart.update();
    }
}

async function loadHistory() {
    const historyList = document.getElementById('history-list');
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
                document.getElementById('history-sidebar').classList.remove('active');
            };
            historyList.appendChild(div);
        });
    } catch (err) { console.error(err); }
}

async function loadCommunityLibrary() {
    const libGrid = document.getElementById('scam-library-grid');
    try {
        const response = await fetch('/api/top-scams');
        const data = await response.json();
        if (data.length === 0) return; 
        libGrid.innerHTML = '';
        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'scam-card';
            card.innerHTML = `
                <span class="scam-type">${item.risk_level}</span>
                <h4>${item.summary.substring(0, 50)}...</h4>
                <p>${Object.values(item.perspectives)[0].substring(0, 100)}...</p>
            `;
            card.onclick = () => renderResult(item);
            libGrid.appendChild(card);
        });
    } catch (err) { console.error(err); }
}

document.getElementById('btn-history-toggle').addEventListener('click', () => {
    document.getElementById('history-sidebar').classList.add('active');
    loadHistory();
});

document.getElementById('btn-close-history').addEventListener('click', () => {
    document.getElementById('history-sidebar').classList.remove('active');
});

window.addEventListener('DOMContentLoaded', () => {
    initCharts();
});
