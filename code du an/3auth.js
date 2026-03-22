// ============================================================
// 3auth.js – Authentication (kết nối API)
// ============================================================

// Tài khoản mặc định local (fallback khi chưa có backend)
const ADMIN_ACCOUNT = { email:'1', password:'1', name:'Quản trị viên', role:'admin', active:true, id:1 };
const STAFF_ACCOUNT = { email:'2', password:'2', name:'Nhân viên Vận hành', role:'staff', active:true, id:2 };

function getUserDB() {
  try {
    var raw = localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb');
    return JSON.parse(raw) || [ADMIN_ACCOUNT, STAFF_ACCOUNT];
  }
  catch(e) { return [ADMIN_ACCOUNT, STAFF_ACCOUNT]; }
}
function saveUserDB(db) {
  localStorage.setItem('vt_userdb', JSON.stringify(db));
}
// Migrate: nếu có data cũ trong sessionStorage → copy sang localStorage
(function() {
  var old = sessionStorage.getItem('vt_userdb');
  if (old && !localStorage.getItem('vt_userdb')) {
    localStorage.setItem('vt_userdb', old);
  }
  if (!localStorage.getItem('vt_userdb')) saveUserDB([ADMIN_ACCOUNT, STAFF_ACCOUNT]);
})();

// ============================================================
// UI helpers
// ============================================================
function switchAuthTab(tab) {
  const loginForm = document.getElementById('authLoginForm');
  const regForm   = document.getElementById('authRegisterForm');
  const navHint   = document.getElementById('authNavHint');
  const navBtn    = document.getElementById('authNavBtn');
  if (loginForm) loginForm.style.display = tab === 'login'    ? 'block' : 'none';
  if (regForm)   regForm.style.display   = tab === 'register' ? 'block' : 'none';
  if (tab === 'login') {
    if (navHint) navHint.textContent = 'Chưa có tài khoản?';
    if (navBtn)  { navBtn.textContent = 'Đăng ký'; navBtn.onclick = () => window.location.href='1dangky.html'; }
  } else {
    if (navHint) navHint.textContent = 'Đã có tài khoản?';
    if (navBtn)  { navBtn.textContent = 'Đăng nhập'; navBtn.onclick = () => window.location.href='1dangnhap.html'; }
  }
  ['loginError','regError'].forEach(id => { const e=document.getElementById(id); if(e) e.style.display='none'; });
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
    {pct:'20%',color:'#e55',label:'Rất yếu'},{pct:'40%',color:'#f90',label:'Yếu'},
    {pct:'60%',color:'#fc0',label:'Trung bình'},{pct:'80%',color:'#7bc',label:'Mạnh'},
    {pct:'100%',color:'#2d8a4e',label:'Rất mạnh'},
  ];
  const lv = levels[Math.min(score,4)];
  if (fill) { fill.style.width = lv.pct; fill.style.background = lv.color; }
  if (txt)  { txt.textContent = lv.label; txt.style.color = lv.color; }
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

// ============================================================
// ĐĂNG NHẬP
// ============================================================
async function doLogin() {
  const emailVal = (document.getElementById('loginEmail')?.value || '').trim();
  const pwd      = (document.getElementById('loginPassword')?.value || '');
  if (!emailVal || !pwd) { showAuthError('loginError','⚠️ Vui lòng nhập đầy đủ email và mật khẩu'); return; }

  // --- Tài khoản local (admin=1/1, staff=2/2) ---
  const localAccounts = [ADMIN_ACCOUNT, STAFF_ACCOUNT];
  const local = localAccounts.find(u => u.email === emailVal && u.password === pwd);
  if (local) {
    saveUser(local);
    redirectByRole(local.role);
    return;
  }

  // --- Gọi API ---
  const btn = document.querySelector('.auth2-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang đăng nhập...'; }

  try {
    const res = await apiLogin(emailVal, pwd);
    if (res === null) throw new Error('no_api');
    if (res.ok) {
      const { user, access_token, refresh_token } = res.data.result;
      apiSaveTokens(access_token, refresh_token);
      const u = {
        id:    user._id,
        name:  user.full_name,
        email: user.email,
        phone: user.phone || '',
        role:  user.role === 1 ? 'admin' : 'customer',
        active: true,
      };
      saveUser(u);
      redirectByRole(u.role);
    } else {
      const msg = res.data?.message || 'Email hoặc mật khẩu không đúng';
      showAuthError('loginError', '❌ ' + msg);
    }
  } catch(e) {
    // API chưa chạy → dùng localStorage
    const db   = getUserDB();
    const user = db.find(u => u.email.toLowerCase() === emailVal.toLowerCase() && u.password === pwd);
    if (!user)             { showAuthError('loginError','❌ Email hoặc mật khẩu không đúng'); }
    else if (!user.active) { showAuthError('loginError','🚫 Tài khoản đã bị khóa'); }
    else { saveUser(user); redirectByRole(user.role); }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Đăng nhập'; }
  }
}

function redirectByRole(role) {
  if (role === 'admin')      window.location.href = '1admin.html';
  else if (role === 'staff') window.location.href = '1nhanvien.html';
  else                       window.location.href = '1trangchu.html';
}

// ============================================================
// ĐĂNG KÝ
// ============================================================
async function doRegister() {
  const fullName = (document.getElementById('regFullName')?.value || '').trim();
  const email    = (document.getElementById('regEmail')?.value    || '').trim().toLowerCase();
  const phone    = (document.getElementById('regPhone')?.value    || '').trim();
  const dob      =  document.getElementById('regDob')?.value      || ''; // optional
  const pwd      = (document.getElementById('regPassword')?.value || '');
  const confirm  = (document.getElementById('regConfirm')?.value  || '');
  const agreed   =  document.getElementById('agreeTerms')?.checked;

  if (!fullName) { showAuthError('regError','⚠️ Vui lòng nhập họ và tên'); return; }
  if (!email)    { showAuthError('regError','⚠️ Vui lòng nhập email'); return; }
  if (!/\S+@\S+\.\S+/.test(email)) { showAuthError('regError','⚠️ Email không hợp lệ'); return; }
  // dob là optional – chỉ validate nếu người dùng có nhập
  if (pwd.length < 6)  { showAuthError('regError','⚠️ Mật khẩu phải có ít nhất 6 ký tự'); return; }
  if (pwd.length > 50) { showAuthError('regError','⚠️ Mật khẩu không được quá 50 ký tự'); return; }
  if (pwd !== confirm) { showAuthError('regError','❌ Mật khẩu xác nhận không khớp'); return; }
  if (!agreed)         { showAuthError('regError','⚠️ Vui lòng đồng ý với điều khoản'); return; }

  const btn = document.querySelector('.auth2-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang đăng ký...'; }

  try {
    const dobISO = dob ? new Date(dob).toISOString() : null;
    const res = await apiRegister(fullName, email, pwd, confirm, dobISO);
    if (res === null) throw new Error('no_api');
    if (res.ok) {
      const { access_token, refresh_token } = res.data.result;
      apiSaveTokens(access_token, refresh_token);
      const newUser = { name: fullName, email, phone, role: 'customer', active: true };
      saveUser(newUser);
      window.location.href = '1trangchu.html'; // TODO: đổi thành 1xacthuc.html khi có backend
    } else {
      const msg = res.data?.message || 'Đăng ký thất bại';
      showAuthError('regError','❌ ' + msg);
    }
  } catch(e) {
    // API chưa chạy → dùng localStorage
    const db = getUserDB();
    if (db.find(u => u.email.toLowerCase() === email)) {
      showAuthError('regError','❌ Email này đã được đăng ký');
      if (btn) { btn.disabled = false; btn.textContent = 'Đăng ký ngay'; }
      return;
    }
    const newUser = { id: db.length+1, email, password: pwd, name: fullName, phone, dob, role: 'customer', active: true };
    db.push(newUser);
    saveUserDB(db);
    saveUser(newUser);
    window.location.href = '1trangchu.html';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Đăng ký ngay'; }
  }
}
