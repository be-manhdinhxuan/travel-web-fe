// ============================================================
// 3auth.js – Authentication (clean version)
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
  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value.trim()
  const errorBox = document.getElementById('loginError')

  errorBox.style.display = 'none'
  errorBox.innerText = ''

  if (!email || !password) {
    errorBox.innerText = 'Vui lòng nhập đầy đủ thông tin'
    errorBox.style.display = 'block'
    return
  }

  try {
    const res = await apiLogin(email, password)

    console.log('LOGIN:', res)

    if (!res || !res.ok) {
      let message = 'Đăng nhập thất bại'

      // 🔥 lấy lỗi từ errors (ưu tiên)
      if (res?.data?.errors) {
        const firstError = Object.values(res.data.errors)[0]
        if (firstError?.msg) {
          message = firstError.msg
        }
      }

      // fallback message
      else if (res?.data?.message) {
        message = res.data.message
      }

      errorBox.innerText = message
      errorBox.style.display = 'block'
      return
    }

    const { access_token, refresh_token, user } = res.data.result

    localStorage.setItem('vt_access_token', access_token)
    localStorage.setItem('vt_refresh_token', refresh_token)
    localStorage.setItem('vt_user', JSON.stringify(user))

    if (user.role === ROLE.ADMIN) {
      window.location.href = '1admin.html'
    } else {
      window.location.href = '1trangchu.html'
    }

  } catch (err) {
    console.error(err)
    errorBox.innerText = 'Không thể kết nối server'
    errorBox.style.display = 'block'
  }
}
