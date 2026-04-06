// ============================================================
// 3booking.js – Booking Modal (kết nối API)
// ============================================================

var currentTour = '';
var currentPrice = 0;
var currentTourId = '';

function openBookingModal(tourName, price, tourId) {
  if (typeof checkUserVerifiedForAction !== 'undefined' && !checkUserVerifiedForAction('đặt tour')) {
    return;
  }
  currentTour = tourName || '';
  currentPrice = parseInt((price || '0').replace(/[^\d]/g, '')) || 0;
  currentTourId = tourId || '';

  document.getElementById('modalTourName').textContent = currentTour;
  document.getElementById('modalTourPrice').textContent = price || '—';
  document.getElementById('sumTour').textContent = currentTour;
  document.getElementById('sumPrice').textContent = price || '—';

  // Auto-fill thông tin user
  const u = loadUser();
  if (u) {
    if (document.getElementById('mName')) document.getElementById('mName').value = u.name || '';
    if (document.getElementById('mPhone')) document.getElementById('mPhone').value = u.phone || '';
    if (document.getElementById('mEmail')) document.getElementById('mEmail').value = u.email || '';
  }

  // Set ngày tối thiểu
  const today = new Date().toISOString().split('T')[0];
  if (document.getElementById('mDate')) document.getElementById('mDate').min = today;

  updateModalSummary();
  goStep(1);
  document.getElementById('bookingOverlay').classList.add('open');
  document.getElementById('bookingModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeBookingModal() {
  document.getElementById('bookingOverlay').classList.remove('open');
  document.getElementById('bookingModal').classList.remove('open');
  document.body.style.overflow = '';
}

function updateModalSummary() {
  const adults = parseInt(document.getElementById('mAdults')?.value) || 2;
  const kids = parseInt(document.getElementById('mKids')?.value) || 0;
  const total = currentPrice * adults + Math.floor(currentPrice * 0.7) * kids;
  const people = adults + ' người lớn' + (kids > 0 ? ', ' + kids + ' trẻ em' : '');

  if (document.getElementById('sumPeople')) document.getElementById('sumPeople').textContent = people;
  if (document.getElementById('sumTotal')) document.getElementById('sumTotal').textContent = total.toLocaleString('vi-VN') + 'đ';
  if (document.getElementById('sumTotal2')) document.getElementById('sumTotal2').textContent = total.toLocaleString('vi-VN') + 'đ';
}

function selectPayment(el, method) {
  document.querySelectorAll('.pay-method').forEach(l => l.classList.remove('active'));
  el.classList.add('active');
  const bankInfo = document.getElementById('bankInfo');
  if (bankInfo) bankInfo.style.display = method === 'bank' ? 'block' : 'none';
}

function goStep(n) {
  [1, 2, 3].forEach(i => {
    const body = document.getElementById('modalStep' + i);
    const dot = document.getElementById('step' + i + '-dot');
    if (body) body.style.display = (i === n) ? 'block' : 'none';
    if (dot) { dot.classList.toggle('active', i === n); dot.classList.toggle('done', i < n); }
  });
  if (n === 3) doConfirmBooking();
}

async function doConfirmBooking() {
  if (typeof checkUserVerifiedForAction !== 'undefined' && !checkUserVerifiedForAction('đặt tour')) {
    return;
  }
  const name = document.getElementById('mName')?.value || '';
  const phone = document.getElementById('mPhone')?.value || '';
  const email = document.getElementById('mEmail')?.value || '';
  const date = document.getElementById('mDate')?.value || '';
  const adults = parseInt(document.getElementById('mAdults')?.value) || 2;
  const kids = parseInt(document.getElementById('mKids')?.value) || 0;
  const payment = document.querySelector('.pay-method.active input')?.value || 'bank';
  const note = document.getElementById('mNote')?.value || '';

  if (!currentTourId) {
    showToast('⚠️ Không tìm thấy lịch khởi hành hợp lệ để tạo booking');
    return;
  }

  // Gọi API tạo booking và điều hướng sang trang thanh toán bằng booking_id
  try {
    const res = await apiCreateBooking({
      schedule_id: currentTourId,
      passengers: { adults: adults, children: kids, babies: 0 },
      payment_method: payment === 'vnpay' ? 2 : 1,
      contact_info: { full_name: name, phone, email },
      note
    });

    if (!res || !res.ok) {
      const apiMsg = res?.data?.message || '';
      const errs = res?.data?.errors;
      let firstErr = '';
      if (Array.isArray(errs) && errs.length) {
        firstErr = errs[0]?.msg || errs[0]?.message || '';
      } else if (errs && typeof errs === 'object') {
        const firstVal = Object.values(errs)[0];
        firstErr = firstVal?.msg || firstVal?.message || String(firstVal || '');
      }
      showToast('❌ ' + (firstErr || apiMsg || 'Không thể tạo booking'));
      return;
    }

    const result = res?.data?.result || {};
    const booking = result?.booking || result;
    const bookingId = booking?._id || booking?.id || result?.booking_id || result?.id;

    if (!bookingId) {
      showToast('❌ Không nhận được booking_id từ hệ thống');
      return;
    }

    closeBookingModal();
    window.location.href = 'dat-tour.html?booking_id=' + encodeURIComponent(bookingId);
  } catch (e) {
    console.error(e);
    showToast('❌ Không thể tạo booking');
  }
}