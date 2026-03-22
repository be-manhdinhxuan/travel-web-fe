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
  <a class="logo" href="1trangchu.html" style="display:flex;align-items:center;gap:9px;text-decoration:none">
    <div style="width:34px;height:34px;background:#e8f5ee;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d8a4e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    </div>
    <div style="line-height:1;font-size:0.95rem;font-weight:800">
      <span style="color:#2d8a4e">Vietnam</span><span style="color:#1a1a1a">Travel</span>
    </div>
  </a>
  <ul class="nav-links">
    <li><a href="1diemden.html">Điểm đến</a></li>
    <li><a href="1tourdulich.html">Tour du lịch</a></li>
    <li><a href="1uudai.html">Ưu đãi</a></li>
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

  // Active nav theo trang hiện tại
  (function() {
    var path = window.location.pathname.split('/').pop() || '';
    var map = {
      '1diemden.html':    'Điểm đến',
      '1tourdulich.html': 'Tour du lịch',
      '1halong.html':     'Điểm đến',
      '1hoian.html':      'Điểm đến',
      '1sapa.html':       'Điểm đến',
      '1hanoi.html':      'Điểm đến',
      '1danang.html':     'Điểm đến',
      '1ninhbinh.html':   'Điểm đến',
      '1mientay.html':    'Điểm đến',
      '1uudai.html':      'Ưu đãi',
      '1vechungtoi.html': 'Về chúng tôi',
    };
    var active = map[path];
    if (active) {
      document.querySelectorAll('.nav-links a').forEach(function(a) {
        if (a.textContent.trim() === active) {
          a.style.color = '#2d8a4e';
          a.style.fontWeight = '700';
        }
      });
    }
  })();

  // 3data.js load sau sẽ tự gọi initNav()
  // Dùng setTimeout để chắc chắn 3data.js đã sẵn sàng
  setTimeout(function() {
    if (typeof initNav === 'function') initNav();
  }, 0);

})();