// ============================================================
// home.js — Trang chủ
// ============================================================

// Kiểm tra xem user vừa đăng nhập, nếu có thì hiển thị toast
function checkLoginToast() {
  if (localStorage.getItem('showLoginToast') === 'true') {
    localStorage.removeItem('showLoginToast')
    if (typeof showToast === 'function') {
      showToast('Đăng nhập thành công')
    }
  }
}

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
// ===== CATEGORIES =====
async function loadCategories() {
  const res = await apiGetCategories({ limit: 20 })
  if (!res.ok) return
  renderDestinations(res.data.result?.categories || [])
}

function renderDestinations(categories) {
  const grid = document.getElementById('destGrid')
  if (!grid) return

  const fallbackThumbs = [
    'linear-gradient(135deg,#2d8a4e,#3aaa62)',
    'linear-gradient(135deg,#1f6f8b,#2ca8c2)',
    'linear-gradient(135deg,#c56a1f,#e6a23c)',
    'linear-gradient(135deg,#6a4fb3,#8d6ee8)',
    'linear-gradient(135deg,#b34747,#de6b6b)'
  ]

  grid.innerHTML = categories.map(cat => `
    <div class="dest-card" onclick="goByCategory('${cat._id}')">
      <div class="dest-thumb">
        <div class="dest-thumb-inner" style="${cat.thumbnail
      ? `background:url('${cat.thumbnail}') center/cover no-repeat`
      : `background:${fallbackThumbs[Math.floor(Math.random() * fallbackThumbs.length)]}`}"></div>
      </div>
      <div class="dest-label">${cat.name}</div>
    </div>
  `).join('')
}

function goByCategory(categoryId) {
  window.location.href = `tour-du-lich.html?category_id=${categoryId}`
}

// ===== SEARCH =====
let allDestinations = []

async function initSearchData() {
  const res = await apiGetTours({ limit: 100 })
  if (!res.ok) return
  const tours = res.data.result?.tours || []
  const set = new Set()
  tours.forEach(t => { if (t.destination) set.add(t.destination) })
  allDestinations = [...set]
}

function doSearch() {
  const dest = (document.getElementById('searchDest')?.value || '').trim()
  if (!dest) { if (typeof showToast === 'function') showToast('⚠️ Vui lòng nhập điểm đến'); return }
  const params = new URLSearchParams()
  params.set('destination', dest)
  window.location.href = `tour-du-lich.html?${params.toString()}`
}

function liveSearch() {
  const keyword = (document.getElementById('searchDest')?.value || '').toLowerCase()
  const box = document.getElementById('searchSuggest')
  if (!box) return
  if (!keyword) { box.innerHTML = ''; return }
  const filtered = allDestinations.filter(d => d.toLowerCase().includes(keyword))
  box.innerHTML = filtered.map(d => `<div onclick="selectDest('${d}')">${d}</div>`).join('')
}

function selectDest(dest) {
  const inp = document.getElementById('searchDest')
  if (inp) inp.value = dest
  const box = document.getElementById('searchSuggest')
  if (box) box.innerHTML = ''
}

function scrollDest(direction) {
  const container = document.getElementById('destGrid')
  if (!container) return
  container.scrollBy({ left: direction * 220, behavior: 'smooth' })
}

// ===== LOAD TOURS =====
async function loadTours() {
  const grid = document.getElementById('tourGrid')
  if (!grid) return
  grid.innerHTML = '<p style="padding:20px;color:var(--muted)">Đang tải tour...</p>'

  await loadMe() // Load thông tin user trước để biết wishlist

  const res = await apiGetTours({ page: 1, limit: 6 })

  if (!res || !res.ok) {
    grid.innerHTML = '<p style="padding:20px;color:#e55">Không thể kết nối server</p>'
    return
  }

  const tours = res.data?.result?.tours || []
  if (!tours.length) {
    grid.innerHTML = '<p style="padding:20px;color:var(--muted)">Chưa có tour nào</p>'
    return
  }

  renderTours(tours)
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

// ===== FILTER =====
let activeFilter = null

function filterByCategory(categoryId, label) {
  if (activeFilter === categoryId) { clearFilter(); return }
  activeFilter = categoryId
  document.querySelectorAll('.dest-card').forEach(c => c.classList.remove('dest-active'))
  document.querySelector(`[onclick*="${categoryId}"]`)?.classList.add('dest-active')
  document.getElementById('filterBannerText').textContent = `📍 ${label}`
  document.getElementById('filterBanner').style.display = 'flex'
  document.getElementById('tourSectionTitle').textContent = `Tour ${label}`
  apiGetTours({ category_id: categoryId, limit: 9 }).then(res => {
    const tours = res.data?.result?.tours || []
    if (!tours.length) {
      document.getElementById('tourGrid').style.display = 'none'
      document.getElementById('filterEmpty').style.display = 'block'
    } else {
      document.getElementById('filterEmpty').style.display = 'none'
      document.getElementById('tourGrid').style.display = 'grid'
      renderTours(tours)
    }
  })
}

function clearFilter() {
  activeFilter = null
  document.querySelectorAll('.dest-card').forEach(c => c.classList.remove('dest-active'))
  document.getElementById('filterBanner').style.display = 'none'
  document.getElementById('filterEmpty').style.display = 'none'
  document.getElementById('tourSectionTitle').textContent = 'Tour Gợi Ý'
  document.getElementById('tourGrid').style.display = 'grid'
  loadTours()
}