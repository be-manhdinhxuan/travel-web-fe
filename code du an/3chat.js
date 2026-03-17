// ============================================================
let chatOpen = false;
const BOT_RESPONSES = {
  'hạ long':   'Tour Du Thuyền Hạ Long 3N2Đ đang rất hot! 🚢 Giá từ 6.990.000đ/người, bao gồm xe Limousine, cabin sang trọng và toàn bộ bữa ăn.',
  'sapa':      'Trekking & Homestay Sapa 2N1Đ giá từ 2.800.000đ/người ⛰️ Bao gồm hướng dẫn viên bản địa, homestay và bữa ăn đặc sản vùng cao.',
  'giảm giá':  'Ưu đãi hot 🏷️:\n• Tour Hội An: giảm 20%\n• Combo Đà Nẵng 3N2Đ: tiết kiệm 500k\n• Early bird Hạ Long tháng 3: giảm 23%',
  'tư vấn':    'Hãy cho tôi biết:\n1️⃣ Thời gian muốn đi?\n2️⃣ Số người trong nhóm?\n3️⃣ Ngân sách dự kiến?\nTôi sẽ gợi ý lịch trình phù hợp! 😊',
  'hội an':    'Tour Phố Cổ Hội An & Ẩm Thực 1 ngày chỉ từ 1.250.000đ 🏮 Tour bán chạy nhất năm 2024!',
  'đặt':       'Bạn có thể đặt tour bằng cách nhấn nút "Đặt ngay" trên bất kỳ tour nào 🎫 Hoặc gọi hotline 1900 x709!',
  'default':   'Cảm ơn bạn đã liên hệ! 😊 Vui lòng cho biết điểm đến và thời gian để tôi tư vấn tốt nhất. Gọi hotline 1900 x709 để được hỗ trợ ngay!',
};

function toggleChat() {
  chatOpen = !chatOpen;
  document.getElementById('chatWindow').classList.toggle('open', chatOpen);
  document.getElementById('chatNotif').style.display = 'none';
}

function sendQuick(text) {
  document.getElementById('quickReplies').style.display = 'none';
  addMessage(text, 'user');
  setTimeout(() => showTyping(text), 600);
}

function sendMessage() {
  const input = document.getElementById('chatInput');
  const text  = input.value.trim();
  if (!text) return;
  input.value = ''; input.style.height = '';
  document.getElementById('quickReplies').style.display = 'none';
  addMessage(text, 'user');
  setTimeout(() => showTyping(text), 600);
}

function showTyping(userText) {
  const msgs  = document.getElementById('chatMessages');
  const typer = document.createElement('div');
  typer.className = 'msg bot'; typer.id = 'typing';
  typer.innerHTML = '<div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>';
  msgs.appendChild(typer);
  msgs.scrollTop = msgs.scrollHeight;
  setTimeout(() => {
    typer.remove();
    const lower    = userText.toLowerCase();
    let   response = BOT_RESPONSES.default;
    for (const [key, val] of Object.entries(BOT_RESPONSES)) {
      if (key !== 'default' && lower.includes(key)) { response = val; break; }
    }
    addMessage(response, 'bot');
  }, 1400);
}

function addMessage(text, type) {
  const msgs = document.getElementById('chatMessages');
  const now  = new Date();
  const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  const div  = document.createElement('div');
  div.className = 'msg ' + type;
  div.innerHTML = `<div class="msg-bubble">${text.replace(/\n/g,'<br>')}</div><div class="msg-time">${time}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function handleChatKey(e) { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }
function autoResize(el)    { el.style.height=''; el.style.height=Math.min(el.scrollHeight,80)+'px'; }

// ============================================================