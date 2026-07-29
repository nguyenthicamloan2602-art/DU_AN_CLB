// Lưu link API Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbyebelZFBBml8k6KVuiaHv1yqFf4LkaaYwNXSw5krEnGqsaDJ2apbQot7mUAQygjb8H/exec";
const SCRIPT_URL = API_URL; // Sửa lỗi ReferenceError SCRIPT_URL

// Giả lập User đang đăng nhập là QTV (Quản Trị Viên)
var currentUser = {
    username: "qtv_admin",
    fullName: "Nguyễn Văn Admin",
    role: "QTV" // Đổi thành 'CTV' nếu muốn test góc nhìn của Cộng tác viên
};