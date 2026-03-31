// ============================================================
// auth.js – Authentication
// ============================================================

// ==========================
// UI HELPERS
// ==========================

function togglePwd(id) {
  const inp = document.getElementById(id)
  if (!inp) return
  inp.type = inp.type === 'password' ? 'text' : 'password'
}

function showAuthError(id, msg) {
  const el = document.getElementById(id)
  if (!el) return
  el.innerText = msg
  el.style.display = 'block'
}

function clearAuthError(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.style.display = 'none'
}

// ==========================
// LOGIN
// ==========================

async function handleLogin() {
  const email = (document.getElementById('email')?.value || '').trim()
  const password = (document.getElementById('password')?.value || '').trim()
  const errorBox = document.getElementById('loginError')

  if (errorBox) { errorBox.style.display = 'none'; errorBox.innerText = '' }

  if (!email || !password) {
    showAuthError('loginError', 'Vui lòng nhập đầy đủ thông tin')
    return
  }

  try {
    const res = await apiLogin(email, password)

    if (!res || !res.ok) {
      let message = 'Đăng nhập thất bại'
      if (res?.data?.errors) {
        const firstError = Object.values(res.data.errors)[0]
        if (firstError?.msg) message = firstError.msg
      } else if (res?.data?.message) {
        message = res.data.message
      }
      showAuthError('loginError', message)
      return
    }

    const { access_token, refresh_token, user } = res.data.result

    localStorage.setItem('vt_access_token', access_token)
    localStorage.setItem('vt_refresh_token', refresh_token)
    localStorage.setItem('vt_user', JSON.stringify(user))

    // Redirect theo role
    if (user.role === 1 || user.role === 'admin') {
      window.location.href = 'admin.html'
    } else if (user.role === 2 || user.role === 'staff') {
      window.location.href = 'nhan-vien.html'
    } else {
      window.location.href = 'trang-chu.html'
    }

  } catch (err) {
    console.error(err)
    showAuthError('loginError', 'Không thể kết nối server')
  }
}

// ==========================
// REGISTER
// ==========================

async function doRegister() {
  const name = (document.getElementById('regFullName')?.value || '').trim()
  const email = (document.getElementById('regEmail')?.value || '').trim()
  const pwd = (document.getElementById('regPassword')?.value || '')
  const conf = (document.getElementById('regConfirm')?.value || '')
  const agree = document.getElementById('agreeTerms')?.checked
  const errBox = document.getElementById('regError')

  if (errBox) { errBox.style.display = 'none'; errBox.innerText = '' }

  if (!name) return showAuthError('regError', 'Vui lòng nhập họ và tên')
  if (!email) return showAuthError('regError', 'Vui lòng nhập email')
  if (!pwd) return showAuthError('regError', 'Vui lòng nhập mật khẩu')
  if (pwd.length < 6) return showAuthError('regError', 'Mật khẩu tối thiểu 6 ký tự')
  if (pwd !== conf) return showAuthError('regError', 'Mật khẩu xác nhận không khớp')
  if (!agree) return showAuthError('regError', 'Vui lòng đồng ý điều khoản sử dụng')

  try {
    const res = await apiRegister(name, email, pwd, conf)

    if (!res || !res.ok) {
      let msg = 'Đăng ký thất bại'
      if (res?.data?.errors) {
        const first = Object.values(res.data.errors)[0]
        if (first?.msg) msg = first.msg
      } else if (res?.data?.message) {
        msg = res.data.message
      }
      return showAuthError('regError', msg)
    }

    const { access_token, refresh_token, user } = res.data.result
    localStorage.setItem('vt_access_token', access_token)
    localStorage.setItem('vt_refresh_token', refresh_token)
    localStorage.setItem('vt_user', JSON.stringify(user))

    // Chuyển sang xác thực email
    window.location.href = 'xac-thuc.html'

  } catch (err) {
    console.error(err)
    showAuthError('regError', 'Không thể kết nối server')
  }
}

// ==========================
// PASSWORD STRENGTH
// ==========================

function checkPasswordStrength(val) {
  const fill = document.getElementById('pwdBarFill')
  const txt = document.getElementById('pwdStrengthText')
  if (!fill) return

  let score = 0
  if (val.length >= 6) score++
  if (val.length >= 10) score++
  if (/[A-Z]/.test(val)) score++
  if (/[0-9]/.test(val)) score++
  if (/[^A-Za-z0-9]/.test(val)) score++

  const levels = [
    { w: '0%', c: '#eee', t: '' },
    { w: '25%', c: '#e04444', t: 'Yếu' },
    { w: '50%', c: '#f90', t: 'Trung bình' },
    { w: '75%', c: '#3aaa62', t: 'Khá mạnh' },
    { w: '100%', c: '#2d8a4e', t: 'Rất mạnh' },
  ]
  const lv = levels[Math.min(score, 4)]
  fill.style.width = lv.w
  fill.style.background = lv.c
  if (txt) { txt.textContent = lv.t; txt.style.color = lv.c }
}

// ==========================
// LOGOUT
// ==========================

async function doLogout() {
  try {
    const refresh_token = localStorage.getItem('vt_refresh_token')
    if (refresh_token && typeof apiLogout === 'function') {
      await apiLogout(refresh_token)
    }
  } catch (e) { }
  apiLogoutLocal()
  window.location.href = 'dang-nhap.html'
}
// ==========================
// doLogin — alias cho trang dang-nhap.html (code-demo dùng id loginEmail/loginPassword)
// ==========================

async function doLogin() {
  const email = (document.getElementById('loginEmail')?.value || '').trim()
  const password = (document.getElementById('loginPassword')?.value || '').trim()
  const errorBox = document.getElementById('loginError')

  if (errorBox) { errorBox.style.display = 'none'; errorBox.innerText = '' }

  if (!email || !password) {
    showAuthError('loginError', 'Vui lòng nhập đầy đủ thông tin')
    return
  }

  try {
    const res = await apiLogin(email, password)

    if (!res || !res.ok) {
      let message = 'Đăng nhập thất bại'
      if (res?.data?.errors) {
        const firstError = Object.values(res.data.errors)[0]
        if (firstError?.msg) message = firstError.msg
      } else if (res?.data?.message) {
        message = res.data.message
      }
      showAuthError('loginError', message)
      return
    }

    const { access_token, refresh_token, user } = res.data.result
    localStorage.setItem('vt_access_token', access_token)
    localStorage.setItem('vt_refresh_token', refresh_token)
    localStorage.setItem('vt_user', JSON.stringify(user))

    if (user.role === 1 || user.role === 'admin') {
      window.location.href = 'admin.html'
    } else if (user.role === 2 || user.role === 'staff') {
      window.location.href = 'nhan-vien.html'
    } else {
      window.location.href = 'trang-chu.html'
    }

  } catch (err) {
    console.error(err)
    showAuthError('loginError', 'Không thể kết nối server')
  }
}