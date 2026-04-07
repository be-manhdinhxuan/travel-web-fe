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
    page: 1,
    limit: 8,
    totalPages: 1,
    totalItems: 0,
  };

  const refs = {};
  let searchDebounceTimer = null;

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

  function normalizePagination(payload, currentPage, limit, currentCount) {
    const sources = [
      payload?.result?.pagination,
      payload?.pagination,
      payload?.result,
      payload,
    ].filter(Boolean);

    let page = currentPage;
    let totalPages = 1;
    let totalItems = 0;

    for (const source of sources) {
      const sourcePage = Number(source.page ?? source.current_page ?? source.currentPage);
      const sourceTotalPages = Number(source.total_pages ?? source.totalPages ?? source.last_page ?? source.pages);
      const sourceTotalItems = Number(source.total ?? source.count ?? source.total_items ?? source.totalItems);

      if (Number.isFinite(sourcePage) && sourcePage > 0) page = sourcePage;
      if (Number.isFinite(sourceTotalPages) && sourceTotalPages > 0) totalPages = sourceTotalPages;
      if (Number.isFinite(sourceTotalItems) && sourceTotalItems >= 0) totalItems = sourceTotalItems;
    }

    if ((!Number.isFinite(totalPages) || totalPages < 1) && totalItems > 0 && limit > 0) {
      totalPages = Math.max(1, Math.ceil(totalItems / limit));
    }

    if ((!Number.isFinite(totalPages) || totalPages < 1) && currentCount < limit) {
      totalPages = Math.max(1, page);
    }

    return {
      page: Math.max(1, Number(page) || 1),
      totalPages: Math.max(1, Number(totalPages) || 1),
      totalItems: Math.max(0, Number(totalItems) || 0),
    };
  }

  function buildPageItems(page, totalPages) {
    const items = [];
    if (totalPages <= 7) {
      for (let p = 1; p <= totalPages; p += 1) items.push(p);
      return items;
    }

    items.push(1);
    if (page > 3) items.push("...");

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let p = start; p <= end; p += 1) items.push(p);

    if (page < totalPages - 2) items.push("...");
    items.push(totalPages);
    return items;
  }

  function renderPagination() {
    if (!refs.pagination) return;

    if (state.loading || state.totalPages <= 1) {
      refs.pagination.innerHTML = "";
      refs.pagination.style.display = "none";
      return;
    }

    const pageItems = buildPageItems(state.page, state.totalPages);
    const numbers = pageItems
      .map((item) => {
        if (item === "...") return '<span class="ud-page-dots">...</span>';
        const active = item === state.page ? " is-active" : "";
        return '<button type="button" class="ud-page-btn' + active + '" data-page="' + item + '">' + item + "</button>";
      })
      .join("");

    const prevDisabled = state.page <= 1 ? "disabled" : "";
    const nextDisabled = state.page >= state.totalPages ? "disabled" : "";

    refs.pagination.innerHTML = [
      '<button type="button" class="ud-page-nav" data-page="' + (state.page - 1) + '" ' + prevDisabled + '>Trước</button>',
      '<div class="ud-page-list">' + numbers + "</div>",
      '<button type="button" class="ud-page-nav" data-page="' + (state.page + 1) + '" ' + nextDisabled + '>Sau</button>',
    ].join("");
    refs.pagination.style.display = "flex";
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
    state.filtered = sortCoupons(state.coupons);
  }

  function updateStats() {
    const countEl = refs.couponCount;
    const topValueEl = refs.topCouponValue;
    const nearestExpiryEl = refs.nearestExpiry;

    const totalCouponCount = state.totalItems > 0 ? state.totalItems : state.coupons.length;

    if (countEl) countEl.textContent = String(totalCouponCount);
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
    renderPagination();

    if (state.loading) {
      updateStatus("Đang tải mã ưu đãi...", "loading");
      return;
    }

    if (!state.coupons.length) {
      if (state.search.trim()) {
        updateStatus("Không tìm thấy mã phù hợp với từ khóa hiện tại.", "empty");
        return;
      }
      updateStatus("Chưa có mã ưu đãi nào được công bố.", "empty");
      return;
    }

    if (!state.filtered.length) {
      updateStatus("Không tìm thấy mã phù hợp với từ khóa hiện tại.", "empty");
      return;
    }

    const statusLabel = state.totalPages > 1
      ? "Hiển thị " + state.filtered.length + " mã ở trang " + state.page + "/" + state.totalPages + "."
      : "Hiển thị " + state.filtered.length + " mã ưu đãi đang hoạt động.";

    updateStatus(statusLabel, "ready");
    refs.grid.innerHTML = "";
    state.filtered.forEach((coupon) => refs.grid.appendChild(createCard(coupon)));
    renderPagination();
  }

  async function loadCoupons(nextPage) {
    const parsedPage = Number(nextPage);
    if (Number.isFinite(parsedPage) && parsedPage > 0) {
      state.page = parsedPage;
    }

    state.loading = true;
    renderCoupons();

    const res = await apiGetPublicCoupons({
      page: state.page,
      limit: state.limit,
      keyword: state.search.trim(),
    });
    if (!res || !res.ok) {
      state.loading = false;
      state.coupons = [];
      state.filtered = [];
      state.totalPages = 1;
      state.totalItems = 0;
      updateStatus((res && res.data && res.data.message) || "Không tải được mã ưu đãi, thử lại sau.", "error");
      renderPagination();
      if (typeof showToast === "function") showToast("⚠️ Không tải được mã ưu đãi");
      return;
    }

    state.coupons = normalizeCoupons(res.data);
    const pagination = normalizePagination(res.data, state.page, state.limit, state.coupons.length);
    state.page = Math.min(pagination.page, pagination.totalPages);
    state.totalPages = pagination.totalPages;
    state.totalItems = pagination.totalItems;
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
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        loadCoupons(1);
      }, 300);
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

    refs.pagination?.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-page]");
      if (!button || button.disabled) return;

      const nextPage = Number(button.dataset.page);
      if (!Number.isFinite(nextPage) || nextPage < 1 || nextPage > state.totalPages || nextPage === state.page) return;
      loadCoupons(nextPage);
    });
  }

  function cacheRefs() {
    refs.grid = document.getElementById("couponGrid");
    refs.status = document.getElementById("couponStatus");
    refs.pagination = document.getElementById("couponPagination");
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

