import { logout } from '../services/authService.js';
import { processDoor } from '../services/doorService.js';

document.getElementById('generateItemButton').addEventListener('click', async (event) => {
    event.preventDefault();
    await processDoor();
});
    
document.getElementById('logout-button').addEventListener('click', async () => {
    await logout();
    window.location.href = 'index.html';
});