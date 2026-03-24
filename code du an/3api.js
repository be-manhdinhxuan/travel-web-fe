const API_BASE = "http://localhost:5000/api";

async function apiCall(method, endpoint, body = null, requireAuth = false) {
  const headers = {
    "Content-Type": "application/json",
  };

  // Gắn token nếu cần
  if (requireAuth) {
    const token = localStorage.getItem("vt_access_token");
    if (token) headers["Authorization"] = "Bearer " + token;
  }

  const options = { method, headers };

  // ❗ CHỈ attach body nếu không phải GET
  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  try {
    let res = await fetch(API_BASE + endpoint, options);

    // 🔁 Token hết hạn → refresh
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
        window.location.href = "1dangnhap.html";
        return { ok: false, status: 401, data: { message: "Session expired" } };
      }
    }

    // ❗ xử lý khi server không trả JSON
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = { message: "Invalid JSON response" };
    }

    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  } catch (err) {
    console.error("API ERROR:", endpoint, err);

    return {
      ok: false,
      status: 0,
      data: { message: "Cannot connect to server" },
    };
  }
}

// ==========================
// TOUR APIs
// ==========================

// GET /api/tours
async function apiGetTours(params = {}) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.append(key, value)
    }
  })

  const qs = query.toString() ? '?' + query.toString() : ''

  return apiCall('GET', '/tours' + qs)
}

async function apiLogin(email, password) {
  return apiCall('POST', '/auths/login', {
    email,
    password
  })
}

// export ra global (tránh lỗi not defined)
window.apiLogin = apiLogin