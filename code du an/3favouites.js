// FAVORITES
// ============================================================
let favorites = [];

function toggleWishlist(e, btn, title, price, imgKey) {
  e.stopPropagation();
  const idx = favorites.findIndex(f => f.title === title);
  if (idx === -1) {
    favorites.push({ title, price, imgKey });
    btn.textContent = '♥'; btn.classList.add('liked');
    showToast(`❤️ Đã thêm "${title}" vào yêu thích!`);
  } else {
    favorites.splice(idx, 1);
    btn.textContent = '♡'; btn.classList.remove('liked');
    showToast('Đã xóa khỏi danh sách yêu thích');
  }
  updateFavPanel();
}

function updateFavPanel() {
  const count   = favorites.length;
  const countEl = document.getElementById('favCount');
  countEl.textContent = count;
  countEl.style.display = count > 0 ? 'flex' : 'none';
  const list = document.getElementById('favList');
  if (count === 0) {
    list.innerHTML = '<div class="fav-empty"><div class="fav-empty-icon">🤍</div><p>Chưa có tour yêu thích nào.<br>Nhấn ♡ để thêm vào danh sách!</p></div>';
    return;
  }
  list.innerHTML = favorites.map((f, i) => `
    <div class="fav-item">
      <div class="fav-item-icon" style="background:${FAV_COLOR[f.imgKey]||'#eee'}">${FAV_EMOJI[f.imgKey]||'🌿'}</div>
      <div class="fav-item-info"><div class="fav-item-title">${f.title}</div><div class="fav-item-price">${f.price}</div></div>
      <button class="fav-remove" onclick="removeFav(${i})">🗑</button>
    </div>`).join('');
}

function removeFav(idx) {
  const title = favorites[idx].title;
  document.querySelectorAll('.tour-wishlist').forEach(btn => {
    const card = btn.closest('.tour-card');
    if (card?.querySelector('.tour-title')?.textContent === title) {
      btn.textContent = '♡'; btn.classList.remove('liked');
    }
  });
  favorites.splice(idx, 1);
  updateFavPanel();
  showToast('Đã xóa khỏi danh sách yêu thích');
}

function toggleFavPanel() {
  document.getElementById('favPanel').classList.toggle('open');
  document.getElementById('favOverlay').classList.toggle('open');
}

// ============================================================