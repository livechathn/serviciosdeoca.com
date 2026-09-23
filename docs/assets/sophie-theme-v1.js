(function () {
  'use strict';
  var key = 'oca_theme_mode', timer = null;
  function stored() { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function paint(theme) {
    var dark = theme === 'dark';
    document.body.classList.toggle('dark', dark);
    document.body.classList.toggle('light', !dark);
    document.querySelectorAll('[data-sophie-theme]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
      button.querySelector('.theme-label').textContent = dark ? 'Modo claro' : 'Modo oscuro';
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#000000' : '#ffffff';
  }
  function set(mode) {
    clearTimeout(timer);
    if (!['dark', 'light', 'auto', 'cycling'].includes(mode)) mode = 'dark';
    try { localStorage.setItem(key, mode); } catch (_) {}
    if (mode === 'auto') paint(new Date().getHours() >= 6 && new Date().getHours() < 18 ? 'light' : 'dark');
    else if (mode === 'cycling') {
      // Retain the existing app command, but the visible toggle has only two states.
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { paint('dark'); return; }
      (function cycle() { paint(document.body.classList.contains('dark') ? 'light' : 'dark'); timer = setTimeout(cycle, 4000); })();
    } else paint(mode);
  }
  function toggle() { set(document.body.classList.contains('dark') ? 'light' : 'dark'); }
  window.SophieTheme = { set: set, toggle: toggle };
  // Compatibility for existing Aria /theme commands; no model or auth code changed.
  window.setMode = set;
  window.setThemeMode = set;
  window.cycleThemeMode = toggle;
  function init() {
    document.querySelectorAll('[data-sophie-theme]').forEach(function (button) { button.addEventListener('click', toggle); });
    var saved = stored();
    set(saved === 'light' || saved === 'dark' ? saved : 'dark');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
