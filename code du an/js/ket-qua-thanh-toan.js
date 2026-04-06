(function () {
  document.addEventListener('DOMContentLoaded', initPaymentResultPage);

  const PaymentStatus = {
    Pending: 0,
    Success: 1,
    Failed: 2,
    Refunded: 3
  };

  async function initPaymentResultPage() {
    const params = new URLSearchParams(window.location.search);
    const vnpayStatus = params.get('status');
    const orderId = params.get('orderId');

    // 🔥 MoMo params
    const momoOrderId = params.get('orderId')
    const momoResultCode = params.get('resultCode')

    // 🔥 detect MoMo (đặt TRƯỚC VNPay)
    if (momoOrderId && momoResultCode !== null) {
      await handleMoMoCallback(momoOrderId, momoResultCode)
      return
    }

    if (vnpayStatus && orderId) {
      await handleVNPayCallback(vnpayStatus, orderId, params);
      return;
    }

    const bookingId = getBookingIdFromUrl(params);
    if (!bookingId) {
      renderPageError('Không tìm thấy mã booking trong URL. Vui lòng kiểm tra lại đường dẫn.');
      return;
    }

    await fetchAndRenderBooking(bookingId);
  }

  async function handleVNPayCallback(vnpayStatus, orderId, params) {
    const bookingId = normalizeBookingId(orderId);
    if (!bookingId) {
      renderPageError('Không tìm thấy orderId từ VNPay');
      return;
    }

    if (vnpayStatus === 'success') {
      setStatusIconState('success');
      await fetchAndRenderBooking(bookingId);
      return;
    }

    if (vnpayStatus === 'failed') {
      setStatusIconState('failure');
      const code = params.get('code') || '';
      const reason = params.get('reason') || '';

      setText('tcTitle', 'Thanh toán thất bại');
      setText('tcSubText', 'Giao dịch thanh toán VNPay bị từ chối. Vui lòng thử lại hoặc liên hệ hỗ trợ.');
      setText('tcStatusChip', 'THẤT BẠI');
      setText('tcNoticeIcon', '❌');

      let detailMsg = 'Giao dịch thanh toán VNPay bị từ chối.';
      if (reason === 'invalid_signature') {
        detailMsg = 'Chữ ký giao dịch không hợp lệ. Đây có thể là lỗi hệ thống hoặc vấn đề bảo mật.';
      } else if (code) {
        detailMsg = 'Mã lỗi: ' + code + '. Vui lòng kiểm tra thông tin thẻ/tài khoản và thử lại.';
      }
      setText('tcNoticeText', detailMsg);

      const top = document.getElementById('tcTop');
      if (top) top.classList.add('is-failure');

      const notice = document.getElementById('tcNotice');
      if (notice) notice.classList.add('is-failure');

      const reasonWrap = document.getElementById('tcFailReason');
      if (reasonWrap) reasonWrap.style.display = 'none';

      const primaryBtn = document.getElementById('tcPrimaryBtn');
      if (primaryBtn) {
        primaryBtn.textContent = 'Thử thanh toán lại';
        primaryBtn.href = '#';
        primaryBtn.onclick = function (e) {
          e.preventDefault();
          retryPayment(bookingId);
        };
      }
      return;
    }

    renderPageError('Trạng thái thanh toán không hợp lệ.');
  }

  async function handleMoMoCallback(orderId, resultCode) {
    const bookingId = normalizeBookingId(orderId)

    if (!bookingId) {
      renderPageError('Không tìm thấy orderId từ MoMo')
      return
    }

    // 🔥 BONUS: loading UI
    setText('tcTitle', 'Đang xác nhận thanh toán...')
    setText('tcSubText', 'Vui lòng chờ trong giây lát.')
    setText('tcStatusChip', 'ĐANG KIỂM TRA')
    setText('tcNoticeText', 'Hệ thống đang xác nhận giao dịch với MoMo...')

    try {
      const res = await apiGetMyBooking(bookingId)

      if (!res || !res.ok) {
        renderPageError('Không thể lấy thông tin booking')
        return
      }

      const booking = res?.data?.result?.booking || res?.data?.result

      if (!booking) {
        renderPageError('Dữ liệu booking không hợp lệ')
        return
      }

      // 🔥 render theo status thật từ BE
      renderBooking(booking)

    } catch (err) {
      console.error(err)
      renderPageError('Lỗi khi xác nhận thanh toán')
    }
  }

  async function fetchAndRenderBooking(bookingId) {
    if (typeof apiGetMyBooking !== 'function') {
      renderPageError('Không thể tải API booking. Vui lòng thử lại sau.');
      return;
    }

    try {
      const res = await apiGetMyBooking(bookingId);

      if (!res || !res.ok) {
        const msg = res?.data?.message || 'Không thể lấy chi tiết booking';
        renderPageError(msg);
        return;
      }

      const booking = res?.data?.result?.booking || res?.data?.result;
      if (!booking) {
        renderPageError('Dữ liệu booking không hợp lệ');
        return;
      }

      renderBooking(booking);
    } catch (error) {
      console.error(error);
      renderPageError('Có lỗi xảy ra khi tải dữ liệu booking');
    }
  }

  function normalizeBookingId(rawId) {
    const value = String(rawId || '').trim();
    if (!value) return '';
    return value.split('-')[0].trim();
  }

  function getBookingIdFromUrl(params) {
    const sourceParams = params || new URLSearchParams(window.location.search);
    const rawBookingId = sourceParams.get('id') ||
      sourceParams.get('booking_id') ||
      sourceParams.get('bookingId') ||
      sourceParams.get('booking') ||
      sourceParams.get('orderId') ||
      '';

    return normalizeBookingId(rawBookingId);
  }

  function renderPageError(message) {
    setStatusIconState('failure');
    setText('tcTitle', 'Không thể tải kết quả thanh toán');
    setText('tcSubText', message || 'Vui lòng thử lại sau.');
    setText('tcStatusChip', 'THẤT BẠI');
    setText('tcNoticeText', message || 'Đã xảy ra lỗi khi tải dữ liệu booking');
    setText('tcNoticeIcon', '⚠️');

    const top = document.getElementById('tcTop');
    if (top) top.classList.add('is-failure');

    const notice = document.getElementById('tcNotice');
    if (notice) {
      notice.classList.add('is-failure');
      notice.classList.remove('is-refunded');
    }

    const primaryBtn = document.getElementById('tcPrimaryBtn');
    if (primaryBtn) {
      primaryBtn.textContent = 'Thử thanh toán lại';
      primaryBtn.href = 'tour-du-lich.html';
      primaryBtn.onclick = null;
    }
  }

  function renderBooking(booking) {
    const snapshot = booking.tour_snapshot || {};
    const passengers = booking.passengers || {};
    const contactInfo = booking.contact_info || {};
    const priceDetail = booking.price_detail || {};

    const tourName = snapshot.tour_name || '—';
    const bookingCode = booking.booking_code || booking._id || '—';
    const status = booking.status;
    const paymentStatus = normalizePaymentStatus(booking.payment?.status);

    setText('tcTour', tourName);
    setText('tcCode', 'Mã booking: ' + bookingCode);

    setText('tcFinal', formatMoney(booking.final_price));
    setText('tcFinal2', formatMoney(booking.final_price));
    setText('tcTotal', formatMoney(booking.total_price));

    setText('tcCoupon', priceDetail.coupon_code || 'Không dùng');
    setText('tcDiscount', formatMoney(priceDetail.discount_amount || 0));

    setText('tcDeparture', formatDate(snapshot.departure_date));
    setText('tcReturn', formatDate(snapshot.return_date));

    setText('tcAdults', String(passengers.adults ?? 0));
    setText('tcChildren', String(passengers.children ?? 0));
    setText('tcBabies', String(passengers.babies ?? 0));

    setText('tcContactName', contactInfo.full_name || '—');
    setText('tcEmail', contactInfo.email || '—');
    setText('tcPhone', contactInfo.phone || '—');

    setText('tcPayment', getPaymentMethodLabel(booking.payment?.provider));
    setText('tcStatusText', getPaymentStatusLabel(paymentStatus, booking.status));

    setText('tcAdultTotal', formatMoney(priceDetail.adult_total || 0));
    setText('tcChildTotal', formatMoney(priceDetail.child_total || 0));
    setText('tcBabyTotal', formatMoney(priceDetail.baby_total || 0));

    setText('tcBgImg', createImageFallbackText(tourName));
    applyHeroImageStyle('tcBgImg', snapshot);

    if (paymentStatus !== null) {
      if (paymentStatus === PaymentStatus.Success) {
        setStatusIconState('success');
        renderConfirmedState(contactInfo.email);
        return;
      }

      if (paymentStatus === PaymentStatus.Pending) {
        setStatusIconState('failure');
        renderPendingState(booking._id || '');
        return;
      }

      if (paymentStatus === PaymentStatus.Failed) {
        setStatusIconState('failure');
        renderFailedState(booking._id || '');
        return;
      }

      if (paymentStatus === PaymentStatus.Refunded) {
        setStatusIconState('refunded');
        renderRefundedState();
        return;
      }
    }

    if (status === 1) {
      setStatusIconState('success');
      renderConfirmedState(contactInfo.email);
    } else if (status === 0) {
      setStatusIconState('failure');
      renderPendingState(booking._id || '');
    } else if (status === 3) {
      setStatusIconState('failure');
      renderCancelledState(booking.cancelled_reason);
    }
  }

  function renderConfirmedState(email) {
    setText('tcTitle', 'Thanh toán thành công!');
    setText('tcSubText', 'Đơn đặt tour của bạn đã được xác nhận. Cảm ơn bạn đã lựa chọn VietnamTravel.');
    setText('tcStatusChip', 'THÀNH CÔNG');
    setText('tcNoticeIcon', '✅');
    setText('tcNoticeText', 'Thông tin booking đã được cập nhật. Email xác nhận sẽ gửi tới ' + (email || 'địa chỉ email của bạn') + '.');

    const top = document.getElementById('tcTop');
    if (top) {
      top.classList.add('is-success');
      top.classList.remove('is-failure');
    }

    const notice = document.getElementById('tcNotice');
    if (notice) {
      notice.classList.remove('is-failure');
      notice.classList.remove('is-refunded');
    }

    const failReason = document.getElementById('tcFailReason');
    if (failReason) failReason.style.display = 'none';

    const primaryBtn = document.getElementById('tcPrimaryBtn');
    if (primaryBtn) {
      primaryBtn.textContent = 'Xem booking của tôi';
      primaryBtn.href = 'ca-nhan.html';
      primaryBtn.onclick = null;
    }
  }

  function renderPendingState(bookingId) {
    setText('tcTitle', 'Chưa hoàn tất thanh toán');
    setText('tcSubText', 'Giao dịch của bạn chưa hoàn tất. Vui lòng thử thanh toán lại hoặc liên hệ hỗ trợ.');
    setText('tcStatusChip', 'ĐANG XỬ LÝ');
    setText('tcNoticeIcon', '⏳');
    setText('tcNoticeText', 'Booking đang chờ hoàn tất thanh toán. Vui lòng thử lại.');

    const top = document.getElementById('tcTop');
    if (top) {
      top.classList.remove('is-success');
      top.classList.add('is-failure');
    }

    const notice = document.getElementById('tcNotice');
    if (notice) {
      notice.classList.add('is-failure');
      notice.classList.remove('is-refunded');
    }

    const reasonWrap = document.getElementById('tcFailReason');
    if (reasonWrap) reasonWrap.style.display = 'none';

    const primaryBtn = document.getElementById('tcPrimaryBtn');
    if (primaryBtn) {
      primaryBtn.textContent = 'Thử thanh toán lại';
      primaryBtn.href = '#';
      primaryBtn.onclick = function (e) {
        e.preventDefault();
        retryPayment(bookingId);
      };
    }
  }

  function renderCancelledState(cancelledReason) {
    setText('tcTitle', 'Đơn đặt tour đã hủy');
    setText('tcSubText', 'Đơn đặt tour của bạn đã bị hủy. Bạn có thể đặt tour mới hoặc liên hệ hỗ trợ để thắc mắc.');
    setText('tcStatusChip', 'ĐÃ HỦY');
    setText('tcNoticeIcon', '🚫');
    setText('tcNoticeText', 'Hạn thời gian thanh toán đã hết hoặc bạn đã hủy chủ động.');

    const top = document.getElementById('tcTop');
    if (top) {
      top.classList.remove('is-success');
      top.classList.add('is-failure');
    }

    const notice = document.getElementById('tcNotice');
    if (notice) {
      notice.classList.add('is-failure');
      notice.classList.remove('is-refunded');
    }

    const reasonWrap = document.getElementById('tcFailReason');
    const reasonText = document.getElementById('tcFailReasonText');
    if (reasonWrap) reasonWrap.style.display = 'block';
    if (reasonText) reasonText.textContent = cancelledReason || 'Hết thời gian thanh toán.';

    const primaryBtn = document.getElementById('tcPrimaryBtn');
    if (primaryBtn) {
      primaryBtn.textContent = 'Đặt tour mới';
      primaryBtn.href = 'tour-du-lich.html';
      primaryBtn.onclick = null;
    }
  }

  function renderFailedState(bookingId) {
    setText('tcTitle', 'Thanh toán thất bại');
    setText('tcSubText', 'Giao dịch của bạn không thành công. Vui lòng thử lại hoặc liên hệ hỗ trợ.');
    setText('tcStatusChip', 'THẤT BẠI');
    setText('tcNoticeIcon', '❌');
    setText('tcNoticeText', 'Hệ thống ghi nhận thanh toán thất bại. Bạn có thể thử thanh toán lại.');

    const top = document.getElementById('tcTop');
    if (top) {
      top.classList.remove('is-success');
      top.classList.add('is-failure');
    }

    const notice = document.getElementById('tcNotice');
    if (notice) {
      notice.classList.add('is-failure');
      notice.classList.remove('is-refunded');
    }

    const reasonWrap = document.getElementById('tcFailReason');
    if (reasonWrap) reasonWrap.style.display = 'none';

    const primaryBtn = document.getElementById('tcPrimaryBtn');
    if (primaryBtn) {
      primaryBtn.textContent = 'Thử thanh toán lại';
      primaryBtn.href = '#';
      primaryBtn.onclick = function (e) {
        e.preventDefault();
        retryPayment(bookingId);
      };
    }
  }

  function renderRefundedState() {
    setText('tcTitle', 'Giao dịch đã hoàn tiền');
    setText('tcSubText', 'Thanh toán của bạn đã được hoàn lại. Nếu cần hỗ trợ thêm, vui lòng liên hệ bộ phận chăm sóc khách hàng.');
    setText('tcStatusChip', 'ĐÃ HOÀN TIỀN');
    setText('tcNoticeIcon', '💸');
    setText('tcNoticeText', 'Hệ thống đã ghi nhận trạng thái hoàn tiền cho booking này.');

    const top = document.getElementById('tcTop');
    if (top) {
      top.classList.remove('is-success');
      top.classList.remove('is-failure');
      top.classList.add('is-refunded');
    }

    const notice = document.getElementById('tcNotice');
    if (notice) {
      notice.classList.remove('is-failure');
      notice.classList.add('is-refunded');
    }

    const reasonWrap = document.getElementById('tcFailReason');
    if (reasonWrap) reasonWrap.style.display = 'none';

    const primaryBtn = document.getElementById('tcPrimaryBtn');
    if (primaryBtn) {
      primaryBtn.textContent = 'Xem booking của tôi';
      primaryBtn.href = 'ca-nhan.html';
      primaryBtn.onclick = null;
    }
  }

  async function retryPayment(bookingId) {
    if (!bookingId) {
      if (typeof showToast === 'function') {
        showToast('⚠️ Không tìm thấy booking để tiếp tục thanh toán');
      }
      return;
    }

    if (typeof showToast === 'function') {
      showToast('⏳ Đang chuyển sang trang thanh toán...');
    }

    window.location.href = 'dat-tour.html?booking_id=' + encodeURIComponent(bookingId);
  }

  function setStatusIconState(state) {
    const top = document.getElementById('tcTop');
    if (!top) return;

    top.classList.toggle('is-success', state === 'success');
    top.classList.toggle('is-failure', state === 'failure');
    top.classList.toggle('is-refunded', state === 'refunded');
  }

  function normalizePaymentStatus(status) {
    if (status == null) return null;

    if (typeof status === 'number') {
      return Object.values(PaymentStatus).includes(status) ? status : null;
    }

    const key = String(status).trim().toLowerCase();
    const map = {
      pending: PaymentStatus.Pending,
      success: PaymentStatus.Success,
      paid: PaymentStatus.Success,
      failed: PaymentStatus.Failed,
      refunded: PaymentStatus.Refunded
    };

    if (Object.prototype.hasOwnProperty.call(map, key)) {
      return map[key];
    }

    const parsed = Number(key);
    if (Number.isFinite(parsed) && Object.values(PaymentStatus).includes(parsed)) {
      return parsed;
    }

    return null;
  }

  function getPaymentStatusLabel(paymentStatus, bookingStatus) {
    const map = {
      0: 'Chờ thanh toán',
      1: 'Thanh toán thành công',
      2: 'Thanh toán thất bại',
      3: 'Đã hoàn tiền'
    };

    if (paymentStatus !== null && Object.prototype.hasOwnProperty.call(map, paymentStatus)) {
      return map[paymentStatus];
    }

    return getStatusLabel(bookingStatus);
  }

  function getStatusLabel(status) {
    const map = {
      0: 'Chờ thanh toán',
      1: 'Đã thanh toán thành công',
      2: 'Chuyến đi đã hoàn thành',
      3: 'Đã hủy',
      pending: 'Chờ thanh toán',
      confirmed: 'Đã xác nhận',
      done: 'Chuyến đi đã hoàn thành',
      completed: 'Đã hoàn thành',
      cancelled: 'Đã hủy',
      paid: 'Đã thanh toán',
      success: 'Thành công',
      failed: 'Thất bại'
    };

    const key = typeof status === 'string' ? status.toLowerCase() : status;
    return map[key] || String(status || 'Không xác định');
  }

  function getPaymentMethodLabel(provider) {
    if (provider === 0) return 'MoMo'
    if (provider === 1) return 'VNPay'
    return 'Chưa thanh toán'
  }

  function formatDate(isoDate) {
    if (!isoDate) return '—';
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('vi-VN');
  }

  function formatMoney(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('vi-VN') + ' đ';
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value == null || value === '' ? '—' : value;
  }

  function createImageFallbackText(name) {
    const words = String(name || '').trim().split(' ').filter(Boolean);
    if (!words.length) return 'VT';
    return words.slice(0, 2).map(function (w) {
      return w[0].toUpperCase();
    }).join('');
  }

  function applyHeroImageStyle(id, snapshot) {
    const el = document.getElementById(id);
    if (!el) return;

    const image = snapshot && (snapshot.image || snapshot.cover_image) || '';
    if (image) {
      el.style.background = 'url(' + image + ') center/cover';
      return;
    }

    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.color = '#ffffff';
    el.style.fontWeight = '800';
    el.style.fontSize = '1.2rem';
  }
})();
