// ============================================================
// ca-nhan.js (API-first)
// ============================================================

const UserVerifyStatus = {
  Unverified: 0,
  Verified: 1,
};

var pendingAvatarFile = null;
var pendingAvatarPreview = '';

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
  if (activeBtn && activeBtn.id === 'cpNavPromotions') {
    await renderWishlist();
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

  if (name === 'promotions') {
    renderWishlist();
  }
}

function switchTabById(name) {
  var map = {
    info: 'cpNavInfo',
    promotions: 'cpNavPromotions',
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

function formatVnd(priceValue) {
  var n = Number(priceValue);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString('vi-VN') + 'đ';
}

function buildWishlistCard(item) {
  var tour = item?.tour || item;
  var title = tour?.name || tour?.title || 'Tour du lịch';
  var location = tour?.departure_location || tour?.location || tour?.destination || 'Việt Nam';
  var price =
    formatVnd(tour?.price_adult) ||
    formatVnd(tour?.price) ||
    formatVnd(tour?.base_price) ||
    'Liên hệ';

  var image =
    tour?.thumbnail_url ||
    tour?.thumbnail ||
    (Array.isArray(tour?.images) && tour.images.length ? tour.images[0] : '') ||
    '';

  var slug = tour?.slug || '';
  var detailHref = slug ? 'chi-tiet-tour.html?slug=' + encodeURIComponent(slug) : 'tour-du-lich.html';

  var bgStyle = image
    ? 'background-image:url(' + image + ');background-size:cover;background-position:center;'
    : 'background:linear-gradient(135deg,#2d8a4e,#3aaa62);';

  return (
    '<article class="cp-wish-card" onclick="window.location.href=\'' + detailHref + '\'">' +
    '<div class="cp-wish-thumb" style="' + bgStyle + '"></div>' +
    '<div class="cp-wish-body">' +
    '<h3 class="cp-wish-title">' + title + '</h3>' +
    '<p class="cp-wish-meta">📍 ' + location + '</p>' +
    '<p class="cp-wish-price">Từ <strong>' + price + '</strong>/người</p>' +
    '</div>' +
    '</article>'
  );
}

async function renderWishlist() {
  var grid = document.getElementById('cpWishlistGrid');
  var empty = document.getElementById('cpWishlistEmpty');
  if (!grid) return;

  grid.innerHTML = '<div class="cp-wish-loading">Đang tải danh sách yêu thích...</div>';

  try {
    var res = await apiGetWishlist();
    var items = res && res.ok ? extractWishlistItems(res.data) : [];

    if (!items.length) {
      grid.innerHTML = '';
      if (empty) empty.style.display = 'flex';
      return;
    }

    if (empty) empty.style.display = 'none';
    grid.innerHTML = items.map(buildWishlistCard).join('');
  } catch (_) {
    if (typeof cpRenderWishlist === 'function') {
      cpRenderWishlist();
      return;
    }

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

  if (newPassword.length < 6) {
    return showPwdErr('Mật khẩu mới phải có ít nhất 6 ký tự.', errEl);
  }

  if (newPassword !== confirmPassword) {
    return showPwdErr('Mật khẩu xác nhận không khớp.', errEl);
  }

  try {
    var res = await apiChangePassword(currentPassword, newPassword, confirmPassword);
    if (!(res && res.ok)) {
      return showPwdErr('Mật khẩu hiện tại không đúng hoặc không hợp lệ.', errEl);
    }
  } catch (_) {
    return showPwdErr('Không thể kết nối máy chủ.', errEl);
  }

  ['pwdCurrent', 'pwdNew', 'pwdConfirm'].forEach(function (id) {
    var input = document.getElementById(id);
    if (input) input.value = '';
  });

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

function checkPwdStrength(value) {
  var fill = document.getElementById('pwdBarFill');
  var txt = document.getElementById('pwdStrengthText');
  if (!fill) return;

  var score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  var levels = [
    { w: '0%', c: '#eee', t: '' },
    { w: '25%', c: '#e04444', t: 'Yếu' },
    { w: '50%', c: '#f90', t: 'Trung bình' },
    { w: '75%', c: '#3aaa62', t: 'Khá' },
    { w: '100%', c: '#2d8a4e', t: 'Mạnh' },
  ];

  var level = levels[score];
  fill.style.width = level.w;
  fill.style.background = level.c;

  if (txt) {
    txt.textContent = level.t;
    txt.style.color = level.c;
  }
}

function togglePwd(id, btn) {
  var input = document.getElementById(id);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁' : '🙈';
}
