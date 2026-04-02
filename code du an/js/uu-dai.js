// ============================================================
// uudai.js – Trang Ưu Đãi | VietnamTravel
// ============================================================

(function () {
  const state = {
    coupons: [],
    filtered: [],
    search: "",
    sort: "latest",
    loading: true,
  };

  const refs = {};

  function formatCurrency(value) {
    const number = Number(value) || 0;
    return number.toLocaleString("vi-VN") + "đ";
  }

  function formatDate(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleDateString("vi-VN");
  }

  function daysLeft(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const diff = date.getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function getCouponTone(coupon) {
    const value = Number(coupon.value) || 0;
    const minOrder = Number(coupon.min_order_value) || 0;

    if (value >= 1500000 || minOrder >= 15000000) return "gold";
    if (value >= 700000 || minOrder >= 7000000) return "warm";
    return "fresh";
  }

  function getBadgeLabel(coupon) {
    const value = Number(coupon.value) || 0;
    if (value >= 2000000) return "Premium";
    if (value >= 1000000) return "Best deal";
    if (value >= 500000) return "Hot";
    return "New";
  }

  function buildDescription(coupon) {
    const minOrder = formatCurrency(coupon.min_order_value);
    const expiry = formatDate(coupon.expires_at);
    return "Áp dụng cho đơn từ " + minOrder + ". Hết hạn " + expiry + ".";
  }

  function normalizeCoupons(payload) {
    const list = payload?.result?.coupons;
    if (!Array.isArray(list)) return [];
    return list
      .map((coupon) => ({
        ...coupon,
        value: Number(coupon.value) || 0,
        min_order_value: Number(coupon.min_order_value) || 0,
      }))
      .filter((coupon) => coupon.code);
  }

  function sortCoupons(list) {
    const items = [...list];

    if (state.sort === "discount-desc") {
      return items.sort((a, b) => b.value - a.value);
    }

    if (state.sort === "min-order-asc") {
      return items.sort((a, b) => a.min_order_value - b.min_order_value);
    }

    if (state.sort === "expiring") {
      return items.sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at));
    }

    return items.sort((a, b) => new Date(b.expires_at) - new Date(a.expires_at));
  }

  function filterCoupons() {
    const keyword = state.search.trim().toLowerCase();
    const filtered = state.coupons.filter((coupon) => {
      if (!keyword) return true;
      return (
        coupon.code.toLowerCase().includes(keyword) ||
        String(coupon.value).includes(keyword) ||
        String(coupon.min_order_value).includes(keyword)
      );
    });

    state.filtered = sortCoupons(filtered);
  }

  function updateStats() {
    const countEl = refs.couponCount;
    const topValueEl = refs.topCouponValue;
    const nearestExpiryEl = refs.nearestExpiry;

    if (countEl) countEl.textContent = String(state.coupons.length);
    if (topValueEl) {
      const topValue = state.coupons.reduce((max, coupon) => Math.max(max, coupon.value), 0);
      topValueEl.textContent = formatCurrency(topValue);
    }
    if (nearestExpiryEl) {
      const nearest = [...state.coupons]
        .sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at))[0];
      nearestExpiryEl.textContent = nearest ? formatDate(nearest.expires_at) : "--";
    }
  }

  function updateStatus(message, variant) {
    if (!refs.status) return;
    refs.status.textContent = message;
    refs.status.dataset.variant = variant || "";
    refs.status.style.display = message ? "block" : "none";
  }

  function createCard(coupon) {
    const article = document.createElement("article");
    article.className = "ud-coupon-card ud-coupon-card--" + getCouponTone(coupon);

    const days = daysLeft(coupon.expires_at);
    const urgencyText = days === null ? "" : days < 0 ? "Đã hết hạn" : days + " ngày còn lại";

    article.innerHTML = [
      '<div class="ud-coupon-top">',
      '  <span class="ud-coupon-type">' + getBadgeLabel(coupon) + "</span>",
      '  <span class="ud-coupon-chip">' + (days === null ? "--" : urgencyText) + "</span>",
      "</div>",
      '<div class="ud-coupon-amount">-' + formatCurrency(coupon.value) + "</div>",
      '<div class="ud-coupon-desc">' + buildDescription(coupon) + "</div>",
      '<div class="ud-coupon-divider"></div>',
      '<div class="ud-coupon-code">' + coupon.code + "</div>",
      '<div class="ud-coupon-meta">',
      '  <span>Đơn tối thiểu</span><strong>' + formatCurrency(coupon.min_order_value) + "</strong>",
      '</div>',
      '<button class="ud-coupon-copy" type="button" data-code="' + coupon.code + '">Sao chép mã</button>',
    ].join("");

    return article;
  }

  function renderCoupons() {
    if (!refs.grid) return;

    filterCoupons();
    refs.grid.innerHTML = "";

    if (state.loading) {
      updateStatus("Đang tải mã ưu đãi...", "loading");
      return;
    }

    if (!state.coupons.length) {
      updateStatus("Chưa có mã ưu đãi nào được công bố.", "empty");
      return;
    }

    if (!state.filtered.length) {
      updateStatus("Không tìm thấy mã phù hợp với từ khóa hiện tại.", "empty");
      return;
    }

    updateStatus("Hiển thị " + state.filtered.length + " mã ưu đãi đang hoạt động.", "ready");
    refs.grid.innerHTML = "";
    state.filtered.forEach((coupon) => refs.grid.appendChild(createCard(coupon)));
  }

  async function loadCoupons() {
    state.loading = true;
    renderCoupons();

    const res = await apiGetPublicCoupons();
    if (!res || !res.ok) {
      state.loading = false;
      state.coupons = [];
      state.filtered = [];
      updateStatus((res && res.data && res.data.message) || "Không tải được mã ưu đãi, thử lại sau.", "error");
      if (typeof showToast === "function") showToast("⚠️ Không tải được mã ưu đãi");
      return;
    }

    state.coupons = normalizeCoupons(res.data);
    state.loading = false;
    updateStats();
    renderCoupons();
  }

  async function copyCode(code, button) {
    try {
      await navigator.clipboard.writeText(code);
      if (button) {
        const label = button.textContent;
        button.textContent = "Đã sao chép";
        button.classList.add("copied");
        setTimeout(() => {
          button.textContent = label;
          button.classList.remove("copied");
        }, 1600);
      }
      if (typeof showToast === "function") showToast("Đã sao chép mã " + code);
    } catch {
      const fallback = window.prompt("Sao chép mã này:", code);
      if (fallback !== null && typeof showToast === "function") showToast("Hãy sao chép mã " + code);
    }
  }

  function bindEvents() {
    refs.search?.addEventListener("input", function () {
      state.search = this.value;
      renderCoupons();
    });

    refs.sort?.addEventListener("change", function () {
      state.sort = this.value;
      renderCoupons();
    });

    refs.refresh?.addEventListener("click", function () {
      loadCoupons();
    });

    refs.grid?.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-code]");
      if (!button) return;
      copyCode(button.dataset.code, button);
    });
  }

  function cacheRefs() {
    refs.grid = document.getElementById("couponGrid");
    refs.status = document.getElementById("couponStatus");
    refs.search = document.getElementById("couponSearch");
    refs.sort = document.getElementById("couponSort");
    refs.refresh = document.getElementById("refreshCouponsBtn");
    refs.couponCount = document.getElementById("couponCount");
    refs.topCouponValue = document.getElementById("topCouponValue");
    refs.nearestExpiry = document.getElementById("nearestExpiry");
  }

  function init() {
    cacheRefs();
    bindEvents();
    loadCoupons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.copyCode = copyCode;
})();

