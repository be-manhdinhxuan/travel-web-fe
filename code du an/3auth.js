// ============================================================
// AUTH SYSTEM
// ============================================================

// Tài khoản mặc định
const ADMIN_ACCOUNT = {
  email: '1', password: '1',
  name: 'Quản trị viên', role: 'admin', active: true, id: 1
};
const STAFF_ACCOUNT = {
  email: '2', password: '2',
  name: 'Nhân viên Vận hành', role: 'staff', active: true, id: 2
};

function getUserDB() {
  try { return JSON.parse(sessionStorage.getItem('vt_userdb')) || [ADMIN_ACCOUNT, STAFF_ACCOUNT]; }
  catch(e) { return [ADMIN_ACCOUNT, STAFF_ACCOUNT]; }
}
function saveUserDB(db) { sessionStorage.setItem('vt_userdb', JSON.stringify(db)); }
if (!sessionStorage.getItem('vt_userdb')) saveUserDB([ADMIN_ACCOUNT, STAFF_ACCOUNT]);

function switchAuthTab(tab) {
  const loginForm = document.getElementById('authLoginForm');
  const regForm   = document.getElementById('authRegisterForm');
  const navHint   = document.getElementById('authNavHint');
  const navBtn    = document.getElementById('authNavBtn');
  if (loginForm) loginForm.style.display = tab === 'login' ? 'block' : 'none';
  if (regForm)   regForm.style.display   = tab === 'register' ? 'block' : 'none';
  if (tab === 'login') {
    if (navHint) navHint.textContent = 'Chưa có tài khoản?';
    if (navBtn)  { navBtn.textContent = 'Đăng ký'; navBtn.onclick = () => window.location.href='1dangky.html'; }
  } else {
    if (navHint) navHint.textContent = 'Đã có tài khoản?';
    if (navBtn)  { navBtn.textContent = 'Đăng nhập'; navBtn.onclick = () => window.location.href='1dangnhap.html'; }
  }
  const le = document.getElementById('loginError');
  const re = document.getElementById('regError');
  if (le) le.style.display = 'none';
  if (re) re.style.display = 'none';
}

function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function checkPasswordStrength(val) {
  const box  = document.getElementById('pwdStrength');
  const fill = document.getElementById('pwdBarFill');
  const txt  = document.getElementById('pwdStrengthText');
  if (!box) return;
  if (!val) { box.style.display = 'none'; return; }
  box.style.display = 'flex';
  let score = 0;
  if (val.length >= 6)           score++;
  if (val.length >= 10)          score++;
  if (/[A-Z]/.test(val))         score++;
  if (/[0-9]/.test(val))         score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const levels = [
    { pct:'20%', color:'#e55',    label:'Rất yếu' },
    { pct:'40%', color:'#f90',    label:'Yếu' },
    { pct:'60%', color:'#fc0',    label:'Trung bình' },
    { pct:'80%', color:'#7bc',    label:'Mạnh' },
    { pct:'100%',color:'#2d8a4e', label:'Rất mạnh' },
  ];
  const lv = levels[Math.min(score, 4)];
  if (fill) { fill.style.width = lv.pct; fill.style.background = lv.color; }
  if (txt)  { txt.textContent = lv.label; txt.style.color = lv.color; }
}

function doLogin() {
  const email = (document.getElementById('loginEmail')?.value || '').trim().toLowerCase();
  const pwd   = (document.getElementById('loginPassword')?.value || '');
  if (!email || !pwd) { showAuthError('loginError', '⚠️ Vui lòng nhập đầy đủ email và mật khẩu'); return; }
  const db   = getUserDB();
  const user = db.find(u => u.email.toLowerCase() === email && u.password === pwd);
  if (!user)        { showAuthError('loginError', '❌ Email hoặc mật khẩu không đúng'); return; }
  if (!user.active) { showAuthError('loginError', '🚫 Tài khoản đã bị khóa'); return; }
  saveUser(user);
  if (user.role === 'admin')       window.location.href = '1admin.html';
  else if (user.role === 'staff')  window.location.href = '1nhanvien.html';
  else                             window.location.href = '1trangchu.html';
}

function doRegister() {
  const fullName = (document.getElementById('regFullName')?.value || '').trim();
  const email    = (document.getElementById('regEmail')?.value    || '').trim().toLowerCase();
  const phone    = (document.getElementById('regPhone')?.value    || '').trim();
  const pwd      = (document.getElementById('regPassword')?.value || '');
  const confirm  = (document.getElementById('regConfirm')?.value  || '');
  const agreed   =  document.getElementById('agreeTerms')?.checked;
  if (!fullName) { showAuthError('regError', '⚠️ Vui lòng nhập họ và tên'); return; }
  if (!email)    { showAuthError('regError', '⚠️ Vui lòng nhập email'); return; }
  if (!/\S+@\S+\.\S+/.test(email)) { showAuthError('regError', '⚠️ Email không hợp lệ'); return; }
  const db = getUserDB();
  if (db.find(u => u.email.toLowerCase() === email)) { showAuthError('regError', '❌ Email này đã được đăng ký'); return; }
  if (pwd.length < 6)  { showAuthError('regError', '⚠️ Mật khẩu phải có ít nhất 6 ký tự'); return; }
  if (pwd !== confirm) { showAuthError('regError', '❌ Mật khẩu xác nhận không khớp'); return; }
  if (!agreed)         { showAuthError('regError', '⚠️ Vui lòng đồng ý với điều khoản'); return; }
  const newUser = { id: db.length + 1, email, password: pwd, name: fullName, phone, role: 'user', active: true };
  db.push(newUser);
  saveUserDB(db);
  saveUser(newUser);
  window.location.href = '1trangchu.html';
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent   = msg;
  el.style.display = 'block';
}