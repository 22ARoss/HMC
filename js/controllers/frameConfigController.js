import { logout } from '../services/authService.js';
import { processItem } from '../services/frameService.js';

document.getElementById('generateItemButton').addEventListener('click', async (event) => {
    event.preventDefault();
    await processItem();
});
    
document.getElementById('logout-button').addEventListener('click', async () => {
    await logout();
    window.location.href = 'index.html';
});