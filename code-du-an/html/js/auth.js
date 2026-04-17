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

function getRedirectPathByRole(user) {
  if (!user) return 'index.html'
  var roleNum = Number(user.role)
  var roleText = String(user.role || '').toLowerCase()
  if (roleNum === 1 || roleText === 'admin') return 'admin.html'
  if (roleNum === 2 || roleText === 'employee' || roleText === 'staff') return 'nhan-vien.html'
  return 'index.html'
}

function persistAuthSession(accessToken, refreshToken, user) {
  if (accessToken) localStorage.setItem('vt_access_token', accessToken)
  else localStorage.removeItem('vt_access_token')

  if (refreshToken) localStorage.setItem('vt_refresh_token', refreshToken)
  else localStorage.removeItem('vt_refresh_token')

  if (user) localStorage.setItem('vt_user', JSON.stringify(user))
  else localStorage.removeItem('vt_user')
}

function finalizeLoginAndRedirect(accessToken, refreshToken, user) {
  persistAuthSession(accessToken, refreshToken, user)
  localStorage.setItem('showLoginToast', 'true')
  window.location.href = getRedirectPathByRole(user)
}

function tryParseOAuthUser(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (_) { }

  try {
    const decoded = atob(raw.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch (_) { }

  return null
}

function decodeJwtPayload(token) {
  try {
    var parts = String(token || '').split('.')
    if (parts.length < 2) return null
    var payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    while (payload.length % 4 !== 0) payload += '='
    var json = atob(payload)
    return JSON.parse(json)
  } catch (_) {
    return null
  }
}

function buildOAuthUserFromToken(accessToken) {
  var payload = decodeJwtPayload(accessToken)
  if (!payload || typeof payload !== 'object') return null

  var role = payload.role
  if (role === undefined && Array.isArray(payload.roles) && payload.roles.length) {
    role = payload.roles[0]
  }
  if (role === undefined && payload.user && typeof payload.user === 'object') {
    role = payload.user.role
  }

  var fullName = payload.full_name || payload.name || payload.username || payload.user_name || ''
  var email = payload.email || ''
  var status = payload.status

  if (role === undefined && !fullName && !email && status === undefined) return null

  return {
    role: role,
    name: fullName,
    full_name: fullName,
    email: email,
    status: status
  }
}

function readOAuthParams() {
  var query = new URLSearchParams(window.location.search)
  var hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  function pick(name) {
    return query.get(name) || hash.get(name) || ''
  }

  function collect(keys) {
    var picked = {}
      ; (keys || []).forEach(function (k) {
        var v = pick(k)
        if (v) picked[k] = v
      })
    return picked
  }

  var facebookCompleteContext = collect([
    'facebook_token',
    'fb_token',
    'facebook_id',
    'fb_id',
    'provider_id',
    'provider_user_id',
    'oauth_token',
    'pending_token',
    'complete_token',
    'state'
  ])

  return {
    accessToken: pick('access_token') || pick('token'),
    refreshToken: pick('refresh_token'),
    userRaw: pick('user'),
    error: pick('error'),
    facebookCompleteContext: facebookCompleteContext
  }
}

function clearOAuthParamsFromUrl() {
  try {
    window.history.replaceState({}, document.title, window.location.pathname)
  } catch (_) { }
}

function clearAuthQueryParams(keysToRemove) {
  try {
    var params = new URLSearchParams(window.location.search)
      ; (keysToRemove || []).forEach(function (k) {
        params.delete(k)
      })
    var nextUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '')
    window.history.replaceState({}, document.title, nextUrl)
  } catch (_) { }
}

async function completeOAuthLogin(accessToken, refreshToken, providedUser) {
  if (!accessToken) return { ok: false, message: 'Thiếu access token từ Google OAuth.' }

  var user = providedUser || buildOAuthUserFromToken(accessToken) || null
  if (isBannedUser(user)) {
    localStorage.clear()
    return { ok: false, message: 'Tài khoản đã bị khóa.' }
  }

  persistAuthSession(accessToken, refreshToken, user)
  finalizeLoginAndRedirect(accessToken, refreshToken, user)
  return { ok: true }
}

function handleGoogleLoginErrorFromQuery() {
  var isLoginPage = /dang-nhap\.html|login\.html$/i.test(window.location.pathname)
  if (!isLoginPage) return

  var params = new URLSearchParams(window.location.search)
  var errorCode = String(params.get('error') || '').trim().toLowerCase()
  if (!errorCode) return

  var message = ''
  if (errorCode === 'google_failed') message = 'Đăng nhập Google thất bại'
  if (errorCode === 'facebook_failed') message = 'Đăng nhập Facebook thất bại'
  if (errorCode === 'account_banned') message = 'Tài khoản đã bị khóa'
  if (errorCode === 'email_required') message = 'Facebook không cung cấp email. Vui lòng nhập email để tiếp tục.'
  if (!message) return

  if (errorCode === 'facebook_failed') {
    console.warn('[AUTH][FACEBOOK] Redirected back with facebook_failed', {
      path: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash
    })
  }

  if (errorCode === 'account_banned') {
    localStorage.clear()
  }

  if (typeof showToast === 'function') {
    showToast(message)
  } else {
    showAuthError('loginError', message)
  }

  if (!(errorCode === 'email_required' && String(params.get('provider') || '').trim().toLowerCase() === 'facebook')) {
    params.delete('error')
  }
  var nextUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash
  window.history.replaceState({}, document.title, nextUrl)
}

function initFacebookEmailRequiredFlow() {
  var isLoginPage = /dang-nhap\.html|login\.html$/i.test(window.location.pathname)
  if (!isLoginPage) return

  var params = new URLSearchParams(window.location.search)
  var error = String(params.get('error') || '').trim().toLowerCase()
  var provider = String(params.get('provider') || '').trim().toLowerCase()
  var providerId = String(params.get('provider_id') || '').trim()

  if (!(error === 'email_required' && provider === 'facebook')) return

  var form = document.getElementById('facebook-email-form')
  var input = document.getElementById('facebookEmailInput')
  var submitBtn = document.getElementById('facebookEmailSubmit')
  var loginNormalContent = document.getElementById('loginNormalContent')
  var facebookEmailState = document.getElementById('facebookEmailState')
  var facebookEmailErrorId = document.getElementById('facebookEmailError') ? 'facebookEmailError' : 'loginError'

  if (!form || !input) {
    console.error('[AUTH][FACEBOOK] Missing facebook-email-form or facebookEmailInput')
    return
  }

  if (typeof showToast === 'function') {
    showToast('Facebook không cung cấp email. Vui lòng nhập email để tiếp tục.')
  }

  if (loginNormalContent) loginNormalContent.style.display = 'none'
  if (facebookEmailState) facebookEmailState.style.display = 'block'
  input.focus()

  window.facebookProviderId = providerId

  function onSubmit(event) {
    event.preventDefault()

    var email = String(input.value || '').trim()
    if (!email) {
      showAuthError(facebookEmailErrorId, 'Vui lòng nhập email để tiếp tục')
      return
    }

    clearAuthError(facebookEmailErrorId)
    if (submitBtn) submitBtn.disabled = true

    var payload = {
      provider: 'facebook',
      provider_id: window.facebookProviderId || providerId,
      email: email
    }

    console.log('[AUTH][FACEBOOK] Completing facebook login with email', {
      hasProviderId: !!payload.provider_id,
      email: payload.email
    })

    Promise.resolve(typeof apiFacebookComplete === 'function' ? apiFacebookComplete(payload) : null)
      .then(async function (res) {
        if (!res || !res.ok) {
          var message = res?.data?.message || 'Không thể hoàn tất đăng nhập Facebook'
          showAuthError(facebookEmailErrorId, message)
          return
        }

        var result = res?.data?.result || {}
        var accessToken = result.access_token || ''
        var refreshToken = result.refresh_token || ''
        var user = result.user || null

        if (!accessToken) {
          showAuthError(facebookEmailErrorId, 'Không nhận được access token từ hệ thống')
          return
        }

        clearAuthQueryParams(['error', 'provider', 'provider_id'])
        await completeOAuthLogin(accessToken, refreshToken, user)
      })
      .catch(function (err) {
        console.error('[AUTH][FACEBOOK] /auths/facebook/complete exception', err)
        showAuthError(facebookEmailErrorId, 'Không thể kết nối server')
      })
      .finally(function () {
        if (submitBtn) submitBtn.disabled = false
      })
  }

  form.addEventListener('submit', onSubmit)
}

function doGoogleLogin() {
  // Luôn khởi tạo OAuth bằng phiên sạch để tránh dính user/token cũ.
  localStorage.removeItem('vt_access_token')
  localStorage.removeItem('vt_refresh_token')
  localStorage.removeItem('vt_user')

  var target = typeof apiGoogleLoginUrl === 'function'
    ? apiGoogleLoginUrl()
    : ((typeof API_BASE === 'string' && API_BASE) ? API_BASE.replace(/\/$/, '') + '/auths/google' : '')

  if (!target) {
    showAuthError('loginError', 'Thiếu cấu hình API để đăng nhập Google')
    return
  }

  window.location.href = target
}

function doFacebookLogin() {
  // Luôn khởi tạo OAuth bằng phiên sạch để tránh dính user/token cũ.
  localStorage.removeItem('vt_access_token')
  localStorage.removeItem('vt_refresh_token')
  localStorage.removeItem('vt_user')

  var target = typeof apiFacebookLoginUrl === 'function'
    ? apiFacebookLoginUrl()
    : ((typeof API_BASE === 'string' && API_BASE) ? API_BASE.replace(/\/$/, '') + '/auths/facebook' : '')

  if (!target) {
    console.error('[AUTH][FACEBOOK] Missing API target for Facebook login', {
      apiBase: (typeof API_BASE === 'string' ? API_BASE : null)
    })
    showAuthError('loginError', 'Thiếu cấu hình API để đăng nhập Facebook')
    return
  }

  console.log('[AUTH][FACEBOOK] Redirecting to OAuth endpoint', { target: target })

  window.location.href = target
}

async function handleOAuthSuccessPage() {
  var oauthError = document.getElementById('oauthError')
  var helpText = document.getElementById('oauthStatusText')
  var oauthTitle = document.getElementById('oauthTitle')
  var oauthEmailForm = document.getElementById('oauthEmailForm')
  var oauthEmailInput = document.getElementById('oauthEmailInput')
  var oauthEmailSubmit = document.getElementById('oauthEmailSubmit')

  var oauthPending = {
    facebookCompleteContext: {}
  }

  function setError(msg) {
    if (!oauthError) return
    oauthError.textContent = msg
    oauthError.style.display = 'block'
  }

  function clearError() {
    if (!oauthError) return
    oauthError.style.display = 'none'
    oauthError.textContent = ''
  }

  function setLoadingMode(isLoading) {
    var spinner = document.querySelector('.oauth-spinner')
    if (spinner) spinner.style.display = isLoading ? 'block' : 'none'
    if (helpText) helpText.style.display = 'block'
    if (oauthEmailForm) oauthEmailForm.style.display = 'none'
  }

  function showEmailRequiredForm(context) {
    oauthPending.facebookCompleteContext = context || {}

    if (oauthTitle) oauthTitle.textContent = 'Cần bổ sung email để hoàn tất đăng nhập Facebook'
    if (helpText) helpText.textContent = 'Facebook không trả về email. Vui lòng nhập email đang dùng để hệ thống liên kết hoặc tạo tài khoản.'

    var spinner = document.querySelector('.oauth-spinner')
    if (spinner) spinner.style.display = 'none'
    if (oauthEmailForm) oauthEmailForm.style.display = 'block'
    if (oauthEmailInput) {
      oauthEmailInput.focus()
      oauthEmailInput.select()
    }

    console.warn('[AUTH][FACEBOOK] EMAIL_REQUIRED received, waiting user email', {
      contextKeys: Object.keys(oauthPending.facebookCompleteContext || {})
    })
  }

  async function handleFacebookCompleteSubmit(event) {
    if (event) event.preventDefault()
    clearError()

    var email = String(oauthEmailInput?.value || '').trim()
    if (!email) {
      setError('Vui lòng nhập email để tiếp tục.')
      return
    }

    if (oauthEmailSubmit) oauthEmailSubmit.disabled = true
    if (helpText) helpText.textContent = 'Đang hoàn tất đăng nhập Facebook...'

    try {
      var payload = Object.assign({}, oauthPending.facebookCompleteContext || {}, {
        email: email
      })

      console.log('[AUTH][FACEBOOK] Calling /auths/facebook/complete', {
        hasEmail: !!payload.email,
        contextKeys: Object.keys(payload).filter(function (k) { return k !== 'email' })
      })

      if (typeof apiFacebookComplete !== 'function') {
        setError('Thiếu hàm apiFacebookComplete trong api.js')
        return
      }

      var res = await apiFacebookComplete(payload)
      if (!res || !res.ok) {
        var msg = res?.data?.message || 'Hoàn tất đăng nhập Facebook thất bại'
        console.warn('[AUTH][FACEBOOK] /facebook/complete failed', {
          status: res?.status,
          message: msg
        })
        setError(msg)
        return
      }

      var result = res?.data?.result || {}
      var accessToken = result.access_token || ''
      var refreshToken = result.refresh_token || ''
      var user = result.user || null

      if (!accessToken) {
        setError('Không nhận được access token sau khi hoàn tất đăng nhập Facebook.')
        return
      }

      clearOAuthParamsFromUrl()
      var done = await completeOAuthLogin(accessToken, refreshToken, user)
      if (!done.ok) {
        setError(done.message || 'Hoàn tất đăng nhập Facebook thất bại')
      }
    } catch (err) {
      console.error('[AUTH][FACEBOOK] /facebook/complete exception', {
        message: err?.message || String(err),
        stack: err?.stack || null
      })
      setError('Không thể kết nối server khi hoàn tất đăng nhập Facebook.')
    } finally {
      if (oauthEmailSubmit) oauthEmailSubmit.disabled = false
    }
  }

  if (oauthEmailForm) {
    oauthEmailForm.addEventListener('submit', handleFacebookCompleteSubmit)
  }

  async function submitOAuth(accessToken, refreshToken, userRaw) {
    clearError()

    var oauthSource = ''
    if (userRaw) oauthSource = 'provider-user-payload'
    else if (accessToken) oauthSource = 'token-only'
    else oauthSource = 'missing-token'

    console.log('[AUTH][OAUTH] submitOAuth called', {
      source: oauthSource,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasUserRaw: !!userRaw
    })

    try {
      var providedUser = tryParseOAuthUser(userRaw)
      var done = await completeOAuthLogin(accessToken, refreshToken, providedUser)
      if (!done.ok) {
        console.warn('[AUTH][OAUTH] completeOAuthLogin failed', {
          source: oauthSource,
          reason: done.message || 'unknown'
        })
        setError(done.message || 'Đăng nhập Google thất bại')
      }
    } catch (err) {
      console.error('[AUTH][OAUTH] submitOAuth exception', {
        source: oauthSource,
        message: err?.message || String(err),
        stack: err?.stack || null
      })
      setError('Đăng nhập Google thất bại')
    }
  }

  var fromUrl = readOAuthParams()
  var errorCode = String(fromUrl.error || '').trim().toLowerCase()
  console.log('[AUTH][OAUTH] oauth-success params', {
    hasAccessToken: !!fromUrl.accessToken,
    hasRefreshToken: !!fromUrl.refreshToken,
    hasUserRaw: !!fromUrl.userRaw,
    error: fromUrl.error || '',
    facebookCompleteContextKeys: Object.keys(fromUrl.facebookCompleteContext || {})
  })

  if (errorCode === 'email_required') {
    showEmailRequiredForm(fromUrl.facebookCompleteContext)
    return
  }

  if (errorCode === 'google_failed' || errorCode === 'facebook_failed' || errorCode === 'account_banned') {
    if (errorCode === 'facebook_failed') {
      console.warn('[AUTH][FACEBOOK] oauth-success received facebook_failed, redirecting to login page')
    }
    if (errorCode === 'account_banned') {
      localStorage.clear()
    }
    window.location.href = 'dang-nhap.html?error=' + encodeURIComponent(errorCode)
    return
  }

  if (fromUrl.accessToken) {
    setLoadingMode(true)
    if (helpText) helpText.textContent = 'Đang hoàn tất đăng nhập Google...'
    clearOAuthParamsFromUrl()
    await submitOAuth(fromUrl.accessToken, fromUrl.refreshToken, fromUrl.userRaw)
    return
  }

  setError('Không nhận được token đăng nhập. Vui lòng thử lại.')
  setTimeout(function () {
    window.location.href = 'dang-nhap.html?error=google_failed'
  }, 1200)
}

function isBannedUser(user) {
  if (!user) return false

  var status = user.status
  var statusText = String(status == null ? '' : status).trim().toLowerCase()
  return Number(status) === 1 || status === true || statusText === '1' || statusText === 'banned' || statusText === 'locked'
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('vt_user') || 'null')
  } catch (_) {
    return null
  }
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
  const currentUser = getStoredUser()
  if (isBannedUser(currentUser)) {
    localStorage.clear()
    window.location.href = 'dang-nhap.html'
    return
  }

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
    finalizeLoginAndRedirect(access_token, refresh_token, user)

  } catch (err) {
    console.error(err)
    showAuthError('loginError', 'Không thể kết nối server')
  }
}

window.addEventListener('DOMContentLoaded', function () {
  handleGoogleLoginErrorFromQuery()
  initFacebookEmailRequiredFlow()

  if (/oauth-success\.html$/i.test(window.location.pathname)) {
    handleOAuthSuccessPage()
  }
})