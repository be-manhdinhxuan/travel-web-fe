// ============================================================
// dat-tour.js – Backend-driven payment page
// ============================================================

const state = {
  bookingId: '',
  booking: null,
  tour: null,
  paymentMethod: 'momo',
};

window.addEventListener('DOMContentLoaded', initCheckoutPage);

async function initCheckoutPage() {
  const user = getCurrentUser();
  if (!user || !localStorage.getItem('vt_access_token')) {
    showToast('⚠️ Vui lòng đăng nhập để tiếp tục thanh toán');
    setTimeout(() => window.location.href = 'dang-nhap.html', 800);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  state.bookingId = (params.get('booking_id') || params.get('bookingId') || '').trim();

  setActionButtonsDisabled(true);

  if (!state.bookingId) {
    showAvailabilityNotice('Không tìm thấy booking_id. Vui lòng quay lại trang chi tiết tour để tạo booking mới.');
    return;
  }

  await loadBooking();
}

async function loadBooking() {
  try {
    state.booking = await resolveBookingById(state.bookingId);
    if (!state.booking) {
      throw new Error('Không tìm thấy dữ liệu booking');
    }

    await loadTourDetails();
    syncPaymentMethodFromBooking();
    renderAll();
    setActionButtonsDisabled(false);
  } catch (error) {
    console.error(error);
    showAvailabilityNotice('Không tải được thông tin thanh toán. Vui lòng thử lại sau.');
    showToast('❌ ' + (error?.message || 'Tải booking thất bại'));
  }
}

async function resolveBookingById(bookingId) {
  if (!bookingId) return null;

  // Ưu tiên danh sách /bookings/my vì backend mới đã enrich tour_snapshot tại đây.
  if (typeof apiGetMyBookings === 'function') {
    const listRes = await apiGetMyBookings({ page: 1, limit: 100 });
    if (!listRes?.ok) {
      throw new Error(listRes?.data?.message || 'Không thể tải danh sách booking');
    }

    const bookings = listRes?.data?.result?.bookings || listRes?.data?.result || [];
    const matched = Array.isArray(bookings)
      ? bookings.find(b => String(b?._id || '') === String(bookingId))
      : null;

    if (!matched) {
      throw new Error('Không tìm thấy booking phù hợp trong danh sách của bạn');
    }

    return matched;
  }

  // Fallback endpoint chi tiết nếu backend chưa có list.
  if (typeof apiGetMyBooking === 'function') {
    const detailRes = await apiGetMyBooking(bookingId);
    if (!detailRes?.ok) {
      throw new Error(detailRes?.data?.message || 'Không thể tải booking chi tiết');
    }

    const detailBooking = detailRes?.data?.result?.booking || detailRes?.data?.result || null;
    if (detailBooking && String(detailBooking?._id || '') === String(bookingId)) {
      return detailBooking;
    }
  }

  throw new Error('Thiếu API lấy dữ liệu booking');
}

async function loadTourDetails() {
  const snapshot = getTourSnapshot();
  state.tour = snapshot || {};
}

async function resolveCouponIdByCode(code) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) return '';

  if (typeof apiGetPublicCoupons !== 'function') {
    return normalizedCode;
  }

  const res = await apiGetPublicCoupons();
  if (!res?.ok) {
    return normalizedCode;
  }

  const coupons = res?.data?.result?.coupons || res?.data?.result || [];
  if (!Array.isArray(coupons)) return normalizedCode;

  const matched = coupons.find(coupon => String(coupon?.code || '').trim().toUpperCase() === normalizedCode);
  return matched?._id || matched?.id || matched?.coupon_id || matched?.couponId || normalizedCode;
}

function syncPaymentMethodFromBooking() {
  const pm = state.booking?.payment_method;
  state.paymentMethod = (pm === 2 || pm === 'vnpay') ? 'vnpay' : 'momo';

  document.querySelectorAll('.co-pay-opt').forEach(el => {
    const input = el.querySelector('input');
    const method = input?.value;
    const isActive = method === state.paymentMethod;
    el.classList.toggle('active', !!isActive);
    if (input) input.checked = !!isActive;
  });
}

function renderAll() {
  renderContact();
  renderPassengers();
  renderSchedule();
  renderTour();
  updateSummary();
}

function renderContact() {
  const c = state.booking?.contact_info || {};
  setValue('coName', c.full_name || c.name || '');
  setValue('coEmail', c.email || '');
  setValue('coPhone', c.phone || '');
}

function getPassengers() {
  const p = state.booking?.passengers || {};
  return {
    adult: Number(p.adults || p.adult || 1),
    child: Number(p.children || p.child || 0),
    baby: Number(p.babies || p.baby || 0),
  };
}

function renderPassengers() {
  const p = getPassengers();
  setText('coAdults', p.adult);
  setText('coKids', p.child);
  setText('coBabies', p.baby);
}

function getTourSnapshot() {
  return state.booking?.tour_snapshot || {};
}

function renderSchedule() {
  const s = state.tour || getTourSnapshot();
  const dep = s.departure_date || s.departureDate;
  const ret = s.return_date || s.returnDate;
  setText('coSelectedDeparture', dep ? new Date(dep).toLocaleDateString('vi-VN') : '—');
  setText('coSelectedReturn', ret ? new Date(ret).toLocaleDateString('vi-VN') : '—');
}

function renderTour() {
  const t = state.tour || getTourSnapshot();
  const name = t.tour_name || t.name || t.title || 'Đơn đặt tour';
  const destination = t.destination || t.destination_city || '—';
  const durationDays = Number(t.duration_days || t.durationDays || 0);
  const durationNights = Number(t.duration_nights || t.durationNights || Math.max(0, durationDays - 1));
  const durationText = durationDays ? `${durationDays} ngày ${durationNights} đêm` : '';
  const destinationText = destination && destination !== '—' ? destination : '';
  const metaText = [destinationText, durationText].filter(Boolean).join(' • ') || '—';

  setText('coSummaryName', name);
  setText('coTourDestination', metaText);
  document.title = `Thanh toán - ${name}`;

  const breadcrumb = document.getElementById('coBreadcrumbTour');
  if (breadcrumb) {
    breadcrumb.textContent = name;
    const tourKey = t.tour_id || t.tourId || t.slug || t._id || '';
    if (tourKey) breadcrumb.href = `chi-tiet-tour.html?tour=${encodeURIComponent(tourKey)}`;
  }

  const imgEl = document.getElementById('coTourImg');
  if (!imgEl) return;

  const image = t.image || t.thumbnail || t.images?.[0] || t.tour_image || t.cover_image || '';
  if (image && /^(https?:|data:|\/)/.test(image)) {
    imgEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.4)), url("${image}")`;
    imgEl.style.backgroundSize = 'cover';
    imgEl.style.backgroundPosition = 'center';
  } else {
    imgEl.style.background = 'linear-gradient(135deg,#2d8a4e,#3aaa62)';
  }
}

function getBaseAmount() {
  const pd = state.booking?.price_detail || {};
  const baseFromDetail = Number(
    pd.total_price
    ?? pd.base_total
    ?? pd.original_total
    ?? 0
  );

  if (baseFromDetail > 0) return baseFromDetail;

  const bookingTotal = Number(state.booking?.total_price || 0);
  if (bookingTotal > 0) return bookingTotal;

  const finalTotal = Number(state.booking?.final_price || 0);
  return finalTotal > 0 ? finalTotal : 0;
}

function updateSummary() {
  const pd = state.booking?.price_detail || {};
  const passengers = getPassengers();

  const adultTotal = Number(pd.adult_total ?? 0);
  const childTotal = Number(pd.child_total ?? 0);
  const babyTotal = Number(pd.baby_total ?? 0);

  const adultUnit = passengers.adult > 0 ? Math.round(adultTotal / passengers.adult) : 0;
  const childUnit = passengers.child > 0 ? Math.round(childTotal / passengers.child) : 0;
  const babyUnit = passengers.baby > 0 ? Math.round(babyTotal / passengers.baby) : 0;

  setPriceRow('coPriceAdult', passengers.adult, adultUnit, adultTotal);
  setPriceRow('coPriceChild', passengers.child, childUnit, childTotal);
  setPriceRow('coPriceBaby', passengers.baby, babyUnit, babyTotal);

  const base = getBaseAmount();
  const discount = Number(pd.discount_amount ?? 0);
  const total = Number(state.booking?.final_price ?? Math.max(0, base - discount));

  setText('coPriceBase', base ? formatMoney(base) : '—');
  setText('coDiscount', discount ? '-' + formatMoney(discount) : 'Không có');
  setText('coPriceTotal', total ? formatMoney(total) : '—');
}

function setPriceRow(id, qty, unit, total) {
  const el = document.getElementById(id);
  if (!el) return;
  const qtyText = Number(qty || 0);
  if (!qtyText) {
    el.textContent = '0đ';
    return;
  }
  el.textContent = `${qtyText} x ${formatMoney(unit)} = ${formatMoney(total)}`;
}

function selectCoPayment(el, method) {
  document.querySelectorAll('.co-pay-opt').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  state.paymentMethod = method;
}

async function validateCoupon() {
  if (!state.bookingId) {
    showToast('⚠️ Không tìm thấy booking để áp dụng mã');
    return;
  }

  const codeEl = document.getElementById('coCouponCode');
  const code = (codeEl?.value || '').trim().toUpperCase();
  if (!code) {
    showToast('⚠️ Vui lòng nhập mã giảm giá');
    return;
  }

  try {
    const res = await apiValidateCoupon(code, getBaseAmount());
    const validated = normalizeValidatedCouponResponse(res, code);

    if (validated.isValid) {
      const couponId = validated.coupon?._id
        || validated.coupon?.id
        || validated.coupon?.coupon_id
        || validated.coupon?.couponId
        || await resolveCouponIdByCode(code);
      const user = getCurrentUser() || {};
      const userId = state.booking?.user_id || user._id || user.id || '';

      if (!couponId) {
        throw new Error('Không tìm thấy coupon_id để cập nhật booking');
      }
      if (!userId) {
        throw new Error('Không tìm thấy user_id để cập nhật booking');
      }

      const applyRes = await apiApplyBookingCoupon(couponId, {
        booking_id: state.bookingId,
        user_id: userId,
        coupon_code: code,
      });

      if (!applyRes?.ok) {
        throw new Error(applyRes?.data?.message || 'Không thể cập nhật booking với mã giảm giá');
      }

      const detailRes = await apiGetMyBooking(state.bookingId);
      if (!detailRes?.ok) {
        throw new Error(detailRes?.data?.message || 'Áp dụng mã thành công nhưng không thể đồng bộ booking mới');
      }

      const syncedBooking = detailRes?.data?.result?.booking || detailRes?.data?.result || null;
      if (!syncedBooking) {
        throw new Error('Dữ liệu booking sau khi áp dụng mã không hợp lệ');
      }

      state.booking = syncedBooking;
      updateSummary();
      showToast('✅ Đã áp dụng mã giảm giá');
      return;
    }

    showToast('❌ ' + mapCouponError(validated.reason));
  } catch (error) {
    console.error(error);
    showToast('⚠️ ' + (error?.message || 'Không thể kiểm tra mã giảm giá'));
  }
}

function normalizeValidatedCouponResponse(res, inputCode) {
  const result = res?.data?.result || {};
  const reason = result?.reason || res?.data?.reason || '';
  const nestedCoupon = result?.coupon || result?.coupon_detail || {};

  const discountAmount = Number(
    nestedCoupon?.discount_amount
    ?? nestedCoupon?.discountAmount
    ?? result?.discount_amount
    ?? result?.discountAmount
    ?? result?.discount_value
    ?? result?.discountValue
    ?? 0
  );

  const isValid = !!(res?.ok && !reason);

  return {
    isValid,
    reason: reason,
    message: result?.reason || res?.data?.reason || '',
    coupon: {
      ...nestedCoupon,
      ...result,
      code: inputCode,
      discount_amount: Number.isFinite(discountAmount) ? discountAmount : 0
    }
  };
}

function mapCouponError(reason) {
  if (!reason) return 'Mã không hợp lệ'

  const normalized = reason.toLowerCase()

  if (normalized.includes('not found')) return 'Mã không tồn tại'
  if (normalized.includes('inactive')) return 'Mã không hoạt động'
  if (normalized.includes('expired')) return 'Mã đã hết hạn'
  if (normalized.includes('max usage')) return 'Mã đã hết lượt sử dụng'
  if (normalized.includes('minimum order')) return 'Đơn chưa đạt giá trị tối thiểu'
  if (normalized.includes('already been used')) return 'Bạn đã sử dụng mã này rồi'

  return 'Mã không hợp lệ'
}

function mapCheckoutErrorMessage(message) {
  const raw = String(message || '').trim();
  const normalized = raw.toLowerCase();

  if (normalized.includes('booking already paid')) {
    return 'Booking đã được thanh toán';
  }

  if (normalized.includes('booking has expired')) {
    return 'Booking đã hết hạn thanh toán';
  }

  if (normalized.includes('booking already completed')) {
    return 'Booking đã hoàn thành';
  }

  if (normalized.includes('invalid booking status')) {
    return 'Trạng thái booking không hợp lệ';
  }

  return raw || 'Không thể tạo giao dịch thanh toán';
}

function extractCheckoutErrorMessageFromResponse(res) {
  const data = res?.data || {};
  const errors = data?.errors;

  if (errors && typeof errors === 'object') {
    if (errors?.booking_id?.msg) {
      return String(errors.booking_id.msg).trim();
    }

    const firstFieldKey = Object.keys(errors)[0] || '';
    const firstFieldMsg = firstFieldKey ? errors?.[firstFieldKey]?.msg : '';
    if (firstFieldMsg) {
      return String(firstFieldMsg).trim();
    }
  }

  return String(data?.message || '').trim();
}

async function doCheckout() {
  if (!state.bookingId) {
    showToast('⚠️ Không tìm thấy booking để thanh toán');
    return;
  }

  try {
    const res = typeof apiCreatePayment === 'function'
      ? await apiCreatePayment(state.bookingId, state.paymentMethod)
      : (state.paymentMethod === 'vnpay'
        ? await apiCreateVnpayPayment(state.bookingId)
        : await apiCreateMomoPayment(state.bookingId));

    if (!res?.ok) {
      const serverMessage = extractCheckoutErrorMessageFromResponse(res);
      throw new Error(serverMessage || 'Thanh toán thất bại');
    }

    const paymentUrl =
      res?.data?.result?.pay_url ||
      res?.data?.result?.payment_url ||
      res?.data?.result?.payUrl ||
      res?.data?.pay_url ||
      res?.data?.payment_url ||
      res?.data?.payUrl ||
      '';

    if (paymentUrl) {
      window.location.href = paymentUrl;
      return;
    }

    showToast('✅ Tạo giao dịch thành công nhưng không có đường dẫn thanh toán');
    window.location.href = 'ket-qua-thanh-toan.html?booking_id=' + encodeURIComponent(state.bookingId);
  } catch (error) {
    console.error(error);
    showToast('❌ ' + mapCheckoutErrorMessage(error?.message));
  }
}

function setActionButtonsDisabled(disabled) {
  const applyBtn = document.getElementById('coApplyCouponBtn');
  const checkoutBtn = document.getElementById('coCheckoutBtn');
  if (applyBtn) applyBtn.disabled = !!disabled;
  if (checkoutBtn) checkoutBtn.disabled = !!disabled;
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('vt_user') || 'null');
  } catch {
    return null;
  }
}

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

function showAvailabilityNotice(message) {
  const el = document.getElementById('coAvailabilityNotice');
  if (!el) return;
  el.textContent = message;
  el.style.display = 'block';
}
