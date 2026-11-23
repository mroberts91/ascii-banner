// Applies the saved theme before first paint (external file so CSP can stay 'self').
try {
  var t = JSON.parse(localStorage.getItem('ab:theme') || '"system"');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {}
