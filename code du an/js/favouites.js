// ============================================================
// FAVORITES / WISHLIST
// ============================================================
var FAV_KEY = 'vt_favourites';
var favorites = [];

// Load từ localStorage
(function() {
  try { favorites = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch(e) { favorites = []; }
  // Render lại trạng thái nút tim sau khi trang load
  document.addEventListener('DOMContentLoaded', function() {
    favorites.forEach(function(f) {
      document.querySelectorAll('.tour-wishlist').forEach(function(btn) {
        var card = btn.closest('.tour-card');
        if (card && card.querySelector('.tour-title')?.textContent === f.title) {
          btn.textContent = '♥'; btn.classList.add('liked');
        }
      });
    });
    updateFavPanel();
    if (document.getElementById('cpWishlistGrid')) cpRenderWishlist();
  });
})();

function saveFavs() {
  localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
}

function toggleWishlist(e, btn, title, price, imgKey) {
  e.stopPropagation();
  var idx = favorites.findIndex(function(f) { return f.title === title; });
  if (idx === -1) {
    favorites.push({ title: title, price: price, imgKey: imgKey });
    btn.textContent = '♥'; btn.classList.add('liked');
    if (typeof showToast === 'function') showToast('❤️ Đã thêm "' + title + '" vào yêu thích!');
  } else {
    favorites.splice(idx, 1);
    btn.textContent = '♡'; btn.classList.remove('liked');
    if (typeof showToast === 'function') showToast('Đã xóa khỏi danh sách yêu thích');
  }
  saveFavs();
  updateFavPanel();
  if (document.getElementById('cpWishlistGrid')) cpRenderWishlist();
}

function updateFavPanel() {
  var count   = favorites.length;
  var countEl = document.getElementById('favCount');
  if (countEl) { countEl.textContent = count; countEl.style.display = count > 0 ? 'flex' : 'none'; }
  var list = document.getElementById('favList');
  if (!list) return;
  if (count === 0) {
    list.innerHTML = '<div class="fav-empty"><div class="fav-empty-icon">🤍</div><p>Chưa có tour yêu thích nào.<br>Nhấn ♡ để thêm vào danh sách!</p></div>';
    return;
  }
  list.innerHTML = favorites.map(function(f, i) {
    var bg = (typeof FAV_COLOR !== 'undefined' && FAV_COLOR[f.imgKey]) ? FAV_COLOR[f.imgKey] : '#e8f5ee';
    var em = (typeof FAV_EMOJI !== 'undefined' && FAV_EMOJI[f.imgKey]) ? FAV_EMOJI[f.imgKey] : '🌿';
    return '<div class="fav-item">' +
      '<div class="fav-item-icon" style="background:' + bg + '">' + em + '</div>' +
      '<div class="fav-item-info"><div class="fav-item-title">' + f.title + '</div><div class="fav-item-price">' + f.price + '</div></div>' +
      '<button class="fav-remove" onclick="removeFav(' + i + ')">🗑</button>' +
    '</div>';
  }).join('');
}

function removeFav(idx) {
  var title = favorites[idx].title;
  document.querySelectorAll('.tour-wishlist').forEach(function(btn) {
    var card = btn.closest('.tour-card');
    if (card && card.querySelector('.tour-title')?.textContent === title) {
      btn.textContent = '♡'; btn.classList.remove('liked');
    }
  });
  favorites.splice(idx, 1);
  saveFavs();
  updateFavPanel();
  if (document.getElementById('cpWishlistGrid')) cpRenderWishlist();
  if (typeof showToast === 'function') showToast('Đã xóa khỏi danh sách yêu thích');
}

function toggleFavPanel() {
  var panel   = document.getElementById('favPanel');
  var overlay = document.getElementById('favOverlay');
  if (panel)   panel.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
}

// ===== RENDER WISHLIST TRONG TRANG CÁ NHÂN =====
function cpRenderWishlist() {
  var grid  = document.getElementById('cpWishlistGrid');
  var empty = document.getElementById('cpWishlistEmpty');
  if (!grid) return;

  if (!favorites.length) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  var allTours = typeof getActiveTours === 'function' ? getActiveTours() : [];

  grid.innerHTML = favorites.map(function(f) {
    var tour = allTours.find(function(t) { return t.title === f.title; });
    var bg   = typeof getImgBg === 'function' ? getImgBg(f.imgKey) : 'linear-gradient(135deg,#2d8a4e,#3aaa62)';
    var page = tour ? (tour.page || '') : '';

    return '<div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);cursor:' + (page?'pointer':'default') + ';transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform=\'translateY(-3px)\';this.style.boxShadow=\'0 8px 24px rgba(0,0,0,0.13)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'0 2px 12px rgba(0,0,0,0.08)\'" onclick="' + (page ? "window.location.href='" + page + "'" : '') + '">' +
      '<div style="height:130px;background:' + bg + ';background-size:cover;background-position:center;position:relative">' +
        '<button onclick="event.stopPropagation();cpRemoveWishlist(\'' + f.title.replace(/'/g, "\\'") + '\')" style="position:absolute;top:8px;right:8px;background:rgba(255,255,255,0.9);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:0.8rem;display:flex;align-items:center;justify-content:center" title="Xóa yêu thích">🗑</button>' +
        '<span style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.5);color:#fff;font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:20px">' + (tour ? tour.badge : '') + '</span>' +
      '</div>' +
      '<div style="padding:12px">' +
        '<div style="font-size:0.82rem;font-weight:700;color:#1a1a1a;margin-bottom:4px;line-height:1.3">' + f.title + '</div>' +
        '<div style="font-size:0.72rem;color:#aaa;margin-bottom:8px">📍 ' + (tour ? tour.location : '') + '</div>' +
        '<div style="font-size:0.75rem;color:#555">Từ <strong style="color:#2d8a4e">' + f.price + '</strong>/người</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function cpRemoveWishlist(title) {
  var idx = favorites.findIndex(function(f) { return f.title === title; });
  if (idx >= 0) { favorites.splice(idx, 1); saveFavs(); cpRenderWishlist(); updateFavPanel(); }
  if (typeof showToast === 'function') showToast('Đã xóa khỏi yêu thích');
}