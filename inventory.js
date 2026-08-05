/**
 * ====================================================================
 * MODULE 1: QUẢN LÝ HẬU CẦN VẬT PHẨM (INVENTORY.JS FULL HOÀN CHỈNH)
 * ====================================================================
 */

let selectedItemsCart = {}; // Lưu danh sách vật phẩm người dùng chọn mượn
let globalAvailableItems = []; // Danh sách vật phẩm trống kho từ server

// BỔ SUNG SỰ KIỆN CLICK VÀO SỰ KIỆN HIỂN THỊ POPUP THÔNG TIN
async function renderCalendarEvents() {
  const container = document.getElementById("calendar-container");
  if (!container || typeof FullCalendar === 'undefined') return;

  const calendar = new FullCalendar.Calendar(container, {
    initialView: 'dayGridMonth',
    headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
    eventDisplay: 'block',
    events: async function(info, successCallback, failureCallback) {
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "GET_BORROWED_EVENTS_CALENDAR" })
        });
        const result = JSON.parse(await res.text());
        if (result.success && result.data) successCallback(result.data);
        else successCallback([]);
      } catch (e) { successCallback([]); }
    },

    // Định dạng màu nhạt Pastel dịu mắt
    eventDidMount: function(info) {
      info.el.style.backgroundColor = "#e0f2fe"; // Light Sky Blue
      info.el.style.borderColor = "#bae6fd";
      info.el.style.color = "#0369a1";
      info.el.style.borderRadius = "6px";
      info.el.style.padding = "2px 6px";
      info.el.style.fontSize = "11px";
      info.el.style.fontWeight = "700";
    },

    eventClick: function(info) {
    const p = info.event.extendedProps;
    const startTime = info.event.start ? new Date(info.event.start).toLocaleString('vi-VN') : 'N/A';
    const endTime = info.event.end ? new Date(info.event.end).toLocaleString('vi-VN') : 'N/A';

    const contentHtml = `
      <div style="text-align: left; font-size: 13px; line-height: 1.6; color: #334155;">
        <p style="margin-bottom: 6px;"><b>🏢 Đơn vị mượn:</b> <span style="color: #1e3a8a; font-weight: bold;">${p.donVi || 'Chưa rõ'}</span></p>
        <p style="margin-bottom: 6px;"><b>🔖 Mã đơn:</b> <span style="font-family: monospace; font-weight: bold; color: #0284c7;">${p.bookingId || info.event.id}</span></p>
        <p style="margin-bottom: 6px;"><b>👤 Người đại diện:</b> ${p.nguoiDaiDien || 'N/A'} (📞 ${p.sdt || 'N/A'})</p>
        <p style="margin-bottom: 6px;"><b>📦 Danh sách dụng cụ:</b> <br><span style="background: #f1f5f9; padding: 4px 8px; border-radius: 6px; display: inline-block; margin-top: 2px;">${p.vatPhamRaw || 'Không có'}</span></p>
        <p style="margin-bottom: 6px;"><b>🟢 Thời gian mượn:</b> <span style="color: #059669; font-weight: bold;">${startTime}</span></p>
        <p style="margin-bottom: 6px;"><b>🔴 Thời gian trả:</b> <span style="color: #dc2626; font-weight: bold;">${endTime}</span></p>
        <p style="margin-bottom: 0;"><b>📝 Chương trình:</b> ${p.ghiChu || 'Không có'}</p>
      </div>
    `;

    Swal.fire({
      title: '📦 THÔNG TIN ĐĂNG KÝ VẬT PHẨM',
      html: contentHtml,
      icon: 'info',
      confirmButtonText: 'Đóng',
      confirmButtonColor: '#0284c7',
      customClass: {
        popup: 'rounded-3xl'
      }
    });
  }
  });

  calendar.render();
  if (typeof loadInventoryItems === "function") loadInventoryItems();
}

window.renderCalendarEvents = renderCalendarEvents;

// 2. TẢI VẬT PHẨM TRỐNG KHO THEO KHOẢNG THỜI GIAN CHỌN
async function loadInventoryItems() {
  const container = document.getElementById("inventory-list");
  if (!container) return;

  const startVal = document.getElementById("borrow-start")?.value;
  const endVal = document.getElementById("borrow-end")?.value;

  container.innerHTML = `<p class="col-span-2 text-center text-xs text-slate-400 py-3">⏳ Đang đối chiếu kho vật phẩm...</p>`;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "GET_INVENTORY_AVAILABLE",
        startTime: startVal || "",
        endTime: endVal || ""
      })
    });

    const result = JSON.parse(await res.text());

    if (result.success && result.data) {
      globalAvailableItems = result.data;
      renderInventoryGrid(globalAvailableItems);
    } else {
      container.innerHTML = `<p class="col-span-2 text-center text-xs text-slate-400 py-3">Không có vật phẩm nào trong kho.</p>`;
    }
  } catch (e) {
    console.error("Lỗi tải kho vật phẩm:", e);
    container.innerHTML = `<p class="col-span-2 text-center text-xs text-rose-500 py-3">❌ Lỗi tải dữ liệu kho!</p>`;
  }
}

// 3. RENDER DANH SÁCH VẬT PHẨM RA GIAO DIỆN
function renderInventoryGrid(items) {
  const container = document.getElementById("inventory-list");
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<p class="col-span-2 text-center text-xs text-slate-400 py-3">Không tìm thấy vật phẩm phù hợp.</p>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const qtyInCart = selectedItemsCart[item.id] || 0;
    const isOut = item.available <= 0;

    return `
      <div class="p-2 border rounded-xl ${isOut ? 'bg-slate-100 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-blue-300'} transition flex flex-col justify-between">
        <div>
          <div class="font-bold text-xs text-slate-800 truncate" title="${item.name}">${item.name}</div>
          <div class="text-[10px] ${isOut ? 'text-rose-500 font-bold' : 'text-slate-500'}">
            Khả dụng: <b>${item.available}</b> / ${item.total}
          </div>
        </div>
        
        <div class="mt-2 flex items-center justify-between">
          ${isOut ? `
            <span class="text-[10px] font-bold text-rose-500">HẾT HÀNG</span>
          ` : `
            <div class="flex items-center gap-1 w-full justify-between bg-slate-50 p-1 rounded-lg border">
              <button onclick="updateCartQty('${item.id}', -1, ${item.available})" class="w-5 h-5 bg-slate-200 hover:bg-slate-300 font-bold rounded text-xs leading-none">-</button>
              <span class="text-xs font-extrabold text-blue-900">${qtyInCart}</span>
              <button onclick="updateCartQty('${item.id}', 1, ${item.available})" class="w-5 h-5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded text-xs leading-none">+</button>
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// 4. LỌC TÌM KIẾM VẬT PHẨM
function filterInventory() {
  const query = document.getElementById("search-item")?.value.toLowerCase() || "";
  const filtered = globalAvailableItems.filter(it => it.name.toLowerCase().includes(query) || it.id.toLowerCase().includes(query));
  renderInventoryGrid(filtered);
}

// 5. CẬP NHẬT SỐ LƯỢNG VẬT PHẨM CHỌN MƯỢN
function updateCartQty(itemId, change, maxAvailable) {
  const current = selectedItemsCart[itemId] || 0;
  const next = current + change;

  if (next < 0) return;
  if (next > maxAvailable) {
    alert(`⚠️ Chỉ còn sẵn ${maxAvailable} vật phẩm này trong kho!`);
    return;
  }

  if (next === 0) {
    delete selectedItemsCart[itemId];
  } else {
    selectedItemsCart[itemId] = next;
  }

  renderInventoryGrid(globalAvailableItems);
}

// 6. XÓA SẠCH GIỎ VẬT PHẨM ĐÃ CHỌN
function clearCart() {
  selectedItemsCart = {};
  renderInventoryGrid(globalAvailableItems);
}

// 7. GỬI PHIẾU ĐĂNG KÝ MƯỢN HẬU CẦN
function submitBorrowOrder() {
  if (typeof validateBorrowDates === 'function' && !validateBorrowDates()) return;

  const user = window.currentUser || {};
  const startDate = document.getElementById("borrow-start-date")?.value;
  const startTime = document.getElementById("borrow-start-time")?.value || "08:00";
  const endDate = document.getElementById("borrow-end-date")?.value;
  const endTime = document.getElementById("borrow-end-time")?.value || "17:00";

  const email = document.getElementById("borrow-email")?.value;
  const name = document.getElementById("borrow-name")?.value;
  const phone = document.getElementById("borrow-phone")?.value;
  const note = document.getElementById("borrow-note")?.value;

  if (!startDate || !endDate || !email || !name || !phone) {
    alert("Vui lòng nhập đầy đủ thông tin ngày giờ và các trường bắt buộc (*)");
    return;
  }

  // Gom vật phẩm từ giỏ hàng
  const itemsList = [];
  if (typeof selectedItemsCart !== 'undefined' && typeof globalAvailableItems !== 'undefined') {
    Object.keys(selectedItemsCart).forEach(id => {
      const itemObj = globalAvailableItems.find(it => it.id === id);
      itemsList.push({
        id: id,
        name: itemObj ? itemObj.name : id,
        qty: selectedItemsCart[id]
      });
    });
  }

  if (itemsList.length === 0) {
    alert("⚠️ Vui lòng chọn ít nhất 1 vật phẩm mượn!");
    return;
  }

  const fullStart = `${startDate} ${startTime}`;
  const fullEnd = `${endDate} ${endTime}`;

  const payload = {
    action: "SUBMIT_BORROW_ORDER",
    username: user.username || email,
    donVi: user.tenDonVi || user.username || email,
    email: email,
    name: name,
    phone: phone,
    note: note,
    startTime: fullStart,
    endTime: fullEnd,
    items: itemsList
  };

  const msgEl = document.getElementById("borrow-msg");
  if (msgEl) {
    msgEl.innerText = "⏳ Đang gửi đơn đăng ký...";
    msgEl.className = "text-center text-xs font-bold mt-1 text-blue-600";
  }

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(res => {
    if (res.success) {
      if (msgEl) {
        msgEl.innerText = "🚀 " + res.message;
        msgEl.className = "text-center text-xs font-bold mt-1 text-emerald-600";
      }
      alert(res.message);
      if (typeof clearCart === 'function') clearCart();
      if (typeof renderCalendarEvents === 'function') renderCalendarEvents(); // 🟢 TẢI LẠI VẼ LỊCH NGAY LẬP TỨC
      if (typeof loadUserBorrowHistory === 'function') loadUserBorrowHistory();
    } else {
      if (msgEl) {
        msgEl.innerText = "❌ Lỗi: " + (res.message || "Không thể gửi đơn");
        msgEl.className = "text-center text-xs font-bold mt-1 text-rose-600";
      }
    }
  })
  .catch(err => {
    console.error("Lỗi gửi đơn mượn:", err);
    if (msgEl) msgEl.innerText = "❌ Lỗi kết nối máy chủ!";
  });
}

// TẢI TOÀN BỘ LỊCH SỬ ĐƠN MƯỢN VẬT PHẨM TỪ GOOGLE SHEET (KHÔNG LỌC)
function loadUserBorrowHistory() {
  const user = window.currentUser || {};
  const tbody = document.getElementById("user-history-table");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 font-bold animate-pulse">⏳ Đang tải lịch sử đơn...</td></tr>`;

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "GET_USER_BORROW_HISTORY" })
  })
  .then(res => res.json())
  .then(res => {
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      
      const uName = String(user.username || "").trim().toLowerCase();
      const uDonVi = String(user.tenDonVi || "").trim().toLowerCase();
      const uHoTen = String(user.hoTen || "").trim().toLowerCase();
      
      const role = String(user.role || "").toUpperCase();
      const isAdmin = role.includes("ADMIN") || role.includes("QUẢN TRỊ") || role.includes("QTV");
      
      const userOrders = isAdmin ? res.data : res.data.filter(item => {
        const rowData = String(item.username + " " + item.email + " " + item.donVi + " " + item.nguoiDaiDien + " " + item.borrowerName).toLowerCase();
        return (uName && rowData.includes(uName)) || (uDonVi && rowData.includes(uDonVi)) || (uHoTen && rowData.includes(uHoTen));
      });

      if (userOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 font-bold">Bạn chưa có đơn đăng ký mượn vật phẩm nào.</td></tr>`;
        return;
      }

      let html = "";
      userOrders.forEach(item => {
        let statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">📋 Chờ duyệt</span>`;
        const st = String(item.status || item.trangThai || "").toUpperCase();
        
        // Đã bổ sung "DELIVERED" để khớp 100% với thao tác Bàn giao của Admin
        if (st === "APPROVED" || st === "ĐÃ DUYỆT" || st === "DELIVERED") {
          statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">✅ Đã duyệt / Bàn giao</span>`;
        } else if (st === "RETURNED" || st === "ĐÃ TRẢ") {
          statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">📦 Đã trả đồ</span>`;
        } else if (st === "REJECTED" || st === "TỪ CHỐI" || st === "CANCELLED") {
          statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">❌ Từ chối</span>`;
        }

        // Tự động phân tách chuỗi code JSON thành danh sách vật phẩm dễ đọc
        let itemsStr = item.items || item.vatPhamRaw || '--';
        try {
          const parsed = JSON.parse(itemsStr);
          if (Array.isArray(parsed)) {
            itemsStr = parsed.map(it => `• <b>${it.name || it.id}</b> (x${it.qty || 1})`).join("<br>");
          }
        } catch(e) {}

        html += `
          <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
            <td class="p-3 font-extrabold text-blue-900">${item.bookingId || item.id || '--'}</td>
            <td class="p-3 text-slate-700 leading-relaxed text-[11px]">${itemsStr}</td>
            <td class="p-3 text-slate-500 text-[11px]">
              <div>🟢 ${item.startTime || item.thoiGianMuon || '--'}</div>
              <div>🔴 ${item.endTime || item.thoiGianTra || '--'}</div>
            </td>
            <td class="p-3 font-medium text-slate-600">${item.borrowerName || item.nguoiDaiDien || item.donVi || '--'}</td>
            <td class="p-3">${statusBadge}</td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    } else {
      tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 font-bold">Chưa có dữ liệu lịch sử mượn vật phẩm trên hệ thống.</td></tr>`;
    }
  })
  .catch(err => {
    console.error("Lỗi tải lịch sử Module 1:", err);
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-rose-500 font-bold">❌ Lỗi kết nối máy chủ!</td></tr>`;
  });
}
window.loadUserBorrowHistory = loadUserBorrowHistory;

// TẢI BẢNG BÀN GIAO / THU HỒI (FIXED AN TOÀN NGOẠI LỆ JSON)
async function loadAdminBorrowOrders() {
  const tbody = document.getElementById("admin-orders-table");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-xs text-slate-400 font-sans animate-pulse">⏳ Đang tải danh sách bàn giao từ Google Sheet...</td></tr>`;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "GET_ALL_BORROW_ORDERS" })
    });

    const text = await res.text();
    let result = {};
    
    try {
      result = JSON.parse(text);
    } catch (parseErr) {
      console.error("Server trả về HTML lỗi:", text);
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-xs text-rose-500 font-bold">❌ Lỗi phản hồi Máy chủ Google Apps Script (Cần Deploy lại New Version).</td></tr>`;
      return;
    }

    if (result.success && result.data && result.data.length > 0) {
      tbody.innerHTML = result.data.map(item => {
        let itemsStr = "";
        try {
          const items = typeof item.vatPhamRaw === 'string' ? JSON.parse(item.vatPhamRaw) : item.vatPhamRaw;
          if (Array.isArray(items)) {
            itemsStr = items.map(it => `<span class="inline-block bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded mr-1 mb-1 border border-slate-200"><b>${it.name || it.id}</b>: x${it.qty}</span>`).join(" ");
          } else { itemsStr = item.vatPhamRaw; }
        } catch(e) { itemsStr = item.vatPhamRaw || "Chưa rõ"; }

        const status = String(item.trangThai || "REGISTERED").toUpperCase();
        let statusBadge = `<span class="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">📋 Đã đăng ký</span>`;
        let actionButtons = `
          <button onclick="updateBorrowStatusAction('${item.bookingId}', 'DELIVERED')" class="whitespace-nowrap px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition shadow-sm cursor-pointer">📦 Bàn giao</button>
        `;

        if (status === "DELIVERED" || status === "APPROVED") {
          statusBadge = `<span class="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">📦 Đã nhận</span>`;
          actionButtons = `
            <button onclick="updateBorrowStatusAction('${item.bookingId}', 'RETURNED')" class="whitespace-nowrap px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition shadow-sm cursor-pointer">🎉 Thu hồi</button>
          `;
        } else if (status === "RETURNED") {
          statusBadge = `<span class="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">🎉 Đã trả</span>`;
          actionButtons = `<span class="whitespace-nowrap text-[11px] font-bold text-slate-400 italic">✅ Hoàn tất</span>`;
        } else if (status === "REJECTED" || status === "CANCELLED") {
          statusBadge = `<span class="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">❌ Đã hủy</span>`;
          actionButtons = `<span class="whitespace-nowrap text-[11px] font-bold text-rose-400 italic">❌ Đã từ chối</span>`;
        }

        return `
          <tr class="border-b hover:bg-slate-50 text-xs transition align-middle font-sans">
            <td class="p-3 font-extrabold text-blue-900 whitespace-nowrap">${item.bookingId}</td>
            <td class="p-3 font-bold text-slate-800 min-w-[150px]">${item.donVi || 'Chưa rõ'}</td>
            <td class="p-3 font-medium text-slate-700 whitespace-nowrap">
              <div>${item.nguoiDaiDien || 'N/A'}</div>
              <div class="text-[10px] text-slate-400 font-normal">📞 ${item.sdt || 'N/A'}</div>
            </td>
            <td class="p-3 font-medium text-slate-700 min-w-[180px]">${itemsStr}</td>
            <td class="p-3 text-slate-600 font-semibold whitespace-nowrap">${item.thoiGianMuon || '-'} ➔ ${item.thoiGianTra || '-'}</td>
            <td class="p-3 whitespace-nowrap">${statusBadge}</td>
            <td class="p-3 text-center whitespace-nowrap">${actionButtons}</td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-xs text-slate-400 font-sans">Hiện chưa có đơn mượn nào cần bàn giao / thu hồi.</td></tr>`;
    }
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-xs text-rose-500 font-sans">❌ Lỗi kết nối: ${e.message}</td></tr>`;
  }
}

window.loadAdminBorrowOrders = loadAdminBorrowOrders;

async function updateBorrowStatusAction(bookingId, status) {
  if (!confirm(`Xác nhận cập nhật đơn ${bookingId} sang trạng thái: ${status}?`)) return;
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "UPDATE_BORROW_STATUS", bookingId: bookingId, status: status })
    });
    const result = JSON.parse(await res.text());
    alert(result.message);
    loadAdminBorrowOrders();
  } catch(e) { alert("Lỗi cập nhật trạng thái đơn!"); }
}

function validateBorrowDates() {
  const startDateVal = document.getElementById("borrow-start-date")?.value;
  const endDateVal = document.getElementById("borrow-end-date")?.value;
  const msgEl = document.getElementById("borrow-msg");

  if (!startDateVal || !endDateVal) return true;

  const start = new Date(startDateVal);
  const end = new Date(endDateVal);

  // 1. Kiểm tra không được chọn ngày rơi vào Thứ 7 (6) hoặc Chủ Nhật (0)
  if (start.getDay() === 0 || start.getDay() === 6) {
    if (msgEl) {
      msgEl.innerText = "❌ Ngày mượn không được rơi vào Thứ 7 hoặc Chủ Nhật!";
      msgEl.className = "text-center text-xs font-bold mt-1 text-rose-600";
    }
    document.getElementById("borrow-start-date").value = "";
    return false;
  }

  if (end.getDay() === 0 || end.getDay() === 6) {
    if (msgEl) {
      msgEl.innerText = "❌ Ngày trả không được rơi vào Thứ 7 hoặc Chủ Nhật!";
      msgEl.className = "text-center text-xs font-bold mt-1 text-rose-600";
    }
    document.getElementById("borrow-end-date").value = "";
    return false;
  }

  // 2. Kiểm tra ngày kết thúc không được nhỏ hơn ngày bắt đầu
  if (end < start) {
    if (msgEl) {
      msgEl.innerText = "❌ Ngày trả phải sau hoặc cùng ngày mượn!";
      msgEl.className = "text-center text-xs font-bold mt-1 text-rose-600";
    }
    return false;
  }

  // 3. RÀNG BUỘC MỚI: Khoảng thời gian mượn trả TỐI ĐA 5 NGÀY (5 * 24 * 60 * 60 * 1000 ms)
  const diffTime = end - start;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (diffDays > 5) {
    if (msgEl) {
      msgEl.innerText = "❌ Thời gian mượn trả tối đa không quá 5 ngày!";
      msgEl.className = "text-center text-xs font-bold mt-1 text-rose-600";
    }
    return false;
  }

  if (msgEl) msgEl.innerText = "";
  if (typeof loadInventoryItems === "function") loadInventoryItems();
  return true;
}


// GÁN CÔNG KHAI CÁC HÀM VÀO WINDOW OBJECT ĐỂ HTML KHÔNG BỊ LỖI UNCAUGHT REFERENCE ERROR
window.renderCalendarEvents = renderCalendarEvents;
window.loadInventoryItems = loadInventoryItems;
window.filterInventory = filterInventory;
window.updateCartQty = updateCartQty;
window.clearCart = clearCart;
window.submitBorrowOrder = submitBorrowOrder;
window.loadUserBorrowHistory = loadUserBorrowHistory;
window.loadAdminBorrowOrders = loadAdminBorrowOrders;
window.updateBorrowStatusAction = updateBorrowStatusAction;