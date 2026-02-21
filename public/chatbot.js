const chatbotBtn = document.getElementById('chatbotBtn');
const helpChatBtn = document.getElementById('helpChatBtn');
const closeChatbotBtn = document.getElementById('closeChatbotBtn');
const chatbotModal = document.getElementById('chatbotModal');
const chatbotMessages = document.getElementById('chatbotMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');

let chatHistory = [];

function openChatbot() {
  chatbotModal.classList.add('open');
  chatbotModal.setAttribute('aria-hidden', 'false');
  chatInput.focus();
}

function closeChatbot() {
  chatbotModal.classList.remove('open');
  chatbotModal.setAttribute('aria-hidden', 'true');
}

chatbotBtn.addEventListener('click', openChatbot);
if (helpChatBtn) helpChatBtn.addEventListener('click', openChatbot);

closeChatbotBtn.addEventListener('click', closeChatbot);

chatbotModal.addEventListener('click', (e) => {
  if (e.target === chatbotModal) closeChatbot();
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
  }
});

sendChatBtn.addEventListener('click', sendMessage);

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = '';
  appendMessage('user', text);
  chatHistory.push({ role: 'user', content: text });

  const typingEl = appendMessage('bot', '', true);
  typingEl.classList.add('typing');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory }),
    });

    typingEl.remove();

    const data = await res.json();

    if (!res.ok) {
      appendMessage('bot', data.message || 'Sorry, something went wrong. Please try again.');
      return;
    }

    const reply = data.reply || data.message || 'No response received.';
    appendMessage('bot', reply);
    chatHistory.push({ role: 'assistant', content: reply });
  } catch (err) {
    console.error(err);
    typingEl.remove();
    appendMessage('bot', 'Unable to connect. Please check your connection and try again.');
  }
}

function appendMessage(role, text, isPlaceholder = false) {
  const div = document.createElement('div');
  div.className = `chat-message ${role}`;
  const p = document.createElement('p');
  p.textContent = text || ' ';
  div.appendChild(p);
  chatbotMessages.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth' });
  return div;
}
