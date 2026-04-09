// ============================================================
// 3admin.js
// ============================================================

// ===== SWITCH TAB =====
function switchTab(name) {
  document.querySelectorAll('.admin-tab').forEach(function (t) { t.classList.remove('active'); t.style.display = 'none'; });
  document.querySelectorAll('.admin-nav-item').forEach(function (a) { a.classList.remove('active'); });
  var tab = document.getElementById('tab-' + name);
  var nav = document.getElementById('aNav-' + name);
  if (tab) { tab.classList.add('active'); tab.style.display = 'flex'; }
  if (nav) nav.classList.add('active');

  // Keep active tab in query params so reload keeps current tab.
  try {
    if (tab) {
      var url = new URL(window.location.href);
      url.searchParams.set('tab', name);
      window.history.replaceState({}, '', url.toString());
    }
  } catch (e) { }

  if (name === 'tours') adminRenderTours();
  if (name === 'tours') adminRenderPromoPreview();
  if (name === 'users') renderUsersTable();
  if (name === 'dashboard') adminUpdateDashStats();
}

// ===== DASHBOARD STATS =====
function adminUpdateDashStats() {
  dashLoadDashboard();
}

// ===== USERS TABLE =====
// ===== USERS MANAGEMENT =====
var ADMIN_USER_PAGE = 1;
var ADMIN_USER_PER = 10;
var ADMIN_USER_SEARCH = '';

async function renderUsersTable() {
  var tbody = document.getElementById('usersTableBody');
  var footer = document.getElementById('usersTableFooter');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:32px">Đang tải...</td></tr>';

  var users = [];

  // Thử API trước
  try {
    var res = await apiAdminGetUsers({
      page: ADMIN_USER_PAGE,
      limit: ADMIN_USER_PER,
      keyword: ADMIN_USER_SEARCH
    });
    if (res && res.ok && res.data.result) {
      users = res.data.result.users || res.data.result || [];
      // Render pagination từ API
      var pagination = res.data.result.pagination;
      if (pagination && footer) renderUsersPagination(pagination.total, footer);
    }
  } catch (e) { }

  // Fallback localStorage
  if (!users.length) {
    try {
      var raw = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]');
      // Lọc theo search
      if (ADMIN_USER_SEARCH) {
        var q = ADMIN_USER_SEARCH.toLowerCase();
        raw = raw.filter(function (u) { return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q); });
      }
      var total = raw.length;
      var start = (ADMIN_USER_PAGE - 1) * ADMIN_USER_PER;
      users = raw.slice(start, start + ADMIN_USER_PER);
      if (footer) renderUsersPagination(total, footer);
    } catch (e) { }
  }

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:32px">Chưa có người dùng nào</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(function (u, i) {
    var id = u._id || u.id || i;
    var name = u.full_name || u.name || '—';
    var email = u.email || '—';
    var phone = u.phone || '—';
    var role = u.role;
    var status = u.status; // 1=active, 2=banned (API) hoặc locked (local)
    var isAdmin = role === 'admin' || role === 1;
    var isBanned = status === 2 || u.locked === true;

    var roleBadge = isAdmin
      ? '<span class="admin-badge-active">👑 Admin</span>'
      : '<span class="admin-badge-inactive" style="background:#f0f0f0;color:#888">👤 User</span>';
    var statusBadge = isBanned
      ? '<span class="admin-badge-inactive">🔒 Bị khóa</span>'
      : '<span class="admin-badge-active">✅ Hoạt động</span>';

    var roleBtn = isAdmin
      ? '<button class="admin-act-btn" data-id="' + id + '" data-role="0" onclick="adminSetRoleBtn(this)">↓ Hạ quyền</button>'
      : '<button class="admin-act-btn" data-id="' + id + '" data-role="1" onclick="adminSetRoleBtn(this)">↑ Admin</button>';
    var statusBtn = isBanned
      ? '<button class="admin-act-btn admin-act-btn-green" data-id="' + id + '" data-status="1" onclick="adminSetStatusBtn(this)">🔓 Mở khóa</button>'
      : '<button class="admin-act-btn admin-act-btn-red"   data-id="' + id + '" data-status="2" onclick="adminSetStatusBtn(this)">🔒 Khóa</button>';

    return '<tr>' +
      '<td style="color:#aaa;font-size:0.75rem">' + ((ADMIN_USER_PAGE - 1) * ADMIN_USER_PER + i + 1) + '</td>' +
      '<td><div style="font-weight:700;font-size:0.82rem">' + name + '</div></td>' +
      '<td style="font-size:0.78rem;color:#555">' + email + '</td>' +
      '<td style="font-size:0.78rem;color:#555">' + phone + '</td>' +
      '<td>' + roleBadge + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td><div style="display:flex;gap:6px">' + roleBtn + statusBtn + '</div></td>' +
      '</tr>';
  }).join('');
}

function renderUsersPagination(total, footer) {
  var totalPages = Math.max(1, Math.ceil(total / ADMIN_USER_PER));
  var pages = '';
  for (var p = 1; p <= Math.min(totalPages, 5); p++) {
    pages += '<button class="admin-page-btn' + (p === ADMIN_USER_PAGE ? ' active' : '') + '" onclick="adminGoUserPage(' + p + ')">' + p + '</button>';
  }
  footer.innerHTML =
    '<span style="font-size:0.75rem;color:#aaa">Tổng ' + total + ' người dùng</span>' +
    '<div class="admin-pagination">' +
    '<button class="admin-page-btn text" onclick="adminGoUserPage(' + Math.max(1, ADMIN_USER_PAGE - 1) + ')">Trước</button>' +
    pages +
    '<button class="admin-page-btn text" onclick="adminGoUserPage(' + Math.min(totalPages, ADMIN_USER_PAGE + 1) + ')">Sau</button>' +
    '</div>';
}

function adminGoUserPage(p) { ADMIN_USER_PAGE = p; renderUsersTable(); }

function adminSearchUsers() {
  ADMIN_USER_SEARCH = (document.getElementById('adminUserSearch')?.value || '').trim();
  ADMIN_USER_PAGE = 1;
  renderUsersTable();
}

function adminSetRoleBtn(btn) { adminSetRole(btn.dataset.id, parseInt(btn.dataset.role), btn); }
function adminSetStatusBtn(btn) { adminSetStatus(btn.dataset.id, parseInt(btn.dataset.status), btn); }

// PATCH /api/users/:id/role
async function adminSetRole(id, role, btn) {
  var label = role === 1 ? 'Admin' : 'User';
  if (!confirm('Đổi quyền tài khoản này thành ' + label + '?')) return;
  btn.disabled = true; btn.textContent = '...';

  try {
    var res = await apiAdminSetUserRole(id, role);
    if (res && res.ok) {
      showToast('✅ Đã đổi quyền thành ' + label);
    } else { showToast('⚠️ Không thể đổi quyền qua API, đang cập nhật local...'); }
  } catch (e) { }

  // Fallback: cập nhật localStorage
  try {
    var db = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]');
    var u = db.find(function (x) { return x.id == id || x._id == id || x.email == id; });
    if (u) {
      u.role = role === 1 ? 'admin' : 'customer';
      localStorage.setItem('vt_userdb', JSON.stringify(db));
      sessionStorage.setItem('vt_userdb', JSON.stringify(db));
      showToast('✅ Đã đổi quyền thành ' + label);
    }
  } catch (e) { }

  renderUsersTable();
}

// PATCH /api/users/:id/status
async function adminSetStatus(id, status, btn) {
  var label = status === 2 ? 'khóa' : 'mở khóa';
  if (!confirm('Bạn muốn ' + label + ' tài khoản này?')) return;
  btn.disabled = true; btn.textContent = '...';

  try {
    var res = await apiAdminSetUserStatus(id, status);
    if (res && res.ok) {
      showToast('✅ Đã ' + label + ' tài khoản');
    }
  } catch (e) { }

  // Fallback: cập nhật localStorage
  try {
    var db2 = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]');
    var u2 = db2.find(function (x) { return x.id == id || x._id == id || x.email == id; });
    if (u2) {
      u2.locked = (status === 2);
      u2.status = status;
      localStorage.setItem('vt_userdb', JSON.stringify(db2));
      sessionStorage.setItem('vt_userdb', JSON.stringify(db2));
      showToast('✅ Đã ' + label + ' tài khoản');
    }
  } catch (e) { }

  renderUsersTable();
}

// ===== TOURS DATA =====
var ADMIN_TOURS_KEY = 'vt_admin_tours';
var DEFAULT_TOURS = [
  { id: 1, name: 'Du Thuyền Hạ Long Sang Trọng', location: 'Vịnh Hạ Long, Quảng Ninh', price: '6.990.000đ', duration: '3', desc: 'Trải nghiệm du thuyền 5 sao trên vịnh Hạ Long huyền thoại.', active: true, schedules: [{ date: '2026-04-10', slots: 20 }, { date: '2026-04-24', slots: 15 }], days: [] },
  { id: 2, name: 'Tour Phố Cổ Hội An & Ẩm Thực', location: 'Phố Cổ Hội An, Quảng Nam', price: '1.250.000đ', duration: '2', desc: 'Khám phá phố cổ Hội An về đêm và trải nghiệm ẩm thực địa phương.', active: true, schedules: [{ date: '2026-04-05', slots: 25 }], days: [] },
  { id: 3, name: 'Trekking & Homestay Sapa', location: 'Sapa, Lào Cai', price: '2.800.000đ', duration: '3', desc: 'Trekking qua các bản làng và lưu trú homestay bản địa.', active: true, schedules: [{ date: '2026-04-15', slots: 12 }], days: [] },
  { id: 4, name: 'Khám Phá Hà Nội Cổ Kính', location: 'Hà Nội', price: '850.000đ', duration: '1', desc: 'Tour city khám phá 36 phố phường và ẩm thực đường phố.', active: true, schedules: [], days: [] },
  { id: 5, name: 'Đà Nẵng – Bà Nà Hills', location: 'Đà Nẵng', price: '1.900.000đ', duration: '2', desc: 'Cầu Vàng, Bà Nà Hills và bãi biển Mỹ Khê tuyệt đẹp.', active: true, schedules: [{ date: '2026-04-20', slots: 30 }], days: [] },
  { id: 6, name: 'Tràng An – Tam Cốc Ninh Bình', location: 'Ninh Bình', price: '1.100.000đ', duration: '1', desc: 'Chèo thuyền qua hang động Tràng An di sản thế giới UNESCO.', active: false, schedules: [], days: [] },
  { id: 7, name: 'Sông Nước Miền Tây', location: 'Cần Thơ', price: '1.650.000đ', duration: '2', desc: 'Khám phá chợ nổi Cái Răng và vườn trái cây đặc sản.', active: true, schedules: [{ date: '2026-04-08', slots: 18 }], days: [] },
];

function adminGetTours() {
  try { var r = localStorage.getItem(ADMIN_TOURS_KEY); return r ? JSON.parse(r) : DEFAULT_TOURS; } catch (e) { return DEFAULT_TOURS; }
}
function adminSaveTours(tours) { localStorage.setItem(ADMIN_TOURS_KEY, JSON.stringify(tours)); }

// ===== TOURS LIST =====
var ADMIN_TOUR_PAGE = 1;
var ADMIN_TOUR_PER = 8;

function adminRenderTours() {
  var tbody = document.getElementById('adminToursBody');
  var footer = document.getElementById('adminToursFooter');
  if (!tbody) return;

  var search = (document.getElementById('adminTourSearch')?.value || '').toLowerCase();
  var escapeHtml = function (val) {
    return String(val || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  var shortText = function (val, limit) {
    var s = String(val || '');
    return s.length <= limit ? s : (s.slice(0, limit - 1) + '...');
  };
  var isPublished = function (t) {
    if (typeof t.status === 'number') return t.status === 1;
    if (typeof t.active === 'boolean') return t.active;
    return false;
  };

  var allTours = adminGetTours();
  var tours = allTours.filter(function (t) {
    var raw = [
      t._id,
      t.category_id,
      t.name,
      t.slug,
      t.description || t.desc,
      t.destination || t.location,
      t.departure_city,
      Array.isArray(t.highlights) ? t.highlights.join(' ') : '',
      Array.isArray(t.includes) ? t.includes.join(' ') : '',
      Array.isArray(t.excludes) ? t.excludes.join(' ') : ''
    ].join(' ').toLowerCase();
    return !search || raw.includes(search);
  });

  var total = tours.length;
  var start = (ADMIN_TOUR_PAGE - 1) * ADMIN_TOUR_PER;
  var paged = tours.slice(start, start + ADMIN_TOUR_PER);

  if (!paged.length) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#aaa;padding:40px;font-size:0.85rem">Chưa có tour nào</td></tr>';
    if (footer) footer.innerHTML = '';
    return;
  }

  tbody.innerHTML = paged.map(function (t) {
    var realIdx = allTours.indexOf(t);
    var published = isPublished(t);
    var statusBadge = published
      ? '<span class="badge-published">ĐANG HIỂN THỊ</span>'
      : '<span class="badge-draft">BẢN NHÁP</span>';
    var actionBtns = published
      ? '<button class="act-btn-content" onclick="adminEditTour(' + realIdx + ')">📄 Nội dung</button><button class="act-btn-delete" onclick="adminToggleTour(' + realIdx + ')">Gỡ bỏ</button><button class="admin-act-btn admin-act-btn-red" data-id="' + (t._id || t.id || '') + '" data-idx="' + realIdx + '" onclick="adminDeleteTour(this)" style="font-size:0.72rem;padding:4px 10px">🗑️ Xóa</button>'
      : '<button class="act-btn-content" onclick="adminEditTour(' + realIdx + ')">📄 Nội dung</button><button class="act-btn-publish" onclick="adminToggleTour(' + realIdx + ')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Xuất bản</button><button class="admin-act-btn admin-act-btn-red" data-id="' + (t._id || t.id || '') + '" data-idx="' + realIdx + '" onclick="adminDeleteTour(this)" style="font-size:0.72rem;padding:4px 10px">🗑️ Xóa</button>';

    var highlights = Array.isArray(t.highlights) ? t.highlights : [];
    var images = Array.isArray(t.images) ? t.images : [];
    var itinerary = Array.isArray(t.itinerary) ? t.itinerary : [];
    var includes = Array.isArray(t.includes) ? t.includes : [];
    var excludes = Array.isArray(t.excludes) ? t.excludes : [];

    var idText = t._id || ('TOUR-' + String(t.id || realIdx + 1).padStart(5, '0'));
    var catText = t.category_id || '—';
    var nameText = t.name || '—';
    var slugText = t.slug || '—';
    var descText = t.description || t.desc || '—';
    var destinationText = t.destination || t.location || '—';
    var departureText = t.departure_city || '—';

    var days = Number(t.duration_days || t.duration || 0);
    var nights = (t.duration_nights !== undefined && t.duration_nights !== null) ? Number(t.duration_nights) : null;
    var durationText = days > 0 ? (days + 'N' + (nights !== null && !isNaN(nights) ? (' ' + nights + 'Đ') : '')) : '—';

    return '<tr>' +
      '<td style="max-width:170px"><div style="font-size:0.76rem;font-weight:700;color:#374151;word-break:break-all">' + escapeHtml(idText) + '</div></td>' +
      '<td style="max-width:170px"><div style="font-size:0.76rem;color:#4b5563;word-break:break-all">' + escapeHtml(catText) + '</div></td>' +
      '<td style="max-width:260px"><div style="font-weight:700;font-size:0.82rem;color:#1a1a1a">' + escapeHtml(nameText) + '</div><div class="tour-id-badge">' + escapeHtml(slugText) + '</div></td>' +
      '<td style="max-width:300px"><div style="font-size:0.78rem;color:#374151;line-height:1.45">' + escapeHtml(shortText(descText, 120)) + '</div><div class="tour-id-badge">Highlights: ' + escapeHtml(highlights.length ? highlights.slice(0, 2).join(' | ') : '—') + (highlights.length > 2 ? ' +' + (highlights.length - 2) : '') + '</div></td>' +
      '<td style="max-width:220px"><div style="font-size:0.8rem;font-weight:600;color:#111827">' + escapeHtml(destinationText) + '</div><div class="tour-id-badge">Khởi hành: ' + escapeHtml(departureText) + '</div></td>' +
      '<td style="white-space:nowrap"><div style="font-size:0.8rem;font-weight:700;color:#1f2937">' + escapeHtml(durationText) + '</div></td>' +
      '<td style="max-width:180px"><div style="font-size:0.78rem;color:#374151">Ảnh: ' + images.length + '</div><div class="tour-id-badge">Lịch trình: ' + itinerary.length + ' ngày</div></td>' +
      '<td style="max-width:230px"><div style="font-size:0.76rem;color:#374151;line-height:1.4">+' + escapeHtml(includes.slice(0, 2).join(', ') || '—') + (includes.length > 2 ? '...' : '') + '</div><div class="tour-id-badge">-' + escapeHtml(excludes.slice(0, 2).join(', ') || '—') + (excludes.length > 2 ? '...' : '') + '</div></td>' +
      '<td><div style="display:flex;flex-direction:column;gap:6px">' + statusBadge + '<span class="tour-id-badge">status: ' + (t.status !== undefined ? t.status : (published ? 1 : 0)) + '</span></div></td>' +
      '<td><div class="act-btns">' + actionBtns + '</div></td>' +
      '</tr>';
  }).join('');

  var totalPages = Math.max(1, Math.ceil(total / ADMIN_TOUR_PER));
  var pageLinks = '';
  for (var p = 1; p <= totalPages; p++) {
    pageLinks += '<button class="admin-page-btn' + (p === ADMIN_TOUR_PAGE ? ' active' : '') + '" onclick="adminGoTourPage(' + p + ')">' + p + '</button>';
  }
  if (footer) footer.innerHTML =
    '<span>Hiển thị ' + Math.min(start + 1, total) + ' - ' + Math.min(start + ADMIN_TOUR_PER, total) + ' của ' + total + ' tour</span>' +
    '<div class="admin-pagination">' +
    '<button class="admin-page-btn text" onclick="adminGoTourPage(' + Math.max(1, ADMIN_TOUR_PAGE - 1) + ')">Trước</button>' +
    pageLinks +
    '<button class="admin-page-btn text" onclick="adminGoTourPage(' + Math.min(totalPages, ADMIN_TOUR_PAGE + 1) + ')">Sau</button>' +
    '</div>';
}

function adminGoTourPage(p) { ADMIN_TOUR_PAGE = p; adminRenderTours(); }

function adminToggleTour(idx) {
  var tours = adminGetTours();
  if (!tours[idx]) return;
  if (typeof tours[idx].status === 'number') {
    tours[idx].status = tours[idx].status === 1 ? 0 : 1;
    tours[idx].active = tours[idx].status === 1;
  } else {
    tours[idx].active = !tours[idx].active;
    tours[idx].status = tours[idx].active ? 1 : 0;
  }
  adminSaveTours(tours);
  adminRenderTours();
  showToast(((tours[idx].status === 1 || tours[idx].active) ? '✅ Đã bật' : '⏸ Đã tắt') + ' tour: ' + tours[idx].name);
}

// ===== SHOW/HIDE VIEWS =====
function adminShowTourList() {
  document.getElementById('tourListView').style.display = 'block';
  document.getElementById('tourCreateView').style.display = 'none';
  adminRenderTours();
}

function adminShowCreateTour(idx) {
  document.getElementById('tourListView').style.display = 'none';
  document.getElementById('tourCreateView').style.display = 'block';
  document.getElementById('atfMainTitle').textContent = idx !== undefined ? 'Chỉnh sửa Tour' : 'Tạo Tour Mới';
  document.getElementById('atfMainSub').textContent = idx !== undefined ? 'Cập nhật thông tin tour' : 'Thêm một địa điểm mới vào nền tảng';
  document.getElementById('atfName').dataset.idx = idx !== undefined ? idx : '';

  if (idx !== undefined) {
    var t = adminGetTours()[idx];
    if (!t) return;
    document.getElementById('atfName').value = t.name || '';
    document.getElementById('atfLocation').value = t.location || '';
    document.getElementById('atfPrice').value = t.price || '';
    document.getElementById('atfDuration').value = t.duration || '';
    document.getElementById('atfDesc').innerText = t.desc || '';
    // Days
    var dl = document.getElementById('atfDaysList');
    dl.innerHTML = '';
    (t.days || []).forEach(function (d) { atfAddDay(d.title, d.desc); });
    if (!dl.children.length) { atfAddDay(); atfAddDay(); }
    // Schedules
    var sl = document.getElementById('atfScheduleList');
    sl.innerHTML = '';
    (t.schedules || []).forEach(function (s) { atfAddScheduleRow(s.date, s.slots); });
  } else {
    document.getElementById('atfName').value = '';
    document.getElementById('atfLocation').value = '';
    document.getElementById('atfPrice').value = '';
    document.getElementById('atfDuration').value = '';
    document.getElementById('atfDesc').innerText = 'Mô tả các điểm nổi bật của tour...';
    document.getElementById('atfDaysList').innerHTML = '';
    document.getElementById('atfScheduleList').innerHTML = '<p style="font-size:0.8rem;color:#bbb;text-align:center;padding:12px 0">Chưa có lịch nào</p>';
    atfAddDay(); atfAddDay();
  }
}

function adminEditTour(idx) { adminShowCreateTour(idx); }

// ===== SAVE TOUR =====
function adminPublishTour() { adminDoSaveTour(true); }
function adminSaveTourDraft() { adminDoSaveTour(false); }

function adminDoSaveTour(publish) {
  var name = (document.getElementById('atfName').value || '').trim();
  var location = (document.getElementById('atfLocation').value || '').trim();
  var price = (document.getElementById('atfPrice').value || '').trim();
  var duration = (document.getElementById('atfDuration').value || '').trim();
  var desc = (document.getElementById('atfDesc').innerText || '').trim();
  var idxStr = document.getElementById('atfName').dataset.idx;

  if (!name) { showToast('⚠️ Vui lòng nhập tên tour'); return; }
  if (!location) { showToast('⚠️ Vui lòng chọn địa điểm'); return; }

  var days = [];
  document.querySelectorAll('.atf-day-item').forEach(function (row) {
    var t = row.querySelector('.day-title-inp');
    var d = row.querySelector('.day-desc-inp');
    days.push({ title: t ? t.value : '', desc: d ? d.value : '' });
  });

  var schedules = [];
  document.querySelectorAll('.atf-schedule-row').forEach(function (row) {
    var d = row.querySelector('.sched-date-inp');
    var s = row.querySelector('.slot-inp');
    if (d && d.value) schedules.push({ date: d.value, slots: parseInt(s ? s.value : 0) || 0 });
  });

  var tours = adminGetTours();
  var tour = { name: name, location: location, price: price ? price + 'đ' : '—', duration: duration, desc: desc, active: publish, schedules: schedules, days: days };

  if (idxStr !== '') {
    var idx = parseInt(idxStr);
    tour.id = tours[idx].id;
    tours[idx] = tour;
    showToast('✅ Đã cập nhật tour: ' + name);
  } else {
    tour.id = tours.reduce(function (m, t) { return Math.max(m, t.id || 0); }, 0) + 1;
    tours.push(tour);
    showToast(publish ? '✅ Đã xuất bản tour: ' + name : '📝 Đã lưu bản nháp: ' + name);
  }

  adminSaveTours(tours);
  adminShowTourList();
}

// ===== ITINERARY DAYS =====
var dayCount = 0;
function atfAddDay(title, desc) {
  dayCount++;
  var list = document.getElementById('atfDaysList');
  if (!list) return;
  var div = document.createElement('div');
  div.className = 'atf-day-item';
  div.innerHTML =
    '<div class="atf-day-header">' +
    '<span class="atf-day-badge">Ngày ' + dayCount + '</span>' +
    '<button class="atf-day-del" onclick="atfRemoveDay(this)" title="Xóa ngày">✕</button>' +
    '</div>' +
    '<div class="atf-day-body">' +
    '<input class="day-title-inp" type="text" placeholder="Tiêu đề: Tham quan đảo & Chèo thuyền Kayak" value="' + (title || '') + '">' +
    '<textarea class="day-desc-inp" placeholder="Mô tả hoạt động trong ngày...">' + (desc || '') + '</textarea>' +
    '</div>';
  list.appendChild(div);
}

function atfRemoveDay(btn) {
  btn.closest('.atf-day-item').remove();
  // Re-number
  dayCount = 0;
  document.querySelectorAll('.atf-day-item').forEach(function (item) {
    dayCount++;
    var badge = item.querySelector('.atf-day-badge');
    if (badge) badge.textContent = 'Ngày ' + dayCount;
  });
}

// ===== SCHEDULE =====
function atfAddSchedule() { atfAddScheduleRow('', 20); }
function atfAddScheduleRow(date, slots) {
  var list = document.getElementById('atfScheduleList');
  if (!list) return;
  var empty = list.querySelector('p');
  if (empty) empty.remove();
  var row = document.createElement('div');
  row.className = 'atf-schedule-row';
  row.innerHTML =
    '<input class="sched-date-inp" type="date" value="' + (date || '') + '">' +
    '<input class="slot-inp" type="number" placeholder="Slots" value="' + (slots || 20) + '" min="1">' +
    '<button class="atf-sched-del" onclick="this.parentElement.remove()" title="Xóa">✕</button>';
  list.appendChild(row);
}

// ===== IMAGE UPLOAD =====
function atfAddImages(input) {
  if (!input.files) return;
  var grid = document.getElementById('atfImgGrid');
  Array.from(input.files).slice(0, 6).forEach(function (file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var div = document.createElement('div');
      div.className = 'atf-img-preview';
      div.style.backgroundImage = 'url(' + e.target.result + ')';
      div.innerHTML = '<button onclick="this.parentElement.remove()" title="Xóa">✕</button>';
      grid.insertBefore(div, grid.querySelector('.atf-img-upload'));
    };
    reader.readAsDataURL(file);
  });
}

// ===== TEXT FORMAT =====
function atfFormat(cmd) { document.execCommand(cmd, false, null); }

// ============================================================
// COUPONS – Quản lý Mã giảm giá
// ============================================================
var ADMIN_COUPON_PAGE = 1;
var ADMIN_COUPON_PER = 10;
var ADMIN_COUPON_KEYWORD = '';
var ADMIN_COUPON_IS_ACTIVE = '';
var ADMIN_COUPON_ROWS_CACHE = [];
var ADMIN_COUPON_CONFIRM_RESOLVE = null;

var ADMIN_COUPON_ERROR_VI = {
  COUPON_CODE_IS_REQUIRED: 'Vui lòng nhập mã giảm giá.',
  COUPON_CODE_MUST_BE_A_STRING: 'Mã giảm giá phải là chuỗi ký tự.',
  COUPON_CODE_LENGTH_INVALID: 'Mã giảm giá phải từ 3 đến 20 ký tự.',
  COUPON_CODE_ALREADY_EXISTS: 'Mã giảm giá đã tồn tại.',
  COUPON_VALUE_IS_REQUIRED: 'Vui lòng nhập giá trị giảm.',
  COUPON_VALUE_MUST_BE_A_POSITIVE_INTEGER: 'Giá trị giảm phải là số nguyên dương.',
  COUPON_MIN_ORDER_VALUE_IS_REQUIRED: 'Vui lòng nhập giá trị đơn tối thiểu.',
  COUPON_MIN_ORDER_VALUE_MUST_BE_NON_NEGATIVE: 'Đơn tối thiểu phải là số nguyên không âm.',
  COUPON_MAX_USAGE_IS_REQUIRED: 'Vui lòng nhập tổng lượt sử dụng tối đa.',
  COUPON_MAX_USAGE_MUST_BE_A_POSITIVE_INTEGER: 'Tổng lượt sử dụng tối đa phải là số nguyên dương.',
  COUPON_EXPIRES_AT_IS_REQUIRED: 'Vui lòng chọn hạn dùng.',
  COUPON_EXPIRES_AT_IS_INVALID: 'Hạn dùng không đúng định dạng ISO8601.',
  COUPON_EXPIRES_AT_MUST_BE_IN_FUTURE: 'Hạn dùng phải lớn hơn thời điểm hiện tại.'
};

function adminCouponTranslateErrorMessage(msg) {
  if (!msg) return '';
  var raw = String(msg).trim();
  if (ADMIN_COUPON_ERROR_VI[raw]) return ADMIN_COUPON_ERROR_VI[raw];

  var lower = raw.toLowerCase();
  if (lower.includes('already exists') || lower.includes('đã tồn tại')) return 'Mã giảm giá đã tồn tại.';
  if (lower.includes('iso8601') || lower.includes('invalid date')) return 'Hạn dùng không hợp lệ.';
  if (lower.includes('future')) return 'Hạn dùng phải lớn hơn thời điểm hiện tại.';

  return raw;
}

function adminCouponExtractErrorMessage(res, fallback) {
  var fb = fallback || 'Thao tác thất bại';
  if (!res || !res.data) return fb;

  var data = res.data || {};
  var errors = data.errors;
  if (errors) {
    if (Array.isArray(errors) && errors.length) {
      var arrMsg = errors[0] && (errors[0].msg || errors[0].message || errors[0].errorMessage || errors[0]);
      return adminCouponTranslateErrorMessage(arrMsg) || fb;
    }

    var firstVal = Object.values(errors)[0];
    if (Array.isArray(firstVal) && firstVal.length) {
      var groupedMsg = firstVal[0] && (firstVal[0].msg || firstVal[0].message || firstVal[0].errorMessage || firstVal[0]);
      return adminCouponTranslateErrorMessage(groupedMsg) || fb;
    }

    var firstMsg = firstVal && (firstVal.msg || firstVal.message || firstVal.errorMessage || firstVal);
    if (firstMsg) return adminCouponTranslateErrorMessage(firstMsg) || fb;
  }

  if (data.message) return adminCouponTranslateErrorMessage(data.message) || fb;
  if (data.error) return adminCouponTranslateErrorMessage(data.error) || fb;
  return fb;
}

function adminCouponEscapeHtml(val) {
  return String(val || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function adminCouponFormatValue(value) {
  var n = Number(value);
  if (!isFinite(n) || n <= 0) return '0đ';
  return Math.round(n).toLocaleString('vi-VN') + 'đ';
}

function adminCouponFormatCondition(minOrderValue) {
  var n = Number(minOrderValue);
  if (!isFinite(n) || n <= 0) return 'Không yêu cầu';
  return '≥ ' + Math.round(n).toLocaleString('vi-VN') + 'đ';
}

function adminCouponFormatDate(iso) {
  if (!iso) return '—';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  var dd = String(d.getDate()).padStart(2, '0');
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var yyyy = d.getFullYear();
  return dd + '/' + mm + '/' + yyyy;
}

function adminCouponToInputDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

function adminExtractCoupons(response) {
  if (!response || !response.ok) return [];
  var data = response.data || {};
  var result = data.result !== undefined ? data.result : data;

  if (Array.isArray(result)) return result;
  if (Array.isArray(result && result.coupons)) return result.coupons;
  if (Array.isArray(result && result.items)) return result.items;
  if (Array.isArray(data.coupons)) return data.coupons;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function adminExtractCouponPagination(response, fallbackCount) {
  var total = Number(fallbackCount) || 0;
  var currentPage = ADMIN_COUPON_PAGE;
  var limit = ADMIN_COUPON_PER;

  if (response && response.data) {
    var data = response.data;
    var result = data.result !== undefined ? data.result : data;
    var pagination = result && result.pagination ? result.pagination : (data.pagination || null);
    if (pagination) {
      if (pagination.total !== undefined) total = Number(pagination.total) || total;
      if (pagination.page !== undefined) currentPage = Number(pagination.page) || currentPage;
      if (pagination.limit !== undefined) limit = Number(pagination.limit) || limit;
    }
  }

  return {
    total: Math.max(0, total),
    page: Math.max(1, currentPage),
    limit: Math.max(1, limit)
  };
}

function adminCouponSearch() {
  ADMIN_COUPON_KEYWORD = (document.getElementById('adminCouponSearch')?.value || '').trim();
  ADMIN_COUPON_PAGE = 1;
  adminRenderCouponsTable();
}

function adminCouponFilterStatus() {
  ADMIN_COUPON_IS_ACTIVE = document.getElementById('adminCouponStatusFilter')?.value || '';
  ADMIN_COUPON_PAGE = 1;
  adminRenderCouponsTable();
}

function adminCouponGoPage(page) {
  ADMIN_COUPON_PAGE = Math.max(1, Number(page) || 1);
  adminRenderCouponsTable();
}

function adminCouponConfirmOpen(text, title) {
  var modal = document.getElementById('couponConfirmModal');
  var textEl = document.getElementById('couponConfirmText');
  var titleEl = document.getElementById('couponConfirmTitle');
  if (!modal) return Promise.resolve(false);
  if (titleEl) titleEl.textContent = title || 'Xác nhận thao tác';
  if (textEl) textEl.textContent = text || 'Bạn có chắc muốn tiếp tục?';
  modal.style.display = 'flex';

  return new Promise(function (resolve) {
    ADMIN_COUPON_CONFIRM_RESOLVE = resolve;
  });
}

function adminCouponConfirmClose(accepted) {
  var modal = document.getElementById('couponConfirmModal');
  if (modal) modal.style.display = 'none';
  if (ADMIN_COUPON_CONFIRM_RESOLVE) {
    var resolve = ADMIN_COUPON_CONFIRM_RESOLVE;
    ADMIN_COUPON_CONFIRM_RESOLVE = null;
    resolve(!!accepted);
  }
}

function adminCouponCreate() {
  var modal = document.getElementById('couponCreateModal');
  if (!modal) return;

  var codeEl = document.getElementById('couponCreateCode');
  var valueEl = document.getElementById('couponCreateValue');
  var minEl = document.getElementById('couponCreateMinOrderValue');
  var maxEl = document.getElementById('couponCreateMaxUsage');
  var expiresEl = document.getElementById('couponCreateExpiresAt');

  if (codeEl) codeEl.value = '';
  if (valueEl) valueEl.value = '';
  if (minEl) minEl.value = '';
  if (maxEl) maxEl.value = '';
  if (expiresEl) expiresEl.value = '';

  modal.style.display = 'flex';
  if (codeEl) codeEl.focus();
}

function adminCouponHideCreateModal() {
  var modal = document.getElementById('couponCreateModal');
  if (modal) modal.style.display = 'none';
}

function adminCouponSetCreateLoading(isLoading) {
  var saveBtn = document.getElementById('couponCreateSaveBtn');
  var cancelBtn = document.getElementById('couponCreateCancelBtn');
  var ids = ['couponCreateCode', 'couponCreateValue', 'couponCreateMinOrderValue', 'couponCreateMaxUsage', 'couponCreateExpiresAt'];

  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.disabled = !!isLoading;
  });

  if (cancelBtn) cancelBtn.disabled = !!isLoading;
  if (saveBtn) {
    if (!saveBtn.dataset.defaultText) saveBtn.dataset.defaultText = saveBtn.textContent;
    saveBtn.disabled = !!isLoading;
    saveBtn.textContent = isLoading ? 'Đang lưu...' : saveBtn.dataset.defaultText;
  }
}

function adminCouponHideEditModal() {
  var modal = document.getElementById('couponEditModal');
  if (modal) modal.style.display = 'none';
}

function adminCouponSetEditLoading(isLoading) {
  var saveBtn = document.getElementById('couponEditSaveBtn');
  var cancelBtn = document.getElementById('couponEditCancelBtn');
  var ids = ['couponEditCode', 'couponEditValue', 'couponEditMinOrderValue', 'couponEditMaxUsage', 'couponEditExpiresAt'];

  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.disabled = !!isLoading;
  });

  if (cancelBtn) cancelBtn.disabled = !!isLoading;
  if (saveBtn) {
    if (!saveBtn.dataset.defaultText) saveBtn.dataset.defaultText = saveBtn.textContent;
    saveBtn.disabled = !!isLoading;
    saveBtn.textContent = isLoading ? 'Đang lưu...' : saveBtn.dataset.defaultText;
  }
}

async function adminCouponSubmitCreate() {
  var code = (document.getElementById('couponCreateCode')?.value || '').trim().toUpperCase();
  var value = Number(document.getElementById('couponCreateValue')?.value || 0);
  var min_order_value = Number(document.getElementById('couponCreateMinOrderValue')?.value || 0);
  var max_usage = Number(document.getElementById('couponCreateMaxUsage')?.value || 0);
  var expiresDate = (document.getElementById('couponCreateExpiresAt')?.value || '').trim();

  if (!code) { showToast('⚠️ Vui lòng nhập code'); return; }
  if (!isFinite(value) || value <= 0) { showToast('⚠️ Giá trị giảm không hợp lệ'); return; }
  if (!isFinite(min_order_value) || min_order_value < 0) { showToast('⚠️ Đơn tối thiểu không hợp lệ'); return; }
  if (!isFinite(max_usage) || max_usage <= 0) { showToast('⚠️ Tổng lượt sử dụng tối đa không hợp lệ'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresDate)) { showToast('⚠️ Vui lòng chọn hạn dùng'); return; }

  adminCouponSetCreateLoading(true);
  try {
    var payload = {
      code: code,
      value: Math.round(value),
      min_order_value: Math.round(min_order_value),
      max_usage: Math.round(max_usage),
      expires_at: expiresDate + 'T00:00:00.000Z'
    };

    var res = await apiAdminCreateCoupon(payload);
    if (res && res.ok) {
      showToast('✅ Đã thêm mã giảm giá');
      adminCouponHideCreateModal();
      ADMIN_COUPON_PAGE = 1;
      adminRenderCouponsTable();
      return;
    }

    var msg = adminCouponExtractErrorMessage(res, 'Không thể thêm mã giảm giá');
    showToast('❌ ' + msg);
  } catch (e) {
    showToast('❌ Không thể kết nối server');
  } finally {
    adminCouponSetCreateLoading(false);
  }
}

async function adminCouponToggle(id, inputEl) {
  if (!id) {
    showToast('⚠️ Không tìm thấy mã giảm giá');
    return;
  }

  // onchange chạy sau khi checkbox đã đổi, nên trạng thái trước đó là đảo ngược lại
  var previousChecked = inputEl ? !inputEl.checked : false;
  var confirmed = await adminCouponConfirmOpen(
    'Bạn có chắc muốn thay đổi trạng thái mã giảm giá này?',
    'Xác nhận thay đổi trạng thái'
  );
  if (!confirmed) {
    if (inputEl) inputEl.checked = previousChecked;
    return;
  }

  if (inputEl) inputEl.disabled = true;
  try {
    // Toggle trạng thái bằng endpoint chuẩn PATCH /api/coupons/:id/toggle
    var res = await apiAdminToggleCoupon(id);
    if (res && res.ok) {
      showToast('✅ Đã cập nhật trạng thái mã giảm giá');
      adminRenderCouponsTable();
      return;
    }
    if (inputEl) inputEl.checked = previousChecked;
    var msg = adminCouponExtractErrorMessage(res, 'Không thể cập nhật trạng thái');
    showToast('❌ ' + msg);
  } catch (e) {
    if (inputEl) inputEl.checked = previousChecked;
    showToast('❌ Không thể kết nối server');
  } finally {
    if (inputEl) inputEl.disabled = false;
  }
}

function adminCouponEdit(id) {
  var list = ADMIN_COUPON_ROWS_CACHE || [];
  var c = list.find(function (x) { return (x._id || x.id) === id; });
  if (!c) { showToast('⚠️ Không tìm thấy mã giảm giá'); return; }

  var modal = document.getElementById('couponEditModal');
  if (!modal) return;

  var idEl = document.getElementById('couponEditId');
  var codeEl = document.getElementById('couponEditCode');
  var valueEl = document.getElementById('couponEditValue');
  var minEl = document.getElementById('couponEditMinOrderValue');
  var maxEl = document.getElementById('couponEditMaxUsage');
  var expiresEl = document.getElementById('couponEditExpiresAt');

  if (idEl) idEl.value = c._id || c.id || '';
  if (codeEl) codeEl.value = c.code || '';
  if (valueEl) valueEl.value = Number(c.value) || 0;
  if (minEl) minEl.value = Number(c.min_order_value) || 0;
  if (maxEl) maxEl.value = Number(c.max_usage) || 0;
  if (expiresEl) expiresEl.value = adminCouponToInputDate(c.expires_at) || '';

  modal.style.display = 'flex';
  if (codeEl) codeEl.focus();
}

async function adminCouponSubmitEdit() {
  var id = (document.getElementById('couponEditId')?.value || '').trim();
  var code = (document.getElementById('couponEditCode')?.value || '').trim().toUpperCase();
  var value = Number(document.getElementById('couponEditValue')?.value || 0);
  var min_order_value = Number(document.getElementById('couponEditMinOrderValue')?.value || 0);
  var max_usage = Number(document.getElementById('couponEditMaxUsage')?.value || 0);
  var expiresDate = (document.getElementById('couponEditExpiresAt')?.value || '').trim();

  if (!id) { showToast('⚠️ Không tìm thấy coupon cần sửa'); return; }
  if (!code) { showToast('⚠️ Vui lòng nhập code'); return; }
  if (!isFinite(value) || value <= 0) { showToast('⚠️ Giá trị giảm không hợp lệ'); return; }
  if (!isFinite(min_order_value) || min_order_value < 0) { showToast('⚠️ Đơn tối thiểu không hợp lệ'); return; }
  if (!isFinite(max_usage) || max_usage <= 0) { showToast('⚠️ Tổng lượt sử dụng tối đa không hợp lệ'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresDate)) { showToast('⚠️ Vui lòng chọn hạn dùng'); return; }

  adminCouponSetEditLoading(true);
  try {
    var payload = {
      code: code,
      value: Math.round(value),
      min_order_value: Math.round(min_order_value),
      max_usage: Math.round(max_usage),
      expires_at: expiresDate + 'T00:00:00.000Z'
    };

    var res = await apiAdminUpdateCoupon(id, payload);
    if (res && res.ok) {
      showToast('✅ Đã cập nhật mã giảm giá');
      adminCouponHideEditModal();
      adminRenderCouponsTable();
      return;
    }
    var msg = adminCouponExtractErrorMessage(res, 'Không thể cập nhật mã giảm giá');
    showToast('❌ ' + msg);
  } catch (e) {
    showToast('❌ Không thể kết nối server');
  } finally {
    adminCouponSetEditLoading(false);
  }
}

async function adminRenderCouponsTable() {
  var tbody = document.getElementById('adminCouponsBody');
  var footer = document.getElementById('adminCouponsFooter');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:32px">Đang tải...</td></tr>';

  var coupons = [];
  var pagination = { total: 0, page: ADMIN_COUPON_PAGE, limit: ADMIN_COUPON_PER };
  try {
    var params = {
      page: ADMIN_COUPON_PAGE,
      limit: ADMIN_COUPON_PER
    };
    if (ADMIN_COUPON_KEYWORD) params.keyword = ADMIN_COUPON_KEYWORD;
    if (ADMIN_COUPON_IS_ACTIVE !== '') params.is_active = ADMIN_COUPON_IS_ACTIVE;

    var res = await apiAdminGetCoupons(params);
    coupons = adminExtractCoupons(res);
    pagination = adminExtractCouponPagination(res, coupons.length);
  } catch (e) {
    coupons = [];
  }

  ADMIN_COUPON_ROWS_CACHE = coupons;

  if (!coupons.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:32px">Chưa có mã giảm giá</td></tr>';
    if (footer) footer.innerHTML = '<span style="font-size:0.75rem;color:#aaa">Tổng 0 mã giảm giá</span>';
    return;
  }

  tbody.innerHTML = coupons.map(function (c) {
    var id = c._id || c.id || '';
    var used = Number(c.used_count) || 0;
    var max = Number(c.max_usage);
    var usageText = used + ' / ' + (isFinite(max) && max > 0 ? max : '∞');
    var code = adminCouponEscapeHtml(c.code || '—');
    var value = adminCouponFormatValue(c.value || 0);
    var condition = adminCouponFormatCondition(c.min_order_value);
    var expiry = adminCouponFormatDate(c.expires_at);
    var active = c.is_active !== false;

    return '<tr>' +
      '<td style="font-weight:700">' + code + '</td>' +
      '<td>' + value + '</td>' +
      '<td>' + condition + '</td>' +
      '<td>' + usageText + '</td>' +
      '<td>' + expiry + '</td>' +
      '<td><div style="display:flex;align-items:center;gap:8px">' +
      '<label class="afp-toggle" style="transform:scale(.88);transform-origin:left center">' +
      '<input type="checkbox" ' + (active ? 'checked' : '') + ' onchange="adminCouponToggle(\'' + id + '\', this)">' +
      '<span class="afp-toggle-slider"></span>' +
      '</label>' +
      '<span style="font-size:0.78rem;font-weight:600;color:' + (active ? '#2d8a4e' : '#888') + '">' + (active ? 'Đang hoạt động' : 'Ngừng hoạt động') + '</span>' +
      '</div></td>' +
      '<td><div style="display:flex;gap:6px">' +
      '<button class="admin-act-btn" data-id="' + id + '" onclick="adminCouponEdit(this.dataset.id)">Sửa</button>' +
      '</div></td>' +
      '</tr>';
  }).join('');

  var total = Math.max(coupons.length, Number(pagination.total) || 0);
  var limit = Number(pagination.limit) || ADMIN_COUPON_PER;
  var page = Number(pagination.page) || ADMIN_COUPON_PAGE;
  var totalPages = Math.max(1, Math.ceil(total / limit));
  ADMIN_COUPON_PAGE = Math.min(page, totalPages);

  var pages = '';
  var startPage = Math.max(1, ADMIN_COUPON_PAGE - 2);
  var endPage = Math.min(totalPages, startPage + 4);
  for (var p = startPage; p <= endPage; p++) {
    pages += '<button class="admin-page-btn' + (p === ADMIN_COUPON_PAGE ? ' active' : '') + '" onclick="adminCouponGoPage(' + p + ')">' + p + '</button>';
  }

  var from = total ? ((ADMIN_COUPON_PAGE - 1) * limit + 1) : 0;
  var to = Math.min(ADMIN_COUPON_PAGE * limit, total);
  if (footer) footer.innerHTML =
    '<span style="font-size:0.75rem;color:#aaa">Hiển thị ' + from + ' - ' + to + ' / ' + total + ' mã giảm giá</span>' +
    '<div class="admin-pagination">' +
    '<button class="admin-page-btn text" onclick="adminCouponGoPage(' + Math.max(1, ADMIN_COUPON_PAGE - 1) + ')">Trước</button>' +
    pages +
    '<button class="admin-page-btn text" onclick="adminCouponGoPage(' + Math.min(totalPages, ADMIN_COUPON_PAGE + 1) + ')">Sau</button>' +
    '</div>';
}

// Init coupons when tab opens
var _origSwitchTab = switchTab;
switchTab = function (name) {
  _origSwitchTab(name);
  if (name === 'coupons') adminRenderCouponsTable();
};

// ============================================================
// THỐNG KÊ
// ============================================================
function statsPeriod(btn, days) {
  document.querySelectorAll('.stats-period').forEach(function (b) { b.classList.remove('active'); });
  btn.classList.add('active');
  statsLoadData();
}

function statsLoadData() {
  // Đọc dữ liệu thật từ localStorage
  var db = [];
  try { db = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]'); } catch (e) { }

  var totalBookings = 0;
  var totalRevenue = 0;
  var tourBookings = {};

  db.forEach(function (u) {
    try {
      var bs = JSON.parse(localStorage.getItem('vt_bookings_' + u.email) || '[]');
      totalBookings += bs.length;
      bs.forEach(function (b) {
        // Parse số tiền
        var raw = (b.total || b.price || '0').replace(/[^\d]/g, '');
        totalRevenue += parseInt(raw) || 0;
        // Đếm theo tour
        var tname = b.tourName || b.tour || '—';
        tourBookings[tname] = (tourBookings[tname] || 0) + 1;
      });
    } catch (e) { }
  });

  // KPI
  var fmtMoney = function (n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M đ';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K đ';
    return n + 'đ';
  };
  var el = function (id) { return document.getElementById(id); };

  if (el('statRevenue')) el('statRevenue').textContent = totalRevenue ? fmtMoney(totalRevenue) : '0đ';
  if (el('statTotalBookings')) el('statTotalBookings').textContent = totalBookings || 0;
  if (el('statVisitors')) el('statVisitors').textContent = db.length || 0;

  // Rating
  if (el('statRating')) el('statRating').textContent = '— / 5.0';
  if (el('statsRatingBig')) el('statsRatingBig').textContent = '—';

  // Donut
  if (el('statsDonutVal')) el('statsDonutVal').textContent = totalBookings || 0;

  // Tour list
  var tourList = el('statsToursList');
  if (tourList) {
    var entries = Object.entries(tourBookings || {}).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
    if (!entries.length) {
      tourList.innerHTML = '<div class="stats-tours-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10z"/></svg><p>Chưa có dữ liệu đặt tour</p></div>';
    } else {
      tourList.innerHTML = entries.map(function (e) {
        var conv = totalBookings > 0 ? Math.round(e[1] / totalBookings * 100) : 0;
        return '<div class="stats-tour-row">' +
          '<div class="stats-tour-name-wrap"><div class="stats-tour-img"></div><span class="stats-tour-name">' + e[0] + '</span></div>' +
          '<div style="font-weight:700">' + e[1] + '</div>' +
          '<div style="color:#888">—</div>' +
          '<div><div class="stats-conv-bar"><div class="stats-conv-fill" style="width:' + conv + '%"></div></div>' + conv + '%</div>' +
          '</div>';
      }).join('');
    }
  }
}

// Gọi khi switch sang stats
var _origSwitch2 = switchTab;
switchTab = function (name) {
  _origSwitch2(name);
  if (name === 'stats') statsLoadData();
};


// Promo preview trong trang tours
function adminRenderPromoPreview() {
  var grid = document.getElementById('adminPromoPreview');
  if (!grid) return;
  var promos = [];
  try { promos = JSON.parse(localStorage.getItem('vt_admin_promos') || '[]'); } catch (e) { }
  var active = promos.filter(function (p) { return p.status === 'active'; }).slice(0, 2);
  var html = active.map(function (p) {
    var disc = p.type === 'percent' ? p.value + '%' : p.value.toLocaleString() + 'đ';
    return '<div class="admin-promo-card">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between">' +
      '<div class="promo-icon">' + (p.type === 'percent' ? '%' : '💰') + '</div>' +
      '<span class="admin-promo-running">ĐANG CHẠY</span>' +
      '</div>' +
      '<div class="admin-promo-name">' + p.name + '</div>' +
      '<div class="admin-promo-desc">Giảm ' + disc + ' · Hết hạn: ' + (p.end || '—') + '</div>' +
      '<div class="admin-promo-footer"><span>Hết hạn: ' + (p.end || '—') + '</span><button class="admin-promo-edit" onclick="switchTab(\"coupons\")">Chỉnh sửa</button></div>' +
      '</div>';
  }).join('');
  html += '<div class="admin-promo-card admin-promo-card-add" onclick="switchTab(\"coupons\")">' +
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
    '<strong>Thêm Ưu đãi Mới</strong>' +
    '<span>Tạo mã giảm giá hoặc chương trình quà tặng mới</span>' +
    '</div>';
  grid.innerHTML = html;
}

var DASH_PERIOD = 'today';
var DASH_TOP_LIMIT = 10;
var DASH_LOADING = false;

function dashNumber(v, fallback) {
  var n = Number(v);
  return isFinite(n) ? n : (fallback || 0);
}

function dashFormatMoney(v) {
  var n = dashNumber(v, 0);
  try {
    return n.toLocaleString('vi-VN') + 'đ';
  } catch (e) {
    return n + 'đ';
  }
}

function dashFormatPercent(v) {
  var n = dashNumber(v, 0);
  var sign = n > 0 ? '+' : '';
  return sign + n.toFixed(1) + '%';
}

function dashFormatShortDateLabel(label) {
  if (typeof label !== 'string') return label;
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(label);
  if (!m) return label;
  return parseInt(m[3], 10) + '/' + parseInt(m[2], 10);
}

function dashSetTrendBadge(elId, value) {
  var badge = document.getElementById(elId);
  if (!badge) return;
  var n = dashNumber(value, 0);
  badge.textContent = dashFormatPercent(n);
  badge.className = 'stats-kpi-change ' + (n > 0 ? 'up' : (n < 0 ? 'down' : 'neutral'));
}

function dashGetResult(res) {
  if (!res || !res.ok) return null;
  var d = res.data || {};
  return d.result !== undefined ? d.result : null;
}

function dashNormalizeTopTours(topToursResult) {
  if (!topToursResult || !Array.isArray(topToursResult.tours)) return [];
  return topToursResult.tours.slice(0, DASH_TOP_LIMIT).map(function (item, idx) {
    return {
      rank: idx + 1,
      name: item.name || item.tour_name || item.tour_id || ('Tour #' + (idx + 1)),
      bookings: dashNumber(item.booking_count, 0),
      revenue: dashNumber(item.revenue, 0)
    };
  });
}

function dashNormalizeRevenueSeries(revenueResult) {
  if (!revenueResult || !Array.isArray(revenueResult.chart_result)) return [];
  return revenueResult.chart_result.map(function (item, idx) {
    var label = item.date || item.period || ('Mốc ' + (idx + 1));
    if (typeof label === 'string' && label.length >= 10 && label.indexOf('-') > -1) {
      label = label.slice(5, 10);
    }
    return {
      label: label,
      revenue: dashNumber(item.revenue, 0)
    };
  });
}


function dashRenderBookingCancelChart(container, bookings, cancelled) {
  if (!container) return;
  var b = Math.max(0, dashNumber(bookings, 0));
  var c = Math.max(0, dashNumber(cancelled, 0));
  var maxV = Math.max(b, c, 1);
  var hb = Math.max(6, Math.round((b / maxV) * 180));
  var hc = Math.max(6, Math.round((c / maxV) * 180));

  container.innerHTML =
    '<div class="dash-bc-item">' +
    '<div class="dash-bc-track"><div class="dash-bc-fill booking" style="height:' + hb + 'px"></div></div>' +
    '<div class="dash-bc-label">Bookings</div>' +
    '<div class="dash-bc-value">' + b.toLocaleString('vi-VN') + '</div>' +
    '</div>' +
    '<div class="dash-bc-item">' +
    '<div class="dash-bc-track"><div class="dash-bc-fill cancel" style="height:' + hc + 'px"></div></div>' +
    '<div class="dash-bc-label">Đã huỷ</div>' +
    '<div class="dash-bc-value">' + c.toLocaleString('vi-VN') + '</div>' +
    '</div>';
}

function dashUpdatePeriodButtons() {
  document.querySelectorAll('#dashPeriodSwitch .stats-period').forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-period') === DASH_PERIOD);
  });
}

function dashSetPeriod(period, btn) {
  DASH_PERIOD = period;
  if (btn) {
    document.querySelectorAll('#dashPeriodSwitch .stats-period').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
  } else {
    dashUpdatePeriodButtons();
  }
  dashLoadDashboard();
}

function dashTodayDateLabel(chartLabels) {
  if (Array.isArray(chartLabels) && chartLabels.length) {
    var raw = chartLabels[chartLabels.length - 1];
    return dashFormatShortDateLabel(raw);
  }
  var now = new Date();
  return now.getDate() + '/' + (now.getMonth() + 1);
}

function dashRenderTodaySummary(overview, label) {
  var box = document.getElementById('dashTodaySummaryBody');
  var title = document.getElementById('dashTodayTitle');
  if (!box) return;

  var revenue = dashNumber(overview.total_revenue, 0);
  var bookings = dashNumber(overview.total_bookings, 0);
  var cancelled = dashNumber(overview.cancelled_bookings, 0);
  var cancelRate = dashNumber(overview.cancellation_rate, 0);
  var cmp = overview.comparison_with_previous || {};
  var revenueGrowth = dashNumber(cmp.revenue_growth, 0);
  var bookingsGrowth = dashNumber(cmp.bookings_growth, 0);
  var cancelGrowth = dashNumber(cmp.cancellation_rate_growth, 0);

  if (title) title.textContent = 'Hôm nay (' + label + ')';
  box.innerHTML =
    '<ul>' +
    '<li>Doanh thu: <b>' + dashFormatMoney(revenue) + '</b></li>' +
    '<li>Tổng booking: <b>' + bookings.toLocaleString('vi-VN') + '</b></li>' +
    '<li>Đã huỷ: <b>' + cancelled.toLocaleString('vi-VN') + ' (' + cancelRate.toLocaleString('vi-VN') + '%)</b></li>' +
    '<li>So với hôm qua - Doanh thu: <b>' + dashFormatPercent(revenueGrowth) + '</b></li>' +
    '<li>So với hôm qua - Booking: <b>' + dashFormatPercent(bookingsGrowth) + '</b></li>' +
    '<li>So với hôm qua - Đã huỷ: <b>' + dashFormatPercent(cancelGrowth) + '</b></li>' +
    '</ul>';
}

async function dashLoadDashboard() {
  var topBody = document.getElementById('dashTopToursBody');
  var revenueChartEl = document.getElementById('dashRevenueLineChart');
  var bookingCancelEl = document.getElementById('dashBookingCancelChart');
  var revenueChartCard = document.getElementById('dashRevenueChartCard');
  var bookingChartCard = document.getElementById('dashBookingChartCard');
  var todayCard = document.getElementById('dashTodayInsightsCard');
  var row2 = document.getElementById('dashRow2');
  if (!topBody || !revenueChartEl || !bookingCancelEl || !revenueChartCard || !bookingChartCard || !todayCard || !row2) return;

  dashUpdatePeriodButtons();

  if (DASH_LOADING) return;
  DASH_LOADING = true;

  var kpiPeriod = document.getElementById('dashKpiPeriod');
  var periodLabel = { today: 'Hôm nay', week: 'Tuần này', month: 'Tháng này', year: 'Năm nay' }[DASH_PERIOD] || 'Hôm nay';
  if (kpiPeriod) kpiPeriod.textContent = periodLabel;
  var isToday = DASH_PERIOD === 'today';

  var topMetaDescEl = document.getElementById('dashRevenueMeta');
  var revenueMetaEl = document.getElementById('dashRevenueChartMeta');
  var bookingCancelMetaEl = document.getElementById('dashBookingCancelMeta');
  if (isToday) {
    revenueChartCard.style.display = 'none';
    bookingChartCard.style.display = 'none';
    todayCard.style.display = 'block';
    row2.classList.add('single');
    if (revenueChart) { revenueChart.destroy(); revenueChart = null; }
    if (bookingChart) { bookingChart.destroy(); bookingChart = null; }
  } else {
    revenueChartCard.style.display = 'block';
    bookingChartCard.style.display = 'block';
    todayCard.style.display = 'none';
    row2.classList.remove('single');
  }

  if (topMetaDescEl) topMetaDescEl.textContent = 'Đang tải dữ liệu...';
  if (!isToday && revenueMetaEl) revenueMetaEl.textContent = 'Đang tải dữ liệu biểu đồ...';
  if (!isToday && bookingCancelMetaEl) bookingCancelMetaEl.textContent = 'Đang tải dữ liệu...';
  topBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:24px">Đang tải dữ liệu...</td></tr>';

  try {
    var topPeriod = DASH_PERIOD === 'today' ? 'week' : DASH_PERIOD;
    var responses = await Promise.all([
      apiGetStatsOverview(DASH_PERIOD),
      apiGetTopTours(topPeriod, DASH_TOP_LIMIT)
    ]);

    var overview = dashGetResult(responses[0]) || {};
    var topTours = dashNormalizeTopTours(dashGetResult(responses[1]));

    const chartRaw = overview.chart || {
      labels: [],
      revenues: [],
      bookings: [],
      cancelled: []
    };

    const chart = dashNormalizeChart(chartRaw);

    var totalRevenue = dashNumber(overview.total_revenue, 0);
    var totalBookings = dashNumber(overview.total_bookings, 0);
    var cancelledBookings = dashNumber(overview.cancelled_bookings, 0);
    var cancellationRate = dashNumber(overview.cancellation_rate, 0);
    var newUsers = dashNumber(overview.new_users, 0);
    var cmp = overview.comparison_with_previous || {};
    var bookingsGrowth = dashNumber(cmp.bookings_growth, 0);
    var usersGrowth = dashNumber(cmp.users_growth, 0);
    var cancellationRateGrowth = dashNumber(cmp.cancellation_rate_growth, 0);

    var el = function (id) { return document.getElementById(id); };
    if (el('dashKpiRevenue')) el('dashKpiRevenue').textContent = dashFormatMoney(totalRevenue);
    if (el('dashKpiBookings')) el('dashKpiBookings').textContent = totalBookings.toLocaleString('vi-VN');
    if (el('dashKpiUsers')) el('dashKpiUsers').textContent = newUsers.toLocaleString('vi-VN');
    if (el('dashKpiCancelRate')) {
      var cancelEl = el('dashKpiCancelRate');
      cancelEl.textContent = cancellationRate.toLocaleString('vi-VN') + '%';
      var cancelCard = cancelEl.closest('.stats-kpi-card');
      if (cancellationRate >= 30) {
        cancelEl.style.color = '#dc2626';
        if (cancelCard) cancelCard.style.boxShadow = '0 0 0 2px rgba(220,38,38,.2), 0 1px 8px rgba(0,0,0,.05)';
      } else if (cancellationRate < 10) {
        cancelEl.style.color = '#2d8a4e';
        if (cancelCard) cancelCard.style.boxShadow = '0 0 0 2px rgba(45,138,78,.18), 0 1px 8px rgba(0,0,0,.05)';
      } else {
        cancelEl.style.color = '#d97706';
        if (cancelCard) cancelCard.style.boxShadow = '0 0 0 2px rgba(217,119,6,.18), 0 1px 8px rgba(0,0,0,.05)';
      }
    }
    if (el('dashKpiCancelledBookings')) el('dashKpiCancelledBookings').textContent = cancelledBookings.toLocaleString('vi-VN');
    dashSetTrendBadge('dashKpiBookingsTrend', bookingsGrowth);
    dashSetTrendBadge('dashKpiUsersTrend', usersGrowth);
    dashSetTrendBadge('dashKpiCancelRateTrend', cancellationRateGrowth);

    if (isToday) {
      dashRenderTodaySummary(overview, dashTodayDateLabel(chart.labels));
    } else {
      renderRevenueChart(chart.labels, chart.revenues);
      renderBookingChart(chart.labels, chart.bookings, chart.cancelled);
      if (revenueMetaEl) revenueMetaEl.textContent = 'Chu kỳ biểu đồ: ' + periodLabel;
      if (bookingCancelMetaEl) {
        bookingCancelMetaEl.textContent = cancellationRate >= 30
          ? 'Cảnh báo: Tỷ lệ huỷ ' + cancellationRate.toLocaleString('vi-VN') + '%'
          : 'Tỷ lệ huỷ: ' + cancellationRate.toLocaleString('vi-VN') + '%';
      }
    }

    if (topMetaDescEl) {
      topMetaDescEl.textContent = DASH_PERIOD === 'today'
        ? 'Chu kỳ hiển thị KPI: ' + periodLabel + ' | Top tour: tuần này'
        : 'Chu kỳ hiển thị: ' + periodLabel;
    }

    if (!topTours.length) {
      topBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:24px">Chưa có dữ liệu đặt tour.</td></tr>';
    } else {
      topBody.innerHTML = topTours.map(function (t) {
        return '<tr>' +
          '<td style="color:#888;font-size:0.76rem">' + t.rank + '</td>' +
          '<td><div style="font-size:0.82rem;font-weight:700;color:#1a1a1a">' + t.name + '</div></td>' +
          '<td><span class="badge-published">' + t.bookings.toLocaleString('vi-VN') + '</span></td>' +
          '<td style="font-weight:700;color:#2d8a4e">' + dashFormatMoney(t.revenue) + '</td>' +
          '</tr>';
      }).join('');
    }

    var topMeta = document.getElementById('dashTopToursMeta');
    if (topMeta) topMeta.textContent = 'Top ' + DASH_TOP_LIMIT + ' - ' + (DASH_PERIOD === 'today' ? 'tuần này' : periodLabel.toLowerCase());
  } catch (e) {
    if (topMetaDescEl) topMetaDescEl.textContent = 'Không tải được dữ liệu từ API overview.';
    if (!isToday && revenueMetaEl) revenueMetaEl.textContent = 'Không tải được biểu đồ doanh thu.';
    if (!isToday && bookingCancelMetaEl) bookingCancelMetaEl.textContent = 'Không tải được dữ liệu booking/huỷ.';
    if (isToday) {
      dashRenderTodaySummary({
        total_revenue: 0,
        total_bookings: 0,
        cancelled_bookings: 0,
        cancellation_rate: 0,
        comparison_with_previous: { revenue_growth: 0, bookings_growth: 0, cancellation_rate_growth: 0 }
      }, dashTodayDateLabel([]));
    }
    topBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#c00;padding:24px">Không tải được dữ liệu top tour.</td></tr>';
  } finally {
    DASH_LOADING = false;
  }
}

function adminUpdateDashStats() {
  dashLoadDashboard();
}

// ============================================================
// CATEGORIES – Quản lý Danh mục
// ============================================================
var CAT_KEY = 'vt_admin_categories';
var CAT_PAGE = 1;
var CAT_API_CACHE = [];
var CAT_PER = 10;
var CAT_SAVING = false;
var CAT_TOGGLE_CONFIRM_RESOLVE = null;

var DEFAULT_CATS = [
  { id: 'c1', name: 'Du lịch biển', desc: 'Các tour tham quan, nghỉ dưỡng tại biển', active: true },
  { id: 'c2', name: 'Trekking & Núi', desc: 'Leo núi, trekking rừng và núi cao', active: true },
  { id: 'c3', name: 'Văn hóa & Lịch sử', desc: 'Khám phá di tích, văn hóa bản địa', active: true },
  { id: 'c4', name: 'Ẩm thực', desc: 'Tour trải nghiệm ẩm thực địa phương', active: true },
  { id: 'c5', name: 'Nghỉ dưỡng', desc: 'Resort, spa và thư giãn cao cấp', active: true },
];

function catGetAll() {
  try { var r = localStorage.getItem(CAT_KEY); return r ? JSON.parse(r) : DEFAULT_CATS; } catch (e) { return DEFAULT_CATS; }
}
function catSaveAll(cats) { localStorage.setItem(CAT_KEY, JSON.stringify(cats)); }

// Show/hide form
function catShowForm(id) {
  var card = document.getElementById('catFormCard');
  card.style.display = 'flex';
  document.getElementById('catEditId').value = id || '';
  document.getElementById('catFormTitle').textContent = id ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới';
  var fileInput = document.getElementById('catThumbnail');
  if (fileInput) fileInput.value = '';
  if (id) {
    var cat = CAT_API_CACHE.find(function (c) { return (c._id || c.id) === id; })
      || catGetAll().find(function (c) { return c.id === id; });
    if (cat) {
      document.getElementById('catName').value = cat.name || '';
      document.getElementById('catDesc').value = cat.description || cat.desc || '';
    }
  } else {
    document.getElementById('catName').value = '';
    document.getElementById('catDesc').value = '';
  }
}
function catSetSaving(isSaving, phaseText) {
  CAT_SAVING = !!isSaving;
  var card = document.getElementById('catFormCard');
  if (!card) return;

  card.querySelectorAll('input, textarea, button').forEach(function (el) {
    el.disabled = CAT_SAVING;
  });

  var saveBtn = document.getElementById('catSaveBtn');
  if (saveBtn) {
    if (!saveBtn.dataset.defaultText) saveBtn.dataset.defaultText = saveBtn.textContent;
    saveBtn.textContent = CAT_SAVING ? 'Đang lưu...' : saveBtn.dataset.defaultText;
  }

  var loading = document.getElementById('catSaveLoading');
  if (loading) {
    loading.style.display = CAT_SAVING ? 'block' : 'none';
    if (phaseText) loading.textContent = phaseText;
  }
}

function catHideForm(force) {
  if (CAT_SAVING && !force) return;
  document.getElementById('catFormCard').style.display = 'none';
}

function catToggleConfirmOpen(text, title) {
  var modal = document.getElementById('catToggleConfirmModal');
  var textEl = document.getElementById('catToggleConfirmText');
  var titleEl = document.getElementById('catToggleConfirmTitle');
  if (!modal) return Promise.resolve(false);
  if (titleEl) titleEl.textContent = title || 'Xác nhận thao tác';
  if (textEl) textEl.textContent = text || 'Bạn có chắc muốn thay đổi trạng thái danh mục này?';
  modal.style.display = 'flex';
  return new Promise(function (resolve) {
    CAT_TOGGLE_CONFIRM_RESOLVE = resolve;
  });
}

function catToggleConfirmClose(accepted) {
  var modal = document.getElementById('catToggleConfirmModal');
  if (modal) modal.style.display = 'none';
  if (CAT_TOGGLE_CONFIRM_RESOLVE) {
    var resolve = CAT_TOGGLE_CONFIRM_RESOLVE;
    CAT_TOGGLE_CONFIRM_RESOLVE = null;
    resolve(!!accepted);
  }
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    var couponConfirmModal = document.getElementById('couponConfirmModal');
    if (couponConfirmModal && couponConfirmModal.style.display !== 'none') {
      adminCouponConfirmClose(false);
      return;
    }
    var couponModal = document.getElementById('couponCreateModal');
    if (couponModal && couponModal.style.display !== 'none') {
      adminCouponHideCreateModal();
      return;
    }
    var couponEditModal = document.getElementById('couponEditModal');
    if (couponEditModal && couponEditModal.style.display !== 'none') {
      adminCouponHideEditModal();
      return;
    }
    var toggleModal = document.getElementById('catToggleConfirmModal');
    if (toggleModal && toggleModal.style.display !== 'none') {
      catToggleConfirmClose(false);
      return;
    }
    var card = document.getElementById('catFormCard');
    if (card && card.style.display !== 'none') catHideForm();
  }
});

// Save – POST /api/categories hoặc PUT /api/categories/:id
async function catSave() {
  if (CAT_SAVING) return;
  var name = (document.getElementById('catName').value || '').trim();
  var desc = (document.getElementById('catDesc').value || '').trim();
  var id = document.getElementById('catEditId').value;
  var file = document.getElementById('catThumbnail').files[0];

  if (!name) { showToast('⚠️ Vui lòng nhập tên danh mục'); return; }

  catSetSaving(true, '⏳ Đang lưu thông tin danh mục...');

  // Update text bằng JSON, ảnh gọi route riêng /categories/:id/image
  try {
    var payload = { name: name };
    if (desc) payload.description = desc;

    var res;
    if (id) {
      res = await apiAdminUpdateCategory(id, payload);
      if (res && res.ok && file) {
        catSetSaving(true, '⏳ Đang tải ảnh thumbnail...');
        var imageRes = await apiAdminUpdateCategoryImage(id, file);
        if (!imageRes || !imageRes.ok) {
          var imageMsg = (imageRes && imageRes.data && (imageRes.data.message || imageRes.data.error))
            ? (imageRes.data.message || imageRes.data.error)
            : 'Cập nhật ảnh danh mục thất bại';
          showToast('❌ ' + imageMsg);
          return;
        }
      }
    } else {
      res = await apiAdminCreateCategory(payload);
      if (res && res.ok && file) {
        catSetSaving(true, '⏳ Đang tải ảnh thumbnail...');
        var created = (res.data && res.data.result) ? res.data.result : {};
        var createdCat = created.category || created;
        var createdId = createdCat._id || createdCat.id;
        if (createdId) {
          var createdImageRes = await apiAdminUpdateCategoryImage(createdId, file);
          if (!createdImageRes || !createdImageRes.ok) {
            var createdImageMsg = (createdImageRes && createdImageRes.data && (createdImageRes.data.message || createdImageRes.data.error))
              ? (createdImageRes.data.message || createdImageRes.data.error)
              : 'Cập nhật ảnh danh mục thất bại';
            showToast('❌ ' + createdImageMsg);
            return;
          }
        }
      }
    }
    if (res && res.ok) {
      showToast('✅ Đã lưu danh mục!');
      catHideForm(true);
      catRender();
      return;
    }

    var msg = (res && res.data && (res.data.message || res.data.error))
      ? (res.data.message || res.data.error)
      : 'Lưu danh mục thất bại';
    showToast('❌ ' + msg);
    return;
  } catch (e) {
    showToast('❌ Không thể kết nối server');
    return;
  } finally {
    catSetSaving(false);
  }
}

// Delete – DELETE /api/categories/:id
async function catDelete(id) {
  var apiCat = CAT_API_CACHE.find(function (c) { return (c._id || c.id) === id; });
  var localCat = catGetAll().find(function (c) { return (c._id || c.id) === id || c.id === id; });
  var cat = apiCat || localCat;

  var confirmed = await catToggleConfirmOpen(
    'Bạn có chắc muốn xóa danh mục "' + (cat ? (cat.name || id) : id) + '"? Hành động này không thể hoàn tác.',
    'Xác nhận xóa danh mục'
  );
  if (!confirmed) return;

  try {
    var res = await apiAdminDeleteCategory(id);
    if (res && res.ok) { showToast('Đã xóa danh mục'); catRender(); return; }
    var errMsg = (res && res.data && (res.data.message || res.data.error)) ? (res.data.message || res.data.error) : '';
    if (res && res.status === 400 && errMsg === 'Category has tours, cannot be deleted') {
      showToast('❌ Không thể xóa danh mục đang có tour hoạt động');
      return;
    }
    showToast('❌ ' + (errMsg || 'Không thể xóa danh mục'));
    return;
  } catch (e) {
    showToast('❌ Không thể kết nối server');
    return;
  }
}

// Toggle active
async function catToggle(id, inputEl) {
  var cats = catGetAll();
  var apiCat = CAT_API_CACHE.find(function (c) { return (c._id || c.id) === id; });
  var localIdx = cats.findIndex(function (c) { return (c._id || c.id) === id || c.id === id; });

  var currentActive = false;
  if (apiCat) {
    currentActive = typeof apiCat.is_active === 'boolean' ? apiCat.is_active : (apiCat.active !== false);
  } else if (localIdx >= 0) {
    var localCat = cats[localIdx];
    currentActive = typeof localCat.is_active === 'boolean' ? localCat.is_active : (localCat.active !== false);
  }

  var nextActive = !currentActive;

  var confirmText = nextActive
    ? 'Bạn có chắc muốn BẬT trạng thái danh mục này?'
    : 'Bạn có chắc muốn TẮT trạng thái danh mục này?';
  var confirmed = await catToggleConfirmOpen(confirmText, 'Xác nhận thay đổi trạng thái');
  if (!confirmed) {
    if (inputEl) inputEl.checked = currentActive;
    return;
  }

  try {
    var res = await apiAdminToggleCategory(id, nextActive);
    if (res && res.ok) {
      catRender();
      return;
    }

    if (inputEl) inputEl.checked = currentActive;
    var errMsg = (res && res.data && (res.data.message || res.data.error)) ? (res.data.message || res.data.error) : '';
    if (res && res.status === 400 && errMsg === 'Category has active tours, cannot be disabled') {
      showToast('❌ Không thể ẩn danh mục đang có tour hoạt động');
    } else {
      showToast('❌ ' + (errMsg || 'Không thể cập nhật trạng thái danh mục'));
    }
    return;
  } catch (e) { }

  if (inputEl) inputEl.checked = currentActive;
  showToast('❌ Không thể cập nhật trạng thái danh mục');
}

// Render
async function catRender() {
  var tbody = document.getElementById('catTableBody');
  var footer = document.getElementById('catTableFooter');
  if (!tbody) return;

  var cats = [];

  // Thử API
  try {
    var res = await apiAdminGetCategories();
    if (res && res.ok && res.data.result) {
      cats = res.data.result.categories || res.data.result || [];
      CAT_API_CACHE = cats;
    }
  } catch (e) { }

  // Fallback local
  if (!cats.length) cats = catGetAll();

  var q = (document.getElementById('catSearch')?.value || '').toLowerCase();
  if (q) cats = cats.filter(function (c) { return c.name.toLowerCase().includes(q); });

  var total = cats.length;
  var start = (CAT_PAGE - 1) * CAT_PER;
  var paged = cats.slice(start, start + CAT_PER);

  if (!paged.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:32px">Chưa có danh mục nào</td></tr>';
    if (footer) footer.innerHTML = '';
    return;
  }

  tbody.innerHTML = paged.map(function (c, i) {
    var id = c._id || c.id;
    var thumb = c.thumbnail || '../images/vietnam.png';
    var active = typeof c.is_active === 'boolean'
      ? c.is_active
      : (c.active !== false);
    return '<tr>' +
      '<td style="color:#aaa;font-size:0.75rem">' + (start + i + 1) + '</td>' +
      '<td><strong style="font-size:0.83rem">' + (c.name || '—') + '</strong></td>' +
      '<td><img src="' + thumb + '" alt="thumbnail" style="width:72px;height:48px;object-fit:cover;border-radius:8px;border:1px solid #eee" onerror="this.onerror=null;this.src=\'../images/vietnam.png\'" /></td>' +
      '<td style="font-size:0.78rem;color:#888;max-width:280px">' + (c.description || c.desc || '—') + '</td>' +
      '<td><div style="display:flex;align-items:center;gap:8px">' +
      '<label class="afp-toggle" style="transform:scale(.88);transform-origin:left center">' +
      '<input type="checkbox" ' + (active ? 'checked' : '') + ' onchange="catToggle(\'' + id + '\', this)">' +
      '<span class="afp-toggle-slider"></span>' +
      '</label>' +
      '<span style="font-size:0.78rem;font-weight:600;color:' + (active ? '#2d8a4e' : '#888') + '">' + (active ? 'Đang hoạt động' : 'Ngừng hoạt động') + '</span>' +
      '</div></td>' +
      '<td><div style="display:flex;gap:6px">' +
      '<button class="admin-act-btn" data-id="' + id + '" onclick="catShowForm(this.dataset.id)">Sửa</button>' +
      '<button class="admin-act-btn admin-act-btn-red" data-id="' + id + '" onclick="catDelete(this.dataset.id)">Xóa</button>' +
      '</div></td>' +
      '</tr>';
  }).join('');

  // Footer
  var totalPages = Math.max(1, Math.ceil(total / CAT_PER));
  var pages = '';
  for (var p = 1; p <= totalPages; p++) {
    pages += '<button class="admin-page-btn' + (p === CAT_PAGE ? ' active' : '') + '" onclick="CAT_PAGE=' + p + ';catRender()">' + p + '</button>';
  }
  if (footer) footer.innerHTML =
    '<span style="font-size:0.75rem;color:#aaa">Tổng ' + total + ' danh mục</span>' +
    '<div class="admin-pagination">' +
    '<button class="admin-page-btn text" onclick="if(CAT_PAGE>1){CAT_PAGE--;catRender()}">Trước</button>' +
    pages +
    '<button class="admin-page-btn text" onclick="if(CAT_PAGE<' + totalPages + '){CAT_PAGE++;catRender()}">Sau</button>' +
    '</div>';
}

// Load khi switch tab
var _origSwitchTab3 = switchTab;
switchTab = function (name) {
  _origSwitchTab3(name);
  if (name === 'categories') catRender();
};

// ============================================================
// BOOKINGS MANAGEMENT (Admin)
// ============================================================
var ADMIN_BK_PAGE = 1;
var ADMIN_BK_PER = 15;

async function adminBkRender() {
  var tbody = document.getElementById('adminBkBody');
  var footer = document.getElementById('adminBkFooter');
  if (!tbody) return;

  var search = (document.getElementById('adminBkSearch')?.value || '').trim();
  var status = document.getElementById('adminBkStatus')?.value || '';

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:32px">Đang tải...</td></tr>';

  var bookings = [];

  // Thử API GET /api/bookings
  try {
    var params = { page: ADMIN_BK_PAGE, limit: ADMIN_BK_PER };
    if (search) params.keyword = search;
    if (status) params.status = parseInt(status);
    var res = await apiAdminGetBookings(params);
    if (res && res.ok && res.data.result) {
      bookings = res.data.result.bookings || res.data.result || [];
      var pag = res.data.result.pagination;
      if (pag && footer) adminBkPagination(pag.total, footer);
    }
  } catch (e) { }

  // Fallback localStorage
  if (!bookings.length) {
    var db = [];
    try { db = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]'); } catch (e) { }
    db.forEach(function (u) {
      try {
        var bks = JSON.parse(localStorage.getItem('vt_bookings_' + u.email) || '[]');
        bks.forEach(function (b) { bookings.push({ ...b, _user: u.name || u.email }); });
      } catch (e) { }
    });

    // Filter
    if (search) {
      var q = search.toLowerCase();
      bookings = bookings.filter(function (b) {
        return (b.code || '').toLowerCase().includes(q) ||
          (b._user || '').toLowerCase().includes(q) ||
          (b.tourName || b.tour || '').toLowerCase().includes(q);
      });
    }
    if (status) {
      var stMap = { '0': 'upcoming', '1': 'confirmed', '2': 'done', '3': 'cancelled' };
      var stVal = stMap[status];
      bookings = bookings.filter(function (b) { return (b.status || 'upcoming') === stVal; });
    }

    var total = bookings.length;
    var start = (ADMIN_BK_PAGE - 1) * ADMIN_BK_PER;
    bookings = bookings.slice(start, start + ADMIN_BK_PER);
    if (footer) adminBkPagination(total, footer);
  }

  if (!bookings.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:40px">Chưa có đơn hàng nào</td></tr>';
    return;
  }

  var statusMap = {
    0: '<span class="nv-badge nv-badge-pending">CHỜ THANH TOÁN</span>',
    1: '<span class="nv-badge nv-badge-processing">ĐÃ XÁC NHẬN</span>',
    2: '<span class="nv-badge nv-badge-done">HOÀN THÀNH</span>',
    3: '<span class="nv-badge nv-badge-urgent">ĐÃ HỦY</span>',
    upcoming: '<span class="nv-badge nv-badge-pending">SẮP DIỄN RA</span>',
    confirmed: '<span class="nv-badge nv-badge-processing">ĐÃ XÁC NHẬN</span>',
    done: '<span class="nv-badge nv-badge-done">HOÀN THÀNH</span>',
    completed: '<span class="nv-badge nv-badge-done">HOÀN THÀNH</span>',
    cancelled: '<span class="nv-badge nv-badge-urgent">ĐÃ HỦY</span>',
  };

  tbody.innerHTML = bookings.map(function (b) {
    var id = b._id || b.code || '—';
    var code = b.booking_code || b.code || '—';
    var user = b._user || (b.contact_info && b.contact_info.full_name) || '—';
    var tour = b.tourName || b.tour || (b.schedule && b.schedule.tour && b.schedule.tour.name) || '—';
    var date = b.date || (b.schedule && b.schedule.departure_date ? b.schedule.departure_date.slice(0, 10) : '') || '—';
    var total = b.total || b.price || (b.total_amount ? b.total_amount.toLocaleString('vi-VN') + 'đ' : '—');
    var stRaw = b.status;
    var badge = statusMap[stRaw] || statusMap['upcoming'];
    var canConfirm = stRaw === 0 || stRaw === 'upcoming';
    var canComplete = stRaw === 1 || stRaw === 'confirmed';
    var canCancel = stRaw !== 3 && stRaw !== 'cancelled' && stRaw !== 2 && stRaw !== 'completed';

    var actions = '<div style="display:flex;gap:5px;flex-wrap:wrap">';
    if (canConfirm) actions += '<button class="admin-act-btn admin-act-btn-green" data-id="' + id + '" data-status="1" onclick="adminBkUpdateStatus(this)">✓ Xác nhận</button>';
    if (canComplete) actions += '<button class="admin-act-btn" data-id="' + id + '" data-status="2" onclick="adminBkUpdateStatus(this)">✅ Hoàn thành</button>';
    if (canCancel) actions += '<button class="admin-act-btn admin-act-btn-red" data-id="' + id + '" data-status="3" onclick="adminBkCancel(this)">✕ Hủy</button>';
    actions += '</div>';

    return '<tr>' +
      '<td style="font-weight:700;color:#2d8a4e;font-size:0.8rem">' + code + '</td>' +
      '<td style="font-size:0.8rem;font-weight:600">' + user + '</td>' +
      '<td style="font-size:0.78rem;color:#555;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + tour + '</td>' +
      '<td style="font-size:0.78rem;color:#888;white-space:nowrap">' + date + '</td>' +
      '<td style="font-weight:700;color:#2d8a4e;font-size:0.8rem;white-space:nowrap">' + total + '</td>' +
      '<td>' + badge + '</td>' +
      '<td>' + actions + '</td>' +
      '</tr>';
  }).join('');
}

function adminBkPagination(total, footer) {
  var totalPages = Math.max(1, Math.ceil(total / ADMIN_BK_PER));
  var pages = '';
  for (var p = 1; p <= Math.min(totalPages, 5); p++) {
    pages += '<button class="admin-page-btn' + (p === ADMIN_BK_PAGE ? ' active' : '') + '" onclick="ADMIN_BK_PAGE=' + p + ';adminBkRender()">' + p + '</button>';
  }
  footer.innerHTML =
    '<span style="font-size:0.75rem;color:#aaa">Tổng ' + total + ' đơn hàng</span>' +
    '<div class="admin-pagination">' +
    '<button class="admin-page-btn text" onclick="if(ADMIN_BK_PAGE>1){ADMIN_BK_PAGE--;adminBkRender()}">Trước</button>' +
    pages +
    '<button class="admin-page-btn text" onclick="if(ADMIN_BK_PAGE<' + totalPages + '){ADMIN_BK_PAGE++;adminBkRender()}">Sau</button>' +
    '</div>';
}

// PATCH /api/bookings/:id/status
async function adminBkUpdateStatus(btn) {
  var id = btn.dataset.id;
  var status = parseInt(btn.dataset.status);
  var labels = { 1: 'xác nhận', 2: 'hoàn thành' };
  if (!confirm('Xác nhận ' + (labels[status] || 'cập nhật') + ' đơn hàng này?')) return;
  btn.disabled = true; btn.textContent = '...';

  try {
    var res = await apiAdminUpdateBooking(id, status);
    if (res && res.ok) { showToast('✅ Đã cập nhật trạng thái đơn hàng'); adminBkRender(); return; }
  } catch (e) { }

  // Fallback local
  adminBkUpdateLocal(id, status);
  showToast('✅ Đã cập nhật trạng thái');
  adminBkRender();
}

async function adminBkCancel(btn) {
  var id = btn.dataset.id;
  var reason = prompt('Lý do hủy (bắt buộc):');
  if (!reason) { showToast('⚠️ Vui lòng nhập lý do hủy'); return; }
  btn.disabled = true; btn.textContent = '...';

  try {
    var res = await apiAdminUpdateBooking(id, 3, reason);
    if (res && res.ok) { showToast('✅ Đã hủy đơn hàng'); adminBkRender(); return; }
  } catch (e) { }

  adminBkUpdateLocal(id, 3);
  showToast('✅ Đã hủy đơn hàng');
  adminBkRender();
}

function adminBkUpdateLocal(idOrCode, status) {
  var stStr = { 0: 'upcoming', 1: 'confirmed', 2: 'completed', 3: 'cancelled' }[status] || 'upcoming';
  var db = [];
  try { db = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]'); } catch (e) { }
  db.forEach(function (u) {
    var key = 'vt_bookings_' + u.email;
    try {
      var bks = JSON.parse(localStorage.getItem(key) || '[]');
      var changed = false;
      bks.forEach(function (b) {
        if (b._id === idOrCode || b.code === idOrCode) { b.status = stStr; changed = true; }
      });
      if (changed) localStorage.setItem(key, JSON.stringify(bks));
    } catch (e) { }
  });
}

// Gọi khi switch tab
var _origSwitchTab4 = switchTab;
switchTab = function (name) {
  _origSwitchTab4(name);
  if (name === 'bookings') adminBkRender();
};


// ============================================================
// DELETE TOUR – DELETE /api/tours/:id
// ============================================================
async function adminDeleteTour(btn) {
  var id = btn.dataset.id;
  var idx = parseInt(btn.dataset.idx);
  var tours = adminGetTours();
  var tour = tours[idx];
  var name = tour ? (tour.name || 'tour này') : 'tour này';

  if (!confirm('Xóa tour "' + name + '"?\nKhông thể xóa nếu còn booking liên quan.')) return;

  btn.disabled = true; btn.textContent = '...';

  // Gọi API DELETE /api/tours/:id
  try {
    var res = await apiDeleteTour(id);
    if (res && res.ok) {
      showToast('Đã xóa tour: ' + name);
      adminRenderTours();
      return;
    }
    if (res && res.status === 400) {
      showToast('❌ ' + (res.data?.message || 'Không thể xóa: còn booking liên quan'));
      btn.disabled = false; btn.textContent = '🗑️ Xóa';
      return;
    }
  } catch (e) { }

  // Fallback: xóa khỏi localStorage
  var updated = tours.filter(function (t, i) { return i !== idx; });
  adminSaveTours(updated);
  showToast('Đã xóa tour: ' + name);
  adminRenderTours();
}

// ============================================================
// THỐNG KÊ – Kết nối API thật
// ============================================================
var STATS_PERIOD = 'month';

async function adminLoadStats(period) {
  STATS_PERIOD = period || 'month';

  // Map period button value sang API param
  var periodMap = { '30': 'month', '90': 'month', '365': 'year', 'today': 'today', 'week': 'week', 'month': 'month', 'year': 'year' };
  var apiPeriod = periodMap[period] || 'month';

  await Promise.all([
    adminLoadStatsOverview(apiPeriod),
    adminLoadStatsRevenue(apiPeriod),
    adminLoadTopTours(apiPeriod),
  ]);
}

// GET /api/admin/stats/overview
async function adminLoadStatsOverview(period) {
  try {
    var res = await apiGetStatsOverview(period);
    if (res && res.ok && res.data.result) {
      var r = res.data.result;

      // Doanh thu
      var rev = r.total_revenue || 0;
      var el = document.getElementById('statRevenue');
      if (el) el.textContent = rev.toLocaleString('vi-VN') + 'đ';

      // Đơn hàng
      var bk = document.getElementById('statTotalBookings');
      if (bk) bk.textContent = (r.total_bookings || 0).toLocaleString('vi-VN');

      // Khách mới → hiện vào statVisitors
      var vis = document.getElementById('statVisitors');
      if (vis) vis.textContent = (r.new_users || 0).toLocaleString('vi-VN');

      // So sánh kỳ trước
      if (r.comparison_with_previous) {
        var cmp = r.comparison_with_previous;
        adminSetChange('statRevenue', cmp.revenue_change);
        adminSetChange('statTotalBookings', cmp.bookings_change);
        adminSetChange('statVisitors', cmp.users_change);
      }

      // Donut chart tổng đặt tour
      var donut = document.getElementById('statsDonutVal');
      if (donut) donut.textContent = (r.total_bookings || 0).toLocaleString('vi-VN');

      return;
    }
  } catch (e) { }

  // Fallback: tính từ localStorage
  adminLoadStatsFallback();
}

function adminSetChange(kpiId, pct) {
  var card = document.getElementById(kpiId)?.closest('.stats-kpi-card');
  if (!card) return;
  var badge = card.querySelector('.stats-kpi-change');
  if (!badge) return;
  if (pct === undefined || pct === null) { badge.textContent = '—'; badge.className = 'stats-kpi-change neutral'; return; }
  var sign = pct >= 0 ? '+' : '';
  badge.textContent = sign + Math.round(pct) + '%';
  badge.className = 'stats-kpi-change ' + (pct >= 0 ? 'up' : 'down');
}

// GET /api/admin/stats/revenue
async function adminLoadStatsRevenue(period) {
  try {
    var res = await apiGetStatsRevenue(period, new Date().getFullYear());
    if (res && res.ok && res.data.result && res.data.result.chart_result) {
      adminDrawRevenueChart(res.data.result.chart_result);
      return;
    }
  } catch (e) { }

  // Fallback: tính từ localStorage bookings
  var allBks = adminGetAllBookingsLocal();
  if (allBks.length) adminDrawRevenueChartLocal(allBks);
}

function adminDrawRevenueChart(data) {
  var card = document.querySelector('.stats-chart-card');
  if (!card) return;

  var maxRev = Math.max(...data.map(function (d) { return d.revenue || 0; }), 1);

  var barsHtml = data.map(function (d) {
    var h = Math.round((d.revenue / maxRev) * 100);
    return '<div class="stats-bar-wrap">' +
      '<div class="stats-bar-tooltip">' + (d.revenue || 0).toLocaleString('vi-VN') + 'đ<br>' + (d.bookings || 0) + ' đơn</div>' +
      '<div class="stats-bar" style="height:' + Math.max(h, 2) + '%"></div>' +
      '<div class="stats-bar-label">' + (d.date || '').slice(5) + '</div>' +
      '</div>';
  }).join('');

  card.innerHTML = '<div class="stats-chart-header"><span class="stats-card-title">Tăng trưởng doanh thu</span></div>' +
    '<div class="stats-bar-chart">' + barsHtml + '</div>';
}

function adminDrawRevenueChartLocal(bookings) {
  // Nhóm theo tháng
  var byMonth = {};
  bookings.forEach(function (b) {
    if (b.status === 'cancelled' || b.status === 3) return; // bỏ qua đã hủy
    var d = (b.createdAt || b.date || '').slice(0, 7);
    if (!d) return;
    if (!byMonth[d]) byMonth[d] = { date: d, revenue: 0, bookings: 0 };
    var price = parseInt(String(b.total || b.price || '0').replace(/[^0-9]/g, '')) || 0;
    byMonth[d].revenue += price;
    byMonth[d].bookings += 1;
  });
  var data = Object.values(byMonth || {}).sort(function (a, b) { return a.date.localeCompare(b.date); }).slice(-12);
  if (data.length) adminDrawRevenueChart(data);
}

// GET /api/admin/stats/top-tours
async function adminLoadTopTours(period) {
  var listEl = document.getElementById('statsToursList');
  if (!listEl) return;

  var tours = [];
  try {
    var res = await apiGetTopTours(period, 10);
    if (res && res.ok && res.data.result && res.data.result.tours) {
      tours = res.data.result.tours;
    }
  } catch (e) { }

  // Fallback từ localStorage
  if (!tours.length) {
    var allBks = adminGetAllBookingsLocal();
    var tourMap = {};
    allBks.forEach(function (b) {
      if (b.status === 'cancelled' || b.status === 3) return; // bỏ qua đã hủy
      var name = b.tourName || b.tour || '—';
      if (!tourMap[name]) tourMap[name] = { name: name, booking_count: 0, revenue: 0 };
      tourMap[name].booking_count++;
      tourMap[name].revenue += parseInt(String(b.total || b.price || '0').replace(/[^0-9]/g, '')) || 0;
    });
    tours = Object.values(tourMap || {}).sort(function (a, b) { return b.booking_count - a.booking_count; }).slice(0, 10);
  }

  if (!tours.length) {
    listEl.innerHTML = '<div class="stats-tours-empty"><p>Chưa có dữ liệu</p></div>';
    return;
  }

  var maxBookings = Math.max(...tours.map(function (t) { return t.booking_count || 0; }), 1);
  listEl.innerHTML = tours.map(function (t, i) {
    var pct = Math.round(((t.booking_count || 0) / maxBookings) * 100);
    return '<div class="stats-tour-row">' +
      '<div class="stats-tour-rank">' + (i + 1) + '</div>' +
      '<div class="stats-tour-name">' +
      '<div style="font-weight:600;font-size:0.8rem;color:#1a1a1a;margin-bottom:3px">' + (t.name || t.tour_id || '—') + '</div>' +
      '<div class="stats-rb-track"><div class="stats-rb-fill" style="width:' + pct + '%;background:#2d8a4e"></div></div>' +
      '</div>' +
      '<div class="stats-tour-stat">' + (t.booking_count || 0) + '</div>' +
      '<div class="stats-tour-stat" style="color:#2d8a4e">' + (t.revenue || 0).toLocaleString('vi-VN') + 'đ</div>' +
      '<div class="stats-tour-stat">' + pct + '%</div>' +
      '</div>';
  }).join('');
}

// Lấy tất cả bookings từ localStorage (fallback)
function adminGetAllBookingsLocal() {
  var all = [];
  try {
    var db = JSON.parse(localStorage.getItem('vt_userdb') || '[]');
    db.forEach(function (u) {
      try {
        var bks = JSON.parse(localStorage.getItem('vt_bookings_' + u.email) || '[]');
        all = all.concat(bks);
      } catch (e) { }
    });
  } catch (e) { }
  return all;
}

// Fallback stats từ localStorage
function adminLoadStatsFallback() {
  var all = adminGetAllBookingsLocal();
  // Chỉ tính booking chưa hủy
  var active = all.filter(function (b) { return b.status !== 'cancelled' && b.status !== 3; });
  var revenue = 0;
  active.forEach(function (b) {
    revenue += parseInt(String(b.total || b.price || '0').replace(/[^0-9]/g, '')) || 0;
  });
  var revEl = document.getElementById('statRevenue');
  var bkEl = document.getElementById('statTotalBookings');
  var donut = document.getElementById('statsDonutVal');
  if (revEl) revEl.textContent = revenue.toLocaleString('vi-VN') + 'đ';
  if (bkEl) bkEl.textContent = active.length.toLocaleString('vi-VN');
  if (donut) donut.textContent = active.length;
}

// Period buttons
function statsPeriod(btn, val) {
  document.querySelectorAll('.stats-period').forEach(function (b) { b.classList.remove('active'); });
  btn.classList.add('active');
  var periodMap = { '30': 'month', '90': 'month', '365': 'year' };
  adminLoadStats(periodMap[val] || val);
}

// Override switchTab để load stats khi mở tab
var _origSwitchTabStats = switchTab;
switchTab = function (name, btn) {
  _origSwitchTabStats(name, btn);
  if (name === 'stats') adminLoadStats('month');
};

function dashNormalizeChart(chart) {
  let { labels, revenues, bookings, cancelled } = chart;

  if (labels.length === 1) {
    const d = new Date(labels[0]);
    const prev = new Date(d);
    prev.setDate(d.getDate() - 1);

    const prevLabel = prev.toISOString().slice(0, 10);

    labels = [prevLabel, ...labels];
    revenues = [0, ...revenues];
    bookings = [0, ...bookings];
    cancelled = [0, ...cancelled];
  }

  return { labels, revenues, bookings, cancelled };
}
let revenueChart;

function renderRevenueChart(labels, data) {
  const ctx = document.getElementById('dashRevenueLineChart');
  if (!ctx) return;
  const displayLabels = (labels || []).map(dashFormatShortDateLabel);

  if (revenueChart) revenueChart.destroy();

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: displayLabels,
      datasets: [{
        label: 'Doanh thu',
        data,
        tension: 0.4,
        borderWidth: 3,
        borderColor: '#2d8a4e',
        pointBackgroundColor: '#2d8a4e',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        backgroundColor: 'rgba(45, 138, 78, 0.12)'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return ctx.raw.toLocaleString('vi-VN') + 'đ';
            }
          }
        }
      }
    }
  });
}

let bookingChart;

function renderBookingChart(labels, bookings, cancelled) {
  const ctx = document.getElementById('dashBookingCancelChart');
  if (!ctx) return;
  const displayLabels = (labels || []).map(dashFormatShortDateLabel);
  const b = bookings || [];
  const c = cancelled || [];

  if (bookingChart) bookingChart.destroy();

  bookingChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: displayLabels,
      datasets: [
        {
          label: 'Đặt thành công',
          data: b,
          backgroundColor: '#2d8a4e',
          borderRadius: 8
        },
        {
          label: 'Huỷ',
          data: c,
          backgroundColor: '#dc2626',
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            afterBody: function (items) {
              if (!items || !items.length) return '';
              var i = items[0].dataIndex;
              var total = dashNumber(b[i], 0);
              var cancel = dashNumber(c[i], 0);
              var rate = total > 0 ? (cancel / total) * 100 : 0;
              return 'Tỷ lệ huỷ: ' + rate.toFixed(1) + '%';
            }
          }
        }
      }
    }
  });
}