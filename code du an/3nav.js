// ============================================================
// 3nav.js – Nav dùng chung, tự inject vào tất cả trang
// ============================================================
(function () {
  // Không inject nav vào trang có layout riêng
  if (window.NO_NAV) return;
  if (document.body && (
    document.body.classList.contains('nv-body') ||
    document.body.classList.contains('admin-body')
  )) return;

  var NAV_HTML = `
<nav id="mainNav">
  <a class="logo" href="1trangchu.html">
    <img src="logo.png" alt="VietnamTravel" class="logo-img">
  </a>
  <ul class="nav-links">
    <li><a href="1trangchu.html">Trang chủ</a></li>
    <li><a href="1tourdulich.html">Tour du lịch</a></li>
    <li><a href="#">Điểm đến</a></li>
    <li><a href="1vechungtoi.html">Về chúng tôi</a></li>
  </ul>
  <div class="nav-cta">
    <!-- Chưa đăng nhập -->
    <div id="navGuest" style="display:none;gap:8px;align-items:center;">
      <button class="btn-login-nav" onclick="window.location.href='1dangnhap.html'">Đăng nhập</button>
      <button class="btn-register-nav" onclick="window.location.href='1dangky.html'">Đăng ký</button>
    </div>
    <!-- Đã đăng nhập -->
    <div id="navUser" style="display:none;align-items:center;gap:10px;">
      <button class="btn-primary" onclick="window.location.href='1datour.html'">Đặt ngay</button>
      <div class="nav-user-info" onclick="toggleUserMenu()">
        <div class="nav-avatar" id="navAvatarEl">U</div>
      </div>
      <div class="user-dropdown" id="userDropdown">
        <div class="user-dropdown-header">
          <div class="user-dropdown-name" id="dropName">—</div>
          <div class="user-dropdown-email" id="dropEmail">—</div>
        </div>
        <a class="user-dropdown-item" href="1canhan.html">👤 Hồ sơ cá nhân</a>
        <a class="user-dropdown-item" href="1trangchu.html">🏠 Trang chủ</a>
        <a class="user-dropdown-item" id="adminMenuBtn" href="1admin.html" style="display:none">⚙️ Quản trị Admin</a>
        <a class="user-dropdown-item logout-item" onclick="doLogout()">🚪 Đăng xuất</a>
      </div>
    </div>
  </div>
</nav>`;

  // Inject nav vào đầu body
  // Thêm style position:relative cho navUser nếu chưa có
  var styleTag = document.createElement('style');
  styleTag.textContent = '#navUser{position:relative;}';
  document.head.appendChild(styleTag);
  document.body.insertAdjacentHTML('afterbegin', NAV_HTML);

  // Thêm padding-top cho body để tránh bị nav che
  document.body.style.paddingTop = '82px'; // nav height
})();