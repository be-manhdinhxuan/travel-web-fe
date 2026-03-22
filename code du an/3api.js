// ============================================================
// 3api.js – API Client cho VietnamTravel
// Kết nối với backend theo tài liệu API Documentation
// ============================================================

const API_BASE = 'http://localhost:3000/api'; // ← Đổi thành URL backend thật khi deploy

// ============================================================
// CORE – Hàm gọi API trung tâm
// ============================================================
async function apiCall(method, endpoint, body = null, requireAuth = false) {
  const headers = { 'Content-Type': 'application/json' };

  if (requireAuth) {
    const token = localStorage.getItem('vt_access_token');
    if (token) headers['Authorization'] = 'Bearer ' + token;
  }

  const options = { method, headers };
  if (body && method !== 'GET') options.body = JSON.stringify(body);

  try {
    let res = await fetch(API_BASE + endpoint, options);

    // Token hết hạn → tự động refresh
    if (res.status === 401 && requireAuth) {
      const refreshed = await apiRefreshToken();
      if (refreshed) {
        headers['Authorization'] = 'Bearer ' + localStorage.getItem('vt_access_token');
        res = await fetch(API_BASE + endpoint, { method, headers, body: options.body });
      } else {
        // Refresh cũng hết hạn → buộc đăng xuất
        apiLogoutLocal();
        window.location.href = '1dangnhap.html';
        return null;
      }
    }

    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    // Backend chưa chạy hoặc mạng lỗi → trả null để caller tự fallback
    console.warn('API unavailable:', endpoint, err.message);
    return null;
  }
}

// Upload file (multipart/form-data)
async function apiUpload(endpoint, formData, requireAuth = true) {
  const headers = {};
  if (requireAuth) {
    const token = localStorage.getItem('vt_access_token');
    if (token) headers['Authorization'] = 'Bearer ' + token;
  }
  try {
    const res = await fetch(API_BASE + endpoint, { method: 'PATCH', headers, body: formData });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.warn('Upload unavailable:', err.message);
    return null;
  }
}

// ============================================================
// TOKEN MANAGEMENT
// ============================================================
function apiSaveTokens(accessToken, refreshToken) {
  localStorage.setItem('vt_access_token', accessToken);
  localStorage.setItem('vt_refresh_token', refreshToken);
}

function apiClearTokens() {
  localStorage.removeItem('vt_access_token');
  localStorage.removeItem('vt_refresh_token');
}

async function apiRefreshToken() {
  const refreshToken = localStorage.getItem('vt_refresh_token');
  if (!refreshToken) return false;
  try {
    const res = await fetch(API_BASE + '/auth/refresh-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    if (!res.ok) return false;
    const data = await res.json();
    // Rotate: lưu cả access_token và refresh_token mới
    if (data.result && data.result.access_token && data.result.refresh_token) {
      apiSaveTokens(data.result.access_token, data.result.refresh_token);
      return true;
    }
    return false;
  } catch(e) { return false; }
}

function apiLogoutLocal() {
  apiClearTokens();
  localStorage.removeItem('vt_user');
}

// ============================================================
// AUTH APIs
// ============================================================

// POST /api/auth/register
async function apiRegister(fullName, email, password, confirmPassword, dateOfBirth) {
  const body = { full_name: fullName, email, password, confirm_password: confirmPassword };
  if (dateOfBirth) body.date_of_birth = dateOfBirth;
  return apiCall('POST', '/auth/register', body);
}

// POST /api/auth/login
async function apiLogin(email, password) {
  return apiCall('POST', '/auth/login', { email, password });
}

// POST /api/auth/logout
async function apiLogout() {
  const refreshToken = localStorage.getItem('vt_refresh_token');
  return apiCall('POST', '/auth/logout', { refresh_token: refreshToken }, true);
}

// POST /api/auth/forgot-password
async function apiForgotPassword(email) {
  return apiCall('POST', '/auth/forgot-password', { email });
}

// POST /api/auth/verify-forgot-password
async function apiVerifyForgotPassword(token) {
  return apiCall('POST', '/auth/verify-forgot-password', { forgot_password_token: token });
}

// POST /api/auth/reset-password
async function apiResetPassword(token, newPassword, confirmPassword) {
  return apiCall('POST', '/auth/reset-password', {
    forgot_password_token: token,
    new_password: newPassword,
    confirm_password: confirmPassword
  });
}

// POST /api/auth/verify-email
async function apiVerifyEmail(token) {
  return apiCall('POST', '/auth/verify-email', { email_verify_token: token });
}

// POST /api/auth/resend-verify-email
async function apiResendVerifyEmail() {
  return apiCall('POST', '/auth/resend-verify-email', null, true);
}

// ============================================================
// USER APIs
// ============================================================

// GET /api/users/me
async function apiGetMe() {
  return apiCall('GET', '/users/me', null, true);
}

// PUT /api/users/me
async function apiUpdateMe(data) {
  return apiCall('PUT', '/users/me', data, true);
}

// PATCH /api/users/me/avatar
async function apiUpdateAvatar(file) {
  const form = new FormData();
  form.append('avatar', file);
  return apiUpload('/users/me/avatar', form);
}

// PATCH /api/users/me/password
async function apiChangePassword(password, newPassword, confirmNewPassword) {
  return apiCall('PATCH', '/users/me/password', {
    password,
    new_password: newPassword,
    confirm_new_password: confirmNewPassword
  }, true);
}

// POST /api/users/me/wishlist/:tour_id
async function apiToggleWishlist(tourId) {
  return apiCall('POST', '/users/me/wishlist/' + tourId, null, true);
}

// GET /api/users/me/wishlist
async function apiGetWishlist() {
  return apiCall('GET', '/users/me/wishlist', null, true);
}

// ============================================================
// TOUR APIs
// ============================================================

// GET /api/tours
async function apiGetTours(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') query.append(k, v); });
  const qs = query.toString() ? '?' + query.toString() : '';
  return apiCall('GET', '/tours' + qs);
}

// GET /api/tours/:slug
async function apiGetTour(slug) {
  return apiCall('GET', '/tours/' + slug);
}

// GET /api/tours/:tour_id/schedules
async function apiGetSchedules(tourId, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) query.append(k, v); });
  const qs = query.toString() ? '?' + query.toString() : '';
  return apiCall('GET', '/tours/' + tourId + '/schedules' + qs);
}

// POST /api/tours (Admin)
async function apiCreateTour(data) {
  return apiCall('POST', '/tours', data, true);
}

// PUT /api/tours/:id (Admin)
async function apiUpdateTour(id, data) {
  return apiCall('PUT', '/tours/' + id, data, true);
}

// PATCH /api/tours/:id/status (Admin)
async function apiToggleTourStatus(id, status) {
  return apiCall('PATCH', '/tours/' + id + '/status', { status }, true);
}

// DELETE /api/tours/:id (Admin)
async function apiDeleteTour(id) {
  return apiCall('DELETE', '/tours/' + id, null, true);
}

// ============================================================
// BOOKING APIs
// ============================================================

// POST /api/bookings
async function apiCreateBooking(data) {
  return apiCall('POST', '/bookings', data, true);
}

// GET /api/bookings/my
async function apiGetMyBookings(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) query.append(k, v); });
  const qs = query.toString() ? '?' + query.toString() : '';
  return apiCall('GET', '/bookings/my' + qs, null, true);
}

// GET /api/bookings/my/:id
async function apiGetMyBooking(id) {
  return apiCall('GET', '/bookings/my/' + id, null, true);
}

// PATCH /api/bookings/my/:id/cancel
async function apiCancelBooking(id, reason = '') {
  return apiCall('PATCH', '/bookings/my/' + id + '/cancel', { reason }, true);
}

// ============================================================
// PAYMENT APIs
// ============================================================

// POST /api/payments/momo
async function apiPayMomo(bookingId) {
  return apiCall('POST', '/payments/momo', { booking_id: bookingId }, true);
}

// POST /api/payments/vnpay
async function apiPayVnpay(bookingId) {
  return apiCall('POST', '/payments/vnpay', { booking_id: bookingId }, true);
}

// ============================================================
// COUPON APIs
// ============================================================

// POST /api/coupons/validate
async function apiValidateCoupon(code, orderValue) {
  return apiCall('POST', '/coupons/validate', { code, order_value: orderValue }, true);
}

// ============================================================
// ADMIN – STATISTICS
// ============================================================

// GET /api/admin/stats/overview
async function apiGetStatsOverview(period = 'month') {
  return apiCall('GET', '/admin/stats/overview?period=' + period, null, true);
}

// GET /api/admin/stats/revenue
async function apiGetStatsRevenue(period = 'month', year) {
  const qs = '?period=' + period + (year ? '&year=' + year : '');
  return apiCall('GET', '/admin/stats/revenue' + qs, null, true);
}

// GET /api/admin/stats/top-tours
async function apiGetTopTours(period = 'month', limit = 10) {
  return apiCall('GET', '/admin/stats/top-tours?period=' + period + '&limit=' + limit, null, true);
}

// ============================================================
// ADMIN – COUPONS
// ============================================================
async function apiAdminGetCoupons(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiCall('GET', '/coupons' + (qs ? '?' + qs : ''), null, true);
}
async function apiAdminCreateCoupon(data)      { return apiCall('POST',  '/coupons',           data, true); }
async function apiAdminUpdateCoupon(id, data)  { return apiCall('PUT',   '/coupons/' + id,     data, true); }
async function apiAdminToggleCoupon(id)        { return apiCall('PATCH', '/coupons/' + id + '/toggle', null, true); }

// ============================================================
// ADMIN – USERS
// ============================================================
async function apiAdminGetUsers(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiCall('GET', '/users' + (qs ? '?' + qs : ''), null, true);
}
async function apiAdminGetUser(id)             { return apiCall('GET',   '/users/' + id,              null, true); }
async function apiAdminSetUserRole(id, role)   { return apiCall('PATCH', '/users/' + id + '/role',   { role }, true); }
async function apiAdminSetUserStatus(id, status){ return apiCall('PATCH', '/users/' + id + '/status',{ status }, true); }

// ============================================================
// ADMIN – BOOKINGS
// ============================================================
async function apiAdminGetBookings(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiCall('GET', '/bookings' + (qs ? '?' + qs : ''), null, true);
}
async function apiAdminGetBooking(id)          { return apiCall('GET',   '/bookings/' + id,               null, true); }
async function apiAdminUpdateBooking(id, status, reason = '') {
  return apiCall('PATCH', '/bookings/' + id + '/status', { status, cancelled_reason: reason }, true);
}

// ============================================================
// CATEGORIES
// ============================================================
async function apiGetCategories()              { return apiCall('GET', '/categories'); }
async function apiGetCategory(id)              { return apiCall('GET', '/categories/' + id); }
async function apiAdminCreateCategory(data)    { return apiCall('POST',   '/categories',      data, true); }
async function apiAdminUpdateCategory(id, data){ return apiCall('PUT',    '/categories/' + id, data, true); }
async function apiAdminDeleteCategory(id)      { return apiCall('DELETE', '/categories/' + id, null, true); }

// ============================================================
// SCHEDULES (Admin)
// ============================================================
async function apiAdminCreateSchedule(tourId, data) { return apiCall('POST',   '/tours/' + tourId + '/schedules', data, true); }
async function apiAdminUpdateSchedule(id, data)     { return apiCall('PUT',    '/schedules/' + id,               data, true); }
async function apiAdminDeleteSchedule(id)           { return apiCall('DELETE', '/schedules/' + id,               null, true); }