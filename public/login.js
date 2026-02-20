const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginMessage.textContent = '';
  loginMessage.className = 'message';

  const formData = new FormData(loginForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      loginMessage.textContent = data.message || 'Login failed';
      loginMessage.classList.add('error');
      return;
    }

    loginMessage.textContent = 'Login successful! Redirecting to dashboard...';
    loginMessage.classList.add('success');

    setTimeout(() => {
      window.location.href = data.redirectTo || '/dashboard.html';
    }, 800);
  } catch (err) {
    console.error(err);
    loginMessage.textContent = 'Something went wrong. Please try again.';
    loginMessage.classList.add('error');
  }
});

