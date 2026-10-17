/* Decorative, local-only typographic vortex. No network or user data. */
(() => {
  'use strict';
  const canvas = document.querySelector('.oca-glyph-fireball');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789λ{}<>/+=*';
  const colors = ['#d1092b', '#7025b6', '#a10a65', '#b82036'];
  // Seeded placement avoids a different composition on every redraw.
  let seed = 7631;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const particles = Array.from({ length: 540 }, () => ({
    angle: random() * Math.PI * 2,
    latitude: Math.acos(2 * random() - 1),
    radius: .26 + Math.pow(random(), .65) * .62,
    phase: random() * Math.PI * 2,
    speed: .12 + random() * .2,
    glyph: Math.floor(random() * alphabet.length),
    color: Math.floor(random() * colors.length)
  }));
  let size = 0, frame = 0, last = -Infinity, elapsed = 0, previous = null;
  let visible = true;
  const draw = t => {
    ctx.clearRect(0, 0, size, size);
    const unit = size * .43;
    const projected = particles.map(p => {
      const a = p.angle + t * p.speed;
      // Circular swirl + radial breathing: no falling columns, no vertical drift.
      const r = p.radius * (1 + .07 * Math.sin(t * .65 + p.phase));
      const x = Math.cos(a) * Math.sin(p.latitude) * r;
      const z = Math.sin(a) * Math.sin(p.latitude) * r;
      const y = Math.cos(p.latitude) * r;
      return { p, x, z, y: y * .88 + .2 * x, depth: (z + 1) / 2 };
    }).sort((a, b) => a.z - b.z);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const { p, x, y, depth } of projected) {
      ctx.globalAlpha = .16 + depth * .72;
      ctx.fillStyle = colors[p.color];
      ctx.font = `500 ${Math.max(8, size * (.011 + depth * .008))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.save();
      ctx.translate(size / 2 + x * unit, size / 2 + y * unit);
      ctx.rotate(.16 * Math.sin(t * .35 + p.phase));
      ctx.fillText(alphabet[(p.glyph + Math.floor(t * .35 + p.phase)) % alphabet.length], 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };
  const tick = now => {
    frame = 0;
    if (!visible || document.hidden || motion.matches) return;
    if (previous !== null) elapsed += Math.min(now - previous, 100) / 1000;
    previous = now;
    if (now - last >= 1000 / 30) { draw(elapsed); last = now; }
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = null;
    if (motion.matches) draw(0);
    else if (visible && !document.hidden) frame = requestAnimationFrame(tick);
  };
  const resize = () => {
    size = canvas.getBoundingClientRect().width;
    if (!size) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(motion.matches ? 0 : elapsed);
  };
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }).observe(canvas);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  resize();
  sync();
})();
