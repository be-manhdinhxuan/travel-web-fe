// ============================================================
// 3canhan.js – Tài Khoản Cá Nhân | VietnamTravel
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
  var u = loadUser();
  if (!u) { window.location.href = '1dangnhap.html'; return; }

  initNav();
  cpLoadAvatar(u);
  cpLoadProfile(u);
  cpLoadForm(u);
  cpLoadBadge(u);
  cpRenderRecentHistory(u);
  cpRenderHistory(u);
});

// ── AVATAR ──
function cpLoadAvatar(u) {
  var saved  = localStorage.getItem('vt_avatar_' + u.email);
  var avEl   = document.getElementById('cpAvatar');
  var initEl = document.getElementById('cpAvatarInitial');
  if (!avEl) return;
  if (saved) {
    avEl.style.backgroundImage    = 'url(' + saved + ')';
    avEl.style.backgroundSize     = 'cover';
    avEl.style.backgroundPosition = 'center';
    if (initEl) initEl.style.display = 'none';
    var navAv = document.getElementById('navAvatarEl');
    if (navAv) {
      navAv.style.backgroundImage    = 'url(' + saved + ')';
      navAv.style.backgroundSize     = 'cover';
      navAv.style.backgroundPosition = 'center';
      navAv.textContent = '';
    }
  } else {
    if (initEl) initEl.textContent = (u.name || 'U')[0].toUpperCase();
  }
}

function changeAvatar(input) {
  if (!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    var url = e.target.result;
    var av  = document.getElementById('cpAvatar');
    if (av) {
      av.style.backgroundImage    = 'url(' + url + ')';
      av.style.backgroundSize     = 'cover';
      av.style.backgroundPosition = 'center';
      var initEl = document.getElementById('cpAvatarInitial');
      if (initEl) initEl.style.display = 'none';
    }
    var navAv = document.getElementById('navAvatarEl');
    if (navAv) {
      navAv.style.backgroundImage    = 'url(' + url + ')';
      navAv.style.backgroundSize     = 'cover';
      navAv.style.backgroundPosition = 'center';
      navAv.textContent = '';
    }
    var u = loadUser();
    if (u) localStorage.setItem('vt_avatar_' + u.email, url);
    showToast('✅ Đã cập nhật ảnh đại diện!');
  };
  reader.readAsDataURL(input.files[0]);
}

// ── PROFILE (sidebar) ──
function cpLoadProfile(u) {
  var nameEl = document.getElementById('cpSidebarName');
  if (nameEl) nameEl.textContent = u.name || '—';
}

// ── BADGE HẠNG ──
function cpLoadBadge(u) {
  var bookings = JSON.parse(localStorage.getItem('vt_bookings_' + u.email) || '[]');
  var n        = bookings.length;
  var badge    = document.getElementById('cpMemberBadge');
  if (!badge) return;
  if (n >= 5) {
    badge.textContent      = 'THÀNH VIÊN KIM CƯƠNG';
    badge.style.background = 'linear-gradient(135deg,#a8edea,#6ec6ff)';
    badge.style.color      = '#003a6b';
  } else if (n >= 3) {
    badge.textContent      = 'THÀNH VIÊN VÀNG';
    badge.style.background = 'linear-gradient(135deg,#f5c518,#e6a800)';
    badge.style.color      = '#7a5200';
  } else if (n >= 1) {
    badge.textContent      = 'THÀNH VIÊN BẠC';
    badge.style.background = 'linear-gradient(135deg,#ddd,#bbb)';
    badge.style.color      = '#444';
  } else {
    badge.textContent      = 'THÀNH VIÊN MỚI';
    badge.style.background = 'linear-gradient(135deg,#e8f7f2,#c8eeda)';
    badge.style.color      = '#2d8a4e';
  }
}

// ── FORM ──
function cpLoadForm(u) {
  var set = function(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val || '';
  };
  set('infoName',    u.name);
  set('infoEmail',   u.email);
  set('infoPhone',   u.phone);
  set('infoDob',     u.dob);
  set('infoAddress', u.address);
}

function saveInfo() {
  var u = loadUser();
  if (!u) return;
  var name    = (document.getElementById('infoName')?.value    || '').trim();
  var phone   = (document.getElementById('infoPhone')?.value   || '').trim();
  var dob     = (document.getElementById('infoDob')?.value     || '');
  var address = (document.getElementById('infoAddress')?.value || '').trim();
  if (!name) { showToast('⚠️ Vui lòng nhập họ và tên'); return; }
  u.name = name; u.phone = phone; u.dob = dob; u.address = address;
  saveUser(u);
  var nameEl = document.getElementById('cpSidebarName');
  if (nameEl) nameEl.textContent = name;
  var navName = document.getElementById('navUsernameEl');
  if (navName) navName.textContent = name.split(' ').slice(-1)[0];
  var dropName = document.getElementById('dropName');
  if (dropName) dropName.textContent = name;
  var msg = document.getElementById('infoSuccess');
  if (msg) { msg.style.display = 'inline-flex'; setTimeout(function() { msg.style.display = 'none'; }, 3000); }
  showToast('✅ Đã lưu thông tin cá nhân!');
}

// ── SWITCH TAB ──
function switchTab(name, btn) {
  document.querySelectorAll('.cp-tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.cp-sidenav-item:not(.cp-sidenav-logout)').forEach(function(b) { b.classList.remove('active'); });
  var tab = document.getElementById('tab-' + name);
  if (tab) tab.classList.add('active');
  if (btn) btn.classList.add('active');
}

function switchTabById(name) {
  var map  = { info: 0, offers: 1, history: 2, wallet: 3, password: 4 };
  var btns = document.querySelectorAll('.cp-sidenav-item:not(.cp-sidenav-logout)');
  document.querySelectorAll('.cp-tab').forEach(function(t) { t.classList.remove('active'); });
  btns.forEach(function(b) { b.classList.remove('active'); });
  var tab = document.getElementById('tab-' + name);
  if (tab) tab.classList.add('active');
  var idx = map[name];
  if (btns[idx] !== undefined) btns[idx].classList.add('active');
}

// ── BUILD BOOKING CARD ──
function cpBuildBookingHTML(b) {
  var isDone    = b.status === 'confirmed' || b.status === 'done';
  var statusCls = isDone ? 'status-done' : 'status-upcoming';
  var statusLbl = isDone ? 'Đã hoàn thành' : 'Sắp diễn ra';
  var bg        = b.bg || 'linear-gradient(135deg,#2d8a4e,#3aaa62)';
  var tour      = b.tourName || b.tour || '—';
  var date      = b.date    || '—';
  var guests    = b.guests  || 1;
  var total     = b.total   || b.price || '—';
  var code      = b.code    || '—';
  var payment   = b.payment || 'Không rõ';
  return (
    '<div class="cp-booking-item">' +
      '<div class="cp-booking-img" style="background:' + bg + '"></div>' +
      '<div class="cp-booking-info">' +
        '<div class="cp-booking-name">' + tour + '</div>' +
        '<div class="cp-booking-meta">📅 ' + date + '</div>' +
        '<div class="cp-booking-price">' + total + '</div>' +
      '</div>' +
      '<div class="cp-booking-right">' +
        '<span class="cp-booking-status ' + statusCls + '">' + statusLbl + '</span>' +
        '<button class="cp-detail-btn" onclick="cpShowDetail(this)"' +
          ' data-tour="' + tour + '" data-date="' + date + '"' +
          ' data-guests="' + guests + '" data-total="' + total + '"' +
          ' data-code="' + code + '" data-payment="' + payment + '">Xem chi tiết</button>' +
      '</div>' +
    '</div>'
  );
}

// ── MODAL CHI TIẾT ──
function cpShowDetail(btn) {
  var d    = btn.dataset;
  var html =
    '<div class="cp-modal-overlay" id="cpModalOverlay" onclick="cpCloseModal()">' +
      '<div class="cp-modal-box" onclick="event.stopPropagation()">' +
        '<div class="cp-modal-header">' +
          '<h3>Chi tiết đặt tour</h3>' +
          '<button class="cp-modal-close" onclick="cpCloseModal()">✕</button>' +
        '</div>' +
        '<div class="cp-modal-body">' +
          '<div class="cp-modal-row"><span>🗺️ Tour</span><strong>' + d.tour + '</strong></div>' +
          '<div class="cp-modal-row"><span>📅 Ngày đi</span><strong>' + d.date + '</strong></div>' +
          '<div class="cp-modal-row"><span>👥 Số khách</span><strong>' + d.guests + ' người</strong></div>' +
          '<div class="cp-modal-row"><span>💳 Thanh toán</span><strong>' + d.payment + '</strong></div>' +
          '<div class="cp-modal-row"><span>💰 Tổng tiền</span><strong style="color:#00a86b">' + d.total + '</strong></div>' +
          '<div class="cp-modal-code">Mã đặt chỗ<span>' + d.code + '</span></div>' +
        '</div>' +
        '<button class="cp-modal-close-btn" onclick="cpCloseModal()">Đóng</button>' +
      '</div>' +
    '</div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
function cpCloseModal() {
  var el = document.getElementById('cpModalOverlay');
  if (el) el.remove();
}

// ── LỊCH SỬ ──
function cpRenderHistory(u) {
  var list     = document.getElementById('historyList');
  if (!list) return;
  var bookings = JSON.parse(localStorage.getItem('vt_bookings_' + u.email) || '[]');
  if (!bookings.length) {
    list.innerHTML = '<div class="cp-empty"><div class="cp-empty-icon">🕐</div><p>Bạn chưa có lịch sử đặt tour nào.</p><a href="1tourdulich.html" class="cp-explore-btn">Khám phá ngay</a></div>';
    return;
  }
  list.innerHTML = bookings.map(cpBuildBookingHTML).join('');
}

function cpRenderRecentHistory(u) {
  var section  = document.getElementById('recentSection');
  var list     = document.getElementById('recentHistoryList');
  if (!list) return;
  var bookings = JSON.parse(localStorage.getItem('vt_bookings_' + u.email) || '[]');
  if (!bookings.length) { if (section) section.style.display = 'none'; return; }
  if (section) section.style.display = '';
  list.innerHTML = bookings.slice(0, 2).map(cpBuildBookingHTML).join('');
}

// ── ĐỔI MẬT KHẨU ──
function changePassword() {
  var u   = loadUser(); if (!u) return;
  var cur = (document.getElementById('pwdCurrent')?.value || '');
  var nw  = (document.getElementById('pwdNew')?.value     || '');
  var cf  = (document.getElementById('pwdConfirm')?.value || '');
  var err = document.getElementById('pwdError');
  var ok  = document.getElementById('pwdSuccess');
  if (err) err.style.display = 'none';
  if (ok)  ok.style.display  = 'none';
  if (!cur || !nw || !cf) { showPwdErr('Vui lòng điền đầy đủ tất cả các trường.'); return; }
  if (nw.length < 6)      { showPwdErr('Mật khẩu mới phải có ít nhất 6 ký tự.');   return; }
  if (nw !== cf)           { showPwdErr('Mật khẩu xác nhận không khớp.');            return; }
  var db = [];
  try { db = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]'); } catch(e) {}
  var userInDb = db.find(function(x) { return x.email === u.email; });
  if (userInDb && userInDb.password && userInDb.password !== cur) { showPwdErr('Mật khẩu hiện tại không đúng.'); return; }
  if (userInDb) {
    userInDb.password = nw;
    try { localStorage.setItem('vt_userdb', JSON.stringify(db)); } catch(e) {}
    try { sessionStorage.setItem('vt_userdb', JSON.stringify(db)); } catch(e) {}
  }
  ['pwdCurrent','pwdNew','pwdConfirm'].forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
  var fill = document.getElementById('pwdBarFill');
  var txt  = document.getElementById('pwdStrengthText');
  if (fill) { fill.style.width = '0'; fill.style.background = '#eee'; }
  if (txt)  txt.textContent = '';
  if (ok) { ok.style.display = 'inline-flex'; setTimeout(function() { ok.style.display = 'none'; }, 3000); }
  showToast('🔒 Đổi mật khẩu thành công!');
}

function showPwdErr(msg) {
  var el = document.getElementById('pwdError');
  if (!el) return;
  el.textContent   = msg;
  el.style.display = 'block';
}

function checkPwdStrength(val) {
  var fill = document.getElementById('pwdBarFill');
  var txt  = document.getElementById('pwdStrengthText');
  if (!fill || !txt) return;
  var s = 0;
  if (val.length >= 8)           s++;
  if (/[A-Z]/.test(val))         s++;
  if (/[0-9]/.test(val))         s++;
  if (/[^A-Za-z0-9]/.test(val))  s++;
  var lv = [
    { w:'0%',   c:'#eee',    t:'' },
    { w:'25%',  c:'#e04444', t:'Yếu' },
    { w:'50%',  c:'#f90',    t:'Trung bình' },
    { w:'75%',  c:'#3aaa62', t:'Khá' },
    { w:'100%', c:'#2d8a4e', t:'Mạnh' },
  ][s];
  fill.style.width      = lv.w;
  fill.style.background = lv.c;
  txt.textContent       = lv.t;
  txt.style.color       = lv.c;
}

function togglePwd(id, btn) {
  var inp = document.getElementById(id);
  if (!inp) return;
  inp.type        = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

// ── LOGOUT ──
function doLogout() {
  sessionStorage.removeItem('vt_user');
  localStorage.removeItem('vt_user');
  window.location.href = '1trangchu.html';
}