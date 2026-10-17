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
  // Rasterize each glyph/color ONCE, never lay out 900 text runs per frame.
  const cell = 40, columns = 16;
  const atlas = document.createElement('canvas');
  atlas.width = columns * cell;
  atlas.height = Math.ceil(alphabet.length * colors.length / columns) * cell;
  const ink = atlas.getContext('2d');
  if (!ink) return;
  ink.font = '500 28px ui-monospace, SFMono-Regular, Menlo, monospace';
  ink.textAlign = 'center';
  ink.textBaseline = 'middle';
  for (let color = 0; color < colors.length; color++) {
    ink.fillStyle = colors[color];
    for (let glyph = 0; glyph < alphabet.length; glyph++) {
      const index = color * alphabet.length + glyph;
      ink.fillText(alphabet[glyph], (index % columns + .5) * cell,
        (Math.floor(index / columns) + .5) * cell);
    }
  }
  // Seeded placement avoids a different composition on every redraw.
  let seed = 7631;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const particles = Array.from({ length: 900 }, () => ({
    angle: random() * Math.PI * 2,
    latitude: Math.acos(2 * random() - 1),
    radius: .26 + Math.pow(random(), .65) * .62,
    phase: random() * Math.PI * 2,
    speed: .12 + random() * .2,
    glyph: Math.floor(random() * alphabet.length),
    color: Math.floor(random() * colors.length)
  }));
  for (const p of particles) {
    p.sinLatitude = Math.sin(p.latitude);
    p.cosLatitude = Math.cos(p.latitude);
  }
  let width = 0, height = 0, frame = 0, last = -Infinity, elapsed = 0, previous = null;
  let visible = true;
  const draw = t => {
    ctx.clearRect(0, 0, width, height);
    const unit = Math.max(width, height) * .65;
    // No per-frame arrays, sorting, font changes or save/restore stacks.
    // Translucent glyphs have no opaque surfaces needing depth sorting.
    for (const p of particles) {
      const a = p.angle + t * p.speed;
      // Circular swirl + radial breathing: no falling columns, no vertical drift.
      const r = p.radius * (1 + .07 * Math.sin(t * .65 + p.phase));
      const x = Math.cos(a) * p.sinLatitude * r;
      const z = Math.sin(a) * p.sinLatitude * r;
      const y = p.cosLatitude * r * .88 + .2 * x;
      const depth = (z + 1) / 2;
      ctx.globalAlpha = .16 + depth * .72;
      const fontSize = Math.max(9, Math.min(19, Math.min(width, height) * (.013 + depth * .012)));
      const side = fontSize * cell / 28;
      const glyph = (p.glyph + Math.floor(t * .35 + p.phase)) % alphabet.length;
      const index = p.color * alphabet.length + glyph;
      ctx.drawImage(atlas, index % columns * cell, Math.floor(index / columns) * cell,
        cell, cell, Math.round(width / 2 + x * unit - side / 2),
        Math.round(height / 2 + y * unit - side / 2), side, side);
    }
    ctx.globalAlpha = 1;
  };
  const tick = now => {
    frame = 0;
    if (!visible || document.hidden || motion.matches) return;
    if (previous !== null) elapsed += Math.min(now - previous, 100) / 1000;
    previous = now;
    // Aim for the display cadence (up to 60 fps), not a jittery 30 fps gate.
    if (now - last >= 1000 / 60 - 1) { draw(elapsed); last = now; }
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
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    if (!width || !height) return;
    // Preserve all 900 glyphs; limit backing pixels rather than density.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5,
      Math.sqrt(4000000 / (width * height)));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
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
