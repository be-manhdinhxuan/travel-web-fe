// ============================================================
// chi-tiet-tour.js
// ============================================================

// STATE
let tourData = null;
let schedules = [];
let selectedSchedule = null;
let guests = { adult: 1, child: 0, baby: 0 };

const HIGHLIGHT_ICON = `
<svg class="ct-highlight-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M12 3.5L13.9 8.1L18.9 8.5L15.1 11.7L16.3 16.6L12 13.9L7.7 16.6L8.9 11.7L5.1 8.5L10.1 8.1L12 3.5Z" fill="currentColor"/>
  <circle cx="19" cy="5" r="2" fill="currentColor" opacity="0.65"/>
</svg>`;

// INIT
window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug') || params.get('tour') || params.get('id');

  if (!slug) {
    showError();
    return;
  }

  await loadTour(slug);
});

// LOAD TOUR
async function loadTour(slug) {
  try {
    const res = await apiGetTour(slug);

    if (!res || !res.ok) {
      showError();
      return;
    }

    const result = res.data?.result?.tour || res.data?.result;
    tourData = result?.tour || result;
    schedules = result?.schedules || [];

    renderTour();
    renderSchedules();

    document.getElementById('ctLoading').style.display = 'none';
    document.getElementById('ctMain').style.display = 'block';
  } catch (e) {
    console.error(e);
    showError();
  }
}

// RENDER TOUR
function renderTour() {
  const t = tourData;
  if (!t) return;

  document.getElementById('ctBreadcrumbName').textContent = t.name || '—';
  document.title = (t.name || 'Chi tiết tour') + ' – VietnamTravel';

  const img = t.images?.[0] || '';
  const heroImg = document.getElementById('ctHeroImg');
  if (img) {
    heroImg.src = img;
    heroImg.alt = t.name;
  } else {
    heroImg.parentElement.style.background = 'linear-gradient(135deg,#2d8a4e,#3aaa62)';
  }

  document.getElementById('ctDuration').textContent =
    t.duration_days ? `${t.duration_days} ngày ${t.duration_nights} đêm` : '—';
  document.getElementById('ctHeroTitle').textContent = t.name || '—';
  document.getElementById('ctDestination').textContent = t.destination || '—';
  document.getElementById('ctDepartureCity').textContent = t.departure_city || '—';

  document.getElementById('ctDesc').textContent = t.description || '—';

  if (t.highlights?.length) {
    document.getElementById('ctHighlights').innerHTML =
      t.highlights.map(h => `<div class="ct-highlight-item">${HIGHLIGHT_ICON}<span class="ct-highlight-text">${h}</span></div>`).join('');
  } else {
    document.getElementById('ctHighlightsSection').style.display = 'none';
  }

  if (t.itinerary?.length) {
    document.getElementById('ctItinerary').innerHTML =
      t.itinerary.map(day => `
        <div class="ct-day">
          <div class="ct-day-num">${day.day}</div>
          <div class="ct-day-body">
            <div class="ct-day-title">${day.title}</div>
            <div class="ct-day-desc">${day.description}</div>
          </div>
        </div>`).join('');
  } else {
    document.getElementById('ctItinerarySection').style.display = 'none';
  }

  if (t.includes?.length) {
    document.getElementById('ctIncludes').innerHTML = t.includes.map(i => `<li>${i}</li>`).join('');
  }

  if (t.excludes?.length) {
    document.getElementById('ctExcludes').innerHTML = t.excludes.map(i => `<li>${i}</li>`).join('');
  }
}

// RENDER SCHEDULES
function renderSchedules() {
  const list = document.getElementById('ctScheduleList');

  if (!schedules.length) {
    list.innerHTML = '<p style="color:var(--muted);font-size:0.875rem">Hiện chưa có lịch khởi hành</p>';
    document.getElementById('ctBtnBook').disabled = true;
    return;
  }

  list.innerHTML = schedules.map((s, i) => {
    const dep = new Date(s.departure_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const ret = new Date(s.return_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const price = s.price_adult.toLocaleString('vi-VN') + 'đ';
    const slots = s.available_slots;
    const slotsText = slots <= 3
      ? `<span style="color:#e55;font-weight:600">Còn ${slots} chỗ!</span>`
      : slots <= 10
        ? `<span style="color:var(--gold)">Còn ${slots} chỗ</span>`
        : `<span style="color:var(--muted)">${slots} chỗ trống</span>`;

    return `
      <div class="ct-schedule-item ${i === 0 ? 'active' : ''}" onclick="selectSchedule(${i}, this)">
        <div>
          <div class="ct-schedule-date">🗓️ ${dep} → ${ret}</div>
          <div class="ct-schedule-slots">${slotsText}</div>
        </div>
        <div class="ct-schedule-price">${price}</div>
      </div>`;
  }).join('');

  selectSchedule(0, list.querySelector('.ct-schedule-item'));
}

function selectSchedule(idx, el) {
  document.querySelectorAll('.ct-schedule-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');
  selectedSchedule = schedules[idx];
  enforceGuestLimit();
  updateSummary();
}

// GUESTS
function changeGuest(type, delta) {
  const min = type === 'adult' ? 1 : 0;
  const nextValue = Math.max(min, (guests[type] || 0) + delta);
  const nextGuests = { ...guests, [type]: nextValue };
  const slots = getAvailableSlots();

  if (slots > 0 && totalGuests(nextGuests) > slots) {
    showToast('⚠️ Số lượng khách vượt quá số chỗ trống (' + slots + ' chỗ)');
    return;
  }

  guests[type] = nextValue;
  document.getElementById('g' + type.charAt(0).toUpperCase() + type.slice(1)).textContent = guests[type];
  updateSummary();
}

// PRICE SUMMARY
function updateSummary() {
  if (!selectedSchedule) return;

  const pa = selectedSchedule.price_adult || 0;
  const pc = selectedSchedule.price_child || 0;
  const pb = selectedSchedule.price_baby || 0;

  const totalAdult = pa * guests.adult;
  const totalChild = pc * guests.child;
  const totalBaby = pb * guests.baby;
  const total = totalAdult + totalChild + totalBaby;

  const fmt = n => (n > 0 ? n.toLocaleString('vi-VN') + 'đ' : '0đ');

  document.getElementById('sumAdult').textContent = guests.adult;
  document.getElementById('sumAdultPrice').textContent = fmt(totalAdult);
  document.getElementById('sumChild').textContent = guests.child;
  document.getElementById('sumChildPrice').textContent = guests.child > 0 ? fmt(totalChild) : '—';
  document.getElementById('sumBaby').textContent = guests.baby;
  document.getElementById('sumBabyPrice').textContent = guests.baby > 0 ? fmt(totalBaby) : '—';
  document.getElementById('sumTotal').textContent = fmt(total);

  updateCapacityHint();
  updateBookButtonState();
}

// GO TO BOOKING
function goToBooking() {
  if (!selectedSchedule) {
    showToast('⚠️ Vui lòng chọn lịch khởi hành');
    return;
  }

  if (typeof checkUserVerifiedForAction !== 'undefined' && !checkUserVerifiedForAction('đặt tour')) {
    return;
  }

  const slots = getAvailableSlots();
  const pax = totalGuests();
  if (slots > 0 && pax > slots) {
    showToast('⚠️ Bạn đã chọn ' + pax + ' khách, nhưng lịch này chỉ còn ' + slots + ' chỗ');
    updateBookButtonState();
    return;
  }

  if (!localStorage.getItem('vt_access_token')) {
    showToast('⚠️ Vui lòng đăng nhập để đặt tour');
    setTimeout(() => { window.location.href = 'dang-nhap.html'; }, 1200);
    return;
  }

  const params = new URLSearchParams({
    tour: tourData?.slug || tourData?._id || '',
    schedule: selectedSchedule._id,
    adult: guests.adult,
    child: guests.child,
    baby: guests.baby,
  });
  window.location.href = 'dat-tour.html?' + params.toString();
}

function totalGuests(customGuests) {
  const g = customGuests || guests;
  return (g.adult || 0) + (g.child || 0) + (g.baby || 0);
}

function getAvailableSlots() {
  if (!selectedSchedule) return 0;
  const slots = Number(selectedSchedule.available_slots);
  return Number.isFinite(slots) ? Math.max(0, slots) : 0;
}

function enforceGuestLimit() {
  const slots = getAvailableSlots();
  if (slots <= 0) return;

  let pax = totalGuests();
  if (pax <= slots) return;

  // Giảm dần baby -> child -> adult(giữ tối thiểu 1 người lớn)
  while (pax > slots && guests.baby > 0) {
    guests.baby -= 1;
    pax -= 1;
  }
  while (pax > slots && guests.child > 0) {
    guests.child -= 1;
    pax -= 1;
  }
  while (pax > slots && guests.adult > 1) {
    guests.adult -= 1;
    pax -= 1;
  }

  document.getElementById('gAdult').textContent = guests.adult;
  document.getElementById('gChild').textContent = guests.child;
  document.getElementById('gBaby').textContent = guests.baby;
}

function updateCapacityHint() {
  const hint = document.getElementById('ctCapacityHint');
  if (!hint || !selectedSchedule) return;

  const slots = getAvailableSlots();
  const pax = totalGuests();

  hint.classList.remove('warn');
  if (slots <= 0) {
    hint.textContent = 'Lịch này đã hết chỗ.';
    hint.classList.add('warn');
    return;
  }

  if (pax > slots) {
    hint.textContent = 'Bạn đang chọn ' + pax + ' khách, vượt quá số chỗ còn lại: ' + slots + '.';
    hint.classList.add('warn');
    return;
  }

  hint.textContent = 'Số chỗ còn lại: ' + slots + ' | Bạn đã chọn: ' + pax;
}

function updateBookButtonState() {
  const btn = document.getElementById('ctBtnBook');
  if (!btn) return;

  const slots = getAvailableSlots();
  const pax = totalGuests();
  const blocked = !selectedSchedule || slots <= 0 || pax > slots;

  btn.disabled = blocked;
  btn.textContent = blocked ? 'Không đủ chỗ' : 'Đặt tour ngay';
}

// HELPERS
function showError() {
  document.getElementById('ctLoading').style.display = 'none';
  document.getElementById('ctMain').style.display = 'none';
  document.getElementById('ctError').style.display = 'block';
}
