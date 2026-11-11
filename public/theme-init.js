// Runs before first paint to apply a saved theme and avoid a flash.
try {
  var t = localStorage.getItem('termtrek.theme')
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t
} catch (e) {}
