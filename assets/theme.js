document.documentElement.dataset.theme = 'dark';
try {
  const saved = localStorage.getItem('color-theme');
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
} catch {
  // The stylesheet supplies a default when storage is unavailable.
}
