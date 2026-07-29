/**
 * ====================================================================
 * MODULE 1: QUẢN LÝ HẬU CẦN VẬT PHẨM (INVENTORY.JS FULL HOÀN CHỈNH)
 * ====================================================================
 */

let selectedItemsCart = {}; // Lưu danh sách vật phẩm người dùng chọn mượn
let globalAvailableItems = []; // Danh sách vật phẩm trống kho từ server

// 1. RENDER LỊCH CẢNH BÁO MƯỢN VẬT PHẨM
async function renderCalendarEvents() {
  const container = document.getElementById("calendar-container");
  if (!container) return;

  if (typeof FullCalendar === 'undefined') {
    container.innerHTML = `<p class="text-xs text-red-500 p-4">⚠️ Chưa tải thư viện FullCalendar!</p>`;
    return;
  }

  const calendar = new FullCalendar.Calendar(container, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek'
    },
    buttonText: { today: 'Hôm nay', month: 'Tháng', week: 'Tuần' },
    locale: 'vi',
    height: 'auto',
    dayMaxEvents: 2,
    eventDisplay: 'block',
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
    
    eventDidMount: function(info) {
      info.el.style.borderRadius = "8px";
      info.el.style.padding = "2px 6px";
      info.el.style.fontWeight = "bold";
      info.el.style.fontSize = "10px";
      info.el.style.whiteSpace = "nowrap";
      info.el.style.overflow = "hidden";
      info.el.style.textOverflow = "ellipsis";
      info.el.style.maxWidth = "100%";
      info.el.style.cursor = "pointer";
      info.el.style.border = "none";
    },

    eventClick: function(info) {
      const p = info.event.extendedProps;
      let itemsListStr = "Chưa rõ";
      try {
        const items = JSON.parse(p.vatPhamRaw);
        itemsListStr = items.map(it => `• ${it.name || it.id}: ${it.qty}`).join("\n");
      } catch(e) { itemsListStr = p.vatPhamRaw; }

      const startTime = info.event.start ? new Date(info.event.start).toLocaleString('vi-VN') : 'N/A';
      const endTime = info.event.end ? new Date(info.event.end).toLocaleString('vi-VN') : 'N/A';

      alert(`📋 CHI TIẾT PHIẾU MƯỢN\n\nMã Đơn: ${p.bookingId}\n🏢 Đơn vị: ${p.donVi}\n👤 Người đại diện: ${p.nguoiDaiDien}\n📞 SĐT: ${p.sdt}\n⏰ Mượn: ${startTime}\n⌛ Trả: ${endTime}\n📝 Ghi chú: ${p.ghiChu}\n-------------------\n📦 DỤNG CỤ:\n${itemsListStr}`);
    }
  });

  calendar.render();
  loadInventoryItems(); // Tải danh sách vật phẩm trống kho
}

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

// 8. TẢI TOÀN BỘ LỊCH SỬ ĐƠN MƯỢN (TAB LỊCH SỬ)
// TẢI TOÀN BỘ LỊCH SỬ ĐƠN MƯỢN HẬU CẦN (HIỂN THỊ TẤT CẢ ĐƠN VỊ)
async function loadUserBorrowHistory() {
  const tbody = document.getElementById("user-history-table");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-xs text-slate-400">⏳ Đang tải...</td></tr>`;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: "GET_ALL_BORROW_ORDERS" // Lấy toàn bộ danh sách đơn vị mượn
      })
    });

    const result = JSON.parse(await res.text());

    if (result.success && result.data && result.data.length > 0) {
      tbody.innerHTML = result.data.map(item => {
        let itemsStr = "";
        try {
          const items = JSON.parse(item.vatPhamRaw);
          if (Array.isArray(items)) {
            itemsStr = items.map(it => `<span class="inline-block bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded mr-1 mb-1 border border-slate-200"><b>${it.name || it.id}</b>: ${it.qty}</span>`).join(" ");
          } else { itemsStr = item.vatPhamRaw; }
        } catch(e) { itemsStr = item.vatPhamRaw || "Chưa rõ"; }

        const status = String(item.trangThai || "REGISTERED").toUpperCase();
        let statusBadge = `<span class="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">📋 Đã đăng ký</span>`;
        if (status === "DELIVERED" || status === "APPROVED") {
          statusBadge = `<span class="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">📦 Đã nhận</span>`;
        } else if (status === "RETURNED") {
          statusBadge = `<span class="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">🎉 Đã trả</span>`;
        } else if (status === "REJECTED" || status === "CANCELLED") {
          statusBadge = `<span class="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">❌ Hủy / Từ chối</span>`;
        }

        const tMuon = item.thoiGianMuon ? new Date(item.thoiGianMuon).toLocaleDateString('vi-VN') : 'N/A';
        const tTra = item.thoiGianTra ? new Date(item.thoiGianTra).toLocaleDateString('vi-VN') : 'N/A';

        return `
          <tr class="border-b hover:bg-slate-50 text-xs transition align-middle">
            <td class="p-3 font-extrabold text-blue-900 whitespace-nowrap">${item.bookingId}</td>
            <td class="p-3 font-medium text-slate-700 min-w-[180px]">${itemsStr}</td>
            <td class="p-3 text-slate-600 font-semibold whitespace-nowrap">${tMuon} - ${tTra}</td>
            <td class="p-3 font-bold text-slate-800 min-w-[160px]">
              <div>${item.donVi || 'Chưa rõ'}</div>
              <div class="text-[10px] text-slate-400 font-normal">Người đại diện: ${item.nguoiDaiDien || 'N/A'}</div>
            </td>
            <td class="p-3 whitespace-nowrap">${statusBadge}</td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-xs text-slate-400">Chưa có lịch sử đơn mượn nào trong hệ thống.</td></tr>`;
    }
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-xs text-red-500">❌ Lỗi kết nối máy chủ!</td></tr>`;
  }
}

// 9. TẢI BẢNG BÀN GIAO / THU HỒI (CTV/QTV)
async function loadAdminBorrowOrders() {
  const tbody = document.getElementById("admin-orders-table");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-xs text-slate-400">⏳ Đang tải ...</td></tr>`;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "GET_ALL_BORROW_ORDERS" })
    });
    const result = JSON.parse(await res.text());

    if (result.success && result.data && result.data.length > 0) {
      tbody.innerHTML = result.data.map(item => {
        let itemsStr = "";
        try {
          const items = JSON.parse(item.vatPhamRaw);
          if (Array.isArray(items)) {
            itemsStr = items.map(it => `<span class="inline-block bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded mr-1 mb-1 border border-slate-200"><b>${it.name || it.id}</b>: ${it.qty}</span>`).join(" ");
          } else { itemsStr = item.vatPhamRaw; }
        } catch(e) { itemsStr = item.vatPhamRaw || "Chưa rõ"; }

        const status = String(item.trangThai || "REGISTERED").toUpperCase();
        let statusBadge = `<span class="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">📋 Đã đăng ký</span>`;
        let actionButtons = `
          <button onclick="updateBorrowStatusAction('${item.bookingId}', 'DELIVERED')" class="whitespace-nowrap px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition shadow-sm cursor-pointer">📦 Bàn giao </button>
        `;

        if (status === "DELIVERED" || status === "APPROVED") {
          statusBadge = `<span class="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">📦 Đã nhận</span>`;
          actionButtons = `
            <button onclick="updateBorrowStatusAction('${item.bookingId}', 'RETURNED')" class="whitespace-nowrap px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition shadow-sm cursor-pointer">🎉 Thu hồi </button>
          `;
        } else if (status === "RETURNED") {
          statusBadge = `<span class="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">🎉 Đã trả</span>`;
          actionButtons = `<span class="whitespace-nowrap text-[11px] font-bold text-slate-400 italic">✅ Đã hoàn tất</span>`;
        } else if (status === "REJECTED" || status === "CANCELLED") {
          statusBadge = `<span class="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">❌ Đã hủy</span>`;
          actionButtons = `<span class="whitespace-nowrap text-[11px] font-bold text-rose-400 italic">❌ Đã từ chối</span>`;
        }

        const tMuon = item.thoiGianMuon ? new Date(item.thoiGianMuon).toLocaleDateString('vi-VN') : 'N/A';
        const tTra = item.thoiGianTra ? new Date(item.thoiGianTra).toLocaleDateString('vi-VN') : 'N/A';

        return `
          <tr class="border-b hover:bg-slate-50/80 text-xs transition align-middle">
            <td class="p-3 font-extrabold text-blue-900 whitespace-nowrap">${item.bookingId}</td>
            <td class="p-3 font-bold text-slate-800 min-w-[180px]">${item.donVi || 'Chưa rõ'}</td>
            <td class="p-3 font-medium text-slate-700 whitespace-nowrap">
              <div>${item.nguoiDaiDien || 'N/A'}</div>
              <div class="text-[10px] text-slate-400 font-normal">📞 ${item.sdt || 'N/A'}</div>
            </td>
            <td class="p-3 font-medium text-slate-700 min-w-[200px]">${itemsStr}</td>
            <td class="p-3 text-slate-600 font-semibold whitespace-nowrap">${tMuon} - ${tTra}</td>
            <td class="p-3 whitespace-nowrap">${statusBadge}</td>
            <td class="p-3 text-center whitespace-nowrap">${actionButtons}</td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-xs text-slate-400">Hiện chưa có đơn mượn nào cần bàn giao / thu hồi.</td></tr>`;
    }
  } catch(e) {
    console.error("Lỗi tải danh sách bàn giao:", e);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-xs text-red-500">❌ Lỗi kết nối máy chủ!</td></tr>`;
  }
}

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