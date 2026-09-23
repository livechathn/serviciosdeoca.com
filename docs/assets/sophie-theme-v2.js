(function () {
  'use strict';
  var key = 'oca_theme_mode';
  var modes = ['auto', 'dark', 'light'];
  var names = { auto: 'Auto', dark: 'Oscuro', light: 'Claro' };
  var mode = 'auto';
  function read() { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function normalize(value) { return modes.indexOf(value) >= 0 ? value : 'auto'; }
  function paint() {
    var hour = new Date().getHours(); // Browser-local time zone; no location request.
    var dark = mode === 'dark' || (mode === 'auto' && (hour < 6 || hour >= 18));
    document.body.classList.toggle('dark', dark);
    document.body.classList.toggle('light', !dark);
    document.body.dataset.themeMode = mode;
    var next = names[modes[(modes.indexOf(mode) + 1) % modes.length]];
    document.querySelectorAll('[data-sophie-theme]').forEach(function (button) {
      button.removeAttribute('aria-pressed'); // This cycles three modes, not a binary pressed state.
      button.querySelector('.theme-label').textContent = names[mode];
      var description = 'Tema: ' + names[mode] + (mode === 'auto' ? ' según su hora local (claro 06:00–18:00)' : '') + '. Cambiar a ' + next + '.';
      button.setAttribute('aria-label', description);
      button.title = description;
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#000000' : '#ffffff';
  }
  function set(value) {
    mode = normalize(value);
    try { localStorage.setItem(key, mode); } catch (_) {}
    paint();
  }
  function toggle() { set(modes[(modes.indexOf(mode) + 1) % modes.length]); }
  window.SophieTheme = { set: set, toggle: toggle, getMode: function () { return mode; } };
  window.setMode = set;
  window.setThemeMode = set;
  window.cycleThemeMode = toggle;
  function init() {
    mode = normalize(read());
    document.querySelectorAll('[data-sophie-theme]').forEach(function (button) { button.addEventListener('click', toggle); });
    paint();
    window.setInterval(function () { if (mode === 'auto' && !document.hidden) paint(); }, 60000);
    window.addEventListener('focus', paint);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) paint(); });
    window.addEventListener('storage', function (event) {
      if (event.key === key || event.key === null) { mode = normalize(read()); paint(); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
