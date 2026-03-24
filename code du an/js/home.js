async function loadCategories() {
  const res = await apiCall('GET', '/categories?limit=100')

  if (!res.ok) {
    console.error('Load categories failed')
    return
  }

  const categories = res.data.result.categories

  renderDestinations(categories)
}

function renderDestinations(categories) {
  const grid = document.getElementById('destGrid')

  grid.innerHTML = categories.map(cate => `
    <div class="dest-card" onclick="goByCategory('${cate._id}')">
      <div class="dest-thumb">
        <div
          class="dest-thumb-inner"
          style="
            background-image:url('${cate.thumbnail || ''}');
            background-size:cover;
            background-position:center;
          ">
        </div>
      </div>
      <div class="dest-label">${cate.name}</div>
    </div>
  `).join('')
}

function goByCategory(categoryId) {
  window.location.href = `tour-du-lich.html?category_id=${categoryId}`
}

function doSearch() {
  const dest = document.getElementById('searchDest').value.trim()
  const date = document.getElementById('searchDate').value
  const guests = document.getElementById('searchGuests').value

  const params = new URLSearchParams()

  if (dest) params.set('destination', dest)
  if (date) params.set('date', date)
  if (guests) params.set('guests', guests)

  window.location.href = `tour-du-lich.html?${params.toString()}`
}

let allDestinations = []

async function initSearchData() {
  const res = await apiCall('GET', '/tours?limit=100')

  if (!res.ok) return

  const tours = res.data.result.tours

  const set = new Set()
  tours.forEach(t => set.add(t.destination))

  allDestinations = [...set]
}

function liveSearch() {
  const keyword = document.getElementById('searchDest').value.toLowerCase()
  const box = document.getElementById('searchSuggest')

  if (!keyword) {
    box.innerHTML = ''
    return
  }

  const filtered = allDestinations.filter(d =>
    d.toLowerCase().includes(keyword)
  )

  box.innerHTML = filtered.map(d => `
    <div onclick="selectDest('${d}')">${d}</div>
  `).join('')
}

function selectDest(dest) {
  document.getElementById('searchDest').value = dest
  document.getElementById('searchSuggest').innerHTML = ''
}

function scrollDest(direction) {
  const container = document.getElementById('destGrid')
  const card = container.querySelector('.dest-card')

  if (!card) return

  const scrollAmount = card.offsetWidth + 16

  container.scrollBy({
    left: direction * scrollAmount * 2,
    behavior: 'smooth'
  })
}


// ==========================
// LOAD TOURS FROM API
// ==========================
async function loadTours() {
  const grid = document.getElementById('tourGrid')
  grid.innerHTML = `<p>Đang tải tour...</p>`

  const res = await apiGetTours({ page: 1, limit: 10 })

  console.log('Tours:', res)

  if (!res || !res.ok) {
    grid.innerHTML = `<p style="color:red">Không thể kết nối server</p>`
    return
  }

  const tours = res.data?.result?.tours || res.data?.result || []

  if (!tours.length) {
    grid.innerHTML = `<p>Chưa có tour nào</p>`
    return
  }

  renderTours(tours)
}

// ==========================
// RENDER UI
// ==========================
function renderTours(tours) {
  const grid = document.getElementById('tourGrid')

  // Grid layout
  grid.style.display = 'grid'
  grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))'
  grid.style.gap = '20px'

  grid.innerHTML = tours.map(tour => `
    <div style="
      display:flex;
      flex-direction:column;
      height:100%;
      border:1px solid #eee;
      border-radius:12px;
      overflow:hidden;
      background:#fff;
      box-shadow:0 4px 12px rgba(0,0,0,0.05);
      transition:0.3s;
    "
    onmouseover="this.style.transform='translateY(-5px)'"
    onmouseout="this.style.transform='translateY(0)'"
    >

      <!-- IMAGE -->
      <img
        src="${tour.images?.[0] || 'https://via.placeholder.com/300'}"
        style="
          width:100%;
          height:180px;
          object-fit:cover;
        "
      />

      <!-- BODY -->
      <div style="
        padding:16px;
        display:flex;
        flex-direction:column;
        height:100%;
      ">

        <!-- CONTENT -->
        <div style="flex:1">

          <!-- TITLE -->
          <h3 style="
            font-size:16px;
            font-weight:600;
            margin-bottom:8px;
            color:#222;
            min-height:40px;
          ">
            ${tour.name}
          </h3>

          <!-- DESCRIPTION -->
          <p style="
            font-size:13px;
            color:#666;
            margin-bottom:10px;
            height:40px;
            overflow:hidden;
          ">
            ${tour.description || ''}
          </p>

          <!-- META -->
          <div style="
            display:flex;
            justify-content:space-between;
            font-size:13px;
            color:#666;
            margin-bottom:12px;
          ">
            <span>
              <i class="fa-solid fa-location-dot"></i>
              ${tour.destination || 'Đang cập nhật'}
            </span>

            <span>
              <i class="fa-regular fa-clock"></i>
              ${tour.duration_days || 0}N${tour.duration_nights || 0}Đ
            </span>
          </div>

        </div>

        <!-- BUTTON -->
        <button
          onclick="goDetail('${tour.slug}')"
          style="
            font-family:inherit;
            width:100%;
            padding:10px;
            background:#16a34a;
            color:white;
            border:none;
            border-radius:8px;
            cursor:pointer;
            font-weight:600;
            margin-top:auto;
            transition:0.2s;
          "
          onmouseover="this.style.background='#15803d'"
          onmouseout="this.style.background='#16a34a'"
        >
          Xem chi tiết
        </button>

      </div>
    </div>
  `).join('')
}
function goDetail(slug) {
  window.location.href = 'tour-detail.html?slug=' + slug
}