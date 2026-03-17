// ============================================================
// 3uudai.js – Trang Ưu Đãi | VietnamTravel
// ============================================================

// ===== DỮ LIỆU TOUR ƯU ĐÃI =====
var DEALS = [
  {
    id: 1,
    title: 'Du Thuyền Hạ Long Sang Trọng 3N2Đ',
    location: 'Vịnh Hạ Long, Quảng Ninh',
    img: 'https://images.unsplash.com/photo-1557750255-c76072a7aad1?w=400&q=75',
    badge: 'hot', badgeText: 'HOT',
    discount: 35,
    stars: '★★★★★', reviews: '(128)',
    tags: ['Bao gồm bữa ăn', 'Flash Sale', 'Giới hạn'],
    tagTypes: ['green', 'orange', 'purple'],
    priceOld: '6.990.000đ', priceNow: '4.543.000đ',
    type: 'flash', pct: 35
  },
  {
    id: 2,
    title: 'Phố Cổ Hội An & Ẩm Thực Địa Phương 2N1Đ',
    location: 'Hội An, Quảng Nam',
    img: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=400&q=75',
    badge: 'new', badgeText: 'MỚI',
    discount: 20,
    stars: '★★★★☆', reviews: '(84)',
    tags: ['Miễn phí huỷ', 'Combo tiết kiệm'],
    tagTypes: ['green', 'orange'],
    priceOld: '1.250.000đ', priceNow: '1.000.000đ',
    type: 'combo', pct: 20
  },
  {
    id: 3,
    title: 'Trekking & Homestay Sapa 3N2Đ',
    location: 'Sapa, Lào Cai',
    img: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&q=75',
    badge: 'flash', badgeText: 'FLASH',
    discount: 40,
    stars: '★★★★★', reviews: '(203)',
    tags: ['Flash Sale', 'Còn 8 suất'],
    tagTypes: ['orange', 'purple'],
    priceOld: '2.800.000đ', priceNow: '1.680.000đ',
    type: 'flash', pct: 40
  },
  {
    id: 4,
    title: 'Khám Phá Hà Nội 36 Phố Phường 1N',
    location: 'Hà Nội',
    img: 'https://images.unsplash.com/photo-1514565131-fce0801e6785?w=400&q=75',
    badge: 'new', badgeText: 'MỚI',
    discount: 15,
    stars: '★★★★☆', reviews: '(56)',
    tags: ['Miễn phí huỷ', 'Combo tiết kiệm'],
    tagTypes: ['green', 'orange'],
    priceOld: '850.000đ', priceNow: '722.000đ',
    type: 'combo', pct: 15
  },
  {
    id: 5,
    title: 'Đà Nẵng – Bà Nà Hills 2N1Đ',
    location: 'Đà Nẵng',
    img: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=75',
    badge: 'limited', badgeText: 'GIỚI HẠN',
    discount: 25,
    stars: '★★★★★', reviews: '(177)',
    tags: ['Bao gồm bữa ăn', 'Còn 12 suất'],
    tagTypes: ['green', 'purple'],
    priceOld: '1.900.000đ', priceNow: '1.425.000đ',
    type: 'early', pct: 25
  },
  {
    id: 6,
    title: 'Tràng An – Tam Cốc Ninh Bình 1N',
    location: 'Ninh Bình',
    img: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=75',
    badge: 'hot', badgeText: 'HOT',
    discount: 30,
    stars: '★★★★☆', reviews: '(92)',
    tags: ['Flash Sale', 'Miễn phí huỷ'],
    tagTypes: ['orange', 'green'],
    priceOld: '1.100.000đ', priceNow: '770.000đ',
    type: 'flash', pct: 30
  },
  {
    id: 7,
    title: 'Sông Nước Miền Tây 2N1Đ',
    location: 'Cần Thơ',
    img: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&q=75',
    badge: 'new', badgeText: 'MỚI',
    discount: 18,
    stars: '★★★★☆', reviews: '(44)',
    tags: ['Combo tiết kiệm', 'Bao gồm bữa ăn'],
    tagTypes: ['orange', 'green'],
    priceOld: '1.650.000đ', priceNow: '1.353.000đ',
    type: 'combo', pct: 18
  },
  {
    id: 8,
    title: 'Phú Quốc Đảo Ngọc 3N2Đ',
    location: 'Phú Quốc, Kiên Giang',
    img: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=75',
    badge: 'flash', badgeText: 'FLASH',
    discount: 45,
    stars: '★★★★★', reviews: '(315)',
    tags: ['Flash Sale', 'Giới hạn', 'Bao gồm bữa ăn'],
    tagTypes: ['orange', 'purple', 'green'],
    priceOld: '5.500.000đ', priceNow: '3.025.000đ',
    type: 'flash', pct: 45
  },
  {
    id: 9,
    title: 'Cố Đô Huế – Di Sản Thế Giới 2N1Đ',
    location: 'Huế, Thừa Thiên Huế',
    img: 'https://images.unsplash.com/photo-1599576837667-b4c47d5e66b2?w=400&q=75',
    badge: 'hot', badgeText: 'HOT',
    discount: 22,
    stars: '★★★★☆', reviews: '(67)',
    tags: ['Miễn phí huỷ', 'Combo tiết kiệm'],
    tagTypes: ['green', 'orange'],
    priceOld: '1.400.000đ', priceNow: '1.092.000đ',
    type: 'early', pct: 22
  }
];

// ===== STATE =====
var state = {
  search: '',
  types: [],      // flash, combo, early
  minPct: 0,
  sortBy: 'discount',
  page: 1,
  perPage: 6,
  liked: {}
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function () {
  initUserNav();
  render();
  bindEvents();
});

// ===== NAV USER =====
function initUserNav() {
  var u = (typeof loadUser === 'function') ? loadUser() : null;
  var actionsEl = document.getElementById('headerActions');
  if (!actionsEl) return;

  if (u) {
    var saved = localStorage.getItem('vt_avatar_' + u.email);
    var avatarContent = saved
      ? ''
      : (u.name || 'U')[0].toUpperCase();
    var avatarStyle = saved
      ? 'background-image:url(' + saved + ');background-size:cover;background-position:center;'
      : '';

    actionsEl.innerHTML =
      '<div class="avatar" style="' + avatarStyle + '" onclick="window.location.href=\'1canhan.html\'">' +
        avatarContent +
      '</div>';
  } else {
    actionsEl.innerHTML =
      '<button class="btn-primary" onclick="window.location.href=\'1dangnhap.html\'">Đăng nhập</button>';
  }
}

// ===== FILTER & SORT =====
function getFiltered() {
  var list = DEALS.slice();

  // Tìm kiếm
  if (state.search) {
    var q = state.search.toLowerCase();
    list = list.filter(function (d) {
      return d.title.toLowerCase().includes(q) || d.location.toLowerCase().includes(q);
    });
  }

  // Loại ưu đãi
  if (state.types.length) {
    list = list.filter(function (d) { return state.types.includes(d.type); });
  }

  // Mức giảm tối thiểu
  if (state.minPct > 0) {
    list = list.filter(function (d) { return d.pct >= state.minPct; });
  }

  // Sắp xếp
  list.sort(function (a, b) {
    if (state.sortBy === 'discount') return b.pct - a.pct;
    if (state.sortBy === 'price-asc') {
      return parseInt(a.priceNow) - parseInt(b.priceNow);
    }
    if (state.sortBy === 'price-desc') {
      return parseInt(b.priceNow) - parseInt(a.priceNow);
    }
    return 0;
  });

  return list;
}

// ===== RENDER =====
function render() {
  var filtered = getFiltered();
  var total    = filtered.length;
  var start    = (state.page - 1) * state.perPage;
  var paged    = filtered.slice(start, start + state.perPage);

  // Kết quả
  var countEl = document.getElementById('resultCount');
  if (countEl) countEl.innerHTML = 'Hiển thị <strong>' + total + '</strong> ưu đãi';

  // Grid
  var grid = document.getElementById('dealGrid');
  if (!grid) return;

  if (!paged.length) {
    grid.innerHTML =
      '<div class="empty-state" style="grid-column:1/-1">' +
        '<div class="icon">🔍</div>' +
        '<p>Không tìm thấy ưu đãi phù hợp</p>' +
      '</div>';
  } else {
    grid.innerHTML = paged.map(buildCard).join('');
  }

  // Pagination
  renderPagination(total);
}

function buildCard(d) {
  var tagHtml = d.tags.map(function (t, i) {
    return '<span class="tag tag-' + (d.tagTypes[i] || 'green') + '">' + t + '</span>';
  }).join('');

  var isLiked = state.liked[d.id] ? ' liked' : '';
  var heartFill = state.liked[d.id] ? 'fill="#ef4444" stroke="#ef4444"' : 'fill="none" stroke="currentColor"';

  return (
    '<div class="deal-card" onclick="goTour(' + d.id + ')">' +
      '<div class="card-img-wrap">' +
        '<img src="' + d.img + '" alt="' + d.title + '" loading="lazy" ' +
          'onerror="this.style.background=\'linear-gradient(135deg,#2d8a4e,#3aaa62)\';this.style.height=\'170px\'">' +
        '<span class="badge badge-' + d.badge + '">' + d.badgeText + '</span>' +
        '<div class="discount-badge"><span class="pct">-' + d.pct + '%</span></div>' +
        '<button class="heart-btn' + isLiked + '" onclick="toggleLike(event,' + d.id + ')">' +
          '<svg viewBox="0 0 24 24" ' + heartFill + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>' +
          '</svg>' +
        '</button>' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-meta">' +
          '<span class="stars">' + d.stars + '</span>' +
          '<span class="reviews">' + d.reviews + '</span>' +
        '</div>' +
        '<div class="card-title">' + d.title + '</div>' +
        '<div class="card-location">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>' +
          '</svg>' +
          d.location +
        '</div>' +
        '<div class="card-tags">' + tagHtml + '</div>' +
        '<div class="card-footer">' +
          '<div class="price-block">' +
            '<div class="price-original">' + d.priceOld + '</div>' +
            '<div class="price-now">' + d.priceNow + '</div>' +
          '</div>' +
          '<button class="btn-book" onclick="bookTour(event,' + d.id + ')">Đặt ngay</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

// ===== PAGINATION =====
function renderPagination(total) {
  var el = document.getElementById('pagination');
  if (!el) return;
  var totalPages = Math.max(1, Math.ceil(total / state.perPage));
  if (totalPages <= 1) { el.innerHTML = ''; return; }

  var html = '<button class="page-btn arrow" onclick="goPage(' + Math.max(1, state.page - 1) + ')">‹</button>';
  for (var p = 1; p <= totalPages; p++) {
    html += '<button class="page-btn' + (p === state.page ? ' active' : '') + '" onclick="goPage(' + p + ')">' + p + '</button>';
  }
  html += '<button class="page-btn arrow" onclick="goPage(' + Math.min(totalPages, state.page + 1) + ')">›</button>';
  el.innerHTML = html;
}

function goPage(p) {
  state.page = p;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== ACTIONS =====
function goTour(id) {
  window.location.href = '1tourdulich.html';
}

function bookTour(e, id) {
  e.stopPropagation();
  window.location.href = '1tourdulich.html';
}

function toggleLike(e, id) {
  e.stopPropagation();
  state.liked[id] = !state.liked[id];
  // Lưu vào user nếu đã đăng nhập
  var u = (typeof loadUser === 'function') ? loadUser() : null;
  if (u) {
    var key = 'vt_liked_' + u.email;
    try {
      localStorage.setItem(key, JSON.stringify(state.liked));
    } catch (err) {}
  }
  render();
}

// ===== BIND EVENTS =====
function bindEvents() {
  // Search
  var searchEl = document.getElementById('searchInput');
  if (searchEl) {
    searchEl.addEventListener('input', function () {
      state.search = this.value.trim();
      state.page = 1;
      render();
    });
  }

  // Sort
  var sortEl = document.getElementById('sortSelect');
  if (sortEl) {
    sortEl.addEventListener('change', function () {
      state.sortBy = this.value;
      state.page = 1;
      render();
    });
  }

  // Type checkboxes
  document.querySelectorAll('.type-check').forEach(function (cb) {
    cb.addEventListener('change', function () {
      var val = this.dataset.type;
      if (this.checked) {
        if (!state.types.includes(val)) state.types.push(val);
      } else {
        state.types = state.types.filter(function (t) { return t !== val; });
      }
      state.page = 1;
      render();
    });
  });

  // Discount pills
  document.querySelectorAll('.dpill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      document.querySelectorAll('.dpill').forEach(function (p) { p.classList.remove('active'); });
      this.classList.add('active');
      state.minPct = parseInt(this.dataset.pct) || 0;
      state.page = 1;
      render();
    });
  });

  // Apply filter button
  var applyBtn = document.getElementById('applyFilter');
  if (applyBtn) {
    applyBtn.addEventListener('click', function () {
      state.page = 1;
      render();
    });
  }

  // Promo banner button
  var bannerBtn = document.getElementById('bannerBtn');
  if (bannerBtn) {
    bannerBtn.addEventListener('click', function () {
      window.location.href = '1tourdulich.html';
    });
  }

  // Load liked state
  var u = (typeof loadUser === 'function') ? loadUser() : null;
  if (u) {
    try {
      var saved = localStorage.getItem('vt_liked_' + u.email);
      if (saved) state.liked = JSON.parse(saved);
    } catch (err) {}
  }
}