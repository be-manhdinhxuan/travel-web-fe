const API_BASE = "http://localhost:5000/api";

// ============================================================
// CORE — wrapper chính
// ============================================================

async function apiCall(method, endpoint, body = null, requireAuth = false) {
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
async function apiRegister(full_name, email, password, confirm_password) {
  return apiCall("POST", "/auths/register", { full_name, email, password, confirm_password });
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

// ============================================================
// USERS
// ============================================================

// GET /users/me
async function apiGetMe() {
  return apiCall("GET", "/users/me", null, true);
}

// PATCH /users/me
async function apiUpdateMe(data) {
  return apiCall("PATCH", "/users/me", data, true);
}

// PATCH /users/me/avatar (multipart — không dùng apiCall)
async function apiUpdateAvatar(file) {
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
async function apiChangePassword(current_password, new_password, confirm_password) {
  return apiCall("PATCH", "/users/me/password", {
    current_password,
    new_password,
    confirm_password,
  }, true);
}

// POST /users/me/wishlist/:tour_id (toggle)
async function apiToggleWishlist(tour_id) {
  return apiCall("POST", "/users/me/wishlist/" + tour_id, null, true);
}

// GET /users/me/wishlist
async function apiGetWishlist() {
  return apiCall("GET", "/users/me/wishlist", null, true);
}

// Admin — GET /users
async function apiAdminGetUsers(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.append(key, value);
  });
  const qs = query.toString() ? "?" + query.toString() : "";
  return apiCall("GET", "/users" + qs, null, true);
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

// ============================================================
// CATEGORIES
// ============================================================

// GET /categories
async function apiGetCategories(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.append(key, value);
  });
  const qs = query.toString() ? "?" + query.toString() : "";
  return apiCall("GET", "/categories" + qs);
}

// GET /categories/:id
async function apiGetCategory(id) {
  return apiCall("GET", "/categories/" + id);
}

// Admin — POST /categories
async function apiAdminCreateCategory(formData) {
  try {
    const token = localStorage.getItem("vt_access_token");
    const res = await fetch(API_BASE + "/categories", {
      method: "POST",
      headers: token ? { Authorization: "Bearer " + token } : {},
      body: formData, // FormData — multipart
    });
    let data = null;
    try { data = await res.json(); } catch { data = {}; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { message: "Cannot connect to server" } };
  }
}

// Admin — PUT /categories/:id
async function apiAdminUpdateCategory(id, formData) {
  try {
    const token = localStorage.getItem("vt_access_token");
    const res = await fetch(API_BASE + "/categories/" + id, {
      method: "PUT",
      headers: token ? { Authorization: "Bearer " + token } : {},
      body: formData, // FormData — multipart
    });
    let data = null;
    try { data = await res.json(); } catch { data = {}; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { message: "Cannot connect to server" } };
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
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.append(key, value);
  });
  const qs = query.toString() ? "?" + query.toString() : "";
  return apiCall("GET", "/tours" + qs);
}

// GET /tours/:slug
async function apiGetTour(slug) {
  return apiCall("GET", "/tours/" + slug);
}

// GET /tours/recommended
async function apiGetRecommendedTours() {
  return apiCall("GET", "/tours/recommended", null, true);
}

// Admin/Employee — POST /tours (multipart)
async function apiAdminCreateTour(formData) {
  try {
    const token = localStorage.getItem("vt_access_token");
    const res = await fetch(API_BASE + "/tours", {
      method: "POST",
      headers: token ? { Authorization: "Bearer " + token } : {},
      body: formData,
    });
    let data = null;
    try { data = await res.json(); } catch { data = {}; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { message: "Cannot connect to server" } };
  }
}

// Admin/Employee — PUT /tours/:id (multipart)
async function apiAdminUpdateTour(id, formData) {
  try {
    const token = localStorage.getItem("vt_access_token");
    const res = await fetch(API_BASE + "/tours/" + id, {
      method: "PUT",
      headers: token ? { Authorization: "Bearer " + token } : {},
      body: formData,
    });
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
  Object.entries(params).forEach(([key, value]) => {
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
  Object.entries(params).forEach(([key, value]) => {
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
  Object.entries(params).forEach(([key, value]) => {
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

// ============================================================
// COUPONS
// ============================================================

// GET /coupons/public-coupons
async function apiGetPublicCoupons() {
  return apiCall("GET", "/coupons/public-coupons");
}

// POST /coupons/validate
async function apiValidateCoupon(code, order_value) {
  return apiCall("POST", "/coupons/validate", { code, order_value }, true);
}

// Admin — GET /coupons
async function apiAdminGetCoupons(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
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
window.apiGetCategory = apiGetCategory;
window.apiAdminCreateCategory = apiAdminCreateCategory;
window.apiAdminUpdateCategory = apiAdminUpdateCategory;
window.apiAdminDeleteCategory = apiAdminDeleteCategory;

// Tours
window.apiGetTours = apiGetTours;
window.apiGetTour = apiGetTour;
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

// Payments
window.apiCreateMomoPayment = apiCreateMomoPayment;
window.apiCreateVnpayPayment = apiCreateVnpayPayment;

// Coupons
window.apiValidateCoupon = apiValidateCoupon;
window.apiAdminGetCoupons = apiAdminGetCoupons;
window.apiAdminCreateCoupon = apiAdminCreateCoupon;
window.apiAdminUpdateCoupon = apiAdminUpdateCoupon;
window.apiAdminToggleCoupon = apiAdminToggleCoupon;

// Stats
window.apiGetStatsOverview = apiGetStatsOverview;
window.apiGetStatsRevenue = apiGetStatsRevenue;
window.apiGetTopTours = apiGetTopTours;