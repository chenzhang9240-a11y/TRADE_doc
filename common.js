
// ===== Trade OS Theme Toggle =====
function toggleTheme() {
  var current = localStorage.getItem('app_theme');
  localStorage.setItem('app_theme', current === 'dark' ? 'light' : 'dark');
  location.reload();
}
