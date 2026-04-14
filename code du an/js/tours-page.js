// ============================================================
// tours-page.js — Trang danh sách tour
// ============================================================

let userWishlist = []
async function loadMe() {
  try {
    const res = await apiGetMe()

    if (!res.ok) {
      userWishlist = []
      return
    }

    const data = await res.data

    userWishlist = (data.result?.wishlist || []).map(id => id.toString())

  } catch (e) {
    console.error('loadMe error', e)
    userWishlist = []
  }
}

async function loadTours() {
  const params = new URLSearchParams(window.location.search)
  const page = Number(params.get('page')) || 1
  const limit = 6
  const keyword = params.get('keyword') || ''
  const destination = decodeURIComponent(params.get('destination') || '')
  const duration = params.get('duration') || ''
  const categoryId = params.get('category_id') || ''
  const sort = (params.get('sort') || 'newest').toLowerCase().trim()
  const max_price = params.get('max_price')
  const min_price = params.get('min_price')
  const departure_from = params.get('departure_from')
  const departure_to = params.get('departure_to')

  // Sync UI
  const searchInput = document.getElementById('tlSearch')
  if (searchInput) searchInput.value = keyword
  const sortEl = document.getElementById('tlSort')
  if (sortEl) sortEl.value = sort
  const startDateEl = document.getElementById('tlStartDate')
  if (startDateEl) startDateEl.value = departure_from || ''
  const endDateEl = document.getElementById('tlEndDate')
  if (endDateEl) endDateEl.value = departure_to || ''
  if (duration) {
    const radio = document.querySelector(`input[name="duration"][value="${duration}"]`)
    if (radio) radio.checked = true
  }

  if (min_price && max_price) {
    const val = `${min_price}-${max_price}`
    const checkbox = document.querySelector(`input[name="price"][value="${val}"]`)
    if (checkbox) checkbox.checked = true
  }

  if (!min_price && !max_price) {
    const defaultPrice = document.querySelector('input[name="price"][value=""]')
    if (defaultPrice) defaultPrice.checked = true
  }

  // Build params
  const queryParams = { page, limit }
  if (keyword) queryParams.keyword = keyword
  if (destination) queryParams.destination = destination
  if (duration) queryParams.duration = duration
  if (categoryId) queryParams.category_id = categoryId
  if (max_price) queryParams.max_price = Number(max_price)
  if (min_price) queryParams.min_price = Number(min_price)
  if (departure_from) queryParams.departure_from = departure_from
  if (departure_to) queryParams.departure_to = departure_to
  const allowed = ['newest', 'name_asc', 'name_desc', 'duration_asc', 'duration_desc', 'price_asc', 'price_desc']
  queryParams.sort = allowed.includes(sort) ? sort : 'newest'
  await loadMe()
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
  const grid = document.getElementById('tourGrid')
  if (!grid) return

  grid.innerHTML = tours.map(tour => {
    const liked = userWishlist.includes(tour._id.toString())
    const img = tour.images?.[0] || ''
    const name = tour.name || '—'
    const location = tour.destination || '—'
    const days = tour.duration_days || 0
    const nights = tour.duration_nights || 0
    const price = tour.min_price
      ? tour.min_price.toLocaleString('vi-VN') + 'đ'
      : '—'
    const slug = tour.slug || tour._id || ''
    const badge = days ? `${days} ngày ${nights} đêm` : ''
    const slots = tour.available_slots
    const urgency = slots != null && slots <= 5
      ? `<div class="tour-urgency">Còn ${slots} chỗ cuối cùng</div>` : ''

    return `
    <div class="tour-card" onclick="window.location.href='chi-tiet-tour.html?tour=${slug}'" style="cursor:pointer">
      <div class="tour-img">
        <div class="tour-img-inner" style="background:url('${img}') center/cover no-repeat;${!img ? 'background:linear-gradient(135deg,#2d8a4e,#3aaa62)' : ''}"></div>
        ${badge ? `<span class="tour-badge">${badge}</span>` : ''}
        <button class="tour-wishlist ${liked ? 'liked' : ''}"
          onclick="event.stopPropagation();handleWishlist(this,'${tour._id}')"
          title="Yêu thích">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M12 21s-6.7-4.35-10-9C-1 7 2 2 7 2c2.5 0 4 1.5 5 3 1-1.5 2.5-3 5-3 5 0 8 5 5 10-3.3 4.65-10 9-10 9z"/>
          </svg>
        </button>
      </div>
      <div class="tour-body">
        <div class="tour-title">${name}</div>
        <div class="tour-location">📍 ${location}</div>
        ${urgency}
        <div class="tour-footer">
          <div class="tour-price">
            <span style="font-size:0.7rem;color:var(--muted)">Giá từ / người</span>
            <strong>${price}</strong>
          </div>
          <button class="btn-book" onclick="event.stopPropagation();window.location.href='chi-tiet-tour.html?tour=${slug}'">Xem chi tiết</button>
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

      btn.classList.toggle('liked', added)

      // update local state
      if (added) {
        userWishlist.push(tourId.toString())
      } else {
        userWishlist = userWishlist.filter(id => id !== tourId.toString())
      }
    }
  } catch (e) {
    console.error(e)
  }
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
let searchTimeout

function handleSearch() {
  const keyword = document.getElementById('tlSearch').value.trim()

  clearTimeout(searchTimeout)

  searchTimeout = setTimeout(() => {
    updateURLAndReload({ keyword, page: 1 })
  }, 400)
}

function handleSort() {
  const sort = document.getElementById('tlSort').value
  updateURLAndReload({ sort, page: 1 })
}

function handleFilter() {
  const duration = document.querySelector('input[name="duration"]:checked')?.value
  const departure_from = document.getElementById('tlStartDate')?.value
  const departure_to = document.getElementById('tlEndDate')?.value

  // ✅ dùng radio
  const selectedPrice = document.querySelector('input[name="price"]:checked')

  let min_price, max_price

  if (selectedPrice && selectedPrice.value) {
    const [min, max] = selectedPrice.value.split('-')
    min_price = min
    max_price = max
  }

  updateURLAndReload({
    duration,
    departure_from,
    departure_to,
    min_price,
    max_price,
    page: 1
  })
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

    ;['duration', 'sort', 'keyword', 'min_price', 'max_price', 'departure_from', 'departure_to'].forEach(k => url.searchParams.delete(k))

  url.searchParams.set('page', '1')

  window.history.pushState({}, '', url)

  // reset UI
  document.getElementById('tlSearch').value = ''
  document.getElementById('tlSort').value = 'newest'
  const defaultPrice = document.querySelector('input[name="price"][value=""]')
  if (defaultPrice) defaultPrice.checked = true
  document.getElementById('tlStartDate').value = ''
  document.getElementById('tlEndDate').value = ''

  loadTours()
}
