export function saveToken(token) {
  try { localStorage.setItem('token', token); } catch { /* ignore */ }
}
export function getToken() {
  try { return localStorage.getItem('token') || null; } catch { return null; }
}
export function clearToken() {
  try { localStorage.removeItem('token'); } catch { /* ignore */ }
}
