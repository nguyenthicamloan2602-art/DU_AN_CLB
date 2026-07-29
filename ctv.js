/**
 * ====================================================================
 * PHÂN HỆ QUẢN LÝ CỘNG TÁC VIÊN (CTV) & QUẢN TRỊ VIÊN (QTV)
 * ====================================================================
 */

let html5QrcodeScanner = null;
let globalProgramsCache = [];
let selectedShiftsCart = new Set();
let isSubmitted = false;

function switchCtvSubTab(subTabId) {
  const tabs = ['ctv-subtab-schedule', 'ctv-subtab-events', 'ctv-subtab-progress', 'ctv-subtab-checkin', 'ctv-subtab-admin'];
  tabs.forEach(tab => document.getElementById(tab)?.classList.add('hidden'));

  const activeTab = document.getElementById(subTabId);
  if (activeTab) activeTab.classList.remove('hidden');

  const currentUser = window.currentUser ? window.currentUser.username : "";
  const isQtv = window.currentUser && (window.currentUser.role === 'QTV' || window.currentUser.role === 'ADMIN');

  if (subTabId === 'ctv-subtab-schedule') {
    loadUserWeeklySchedule(currentUser);
    loadAllWeeklySchedules();
  } else if (subTabId === 'ctv-subtab-events') {
    loadEventsFromSheet();
  } else if (subTabId === 'ctv-subtab-progress') {
    loadCtvProgressDoubleCircle(currentUser);
  } else if (subTabId === 'ctv-subtab-admin') {
    loadAdminRankTable();
  } 
  // RẼ NHÁNH TẠI TAB ĐIỂM DANH:
  else if (subTabId === 'ctv-subtab-checkin') {
    const ctvScannerBox = document.getElementById('ctv-scanner-container');
    const qtvLogBox = document.getElementById('qtv-checkin-log-container');

    if (isQtv) {
      // Ẩn camera của CTV, Hiện bảng theo dõi cho QTV
      if (ctvScannerBox) ctvScannerBox.classList.add('hidden');
      if (qtvLogBox) qtvLogBox.classList.remove('hidden');
      loadQtvCheckinLogs(); // Tải danh sách điểm danh hôm nay
    } else {
      // Hiện camera cho CTV, Ẩn bảng của QTV
      if (ctvScannerBox) ctvScannerBox.classList.remove('hidden');
      if (qtvLogBox) qtvLogBox.classList.add('hidden');
    }
  }
}

// 1. LỊCH TRỰC TUẦN - HIỂN THỊ TÊN CTV TRỰC TIẾP
function toggleShiftSelect(shiftCode) {
  if (isSubmitted) return;
  if (selectedShiftsCart.has(shiftCode)) selectedShiftsCart.delete(shiftCode);
  else selectedShiftsCart.add(shiftCode);
}

async function submitWeeklySchedule(e) {
  if (e) e.preventDefault();
  if (isSubmitted) return alert("🔒 Bạn đã đăng ký lịch trực tuần này rồi!");

  const user = window.currentUser || { username: '' };
  const selectedShifts = Array.from(selectedShiftsCart);

  if (selectedShifts.length === 0) return alert("⚠️ Vui lòng chọn ít nhất 1 ca trực!");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "SUBMIT_WEEKLY_SCHEDULE", username: user.username, hoTen: user.hoTen || user.username, shifts: selectedShifts })
    });
    const result = JSON.parse(await res.text());
    if (result.success) {
      alert("🎉 Đăng ký lịch trực thành công!");
      isSubmitted = true;
      loadAllWeeklySchedules();
    } else alert("❌ Lỗi: " + result.message);
  } catch (err) { alert("❌ Lỗi kết nối!"); }
}

async function loadUserWeeklySchedule(username) {
  if (!username) return;
  try {
    const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "GET_USER_WEEKLY_SCHEDULE", username: username }) });
    const result = JSON.parse(await res.text());
    if (result.success && result.registeredShifts && result.registeredShifts.length > 0) {
      selectedShiftsCart = new Set(result.registeredShifts);
      isSubmitted = true;
    } else isSubmitted = false;
  } catch (err) {}
}

async function loadAllWeeklySchedules() {
  try {
    const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "GET_ALL_WEEKLY_SCHEDULES" }) });
    const result = JSON.parse(await res.text());
    renderScheduleGrid(result.success ? result.data : []);
  } catch (err) { renderScheduleGrid([]); }
}

function renderScheduleGrid(registrationsList) {
  const isQtv = window.currentUser && (window.currentUser.role === 'QTV' || window.currentUser.role === 'ADMIN');
  const days = [{ key: 'T2', label: 'Thứ 2' }, { key: 'T3', label: 'Thứ 3' }, { key: 'T4', label: 'Thứ 4' }, { key: 'T5', label: 'Thứ 5' }, { key: 'T6', label: 'Thứ 6' }, { key: 'T7', label: 'Thứ 7' }, { key: 'CN', label: 'Chủ Nhật' }];
  const shifts = [{ id: 'Ca 1', time: '08:00 - 10:00' }, { id: 'Ca 2', time: '10:00 - 12:00' }, { id: 'Ca 3', time: '13:00 - 15:00' }, { id: 'Ca 4', time: '15:00 - 17:00' }, { id: 'Ca 5', time: '17:00 - 19:00' }, { id: 'Ca 6', time: '19:00 - 21:00' }];

  let tableHTML = `
    <div class="overflow-x-auto bg-white p-2 rounded-2xl">
      <table class="w-full border-collapse border border-slate-200 text-center text-xs">
        <thead>
          <tr class="bg-blue-50 text-blue-900 font-extrabold">
            <th class="border p-2.5 w-28">Ca / Thời gian</th>
            ${days.map(d => `<th class="border p-2.5">${d.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>`;

  shifts.forEach(shift => {
    tableHTML += `<tr><td class="border p-2 font-bold bg-slate-50">${shift.id}<br><span class="text-[10px] text-slate-400 font-normal">${shift.time}</span></td>`;
    days.forEach(day => {
      const shiftCode = `${day.key}_${shift.id}`;
      const isChecked = selectedShiftsCart.has(shiftCode);
      const matches = (registrationsList || []).filter(item => (item.shifts || []).includes(shiftCode) || (item.shifts || []).some(s => s.includes(day.key) && s.includes(shift.id)));

      const disabledClass = (isSubmitted && !isQtv) ? 'opacity-40 bg-slate-200/80 pointer-events-none' : '';

      // HIỂN THỊ TÊN CTV TRỰC TIẾP LÊN TỪNG Ô LỊCH TRỰC
      let ctvNamesHtml = "";
      if (matches.length > 0) {
        ctvNamesHtml = matches.map(m => `
          <div onclick="openShiftDetailModal('${day.key}', '${shift.id}', ${JSON.stringify(matches).replace(/"/g, '&quot;')})" 
               class="mt-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[10px] truncate cursor-pointer hover:bg-blue-200 transition" 
               title="${m.hoTen || m.username}">
            👤 ${m.hoTen || m.username}
          </div>
        `).join('');
      }

      tableHTML += `
        <td class="border p-2 align-middle min-h-[55px] ${isChecked ? 'bg-blue-100/70' : ''} ${disabledClass}">
          ${!isQtv ? `
            <label class="inline-flex items-center gap-1 font-semibold text-slate-700 ${isSubmitted ? 'cursor-not-allowed' : 'cursor-pointer'}">
              <input type="checkbox" onchange="toggleShiftSelect('${shiftCode}')" ${isChecked ? 'checked' : ''} ${isSubmitted ? 'disabled' : ''} class="w-3.5 h-3.5 text-blue-600 rounded">
              <span class="text-[11px]">${isChecked ? 'Đã chọn' : 'Đăng ký'}</span>
            </label>` : ''}
          ${ctvNamesHtml}
          ${matches.length === 0 && isQtv ? `<span class="text-slate-300">—</span>` : ''}
        </td>`;
    });
    tableHTML += `</tr>`;
  });

  tableHTML += `</tbody></table></div>`;

  if (!isQtv) {
    if (isSubmitted) {
      tableHTML += `<div class="mt-4 flex justify-end"><button disabled class="px-6 py-2.5 bg-slate-300 text-slate-600 font-bold rounded-2xl text-xs uppercase border">🔒 ĐÃ ĐĂNG KÝ LỊCH TUẦN NÀY (ĐÃ KHÓA)</button></div>`;
    } else {
      tableHTML += `<div class="mt-4 flex justify-end"><button onclick="submitWeeklySchedule(event)" class="px-6 py-2.5 bg-gradient-to-r from-[#1e3a8a] to-[#0284c7] text-white font-bold rounded-2xl text-xs uppercase shadow transition cursor-pointer">🚀 XÁC NHẬN ĐĂNG KÝ LỊCH TRỰC TUẦN</button></div>`;
    }
  }

  document.getElementById('scheduleContainer').innerHTML = tableHTML;
}

// BẬT POPUP CHI TIẾT CA TRỰC (SỬA LỖI REFERENCEERROR)
function openShiftDetailModal(dayKey, shiftId, matchedList) {
  const modal = document.getElementById('adminModal');
  const modalContent = document.getElementById('modalContent');
  if (!modal || !modalContent) return;

  let html = `<h3 class="text-sm font-extrabold text-slate-800 mb-1">Danh Sách CTV Trực Ca: <span class="text-blue-900">${dayKey} - ${shiftId}</span></h3><hr class="my-2">`;
  if (!matchedList || matchedList.length === 0) {
    html += `<p class="text-xs text-slate-400 py-4 text-center">Chưa có CTV đăng ký ca này.</p>`;
  } else {
    html += `<div class="space-y-2 max-h-60 overflow-y-auto pr-1">`;
    matchedList.forEach(ctv => {
      html += `<div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border text-xs"><div><div class="font-extrabold text-slate-800">${ctv.hoTen || ctv.username}</div><div class="text-[10px] text-slate-400">Mã SV: ${ctv.username}</div></div><span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">Đã đăng ký</span></div>`;
    });
    html += `</div>`;
  }
  modalContent.innerHTML = html;
  modal.classList.remove('hidden');
}

// 2. CHƯƠNG TRÌNH & SỰ KIỆN - SỬA NÚT XEM DANH SÁCH
async function loadEventsFromSheet() {
  const container = document.getElementById("ctv-events-list");
  if (!container) return;
  container.innerHTML = `<p class="text-slate-400 text-center py-8 text-xs">⏳ Đang tải danh sách chương trình...</p>`;
  try {
    const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "GET_PROGRAMS", username: window.currentUser?.username || "" }) });
    const result = JSON.parse(await res.text());
    globalProgramsCache = result.data || [];
    renderProgramsList(globalProgramsCache);
  } catch (e) { container.innerHTML = `<p class="text-slate-400 text-center py-4 text-xs">Hiện chưa có chương trình mở đăng ký.</p>`; }
}

function renderProgramsList(programs) {
  const container = document.getElementById("ctv-events-list");
  if (!container) return;
  if (!programs || programs.length === 0) { container.innerHTML = `<p class="text-slate-400 text-center py-8 text-xs">Hiện chưa có chương trình mở đăng ký.</p>`; return; }
  
  let html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-5">`;

  programs.forEach(prog => {
    let positionsHtml = `<div class="space-y-1.5 my-3">`;
    (prog.positions || []).forEach(pos => {
      positionsHtml += `<div class="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl border"><span class="font-bold text-slate-700">${pos.name}</span><span class="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-50 text-blue-800 border border-blue-100">${pos.registered}/${pos.quota} (Còn ${pos.remaining})</span></div>`;
    });
    positionsHtml += `</div>`;

    let actionBtn = prog.isUserRegistered 
      ? `<button disabled class="w-full py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl border border-slate-300">✅ Đã đăng ký (${prog.userRegisteredPos})</button>`
      : `<button onclick="openProgramRegisterModal('${prog.id}')" class="w-full py-2 bg-gradient-to-r from-[#1e3a8a] to-[#0284c7] text-white font-bold text-xs rounded-xl shadow transition">🚀 Đăng Ký Tham Gia</button>`;

    let adminBtn = `<button onclick="viewProgramRegisteredList('${prog.id}')" class="mt-2 w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer">👥 Xem Danh Sách Đăng Ký</button>`;

    html += `<div class="bg-white rounded-3xl border border-slate-200/80 p-5 flex flex-col justify-between shadow-sm"><div><h4 class="text-sm font-extrabold text-slate-900">${prog.tenChuongTrinh}</h4><p class="text-xs text-slate-500 mt-2 line-clamp-2">${prog.moTa || 'Chưa có mô tả'}</p>${positionsHtml}</div><div class="pt-3 border-t border-slate-100">${actionBtn}${adminBtn}</div></div>`;
  });
  container.innerHTML = html + `</div>`;
}

function viewProgramRegisteredList(programId) {
  const prog = globalProgramsCache.find(p => p.id === programId);
  if (!prog) return;

  document.getElementById("modal-ctv-list-title").innerText = `📋 Danh Sách CTV: ${prog.tenChuongTrinh}`;
  const tbody = document.getElementById("ctv-list-table-body");
  
  // Kiểm tra tài khoản có phải QTV/ADMIN không
  const user = window.currentUser || {};
  const isQtv = user.role === 'QTV' || user.role === 'ADMIN';

  // Điều chỉnh tiêu đề bảng (Bỏ từ "Thời gian")
  const thead = document.querySelector("#modal-ctv-list table thead tr");
  if (thead) {
    thead.innerHTML = `
      <th class="px-3 py-2.5 text-left font-bold text-slate-700">STT</th>
      <th class="px-3 py-2.5 text-left font-bold text-slate-700">Họ và Tên</th>
      <th class="px-3 py-2.5 text-left font-bold text-slate-700">Vị trí</th>
      <th class="px-3 py-2.5 text-left font-bold text-slate-700">Ghi chú</th>
      ${isQtv ? '<th class="px-3 py-2.5 text-center font-bold text-slate-700">Thao tác QTV</th>' : ''}
    `;
  }

  tbody.innerHTML = "";
  if (!prog.registeredList || prog.registeredList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-4 text-center text-slate-400 text-xs">Chưa có CTV đăng ký.</td></tr>`;
  } else {
    prog.registeredList.forEach((item, idx) => {
      // Chỉ QTV mới hiển thị cột nút Hủy Đơn
      const actionTd = isQtv ? `
        <td class="px-3 py-2.5 text-center">
          <button onclick="cancelProgramRegistration('${prog.id}', '${item.username}')" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 transition cursor-pointer">
            ❌ Hủy Đơn
          </button>
        </td>` : '';

      tbody.innerHTML += `
        <tr class="hover:bg-slate-50 text-xs align-middle">
          <td class="px-3 py-2.5 font-bold text-slate-400">${idx + 1}</td>
          <td class="px-3 py-2.5 font-extrabold text-slate-800">${item.hoTen} (${item.username})</td>
          <td class="px-3 py-2.5 font-bold text-blue-900">${item.position}</td>
          <td class="px-3 py-2.5 text-slate-400">${item.ghiChu || '-'}</td>
          ${actionTd}
        </tr>`;
    });
  }
  document.getElementById("modal-ctv-list")?.classList.remove("hidden");
}
async function cancelProgramRegistration(programId, targetUsername) {
  if (!confirm(`⚠️ Bạn có chắc chắn muốn hủy đơn đăng ký của CTV "${targetUsername}"?`)) return;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: "CANCEL_PROGRAM_REGISTRATION", 
        programId: programId, 
        username: targetUsername 
      })
    });
    const result = JSON.parse(await res.text());
    alert(result.message || "✅ Đã hủy đơn thành công!");
    closeCtvListModal();
    loadEventsFromSheet();
  } catch (e) { 
    alert("❌ Lỗi kết nối khi hủy đơn!"); 
  }
}
window.cancelProgramRegistration = cancelProgramRegistration;

async function submitCreateProgram(e) {
  if (e) e.preventDefault();
  const progData = {
    id: document.getElementById("prog-id")?.value,
    name: document.getElementById("prog-name")?.value,
    desc: document.getElementById("prog-desc")?.value,
    status: document.getElementById("prog-status")?.value,
    deadline: document.getElementById("prog-deadline")?.value,
    positions: document.getElementById("prog-positions")?.value
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "CREATE_NEW_PROGRAM", program: progData })
    });
    const result = JSON.parse(await res.text());
    alert(result.message || "🎉 Tạo chương trình thành công!");
    document.getElementById("modal-create-program")?.classList.add("hidden");
    loadEventsFromSheet();
  } catch (err) { alert("❌ Lỗi kết nối!"); }
}

function closeCtvListModal() { document.getElementById("modal-ctv-list")?.classList.add("hidden"); }

function openProgramRegisterModal(programId) {
  const prog = globalProgramsCache.find(p => p.id === programId);
  if (!prog) return;
  document.getElementById("reg-program-id").value = prog.id;
  document.getElementById("reg-program-name").value = prog.tenChuongTrinh;
  document.getElementById("modal-program-title").innerText = prog.tenChuongTrinh;

  const selectPos = document.getElementById("reg-program-position");
  if (selectPos) {
    selectPos.innerHTML = `<option value="">-- Chọn vị trí --</option>`;
    (prog.positions || []).forEach(pos => {
      selectPos.innerHTML += `<option value="${pos.name}">${pos.name} (Còn ${pos.remaining})</option>`;
    });
  }

  document.getElementById("modal-program-register")?.classList.remove("hidden");
}

function closeProgramRegisterModal() { document.getElementById("modal-program-register")?.classList.add("hidden"); }

// ĐĂNG KÝ CHƯƠNG TRÌNH (KHÓA NÚT CHỐNG LAG BẤM NHIỀU LẦN)
async function submitProgramRegistration(e) {
  if (e) e.preventDefault();
  
  const btnSubmit = document.getElementById("btn-submit-program");
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerText = "⏳ Đang gửi đăng ký...";
  }

  const programId = document.getElementById("reg-program-id")?.value;
  const programName = document.getElementById("reg-program-name")?.value;
  const position = document.getElementById("reg-program-position")?.value;
  const note = document.getElementById("reg-program-note")?.value || "";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: "REGISTER_PROGRAM", 
        username: window.currentUser?.username || "", 
        hoTen: window.currentUser?.hoTen || "", 
        programId: programId, 
        programName: programName, 
        position: position, 
        note: note 
      })
    });
    const result = JSON.parse(await res.text());
    alert(result.message || "🎉 Đăng ký chương trình thành công!");
    closeProgramRegisterModal();
    loadEventsFromSheet();
  } catch (err) {
    alert("❌ Lỗi kết nối!");
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = "Xác Nhận Đăng Ký";
    }
  }
}
// 3. ĐIỂM DANH QR CODE
async function startScanner() {
  if (typeof Html5QrcodeScanner === 'undefined') return alert("Thư viện quét chưa sẵn sàng!");
  if (html5QrcodeScanner) html5QrcodeScanner.clear().catch(e => {});
  html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 });
  html5QrcodeScanner.render(onScanSuccess, () => {});
}

// HÀM LẤY HOẶC TẠO MÃ THIẾT BỊ
function getOrCreateDeviceId() {
  let devId = localStorage.getItem("ump_device_id");
  if (!devId) {
    devId = "DEV_" + Math.random().toString(36).substring(2, 9) + "_" + new Date().getTime().toString(36);
    localStorage.setItem("ump_device_id", devId);
  }
  return devId;
}

// HÀM XỬ LÝ QUÉT QR
async function onScanSuccess(decodedText) {
  if (html5QrcodeScanner) html5QrcodeScanner.clear();
  
  const checkType = document.querySelector('input[name="checkin_type"]:checked')?.value || "IN";
  const msgBox = document.getElementById("checkin-result-msg");
  
  // 1. TẠO HOẶC LẤY DEVICE ID
  const myDeviceId = getOrCreateDeviceId();

  let userIp = '0.0.0.0';
  try { 
    const r = await fetch('https://api.ipify.org?format=json'); 
    userIp = (await r.json()).ip; 
  } catch(e){}

  // Log ra console để kiểm tra chắc chắn thiết bị đã tạo DeviceId hay chưa
  console.log("👉 Đang gửi điểm danh với DeviceId:", myDeviceId);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: "CHECKIN_CTV", 
        username: window.currentUser?.username || "", 
        qrCode: decodedText, 
        type: checkType, 
        userIp: userIp,
        deviceId: myDeviceId // 2. BẮT BUỘC TRUYỀN THAM SỐ NÀY
      })
    });
    
    const result = JSON.parse(await res.text());
    
    if (msgBox) {
      msgBox.classList.remove("hidden", "bg-emerald-100", "text-emerald-800", "bg-rose-100", "text-rose-800", "bg-amber-100", "text-amber-800");
      
      if (result.success) {
        if (result.warning) {
          msgBox.classList.add("bg-amber-100", "text-amber-800");
          msgBox.innerHTML = `⚠️ <b>${result.message}</b><br><span class="text-[10px] text-amber-700">${result.warning}</span>`;
        } else {
          msgBox.classList.add("bg-emerald-100", "text-emerald-800");
          msgBox.innerHTML = `✅ ${result.message}<br><span class="text-[10px] font-normal">Thời gian ghi nhận: ${new Date().toLocaleTimeString('vi-VN')}</span>`;
        }
      } else {
        msgBox.classList.add("bg-rose-100", "text-rose-800");
        msgBox.innerText = `❌ ${result.message}`;
      }
    }

    if (result.warning) {
      alert(`${result.message}\n\n⚠️ CẢNH BÁO: ${result.warning}`);
    } else {
      alert(result.message);
    }

    loadCtvProgressDoubleCircle(window.currentUser?.username);
  } catch (err) { 
    alert("❌ Lỗi kết nối máy chủ điểm danh!"); 
  }
}

// CẬP NHẬT TIẾN ĐỘ VÒNG TRÒN DOUBLE CIRCLE XOAY THEO PHẦN TRĂM SỐ
async function loadCtvProgressDoubleCircle(username) {
  if (!username) return;
  try {
    const res = await fetch(API_URL, { 
      method: "POST", 
      headers: { "Content-Type": "text/plain;charset=utf-8" }, 
      body: JSON.stringify({ action: "GET_CTV_PROGRESS", username: username }) 
    });
    const result = JSON.parse(await res.text());
    if (result.success && result.data) {
      const { caDaTrực, chiTieuCa, suKienDaThamGia, chiTieuSuKien, xepLoaiDeXuat, xepLoaiChinhThuc } = result.data;
      
      const shiftDone = Number(caDaTrực) || 0;
      const shiftTarget = Number(chiTieuCa) || 10;
      const eventDone = Number(suKienDaThamGia) || 0;
      const eventTarget = Number(chiTieuSuKien) || 5;

      // Cập nhật text số ca
      if (document.getElementById("ctv-shift-count")) document.getElementById("ctv-shift-count").innerText = `${shiftDone}/${shiftTarget} ca`;
      if (document.getElementById("ctv-event-count")) document.getElementById("ctv-event-count").innerText = `${eventDone}/${eventTarget} sự kiện`;

      // Cập nhật phần trăm % và xoay vạch SVG
      const shiftPct = Math.min(100, Math.round((shiftDone / shiftTarget) * 100));
      const eventPct = Math.min(100, Math.round((eventDone / eventTarget) * 100));

      if (document.getElementById("ctv-shift-percent")) document.getElementById("ctv-shift-percent").innerText = `${shiftPct}%`;
      if (document.getElementById("ctv-event-percent")) document.getElementById("ctv-event-percent").innerText = `${eventPct}%`;

      const shiftCircle = document.getElementById("ctv-shift-circle");
      const eventCircle = document.getElementById("ctv-event-circle");

      if (shiftCircle) shiftCircle.setAttribute("stroke-dasharray", `${shiftPct}, 100`);
      if (eventCircle) eventCircle.setAttribute("stroke-dasharray", `${eventPct}, 100`);

      if (document.getElementById("ctv-rank-proposed")) document.getElementById("ctv-rank-proposed").innerText = xepLoaiDeXuat || "Trung bình";
      if (document.getElementById("ctv-rank-official")) document.getElementById("ctv-rank-official").innerText = xepLoaiChinhThuc || "Chờ duyệt";
    }
  } catch(e){}
}

async function loadAdminRankTable() {
  const container = document.getElementById("ctv-admin-rank-table");
  if (!container) return;
  container.innerHTML = `<p class="text-slate-400 text-center py-6 text-xs font-semibold">⏳ Đang tải bảng thống kê xếp loại từ CTV_TienDo...</p>`;

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
  } catch (err) { 
    container.innerHTML = `<p class="text-rose-500 text-center py-6 text-xs">❌ Lỗi kết nối backend!</p>`; 
  }
}

function renderAdminRankTable(data) {
  const container = document.getElementById("ctv-admin-rank-table");
  if (!container) return;

  let html = `
    <div class="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-sm">
      <table class="w-full bg-white text-xs border-collapse min-w-[750px]">
        <thead class="bg-blue-50 text-blue-900 font-extrabold border-b">
          <tr>
            <th class="py-3 px-3 text-left">Mã Số / CTV</th>
            <th class="py-3 px-3 text-center">Ca Trực (Đã/Chỉ tiêu)</th>
            <th class="py-3 px-3 text-center">Sự Kiện (Đã/Chỉ tiêu)</th>
            <th class="py-3 px-3 text-center">Xếp Loại Đề Xuất (Máy)</th>
            <th class="py-3 px-3 text-center">Xếp Loại Chính Thức</th>
            <th class="py-3 px-3 text-center">Thao Tác</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">`;

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
          <button onclick="approveCtvRank('${item.username}', ${item.caTruc}, ${item.suKien})" class="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl text-[10px] font-bold shadow-sm">Phê Duyệt</button>
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
    alert(result.message || "✅ Đã phê duyệt xếp loại chính thức!");
    loadAdminRankTable();
  } catch (err) { alert("❌ Lỗi kết nối!"); }
}

async function submitCtvProfile(e) {
  if (e) e.preventDefault();

  const profile = {
    username: window.currentUser?.username || "",
    fullname: document.getElementById("prof-fullname")?.value || "",
    mssv: document.getElementById("prof-mssv")?.value || "",
    dob: document.getElementById("prof-dob")?.value || "",
    school: document.getElementById("prof-school")?.value || "",
    className: document.getElementById("prof-class")?.value || "",
    phone: document.getElementById("prof-phone")?.value || "",
    relativePhone: document.getElementById("prof-relative")?.value || "",
    address: document.getElementById("prof-address")?.value || ""
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: "UPDATE_CTV_PROFILE", 
        profile: profile 
      })
    });
    
    const result = JSON.parse(await res.text());
    alert(result.message || "🎉 Lưu hồ sơ cá nhân thành công!");
    
    if (result.success) {
      closeProfileModal();
    }
  } catch (err) { 
    alert("❌ Lỗi kết nối máy chủ khi lưu hồ sơ!"); 
  }
}

async function submitChangePassword(e) {
  if (e) e.preventDefault();
  const oldPass = document.getElementById("pass-old")?.value;
  const newPass = document.getElementById("pass-new")?.value;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "CHANGE_PASSWORD", username: window.currentUser?.username || "", oldPassword: oldPass, newPassword: newPass })
    });
    const result = JSON.parse(await res.text());
    alert(result.message);
    if (result.success) closeChangePassModal();
  } catch (err) { alert("❌ Lỗi kết nối!"); }
}

// TẠO CHƯƠNG TRÌNH MỚI
function createNewProgram(ssCtv, prog) {
  if (!ssCtv) return { success: false, message: "Không tìm thấy DB CTV!" };
  let sheet = ssCtv.getSheetByName("ChuongTrinh_Recruit") || ssCtv.insertSheet("ChuongTrinh_Recruit");
  sheet.appendRow([prog.id, prog.name, prog.desc, prog.status, prog.deadline, prog.positions]);
  return { success: true, message: `🎉 Tạo chương trình "${prog.name}" thành công!` };
}


// KHAI BÁO CÔNG KHAI HÀM TOÀN CỤC
window.switchCtvSubTab = switchCtvSubTab;
window.submitWeeklySchedule = submitWeeklySchedule;
window.loadUserWeeklySchedule = loadUserWeeklySchedule;
window.loadAllWeeklySchedules = loadAllWeeklySchedules;
window.toggleShiftSelect = toggleShiftSelect;
window.openShiftDetailModal = openShiftDetailModal;
window.startScanner = startScanner;
window.loadEventsFromSheet = loadEventsFromSheet;
window.viewProgramRegisteredList = viewProgramRegisteredList;
window.closeCtvListModal = closeCtvListModal;
window.openProgramRegisterModal = openProgramRegisterModal;
window.closeProgramRegisterModal = closeProgramRegisterModal;
window.submitProgramRegistration = submitProgramRegistration;
window.loadCtvProgressDoubleCircle = loadCtvProgressDoubleCircle;
window.loadAdminRankTable = loadAdminRankTable;
window.approveCtvRank = approveCtvRank;
window.submitCtvProfile = submitCtvProfile;
window.submitChangePassword = submitChangePassword;
window.openCreateProgramModal = function() {
  document.getElementById("modal-create-program")?.classList.remove("hidden");
};
window.closeCreateProgramModal = function() {
  document.getElementById("modal-create-program")?.classList.add("hidden");
};
// ==========================================
// HÀM TẢI DỮ LIỆU ĐIỂM DANH DÀNH CHO QTV
// ==========================================
async function loadQtvCheckinLogs() {
  const dateInput = document.getElementById("qtv-filter-date");
  const selectedDate = dateInput?.value || new Date().toISOString().split('T')[0];
  const tableBody = document.getElementById("qtv-checkin-table-body");

  if (!tableBody) return;
  tableBody.innerHTML = `<tr><td colspan="5" class="p-5 text-center text-slate-400">⏳ Đang lấy dữ liệu ngày ${selectedDate}...</td></tr>`;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "GET_TODAY_CHECKIN_LOGS",
        dateStr: selectedDate
      })
    });

    const result = JSON.parse(await res.text());

    if (!result.success || !result.logs || result.logs.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="p-5 text-center text-slate-400">Không có lượt điểm danh nào trong ngày ${selectedDate}.</td></tr>`;
      updateCheckinStats(0, 0, 0);
      return;
    }

    let inCount = 0;
    let outCount = 0;
    let htmlRows = "";

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

  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="5" class="p-5 text-center text-rose-500">❌ Lỗi kết nối máy chủ!</td></tr>`;
  }
}

function updateCheckinStats(total, inNum, outNum) {
  if (document.getElementById("stat-total-checkin")) document.getElementById("stat-total-checkin").innerText = total;
  if (document.getElementById("stat-in-checkin")) document.getElementById("stat-in-checkin").innerText = inNum;
  if (document.getElementById("stat-out-checkin")) document.getElementById("stat-out-checkin").innerText = outNum;
}

// BẮT BUỘC KHAI BÁO CÔNG KHAI TOÀN CỤC ĐỂ HTML GỌI ĐƯỢC
window.loadQtvCheckinLogs = loadQtvCheckinLogs;