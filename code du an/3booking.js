// ============================================================
// 3booking.js – Booking Modal (kết nối API)
// ============================================================

var currentTour  = '';
var currentPrice = 0;
var currentTourId = '';

function openBookingModal(tourName, price, tourId) {
  currentTour    = tourName || '';
  currentPrice   = parseInt((price || '0').replace(/[^\d]/g,'')) || 0;
  currentTourId  = tourId || '';

  document.getElementById('modalTourName').textContent  = currentTour;
  document.getElementById('modalTourPrice').textContent = price || '—';
  document.getElementById('sumTour').textContent        = currentTour;
  document.getElementById('sumPrice').textContent       = price || '—';

  // Auto-fill thông tin user
  const u = loadUser();
  if (u) {
    if (document.getElementById('mName'))  document.getElementById('mName').value  = u.name  || '';
    if (document.getElementById('mPhone')) document.getElementById('mPhone').value = u.phone || '';
    if (document.getElementById('mEmail')) document.getElementById('mEmail').value = u.email || '';
  }

  // Set ngày tối thiểu
  const today = new Date().toISOString().split('T')[0];
  if (document.getElementById('mDate')) document.getElementById('mDate').min = today;

  updateModalSummary();
  goStep(1);
  document.getElementById('bookingOverlay').style.display = 'block';
  document.getElementById('bookingModal').style.display   = 'block';
}

function closeBookingModal() {
  document.getElementById('bookingOverlay').style.display = 'none';
  document.getElementById('bookingModal').style.display   = 'none';
}

function updateModalSummary() {
  const adults  = parseInt(document.getElementById('mAdults')?.value)  || 2;
  const kids    = parseInt(document.getElementById('mKids')?.value)    || 0;
  const total   = currentPrice * adults + Math.floor(currentPrice * 0.7) * kids;
  const people  = adults + ' người lớn' + (kids > 0 ? ', ' + kids + ' trẻ em' : '');

  if (document.getElementById('sumPeople')) document.getElementById('sumPeople').textContent = people;
  if (document.getElementById('sumTotal'))  document.getElementById('sumTotal').textContent  = total.toLocaleString('vi-VN') + 'đ';
  if (document.getElementById('sumTotal2')) document.getElementById('sumTotal2').textContent = total.toLocaleString('vi-VN') + 'đ';
}

function selectPayment(el, method) {
  document.querySelectorAll('.pay-method').forEach(l => l.classList.remove('active'));
  el.classList.add('active');
  const bankInfo = document.getElementById('bankInfo');
  if (bankInfo) bankInfo.style.display = method === 'bank' ? 'block' : 'none';
}

function goStep(n) {
  [1,2,3].forEach(i => {
    const body = document.getElementById('modalStep' + i);
    const dot  = document.getElementById('step' + i + '-dot');
    if (body) body.style.display = (i === n) ? 'block' : 'none';
    if (dot)  { dot.classList.toggle('active', i === n); dot.classList.toggle('done', i < n); }
  });
  if (n === 3) doConfirmBooking();
}

async function doConfirmBooking() {
  const name    = document.getElementById('mName')?.value   || '';
  const phone   = document.getElementById('mPhone')?.value  || '';
  const email   = document.getElementById('mEmail')?.value  || '';
  const date    = document.getElementById('mDate')?.value   || '';
  const adults  = parseInt(document.getElementById('mAdults')?.value) || 2;
  const kids    = parseInt(document.getElementById('mKids')?.value)   || 0;
  const payment = document.querySelector('.pay-method.active input')?.value || 'bank';
  const note    = document.getElementById('mNote')?.value   || '';

  const totalAmt  = currentPrice * adults + Math.floor(currentPrice * 0.7) * kids;
  const totalStr  = totalAmt.toLocaleString('vi-VN') + 'đ';
  const guestStr  = adults + ' người lớn' + (kids > 0 ? ', ' + kids + ' trẻ em' : '');
  const code      = 'VNT-' + Math.floor(10000 + Math.random() * 90000);
  const methodMap = { bank:'Chuyển khoản', card:'Thẻ tín dụng', momo:'MoMo', vnpay:'VNPay', cod:'Tiền mặt' };

  // Hiện mã booking
  if (document.getElementById('bookingCode'))  document.getElementById('bookingCode').textContent  = code;
  if (document.getElementById('confirmEmail')) document.getElementById('confirmEmail').textContent = email;

  // Lưu booking vào localStorage (luôn làm để hiện lịch sử)
  const u = loadUser();
  if (u) {
    const key      = 'vt_bookings_' + u.email;
    const bookings = JSON.parse(localStorage.getItem(key) || '[]');
    bookings.unshift({
      code, tourName: currentTour, date, guests: guestStr,
      total: totalStr, payment: methodMap[payment] || payment,
      status: 'upcoming', bg: 'linear-gradient(135deg,#2d8a4e,#3aaa62)',
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(key, JSON.stringify(bookings));
  }

  // Gọi API tạo booking (nếu có backend)
  try {
    if (currentTourId) {
      const payMethod = payment === 'momo' ? 1 : 2; // 1=momo, 2=vnpay
      const res = await apiCreateBooking({
        schedule_id: currentTourId,
        passengers: { adults, children: kids, babies: 0 },
        payment_method: payMethod,
        contact_info: { full_name: name, phone, email },
        note
      });
      if (res && res.ok && res.data.result) {
        const { booking, payment_url } = res.data.result;
        // Có payment_url → redirect thanh toán
        if (payment_url) {
          setTimeout(function(){ window.location.href = payment_url; }, 1500);
          return;
        }
      }
    }
  } catch(e) { /* tiếp tục với local flow */ }

  // Redirect trang thành công sau 1.5s
  setTimeout(function() {
    closeBookingModal();
    window.location.href = '1thanhcong.html?code=' + code +
      '&tour=' + encodeURIComponent(currentTour) +
      '&date=' + encodeURIComponent(date) +
      '&guests=' + encodeURIComponent(guestStr) +
      '&total=' + encodeURIComponent(totalStr);
  }, 1500);
}