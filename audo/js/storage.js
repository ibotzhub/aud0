export function isLocalStorageAvailable() {
    try { localStorage.setItem('test','test'); localStorage.removeItem('test'); return true; }
    catch { return false; }
}
export function getItem(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}
export function setItem(key, value) {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
}
export function removeItem(key) {
    try { localStorage.removeItem(key); return true; } catch { return false; }
}