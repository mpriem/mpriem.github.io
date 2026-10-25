// The 90s Memphis wallpaper behind the photo and the full screen games, laid
// out afresh on every visit: the shapes of memphis.svg, scattered at random
// over one large tile so the repeat is hard to spot. index.html falls back to
// memphis.svg until this has run.
(() => {
  'use strict';

  // The tile, in CSS pixels, and the space every shape keeps around it.
  const T = 960;
  const GAP = 26;
  const COLORS = ['#2bd4c4', '#ff4fa3', '#ffcc33', '#8b6bff'];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = list => list[Math.floor(Math.random() * list.length)];

  // Each shape is drawn around (0, 0) and knows its radius, for spacing.
  // Outlines take the stroke colour, solids the fill.
  const line = d => c => `<path d="${d}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  const solid = d => c => `<path d="${d}" fill="${c}"/>`;
  const dots = points => () => `<g fill="#e8e0ff" opacity="0.5">${
    points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')}</g>`;
  const grid = [];
  for (let y = -10; y <= 10; y += 10) for (let x = -10; x <= 10; x += 10) grid.push([x, y]);
  const SHAPES = [
    { r: 40, w: 3, draw: line('M-40 0q10-14 20 0t20 0t20 0t20 0') },           // wave
    { r: 33, w: 2, draw: line('M-33 -6l11 13l11-13l11 13l11-13l11 13') },        // zigzag
    { r: 25, w: 2, draw: line('M-22 13l22-38l22 38z') },                         // triangle
    { r: 19, w: 2, draw: c => `<circle r="17" fill="none" stroke="${c}" stroke-width="5"/>` }, // ring
    { r: 9, w: 2, draw: line('M-5 -5l10 10m0-10l-10 10') },                      // cross
    { r: 16, w: 2, draw: line('M-14 4a14 14 0 0 1 28 0') },                      // arc
    { r: 17, w: 2, draw: solid('M0 -17l15 26h-30z') },                           // solid triangle
    { r: 12, w: 2, draw: solid('M-8 -8h16v16h-16z') },                           // square
    { r: 6, w: 3, draw: c => `<circle r="${pick([4, 5, 6])}" fill="${c}"/>` },    // dot
    { r: 14, w: 2, draw: solid('M-13 -4h26v8h-26z') },                           // bar
    { r: 14, w: 1, draw: dots(grid) },                                           // dot grid
    { r: 12, w: 1, draw: dots([[-6, -8], [4, -2], [-10, 6], [8, 9]]) }           // scattered dots
  ];
  const total = SHAPES.reduce((sum, s) => sum + s.w, 0);
  const shape = () => {
    let n = Math.random() * total;
    return SHAPES.find(s => (n -= s.w) < 0) || SHAPES[0];
  };

  // Throw darts, keeping those clear of the rest. Distances wrap around the
  // tile, so it repeats without crowding or gaps at the seams.
  const placed = [];
  const wrap = d => Math.min(Math.abs(d), T - Math.abs(d));
  for (let tries = 0; tries < 6000 && placed.length < 300; tries++) {
    const s = shape(), x = rnd(0, T), y = rnd(0, T);
    if (placed.every(p => Math.hypot(wrap(p.x - x), wrap(p.y - y)) >= p.s.r + s.r + GAP)) {
      placed.push({ s, x, y });
    }
  }

  // Shapes across an edge are drawn again on the other side.
  const out = [];
  for (const { s, x, y } of placed) {
    const body = s.draw(pick(COLORS)), turn = rnd(0, 360);
    for (const dx of [-T, 0, T]) for (const dy of [-T, 0, T]) {
      const cx = x + dx, cy = y + dy;
      if (cx + s.r < 0 || cx - s.r > T || cy + s.r < 0 || cy - s.r > T) continue;
      out.push(`<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${turn.toFixed(0)})">${body}</g>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" viewBox="0 0 ${T} ${T}">`
    + `<rect width="${T}" height="${T}" fill="#1a1030"/>${out.join('')}</svg>`;
  // Swapped in for memphis.svg in plain rules, once it has loaded, rather than
  // through a CSS variable: browser extensions that restyle pages (dark mode
  // ones) can blank a background they fail to resolve.
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const tile = new Image();
  tile.onload = () => {
    // The shading on top is index.html's, which this has to repeat.
    const style = document.createElement('style');
    style.textContent = `
      body {
        background-image: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.15) 30%, rgba(0, 0, 0, 0.65)), url("${url}");
        background-size: auto, ${T}px;
      }
      #play {
        background-image: linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url("${url}");
        background-size: auto, ${T}px;
      }`;
    document.head.append(style);
  };
  tile.src = url;
})();
