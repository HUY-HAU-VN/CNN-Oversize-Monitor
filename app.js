
const latestImage = document.getElementById("latest-image");
const historyList = document.getElementById("history-list");

// Dữ liệu thử nghiệm, sau này thay bằng dữ liệu Google Drive
const events = [];

if (events.length === 0) {
    latestImage.textContent = "Chưa có sự kiện xe quá khổ";
    historyList.textContent = "Chưa có lịch sử hình ảnh";
}
