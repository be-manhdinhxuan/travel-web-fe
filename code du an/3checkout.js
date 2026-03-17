// ============================================================
// 3checkout.js – Logic trang Hoàn Tất Đặt Chỗ (1datour.html)
// ============================================================

let coSelectedDate = null;
let coAdults = 2, coKids = 0;
let coCurrentTour = null;
let coCalYear, coCalMonth;

function openCheckout(imgKey) {
  const tour = getActiveTours().find(t => t.imgKey === imgKey) || getActiveTours()[0];
  coCurrentTour = tour;
  coAdults = 2; coKids = 0;
  coSelectedDate = null;

  // Auto-fill thông tin user nếu đã đăng nhập
  const u = loadUser();
  if (u) {
    const n = document.getElementById('coName');  if (n) n.value = u.name  || '';
    const e = document.getElementById('coEmail'); if (e) e.value = u.email || '';
    const p = document.getElementById('coPhone'); if (p) p.value = u.phone || '';
  }

  // Sidebar: ảnh + badge
  const imgEl = document.getElementById('coTourImg');
  if (imgEl) {
    imgEl.style.background       = IMG_BG[tour.imgKey] || 'linear-gradient(135deg,#2d8a4e,#3aaa62)';
    imgEl.style.backgroundSize   = 'cover';
    imgEl.style.backgroundPosition = 'center';
  }
  const badgeEl = document.getElementById('coTourBadge');
  if (badgeEl) badgeEl.textContent = tour.badge;

  // Sidebar: tên + sao + địa điểm
  const nameEl  = document.getElementById('coSummaryName');
  const starEl  = document.getElementById('coSummaryStars');
  const locEl   = document.getElementById('coMetaLoc');
  const dateEl  = document.getElementById('coMetaDate');
  const guestEl = document.getElementById('coMetaGuests');

  if (nameEl)  nameEl.textContent  = tour.title;
  if (starEl)  starEl.textContent  = tour.stars + ' (' + tour.reviews + ' đánh giá)';
  if (locEl)   locEl.textContent   = tour.location;
  if (dateEl)  dateEl.textContent  = 'Chưa chọn';
  if (guestEl) guestEl.textContent = '2 người lớn';

  // Số khách hiển thị
  const adEl = document.getElementById('coAdults');
  const kdEl = document.getElementById('coKids');
  if (adEl) adEl.textContent = coAdults;
  if (kdEl) kdEl.textContent = coKids;

  updateCoSummary();

  // Render lịch
  const now = new Date();
  coCalYear  = now.getFullYear();
  coCalMonth = now.getMonth();
  renderCalendar();
}

// ============ CALENDAR ============
function renderCalendar() {
  const calEl = document.getElementById('coCalendar');
  if (!calEl) return;

  const days   = ['CN','T2','T3','T4','T5','T6','T7'];
  const months = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5',
                  'Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  const today    = new Date(); today.setHours(0,0,0,0);
  const firstDay = new Date(coCalYear, coCalMonth, 1).getDay();
  const daysInM  = new Date(coCalYear, coCalMonth + 1, 0).getDate();

  let html = '<div class="co-cal-nav">'
    + '<button onclick="changeCalMonth(-1)">‹</button>'
    + '<span>' + months[coCalMonth] + ', ' + coCalYear + '</span>'
    + '<button onclick="changeCalMonth(1)">›</button>'
    + '</div>'
    + '<div class="co-cal-grid">'
    + days.map(d => '<div class="co-cal-day-name">' + d + '</div>').join('')
    + Array(firstDay).fill('<div></div>').join('');

  for (let d = 1; d <= daysInM; d++) {
    const date       = new Date(coCalYear, coCalMonth, d);
    const isPast     = date < today;
    const isSelected = coSelectedDate && date.toDateString() === coSelectedDate.toDateString();
    html += '<div class="co-cal-day'
      + (isPast ? ' past' : '')
      + (isSelected ? ' selected' : '') + '"'
      + (!isPast ? ' onclick="selectCoDate(' + coCalYear + ',' + coCalMonth + ',' + d + ')"' : '')
      + '>' + d + '</div>';
  }
  html += '</div>';
  calEl.innerHTML = html;
}

function changeCalMonth(dir) {
  coCalMonth += dir;
  if (coCalMonth < 0)  { coCalMonth = 11; coCalYear--; }
  if (coCalMonth > 11) { coCalMonth = 0;  coCalYear++; }
  renderCalendar();
}

function selectCoDate(y, m, d) {
  coSelectedDate = new Date(y, m, d);
  const fmt = coSelectedDate.toLocaleDateString('vi-VN', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  });
  const dateEl = document.getElementById('coMetaDate');
  if (dateEl) dateEl.textContent = fmt;
  updateCoSummary();
  renderCalendar();
}

// ============ GUESTS ============
function changeGuests(type, delta) {
  if (type === 'adults') coAdults = Math.max(1, coAdults + delta);
  if (type === 'kids')   coKids   = Math.max(0, coKids   + delta);

  const adEl = document.getElementById('coAdults');
  const kdEl = document.getElementById('coKids');
  if (adEl) adEl.textContent = coAdults;
  if (kdEl) kdEl.textContent = coKids;

  const guestEl = document.getElementById('coMetaGuests');
  if (guestEl) guestEl.textContent = coAdults + ' người lớn'
    + (coKids > 0 ? ' + ' + coKids + ' trẻ em' : '');

  updateCoSummary();
}

// ============ SUMMARY ============
function updateCoSummary() {
  if (!coCurrentTour) return;
  const unit  = parseInt(coCurrentTour.price.replace(/\D/g, '')) || 0;
  const base  = unit * coAdults + Math.floor(unit * 0.5) * coKids;
  const fee   = 360000;
  const tax   = 500000;
  const total = base + fee + tax;

  const baseEl  = document.getElementById('coPriceBase');
  const totalEl = document.getElementById('coPriceTotal');
  if (baseEl)  baseEl.textContent  = base.toLocaleString('vi-VN')  + 'đ';
  if (totalEl) totalEl.textContent = total.toLocaleString('vi-VN') + 'đ';
}

// ============ PAYMENT ============
function selectCoPayment(el, method) {
  document.querySelectorAll('.co-pay-opt').forEach(function(l) { l.classList.remove('active'); });
  el.classList.add('active');
  // Ẩn/hiện info tương ứng
  var momo  = document.getElementById('coPayMomo');
  var vnpay = document.getElementById('coPayVnpay');
  if (momo)  momo.style.display  = method === 'momo'  ? 'block' : 'none';
  if (vnpay) vnpay.style.display = method === 'vnpay' ? 'block' : 'none';
}

function formatCardNum(inp) {
  let v = inp.value.replace(/\D/g, '').substring(0, 16);
  inp.value = v.replace(/(.{4})/g, '$1 ').trim();
}

// ============ SUBMIT ============
function doCheckout() {
  if (!coSelectedDate) { showToast('⚠️ Vui lòng chọn ngày khởi hành'); return; }

  const name  = (document.getElementById('coName')?.value  || '').trim();
  const email = (document.getElementById('coEmail')?.value || '').trim();
  const phone = (document.getElementById('coPhone')?.value || '').trim();

  if (!name)  { showToast('⚠️ Vui lòng nhập họ và tên');      return; }
  if (!email) { showToast('⚠️ Vui lòng nhập email');           return; }
  if (!phone) { showToast('⚠️ Vui lòng nhập số điện thoại'); return; }

  const code       = 'VNT-' + Math.floor(Math.random() * 90000 + 10000);
  const dateText   = coSelectedDate.toLocaleDateString('vi-VN');
  const guestsText = coAdults + ' người lớn' + (coKids > 0 ? ' + ' + coKids + ' trẻ em' : '');
  const totalText  = document.getElementById('coPriceTotal')?.textContent || '—';

  // Lưu lịch sử cá nhân
  try {
    const u = loadUser();
    if (u) {
      const key      = 'vt_bookings_' + u.email;
      const bookings = JSON.parse(localStorage.getItem(key) || '[]');
      bookings.unshift({
        code,
        tourName : coCurrentTour?.title || '—',
        date     : dateText,
        guests   : guestsText,
        total    : totalText,
        payment  : document.querySelector('.co-pay-opt.active')?.dataset.method || 'Không rõ',
        status   : 'confirmed',
        bg       : IMG_BG[coCurrentTour?.imgKey] || 'linear-gradient(135deg,#2d8a4e,#3aaa62)'
      });
      localStorage.setItem(key, JSON.stringify(bookings));
    }
  } catch (e) {}

  // Redirect sang trang thành công
  const params = new URLSearchParams({
    code,
    tour   : coCurrentTour?.title || '—',
    date   : dateText,
    guests : guestsText,
    total  : totalText
  });
  window.location.href = '1thanhcong.html?' + params.toString();
}