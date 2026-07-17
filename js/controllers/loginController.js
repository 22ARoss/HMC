import { login, getSession, requestPasswordReset } from '../services/authService.js';

getSession().then(session => {
    if (session) {
        // User is already logged in, redirect to dashboard
        window.location.href = 'frameConfig.html';
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const { data, error } = await login(email, password);

    if (error){
        alert('Login failed: ' + error.message);
        return;
    }

    window.location.href = 'frameConfig.html';
});

document.getElementById('reset-pwd-btn').addEventListener('click', async (e) => {
    const email = document.getElementById('email').value.trim();

    if (!email) {
        alert('Enter your work email above first, then click Reset Password.');
        document.getElementById('email').focus();
        return;
    }

    const btn = e.currentTarget;
    btn.disabled = true;

    const { error } = await requestPasswordReset(email);
    btn.disabled = false;

    if (error) {
        alert('Could not send reset email: ' + error.message);
        return;
    }

    alert('Password reset email sent to ' + email + '. Open the link in it to choose a new password.');
});