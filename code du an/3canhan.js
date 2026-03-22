// ============================================================
// 3canhan.js
// ============================================================

document.addEventListener('DOMContentLoaded', async function () {
  var u = loadUser();
  if (!u) { window.location.href = '1dangnhap.html'; return; }
  initNav();
  try {
    const res = await apiGetMe();
    if (res && res.ok && res.data.result) {
      var api = res.data.result.user || res.data.result;
      u = { ...u, name: api.full_name||u.name, email: api.email||u.email, phone: api.phone||u.phone, dob: api.date_of_birth?api.date_of_birth.slice(0,10):u.dob, address: api.address||u.address, avatar: api.avatar||u.avatar };
      saveUser(u);
    }
  } catch(e) {}
  cpLoadProfile(u);
  cpLoadForm(u);
  cpLoadBadge(u);
  await cpRenderRecentHistory(u);
  await cpRenderHistory(u);
});

// ===== PROFILE =====
function cpLoadProfile(u) {
  var saved = u.avatar || localStorage.getItem('vt_avatar_' + u.email);
  var av = document.getElementById('cpAvatar');
  var init = document.getElementById('cpAvatarInitial');
  if (av && saved) { av.style.backgroundImage='url('+saved+')'; av.style.backgroundSize='cover'; av.style.backgroundPosition='center'; if(init) init.style.display='none'; }
  else if (init) { init.textContent = (u.name||'U')[0].toUpperCase(); }
  var n = document.getElementById('cpSidebarName'); if(n) n.textContent = u.name||'—';
  var navAv = document.getElementById('navAvatarEl');
  if (navAv && saved) { navAv.style.backgroundImage='url('+saved+')'; navAv.style.backgroundSize='cover'; navAv.style.backgroundPosition='center'; navAv.textContent=''; }
}

async function changeAvatar(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    var url = e.target.result;
    var av = document.getElementById('cpAvatar');
    if (av) { av.style.backgroundImage='url('+url+')'; av.style.backgroundSize='cover'; av.style.backgroundPosition='center'; var i=document.getElementById('cpAvatarInitial'); if(i) i.style.display='none'; }
    var navAv = document.getElementById('navAvatarEl');
    if (navAv) { navAv.style.backgroundImage='url('+url+')'; navAv.style.backgroundSize='cover'; navAv.style.backgroundPosition='center'; navAv.textContent=''; }
    var u2 = loadUser(); if(u2) { localStorage.setItem('vt_avatar_'+u2.email, url); }
  };
  reader.readAsDataURL(file);
  try { const res = await apiUpdateAvatar(file); if(res&&res.ok) { var u3=loadUser(); if(u3){u3.avatar=res.data.result.avatar_url;saveUser(u3);} } } catch(e) {}
  showToast('✅ Đã cập nhật ảnh đại diện!');
}

// ===== BADGE =====
function cpLoadBadge(u) {
  var bks = JSON.parse(localStorage.getItem('vt_bookings_'+u.email)||'[]').length;
  var el = document.getElementById('cpMemberBadge'); if(!el) return;
  if(bks>=5){el.textContent='💎 Hạng Kim Cương';el.style.background='linear-gradient(135deg,#a8edea,#6ec6ff)';el.style.color='#003a6b';el.style.border='1px solid #6ec6ff';}
  else if(bks>=3){el.textContent='🥇 Hạng Vàng';el.style.background='#fff8e0';el.style.color='#a07800';el.style.border='1px solid #f0d060';}
  else{el.textContent='🥈 Thành viên vàng';el.style.background='#fff8e0';el.style.color='#a07800';el.style.border='1px solid #f0d060';}
}

// ===== FORM =====
function cpLoadForm(u) {
  var s = function(id,v){var el=document.getElementById(id);if(el)el.value=v||'';};
  s('infoName',u.name); s('infoEmail',u.email); s('infoPhone',u.phone); s('infoDob',u.dob); s('infoAddress',u.address);
}

async function saveInfo() {
  var u = loadUser(); if(!u) return;
  var name    = (document.getElementById('infoName')?.value||'').trim();
  var phone   = (document.getElementById('infoPhone')?.value||'').trim();
  var dob     = document.getElementById('infoDob')?.value||'';
  var address = (document.getElementById('infoAddress')?.value||'').trim();
  if (!name) { showToast('⚠️ Vui lòng nhập họ và tên'); return; }
  try { await apiUpdateMe({full_name:name,phone,date_of_birth:dob||undefined,address}); } catch(e) {}
  u.name=name; u.phone=phone; u.dob=dob; u.address=address;
  saveUser(u);
  var ns = document.getElementById('cpSidebarName'); if(ns) ns.textContent = name;
  var nn = document.getElementById('navUsernameEl'); if(nn) nn.textContent = name.split(' ').slice(-1)[0];
  var dn = document.getElementById('dropName'); if(dn) dn.textContent = name;
  var ok = document.getElementById('infoSuccess');
  if(ok){ok.style.display='inline-flex';setTimeout(function(){ok.style.display='none';},3000);}
  showToast('✅ Đã lưu thông tin cá nhân!');
}

// ===== TAB SWITCH =====
function switchTab(name, btn) {
  document.querySelectorAll('.cp-tab').forEach(function(t){t.classList.remove('active');t.style.display='none';});
  document.querySelectorAll('.cp-nav-item:not(.cp-nav-logout)').forEach(function(b){b.classList.remove('active');});
  var tab = document.getElementById('tab-'+name);
  if(tab){tab.classList.add('active');tab.style.display='flex';}
  if(btn) btn.classList.add('active');
  // Load data khi switch
  var u = loadUser();
  if(name==='history' && u) cpRenderHistory(u);
}

function switchTabById(name) {
  var map = {info:'cpNavInfo',history:'cpNavHistory',promotions:'cpNavPromotions',wallet:'cpNavWallet',password:'cpNavSettings'};
  var btn = document.getElementById(map[name]);
  switchTab(name, btn);
}

// ===== BUILD BOOKING ROW =====
function cpBuildBookingRow(b) {
  var isDone = b.status==='confirmed'||b.status==='done'||b.status==='completed'||b.status===2;
  var isCancelled = b.status==='cancelled'||b.status===3;
  var stCls = isCancelled?'status-cancelled':isDone?'status-done':'status-upcoming';
  var stLbl = isCancelled?'Đã hủy':isDone?'Đã hoàn thành':'Sắp diễn ra';
  var canCancel = !isDone && !isCancelled;
  var bid = b._id || b.code || '';
  var bg    = b.bg||'linear-gradient(135deg,#2d8a4e,#3aaa62)';
  var tour  = b.tourName||b.tour||(b.schedule&&b.schedule.tour&&b.schedule.tour.name)||'—';
  var date  = b.date||(b.schedule&&b.schedule.departure_date?b.schedule.departure_date.slice(0,10):'')||'—';
  var total = b.total||b.price||(b.total_amount?b.total_amount.toLocaleString('vi-VN')+'đ':'')||'—';
  var code  = b.code||b.booking_code||'—';
  var pay   = b.payment||b.payment_method||'—';
  var guests= b.guests||'—';
  return '<div class="cp-booking-item">'+
    '<div class="cp-booking-img" style="background:'+bg+';background-size:cover"></div>'+
    '<div class="cp-booking-info">'+
      '<div class="cp-booking-name">'+tour+'</div>'+
      '<div class="cp-booking-meta">📅 '+date+'</div>'+
      '<div class="cp-booking-price">'+total+'</div>'+
    '</div>'+
    '<div class="cp-booking-right">'+
      '<span class="cp-booking-status '+stCls+'">'+stLbl+'</span>'+
      '<button class="cp-detail-btn" onclick="cpShowDetail(\''+escQ(tour)+'\',\''+escQ(date)+'\',\''+escQ(guests)+'\',\''+escQ(pay)+'\',\''+escQ(total)+'\',\''+escQ(code)+'\',\''+escQ(bid)+'\')">Xem chi tiết</button>'+
    '</div>'+
  '</div>';
}

function escQ(s){ return String(s||'').replace(/'/g,"\\'"); }

// ===== MODAL =====
var _cpCurrentBookingId = '';
var _cpCurrentBookingCode = '';
var _cpCanCancel = false;

function cpShowDetail(tour,date,guests,pay,total,code,id) {
  _cpCurrentBookingId   = id   || '';
  _cpCurrentBookingCode = code || '';

  function set(eid,v){ var e=document.getElementById(eid); if(e) e.textContent=v; }
  set('cpMdTour',    tour);
  set('cpMdDate',    date);
  set('cpMdGuests',  guests);
  set('cpMdPayment', pay);
  set('cpMdTotal',   total);
  set('cpMdCode',    code);

  // Trạng thái
  var u = loadUser();
  var canCancel = false;
  if (u) {
    var bks = JSON.parse(localStorage.getItem('vt_bookings_' + u.email) || '[]');
    var bk  = bks.find(function(b){ return b.code === code || b._id === id; });
    if (bk) {
      var st = bk.status || 'upcoming';
      var stMap = { upcoming:'🟡 Sắp diễn ra', confirmed:'🟢 Đã xác nhận', done:'✅ Hoàn thành', completed:'✅ Hoàn thành', cancelled:'🔴 Đã hủy' };
      set('cpMdStatus', stMap[st] || st);
      canCancel = (st === 'upcoming' || st === 'confirmed');
    }
  }
  _cpCanCancel = canCancel;

  // Hiện/ẩn phần hủy
  var cs = document.getElementById('cpCancelSection');
  if (cs) cs.style.display = canCancel ? 'block' : 'none';

  // Reset form hủy
  var sel  = document.getElementById('cpCancelReason');
  var note = document.getElementById('cpCancelNote');
  var err  = document.getElementById('cpCancelErr');
  if (sel)  sel.value  = '';
  if (note) note.value = '';
  if (err)  err.style.display = 'none';

  // Hiện modal
  document.getElementById('cpModalOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function cpCloseModal(){
  document.getElementById('cpModalOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

// ===== HISTORY =====
async function cpRenderHistory(u) {
  var list = document.getElementById('historyList'); if(!list) return;
  list.innerHTML='<div style="text-align:center;padding:32px;color:#aaa;font-size:0.85rem">Đang tải...</div>';
  var bookings = [];
  try { var res=await apiGetMyBookings({limit:50}); if(res&&res.ok&&res.data.result) bookings=res.data.result.bookings||res.data.result||[]; } catch(e) {}
  if(!bookings.length) bookings = JSON.parse(localStorage.getItem('vt_bookings_'+u.email)||'[]');
  if(!bookings.length){
    list.innerHTML='<div class="cp-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg><p>Bạn chưa có lịch sử đặt tour nào.</p><a href="1tourdulich.html" class="cp-explore-btn">Khám phá ngay</a></div>';
    return;
  }
  list.innerHTML = bookings.map(cpBuildBookingRow).join('');
}

async function cpRenderRecentHistory(u) {
  var section = document.getElementById('recentSection');
  var list    = document.getElementById('recentHistoryList');
  if(!list) return;
  var bookings = [];
  try { var res=await apiGetMyBookings({limit:2}); if(res&&res.ok&&res.data.result) bookings=(res.data.result.bookings||res.data.result||[]).slice(0,2); } catch(e) {}
  if(!bookings.length) bookings = JSON.parse(localStorage.getItem('vt_bookings_'+u.email)||'[]').slice(0,2);
  if(!bookings.length){ if(section) section.style.display='none'; return; }
  if(section) section.style.display='';
  list.innerHTML = bookings.map(cpBuildBookingRow).join('');
  cpLoadBadge(u);
}

// ===== ĐỔI MẬT KHẨU =====
async function changePassword() {
  var u   = loadUser(); if(!u) return;
  var cur = document.getElementById('pwdCurrent')?.value||'';
  var nw  = document.getElementById('pwdNew')?.value||'';
  var cf  = document.getElementById('pwdConfirm')?.value||'';
  var err = document.getElementById('pwdError');
  var ok  = document.getElementById('pwdSuccess');
  if(err) err.style.display='none';
  if(ok)  ok.style.display='none';
  if(!cur||!nw||!cf){showPwdErr('Vui lòng điền đầy đủ tất cả các trường.',err);return;}
  if(nw.length<6){showPwdErr('Mật khẩu mới phải có ít nhất 6 ký tự.',err);return;}
  if(nw!==cf){showPwdErr('Mật khẩu xác nhận không khớp.',err);return;}
  try {
    var res = await apiChangePassword(cur,nw,cf);
    if(res&&res.ok){ apiClearTokens(); }
    else if(res){ showPwdErr('Mật khẩu hiện tại không đúng.',err); return; }
    else {
      var db=[];try{db=JSON.parse(localStorage.getItem('vt_userdb')||sessionStorage.getItem('vt_userdb')||'[]');}catch(e){}
      var uid=db.find(function(x){return x.email===u.email;});
      if(uid&&uid.password&&uid.password!==cur){showPwdErr('Mật khẩu hiện tại không đúng.',err);return;}
      if(uid){uid.password=nw;try{localStorage.setItem('vt_userdb',JSON.stringify(db));}catch(e){}try{sessionStorage.setItem('vt_userdb',JSON.stringify(db));}catch(e){}}
    }
  } catch(e) {}
  ['pwdCurrent','pwdNew','pwdConfirm'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  if(ok){ok.style.display='inline-flex';setTimeout(function(){ok.style.display='none';},3000);}
  showToast('🔒 Đổi mật khẩu thành công!');
}
function showPwdErr(msg,el){if(!el)el=document.getElementById('pwdError');if(!el)return;el.textContent=msg;el.style.display='block';}
function checkPwdStrength(val){
  var fill=document.getElementById('pwdBarFill'),txt=document.getElementById('pwdStrengthText');if(!fill)return;
  var s=0;if(val.length>=8)s++;if(/[A-Z]/.test(val))s++;if(/[0-9]/.test(val))s++;if(/[^A-Za-z0-9]/.test(val))s++;
  var lv=[{w:'0%',c:'#eee',t:''},{w:'25%',c:'#e04444',t:'Yếu'},{w:'50%',c:'#f90',t:'Trung bình'},{w:'75%',c:'#3aaa62',t:'Khá'},{w:'100%',c:'#2d8a4e',t:'Mạnh'}][s];
  fill.style.width=lv.w;fill.style.background=lv.c;if(txt){txt.textContent=lv.t;txt.style.color=lv.c;}
}
function togglePwd(id,btn){var inp=document.getElementById(id);if(!inp)return;inp.type=inp.type==='password'?'text':'password';btn.textContent=inp.type==='password'?'👁':'🙈';}

// ============================================================
// HỖ TRỢ & PHÀN NÀN
// ============================================================
var SUPPORT_KEY = 'vt_support_tickets';

function cpLoadSupportTab(u) {
  if (!u) return;
  // Load booking vào dropdown
  var bks = JSON.parse(localStorage.getItem('vt_bookings_' + u.email) || '[]');
  var sel = document.getElementById('supportBooking');
  if (sel) {
    sel.innerHTML = '<option value="">Chọn booking (nếu có)</option>';
    bks.forEach(function(b) {
      var opt = document.createElement('option');
      opt.value = b.code || '';
      opt.textContent = (b.code || '—') + ' – ' + (b.tourName || b.tour || '—');
      sel.appendChild(opt);
    });
  }
  cpRenderSupportList(u);
}

function cpSubmitSupport() {
  var u     = loadUser(); if (!u) return;
  var type  = document.getElementById('supportType')?.value    || 'other';
  var bk    = document.getElementById('supportBooking')?.value || '';
  var title = (document.getElementById('supportTitle')?.value  || '').trim();
  var body  = (document.getElementById('supportContent')?.value|| '').trim();
  var err   = document.getElementById('supportErr');
  if (err) err.style.display = 'none';

  if (!title) { if(err){err.textContent='⚠️ Vui lòng nhập tiêu đề';err.style.display='block';} return; }
  if (!body)  { if(err){err.textContent='⚠️ Vui lòng nhập nội dung';err.style.display='block';} return; }

  var typeMap = {issue:'Sự cố tour',complaint:'Phàn nàn',urgent:'Khẩn cấp',praise:'Khen ngợi',other:'Khác'};

  // Lưu vào localStorage (cả key của user lẫn key chung cho nhân viên đọc)
  var ticket = {
    id:       'ISS-' + Math.floor(1000 + Math.random() * 9000),
    customer:  u.name  || u.email,
    email:     u.email,
    booking:   bk,
    type:      type,
    typeLabel: typeMap[type] || 'Khác',
    title:     title,
    desc:      body,
    status:    type === 'urgent' ? 'urgent' : 'pending',
    time:      new Date().toLocaleString('vi-VN'),
    createdAt: new Date().toISOString(),
  };

  // Lưu vào key chung (nhân viên đọc)
  var allTickets = [];
  try { allTickets = JSON.parse(localStorage.getItem(SUPPORT_KEY) || '[]'); } catch(e) {}
  allTickets.unshift(ticket);
  localStorage.setItem(SUPPORT_KEY, JSON.stringify(allTickets));

  // Lưu vào key của user (hiện trong tab lịch sử)
  var myKey = 'vt_support_' + u.email;
  var myTickets = [];
  try { myTickets = JSON.parse(localStorage.getItem(myKey) || '[]'); } catch(e) {}
  myTickets.unshift(ticket);
  localStorage.setItem(myKey, JSON.stringify(myTickets));

  // Reset form
  ['supportTitle','supportContent'].forEach(function(id){
    var el = document.getElementById(id); if(el) el.value = '';
  });

  showToast('✅ Đã gửi yêu cầu hỗ trợ! Mã: #' + ticket.id);
  cpRenderSupportList(u);
}

function cpRenderSupportList(u) {
  var list = document.getElementById('cpSupportList'); if (!list) return;
  var myKey = 'vt_support_' + u.email;
  var tickets = [];
  try { tickets = JSON.parse(localStorage.getItem(myKey) || '[]'); } catch(e) {}

  if (!tickets.length) {
    list.innerHTML = '<div class="cp-empty" style="padding:24px 0"><p>Bạn chưa gửi yêu cầu nào</p></div>';
    return;
  }

  var stMap = {
    pending:    '<span class="cp-support-status cp-support-status-pending">Chờ xử lý</span>',
    processing: '<span class="cp-support-status cp-support-status-processing">Đang xử lý</span>',
    done:       '<span class="cp-support-status cp-support-status-done">Đã giải quyết</span>',
    urgent:     '<span class="cp-support-status cp-support-status-urgent">Khẩn cấp</span>',
  };

  list.innerHTML = tickets.map(function(t) {
    return '<div class="cp-support-item">' +
      '<div class="cp-support-item-left">' +
        '<div class="cp-support-item-code">#' + t.id + ' · ' + t.typeLabel + '</div>' +
        '<div class="cp-support-item-title">' + t.title + '</div>' +
        '<div class="cp-support-item-meta">📅 ' + t.time + (t.booking ? ' · Booking: ' + t.booking : '') + '</div>' +
      '</div>' +
      (stMap[t.status] || stMap['pending']) +
    '</div>';
  }).join('');
}

// Override switchTab để load support data khi cần
var _origSwitchTabCp = switchTab;
switchTab = function(name, btn) {
  _origSwitchTabCp(name, btn);
  if (name === 'support') {
    var u = loadUser();
    if (u) cpLoadSupportTab(u);
  }
};


// ===== HỦY BOOKING =====
async function cpCancelBooking(btn) {
  var id   = btn.dataset.id;
  var code = btn.dataset.code;
  var reason = prompt('Lý do hủy tour (tùy chọn):') ;
  if (reason === null) return; // user bấm Cancel

  btn.disabled = true; btn.textContent = 'Đang hủy...';

  // Gọi API PATCH /api/bookings/my/:id/cancel
  try {
    var res = await apiCancelBooking(id, reason || '');
    if (res && res.ok) {
      showToast('✅ Đã hủy booking thành công');
      var u = loadUser(); if(u) { await cpRenderHistory(u); await cpRenderRecentHistory(u); }
      return;
    }
  } catch(e) {}

  // Fallback local
  var u = loadUser(); if (!u) return;
  var key = 'vt_bookings_' + u.email;
  var bks = JSON.parse(localStorage.getItem(key) || '[]');
  var bk  = bks.find(function(b){ return b.code === code || b._id === id; });
  if (bk) {
    bk.status = 'cancelled';
    localStorage.setItem(key, JSON.stringify(bks));
    showToast('✅ Đã hủy booking: ' + code);
    await cpRenderHistory(u);
    await cpRenderRecentHistory(u);
  }
}


// ===== XÁC NHẬN HỦY TỪ MODAL =====
async function cpConfirmCancel() {
  var reason = document.getElementById('cpCancelReason')?.value || '';
  var note   = (document.getElementById('cpCancelNote')?.value || '').trim();
  var err    = document.getElementById('cpCancelErr');

  if (!reason) {
    if (err) { err.textContent = '⚠️ Vui lòng chọn lý do hủy'; err.style.display = 'block'; }
    return;
  }
  if (err) err.style.display = 'none';

  var fullReason = reason === 'other' ? (note || 'Lý do khác') : reason + (note ? ': ' + note : '');

  var btn = document.querySelector('#cpCancelSection button');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang hủy...'; }

  // Gọi API
  try {
    var res = await apiCancelBooking(_cpCurrentBookingId, fullReason);
    if (res && res.ok) {
      showToast('✅ Đã hủy booking thành công');
      cpCloseModal();
      var u = loadUser();
      if (u) { await cpRenderHistory(u); await cpRenderRecentHistory(u); }
      return;
    }
  } catch(e) {}

  // Fallback local
  var u = loadUser(); if (!u) return;
  var key = 'vt_bookings_' + u.email;
  var bks = JSON.parse(localStorage.getItem(key) || '[]');
  var bk  = bks.find(function(b){ return b.code === _cpCurrentBookingCode || b._id === _cpCurrentBookingId; });
  if (bk) {
    bk.status      = 'cancelled';
    bk.cancelReason = fullReason;
    localStorage.setItem(key, JSON.stringify(bks));
    showToast('✅ Đã hủy: ' + _cpCurrentBookingCode);
    cpCloseModal();
    await cpRenderHistory(u);
    await cpRenderRecentHistory(u);
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Xác nhận hủy chuyến'; }
}

// ============================================================
// ĐỔI SỐ ĐIỆN THOẠI
// ============================================================
var _cpPhoneOtp = '';
var _cpOtpTimer = null;

function cpInitPhoneTab(u) {
  var el = document.getElementById('phoneOld');
  if (el) el.value = u.phone || '—';
}

function cpSendPhoneOtp() {
  var newPhone = (document.getElementById('phoneNew')?.value || '').trim();
  var err = document.getElementById('phoneError');
  if (err) err.style.display = 'none';

  if (!newPhone || newPhone.length < 9) {
    if (err) { err.textContent = '⚠️ Vui lòng nhập số điện thoại mới hợp lệ'; err.style.display = 'block'; }
    return;
  }

  // Tạo OTP 6 số (fallback khi chưa có backend)
  _cpPhoneOtp = Math.floor(100000 + Math.random() * 900000).toString();

  // Hiện OTP dạng banner (giống quên mật khẩu)
  var existing = document.getElementById('cpPhoneOtpBanner');
  if (existing) existing.remove();
  var banner = document.createElement('div');
  banner.id = 'cpPhoneOtpBanner';
  banner.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1a2a3a;color:#fff;padding:14px 28px;border-radius:12px;font-size:0.9rem;font-weight:600;z-index:9999;box-shadow:0 8px 30px rgba(0,0,0,0.3);text-align:center';
  banner.innerHTML = '📱 Mã OTP của bạn: <span style="color:#3aaa62;font-size:1.1rem;letter-spacing:4px;margin-left:8px">' + _cpPhoneOtp + '</span>';
  document.body.appendChild(banner);
  setTimeout(function(){ if(banner.parentNode) banner.remove(); }, 30000);

  showToast('📱 Mã OTP đã được gửi!');

  // Countdown nút gửi lại
  var btn = document.getElementById('cpOtpBtn');
  var sec = 60;
  if (btn) { btn.disabled = true; btn.textContent = 'Gửi lại (60s)'; }
  clearInterval(_cpOtpTimer);
  _cpOtpTimer = setInterval(function() {
    sec--;
    if (btn) btn.textContent = 'Gửi lại (' + sec + 's)';
    if (sec <= 0) {
      clearInterval(_cpOtpTimer);
      if (btn) { btn.disabled = false; btn.textContent = 'Gửi mã'; }
    }
  }, 1000);
}

function cpChangePhone() {
  var newPhone = (document.getElementById('phoneNew')?.value  || '').trim();
  var otp      = (document.getElementById('phoneOtp')?.value  || '').trim();
  var err      = document.getElementById('phoneError');
  var suc      = document.getElementById('phoneSuccess');
  if (err) err.style.display = 'none';
  if (suc) suc.style.display = 'none';

  if (!newPhone) { if(err){err.textContent='⚠️ Vui lòng nhập số điện thoại mới';err.style.display='block';} return; }
  if (!otp)      { if(err){err.textContent='⚠️ Vui lòng nhập mã xác nhận';err.style.display='block';} return; }
  if (!_cpPhoneOtp) { if(err){err.textContent='⚠️ Vui lòng gửi mã xác nhận trước';err.style.display='block';} return; }
  if (otp !== _cpPhoneOtp) { if(err){err.textContent='❌ Mã xác nhận không đúng';err.style.display='block';} return; }

  // Cập nhật user
  var u = loadUser();
  if (!u) return;
  u.phone = newPhone;
  saveUser(u);

  // Cập nhật localStorage userdb
  try {
    var db = JSON.parse(localStorage.getItem('vt_userdb') || '[]');
    var idx = db.findIndex(function(x){ return x.email === u.email; });
    if (idx >= 0) { db[idx].phone = newPhone; localStorage.setItem('vt_userdb', JSON.stringify(db)); }
  } catch(e) {}

  // Cập nhật hiển thị
  var oldEl = document.getElementById('phoneOld');
  if (oldEl) oldEl.value = newPhone;
  if (document.getElementById('phoneNew')) document.getElementById('phoneNew').value = '';
  if (document.getElementById('phoneOtp')) document.getElementById('phoneOtp').value = '';
  _cpPhoneOtp = '';

  // Xóa banner OTP
  var banner = document.getElementById('cpPhoneOtpBanner');
  if (banner) banner.remove();

  if (suc) { suc.style.display = 'flex'; setTimeout(function(){ suc.style.display='none'; }, 3000); }
  showToast('✅ Đã cập nhật số điện thoại!');
}

function cpResetPhoneForm() {
  ['phoneNew','phoneOtp'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
  var err = document.getElementById('phoneError'); if(err) err.style.display='none';
  var suc = document.getElementById('phoneSuccess'); if(suc) suc.style.display='none';
  _cpPhoneOtp = '';
  var banner = document.getElementById('cpPhoneOtpBanner'); if(banner) banner.remove();
}

// Override switchTab để init phone tab
var _origSwitchTabCp2 = typeof switchTab === 'function' ? switchTab : null;
if (_origSwitchTabCp2) {
  switchTab = function(name, btn) {
    _origSwitchTabCp2(name, btn);
    if (name === 'password') {
      var u = loadUser(); if(u) cpInitPhoneTab(u);
    }
    if (name === 'promotions') {
      if (typeof cpRenderWishlist === 'function') cpRenderWishlist();
    }
  };
}