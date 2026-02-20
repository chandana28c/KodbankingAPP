const registerForm = document.getElementById('registerForm');
const registerMessage = document.getElementById('registerMessage');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerMessage.textContent = '';
  registerMessage.className = 'message';

  const formData = new FormData(registerForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      registerMessage.textContent = data.message || 'Registration failed';
      registerMessage.classList.add('error');
      return;
    }

    registerMessage.textContent = 'Registered successfully! Redirecting to login...';
    registerMessage.classList.add('success');

    setTimeout(() => {
      window.location.href = data.redirectTo || '/login.html';
    }, 1000);
  } catch (err) {
    console.error(err);
    registerMessage.textContent = 'Something went wrong. Please try again.';
    registerMessage.classList.add('error');
  }
});

