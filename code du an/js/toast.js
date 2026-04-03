// TOAST
// ============================================================
(function () {
  const STYLE_ID = 'vt-toast-style';
  const HOST_ID = 'toast';
  const DURATION = 3000;
  const activeTimers = new WeakMap();

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${HOST_ID}.vt-toast-host {
        position: fixed;
        top: 24px;
        right: 24px;
        left: auto;
        bottom: auto;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
        pointer-events: none;
        width: min(92vw, 380px);
      }

      #${HOST_ID}.vt-toast-host .vt-toast-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        border-radius: 16px;
        background: #b3e5c5;
        color: #fff;
        box-shadow: 0 18px 40px rgba(13, 31, 45, 0.24);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        transform: translateX(120%);
        opacity: 0;
        transition: transform .32s ease, opacity .32s ease;
        pointer-events: auto;
      }

      #${HOST_ID}.vt-toast-host .vt-toast-item.vt-toast-item--show {
        transform: translateX(0);
        opacity: 1;
      }

      #${HOST_ID}.vt-toast-host .vt-toast-wrap {
        flex: 0 0 auto;
        width: 28px;
        height: 28px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        color: #8be0ad;
      }

      #${HOST_ID}.vt-toast-host .vt-toast-content {
        flex: 1 1 auto;
        min-width: 0;
        font-size: 0.92rem;
        line-height: 1.45;
        font-weight: 600;
        word-break: break-word;
      }

      #${HOST_ID}.vt-toast-host .vt-toast-close {
        flex: 0 0 auto;
        border: none;
        background: transparent;
        color: rgba(255, 255, 255, 0.7);
        font-size: 2rem;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        margin-left: 4px;
      }

      #${HOST_ID}.vt-toast-host .vt-toast-close:hover {
        color: #fff;
      }

      @media (max-width: 640px) {
        #${HOST_ID}.vt-toast-host {
          top: 14px;
          right: 14px;
          width: calc(100vw - 28px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureHost() {
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement('div');
      host.id = HOST_ID;
      document.body.appendChild(host);
    }

    host.className = 'vt-toast-host';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    host.setAttribute('aria-atomic', 'true');
    return host;
  }

  function removeToast(item) {
    const timer = activeTimers.get(item);
    if (timer) {
      clearTimeout(timer);
      activeTimers.delete(item);
    }
    item.classList.remove('vt-toast-item--show');
    window.setTimeout(() => {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, 320);
  }

  window.showToast = function showToast(msg) {
    ensureStyles();
    const host = ensureHost();

    const item = document.createElement('div');
    item.className = 'vt-toast-item';
    item.innerHTML = [
      '<div class="vt-toast-wrap"><svg fill="#2ecc71" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 384C302.3 384 288 398.3 288 416C288 433.7 302.3 448 320 448C337.7 448 352 433.7 352 416C352 398.3 337.7 384 320 384zM320 192C301.8 192 287.3 207.5 288.6 225.7L296 329.7C296.9 342.3 307.4 352 319.9 352C332.5 352 342.9 342.3 343.8 329.7L351.2 225.7C352.5 207.5 338.1 192 319.8 192z"/></svg></div>',
      '<div class="vt-toast-content">' + String(msg ?? '') + '</div>',
      '<button class="vt-toast-close" type="button" aria-label="Đóng">×</button>',
    ].join('');

    const closeBtn = item.querySelector('.vt-toast-close');
    closeBtn.addEventListener('click', function () {
      removeToast(item);
    });

    host.appendChild(item);

    requestAnimationFrame(() => {
      item.classList.add('vt-toast-item--show');
    });

    const timer = window.setTimeout(() => removeToast(item), DURATION);
    activeTimers.set(item, timer);
  };
})();
