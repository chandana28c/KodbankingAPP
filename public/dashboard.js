const checkBalanceBtn = document.getElementById('checkBalanceBtn');
const balanceMessage = document.getElementById('balanceMessage');
const balanceDisplay = document.getElementById('balanceDisplay');
const confettiContainer = document.getElementById('confettiContainer');

checkBalanceBtn.addEventListener('click', async () => {
  balanceMessage.textContent = '';
  balanceMessage.className = 'message big';

  try {
    const res = await fetch('/api/balance', {
      method: 'GET',
      credentials: 'include',
    });

    const data = await res.json();

    if (!res.ok) {
      balanceMessage.textContent = data.message || 'Unable to fetch balance';
      balanceMessage.classList.add('error');
      return;
    }

    const formatted = Number(data.balance).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    });

    balanceDisplay.textContent = formatted;
    balanceMessage.textContent = `Your balance is: ${formatted}`;
    balanceMessage.classList.add('success');

    launchConfetti();
  } catch (err) {
    console.error(err);
    balanceMessage.textContent = 'Something went wrong. Please try again.';
    balanceMessage.classList.add('error');
  }
});

function launchConfetti() {
  if (!confettiContainer) return;
  confettiContainer.innerHTML = '';

  const colors = ['#0d9488', '#5a7d5a', '#7c9a9a', '#e8efe6', '#d4e8e4'];
  const pieceCount = 120;

  for (let i = 0; i < pieceCount; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 0.3 + 's';
    piece.style.transform = `translateY(-10vh) rotateZ(${Math.random() * 360}deg)`;
    confettiContainer.appendChild(piece);

    setTimeout(() => {
      piece.remove();
    }, 3000);
  }
}
