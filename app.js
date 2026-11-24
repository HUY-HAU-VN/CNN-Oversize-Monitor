const API_KEY = "AIzaSyC-Xh3B_Qo6jZdSqgVqCE3MQXMp27SEn7s";
const FOLDER_ID = "1GDNOBdq25yz0q-Kcw3YTl0LcTfzhnqZ7";

const latestImage = document.getElementById("latest-image");
const historyList = document.getElementById("history-list");

async function loadDriveImages() {
  try {
    const query = encodeURIComponent(`'${FOLDER_ID}' in parents and mimeType contains 'image/' and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&fields=files(id,name,createdTime)&key=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      latestImage.textContent = "Lỗi kết nối Drive: " + data.error.message;
      return;
    }

    const files = data.files || [];

    if (files.length === 0) {
      latestImage.textContent = "Chưa có sự kiện xe quá khổ";
      historyList.textContent = "Chưa có lịch sử hình ảnh";
      return;
    }

    // 1. Hiển thị ảnh mới nhất (files[0])
    const newest = files[0];
    const newestTime = new Date(newest.createdTime).toLocaleString("vi-VN");
    latestImage.innerHTML = `
      <img src="https://drive.google.com/thumbnail?id=${newest.id}&sz=w1000" alt="${newest.name}" style="max-width: 100%; border-radius: 8px;" />
      <p><strong>${newest.name}</strong> - ${newestTime}</p>
    `;

    // 2. Hiển thị danh sách lịch sử các ảnh trước đó
    if (files.length > 1) {
      historyList.innerHTML = files.slice(1).map(file => {
        const time = new Date(file.createdTime).toLocaleString("vi-VN");
        return `
          <div class="history-item" style="margin-bottom: 16px;">
            <img src="https://drive.google.com/thumbnail?id=${file.id}&sz=w600" alt="${file.name}" style="max-width: 100%; border-radius: 6px;" />
            <p>${file.name} - ${time}</p>
          </div>
        `;
      }).join("");
    } else {
      historyList.textContent = "Chưa có thêm lịch sử hình ảnh cũ hơn";
    }
  } catch (err) {
    latestImage.textContent = "Không thể tải dữ liệu: " + err.message;
  }
}

// Tải ngay khi mở trang và tự động làm mới mỗi 10 giây
loadDriveImages();
setInterval(loadDriveImages, 10000);
