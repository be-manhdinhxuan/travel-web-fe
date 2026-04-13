const API_BASE = "http://localhost:5000/api";

function isVerifyCheckRequired(method, endpoint) {
  const cleanEndpoint = String(endpoint || '').split('?')[0];
  if (method === 'GET') return false;

  // Cho phép thao tác auth cơ bản ngay cả khi chưa verify
  if (cleanEndpoint === '/auths/logout') return false;
  if (cleanEndpoint === '/auths/refresh-token') return false;
  if (cleanEndpoint === '/auths/resend-verify-email') return false;

  return true;
}

function ensureUserVerified(actionName) {
  if (typeof checkUserVerifiedForAction === 'undefined') return true;
  return checkUserVerifiedForAction(actionName || 'thực hiện thao tác này');
}

function getActionNameFromEndpoint(method, endpoint) {
  const cleanEndpoint = String(endpoint || '').split('?')[0];

  if (cleanEndpoint.includes('/bookings') || cleanEndpoint.includes('/payments')) return 'đặt tour/thanh toán';
  if (cleanEndpoint.includes('/wishlist')) return 'thêm tour vào yêu thích';
  if (cleanEndpoint.includes('/users/me/password')) return 'đổi mật khẩu';
  if (cleanEndpoint.includes('/users/me/avatar')) return 'cập nhật avatar';
  if (cleanEndpoint.includes('/users/me')) return 'cập nhật hồ sơ';
  if (cleanEndpoint.includes('/coupons/validate')) return 'áp dụng mã giảm giá';
  if (cleanEndpoint.includes('/categories') || cleanEndpoint.includes('/tours') || cleanEndpoint.includes('/schedules')) return 'quản lý dữ liệu tour';

  return method === 'DELETE' ? 'xóa dữ liệu' : 'thực hiện thao tác này';
}

// ============================================================
// CORE — wrapper chính
// ============================================================

async function apiCall(method, endpoint, body = null, requireAuth = false) {
  if (requireAuth && isVerifyCheckRequired(method, endpoint)) {
    const actionName = getActionNameFromEndpoint(method, endpoint);
    if (!ensureUserVerified(actionName)) {
      return { ok: false, status: 403, data: { message: 'Vui lòng xác thực email trước' } };
    }
  }

  const headers = {
    "Content-Type": "application/json",
  };

  if (requireAuth) {
    const token = localStorage.getItem("vt_access_token");
    if (token) headers["Authorization"] = "Bearer " + token;
  }

  const options = { method, headers };

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  try {
    let res = await fetch(API_BASE + endpoint, options);

    // Token hết hạn → thử refresh
    if (res.status === 401 && requireAuth) {
      const refreshed = await apiRefreshToken();

      if (refreshed) {
        headers["Authorization"] =
          "Bearer " + localStorage.getItem("vt_access_token");

        const retryOptions = { method, headers };
        if (options.body) retryOptions.body = options.body;

        res = await fetch(API_BASE + endpoint, retryOptions);
      } else {
        apiLogoutLocal();
        window.location.href = "dang-nhap.html";
        return { ok: false, status: 401, data: { message: "Session expired" } };
      }
    }

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = { message: "Invalid JSON response" };
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error("API ERROR:", endpoint, err);
    return { ok: false, status: 0, data: { message: "Cannot connect to server" } };
  }
}

// ============================================================
// AUTH
// ============================================================

// POST /auths/register
async function apiRegister(full_name, email, password, confirm_password, date_of_birth) {
  return apiCall("POST", "/auths/register", { full_name, email, password, confirm_password, date_of_birth });
}

// POST /auths/login
async function apiLogin(email, password) {
  return apiCall("POST", "/auths/login", { email, password });
}

// POST /auths/logout
async function apiLogout(refresh_token) {
  return apiCall("POST", "/auths/logout", { refresh_token }, true);
}

// POST /auths/refresh-token
async function apiRefreshToken() {
  try {
    const refresh_token = localStorage.getItem("vt_refresh_token");
    if (!refresh_token) return false;

    const res = await fetch(API_BASE + "/auths/refresh-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    const { access_token, refresh_token: new_refresh_token } = data.result || {};

    if (access_token) {
      localStorage.setItem("vt_access_token", access_token);
      if (new_refresh_token) localStorage.setItem("vt_refresh_token", new_refresh_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// POST /auths/verify-email
async function apiVerifyEmail(email_verify_token) {
  return apiCall("POST", "/auths/verify-email", { email_verify_token });
}

// POST /auths/resend-verify-email
async function apiResendVerifyEmail() {
  return apiCall("POST", "/auths/resend-verify-email", null, true);
}

// POST /auths/forgot-password
async function apiForgotPassword(email) {
  return apiCall("POST", "/auths/forgot-password", { email });
}

// POST /auths/reset-password
async function apiResetPassword(forgot_password_token, password, confirm_password) {
  return apiCall("POST", "/auths/reset-password", {
    forgot_password_token,
    password,
    confirm_password,
  });
}

// Xóa token + user khỏi localStorage
function apiLogoutLocal() {
  localStorage.removeItem("vt_access_token");
  localStorage.removeItem("vt_refresh_token");
  localStorage.removeItem("vt_user");
}

function apiClearTokens() {
  apiLogoutLocal();
}

// ============================================================
// USERS
// ============================================================

// GET /users/me
async function apiGetMe() {
  return apiCall("GET", "/users/me", null, true);
}

// PUT /users/me
async function apiUpdateMe(data) {
  return apiCall("PUT", "/users/me", data, true);
}

// PATCH /users/me/avatar (multipart — không dùng apiCall)
async function apiUpdateAvatar(file) {
  if (typeof checkUserVerifiedForAction !== 'undefined' && !checkUserVerifiedForAction('cập nhật avatar')) {
    return { ok: false, status: 403, data: { message: 'Vui lòng xác thực email trước' } };
  }
  try {
    const token = localStorage.getItem("vt_access_token");
    const form = new FormData();
    form.append("avatar", file);

    let res = await fetch(API_BASE + "/users/me/avatar", {
      method: "PATCH",
      headers: token ? { Authorization: "Bearer " + token } : {},
      body: form,
    });

    // Token hết hạn
    if (res.status === 401) {
      const refreshed = await apiRefreshToken();
      if (refreshed) {
        const newToken = localStorage.getItem("vt_access_token");
        res = await fetch(API_BASE + "/users/me/avatar", {
          method: "PATCH",
          headers: { Authorization: "Bearer " + newToken },
          body: form,
        });
      } else {
        apiLogoutLocal();
        return { ok: false, status: 401, data: { message: "Session expired" } };
      }
    }

    let data = null;
    try { data = await res.json(); } catch { data = {}; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error("API ERROR: /users/me/avatar", err);
    return { ok: false, status: 0, data: { message: "Cannot connect to server" } };
  }
}

// PATCH /users/me/password
async function apiChangePassword(password, new_password, new_confirm_password) {
  if (typeof checkUserVerifiedForAction !== 'undefined' && !checkUserVerifiedForAction('đổi mật khẩu')) {
    return { ok: false, status: 403, data: { message: 'Vui lòng xác thực email trước' } };
  }
  return apiCall("PATCH", "/users/me/password", {
    password,
    new_password,
    new_confirm_password,
  }, true);
}

// POST /users/me/wishlist/:tour_id (toggle)
async function apiToggleWishlist(tour_id) {
  if (typeof checkUserVerifiedForAction !== 'undefined' && !checkUserVerifiedForAction('thêm tour vào yêu thích')) {
    return { ok: false, status: 403, data: { message: 'Vui lòng xác thực email trước' } };
  }
  return apiCall("POST", "/users/me/wishlist/" + tour_id, null, true);
}

// GET /users/me/wishlist
async function apiGetWishlist() {
  return apiCall("GET", "/users/me/wishlist", null, true);
}

// Admin — GET /users or /user
async function apiAdminGetUsers(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.append(key, value);
  });
  const qs = query.toString() ? "?" + query.toString() : "";
  let res = await apiCall("GET", "/users" + qs, null, true);
  if (res && res.status === 404) {
    res = await apiCall("GET", "/user" + qs, null, true);
  }
  return res;
}

// Admin — GET /users/:id
async function apiAdminGetUser(id) {
  return apiCall("GET", "/users/" + id, null, true);
}

// Admin — PATCH /users/:id/role
async function apiAdminSetUserRole(id, role) {
  return apiCall("PATCH", "/users/" + id + "/role", { role }, true);
}

// Admin — PATCH /users/:id/status
async function apiAdminSetUserStatus(id, status) {
  return apiCall("PATCH", "/users/" + id + "/status", { status }, true);
}

// Admin Stats — GET /admin/stats/overview
async function apiAdminStatsOverview(period = "today") {
  const query = new URLSearchParams();
  if (period) query.append("period", period);
  return apiCall("GET", "/admin/stats/overview?" + query.toString(), null, true);
}

// Admin Stats — GET /admin/stats/revenue
async function apiAdminStatsRevenue(period = "month", year) {
  const query = new URLSearchParams();
  if (period) query.append("period", period);
  if (year !== undefined && year !== null && year !== "") query.append("year", year);
  return apiCall("GET", "/admin/stats/revenue?" + query.toString(), null, true);
}

// Admin Stats — GET /admin/stats/top-tours
async function apiAdminStatsTopTours(period = "month", limit = 10) {
  const query = new URLSearchParams();
  if (period) query.append("period", period);
  if (limit) query.append("limit", limit);
  return apiCall("GET", "/admin/stats/top-tours?" + query.toString(), null, true);
}

// ============================================================
// CATEGORIES
// ============================================================

// GET /categories
async function apiGetCategories(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.append(key, value);
  });
  const qs = query.toString() ? "?" + query.toString() : "";
  return apiCall("GET", "/categories" + qs);
}

// Admin — GET /categories (có auth để BE nhận role)
async function apiAdminGetCategories(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.append(key, value);
  });
  const qs = query.toString() ? "?" + query.toString() : "";
  return apiCall("GET", "/categories" + qs, null, true);
}

// GET /categories/:id
async function apiGetCategory(id) {
  return apiCall("GET", "/categories/" + id);
}

// Admin — POST /categories
async function apiAdminCreateCategory(payload) {
  if (!ensureUserVerified('quản lý danh mục')) {
    return { ok: false, status: 403, data: { message: 'Vui lòng xác thực email trước' } };
  }
  return apiCall("POST", "/categories", payload, true);
}

// Admin — PUT /categories/:id
async function apiAdminUpdateCategory(id, payload) {
  if (!ensureUserVerified('quản lý danh mục')) {
    return { ok: false, status: 403, data: { message: 'Vui lòng xác thực email trước' } };
  }
  return apiCall("PUT", "/categories/" + id, payload, true);
}

// Admin — PATCH /categories/:id (toggle status)
async function apiAdminToggleCategory(id, is_active) {
  if (!ensureUserVerified('quản lý danh mục')) {
    return { ok: false, status: 403, data: { message: 'Vui lòng xác thực email trước' } };
  }
  return apiCall("PATCH", "/categories/" + id, { is_active: !!is_active }, true);
}

// Admin — POST /categories/:id/image
async function apiAdminUpdateCategoryImage(id, thumbnail) {
  if (!ensureUserVerified('quản lý danh mục')) {
    return { ok: false, status: 403, data: { message: 'Vui lòng xác thực email trước' } };
  }
  try {
    const token = localStorage.getItem('vt_access_token');
    const formData = new FormData();
    if (thumbnail) formData.append('thumbnail', thumbnail);

    let res = await fetch(API_BASE + '/categories/' + id + '/image', {
      method: 'POST',
      headers: token ? { Authorization: 'Bearer ' + token } : {},
      body: formData,
    });

    if (res.status === 401) {
      const refreshed = await apiRefreshToken();
      if (refreshed) {
        const newToken = localStorage.getItem('vt_access_token');
        res = await fetch(API_BASE + '/categories/' + id + '/image', {
          method: 'POST',
          headers: newToken ? { Authorization: 'Bearer ' + newToken } : {},
          body: formData,
        });
      } else {
        apiLogoutLocal();
        return { ok: false, status: 401, data: { message: 'Session expired' } };
      }
    }

    let data = null;
    try { data = await res.json(); } catch { data = {}; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('API ERROR: /categories/' + id + '/image', err);
    return { ok: false, status: 0, data: { message: 'Cannot connect to server' } };
  }
}

// Admin — DELETE /categories/:id
async function apiAdminDeleteCategory(id) {
  return apiCall("DELETE", "/categories/" + id, null, true);
}

// ============================================================
// TOURS
// ============================================================

// GET /tours
async function apiGetTours(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.append(key, value);
  });
  const qs = query.toString() ? "?" + query.toString() : "";
  return apiCall("GET", "/tours" + qs);
}

// Admin/Employee — GET /tours (kèm auth để lấy đủ status)
async function apiAdminGetTours(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.append(key, value);
  });
  const qs = query.toString() ? "?" + query.toString() : "";
  return apiCall("GET", "/tours" + qs, null, true);
}

// GET /tours/:slug
async function apiGetTour(slug) {
  return apiCall("GET", "/tours/" + slug);
}

// Admin/Employee — GET /tours/:slug (kèm auth để lấy cả tour ẩn/hủy)
async function apiAdminGetTour(slug) {
  return apiCall("GET", "/tours/" + slug, null, true);
}

// GET /tours/recommended
async function apiGetRecommendedTours() {
  return apiCall("GET", "/tours/recommended", null, true);
}

// Admin/Employee — POST /tours (multipart)
async function apiAdminCreateTour(formData) {
  if (!ensureUserVerified('quản lý tour')) {
    return { ok: false, status: 403, data: { message: 'Vui lòng xác thực email trước' } };
  }
  try {
    const token = localStorage.getItem("vt_access_token");
    let res = await fetch(API_BASE + "/tours", {
      method: "POST",
      headers: token ? { Authorization: "Bearer " + token } : {},
      body: formData,
    });

    // Token hết hạn -> refresh rồi thử lại 1 lần
    if (res.status === 401) {
      const refreshed = await apiRefreshToken();
      if (refreshed) {
        const newToken = localStorage.getItem("vt_access_token");
        res = await fetch(API_BASE + "/tours", {
          method: "POST",
          headers: newToken ? { Authorization: "Bearer " + newToken } : {},
          body: formData,
        });
      } else {
        apiLogoutLocal();
        return { ok: false, status: 401, data: { message: "Session expired" } };
      }
    }

    let data = null;
    try { data = await res.json(); } catch { data = {}; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { message: "Cannot connect to server" } };
  }
}

// Admin/Employee — PUT /tours/:id (multipart)
async function apiAdminUpdateTour(id, formData) {
  if (!ensureUserVerified('quản lý tour')) {
    return { ok: false, status: 403, data: { message: 'Vui lòng xác thực email trước' } };
  }
  try {
    const token = localStorage.getItem("vt_access_token");
    let res = await fetch(API_BASE + "/tours/" + id, {
      method: "PUT",
      headers: token ? { Authorization: "Bearer " + token } : {},
      body: formData,
    });

    // Token hết hạn -> refresh rồi thử lại 1 lần
    if (res.status === 401) {
      const refreshed = await apiRefreshToken();
      if (refreshed) {
        const newToken = localStorage.getItem("vt_access_token");
        res = await fetch(API_BASE + "/tours/" + id, {
          method: "PUT",
          headers: newToken ? { Authorization: "Bearer " + newToken } : {},
          body: formData,
        });
      } else {
        apiLogoutLocal();
        return { ok: false, status: 401, data: { message: "Session expired" } };
      }
    }

    let data = null;
    try { data = await res.json(); } catch { data = {}; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { message: "Cannot connect to server" } };
  }
}

// Admin/Employee — PATCH /tours/:id/status
async function apiAdminUpdateTourStatus(id, status) {
  return apiCall("PATCH", "/tours/" + id + "/status", { status }, true);
}

// Admin/Employee — PATCH /tours/:id
async function apiAdminPatchTourStatus(id, status) {
  return apiCall("PATCH", "/tours/" + id, { status }, true);
}

// Admin — DELETE /tours/:id
async function apiAdminDeleteTour(id) {
  return apiCall("DELETE", "/tours/" + id, null, true);
}

// ============================================================
// SCHEDULES
// ============================================================

// GET /tours/:tour_id/schedules
async function apiGetSchedules(tour_id, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.append(key, value);
  });
  const qs = query.toString() ? "?" + query.toString() : "";
  return apiCall("GET", "/tours/" + tour_id + "/schedules" + qs);
}

// Admin/Employee — POST /tours/:tour_id/schedules
async function apiAdminCreateSchedule(tour_id, data) {
  return apiCall("POST", "/tours/" + tour_id + "/schedules", data, true);
}

// Admin/Employee — PUT /schedules/:id
async function apiAdminUpdateSchedule(id, data) {
  return apiCall("PUT", "/schedules/" + id, data, true);
}

// Admin — DELETE /schedules/:id
async function apiAdminDeleteSchedule(id) {
  return apiCall("DELETE", "/schedules/" + id, null, true);
}

// ============================================================
// BOOKINGS
// ============================================================

// POST /bookings
async function apiCreateBooking(data) {
  return apiCall("POST", "/bookings", data, true);
}

// GET /bookings/my
async function apiGetMyBookings(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.append(key, value);
  });
  const qs = query.toString() ? "?" + query.toString() : "";
  return apiCall("GET", "/bookings/my" + qs, null, true);
}

// GET /bookings/my/:id
async function apiGetMyBooking(id) {
  return apiCall("GET", "/bookings/my/" + id, null, true);
}

// PATCH /bookings/my/:id/cancel
async function apiCancelBooking(id, reason = "") {
  return apiCall("PATCH", "/bookings/my/" + id + "/cancel", { reason }, true);
}

// Admin/Employee — GET /bookings
async function apiAdminGetBookings(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.append(key, value);
  });
  const qs = query.toString() ? "?" + query.toString() : "";
  return apiCall("GET", "/bookings" + qs, null, true);
}

// Admin/Employee — GET /bookings/:id
async function apiAdminGetBooking(id) {
  return apiCall("GET", "/bookings/" + id, null, true);
}

// Admin/Employee — PATCH /bookings/:id/status
async function apiAdminUpdateBookingStatus(id, status, cancelled_reason = "") {
  const body = { status };
  if (cancelled_reason) body.cancelled_reason = cancelled_reason;
  return apiCall("PATCH", "/bookings/" + id + "/status", body, true);
}

// Admin/Employee — PATCH /bookings/:id/refund
async function apiAdminConfirmBookingRefund(id) {
  return apiCall("PATCH", "/bookings/" + id + "/refund", { status: 3 }, true);
}

// ============================================================
// PAYMENTS
// ============================================================

// POST /payments/momo
async function apiCreateMomoPayment(booking_id) {
  return apiCall("POST", "/payments/momo", { booking_id }, true);
}

// POST /payments/vnpay
async function apiCreateVnpayPayment(booking_id) {
  return apiCall("POST", "/payments/vnpay", { booking_id }, true);
}

// POST /payments (wrapper theo phương thức)
async function apiCreatePayment(booking_id, method = "momo") {
  const m = String(method || "momo").toLowerCase();
  if (m === "vnpay") return apiCreateVnpayPayment(booking_id);
  if (m === "momo") return apiCreateMomoPayment(booking_id);
  return apiCall("POST", "/payments", { booking_id, payment_method: m }, true);
}

// ============================================================
// COUPONS
// ============================================================

// GET /coupons/public-coupons
async function apiGetPublicCoupons(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.append(key, value);
  });
  const qs = query.toString() ? "?" + query.toString() : "";
  return apiCall("GET", "/coupons/public-coupons" + qs);
}

// POST /coupons/validate
async function apiValidateCoupon(code, order_value) {
  return apiCall("POST", "/coupons/validate", { code, order_value }, true);
}

// PATCH /coupons/:id/coupon
async function apiApplyBookingCoupon(id, data) {
  return apiCall("PATCH", "/coupons/" + id + "/coupon", data, true);
}

// Admin — GET /coupons
async function apiAdminGetCoupons(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.append(key, value);
  });
  const qs = query.toString() ? "?" + query.toString() : "";
  return apiCall("GET", "/coupons" + qs, null, true);
}

// Admin — POST /coupons
async function apiAdminCreateCoupon(data) {
  return apiCall("POST", "/coupons", data, true);
}

// Admin — PUT /coupons/:id
async function apiAdminUpdateCoupon(id, data) {
  return apiCall("PUT", "/coupons/" + id, data, true);
}

// Admin — PATCH /coupons/:id/toggle
async function apiAdminToggleCoupon(id) {
  return apiCall("PATCH", "/coupons/" + id + "/toggle", null, true);
}

// ============================================================
// STATISTICS (Admin)
// ============================================================

// GET /admin/stats/overview?period=...
async function apiGetStatsOverview(period) {
  return apiCall("GET", "/admin/stats/overview?period=" + period, null, true);
}

// GET /admin/stats/revenue?period=...&year=...
async function apiGetStatsRevenue(period, year) {
  const qs = year ? "?period=" + period + "&year=" + year : "?period=" + period;
  return apiCall("GET", "/admin/stats/revenue" + qs, null, true);
}

// GET /admin/stats/top-tours?period=...&limit=...
async function apiGetTopTours(period, limit = 10) {
  return apiCall("GET", "/admin/stats/top-tours?period=" + period + "&limit=" + limit, null, true);
}

// ============================================================
// EXPORT ra global
// ============================================================

window.apiCall = apiCall;

// Auth
window.apiRegister = apiRegister;
window.apiLogin = apiLogin;
window.apiLogout = apiLogout;
window.apiRefreshToken = apiRefreshToken;
window.apiVerifyEmail = apiVerifyEmail;
window.apiResendVerifyEmail = apiResendVerifyEmail;
window.apiForgotPassword = apiForgotPassword;
window.apiResetPassword = apiResetPassword;
window.apiLogoutLocal = apiLogoutLocal;

// Users
window.apiGetMe = apiGetMe;
window.apiUpdateMe = apiUpdateMe;
window.apiUpdateAvatar = apiUpdateAvatar;
window.apiChangePassword = apiChangePassword;
window.apiToggleWishlist = apiToggleWishlist;
window.apiGetWishlist = apiGetWishlist;
window.apiAdminGetUsers = apiAdminGetUsers;
window.apiAdminGetUser = apiAdminGetUser;
window.apiAdminSetUserRole = apiAdminSetUserRole;
window.apiAdminSetUserStatus = apiAdminSetUserStatus;

// Categories
window.apiGetCategories = apiGetCategories;
window.apiAdminGetCategories = apiAdminGetCategories;
window.apiGetCategory = apiGetCategory;
window.apiAdminCreateCategory = apiAdminCreateCategory;
window.apiAdminUpdateCategory = apiAdminUpdateCategory;
window.apiAdminToggleCategory = apiAdminToggleCategory;
window.apiAdminUpdateCategoryImage = apiAdminUpdateCategoryImage;
window.apiAdminDeleteCategory = apiAdminDeleteCategory;

// Tours
window.apiGetTours = apiGetTours;
window.apiAdminGetTours = apiAdminGetTours;
window.apiGetTour = apiGetTour;
window.apiAdminGetTour = apiAdminGetTour;
window.apiGetRecommendedTours = apiGetRecommendedTours;
window.apiAdminCreateTour = apiAdminCreateTour;
window.apiAdminUpdateTour = apiAdminUpdateTour;
window.apiAdminUpdateTourStatus = apiAdminUpdateTourStatus;
window.apiAdminDeleteTour = apiAdminDeleteTour;

// Schedules
window.apiGetSchedules = apiGetSchedules;
window.apiAdminCreateSchedule = apiAdminCreateSchedule;
window.apiAdminUpdateSchedule = apiAdminUpdateSchedule;
window.apiAdminDeleteSchedule = apiAdminDeleteSchedule;

// Bookings
window.apiCreateBooking = apiCreateBooking;
window.apiGetMyBookings = apiGetMyBookings;
window.apiGetMyBooking = apiGetMyBooking;
window.apiCancelBooking = apiCancelBooking;
window.apiAdminGetBookings = apiAdminGetBookings;
window.apiAdminGetBooking = apiAdminGetBooking;
window.apiAdminUpdateBookingStatus = apiAdminUpdateBookingStatus;
window.apiAdminConfirmBookingRefund = apiAdminConfirmBookingRefund;

// Payments
window.apiCreateMomoPayment = apiCreateMomoPayment;
window.apiCreateVnpayPayment = apiCreateVnpayPayment;
window.apiCreatePayment = apiCreatePayment;

// Coupons
window.apiValidateCoupon = apiValidateCoupon;
window.apiApplyBookingCoupon = apiApplyBookingCoupon;
window.apiAdminGetCoupons = apiAdminGetCoupons;
window.apiAdminCreateCoupon = apiAdminCreateCoupon;
window.apiAdminUpdateCoupon = apiAdminUpdateCoupon;
window.apiAdminToggleCoupon = apiAdminToggleCoupon;

// Stats
window.apiGetStatsOverview = apiGetStatsOverview;
window.apiGetStatsRevenue = apiGetStatsRevenue;
window.apiGetTopTours = apiGetTopTours;