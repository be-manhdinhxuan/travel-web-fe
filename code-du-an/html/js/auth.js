// ============================================================
// auth.js – Authentication
// ============================================================

// ==========================
// UI HELPERS
// ==========================

function togglePwd(id, btn) {
  const inp = document.getElementById(id)
  if (!inp) return

  inp.type = inp.type === 'password' ? 'text' : 'password'

  if (!btn) return
  const svg = btn.querySelector('svg')
  if (!svg) return

  const isHidden = inp.type === 'password'
  svg.setAttribute('viewBox', '0 0 20 20')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')

  if (isHidden) {
    // Mật khẩu đang ẩn -> icon mắt mở
    svg.innerHTML = `
      <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6Z" stroke="currentColor" stroke-width="1.5" />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5" />
    `
    btn.setAttribute('aria-label', 'Hiện mật khẩu')
  } else {
    // Mật khẩu đang hiện -> icon mắt đóng
    svg.innerHTML = `
      <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6Z" stroke="currentColor" stroke-width="1.5" />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5" />
      <path d="M3 17L17 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    `
    btn.setAttribute('aria-label', 'Ẩn mật khẩu')
  }
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
    } else if (user.role === 2 || user.role === 'employee') {
      window.location.href = 'nhan-vien.html'
    } else {
      window.location.href = 'index.html'
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
  const dob = (document.getElementById('regDob')?.value || '').trim()
  const pwd = (document.getElementById('regPassword')?.value || '')
  const conf = (document.getElementById('regConfirm')?.value || '')
  const agree = document.getElementById('agreeTerms')?.checked
  const errBox = document.getElementById('regError')

  if (errBox) { errBox.style.display = 'none'; errBox.innerText = '' }

  if (!name) return showAuthError('regError', 'Vui lòng nhập họ và tên')
  if (!email) return showAuthError('regError', 'Vui lòng nhập email')
  if (!dob) return showAuthError('regError', 'Vui lòng chọn ngày sinh')
  if (!pwd) return showAuthError('regError', 'Vui lòng nhập mật khẩu')
  if (pwd.length < 6) return showAuthError('regError', 'Mật khẩu tối thiểu 6 ký tự')
  if (pwd !== conf) return showAuthError('regError', 'Mật khẩu xác nhận không khớp')
  if (!agree) return showAuthError('regError', 'Vui lòng đồng ý điều khoản sử dụng')

  const dobDate = new Date(`${dob}T00:00:00.000Z`)
  if (Number.isNaN(dobDate.getTime())) {
    return showAuthError('regError', 'Ngày sinh không hợp lệ')
  }
  const dobISO = dobDate.toISOString()

  try {
    if (typeof apiRegister !== 'function') {
      return showAuthError('regError', 'Thiếu hàm apiRegister. Vui lòng kiểm tra file api.js')
    }

    // Khớp chữ ký API đã khai báo: apiRegister(full_name, email, password, confirm_password, date_of_birth)
    const res = await apiRegister(name, email, pwd, conf, dobISO)

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

    const result = res?.data?.result || {}
    const accessToken = result.access_token
    const refreshToken = result.refresh_token
    const user = result.user

    // API có thể trả token ngay hoặc chỉ trả thông báo + user.
    if (accessToken) localStorage.setItem('vt_access_token', accessToken)
    if (refreshToken) localStorage.setItem('vt_refresh_token', refreshToken)
    if (user) localStorage.setItem('vt_user', JSON.stringify(user))

    if (typeof showToast === 'function') {
      showToast('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.')
    }

    // Chuyển sang xác thực email
    setTimeout(() => {
      window.location.href = 'xac-thuc.html'
    }, 900)

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
  const ruleMap = {
    regPwdRuleLength: val.length >= 6,
    regPwdRuleLower: /[a-z]/.test(val),
    regPwdRuleUpper: /[A-Z]/.test(val),
    regPwdRuleSymbol: /[^A-Za-z0-9]/.test(val)
  }

  Object.keys(ruleMap).forEach((id) => {
    const el = document.getElementById(id)
    if (!el) return
    el.classList.toggle('ok', !!ruleMap[id])
  })

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

    // Cờ để hiển thị toast sau khi redirect
    localStorage.setItem('showLoginToast', 'true')

    if (user.role === 1 || user.role === 'admin') {
      window.location.href = 'admin.html'
    } else if (user.role === 2 || user.role === 'employee') {
      window.location.href = 'nhan-vien.html'
    } else {
      window.location.href = 'index.html'
    }

  } catch (err) {
    console.error(err)
    showAuthError('loginError', 'Không thể kết nối server')
  }
}