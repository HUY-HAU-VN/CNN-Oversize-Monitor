const API_KEY = "DAN_API_KEY_CUA_BAN_VAO_DAY";
const FOLDER_ID = "DAN_ID_THU_MUC_DRIVE_VAO_DAY";
const REFRESH_MS = 10000;

/* ---------- DOM ---------- */
const $ = (id) => document.getElementById(id);
const latestImage = $("latest-image");
const historyList = $("history-list");
const historyCount = $("history-count");
const statusPill = $("status-pill");
const statusText = $("status-text");

/* ---------- State ---------- */
let files = [];          // đã sắp xếp: mới nhất -> cũ nhất
let lastSignature = "";
let firstLoad = true;

/* ---------- Helpers ---------- */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/**
 * Lấy thời điểm ảnh được CHỤP từ tên file: OVERSIZE_20261125_023010_105.jpg
 * -> 25/11/2026 02:30:10. Nếu tên không đúng mẫu thì dùng createdTime của Drive.
 */
function getCaptureDate(file) {
  const m = file.name.match(/(\d{4})(\d{2})(\d{2})[_-]?(\d{2})(\d{2})(\d{2})/);
  if (m) {
    const [, y, mo, d, h, mi, s] = m.map(Number);
    const date = new Date(y, mo - 1, d, h, mi, s);
    if (!isNaN(date)) return date;
  }
  return new Date(file.createdTime);
}

const fmtFull = (d) => d.toLocaleString("vi-VN", { hour12: false });
const fmtTime = (d) => d.toLocaleTimeString("vi-VN", { hour12: false });
const fmtDate = (d) => d.toLocaleDateString("vi-VN");

function timeAgo(date) {
  const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sec < 60) return `${sec} giây trước`;
  if (sec < 3600) return `${Math.floor(sec / 60)} phút trước`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} giờ trước`;
  return `${Math.floor(sec / 86400)} ngày trước`;
}

const thumbUrl = (id, w) => `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;

function setStatus(ok, text) {
  statusPill.classList.toggle("error", !ok);
  statusText.textContent = text;
}

/* ---------- Render ---------- */
function renderStats() {
  const today = new Date().toDateString();
  $("stat-total").textContent = files.length;
  $("stat-today").textContent = files.filter((f) => getCaptureDate(f).toDateString() === today).length;
  $("stat-last").textContent = files.length ? timeAgo(getCaptureDate(files[0])) : "--";
  $("stat-updated").textContent = fmtTime(new Date());
}

function renderLatest() {
  const f = files[0];
  const d = getCaptureDate(f);
  latestImage.innerHTML = `
    <div class="latest-wrapper">
      <span class="tag-new">MỚI NHẤT</span>
      <div class="latest-img-box" data-index="0" role="button" tabindex="0" aria-label="Phóng to ảnh mới nhất">
        <img src="${thumbUrl(f.id, 1400)}" alt="${escapeHtml(f.name)}">
      </div>
      <div class="event-meta">
        <span class="event-name">${escapeHtml(f.name)}</span>
        <span class="event-time">
          <span class="chip">📅 ${fmtDate(d)}</span>
          <span class="chip accent">🕒 ${fmtTime(d)}</span>
          <span class="chip">${timeAgo(d)}</span>
        </span>
      </div>
    </div>`;
}

function renderHistory() {
  const older = files.slice(1);
  historyCount.textContent = `${older.length} ảnh`;

  if (!older.length) {
    historyList.innerHTML = `<p class="status-msg">Chưa có thêm ảnh cũ hơn</p>`;
    return;
  }

  historyList.innerHTML = older.map((f, i) => {
    const d = getCaptureDate(f);
    return `
      <div class="history-item" data-index="${i + 1}" role="button" tabindex="0"
           style="animation-delay:${Math.min(i, 12) * 35}ms">
        <div class="history-thumb">
          <img src="${thumbUrl(f.id, 600)}" alt="${escapeHtml(f.name)}" loading="lazy">
          <span class="history-index">#${files.length - (i + 1)}</span>
        </div>
        <div class="history-info">
          <div class="history-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
          <div class="history-time">🕒 ${fmtTime(d)} · ${fmtDate(d)}</div>
        </div>
      </div>`;
  }).join("");
}

/* ---------- Load Drive ---------- */
async function loadDriveImages() {
  try {
    const q = encodeURIComponent(`'${FOLDER_ID}' in parents and mimeType contains 'image/' and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=createdTime desc&pageSize=200&fields=files(id,name,createdTime)&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      setStatus(false, "Lỗi kết nối");
      if (firstLoad) latestImage.innerHTML = `<p class="status-msg error">Lỗi kết nối Drive: ${escapeHtml(data.error.message)}</p>`;
      return;
    }

    setStatus(true, "Đang hoạt động");
    const list = (data.files || []).slice();
    // Sắp xếp theo thời điểm chụp (mới -> cũ)
    list.sort((a, b) => getCaptureDate(b) - getCaptureDate(a));

    const signature = list.map((f) => f.id).join(",");
    $("stat-updated").textContent = fmtTime(new Date());

    if (signature === lastSignature && !firstLoad) {
      renderStats(); // chỉ cập nhật "x phút trước"
      return;
    }
    const hadFiles = files.length > 0;
    lastSignature = signature;
    files = list;
    firstLoad = false;

    if (!files.length) {
      latestImage.innerHTML = `<p class="status-msg">Chưa có sự kiện xe quá khổ</p>`;
      historyList.innerHTML = `<p class="status-msg">Chưa có lịch sử hình ảnh</p>`;
      historyCount.textContent = "0 ảnh";
      renderStats();
      return;
    }

    renderStats();
    renderLatest();
    renderHistory();
    Lightbox.refresh(hadFiles);
  } catch (err) {
    setStatus(false, "Mất kết nối");
    if (firstLoad) latestImage.innerHTML = `<p class="status-msg error">Không thể tải dữ liệu: ${escapeHtml(err.message)}</p>`;
  }
}

/* ---------- Click mở lightbox (event delegation) ---------- */
function bindOpen(container, selector) {
  const open = (el) => {
    const item = el.closest(selector);
    if (item) Lightbox.open(Number(item.dataset.index));
  };
  container.addEventListener("click", (e) => open(e.target));
  container.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(e.target); }
  });
}
bindOpen(latestImage, ".latest-img-box");
bindOpen(historyList, ".history-item");

/* ======================================================================
 *  LIGHTBOX + ZOOM
 * ==================================================================== */
const Lightbox = (() => {
  const box = $("lightbox");
  const stage = $("lb-stage");
  const img = $("lb-img");
  const loader = $("lb-loader");
  const MIN = 1, MAX = 8;

  let index = 0;
  let scale = 1, tx = 0, ty = 0;
  const pointers = new Map();
  let startDrag = null, startPinch = null, moved = false;

  const isOpen = () => box.classList.contains("active");

  function apply(animate = false) {
    img.classList.toggle("animating", animate);
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    stage.classList.toggle("zoomed", scale > 1.01);
    $("lb-zoom-level").textContent = `${Math.round(scale * 100)}%`;
  }

  function clampPan() {
    // cho phép kéo trong phạm vi ảnh đã phóng to
    const w = img.clientWidth * scale, h = img.clientHeight * scale;
    const maxX = Math.max(0, (w - stage.clientWidth) / 2 + 80);
    const maxY = Math.max(0, (h - stage.clientHeight) / 2 + 80);
    tx = Math.min(maxX, Math.max(-maxX, tx));
    ty = Math.min(maxY, Math.max(-maxY, ty));
  }

  function reset(animate = true) { scale = 1; tx = 0; ty = 0; apply(animate); }

  // Zoom quanh một điểm (cx, cy tính theo toạ độ màn hình)
  function zoomAt(newScale, cx, cy, animate = false) {
    newScale = Math.min(MAX, Math.max(MIN, newScale));
    const r = stage.getBoundingClientRect();
    const px = cx - (r.left + r.width / 2);
    const py = cy - (r.top + r.height / 2);
    const k = newScale / scale;
    tx = px - (px - tx) * k;
    ty = py - (py - ty) * k;
    scale = newScale;
    if (scale <= 1.001) { tx = 0; ty = 0; }
    clampPan();
    apply(animate);
  }

  function zoomCenter(factor) {
    const r = stage.getBoundingClientRect();
    zoomAt(scale * factor, r.left + r.width / 2, r.top + r.height / 2, true);
  }

  function show(i) {
    if (!files.length) return;
    index = Math.min(files.length - 1, Math.max(0, i));
    const f = files[index];
    const d = getCaptureDate(f);

    $("lb-title").textContent = f.name;
    $("lb-time").textContent = `Thời gian ghi nhận: ${fmtFull(d)} (${timeAgo(d)})`;
    $("lb-counter").textContent = `Ảnh ${files.length - index} / ${files.length}`;
    $("lb-open").href = `https://drive.google.com/file/d/${f.id}/view`;
    $("lb-prev").disabled = index === 0;
    $("lb-next").disabled = index === files.length - 1;

    reset(false);
    img.classList.remove("loaded");
    loader.classList.add("show");

    // Hiện ngay bản thumbnail nhỏ rồi thay bằng bản nét cao khi tải xong
    const hi = thumbUrl(f.id, 2400);
    img.src = thumbUrl(f.id, 800);
    img.classList.add("loaded");
    const loadHi = new Image();
    loadHi.onload = () => {
      if (files[index] && files[index].id === f.id) {
        img.src = hi;
        loader.classList.remove("show");
      }
    };
    loadHi.onerror = () => loader.classList.remove("show");
    loadHi.src = hi;
  }

  function open(i) {
    box.classList.add("active");
    box.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    show(i);
  }

  function close() {
    box.classList.remove("active");
    box.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    img.src = "";
  }

  // Khi danh sách đổi (có ảnh mới) -> giữ nguyên ảnh đang xem
  function refresh(hadFiles) {
    if (!isOpen()) return;
    const cur = $("lb-title").textContent;
    const ni = files.findIndex((f) => f.name === cur);
    if (ni >= 0) {
      index = ni;
      $("lb-counter").textContent = `Ảnh ${files.length - index} / ${files.length}`;
      $("lb-prev").disabled = index === 0;
      $("lb-next").disabled = index === files.length - 1;
    }
  }

  /* --- Điều khiển --- */
  $("lb-close").addEventListener("click", close);
  $("lb-zoom-in").addEventListener("click", () => zoomCenter(1.5));
  $("lb-zoom-out").addEventListener("click", () => zoomCenter(1 / 1.5));
  $("lb-reset").addEventListener("click", () => reset(true));
  $("lb-prev").addEventListener("click", () => show(index - 1));
  $("lb-next").addEventListener("click", () => show(index + 1));

  // Nhấp ra vùng tối (không phải ảnh) để đóng
  stage.addEventListener("click", (e) => {
    if (moved) return;
    if (e.target === stage) close();
  });

  // Cuộn chuột để zoom
  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0018);
    zoomAt(scale * factor, e.clientX, e.clientY);
  }, { passive: false });

  // Nhấp đúp: phóng to 3x tại điểm nhấp / thu về vừa khung
  stage.addEventListener("dblclick", (e) => {
    if (scale > 1.05) reset(true);
    else zoomAt(3, e.clientX, e.clientY, true);
  });

  // Kéo & chụm (pointer events: chuột + cảm ứng)
  stage.addEventListener("pointerdown", (e) => {
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;
    if (pointers.size === 1) {
      startDrag = { x: e.clientX, y: e.clientY, tx, ty };
      stage.classList.add("dragging");
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      startPinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
      startDrag = null;
    }
  });

  stage.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2 && startPinch) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(startPinch.scale * (dist / startPinch.dist), (a.x + b.x) / 2, (a.y + b.y) / 2);
      moved = true;
    } else if (pointers.size === 1 && startDrag && scale > 1.01) {
      const dx = e.clientX - startDrag.x, dy = e.clientY - startDrag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      tx = startDrag.tx + dx;
      ty = startDrag.ty + dy;
      clampPan();
      apply();
    }
  });

  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) startPinch = null;
    if (pointers.size === 0) { startDrag = null; stage.classList.remove("dragging"); setTimeout(() => (moved = false), 0); }
    else if (pointers.size === 1) {
      const [p] = [...pointers.values()];
      startDrag = { x: p.x, y: p.y, tx, ty };
    }
  };
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);

  // Bàn phím
  document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    switch (e.key) {
      case "Escape": close(); break;
      case "ArrowLeft": show(index - 1); break;
      case "ArrowRight": show(index + 1); break;
      case "+": case "=": zoomCenter(1.4); break;
      case "-": case "_": zoomCenter(1 / 1.4); break;
      case "0": reset(true); break;
    }
  });

  window.addEventListener("resize", () => { if (isOpen()) { clampPan(); apply(); } });

  return { open, close, refresh };
})();

/* ---------- Start ---------- */
loadDriveImages();
setInterval(loadDriveImages, REFRESH_MS);
// cập nhật "x phút trước" mỗi 30 giây mà không cần gọi Drive
setInterval(() => { if (files.length) { renderStats(); } }, 30000);
