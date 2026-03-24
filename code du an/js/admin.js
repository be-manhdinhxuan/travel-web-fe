// ============================================================
// 3admin.js
// ============================================================

// ===== SWITCH TAB =====
function switchTab(name) {
  document.querySelectorAll('.admin-tab').forEach(function(t){ t.classList.remove('active'); t.style.display='none'; });
  document.querySelectorAll('.admin-nav-item').forEach(function(a){ a.classList.remove('active'); });
  var tab = document.getElementById('tab-' + name);
  var nav = document.getElementById('aNav-' + name);
  if (tab) { tab.classList.add('active'); tab.style.display='flex'; }
  if (nav) nav.classList.add('active');
  if (name === 'tours') adminRenderTours();
  if (name === 'users') renderUsersTable();
  if (name === 'dashboard') adminUpdateDashStats();
}

// ===== DASHBOARD STATS =====
function adminUpdateDashStats() {
  var db = [];
  try { db = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]'); } catch(e) {}
  var tours = adminGetTours();
  var statU = document.getElementById('statUsers');
  var statT = document.getElementById('statTours');
  if (statU) statU.textContent = db.length;
  if (statT) statT.textContent = tours.filter(function(t){ return t.active; }).length;
  // Bookings
  var total = 0;
  db.forEach(function(u){
    try {
      var b = JSON.parse(localStorage.getItem('vt_bookings_' + u.email) || '[]');
      total += b.length;
    } catch(e) {}
  });
  var statB = document.getElementById('statBookings');
  if (statB) statB.textContent = total;
}

// ===== USERS TABLE =====
// ===== USERS MANAGEMENT =====
var ADMIN_USER_PAGE = 1;
var ADMIN_USER_PER  = 10;
var ADMIN_USER_SEARCH = '';

async function renderUsersTable() {
  var tbody  = document.getElementById('usersTableBody');
  var footer = document.getElementById('usersTableFooter');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:32px">Đang tải...</td></tr>';

  var users = [];

  // Thử API trước
  try {
    var res = await apiAdminGetUsers({
      page:    ADMIN_USER_PAGE,
      limit:   ADMIN_USER_PER,
      keyword: ADMIN_USER_SEARCH
    });
    if (res && res.ok && res.data.result) {
      users = res.data.result.users || res.data.result || [];
      // Render pagination từ API
      var pagination = res.data.result.pagination;
      if (pagination && footer) renderUsersPagination(pagination.total, footer);
    }
  } catch(e) {}

  // Fallback localStorage
  if (!users.length) {
    try {
      var raw = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]');
      // Lọc theo search
      if (ADMIN_USER_SEARCH) {
        var q = ADMIN_USER_SEARCH.toLowerCase();
        raw = raw.filter(function(u){ return (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q); });
      }
      var total = raw.length;
      var start = (ADMIN_USER_PAGE - 1) * ADMIN_USER_PER;
      users = raw.slice(start, start + ADMIN_USER_PER);
      if (footer) renderUsersPagination(total, footer);
    } catch(e) {}
  }

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:32px">Chưa có người dùng nào</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(function(u, i) {
    var id      = u._id || u.id || i;
    var name    = u.full_name || u.name  || '—';
    var email   = u.email  || '—';
    var phone   = u.phone  || '—';
    var role    = u.role;
    var status  = u.status; // 1=active, 2=banned (API) hoặc locked (local)
    var isAdmin = role === 'admin' || role === 1;
    var isBanned = status === 2 || u.locked === true;

    var roleBadge   = isAdmin
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
      '<td style="color:#aaa;font-size:0.75rem">' + ((ADMIN_USER_PAGE-1)*ADMIN_USER_PER + i + 1) + '</td>' +
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
    pages += '<button class="admin-page-btn' + (p===ADMIN_USER_PAGE?' active':'') + '" onclick="adminGoUserPage(' + p + ')">' + p + '</button>';
  }
  footer.innerHTML =
    '<span style="font-size:0.75rem;color:#aaa">Tổng ' + total + ' người dùng</span>' +
    '<div class="admin-pagination">' +
      '<button class="admin-page-btn text" onclick="adminGoUserPage(' + Math.max(1,ADMIN_USER_PAGE-1) + ')">Trước</button>' +
      pages +
      '<button class="admin-page-btn text" onclick="adminGoUserPage(' + Math.min(totalPages,ADMIN_USER_PAGE+1) + ')">Sau</button>' +
    '</div>';
}

function adminGoUserPage(p) { ADMIN_USER_PAGE = p; renderUsersTable(); }

function adminSearchUsers() {
  ADMIN_USER_SEARCH = (document.getElementById('adminUserSearch')?.value || '').trim();
  ADMIN_USER_PAGE   = 1;
  renderUsersTable();
}

function adminSetRoleBtn(btn)   { adminSetRole(btn.dataset.id,   parseInt(btn.dataset.role),   btn); }
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
  } catch(e) {}

  // Fallback: cập nhật localStorage
  try {
    var db = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]');
    var u  = db.find(function(x){ return x.id == id || x._id == id || x.email == id; });
    if (u) {
      u.role = role === 1 ? 'admin' : 'customer';
      localStorage.setItem('vt_userdb', JSON.stringify(db));
      sessionStorage.setItem('vt_userdb', JSON.stringify(db));
      showToast('✅ Đã đổi quyền thành ' + label);
    }
  } catch(e) {}

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
  } catch(e) {}

  // Fallback: cập nhật localStorage
  try {
    var db2 = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]');
    var u2  = db2.find(function(x){ return x.id == id || x._id == id || x.email == id; });
    if (u2) {
      u2.locked = (status === 2);
      u2.status = status;
      localStorage.setItem('vt_userdb', JSON.stringify(db2));
      sessionStorage.setItem('vt_userdb', JSON.stringify(db2));
      showToast('✅ Đã ' + label + ' tài khoản');
    }
  } catch(e) {}

  renderUsersTable();
}

// ===== TOURS DATA =====
var ADMIN_TOURS_KEY = 'vt_admin_tours';
var DEFAULT_TOURS = [
  {id:1,name:'Du Thuyền Hạ Long Sang Trọng',location:'Vịnh Hạ Long, Quảng Ninh',price:'6.990.000đ',duration:'3',desc:'Trải nghiệm du thuyền 5 sao trên vịnh Hạ Long huyền thoại.',active:true,schedules:[{date:'2026-04-10',slots:20},{date:'2026-04-24',slots:15}],days:[]},
  {id:2,name:'Tour Phố Cổ Hội An & Ẩm Thực',location:'Phố Cổ Hội An, Quảng Nam',price:'1.250.000đ',duration:'2',desc:'Khám phá phố cổ Hội An về đêm và trải nghiệm ẩm thực địa phương.',active:true,schedules:[{date:'2026-04-05',slots:25}],days:[]},
  {id:3,name:'Trekking & Homestay Sapa',location:'Sapa, Lào Cai',price:'2.800.000đ',duration:'3',desc:'Trekking qua các bản làng và lưu trú homestay bản địa.',active:true,schedules:[{date:'2026-04-15',slots:12}],days:[]},
  {id:4,name:'Khám Phá Hà Nội Cổ Kính',location:'Hà Nội',price:'850.000đ',duration:'1',desc:'Tour city khám phá 36 phố phường và ẩm thực đường phố.',active:true,schedules:[],days:[]},
  {id:5,name:'Đà Nẵng – Bà Nà Hills',location:'Đà Nẵng',price:'1.900.000đ',duration:'2',desc:'Cầu Vàng, Bà Nà Hills và bãi biển Mỹ Khê tuyệt đẹp.',active:true,schedules:[{date:'2026-04-20',slots:30}],days:[]},
  {id:6,name:'Tràng An – Tam Cốc Ninh Bình',location:'Ninh Bình',price:'1.100.000đ',duration:'1',desc:'Chèo thuyền qua hang động Tràng An di sản thế giới UNESCO.',active:false,schedules:[],days:[]},
  {id:7,name:'Sông Nước Miền Tây',location:'Cần Thơ',price:'1.650.000đ',duration:'2',desc:'Khám phá chợ nổi Cái Răng và vườn trái cây đặc sản.',active:true,schedules:[{date:'2026-04-08',slots:18}],days:[]},
];

function adminGetTours() {
  try { var r = localStorage.getItem(ADMIN_TOURS_KEY); return r ? JSON.parse(r) : DEFAULT_TOURS; } catch(e) { return DEFAULT_TOURS; }
}
function adminSaveTours(tours) { localStorage.setItem(ADMIN_TOURS_KEY, JSON.stringify(tours)); }

// ===== TOURS LIST =====
var ADMIN_TOUR_PAGE = 1;
var ADMIN_TOUR_PER  = 8;

function adminRenderTours() {
  var tbody  = document.getElementById('adminToursBody');
  var footer = document.getElementById('adminToursFooter');
  if (!tbody) return;

  var search = (document.getElementById('adminTourSearch')?.value || '').toLowerCase();
  var tours  = adminGetTours().filter(function(t){
    return !search || t.name.toLowerCase().includes(search) || t.location.toLowerCase().includes(search);
  });

  var total = tours.length;
  var start = (ADMIN_TOUR_PAGE - 1) * ADMIN_TOUR_PER;
  var paged = tours.slice(start, start + ADMIN_TOUR_PER);

  // Update KPIs
  var allTours = adminGetTours();
  var el = function(id){ return document.getElementById(id); };
  if(el('kpiTotal'))  el('kpiTotal').textContent  = allTours.length;
  if(el('kpiActive')) el('kpiActive').textContent = allTours.filter(function(t){ return t.active; }).length;
  if(el('kpiDraft'))  el('kpiDraft').textContent  = allTours.filter(function(t){ return !t.active; }).length;
  try {
    var promos = JSON.parse(localStorage.getItem('vt_admin_promos') || '[]');
    if(el('kpiPromo')) el('kpiPromo').textContent = promos.filter(function(p){ return p.status==='active'; }).length;
  } catch(e){}

  if (!paged.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:40px;font-size:0.85rem">Chưa có tour nào</td></tr>';
    if (footer) footer.innerHTML = '';
    return;
  }

  tbody.innerHTML = paged.map(function(t, i) {
    var realIdx = adminGetTours().indexOf(t);
    var imgBg   = 'linear-gradient(135deg,#2d8a4e,#3aaa62)';
    var pct     = t.active ? 100 : (t.desc ? 70 : 40);
    var barCls  = pct >= 80 ? 'content-fill-green' : 'content-fill-orange';
    var barTxt  = pct >= 80 ? '<span class="content-status-text content-ok">Đầy đủ thông tin</span>'
                             : '<span class="content-status-text content-warn">Thiếu ' + (t.schedules&&t.schedules.length?'':'lịch trình') + '</span>';
    var statusBadge = t.active
      ? '<span class="badge-published">ĐANG HIỂN THỊ</span>'
      : '<span class="badge-draft">BẢN NHÁP</span>';
    var actionBtns = t.active
      ? '<button class="act-btn-content" onclick="adminEditTour(' + realIdx + ')">📄 Nội dung</button><button class="act-btn-delete" onclick="adminToggleTour(' + realIdx + ')">Gỡ bỏ</button><button class="admin-act-btn admin-act-btn-red" data-id="' + (t._id||t.id||'') + '" data-idx="' + realIdx + '" onclick="adminDeleteTour(this)" style="font-size:0.72rem;padding:4px 10px">🗑️ Xóa</button>'
      : '<button class="act-btn-content" onclick="adminEditTour(' + realIdx + ')">📄 Nội dung</button><button class="act-btn-publish" onclick="adminToggleTour(' + realIdx + ')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Xuất bản</button><button class="admin-act-btn admin-act-btn-red" data-id="' + (t._id||t.id||'') + '" data-idx="' + realIdx + '" onclick="adminDeleteTour(this)" style="font-size:0.72rem;padding:4px 10px">🗑️ Xóa</button>';

    return '<tr>' +
      '<td><div style="display:flex;align-items:center;gap:10px">' +
        '<div class="tour-img-thumb" style="background:' + imgBg + '">🗺️</div>' +
        '<div><div style="font-weight:700;font-size:0.82rem;color:#1a1a1a">' + t.name + '</div>' +
        '<div class="tour-id-badge">ID: TOUR-' + String(t.id||realIdx+1).padStart(5,'0') + ' · Cập nhật: ' + (t.updatedAt||'—') + '</div></div>' +
      '</div></td>' +
      '<td><div class="content-bar"><div class="' + barCls + '" style="width:' + pct + '%"></div></div>' + barTxt + '</td>' +
      '<td><div class="price-main">' + t.price + '</div>' + (!t.active?'<div class="price-promo">Không ưu đãi</div>':'') + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td><div class="act-btns">' + actionBtns + '</div></td>' +
    '</tr>';
  }).join('');

  // Footer pagination
  var totalPages = Math.max(1, Math.ceil(total / ADMIN_TOUR_PER));
  var pageLinks  = '';
  for (var p = 1; p <= totalPages; p++) {
    pageLinks += '<button class="admin-page-btn' + (p===ADMIN_TOUR_PAGE?' active':'') + '" onclick="adminGoTourPage(' + p + ')">' + p + '</button>';
  }
  if (footer) footer.innerHTML =
    '<span>Hiện thị ' + Math.min(start+1,total) + ' - ' + Math.min(start+ADMIN_TOUR_PER,total) + ' của ' + total + ' tours</span>' +
    '<div class="admin-pagination">' +
      '<button class="admin-page-btn text" onclick="adminGoTourPage(' + Math.max(1,ADMIN_TOUR_PAGE-1) + ')">Trước</button>' +
      pageLinks +
      '<button class="admin-page-btn text" onclick="adminGoTourPage(' + Math.min(totalPages,ADMIN_TOUR_PAGE+1) + ')">Sau</button>' +
    '</div>';
}

function adminGoTourPage(p) { ADMIN_TOUR_PAGE = p; adminRenderTours(); }

function adminToggleTour(idx) {
  var tours = adminGetTours();
  if (!tours[idx]) return;
  tours[idx].active = !tours[idx].active;
  adminSaveTours(tours);
  adminRenderTours();
  showToast((tours[idx].active ? '✅ Đã bật' : '⏸ Đã tắt') + ' tour: ' + tours[idx].name);
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
    document.getElementById('atfName').value     = t.name || '';
    document.getElementById('atfLocation').value = t.location || '';
    document.getElementById('atfPrice').value    = t.price || '';
    document.getElementById('atfDuration').value = t.duration || '';
    document.getElementById('atfDesc').innerText = t.desc || '';
    // Days
    var dl = document.getElementById('atfDaysList');
    dl.innerHTML = '';
    (t.days || []).forEach(function(d){ atfAddDay(d.title, d.desc); });
    if (!dl.children.length) { atfAddDay(); atfAddDay(); }
    // Schedules
    var sl = document.getElementById('atfScheduleList');
    sl.innerHTML = '';
    (t.schedules || []).forEach(function(s){ atfAddScheduleRow(s.date, s.slots); });
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
  var name     = (document.getElementById('atfName').value || '').trim();
  var location = (document.getElementById('atfLocation').value || '').trim();
  var price    = (document.getElementById('atfPrice').value || '').trim();
  var duration = (document.getElementById('atfDuration').value || '').trim();
  var desc     = (document.getElementById('atfDesc').innerText || '').trim();
  var idxStr   = document.getElementById('atfName').dataset.idx;

  if (!name)    { showToast('⚠️ Vui lòng nhập tên tour'); return; }
  if (!location){ showToast('⚠️ Vui lòng chọn địa điểm'); return; }

  // Thu thập days
  var days = [];
  document.querySelectorAll('.atf-day-item').forEach(function(row){
    var t = row.querySelector('.day-title-inp');
    var d = row.querySelector('.day-desc-inp');
    days.push({ title: t ? t.value : '', desc: d ? d.value : '' });
  });

  // Thu thập schedules
  var schedules = [];
  document.querySelectorAll('.atf-schedule-row').forEach(function(row){
    var d = row.querySelector('.sched-date-inp');
    var s = row.querySelector('.slot-inp');
    if (d && d.value) schedules.push({ date: d.value, slots: parseInt(s ? s.value : 0) || 0 });
  });

  var tours = adminGetTours();
  var tour = { name:name, location:location, price: price ? price+'đ' : '—', duration:duration, desc:desc, active: publish, schedules:schedules, days:days };

  if (idxStr !== '') {
    var idx = parseInt(idxStr);
    tour.id = tours[idx].id;
    tours[idx] = tour;
    showToast('✅ Đã cập nhật tour: ' + name);
  } else {
    tour.id = tours.reduce(function(m,t){ return Math.max(m,t.id||0); }, 0) + 1;
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
      '<input class="day-title-inp" type="text" placeholder="Tiêu đề: Tham quan đảo & Chèo thuyền Kayak" value="' + (title||'') + '">' +
      '<textarea class="day-desc-inp" placeholder="Mô tả hoạt động trong ngày...">' + (desc||'') + '</textarea>' +
    '</div>';
  list.appendChild(div);
}

function atfRemoveDay(btn) {
  btn.closest('.atf-day-item').remove();
  // Re-number
  dayCount = 0;
  document.querySelectorAll('.atf-day-item').forEach(function(item){
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
    '<input class="sched-date-inp" type="date" value="' + (date||'') + '">' +
    '<input class="slot-inp" type="number" placeholder="Slots" value="' + (slots||20) + '" min="1">' +
    '<button class="atf-sched-del" onclick="this.parentElement.remove()" title="Xóa">✕</button>';
  list.appendChild(row);
}

// ===== IMAGE UPLOAD =====
function atfAddImages(input) {
  if (!input.files) return;
  var grid = document.getElementById('atfImgGrid');
  Array.from(input.files).slice(0, 6).forEach(function(file){
    var reader = new FileReader();
    reader.onload = function(e){
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
// PROMOTIONS – Quản lý Ưu đãi
// ============================================================
var PROMO_KEY = 'vt_admin_promos';

var DEFAULT_PROMOS = [
  {id:1, name:'Giải Chào Mừng 1%', type:'percent', value:15, start:'2026-01-01', end:'2026-12-31', maxUse:1000, perUser:1, used:880, status:'active'},
  {id:2, name:'Đặc biệt Cuối tuần',  type:'percent', value:20, start:'2026-03-01', end:'2026-03-31', maxUse:500,  perUser:1, used:200, status:'active'},
  {id:3, name:'Summer Flash Sale',    type:'fixed',   value:50, start:'2026-06-01', end:'2026-08-31', maxUse:2000, perUser:2, used:0,   status:'draft'},
];

function promoGetAll() {
  try { var r = localStorage.getItem(PROMO_KEY); return r ? JSON.parse(r) : DEFAULT_PROMOS; } catch(e) { return DEFAULT_PROMOS; }
}
function promoSaveAll(p) { localStorage.setItem(PROMO_KEY, JSON.stringify(p)); }

// Switch sub-tab
function promoSwitchTab(type, btn) {
  document.querySelectorAll('.promo-tab').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  promoRenderList(type);
}

// Show/hide form
function promoShowCreate(idx) {
  var card = document.getElementById('promoFormCard');
  card.style.display = 'block';
  document.getElementById('promoFormTitleText').textContent = idx !== undefined ? 'Chỉnh sửa Ưu đãi' : 'Chi tiết Ưu đãi';
  document.getElementById('promoEditIdx').value = idx !== undefined ? idx : -1;
  if (idx !== undefined) {
    var p = promoGetAll()[idx];
    if (!p) return;
    document.getElementById('promoName').value    = p.name    || '';
    document.getElementById('promoType').value    = p.type    || 'fixed';
    document.getElementById('promoValue').value   = p.value   || '';
    document.getElementById('promoStart').value   = p.start   || '';
    document.getElementById('promoEnd').value     = p.end     || '';
    document.getElementById('promoMaxUse').value  = p.maxUse  || '';
    document.getElementById('promoPerUser').value = p.perUser || 1;
    promoUpdatePreview(p.name, p.type, p.value);
  } else {
    ['promoName','promoType','promoValue','promoStart','promoEnd','promoMaxUse'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
    document.getElementById('promoPerUser').value = 1;
  }
  card.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function promoHideCreate() {
  document.getElementById('promoFormCard').style.display = 'none';
}

// Save
function promoSave() {
  var name    = (document.getElementById('promoName').value    || '').trim();
  var type    = document.getElementById('promoType').value    || 'fixed';
  var value   = parseFloat(document.getElementById('promoValue').value) || 0;
  var start   = document.getElementById('promoStart').value   || '';
  var end     = document.getElementById('promoEnd').value     || '';
  var maxUse  = parseInt(document.getElementById('promoMaxUse').value)  || 1000;
  var perUser = parseInt(document.getElementById('promoPerUser').value) || 1;
  var idxStr  = document.getElementById('promoEditIdx').value;

  if (!name)  { showToast('⚠️ Vui lòng nhập tên chương trình'); return; }
  if (!value) { showToast('⚠️ Vui lòng nhập giá trị giảm');     return; }
  if (!start || !end) { showToast('⚠️ Vui lòng chọn thời gian'); return; }

  var promos = promoGetAll();
  var promo  = { name:name, type:type, value:value, start:start, end:end, maxUse:maxUse, perUser:perUser, used:0, status:'active' };
  var idx    = parseInt(idxStr);

  if (idx >= 0) {
    promo.id   = promos[idx].id;
    promo.used = promos[idx].used || 0;
    promos[idx] = promo;
    showToast('✅ Đã cập nhật ưu đãi: ' + name);
  } else {
    promo.id = promos.reduce(function(m,p){ return Math.max(m,p.id||0); },0) + 1;
    promos.push(promo);
    showToast('✅ Đã tạo ưu đãi: ' + name);
  }

  promoSaveAll(promos);
  promoHideCreate();
  promoRenderList();
  promoUpdateCountBadge();
  promoUpdatePreview(name, type, value);
}

// Render list
function promoRenderList(filterStatus) {
  var body   = document.getElementById('promoListBody');
  if (!body) return;
  var search = (document.getElementById('promoSearchInput')?.value || '').toLowerCase();
  var fType  = document.getElementById('promoFilterType')?.value  || '';
  var today  = new Date().toISOString().slice(0,10);
  var promos = promoGetAll().filter(function(p) {
    if (search && !p.name.toLowerCase().includes(search)) return false;
    if (fType && p.type !== fType) return false;
    if (filterStatus === 'active'  && p.status !== 'active')  return false;
    if (filterStatus === 'paused'  && p.status !== 'paused')  return false;
    if (filterStatus === 'draft'   && p.status !== 'draft')   return false;
    return true;
  });

  if (!promos.length) {
    body.innerHTML = '<div class="promo-empty">Không có ưu đãi nào</div>'; return;
  }

  body.innerHTML = promos.map(function(p, i) {
    var realIdx = promoGetAll().indexOf(promoGetAll().find(function(x){ return x.id === p.id; }));
    var pct   = p.maxUse > 0 ? Math.round((p.used / p.maxUse) * 100) : 0;
    var fillCls = pct >= 80 ? 'warn' : '';
    var remain  = promoDaysLeft(p.end);
    var discStr = p.type === 'percent' ? p.value + '%' : p.value.toLocaleString() + 'đ';
    var statusBadge = p.status === 'active'
      ? '<span class="promo-status-active">HOẠT ĐỘNG</span>'
      : p.status === 'paused'
        ? '<span class="promo-status-paused">TẠM DỪNG</span>'
        : '<span class="promo-status-draft">BẢN NHÁP</span>';
    return '<div class="promo-list-row">' +
      '<div><div class="promo-item-name">' + p.name + '</div><div class="promo-item-type">Giảm ' + (p.type==='percent'?'phần trăm':'cố định') + '</div></div>' +
      '<div class="promo-item-discount">' + discStr + '</div>' +
      '<div class="promo-item-expire">' + remain + '</div>' +
      '<div><div style="font-size:0.75rem;color:#666">' + p.used + '/' + p.maxUse + '</div><div class="promo-usage-bar"><div class="promo-usage-fill ' + fillCls + '" style="width:' + pct + '%"></div></div></div>' +
      '<div>' + statusBadge + '</div>' +
      '<div><button class="promo-action-btn" onclick="promoMenu(' + realIdx + ',event)">⋮</button></div>' +
    '</div>';
  }).join('');
}

function promoDaysLeft(endDate) {
  if (!endDate) return '—';
  var diff = Math.ceil((new Date(endDate) - new Date()) / 86400000);
  if (diff < 0)  return 'Đã hết hạn';
  if (diff === 0) return 'Hôm nay';
  return diff + ' ngày';
}

function promoMenu(idx, e) {
  e.stopPropagation();
  var promos = promoGetAll();
  var p = promos[idx];
  if (!p) return;
  var act = confirm('Tour: ' + p.name + '\nChọn OK để sửa, Cancel để xóa');
  if (act) { promoShowCreate(idx); }
  else {
    if (confirm('Xóa ưu đãi "' + p.name + '"?')) {
      promos.splice(idx,1);
      promoSaveAll(promos);
      promoRenderList();
      promoUpdateCountBadge();
      showToast('🗑️ Đã xóa ưu đãi');
    }
  }
}

function promoUpdateCountBadge() {
  var active = promoGetAll().filter(function(p){ return p.status==='active'; }).length;
  var el = document.getElementById('promoCountActive');
  if (el) el.textContent = active;
}

function promoUpdatePreview(name, type, value) {
  var nameEl = document.getElementById('promoPreviewName');
  var valEl  = document.getElementById('promoPreviewVal');
  var useEl  = document.getElementById('promoStatUse');
  if (nameEl) nameEl.textContent = name || 'Summer Flash Sale 2024';
  if (valEl)  valEl.textContent  = type === 'percent' ? '-' + (value||0) + '%' : (value||0).toLocaleString() + 'đ';
  if (useEl)  useEl.textContent  = Math.floor(Math.random()*20 + 10) + '.4k';
}

// Init promotions when tab opens
var _origSwitchTab = switchTab;
switchTab = function(name) {
  _origSwitchTab(name);
  if (name === 'promotions') {
    promoRenderList();
    promoUpdateCountBadge();
  }
};

// Sync prefix ₫ / %
document.addEventListener('change', function(e) {
  if (e.target.id === 'promoType') {
    var prefix = document.getElementById('promoValPrefix');
    if (prefix) prefix.textContent = e.target.value === 'percent' ? '%' : '₫';
  }
});

// ============================================================
// THỐNG KÊ
// ============================================================
function statsPeriod(btn, days) {
  document.querySelectorAll('.stats-period').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  statsLoadData();
}

function statsLoadData() {
  // Đọc dữ liệu thật từ localStorage
  var db = [];
  try { db = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]'); } catch(e) {}

  var totalBookings = 0;
  var totalRevenue  = 0;
  var tourBookings  = {};

  db.forEach(function(u) {
    try {
      var bs = JSON.parse(localStorage.getItem('vt_bookings_' + u.email) || '[]');
      totalBookings += bs.length;
      bs.forEach(function(b) {
        // Parse số tiền
        var raw = (b.total || b.price || '0').replace(/[^\d]/g, '');
        totalRevenue += parseInt(raw) || 0;
        // Đếm theo tour
        var tname = b.tourName || b.tour || '—';
        tourBookings[tname] = (tourBookings[tname] || 0) + 1;
      });
    } catch(e) {}
  });

  // KPI
  var fmtMoney = function(n) {
    if (n >= 1000000) return (n/1000000).toFixed(1) + 'M đ';
    if (n >= 1000)    return (n/1000).toFixed(0) + 'K đ';
    return n + 'đ';
  };
  var el = function(id){ return document.getElementById(id); };

  if (el('statRevenue'))       el('statRevenue').textContent       = totalRevenue  ? fmtMoney(totalRevenue) : '0đ';
  if (el('statTotalBookings')) el('statTotalBookings').textContent = totalBookings || 0;
  if (el('statVisitors'))      el('statVisitors').textContent      = db.length     || 0;

  // Rating
  if (el('statRating'))     el('statRating').textContent     = '— / 5.0';
  if (el('statsRatingBig')) el('statsRatingBig').textContent = '—';

  // Donut
  if (el('statsDonutVal')) el('statsDonutVal').textContent = totalBookings || 0;

  // Tour list
  var tourList = el('statsToursList');
  if (tourList) {
    var entries = Object.entries(tourBookings).sort(function(a,b){ return b[1]-a[1]; }).slice(0,5);
    if (!entries.length) {
      tourList.innerHTML = '<div class="stats-tours-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10z"/></svg><p>Chưa có dữ liệu đặt tour</p></div>';
    } else {
      tourList.innerHTML = entries.map(function(e) {
        var conv = totalBookings > 0 ? Math.round(e[1]/totalBookings*100) : 0;
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
switchTab = function(name) {
  _origSwitch2(name);
  if (name === 'stats') statsLoadData();
};


// Promo preview trong trang tours
function adminRenderPromoPreview() {
  var grid = document.getElementById('adminPromoPreview');
  if (!grid) return;
  var promos = [];
  try { promos = JSON.parse(localStorage.getItem('vt_admin_promos') || '[]'); } catch(e) {}
  var active = promos.filter(function(p){ return p.status === 'active'; }).slice(0,2);
  var html = active.map(function(p) {
    var disc = p.type === 'percent' ? p.value + '%' : p.value.toLocaleString() + 'đ';
    return '<div class="admin-promo-card">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between">' +
        '<div class="promo-icon">' + (p.type==='percent'?'%':'💰') + '</div>' +
        '<span class="admin-promo-running">ĐANG CHẠY</span>' +
      '</div>' +
      '<div class="admin-promo-name">' + p.name + '</div>' +
      '<div class="admin-promo-desc">Giảm ' + disc + ' · Hết hạn: ' + (p.end||'—') + '</div>' +
      '<div class="admin-promo-footer"><span>Hết hạn: ' + (p.end||'—') + '</span><button class="admin-promo-edit" onclick="switchTab(\"promotions\")">Chỉnh sửa</button></div>' +
    '</div>';
  }).join('');
  html += '<div class="admin-promo-card admin-promo-card-add" onclick="switchTab(\"promotions\")">' +
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
    '<strong>Thêm Ưu đãi Mới</strong>' +
    '<span>Tạo mã giảm giá hoặc chương trình quà tặng mới</span>' +
  '</div>';
  grid.innerHTML = html;
}

function adminUpdateDashStats() {
  var db = [];
  try { db = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]'); } catch(e) {}
  var total = 0;
  db.forEach(function(u){ try { total += JSON.parse(localStorage.getItem('vt_bookings_' + u.email)||'[]').length; } catch(e){} });
  var el = function(id){ return document.getElementById(id); };
  if(el('statUsers'))    el('statUsers').textContent    = db.length;
  if(el('statTours'))    el('statTours').textContent    = adminGetTours().filter(function(t){ return t.active; }).length;
  if(el('statBookings')) el('statBookings').textContent = total;
  if(el('statsDonutVal')) el('statsDonutVal').textContent = total;
  if(el('statTotalBookings')) el('statTotalBookings').textContent = total;
  if(el('statVisitors'))  el('statVisitors').textContent = db.length;
}

// ============================================================
// CATEGORIES – Quản lý Danh mục
// ============================================================
var CAT_KEY  = 'vt_admin_categories';
var CAT_PAGE = 1;
var CAT_PER  = 10;

var DEFAULT_CATS = [
  {id:'c1', name:'Du lịch biển',    desc:'Các tour tham quan, nghỉ dưỡng tại biển', active:true},
  {id:'c2', name:'Trekking & Núi',  desc:'Leo núi, trekking rừng và núi cao',         active:true},
  {id:'c3', name:'Văn hóa & Lịch sử', desc:'Khám phá di tích, văn hóa bản địa',       active:true},
  {id:'c4', name:'Ẩm thực',         desc:'Tour trải nghiệm ẩm thực địa phương',        active:true},
  {id:'c5', name:'Nghỉ dưỡng',      desc:'Resort, spa và thư giãn cao cấp',            active:true},
];

function catGetAll() {
  try { var r = localStorage.getItem(CAT_KEY); return r ? JSON.parse(r) : DEFAULT_CATS; } catch(e) { return DEFAULT_CATS; }
}
function catSaveAll(cats) { localStorage.setItem(CAT_KEY, JSON.stringify(cats)); }

// Show/hide form
function catShowForm(id) {
  var card = document.getElementById('catFormCard');
  card.style.display = 'block';
  document.getElementById('catEditId').value = id || '';
  document.getElementById('catFormTitle').textContent = id ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới';
  if (id) {
    var cat = catGetAll().find(function(c){ return c.id === id; });
    if (cat) {
      document.getElementById('catName').value = cat.name || '';
      document.getElementById('catDesc').value = cat.desc || '';
    }
  } else {
    document.getElementById('catName').value = '';
    document.getElementById('catDesc').value = '';
  }
  card.scrollIntoView({ behavior:'smooth', block:'nearest' });
}
function catHideForm() { document.getElementById('catFormCard').style.display = 'none'; }

// Save – POST /api/categories hoặc PUT /api/categories/:id
async function catSave() {
  var name = (document.getElementById('catName').value || '').trim();
  var desc = (document.getElementById('catDesc').value || '').trim();
  var id   = document.getElementById('catEditId').value;
  var file = document.getElementById('catThumbnail').files[0];

  if (!name) { showToast('⚠️ Vui lòng nhập tên danh mục'); return; }

  // Gọi API
  try {
    var res;
    if (id) {
      res = await apiAdminUpdateCategory(id, { name, description: desc, is_active: true });
    } else {
      res = await apiAdminCreateCategory({ name, description: desc });
    }
    if (res && res.ok) { showToast('✅ Đã lưu danh mục!'); catHideForm(); catRender(); return; }
  } catch(e) {}

  // Fallback local
  var cats = catGetAll();
  if (id) {
    var idx = cats.findIndex(function(c){ return c.id === id; });
    if (idx >= 0) { cats[idx].name = name; cats[idx].desc = desc; }
  } else {
    cats.unshift({ id: 'c' + Date.now(), name, desc, active: true });
  }
  catSaveAll(cats);
  showToast('✅ Đã lưu danh mục!');
  catHideForm();
  catRender();
}

// Delete – DELETE /api/categories/:id
async function catDelete(id) {
  var cat = catGetAll().find(function(c){ return c.id === id; });
  if (!confirm('Xóa danh mục "' + (cat ? cat.name : id) + '"?\nKhông thể xóa nếu còn tour đang dùng.')) return;
  try {
    var res = await apiAdminDeleteCategory(id);
    if (res && res.ok) { showToast('🗑️ Đã xóa danh mục'); catRender(); return; }
    if (res && res.status === 400) { showToast('❌ ' + (res.data?.message || 'Còn tour đang dùng danh mục này')); return; }
  } catch(e) {}
  // Fallback
  var cats = catGetAll().filter(function(c){ return c.id !== id; });
  catSaveAll(cats);
  showToast('🗑️ Đã xóa danh mục');
  catRender();
}

// Toggle active
async function catToggle(id) {
  var cats = catGetAll();
  var cat  = cats.find(function(c){ return c.id === id; });
  if (!cat) return;
  cat.active = !cat.active;
  try { await apiAdminUpdateCategory(id, { is_active: cat.active }); } catch(e) {}
  catSaveAll(cats);
  catRender();
}

// Render
async function catRender() {
  var tbody  = document.getElementById('catTableBody');
  var footer = document.getElementById('catTableFooter');
  if (!tbody) return;

  var cats = [];

  // Thử API
  try {
    var res = await apiGetCategories();
    if (res && res.ok && res.data.result) {
      cats = res.data.result.categories || res.data.result || [];
    }
  } catch(e) {}

  // Fallback local
  if (!cats.length) cats = catGetAll();

  var q = (document.getElementById('catSearch')?.value || '').toLowerCase();
  if (q) cats = cats.filter(function(c){ return c.name.toLowerCase().includes(q); });

  var total = cats.length;
  var start = (CAT_PAGE - 1) * CAT_PER;
  var paged = cats.slice(start, start + CAT_PER);

  if (!paged.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:32px">Chưa có danh mục nào</td></tr>';
    if (footer) footer.innerHTML = '';
    return;
  }

  tbody.innerHTML = paged.map(function(c, i) {
    var id     = c._id || c.id;
    var active = c.is_active !== false && c.active !== false;
    return '<tr>' +
      '<td style="color:#aaa;font-size:0.75rem">' + (start+i+1) + '</td>' +
      '<td><strong style="font-size:0.83rem">' + (c.name||'—') + '</strong></td>' +
      '<td style="font-size:0.78rem;color:#888;max-width:280px">' + (c.description||c.desc||'—') + '</td>' +
      '<td>' + (active ? '<span class="admin-badge-active">Hiển thị</span>' : '<span class="admin-badge-inactive">Ẩn</span>') + '</td>' +
      '<td><div style="display:flex;gap:6px">' +
        '<button class="admin-act-btn" data-id="' + id + '" onclick="catShowForm(this.dataset.id)">✏️ Sửa</button>' +
        '<button class="admin-act-btn' + (active?' admin-act-btn-red':' admin-act-btn-green') + '" data-id="' + id + '" onclick="catToggle(this.dataset.id)">' + (active?'Ẩn':'Hiện') + '</button>' +
        '<button class="admin-act-btn admin-act-btn-red" data-id="' + id + '" onclick="catDelete(this.dataset.id)">🗑️</button>' +
      '</div></td>' +
    '</tr>';
  }).join('');

  // Footer
  var totalPages = Math.max(1, Math.ceil(total / CAT_PER));
  var pages = '';
  for (var p = 1; p <= totalPages; p++) {
    pages += '<button class="admin-page-btn' + (p===CAT_PAGE?' active':'') + '" onclick="CAT_PAGE=' + p + ';catRender()">' + p + '</button>';
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
switchTab = function(name) {
  _origSwitchTab3(name);
  if (name === 'categories') catRender();
};

// ============================================================
// BOOKINGS MANAGEMENT (Admin)
// ============================================================
var ADMIN_BK_PAGE = 1;
var ADMIN_BK_PER  = 15;

async function adminBkRender() {
  var tbody  = document.getElementById('adminBkBody');
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
    if (status) params.status  = parseInt(status);
    var res = await apiAdminGetBookings(params);
    if (res && res.ok && res.data.result) {
      bookings = res.data.result.bookings || res.data.result || [];
      var pag  = res.data.result.pagination;
      if (pag && footer) adminBkPagination(pag.total, footer);
    }
  } catch(e) {}

  // Fallback localStorage
  if (!bookings.length) {
    var db = [];
    try { db = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]'); } catch(e) {}
    db.forEach(function(u) {
      try {
        var bks = JSON.parse(localStorage.getItem('vt_bookings_' + u.email) || '[]');
        bks.forEach(function(b){ bookings.push({ ...b, _user: u.name || u.email }); });
      } catch(e) {}
    });

    // Filter
    if (search) {
      var q = search.toLowerCase();
      bookings = bookings.filter(function(b){
        return (b.code||'').toLowerCase().includes(q) ||
               (b._user||'').toLowerCase().includes(q) ||
               (b.tourName||b.tour||'').toLowerCase().includes(q);
      });
    }
    if (status) {
      var stMap = {'0':'upcoming','1':'confirmed','2':'done','3':'cancelled'};
      var stVal = stMap[status];
      bookings = bookings.filter(function(b){ return (b.status||'upcoming') === stVal; });
    }

    var total = bookings.length;
    var start = (ADMIN_BK_PAGE-1) * ADMIN_BK_PER;
    bookings  = bookings.slice(start, start + ADMIN_BK_PER);
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
    upcoming:  '<span class="nv-badge nv-badge-pending">SẮP DIỄN RA</span>',
    confirmed: '<span class="nv-badge nv-badge-processing">ĐÃ XÁC NHẬN</span>',
    done:      '<span class="nv-badge nv-badge-done">HOÀN THÀNH</span>',
    completed: '<span class="nv-badge nv-badge-done">HOÀN THÀNH</span>',
    cancelled: '<span class="nv-badge nv-badge-urgent">ĐÃ HỦY</span>',
  };

  tbody.innerHTML = bookings.map(function(b) {
    var id      = b._id || b.code || '—';
    var code    = b.booking_code || b.code || '—';
    var user    = b._user || (b.contact_info && b.contact_info.full_name) || '—';
    var tour    = b.tourName || b.tour || (b.schedule && b.schedule.tour && b.schedule.tour.name) || '—';
    var date    = b.date || (b.schedule && b.schedule.departure_date ? b.schedule.departure_date.slice(0,10) : '') || '—';
    var total   = b.total || b.price || (b.total_amount ? b.total_amount.toLocaleString('vi-VN') + 'đ' : '—');
    var stRaw   = b.status;
    var badge   = statusMap[stRaw] || statusMap['upcoming'];
    var canConfirm  = stRaw === 0 || stRaw === 'upcoming';
    var canComplete = stRaw === 1 || stRaw === 'confirmed';
    var canCancel   = stRaw !== 3 && stRaw !== 'cancelled' && stRaw !== 2 && stRaw !== 'completed';

    var actions = '<div style="display:flex;gap:5px;flex-wrap:wrap">';
    if (canConfirm)  actions += '<button class="admin-act-btn admin-act-btn-green" data-id="' + id + '" data-status="1" onclick="adminBkUpdateStatus(this)">✓ Xác nhận</button>';
    if (canComplete) actions += '<button class="admin-act-btn" data-id="' + id + '" data-status="2" onclick="adminBkUpdateStatus(this)">✅ Hoàn thành</button>';
    if (canCancel)   actions += '<button class="admin-act-btn admin-act-btn-red" data-id="' + id + '" data-status="3" onclick="adminBkCancel(this)">✕ Hủy</button>';
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
    pages += '<button class="admin-page-btn' + (p===ADMIN_BK_PAGE?' active':'') + '" onclick="ADMIN_BK_PAGE=' + p + ';adminBkRender()">' + p + '</button>';
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
  var id     = btn.dataset.id;
  var status = parseInt(btn.dataset.status);
  var labels = {1:'xác nhận', 2:'hoàn thành'};
  if (!confirm('Xác nhận ' + (labels[status]||'cập nhật') + ' đơn hàng này?')) return;
  btn.disabled = true; btn.textContent = '...';

  try {
    var res = await apiAdminUpdateBooking(id, status);
    if (res && res.ok) { showToast('✅ Đã cập nhật trạng thái đơn hàng'); adminBkRender(); return; }
  } catch(e) {}

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
  } catch(e) {}

  adminBkUpdateLocal(id, 3);
  showToast('✅ Đã hủy đơn hàng');
  adminBkRender();
}

function adminBkUpdateLocal(idOrCode, status) {
  var stStr = {0:'upcoming',1:'confirmed',2:'completed',3:'cancelled'}[status] || 'upcoming';
  var db = [];
  try { db = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]'); } catch(e) {}
  db.forEach(function(u) {
    var key = 'vt_bookings_' + u.email;
    try {
      var bks = JSON.parse(localStorage.getItem(key) || '[]');
      var changed = false;
      bks.forEach(function(b){
        if (b._id === idOrCode || b.code === idOrCode) { b.status = stStr; changed = true; }
      });
      if (changed) localStorage.setItem(key, JSON.stringify(bks));
    } catch(e) {}
  });
}

// Gọi khi switch tab
var _origSwitchTab4 = switchTab;
switchTab = function(name) {
  _origSwitchTab4(name);
  if (name === 'bookings') adminBkRender();
};


// ============================================================
// DELETE TOUR – DELETE /api/tours/:id
// ============================================================
async function adminDeleteTour(btn) {
  var id  = btn.dataset.id;
  var idx = parseInt(btn.dataset.idx);
  var tours = adminGetTours();
  var tour  = tours[idx];
  var name  = tour ? (tour.name || 'tour này') : 'tour này';

  if (!confirm('Xóa tour "' + name + '"?\nKhông thể xóa nếu còn booking liên quan.')) return;

  btn.disabled = true; btn.textContent = '...';

  // Gọi API DELETE /api/tours/:id
  try {
    var res = await apiDeleteTour(id);
    if (res && res.ok) {
      showToast('🗑️ Đã xóa tour: ' + name);
      adminRenderTours();
      return;
    }
    if (res && res.status === 400) {
      showToast('❌ ' + (res.data?.message || 'Không thể xóa: còn booking liên quan'));
      btn.disabled = false; btn.textContent = '🗑️ Xóa';
      return;
    }
  } catch(e) {}

  // Fallback: xóa khỏi localStorage
  var updated = tours.filter(function(t, i){ return i !== idx; });
  adminSaveTours(updated);
  showToast('🗑️ Đã xóa tour: ' + name);
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
  } catch(e) {}

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
  } catch(e) {}

  // Fallback: tính từ localStorage bookings
  var allBks = adminGetAllBookingsLocal();
  if (allBks.length) adminDrawRevenueChartLocal(allBks);
}

function adminDrawRevenueChart(data) {
  var card = document.querySelector('.stats-chart-card');
  if (!card) return;

  var maxRev = Math.max(...data.map(function(d){ return d.revenue || 0; }), 1);

  var barsHtml = data.map(function(d) {
    var h = Math.round((d.revenue / maxRev) * 100);
    return '<div class="stats-bar-wrap">' +
      '<div class="stats-bar-tooltip">' + (d.revenue||0).toLocaleString('vi-VN') + 'đ<br>' + (d.bookings||0) + ' đơn</div>' +
      '<div class="stats-bar" style="height:' + Math.max(h,2) + '%"></div>' +
      '<div class="stats-bar-label">' + (d.date||'').slice(5) + '</div>' +
    '</div>';
  }).join('');

  card.innerHTML = '<div class="stats-chart-header"><span class="stats-card-title">Tăng trưởng doanh thu</span></div>' +
    '<div class="stats-bar-chart">' + barsHtml + '</div>';
}

function adminDrawRevenueChartLocal(bookings) {
  // Nhóm theo tháng
  var byMonth = {};
  bookings.forEach(function(b) {
    if (b.status === 'cancelled' || b.status === 3) return; // bỏ qua đã hủy
    var d = (b.createdAt || b.date || '').slice(0,7);
    if (!d) return;
    if (!byMonth[d]) byMonth[d] = { date: d, revenue: 0, bookings: 0 };
    var price = parseInt(String(b.total||b.price||'0').replace(/[^0-9]/g,'')) || 0;
    byMonth[d].revenue   += price;
    byMonth[d].bookings  += 1;
  });
  var data = Object.values(byMonth).sort(function(a,b){ return a.date.localeCompare(b.date); }).slice(-12);
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
  } catch(e) {}

  // Fallback từ localStorage
  if (!tours.length) {
    var allBks = adminGetAllBookingsLocal();
    var tourMap = {};
    allBks.forEach(function(b) {
      if (b.status === 'cancelled' || b.status === 3) return; // bỏ qua đã hủy
      var name = b.tourName || b.tour || '—';
      if (!tourMap[name]) tourMap[name] = { name: name, booking_count: 0, revenue: 0 };
      tourMap[name].booking_count++;
      tourMap[name].revenue += parseInt(String(b.total||b.price||'0').replace(/[^0-9]/g,'')) || 0;
    });
    tours = Object.values(tourMap).sort(function(a,b){ return b.booking_count - a.booking_count; }).slice(0,10);
  }

  if (!tours.length) {
    listEl.innerHTML = '<div class="stats-tours-empty"><p>Chưa có dữ liệu</p></div>';
    return;
  }

  var maxBookings = Math.max(...tours.map(function(t){ return t.booking_count||0; }), 1);
  listEl.innerHTML = tours.map(function(t, i) {
    var pct = Math.round(((t.booking_count||0) / maxBookings) * 100);
    return '<div class="stats-tour-row">' +
      '<div class="stats-tour-rank">' + (i+1) + '</div>' +
      '<div class="stats-tour-name">' +
        '<div style="font-weight:600;font-size:0.8rem;color:#1a1a1a;margin-bottom:3px">' + (t.name || t.tour_id || '—') + '</div>' +
        '<div class="stats-rb-track"><div class="stats-rb-fill" style="width:' + pct + '%;background:#2d8a4e"></div></div>' +
      '</div>' +
      '<div class="stats-tour-stat">' + (t.booking_count||0) + '</div>' +
      '<div class="stats-tour-stat" style="color:#2d8a4e">' + (t.revenue||0).toLocaleString('vi-VN') + 'đ</div>' +
      '<div class="stats-tour-stat">' + pct + '%</div>' +
    '</div>';
  }).join('');
}

// Lấy tất cả bookings từ localStorage (fallback)
function adminGetAllBookingsLocal() {
  var all = [];
  try {
    var db = JSON.parse(localStorage.getItem('vt_userdb') || '[]');
    db.forEach(function(u) {
      try {
        var bks = JSON.parse(localStorage.getItem('vt_bookings_' + u.email) || '[]');
        all = all.concat(bks);
      } catch(e) {}
    });
  } catch(e) {}
  return all;
}

// Fallback stats từ localStorage
function adminLoadStatsFallback() {
  var all = adminGetAllBookingsLocal();
  // Chỉ tính booking chưa hủy
  var active = all.filter(function(b){ return b.status !== 'cancelled' && b.status !== 3; });
  var revenue = 0;
  active.forEach(function(b) {
    revenue += parseInt(String(b.total||b.price||'0').replace(/[^0-9]/g,'')) || 0;
  });
  var revEl = document.getElementById('statRevenue');
  var bkEl  = document.getElementById('statTotalBookings');
  var donut = document.getElementById('statsDonutVal');
  if (revEl) revEl.textContent = revenue.toLocaleString('vi-VN') + 'đ';
  if (bkEl)  bkEl.textContent  = active.length.toLocaleString('vi-VN');
  if (donut) donut.textContent  = active.length;
}

// Period buttons
function statsPeriod(btn, val) {
  document.querySelectorAll('.stats-period').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  var periodMap = { '30':'month', '90':'month', '365':'year' };
  adminLoadStats(periodMap[val] || val);
}

// Override switchTab để load stats khi mở tab
var _origSwitchTabStats = switchTab;
switchTab = function(name, btn) {
  _origSwitchTabStats(name, btn);
  if (name === 'stats') adminLoadStats('month');
};