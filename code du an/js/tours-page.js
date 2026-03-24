// TOUR LIST PAGE
// ============================================================
async function loadTours() {
  const params = new URLSearchParams(window.location.search)

  const page = Number(params.get('page')) || 1
  const limit = 6
  const keyword = params.get('keyword') || ''
  const destination = decodeURIComponent(params.get('destination') || '')
  const duration = params.get('duration') || ''
  const categoryId = params.get('category_id') || ''
  let sort = params.get('sort') || 'newest'

  // Chuẩn hóa sort về chữ thường
  sort = sort.toLowerCase().trim()

  // ===== SYNC UI =====
  const searchInput = document.getElementById('tlSearch')
  if (searchInput) searchInput.value = keyword

  const sortEl = document.getElementById('tlSort')
  if (sortEl) sortEl.value = sort

  // Check radio duration
  if (duration) {
    const radio = document.querySelector(`input[name="duration"][value="${duration}"]`)
    if (radio) radio.checked = true
  }

  // ===== BUILD QUERY =====
  let endpoint = `/tours?page=${page}&limit=${limit}`

  if (keyword) {
    endpoint += `&keyword=${encodeURIComponent(keyword)}`   // ← thêm encodeURIComponent
  }

  if (destination) {
    endpoint += `&destination=${encodeURIComponent(destination)}`
  }
  if (duration) {
    endpoint += `&duration=${duration}`
  }
  if (categoryId) {
    endpoint += `&category_id=${categoryId}`
  }

  // Sort - đảm bảo gửi chữ thường
  const allowedSorts = ['newest', 'name_asc', 'name_desc', 'duration_asc', 'duration_desc', 'price_asc', 'price_desc']
  const finalSort = allowedSorts.includes(sort) ? sort : 'newest'
  endpoint += `&sort=${finalSort}`

  console.log('🔗 API CALL:', endpoint)

  const res = await apiCall('GET', endpoint)

  if (!res.ok) {
    console.error('Load tours failed', res)
    showToast('Lỗi khi tải danh sách tour', 'error')
    document.getElementById('tlGrid').innerHTML = `<p class="error">Không thể tải dữ liệu. Vui lòng thử lại.</p>`
    return
  }

  const result = res.data?.result || res.data
  const tours = result?.tours || []
  const pagination = result?.pagination || { page: 1, limit: 6, total: 0, total_pages: 0 }

  // Render
  renderTours(tours || [])
  renderPagination(pagination)          // ← quan trọng
  document.getElementById('tlCount').innerText = pagination?.total || 0

  if (destination) {
    document.getElementById('tourListHeading').innerText = `Tour tại ${destination}`
  }
}

let searchTimeout = null;

function handleSearch() {
  const keyword = document.getElementById('tlSearch').value.trim();

  // Xóa timeout cũ nếu có
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  // Đợi 400ms sau khi người dùng ngừng gõ mới gọi API
  searchTimeout = setTimeout(() => {
    const params = new URLSearchParams(window.location.search);

    if (keyword) {
      params.set('keyword', keyword);        // Không cần encodeURIComponent ở đây
    } else {
      params.delete('keyword');
    }

    params.set('page', '1');

    // Cập nhật URL không reload trang
    window.history.pushState({ keyword }, '', `?${params.toString()}`);

    // Gọi load dữ liệu
    loadTours();
  }, 500);
}

function renderPagination(pagination) {
  const container = document.getElementById('tlPagination')

  if (!pagination || pagination.total_pages <= 1) {
    container.innerHTML = ''
    return
  }

  let html = ''

  for (let i = 1; i <= pagination.total_pages; i++) {
    html += `
      <button
        onclick="goPage(${i})"
        style="
          font-family: 'Inter', sans-serif;
          margin:4px;
          padding:6px 10px;
          border-radius:6px;
          border:1px solid #ddd;
          background:${i == pagination.page ? '#2d8a4e' : 'white'};
          color:${i == pagination.page ? 'white' : 'black'};
          cursor:pointer;
        ">
        ${i}
      </button>
    `
  }

  container.innerHTML = html
}

function goPage(page) {
  const params = new URLSearchParams(window.location.search)
  params.set('page', page)

  window.location.search = params.toString()
}

function renderTours(tours) {
  const grid = document.getElementById('tlGrid')

  if (!tours || tours.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px;">
        <div style="font-size:40px;">🔍</div>
        <p>Không tìm thấy tour phù hợp</p>
      </div>
    `
    return
  }

  grid.innerHTML = tours.map(tour => `
    <div class="tour-card">

      <!-- IMAGE -->
      <div class="tour-img">
        <img
          src="${tour.images?.[0] || 'https://via.placeholder.com/400'}"
          alt="${tour.name}"
        />
      </div>

      <!-- BODY -->
      <div class="tour-body">

        <!-- TITLE -->
        <h3 class="tour-title">
          ${tour.name}
        </h3>

        <!-- LOCATION -->
        <div class="tour-location">
          <i class="fa-solid fa-location-dot"></i>
          ${tour.destination || ''}
        </div>

        <!-- META -->
        <div class="tour-meta">
          <span>
            <i class="fa-regular fa-clock"></i>
            ${tour.duration_days}N${tour.duration_nights}Đ
          </span>
        </div>

        <!-- FOOTER -->
        <div class="tour-footer">
          <button onclick="goDetail('${tour.slug}')">
            Xem chi tiết
          </button>
        </div>

      </div>
    </div>
  `).join('')
}

function goDetail(slug) {
  window.location.href = `chi-tiet.html?slug=${slug}`
}

// Xử lý khi thay đổi radio duration
function handleFilter() {
  const selectedDuration = document.querySelector('input[name="duration"]:checked')?.value || ''

  // Cập nhật URL và reload danh sách
  updateURLAndReload({
    duration: selectedDuration,
    page: 1   // reset về trang 1 khi filter
  })
}

// Xử lý khi thay đổi Sort
function handleSort() {
  const selectedSort = document.getElementById('tlSort').value

  updateURLAndReload({
    sort: selectedSort,
    page: 1
  })
}

// Hàm chung để cập nhật URL và load lại dữ liệu
function updateURLAndReload(newParams) {
  const url = new URL(window.location)

  // Xóa các param cũ không cần thiết
  if (newParams.duration !== undefined) url.searchParams.set('duration', newParams.duration)
  if (newParams.sort !== undefined) url.searchParams.set('sort', newParams.sort)
  if (newParams.page !== undefined) url.searchParams.set('page', newParams.page)

  // Nếu có search hoặc destination thì giữ lại
  const keyword = document.getElementById('tlSearch')?.value.trim()
  if (keyword) url.searchParams.set('keyword', keyword)

  window.history.pushState({}, '', url)
  loadTours()
}

// Reset tất cả filter
function resetFilters() {
  const url = new URL(window.location)
  url.searchParams.delete('duration')
  url.searchParams.delete('sort')
  url.searchParams.delete('keyword')
  url.searchParams.set('page', '1')

  window.history.pushState({}, '', url)

  // Reset UI
  document.getElementById('tlSearch').value = ''
  document.getElementById('tlSort').value = 'newest'
  document.querySelector('input[name="duration"][value=""]').checked = true

  loadTours()
}