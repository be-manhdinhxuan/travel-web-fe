// ============================================================
// tours-page.js — Trang danh sách tour
// ============================================================

async function loadTours() {
  const params = new URLSearchParams(window.location.search)
  const page = Number(params.get('page')) || 1
  const limit = 6
  const keyword = params.get('keyword') || ''
  const destination = decodeURIComponent(params.get('destination') || '')
  const duration = params.get('duration') || ''
  const categoryId = params.get('category_id') || ''
  const sort = (params.get('sort') || 'newest').toLowerCase().trim()

  // Sync UI
  const searchInput = document.getElementById('tlSearch')
  if (searchInput) searchInput.value = keyword
  const sortEl = document.getElementById('tlSort')
  if (sortEl) sortEl.value = sort
  if (duration) {
    const radio = document.querySelector(`input[name="duration"][value="${duration}"]`)
    if (radio) radio.checked = true
  }

  // Build params
  const queryParams = { page, limit }
  if (keyword) queryParams.keyword = keyword
  if (destination) queryParams.destination = destination
  if (duration) queryParams.duration = duration
  if (categoryId) queryParams.category_id = categoryId
  const allowed = ['newest', 'name_asc', 'name_desc', 'duration_asc', 'duration_desc', 'price_asc', 'price_desc']
  queryParams.sort = allowed.includes(sort) ? sort : 'newest'

  const res = await apiGetTours(queryParams)

  if (!res.ok) {
    document.getElementById('tlGrid').innerHTML = '<p style="padding:40px;text-align:center;color:#e55">Không thể tải dữ liệu. Vui lòng thử lại.</p>'
    return
  }

  const result = res.data?.result || {}
  const tours = result.tours || []
  const pagination = result.pagination || { page: 1, limit: 6, total: 0, total_pages: 0 }

  renderTours(tours)
  renderPagination(pagination)

  const countEl = document.getElementById('tlCount')
  if (countEl) countEl.innerText = pagination.total || 0

  const headingEl = document.getElementById('tourListHeading')
  if (headingEl && destination) headingEl.innerText = `Tour tại ${destination}`
}

// ===== RENDER TOURS =====
function renderTours(tours) {
  const grid = document.getElementById('tlGrid')
  if (!grid) return

  if (!tours || !tours.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted)">
        <div style="font-size:3rem;margin-bottom:16px">🔍</div>
        <p style="font-weight:600;color:var(--dark);margin-bottom:8px">Không tìm thấy tour phù hợp</p>
        <p style="font-size:0.875rem">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
      </div>`
    return
  }

  grid.innerHTML = tours.map(tour => {
    const img = tour.images?.[0] || ''
    const name = tour.name || '—'
    const location = tour.destination || '—'
    const days = tour.duration_days || 0
    const nights = tour.duration_nights || 0
    const price = tour.schedules?.[0]?.price_adult
      ? tour.schedules[0].price_adult.toLocaleString('vi-VN') + 'đ'
      : (tour.min_price ? tour.min_price.toLocaleString('vi-VN') + 'đ' : '—')
    const rating = tour.rating || 4.8
    const ratingCount = tour.rating_count || 0
    const slug = tour.slug || tour._id || ''
    const badge = days ? `${days}N${nights}Đ` : ''
    const slots = tour.available_slots
    const urgency = slots != null && slots <= 5
      ? `<div style="font-size:0.75rem;font-weight:600;color:#e63946;margin-bottom:6px">Còn ${slots} chỗ cuối</div>` : ''

    return `
    <div class="tour-card" onclick="window.location.href='dat-tour.html?tour=${slug}'" style="cursor:pointer">
      <div class="tour-img" style="height:200px;position:relative;overflow:hidden">
        ${img
        ? `<img src="${img}" alt="${name}" style="width:100%;height:100%;object-fit:cover;transition:transform .4s" onerror="this.parentNode.style.background='linear-gradient(135deg,#2d8a4e,#3aaa62)';this.remove()">`
        : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#2d8a4e,#3aaa62)"></div>`}
        ${badge ? `<span style="position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.55);color:#fff;font-size:0.65rem;font-weight:600;padding:4px 10px;border-radius:20px">${badge}</span>` : ''}
        <button class="tour-wishlist" onclick="event.stopPropagation();handleWishlist(this,'${tour._id}')" title="Yêu thích">♡</button>
      </div>
      <div class="tour-body" style="padding:14px 16px 16px">
        <div style="font-size:0.78rem;color:var(--gold);margin-bottom:5px">
          ★★★★★ <span style="color:var(--muted)">${rating} (${ratingCount} lượt)</span>
        </div>
        <div class="tour-title" style="font-weight:700;font-size:0.95rem;color:var(--dark);line-height:1.35;margin-bottom:5px">${name}</div>
        <div class="tour-location" style="color:var(--muted);font-size:0.8rem;margin-bottom:4px">📍 ${location}</div>
        ${urgency}
        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid #f0f0f0;margin-top:8px">
          <div>
            <div style="font-size:0.7rem;color:var(--muted)">Giá từ / người</div>
            <div style="font-size:1.05rem;font-weight:700;color:var(--dark)">${price}</div>
          </div>
          <button class="btn-book" onclick="event.stopPropagation();window.location.href='dat-tour.html?tour=${slug}'">Đặt ngay</button>
        </div>
      </div>
    </div>`
  }).join('')
}

// ===== WISHLIST =====
async function handleWishlist(btn, tourId) {
  try {
    const res = await apiToggleWishlist(tourId)
    if (res.ok) {
      const added = res.data?.result?.added
      btn.textContent = added ? '♥' : '♡'
      btn.classList.toggle('liked', added)
    }
  } catch (e) { }
}

// ===== PAGINATION =====
function renderPagination(pagination) {
  const container = document.getElementById('tlPagination')
  if (!container) return
  if (!pagination || pagination.total_pages <= 1) { container.innerHTML = ''; return }

  let html = ''
  for (let i = 1; i <= pagination.total_pages; i++) {
    const active = i == pagination.page
    html += `<button onclick="goPage(${i})" style="margin:3px;padding:7px 12px;border-radius:8px;border:1.5px solid ${active ? 'var(--green)' : '#ddd'};background:${active ? 'var(--green)' : '#fff'};color:${active ? '#fff' : 'var(--dark)'};cursor:pointer;font-family:inherit;font-weight:${active ? '700' : '400'}">${i}</button>`
  }
  container.innerHTML = html
}

function goPage(page) {
  const params = new URLSearchParams(window.location.search)
  params.set('page', page)
  window.location.search = params.toString()
}

// ===== SEARCH =====
let searchTimeout = null

function handleSearch() {
  const keyword = document.getElementById('tlSearch')?.value.trim() || ''
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    const params = new URLSearchParams(window.location.search)
    keyword ? params.set('keyword', keyword) : params.delete('keyword')
    params.set('page', '1')
    window.history.pushState({}, '', '?' + params.toString())
    loadTours()
  }, 400)
}

function handleSort() {
  updateURLAndReload({ sort: document.getElementById('tlSort')?.value, page: 1 })
}

function handleFilter() {
  const dur = document.querySelector('input[name="duration"]:checked')?.value || ''
  updateURLAndReload({ duration: dur, page: 1 })
}

function updateURLAndReload(newParams) {
  const url = new URL(window.location)
  Object.entries(newParams).forEach(([k, v]) => {
    v !== undefined ? url.searchParams.set(k, v) : url.searchParams.delete(k)
  })
  window.history.pushState({}, '', url)
  loadTours()
}

function resetFilters() {
  const url = new URL(window.location)
    ;['duration', 'sort', 'keyword'].forEach(k => url.searchParams.delete(k))
  url.searchParams.set('page', '1')
  window.history.pushState({}, '', url)
  const searchEl = document.getElementById('tlSearch')
  if (searchEl) searchEl.value = ''
  const sortEl = document.getElementById('tlSort')
  if (sortEl) sortEl.value = 'newest'
  const allRadio = document.querySelector('input[name="duration"][value=""]')
  if (allRadio) allRadio.checked = true
  loadTours()
}