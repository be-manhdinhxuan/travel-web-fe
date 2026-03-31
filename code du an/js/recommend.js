
async function recGetTours(limit = 4) {
  try {
    const res = await apiGetRecommendedTours()
    if (res && res.ok) {
      const tours = res.data?.result?.tours || res.data?.result || []
      return tours.slice(0, limit)
    }
  } catch (e) {
    console.error('recGetTours:', e)
  }
  return []
}

async function recRender(gridId) {
  const grid = document.getElementById(gridId)
  if (!grid) return

  const tours = await recGetTours(4)

  if (!tours.length) {
    const sec = document.getElementById('recSection')
    if (sec) sec.style.display = 'none'
    return
  }

  grid.innerHTML = tours.map(tour => {
    const img = tour.images?.[0] || ''
    const name = tour.name || '—'
    const loc = tour.destination || '—'
    const days = tour.duration_days || 0
    const nights = tour.duration_nights || 0
    const price = tour.schedules?.[0]?.price_adult
      ? tour.schedules[0].price_adult.toLocaleString('vi-VN') + 'đ'
      : (tour.min_price ? tour.min_price.toLocaleString('vi-VN') + 'đ' : '—')
    const slug = tour.slug || tour._id || ''
    const badge = days ? `${days} ngày ${nights} đêm` : ''

    return `
    <div class="tour-card" onclick="window.location.href='dat-tour.html?tour=${slug}'" style="cursor:pointer">
      <div class="tour-img">
        <div class="tour-img-inner" style="background:url('${img}') center/cover no-repeat${!img ? ';background:linear-gradient(135deg,#2d8a4e,#3aaa62)' : ''}"></div>
        ${badge ? `<span class="tour-badge">${badge}</span>` : ''}
        <button class="tour-wishlist" onclick="event.stopPropagation()" title="Yêu thích">♡</button>
      </div>
      <div class="tour-body">
        <div class="tour-stars"><span style="color:var(--gold)">★★★★★</span></div>
        <div class="tour-title">${name}</div>
        <div class="tour-location">📍 ${loc}</div>
        <div class="tour-footer">
          <div class="tour-price">
            <span style="font-size:0.7rem;color:var(--muted)">Từ / người</span>
            <strong>${price}</strong>
          </div>
          <button class="btn-book" onclick="event.stopPropagation();window.location.href='dat-tour.html?tour=${slug}'">Đặt ngay</button>
        </div>
      </div>
    </div>`
  }).join('')
}