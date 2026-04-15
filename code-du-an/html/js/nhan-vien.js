// ============================================================
// 3nhanvien.js – employee Dashboard
// ============================================================

var NV_ISSUES_KEY = 'vt_nv_issues';
var NV_CURRENT_ISSUE_IDX = -1;
var NV_PAGE = 1;
var NV_PER_PAGE = 8;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function () {
  var u = loadUser();
  if (!u) { window.location.href = '1dangnhap-nhanvien.html'; return; }
  if (u.role !== 'employee' && u.role !== 'admin') {
    window.location.href = '1dangnhap-nhanvien.html'; return;
  }

  var n = u.name || 'Nhân viên';
  var av = n[0].toUpperCase();
  ['nvUserName', 'nvUserName2'].forEach(function (id) {
    var el = document.getElementById(id); if (el) el.textContent = n;
  });
  ['nvUserAvatar', 'nvUserAvatar2'].forEach(function (id) {
    var el = document.getElementById(id); if (el) el.textContent = av;
  });

  nvRenderIssues();
  nvRenderBookings();
  nvUpdateUrgentCount();
});

// ===== SWITCH TAB =====
function nvSwitchTab(name) {
  document.querySelectorAll('.nv-tab').forEach(function (t) { t.classList.remove('active'); t.style.display = 'none'; });
  document.querySelectorAll('.nv-nav-item').forEach(function (a) { a.classList.remove('active'); });
  var tab = document.getElementById('nvTab-' + name);
  var nav = document.getElementById('nvNav-' + name);
  if (tab) { tab.classList.add('active'); tab.style.display = 'flex'; }
  if (nav) nav.classList.add('active');
}

// ===== ISSUES DATA =====
function nvGetIssues() {
  // Đọc từ cả 2 nguồn: ticket từ khách hàng + issue do nhân viên tạo
  var tickets = [];
  try { tickets = JSON.parse(localStorage.getItem('vt_support_tickets') || '[]'); } catch (e) { }
  var manual = [];
  try { manual = JSON.parse(localStorage.getItem(NV_ISSUES_KEY) || '[]'); } catch (e) { }
  // Merge, tránh trùng id
  var ids = {};
  var all = [];
  (function () {
    const TAB_QUERY_KEY = "tab";
    const ALLOWED_TABS = ["tours", "users", "bookings", "settings"];

    function q(id) {
      return document.getElementById(id);
    }

    function getTabFromQuery() {
      const params = new URLSearchParams(window.location.search || "");
      const tab = (params.get(TAB_QUERY_KEY) || "").toLowerCase();
      return ALLOWED_TABS.includes(tab) ? tab : "tours";
    }

    function setTabToQuery(tab) {
      const params = new URLSearchParams(window.location.search || "");
      params.set(TAB_QUERY_KEY, tab);
      const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash || ""}`;
      window.history.replaceState({}, "", nextUrl);
    }

    function activateTab(tab) {
      const targetTab = ALLOWED_TABS.includes(tab) ? tab : "tours";

      document.querySelectorAll(".admin-tab").forEach((panel) => {
        panel.classList.remove("active");
        panel.style.display = "none";
      });

      document.querySelectorAll(".admin-nav-item").forEach((nav) => {
        nav.classList.remove("active");
      });

      const panel = q(`nvTab-${targetTab}`);
      const nav = q(`nvNav-${targetTab}`);

      if (panel) {
        panel.style.display = "block";
        panel.classList.add("active");
      }

      if (nav) {
        nav.classList.add("active");
      }

      setTabToQuery(targetTab);
    }

    window.nvSwitchTab = function (tab) {
      activateTab(tab);
    };

    async function ensureAuth() {
      if (!window.apiGetMe) {
        window.location.href = "./dang-nhap.html";
        return null;
      }

      try {
        const me = await apiGetMe();
        if (!me) {
          window.location.href = "./dang-nhap.html";
          return null;
        }

        const role = String(me.role || "").toLowerCase();
        if (role !== "employee" && role !== "nhanvien") {
          if (window.toastMessage) {
            toastMessage("Bạn không có quyền truy cập trang nhân viên", false);
          }
          setTimeout(function () {
            window.location.href = "./index.html";
          }, 500);
          return null;
        }

        const fullName = me.fullName || me.name || me.email || "Nhân viên";
        const avatar = String(fullName).trim().charAt(0).toUpperCase() || "N";

        if (q("nvUserName")) q("nvUserName").textContent = fullName;
        if (q("nvUserAvatar")) q("nvUserAvatar").textContent = avatar;

        return me;
      } catch (err) {
        window.location.href = "./dang-nhap.html";
        return null;
      }
    }

    window.nvLogout = function () {
      localStorage.removeItem("token");
      if (window.toastMessage) {
        toastMessage("Đã đăng xuất", true);
      }
      setTimeout(function () {
        window.location.href = "./index.html";
      }, 300);
    };

    async function init() {
      const me = await ensureAuth();
      if (!me) return;

      activateTab(getTabFromQuery());

      window.addEventListener("popstate", function () {
        activateTab(getTabFromQuery());
      });
    }

    init();
  })();