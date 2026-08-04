/**
 * ====================================================================
 * PHÂN HỆ QUẢN LÝ CỘNG TÁC VIÊN (CTV) & QUẢN TRỊ VIÊN (QTV)
 * ====================================================================
 */

let html5QrcodeScanner = null;
let globalProgramsCache = [];
let ctvCalendar = null;
let currentSelectedDate = "";
let allSchedulesData = [];
let openStartDate = null;
let openEndDate = null;

// Khung Ca cố định tại Văn phòng Đoàn - Hội
const FIXED_SHIFTS = [
  { id: "Ca 1", time: "08:00 - 10:00", start: "08:00", end: "10:00" },
  { id: "Ca 2", time: "10:00 - 12:00", start: "10:00", end: "12:00" },
  { id: "Ca 3", time: "13:00 - 15:00", start: "13:00", end: "15:00" },
  { id: "Ca 4", time: "15:00 - 17:00", start: "15:00", end: "17:00" },
  { id: "Ca 5", time: "17:00 - 19:00", start: "17:00", end: "19:00" },
  { id: "Ca 6", time: "19:00 - 21:00", start: "19:00", end: "21:00" }
];

function switchCtvSubTab(subTabId) {
  const tabs = ['ctv-subtab-schedule', 'ctv-subtab-events', 'ctv-subtab-progress', 'ctv-subtab-checkin', 'ctv-subtab-admin'];
  tabs.forEach(tab => document.getElementById(tab)?.classList.add('hidden'));

  const activeTab = document.getElementById(subTabId);
  if (activeTab) activeTab.classList.remove('hidden');

  const currentUser = window.currentUser ? window.currentUser.username : "";
  const isQtv = window.currentUser && (window.currentUser.role === 'QTV' || window.currentUser.role === 'ADMIN');

  if (subTabId === 'ctv-subtab-schedule') {
    loadAllWeeklySchedules();
  } else if (subTabId === 'ctv-subtab-events') {
    loadEventsFromSheet();
  } else if (subTabId === 'ctv-subtab-progress') {
    loadCtvProgressDoubleCircle(currentUser);
  } else if (subTabId === 'ctv-subtab-admin') {
    loadAdminRankTable();
  } else if (subTabId === 'ctv-subtab-checkin') {
    const ctvScannerBox = document.getElementById('ctv-scanner-container');
    const qtvLogBox = document.getElementById('qtv-checkin-log-container');

    if (isQtv) {
      if (ctvScannerBox) ctvScannerBox.classList.add('hidden');
      if (qtvLogBox) qtvLogBox.classList.remove('hidden');
      loadQtvCheckinLogs();
    } else {
      if (ctvScannerBox) ctvScannerBox.classList.remove('hidden');
      if (qtvLogBox) qtvLogBox.classList.add('hidden');
    }
  }
}

// ==================== BỔ SUNG HÀM LOAD NHẬT KÝ ĐIỂM DANH DÀNH CHO QTV ====================
async function loadQtvCheckinLogs() {
  const dateInput = document.getElementById("qtv-filter-date");
  const selectedDate = dateInput?.value || new Date().toISOString().split('T')[0];
  const tableBody = document.getElementById("qtv-checkin-table-body");

  if (!tableBody) return;
  tableBody.innerHTML = `<tr><td colspan="5" class="p-5 text-center text-slate-400">⏳ Đang lấy dữ liệu điểm danh ngày ${selectedDate}...</td></tr>`;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "GET_TODAY_CHECKIN_LOGS", dateStr: selectedDate })
    });
    const result = JSON.parse(await res.text());

    if (!result.success || !result.logs || result.logs.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="p-5 text-center text-slate-400">Không có lượt điểm danh nào trong ngày ${selectedDate}.</td></tr>`;
      updateCheckinStats(0, 0, 0);
      return;
    }

    let inCount = 0, outCount = 0, htmlRows = "";

    result.logs.forEach(log => {
      if (log.type === "IN") inCount++;
      if (log.type === "OUT") outCount++;

      const isWarning = log.ghiChu.includes("[CẢNH BÁO");
      const badgeType = log.type === "IN" 
        ? `<span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md">🟢 VÀO CA</span>`
        : `<span class="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-md">🔴 RA CA</span>`;

      const warningBadge = isWarning 
        ? `<div class="text-amber-700 font-semibold bg-amber-50 p-1.5 rounded border border-amber-200 text-[11px]">⚠️ ${log.ghiChu}</div>`
        : `<span class="text-slate-600">${log.ghiChu || "-"}</span>`;

      htmlRows += `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
          <td class="p-3 font-mono font-bold text-slate-700">${log.time}</td>
          <td class="p-3 font-bold text-blue-900">${log.username}</td>
          <td class="p-3">${badgeType}</td>
          <td class="p-3 font-mono text-[11px] text-slate-500">${log.deviceId || "Không xác định"}</td>
          <td class="p-3">${warningBadge}</td>
        </tr>
      `;
    });

    tableBody.innerHTML = htmlRows;
    updateCheckinStats(result.logs.length, inCount, outCount);
  } catch (err) { tableBody.innerHTML = `<tr><td colspan="5" class="p-5 text-center text-rose-500">❌ Lỗi kết nối dữ liệu điểm danh!</td></tr>`; }
}

function updateCheckinStats(total, inNum, outNum) {
  if (document.getElementById("stat-total-checkin")) document.getElementById("stat-total-checkin").innerText = total;
  if (document.getElementById("stat-in-checkin")) document.getElementById("stat-in-checkin").innerText = inNum;
  if (document.getElementById("stat-out-checkin")) document.getElementById("stat-out-checkin").innerText = outNum;
}

// BẮT BUỘC KHAI BÁO VÀO WINDOW ĐỂ TRÁNH LỖI REFERENCEERROR
window.loadQtvCheckinLogs = loadQtvCheckinLogs;
window.updateCheckinStats = updateCheckinStats;

// 1. LỊCH TRỰC VĂN PHÒNG - HIỂN THỊ TÊN LÊN LỊCH VÀ KHÔNG GIỚI HẠN NGƯỜI
async function loadAllWeeklySchedules() {
  const calendarEl = document.getElementById('ctv-calendar-container');
  if (!calendarEl) return;

  if (!ctvCalendar) {
    ctvCalendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      locale: 'vi',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek'
      },
      selectable: true,
      
      dateClick: function(info) {
        const user = window.currentUser || {};
        const isQtv = (user.role === 'QTV' || user.role === 'ADMIN');

        if (!isQtv && openStartDate && openEndDate) {
          const selectedTime = new Date(info.dateStr).getTime();
          const startTime = new Date(openStartDate).getTime();
          const endTime = new Date(openEndDate).getTime();

          if (selectedTime < startTime || selectedTime > endTime) {
            return alert(`⚠️ QTV hiện chỉ mở đăng ký lịch từ ngày ${formatDateVN(openStartDate)} đến ${formatDateVN(openEndDate)}!`);
          }
        }
        openRegisterShiftModal(info.dateStr);
      },

      eventClick: function(info) {
        alert(`👤 Trực ca: ${info.event.title}\n⏰ Khung giờ: ${info.event.extendedProps.timeDisplay}\n📝 Ghi chú: ${info.event.extendedProps.ghiChu || 'Không có'}`);
      }
    });
    ctvCalendar.render();
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "GET_ALL_WEEKLY_SCHEDULES" })
    });
    const result = JSON.parse(await res.text());
    
    if (result.success) {
      openStartDate = result.openStartDate || null;
      openEndDate = result.openEndDate || null;

      const label = document.getElementById('open-date-range-label');
      if (label) {
        label.innerText = (openStartDate && openEndDate) 
          ? `${formatDateVN(openStartDate)} đến ${formatDateVN(openEndDate)}` 
          : "Chưa mở đăng ký";
      }

      allSchedulesData = result.data || [];
      ctvCalendar.removeAllEvents();
      
      // Vẽ tên người trực trực tiếp lên ô Lịch ngay sau khi nhận dữ liệu
      allSchedulesData.forEach(item => {
        ctvCalendar.addEvent({
          title: `👤 ${item.hoTen || item.username} (${item.shiftId || 'Ca trực'})`,
          start: `${item.dateStr}T${item.startTime}`,
          end: `${item.dateStr}T${item.endTime}`,
          backgroundColor: '#0284c7',
          borderColor: '#1e3a8a',
          extendedProps: { 
            ghiChu: item.ghiChu,
            timeDisplay: `${item.startTime} - ${item.endTime}`
          }
        });
      });
    }
  } catch (err) {
    console.error("Lỗi tải lịch trực:", err);
  }
}

// Bật Modal chọn Ca trực (KHÔNG GIỚI HẠN SỐ LƯỢNG NGƯỜI)
function openRegisterShiftModal(dateStr) {
  currentSelectedDate = dateStr;
  document.getElementById('shift-date').value = dateStr;
  
  const parts = dateStr.split('-');
  const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
  document.getElementById('shift-modal-date-label').innerText = `Ngày chọn: ${formattedDate}`;

  const daySchedules = allSchedulesData.filter(s => s.dateStr === dateStr);
  const container = document.getElementById('shift-slots-container');
  
  let html = "";
  FIXED_SHIFTS.forEach(shift => {
    const takenList = daySchedules.filter(s => s.shiftId === shift.id || (s.startTime === shift.start && s.endTime === shift.end));
    const user = window.currentUser || {};
    const isMyShift = takenList.some(s => s.username === user.username);

    html += `
      <label class="flex items-center justify-between p-2.5 rounded-xl border ${isMyShift ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200'} cursor-pointer hover:bg-blue-50/50 transition">
        <div class="flex items-center gap-2">
          <input type="radio" name="shift_slot" value="${shift.id}" ${isMyShift ? 'checked' : ''} class="w-4 h-4 text-blue-600">
          <div>
            <span class="font-extrabold text-slate-800 text-xs">${shift.id} (${shift.time})</span>
            ${takenList.length > 0 ? `<div class="text-[10px] text-slate-500 mt-0.5">👥 Đã ký (${takenList.length}): ${takenList.map(t => t.hoTen || t.username).join(', ')}</div>` : ''}
          </div>
        </div>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
          Mở đăng ký (${takenList.length} người)
        </span>
      </label>`;
  });

  container.innerHTML = html;
  document.getElementById('modal-register-shift')?.classList.remove('hidden');
}

function closeRegisterShiftModal() { document.getElementById('modal-register-shift')?.classList.add('hidden'); }

// Đăng ký ca trực với phản ứng Nút bấm (Visual Feedback)
async function submitWeeklySchedule(e) {
  if (e) e.preventDefault();
  
  const btnSubmit = document.getElementById('btn-submit-shift');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerText = "⏳ Đang đăng ký...";
  }

  const user = window.currentUser || { username: '' };
  const shiftDate = document.getElementById('shift-date')?.value;
  const selectedRadio = document.querySelector('input[name="shift_slot"]:checked');
  const note = document.getElementById('shift-note')?.value || '';

  if (!selectedRadio) {
    if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerText = "Xác Nhận Đăng Ký"; }
    return alert("⚠️ Vui lòng chọn 1 ca trực!");
  }

  const shiftId = selectedRadio.value;
  const shiftObj = FIXED_SHIFTS.find(s => s.id === shiftId);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "SUBMIT_WEEKLY_SCHEDULE",
        username: user.username,
        hoTen: user.hoTen || user.username,
        dateStr: shiftDate,
        shiftId: shiftId,
        startTime: shiftObj.start,
        endTime: shiftObj.end,
        note: note
      })
    });

    const result = JSON.parse(await res.text());
    if (result.success) {
      alert(result.message || "🎉 Đăng ký ca trực thành công!");
      closeRegisterShiftModal();
      loadAllWeeklySchedules(); // Hiển thị tên lên Lịch ngay lập tức
    } else alert("❌ Lỗi: " + result.message);
  } catch (err) { 
    alert("❌ Lỗi kết nối!"); 
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = "Xác Nhận Đăng Ký";
    }
  }
}

function openConfigScheduleModal() {
  document.getElementById('cfg-open-start').value = openStartDate || "";
  document.getElementById('cfg-open-end').value = openEndDate || "";
  document.getElementById('modal-config-schedule')?.classList.remove('hidden');
}

function closeConfigScheduleModal() { document.getElementById('modal-config-schedule')?.classList.add('hidden'); }

async function submitConfigScheduleRange(e) {
  if (e) e.preventDefault();
  const startDate = document.getElementById('cfg-open-start')?.value;
  const endDate = document.getElementById('cfg-open-end')?.value;

  if (!startDate || !endDate) return alert("⚠️ Vui lòng chọn ngày mở và kết thúc!");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "CONFIG_OPEN_SCHEDULE_RANGE", startDate: startDate, endDate: endDate })
    });
    const result = JSON.parse(await res.text());
    if (result.success) {
      alert("🎉 Đã lưu cấu hình mở lịch trực thành công!");
      closeConfigScheduleModal();
      loadAllWeeklySchedules();
    } else alert("❌ Lỗi: " + result.message);
  } catch(err) { alert("❌ Lỗi kết nối!"); }
}

// 2. CHƯƠNG TRÌNH HOẠT ĐỘNG
async function loadEventsFromSheet() {
  const container = document.getElementById("ctv-events-list");
  if (!container) return;
  container.innerHTML = `<p class="text-slate-400 text-center py-8 text-xs">⏳ Đang tải chương trình...</p>`;
  try {
    const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "GET_PROGRAMS", username: window.currentUser?.username || "" }) });
    const result = JSON.parse(await res.text());
    globalProgramsCache = result.data || [];
    renderProgramsList(globalProgramsCache);
  } catch (e) { container.innerHTML = `<p class="text-slate-400 text-center py-4 text-xs">Hiện chưa có chương trình mở đăng ký.</p>`; }
}

function formatDateVN(dateStr) {
  if (!dateStr || dateStr === "N/A") return "Không giới hạn";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function renderProgramsList(programs) {
  const container = document.getElementById("ctv-events-list");
  if (!container) return;
  if (!programs || programs.length === 0) { container.innerHTML = `<p class="text-slate-400 text-center py-8 text-xs">Hiện chưa có chương trình mở đăng ký.</p>`; return; }
  
  let html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-5">`;

  programs.forEach(prog => {
    let positionsHtml = `<div class="space-y-1.5 my-3">`;
    (prog.positions || []).forEach(pos => {
      positionsHtml += `<div class="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl border"><span class="font-bold text-slate-700">${pos.name}</span><span class="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-50 text-blue-800 border">${pos.registered}/${pos.quota} (Còn ${pos.remaining})</span></div>`;
    });
    positionsHtml += `</div>`;

    const formattedDeadline = formatDateVN(prog.hanDangKy);

    let actionBtn = prog.isUserRegistered 
      ? `<button disabled class="w-full py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl border">✅ Đã đăng ký (${prog.userRegisteredPos})</button>`
      : `<button onclick="openProgramRegisterModal('${prog.id}')" class="w-full py-2 bg-gradient-to-r from-[#1e3a8a] to-[#0284c7] text-white font-bold text-xs rounded-xl shadow cursor-pointer active:scale-95 transition">🚀 Đăng Ký Tham Gia</button>`;

    let adminBtn = `<button onclick="viewProgramRegisteredList('${prog.id}')" class="mt-2 w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer active:scale-95">👥 Xem Danh Sách Đăng Ký</button>`;

    html += `
      <div class="bg-white rounded-3xl border p-5 flex flex-col justify-between shadow-sm">
        <div>
          <div class="flex justify-between items-start gap-2">
            <h4 class="text-sm font-extrabold text-slate-900">${prog.tenChuongTrinh}</h4>
            <span class="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 whitespace-nowrap">⏳ Hạn: ${formattedDeadline}</span>
          </div>
          <p class="text-xs text-slate-500 mt-2 line-clamp-2">${prog.moTa || 'Chưa có mô tả'}</p>
          ${positionsHtml}
        </div>
        <div class="pt-3 border-t border-slate-100">${actionBtn}${adminBtn}</div>
      </div>`;
  });
  container.innerHTML = html + `</div>`;
}

async function submitCreateProgram(e) {
  if (e) e.preventDefault();
  const autoProgId = "CT_" + new Date().getTime();
  const progData = {
    id: autoProgId,
    name: document.getElementById("prog-name")?.value || "",
    desc: document.getElementById("prog-desc")?.value || "",
    status: document.getElementById("prog-status")?.value || "OPEN",
    deadline: document.getElementById("prog-deadline")?.value || "",
    positions: document.getElementById("prog-positions")?.value || ""
  };

  if (!progData.name) return alert("⚠️ Vui lòng nhập tên chương trình!");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "CREATE_PROGRAM", program: progData })
    });
    const result = JSON.parse(await res.text());
    if (result.success) {
      alert("🎉 Tạo chương trình thành công!");
      document.getElementById("modal-create-program")?.classList.add("hidden");
      loadEventsFromSheet();
    } else alert("❌ Lỗi: " + result.message);
  } catch (err) { alert("❌ Lỗi kết nối!"); }
}

// 3. XẾP LOẠI & ĐIỂM DANH CTV
async function loadAdminRankTable() {
  const container = document.getElementById("ctv-admin-rank-table");
  if (!container) return;
  container.innerHTML = `<p class="text-slate-400 text-center py-6 text-xs font-semibold">⏳ Đang tải bảng thống kê xếp loại...</p>`;

  try {
    const res = await fetch(API_URL, { 
      method: "POST", 
      headers: { "Content-Type": "text/plain;charset=utf-8" }, 
      body: JSON.stringify({ action: "GET_ALL_CTV_RANK_DATA" }) 
    });
    const result = JSON.parse(await res.text());
    if (result.success && result.data && result.data.length > 0) {
      renderAdminRankTable(result.data);
    } else {
      container.innerHTML = `<p class="text-slate-400 text-center py-6 text-xs">Hiện chưa có dữ liệu CTV_TienDo.</p>`;
    }
  } catch (err) { container.innerHTML = `<p class="text-rose-500 text-center py-6 text-xs">❌ Lỗi kết nối!</p>`; }
}

function renderAdminRankTable(data) {
  const container = document.getElementById("ctv-admin-rank-table");
  if (!container) return;

  let html = `
    <div class="overflow-x-auto rounded-2xl border shadow-sm"><table class="w-full bg-white text-xs border-collapse min-w-[750px]"><thead class="bg-blue-50 text-blue-900 font-extrabold border-b"><tr><th class="py-3 px-3 text-left">Mã Số / CTV</th><th class="py-3 px-3 text-center">Ca Trực (Đã/Chỉ tiêu)</th><th class="py-3 px-3 text-center">Sự Kiện (Đã/Chỉ tiêu)</th><th class="py-3 px-3 text-center">Xếp Loại Đề Xuất</th><th class="py-3 px-3 text-center">Xếp Loại Chính Thức</th><th class="py-3 px-3 text-center">Thao Tác</th></tr></thead><tbody class="divide-y">`;

  data.forEach(item => {
    html += `
      <tr class="hover:bg-slate-50 transition align-middle">
        <td class="py-3 px-3 font-extrabold text-slate-800">${item.username}</td>
        <td class="py-3 px-3 text-center font-bold text-slate-700">${item.caTruc}/${item.chiTieuCa} ca</td>
        <td class="py-3 px-3 text-center font-bold text-slate-700">${item.suKien}/${item.chiTieuSuKien} SK</td>
        <td class="py-3 px-3 text-center"><span class="px-2.5 py-1 bg-blue-100 text-blue-900 rounded-full font-bold text-[10px]">${item.xepLoaiDeXuat || 'Trung bình'}</span></td>
        <td class="py-3 px-3 text-center">
          <select id="rank-select-${item.username}" class="border rounded-lg text-xs font-bold p-1 bg-white outline-none">
            <option value="Xuất sắc" ${item.xepLoaiChinhThuc === 'Xuất sắc' ? 'selected' : ''}>Xuất sắc</option>
            <option value="Tốt" ${item.xepLoaiChinhThuc === 'Tốt' ? 'selected' : ''}>Tốt</option>
            <option value="Khá" ${item.xepLoaiChinhThuc === 'Khá' ? 'selected' : ''}>Khá</option>
            <option value="Trung bình" ${item.xepLoaiChinhThuc === 'Trung bình' ? 'selected' : ''}>Trung bình</option>
            <option value="Chưa đạt" ${item.xepLoaiChinhThuc === 'Chưa đạt' ? 'selected' : ''}>Chưa đạt</option>
          </select>
        </td>
        <td class="py-3 px-3 text-center">
          <button onclick="approveCtvRank('${item.username}', ${item.caTruc}, ${item.suKien})" class="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl text-[10px] font-bold shadow cursor-pointer active:scale-95">Phê Duyệt</button>
        </td>
      </tr>`;
  });
  container.innerHTML = html + `</tbody></table></div>`;
}

async function approveCtvRank(username, caTruc, suKien) {
  const selectEl = document.getElementById(`rank-select-${username}`);
  if (!selectEl) return;
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "APPROVE_CTV_RANK", username: username, caTruc: caTruc, suKien: suKien, xepLoaiChinhThuc: selectEl.value })
    });
    const result = JSON.parse(await res.text());
    alert(result.message || "✅ Đã phê duyệt!");
    loadAdminRankTable();
  } catch (err) { alert("❌ Lỗi kết nối!"); }
}

// KHAI BÁO CÔNG KHAI TOÀN CỤC
window.switchCtvSubTab = switchCtvSubTab;
window.submitWeeklySchedule = submitWeeklySchedule;
window.loadAllWeeklySchedules = loadAllWeeklySchedules;
window.openRegisterShiftModal = openRegisterShiftModal;
window.closeRegisterShiftModal = closeRegisterShiftModal;
window.openConfigScheduleModal = openConfigScheduleModal;
window.closeConfigScheduleModal = closeConfigScheduleModal;
window.submitConfigScheduleRange = submitConfigScheduleRange;
window.loadEventsFromSheet = loadEventsFromSheet;
window.submitCreateProgram = submitCreateProgram;
window.loadAdminRankTable = loadAdminRankTable;
window.approveCtvRank = approveCtvRank;