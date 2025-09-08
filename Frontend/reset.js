document.addEventListener('DOMContentLoaded', () => {
    const msgDiv = document.getElementById('reset-msg');
    const loginLink = document.getElementById('login-link');
    const submitBtn = document.getElementById('reset-submit-btn');
    const passwordInput = document.getElementById('new-password');

    // URL से टोकन निकालें
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
        msgDiv.textContent = 'कोई रीसेट टोकन नहीं मिला। कृपया पुनः प्रयास करें।';
        msgDiv.className = 'alert alert-danger';
        msgDiv.classList.remove('d-none');
        submitBtn.disabled = true;
    }

    submitBtn.addEventListener('click', async () => {
        const newPassword = passwordInput.value;

        try {
            const response = await fetch('http://localhost:4000/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });
            
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }
            
            msgDiv.textContent = data.message;
            msgDiv.className = 'alert alert-success';
            loginLink.classList.remove('d-none'); // लॉगिन लिंक दिखाएं
            submitBtn.disabled = true; // बटन को डिसेबल करें

        } catch (error) {
            msgDiv.textContent = error.message;
            msgDiv.className = 'alert alert-danger';
        }
        msgDiv.classList.remove('d-none');
    });
});