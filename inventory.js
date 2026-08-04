/**
 * ====================================================================
 * MODULE 1: QUẢN LÝ HẬU CẦN VẬT PHẨM (INVENTORY.JS FULL HOÀN CHỈNH)
 * ====================================================================
 */

let selectedItemsCart = {}; // Lưu danh sách vật phẩm người dùng chọn mượn
let globalAvailableItems = []; // Danh sách vật phẩm trống kho từ server

// RENDER LỊCH MƯỢN VẬT PHẨM (ÉP VẼ KHỐI MÀU TRÊN CẢ XEM THÁNG LẪN XEM TUẦN)
async function renderCalendarEvents() {
  const container = document.getElementById("calendar-container");
  if (!container || typeof FullCalendar === 'undefined') return;

  const calendar = new FullCalendar.Calendar(container, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek'
    },
    buttonText: { today: 'Hôm nay', month: 'Xem Tháng', week: 'Xem Tuần' },
    locale: 'vi',
    height: 'auto',
    
    // 🟢 CẤU HÌNH QUAN TRỌNG: ÉP HIỂN THỊ DẠNG KHỐI MÀU TOÀN BỘ
    eventDisplay: 'block',
    dayMaxEvents: 3, // Giới hạn 3 khối/ngày, nhiều hơn sẽ gom gọn "+ x khác"

    events: async function(info, successCallback, failureCallback) {
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "GET_BORROWED_EVENTS_CALENDAR" })
        });
        const result = JSON.parse(await res.text());
        if (result.success && result.data) {
          successCallback(result.data);
        } else { successCallback([]); }
      } catch (e) { successCallback([]); }
    },
    
    // 🎨 TẠO KHỐI MÀU XANH DƯƠNG CHO VẬT PHẨM (BLOCK EVENT)
    eventDidMount: function(info) {
      info.el.style.backgroundColor = "#0284c7"; // Blue-600
      info.el.style.borderColor = "#0369a1";
      info.el.style.color = "#ffffff";
      info.el.style.borderRadius = "6px";
      info.el.style.padding = "2px 5px";
      info.el.style.fontSize = "11px";
      info.el.style.fontWeight = "bold";
      info.el.style.margin = "2px 0";
      info.el.style.boxShadow = "0 1px 2px rgba(0,0,0,0.1)";
    },

    eventClick: function(info) {
      const p = info.event.extendedProps;
      let itemsListStr = "Chưa rõ";
      try {
        const items = typeof p.vatPhamRaw === 'string' ? JSON.parse(p.vatPhamRaw) : p.vatPhamRaw;
        itemsListStr = items.map(it => `• ${it.name || it.id}: x${it.qty}`).join("\n");
      } catch(e) { itemsListStr = p.vatPhamRaw || "-"; }

      const startTime = info.event.start ? new Date(info.event.start).toLocaleString('vi-VN') : 'N/A';
      const endTime = info.event.end ? new Date(info.event.end).toLocaleString('vi-VN') : 'N/A';

      alert(`📋 CHI TIẾT PHIẾU MƯỢN VẬT PHẨM\n\n🔖 Mã Đơn: ${p.bookingId || info.event.id}\n🏢 Đơn vị: ${p.donVi || 'Chưa rõ'}\n👤 Người đại diện: ${p.nguoiDaiDien || 'N/A'}\n📞 SĐT: ${p.sdt || 'N/A'}\n⏰ Mượn: ${startTime}\n⌛ Trả: ${endTime}\n📝 Ghi chú: ${p.ghiChu || 'Không'}\n-------------------\n📦 DỤNG CỤ:\n${itemsListStr}`);
    }
  });

  calendar.render();
  loadInventoryItems();
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
async function submitBorrowOrder() {
  const user = window.currentUser;
  if (!user) return alert("⚠️ Vui lòng đăng nhập!");

  const email = document.getElementById("borrow-email")?.value;
  const name  = document.getElementById("borrow-name")?.value;
  const phone = document.getElementById("borrow-phone")?.value;
  const start = document.getElementById("borrow-start")?.value;
  const end   = document.getElementById("borrow-end")?.value;
  const note  = document.getElementById("borrow-note")?.value;
  const msgEl = document.getElementById("borrow-msg");

  // Gom vật phẩm đã chọn
  const itemsList = [];
  Object.keys(selectedItemsCart).forEach(id => {
    const itemObj = globalAvailableItems.find(it => it.id === id);
    itemsList.push({
      id: id,
      name: itemObj ? itemObj.name : id,
      qty: selectedItemsCart[id]
    });
  });

  if (!email || !name || !phone || !start || !end || !note) {
    if (msgEl) {
      msgEl.innerText = "⚠️ Vui lòng điền đầy đủ các thông tin bắt buộc (*)!";
      msgEl.className = "text-center text-xs font-bold mt-1 text-amber-600";
    }
    return alert("⚠️ Vui lòng điền đầy đủ thông tin bắt buộc (*)");
  }

  if (itemsList.length === 0) {
    if (msgEl) {
      msgEl.innerText = "⚠️ Vui lòng chọn ít nhất 1 vật phẩm muốn mượn!";
      msgEl.className = "text-center text-xs font-bold mt-1 text-amber-600";
    }
    return alert("⚠️ Vui lòng chọn ít nhất 1 vật phẩm mượn!");
  }

  if (msgEl) {
    msgEl.innerText = "⏳ Đang gửi phiếu đăng ký mượn...";
    msgEl.className = "text-center text-xs font-bold mt-1 text-blue-600";
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "SUBMIT_BORROW_ORDER",
        username: user.username,
        donVi: user.tenDonVi || user.username,
        email: email,
        name: name,
        phone: phone,
        startTime: start,
        endTime: end,
        note: note,
        items: itemsList
      })
    });

    const result = JSON.parse(await res.text());

    if (result.success) {
      if (msgEl) {
        msgEl.innerText = result.message;
        msgEl.className = "text-center text-xs font-bold mt-1 text-emerald-600";
      }
      alert(result.message);
      clearCart();
      renderCalendarEvents(); // Tải lại lịch
    } else {
      if (msgEl) {
        msgEl.innerText = "❌ " + result.message;
        msgEl.className = "text-center text-xs font-bold mt-1 text-rose-600";
      }
    }
  } catch (e) {
    console.error("Lỗi gửi phiếu mượn:", e);
    if (msgEl) {
      msgEl.innerText = "❌ Lỗi kết nối máy chủ!";
      msgEl.className = "text-center text-xs font-bold mt-1 text-rose-600";
    }
  }
}

// TẢI TOÀN BỘ LỊCH SỬ ĐƠN MƯỢN VẬT PHẨM TỪ GOOGLE SHEET (KHÔNG LỌC)
async function loadUserBorrowHistory() {
  const tbody = document.getElementById("user-history-table");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-xs font-semibold text-slate-400 font-sans animate-pulse">⏳ Đang lấy toàn bộ lịch sử đơn mượn từ Google Sheet...</td></tr>`;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "GET_ALL_BORROW_ORDERS" })
    });

    const text = await res.text();
    const result = JSON.parse(text);

    if (!result.success || !result.data || result.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-xs font-semibold text-slate-400 font-sans tracking-wide">Chưa có đơn vị đăng ký.</td></tr>`;
      return;
    }

    let html = "";
    result.data.forEach(item => {
      let itemsStr = "";
      try {
        if (typeof item.vatPhamRaw === 'string' && item.vatPhamRaw.trim().startsWith('[')) {
          const itemsArr = JSON.parse(item.vatPhamRaw);
          itemsStr = itemsArr.map(it => `${it.name || it.id} (x${it.qty})`).join(', ');
        } else {
          itemsStr = item.vatPhamRaw || "Vật phẩm mượn";
        }
      } catch(e) { itemsStr = item.vatPhamRaw || "Vật phẩm mượn"; }

      const status = String(item.trangThai || "REGISTERED").toUpperCase();
      let badgeStatus = `<span class="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px] border border-amber-200">⏳ Chờ duyệt</span>`;
      if (status === "DELIVERED" || status === "APPROVED") badgeStatus = `<span class="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold rounded-full text-[10px] border border-blue-200">📦 Đã bàn giao</span>`;
      if (status === "RETURNED") badgeStatus = `<span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px] border border-emerald-200">🎉 Đã trả</span>`;
      if (status === "REJECTED" || status === "CANCELLED") badgeStatus = `<span class="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-full text-[10px] border border-rose-200">❌ Từ chối</span>`;

      html += `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition align-middle text-xs font-sans">
          <td class="p-3 font-mono font-extrabold text-blue-900">${item.bookingId || 'N/A'}</td>
          <td class="p-3 font-bold text-slate-800 min-w-[180px]">${itemsStr}</td>
          <td class="p-3 text-slate-600 whitespace-nowrap">${item.thoiGianMuon || '-'} ➔ ${item.thoiGianTra || '-'}</td>
          <td class="p-3 text-slate-700 font-semibold">${item.donVi || item.nguoiDaiDien || 'Chưa rõ'}</td>
          <td class="p-3 whitespace-nowrap">${badgeStatus}</td>
        </tr>`;
    });

    tbody.innerHTML = html;

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-xs font-semibold text-rose-500 font-sans">❌ Lỗi kết nối Google Sheet: ${err.message}</td></tr>`;
  }
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