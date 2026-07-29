/**
 * MODULE 2: QUẢN LÝ CƠ SỞ VẬT CHẤT (CSVC.JS FULL CHUẨN ID)
 */

// 1. RENDER LỊCH CẢNH BÁO SỬ DỤNG GIẢNG ĐƯỜNG / ĐỊA ĐIỂM + XỬ LÝ CLICK XEM CHI TIẾT
async function renderCsvcCalendarEvents() {
  const container = document.getElementById("csvc-calendar-container");
  if (!container || typeof FullCalendar === 'undefined') return;

  const calendar = new FullCalendar.Calendar(container, {
    initialView: 'dayGridMonth',
    headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
    locale: 'vi',
    height: 'auto',
    events: async function(info, successCallback, failureCallback) {
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "GET_CSVC_APPROVED_EVENTS" })
        });
        const result = JSON.parse(await res.text());
        if (result.success && result.data) {
          successCallback(result.data);
        } else { successCallback([]); }
      } catch (e) { successCallback([]); }
    },
    
    // TẠO DẠNG THE BO TRÒN DỄ NHÌN
    eventDidMount: function(info) {
      info.el.style.borderRadius = "6px";
      info.el.style.padding = "2px 6px";
      info.el.style.fontWeight = "bold";
      info.el.style.fontSize = "10px";
      info.el.style.cursor = "pointer";
    },

    // BẮT SỰ KIỆN KHI CLICK VÀO LỊCH ĐỂ BẬT THÔNG TIN PHIẾU
    eventClick: function(info) {
      const p = info.event.extendedProps;
      
      const tStart = info.event.start ? new Date(info.event.start).toLocaleString('vi-VN') : 'N/A';
      const tEnd = info.event.end ? new Date(info.event.end).toLocaleString('vi-VN') : 'N/A';
      const linkStr = p.fileLink ? `\n📎 Link kế hoạch: ${p.fileLink}` : '';

      alert(
        `🏛️ THÔNG TIN CHI TIẾT ĐĂNG KÝ GIẢNG ĐƯỜNG / ĐỊA ĐIỂM\n\n` +
        `🔖 Mã đơn: ${p.id}\n` +
        `🏢 Đơn vị mượn: ${p.donVi}\n` +
        `📍 Giảng đường / Địa điểm: ${p.location}\n` +
        `👤 Người phụ trách: ${p.name} (📞 ${p.phone})\n` +
        `✉️ Email: ${p.email}\n` +
        `⏰ Bắt đầu: ${tStart}\n` +
        `⌛ Kết thúc: ${tEnd}\n` +
        `📝 Mục đích / Nội dung: ${p.reason}` +
        linkStr
      );
    }
  });

  calendar.render();
}

window.renderCsvcCalendarEvents = renderCsvcCalendarEvents;

// 2. GỬI PHIẾU ĐĂNG KÝ GIẢNG ĐƯỜNG & ĐỊA ĐIỂM
async function submitCsvcLocationOrder() {
  const user = window.currentUser;
  if (!user) return alert("⚠️ Vui lòng đăng nhập!");

  const location = document.getElementById("csvc-loc-select")?.value;
  const email    = document.getElementById("csvc-loc-email")?.value;
  const name     = document.getElementById("csvc-loc-name")?.value;
  const phone    = document.getElementById("csvc-loc-phone")?.value;
  const start    = document.getElementById("csvc-loc-start")?.value;
  const end      = document.getElementById("csvc-loc-end")?.value;
  const reason   = document.getElementById("csvc-loc-reason")?.value;
  const fileLink = document.getElementById("csvc-loc-file")?.value || "";
  const msgEl    = document.getElementById("csvc-loc-msg");

  if (!location || !email || !name || !phone || !start || !end || !reason) {
    if (msgEl) {
      msgEl.innerText = "⚠️ Vui lòng điền đầy đủ các thông tin bắt buộc (*)!";
      msgEl.className = "text-center text-xs font-bold mt-1 text-amber-600";
    }
    return alert("⚠️ Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
  }

  if (msgEl) {
    msgEl.innerText = "⏳ Đang gửi phiếu đăng ký...";
    msgEl.className = "text-center text-xs font-bold mt-1 text-blue-600";
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "SUBMIT_CSVC_LOCATION",
        username: user.username,
        donVi: user.tenDonVi || user.username,
        email: email,
        name: name,
        phone: phone,
        location: location,
        startTime: start,
        endTime: end,
        reason: reason,
        fileLink: fileLink
      })
    });
    const result = JSON.parse(await res.text());
    if (msgEl) {
      msgEl.innerText = result.message;
      msgEl.className = `text-center text-xs font-bold mt-1 ${result.success ? 'text-emerald-600' : 'text-rose-600'}`;
    }
    alert(result.message);
  } catch (e) {
    if (msgEl) {
      msgEl.innerText = "❌ Lỗi gửi đơn CSVC!";
      msgEl.className = "text-center text-xs font-bold mt-1 text-rose-600";
    }
  }
}

// 3. GỬI PHIẾU XIN XE RA / VÀO TRƯỜNG
async function submitCsvcVehicleOrder() {
  const user = window.currentUser;
  if (!user) return alert("⚠️ Vui lòng đăng nhập!");

  const email   = document.getElementById("veh-email")?.value;
  const name    = document.getElementById("veh-name")?.value;
  const phone   = document.getElementById("veh-phone")?.value;
  const carType = document.getElementById("veh-cartype")?.value;
  const start   = document.getElementById("veh-start")?.value;
  const end     = document.getElementById("veh-end")?.value;
  const reason  = document.getElementById("veh-reason")?.value;
  const file    = document.getElementById("veh-file")?.value || "";
  const msgEl   = document.getElementById("veh-msg");

  if (!email || !name || !phone || !carType || !start || !end || !reason) {
    if (msgEl) {
      msgEl.innerText = "⚠️ Vui lòng điền đầy đủ các thông tin bắt buộc (*)!";
      msgEl.className = "text-center text-xs font-bold mt-1 text-amber-600";
    }
    return alert("⚠️ Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
  }

  if (msgEl) {
    msgEl.innerText = "⏳ Đang gửi phiếu xin xe...";
    msgEl.className = "text-center text-xs font-bold mt-1 text-blue-600";
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "SUBMIT_CSVC_VEHICLE",
        username: user.username,
        donVi: user.tenDonVi || user.username,
        email: email,
        manager: name,
        phone: phone,
        carType: carType,
        timeIn: start,
        timeOut: end,
        reason: reason,
        fileLink: file
      })
    });
    const result = JSON.parse(await res.text());
    if (msgEl) {
      msgEl.innerText = result.message;
      msgEl.className = `text-center text-xs font-bold mt-1 ${result.success ? 'text-emerald-600' : 'text-rose-600'}`;
    }
    alert(result.message);
  } catch (e) {
    if (msgEl) {
      msgEl.innerText = "❌ Lỗi gửi đơn xin xe!";
      msgEl.className = "text-center text-xs font-bold mt-1 text-rose-600";
    }
  }
}
// TẢI DANH SÁCH ĐƠN CSVC CHỜ DUYỆT (CHO QTV)
async function loadPendingCsvcOrders() {
  const tbody = document.getElementById("csvc-pending-table");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-xs font-semibold text-slate-400">⏳ Đang tải danh sách đơn CSVC từ Google Sheet...</td></tr>`;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "GET_PENDING_CSVC_ORDERS" })
    });
    
    const result = JSON.parse(await res.text());

    if (result.success && result.data && result.data.length > 0) {
      tbody.innerHTML = result.data.map(item => {
        const typeBadge = item.type === "LOCATION" 
          ? `<span class="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">📍 Địa Điểm</span>`
          : `<span class="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">🚐 Xe Ra/Vào</span>`;

        const status = String(item.status || "PENDING").toUpperCase();
        let statusBadge = `<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-200 whitespace-nowrap">📋 Chờ Duyệt</span>`;
        if (status === "APPROVED") statusBadge = `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-200 whitespace-nowrap">✅ Đã Duyệt</span>`;
        if (status === "REJECTED") statusBadge = `<span class="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-rose-200 whitespace-nowrap">❌ Từ Chối</span>`;

        const fileLinkHtml = item.fileLink && item.fileLink.trim() !== "" 
          ? `<a href="${item.fileLink}" target="_blank" class="text-blue-600 underline font-bold text-[11px]">📎 Xem File</a>` 
          : `<span class="text-slate-400 text-[10px]">Không có</span>`;

        // Ép kiểu hiển thị thời gian an toàn
        let tStart = item.startTime;
        let tEnd = item.endTime;
        try { if(new Date(item.startTime).getTime()) tStart = new Date(item.startTime).toLocaleString('vi-VN'); } catch(e){}
        try { if(new Date(item.endTime).getTime()) tEnd = new Date(item.endTime).toLocaleString('vi-VN'); } catch(e){}

        return `
          <tr class="border-b hover:bg-slate-50 text-xs transition align-middle">
            <td class="p-3 font-extrabold text-blue-900 whitespace-nowrap">${item.id}</td>
            <td class="p-3 font-bold text-slate-800 min-w-[150px]">${item.donVi} <br>${typeBadge}</td>
            <td class="p-3 text-slate-700 whitespace-nowrap">
              <div class="font-bold">${item.name}</div>
              <div class="text-[10px] text-slate-400">📞 ${item.phone}</div>
            </td>
            <td class="p-3 font-medium text-slate-800 min-w-[200px]">
              <div><b>Mục đích:</b> ${item.targetName}</div>
              <div class="text-[10px] text-slate-500">Lý do: ${item.reason}</div>
              <div class="mt-0.5">${fileLinkHtml}</div>
            </td>
            <td class="p-3 text-slate-600 font-semibold whitespace-nowrap">${tStart}<br>➔ ${tEnd}</td>
            <td class="p-3 whitespace-nowrap">${statusBadge}</td>
            <td class="p-3 text-center whitespace-nowrap space-x-1">
              ${status === "PENDING" ? `
                <button onclick="approveCsvcOrder('${item.id}', '${item.type}', 'APPROVED')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition shadow cursor-pointer">Duyệt</button>
                <button onclick="approveCsvcOrder('${item.id}', '${item.type}', 'REJECTED')" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition shadow cursor-pointer">Từ chối</button>
              ` : `<span class="text-[10px] text-slate-400 italic">Đã xử lý</span>`}
            </td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-xs text-slate-400">Hiện chưa có đơn mượn CSVC nào trong hệ thống.</td></tr>`;
    }
  } catch (e) {
    console.error("Lỗi tải đơn CSVC:", e);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-xs text-red-500">❌ Lỗi kết nối máy chủ! (Kiểm tra lại Apps Script Deployment)</td></tr>`;
  }
}

window.loadPendingCsvcOrders = loadPendingCsvcOrders;

// KHAI BÁO BIẾN WINDOW
window.renderCsvcCalendarEvents = renderCsvcCalendarEvents;
window.submitCsvcLocationOrder = submitCsvcLocationOrder;
window.submitCsvcVehicleOrder = submitCsvcVehicleOrder;
// 1. DUYỆT HOẶC TỪ CHỐI ĐƠN CSVC (CÓ NHẬP LÝ DO KHI TỪ CHỐI)
async function approveCsvcOrder(orderId, orderType, currentStatus) {
  let newStatus = "";
  let rejectReason = "";

  if (currentStatus === 'APPROVED') {
    if (!confirm(`Bạn có chắc chắn muốn DUYỆT đơn ${orderId} này? Sự kiện sẽ tự động đẩy lên lịch chung.`)) return;
    newStatus = "APPROVED";
  } else if (currentStatus === 'REJECTED') {
    rejectReason = prompt(`Nhập lý do từ chối đơn ${orderId}:`, "Không đủ điều kiện thời gian/cơ sở vật chất");
    if (rejectReason === null) return; // Người dùng bấm Hủy
    if (!rejectReason.trim()) {
      alert("⚠️ Vui lòng nhập lý do từ chối!");
      return;
    }
    newStatus = "REJECTED";
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "UPDATE_CSVC_STATUS",
        orderId: orderId,
        orderType: orderType,
        status: newStatus,
        reason: rejectReason
      })
    });
    const result = JSON.parse(await res.text());
    alert(result.message);
    loadPendingCsvcOrders(); // Tải lại danh sách chờ duyệt
  } catch (e) {
    console.error("Lỗi cập nhật trạng thái đơn:", e);
    alert("❌ Lỗi kết nối khi xử lý đơn!");
  }
}

// 2. TẢI TOÀN BỘ LỊCH SỬ ĐƠN CSVC (CHO TAB LỊCH SỬ)
async function loadAllCsvcHistory() {
  const tbody = document.getElementById("csvc-history-table");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-xs font-semibold text-slate-400">⏳ Đang tải...</td></tr>`;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "GET_ALL_CSVC_HISTORY" })
    });
    
    const result = JSON.parse(await res.text());

    if (result.success && result.data && result.data.length > 0) {
      tbody.innerHTML = result.data.map(item => {
        const typeBadge = item.type === "LOCATION" 
          ? `<span class="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">📍 Địa Điểm</span>`
          : `<span class="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">🚐 Xe Ra/Vào</span>`;

        const status = String(item.status || "PENDING").toUpperCase();
        let statusBadge = `<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-200 whitespace-nowrap">📋 Chờ Duyệt</span>`;
        if (status === "APPROVED") statusBadge = `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-200 whitespace-nowrap">✅ Đã Duyệt</span>`;
        if (status === "REJECTED") statusBadge = `<span class="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-rose-200 whitespace-nowrap" title="Lý do: ${item.rejectReason || 'Không có'}">❌ Từ Chối</span>`;

        let tStart = item.startTime;
        let tEnd = item.endTime;
        try { if(new Date(item.startTime).getTime()) tStart = new Date(item.startTime).toLocaleString('vi-VN'); } catch(e){}
        try { if(new Date(item.endTime).getTime()) tEnd = new Date(item.endTime).toLocaleString('vi-VN'); } catch(e){}

        return `
          <tr class="border-b hover:bg-slate-50 text-xs transition align-middle">
            <td class="p-3 font-extrabold text-blue-900 whitespace-nowrap">${item.id}</td>
            <td class="p-3 font-bold text-slate-800 min-w-[150px]">${item.donVi} <br>${typeBadge}</td>
            <td class="p-3 text-slate-700 whitespace-nowrap">
              <div class="font-bold">${item.name}</div>
              <div class="text-[10px] text-slate-400">📞 ${item.phone}</div>
            </td>
            <td class="p-3 font-medium text-slate-800 min-w-[200px]">
              <div><b>Mục đích:</b> ${item.targetName}</div>
              <div class="text-[10px] text-slate-500">Mô tả: ${item.reason}</div>
              ${status === "REJECTED" && item.rejectReason ? `<div class="text-[10px] text-rose-600 font-bold mt-1">Lý do từ chối: ${item.rejectReason}</div>` : ''}
            </td>
            <td class="p-3 text-slate-600 font-semibold whitespace-nowrap">${tStart}<br>➔ ${tEnd}</td>
            <td class="p-3 whitespace-nowrap">${statusBadge}</td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-xs text-slate-400">Chưa có lịch sử đơn CSVC nào trong hệ thống.</td></tr>`;
    }
  } catch (e) {
    console.error("Lỗi tải lịch sử đơn CSVC:", e);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-xs text-red-500">❌ Lỗi kết nối máy chủ!</td></tr>`;
  }
}

// Gán biến toàn cục
window.approveCsvcOrder = approveCsvcOrder;
window.loadAllCsvcHistory = loadAllCsvcHistory;