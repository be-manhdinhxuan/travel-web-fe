// TOUR LIST PAGE
// ============================================================
let tlStarMin = 0;
const TL_PER_PAGE = 6;
let tlPage = 1;

function updatePriceDisplay() {
  const v = parseInt(document.getElementById('tlMaxPrice').value);
  document.getElementById('tlPriceDisplay').textContent = v.toLocaleString('vi-VN') + 'đ';
}

function setStarFilter(stars, el) {
  tlStarMin = stars;
  document.querySelectorAll('.tl-stars-check').forEach(l => l.classList.remove('active'));
  el.classList.add('active');
  applyTourFilters();
}

function resetTourFilters() {
  document.getElementById('tlSearch').value = '';
  document.getElementById('tlMaxPrice').value = 10000000;
  document.getElementById('tlSort').value = 'popular';
  tlStarMin = 0; tlPage = 1;
  document.querySelectorAll('.tl-sidebar input[type=checkbox]').forEach(c => c.checked = true);
  document.querySelectorAll('.tl-stars-check').forEach(l => l.classList.remove('active'));
  updatePriceDisplay();
  applyTourFilters();
}

function applyTourFilters() {
  const q        = (document.getElementById('tlSearch')?.value || '').toLowerCase().trim();
  const maxPrice = parseInt(document.getElementById('tlMaxPrice')?.value || 10000000);
  const sort     = document.getElementById('tlSort')?.value || 'popular';
  const checkedTypes = [...document.querySelectorAll('.tl-sidebar input[type=checkbox]:checked')].map(c => c.value);

  let results = getActiveTours().filter(t => {
    const price = parseInt(t.price.replace(/[^\d]/g,''));
    const stars = parseFloat(t.stars.replace(/[^0-9.]/g,'').trim()) || 4.5;
    const matchQ    = !q || t.title.toLowerCase().includes(q) || t.location.toLowerCase().includes(q);
    const matchP    = price <= maxPrice;
    const matchType = checkedTypes.length === 0 || t.tags.some(tag => checkedTypes.includes(tag));
    const matchStar = stars >= tlStarMin;
    return matchQ && matchP && matchType && matchStar;
  });

  // Sort
  if (sort === 'price-asc')  results.sort((a,b) => parseInt(a.price.replace(/\D/g,'')) - parseInt(b.price.replace(/\D/g,'')));
  if (sort === 'price-desc') results.sort((a,b) => parseInt(b.price.replace(/\D/g,'')) - parseInt(a.price.replace(/\D/g,'')));
  if (sort === 'rating')     results.sort((a,b) => b.stars.length - a.stars.length);

  document.getElementById('tlCount').textContent = results.length;

  // Paginate
  const totalPages = Math.max(1, Math.ceil(results.length / TL_PER_PAGE));
  if (tlPage > totalPages) tlPage = 1;
  const paged = results.slice((tlPage-1)*TL_PER_PAGE, tlPage*TL_PER_PAGE);

  const grid = document.getElementById('tlGrid');
  if (paged.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted)"><div style="font-size:3rem;margin-bottom:12px">🔍</div><p style="font-weight:600;color:var(--dark)">Không tìm thấy tour phù hợp</p></div>';
  } else {
    grid.innerHTML = paged.map(t => buildTLCard(t)).join('');
    requestAnimationFrame(() => {
      grid.querySelectorAll('.tl-card').forEach((el, i) => {
        el.style.transitionDelay = `${i*60}ms`;
        el.style.opacity = '1'; el.style.transform = 'translateY(0)';
      });
    });
  }

  renderPagination(totalPages);
}

function buildTLCard(t) {
  const bg = IMG_BG[t.imgKey] || 'linear-gradient(135deg,#2d8a4e,#3aaa62)';
  const click = t.page ? `onclick="window.location.href='${t.page}'"` : `onclick="window.location.href='1datour.html?tour=${t.imgKey}'"`;
  return `
  <div class="tl-card" ${click} style="opacity:0;transform:translateY(16px);transition:opacity .4s ease,transform .4s ease;">
    <div class="tl-card-img">
      <div class="tl-card-img-inner" style="background:${bg}"></div>
      <span class="tour-badge ${t.badgeClass}">${t.badge}</span>
      <button class="tour-wishlist" onclick="toggleWishlist(event,this,'${t.title.replace(/'/g,"\\'")}','${t.price}','${t.imgKey}')">♡</button>
    </div>
    <div class="tl-card-body">
      <div class="tl-card-location">📍 ${t.location}</div>
      <div class="tl-card-title">${t.title}</div>
      <div class="tl-card-stars">${t.stars} <span>(${t.reviews} đánh giá)</span></div>
      <div class="tl-card-footer">
        <div class="tl-card-price"><span>Từ</span><strong>${t.price}</strong></div>
        <button class="btn-book" onclick="window.location.href='1datour.html?tour=${t.imgKey}'; event.stopPropagation()">Đặt ngay</button>
      </div>
    </div>
  </div>`;
}

function renderPagination(total) {
  const el = document.getElementById('tlPagination');
  if (total <= 1) { el.innerHTML = ''; return; }
  let html = `<button class="tl-page-btn" onclick="tlGoPage(${tlPage-1})" ${tlPage===1?'disabled':''}>‹</button>`;
  for (let i = 1; i <= total; i++) {
    html += `<button class="tl-page-btn ${i===tlPage?'active':''}" onclick="tlGoPage(${i})">${i}</button>`;
  }
  html += `<button class="tl-page-btn" onclick="tlGoPage(${tlPage+1})" ${tlPage===total?'disabled':''}>›</button>`;
  el.innerHTML = html;
}

function tlGoPage(p) {
  const max = Math.ceil(getActiveTours().length / TL_PER_PAGE);
  if (p < 1 || p > max) return;
  tlPage = p;
  applyTourFilters();
  document.querySelector('.tl-main').scrollIntoView({ behavior:'smooth', block:'start' });
}

// ============================================================