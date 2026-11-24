const API_KEY = "DAN_API_KEY_CUA_BAN_VAO_DAY";
const FOLDER_ID = "DAN_ID_THU_MUC_DRIVE_VAO_DAY";

const latestImage = document.getElementById("latest-image");
const historyList = document.getElementById("history-list");
const historyCount = document.getElementById("history-count");

const modal = document.getElementById("image-modal");
const modalImg = document.getElementById("modal-img");
const modalTitle = document.getElementById("modal-title");
const modalTime = document.getElementById("modal-time");

let lastSignature = "";

function openModal(fileId, fileName, timeStr) {
  // Tải ảnh độ phân giải cao (w1600) khi mở phóng to
  modalImg.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
  modalTitle.textContent = fileName;
  modalTime.textContent = `Thời gian ghi nhận: ${timeStr}`;
  modal.classList.add("active");
}

function closeModal() {
  modal.classList.remove("active");
  modalImg.src = "";
}

function closeModalOnOutside(event) {
  if (event.target === modal) {
    closeModal();
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("active")) {
    closeModal();
  }
});

async function loadDriveImages() {
  try {
    const query = encodeURIComponent(`'${FOLDER_ID}' in parents and mimeType contains 'image/' and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&fields=files(id,name,createdTime)&key=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      latestImage.innerHTML = `<p class="status-msg">Lỗi kết nối Drive: ${data.error.message}</p>`;
      return;
    }

    const files = data.files || [];

    // Tránh render lại giao diện nếu danh sách ảnh không thay đổi (giúp không bị giật khi đang xem)
    const currentSignature = files.map(f => f.id).join(",");
    if (currentSignature === lastSignature && files.length > 0) {
      return;
    }
    lastSignature = currentSignature;

    if (files.length === 0) {
      latestImage.innerHTML = `<p class="status-msg">Chưa có sự kiện xe quá khổ</p>`;
      historyList.innerHTML = `<p class="status-msg">Chưa có lịch sử hình ảnh</p>`;
      historyCount.textContent = "0 ảnh";
      return;
    }

    // 1. Hiển thị ảnh mới nhất
    const newest = files[0];
    const newestTime = new Date(newest.createdTime).toLocaleString("vi-VN");
    latestImage.innerHTML = `
      <div class="latest-wrapper">
        <img src="https://drive.google.com/thumbnail?id=${newest.id}&sz=w1200" 
             alt="${newest.name}" 
             onclick="openModal('${newest.id}', '${newest.name}', '${newestTime}')" />
        <div class="event-meta">
          <span class="event-name">${newest.name}</span>
          <span class="event-time">${newestTime}</span>
        </div>
      </div>
    `;

    // 2. Hiển thị lưới lịch sử các ảnh trước đó
    const olderFiles = files.slice(1);
    historyCount.textContent = `${olderFiles.length} ảnh`;

    if (olderFiles.length > 0) {
      historyList.innerHTML = olderFiles.map(file => {
        const time = new Date(file.createdTime).toLocaleString("vi-VN");
        return `
          <div class="history-item" onclick="openModal('${file.id}', '${file.name}', '${time}')">
            <img src="https://drive.google.com/thumbnail?id=${file.id}&sz=w600" alt="${file.name}" loading="lazy" />
            <div class="history-info">
              <div class="history-name" title="${file.name}">${file.name}</div>
              <div class="history-time">${time}</div>
            </div>
          </div>
        `;
      }).join("");
    } else {
      historyList.innerHTML = `<p class="status-msg">Chưa có thêm lịch sử hình ảnh cũ hơn</p>`;
    }
  } catch (err) {
    latestImage.innerHTML = `<p class="status-msg">Không thể tải dữ liệu: ${err.message}</p>`;
  }
}

loadDriveImages();
setInterval(loadDriveImages, 10000);
