import { updatePassword, logout, getSession } from '../services/authService.js';

const statusEl = document.getElementById('reset-status');

// If the recovery link was invalid or expired, Supabase redirects here with
// the failure described in the URL hash instead of a token.
const hashParams = new URLSearchParams(window.location.hash.slice(1));
if (hashParams.get('error')) {
    const description = hashParams.get('error_description') || 'The reset link is invalid.';
    statusEl.textContent = description.replace(/\+/g, ' ') + ' Request a new link from the sign-in page.';
    statusEl.style.color = '#c0392b';
    document.getElementById('reset-submit-btn').disabled = true;
}

document.getElementById('reset-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        alert('Passwords do not match.');
        return;
    }

    const session = await getSession();
    if (!session) {
        alert('No active recovery session. Open the link from your reset email, or request a new one from the sign-in page.');
        return;
    }

    const btn = document.getElementById('reset-submit-btn');
    btn.disabled = true;

    const { error } = await updatePassword(newPassword);

    if (error) {
        btn.disabled = false;
        alert('Could not update password: ' + error.message);
        return;
    }

    alert('Password updated. Please sign in with your new password.');
    await logout();
    window.location.href = 'index.html';
});
