// ============================================================
// DATA CHUNG – dùng ở tất cả các trang
// ============================================================
const ALL_TOURS = [
  { title: 'Du Thuyền Hạ Long Sang Trọng',  location: 'Vịnh Hạ Long, Quảng Ninh', price: '6.990.000đ', stars: '★★★★★', reviews: '134', badge: '3 ngày 2 đêm', badgeClass: '',    imgKey: 't1', tags: ['halong','bien','thuyen'],                       page: '1halong.html'  },
  { title: 'Tour Phố Cổ Hội An & Ẩm Thực',  location: 'Phố Cổ Hội An, Quảng Nam',  price: '1.250.000đ', stars: '★★★★★', reviews: '340', badge: 'Bán chạy',      badgeClass: 'hot', imgKey: 't2', tags: ['hoian','pho-co','am-thuc','mien-trung'],         page: '1hoian.html'   },
  { title: 'Trekking & Homestay Sapa',        location: 'Tỉnh Lào Cai',              price: '2.800.000đ', stars: '★★★★☆', reviews: '96',  badge: '2 ngày 1 đêm', badgeClass: 'new', imgKey: 't3', tags: ['sapa','trekking','nui','mien-bac'],              page: '1sapa.html'    },
  { title: 'Khám Phá Hà Nội Cổ Kính',        location: 'Hà Nội',                    price: '850.000đ',   stars: '★★★★★', reviews: '210', badge: '1 ngày',        badgeClass: '',    imgKey: 'th', tags: ['hanoi','pho-co','van-hoa','mien-bac'],           page: '' },
  { title: 'Đà Nẵng – Bà Nà Hills',          location: 'Đà Nẵng',                   price: '1.900.000đ', stars: '★★★★☆', reviews: '180', badge: '2 ngày 1 đêm', badgeClass: '',    imgKey: 'td', tags: ['danang','bien','mien-trung'],                    page: '' },
  { title: 'Tràng An – Tam Cốc Ninh Bình',   location: 'Ninh Bình',                 price: '1.100.000đ', stars: '★★★★★', reviews: '88',  badge: '1 ngày',        badgeClass: 'new', imgKey: 'tn', tags: ['ninhbinh','thien-nhien','mien-bac'],             page: '' },
  { title: 'Sông Nước Miền Tây',             location: 'Cần Thơ – Bến Tre',         price: '1.650.000đ', stars: '★★★★☆', reviews: '62',  badge: '2 ngày 1 đêm', badgeClass: '',    imgKey: 'tm', tags: ['mientay','song-nuoc','am-thuc','mien-nam'],      page: '' },
];
const IMG_BG = {
  t1:"url('halong.jpg') center/cover", t2:"url('hoian2.jpg') center/cover",
  t3:"url('sapa.png') center/cover",   th:"url('hanoi.jpg') center/cover",
  td:"url('danang.jpg') center/cover", tn:"url('ninhbinh.jpg') center/cover",
  tm:"url('mientay.jpg') center/cover",
};
const DEST_LABEL = { halong:'Vịnh Hạ Long', hanoi:'Hà Nội', danang:'Đà Nẵng', hoian:'Hội An', sapa:'Sapa', ninhbinh:'Ninh Bình', mientay:'Miền Tây' };
const FAV_EMOJI  = { t1:'🚢', t2:'🏮', t3:'⛰️', th:'🏛️', td:'🌉', tn:'⛵', tm:'🛶' };
const FAV_COLOR  = { t1:'linear-gradient(135deg,#1a6e8a,#2d9ebf)', t2:'linear-gradient(135deg,#8a7a1a,#bfaf2d)', t3:'linear-gradient(135deg,#3a6a1a,#5a9a2d)', th:'linear-gradient(135deg,#4a1a8a,#7a4abf)', td:'linear-gradient(135deg,#1a4e8a,#2d7ebf)', tn:'linear-gradient(135deg,#8a3a1a,#bf6a2d)', tm:'linear-gradient(135deg,#1a7a4a,#2dbf7a)' };

// ============================================================
// MERGE TOUR TỪ ADMIN + API
// ============================================================

// Async version - dùng khi load trang tour
async function loadToursFromAPI() {
  try {
    if (typeof apiGetTours === 'function') {
      const res = await apiGetTours({ limit: 50 });
      if (res && res.ok && res.data.result) {
        const apiTours = res.data.result.tours || res.data.result || [];
        if (apiTours.length) {
          // Convert API format sang local format
          return apiTours.map(function(t) {
            return {
              title:     t.name,
              location:  t.destination || t.departure_city || '—',
              price:     t.schedules && t.schedules[0] ? t.schedules[0].price_adult.toLocaleString('vi-VN') + 'đ' : (t.price || '—'),
              stars:     '★★★★★',
              reviews:   t.rating_count || '0',
              badge:     t.duration_days ? t.duration_days + ' ngày' : '—',
              badgeClass: '',
              imgKey:    'api_' + t._id,
              tags:      [t.destination || ''],
              page:      '',
              _id:       t._id,
              isApiTour: true,
            };
          });
        }
      }
    }
  } catch(e) {}
  return null;
}

function getActiveTours() {
  // Lấy tour từ admin localStorage
  var adminTours = [];
  try {
    var raw = localStorage.getItem('vt_admin_tours');
    if (raw) adminTours = JSON.parse(raw);
  } catch(e) {}

  if (!adminTours.length) return ALL_TOURS;

  // Convert format admin → format ALL_TOURS
  var converted = adminTours
    .filter(function(t) { return t.active; }) // chỉ tour đang hoạt động
    .map(function(t, i) {
      // Tìm xem tour này có trùng tên với ALL_TOURS không
      var existing = ALL_TOURS.find(function(x) { return x.title === t.name; });
      if (existing) return existing; // giữ nguyên tour gốc

      // Tour mới do admin thêm
      return {
        title:     t.name     || 'Tour mới',
        location:  t.location || '—',
        price:     t.price    || '—',
        stars:     '★★★★☆',
        reviews:   '0',
        badge:     t.duration ? t.duration + ' ngày' : 'Mới',
        badgeClass:'new',
        imgKey:    'admin_' + (t.id || i),
        tags:      [t.location ? t.location.toLowerCase().replace(/[^a-z0-9]/g,'') : 'tour'],
        page:      '',
        desc:      t.desc || '',
        isAdminTour: true,
      };
    });

  // Merge: giữ ALL_TOURS gốc + thêm tour admin mới (chưa có trong ALL_TOURS)
  var merged = ALL_TOURS.slice();
  converted.forEach(function(t) {
    if (t.isAdminTour) {
      var exists = merged.find(function(x) { return x.title === t.title; });
      if (!exists) merged.push(t);
    }
  });

  return merged;
}

// Cập nhật IMG_BG cho tour admin (dùng gradient màu xanh mặc định)
function getImgBg(imgKey) {
  if (IMG_BG[imgKey]) return IMG_BG[imgKey];
  // Tour admin mới — gradient theo id
  var colors = [
    'linear-gradient(135deg,#2d8a4e,#3aaa62)',
    'linear-gradient(135deg,#1a6e8a,#2d9ebf)',
    'linear-gradient(135deg,#8a3a1a,#bf6a2d)',
    'linear-gradient(135deg,#4a1a8a,#7a4abf)',
    'linear-gradient(135deg,#8a7a1a,#bfaf2d)',
    'linear-gradient(135deg,#1a4e8a,#2d7ebf)',
  ];
  var idx = parseInt((imgKey || '0').replace(/[^0-9]/g,'')) || 0;
  return colors[idx % colors.length];
}

// ============================================================
// TOUR CARD BUILDER
// ============================================================
function buildTourCard(t, animate, idx) {
  const bg     = getImgBg(t.imgKey);
  const click  = t.page ? `onclick="window.location.href='${t.page}'"` : '';
  const cursor = t.page ? 'pointer' : 'default';
  const delay  = animate ? `transition-delay:${idx * 80}ms` : '';
  return `<div class="tour-card" ${click} style="cursor:${cursor};opacity:0;transform:translateY(20px);transition:opacity .5s ease,transform .5s ease;${delay}">
    <div class="tour-img">
      <div class="tour-img-inner" style="background:${bg}"></div>
      <span class="tour-badge ${t.badgeClass}">${t.badge}</span>
      <button class="tour-wishlist" onclick="toggleWishlist(event,this,'${t.title.replace(/'/g,"\\'")}','${t.price}','${t.imgKey}')">♡</button>
    </div>
    <div class="tour-body">
      <div class="tour-stars">${t.stars} <span>${t.reviews} lượt</span></div>
      <div class="tour-title">${t.title}</div>
      <div class="tour-location">📍 ${t.location}</div>
      <div class="tour-footer">
        <div class="tour-price">Từ giá / người<strong>${t.price}</strong></div>
        <button class="btn-book" onclick="openBookingModal('${t.title.replace(/'/g,"\\'")}','${t.price}');event.stopPropagation()">Đặt ngay</button>
      </div>
    </div>
  </div>`;
}
function renderTours(list, gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = list.map((t,i) => buildTourCard(t,true,i)).join('');
  requestAnimationFrame(() => grid.querySelectorAll('.tour-card').forEach(el => { el.style.opacity='1'; el.style.transform='translateY(0)'; }));
}

// SEARCH
function liveSearch() {
  const q = (document.getElementById('searchDest')?.value||'').trim().toLowerCase();
  if (!q) { hideSearchResults(); return; }
  showSearchResults(getActiveTours().filter(t => t.title.toLowerCase().includes(q) || t.location.toLowerCase().includes(q) || t.tags.some(g=>g.includes(q))));
}
function doSearch() {
  const q = (document.getElementById('searchDest')?.value||'').trim();
  if (!q) { showToast('⚠️ Vui lòng nhập điểm đến'); return; }
  liveSearch();
}
function showSearchResults(results) {
  const sec=document.getElementById('searchResultSection'), grid=document.getElementById('searchResultGrid'), empty=document.getElementById('searchEmpty'), title=document.getElementById('searchResultTitle');
  if (!sec) return;
  sec.style.display='block';
  if (!results.length) { title.textContent='Không tìm thấy tour'; grid.style.display='none'; empty.style.display='block'; }
  else { title.textContent=`Tìm thấy ${results.length} tour`; empty.style.display='none'; grid.style.display='grid'; renderTours(results,'searchResultGrid'); }
}
function hideSearchResults() { const s=document.getElementById('searchResultSection'); if(s) s.style.display='none'; }
function clearSearch() { const i=document.getElementById('searchDest'); if(i) i.value=''; hideSearchResults(); }

// FILTER
let activeFilter=null;
function filterByDest(dest) {
  if (activeFilter===dest) { clearFilter(); return; }
  activeFilter=dest;
  document.querySelectorAll('.dest-card').forEach(c=>c.classList.remove('dest-active'));
  document.querySelector(`[data-dest="${dest}"]`)?.classList.add('dest-active');
  const results=getActiveTours().filter(t=>t.tags.includes(dest));
  document.getElementById('filterBannerText').textContent=`📍 ${DEST_LABEL[dest]} — ${results.length} tour`;
  document.getElementById('filterBanner').style.display='flex';
  document.getElementById('tourSectionTitle').textContent=`Tour tại ${DEST_LABEL[dest]}`;
  if (!results.length) { document.getElementById('tourGrid').style.display='none'; document.getElementById('filterEmpty').style.display='block'; }
  else { document.getElementById('filterEmpty').style.display='none'; document.getElementById('tourGrid').style.display='grid'; renderTours(results,'tourGrid'); }
  setTimeout(()=>document.getElementById('tourSection')?.scrollIntoView({behavior:'smooth',block:'start'}),150);
}
function clearFilter() {
  activeFilter=null;
  document.querySelectorAll('.dest-card').forEach(c=>c.classList.remove('dest-active'));
  document.getElementById('filterBanner').style.display='none';
  document.getElementById('filterEmpty').style.display='none';
  document.getElementById('tourSectionTitle').textContent='Tour Gợi Ý';
  document.getElementById('tourGrid').style.display='grid';
  renderTours(getActiveTours().slice(0,3),'tourGrid');
}
function scrollDest(dir) { document.getElementById('destGrid')?.scrollBy({left:dir*200,behavior:'smooth'}); }

// ============================================================
// USER STATE
// ============================================================
function saveUser(u) {
  sessionStorage.setItem('vt_user', JSON.stringify(u));
}
function loadUser() {
  try { return JSON.parse(sessionStorage.getItem('vt_user')); }
  catch(e) { return null; }
}
async function doLogout() {
  // Gọi API logout để xóa refresh_token trên server
  try {
    const refreshToken = localStorage.getItem('vt_refresh_token');
    if (refreshToken && typeof apiLogout === 'function') {
      await apiLogout(); // POST /api/auth/logout { refresh_token }
    }
  } catch(e) { /* bỏ qua nếu API lỗi, vẫn logout local */ }

  // Xóa toàn bộ dữ liệu phiên local
  sessionStorage.removeItem('vt_user');
  localStorage.removeItem('vt_access_token');
  localStorage.removeItem('vt_refresh_token');
  window.location.href = '1dangnhap.html';
}

// ============================================================
// NAVBAR LOGIN STATE
// ============================================================
function initNav() {
  const u = loadUser();
  const navGuest = document.getElementById('navGuest');
  const navUser  = document.getElementById('navUser');
  if (!navGuest || !navUser) return;

  if (u) {
    navGuest.style.display = 'none';
    navUser.style.display  = 'flex';

    const avatar = document.getElementById('navAvatarEl');
    if (avatar) avatar.textContent = u.name ? u.name[0].toUpperCase() : 'U';

    const username = document.getElementById('navUsernameEl');
    if (username) username.textContent = u.name ? u.name.split(' ').slice(-1)[0] : 'User';

    const dropName  = document.getElementById('dropName');
    const dropEmail = document.getElementById('dropEmail');
    if (dropName)  dropName.textContent  = u.name  || '—';
    if (dropEmail) dropEmail.textContent = u.email || '—';

    const adminBtn = document.getElementById('adminMenuBtn');
    if (adminBtn) {
      adminBtn.style.display = (u.role && u.role.toLowerCase() === 'admin') ? 'block' : 'none';
    }
  } else {
    navGuest.style.display = 'flex';
    navUser.style.display  = 'none';
  }
}

// ============================================================
// USER DROPDOWN – dùng classList.toggle('open')
// ============================================================
function toggleUserMenu() {
  const dd = document.getElementById('userDropdown');
  if (!dd) return;
  dd.classList.toggle('open');
}

function closeUserMenu() {
  const dd = document.getElementById('userDropdown');
  if (dd) dd.classList.remove('open');
}

document.addEventListener('click', function(e) {
  if (
    !e.target.closest('.nav-user-info') &&
    !e.target.closest('.user-dropdown')
  ) {
    closeUserMenu();
  }
});