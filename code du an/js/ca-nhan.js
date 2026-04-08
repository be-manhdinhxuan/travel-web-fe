// ============================================================
// ca-nhan.js (API-first)
// ============================================================

const UserVerifyStatus = {
  Unverified: 0,
  Verified: 1,
};

var pendingAvatarFile = null;
var pendingAvatarPreview = '';
var userWishlistIds = [];
var bookingDetailsCache = {};
var bookingHistoryItemMap = {};
var bookingHistoryState = {
  page: 1,
  limit: 5,
  totalPages: 1,
};

function loadUser() {
  try {
    return JSON.parse(localStorage.getItem('vt_user') || 'null');
  } catch (_) {
    return null;
  }
}

function saveUser(user) {
  if (!user || typeof user !== 'object') return;
  localStorage.setItem('vt_user', JSON.stringify(user));
}

function syncProfileMainVisibility(activeTabName) {
  var profileMainEl = document.querySelector('.cp-profile-main');
  if (!profileMainEl) return;
  profileMainEl.style.display = activeTabName === 'info' ? 'flex' : 'none';
}

document.addEventListener('DOMContentLoaded', async function () {
  var user = loadUser();
  if (!user) {
    window.location.href = 'dang-nhap.html';
    return;
  }

  if (typeof initNav === 'function') {
    initNav();
  }

  user = await syncCurrentUser(user);
  cpLoadProfile(user);
  cpLoadForm(user);

  var activeBtn = document.querySelector('.cp-nav-item.active:not(.cp-nav-logout)');
  var activeTabName = 'info';

  if (activeBtn) {
    if (activeBtn.id === 'cpNavcoupons') activeTabName = 'coupons';
    if (activeBtn.id === 'cpNavHistory') activeTabName = 'history';
    if (activeBtn.id === 'cpNavSettings') activeTabName = 'password';
  }

  syncProfileMainVisibility(activeTabName);

  if (activeBtn && activeBtn.id === 'cpNavcoupons') {
    await renderWishlist();
  }

  if (activeBtn && activeBtn.id === 'cpNavHistory') {
    await renderBookingHistory();
  }
});

async function syncCurrentUser(fallbackUser) {
  try {
    var res = await apiGetMe();
    if (!(res && res.ok && res.data && res.data.result)) return fallbackUser;

    var apiUser = res.data.result.user || res.data.result;
    var merged = {
      ...fallbackUser,
      name: apiUser.full_name || fallbackUser.name,
      email: apiUser.email || fallbackUser.email,
      phone: apiUser.phone || fallbackUser.phone,
      dob: apiUser.date_of_birth ? String(apiUser.date_of_birth).slice(0, 10) : fallbackUser.dob,
      address: apiUser.address || fallbackUser.address,
      avatar: apiUser.avatar || fallbackUser.avatar,
      verify: normalizeVerifyStatus(apiUser),
    };

    saveUser(merged);
    return merged;
  } catch (_) {
    return fallbackUser;
  }
}

function normalizeVerifyStatus(userLike) {
  if (!userLike || typeof userLike !== 'object') return UserVerifyStatus.Unverified;

  var raw = userLike.verify;
  if (raw === undefined || raw === null) raw = userLike.verify_status;
  if (raw === undefined || raw === null) raw = userLike.user_verify_status;
  if (raw === undefined || raw === null) raw = userLike.email_verified;

  if (raw === true || raw === 'true') return UserVerifyStatus.Verified;
  if (raw === false || raw === 'false') return UserVerifyStatus.Unverified;

  var num = Number(raw);
  if (Number.isFinite(num) && num === UserVerifyStatus.Verified) return UserVerifyStatus.Verified;
  return UserVerifyStatus.Unverified;
}

function renderVerifyBadge(verifyStatus) {
  var badge = document.getElementById('cpVerifyBadge');
  if (!badge) return;

  var isVerified = Number(verifyStatus) === UserVerifyStatus.Verified;
  badge.textContent = isVerified ? 'Đã xác thực' : 'Chưa xác thực';
  badge.classList.remove('cp-verify-badge-verified', 'cp-verify-badge-unverified');
  badge.classList.add(isVerified ? 'cp-verify-badge-verified' : 'cp-verify-badge-unverified');
}

function cpLoadProfile(user) {
  var savedAvatar = user.avatar || localStorage.getItem('vt_avatar_' + user.email);
  var hasAvatar = typeof savedAvatar === 'string' && savedAvatar.trim() !== '';
  var fallbackInitial = user.name?.charAt(0).toUpperCase() || 'U';

  var avatarEl = document.getElementById('cpAvatar');
  var avatarInitialEl = document.getElementById('cpAvatarInitial');

  if (avatarEl && hasAvatar) {
    avatarEl.style.backgroundImage = 'url(' + savedAvatar + ')';
    avatarEl.style.backgroundSize = 'cover';
    avatarEl.style.backgroundPosition = 'center';
    avatarEl.style.backgroundRepeat = 'no-repeat';
    if (avatarInitialEl) avatarInitialEl.style.display = 'none';
  } else {
    if (avatarEl) {
      avatarEl.style.backgroundImage = '';
      avatarEl.style.background = 'linear-gradient(135deg, var(--green), var(--green-light))';
    }
    if (avatarInitialEl) {
      avatarInitialEl.style.display = '';
      avatarInitialEl.textContent = fallbackInitial;
    }
  }

  var nameEl = document.getElementById('cpSidebarName');
  if (nameEl) nameEl.textContent = user.name || '—';

  renderVerifyBadge(normalizeVerifyStatus(user));

  var navAvatarEl = document.getElementById('navAvatarEl');
  if (navAvatarEl) {
    if (hasAvatar) {
      navAvatarEl.style.backgroundImage = 'url(' + savedAvatar + ')';
      navAvatarEl.style.backgroundSize = 'cover';
      navAvatarEl.style.backgroundPosition = 'center';
      navAvatarEl.style.backgroundRepeat = 'no-repeat';
      navAvatarEl.textContent = '';
    } else {
      navAvatarEl.style.backgroundImage = '';
      navAvatarEl.textContent = fallbackInitial;
    }
  }

  setAvatarSaveButtonState(false);
  pendingAvatarFile = null;
  pendingAvatarPreview = '';
}

function cpLoadForm(user) {
  var setValue = function (id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value || '';
  };

  setValue('infoName', user.name);
  setValue('infoEmail', user.email);
  setValue('infoPhone', user.phone);
  setValue('infoDob', user.dob);
  setValue('infoAddress', user.address);
}

async function changeAvatar(input) {
  if (!input.files || !input.files[0]) return;

  var file = input.files[0];
  pendingAvatarFile = file;
  var reader = new FileReader();

  reader.onload = function (e) {
    var previewUrl = e.target.result;
    pendingAvatarPreview = previewUrl;

    var avatarEl = document.getElementById('cpAvatar');
    if (avatarEl) {
      avatarEl.style.backgroundImage = 'url(' + previewUrl + ')';
      avatarEl.style.backgroundSize = 'cover';
      avatarEl.style.backgroundPosition = 'center';
      avatarEl.style.backgroundRepeat = 'no-repeat';
      avatarEl.style.backgroundColor = '#fff';
    }

    var avatarInitialEl = document.getElementById('cpAvatarInitial');
    if (avatarInitialEl) avatarInitialEl.style.display = 'none';

    setAvatarSaveButtonState(true);
  };

  reader.readAsDataURL(file);
}

async function saveAvatarChanges() {
  var saveBtn = document.getElementById('cpAvatarSaveBtn');
  if (!pendingAvatarFile) {
    showToast('⚠️ Chưa có ảnh đại diện mới để lưu');
    return;
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Đang lưu...';
  }

  try {
    var res = await apiUpdateAvatar(pendingAvatarFile);
    if (!(res && res.ok)) {
      showToast('❌ Cập nhật ảnh đại diện thất bại');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Lưu thay đổi';
      }
      return;
    }

    var currentUser = loadUser();
    if (currentUser) {
      currentUser.avatar = res.data?.result?.avatar_url || pendingAvatarPreview || currentUser.avatar;
      saveUser(currentUser);
    }

    var navAvatarEl = document.getElementById('navAvatarEl');
    if (navAvatarEl) {
      navAvatarEl.style.backgroundImage = 'url(' + (pendingAvatarPreview || (res.data?.result?.avatar_url || '')) + ')';
      navAvatarEl.style.backgroundSize = 'cover';
      navAvatarEl.style.backgroundPosition = 'center';
      navAvatarEl.style.backgroundRepeat = 'no-repeat';
      navAvatarEl.textContent = '';
    }

    showToast('✅ Đã cập nhật ảnh đại diện');
    pendingAvatarFile = null;
    pendingAvatarPreview = '';
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Lưu thay đổi';
    }
  } catch (_) {
    showToast('❌ Không thể kết nối máy chủ');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Lưu thay đổi';
    }
  }
}

function setAvatarSaveButtonState(enabled) {
  var saveBtn = document.getElementById('cpAvatarSaveBtn');
  if (!saveBtn) return;
  saveBtn.disabled = !enabled;
  saveBtn.textContent = 'Lưu thay đổi';
}

const FullNameValidationMessages = {
  NAME_IS_REQUIRED: 'Tên là bắt buộc',
  NAME_MUST_BE_A_STRING: 'Tên phải là một chuỗi',
  NAME_LENGTH_MUST_BE_FROM_2_TO_100: 'Độ dài tên phải từ 2 đến 100 ký tự',
  NAME_CAN_ONLY_CONTAIN_LETTERS_AND_SPACES: 'Tên chỉ có thể chứa chữ cái và khoảng trắng',
};

const PhoneValidationMessages = {
  PHONE_MUST_BE_STRING: 'Số điện thoại phải là một chuỗi',
  PHONE_IS_INVALID: 'Số điện thoại không hợp lệ',
  PHONE_IS_INVALID_OR_EXISTED: 'Số điện thoại không hợp lệ hoặc đã tồn tại',
};

const AddressValidationMessages = {
  ADDRESS_MUST_BE_STRING: 'Địa chỉ phải là một chuỗi',
  ADDRESS_LENGTH_MUST_BE_FROM_5_TO_300: 'Độ dài địa chỉ phải từ 5 đến 300 ký tự',
};

function validateFullName(fullName) {
  if (typeof fullName !== 'string') {
    return FullNameValidationMessages.NAME_MUST_BE_A_STRING;
  }

  var trimmed = fullName.trim();
  if (!trimmed) {
    return FullNameValidationMessages.NAME_IS_REQUIRED;
  }

  if (trimmed.length < 2 || trimmed.length > 100) {
    return FullNameValidationMessages.NAME_LENGTH_MUST_BE_FROM_2_TO_100;
  }

  if (!/^[\p{L}\s]+$/u.test(trimmed)) {
    return FullNameValidationMessages.NAME_CAN_ONLY_CONTAIN_LETTERS_AND_SPACES;
  }

  return null;
}

function validatePhone(phone) {
  if (typeof phone !== 'string') {
    return PhoneValidationMessages.PHONE_MUST_BE_STRING;
  }

  var trimmed = phone.trim();
  if (!trimmed) return null;

  // Chấp nhận đầu số Việt Nam phổ biến: 0xxxxxxxxx hoặc +84xxxxxxxxx
  if (!/^(?:\+84|0)\d{9,10}$/.test(trimmed)) {
    return PhoneValidationMessages.PHONE_IS_INVALID;
  }

  return null;
}

function validateAddress(address) {
  if (typeof address !== 'string') {
    return AddressValidationMessages.ADDRESS_MUST_BE_STRING;
  }

  var trimmed = address.trim();
  if (!trimmed) return null;

  if (trimmed.length < 5 || trimmed.length > 300) {
    return AddressValidationMessages.ADDRESS_LENGTH_MUST_BE_FROM_5_TO_300;
  }

  return null;
}

function translateValidationMessage(msg) {
  if (!msg || typeof msg !== 'string') return 'Cập nhật thông tin thất bại';

  var map = {
    'Name is required': FullNameValidationMessages.NAME_IS_REQUIRED,
    'Name must be a string': FullNameValidationMessages.NAME_MUST_BE_A_STRING,
    'Name length must be from 2 to 100': FullNameValidationMessages.NAME_LENGTH_MUST_BE_FROM_2_TO_100,
    'Name can only contain letters and spaces': FullNameValidationMessages.NAME_CAN_ONLY_CONTAIN_LETTERS_AND_SPACES,
    'Phone must be string': PhoneValidationMessages.PHONE_MUST_BE_STRING,
    'Phone is invalid': PhoneValidationMessages.PHONE_IS_INVALID,
    'Phone is invalid or existed': PhoneValidationMessages.PHONE_IS_INVALID_OR_EXISTED,
    'Address must be string': AddressValidationMessages.ADDRESS_MUST_BE_STRING,
    'Address length must be from 5 to 300': AddressValidationMessages.ADDRESS_LENGTH_MUST_BE_FROM_5_TO_300,
    'Validation error': 'Dữ liệu không hợp lệ',
  };

  return map[msg] || msg;
}

function extractApiErrorMessage(res, preferredFields) {
  if (!res) return 'Cập nhật thông tin thất bại';

  var errors = res?.data?.errors;
  if (errors && typeof errors === 'object') {
    var fieldOrder = Array.isArray(preferredFields)
      ? preferredFields
      : preferredFields
        ? [preferredFields]
        : [];

    for (var i = 0; i < fieldOrder.length; i++) {
      var field = fieldOrder[i];
      if (errors[field]?.msg) {
        return translateValidationMessage(errors[field].msg);
      }
    }

    var firstError = Object.values(errors)[0];
    if (firstError?.msg) {
      return translateValidationMessage(firstError.msg);
    }
  }

  return translateValidationMessage(res?.data?.message || 'Cập nhật thông tin thất bại');
}

async function saveInfo() {
  var user = loadUser();
  if (!user) return;

  var name = (document.getElementById('infoName')?.value || '').trim();
  var phone = (document.getElementById('infoPhone')?.value || '').trim();
  var dob = document.getElementById('infoDob')?.value || '';
  var address = (document.getElementById('infoAddress')?.value || '').trim();

  var originalName = String(user.name || '').trim();
  var originalPhone = String(user.phone || '').trim();
  var originalDob = String(user.dob || '').slice(0, 10);
  var originalAddress = String(user.address || '').trim();

  var dobISO = undefined;

  if (dob && dob !== originalDob) {
    // dob phải là dạng yyyy-mm-dd
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      showToast('⚠️ Ngày sinh không hợp lệ');
      return;
    }

    dobISO = dob + "T00:00:00.000Z";
  }

  var payload = {};

  if (name !== originalName) {
    var fullNameError = validateFullName(name);
    if (fullNameError) {
      showToast('⚠️ ' + fullNameError);
      return;
    }
    payload.full_name = name;
  }

  if (dobISO) payload.date_of_birth = dobISO;

  if (phone !== originalPhone) {
    var phoneError = validatePhone(phone);
    if (phoneError) {
      showToast('⚠️ ' + phoneError);
      return;
    }
    if (phone) payload.phone = phone;
  }

  if (address !== originalAddress) {
    var addressError = validateAddress(address);
    if (addressError) {
      showToast('⚠️ ' + addressError);
      return;
    }
    if (address) payload.address = address;
  }

  if (!Object.keys(payload).length) {
    showToast('⚠️ Không có thay đổi để lưu');
    return;
  }

  try {
    var res = await apiUpdateMe(payload);

    if (!(res && res.ok)) {
      var errorMsg = extractApiErrorMessage(res, ['full_name', 'phone', 'address', 'date_of_birth']);
      showToast('❌ ' + errorMsg);
      return;
    }
  } catch (_) {
    showToast('❌ Không thể kết nối máy chủ');
    return;
  }

  if (payload.full_name !== undefined) user.name = name;
  if (payload.phone !== undefined) user.phone = phone;
  if (payload.date_of_birth !== undefined) user.dob = dob;
  if (payload.address !== undefined) user.address = address;
  saveUser(user);

  var sidebarNameEl = document.getElementById('cpSidebarName');
  if (sidebarNameEl) sidebarNameEl.textContent = user.name || '—';

  var navUsernameEl = document.getElementById('navUsernameEl');
  if (navUsernameEl) navUsernameEl.textContent = (user.name || '').split(' ').filter(Boolean).slice(-1)[0] || 'User';

  var dropdownNameEl = document.getElementById('dropName');
  if (dropdownNameEl) dropdownNameEl.textContent = user.name || '';

  var okEl = document.getElementById('infoSuccess');
  if (okEl) {
    okEl.style.display = 'inline-flex';
    setTimeout(function () {
      okEl.style.display = 'none';
    }, 3000);
  }

  showToast('✅ Đã lưu thông tin cá nhân');
}

function switchTab(name, btn) {
  syncProfileMainVisibility(name);

  document.querySelectorAll('.cp-tab').forEach(function (tab) {
    tab.classList.remove('active');
    tab.style.display = 'none';
  });

  document.querySelectorAll('.cp-nav-item:not(.cp-nav-logout)').forEach(function (item) {
    item.classList.remove('active');
  });

  var tabEl = document.getElementById('tab-' + name);
  if (tabEl) {
    tabEl.classList.add('active');
    tabEl.style.display = 'flex';
  }

  if (btn) btn.classList.add('active');

  if (name === 'coupons') {
    renderWishlist();
  }

  if (name === 'history') {
    renderBookingHistory();
  }
}

function switchTabById(name) {
  var map = {
    info: 'cpNavInfo',
    coupons: 'cpNavcoupons',
    history: 'cpNavHistory',
    password: 'cpNavSettings',
  };

  var btn = document.getElementById(map[name]);
  switchTab(name, btn);
}

function extractWishlistItems(payload) {
  if (!payload) return [];

  if (Array.isArray(payload)) return payload;

  if (payload.result) {
    if (Array.isArray(payload.result)) return payload.result;
    if (Array.isArray(payload.result.items)) return payload.result.items;
    if (Array.isArray(payload.result.wishlist)) return payload.result.wishlist;
    if (Array.isArray(payload.result.tours)) return payload.result.tours;
  }

  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.wishlist)) return payload.wishlist;
  if (Array.isArray(payload.tours)) return payload.tours;

  return [];
}

function extractWishlistIds(payload, fallbackItems) {
  var raw = [];

  if (payload && payload.result && Array.isArray(payload.result.wishlist)) {
    raw = payload.result.wishlist;
  } else if (payload && Array.isArray(payload.wishlist)) {
    raw = payload.wishlist;
  } else if (Array.isArray(fallbackItems)) {
    raw = fallbackItems;
  }

  return raw
    .map(function (entry) {
      if (typeof entry === 'string' || typeof entry === 'number') return String(entry);
      if (!entry || typeof entry !== 'object') return '';
      if (entry.tour && entry.tour._id) return String(entry.tour._id);
      if (entry.tour_id) return String(entry.tour_id);
      if (entry._id && !entry.name && !entry.slug) return String(entry._id);
      return '';
    })
    .filter(Boolean);
}

function extractTourFromGetTourResponse(data) {
  if (!data) return null;
  if (data.result && data.result.tour) return data.result.tour;
  if (data.result && typeof data.result === 'object' && !Array.isArray(data.result)) return data.result;
  if (data.data && typeof data.data === 'object') return data.data;
  return null;
}

async function hydrateWishlistToursByIds(ids) {
  if (!Array.isArray(ids) || !ids.length || typeof apiGetTours !== 'function') return [];

  // Backend hiện tại không ổn định với /tours/:id và một số query params,
  // nên lấy list mặc định rồi lọc theo ID wishlist để tránh 404/422.
  try {
    var listRes = await apiGetTours();
    var listTours = listRes && listRes.ok ? (listRes.data?.result?.tours || []) : [];
    var idSet = new Set(ids.map(String));
    return listTours.filter(function (t) {
      if (!t) return false;
      if (t._id && idSet.has(String(t._id))) return true;
      if (t.id && idSet.has(String(t.id))) return true;
      return false;
    });
  } catch (_) {
    return [];
  }
}

function normalizeWishlistTours(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map(function (item) {
      if (!item) return null;
      if (item.tour && typeof item.tour === 'object') return item.tour;
      if (typeof item === 'object' && (item.name || item.slug || item.min_price || item.price_adult || item.base_price || item.price || item.current_price)) {
        return item;
      }
      return null;
    })
    .filter(Boolean);
}

function renderWishlistTours(tours) {
  var grid = document.getElementById('cpWishlistGrid');
  var empty = document.getElementById('cpWishlistEmpty');
  if (!grid) return;

  if (!tours || !tours.length) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  function formatTourPrice(tour) {
    if (!tour) return '—';

    var rawPrice =
      tour.min_price ??
      tour.price_adult ??
      tour.base_price ??
      tour.price ??
      tour.current_price;

    if (rawPrice === undefined || rawPrice === null || rawPrice === '') return '—';

    var numeric = Number(String(rawPrice).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(numeric) || numeric <= 0) return '—';

    return numeric.toLocaleString('vi-VN') + 'đ';
  }

  grid.innerHTML = tours.map(item => {
    var tour = item?.tour_snapshot || item?.tour || item;
    const img = tour?.images?.[0] || tour?.thumbnail || tour?.thumbnail_url || '';
    const name = tour?.name || '—';
    const location = tour?.destination || tour?.departure_location || '—';
    const days = tour?.duration_days || 0;
    const nights = tour?.duration_nights || 0;
    const price = formatTourPrice({
      min_price: tour?.min_price,
      price_adult: tour?.price_adult ?? tour?.schedules?.[0]?.price_adult,
      base_price: tour?.base_price,
      price: tour?.price,
      current_price: tour?.current_price,
    });
    const slug = tour?.slug || tour?._id || '';
    const badge = days ? `${days} ngày ${nights} đêm` : '';
    const slots = tour?.available_slots;
    const urgency = slots != null && slots <= 5
      ? `<div class="tour-urgency">Còn ${slots} chỗ cuối cùng</div>` : '';

    return `
    <div class="tour-card" onclick="window.location.href='chi-tiet-tour.html?tour=${slug}'" style="cursor:pointer">
      <div class="tour-img">
        <div class="tour-img-inner" style="background:url('${img}') center/cover no-repeat;${!img ? 'background:linear-gradient(135deg,#2d8a4e,#3aaa62)' : ''}"></div>
        ${badge ? `<span class="tour-badge">${badge}</span>` : ''}
        <button class="tour-wishlist liked"
          onclick="event.stopPropagation();handleWishlistRemove(this,'${tour?._id || ''}')"
          title="Xóa khỏi yêu thích">
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

async function handleWishlistRemove(btn, tourId) {
  try {
    const res = await apiToggleWishlist(tourId);
    if (res.ok) {
      // Remove from local state
      userWishlistIds = userWishlistIds.filter(id => id !== tourId.toString());
      // Re-render wishlist
      await renderWishlist();
    }
  } catch (e) {
    console.error(e);
  }
}

function extractBookingItems(payload) {
  if (!payload) return [];

  if (Array.isArray(payload)) return payload;
  if (payload.result && Array.isArray(payload.result)) return payload.result;
  if (payload.result && Array.isArray(payload.result.bookings)) return payload.result.bookings;
  if (payload.result && Array.isArray(payload.result.items)) return payload.result.items;
  if (payload.result && payload.result.data && Array.isArray(payload.result.data)) return payload.result.data;
  if (payload.result && payload.result.data && Array.isArray(payload.result.data.bookings)) return payload.result.data.bookings;
  if (payload.data && Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.bookings)) return payload.data.bookings;
  if (Array.isArray(payload.bookings)) return payload.bookings;

  return [];
}

function formatVnd(value) {
  var num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return '';
  return num.toLocaleString('vi-VN') + 'đ';
}

function formatBookingDate(value) {
  if (!value) return '—';
  var dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('vi-VN');
}

function normalizeBookingStatus(statusValue) {
  var asNumber = Number(statusValue);
  var raw = String(statusValue ?? '').toLowerCase();

  if (asNumber === 0 || raw === 'pending') {
    return { text: 'Chờ thanh toán', className: 'status-pending' };
  }

  if (asNumber === 1 || raw === 'confirmed' || raw === 'confirm') {
    return { text: 'Đã xác nhận', className: 'status-confirmed' };
  }

  if (asNumber === 2 || raw === 'completed' || raw === 'complete') {
    return { text: 'Hoàn thành', className: 'status-completed' };
  }

  if (asNumber === 3 || raw === 'cancelled' || raw === 'canceled' || raw.includes('cancel')) {
    return { text: 'Đã hủy', className: 'status-cancelled' };
  }

  return { text: 'Chờ thanh toán', className: 'status-pending' };
}

function getTotalGuests(passengers) {
  if (!passengers) return 0;

  if (Array.isArray(passengers)) {
    return passengers.reduce(function (sum, p) {
      return sum + Number(p?.adults || 0) + Number(p?.children || 0) + Number(p?.babies || 0);
    }, 0);
  }

  if (typeof passengers === 'object') {
    return Number(passengers.adults || 0) + Number(passengers.children || 0) + Number(passengers.babies || 0);
  }

  return 0;
}

function buildHistoryItem(booking) {
  var snapshot = booking?.tour_snapshot || {};
  var bookingId = booking?._id ? String(booking._id) : '';
  var title = snapshot?.tour_name || booking?.tour_name || booking?.tour?.name || 'Tour du lịch';
  var departureDate = snapshot?.departure_date || booking?.departure_date || booking?.schedule?.departure_date;
  var returnDate = snapshot?.return_date || booking?.return_date;
  var displayDepartureDate = formatBookingDate(departureDate);
  var displayReturnDate = formatBookingDate(returnDate);
  var displayCreatedAt = formatBookingDate(booking?.created_at);
  var durationDays = Number(snapshot?.duration_days || 0);
  var durationNights = Number(snapshot?.duration_nights || 0);
  var durationText = durationDays > 0 ? (durationDays + 'N' + durationNights + 'Đ') : '—';
  var totalGuests = getTotalGuests(booking?.passengers);
  var total =
    formatVnd(booking?.final_price) ||
    formatVnd(booking?.total_amount) ||
    formatVnd(booking?.total) ||
    formatVnd(booking?.price) ||
    '—';
  var bookingCode = booking?.booking_code || booking?.code || booking?._id || '—';
  var status = normalizeBookingStatus(booking?.status);

  var image =
    (Array.isArray(snapshot?.images) && snapshot.images.length ? snapshot.images[0] : '') ||
    booking?.tour?.thumbnail_url ||
    booking?.tour?.thumbnail ||
    '';

  var bgStyle = image
    ? 'background-image:url(' + image + ');background-size:cover;background-position:center;'
    : 'background:linear-gradient(135deg,#2d8a4e,#3aaa62);';

  var clickableAttrs = bookingId
    ? 'href="#" onclick="handleBookingItemClick(event,\'' + bookingId.replace(/'/g, "\\'") + '\')"'
    : 'href="javascript:void(0)" aria-disabled="true"';

  return (
    '<a class="cp-booking-item" ' + clickableAttrs + '>' +
    '<div class="cp-booking-img" style="' + bgStyle + '"></div>' +
    '<div class="cp-booking-info">' +
    '<h3 class="cp-booking-name">' + title + '</h3>' +
    '<p class="cp-booking-meta">Mã booking: ' + bookingCode + '</p>' +
    '<p class="cp-booking-meta">Hành trình: ' + durationText + ' • ' + totalGuests + ' khách</p>' +
    '<p class="cp-booking-meta">Khởi hành: ' + displayDepartureDate + ' • Về: ' + displayReturnDate + '</p>' +
    '<p class="cp-booking-meta">Ngày đặt: ' + displayCreatedAt + '</p>' +
    '<p class="cp-booking-price">Tổng tiền: ' + total + '</p>' +
    '</div>' +
    '<div class="cp-booking-right">' +
    '<span class="cp-booking-status ' + status.className + '">' + status.text + '</span>' +
    '</div>' +
    '</a>'
  );
}

function extractBookingDetail(payload) {
  if (!payload) return null;
  if (payload.result?.booking && typeof payload.result.booking === 'object') return payload.result.booking;
  if (payload.result && typeof payload.result === 'object' && payload.result._id) return payload.result;
  if (payload.data?.booking && typeof payload.data.booking === 'object') return payload.data.booking;
  if (payload.data && typeof payload.data === 'object' && payload.data._id) return payload.data;
  return null;
}

function normalizeTourSnapshot(source, fallbackSource) {
  var raw = source?.tour_snapshot;

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch (_) {
      raw = {};
    }
  }

  if (!raw || typeof raw !== 'object') raw = {};

  var fallbackRaw = fallbackSource?.tour_snapshot;
  if (typeof fallbackRaw === 'string') {
    try {
      fallbackRaw = JSON.parse(fallbackRaw);
    } catch (_) {
      fallbackRaw = {};
    }
  }
  if (!fallbackRaw || typeof fallbackRaw !== 'object') fallbackRaw = {};

  return {
    ...fallbackRaw,
    ...raw,
    destination:
      raw.destination ||
      raw.departure_location ||
      source?.destination ||
      fallbackRaw.destination ||
      fallbackSource?.destination ||
      '',
    duration_days: Number(raw.duration_days ?? source?.duration_days ?? fallbackRaw.duration_days ?? fallbackSource?.duration_days ?? 0),
    duration_nights: Number(raw.duration_nights ?? source?.duration_nights ?? fallbackRaw.duration_nights ?? fallbackSource?.duration_nights ?? 0),
  };
}

function formatPaymentProvider(provider) {
  var n = Number(provider);
  if (n === 0) return 'VNPay';
  if (n === 1) return 'MoMo';
  if (n === 2) return 'Tiền mặt';
  return provider === undefined || provider === null ? '—' : String(provider);
}

function formatPaymentStatus(status) {
  var n = Number(status);
  if (n === 0) return 'Chưa thanh toán';
  if (n === 1) return 'Đã thanh toán';
  if (n === 2) return 'Thanh toán thất bại';
  return status === undefined || status === null ? '—' : String(status);
}

function closeBookingDetailModal() {
  var existing = document.getElementById('cpBookingDetailOverlay');
  if (existing) existing.remove();
}

function openBookingDetailModal(detail, fallbackBooking) {
  closeBookingDetailModal();

  var passengers = detail?.passengers || {};
  var contact = detail?.contact_info || {};
  var price = detail?.price_detail || {};
  var payment = detail?.payment || {};
  var snapshot = normalizeTourSnapshot(detail, fallbackBooking);

  var durationDays = Number(snapshot?.duration_days || 0);
  var durationNights = Number(snapshot?.duration_nights || 0);
  var durationText = durationDays > 0 ? (durationDays + ' ngày ' + durationNights + ' đêm') : '—';

  var overlay = document.createElement('div');
  overlay.className = 'cp-modal-overlay';
  overlay.id = 'cpBookingDetailOverlay';
  overlay.onclick = function (e) {
    if (e.target === overlay) closeBookingDetailModal();
  };

  overlay.innerHTML =
    '<div class="cp-modal" role="dialog" aria-modal="true" aria-label="Chi tiết booking">' +
    '<div class="cp-modal-header">' +
    '<h3>Chi tiết booking ' + (detail?.booking_code || '') + '</h3>' +
    '<button type="button" class="cp-modal-close" onclick="closeBookingDetailModal()">✕</button>' +
    '</div>' +
    '<div class="cp-modal-body">' +
    '<div class="cp-modal-row"><span>Tour</span><strong>' + (snapshot?.tour_name || '—') + '</strong></div>' +
    '<div class="cp-modal-row"><span>Điểm đến</span><strong>' + (snapshot?.destination || '—') + '</strong></div>' +
    '<div class="cp-modal-row"><span>Thời lượng</span><strong>' + durationText + '</strong></div>' +
    '<div class="cp-modal-row"><span>Khởi hành</span><strong>' + formatBookingDate(snapshot?.departure_date) + '</strong></div>' +
    '<div class="cp-modal-row"><span>Ngày về</span><strong>' + formatBookingDate(snapshot?.return_date) + '</strong></div>' +
    '<div class="cp-modal-row"><span>Người liên hệ</span><strong>' + (contact?.full_name || '—') + '</strong></div>' +
    '<div class="cp-modal-row"><span>Email</span><strong>' + (contact?.email || '—') + '</strong></div>' +
    '<div class="cp-modal-row"><span>Số điện thoại</span><strong>' + (contact?.phone || '—') + '</strong></div>' +
    '<div class="cp-modal-row"><span>Hành khách</span><strong>NL: ' + Number(passengers?.adults || 0) + ' • TE: ' + Number(passengers?.children || 0) + ' • EB: ' + Number(passengers?.babies || 0) + '</strong></div>' +
    '<div class="cp-modal-row"><span>Tạm tính</span><strong>' + (formatVnd(detail?.total_price) || '—') + '</strong></div>' +
    '<div class="cp-modal-row"><span>Giảm giá</span><strong>' + (formatVnd(price?.discount_amount) || '0đ') + '</strong></div>' +
    '<div class="cp-modal-row"><span>Tổng thanh toán</span><strong>' + (formatVnd(detail?.final_price) || '—') + '</strong></div>' +
    '<div class="cp-modal-row"><span>Phương thức</span><strong>' + formatPaymentProvider(payment?.provider ?? detail?.payment_method) + '</strong></div>' +
    '<div class="cp-modal-row"><span>Trạng thái thanh toán</span><strong>' + formatPaymentStatus(payment?.status) + '</strong></div>' +
    '<div class="cp-modal-row"><span>Ngày đặt</span><strong>' + formatBookingDate(detail?.created_at) + '</strong></div>' +
    '</div>' +
    '<button type="button" class="cp-modal-close-btn" onclick="closeBookingDetailModal()">Đóng</button>' +
    '</div>';

  document.body.appendChild(overlay);
}

async function handleBookingItemClick(event, bookingId) {
  if (event) event.preventDefault();
  if (!bookingId) return;

  var listItemBooking = bookingHistoryItemMap[bookingId] || null;

  if (bookingDetailsCache[bookingId]) {
    openBookingDetailModal(bookingDetailsCache[bookingId], listItemBooking);
    return;
  }

  try {
    var res = await apiGetMyBooking(bookingId);
    if (!(res && res.ok)) {
      showToast('❌ Không tải được chi tiết booking');
      return;
    }

    var detail = extractBookingDetail(res.data);
    if (!detail) {
      showToast('⚠️ Không có dữ liệu chi tiết booking');
      return;
    }

    bookingDetailsCache[bookingId] = detail;
    openBookingDetailModal(detail, listItemBooking);
  } catch (_) {
    showToast('❌ Lỗi kết nối khi tải chi tiết booking');
  }
}

function extractBookingPagination(payload, currentPage, limit, currentCount) {
  var sources = [
    payload?.result?.pagination,
    payload?.result,
    payload?.data?.pagination,
    payload?.data,
    payload,
  ].filter(function (x) { return x && typeof x === 'object'; });

  var page = currentPage;
  var totalPages = 1;

  for (var i = 0; i < sources.length; i++) {
    var src = sources[i];
    var p = Number(src.page ?? src.current_page ?? src.currentPage);
    var tp = Number(src.total_pages ?? src.totalPages ?? src.last_page ?? src.pages);
    var totalItems = Number(src.total ?? src.total_items ?? src.totalItems ?? src.count);

    if (Number.isFinite(p) && p > 0) page = p;

    if (Number.isFinite(tp) && tp > 0) {
      totalPages = tp;
      break;
    }

    if (Number.isFinite(totalItems) && totalItems >= 0 && limit > 0) {
      totalPages = Math.max(1, Math.ceil(totalItems / limit));
      break;
    }
  }

  if ((!Number.isFinite(totalPages) || totalPages < 1) && currentCount < limit) {
    totalPages = Math.max(1, page);
  }

  return {
    page: Math.max(1, page),
    totalPages: Math.max(1, Number(totalPages) || 1),
  };
}

function ensureHistoryPaginationEl(list) {
  var container = document.getElementById('cpHistoryPagination');
  if (container || !list) return container;

  container = document.createElement('div');
  container.id = 'cpHistoryPagination';
  container.className = 'cp-history-pagination';
  list.insertAdjacentElement('afterend', container);
  return container;
}

function renderHistoryPagination() {
  var list = document.getElementById('cpHistoryList');
  var container = ensureHistoryPaginationEl(list);
  if (!container) return;

  var page = bookingHistoryState.page;
  var totalPages = bookingHistoryState.totalPages;

  if (totalPages <= 1) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';

  var prevDisabled = page <= 1 ? 'disabled' : '';
  var nextDisabled = page >= totalPages ? 'disabled' : '';

  var pageButtons = '';
  for (var p = 1; p <= totalPages; p++) {
    var active = p === page ? 'active' : '';
    pageButtons +=
      '<button class="cp-page-btn ' + active + '" onclick="goBookingHistoryPage(' + p + ')" ' +
      (p === page ? 'disabled' : '') + '>' + p + '</button>';
  }

  container.innerHTML =
    '<button class="cp-page-nav" onclick="goBookingHistoryPage(' + (page - 1) + ')" ' + prevDisabled + '>← Trước</button>' +
    '<div class="cp-page-list">' + pageButtons + '</div>' +
    '<button class="cp-page-nav" onclick="goBookingHistoryPage(' + (page + 1) + ')" ' + nextDisabled + '>Sau →</button>';
}

async function goBookingHistoryPage(page) {
  var next = Number(page);
  if (!Number.isFinite(next)) return;
  if (next < 1 || next > bookingHistoryState.totalPages) return;
  bookingHistoryState.page = next;
  await renderBookingHistory();
}

async function renderBookingHistory() {
  var list = document.getElementById('cpHistoryList');
  var empty = document.getElementById('cpHistoryEmpty');
  if (!list) return;

  list.innerHTML = '<div class="cp-wish-loading">Đang tải lịch sử đặt tour...</div>';

  try {
    var res = await apiGetMyBookings({ page: bookingHistoryState.page, limit: bookingHistoryState.limit });
    var bookings = res && res.ok ? extractBookingItems(res.data) : [];
    bookingHistoryItemMap = {};
    bookings.forEach(function (b) {
      if (b && b._id) bookingHistoryItemMap[String(b._id)] = b;
    });

    if (res && res.ok) {
      var pg = extractBookingPagination(res.data, bookingHistoryState.page, bookingHistoryState.limit, bookings.length);
      bookingHistoryState.page = pg.page;
      bookingHistoryState.totalPages = pg.totalPages;
    } else {
      bookingHistoryState.totalPages = 1;
    }

    if (!bookings.length) {
      list.innerHTML = '';
      if (empty) empty.style.display = 'block';
      renderHistoryPagination();
      return;
    }

    if (empty) empty.style.display = 'none';
    list.innerHTML = bookings.map(buildHistoryItem).join('');
    renderHistoryPagination();
  } catch (_) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    bookingHistoryState.totalPages = 1;
    renderHistoryPagination();
  }
}

async function renderWishlist() {
  var grid = document.getElementById('cpWishlistGrid');
  var empty = document.getElementById('cpWishlistEmpty');
  if (!grid) return;

  grid.innerHTML = '<div class="cp-wish-loading">Đang tải danh sách yêu thích...</div>';

  try {
    // Ưu tiên endpoint wishlist riêng, fallback về /me nếu cần.
    var ids = [];

    if (typeof apiGetWishlist === 'function') {
      var wishRes = await apiGetWishlist();
      if (wishRes && wishRes.ok) {
        var wishItems = extractWishlistItems(wishRes.data);
        ids = extractWishlistIds(wishRes.data, wishItems);

        // Một số backend trả sẵn object tour, không cần hydrate theo id.
        var normalizedFromWishlist = normalizeWishlistTours(wishItems);
        if (!ids.length && normalizedFromWishlist.length) {
          ids = normalizedFromWishlist
            .map(function (tour) { return tour && tour._id ? String(tour._id) : ''; })
            .filter(Boolean);
        }

        if (normalizedFromWishlist.length && !ids.length) {
          userWishlistIds = [];
          renderWishlistTours(normalizedFromWishlist);
          return;
        }
      }
    }

    if (!ids.length) {
      var meRes = await apiGetMe();
      var meUser = meRes?.data?.result?.user || meRes?.data?.result || {};
      ids = (meUser.wishlist || []).map(function (id) { return String(id); });
    }

    if (!ids.length) {
      grid.innerHTML = '';
      if (empty) empty.style.display = 'flex';
      return;
    }

    var tours = await hydrateWishlistToursByIds(ids);

    userWishlistIds = ids;
    renderWishlistTours(tours);
  } catch (error) {
    console.error(error);
    grid.innerHTML = '';
    if (empty) empty.style.display = 'flex';
  }
}

async function changePassword() {
  var currentPassword = document.getElementById('pwdCurrent')?.value || '';
  var newPassword = document.getElementById('pwdNew')?.value || '';
  var confirmPassword = document.getElementById('pwdConfirm')?.value || '';

  var errEl = document.getElementById('pwdError');
  var okEl = document.getElementById('pwdSuccess');

  if (errEl) errEl.style.display = 'none';
  if (okEl) okEl.style.display = 'none';

  if (!currentPassword || !newPassword || !confirmPassword) {
    return showPwdErr('Vui lòng điền đầy đủ tất cả các trường.', errEl);
  }

  var req = getPasswordRequirementStatus(newPassword);
  if (!(req.length && req.lowercase && req.uppercase && req.symbol)) {
    return showPwdErr('Mật khẩu mới chưa đủ mạnh (6-50 ký tự, gồm chữ thường, chữ hoa và ký tự đặc biệt).', errEl);
  }

  if (newPassword === currentPassword) {
    return showPwdErr('Mật khẩu mới phải khác mật khẩu hiện tại.', errEl);
  }

  if (newPassword !== confirmPassword) {
    return showPwdErr('Mật khẩu xác nhận không khớp.', errEl);
  }

  try {
    var res = await apiChangePassword(currentPassword, newPassword, confirmPassword);
    if (!(res && res.ok)) {
      return showPwdErr(extractChangePasswordErrorMessage(res), errEl);
    }
  } catch (_) {
    return showPwdErr('Không thể kết nối máy chủ.', errEl);
  }

  ['pwdCurrent', 'pwdNew', 'pwdConfirm'].forEach(function (id) {
    var input = document.getElementById(id);
    if (input) input.value = '';
  });
  checkPwdStrength('');

  if (okEl) {
    okEl.style.display = 'inline-flex';
  }

  showToast('✅ Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');

  setTimeout(function () {
    apiLogoutLocal();
    window.location.href = 'dang-nhap.html';
  }, 1200);
}

function showPwdErr(message, el) {
  var err = el || document.getElementById('pwdError');
  if (!err) return;
  err.textContent = message;
  err.style.display = 'block';
}

function extractChangePasswordErrorMessage(res) {
  if (!res) return 'Đổi mật khẩu thất bại.';

  var status = Number(res.status || 0);
  var message = String(res?.data?.message || '').trim();
  var upperMessage = message.toUpperCase();

  if (status === 401 || upperMessage.includes('PASSWORD_IS_INCORRECT')) {
    return 'Mật khẩu hiện tại không đúng.';
  }

  if (status === 404 || upperMessage.includes('USER_NOT_FOUND')) {
    return 'Không tìm thấy tài khoản người dùng.';
  }

  if (status === 400 || upperMessage.includes('NEW_PASSWORD_MUST_BE_DIFFERENT')) {
    return 'Mật khẩu mới phải khác mật khẩu hiện tại.';
  }

  if (message) return message;
  return 'Đổi mật khẩu thất bại. Vui lòng thử lại.';
}

function getPasswordRequirementStatus(value) {
  var v = String(value || '');
  return {
    length: v.length >= 6 && v.length <= 50,
    lowercase: /[a-z]/.test(v),
    uppercase: /[A-Z]/.test(v),
    symbol: /[^A-Za-z0-9]/.test(v),
  };
}

function checkPwdStrength(value) {
  var status = getPasswordRequirementStatus(value);
  var map = {
    pwdRuleLength: status.length,
    pwdRuleLower: status.lowercase,
    pwdRuleUpper: status.uppercase,
    pwdRuleSymbol: status.symbol,
  };

  Object.keys(map).forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('is-met', !!map[id]);
  });
}

function togglePwd(id, btn) {
  var input = document.getElementById(id);
  if (!input) return;

  input.type = input.type === 'password' ? 'text' : 'password';

  if (!btn) return;
  var svg = btn.querySelector('svg');
  if (!svg) return;

  var isHidden = input.type === 'password';
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');

  if (isHidden) {
    svg.innerHTML =
      '<path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6Z" stroke="currentColor" stroke-width="1.5" />' +
      '<circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5" />';
    btn.setAttribute('aria-label', 'Hiện mật khẩu');
  } else {
    svg.innerHTML =
      '<path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6Z" stroke="currentColor" stroke-width="1.5" />' +
      '<circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5" />' +
      '<path d="M3 17L17 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />';
    btn.setAttribute('aria-label', 'Ẩn mật khẩu');
  }
}
