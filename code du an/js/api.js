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

// POST /auths/login
async function apiLogin(email, password) {
  return apiCall("POST", "/auths/login", { email, password });
}

// POST /auths/refresh-token
async function apiRefreshToken() {
  try {
    const refreshToken = localStorage.getItem("vt_refresh_token");
    if (!refreshToken) return false;

    const res = await fetch(API_BASE + "/auths/refresh-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    const { access_token, refresh_token } = data.result || data;

    if (access_token) {
      localStorage.setItem("vt_access_token", access_token);
      if (refresh_token) localStorage.setItem("vt_refresh_token", refresh_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Xóa token + user khỏi localStorage
function apiLogoutLocal() {
  localStorage.removeItem("vt_access_token");
  localStorage.removeItem("vt_refresh_token");
  localStorage.removeItem("vt_user");
}

// Alias dùng nhiều nơi
function apiClearTokens() {
  apiLogoutLocal();
}

// ============================================================
// USER
// ============================================================

// GET /users/me
async function apiGetMe() {
  return apiCall("GET", "/users/me", null, true);
}

// PATCH /users/me
async function apiUpdateMe(data) {
  return apiCall("PATCH", "/users/me", data, true);
}

// POST /users/me/avatar  (multipart — không dùng apiCall)
async function apiUpdateAvatar(file) {
  try {
    const token = localStorage.getItem("vt_access_token");
    const form = new FormData();
    form.append("avatar", file);

    let res = await fetch(API_BASE + "/users/me/avatar", {
      method: "POST",
      headers: token ? { Authorization: "Bearer " + token } : {},
      body: form,
    });

    // Token hết hạn
    if (res.status === 401) {
      const refreshed = await apiRefreshToken();
      if (refreshed) {
        const newToken = localStorage.getItem("vt_access_token");
        res = await fetch(API_BASE + "/users/me/avatar", {
          method: "POST",
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

// PUT /users/me/password
async function apiChangePassword(current_password, new_password, confirm_password) {
  return apiCall("PUT", "/users/me/password", {
    current_password,
    new_password,
    confirm_password,
  }, true);
}

// ============================================================
// TOURS
// ============================================================

// GET /tours?...
async function apiGetTours(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.append(key, value);
  });
  const qs = query.toString() ? "?" + query.toString() : "";
  return apiCall("GET", "/tours" + qs);
}

// GET /tours/:id
async function apiGetTour(id) {
  return apiCall("GET", "/tours/" + id);
}

// DELETE /tours/:id
async function apiDeleteTour(id) {
  return apiCall("DELETE", "/tours/" + id, null, true);
}

// ============================================================
// SCHEDULES
// ============================================================

// GET /schedules?tour_id=:tourId
async function apiGetSchedules(tourId) {
  return apiCall("GET", "/schedules?tour_id=" + tourId);
}

// ============================================================
// BOOKINGS
// ============================================================

// POST /bookings
async function apiCreateBooking(data) {
  return apiCall("POST", "/bookings", data, true);
}

// GET /bookings/my?...
async function apiGetMyBookings(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.append(key, value);
  });
  const qs = query.toString() ? "?" + query.toString() : "";
  return apiCall("GET", "/bookings/my" + qs, null, true);
}

// PATCH /bookings/my/:id/cancel
async function apiCancelBooking(id, reason = "") {
  return apiCall("PATCH", "/bookings/my/" + id + "/cancel", { reason }, true);
}

// ============================================================
// COUPONS
// ============================================================

// GET /coupons/validate?code=...&total=...
async function apiValidateCoupon(code, total) {
  return apiCall("GET", "/coupons/validate?code=" + encodeURIComponent(code) + "&total=" + total);
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
  const qs = query.toString() ? "?" + query.toString() : "?limit=100";
  return apiCall("GET", "/categories" + qs);
}

// ============================================================
// ADMIN — USERS
// ============================================================

// GET /admin/users?...
async function apiAdminGetUsers(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.append(key, value);
  });
  const qs = query.toString() ? "?" + query.toString() : "";
  return apiCall("GET", "/admin/users" + qs, null, true);
}

// PATCH /admin/users/:id/role
async function apiAdminSetUserRole(id, role) {
  return apiCall("PATCH", "/admin/users/" + id + "/role", { role }, true);
}

// PATCH /admin/users/:id/status
async function apiAdminSetUserStatus(id, status) {
  return apiCall("PATCH", "/admin/users/" + id + "/status", { status }, true);
}

// ============================================================
// ADMIN — CATEGORIES
// ============================================================

// POST /admin/categories
async function apiAdminCreateCategory(data) {
  return apiCall("POST", "/admin/categories", data, true);
}

// PATCH /admin/categories/:id
async function apiAdminUpdateCategory(id, data) {
  return apiCall("PATCH", "/admin/categories/" + id, data, true);
}

// DELETE /admin/categories/:id
async function apiAdminDeleteCategory(id) {
  return apiCall("DELETE", "/admin/categories/" + id, null, true);
}

// ============================================================
// ADMIN — BOOKINGS
// ============================================================

// GET /admin/bookings?...
async function apiAdminGetBookings(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.append(key, value);
  });
  const qs = query.toString() ? "?" + query.toString() : "";
  return apiCall("GET", "/admin/bookings" + qs, null, true);
}

// PATCH /admin/bookings/:id
async function apiAdminUpdateBooking(id, status, reason = "") {
  const body = { status };
  if (reason) body.reason = reason;
  return apiCall("PATCH", "/admin/bookings/" + id, body, true);
}

// ============================================================
// STATS
// ============================================================

// GET /stats/overview?period=...
async function apiGetStatsOverview(period) {
  return apiCall("GET", "/stats/overview?period=" + period, null, true);
}

// GET /stats/revenue?period=...&year=...
async function apiGetStatsRevenue(period, year) {
  return apiCall("GET", "/stats/revenue?period=" + period + "&year=" + year, null, true);
}

// GET /stats/top-tours?period=...&limit=...
async function apiGetTopTours(period, limit = 10) {
  return apiCall("GET", "/stats/top-tours?period=" + period + "&limit=" + limit, null, true);
}

// ============================================================
// EXPORT ra global
// ============================================================

window.apiCall = apiCall;

// Auth
window.apiLogin = apiLogin;
window.apiRefreshToken = apiRefreshToken;
window.apiLogoutLocal = apiLogoutLocal;
window.apiClearTokens = apiClearTokens;

// User
window.apiGetMe = apiGetMe;
window.apiUpdateMe = apiUpdateMe;
window.apiUpdateAvatar = apiUpdateAvatar;
window.apiChangePassword = apiChangePassword;

// Tours
window.apiGetTours = apiGetTours;
window.apiGetTour = apiGetTour;
window.apiDeleteTour = apiDeleteTour;

// Schedules
window.apiGetSchedules = apiGetSchedules;

// Bookings
window.apiCreateBooking = apiCreateBooking;
window.apiGetMyBookings = apiGetMyBookings;
window.apiCancelBooking = apiCancelBooking;

// Coupons
window.apiValidateCoupon = apiValidateCoupon;

// Categories
window.apiGetCategories = apiGetCategories;

// Admin — Users
window.apiAdminGetUsers = apiAdminGetUsers;
window.apiAdminSetUserRole = apiAdminSetUserRole;
window.apiAdminSetUserStatus = apiAdminSetUserStatus;

// Admin — Categories
window.apiAdminCreateCategory = apiAdminCreateCategory;
window.apiAdminUpdateCategory = apiAdminUpdateCategory;
window.apiAdminDeleteCategory = apiAdminDeleteCategory;

// Admin — Bookings
window.apiAdminGetBookings = apiAdminGetBookings;
window.apiAdminUpdateBooking = apiAdminUpdateBooking;

// Stats
window.apiGetStatsOverview = apiGetStatsOverview;
window.apiGetStatsRevenue = apiGetStatsRevenue;
window.apiGetTopTours = apiGetTopTours;