// ============================================================
// 3checkout.js – Trang Đặt Chỗ (kết nối API)
// ============================================================

var coCalendarDate = null;
var coAdultsCount  = 2;
var coKidsCount    = 0;
var coPayMethod    = 'momo';
var coTourData     = null;
var coScheduleId   = null;
var coCouponData   = null;

// ============================================================
// KHỞI TẠO
// ============================================================
window.addEventListener('DOMContentLoaded', async function () {
  initNav();

  const params  = new URLSearchParams(window.location.search);
  const tourKey = params.get('tour') || 't1';

  // Thử lấy tour từ API
  try {
    const res = await apiGetTour(tourKey);
    if (res && res.ok && res.data.result) {
      coTourData = res.data.result.tour || res.data.result;
    }
  } catch(e) {}

  // Fallback local
  if (!coTourData) {
    coTourData = getActiveTours().find(t => t.imgKey === tourKey) || getActiveTours()[0];
  }

  if (!coTourData) return;

  // Hiển thị tour info
  const bg = getImgBg(coTourData.imgKey || coTourData.images?.[0]);
  const imgEl = document.getElementById('coTourImg');
  if (imgEl) { imgEl.style.background = bg; imgEl.style.backgroundSize = 'cover'; imgEl.style.backgroundPosition = 'center'; }

  const name     = coTourData.title || coTourData.name || '—';
  const location = coTourData.location || coTourData.destination || '—';
  const price    = coTourData.price || '—';
  const badge    = coTourData.badge || coTourData.duration_days + ' ngày' || '';

  if (document.getElementById('coTourName'))     document.getElementById('coTourName').textContent     = name;
  if (document.getElementById('coSummaryName'))  document.getElementById('coSummaryName').textContent  = name;
  if (document.getElementById('coTourLocation')) document.getElementById('coTourLocation').textContent = '📍 ' + location;
  if (document.getElementById('coMetaLoc'))      document.getElementById('coMetaLoc').textContent      = location;
  if (document.getElementById('coTourBadge'))    document.getElementById('coTourBadge').textContent    = badge;

  const priceEl = document.getElementById('coBasePrice');
  if (priceEl) priceEl.textContent = price;

  // Load lịch khởi hành từ API
  if (coTourData._id || coTourData.id) {
    try {
      const sid = coTourData._id || coTourData.id;
      const sres = await apiGetSchedules(sid);
      if (sres && sres.ok && sres.data.result) {
        const schedules = sres.data.result.schedules || [];
        if (schedules.length) coScheduleId = schedules[0]._id;
      }
    } catch(e) {}
  }

  // Tự điền thông tin user
  const u = loadUser();
  if (u) {
    if (document.getElementById('coName'))  document.getElementById('coName').value  = u.name  || '';
    if (document.getElementById('coEmail')) document.getElementById('coEmail').value = u.email || '';
    if (document.getElementById('coPhone')) document.getElementById('coPhone').value = u.phone || '';
  }

  buildCalendar();
  updateCoSummary();
});

// ============================================================
// CALENDAR
// ============================================================
var coCalMonth = new Date().getMonth();
var coCalYear  = new Date().getFullYear();

function buildCalendar() {
  const cal = document.getElementById('coCalendar');
  if (!cal) return;
  const days   = ['CN','T2','T3','T4','T5','T6','T7'];
  const today  = new Date(); today.setHours(0,0,0,0);
  const first  = new Date(coCalYear, coCalMonth, 1);
  const total  = new Date(coCalYear, coCalMonth+1, 0).getDate();
  const startDow = first.getDay();

  let html = '<div class="co-cal-nav"><button onclick="coNavCal(-1)">‹</button><span>Tháng ' + (coCalMonth+1) + ', ' + coCalYear + '</span><button onclick="coNavCal(1)">›</button></div>';
  html += '<div class="co-cal-grid">';
  days.forEach(d => html += '<div class="co-cal-day-name">' + d + '</div>');
  for (let i = 0; i < startDow; i++) html += '<div></div>';
  for (let d = 1; d <= total; d++) {
    const date    = new Date(coCalYear, coCalMonth, d);
    const dateStr = coCalYear + '-' + String(coCalMonth+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    const isPast  = date < today;
    const isSel   = coCalendarDate === dateStr;
    html += '<div class="co-cal-day' + (isPast?' past':'') + (isSel?' selected':'') + '" onclick="' + (isPast?'':'coSelectDate(\''+dateStr+'\')') + '">' + d + '</div>';
  }
  html += '</div>';
  cal.innerHTML = html;
}

function coNavCal(dir) {
  coCalMonth += dir;
  if (coCalMonth > 11) { coCalMonth = 0; coCalYear++; }
  if (coCalMonth < 0)  { coCalMonth = 11; coCalYear--; }
  buildCalendar();
}

function coSelectDate(dateStr) {
  coCalendarDate = dateStr;
  buildCalendar();
  const el = document.getElementById('coSelectedDate');
  if (el) el.textContent = dateStr;
  updateCoSummary();
}

// ============================================================
// GUESTS
// ============================================================
function changeGuests(type, delta) {
  if (type === 'adults') { coAdultsCount = Math.max(1, coAdultsCount + delta); if (document.getElementById('coAdults')) document.getElementById('coAdults').textContent = coAdultsCount; }
  if (type === 'kids')   { coKidsCount   = Math.max(0, coKidsCount + delta);   if (document.getElementById('coKids'))   document.getElementById('coKids').textContent   = coKidsCount;   }
  updateCoSummary();
}

// ============================================================
// PAYMENT
// ============================================================
function selectCoPayment(el, method) {
  document.querySelectorAll('.co-pay-opt').forEach(l => l.classList.remove('active'));
  el.classList.add('active');
  coPayMethod = method;
  const momoEl  = document.getElementById('coPayMomo');
  const vnpayEl = document.getElementById('coPayVnpay');
  if (momoEl)  momoEl.style.display  = method === 'momo'  ? 'block' : 'none';
  if (vnpayEl) vnpayEl.style.display = method === 'vnpay' ? 'block' : 'none';
}

// ============================================================
// COUPON
// ============================================================
async function validateCoupon() {
  const code  = (document.getElementById('coCouponCode')?.value || '').trim().toUpperCase();
  const total = calcTotal();
  if (!code) return;

  try {
    const res = await apiValidateCoupon(code, total);
    if (res && res.ok && res.data.result && res.data.result.is_valid) {
      coCouponData = res.data.result;
      showToast('✅ Mã giảm giá hợp lệ: -' + res.data.result.discount_amount.toLocaleString('vi-VN') + 'đ');
      updateCoSummary();
    } else {
      coCouponData = null;
      showToast('❌ ' + (res?.data?.message || 'Mã không hợp lệ'));
    }
  } catch(e) {
    showToast('⚠️ Không thể kiểm tra mã, thử lại sau');
  }
}

// ============================================================
// SUMMARY
// ============================================================
function calcTotal() {
  const priceStr  = coTourData ? (coTourData.price || coTourData.price_adult || '0') : '0';
  const priceNum  = parseInt(String(priceStr).replace(/[^\d]/g,'')) || 0;
  const adultAmt  = priceNum * coAdultsCount;
  const kidAmt    = Math.floor(priceNum * 0.7) * coKidsCount;
  const service   = Math.floor((adultAmt + kidAmt) * 0.025);
  const tax       = Math.floor((adultAmt + kidAmt) * 0.035);
  const base      = adultAmt + kidAmt + service + tax;
  const discount  = coCouponData ? (coCouponData.discount_amount || 0) : 0;
  return Math.max(0, base - discount);
}

function updateCoSummary() {
  const priceStr  = coTourData ? (coTourData.price || '0') : '0';
  const priceNum  = parseInt(String(priceStr).replace(/[^\d]/g,'')) || 0;
  const adultAmt  = priceNum * coAdultsCount;
  const kidAmt    = Math.floor(priceNum * 0.7) * coKidsCount;
  const service   = Math.floor((adultAmt + kidAmt) * 0.025);
  const tax       = Math.floor((adultAmt + kidAmt) * 0.035);
  const discount  = coCouponData ? (coCouponData.discount_amount || 0) : 0;
  const total     = Math.max(0, adultAmt + kidAmt + service + tax - discount);
  const fmt       = n => n.toLocaleString('vi-VN') + 'đ';

  if (document.getElementById('coBasePrice'))    document.getElementById('coBasePrice').textContent    = fmt(adultAmt + kidAmt);
  if (document.getElementById('coPriceBase'))    document.getElementById('coPriceBase').textContent    = fmt(adultAmt + kidAmt);
  if (document.getElementById('coServiceFee'))   document.getElementById('coServiceFee').textContent   = fmt(service);
  if (document.getElementById('coTax'))          document.getElementById('coTax').textContent          = fmt(tax);
  if (document.getElementById('coDiscount'))     document.getElementById('coDiscount').textContent     = discount ? '-' + fmt(discount) : 'Không có';
  if (document.getElementById('coTotal'))        document.getElementById('coTotal').textContent        = fmt(total);
  if (document.getElementById('coPriceTotal'))   document.getElementById('coPriceTotal').textContent   = fmt(total);
  if (document.getElementById('coBtnTotal'))     document.getElementById('coBtnTotal').textContent     = fmt(total);
  if (document.getElementById('coTourGuests'))   document.getElementById('coTourGuests').textContent   = coAdultsCount + ' người lớn' + (coKidsCount ? ', ' + coKidsCount + ' trẻ em' : '');
  if (document.getElementById('coMetaGuests'))   document.getElementById('coMetaGuests').textContent   = coAdultsCount + ' người lớn' + (coKidsCount ? ', ' + coKidsCount + ' trẻ em' : '');
  if (document.getElementById('coTourDate'))     document.getElementById('coTourDate').textContent     = coCalendarDate || 'Chưa chọn';
  if (document.getElementById('coMetaDate'))     document.getElementById('coMetaDate').textContent     = coCalendarDate || 'Chưa chọn';
}

// ============================================================
// CHECKOUT – SUBMIT
// ============================================================
async function doCheckout() {
  const name    = (document.getElementById('coName')?.value  || '').trim();
  const email   = (document.getElementById('coEmail')?.value || '').trim();
  const phone   = (document.getElementById('coPhone')?.value || '').trim();

  if (!coCalendarDate) { showToast('⚠️ Vui lòng chọn ngày khởi hành'); return; }
  if (!name)   { showToast('⚠️ Vui lòng nhập họ và tên'); return; }
  if (!email)  { showToast('⚠️ Vui lòng nhập email'); return; }
  if (!phone)  { showToast('⚠️ Vui lòng nhập số điện thoại'); return; }

  const btn = document.getElementById('coCheckoutBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang xử lý...'; }

  const total      = calcTotal();
  const totalStr   = total.toLocaleString('vi-VN') + 'đ';
  const code       = 'VNT-' + Math.floor(10000 + Math.random() * 90000);
  const tourName   = coTourData ? (coTourData.title || coTourData.name) : '—';
  const guestStr   = coAdultsCount + ' người lớn' + (coKidsCount ? ', ' + coKidsCount + ' trẻ em' : '');
  const payMethodMap = { momo:'MoMo', vnpay:'VNPay' };

  try {
    // Gọi API tạo booking
    if (coScheduleId || (coTourData && (coTourData._id || coTourData.id))) {
      const bookingBody = {
        schedule_id: coScheduleId || coTourData._id || coTourData.id,
        passengers: { adults: coAdultsCount, children: coKidsCount, babies: 0 },
        payment_method: coPayMethod === 'momo' ? 1 : 2,
        contact_info: { full_name: name, phone, email },
        coupon_code: document.getElementById('coCouponCode')?.value || undefined,
      };

      const res = await apiCreateBooking(bookingBody);
      if (res && res.ok && res.data.result) {
        const { booking, payment_url } = res.data.result;
        // Lưu local
        saveBkLocal(booking?.booking_code || code, tourName, coCalendarDate, guestStr, totalStr, payMethodMap[coPayMethod]);
        if (payment_url) { window.location.href = payment_url; return; }
        redirectSuccess(booking?.booking_code || code, tourName, guestStr, totalStr);
        return;
      }
    }
  } catch(e) { /* fallback */ }

  // Fallback local
  saveBkLocal(code, tourName, coCalendarDate, guestStr, totalStr, payMethodMap[coPayMethod]);
  if (btn) { btn.disabled = false; btn.textContent = 'Xác nhận & Thanh toán'; }
  redirectSuccess(code, tourName, guestStr, totalStr);
}

function saveBkLocal(code, tourName, date, guests, total, payment) {
  const u = loadUser();
  if (!u) return;
  const key = 'vt_bookings_' + u.email;
  const bks = JSON.parse(localStorage.getItem(key) || '[]');
  bks.unshift({ code, tourName, date, guests, total, payment, status:'upcoming', bg:'linear-gradient(135deg,#2d8a4e,#3aaa62)', createdAt: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(bks));
}

function redirectSuccess(code, tour, guests, total) {
  window.location.href = '1thanhcong.html?code=' + code +
    '&tour=' + encodeURIComponent(tour) +
    '&date=' + encodeURIComponent(coCalendarDate||'') +
    '&guests=' + encodeURIComponent(guests) +
    '&total=' + encodeURIComponent(total);
}

// Format card number
function formatCardNum(inp) {
  inp.value = inp.value.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim().slice(0,19);
}