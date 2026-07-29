/**
 * XỬ LÝ ĐĂNG NHẬP & PHÂN QUYỀN HỆ THỐNG (AUTH.JS)
 */

window.currentUser = null;

// HÀM TỰ ĐỘNG LẤY CHỮ CÁI ĐẦU TIÊN TRONG TÊN ĐỂ LÀM AVATAR
function setLetterAvatar(user) {
  if (!user) return;
  
  // Ưu tiên Họ tên -> Tên đơn vị -> Username
  const displayName = user.hoTen || user.fullname || user.tenDonVi || user.username || "U";
  
  // Lấy chữ cái đầu tiên và viết hoa
  const firstLetter = displayName.trim().charAt(0).toUpperCase();

  // Tìm ô tròn Avatar trên Header và thay thế bằng chữ cái
  const avatarZone = document.getElementById("header-user-zone");
  if (avatarZone) {
    const iconEl = avatarZone.querySelector(".w-7.h-7");
    if (iconEl) {
      iconEl.innerText = firstLetter;
      iconEl.className = "w-7 h-7 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center text-xs font-black shadow-inner border border-amber-300";
    }
  }
}

async function handleLogin() {
  const userInput = document.getElementById("username")?.value;
  const passInput = document.getElementById("password")?.value;
  const msgEl = document.getElementById("login-msg");
  const btnLogin = document.getElementById("btn-login");

  if (!userInput || !passInput) {
    if (msgEl) {
      msgEl.innerText = "⚠️ Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!";
      msgEl.className = "text-center text-xs font-semibold mt-2 text-amber-600";
    }
    return;
  }

  if (msgEl) {
    msgEl.innerText = "⏳ Đang đăng nhập...";
    msgEl.className = "text-center text-xs font-semibold mt-2 text-blue-600";
  }
  if (btnLogin) btnLogin.disabled = true;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "LOGIN",
        username: userInput,
        password: passInput
      })
    });

    const result = JSON.parse(await response.text());

    if (result.success) {
      window.currentUser = result.user;
      localStorage.setItem("ump_user", JSON.stringify(result.user));

      if (msgEl) {
        msgEl.innerText = "🎉 Đăng nhập thành công!";
        msgEl.className = "text-center text-xs font-semibold mt-2 text-emerald-600";
      }

      document.getElementById("login-card")?.classList.add("hidden");
      document.getElementById("dashboard")?.classList.remove("hidden");
      document.getElementById("header-user-zone")?.classList.remove("hidden");

      const navName = document.getElementById("nav-user-name");
      if (navName) navName.innerText = result.user.tenDonVi || result.user.hoTen || result.user.username;

      applyRolePermissions(result.user);
      setLetterAvatar(result.user); // Hiển thị avatar chữ cái khi đăng nhập

    } else {
      if (msgEl) {
        msgEl.innerText = "❌ " + (result.message || "Tài khoản hoặc mật khẩu không đúng!");
        msgEl.className = "text-center text-xs font-semibold mt-2 text-rose-600";
      }
    }

  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    if (msgEl) {
      msgEl.innerText = "❌ Lỗi kết nối máy chủ (CORS/Lỗi Mạng)!";
      msgEl.className = "text-center text-xs font-semibold mt-2 text-rose-600";
    }
  } finally {
    if (btnLogin) btnLogin.disabled = false;
  }
}

function applyRolePermissions(user) {
  const grpCsvc = document.getElementById("grp-menu-csvc");
  const grpCtv = document.getElementById("grp-menu-ctv");
  const sbtnCsvcDuyet = document.getElementById("sbtn-csvc-duyet");
  const sbtnAdmin = document.getElementById("sbtn-admin");

  if (!user) return;

  if (user.userType === "INTERNAL") {
    if (grpCsvc) grpCsvc.classList.remove("hidden");
    if (grpCtv) grpCtv.classList.remove("hidden");

    if (user.role === "QTV" || user.role === "ADMIN") {
      if (sbtnCsvcDuyet) sbtnCsvcDuyet.classList.remove("hidden");
      if (sbtnAdmin) sbtnAdmin.classList.remove("hidden");
    } else {
      if (sbtnCsvcDuyet) sbtnCsvcDuyet.classList.add("hidden");
      if (sbtnAdmin) sbtnAdmin.classList.add("hidden");
    }
  } else {
    if (grpCsvc) grpCsvc.classList.remove("hidden");
    if (grpCtv) grpCtv.classList.add("hidden");
    if (sbtnCsvcDuyet) sbtnCsvcDuyet.classList.add("hidden");
    if (sbtnAdmin) sbtnAdmin.classList.add("hidden");
  }
}

async function handleChangePassSubmit() {
  const oldPass = document.getElementById("cp-old-pass")?.value;
  const newPass = document.getElementById("cp-new-pass")?.value;
  const msgEl = document.getElementById("cp-msg");

  if (!window.currentUser) return alert("Vui lòng đăng nhập lại!");
  if (!oldPass || !newPass) {
    if (msgEl) {
      msgEl.innerText = "⚠️ Vui lòng nhập đầy đủ thông tin!";
      msgEl.className = "text-center text-xs font-semibold mt-1 text-amber-600";
    }
    return;
  }

  if (msgEl) {
    msgEl.innerText = "⏳ Đang đổi mật khẩu...";
    msgEl.className = "text-center text-xs font-semibold mt-1 text-blue-600";
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "CHANGE_PASSWORD",
        username: window.currentUser.username,
        oldPassword: oldPass,
        newPassword: newPass
      })
    });

    const result = JSON.parse(await response.text());

    if (result.success) {
      if (msgEl) {
        msgEl.innerText = "🎉 " + result.message;
        msgEl.className = "text-center text-xs font-semibold mt-1 text-emerald-600";
      }
      setTimeout(() => {
        if (typeof closeChangePassModal === "function") closeChangePassModal();
      }, 1200);
    } else {
      if (msgEl) {
        msgEl.innerText = "❌ " + result.message;
        msgEl.className = "text-center text-xs font-semibold mt-1 text-rose-600";
      }
    }
  } catch (error) {
    if (msgEl) {
      msgEl.innerText = "❌ Lỗi kết nối đổi mật khẩu!";
      msgEl.className = "text-center text-xs font-semibold mt-1 text-rose-600";
    }
  }
}

function checkAutoLogin() {
  const savedUser = localStorage.getItem("ump_user");
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      window.currentUser = user;

      document.getElementById("login-card")?.classList.add("hidden");
      document.getElementById("dashboard")?.classList.remove("hidden");
      document.getElementById("header-user-zone")?.classList.remove("hidden");

      const navName = document.getElementById("nav-user-name");
      if (navName) navName.innerText = user.tenDonVi || user.hoTen || user.username;

      applyRolePermissions(user);
      setLetterAvatar(user); // Hiển thị avatar chữ cái khi tự động đăng nhập lại
    } catch (e) {
      localStorage.removeItem("ump_user");
    }
  }
}

function logout() {
  localStorage.removeItem("ump_user");
  window.currentUser = null;
  location.reload();
}

document.addEventListener("DOMContentLoaded", function() {
  checkAutoLogin();
});

window.handleLogin = handleLogin;
window.handleChangePassSubmit = handleChangePassSubmit;
window.applyRolePermissions = applyRolePermissions;
window.logout = logout;