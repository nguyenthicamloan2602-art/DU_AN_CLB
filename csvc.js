/**
 * MODULE 2: QUẢN LÝ CƠ SỞ VẬT CHẤT & XIN XE (CSVC.JS FULL CHUẨN ID KHẮC PHỤC LỊCH SỬ)
 */

let csvcCalendar = null;

// 🟢 HIỂN THỊ LỊCH CSVC VÀ XIN XE (SWEETALERT2 MODAL POPUP BÔI ĐEN CHỮ)
function renderCsvcCalendarEvents() {
  const calendarEl = document.getElementById('csvc-calendar-container');
  if (!calendarEl) return;

  if (!csvcCalendar) {
    csvcCalendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      height: 'auto',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: ''
      },
      eventDisplay: 'block',
      dayMaxEvents: 3,

      events: function(info, successCallback, failureCallback) {
        fetch(API_URL, {
          method: 'POST',
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: 'GET_CSVC_APPROVED_EVENTS' })
        })
        .then(res => res.json())
        .then(res => {
          if (res.success && Array.isArray(res.data)) {
            successCallback(res.data);
          } else {
            successCallback([]);
          }
        })
        .catch(err => {
          console.error("Lỗi tải lịch CSVC:", err);
          successCallback([]);
        });
      },

      // 🎨 STYLE THẺ MÀU PASTE3L NHẠT - CHỮ ĐẬM
      eventDidMount: function(info) {
        const p = info.event.extendedProps;
        const isLocation = (p.type === 'LOCATION');

        info.el.style.backgroundColor = isLocation ? "#e0e7ff" : "#fef3c7";
        info.el.style.borderColor = isLocation ? "#c7d2fe" : "#fde68a";
        info.el.style.color = isLocation ? "#3730a3" : "#92400e";
        info.el.style.borderRadius = "6px";
        info.el.style.padding = "2px 6px";
        info.el.style.fontSize = "11px";
        info.el.style.fontWeight = "800";

        // Ép toàn bộ chữ con thành màu đậm
        const childTexts = info.el.querySelectorAll('.fc-event-main, .fc-event-title, .fc-event-time');
        childTexts.forEach(el => {
          el.style.color = isLocation ? "#3730a3" : "#92400e";
          el.style.fontWeight = "800";
        });
      },

      // 🟢 CLICK POPUP BÔI ĐEN NỘI DUNG (DÙNG SWEETALERT2)
      eventClick: function(info) {
      const p = info.event.extendedProps;
      const startTime = info.event.start ? new Date(info.event.start).toLocaleString('vi-VN') : 'N/A';
      const endTime = info.event.end ? new Date(info.event.end).toLocaleString('vi-VN') : 'N/A';

      const isLocation = (p.type === 'LOCATION');
      
      const contentHtml = `
        <div style="text-align: left; font-size: 13px; line-height: 1.6; color: #334155;">
          <p style="margin-bottom: 6px;"><b>🏢 Đơn vị đăng ký:</b> <span style="color: #1e3a8a; font-weight: bold;">${p.donVi || 'Chưa rõ'}</span></p>
          <p style="margin-bottom: 6px;"><b>${isLocation ? '📍 Giảng đường / Địa điểm' : '🚐 Loại xe'}:</b> <span style="font-weight: bold;">${p.location || p.carType || 'N/A'}</span></p>
          <p style="margin-bottom: 6px;"><b>👤 Người đại diện:</b> ${p.name || 'N/A'} (📞 ${p.phone || 'N/A'})</p>
          <p style="margin-bottom: 6px;"><b>🟢 Bắt đầu:</b> <span style="color: #059669; font-weight: bold;">${startTime}</span></p>
          <p style="margin-bottom: 6px;"><b>🔴 Kết thúc:</b> <span style="color: #dc2626; font-weight: bold;">${endTime}</span></p>
          <p style="margin-bottom: 0;"><b>📝 Nội dung / Lý do:</b> ${p.reason || 'Không có'}</p>
        </div>
      `;

      Swal.fire({
        title: isLocation ? '🏛️ THÔNG TIN ĐĂNG KÝ CSVC' : '🚚 THÔNG TIN PHIẾU XIN XE',
        html: contentHtml,
        icon: 'info',
        confirmButtonText: 'Đóng',
        confirmButtonColor: '#1e3a8a',
        customClass: {
          popup: 'rounded-3xl'
        }
      });
    }
    });
  }

  csvcCalendar.render();
  csvcCalendar.refetchEvents();
}

// 🟢 2. GỬI PHIẾU ĐĂNG KÝ GIẢNG ĐƯỜNG & ĐỊA ĐIỂM
async function submitCsvcLocationOrder() {
  const user = window.currentUser;
  if (!user) return alert("⚠️ Vui lòng đăng nhập!");

  const location  = document.getElementById("csvc-loc-select")?.value;
  const email     = document.getElementById("csvc-loc-email")?.value;
  const name      = document.getElementById("csvc-loc-name")?.value;
  const phone     = document.getElementById("csvc-loc-phone")?.value;
  
  const startDate = document.getElementById("csvc-start-date")?.value;
  const startTime = document.getElementById("csvc-start-time")?.value || "08:00";
  const endDate   = document.getElementById("csvc-end-date")?.value;
  const endTime   = document.getElementById("csvc-end-time")?.value || "17:00";
  
  const reason    = document.getElementById("csvc-loc-reason")?.value;
  const fileLink  = document.getElementById("csvc-loc-file")?.value || "";
  const msgEl     = document.getElementById("csvc-loc-msg");

  if (!location || !email || !name || !phone || !startDate || !endDate || !reason) {
    if (msgEl) {
      msgEl.innerText = "⚠️ Vui lòng điền đầy đủ các thông tin bắt buộc (*)!";
      msgEl.className = "text-center text-xs font-bold mt-1 text-amber-600";
    }
    return alert("⚠️ Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
  }

  const fullStart = `${startDate} ${startTime}`;
  const fullEnd   = `${endDate} ${endTime}`;

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
        startTime: fullStart,
        endTime: fullEnd,
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
    if (result.success) {
      renderCsvcCalendarEvents();
      loadAllCsvcHistory();
    }
  } catch (e) {
    console.error("Lỗi gửi đơn CSVC:", e);
    if (msgEl) {
      msgEl.innerText = "❌ Lỗi kết nối gửi đơn CSVC!";
      msgEl.className = "text-center text-xs font-bold mt-1 text-rose-600";
    }
  }
}

// 🟢 GỬI PHIẾU XIN XE RA / VÀO TRƯỜNG (SỬA LỖI ĐỌC SAI ID NGÀY & GIỜ)
async function submitCsvcVehicleOrder() {
  const user = window.currentUser;
  if (!user) return alert("⚠️ Vui lòng đăng nhập!");

  const email   = document.getElementById("veh-email")?.value;
  const name    = document.getElementById("veh-name")?.value;
  const phone   = document.getElementById("veh-phone")?.value;
  const carType = document.getElementById("veh-cartype")?.value;
  
  // 🟢 ĐỌC ĐÚNG ID CỦA Ô NGÀY VÀ GIỜ ĐÃ TÁCH TRÊN GIAO DIỆN HTML
  const startDate = document.getElementById("veh-start-date")?.value || document.getElementById("veh-start")?.value;
  const startTime = document.getElementById("veh-start-time")?.value || "08:00";
  const endDate   = document.getElementById("veh-end-date")?.value || document.getElementById("veh-end")?.value;
  const endTime   = document.getElementById("veh-end-time")?.value || "17:00";
  
  const reason  = document.getElementById("veh-reason")?.value;
  const msgEl   = document.getElementById("veh-msg");

  // Kiểm tra thông tin bắt buộc
  if (!email || !name || !phone || !carType || !startDate || !endDate || !reason) {
    if (msgEl) {
      msgEl.innerText = "⚠️ Vui lòng điền đầy đủ các thông tin bắt buộc (*)!";
      msgEl.className = "text-center text-xs font-bold mt-1 text-amber-600";
    }
    return alert("⚠️ Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
  }

  // Ghép Ngày & Giờ chuẩn xác
  const fullStart = startDate.includes("T") ? startDate : `${startDate} ${startTime}`;
  const fullEnd   = endDate.includes("T") ? endDate : `${endDate} ${endTime}`;

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
        name: name,
        phone: phone,
        carType: carType,
        startTime: fullStart,
        endTime: fullEnd,
        reason: reason
      })
    });
    
    const result = JSON.parse(await res.text());
    if (msgEl) {
      msgEl.innerText = result.message;
      msgEl.className = `text-center text-xs font-bold mt-1 ${result.success ? 'text-emerald-600' : 'text-rose-600'}`;
    }
    alert(result.message);
    if (result.success) {
      if (typeof renderCsvcCalendarEvents === 'function') renderCsvcCalendarEvents();
      if (typeof loadAllCsvcHistory === 'function') loadAllCsvcHistory();
    }
  } catch (e) {
    console.error("Lỗi gửi đơn xin xe:", e);
    if (msgEl) {
      msgEl.innerText = "❌ Lỗi kết nối gửi đơn xin xe!";
      msgEl.className = "text-center text-xs font-bold mt-1 text-rose-600";
    }
  }
}

// 🟢 4. HÀM TẢI TẤT CẢ LỊCH SỬ ĐĂNG KÝ CSVC & XE (CHẨN ĐOÁN VÀ ĐỌC ĐÚNG THUỘC TÍNH)
function loadAllCsvcHistory() {
  const tbody = document.getElementById("csvc-history-table");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">Đang tải lịch sử CSVC...</td></tr>`;

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "GET_ALL_CSVC_HISTORY" })
  })
  .then(res => res.json())
  .then(res => {
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      let html = "";
      res.data.forEach(item => {
        let statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">⏳ Chờ duyệt</span>`;
        const st = String(item.status || item[12] || "").toUpperCase();
        if (st === "APPROVED" || st === "ĐÃ DUYỆT") {
          statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">✅ Đã duyệt</span>`;
        } else if (st === "REJECTED" || st === "TỪ CHỐI") {
          statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">❌ Từ chối</span>`;
        }

        const orderId = item.id || item[0] || '--';
        const donVi = item.donVi || item[3] || '--';
        const name = item.name || item[6] || '--';
        const target = item.targetName || item.location || item.carType || item[4] || '--';
        const tStart = item.startTime || item.start || item[8] || '--';
        const tEnd = item.endTime || item.end || item[9] || '--';

        html += `
          <tr class="border-b border-slate-100 hover:bg-slate-50 text-xs">
            <td class="p-3 font-bold text-blue-900">${orderId}</td>
            <td class="p-3 font-semibold text-slate-700">${donVi}</td>
            <td class="p-3 text-slate-600">${name}</td>
            <td class="p-3 text-slate-600 font-medium">${target}</td>
            <td class="p-3 text-slate-500 text-[11px]">
              <div>🟢 ${tStart}</div>
              <div>🔴 ${tEnd}</div>
            </td>
            <td class="p-3">${statusBadge}</td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    } else {
      tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400 font-bold">Chưa có dữ liệu lịch sử CSVC.</td></tr>`;
    }
  })
  .catch(err => {
    console.error("Lỗi tải lịch sử CSVC:", err);
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-rose-500 font-bold">❌ Lỗi kết nối lịch sử!</td></tr>`;
  });
}

// 🟢 5. TẢI DANH SÁCH ĐƠN CSVC CHỜ DUYỆT (CHO ADMIN)
async function loadPendingCsvcOrders() {
  const tbody = document.getElementById("csvc-pending-table");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-xs font-semibold text-slate-400">⏳ Đang tải đơn mới...</td></tr>`;

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

        let tStart = item.startTime || item.start;
        let tEnd = item.endTime || item.end;

        return `
          <tr class="border-b hover:bg-slate-50 text-xs transition align-middle">
            <td class="p-3 font-extrabold text-blue-900 whitespace-nowrap">${item.id}</td>
            <td class="p-3 font-bold text-slate-800 min-w-[150px]">${item.donVi} <br>${typeBadge}</td>
            <td class="p-3 text-slate-700 whitespace-nowrap">
              <div class="font-bold">${item.name}</div>
              <div class="text-[10px] text-slate-400">📞 ${item.phone}</div>
            </td>
            <td class="p-3 font-medium text-slate-800 min-w-[200px]">
              <div><b>Mục đích:</b> ${item.targetName || item.location || item.carType}</div>
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
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-xs text-slate-400">Hiện chưa có đơn đăng ký trên hệ thống.</td></tr>`;
    }
  } catch (e) {
    console.error("Lỗi tải đơn CSVC:", e);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-xs text-red-500">❌ Lỗi kết nối máy chủ!</td></tr>`;
  }
}

// 🟢 6. DUYỆT HOẶC TỪ CHỐI ĐƠN CSVC
async function approveCsvcOrder(orderId, orderType, currentStatus) {
  let newStatus = "";
  let rejectReason = "";

  if (currentStatus === 'APPROVED') {
    if (!confirm(`Bạn có chắc chắn muốn DUYỆT đơn ${orderId} này? Sự kiện sẽ tự động đẩy lên lịch chung.`)) return;
    newStatus = "APPROVED";
  } else if (currentStatus === 'REJECTED') {
    rejectReason = prompt(`Nhập lý do từ chối đơn ${orderId}:`, "Không đủ điều kiện thời gian/cơ sở vật chất");
    if (rejectReason === null) return;
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
    loadPendingCsvcOrders();
  } catch (e) {
    console.error("Lỗi cập nhật trạng thái đơn:", e);
    alert("❌ Lỗi kết nối khi xử lý đơn!");
  }
}

// KHAI BÁO BIẾN GLOBAL WINDOW
window.renderCsvcCalendarEvents = renderCsvcCalendarEvents;
window.submitCsvcLocationOrder = submitCsvcLocationOrder;
window.submitCsvcVehicleOrder = submitCsvcVehicleOrder;
window.loadAllCsvcHistory = loadAllCsvcHistory;
window.loadPendingCsvcOrders = loadPendingCsvcOrders;
window.approveCsvcOrder = approveCsvcOrder;