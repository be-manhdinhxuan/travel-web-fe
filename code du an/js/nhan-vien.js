// ============================================================
// 3nhanvien.js – Staff Dashboard
// ============================================================

var NV_ISSUES_KEY = 'vt_nv_issues';
var NV_CURRENT_ISSUE_IDX = -1;
var NV_PAGE = 1;
var NV_PER_PAGE = 8;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
  var u = loadUser();
  if (!u) { window.location.href = '1dangnhap-nhanvien.html'; return; }
  if (u.role !== 'staff' && u.role !== 'admin') {
    window.location.href = '1dangnhap-nhanvien.html'; return;
  }

  var n = u.name || 'Nhân viên';
  var av = n[0].toUpperCase();
  ['nvUserName','nvUserName2'].forEach(function(id){
    var el = document.getElementById(id); if(el) el.textContent = n;
  });
  ['nvUserAvatar','nvUserAvatar2'].forEach(function(id){
    var el = document.getElementById(id); if(el) el.textContent = av;
  });

  nvRenderIssues();
  nvRenderBookings();
  nvUpdateUrgentCount();
});

// ===== SWITCH TAB =====
function nvSwitchTab(name) {
  document.querySelectorAll('.nv-tab').forEach(function(t){ t.classList.remove('active'); t.style.display='none'; });
  document.querySelectorAll('.nv-nav-item').forEach(function(a){ a.classList.remove('active'); });
  var tab = document.getElementById('nvTab-' + name);
  var nav = document.getElementById('nvNav-' + name);
  if (tab) { tab.classList.add('active'); tab.style.display='flex'; }
  if (nav) nav.classList.add('active');
}

// ===== ISSUES DATA =====
function nvGetIssues() {
  // Đọc từ cả 2 nguồn: ticket từ khách hàng + issue do nhân viên tạo
  var tickets = [];
  try { tickets = JSON.parse(localStorage.getItem('vt_support_tickets') || '[]'); } catch(e) {}
  var manual  = [];
  try { manual  = JSON.parse(localStorage.getItem(NV_ISSUES_KEY) || '[]'); } catch(e) {}
  // Merge, tránh trùng id
  var ids = {};
  var all = [];
  tickets.concat(manual).forEach(function(t) {
    if (!ids[t.id]) { ids[t.id] = true; all.push(t); }
  });
  return all;
}
function nvSaveIssues(issues) {
  // Chỉ lưu lại trạng thái đã cập nhật vào key chung
  localStorage.setItem(NV_ISSUES_KEY, JSON.stringify(issues));
  // Đồng bộ trạng thái về vt_support_tickets
  var tickets = [];
  try { tickets = JSON.parse(localStorage.getItem('vt_support_tickets') || '[]'); } catch(e) {}
  issues.forEach(function(upd) {
    var idx = tickets.findIndex(function(t){ return t.id === upd.id; });
    if (idx >= 0) tickets[idx].status = upd.status;
  });
  localStorage.setItem('vt_support_tickets', JSON.stringify(tickets));
  // Đồng bộ về key của từng user
  var byUser = {};
  tickets.forEach(function(t) { if(t.email){ if(!byUser[t.email]) byUser[t.email]=[]; byUser[t.email].push(t); } });
  Object.keys(byUser).forEach(function(email) {
    localStorage.setItem('vt_support_' + email, JSON.stringify(byUser[email]));
  });
}

// ===== RENDER ISSUES =====
function nvRenderIssues() {
  var body   = document.getElementById('nvIssuesBody');
  var footer = document.getElementById('nvTableFooter');
  if (!body) return;

  var search    = (document.getElementById('nvSearchInput')?.value || '').toLowerCase();
  var fType     = document.getElementById('nvFilterType')?.value   || '';
  var fStatus   = document.getElementById('nvFilterStatus')?.value || '';

  var issues = nvGetIssues().filter(function(i){
    if (search && !i.customer.toLowerCase().includes(search) && !i.id.toLowerCase().includes(search) && !i.title.toLowerCase().includes(search)) return false;
    if (fType   && i.type   !== fType)   return false;
    if (fStatus && i.status !== fStatus) return false;
    return true;
  });

  var total  = issues.length;
  var start  = (NV_PAGE - 1) * NV_PER_PAGE;
  var paged  = issues.slice(start, start + NV_PER_PAGE);

  if (!paged.length) {
    body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:40px;font-size:0.85rem">Không có yêu cầu nào</td></tr>';
  } else {
    body.innerHTML = paged.map(function(issue, i) {
      var realIdx = nvGetIssues().findIndex(function(x){ return x.id === issue.id; });
      var titleCls = issue.status === 'urgent' ? 'nv-issue-title urgent-text' : 'nv-issue-title';
      var badge = nvStatusBadge(issue.status);
      var action = '';
      if      (issue.status === 'urgent')     action = '<button class="nv-act-primary" onclick="nvOpenModal(' + realIdx + ')">Xử lý ngay</button>';
      else if (issue.status === 'processing') action = '<button class="nv-act-link"    onclick="nvOpenModal(' + realIdx + ')">Xem chi tiết</button>';
      else if (issue.status === 'done')       action = '<button class="nv-act-link"    onclick="nvOpenModal(' + realIdx + ')">Xem chi tiết</button>';
      else                                    action = '<button class="nv-act-pending" onclick="nvOpenModal(' + realIdx + ')">Xử lý</button>';

      return '<tr>' +
        '<td><a class="nv-issue-code" onclick="nvOpenModal(' + realIdx + ')">#' + issue.id + '</a></td>' +
        '<td><div style="font-weight:600;font-size:0.82rem;color:#1a1a1a">' + issue.customer + '</div><div class="nv-booking-ref">#BK-' + issue.id.split('-')[1] + '</div></td>' +
        '<td><div class="' + titleCls + '">' + (issue.status==='urgent'?'<b>Hỗ trợ khẩn cấp: </b>':'') + issue.title + '</div><div class="nv-issue-desc">' + issue.desc + '</div></td>' +
        '<td class="nv-time">' + issue.time + '</td>' +
        '<td>' + badge + '</td>' +
        '<td>' + action + '</td>' +
      '</tr>';
    }).join('');
  }

  // Footer
  var totalPages = Math.max(1, Math.ceil(total / NV_PER_PAGE));
  var pageLinks  = '';
  for (var p = 1; p <= totalPages; p++) {
    pageLinks += '<button class="nv-page-btn' + (p===NV_PAGE?' active':'') + '" onclick="nvGoPage(' + p + ')">' + p + '</button>';
  }
  if (footer) {
    footer.innerHTML =
      '<span>Hiển thị ' + Math.min(start+1,total) + ' đến ' + Math.min(start+NV_PER_PAGE,total) + ' của ' + total + ' yêu cầu đang mở</span>' +
      '<div class="nv-pagination">' +
        '<button class="nv-page-btn text" onclick="nvGoPage(' + Math.max(1,NV_PAGE-1) + ')">Trước</button>' +
        pageLinks +
        '<button class="nv-page-btn text" onclick="nvGoPage(' + Math.min(totalPages,NV_PAGE+1) + ')">Tiếp</button>' +
      '</div>';
  }
}

function nvGoPage(p) { NV_PAGE = p; nvRenderIssues(); }

function nvStatusBadge(status) {
  var map = {
    urgent:     '<span class="nv-badge nv-badge-urgent">CẦN CAN THIỆP</span>',
    processing: '<span class="nv-badge nv-badge-processing">ĐANG XỬ LÝ</span>',
    done:       '<span class="nv-badge nv-badge-done">ĐÃ GIẢI QUYẾT</span>',
    pending:    '<span class="nv-badge nv-badge-pending">CHỜ XỬ LÝ</span>',
  };
  return map[status] || map['pending'];
}

// ===== URGENT COUNT =====
function nvUpdateUrgentCount() {
  var count = nvGetIssues().filter(function(i){ return i.status === 'urgent'; }).length;
  var el    = document.getElementById('nvUrgentCount');
  var badge = document.getElementById('nvNotifBadge');
  var box   = document.getElementById('nvUrgentBox');
  if (el)    el.textContent    = count;
  if (badge) badge.textContent = count;
  if (box)   box.style.display = count > 0 ? 'flex' : 'none';
}

// ===== MODAL =====
function nvOpenModal(idx) {
  NV_CURRENT_ISSUE_IDX = idx;
  var issue = nvGetIssues()[idx];
  if (!issue) return;
  document.getElementById('nvModalCode').textContent     = '#' + issue.id;
  document.getElementById('nvModalTitle').textContent    = issue.title;
  document.getElementById('nvModalCustomer').textContent = issue.customer;
  document.getElementById('nvModalBooking').textContent  = '#BK-' + issue.id.split('-')[1];
  document.getElementById('nvModalType').textContent     = {urgent:'Khẩn cấp',issue:'Sự cố',complaint:'Phàn nàn',praise:'Khen ngợi'}[issue.type] || issue.type;
  document.getElementById('nvModalTime').textContent     = issue.time;
  document.getElementById('nvModalStatus').innerHTML     = nvStatusBadge(issue.status);
  document.getElementById('nvModalContent').textContent  = issue.title + '\n\n' + issue.desc;
  document.getElementById('nvModalStatusSelect').value   = issue.status;
  document.getElementById('nvModalOverlay').style.display = 'block';
  document.getElementById('nvModal').style.display       = 'block';
}

function nvCloseModal() {
  document.getElementById('nvModalOverlay').style.display = 'none';
  document.getElementById('nvModal').style.display        = 'none';
}

function nvUpdateStatus() {
  var issues    = nvGetIssues();
  var newStatus = document.getElementById('nvModalStatusSelect').value;
  if (NV_CURRENT_ISSUE_IDX < 0 || !issues[NV_CURRENT_ISSUE_IDX]) return;
  issues[NV_CURRENT_ISSUE_IDX].status = newStatus;
  nvSaveIssues(issues);
  nvCloseModal();
  nvRenderIssues();
  nvUpdateUrgentCount();
  showToast('✅ Đã cập nhật trạng thái yêu cầu');
}

// ===== BOOKINGS =====
function nvRenderBookings() {
  var tbody = document.getElementById('nvBookingsBody');
  if (!tbody) return;
  var db = [];
  try { db = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]'); } catch(e) {}
  var all = [];
  db.forEach(function(u) {
    try {
      var bs = JSON.parse(localStorage.getItem('vt_bookings_' + u.email) || '[]');
      bs.forEach(function(b){ all.push({ user: u.name, booking: b }); });
    } catch(e) {}
  });
  if (!all.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:40px">Chưa có đơn đặt tour nào</td></tr>'; return;
  }
  tbody.innerHTML = all.map(function(item) {
    var b = item.booking;
    return '<tr>' +
      '<td><span style="color:#2d8a4e;font-weight:700">#' + (b.code||'—') + '</span></td>' +
      '<td>' + item.user + '</td>' +
      '<td style="font-weight:600">' + (b.tourName||b.tour||'—') + '</td>' +
      '<td style="color:#888">' + (b.date||'—') + '</td>' +
      '<td style="color:#2d8a4e;font-weight:700">' + (b.total||b.price||'—') + '</td>' +
      '<td>' + (function(st) {
        var map = {
          upcoming:  '<span class="nv-badge nv-badge-pending">SẮP DIỄN RA</span>',
          confirmed: '<span class="nv-badge nv-badge-processing">ĐÃ XÁC NHẬN</span>',
          done:      '<span class="nv-badge nv-badge-done">HOÀN THÀNH</span>',
          completed: '<span class="nv-badge nv-badge-done">HOÀN THÀNH</span>',
          cancelled: '<span class="nv-badge nv-badge-urgent">ĐÃ HỦY</span>',
        };
        return map[st] || '<span class="nv-badge nv-badge-pending">SẮP DIỄN RA</span>';
      })(b.status) + '</td>' +
    '</tr>';
  }).join('');
}

// ===== LOGOUT =====
function nvLogout() {
  if (typeof doLogout === 'function') doLogout();
  else { localStorage.removeItem('vt_user'); window.location.href = '1dangnhap-nhanvien.html'; }
}