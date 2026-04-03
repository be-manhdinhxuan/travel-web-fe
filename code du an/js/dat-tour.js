// ============================================================
// dat-tour.js – FIXED VERSION (snapshot + fallback)
// ============================================================

// ================= STATE =================
const state = {
  tour: null,
  schedule: null,
  scheduleId: null,
  calendarDate: null,

  guests: {
    adult: 1,
    child: 0,
    baby: 0
  },

  paymentMethod: 'momo',
  coupon: null
};

// ================= INIT =================
window.addEventListener('DOMContentLoaded', initCheckoutPage);

async function initCheckoutPage() {
  const params = new URLSearchParams(window.location.search);

  const urlKey =
    params.get('slug') ||
    params.get('tour') ||
    params.get('id') ||
    '';

  const snapshot = getSnapshot();

  const user = getCurrentUser();
  if (!user || !localStorage.getItem('vt_access_token')) {
    showToast('⚠️ Vui lòng đăng nhập để tiếp tục đặt tour');
    setTimeout(() => window.location.href = 'dang-nhap.html', 800);
    return;
  }

  fillUserInfo(user);
  setActionButtonsDisabled(true);

  // 🔥 CHỈ dùng snapshot nếu KHỚP tour
  if (snapshot && snapshot.tourId === urlKey) {
    hydrateFromSnapshot(snapshot);

    // ❗ dùng xong thì xóa luôn (tránh dính)
    sessionStorage.removeItem('vt_checkout_tour');
    return;
  }

  // ❗ nếu không khớp → xóa snapshot
  if (snapshot && snapshot.tourId !== urlKey) {
    showAvailabilityNotice('Thông tin bạn đã chọn trước đó không còn áp dụng cho tour hiện tại. Vui lòng kiểm tra lại lịch khởi hành.');
  }
  sessionStorage.removeItem('vt_checkout_tour');

  // fallback API
  await initFromUrl();
}

// ================= SNAPSHOT =================
function getSnapshot() {
  try {
    const data = JSON.parse(sessionStorage.getItem('vt_checkout_tour') || 'null');
    if (!data) return null;

    // ❗ KHÔNG xóa ở đây nữa
    return data;

  } catch {
    return null;
  }
}

function hydrateFromSnapshot(data) {
  console.log('HYDRATE DATA:', data);

  state.tour = data;

  // FIX KEY CHUẨN 100%
  state.schedule = {
    id: data.schedule.id,
    departure_date: data.schedule.departureDate,
    return_date: data.schedule.returnDate,
    price_adult: data.schedule.priceAdult,
    price_child: data.schedule.priceChild,
    price_baby: data.schedule.priceBaby
  };

  state.scheduleId = data.schedule.id;
  state.calendarDate = data.schedule.departureDate;

  state.guests = data.guests;

  renderAll();
}

// ================= FALLBACK =================
async function initFromUrl() {
  const params = new URLSearchParams(window.location.search);

  const tourKey = (params.get('tour') || params.get('slug') || params.get('id') || '').trim();
  const scheduleId = (params.get('schedule') || '').trim();

  state.guests.adult = Math.max(1, parseInt(params.get('adult') || '1'));
  state.guests.child = Math.max(0, parseInt(params.get('child') || '0'));
  state.guests.baby = Math.max(0, parseInt(params.get('baby') || '0'));

  if (!tourKey) {
    showToast('⚠️ Thiếu thông tin tour');
    return;
  }

  try {
    const res = await apiGetTour(tourKey);
    const payload = res?.data?.result;

    state.tour = payload?.tour || payload;
    const schedules = payload?.schedules || [];

    if (scheduleId && schedules.length && !schedules.some(s => String(s._id) === scheduleId)) {
      showAvailabilityNotice('Lịch khởi hành bạn đã chọn trước đó không còn khả dụng. Hệ thống đã tự chọn lịch gần nhất.');
    }

    state.schedule =
      schedules.find(s => String(s._id) === scheduleId) || schedules[0];

    if (state.schedule) {
      state.scheduleId = state.schedule._id;
      state.calendarDate = state.schedule.departure_date;
    } else {
      showAvailabilityNotice('Tour này hiện chưa có lịch khởi hành khả dụng. Vui lòng quay lại chọn tour khác.');
    }

    renderAll();
  } catch (err) {
    console.error(err);
    showToast('⚠️ Không tải được dữ liệu');
  }
}

// ================= RENDER =================
function renderAll() {
  fillGuestInfo();
  renderSchedule();
  renderTour();
  updateSummary();
  setActionButtonsDisabled(isActionUnavailable());
}

function isActionUnavailable() {
  return !state.tour || !state.schedule || !state.scheduleId;
}

function setActionButtonsDisabled(disabled) {
  const applyBtn = document.getElementById('coApplyCouponBtn');
  const checkoutBtn = document.getElementById('coCheckoutBtn');

  if (applyBtn) applyBtn.disabled = !!disabled;
  if (checkoutBtn) checkoutBtn.disabled = !!disabled;
}

// ===== USER =====
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('vt_user') || 'null');
  } catch {
    return null;
  }
}

function fillUserInfo(user) {
  setValue('coName', user.name || '');
  setValue('coEmail', user.email || '');
  setValue('coPhone', user.phone || '');
}

// ===== GUEST =====
function fillGuestInfo() {
  setText('coAdults', state.guests.adult);
  setText('coKids', state.guests.child);
  setText('coBabies', state.guests.baby);
}

// ===== SCHEDULE =====
function renderSchedule() {
  if (!state.schedule) return;

  const dep = state.schedule.departure_date;
  const ret = state.schedule.return_date;

  setText('coSelectedDeparture',
    dep ? new Date(dep).toLocaleDateString('vi-VN') : '—'
  );

  setText('coSelectedReturn',
    ret ? new Date(ret).toLocaleDateString('vi-VN') : '—'
  );
}

// ===== TOUR =====
function renderTour() {
  const t = state.tour;
  if (!t) return;

  const name = t.name || t.title;
  const departure = t.departure || t.departure_city;
  const destination = t.destination;

  setText('coSummaryName', name);
  setText('coTourLocation', `${departure} → ${destination}`);

  document.title = `Đặt tour - ${name}`;

  const breadcrumb = document.getElementById('coBreadcrumbTour');
  if (breadcrumb) {
    breadcrumb.textContent = name;

    const tourKey = t.tourId || t.slug || '';

    breadcrumb.href =
      `chi-tiet-tour.html?tour=${encodeURIComponent(tourKey)}&from=checkout`;
  }

  const imgEl = document.getElementById('coTourImg');

  if (imgEl) {
    const image =
      t.image ||
      (t.images && t.images[0]) ||
      t.thumbnail ||
      '';

    if (image && /^(https?:|data:|\/)/.test(image)) {
      imgEl.style.backgroundImage =
        `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.4)), url("${image}")`;
    } else {
      imgEl.style.background =
        'linear-gradient(135deg,#2d8a4e,#3aaa62)';
    }

    imgEl.style.backgroundSize = 'cover';
    imgEl.style.backgroundPosition = 'center';
  }

}

function calculatePriceBreakdown() {
  const s = state.schedule;
  if (!s) {
    return { base: 0, discount: 0, total: 0 };
  }

  const pa = parseMoney(s.priceAdult || s.price_adult || 0);
  const pc = parseMoney(s.priceChild || s.price_child || 0);
  const pb = parseMoney(s.priceBaby || s.price_baby || 0);

  const base =
    pa * state.guests.adult +
    pc * state.guests.child +
    pb * state.guests.baby;

  const discount = state.coupon?.discount_amount || 0;
  const total = Math.max(0, base - discount);

  return { base, discount, total };
}

// ================= PRICE =================
function updateSummary() {
  const breakdown = calculatePriceBreakdown();

  setText('coPriceBase', breakdown.base ? formatMoney(breakdown.base) : '—');
  setText('coDiscount', breakdown.discount ? ('-' + formatMoney(breakdown.discount)) : 'Không có');
  setText('coPriceTotal', breakdown.total ? formatMoney(breakdown.total) : '—');
}

// ================= PAYMENT =================
function selectCoPayment(el, method) {
  document.querySelectorAll('.co-pay-opt').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  state.paymentMethod = method;
}

// ================= COUPON =================
async function validateCoupon() {
  if (isActionUnavailable()) {
    showToast('⚠️ Thông tin đặt tour hiện không còn khả dụng');
    return;
  }

  const codeEl = document.getElementById('coCouponCode');
  const code = (codeEl?.value || '').trim().toUpperCase();

  if (!code) {
    state.coupon = null;
    updateSummary();
    showToast('⚠️ Vui lòng nhập mã giảm giá');
    return;
  }

  const breakdown = calculatePriceBreakdown();

  try {
    const res = await apiValidateCoupon(code, breakdown.base);
    const result = res?.data?.result;

    if (res?.ok && result?.is_valid) {
      state.coupon = result;
      updateSummary();
      showToast('✅ Mã giảm giá hợp lệ');
      return;
    }

    state.coupon = null;
    updateSummary();
    showToast('❌ ' + (res?.data?.message || 'Mã giảm giá không hợp lệ'));
  } catch (err) {
    console.error(err);
    showToast('⚠️ Không thể kiểm tra mã giảm giá');
  }
}

// ================= CHECKOUT =================
async function doCheckout() {
  if (isActionUnavailable()) {
    showToast('⚠️ Thông tin đặt tour hiện không còn khả dụng');
    return;
  }

  if (!state.scheduleId) {
    showToast('⚠️ Thiếu lịch khởi hành');
    return;
  }

  const name = document.getElementById('coName').value.trim();
  const email = document.getElementById('coEmail').value.trim();
  const phone = document.getElementById('coPhone').value.trim();

  if (!name || !email || !phone) {
    showToast('⚠️ Thiếu thông tin liên hệ');
    return;
  }

  const body = {
    schedule_id: state.scheduleId,
    passengers: state.guests,
    payment_method: state.paymentMethod === 'momo' ? 1 : 2,
    contact_info: { full_name: name, email, phone }
  };

  try {
    const res = await apiCreateBooking(body);

    if (res?.ok) {
      const paymentUrl = res.data?.result?.payment_url;
      if (paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }
    }
  } catch (err) {
    console.error(err);
  }

  showToast('✅ Đặt tour thành công (demo)');
}

// ================= UTILS =================
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val || '—';
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
}

function parseMoney(n) {
  return parseInt(n) || 0;
}

function showAvailabilityNotice(message) {
  const el = document.getElementById('coAvailabilityNotice');
  if (!el) return;
  el.textContent = message;
  el.style.display = 'block';
}