// ============================================================
// 3admin.js
// ============================================================

// ===== SWITCH TAB =====
function switchTab(name) {
  document.querySelectorAll('.admin-tab').forEach(function (t) { t.classList.remove('active'); t.style.display = 'none'; });
  document.querySelectorAll('.admin-nav-item').forEach(function (a) { a.classList.remove('active'); });
  var tab = document.getElementById('tab-' + name);
  var nav = document.getElementById('aNav-' + name);
  if (tab) { tab.classList.add('active'); tab.style.display = 'flex'; }
  if (nav) nav.classList.add('active');

  // Keep active tab in query params so reload keeps current tab.
  try {
    if (tab) {
      var url = new URL(window.location.href);
      url.searchParams.set('tab', name);
      window.history.replaceState({}, '', url.toString());
    }
  } catch (e) { }

  if (name === 'tours') adminRenderTours();
  if (name === 'tours') adminRenderPromoPreview();
  if (name === 'users') renderUsersTable();
  if (name === 'dashboard') adminUpdateDashStats();
  if (name === 'settings') adminSettingsInit();
}

// ===== SETTINGS (ADMIN/EMPLOYEE) =====
var ADMIN_SETTINGS_LOADING = false;
var ADMIN_PENDING_AVATAR_FILE = null;
var ADMIN_PENDING_AVATAR_PREVIEW = '';

function adminSettingsLoadUser() {
  try {
    return JSON.parse(localStorage.getItem('vt_user') || sessionStorage.getItem('vt_user') || 'null');
  } catch (_) {
    return null;
  }
}

function adminSettingsSaveUser(user) {
  if (!user || typeof user !== 'object') return;
  localStorage.setItem('vt_user', JSON.stringify(user));
}

function adminSettingsFill(user) {
  var setValue = function (id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value || '';
  };

  setValue('adminInfoName', user?.name || user?.full_name || '');
  setValue('adminInfoEmail', user?.email || '');
  setValue('adminInfoPhone', user?.phone || '');
  setValue('adminInfoDob', user?.dob ? String(user.dob).slice(0, 10) : '');
  setValue('adminInfoAddress', user?.address || '');

  adminSettingsRenderAvatar(user || {});
}

function adminSettingsRenderAvatar(user) {
  var name = String(user?.name || user?.full_name || 'Admin').trim();
  var email = String(user?.email || '').trim();
  var avatar = String(user?.avatar || '').trim();
  var initial = (name || 'A').charAt(0).toUpperCase();

  var cardAvatar = document.getElementById('adminSettingsAvatar');
  var cardInitial = document.getElementById('adminSettingsAvatarInitial');
  var cardName = document.getElementById('adminSettingsName');
  var cardEmail = document.getElementById('adminSettingsEmail');
  var sideAvatar = document.getElementById('sideUserAvatar');

  if (cardName) cardName.textContent = name || '—';
  if (cardEmail) cardEmail.textContent = email || '—';

  if (avatar) {
    if (cardAvatar) {
      cardAvatar.style.backgroundImage = 'url(' + avatar + ')';
      cardAvatar.style.backgroundSize = 'cover';
      cardAvatar.style.backgroundPosition = 'center';
      cardAvatar.style.backgroundRepeat = 'no-repeat';
    }
    if (cardInitial) cardInitial.style.display = 'none';

    if (sideAvatar) {
      sideAvatar.style.backgroundImage = 'url(' + avatar + ')';
      sideAvatar.style.backgroundSize = 'cover';
      sideAvatar.style.backgroundPosition = 'center';
      sideAvatar.style.backgroundRepeat = 'no-repeat';
      sideAvatar.textContent = '';
    }
    return;
  }

  if (cardAvatar) {
    cardAvatar.style.backgroundImage = '';
    cardAvatar.style.background = 'linear-gradient(135deg, #2d8a4e, #3aaa62)';
  }
  if (cardInitial) {
    cardInitial.style.display = '';
    cardInitial.textContent = initial;
  }

  if (sideAvatar) {
    sideAvatar.style.backgroundImage = '';
    sideAvatar.textContent = initial;
  }
}

function adminSetAvatarSaveButton(enabled, text) {
  var btn = document.getElementById('adminAvatarSaveBtn');
  if (!btn) return;
  btn.disabled = !enabled;
  btn.textContent = text || 'Lưu ảnh đại diện';
}

function adminChangeAvatar(input) {
  if (!input || !input.files || !input.files[0]) return;

  ADMIN_PENDING_AVATAR_FILE = input.files[0];

  var reader = new FileReader();
  reader.onload = function (e) {
    ADMIN_PENDING_AVATAR_PREVIEW = e.target.result || '';

    var cardAvatar = document.getElementById('adminSettingsAvatar');
    var cardInitial = document.getElementById('adminSettingsAvatarInitial');
    if (cardAvatar && ADMIN_PENDING_AVATAR_PREVIEW) {
      cardAvatar.style.backgroundImage = 'url(' + ADMIN_PENDING_AVATAR_PREVIEW + ')';
      cardAvatar.style.backgroundSize = 'cover';
      cardAvatar.style.backgroundPosition = 'center';
      cardAvatar.style.backgroundRepeat = 'no-repeat';
    }
    if (cardInitial) cardInitial.style.display = 'none';

    adminSetAvatarSaveButton(true);
  };
  reader.readAsDataURL(ADMIN_PENDING_AVATAR_FILE);
}

async function adminSaveAvatarChanges() {
  if (!ADMIN_PENDING_AVATAR_FILE) {
    showToast('⚠️ Chưa có ảnh đại diện mới để lưu');
    return;
  }

  adminSetAvatarSaveButton(false, 'Đang lưu...');

  try {
    var res = await apiUpdateAvatar(ADMIN_PENDING_AVATAR_FILE);
    if (!(res && res.ok)) {
      showToast('❌ Cập nhật ảnh đại diện thất bại');
      adminSetAvatarSaveButton(true);
      return;
    }

    var user = adminSettingsLoadUser() || {};
    user.avatar = res?.data?.result?.avatar_url || ADMIN_PENDING_AVATAR_PREVIEW || user.avatar || '';
    adminSettingsSaveUser(user);
    adminSettingsRenderAvatar(user);

    ADMIN_PENDING_AVATAR_FILE = null;
    ADMIN_PENDING_AVATAR_PREVIEW = '';
    var input = document.getElementById('adminAvatarInput');
    if (input) input.value = '';

    adminSetAvatarSaveButton(false);
    showToast('✅ Đã cập nhật ảnh đại diện');
  } catch (_) {
    showToast('❌ Không thể kết nối máy chủ');
    adminSetAvatarSaveButton(true);
  }
}

async function adminSettingsInit() {
  if (ADMIN_SETTINGS_LOADING) return;
  ADMIN_SETTINGS_LOADING = true;

  var user = adminSettingsLoadUser();
  if (user) adminSettingsFill(user);

  try {
    var res = await apiGetMe();
    if (res && res.ok) {
      var me = res?.data?.result?.user || res?.data?.result || {};
      var merged = {
        ...(user || {}),
        name: me.full_name || me.name || user?.name || '',
        full_name: me.full_name || me.name || user?.full_name || '',
        email: me.email || user?.email || '',
        phone: me.phone || user?.phone || '',
        dob: me.date_of_birth ? String(me.date_of_birth).slice(0, 10) : (user?.dob || ''),
        address: me.address || user?.address || '',
        avatar: me.avatar || user?.avatar || ''
      };
      adminSettingsSaveUser(merged);
      adminSettingsFill(merged);
    }
  } catch (e) { }

  adminCheckPwdStrength('');
  adminSetAvatarSaveButton(false);
  ADMIN_SETTINGS_LOADING = false;
}

function adminValidateFullName(fullName) {
  var val = String(fullName || '').trim();
  if (!val) return 'Tên là bắt buộc';
  if (val.length < 2 || val.length > 100) return 'Độ dài tên phải từ 2 đến 100 ký tự';
  if (!/^[\p{L}\s]+$/u.test(val)) return 'Tên chỉ có thể chứa chữ cái và khoảng trắng';
  return '';
}

function adminValidatePhone(phone) {
  var val = String(phone || '').trim();
  if (!val) return '';
  if (!/^(?:\+84|0)\d{9,10}$/.test(val)) return 'Số điện thoại không hợp lệ';
  return '';
}

function adminValidateAddress(address) {
  var val = String(address || '').trim();
  if (!val) return '';
  if (val.length < 5 || val.length > 300) return 'Độ dài địa chỉ phải từ 5 đến 300 ký tự';
  return '';
}

function adminTranslateValidationMessage(msg) {
  if (!msg || typeof msg !== 'string') return 'Cập nhật thông tin thất bại';

  var map = {
    'Name is required': 'Tên là bắt buộc',
    'Name must be a string': 'Tên phải là một chuỗi',
    'Name length must be from 2 to 100': 'Độ dài tên phải từ 2 đến 100 ký tự',
    'Name can only contain letters and spaces': 'Tên chỉ có thể chứa chữ cái và khoảng trắng',
    'Phone must be string': 'Số điện thoại phải là một chuỗi',
    'Phone is invalid': 'Số điện thoại không hợp lệ',
    'Phone is invalid or existed': 'Số điện thoại không hợp lệ hoặc đã tồn tại',
    'Address must be string': 'Địa chỉ phải là một chuỗi',
    'Address length must be from 5 to 300': 'Độ dài địa chỉ phải từ 5 đến 300 ký tự',
    'Validation error': 'Dữ liệu không hợp lệ'
  };

  return map[msg] || msg;
}

function adminExtractApiErrorMessage(res, preferredFields) {
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
        return adminTranslateValidationMessage(errors[field].msg);
      }
    }

    var firstError = Object.values(errors)[0];
    if (firstError?.msg) {
      return adminTranslateValidationMessage(firstError.msg);
    }
  }

  return adminTranslateValidationMessage(res?.data?.message || 'Cập nhật thông tin thất bại');
}

async function adminSaveMyProfile() {
  var user = adminSettingsLoadUser();
  if (!user) {
    showToast('⚠️ Phiên đăng nhập không hợp lệ');
    return;
  }

  var saveBtn = document.getElementById('adminInfoSaveBtn');
  var okEl = document.getElementById('adminInfoSuccess');
  if (okEl) okEl.style.display = 'none';

  var name = String(document.getElementById('adminInfoName')?.value || '').trim();
  var phone = String(document.getElementById('adminInfoPhone')?.value || '').trim();
  var dob = String(document.getElementById('adminInfoDob')?.value || '');
  var address = String(document.getElementById('adminInfoAddress')?.value || '').trim();

  var currentName = String(user.name || user.full_name || '').trim();
  var currentPhone = String(user.phone || '').trim();
  var currentDob = String(user.dob || '').slice(0, 10);
  var currentAddress = String(user.address || '').trim();

  var dobISO = undefined;
  if (dob && dob !== currentDob) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      showToast('⚠️ Ngày sinh không hợp lệ');
      return;
    }
    dobISO = dob + 'T00:00:00.000Z';
  }

  var nameErr = adminValidateFullName(name);
  if (nameErr) return showToast('⚠️ ' + nameErr);
  var phoneErr = adminValidatePhone(phone);
  if (phoneErr) return showToast('⚠️ ' + phoneErr);
  var addressErr = adminValidateAddress(address);
  if (addressErr) return showToast('⚠️ ' + addressErr);

  var payload = {};
  if (name !== currentName) payload.full_name = name;
  if (dobISO) payload.date_of_birth = dobISO;
  if (phone !== currentPhone) payload.phone = phone;
  if (address !== currentAddress) {
    if (address) payload.address = address;
  }

  if (!Object.keys(payload).length) {
    showToast('⚠️ Không có thay đổi để lưu');
    return;
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Đang lưu...';
  }

  try {
    var res = await apiUpdateMe(payload);
    if (!(res && res.ok)) {
      var errorMsg = adminExtractApiErrorMessage(res, ['full_name', 'phone', 'address', 'date_of_birth']);
      showToast('❌ ' + errorMsg);
      return;
    }

    var nextUser = {
      ...user,
      name: payload.full_name !== undefined ? name : currentName,
      full_name: payload.full_name !== undefined ? name : (user.full_name || currentName),
      phone: payload.phone !== undefined ? phone : currentPhone,
      address: payload.address !== undefined ? address : currentAddress,
      dob: payload.date_of_birth !== undefined ? dob : currentDob,
    };
    adminSettingsSaveUser(nextUser);
    adminSettingsRenderAvatar(nextUser);

    var sideName = document.getElementById('sideUserName');
    if (sideName) sideName.textContent = nextUser.name || 'Admin';

    if (okEl) {
      okEl.style.display = 'inline-flex';
      setTimeout(function () { okEl.style.display = 'none'; }, 2600);
    }
    showToast('✅ Đã lưu thông tin cá nhân');
  } catch (e) {
    showToast('❌ Không thể kết nối máy chủ');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Lưu thay đổi';
    }
  }
}

function adminTogglePwd(inputId, btn) {
  var input = document.getElementById(inputId);
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

function adminGetPasswordRequirementStatus(value) {
  var v = String(value || '');
  return {
    length: v.length >= 6 && v.length <= 50,
    lower: /[a-z]/.test(v),
    upper: /[A-Z]/.test(v),
    symbol: /[^A-Za-z0-9]/.test(v)
  };
}

function adminCheckPwdStrength(value) {
  var status = adminGetPasswordRequirementStatus(value);
  var map = {
    adminPwdRuleLength: status.length,
    adminPwdRuleLower: status.lower,
    adminPwdRuleUpper: status.upper,
    adminPwdRuleSymbol: status.symbol
  };
  Object.keys(map).forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('ok', !!map[id]);
  });
}

function adminShowPwdErr(message) {
  var errEl = document.getElementById('adminPwdError');
  if (!errEl) return;
  errEl.textContent = message;
  errEl.style.display = 'block';
}

function adminExtractChangePasswordErrorMessage(res) {
  if (!res) return 'Đổi mật khẩu thất bại.';
  var status = Number(res.status || 0);
  var message = String(res?.data?.message || '').trim();
  var upperMessage = message.toUpperCase();

  if (status === 401 || upperMessage.includes('PASSWORD_IS_INCORRECT')) return 'Mật khẩu hiện tại không đúng.';
  if (status === 404 || upperMessage.includes('USER_NOT_FOUND')) return 'Không tìm thấy tài khoản người dùng.';
  if (status === 400 || upperMessage.includes('NEW_PASSWORD_MUST_BE_DIFFERENT')) return 'Mật khẩu mới phải khác mật khẩu hiện tại.';
  return message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.';
}

async function adminChangePassword() {
  var currentPassword = document.getElementById('adminPwdCurrent')?.value || '';
  var newPassword = document.getElementById('adminPwdNew')?.value || '';
  var confirmPassword = document.getElementById('adminPwdConfirm')?.value || '';

  var okEl = document.getElementById('adminPwdSuccess');
  var errEl = document.getElementById('adminPwdError');
  var saveBtn = document.getElementById('adminPwdSaveBtn');
  if (okEl) okEl.style.display = 'none';
  if (errEl) errEl.style.display = 'none';

  if (!currentPassword || !newPassword || !confirmPassword) {
    return adminShowPwdErr('Vui lòng điền đầy đủ tất cả các trường.');
  }

  var req = adminGetPasswordRequirementStatus(newPassword);
  if (!(req.length && req.lower && req.upper && req.symbol)) {
    return adminShowPwdErr('Mật khẩu mới chưa đủ mạnh (6-50 ký tự, gồm chữ thường, chữ hoa và ký tự đặc biệt).');
  }

  if (newPassword === currentPassword) {
    return adminShowPwdErr('Mật khẩu mới phải khác mật khẩu hiện tại.');
  }

  if (newPassword !== confirmPassword) {
    return adminShowPwdErr('Mật khẩu xác nhận không khớp.');
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Đang cập nhật...';
  }

  try {
    var res = await apiChangePassword(currentPassword, newPassword, confirmPassword);
    if (!(res && res.ok)) {
      return adminShowPwdErr(adminExtractChangePasswordErrorMessage(res));
    }
  } catch (_) {
    return adminShowPwdErr('Không thể kết nối máy chủ.');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Đổi mật khẩu';
    }
  }

  ['adminPwdCurrent', 'adminPwdNew', 'adminPwdConfirm'].forEach(function (id) {
    var input = document.getElementById(id);
    if (input) input.value = '';
  });
  adminCheckPwdStrength('');

  if (okEl) okEl.style.display = 'inline-flex';
  showToast('✅ Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');

  setTimeout(function () {
    apiLogoutLocal();
    window.location.href = 'dang-nhap.html';
  }, 1200);
}

// ===== DASHBOARD STATS =====
function adminUpdateDashStats() {
  dashLoadDashboard();
}

// ===== USERS TABLE =====
// ===== USERS MANAGEMENT =====
var ADMIN_USER_PAGE = 1;
var ADMIN_USER_PER = 20;
var ADMIN_USER_ALL_LIMIT = 1000;
var ADMIN_USER_SEARCH = '';
var ADMIN_USER_ROLE = '';
var ADMIN_USER_STATUS = '';

function adminNormalizeUserRole(role) {
  if (role === 1 || role === 'admin') return 1;
  if (role === 2 || role === 'employee' || role === 'staff') return 2;
  return 0;
}

function adminNormalizeUserStatus(status, locked) {
  if (locked === true) return 1;
  if (status === 1 || status === '1' || status === 'banned' || status === 'locked' || status === true) return 1;
  return 0;
}

function adminGetUserFilterState() {
  return {
    keyword: ADMIN_USER_SEARCH,
    role: ADMIN_USER_ROLE,
    status: ADMIN_USER_STATUS
  };
}

function adminFilterUsersByState(list, filters) {
  var items = Array.isArray(list) ? list.slice() : [];

  if (filters.keyword) {
    var q = filters.keyword.toLowerCase();
    items = items.filter(function (u) {
      return (u.name || u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    });
  }

  if (filters.role !== '') {
    var roleFilter = parseInt(filters.role, 10);
    items = items.filter(function (u) { return adminNormalizeUserRole(u.role) === roleFilter; });
  }

  if (filters.status !== '') {
    var statusFilter = parseInt(filters.status, 10);
    items = items.filter(function (u) { return adminNormalizeUserStatus(u.status, u.locked) === statusFilter; });
  }

  return items;
}

function adminGetCurrentUserIdentity() {
  var u = null;
  try {
    u = JSON.parse(localStorage.getItem('vt_user') || sessionStorage.getItem('vt_user') || 'null');
  } catch (e) { u = null; }
  return {
    id: (u && (u._id || u.id)) ? String(u._id || u.id) : '',
    email: (u && u.email) ? String(u.email).toLowerCase() : ''
  };
}

function adminTranslateUserRoleError(msg) {
  var raw = String(msg || '').trim();
  if (!raw) return 'Không thể cập nhật quyền người dùng';

  var map = {
    CANNOT_UPDATE_OWN_ROLE: 'Bạn không thể tự thay đổi quyền của chính mình.',
    USER_NOT_FOUND: 'Không tìm thấy người dùng.',
    NOT_ALLOWWED_TO_UPDATE_ADMIN_ROLE: 'Không được phép thay đổi quyền Quản trị viên.'
  };
  if (map[raw]) return map[raw];

  var lower = raw.toLowerCase();
  if (lower.includes('cannot update own role')) return 'Bạn không thể tự thay đổi quyền của chính mình.';
  if (lower.includes('user not found')) return 'Không tìm thấy người dùng.';
  if (lower.includes('admin role')) return 'Không được phép thay đổi quyền Quản trị viên.';

  return raw;
}

function adminExtractUserRoleErrorMessage(res) {
  if (!res || !res.data) return 'Không thể cập nhật quyền người dùng';
  var data = res.data || {};

  if (data.errors) {
    var first = Object.values(data.errors)[0];
    if (Array.isArray(first) && first.length) {
      return adminTranslateUserRoleError(first[0].msg || first[0].message || first[0]);
    }
    if (first && (first.msg || first.message)) return adminTranslateUserRoleError(first.msg || first.message);
    if (typeof first === 'string') return adminTranslateUserRoleError(first);
  }

  if (data.message) return adminTranslateUserRoleError(data.message);
  if (data.error) return adminTranslateUserRoleError(data.error);
  return 'Không thể cập nhật quyền người dùng';
}

async function renderUsersTable() {
  var tbody = document.getElementById('usersTableBody');
  var footer = document.getElementById('usersTableFooter');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:32px">Đang tải...</td></tr>';

  var users = [];
  var apiLoaded = false;
  var filters = adminGetUserFilterState();
  var useClientPagination = filters.status !== '';

  // Thử API trước
  try {
    var params = {
      page: useClientPagination ? 1 : ADMIN_USER_PAGE,
      limit: useClientPagination ? ADMIN_USER_ALL_LIMIT : ADMIN_USER_PER,
      keyword: filters.keyword
    };
    if (filters.role !== '') params.role = parseInt(filters.role, 10);
    if (!useClientPagination && filters.status !== '') params.status = parseInt(filters.status, 10);

    var res = await apiAdminGetUsers(params);
    if (res && res.ok && res.data.result) {
      users = res.data.result.users || res.data.result || [];
      apiLoaded = true;
    }
  } catch (e) { }

  // Fallback localStorage
  if (!apiLoaded) {
    try {
      var raw = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]');
      raw = adminFilterUsersByState(raw, filters);
      var localTotal = raw.length;
      var localStart = (ADMIN_USER_PAGE - 1) * ADMIN_USER_PER;
      users = raw.slice(localStart, localStart + ADMIN_USER_PER);
      if (footer) renderUsersPagination(localTotal, footer);
    } catch (e) { }
  } else if (useClientPagination) {
    users = adminFilterUsersByState(users, filters);
  }

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:32px">Chưa có người dùng nào</td></tr>';
    return;
  }

  var me = adminGetCurrentUserIdentity();
  var totalForFooter = users.length;
  var pagedUsers = users;

  if (apiLoaded && !useClientPagination) {
    var pagination = null;
    try { pagination = (res && res.data && res.data.result && res.data.result.pagination) ? res.data.result.pagination : null; } catch (e) { pagination = null; }
    if (pagination && footer) renderUsersPagination(pagination.total, footer);
  } else if (footer) {
    renderUsersPagination(totalForFooter, footer);
  }

  if (apiLoaded && useClientPagination) {
    var clientStart = (ADMIN_USER_PAGE - 1) * ADMIN_USER_PER;
    pagedUsers = users.slice(clientStart, clientStart + ADMIN_USER_PER);
  }

  tbody.innerHTML = pagedUsers.map(function (u, i) {
    var id = u._id || u.id || i;
    var name = u.full_name || u.name || '—';
    var email = u.email || '—';
    var phone = u.phone || '—';
    var role = adminNormalizeUserRole(u.role);
    var status = u.status; // 0=active, 1=banned (API) hoặc locked (local)
    var isAdmin = role === 1;
    var isEmployee = role === 2;
    var isBanned = adminNormalizeUserStatus(status, u.locked) === 1;
    var isSelf = (me.id && String(id) === me.id) || (me.email && String(email).toLowerCase() === me.email);

    var roleBadge = isAdmin
      ? '<span class="admin-badge-active">Quản trị viên</span>'
      : isEmployee
        ? '<span class="admin-badge-active" style="background:#e8f0ff;color:#3a7abf">Nhân viên</span>'
        : '<span class="admin-badge-inactive" style="background:#f0f0f0;color:#888">Người dùng</span>';
    var statusBadge = isBanned
      ? '<span class="admin-badge-inactive">🔒 Bị khóa</span>'
      : '<span class="admin-badge-active">✅ Hoạt động</span>';

    var actionHtml = '<span style="font-size:0.75rem;color:#aaa">—</span>';
    if (!isAdmin && !isSelf) {
      var nextRole = isEmployee ? 0 : 2;
      var roleBtnLabel = isEmployee ? '→ Người dùng' : '→ Nhân viên';
      var roleBtn = '<button class="admin-act-btn" data-id="' + id + '" data-role="' + nextRole + '" onclick="adminSetRoleBtn(this)">' + roleBtnLabel + '</button>';
      var statusBtn = isBanned
        ? '<button class="admin-act-btn admin-act-btn-green" data-id="' + id + '" data-status="0" onclick="adminSetStatusBtn(this)">🔓 Mở khóa</button>'
        : '<button class="admin-act-btn admin-act-btn-red"   data-id="' + id + '" data-status="1" onclick="adminSetStatusBtn(this)">🔒 Khóa</button>';
      actionHtml = '<div style="display:flex;gap:6px">' + roleBtn + statusBtn + '</div>';
    }

    return '<tr>' +
      '<td style="color:#aaa;font-size:0.75rem">' + ((ADMIN_USER_PAGE - 1) * ADMIN_USER_PER + i + 1) + '</td>' +
      '<td><div style="font-weight:700;font-size:0.82rem">' + name + '</div></td>' +
      '<td style="font-size:0.78rem;color:#555">' + email + '</td>' +
      '<td style="font-size:0.78rem;color:#555">' + phone + '</td>' +
      '<td>' + roleBadge + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td>' + actionHtml + '</td>' +
      '</tr>';
  }).join('');
}

function renderUsersPagination(total, footer) {
  var totalPages = Math.max(1, Math.ceil(total / ADMIN_USER_PER));
  var from = total ? ((ADMIN_USER_PAGE - 1) * ADMIN_USER_PER + 1) : 0;
  var to = total ? Math.min(ADMIN_USER_PAGE * ADMIN_USER_PER, total) : 0;
  var pages = '';
  for (var p = 1; p <= Math.min(totalPages, 5); p++) {
    pages += '<button class="admin-page-btn' + (p === ADMIN_USER_PAGE ? ' active' : '') + '" onclick="adminGoUserPage(' + p + ')">' + p + '</button>';
  }
  footer.innerHTML =
    '<span style="font-size:0.75rem;color:#aaa">Hiển thị ' + from + ' - ' + to + ' / ' + total + ' người dùng</span>' +
    '<div class="admin-pagination">' +
    '<button class="admin-page-btn text" onclick="adminGoUserPage(' + Math.max(1, ADMIN_USER_PAGE - 1) + ')">Trước</button>' +
    pages +
    '<button class="admin-page-btn text" onclick="adminGoUserPage(' + Math.min(totalPages, ADMIN_USER_PAGE + 1) + ')">Sau</button>' +
    '</div>';
}

function adminGoUserPage(p) { ADMIN_USER_PAGE = p; renderUsersTable(); }

function adminSearchUsers() {
  ADMIN_USER_SEARCH = (document.getElementById('adminUserSearch')?.value || '').trim();
  ADMIN_USER_ROLE = (document.getElementById('adminUserRoleFilter')?.value || '').trim();
  ADMIN_USER_STATUS = (document.getElementById('adminUserStatusFilter')?.value || '').trim();
  ADMIN_USER_PAGE = 1;
  renderUsersTable();
}

function adminSetRoleBtn(btn) { adminSetRole(btn.dataset.id, parseInt(btn.dataset.role), btn); }
function adminSetStatusBtn(btn) { adminSetStatus(btn.dataset.id, parseInt(btn.dataset.status), btn); }

var ADMIN_GLOBAL_CONFIRM_RESOLVE = null;

function adminEnsureGlobalConfirmModal() {
  var modal = document.getElementById('adminGlobalConfirmModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'adminGlobalConfirmModal';
  modal.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:99999;background:rgba(0,0,0,.45);padding:16px;';
  modal.innerHTML =
    '<div style="width:min(420px,95vw);background:#fff;border-radius:14px;box-shadow:0 16px 40px rgba(0,0,0,.25);overflow:hidden">' +
    '<div style="padding:16px 18px;border-bottom:1px solid #eee;font-size:1rem;font-weight:800;color:#1f2937" id="adminGlobalConfirmTitle">Xác nhận thao tác</div>' +
    '<div style="padding:16px 18px;font-size:.92rem;color:#374151;line-height:1.55" id="adminGlobalConfirmText">Bạn có chắc muốn tiếp tục?</div>' +
    '<div style="display:flex;justify-content:flex-end;gap:10px;padding:14px 18px;border-top:1px solid #eee">' +
    '<button type="button" class="admin-act-btn" onclick="adminGlobalConfirmClose(false)">Hủy</button>' +
    '<button type="button" class="admin-act-btn admin-act-btn-red" onclick="adminGlobalConfirmClose(true)">Xác nhận</button>' +
    '</div>' +
    '</div>';

  modal.addEventListener('click', function (e) {
    if (e.target === modal) adminGlobalConfirmClose(false);
  });

  document.body.appendChild(modal);
  return modal;
}

function adminGlobalConfirmClose(accepted) {
  var modal = document.getElementById('adminGlobalConfirmModal');
  if (modal) modal.style.display = 'none';
  if (ADMIN_GLOBAL_CONFIRM_RESOLVE) {
    var resolve = ADMIN_GLOBAL_CONFIRM_RESOLVE;
    ADMIN_GLOBAL_CONFIRM_RESOLVE = null;
    resolve(!!accepted);
  }
}

function adminOpenConfirmModal(message, title) {
  var modal = adminEnsureGlobalConfirmModal();
  var titleEl = document.getElementById('adminGlobalConfirmTitle');
  var textEl = document.getElementById('adminGlobalConfirmText');

  if (titleEl) titleEl.textContent = title || 'Xác nhận thao tác';
  if (textEl) textEl.textContent = message || 'Bạn có chắc muốn tiếp tục?';
  if (modal) modal.style.display = 'flex';

  return new Promise(function (resolve) {
    ADMIN_GLOBAL_CONFIRM_RESOLVE = resolve;
  });
}

function adminPerformLogout() {
  if (typeof apiLogoutLocal === 'function') {
    apiLogoutLocal();
  } else {
    localStorage.removeItem('vt_access_token');
    sessionStorage.removeItem('vt_access_token');
    localStorage.removeItem('vt_user');
    sessionStorage.removeItem('vt_user');
  }
  window.location.href = 'dang-nhap.html';
}

window.doLogout = async function () {
  var accepted = await adminOpenConfirmModal('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này không?', 'Xác nhận đăng xuất');
  if (!accepted) return;
  adminPerformLogout();
};

// PATCH /api/users/:id/role
async function adminSetRole(id, role, btn) {
  var label = role === 2 ? 'Nhân viên' : 'Người dùng';
  if (role !== 0 && role !== 2) {
    showToast('⚠️ Chỉ được chuyển quyền giữa Người dùng và Nhân viên');
    return;
  }
  var roleConfirmed = await adminOpenConfirmModal('Đổi quyền tài khoản này thành ' + label + '?', 'Xác nhận đổi quyền');
  if (!roleConfirmed) return;
  btn.disabled = true; btn.textContent = '...';

  try {
    var res = await apiAdminSetUserRole(id, role);
    if (res && res.ok) {
      showToast('✅ Đã đổi quyền thành ' + label);
    } else {
      showToast('❌ ' + adminExtractUserRoleErrorMessage(res));
    }
  } catch (e) {
    showToast('❌ Không thể kết nối server');
  }

  renderUsersTable();
}

// PATCH /api/users/:id/status
async function adminSetStatus(id, status, btn) {
  var label = status === 1 ? 'khóa' : 'mở khóa';
  var statusConfirmed = await adminOpenConfirmModal('Bạn muốn ' + label + ' tài khoản này?', 'Xác nhận trạng thái');
  if (!statusConfirmed) return;
  btn.disabled = true; btn.textContent = '...';

  try {
    var res = await apiAdminSetUserStatus(id, status);
    if (res && res.ok) {
      showToast('✅ Đã ' + label + ' tài khoản');
    }
  } catch (e) { }

  // Fallback: cập nhật localStorage
  try {
    var db2 = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]');
    var u2 = db2.find(function (x) { return x.id == id || x._id == id || x.email == id; });
    if (u2) {
      u2.locked = (status === 1);
      u2.status = status;
      localStorage.setItem('vt_userdb', JSON.stringify(db2));
      sessionStorage.setItem('vt_userdb', JSON.stringify(db2));
      showToast('✅ Đã ' + label + ' tài khoản');
    }
  } catch (e) { }

  renderUsersTable();
}

// ===== TOURS DATA =====
var ADMIN_TOURS_KEY = 'vt_admin_tours';
var DEFAULT_TOURS = [
  { id: 1, name: 'Du Thuyền Hạ Long Sang Trọng', location: 'Vịnh Hạ Long, Quảng Ninh', price: '6.990.000đ', duration: '3', desc: 'Trải nghiệm du thuyền 5 sao trên vịnh Hạ Long huyền thoại.', active: true, schedules: [{ date: '2026-04-10', slots: 20 }, { date: '2026-04-24', slots: 15 }], days: [] },
  { id: 2, name: 'Tour Phố Cổ Hội An & Ẩm Thực', location: 'Phố Cổ Hội An, Quảng Nam', price: '1.250.000đ', duration: '2', desc: 'Khám phá phố cổ Hội An về đêm và trải nghiệm ẩm thực địa phương.', active: true, schedules: [{ date: '2026-04-05', slots: 25 }], days: [] },
  { id: 3, name: 'Trekking & Homestay Sapa', location: 'Sapa, Lào Cai', price: '2.800.000đ', duration: '3', desc: 'Trekking qua các bản làng và lưu trú homestay bản địa.', active: true, schedules: [{ date: '2026-04-15', slots: 12 }], days: [] },
  { id: 4, name: 'Khám Phá Hà Nội Cổ Kính', location: 'Hà Nội', price: '850.000đ', duration: '1', desc: 'Tour city khám phá 36 phố phường và ẩm thực đường phố.', active: true, schedules: [], days: [] },
  { id: 5, name: 'Đà Nẵng – Bà Nà Hills', location: 'Đà Nẵng', price: '1.900.000đ', duration: '2', desc: 'Cầu Vàng, Bà Nà Hills và bãi biển Mỹ Khê tuyệt đẹp.', active: true, schedules: [{ date: '2026-04-20', slots: 30 }], days: [] },
  { id: 6, name: 'Tràng An – Tam Cốc Ninh Bình', location: 'Ninh Bình', price: '1.100.000đ', duration: '1', desc: 'Chèo thuyền qua hang động Tràng An di sản thế giới UNESCO.', active: false, schedules: [], days: [] },
  { id: 7, name: 'Sông Nước Miền Tây', location: 'Cần Thơ', price: '1.650.000đ', duration: '2', desc: 'Khám phá chợ nổi Cái Răng và vườn trái cây đặc sản.', active: true, schedules: [{ date: '2026-04-08', slots: 18 }], days: [] },
];

function adminGetTours() {
  try { var r = localStorage.getItem(ADMIN_TOURS_KEY); return r ? JSON.parse(r) : DEFAULT_TOURS; } catch (e) { return DEFAULT_TOURS; }
}
function adminSaveTours(tours) { localStorage.setItem(ADMIN_TOURS_KEY, JSON.stringify(tours)); }

// ===== TOURS LIST =====
var ADMIN_TOUR_PAGE = 1;
var ADMIN_TOUR_PER = 8;

function adminRenderTours() {
  var tbody = document.getElementById('adminToursBody');
  var footer = document.getElementById('adminToursFooter');
  if (!tbody) return;

  var search = (document.getElementById('adminTourSearch')?.value || '').toLowerCase();
  var escapeHtml = function (val) {
    return String(val || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  var shortText = function (val, limit) {
    var s = String(val || '');
    return s.length <= limit ? s : (s.slice(0, limit - 1) + '...');
  };
  var isPublished = function (t) {
    if (typeof t.status === 'number') return t.status === 1;
    if (typeof t.active === 'boolean') return t.active;
    return false;
  };

  var allTours = adminGetTours();
  var tours = allTours.filter(function (t) {
    var raw = [
      t._id,
      t.category_id,
      t.name,
      t.slug,
      t.description || t.desc,
      t.destination || t.location,
      t.departure_city,
      Array.isArray(t.highlights) ? t.highlights.join(' ') : '',
      Array.isArray(t.includes) ? t.includes.join(' ') : '',
      Array.isArray(t.excludes) ? t.excludes.join(' ') : ''
    ].join(' ').toLowerCase();
    return !search || raw.includes(search);
  });

  var total = tours.length;
  var start = (ADMIN_TOUR_PAGE - 1) * ADMIN_TOUR_PER;
  var paged = tours.slice(start, start + ADMIN_TOUR_PER);

  if (!paged.length) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#aaa;padding:40px;font-size:0.85rem">Chưa có tour nào</td></tr>';
    if (footer) footer.innerHTML = '';
    return;
  }

  tbody.innerHTML = paged.map(function (t) {
    var realIdx = allTours.indexOf(t);
    var published = isPublished(t);
    var statusBadge = published
      ? '<span class="badge-published">ĐANG HIỂN THỊ</span>'
      : '<span class="badge-draft">BẢN NHÁP</span>';
    var actionBtns = published
      ? '<button class="act-btn-content" onclick="adminEditTour(' + realIdx + ')">📄 Nội dung</button><button class="act-btn-delete" onclick="adminToggleTour(' + realIdx + ')">Gỡ bỏ</button><button class="admin-act-btn admin-act-btn-red" data-id="' + (t._id || t.id || '') + '" data-idx="' + realIdx + '" onclick="adminDeleteTour(this)" style="font-size:0.72rem;padding:4px 10px">🗑️ Xóa</button>'
      : '<button class="act-btn-content" onclick="adminEditTour(' + realIdx + ')">📄 Nội dung</button><button class="act-btn-publish" onclick="adminToggleTour(' + realIdx + ')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Xuất bản</button><button class="admin-act-btn admin-act-btn-red" data-id="' + (t._id || t.id || '') + '" data-idx="' + realIdx + '" onclick="adminDeleteTour(this)" style="font-size:0.72rem;padding:4px 10px">🗑️ Xóa</button>';

    var highlights = Array.isArray(t.highlights) ? t.highlights : [];
    var images = Array.isArray(t.images) ? t.images : [];
    var itinerary = Array.isArray(t.itinerary) ? t.itinerary : [];
    var includes = Array.isArray(t.includes) ? t.includes : [];
    var excludes = Array.isArray(t.excludes) ? t.excludes : [];

    var idText = t._id || ('TOUR-' + String(t.id || realIdx + 1).padStart(5, '0'));
    var catText = t.category_id || '—';
    var nameText = t.name || '—';
    var slugText = t.slug || '—';
    var descText = t.description || t.desc || '—';
    var destinationText = t.destination || t.location || '—';
    var departureText = t.departure_city || '—';

    var days = Number(t.duration_days || t.duration || 0);
    var nights = (t.duration_nights !== undefined && t.duration_nights !== null) ? Number(t.duration_nights) : null;
    var durationText = days > 0 ? (days + 'N' + (nights !== null && !isNaN(nights) ? (' ' + nights + 'Đ') : '')) : '—';

    return '<tr>' +
      '<td style="max-width:170px"><div style="font-size:0.76rem;font-weight:700;color:#374151;word-break:break-all">' + escapeHtml(idText) + '</div></td>' +
      '<td style="max-width:170px"><div style="font-size:0.76rem;color:#4b5563;word-break:break-all">' + escapeHtml(catText) + '</div></td>' +
      '<td style="max-width:260px"><div style="font-weight:700;font-size:0.82rem;color:#1a1a1a">' + escapeHtml(nameText) + '</div><div class="tour-id-badge">' + escapeHtml(slugText) + '</div></td>' +
      '<td style="max-width:300px"><div style="font-size:0.78rem;color:#374151;line-height:1.45">' + escapeHtml(shortText(descText, 120)) + '</div><div class="tour-id-badge">Highlights: ' + escapeHtml(highlights.length ? highlights.slice(0, 2).join(' | ') : '—') + (highlights.length > 2 ? ' +' + (highlights.length - 2) : '') + '</div></td>' +
      '<td style="max-width:220px"><div style="font-size:0.8rem;font-weight:600;color:#111827">' + escapeHtml(destinationText) + '</div><div class="tour-id-badge">Khởi hành: ' + escapeHtml(departureText) + '</div></td>' +
      '<td style="white-space:nowrap"><div style="font-size:0.8rem;font-weight:700;color:#1f2937">' + escapeHtml(durationText) + '</div></td>' +
      '<td style="max-width:180px"><div style="font-size:0.78rem;color:#374151">Ảnh: ' + images.length + '</div><div class="tour-id-badge">Lịch trình: ' + itinerary.length + ' ngày</div></td>' +
      '<td style="max-width:230px"><div style="font-size:0.76rem;color:#374151;line-height:1.4">+' + escapeHtml(includes.slice(0, 2).join(', ') || '—') + (includes.length > 2 ? '...' : '') + '</div><div class="tour-id-badge">-' + escapeHtml(excludes.slice(0, 2).join(', ') || '—') + (excludes.length > 2 ? '...' : '') + '</div></td>' +
      '<td><div style="display:flex;flex-direction:column;gap:6px">' + statusBadge + '<span class="tour-id-badge">status: ' + (t.status !== undefined ? t.status : (published ? 1 : 0)) + '</span></div></td>' +
      '<td><div class="act-btns">' + actionBtns + '</div></td>' +
      '</tr>';
  }).join('');

  var totalPages = Math.max(1, Math.ceil(total / ADMIN_TOUR_PER));
  var pageLinks = '';
  for (var p = 1; p <= totalPages; p++) {
    pageLinks += '<button class="admin-page-btn' + (p === ADMIN_TOUR_PAGE ? ' active' : '') + '" onclick="adminGoTourPage(' + p + ')">' + p + '</button>';
  }
  if (footer) footer.innerHTML =
    '<span>Hiển thị ' + Math.min(start + 1, total) + ' - ' + Math.min(start + ADMIN_TOUR_PER, total) + ' của ' + total + ' tour</span>' +
    '<div class="admin-pagination">' +
    '<button class="admin-page-btn text" onclick="adminGoTourPage(' + Math.max(1, ADMIN_TOUR_PAGE - 1) + ')">Trước</button>' +
    pageLinks +
    '<button class="admin-page-btn text" onclick="adminGoTourPage(' + Math.min(totalPages, ADMIN_TOUR_PAGE + 1) + ')">Sau</button>' +
    '</div>';
}

function adminGoTourPage(p) { ADMIN_TOUR_PAGE = p; adminRenderTours(); }

function adminToggleTour(idx) {
  var tours = adminGetTours();
  if (!tours[idx]) return;
  if (typeof tours[idx].status === 'number') {
    tours[idx].status = tours[idx].status === 1 ? 0 : 1;
    tours[idx].active = tours[idx].status === 1;
  } else {
    tours[idx].active = !tours[idx].active;
    tours[idx].status = tours[idx].active ? 1 : 0;
  }
  adminSaveTours(tours);
  adminRenderTours();
  showToast(((tours[idx].status === 1 || tours[idx].active) ? '✅ Đã bật' : '⏸ Đã tắt') + ' tour: ' + tours[idx].name);
}

// ===== SHOW/HIDE VIEWS =====
function adminShowTourList() {
  document.getElementById('tourListView').style.display = 'block';
  document.getElementById('tourCreateView').style.display = 'none';
  adminRenderTours();
}

function adminShowCreateTour(idx) {
  document.getElementById('tourListView').style.display = 'none';
  document.getElementById('tourCreateView').style.display = 'block';
  document.getElementById('atfMainTitle').textContent = idx !== undefined ? 'Chỉnh sửa Tour' : 'Tạo Tour Mới';
  document.getElementById('atfMainSub').textContent = idx !== undefined ? 'Cập nhật thông tin tour' : 'Thêm một địa điểm mới vào nền tảng';
  document.getElementById('atfName').dataset.idx = idx !== undefined ? idx : '';

  if (idx !== undefined) {
    var t = adminGetTours()[idx];
    if (!t) return;
    document.getElementById('atfName').value = t.name || '';
    document.getElementById('atfLocation').value = t.location || '';
    document.getElementById('atfPrice').value = t.price || '';
    document.getElementById('atfDuration').value = t.duration || '';
    document.getElementById('atfDesc').innerText = t.desc || '';
    // Days
    var dl = document.getElementById('atfDaysList');
    dl.innerHTML = '';
    (t.days || []).forEach(function (d) { atfAddDay(d.title, d.desc); });
    if (!dl.children.length) { atfAddDay(); atfAddDay(); }
    // Schedules
    var sl = document.getElementById('atfScheduleList');
    sl.innerHTML = '';
    (t.schedules || []).forEach(function (s) { atfAddScheduleRow(s.date, s.slots); });
  } else {
    document.getElementById('atfName').value = '';
    document.getElementById('atfLocation').value = '';
    document.getElementById('atfPrice').value = '';
    document.getElementById('atfDuration').value = '';
    document.getElementById('atfDesc').innerText = 'Mô tả các điểm nổi bật của tour...';
    document.getElementById('atfDaysList').innerHTML = '';
    document.getElementById('atfScheduleList').innerHTML = '<p style="font-size:0.8rem;color:#bbb;text-align:center;padding:12px 0">Chưa có lịch nào</p>';
    atfAddDay(); atfAddDay();
  }
}

function adminEditTour(idx) { adminShowCreateTour(idx); }

// ===== SAVE TOUR =====
function adminPublishTour() { adminDoSaveTour(true); }
function adminSaveTourDraft() { adminDoSaveTour(false); }

function adminDoSaveTour(publish) {
  var name = (document.getElementById('atfName').value || '').trim();
  var location = (document.getElementById('atfLocation').value || '').trim();
  var price = (document.getElementById('atfPrice').value || '').trim();
  var duration = (document.getElementById('atfDuration').value || '').trim();
  var desc = (document.getElementById('atfDesc').innerText || '').trim();
  var idxStr = document.getElementById('atfName').dataset.idx;

  if (!name) { showToast('⚠️ Vui lòng nhập tên tour'); return; }
  if (!location) { showToast('⚠️ Vui lòng chọn địa điểm'); return; }

  var days = [];
  document.querySelectorAll('.atf-day-item').forEach(function (row) {
    var t = row.querySelector('.day-title-inp');
    var d = row.querySelector('.day-desc-inp');
    days.push({ title: t ? t.value : '', desc: d ? d.value : '' });
  });

  var schedules = [];
  document.querySelectorAll('.atf-schedule-row').forEach(function (row) {
    var d = row.querySelector('.sched-date-inp');
    var s = row.querySelector('.slot-inp');
    if (d && d.value) schedules.push({ date: d.value, slots: parseInt(s ? s.value : 0) || 0 });
  });

  var tours = adminGetTours();
  var tour = { name: name, location: location, price: price ? price + 'đ' : '—', duration: duration, desc: desc, active: publish, schedules: schedules, days: days };

  if (idxStr !== '') {
    var idx = parseInt(idxStr);
    tour.id = tours[idx].id;
    tours[idx] = tour;
    showToast('✅ Đã cập nhật tour: ' + name);
  } else {
    tour.id = tours.reduce(function (m, t) { return Math.max(m, t.id || 0); }, 0) + 1;
    tours.push(tour);
    showToast(publish ? '✅ Đã xuất bản tour: ' + name : '📝 Đã lưu bản nháp: ' + name);
  }

  adminSaveTours(tours);
  adminShowTourList();
}

// ===== ITINERARY DAYS =====
var dayCount = 0;
function atfAddDay(title, desc) {
  dayCount++;
  var list = document.getElementById('atfDaysList');
  if (!list) return;
  var div = document.createElement('div');
  div.className = 'atf-day-item';
  div.innerHTML =
    '<div class="atf-day-header">' +
    '<span class="atf-day-badge">Ngày ' + dayCount + '</span>' +
    '<button class="atf-day-del" onclick="atfRemoveDay(this)" title="Xóa ngày">✕</button>' +
    '</div>' +
    '<div class="atf-day-body">' +
    '<input class="day-title-inp" type="text" placeholder="Tiêu đề: Tham quan đảo & Chèo thuyền Kayak" value="' + (title || '') + '">' +
    '<textarea class="day-desc-inp" placeholder="Mô tả hoạt động trong ngày...">' + (desc || '') + '</textarea>' +
    '</div>';
  list.appendChild(div);
}

function atfRemoveDay(btn) {
  btn.closest('.atf-day-item').remove();
  // Re-number
  dayCount = 0;
  document.querySelectorAll('.atf-day-item').forEach(function (item) {
    dayCount++;
    var badge = item.querySelector('.atf-day-badge');
    if (badge) badge.textContent = 'Ngày ' + dayCount;
  });
}

// ===== SCHEDULE =====
function atfAddSchedule() { atfAddScheduleRow('', 20); }
function atfAddScheduleRow(date, slots) {
  var list = document.getElementById('atfScheduleList');
  if (!list) return;
  var empty = list.querySelector('p');
  if (empty) empty.remove();
  var row = document.createElement('div');
  row.className = 'atf-schedule-row';
  row.innerHTML =
    '<input class="sched-date-inp" type="date" value="' + (date || '') + '">' +
    '<input class="slot-inp" type="number" placeholder="Slots" value="' + (slots || 20) + '" min="1">' +
    '<button class="atf-sched-del" onclick="this.parentElement.remove()" title="Xóa">✕</button>';
  list.appendChild(row);
}

// ===== IMAGE UPLOAD =====
function atfAddImages(input) {
  if (!input.files) return;
  var grid = document.getElementById('atfImgGrid');
  Array.from(input.files).slice(0, 6).forEach(function (file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var div = document.createElement('div');
      div.className = 'atf-img-preview';
      div.style.backgroundImage = 'url(' + e.target.result + ')';
      div.innerHTML = '<button onclick="this.parentElement.remove()" title="Xóa">✕</button>';
      grid.insertBefore(div, grid.querySelector('.atf-img-upload'));
    };
    reader.readAsDataURL(file);
  });
}

// ===== TEXT FORMAT =====
function atfFormat(cmd) { document.execCommand(cmd, false, null); }

// ============================================================
// COUPONS – Quản lý Mã giảm giá
// ============================================================
var ADMIN_COUPON_PAGE = 1;
var ADMIN_COUPON_PER = 10;
var ADMIN_COUPON_KEYWORD = '';
var ADMIN_COUPON_IS_ACTIVE = '';
var ADMIN_COUPON_ROWS_CACHE = [];
var ADMIN_COUPON_CONFIRM_RESOLVE = null;

var ADMIN_COUPON_ERROR_VI = {
  COUPON_CODE_IS_REQUIRED: 'Vui lòng nhập mã giảm giá.',
  COUPON_CODE_MUST_BE_A_STRING: 'Mã giảm giá phải là chuỗi ký tự.',
  COUPON_CODE_LENGTH_INVALID: 'Mã giảm giá phải từ 3 đến 20 ký tự.',
  COUPON_CODE_ALREADY_EXISTS: 'Mã giảm giá đã tồn tại.',
  COUPON_VALUE_IS_REQUIRED: 'Vui lòng nhập giá trị giảm.',
  COUPON_VALUE_MUST_BE_A_POSITIVE_INTEGER: 'Giá trị giảm phải là số nguyên dương.',
  COUPON_MIN_ORDER_VALUE_IS_REQUIRED: 'Vui lòng nhập giá trị đơn tối thiểu.',
  COUPON_MIN_ORDER_VALUE_MUST_BE_NON_NEGATIVE: 'Đơn tối thiểu phải là số nguyên không âm.',
  COUPON_MAX_USAGE_IS_REQUIRED: 'Vui lòng nhập tổng lượt sử dụng tối đa.',
  COUPON_MAX_USAGE_MUST_BE_A_POSITIVE_INTEGER: 'Tổng lượt sử dụng tối đa phải là số nguyên dương.',
  COUPON_EXPIRES_AT_IS_REQUIRED: 'Vui lòng chọn hạn dùng.',
  COUPON_EXPIRES_AT_IS_INVALID: 'Hạn dùng không đúng định dạng ISO8601.',
  COUPON_EXPIRES_AT_MUST_BE_IN_FUTURE: 'Hạn dùng phải lớn hơn thời điểm hiện tại.'
};

function adminCouponTranslateErrorMessage(msg) {
  if (!msg) return '';
  var raw = String(msg).trim();
  if (ADMIN_COUPON_ERROR_VI[raw]) return ADMIN_COUPON_ERROR_VI[raw];

  var lower = raw.toLowerCase();
  if (lower.includes('already exists') || lower.includes('đã tồn tại')) return 'Mã giảm giá đã tồn tại.';
  if (lower.includes('iso8601') || lower.includes('invalid date')) return 'Hạn dùng không hợp lệ.';
  if (lower.includes('future')) return 'Hạn dùng phải lớn hơn thời điểm hiện tại.';

  return raw;
}

function adminCouponExtractErrorMessage(res, fallback) {
  var fb = fallback || 'Thao tác thất bại';
  if (!res || !res.data) return fb;

  var data = res.data || {};
  var errors = data.errors;
  if (errors) {
    if (Array.isArray(errors) && errors.length) {
      var arrMsg = errors[0] && (errors[0].msg || errors[0].message || errors[0].errorMessage || errors[0]);
      return adminCouponTranslateErrorMessage(arrMsg) || fb;
    }

    var firstVal = Object.values(errors)[0];
    if (Array.isArray(firstVal) && firstVal.length) {
      var groupedMsg = firstVal[0] && (firstVal[0].msg || firstVal[0].message || firstVal[0].errorMessage || firstVal[0]);
      return adminCouponTranslateErrorMessage(groupedMsg) || fb;
    }

    var firstMsg = firstVal && (firstVal.msg || firstVal.message || firstVal.errorMessage || firstVal);
    if (firstMsg) return adminCouponTranslateErrorMessage(firstMsg) || fb;
  }

  if (data.message) return adminCouponTranslateErrorMessage(data.message) || fb;
  if (data.error) return adminCouponTranslateErrorMessage(data.error) || fb;
  return fb;
}

function adminCouponEscapeHtml(val) {
  return String(val || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function adminCouponFormatValue(value) {
  var n = Number(value);
  if (!isFinite(n) || n <= 0) return '0đ';
  return Math.round(n).toLocaleString('vi-VN') + 'đ';
}

function adminCouponFormatCondition(minOrderValue) {
  var n = Number(minOrderValue);
  if (!isFinite(n) || n <= 0) return 'Không yêu cầu';
  return '≥ ' + Math.round(n).toLocaleString('vi-VN') + 'đ';
}

function adminCouponFormatDate(iso) {
  if (!iso) return '—';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  var dd = String(d.getDate()).padStart(2, '0');
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var yyyy = d.getFullYear();
  return dd + '/' + mm + '/' + yyyy;
}

function adminCouponToInputDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

function adminExtractCoupons(response) {
  if (!response || !response.ok) return [];
  var data = response.data || {};
  var result = data.result !== undefined ? data.result : data;

  if (Array.isArray(result)) return result;
  if (Array.isArray(result && result.coupons)) return result.coupons;
  if (Array.isArray(result && result.items)) return result.items;
  if (Array.isArray(data.coupons)) return data.coupons;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function adminExtractCouponPagination(response, fallbackCount) {
  var total = Number(fallbackCount) || 0;
  var currentPage = ADMIN_COUPON_PAGE;
  var limit = ADMIN_COUPON_PER;

  if (response && response.data) {
    var data = response.data;
    var result = data.result !== undefined ? data.result : data;
    var pagination = result && result.pagination ? result.pagination : (data.pagination || null);
    if (pagination) {
      if (pagination.total !== undefined) total = Number(pagination.total) || total;
      if (pagination.page !== undefined) currentPage = Number(pagination.page) || currentPage;
      if (pagination.limit !== undefined) limit = Number(pagination.limit) || limit;
    }
  }

  return {
    total: Math.max(0, total),
    page: Math.max(1, currentPage),
    limit: Math.max(1, limit)
  };
}

function adminCouponSearch() {
  ADMIN_COUPON_KEYWORD = (document.getElementById('adminCouponSearch')?.value || '').trim();
  ADMIN_COUPON_PAGE = 1;
  adminRenderCouponsTable();
}

function adminCouponFilterStatus() {
  ADMIN_COUPON_IS_ACTIVE = document.getElementById('adminCouponStatusFilter')?.value || '';
  ADMIN_COUPON_PAGE = 1;
  adminRenderCouponsTable();
}

function adminCouponGoPage(page) {
  ADMIN_COUPON_PAGE = Math.max(1, Number(page) || 1);
  adminRenderCouponsTable();
}

function adminCouponConfirmOpen(text, title) {
  var modal = document.getElementById('couponConfirmModal');
  var textEl = document.getElementById('couponConfirmText');
  var titleEl = document.getElementById('couponConfirmTitle');
  if (!modal) return Promise.resolve(false);
  if (titleEl) titleEl.textContent = title || 'Xác nhận thao tác';
  if (textEl) textEl.textContent = text || 'Bạn có chắc muốn tiếp tục?';
  modal.style.display = 'flex';

  return new Promise(function (resolve) {
    ADMIN_COUPON_CONFIRM_RESOLVE = resolve;
  });
}

function adminCouponConfirmClose(accepted) {
  var modal = document.getElementById('couponConfirmModal');
  if (modal) modal.style.display = 'none';
  if (ADMIN_COUPON_CONFIRM_RESOLVE) {
    var resolve = ADMIN_COUPON_CONFIRM_RESOLVE;
    ADMIN_COUPON_CONFIRM_RESOLVE = null;
    resolve(!!accepted);
  }
}

function adminCouponCreate() {
  var modal = document.getElementById('couponCreateModal');
  if (!modal) return;

  var codeEl = document.getElementById('couponCreateCode');
  var valueEl = document.getElementById('couponCreateValue');
  var minEl = document.getElementById('couponCreateMinOrderValue');
  var maxEl = document.getElementById('couponCreateMaxUsage');
  var expiresEl = document.getElementById('couponCreateExpiresAt');

  if (codeEl) codeEl.value = '';
  if (valueEl) valueEl.value = '';
  if (minEl) minEl.value = '';
  if (maxEl) maxEl.value = '';
  if (expiresEl) expiresEl.value = '';

  modal.style.display = 'flex';
  if (codeEl) codeEl.focus();
}

function adminCouponHideCreateModal() {
  var modal = document.getElementById('couponCreateModal');
  if (modal) modal.style.display = 'none';
}

function adminCouponSetCreateLoading(isLoading) {
  var saveBtn = document.getElementById('couponCreateSaveBtn');
  var cancelBtn = document.getElementById('couponCreateCancelBtn');
  var ids = ['couponCreateCode', 'couponCreateValue', 'couponCreateMinOrderValue', 'couponCreateMaxUsage', 'couponCreateExpiresAt'];

  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.disabled = !!isLoading;
  });

  if (cancelBtn) cancelBtn.disabled = !!isLoading;
  if (saveBtn) {
    if (!saveBtn.dataset.defaultText) saveBtn.dataset.defaultText = saveBtn.textContent;
    saveBtn.disabled = !!isLoading;
    saveBtn.textContent = isLoading ? 'Đang lưu...' : saveBtn.dataset.defaultText;
  }
}

function adminCouponHideEditModal() {
  var modal = document.getElementById('couponEditModal');
  if (modal) modal.style.display = 'none';
}

function adminCouponSetEditLoading(isLoading) {
  var saveBtn = document.getElementById('couponEditSaveBtn');
  var cancelBtn = document.getElementById('couponEditCancelBtn');
  var ids = ['couponEditCode', 'couponEditValue', 'couponEditMinOrderValue', 'couponEditMaxUsage', 'couponEditExpiresAt'];

  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.disabled = !!isLoading;
  });

  if (cancelBtn) cancelBtn.disabled = !!isLoading;
  if (saveBtn) {
    if (!saveBtn.dataset.defaultText) saveBtn.dataset.defaultText = saveBtn.textContent;
    saveBtn.disabled = !!isLoading;
    saveBtn.textContent = isLoading ? 'Đang lưu...' : saveBtn.dataset.defaultText;
  }
}

async function adminCouponSubmitCreate() {
  var code = (document.getElementById('couponCreateCode')?.value || '').trim().toUpperCase();
  var value = Number(document.getElementById('couponCreateValue')?.value || 0);
  var min_order_value = Number(document.getElementById('couponCreateMinOrderValue')?.value || 0);
  var max_usage = Number(document.getElementById('couponCreateMaxUsage')?.value || 0);
  var expiresDate = (document.getElementById('couponCreateExpiresAt')?.value || '').trim();

  if (!code) { showToast('⚠️ Vui lòng nhập code'); return; }
  if (!isFinite(value) || value <= 0) { showToast('⚠️ Giá trị giảm không hợp lệ'); return; }
  if (!isFinite(min_order_value) || min_order_value < 0) { showToast('⚠️ Đơn tối thiểu không hợp lệ'); return; }
  if (!isFinite(max_usage) || max_usage <= 0) { showToast('⚠️ Tổng lượt sử dụng tối đa không hợp lệ'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresDate)) { showToast('⚠️ Vui lòng chọn hạn dùng'); return; }

  adminCouponSetCreateLoading(true);
  try {
    var payload = {
      code: code,
      value: Math.round(value),
      min_order_value: Math.round(min_order_value),
      max_usage: Math.round(max_usage),
      expires_at: expiresDate + 'T00:00:00.000Z'
    };

    var res = await apiAdminCreateCoupon(payload);
    if (res && res.ok) {
      showToast('✅ Đã thêm mã giảm giá');
      adminCouponHideCreateModal();
      ADMIN_COUPON_PAGE = 1;
      adminRenderCouponsTable();
      return;
    }

    var msg = adminCouponExtractErrorMessage(res, 'Không thể thêm mã giảm giá');
    showToast('❌ ' + msg);
  } catch (e) {
    showToast('❌ Không thể kết nối server');
  } finally {
    adminCouponSetCreateLoading(false);
  }
}

async function adminCouponToggle(id, inputEl) {
  if (!id) {
    showToast('⚠️ Không tìm thấy mã giảm giá');
    return;
  }

  // onchange chạy sau khi checkbox đã đổi, nên trạng thái trước đó là đảo ngược lại
  var previousChecked = inputEl ? !inputEl.checked : false;
  var confirmed = await adminCouponConfirmOpen(
    'Bạn có chắc muốn thay đổi trạng thái mã giảm giá này?',
    'Xác nhận thay đổi trạng thái'
  );
  if (!confirmed) {
    if (inputEl) inputEl.checked = previousChecked;
    return;
  }

  if (inputEl) inputEl.disabled = true;
  try {
    // Toggle trạng thái bằng endpoint chuẩn PATCH /api/coupons/:id/toggle
    var res = await apiAdminToggleCoupon(id);
    if (res && res.ok) {
      showToast('✅ Đã cập nhật trạng thái mã giảm giá');
      adminRenderCouponsTable();
      return;
    }
    if (inputEl) inputEl.checked = previousChecked;
    var msg = adminCouponExtractErrorMessage(res, 'Không thể cập nhật trạng thái');
    showToast('❌ ' + msg);
  } catch (e) {
    if (inputEl) inputEl.checked = previousChecked;
    showToast('❌ Không thể kết nối server');
  } finally {
    if (inputEl) inputEl.disabled = false;
  }
}

function adminCouponEdit(id) {
  var list = ADMIN_COUPON_ROWS_CACHE || [];
  var c = list.find(function (x) { return (x._id || x.id) === id; });
  if (!c) { showToast('⚠️ Không tìm thấy mã giảm giá'); return; }

  var modal = document.getElementById('couponEditModal');
  if (!modal) return;

  var idEl = document.getElementById('couponEditId');
  var codeEl = document.getElementById('couponEditCode');
  var valueEl = document.getElementById('couponEditValue');
  var minEl = document.getElementById('couponEditMinOrderValue');
  var maxEl = document.getElementById('couponEditMaxUsage');
  var expiresEl = document.getElementById('couponEditExpiresAt');

  if (idEl) idEl.value = c._id || c.id || '';
  if (codeEl) codeEl.value = c.code || '';
  if (valueEl) valueEl.value = Number(c.value) || 0;
  if (minEl) minEl.value = Number(c.min_order_value) || 0;
  if (maxEl) maxEl.value = Number(c.max_usage) || 0;
  if (expiresEl) expiresEl.value = adminCouponToInputDate(c.expires_at) || '';

  modal.style.display = 'flex';
  if (codeEl) codeEl.focus();
}

async function adminCouponSubmitEdit() {
  var id = (document.getElementById('couponEditId')?.value || '').trim();
  var code = (document.getElementById('couponEditCode')?.value || '').trim().toUpperCase();
  var value = Number(document.getElementById('couponEditValue')?.value || 0);
  var min_order_value = Number(document.getElementById('couponEditMinOrderValue')?.value || 0);
  var max_usage = Number(document.getElementById('couponEditMaxUsage')?.value || 0);
  var expiresDate = (document.getElementById('couponEditExpiresAt')?.value || '').trim();

  if (!id) { showToast('⚠️ Không tìm thấy coupon cần sửa'); return; }
  if (!code) { showToast('⚠️ Vui lòng nhập code'); return; }
  if (!isFinite(value) || value <= 0) { showToast('⚠️ Giá trị giảm không hợp lệ'); return; }
  if (!isFinite(min_order_value) || min_order_value < 0) { showToast('⚠️ Đơn tối thiểu không hợp lệ'); return; }
  if (!isFinite(max_usage) || max_usage <= 0) { showToast('⚠️ Tổng lượt sử dụng tối đa không hợp lệ'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresDate)) { showToast('⚠️ Vui lòng chọn hạn dùng'); return; }

  adminCouponSetEditLoading(true);
  try {
    var payload = {
      code: code,
      value: Math.round(value),
      min_order_value: Math.round(min_order_value),
      max_usage: Math.round(max_usage),
      expires_at: expiresDate + 'T00:00:00.000Z'
    };

    var res = await apiAdminUpdateCoupon(id, payload);
    if (res && res.ok) {
      showToast('✅ Đã cập nhật mã giảm giá');
      adminCouponHideEditModal();
      adminRenderCouponsTable();
      return;
    }
    var msg = adminCouponExtractErrorMessage(res, 'Không thể cập nhật mã giảm giá');
    showToast('❌ ' + msg);
  } catch (e) {
    showToast('❌ Không thể kết nối server');
  } finally {
    adminCouponSetEditLoading(false);
  }
}

async function adminRenderCouponsTable() {
  var tbody = document.getElementById('adminCouponsBody');
  var footer = document.getElementById('adminCouponsFooter');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:32px">Đang tải...</td></tr>';

  var coupons = [];
  var pagination = { total: 0, page: ADMIN_COUPON_PAGE, limit: ADMIN_COUPON_PER };
  try {
    var params = {
      page: ADMIN_COUPON_PAGE,
      limit: ADMIN_COUPON_PER
    };
    if (ADMIN_COUPON_KEYWORD) params.keyword = ADMIN_COUPON_KEYWORD;
    if (ADMIN_COUPON_IS_ACTIVE !== '') params.is_active = ADMIN_COUPON_IS_ACTIVE;

    var res = await apiAdminGetCoupons(params);
    coupons = adminExtractCoupons(res);
    pagination = adminExtractCouponPagination(res, coupons.length);
  } catch (e) {
    coupons = [];
  }

  ADMIN_COUPON_ROWS_CACHE = coupons;

  if (!coupons.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:32px">Chưa có mã giảm giá</td></tr>';
    if (footer) footer.innerHTML = '<span style="font-size:0.75rem;color:#aaa">Hiển thị 0 - 0 / 0 mã giảm giá</span>';
    return;
  }

  tbody.innerHTML = coupons.map(function (c) {
    var id = c._id || c.id || '';
    var used = Number(c.used_count) || 0;
    var max = Number(c.max_usage);
    var usageText = used + ' / ' + (isFinite(max) && max > 0 ? max : '∞');
    var code = adminCouponEscapeHtml(c.code || '—');
    var value = adminCouponFormatValue(c.value || 0);
    var condition = adminCouponFormatCondition(c.min_order_value);
    var expiry = adminCouponFormatDate(c.expires_at);
    var active = c.is_active !== false;

    return '<tr>' +
      '<td style="font-weight:700">' + code + '</td>' +
      '<td>' + value + '</td>' +
      '<td>' + condition + '</td>' +
      '<td>' + usageText + '</td>' +
      '<td>' + expiry + '</td>' +
      '<td><div style="display:flex;align-items:center;gap:8px">' +
      '<label class="afp-toggle" style="transform:scale(.88);transform-origin:left center">' +
      '<input type="checkbox" ' + (active ? 'checked' : '') + ' onchange="adminCouponToggle(\'' + id + '\', this)">' +
      '<span class="afp-toggle-slider"></span>' +
      '</label>' +
      '<span style="font-size:0.78rem;font-weight:600;color:' + (active ? '#2d8a4e' : '#888') + '">' + (active ? 'Đang hoạt động' : 'Ngừng hoạt động') + '</span>' +
      '</div></td>' +
      '<td><div style="display:flex;gap:6px">' +
      '<button class="admin-act-btn" data-id="' + id + '" onclick="adminCouponEdit(this.dataset.id)">Sửa</button>' +
      '</div></td>' +
      '</tr>';
  }).join('');

  var total = Math.max(coupons.length, Number(pagination.total) || 0);
  var limit = Number(pagination.limit) || ADMIN_COUPON_PER;
  var page = Number(pagination.page) || ADMIN_COUPON_PAGE;
  var totalPages = Math.max(1, Math.ceil(total / limit));
  ADMIN_COUPON_PAGE = Math.min(page, totalPages);

  var pages = '';
  var startPage = Math.max(1, ADMIN_COUPON_PAGE - 2);
  var endPage = Math.min(totalPages, startPage + 4);
  for (var p = startPage; p <= endPage; p++) {
    pages += '<button class="admin-page-btn' + (p === ADMIN_COUPON_PAGE ? ' active' : '') + '" onclick="adminCouponGoPage(' + p + ')">' + p + '</button>';
  }

  var from = total ? ((ADMIN_COUPON_PAGE - 1) * limit + 1) : 0;
  var to = Math.min(ADMIN_COUPON_PAGE * limit, total);
  if (footer) footer.innerHTML =
    '<span style="font-size:0.75rem;color:#aaa">Hiển thị ' + from + ' - ' + to + ' / ' + total + ' mã giảm giá</span>' +
    '<div class="admin-pagination">' +
    '<button class="admin-page-btn text" onclick="adminCouponGoPage(' + Math.max(1, ADMIN_COUPON_PAGE - 1) + ')">Trước</button>' +
    pages +
    '<button class="admin-page-btn text" onclick="adminCouponGoPage(' + Math.min(totalPages, ADMIN_COUPON_PAGE + 1) + ')">Sau</button>' +
    '</div>';
}

// Init coupons when tab opens
var _origSwitchTab = switchTab;
switchTab = function (name) {
  _origSwitchTab(name);
  if (name === 'coupons') adminRenderCouponsTable();
};

// ============================================================
// THỐNG KÊ
// ============================================================
var statsRevenueChart = null;
var statsBookingChart = null;

function statsPeriod(btn, days) {
  document.querySelectorAll('.stats-period').forEach(function (b) { b.classList.remove('active'); });
  btn.classList.add('active');
  statsLoadData();
}

function statsLoadData() {
  // Đọc dữ liệu thật từ localStorage
  var db = [];
  try { db = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]'); } catch (e) { }

  var totalBookings = 0;
  var totalRevenue = 0;
  var tourBookings = {};

  db.forEach(function (u) {
    try {
      var bs = JSON.parse(localStorage.getItem('vt_bookings_' + u.email) || '[]');
      totalBookings += bs.length;
      bs.forEach(function (b) {
        // Parse số tiền
        var raw = (b.total || b.price || '0').replace(/[^\d]/g, '');
        totalRevenue += parseInt(raw) || 0;
        // Đếm theo tour
        var tname = b.tourName || b.tour || '—';
        tourBookings[tname] = (tourBookings[tname] || 0) + 1;
      });
    } catch (e) { }
  });

  // KPI
  var fmtMoney = function (n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M đ';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K đ';
    return n + 'đ';
  };
  var el = function (id) { return document.getElementById(id); };

  if (el('statRevenue')) el('statRevenue').textContent = totalRevenue ? fmtMoney(totalRevenue) : '0đ';
  if (el('statTotalBookings')) el('statTotalBookings').textContent = totalBookings || 0;
  if (el('statVisitors')) el('statVisitors').textContent = db.length || 0;

  // Rating
  if (el('statRating')) el('statRating').textContent = '— / 5.0';
  if (el('statsRatingBig')) el('statsRatingBig').textContent = '—';

  // Donut
  if (el('statsDonutVal')) el('statsDonutVal').textContent = totalBookings || 0;

  // Tour list
  var tourList = el('statsToursList');
  if (tourList) {
    var entries = Object.entries(tourBookings || {}).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
    if (!entries.length) {
      tourList.innerHTML = '<div class="stats-tours-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10z"/></svg><p>Chưa có dữ liệu đặt tour</p></div>';
    } else {
      tourList.innerHTML = entries.map(function (e) {
        var conv = totalBookings > 0 ? Math.round(e[1] / totalBookings * 100) : 0;
        return '<div class="stats-tour-row">' +
          '<div class="stats-tour-name-wrap"><div class="stats-tour-img"></div><span class="stats-tour-name">' + e[0] + '</span></div>' +
          '<div style="font-weight:700">' + e[1] + '</div>' +
          '<div style="color:#888">—</div>' +
          '<div><div class="stats-conv-bar"><div class="stats-conv-fill" style="width:' + conv + '%"></div></div>' + conv + '%</div>' +
          '</div>';
      }).join('');
    }
  }
}

// Gọi khi switch sang stats
var _origSwitch2 = switchTab;
switchTab = function (name) {
  _origSwitch2(name);
  if (name === 'stats') statsLoadData();
};


// Promo preview trong trang tours
function adminRenderPromoPreview() {
  var grid = document.getElementById('adminPromoPreview');
  if (!grid) return;
  var promos = [];
  try { promos = JSON.parse(localStorage.getItem('vt_admin_promos') || '[]'); } catch (e) { }
  var active = promos.filter(function (p) { return p.status === 'active'; }).slice(0, 2);
  var html = active.map(function (p) {
    var disc = p.type === 'percent' ? p.value + '%' : p.value.toLocaleString() + 'đ';
    return '<div class="admin-promo-card">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between">' +
      '<div class="promo-icon">' + (p.type === 'percent' ? '%' : '💰') + '</div>' +
      '<span class="admin-promo-running">ĐANG CHẠY</span>' +
      '</div>' +
      '<div class="admin-promo-name">' + p.name + '</div>' +
      '<div class="admin-promo-desc">Giảm ' + disc + ' · Hết hạn: ' + (p.end || '—') + '</div>' +
      '<div class="admin-promo-footer"><span>Hết hạn: ' + (p.end || '—') + '</span><button class="admin-promo-edit" onclick="switchTab(\"coupons\")">Chỉnh sửa</button></div>' +
      '</div>';
  }).join('');
  html += '<div class="admin-promo-card admin-promo-card-add" onclick="switchTab(\"coupons\")">' +
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
    '<strong>Thêm Ưu đãi Mới</strong>' +
    '<span>Tạo mã giảm giá hoặc chương trình quà tặng mới</span>' +
    '</div>';
  grid.innerHTML = html;
}

var DASH_PERIOD = 'today';
var DASH_TOP_LIMIT = 10;
var DASH_LOADING = false;

function dashNumber(v, fallback) {
  var n = Number(v);
  return isFinite(n) ? n : (fallback || 0);
}

function dashFormatMoney(v) {
  var n = dashNumber(v, 0);
  try {
    return n.toLocaleString('vi-VN') + 'đ';
  } catch (e) {
    return n + 'đ';
  }
}

function dashFormatCompactMoney(v) {
  return dashFormatMoney(v);
}

function dashFormatPercent(v) {
  var n = dashNumber(v, 0);
  var sign = n > 0 ? '+' : '';
  return sign + n.toFixed(1) + '%';
}

function dashFormatShortDateLabel(label) {
  if (typeof label !== 'string') return label;
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(label);
  if (!m) return label;
  return parseInt(m[3], 10) + '/' + parseInt(m[2], 10);
}

function dashSetTrendBadge(elId, value) {
  var badge = document.getElementById(elId);
  if (!badge) return;
  var n = dashNumber(value, 0);
  badge.textContent = dashFormatPercent(n);
  badge.className = 'stats-kpi-change ' + (n > 0 ? 'up' : (n < 0 ? 'down' : 'neutral'));
}

function dashGetResult(res) {
  if (!res || !res.ok) return null;
  var d = res.data || {};
  return d.result !== undefined ? d.result : null;
}

function dashNormalizeTopTours(topToursResult) {
  if (!topToursResult || !Array.isArray(topToursResult.tours)) return [];
  return topToursResult.tours.slice(0, DASH_TOP_LIMIT).map(function (item, idx) {
    var pct = dashNumber(
      item.percent,
      dashNumber(item.percentage, dashNumber(item.booking_percentage, dashNumber(item.ratio, dashNumber(item.share_percent, 0))))
    );
    return {
      rank: idx + 1,
      name: item.name || item.tour_name || item.tour_id || ('Tour #' + (idx + 1)),
      bookings: dashNumber(item.booking_count, 0),
      revenue: dashNumber(item.revenue, 0),
      percent: pct
    };
  });
}

function dashPickMaxBy(list, field) {
  if (!Array.isArray(list) || !list.length) return null;
  return list.reduce(function (best, item) {
    if (!best) return item;
    var a = dashNumber(best[field], 0);
    var b = dashNumber(item[field], 0);
    return b > a ? item : best;
  }, null);
}

function dashNormalizeRevenueSeries(revenueResult) {
  var raw = [];
  if (revenueResult && Array.isArray(revenueResult.chart_result)) raw = revenueResult.chart_result;
  else if (revenueResult && Array.isArray(revenueResult.chart_data)) raw = revenueResult.chart_data;
  if (!raw.length) return [];

  var series = raw.map(function (item, idx) {
    var label = item.date || item.period || ('Mốc ' + (idx + 1));
    return {
      label: label,
      revenue: dashNumber(item.net_revenue, dashNumber(item.revenue, 0))
    };
  });

  series.sort(function (a, b) {
    return String(a.label).localeCompare(String(b.label));
  });

  return series.slice(-7);
}


function dashRenderBookingCancelChart(container, bookings, cancelled) {
  if (!container) return;
  var b = Math.max(0, dashNumber(bookings, 0));
  var c = Math.max(0, dashNumber(cancelled, 0));
  var maxV = Math.max(b, c, 1);
  var hb = Math.max(6, Math.round((b / maxV) * 180));
  var hc = Math.max(6, Math.round((c / maxV) * 180));

  container.innerHTML =
    '<div class="dash-bc-item">' +
    '<div class="dash-bc-track"><div class="dash-bc-fill booking" style="height:' + hb + 'px"></div></div>' +
    '<div class="dash-bc-label">Bookings</div>' +
    '<div class="dash-bc-value">' + b.toLocaleString('vi-VN') + '</div>' +
    '</div>' +
    '<div class="dash-bc-item">' +
    '<div class="dash-bc-track"><div class="dash-bc-fill cancel" style="height:' + hc + 'px"></div></div>' +
    '<div class="dash-bc-label">Đã huỷ</div>' +
    '<div class="dash-bc-value">' + c.toLocaleString('vi-VN') + '</div>' +
    '</div>';
}

function dashUpdatePeriodButtons() {
  document.querySelectorAll('#dashPeriodSwitch .stats-period').forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-period') === DASH_PERIOD);
  });
}

function dashSetPeriod(period, btn) {
  DASH_PERIOD = period;
  if (btn) {
    document.querySelectorAll('#dashPeriodSwitch .stats-period').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
  } else {
    dashUpdatePeriodButtons();
  }
  dashLoadDashboard();
}

function dashTodayDateLabel(chartLabels) {
  if (Array.isArray(chartLabels) && chartLabels.length) {
    var raw = chartLabels[chartLabels.length - 1];
    return dashFormatShortDateLabel(raw);
  }
  var now = new Date();
  return now.getDate() + '/' + (now.getMonth() + 1);
}

function dashFormatAlertDate(rawDate) {
  if (!rawDate) return '';
  var txt = String(rawDate);
  if (txt.indexOf('-') > -1) {
    var parts = txt.split('-');
    if (parts.length >= 3) return parts[2].slice(0, 2) + '/' + parts[1];
  }
  return dashFormatShortDateLabel(txt);
}

function dashFindNegativeRevenueDay(revenueResult) {
  if (!revenueResult) return '';
  var rows = [];
  if (Array.isArray(revenueResult.chart_result)) rows = revenueResult.chart_result;
  else if (Array.isArray(revenueResult.chart_data)) rows = revenueResult.chart_data;
  for (var i = 0; i < rows.length; i++) {
    var item = rows[i] || {};
    var net = dashNumber(item.net_revenue, dashNumber(item.netRevenue, 0));
    if (net < 0) return dashFormatAlertDate(item.date || item.period);
  }
  return '';
}

function dashRenderTodaySummary(overviewToday, revenueWeekResult, label) {
  var box = document.getElementById('dashTodaySummaryBody');
  var title = document.getElementById('dashTodayTitle');
  if (!box) return;

  var ov = overviewToday || {};
  var cancelRate = dashNumber(ov.cancellation_rate, dashNumber(ov.cancel_rate, 0));
  var bookings = dashNumber(ov.total_bookings, dashNumber(ov.bookings, 0));
  var negativeDay = dashFindNegativeRevenueDay(revenueWeekResult);

  if (title) title.textContent = 'Thông báo (' + label + ')';
  var alertItems = [
    {
      show: cancelRate > 0,
      active: cancelRate > 40,
      color: cancelRate > 40 ? '#b42318' : '#ca8a04',
      text: cancelRate > 40
        ? '⚠️ Tỷ lệ huỷ cao (' + cancelRate.toLocaleString('vi-VN') + '%)'
        : '✅ Tỷ lệ huỷ bình thường (' + cancelRate.toLocaleString('vi-VN') + '%)'
    },
    {
      active: !!negativeDay,
      text: negativeDay
        ? '⚠️ Có ngày doanh thu âm (' + negativeDay + ')'
        : '✅ Không có ngày doanh thu âm'
    },
    {
      active: bookings === 0,
      text: bookings === 0
        ? '⚠️ Không có booking hôm nay'
        : '✅ Có ' + bookings.toLocaleString('vi-VN') + ' booking hôm nay'
    }
  ];

  box.innerHTML = '<ul>' + alertItems.filter(function (item) {
    return item.show !== false;
  }).map(function (item) {
    var color = item.color || (item.active ? '#b42318' : '#2d8a4e');
    return '<li style="color:' + color + ';font-weight:700">' + item.text + '</li>';
  }).join('') + '</ul>';
}

async function dashLoadDashboard() {
  var topBody = document.getElementById('dashTopToursBody');
  var topBookedBody = document.getElementById('dashTopBookedBody');
  var revenueChartEl = document.getElementById('dashRevenueLineChart');
  var revenueChartCard = document.getElementById('dashRevenueChartCard');
  var todayCard = document.getElementById('dashTodayInsightsCard');
  var row2 = document.getElementById('dashRow2');
  if (!topBody || !topBookedBody || !revenueChartEl || !revenueChartCard || !todayCard || !row2) return;

  dashUpdatePeriodButtons();

  if (DASH_LOADING) return;
  DASH_LOADING = true;

  var kpiPeriod = document.getElementById('dashKpiPeriod');
  var periodLabel = { today: 'Hôm nay', week: 'Tuần này', month: 'Tháng này', year: 'Năm nay' }[DASH_PERIOD] || 'Hôm nay';
  if (kpiPeriod) kpiPeriod.textContent = periodLabel;

  var topMetaDescEl = document.getElementById('dashRevenueMeta');
  var revenueMetaEl = document.getElementById('dashRevenueChartMeta');
  revenueChartCard.style.display = 'block';
  todayCard.style.display = 'block';
  row2.classList.remove('single');

  if (topMetaDescEl) topMetaDescEl.textContent = 'Đang tải dữ liệu...';
  if (revenueMetaEl) revenueMetaEl.textContent = 'Đang tải dữ liệu biểu đồ...';
  topBody.innerHTML =
    '<div class="dash-top-tour-name">Đang tải...</div>' +
    '<div class="dash-top-tour-stat">💰 0</div>' +
    '<div class="dash-top-tour-stat">📦 0 booking</div>' +
    '<div class="dash-top-tour-stat">📊 0%</div>';
  topBookedBody.innerHTML =
    '<div class="dash-top-tour-name">Đang tải...</div>' +
    '<div class="dash-top-tour-stat">💰 0</div>' +
    '<div class="dash-top-tour-stat">📦 0 booking</div>' +
    '<div class="dash-top-tour-stat">📊 0%</div>';

  try {
    var responses = await Promise.all([
      apiGetStatsOverview(DASH_PERIOD),
      apiGetTopTours('week', DASH_TOP_LIMIT),
      apiGetStatsOverview('today'),
      apiGetStatsRevenue('week')
    ]);

    var overview = dashGetResult(responses[0]) || {};
    var topTours = dashNormalizeTopTours(dashGetResult(responses[1]));
    var overviewToday = dashGetResult(responses[2]) || {};
    var revenueWeek = dashGetResult(responses[3]) || {};

    const chartRaw = overview.chart || {
      labels: [],
      revenues: [],
      bookings: [],
      cancelled: []
    };

    const chart = dashNormalizeChart(chartRaw);

    var totalRevenue = dashNumber(overview.total_revenue, 0);
    var totalBookings = dashNumber(overview.total_bookings, 0);
    var cancelledBookings = dashNumber(overview.cancelled_bookings, 0);
    var cancellationRate = dashNumber(overview.cancellation_rate, 0);
    var newUsers = dashNumber(overview.new_users, 0);
    var cmp = overview.comparison_with_previous || {};
    var bookingsGrowth = dashNumber(cmp.bookings_growth, 0);
    var usersGrowth = dashNumber(cmp.users_growth, 0);
    var cancellationRateGrowth = dashNumber(cmp.cancellation_rate_growth, 0);

    var todayRevenue = dashNumber(overviewToday.revenue, dashNumber(overviewToday.total_revenue, dashNumber(overviewToday.net_revenue, 0)));
    var todayBookings = dashNumber(overviewToday.bookings, dashNumber(overviewToday.total_bookings, 0));
    var todayCancelRate = dashNumber(overviewToday.cancel_rate, dashNumber(overviewToday.cancellation_rate, 0));

    var el = function (id) { return document.getElementById(id); };
    if (el('dashKpiRevenueToday')) el('dashKpiRevenueToday').textContent = dashFormatCompactMoney(todayRevenue);
    if (el('dashKpiBookingsToday')) el('dashKpiBookingsToday').textContent = todayBookings.toLocaleString('vi-VN');
    if (el('dashKpiCancelledToday')) el('dashKpiCancelledToday').textContent = todayCancelRate.toLocaleString('vi-VN') + '%';

    if (el('dashKpiRevenue')) el('dashKpiRevenue').textContent = dashFormatMoney(totalRevenue);
    if (el('dashKpiBookings')) el('dashKpiBookings').textContent = totalBookings.toLocaleString('vi-VN');
    if (el('dashKpiUsers')) el('dashKpiUsers').textContent = newUsers.toLocaleString('vi-VN');
    if (el('dashKpiCancelRate')) {
      var cancelEl = el('dashKpiCancelRate');
      cancelEl.textContent = cancellationRate.toLocaleString('vi-VN') + '%';
      var cancelCard = cancelEl.closest('.stats-kpi-card');
      if (cancellationRate >= 30) {
        cancelEl.style.color = '#dc2626';
        if (cancelCard) cancelCard.style.boxShadow = '0 0 0 2px rgba(220,38,38,.2), 0 1px 8px rgba(0,0,0,.05)';
      } else if (cancellationRate < 10) {
        cancelEl.style.color = '#2d8a4e';
        if (cancelCard) cancelCard.style.boxShadow = '0 0 0 2px rgba(45,138,78,.18), 0 1px 8px rgba(0,0,0,.05)';
      } else {
        cancelEl.style.color = '#d97706';
        if (cancelCard) cancelCard.style.boxShadow = '0 0 0 2px rgba(217,119,6,.18), 0 1px 8px rgba(0,0,0,.05)';
      }
    }
    if (el('dashKpiCancelledBookings')) el('dashKpiCancelledBookings').textContent = cancelledBookings.toLocaleString('vi-VN');
    dashSetTrendBadge('dashKpiBookingsTrend', bookingsGrowth);
    dashSetTrendBadge('dashKpiUsersTrend', usersGrowth);
    dashSetTrendBadge('dashKpiCancelRateTrend', cancellationRateGrowth);

    dashRenderTodaySummary(overviewToday, revenueWeek, dashTodayDateLabel(chart.labels));

    var miniRevenueSeries = dashNormalizeRevenueSeries(revenueWeek);
    var miniLabels = miniRevenueSeries.map(function (item) { return item.label; });
    var miniValues = miniRevenueSeries.map(function (item) { return item.revenue; });
    renderRevenueChart(miniLabels, miniValues);

    if (revenueMetaEl) {
      if (miniRevenueSeries.length) {
        var first = dashFormatShortDateLabel(miniRevenueSeries[0].label);
        var last = dashFormatShortDateLabel(miniRevenueSeries[miniRevenueSeries.length - 1].label);
        revenueMetaEl.textContent = '7 ngày gần nhất: ' + first + ' → ' + last;
      } else {
        revenueMetaEl.textContent = 'Chưa có dữ liệu 7 ngày gần nhất';
      }
    }

    if (topMetaDescEl) {
      topMetaDescEl.textContent = DASH_PERIOD === 'today'
        ? 'Chu kỳ hiển thị KPI: ' + periodLabel + ' | Top tour: tuần này'
        : 'Chu kỳ hiển thị: ' + periodLabel;
    }

    var topByRevenue = dashPickMaxBy(topTours, 'revenue');
    var topByBookings = dashPickMaxBy(topTours, 'bookings');

    if (!topByRevenue) {
      topBody.innerHTML =
        '<div class="dash-top-tour-name">Chưa có dữ liệu</div>' +
        '<div class="dash-top-tour-stat">💰 0</div>' +
        '<div class="dash-top-tour-stat">📦 0 booking</div>' +
        '<div class="dash-top-tour-stat">📊 0%</div>';
    } else {
      var t = topByRevenue;
      topBody.innerHTML =
        '<div class="dash-top-tour-name">' + t.name + '</div>' +
        '<div class="dash-top-tour-stat">💰 ' + dashFormatCompactMoney(t.revenue) + '</div>' +
        '<div class="dash-top-tour-stat">📦 ' + t.bookings.toLocaleString('vi-VN') + ' booking</div>' +
        '<div class="dash-top-tour-stat">📊 ' + dashNumber(t.percent, 0).toLocaleString('vi-VN') + '%</div>';
    }

    if (!topByBookings) {
      topBookedBody.innerHTML =
        '<div class="dash-top-tour-name">Chưa có dữ liệu</div>' +
        '<div class="dash-top-tour-stat">💰 0</div>' +
        '<div class="dash-top-tour-stat">📦 0 booking</div>' +
        '<div class="dash-top-tour-stat">📊 0%</div>';
    } else {
      var tb = topByBookings;
      topBookedBody.innerHTML =
        '<div class="dash-top-tour-name">' + tb.name + '</div>' +
        '<div class="dash-top-tour-stat">💰 ' + dashFormatCompactMoney(tb.revenue) + '</div>' +
        '<div class="dash-top-tour-stat">📦 ' + tb.bookings.toLocaleString('vi-VN') + ' booking</div>' +
        '<div class="dash-top-tour-stat">📊 ' + dashNumber(tb.percent, 0).toLocaleString('vi-VN') + '%</div>';
    }

    var topMeta = document.getElementById('dashTopToursMeta');
    if (topMeta) topMeta.textContent = 'Tuần này';
    var topBookedMeta = document.getElementById('dashTopBookedMeta');
    if (topBookedMeta) topBookedMeta.textContent = 'Tuần này';
  } catch (e) {
    if (topMetaDescEl) topMetaDescEl.textContent = 'Không tải được dữ liệu từ API overview.';
    if (revenueMetaEl) revenueMetaEl.textContent = 'Không tải được biểu đồ doanh thu.';
    dashRenderTodaySummary({
      total_revenue: 0,
      total_bookings: 0,
      cancelled_bookings: 0,
      cancellation_rate: 0,
      comparison_with_previous: { revenue_growth: 0, bookings_growth: 0, cancellation_rate_growth: 0 }
    }, {}, dashTodayDateLabel([]));
    topBody.innerHTML =
      '<div class="dash-top-tour-name">Không tải được top tour</div>' +
      '<div class="dash-top-tour-stat">💰 0</div>' +
      '<div class="dash-top-tour-stat">📦 0 booking</div>' +
      '<div class="dash-top-tour-stat">📊 0%</div>';
    topBookedBody.innerHTML =
      '<div class="dash-top-tour-name">Không tải được top tour</div>' +
      '<div class="dash-top-tour-stat">💰 0</div>' +
      '<div class="dash-top-tour-stat">📦 0 booking</div>' +
      '<div class="dash-top-tour-stat">📊 0%</div>';
  } finally {
    DASH_LOADING = false;
  }
}

function adminUpdateDashStats() {
  dashLoadDashboard();
}

// ============================================================
// CATEGORIES – Quản lý Danh mục
// ============================================================
var CAT_KEY = 'vt_admin_categories';
var CAT_PAGE = 1;
var CAT_API_CACHE = [];
var CAT_PER = 10;
var CAT_SAVING = false;
var CAT_TOGGLE_CONFIRM_RESOLVE = null;

var DEFAULT_CATS = [
  { id: 'c1', name: 'Du lịch biển', desc: 'Các tour tham quan, nghỉ dưỡng tại biển', active: true },
  { id: 'c2', name: 'Trekking & Núi', desc: 'Leo núi, trekking rừng và núi cao', active: true },
  { id: 'c3', name: 'Văn hóa & Lịch sử', desc: 'Khám phá di tích, văn hóa bản địa', active: true },
  { id: 'c4', name: 'Ẩm thực', desc: 'Tour trải nghiệm ẩm thực địa phương', active: true },
  { id: 'c5', name: 'Nghỉ dưỡng', desc: 'Resort, spa và thư giãn cao cấp', active: true },
];

function catGetAll() {
  try { var r = localStorage.getItem(CAT_KEY); return r ? JSON.parse(r) : DEFAULT_CATS; } catch (e) { return DEFAULT_CATS; }
}
function catSaveAll(cats) { localStorage.setItem(CAT_KEY, JSON.stringify(cats)); }

// Show/hide form
function catShowForm(id) {
  var card = document.getElementById('catFormCard');
  card.style.display = 'flex';
  document.getElementById('catEditId').value = id || '';
  document.getElementById('catFormTitle').textContent = id ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới';
  var fileInput = document.getElementById('catThumbnail');
  if (fileInput) fileInput.value = '';
  if (id) {
    var cat = CAT_API_CACHE.find(function (c) { return (c._id || c.id) === id; })
      || catGetAll().find(function (c) { return c.id === id; });
    if (cat) {
      document.getElementById('catName').value = cat.name || '';
      document.getElementById('catDesc').value = cat.description || cat.desc || '';
    }
  } else {
    document.getElementById('catName').value = '';
    document.getElementById('catDesc').value = '';
  }
}
function catSetSaving(isSaving, phaseText) {
  CAT_SAVING = !!isSaving;
  var card = document.getElementById('catFormCard');
  if (!card) return;

  card.querySelectorAll('input, textarea, button').forEach(function (el) {
    el.disabled = CAT_SAVING;
  });

  var saveBtn = document.getElementById('catSaveBtn');
  if (saveBtn) {
    if (!saveBtn.dataset.defaultText) saveBtn.dataset.defaultText = saveBtn.textContent;
    saveBtn.textContent = CAT_SAVING ? 'Đang lưu...' : saveBtn.dataset.defaultText;
  }

  var loading = document.getElementById('catSaveLoading');
  if (loading) {
    loading.style.display = CAT_SAVING ? 'block' : 'none';
    if (phaseText) loading.textContent = phaseText;
  }
}

function catHideForm(force) {
  if (CAT_SAVING && !force) return;
  document.getElementById('catFormCard').style.display = 'none';
}

function catToggleConfirmOpen(text, title) {
  var modal = document.getElementById('catToggleConfirmModal');
  var textEl = document.getElementById('catToggleConfirmText');
  var titleEl = document.getElementById('catToggleConfirmTitle');
  if (!modal) return Promise.resolve(false);
  if (titleEl) titleEl.textContent = title || 'Xác nhận thao tác';
  if (textEl) textEl.textContent = text || 'Bạn có chắc muốn thay đổi trạng thái danh mục này?';
  modal.style.display = 'flex';
  return new Promise(function (resolve) {
    CAT_TOGGLE_CONFIRM_RESOLVE = resolve;
  });
}

function catToggleConfirmClose(accepted) {
  var modal = document.getElementById('catToggleConfirmModal');
  if (modal) modal.style.display = 'none';
  if (CAT_TOGGLE_CONFIRM_RESOLVE) {
    var resolve = CAT_TOGGLE_CONFIRM_RESOLVE;
    CAT_TOGGLE_CONFIRM_RESOLVE = null;
    resolve(!!accepted);
  }
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    var globalConfirmModal = document.getElementById('adminGlobalConfirmModal');
    if (globalConfirmModal && globalConfirmModal.style.display !== 'none') {
      adminGlobalConfirmClose(false);
      return;
    }
    var couponConfirmModal = document.getElementById('couponConfirmModal');
    if (couponConfirmModal && couponConfirmModal.style.display !== 'none') {
      adminCouponConfirmClose(false);
      return;
    }
    var couponModal = document.getElementById('couponCreateModal');
    if (couponModal && couponModal.style.display !== 'none') {
      adminCouponHideCreateModal();
      return;
    }
    var couponEditModal = document.getElementById('couponEditModal');
    if (couponEditModal && couponEditModal.style.display !== 'none') {
      adminCouponHideEditModal();
      return;
    }
    var toggleModal = document.getElementById('catToggleConfirmModal');
    if (toggleModal && toggleModal.style.display !== 'none') {
      catToggleConfirmClose(false);
      return;
    }
    var card = document.getElementById('catFormCard');
    if (card && card.style.display !== 'none') catHideForm();
  }
});

// Save – POST /api/categories hoặc PUT /api/categories/:id
async function catSave() {
  if (CAT_SAVING) return;
  var name = (document.getElementById('catName').value || '').trim();
  var desc = (document.getElementById('catDesc').value || '').trim();
  var id = document.getElementById('catEditId').value;
  var file = document.getElementById('catThumbnail').files[0];

  if (!name) { showToast('⚠️ Vui lòng nhập tên danh mục'); return; }

  catSetSaving(true, '⏳ Đang lưu thông tin danh mục...');

  // Update text bằng JSON, ảnh gọi route riêng /categories/:id/image
  try {
    var payload = { name: name };
    if (desc) payload.description = desc;

    var res;
    if (id) {
      res = await apiAdminUpdateCategory(id, payload);
      if (res && res.ok && file) {
        catSetSaving(true, '⏳ Đang tải ảnh thumbnail...');
        var imageRes = await apiAdminUpdateCategoryImage(id, file);
        if (!imageRes || !imageRes.ok) {
          var imageMsg = (imageRes && imageRes.data && (imageRes.data.message || imageRes.data.error))
            ? (imageRes.data.message || imageRes.data.error)
            : 'Cập nhật ảnh danh mục thất bại';
          showToast('❌ ' + imageMsg);
          return;
        }
      }
    } else {
      res = await apiAdminCreateCategory(payload);
      if (res && res.ok && file) {
        catSetSaving(true, '⏳ Đang tải ảnh thumbnail...');
        var created = (res.data && res.data.result) ? res.data.result : {};
        var createdCat = created.category || created;
        var createdId = createdCat._id || createdCat.id;
        if (createdId) {
          var createdImageRes = await apiAdminUpdateCategoryImage(createdId, file);
          if (!createdImageRes || !createdImageRes.ok) {
            var createdImageMsg = (createdImageRes && createdImageRes.data && (createdImageRes.data.message || createdImageRes.data.error))
              ? (createdImageRes.data.message || createdImageRes.data.error)
              : 'Cập nhật ảnh danh mục thất bại';
            showToast('❌ ' + createdImageMsg);
            return;
          }
        }
      }
    }
    if (res && res.ok) {
      showToast('✅ Đã lưu danh mục!');
      catHideForm(true);
      catRender();
      return;
    }

    var msg = (res && res.data && (res.data.message || res.data.error))
      ? (res.data.message || res.data.error)
      : 'Lưu danh mục thất bại';
    showToast('❌ ' + msg);
    return;
  } catch (e) {
    showToast('❌ Không thể kết nối server');
    return;
  } finally {
    catSetSaving(false);
  }
}

// Delete – DELETE /api/categories/:id
async function catDelete(id) {
  var apiCat = CAT_API_CACHE.find(function (c) { return (c._id || c.id) === id; });
  var localCat = catGetAll().find(function (c) { return (c._id || c.id) === id || c.id === id; });
  var cat = apiCat || localCat;

  var confirmed = await catToggleConfirmOpen(
    'Bạn có chắc muốn xóa danh mục "' + (cat ? (cat.name || id) : id) + '"? Hành động này không thể hoàn tác.',
    'Xác nhận xóa danh mục'
  );
  if (!confirmed) return;

  try {
    var res = await apiAdminDeleteCategory(id);
    if (res && res.ok) { showToast('Đã xóa danh mục'); catRender(); return; }
    var errMsg = (res && res.data && (res.data.message || res.data.error)) ? (res.data.message || res.data.error) : '';
    if (res && res.status === 400 && errMsg === 'Category has tours, cannot be deleted') {
      showToast('❌ Không thể xóa danh mục đang có tour hoạt động');
      return;
    }
    showToast('❌ ' + (errMsg || 'Không thể xóa danh mục'));
    return;
  } catch (e) {
    showToast('❌ Không thể kết nối server');
    return;
  }
}

// Toggle active
async function catToggle(id, inputEl) {
  var cats = catGetAll();
  var apiCat = CAT_API_CACHE.find(function (c) { return (c._id || c.id) === id; });
  var localIdx = cats.findIndex(function (c) { return (c._id || c.id) === id || c.id === id; });

  var currentActive = false;
  if (apiCat) {
    currentActive = typeof apiCat.is_active === 'boolean' ? apiCat.is_active : (apiCat.active !== false);
  } else if (localIdx >= 0) {
    var localCat = cats[localIdx];
    currentActive = typeof localCat.is_active === 'boolean' ? localCat.is_active : (localCat.active !== false);
  }

  var nextActive = !currentActive;

  var confirmText = nextActive
    ? 'Bạn có chắc muốn BẬT trạng thái danh mục này?'
    : 'Bạn có chắc muốn TẮT trạng thái danh mục này?';
  var confirmed = await catToggleConfirmOpen(confirmText, 'Xác nhận thay đổi trạng thái');
  if (!confirmed) {
    if (inputEl) inputEl.checked = currentActive;
    return;
  }

  try {
    var res = await apiAdminToggleCategory(id, nextActive);
    if (res && res.ok) {
      catRender();
      return;
    }

    if (inputEl) inputEl.checked = currentActive;
    var errMsg = (res && res.data && (res.data.message || res.data.error)) ? (res.data.message || res.data.error) : '';
    if (res && res.status === 400 && errMsg === 'Category has active tours, cannot be disabled') {
      showToast('❌ Không thể ẩn danh mục đang có tour hoạt động');
    } else {
      showToast('❌ ' + (errMsg || 'Không thể cập nhật trạng thái danh mục'));
    }
    return;
  } catch (e) { }

  if (inputEl) inputEl.checked = currentActive;
  showToast('❌ Không thể cập nhật trạng thái danh mục');
}

// Render
async function catRender() {
  var tbody = document.getElementById('catTableBody');
  var footer = document.getElementById('catTableFooter');
  if (!tbody) return;

  var cats = [];

  // Thử API
  try {
    var res = await apiAdminGetCategories();
    if (res && res.ok && res.data.result) {
      cats = res.data.result.categories || res.data.result || [];
      CAT_API_CACHE = cats;
    }
  } catch (e) { }

  // Fallback local
  if (!cats.length) cats = catGetAll();

  var q = (document.getElementById('catSearch')?.value || '').toLowerCase();
  if (q) cats = cats.filter(function (c) { return c.name.toLowerCase().includes(q); });

  var total = cats.length;
  var start = (CAT_PAGE - 1) * CAT_PER;
  var paged = cats.slice(start, start + CAT_PER);

  if (!paged.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:32px">Chưa có danh mục nào</td></tr>';
    if (footer) footer.innerHTML = '';
    return;
  }

  tbody.innerHTML = paged.map(function (c, i) {
    var id = c._id || c.id;
    var thumb = c.thumbnail || '../images/vietnam.png';
    var active = typeof c.is_active === 'boolean'
      ? c.is_active
      : (c.active !== false);
    return '<tr>' +
      '<td style="color:#aaa;font-size:0.75rem">' + (start + i + 1) + '</td>' +
      '<td><strong style="font-size:0.83rem">' + (c.name || '—') + '</strong></td>' +
      '<td><img src="' + thumb + '" alt="thumbnail" style="width:72px;height:48px;object-fit:cover;border-radius:8px;border:1px solid #eee" onerror="this.onerror=null;this.src=\'../images/vietnam.png\'" /></td>' +
      '<td style="font-size:0.78rem;color:#888;max-width:280px">' + (c.description || c.desc || '—') + '</td>' +
      '<td><div style="display:flex;align-items:center;gap:8px">' +
      '<label class="afp-toggle" style="transform:scale(.88);transform-origin:left center">' +
      '<input type="checkbox" ' + (active ? 'checked' : '') + ' onchange="catToggle(\'' + id + '\', this)">' +
      '<span class="afp-toggle-slider"></span>' +
      '</label>' +
      '<span style="font-size:0.78rem;font-weight:600;color:' + (active ? '#2d8a4e' : '#888') + '">' + (active ? 'Đang hoạt động' : 'Ngừng hoạt động') + '</span>' +
      '</div></td>' +
      '<td><div style="display:flex;gap:6px">' +
      '<button class="admin-act-btn" data-id="' + id + '" onclick="catShowForm(this.dataset.id)">Sửa</button>' +
      '<button class="admin-act-btn admin-act-btn-red" data-id="' + id + '" onclick="catDelete(this.dataset.id)">Xóa</button>' +
      '</div></td>' +
      '</tr>';
  }).join('');

  // Footer
  var totalPages = Math.max(1, Math.ceil(total / CAT_PER));
  var pages = '';
  for (var p = 1; p <= totalPages; p++) {
    pages += '<button class="admin-page-btn' + (p === CAT_PAGE ? ' active' : '') + '" onclick="CAT_PAGE=' + p + ';catRender()">' + p + '</button>';
  }
  if (footer) footer.innerHTML =
    '<span style="font-size:0.75rem;color:#aaa">Hiển thị ' + (total ? (start + 1) : 0) + ' - ' + (total ? Math.min(start + CAT_PER, total) : 0) + ' / ' + total + ' danh mục</span>' +
    '<div class="admin-pagination">' +
    '<button class="admin-page-btn text" onclick="if(CAT_PAGE>1){CAT_PAGE--;catRender()}">Trước</button>' +
    pages +
    '<button class="admin-page-btn text" onclick="if(CAT_PAGE<' + totalPages + '){CAT_PAGE++;catRender()}">Sau</button>' +
    '</div>';
}

// Load khi switch tab
var _origSwitchTab3 = switchTab;
switchTab = function (name) {
  _origSwitchTab3(name);
  if (name === 'categories') catRender();
};

// ============================================================
// BOOKINGS MANAGEMENT (Admin)
// ============================================================
var ADMIN_BK_PAGE = 1;
var ADMIN_BK_PER = 10;

function adminBkFormatDate(dateInput) {
  if (!dateInput) return '—';
  var d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return String(dateInput).slice(0, 10) || '—';
  }
  var dd = String(d.getDate()).padStart(2, '0');
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var yyyy = d.getFullYear();
  return dd + '/' + mm + '/' + yyyy;
}

function adminBkFormatMoney(value) {
  var n = Number(value);
  if (!isFinite(n) || n < 0) return '—';
  return Math.round(n).toLocaleString('vi-VN') + 'đ';
}

function adminBkGetTourName(b) {
  return (b.tour_snapshot && b.tour_snapshot.tour_name) ||
    b.tourName ||
    b.tour ||
    (b.schedule && b.schedule.tour && b.schedule.tour.name) ||
    '—';
}

function adminBkGetDepartureDate(b) {
  var rawDate = (b.tour_snapshot && b.tour_snapshot.departure_date) ||
    b.date ||
    (b.schedule && b.schedule.departure_date);
  return adminBkFormatDate(rawDate);
}

function adminBkGetCalculatedTotal(b) {
  if (b && b.final_price !== undefined && b.final_price !== null) {
    return adminBkFormatMoney(b.final_price);
  }

  var snapshot = b.tour_snapshot || {};
  var pax = b.passengers || {};

  var adults = Number(pax.adults || 0);
  var children = Number(pax.children || 0);
  var babies = Number(pax.babies || 0);

  var adultPrice = Number(snapshot.price_adult || 0);
  var childPrice = Number(snapshot.price_child || 0);
  var babyPrice = Number(snapshot.price_baby || 0);

  var computedTotal = adultPrice * adults + childPrice * children + babyPrice * babies;
  if (isFinite(computedTotal) && computedTotal > 0) {
    return adminBkFormatMoney(computedTotal);
  }

  var fallback = b.total_price || b.total_amount || b.total || b.price;
  return adminBkFormatMoney(fallback);
}

function adminBkFormatRawMoney(value) {
  var n = Number(value);
  if (!isFinite(n)) return 0;
  return Math.round(n);
}

function adminBkNormalizeBookingStatus(status) {
  if (status === 0 || status === '0' || status === 'upcoming') return 0;
  if (status === 1 || status === '1' || status === 'confirmed') return 1;
  if (status === 2 || status === '2' || status === 'done' || status === 'completed') return 2;
  if (status === 3 || status === '3' || status === 'cancelled') return 3;
  return 0;
}

function adminBkNormalizePaymentStatus(status) {
  var raw = String(status === undefined || status === null ? '' : status).trim().toLowerCase();
  if (status === 1 || status === '1' || raw === 'success' || raw === 'paid') return 1;
  if (status === 3 || status === '3' || raw === 'refunded' || raw === 'refund' || raw === 'done_refund') return 3;
  if (status === 4 || status === '4' || raw === 'refunded_pending' || raw === 'refund_pending' || raw === 'pending_refund' || raw === 'awaiting_refund') return 4;
  return null;
}

function adminBkGetPaymentStatus(booking) {
  var payment = booking && booking.payment ? booking.payment : null;
  var candidates = [
    payment && payment.status,
    payment && payment.status_code,
    payment && payment.statusCode,
    payment && payment.status_name,
    payment && payment.statusName,
    payment && payment.state,
    payment && payment.refund_status,
    payment && payment.refundStatus,
    booking && booking.payment_status,
    booking && booking.paymentStatus,
    booking && booking.payment_state,
    booking && booking.paymentState,
    booking && booking.status_payment,
    booking && booking.statusPayment,
    booking && booking.refund_status,
    booking && booking.refundStatus
  ];

  for (var i = 0; i < candidates.length; i++) {
    if (candidates[i] !== undefined && candidates[i] !== null && candidates[i] !== '') {
      var normalized = adminBkNormalizePaymentStatus(candidates[i]);
      if (normalized !== null) return normalized;
    }
  }

  return null;
}

var ADMIN_BK_BOOKING_OVERRIDES = {};

function adminBkBookingKey(booking) {
  if (!booking) return '';
  return String(booking._id || booking.id || booking.booking_id || booking.bookingId || booking.code || booking.booking_code || '').trim();
}

function adminBkRememberBooking(booking) {
  var key = adminBkBookingKey(booking);
  if (!key) return;
  ADMIN_BK_BOOKING_OVERRIDES[key] = booking;
}

function adminBkMergeBookingOverrides(bookings) {
  return (bookings || []).map(function (booking) {
    var key = adminBkBookingKey(booking);
    if (key && ADMIN_BK_BOOKING_OVERRIDES[key]) {
      return Object.assign({}, booking, ADMIN_BK_BOOKING_OVERRIDES[key]);
    }
    return booking;
  });
}

function adminBkGetStatusText(status) {
  var normalized = adminBkNormalizeBookingStatus(status);
  if (normalized === 1) return 'Đã xác nhận';
  if (normalized === 2) return 'Hoàn thành';
  if (normalized === 3) return 'Đã hủy';
  return 'Chờ thanh toán';
}

function adminBkGetPaymentMethodText(b) {
  var payment = b && b.payment ? b.payment : null;
  var provider = payment && payment.provider !== undefined && payment.provider !== null
    ? payment.provider
    : (b && (b.payment_method || b.paymentMethod || b.payment_type || b.payment_type_name));

  if (provider === 0 || provider === '0' || provider === 'momo') return 'MoMo';
  if (provider === 1 || provider === '1' || provider === 'vnpay') return 'VNPay';
  if (provider === 2 || provider === '2') return 'Chuyển khoản';
  return provider === undefined || provider === null || provider === '' ? '—' : String(provider);
}

function adminBkGetPassengerTotal(b) {
  var pax = (b && b.passengers) || {};
  var adults = Number(pax.adults || 0);
  var children = Number(pax.children || 0);
  var babies = Number(pax.babies || 0);
  return adults + children + babies;
}

function adminBkGetPriceDetailRows(b) {
  var snapshot = (b && b.tour_snapshot) || {};
  var pax = (b && b.passengers) || {};
  var priceDetail = (b && b.price_detail) || {};

  var adultCount = Number(priceDetail.adult_count !== undefined ? priceDetail.adult_count : (pax.adults || 0));
  var childCount = Number(priceDetail.child_count !== undefined ? priceDetail.child_count : (pax.children || 0));
  var babyCount = Number(priceDetail.baby_count !== undefined ? priceDetail.baby_count : (pax.babies || 0));

  var adultPrice = Number(snapshot.price_adult || 0);
  var childPrice = Number(snapshot.price_child || 0);
  var babyPrice = Number(snapshot.price_baby || 0);

  var adultTotal = priceDetail.adult_total !== undefined ? Number(priceDetail.adult_total) : adultPrice * adultCount;
  var childTotal = priceDetail.child_total !== undefined ? Number(priceDetail.child_total) : childPrice * childCount;
  var babyTotal = priceDetail.baby_total !== undefined ? Number(priceDetail.baby_total) : babyPrice * babyCount;
  var discount = Number(priceDetail.discount_amount || 0);
  var finalPrice = b && b.final_price !== undefined && b.final_price !== null ? Number(b.final_price) : (b.total_price || 0);

  return {
    adultCount: adultCount,
    childCount: childCount,
    babyCount: babyCount,
    adultPrice: adultPrice,
    childPrice: childPrice,
    babyPrice: babyPrice,
    adultTotal: adultTotal,
    childTotal: childTotal,
    babyTotal: babyTotal,
    discount: discount,
    couponCode: priceDetail.coupon_code || b.coupon_code || '—',
    finalPrice: finalPrice,
    subtotal: adultTotal + childTotal + babyTotal
  };
}

function adminBkExtractStatusErrorMessage(res, fallback) {
  var defaultMsg = fallback || 'Không thể cập nhật trạng thái đơn hàng';
  if (!res || !res.data) return defaultMsg;
  var data = res.data || {};
  if (data.errors) {
    var first = Array.isArray(data.errors) ? data.errors[0] : Object.values(data.errors)[0];
    if (Array.isArray(first) && first.length) {
      return adminBkTranslateStatusError(first[0].msg || first[0].message || first[0].errorMessage || first[0]);
    }
    if (first && (first.msg || first.message || first.errorMessage)) {
      return adminBkTranslateStatusError(first.msg || first.message || first.errorMessage);
    }
    if (typeof first === 'string') return adminBkTranslateStatusError(first);
  }

  return adminBkTranslateStatusError(data.message || data.error || defaultMsg, defaultMsg);
}

function adminBkTranslateStatusError(msg, fallback) {
  var raw = String(msg || '').trim();
  var defaultMsg = fallback || 'Không thể cập nhật trạng thái đơn hàng';
  if (!raw) return defaultMsg;

  var map = {
    TOUR_NOT_FINISHED_YET: 'Tour chưa kết thúc, không thể đánh dấu hoàn thành.',
    CANNOT_UPDATE_CANCELLED_BOOKING: 'Không thể cập nhật booking đã hủy.',
    CANCELLED_REASON_IS_REQUIRED: 'Vui lòng nhập lý do hủy đơn hàng.',
    BOOKING_NOT_FOUND: 'Không tìm thấy booking.',
    BOOKING_NOT_CANCELLED: 'Chỉ có thể xác nhận hoàn tiền khi booking đã hủy.',
    PAYMENT_NOT_FOUND_OR_INVALID: 'Không tìm thấy giao dịch hợp lệ để xác nhận hoàn tiền.',
    REFUND_CONFIRM_FAILED: 'Không thể xác nhận hoàn tiền.',
    BOOKING_ALREADY_CANCELLED: 'Booking này đã bị hủy rồi.',
    BOOKING_ALREADY_COMPLETED: 'Booking này đã hoàn thành rồi.',
    CANNOT_COMPLETE_BOOKING: 'Không thể đánh dấu hoàn thành booking này.',
    CANNOT_CANCEL_BOOKING: 'Không thể hủy booking này.',
    INVALID_BOOKING_STATUS: 'Trạng thái booking không hợp lệ.',
    BOOKING_STATUS_INVALID: 'Trạng thái booking không hợp lệ.'
  };
  if (map[raw]) return map[raw];

  var lower = raw.toLowerCase();
  if (lower.includes('tour not finished yet')) return 'Tour chưa kết thúc, không thể đánh dấu hoàn thành.';
  if (lower.includes('return date') || lower.includes('ngày về')) return 'Tour chưa kết thúc, không thể đánh dấu hoàn thành.';
  if (lower.includes('not finished') || lower.includes('chưa kết thúc')) return 'Tour chưa kết thúc, không thể đánh dấu hoàn thành.';
  if (lower.includes('cannot update cancelled booking')) return 'Không thể cập nhật booking đã hủy.';
  if (lower.includes('cancelled booking') || lower.includes('booking was cancelled') || lower.includes('đã hủy')) return 'Không thể cập nhật booking đã hủy.';
  if (lower.includes('cancelled reason is required') || lower.includes('cancel reason is required') || lower.includes('lý do hủy')) return 'Vui lòng nhập lý do hủy đơn hàng.';
  if (lower.includes('booking not found')) return 'Không tìm thấy booking.';
  if (lower.includes('booking not cancelled')) return 'Chỉ có thể xác nhận hoàn tiền khi booking đã hủy.';
  if (lower.includes('payment not found') || lower.includes('payment invalid')) return 'Không tìm thấy giao dịch hợp lệ để xác nhận hoàn tiền.';
  if (lower.includes('refund')) return 'Không thể xác nhận hoàn tiền.';
  if (lower.includes('already cancelled')) return 'Booking này đã bị hủy rồi.';
  if (lower.includes('already completed')) return 'Booking này đã hoàn thành rồi.';
  if (lower.includes('complete') && lower.includes('cannot')) return 'Không thể đánh dấu hoàn thành booking này.';
  if (lower.includes('cancel') && lower.includes('cannot')) return 'Không thể hủy booking này.';
  if (lower.includes('invalid status') || lower.includes('status invalid')) return 'Trạng thái booking không hợp lệ.';

  return defaultMsg;
}

var ADMIN_BK_CANCEL_MODAL_RESOLVE = null;

function adminBkEnsureCancelModal() {
  var modal = document.getElementById('adminBkCancelModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'adminBkCancelModal';
  modal.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:100001;background:rgba(0,0,0,.5);padding:16px;';
  modal.innerHTML =
    '<div style="width:min(520px,100%);background:#fff;border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.24);overflow:hidden">' +
    '<div style="padding:14px 16px;border-bottom:1px solid #eef2f7;font-size:1rem;font-weight:800;color:#1f2937">Lý do hủy đơn hàng</div>' +
    '<div style="padding:14px 16px">' +
    '<p style="font-size:.84rem;color:#6b7280;margin-bottom:10px">Vui lòng nhập lý do hủy (bắt buộc):</p>' +
    '<textarea id="adminBkCancelReasonInput" rows="4" placeholder="Nhập lý do hủy..." style="width:100%;border:1.5px solid #e5e7eb;border-radius:10px;padding:10px 12px;font-family:inherit;font-size:.85rem;resize:vertical;outline:none"></textarea>' +
    '<div id="adminBkCancelReasonError" style="display:none;color:#dc2626;font-size:.78rem;margin-top:8px">Vui lòng nhập lý do hủy.</div>' +
    '</div>' +
    '<div style="display:flex;justify-content:flex-end;gap:10px;padding:12px 16px;border-top:1px solid #eef2f7">' +
    '<button type="button" class="admin-act-btn" onclick="adminBkCloseCancelModal()">Hủy</button>' +
    '<button type="button" class="admin-act-btn admin-act-btn-red" onclick="adminBkSubmitCancelModal()">Xác nhận hủy đơn</button>' +
    '</div>' +
    '</div>';

  modal.addEventListener('click', function (e) {
    if (e.target === modal) adminBkCloseCancelModal('');
  });

  document.body.appendChild(modal);
  return modal;
}

function adminBkOpenCancelModal() {
  var modal = adminBkEnsureCancelModal();
  var input = document.getElementById('adminBkCancelReasonInput');
  var err = document.getElementById('adminBkCancelReasonError');
  if (input) input.value = '';
  if (err) err.style.display = 'none';
  modal.style.display = 'flex';
  if (input) input.focus();

  return new Promise(function (resolve) {
    ADMIN_BK_CANCEL_MODAL_RESOLVE = resolve;
  });
}

function adminBkCloseCancelModal(reason) {
  var modal = document.getElementById('adminBkCancelModal');
  if (modal) modal.style.display = 'none';
  if (ADMIN_BK_CANCEL_MODAL_RESOLVE) {
    var resolve = ADMIN_BK_CANCEL_MODAL_RESOLVE;
    ADMIN_BK_CANCEL_MODAL_RESOLVE = null;
    resolve(reason || '');
  }
}

function adminBkSubmitCancelModal() {
  var input = document.getElementById('adminBkCancelReasonInput');
  var err = document.getElementById('adminBkCancelReasonError');
  var reason = (input && input.value ? input.value : '').trim();
  if (!reason) {
    if (err) err.style.display = 'block';
    return;
  }
  if (err) err.style.display = 'none';
  adminBkCloseCancelModal(reason);
}

function adminBkEnsureDetailModal() {
  var modal = document.getElementById('adminBookingDetailModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'adminBookingDetailModal';
  modal.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:100000;background:rgba(0,0,0,.48);padding:16px;';
  modal.innerHTML =
    '<div style="width:min(1040px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.28)">' +
    '<div style="padding:18px 22px;border-bottom:1px solid #eef2f7;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;background:linear-gradient(135deg,#0f3a21,#135d34);color:#fff;border-radius:18px 18px 0 0">' +
    '<div>' +
    '<div style="font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;opacity:.75">Chi tiết đơn hàng</div>' +
    '<div id="adminBookingDetailHeaderCode" style="font-size:1.25rem;font-weight:800;margin-top:4px">—</div>' +
    '<div id="adminBookingDetailHeaderMeta" style="font-size:.86rem;opacity:.85;margin-top:6px">—</div>' +
    '</div>' +
    '<button type="button" onclick="adminBkCloseDetailModal()" style="border:none;background:rgba(255,255,255,.12);color:#fff;width:40px;height:40px;border-radius:12px;font-size:1.3rem;cursor:pointer">×</button>' +
    '</div>' +
    '<div style="padding:18px 22px 22px">' +
    '<div style="display:grid;grid-template-columns:1.2fr .95fr;gap:16px">' +
    '<div style="display:grid;gap:16px">' +
    '<section style="border:1px solid #edf0f3;border-radius:16px;padding:16px;background:#fff">' +
    '<div style="font-size:.78rem;font-weight:800;color:#2b3a46;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Thông tin tour</div>' +
    '<div id="adminBookingDetailTour"></div>' +
    '</section>' +
    '<section style="border:1px solid #edf0f3;border-radius:16px;padding:16px;background:#fff">' +
    '<div style="font-size:.78rem;font-weight:800;color:#2b3a46;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Thông tin khách hàng</div>' +
    '<div id="adminBookingDetailCustomer"></div>' +
    '</section>' +
    '</div>' +
    '<div style="display:grid;gap:16px">' +
    '<section style="border:1px solid #edf0f3;border-radius:16px;padding:16px;background:#fff">' +
    '<div style="font-size:.78rem;font-weight:800;color:#2b3a46;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Hành khách</div>' +
    '<div id="adminBookingDetailPassengers"></div>' +
    '</section>' +
    '<section style="border:1px solid #edf0f3;border-radius:16px;padding:16px;background:#fff">' +
    '<div style="font-size:.78rem;font-weight:800;color:#2b3a46;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Chi tiết giá</div>' +
    '<div id="adminBookingDetailPrice"></div>' +
    '</section>' +
    '</div>' +
    '</div>' +
    '<section style="border:1px solid #edf0f3;border-radius:16px;padding:16px;background:#fff;margin-top:16px">' +
    '<div style="font-size:.78rem;font-weight:800;color:#2b3a46;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Trạng thái và hành động</div>' +
    '<div id="adminBookingDetailStatus"></div>' +
    '</section>' +
    '</div>' +
    '</div>';

  modal.addEventListener('click', function (e) {
    if (e.target === modal) adminBkCloseDetailModal();
  });

  document.body.appendChild(modal);
  return modal;
}

function adminBkCloseDetailModal() {
  var modal = document.getElementById('adminBookingDetailModal');
  if (modal) modal.style.display = 'none';
}

function adminBkEscapeHtml(value) {
  return String(value === undefined || value === null ? '—' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function adminBkStatusBadgeText(status) {
  var normalized = adminBkNormalizeBookingStatus(status);
  if (normalized === 1) return '<span class="nv-badge nv-badge-processing">ĐÃ XÁC NHẬN</span>';
  if (normalized === 2) return '<span class="nv-badge nv-badge-done">HOÀN THÀNH</span>';
  if (normalized === 3) return '<span class="nv-badge nv-badge-urgent">ĐÃ HỦY</span>';
  return '<span class="nv-badge nv-badge-pending">CHỜ THANH TOÁN</span>';
}

async function adminOpenBookingDetail(id) {
  if (!id || id === '—') return;

  var modal = adminBkEnsureDetailModal();
  var headerCode = document.getElementById('adminBookingDetailHeaderCode');
  var headerMeta = document.getElementById('adminBookingDetailHeaderMeta');
  var tourEl = document.getElementById('adminBookingDetailTour');
  var customerEl = document.getElementById('adminBookingDetailCustomer');
  var passengersEl = document.getElementById('adminBookingDetailPassengers');
  var priceEl = document.getElementById('adminBookingDetailPrice');
  var statusEl = document.getElementById('adminBookingDetailStatus');

  if (headerCode) headerCode.textContent = 'Đang tải...';
  if (headerMeta) headerMeta.textContent = 'Vui lòng chờ trong giây lát';
  if (tourEl) tourEl.innerHTML = '<div style="color:#888">Đang tải...</div>';
  if (customerEl) customerEl.innerHTML = '<div style="color:#888">Đang tải...</div>';
  if (passengersEl) passengersEl.innerHTML = '<div style="color:#888">Đang tải...</div>';
  if (priceEl) priceEl.innerHTML = '<div style="color:#888">Đang tải...</div>';
  if (statusEl) statusEl.innerHTML = '<div style="color:#888">Đang tải...</div>';

  if (modal) modal.style.display = 'flex';

  try {
    var res = await apiAdminGetBooking(id);
    var booking = res && res.ok && res.data && res.data.result && res.data.result.booking ? res.data.result.booking : null;
    if (!booking) throw new Error('BOOKING_NOT_FOUND');

    var statusText = adminBkGetStatusText(booking.status);
    var paymentMethod = adminBkGetPaymentMethodText(booking);
    var createdAt = adminBkFormatDate(booking.created_at || booking.createdAt);
    var updatedAt = adminBkFormatDate(booking.updated_at || booking.updatedAt);
    var tourSnapshot = booking.tour_snapshot || {};
    var passengers = booking.passengers || {};
    var contactInfo = booking.contact_info || {};
    var priceRows = adminBkGetPriceDetailRows(booking);
    var totalPassengers = adminBkGetPassengerTotal(booking);

    if (headerCode) headerCode.textContent = booking.booking_code || booking.code || booking._id || '—';
    if (headerMeta) headerMeta.textContent = 'Trạng thái: ' + statusText + ' • Ngày tạo: ' + createdAt + ' • Phương thức thanh toán: ' + paymentMethod;

    if (tourEl) {
      tourEl.innerHTML = '' +
        '<div style="display:grid;gap:8px">' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">Tên tour</span><strong style="text-align:right">' + adminBkEscapeHtml(tourSnapshot.tour_name || '—') + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">Ngày đi</span><strong>' + adminBkEscapeHtml(adminBkFormatDate(tourSnapshot.departure_date)) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">Ngày về</span><strong>' + adminBkEscapeHtml(adminBkFormatDate(tourSnapshot.return_date)) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">Giá người lớn</span><strong>' + adminBkFormatMoney(tourSnapshot.price_adult) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">Giá trẻ em</span><strong>' + adminBkFormatMoney(tourSnapshot.price_child) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">Giá em bé</span><strong>' + adminBkFormatMoney(tourSnapshot.price_baby) + '</strong></div>' +
        '</div>';
    }

    if (customerEl) {
      customerEl.innerHTML = '' +
        '<div style="display:grid;gap:8px">' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">Tên khách</span><strong>' + adminBkEscapeHtml(contactInfo.full_name || '—') + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">Email</span><strong style="text-align:right">' + adminBkEscapeHtml(contactInfo.email || '—') + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">SĐT</span><strong>' + adminBkEscapeHtml(contactInfo.phone || '—') + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">Cập nhật lần cuối</span><strong>' + adminBkEscapeHtml(updatedAt) + '</strong></div>' +
        '</div>';
    }

    if (passengersEl) {
      passengersEl.innerHTML = '' +
        '<div style="display:grid;gap:8px">' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">Người lớn</span><strong>' + (Number(passengers.adults || 0)) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">Trẻ em</span><strong>' + (Number(passengers.children || 0)) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">Em bé</span><strong>' + (Number(passengers.babies || 0)) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;gap:12px;padding-top:8px;border-top:1px solid #eef2f7"><span style="color:#667085">Tổng người</span><strong>' + totalPassengers + '</strong></div>' +
        '</div>';
    }

    if (priceEl) {
      var priceDetail = booking.price_detail || {};
      priceEl.innerHTML = '' +
        '<div style="display:grid;gap:8px">' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">Người lớn</span><strong>' + adminBkFormatMoney(priceRows.adultTotal) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">Trẻ em</span><strong>' + adminBkFormatMoney(priceRows.childTotal) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">Em bé</span><strong>' + adminBkFormatMoney(priceRows.babyTotal) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">Tổng</span><strong>' + adminBkFormatMoney(priceRows.subtotal) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">Giảm giá (' + adminBkEscapeHtml(priceRows.couponCode) + ')</span><strong style="color:#c00">- ' + adminBkFormatMoney(priceRows.discount) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;gap:12px;padding-top:8px;border-top:1px solid #eef2f7"><span style="color:#667085">Thanh toán</span><strong style="color:#2d8a4e;font-size:1.05rem">' + adminBkFormatMoney(booking.final_price) + '</strong></div>' +
        '</div>';
    }

    if (statusEl) {
      var bookingStatus = adminBkNormalizeBookingStatus(booking.status);
      var paymentStatus = adminBkGetPaymentStatus(booking);
      var canConfirm = bookingStatus === 0;
      var canComplete = bookingStatus === 1;
      var canCancel = bookingStatus !== 2 && bookingStatus !== 3;
      var canConfirmRefund = bookingStatus === 3 && paymentStatus === 4;
      var statusHtml = '' +
        '<div style="display:grid;gap:10px">' +
        '<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><span style="color:#667085">Trạng thái hiện tại</span><span>' + adminBkStatusBadgeText(booking.status) + '</span></div>' +
        (bookingStatus === 3 ? '<div style="display:grid;gap:8px"><div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#667085">Lý do hủy</span><strong style="text-align:right;color:#b42318">' + adminBkEscapeHtml(booking.cancelled_reason || '—') + '</strong></div></div>' : '') +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;padding-top:4px">' +
        (canConfirm ? '<button class="admin-act-btn admin-act-btn-green" data-id="' + (booking._id || id) + '" data-status="1" onclick="event.stopPropagation(); adminBkUpdateStatus(this)">✓ Xác nhận</button>' : '') +
        (canComplete ? '<button class="admin-act-btn" data-id="' + (booking._id || id) + '" data-status="2" onclick="event.stopPropagation(); adminBkUpdateStatus(this)">✅ Hoàn thành</button>' : '') +
        (canCancel ? '<button class="admin-act-btn admin-act-btn-red" data-id="' + (booking._id || id) + '" data-status="3" onclick="event.stopPropagation(); adminBkCancel(this)">✕ Hủy</button>' : '') +
        (canConfirmRefund ? '<button class="admin-act-btn" data-id="' + (booking._id || id) + '" onclick="event.stopPropagation(); adminBkConfirmRefund(this)">💸 Đã hoàn tiền</button>' : '') +
        '</div>' +
        '</div>';
      statusEl.innerHTML = statusHtml;
    }
  } catch (e) {
    if (headerCode) headerCode.textContent = 'Không thể tải chi tiết booking';
    if (headerMeta) headerMeta.textContent = 'Vui lòng thử lại sau';
    if (tourEl) tourEl.innerHTML = '<div style="color:#b42318">Không thể tải dữ liệu booking.</div>';
    if (customerEl) customerEl.innerHTML = '<div style="color:#b42318">Không thể tải dữ liệu booking.</div>';
    if (passengersEl) passengersEl.innerHTML = '<div style="color:#b42318">Không thể tải dữ liệu booking.</div>';
    if (priceEl) priceEl.innerHTML = '<div style="color:#b42318">Không thể tải dữ liệu booking.</div>';
    if (statusEl) statusEl.innerHTML = '<div style="color:#b42318">Không thể tải dữ liệu booking.</div>';
  }
}

async function adminBkRender() {
  var tbody = document.getElementById('adminBkBody');
  var footer = document.getElementById('adminBkFooter');
  if (!tbody) return;

  var search = (document.getElementById('adminBkSearch')?.value || '').trim();
  var status = document.getElementById('adminBkStatus')?.value || '';

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:32px">Đang tải...</td></tr>';

  var bookings = [];

  // Thử API GET /api/bookings
  try {
    var params = { page: ADMIN_BK_PAGE, limit: ADMIN_BK_PER };
    if (search) params.keyword = search;
    if (status) params.status = parseInt(status);
    var res = await apiAdminGetBookings(params);
    if (res && res.ok && res.data.result) {
      bookings = res.data.result.bookings || res.data.result || [];
      bookings = adminBkMergeBookingOverrides(bookings);
      var pag = res.data.result.pagination;
      if (pag && footer) adminBkPagination(pag.total, footer);
    }
  } catch (e) { }

  // Fallback localStorage
  if (!bookings.length) {
    var db = [];
    try { db = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]'); } catch (e) { }
    db.forEach(function (u) {
      try {
        var bks = JSON.parse(localStorage.getItem('vt_bookings_' + u.email) || '[]');
        bks.forEach(function (b) { bookings.push({ ...b, _user: u.name || u.email }); });
      } catch (e) { }
    });

    // Filter
    if (search) {
      var q = search.toLowerCase();
      bookings = bookings.filter(function (b) {
        return (b.booking_code || b.code || '').toLowerCase().includes(q) ||
          (b._user || '').toLowerCase().includes(q) ||
          adminBkGetTourName(b).toLowerCase().includes(q);
      });
    }
    if (status) {
      var stMap = { '0': 'upcoming', '1': 'confirmed', '2': 'done', '3': 'cancelled' };
      var stVal = stMap[status];
      bookings = bookings.filter(function (b) { return (b.status || 'upcoming') === stVal; });
    }

    var total = bookings.length;
    var start = (ADMIN_BK_PAGE - 1) * ADMIN_BK_PER;
    bookings = bookings.slice(start, start + ADMIN_BK_PER);
    if (footer) adminBkPagination(total, footer);
  }

  if (!bookings.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:40px">Chưa có đơn hàng nào</td></tr>';
    return;
  }

  var statusMap = {
    0: '<span class="nv-badge nv-badge-pending">CHỜ THANH TOÁN</span>',
    1: '<span class="nv-badge nv-badge-processing">ĐÃ XÁC NHẬN</span>',
    2: '<span class="nv-badge nv-badge-done">HOÀN THÀNH</span>',
    3: '<span class="nv-badge nv-badge-urgent">ĐÃ HỦY</span>',
    upcoming: '<span class="nv-badge nv-badge-pending">SẮP DIỄN RA</span>',
    confirmed: '<span class="nv-badge nv-badge-processing">ĐÃ XÁC NHẬN</span>',
    done: '<span class="nv-badge nv-badge-done">HOÀN THÀNH</span>',
    completed: '<span class="nv-badge nv-badge-done">HOÀN THÀNH</span>',
    cancelled: '<span class="nv-badge nv-badge-urgent">ĐÃ HỦY</span>',
  };

  tbody.innerHTML = bookings.map(function (b) {
    var id = b._id || b.code || '—';
    var code = b.booking_code || b.code || '—';
    var user = b._user || (b.contact_info && b.contact_info.full_name) || '—';
    var tour = adminBkGetTourName(b);
    var date = adminBkGetDepartureDate(b);
    var total = adminBkGetCalculatedTotal(b);
    var stRaw = b.status;
    var st = adminBkNormalizeBookingStatus(stRaw);
    var paymentStatus = adminBkGetPaymentStatus(b);
    var badge = statusMap[stRaw] || statusMap['upcoming'];
    var canConfirm = st === 0;
    var canComplete = st === 1;
    var canCancel = st !== 2 && st !== 3;
    var canConfirmRefund = st === 3 && paymentStatus === 4;

    var actions = '<div style="display:flex;gap:5px;flex-wrap:wrap">';
    if (canConfirm) actions += '<button class="admin-act-btn admin-act-btn-green" data-id="' + id + '" data-status="1" onclick="event.stopPropagation(); adminBkUpdateStatus(this)">✓ Xác nhận</button>';
    if (canComplete) actions += '<button class="admin-act-btn" data-id="' + id + '" data-status="2" onclick="event.stopPropagation(); adminBkUpdateStatus(this)">✅ Hoàn thành</button>';
    if (canCancel) actions += '<button class="admin-act-btn admin-act-btn-red" data-id="' + id + '" data-status="3" onclick="event.stopPropagation(); adminBkCancel(this)">✕ Hủy</button>';
    if (canConfirmRefund) actions += '<button class="admin-act-btn" data-id="' + id + '" onclick="event.stopPropagation(); adminBkConfirmRefund(this)">💸 Đã hoàn tiền</button>';
    actions += '</div>';

    return '<tr data-id="' + adminBkEscapeHtml(id) + '" onclick="adminOpenBookingDetail(this.dataset.id)" style="cursor:pointer">' +
      '<td style="font-weight:700;color:#2d8a4e;font-size:0.8rem">' + code + '</td>' +
      '<td style="font-size:0.8rem;font-weight:600">' + user + '</td>' +
      '<td style="font-size:0.78rem;color:#555;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + tour + '</td>' +
      '<td style="font-size:0.78rem;color:#888;white-space:nowrap">' + date + '</td>' +
      '<td style="font-weight:700;color:#2d8a4e;font-size:0.8rem;white-space:nowrap">' + total + '</td>' +
      '<td>' + badge + '</td>' +
      '<td>' + actions + '</td>' +
      '</tr>';
  }).join('');
}

function adminBkPagination(total, footer) {
  var totalPages = Math.max(1, Math.ceil(total / ADMIN_BK_PER));
  var from = total ? ((ADMIN_BK_PAGE - 1) * ADMIN_BK_PER + 1) : 0;
  var to = total ? Math.min(ADMIN_BK_PAGE * ADMIN_BK_PER, total) : 0;
  var pages = '';
  for (var p = 1; p <= Math.min(totalPages, 5); p++) {
    pages += '<button class="admin-page-btn' + (p === ADMIN_BK_PAGE ? ' active' : '') + '" onclick="ADMIN_BK_PAGE=' + p + ';adminBkRender()">' + p + '</button>';
  }
  footer.innerHTML =
    '<span style="font-size:0.75rem;color:#aaa">Hiển thị ' + from + ' - ' + to + ' / ' + total + ' đơn hàng</span>' +
    '<div class="admin-pagination">' +
    '<button class="admin-page-btn text" onclick="if(ADMIN_BK_PAGE>1){ADMIN_BK_PAGE--;adminBkRender()}">Trước</button>' +
    pages +
    '<button class="admin-page-btn text" onclick="if(ADMIN_BK_PAGE<' + totalPages + '){ADMIN_BK_PAGE++;adminBkRender()}">Sau</button>' +
    '</div>';
}

// PATCH /api/bookings/:id/status
async function adminBkUpdateStatus(btn) {
  var id = btn.dataset.id;
  var status = parseInt(btn.dataset.status);
  var labels = { 1: 'xác nhận', 2: 'hoàn thành' };
  var buttonLabel = status === 2 ? 'Hoàn thành tour' : 'Xác nhận đơn hàng';
  var bookingConfirmed = await adminOpenConfirmModal('Xác nhận ' + (labels[status] || 'cập nhật') + ' đơn hàng này?', buttonLabel);
  if (!bookingConfirmed) return;
  btn.disabled = true; btn.textContent = '...';

  try {
    var res = await apiAdminUpdateBookingStatus(id, status);
    if (res && res.ok) {
      var updatedBooking = res.data && res.data.result && res.data.result.booking
        ? res.data.result.booking
        : (res.data && res.data.booking ? res.data.booking : null);
      if (updatedBooking) adminBkRememberBooking(updatedBooking);
      if (status === 2) {
        showToast('✅ Đã đánh dấu tour hoàn thành');
      } else {
        showToast('✅ Đã xác nhận đơn hàng');
      }
      adminBkRender();
      return;
    }

    showToast('❌ ' + adminBkExtractStatusErrorMessage(res, status === 2 ? 'Không thể đánh dấu tour hoàn thành' : 'Không thể xác nhận đơn hàng'));
  } catch (e) {
    showToast('❌ Không thể kết nối server');
  }

  btn.disabled = false;
  btn.textContent = status === 2 ? '✅ Hoàn thành' : '✓ Xác nhận';
  adminBkRender();
}

async function adminBkCancel(btn) {
  var id = btn.dataset.id;
  var reason = await adminBkOpenCancelModal();
  if (!reason) { showToast('⚠️ Vui lòng nhập lý do hủy'); return; }
  btn.disabled = true; btn.textContent = '...';

  try {
    var res = await apiAdminUpdateBookingStatus(id, 3, reason);
    if (res && res.ok) {
      var cancelledBooking = res.data && res.data.result && res.data.result.booking
        ? res.data.result.booking
        : (res.data && res.data.booking ? res.data.booking : null);
      if (cancelledBooking) adminBkRememberBooking(cancelledBooking);
      showToast('✅ Đã hủy đơn hàng');
      adminBkRender();
      return;
    }

    showToast('❌ ' + adminBkExtractStatusErrorMessage(res, 'Không thể hủy đơn hàng'));
  } catch (e) {
    showToast('❌ Không thể kết nối server');
  }

  btn.disabled = false;
  btn.textContent = '✕ Hủy';
  adminBkRender();
}

async function adminBkConfirmRefund(btn) {
  var id = btn.dataset.id;
  var confirmed = await adminOpenConfirmModal(
    'Xác nhận rằng booking này đã được hoàn tiền thủ công?',
    'Đã hoàn tiền'
  );
  if (!confirmed) return;

  btn.disabled = true;
  btn.textContent = '...';

  try {
    var res = await apiAdminConfirmBookingRefund(id);
    if (res && res.ok) {
      var refundedBooking = res.data && res.data.result && res.data.result.booking
        ? res.data.result.booking
        : (res.data && res.data.booking ? res.data.booking : null);
      if (refundedBooking) adminBkRememberBooking(refundedBooking);
      showToast('✅ Đã cập nhật trạng thái hoàn tiền');
      adminBkRender();
      return;
    }

    showToast('❌ ' + adminBkExtractStatusErrorMessage(res, 'Không thể xác nhận hoàn tiền'));
  } catch (e) {
    showToast('❌ Không thể kết nối server');
  }

  btn.disabled = false;
  btn.textContent = '💸 Đã hoàn tiền';
  adminBkRender();
}

function adminBkUpdateLocal(idOrCode, status) {
  var stStr = { 0: 'upcoming', 1: 'confirmed', 2: 'completed', 3: 'cancelled' }[status] || 'upcoming';
  var db = [];
  try { db = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]'); } catch (e) { }
  db.forEach(function (u) {
    var key = 'vt_bookings_' + u.email;
    try {
      var bks = JSON.parse(localStorage.getItem(key) || '[]');
      var changed = false;
      bks.forEach(function (b) {
        if (b._id === idOrCode || b.code === idOrCode) { b.status = stStr; changed = true; }
      });
      if (changed) localStorage.setItem(key, JSON.stringify(bks));
    } catch (e) { }
  });
}

// Gọi khi switch tab
var _origSwitchTab4 = switchTab;
switchTab = function (name) {
  _origSwitchTab4(name);
  if (name === 'bookings') adminBkRender();
};


// ============================================================
// DELETE TOUR – DELETE /api/tours/:id
// ============================================================
async function adminDeleteTour(btn) {
  var id = btn.dataset.id;
  var idx = parseInt(btn.dataset.idx);
  var tours = adminGetTours();
  var tour = tours[idx];
  var name = tour ? (tour.name || 'tour này') : 'tour này';

  var deleteTourConfirmed = await adminOpenConfirmModal(
    'Xóa tour "' + name + '"? Không thể xóa nếu còn booking liên quan.',
    'Xác nhận xóa tour'
  );
  if (!deleteTourConfirmed) return;

  btn.disabled = true; btn.textContent = '...';

  // Gọi API DELETE /api/tours/:id
  try {
    var res = await apiDeleteTour(id);
    if (res && res.ok) {
      showToast('Đã xóa tour: ' + name);
      adminRenderTours();
      return;
    }
    if (res && res.status === 400) {
      showToast('❌ ' + (res.data?.message || 'Không thể xóa: còn booking liên quan'));
      btn.disabled = false; btn.textContent = '🗑️ Xóa';
      return;
    }
  } catch (e) { }

  // Fallback: xóa khỏi localStorage
  var updated = tours.filter(function (t, i) { return i !== idx; });
  adminSaveTours(updated);
  showToast('Đã xóa tour: ' + name);
  adminRenderTours();
}

// ============================================================
// THỐNG KÊ – Kết nối API thật
// ============================================================
var STATS_PERIOD = 'month';

async function adminLoadStats(period) {
  STATS_PERIOD = period || 'month';

  // Map period button value sang API param
  var periodMap = { 'today': 'today', 'week': 'week', 'month': 'month', 'year': 'year' };
  var apiPeriod = periodMap[period] || 'month';

  await Promise.all([
    adminLoadStatsOverview(apiPeriod),
    adminLoadStatsRevenue(apiPeriod),
    adminLoadTopTours(apiPeriod),
  ]);
}

// GET /api/admin/stats/overview
async function adminLoadStatsOverview(period) {
  try {
    var res = await apiGetStatsOverview(period);
    if (res && res.ok && res.data.result) {
      var r = res.data.result;
      var totalRevenue = Number(r.revenue ?? r.total_revenue ?? 0) || 0;
      var refunded = Number(r.refund ?? r.total_refunded ?? r.total_refund ?? r.refunded_amount ?? r.refund_amount ?? 0) || 0;
      var netRevenue = Number(r.net_revenue ?? (totalRevenue - refunded)) || 0;

      // Doanh thu
      var el = document.getElementById('statRevenue');
      if (el) el.textContent = totalRevenue.toLocaleString('vi-VN') + 'đ';

      var refundEl = document.getElementById('statRefunded');
      if (refundEl) refundEl.textContent = refunded.toLocaleString('vi-VN') + 'đ';

      var netRevenueEl = document.getElementById('statNetRevenue');
      if (netRevenueEl) netRevenueEl.textContent = netRevenue.toLocaleString('vi-VN') + 'đ';

      // Đơn hàng
      var totalBookings = Number(r.bookings ?? r.total_bookings ?? 0) || 0;
      var bk = document.getElementById('statTotalBookings');
      if (bk) bk.textContent = totalBookings.toLocaleString('vi-VN');

      // Người dùng mới
      var newUsers = Number(r.new_users || 0) || 0;
      var userEl = document.getElementById('statNewUsers');
      if (userEl) userEl.textContent = newUsers.toLocaleString('vi-VN');

      var cancelRate = Number(r.cancel_rate ?? r.cancellation_rate ?? 0) || 0;
      var cancelRateEl = document.getElementById('statCancelRate');
      if (cancelRateEl) {
        cancelRateEl.textContent = cancelRate.toLocaleString('vi-VN') + '%';
        adminSetCancelRateTone(cancelRateEl, cancelRate);
      }

      adminApplyOverviewBadgeRules({
        revenue: totalRevenue,
        refund: refunded,
        net_revenue: netRevenue,
        bookings: totalBookings,
        new_users: newUsers,
        cancel_rate: cancelRate
      });

      return;
    }
  } catch (e) { }

  // Fallback: tính từ localStorage
  adminLoadStatsFallback();
}

function adminSetChange(kpiId, pct) {
  var statusMap = {
    ok: 'OK',
    low: 'LOW',
    warning: 'WARNING',
    danger: 'DANGER',
    empty: 'EMPTY'
  };
  if (typeof pct === 'string') {
    var cardS = document.getElementById(kpiId)?.closest('.stats-kpi-card');
    if (!cardS) return;
    var badgeS = cardS.querySelector('.stats-kpi-change');
    if (!badgeS) return;
    var status = String(pct || 'empty').toLowerCase();
    if (!statusMap[status]) status = 'empty';
    badgeS.textContent = statusMap[status];
    badgeS.className = 'stats-kpi-change ' + status;
    return;
  }

  var card = document.getElementById(kpiId)?.closest('.stats-kpi-card');
  if (!card) return;
  var badge = card.querySelector('.stats-kpi-change');
  if (!badge) return;
  if (pct === undefined || pct === null) { badge.textContent = '—'; badge.className = 'stats-kpi-change neutral'; return; }
  var sign = pct >= 0 ? '+' : '';
  badge.textContent = sign + Math.round(pct) + '%';
  badge.className = 'stats-kpi-change ' + (pct >= 0 ? 'up' : 'down');
}

function adminApplyOverviewBadgeRules(data) {
  var d = data || {};
  var rules = {
    revenue: d.revenue === 0 ? 'empty' : 'ok',
    refund: d.refund > 0 ? 'warning' : 'ok',
    net: d.net_revenue < 0 ? 'danger' : 'ok',
    bookings: d.bookings === 0 ? 'empty' : (d.bookings < 3 ? 'low' : 'ok'),
    users: d.new_users === 0 ? 'low' : 'ok',
    cancel: d.cancel_rate > 30 ? 'danger' : (d.cancel_rate > 15 ? 'warning' : 'ok')
  };

  adminSetChange('statRevenue', rules.revenue);
  adminSetChange('statRefunded', rules.refund);
  adminSetChange('statNetRevenue', rules.net);
  adminSetChange('statTotalBookings', rules.bookings);
  adminSetChange('statNewUsers', rules.users);
  adminSetChange('statCancelRate', rules.cancel);
}

function adminSetCancelRateTone(el, cancelRate) {
  if (!el) return;
  var rate = Number(cancelRate) || 0;
  el.style.fontWeight = '800';
  if (rate < 20) el.style.color = '#2d8a4e';
  else if (rate <= 40) el.style.color = '#c9963a';
  else el.style.color = '#dc2626';
}

// GET /api/admin/stats/revenue
async function adminLoadStatsRevenue(period) {
  try {
    var res = await apiGetStatsRevenue(period, new Date().getFullYear());
    var result = (res && res.ok && res.data && res.data.result) ? res.data.result : null;
    if (result && (Array.isArray(result.chart_data) || Array.isArray(result.chart_result))) {
      var chartData = result.chart_data || result.chart_result;
      adminDrawRevenueChart(chartData);
      adminDrawBookingChart(chartData);
      return;
    }
  } catch (e) { }

  // Fallback: tính từ localStorage bookings
  var allBks = adminGetAllBookingsLocal();
  if (allBks.length) adminDrawRevenueChartLocal(allBks);
  else adminDrawRevenueChart([]);
}

function adminDrawRevenueChart(data) {
  var canvas = document.getElementById('statsRevenueChart');
  var empty = document.getElementById('statsRevenueEmpty');
  var meta = document.getElementById('statsRevenueMeta');
  if (!canvas) return;

  var raw = Array.isArray(data) ? data : [];
  var series = raw.map(function (item, idx) {
    return {
      date: item.date || item.period || ('Mốc ' + (idx + 1)),
      revenue: Number(item.revenue || 0) || 0,
      refunds: Number(item.refunds || item.refund || 0) || 0,
      net_revenue: Number(item.net_revenue ?? item.revenue ?? 0) || 0,
      bookings: Number(item.bookings || 0) || 0
    };
  });

  series.sort(function (a, b) {
    return String(a.date).localeCompare(String(b.date));
  });

  var labels = series.map(function (item) { return dashFormatShortDateLabel(item.date); });
  var revenueData = series.map(function (item) { return item.revenue; });
  var refundData = series.map(function (item) { return item.refunds; });
  var netData = series.map(function (item) { return item.net_revenue; });

  if (meta) meta.textContent = labels.length ? (labels[0] + ' → ' + labels[labels.length - 1]) : 'Chưa có dữ liệu';
  if (empty) empty.style.display = series.length ? 'none' : 'flex';

  if (statsRevenueChart) {
    statsRevenueChart.destroy();
    statsRevenueChart = null;
  }

  if (!series.length) return;

  if (meta) meta.textContent = labels[0] + ' → ' + labels[labels.length - 1];

  statsRevenueChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Doanh thu',
          data: revenueData,
          tension: 0.35,
          borderWidth: 3,
          borderColor: '#2d8a4e',
          pointBackgroundColor: '#2d8a4e',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          backgroundColor: 'rgba(45, 138, 78, 0.12)'
        },
        {
          label: 'Hoàn tiền',
          data: refundData,
          tension: 0.35,
          borderWidth: 2,
          borderColor: '#dc2626',
          pointBackgroundColor: '#dc2626',
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: false
        },
        {
          label: 'Doanh thu ròng',
          data: netData,
          tension: 0.35,
          borderWidth: 3,
          borderColor: '#111827',
          pointBackgroundColor: function (ctx) {
            var y = ctx.raw;
            return y < 0 ? '#dc2626' : '#111827';
          },
          pointBorderColor: function (ctx) {
            var y = ctx.raw;
            return y < 0 ? '#dc2626' : '#111827';
          },
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom' },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return ctx.raw.toLocaleString('vi-VN') + 'đ';
            },
            afterBody: function (items) {
              if (!items || !items.length) return '';
              var i = items[0].dataIndex;
              var refunds = series[i] ? series[i].refunds : 0;
              var bookings = series[i] ? series[i].bookings : 0;
              return [
                'Hoàn tiền: ' + refunds.toLocaleString('vi-VN') + 'đ',
                'Bookings: ' + bookings.toLocaleString('vi-VN')
              ];
            }
          }
        }
      },
      scales: {
        y: { ticks: { callback: function (value) { return value.toLocaleString('vi-VN'); } } }
      }
    }
  });
}

function adminDrawRevenueChartLocal(bookings) {
  var local = adminBuildLocalStatsSeries(bookings || []);
  if (local.revenueSeries.length) adminDrawRevenueChart(local.revenueSeries);
  if (local.bookingChart.labels.length) adminDrawBookingChart(local.bookingChart);
}

function adminDrawBookingChart(chartData) {
  var canvas = document.getElementById('statsBookingChart');
  var empty = document.getElementById('statsBookingEmpty');
  var meta = document.getElementById('statsBookingMeta');
  if (!canvas) return;

  var raw = [];
  if (Array.isArray(chartData)) raw = chartData;
  else if (chartData && Array.isArray(chartData.chart_data)) raw = chartData.chart_data;
  else if (chartData && Array.isArray(chartData.chart_result)) raw = chartData.chart_result;

  if (!raw.length && chartData && Array.isArray(chartData.labels)) {
    raw = chartData.labels.map(function (label, idx) {
      return {
        date: label,
        bookings: Number((chartData.bookings || [])[idx] || 0) || 0,
        cancelled: Number((chartData.cancelled || [])[idx] || 0) || 0
      };
    });
  }

  var series = raw.map(function (item, idx) {
    return {
      date: item.date || item.period || ('Mốc ' + (idx + 1)),
      bookings: Number(item.bookings || 0) || 0,
      cancelled: Number(item.cancelled || 0) || 0
    };
  });

  series.sort(function (a, b) {
    return String(a.date).localeCompare(String(b.date));
  });

  var labels = series.map(function (item) { return dashFormatShortDateLabel(item.date); });
  var bookings = series.map(function (item) { return item.bookings; });
  var cancelled = series.map(function (item) { return item.cancelled; });
  var hasData = labels.length > 0 && (bookings.some(function (value) { return value > 0; }) || cancelled.some(function (value) { return value > 0; }));

  if (meta) meta.textContent = hasData ? (labels[0] + ' → ' + labels[labels.length - 1]) : 'Chưa có dữ liệu';
  if (empty) empty.style.display = hasData ? 'none' : 'flex';

  if (statsBookingChart) {
    statsBookingChart.destroy();
    statsBookingChart = null;
  }

  if (!hasData) return;

  statsBookingChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Thành công',
          data: bookings,
          backgroundColor: '#3a7abf',
          borderRadius: 8
        },
        {
          label: 'Đã hủy',
          data: cancelled,
          backgroundColor: '#dc2626',
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: false
        },
        y: { beginAtZero: true, ticks: { precision: 0 } }
      },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            afterBody: function (items) {
              if (!items || !items.length) return '';
              var index = items[0].dataIndex;
              var total = dashNumber(bookings[index], 0);
              var cancel = dashNumber(cancelled[index], 0);
              var rate = total > 0 ? (cancel / total) * 100 : 0;
              return 'Tỷ lệ huỷ: ' + rate.toFixed(1) + '%';
            }
          }
        }
      }
    }
  });
}

function adminBuildLocalStatsSeries(bookings) {
  var byMonth = {};
  bookings.forEach(function (b) {
    var d = (b.createdAt || b.date || '').slice(0, 7);
    if (!d) return;
    if (!byMonth[d]) byMonth[d] = { date: d, revenue: 0, bookings: 0, cancelled: 0 };
    var price = parseInt(String(b.total || b.price || '0').replace(/[^0-9]/g, '')) || 0;
    var isCancelled = b.status === 'cancelled' || b.status === 3;
    if (isCancelled) {
      byMonth[d].cancelled += 1;
      return;
    }
    byMonth[d].revenue += price;
    byMonth[d].bookings += 1;
  });

  var data = Object.values(byMonth || {}).sort(function (a, b) { return a.date.localeCompare(b.date); }).slice(-12);
  return {
    revenueSeries: data.map(function (item) {
      return { date: item.date, revenue: item.revenue, bookings: item.bookings };
    }),
    bookingChart: {
      labels: data.map(function (item) { return item.date; }),
      revenues: data.map(function (item) { return item.revenue; }),
      bookings: data.map(function (item) { return item.bookings; }),
      cancelled: data.map(function (item) { return item.cancelled; })
    }
  };
}

// GET /api/admin/stats/top-tours
async function adminLoadTopTours(period) {
  var listEl = document.getElementById('statsToursList');
  var metaEl = document.getElementById('statsTopToursMeta');
  if (!listEl) return;

  var topToursPeriod = period === 'today' ? 'week' : period;

  var tours = [];
  try {
    var res = await apiGetTopTours(topToursPeriod, 10);
    if (res && res.ok && res.data.result && res.data.result.tours) {
      tours = res.data.result.tours;
    }
  } catch (e) { }

  // Fallback từ localStorage
  if (!tours.length) {
    var allBks = adminGetAllBookingsLocal();
    var tourMap = {};
    allBks.forEach(function (b) {
      if (b.status === 'cancelled' || b.status === 3) return; // bỏ qua đã hủy
      var name = b.tourName || b.tour || '—';
      if (!tourMap[name]) tourMap[name] = { name: name, booking_count: 0, revenue: 0 };
      tourMap[name].booking_count++;
      tourMap[name].revenue += parseInt(String(b.total || b.price || '0').replace(/[^0-9]/g, '')) || 0;
    });
    tours = Object.values(tourMap || {}).sort(function (a, b) { return b.booking_count - a.booking_count; }).slice(0, 10);
  }

  if (!tours.length) {
    listEl.innerHTML = '<div class="stats-tours-empty"><p>Chưa có dữ liệu</p></div>';
    if (metaEl) metaEl.textContent = 'Chưa có dữ liệu';
    return;
  }

  if (metaEl) metaEl.textContent = 'Hiển thị ' + tours.length + ' tour';

  listEl.innerHTML = tours.map(function (t, i) {
    var pctVal = Number(t.percent);
    var pctText = Number.isFinite(pctVal)
      ? (pctVal % 1 === 0 ? pctVal.toFixed(0) : pctVal.toFixed(2)) + '%'
      : '—';
    return '<div class="stats-tour-row">' +
      '<div class="stats-tour-rank">' + (i + 1) + '</div>' +
      '<div class="stats-tour-name">' + (t.name || t.tour_id || '—') + '</div>' +
      '<div class="stats-tour-stat">' + (t.booking_count || 0) + '</div>' +
      '<div class="stats-tour-stat" style="color:#2d8a4e">' + (t.revenue || 0).toLocaleString('vi-VN') + 'đ</div>' +
      '<div class="stats-tour-stat">' + pctText + '</div>' +
      '</div>';
  }).join('');
}

// Lấy tất cả bookings từ localStorage (fallback)
function adminGetAllBookingsLocal() {
  var all = [];
  try {
    var db = JSON.parse(localStorage.getItem('vt_userdb') || '[]');
    db.forEach(function (u) {
      try {
        var bks = JSON.parse(localStorage.getItem('vt_bookings_' + u.email) || '[]');
        all = all.concat(bks);
      } catch (e) { }
    });
  } catch (e) { }
  return all;
}

function adminGetLocalUserCount() {
  try {
    var db = JSON.parse(localStorage.getItem('vt_userdb') || sessionStorage.getItem('vt_userdb') || '[]');
    return Array.isArray(db) ? db.length : 0;
  } catch (e) {
    return 0;
  }
}

// Fallback stats từ localStorage
function adminLoadStatsFallback() {
  var all = adminGetAllBookingsLocal();
  var users = adminGetLocalUserCount();
  // Chỉ tính booking chưa hủy
  var active = all.filter(function (b) { return b.status !== 'cancelled' && b.status !== 3; });
  var grossRevenue = 0;
  var refunded = 0;
  active.forEach(function (b) {
    grossRevenue += parseInt(String(b.total || b.price || '0').replace(/[^0-9]/g, '')) || 0;
  });
  all.forEach(function (b) {
    refunded += parseInt(String(b.refund_amount || b.refund || '0').replace(/[^0-9]/g, '')) || 0;
  });
  var netRevenue = grossRevenue - refunded;
  var cancelled = all.length - active.length;
  var cancelRate = all.length ? (cancelled / all.length) * 100 : 0;
  var revEl = document.getElementById('statRevenue');
  var refundEl = document.getElementById('statRefunded');
  var netRevenueEl = document.getElementById('statNetRevenue');
  var bkEl = document.getElementById('statTotalBookings');
  var userEl = document.getElementById('statNewUsers');
  var cancelRateEl = document.getElementById('statCancelRate');
  if (revEl) revEl.textContent = grossRevenue.toLocaleString('vi-VN') + 'đ';
  if (refundEl) refundEl.textContent = refunded.toLocaleString('vi-VN') + 'đ';
  if (netRevenueEl) netRevenueEl.textContent = netRevenue.toLocaleString('vi-VN') + 'đ';
  if (bkEl) bkEl.textContent = active.length.toLocaleString('vi-VN');
  if (userEl) userEl.textContent = users.toLocaleString('vi-VN');
  if (cancelRateEl) {
    cancelRateEl.textContent = cancelRate.toFixed(1) + '%';
    adminSetCancelRateTone(cancelRateEl, cancelRate);
  }

  adminApplyOverviewBadgeRules({
    revenue: grossRevenue,
    refund: refunded,
    net_revenue: netRevenue,
    bookings: active.length,
    new_users: users,
    cancel_rate: cancelRate
  });

  var localSeries = adminBuildLocalStatsSeries(all);
  if (localSeries.revenueSeries.length) adminDrawRevenueChart(localSeries.revenueSeries);
  else adminDrawRevenueChart([]);
  if (localSeries.bookingChart.labels.length) adminDrawBookingChart(localSeries.bookingChart);
  else adminDrawBookingChart({ labels: [], revenues: [], bookings: [], cancelled: [] });
}

// Period buttons
function statsPeriod(btn, val) {
  statsSetActivePeriod(val);
  var periodMap = { 'today': 'today', 'week': 'week', 'month': 'month', 'year': 'year' };
  adminLoadStats(periodMap[val] || val);
}

function statsSetActivePeriod(period) {
  var buttons = document.querySelectorAll('#tab-stats .stats-period');
  buttons.forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-period') === period);
  });
}

// Override switchTab để load stats khi mở tab
var _origSwitchTabStats = switchTab;
switchTab = function (name, btn) {
  _origSwitchTabStats(name, btn);
  if (name === 'stats') {
    statsSetActivePeriod('today');
    adminLoadStats('today');
  }
};

function dashNormalizeChart(chart) {
  let { labels, revenues, bookings, cancelled } = chart;

  if (labels.length === 1) {
    const d = new Date(labels[0]);
    const prev = new Date(d);
    prev.setDate(d.getDate() - 1);

    const prevLabel = prev.toISOString().slice(0, 10);

    labels = [prevLabel, ...labels];
    revenues = [0, ...revenues];
    bookings = [0, ...bookings];
    cancelled = [0, ...cancelled];
  }

  return { labels, revenues, bookings, cancelled };
}
let revenueChart;

function renderRevenueChart(labels, data) {
  const ctx = document.getElementById('dashRevenueLineChart');
  if (!ctx) return;
  const displayLabels = (labels || []).map(dashFormatShortDateLabel);

  if (revenueChart) revenueChart.destroy();

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: displayLabels,
      datasets: [{
        label: 'Doanh thu',
        data,
        tension: 0.4,
        borderWidth: 3,
        borderColor: '#2d8a4e',
        pointBackgroundColor: '#2d8a4e',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        backgroundColor: 'rgba(45, 138, 78, 0.12)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return ctx.raw.toLocaleString('vi-VN') + 'đ';
            }
          }
        }
      }
    }
  });
}

let bookingChart;

function renderBookingChart(labels, bookings, cancelled) {
  const ctx = document.getElementById('dashBookingCancelChart');
  if (!ctx) return;
  const displayLabels = (labels || []).map(dashFormatShortDateLabel);
  const b = bookings || [];
  const c = cancelled || [];

  if (bookingChart) bookingChart.destroy();

  bookingChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: displayLabels,
      datasets: [
        {
          label: 'Đặt thành công',
          data: b,
          backgroundColor: '#2d8a4e',
          borderRadius: 8
        },
        {
          label: 'Huỷ',
          data: c,
          backgroundColor: '#dc2626',
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            afterBody: function (items) {
              if (!items || !items.length) return '';
              var i = items[0].dataIndex;
              var total = dashNumber(b[i], 0);
              var cancel = dashNumber(c[i], 0);
              var rate = total > 0 ? (cancel / total) * 100 : 0;
              return 'Tỷ lệ huỷ: ' + rate.toFixed(1) + '%';
            }
          }
        }
      }
    }
  });
}