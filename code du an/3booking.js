// ============================================================
let currentTourName = '', currentTourPrice = '';

function openBookingModal(tourName, price) {
  currentTourName  = tourName  || 'Tour du lịch Việt Nam';
  currentTourPrice = price     || '';

  document.getElementById('modalTourName').textContent  = currentTourName;
  document.getElementById('modalTourPrice').textContent = currentTourPrice;

  // Default date = today + 7
  const d = new Date(); d.setDate(d.getDate() + 7);
  document.getElementById('mDate').value = d.toISOString().split('T')[0];

  // Auto-fill thông tin user nếu đã đăng nhập
  try {
    const u = JSON.parse(sessionStorage.getItem('vt_user'));
    if (u) {
      const n = document.getElementById('mName');  if (n) n.value = u.name  || '';
      const p = document.getElementById('mPhone'); if (p) p.value = u.phone || '';
      const e = document.getElementById('mEmail'); if (e) e.value = u.email || '';
    } else {
      ['mName','mPhone','mEmail'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    }
  } catch(e) {
    ['mName','mPhone','mEmail'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  }
  const note = document.getElementById('mNote'); if (note) note.value = '';
  document.getElementById('mAdults').value = '2';
  document.getElementById('mKids').value   = '0';

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

function goStep(n) {
  // Validate step 1 before proceeding
  if (n === 2) {
    const name  = document.getElementById('mName').value.trim();
    const phone = document.getElementById('mPhone').value.trim();
    const email = document.getElementById('mEmail').value.trim();
    const date  = document.getElementById('mDate').value;
    if (!name)  { showToast('⚠️ Vui lòng nhập họ và tên'); return; }
    if (!phone) { showToast('⚠️ Vui lòng nhập số điện thoại'); return; }
    if (!email) { showToast('⚠️ Vui lòng nhập email'); return; }
    if (!date)  { showToast('⚠️ Vui lòng chọn ngày khởi hành'); return; }
  }

  [1,2,3].forEach(i => {
    document.getElementById(`modalStep${i}`).style.display = i === n ? 'block' : 'none';
    const dot = document.getElementById(`step${i}-dot`);
    dot.classList.toggle('active', i <= n);
    dot.classList.toggle('done',   i < n);
  });

  if (n === 2) {
    updateModalSummary();
    document.getElementById('sumTotal2').textContent = document.getElementById('sumTotal').textContent;
    document.getElementById('bankRef').textContent = 'VNT-' + Math.random().toString(36).substr(2,6).toUpperCase();
  }

  if (n === 3) {
    const code = 'VNT-' + Math.floor(Math.random() * 90000 + 10000);
    document.getElementById('bookingCode').textContent   = code;
    document.getElementById('confirmEmail').textContent  = document.getElementById('mEmail').value || 'email của bạn';

    // Lưu lịch sử
    try {
      const u = JSON.parse(sessionStorage.getItem('vt_user'));
      if (u) {
        const key = 'vt_bookings_' + u.email;
        const bookings = JSON.parse(localStorage.getItem(key) || '[]');
        const adults = parseInt(document.getElementById('mAdults')?.value || 2);
        const kids   = parseInt(document.getElementById('mKids')?.value   || 0);
        bookings.unshift({
          code, tourName: currentTourName || '—',
          date: document.getElementById('mDate')?.value || '—',
          guests: `${adults} người lớn${kids>0?' + '+kids+' trẻ em':''}`,
          total: document.getElementById('sumTotal')?.textContent || '—',
          status: 'confirmed',
          bg: 'linear-gradient(135deg,#2d8a4e,#3aaa62)'
        });
        localStorage.setItem(key, JSON.stringify(bookings));
      }
    } catch(e) {}

    // Chuyển sang trang thành công sau 1.5s (để người dùng thấy bước 3)
    setTimeout(() => {
      const adults = parseInt(document.getElementById('mAdults')?.value || 2);
      const kids   = parseInt(document.getElementById('mKids')?.value   || 0);
      const guestsText = `${adults} người lớn${kids>0?' + '+kids+' trẻ em':''}`;
      const params = new URLSearchParams({
        code,
        tour: currentTourName || '—',
        date: document.getElementById('mDate')?.value || '—',
        guests: guestsText,
        total: document.getElementById('sumTotal')?.textContent || '—'
      });
      window.location.href = '1thanhcong.html?' + params.toString();
    }, 1500);
  }
}

function updateModalSummary() {
  const adults   = parseInt(document.getElementById('mAdults')?.value || 2);
  const kids     = parseInt(document.getElementById('mKids')?.value   || 0);
  const rawPrice = currentTourPrice.replace(/[^\d]/g, '');
  const unitPrice = parseInt(rawPrice) || 0;
  const total = unitPrice * adults + Math.floor(unitPrice * 0.5) * kids;
  const fmt = n => n.toLocaleString('vi-VN') + 'đ';

  document.getElementById('sumTour').textContent   = currentTourName;
  document.getElementById('sumPrice').textContent  = currentTourPrice;
  document.getElementById('sumPeople').textContent = `${adults} người lớn${kids > 0 ? ` + ${kids} trẻ em` : ''}`;
  document.getElementById('sumTotal').textContent  = fmt(total);
}

function selectPayment(lbl, method) {
  document.querySelectorAll('.pay-method').forEach(l => l.classList.remove('active'));
  lbl.classList.add('active');
  document.getElementById('bankInfo').style.display = method === 'bank' ? 'block' : 'none';
}

// ============================================================