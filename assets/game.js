// Mark Priem's island: a tiny SCUMM-style point & click landing page.
// Everything is drawn on a 549x306 canvas, the native pixel grid of home.png,
// and the browser scales it up with nearest-neighbour filtering.
(() => {
  'use strict';

  const W = 549, H = 306, BAR = 38;

  // The canvas plays behind the monitor in PC.webp, whose glass is cut out.
  // Measured in that photo's pixels: the photo, the glass opening, and the
  // whole monitor (which should always stay in view).
  const PC = { w: 1671, h: 941 };
  const GLASS = { x: 473, y: 137, w: 716, h: 483 };
  const MONITOR = { w: 890, h: 700 };
  // Right edge of the tower's power button (boot.js), kept in view when the
  // monitor allows, and the button itself: centre and radius.
  const POWER_RIGHT = 1625;
  const POWER = { x: 1568, y: 577, r: 43 };
  // Photo pixels per scene pixel: the canvas covers the glass with a little
  // to spare under the bezel. The glass is squarer than the canvas, so SIDE
  // columns on the left and right (and TOP rows top and bottom) end up behind
  // the bezel; the interface keeps clear of them.
  const FILL = Math.max(GLASS.w / W, GLASS.h / (H + BAR)) * 1.02;
  const SIDE = Math.ceil((W - GLASS.w / FILL) / 2);
  const TOP = Math.ceil((H + BAR - GLASS.h / FILL) / 2);
  const inView = p => p.x >= SIDE && p.x < W - SIDE && p.y >= TOP && p.y < H + BAR - TOP;
  const GRID = { x: 7, y: 5, size: 10 }; // home.png is painted in 10px blocks, offset by (7,5)
  const USER = 'mpriem';
  const SITE_REPO = 'mpriem.github.io';
  const FONT = '8px "Press Start 2P", monospace';
  const CHAR_W = 8;
  const DEBUG = new URLSearchParams(location.search).has('debug');

  // Houses already painted in home.png, best spot first. Repos are handed out
  // in this order. rect = [x0, y0, x1, y1] hotspot, door = where the kid stands.
  const HOUSES = [
    { id: 'hall',     rect: [276, 170, 352, 208], door: [334, 209] },
    { id: 'tower',    rect: [283, 133, 305, 170], door: [283, 162] },
    { id: 'hilltop',  rect: [207, 116, 250, 139], door: [241, 138] },
    { id: 'wharf-e',  rect: [186, 178, 233, 207], door: [214, 209] },
    { id: 'stilts',   rect: [370, 155, 401, 181], door: [386, 209] },
    { id: 'cottage',  rect: [249, 167, 268, 181], door: [258, 184] },
    { id: 'wharf-w',  rect: [130, 185, 186, 207], door: [158, 209] },
    { id: 'hut',      rect: [346, 166, 368, 187], door: [362, 209] },
    { id: 'cliff-c',  rect: [149, 153, 187, 175], door: [170, 209] },
    { id: 'cliff-b',  rect: [110, 143, 150, 162], door: [128, 209] },
    { id: 'ridge',    rect: [430, 137, 472, 151], door: [396, 209] },
    { id: 'lookout',  rect: [442,  92, 472, 137], door: [396, 209] },
    { id: 'castle',   rect: [322,  12, 371,  54], door: [283, 162] }
  ];

  // White pixels in this image are where the kid can walk. It was traced from
  // the dirt path in home.png; touch it up in any paint program.
  const WALK_MASK = 'assets/walkmask.png';

  // Perspective: how tall the kid is (in pixels) with his feet at a given y.
  const DEPTH = [[135, 7], [165, 8], [190, 9], [212, 10], [240, 15], [270, 22], [306, 30], [340, 34]];

  const VERBS = [
    { id: 'walk', label: 'Walk to', key: 'w', col: 0, row: 0 },
    { id: 'look', label: 'Look at', key: 'l', col: 1, row: 0 },
    { id: 'use',  label: 'Use',     key: 'u', col: 0, row: 1 },
    { id: 'talk', label: 'Talk to', key: 't', col: 1, row: 1 }
  ].map(v => ({ ...v, x: SIDE + 8 + v.col * 72, y: H + 13 + v.row * 11, w: 68, h: 10 }));

  // Used when the GitHub API is unreachable or rate limited.
  const FALLBACK_REPOS = [
    { name: 'omarchy-background-changer', description: '', language: 'Shell', stars: 16 },
    { name: 'omarchy-backdrop-plugin', description: 'Distinctive wallpapers, per-monitor picks, automatic rotation, and smooth transitions; all from your bar.', language: 'QML', stars: 3 },
    { name: 'omarchy-keystrokes-plugin', description: 'Make every keystroke count. Beautiful, themed keycaps for Omarchy screencasts, streams, and demos.', language: 'QML', stars: 2 },
    { name: 'omarchy-harpoon-plugin', description: 'Bookmark Hyprland windows and summon them to your current workspace. A Harpoon-inspired plugin for Omarchy.', language: 'Lua', stars: 0 },
    { name: 'omarchy-background-changer-rust', description: '', language: 'Rust', stars: 0 },
    { name: 'keystroke-overlay', description: '', language: 'Python', stars: 0 },
    { name: 'eww-activewindow', description: '', language: 'Python', stars: 0 },
    { name: 'openapi-core-recursion-error', description: 'Temporary repo created to reproduce an issue with openapi-core package', language: 'Python', stars: 0 },
    { name: 'azfunctions-v4-devcontainer', description: 'Dev container for Azure Functions v4', language: 'Dockerfile', stars: 0 },
    { name: 'azfunc-convertHtml2Pdf', description: '', language: 'C#', stars: 0 }
  ].map(r => ({ ...r, url: `https://github.com/${USER}/${r.name}` }));

  const KNOCKS = ['Hello? Anybody home?', 'Knock knock!', 'Ahoy in there!'];
  const GRUMBLES = [
    "Go away, kid. I'm compiling!",
    "Shhh! The tests are finally passing.",
    "We don't take kindly to merge conflicts around here.",
    "Who's there? ...Wipe your boots before you come in."
  ];

  const COLORS = {
    verb: '#5fc9c9', object: '#f6ee6a', detail: '#9d8fe0', speech: '#ffffff', house: '#f0a860',
    verbIdle: '#2f8a8a', verbHover: '#9ff0f0', verbActive: '#ffffff'
  };

  const pick = list => list[Math.floor(Math.random() * list.length)];
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  const canvas = document.getElementById('game');
  canvas.width = W;
  canvas.height = H + BAR;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    return [c, g];
  }

  // ---------------------------------------------------------------- walking

  let walk = null;

  function buildWalkGrid(img) {
    const [c, g] = makeCanvas(W, H);
    g.drawImage(img, 0, 0, W, H);
    const data = g.getImageData(0, 0, W, H).data;
    const grid = new Uint8Array(W * H);
    const cells = [];
    for (let i = 0; i < W * H; i++) {
      if (data[i * 4] > 127 && data[i * 4 + 3] > 127) {
        grid[i] = 1;
        cells.push(i);
      }
    }
    // Overlay for ?debug: walkable pixels in green.
    const overlay = g.createImageData(W, H);
    for (const i of cells) overlay.data.set([0, 255, 90, 255], i * 4);
    g.putImageData(overlay, 0, 0);
    return { grid, cells, dist: distanceToEdge(grid), canvas: c };
  }

  // Chamfer distance from every walkable pixel to the nearest edge of the
  // path, so the kid can keep to the middle instead of hugging the verge.
  function distanceToEdge(grid) {
    const d = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) d[i] = grid[i] ? 1e6 : 0;
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : d[y * W + x]);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (d[i]) d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.4, at(x + 1, y - 1) + 1.4);
      }
    }
    for (let y = H - 1; y >= 0; y--) {
      for (let x = W - 1; x >= 0; x--) {
        const i = y * W + x;
        if (d[i]) d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.4, at(x - 1, y + 1) + 1.4);
      }
    }
    return d;
  }

  const walkable = (x, y) => x >= 0 && y >= 0 && x < W && y < H && walk.grid[y * W + x] === 1;

  function nearestWalkable(x, y) {
    x = Math.round(x);
    y = Math.round(y);
    if (walkable(x, y)) return [x, y];
    let best = 0, bestD = Infinity;
    for (const i of walk.cells) {
      const dx = (i % W) - x, dy = ((i / W) | 0) - y, d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    }
    return [best % W, (best / W) | 0];
  }

  class Heap {
    constructor() { this.pri = []; this.val = []; }
    get size() { return this.val.length; }
    push(val, pri) {
      const p = this.pri, v = this.val;
      let i = v.length;
      p.push(pri); v.push(val);
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (p[parent] <= pri) break;
        p[i] = p[parent]; v[i] = v[parent];
        i = parent;
      }
      p[i] = pri; v[i] = val;
    }
    pop() {
      const p = this.pri, v = this.val, top = v[0];
      const lastP = p.pop(), lastV = v.pop(), n = v.length;
      if (n) {
        let i = 0;
        for (;;) {
          let c = 2 * i + 1;
          if (c >= n) break;
          if (c + 1 < n && p[c + 1] < p[c]) c++;
          if (p[c] >= lastP) break;
          p[i] = p[c]; v[i] = v[c];
          i = c;
        }
        p[i] = lastP; v[i] = lastV;
      }
      return top;
    }
  }

  const SQRT2 = Math.SQRT2;
  const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2]];
  const cost = new Float32Array(W * H);
  const came = new Int32Array(W * H);
  const closed = new Uint8Array(W * H);

  // A* over the walk mask (8-way, no corner cutting). Steps near the edge of
  // the path cost more, so the route keeps to the middle. Then string-pulled.
  function findPath([sx, sy], [tx, ty]) {
    const start = sy * W + sx, goal = ty * W + tx;
    cost.fill(Infinity);
    came.fill(-1);
    closed.fill(0);
    const octile = (x, y) => {
      const dx = Math.abs(x - tx), dy = Math.abs(y - ty);
      return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
    };
    const open = new Heap();
    cost[start] = 0;
    open.push(start, octile(sx, sy));
    while (open.size) {
      const cur = open.pop();
      if (cur === goal) break;
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cx = cur % W, cy = (cur / W) | 0;
      for (const [dx, dy, step] of DIRS) {
        const nx = cx + dx, ny = cy + dy;
        if (!walkable(nx, ny)) continue;
        if (dx && dy && (!walkable(cx + dx, cy) || !walkable(cx, cy + dy))) continue;
        const n = ny * W + nx, c = cost[cur] + step * (1 + 1.5 / walk.dist[n]);
        if (c < cost[n]) {
          cost[n] = c;
          came[n] = cur;
          open.push(n, c + octile(nx, ny));
        }
      }
    }
    if (start !== goal && came[goal] === -1) return null;
    const cells = [];
    for (let i = goal; i !== -1; i = came[i]) {
      cells.push([i % W, (i / W) | 0]);
      if (i === start) break;
    }
    cells.reverse();
    return stringPull(cells);
  }

  // A straight line is only taken if it keeps clear of the path's edges.
  function clearLine([ax, ay], [bx, by]) {
    const need = Math.min(3, walk.dist[ay * W + ax], walk.dist[by * W + bx]);
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = Math.round(ax + (bx - ax) * t), y = Math.round(ay + (by - ay) * t);
      if (!walkable(x, y) || walk.dist[y * W + x] < need) return false;
    }
    return true;
  }

  function stringPull(cells) {
    const out = [cells[0]];
    let i = 0;
    while (i < cells.length - 1) {
      let j = i + 1;
      while (j + 1 < cells.length && clearLine(cells[i], cells[j + 1])) j++;
      out.push(cells[j]);
      i = j;
    }
    return out;
  }

  function heightAt(y) {
    if (y <= DEPTH[0][0]) return DEPTH[0][1];
    for (let i = 1; i < DEPTH.length; i++) {
      const [y1, h1] = DEPTH[i];
      if (y <= y1) {
        const [y0, h0] = DEPTH[i - 1];
        return h0 + (h1 - h0) * (y - y0) / (y1 - y0);
      }
    }
    return DEPTH[DEPTH.length - 1][1];
  }

  // ---------------------------------------------------------------- the kid

  const FRAMES = buildFrames(window.KID);

  function buildFrames(K) {
    const stamp = (grid, rows, x, y, flip) => rows.forEach((row, j) => {
      [...(flip ? [...row].reverse().join('') : row)].forEach((ch, i) => {
        if (ch !== '.' && grid[y + j] && x + i >= 0 && x + i < 16) grid[y + j][x + i] = ch;
      });
    });
    const swapLegs = { 1: '2', 2: '1', 3: '4', 4: '3' };
    let nextId = 0;
    const compose = (view, legs, { arm, swap, flipLegs } = {}) => {
      const grid = Array.from({ length: 32 }, () => Array(16).fill('.'));
      stamp(grid, K.legs[legs], 0, 20, flipLegs);
      stamp(grid, K.torso[view], 0, 11);
      if (arm) stamp(grid, K.arm[arm].rows, K.arm[arm].at[0], K.arm[arm].at[1]);
      stamp(grid, K.head[view], 0, 0);
      const rows = grid.map(r => r.map(ch => (swap && swapLegs[ch]) || ch).join(''));
      const talk = { id: nextId++, rows: rows.map(r => r.replace(/m/g, 'M')) };
      return { id: nextId++, rows, talk };
    };
    return {
      side: {
        stand: compose('side', 'sideStand', { arm: 'down' }),
        walk: [
          compose('side', 'sideContact', { arm: 'back' }),
          compose('side', 'sidePass', { arm: 'down' }),
          compose('side', 'sideContact', { arm: 'forward', swap: true }),
          compose('side', 'sidePass', { arm: 'down', swap: true })
        ]
      },
      front: {
        stand: compose('front', 'frontStand'),
        walk: [
          compose('front', 'frontStep'),
          compose('front', 'frontStand'),
          compose('front', 'frontStep', { flipLegs: true }),
          compose('front', 'frontStand')
        ]
      },
      back: {
        stand: compose('back', 'frontStand'),
        walk: [
          compose('back', 'frontStep'),
          compose('back', 'frontStand'),
          compose('back', 'frontStep', { flipLegs: true }),
          compose('back', 'frontStand')
        ]
      }
    };
  }

  // Moonlight: pull the sprite colours towards the scene's blue night.
  const PALETTE = Object.fromEntries(Object.entries(window.KID.palette).map(([ch, hex]) => {
    const n = parseInt(hex.slice(1), 16);
    return [ch, [((n >> 16) & 255) * 0.78 + 10, ((n >> 8) & 255) * 0.8 + 10, (n & 255) * 0.86 + 34].map(Math.round)];
  }));

  // Scale a 16x32 frame to the given height while staying pure pixel art:
  // each target pixel takes the most common palette colour under it, so no
  // blended in-between colours appear.
  const spriteCache = new Map();
  function spriteImage(frame, h, mirror) {
    const key = `${frame.id}|${h}|${mirror}`;
    let img = spriteCache.get(key);
    if (img) return img;
    const w = Math.max(3, Math.round(h / 2));
    const [c, g] = makeCanvas(w, h);
    const out = g.createImageData(w, h);
    const n = 4, outlineWeight = h >= 24 ? 1 : h >= 14 ? 0.6 : 0.35;
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const votes = {};
        let solid = 0;
        for (let sy = 0; sy < n; sy++) {
          for (let sx = 0; sx < n; sx++) {
            const x = Math.floor((tx + (sx + 0.5) / n) * 16 / w);
            const y = Math.floor((ty + (sy + 0.5) / n) * 32 / h);
            const ch = frame.rows[y][mirror ? 15 - x : x];
            if (ch === '.') continue;
            solid++;
            votes[ch] = (votes[ch] || 0) + (ch === 'k' ? outlineWeight : 1);
          }
        }
        if (solid / (n * n) < 0.45) continue;
        let best = null;
        for (const ch in votes) if (!best || votes[ch] > votes[best]) best = ch;
        const [r, gr, b] = PALETTE[best], o = (ty * w + tx) * 4;
        out.data[o] = r; out.data[o + 1] = gr; out.data[o + 2] = b; out.data[o + 3] = 255;
      }
    }
    g.putImageData(out, 0, 0);
    spriteCache.set(key, c);
    return c;
  }

  const kid = {
    x: 318, y: 338, dir: 'back',
    path: [], walkT: 0, onArrive: null,
    speech: [], speechT: 0, idleT: 0
  };

  if (DEBUG) window.kid = kid;

  function walkTo(target, onArrive) {
    const path = findPath(nearestWalkable(kid.x, kid.y), nearestWalkable(...target));
    if (!path) return;
    kid.path = path.slice(1);
    kid.onArrive = onArrive || null;
    kid.speech = [];
    if (!kid.path.length) arrive();
  }

  function arrive() {
    const fn = kid.onArrive;
    kid.onArrive = null;
    kid.walkT = 0;
    kid.idleT = 0;
    if (fn) fn();
  }

  function face(house) {
    const [x0, y0, x1, y1] = house.rect;
    const dx = (x0 + x1) / 2 - kid.x, dy = (y0 + y1) / 2 - kid.y;
    kid.dir = Math.abs(dx) > Math.abs(dy) * 1.5 ? (dx > 0 ? 'right' : 'left') : 'back';
  }

  // Lines are spoken by the kid, or by a house when given as { who, text }.
  function say(lines) {
    kid.speech = lines.map(l => (typeof l === 'string' ? { who: kid, text: l } : l));
    kid.speechT = 0;
  }

  const timers = [];
  const later = (sec, fn) => timers.push({ at: clock + sec, fn });

  function updateKid(dt) {
    if (kid.path.length) {
      const [tx, ty] = kid.path[0];
      const dx = tx - kid.x, dy = ty - kid.y, dist = Math.hypot(dx, dy);
      // Walking "into" the screen covers less ground, like the old SCUMM actors.
      const ux = dist ? dx / dist : 0, uy = dist ? dy / dist : 0;
      const speed = heightAt(kid.y) * 2.4 * (Math.abs(ux) + 0.6 * Math.abs(uy)) / (Math.abs(ux) + Math.abs(uy) || 1);
      if (dist > 0.01) kid.dir = Math.abs(dx) > Math.abs(dy) * 0.9 ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'front' : 'back');
      const step = speed * dt;
      if (step >= dist - 0.01) {
        kid.x = tx; kid.y = ty;
        kid.path.shift();
        if (!kid.path.length) arrive();
      } else {
        kid.x += ux * step;
        kid.y += uy * step;
      }
      kid.walkT += dt;
    }
    if (kid.speech.length) {
      kid.speechT += dt;
      if (kid.speechT > 1.4 + kid.speech[0].text.length * 0.055) {
        kid.speech.shift();
        kid.speechT = 0;
      }
    } else if (!kid.path.length) {
      kid.idleT += dt;
      if (kid.idleT > 9 && kid.dir !== 'front') kid.dir = 'front';
    }
  }

  function drawKid() {
    const view = kid.dir === 'left' || kid.dir === 'right' ? 'side' : kid.dir;
    const set = FRAMES[view];
    const talking = kid.speech.length && kid.speech[0].who === kid;
    let frame = kid.path.length ? set.walk[Math.floor(kid.walkT * 8) % set.walk.length] : set.stand;
    if (talking && !kid.path.length && view !== 'back' && Math.floor(clock * 7) % 2) frame = frame.talk;
    const h = Math.round(heightAt(kid.y));
    const img = spriteImage(frame, h, kid.dir === 'left');
    const x = Math.round(kid.x - img.width / 2), y = Math.round(kid.y) - h + 1;
    // Shadow
    const sw = Math.max(3, Math.round(img.width * 0.9));
    ctx.fillStyle = 'rgba(6, 3, 18, 0.45)';
    ctx.fillRect(Math.round(kid.x - sw / 2), Math.round(kid.y), sw, 1);
    if (h > 16) ctx.fillRect(Math.round(kid.x - sw / 2) + 1, Math.round(kid.y) + 1, sw - 2, 1);
    ctx.drawImage(img, x, y);
  }

  // ---------------------------------------------------------------- text

  let fontReady = false;
  const textCache = new Map();
  const [, measureCtx] = makeCanvas(1, 1);

  // Text is rasterised once at 4x, sampled back down at the centre of every
  // 4x4 block so each glyph pixel lands on the grid, and given a black
  // outline, so it stays crisp at the scene's resolution.
  function textImage(str, color) {
    const key = `${color}|${str}`;
    let img = textCache.get(key);
    if (img) return img;
    const S = 4;
    measureCtx.font = FONT.replace('8px', `${8 * S}px`);
    const w = Math.ceil(measureCtx.measureText(str).width / S) + 4, h = 12;
    const [big, bg] = makeCanvas(w * S, h * S);
    bg.font = measureCtx.font;
    bg.textBaseline = 'top';
    bg.fillStyle = '#fff';
    bg.fillText(str, 2 * S, 2 * S);
    const src = bg.getImageData(0, 0, w * S, h * S).data;
    const [c, g] = makeCanvas(w, h);
    const out = g.createImageData(w, h);
    const n = parseInt(color.slice(1), 16), rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const on = i => src[((((i / w) | 0) * S + S / 2) * w * S + (i % w) * S + S / 2) * 4 + 3] >= 128;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x, o = i * 4;
        if (on(i)) {
          out.data.set([...rgb, 255], o);
          continue;
        }
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < w && ny < h && on(ny * w + nx)) out.data[o + 3] = 255;
          }
        }
      }
    }
    g.putImageData(out, 0, 0);
    if (fontReady) textCache.set(key, c);
    return c;
  }

  function wrap(str, maxChars) {
    const lines = [];
    let line = '';
    for (const word of str.split(' ')) {
      if (line && (line + ' ' + word).length > maxChars) {
        lines.push(line);
        line = word;
      } else {
        line = line ? line + ' ' + word : word;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function drawTextCentered(lines, cx, bottom, color) {
    const imgs = lines.map(l => textImage(l, color));
    let y = Math.max(0, bottom - imgs.length * 9);
    for (const img of imgs) {
      ctx.drawImage(img, Math.round(clamp(cx - img.width / 2, SIDE + 4, W - SIDE - 4 - img.width)), Math.round(y));
      y += 9;
    }
  }

  // ---------------------------------------------------------------- scene

  let background = null;
  let hotspots = [];
  let lights = [];
  let hover = null;
  let verb = 'walk';
  let verbHover = null;
  let leaving = null; // { t, url } while fading out through a door
  let started = false; // ADVENTURE.EXE has been run
  const mouse = { x: -99, y: -99, visible: false };

  const image = new Image();
  image.onload = () => {
    const [c, g] = makeCanvas(W, H);
    g.drawImage(image, GRID.x, GRID.y, W * GRID.size, H * GRID.size, 0, 0, W, H);
    background = c;
    buildLights();
  };
  image.src = 'assets/home.png';

  const mask = new Image();
  mask.onload = () => { walk = buildWalkGrid(mask); };
  mask.src = WALK_MASK;

  loadRepos().then(repos => {
    hotspots = HOUSES.slice(0, repos.length)
      .map((house, i) => ({ ...house, repo: repos[i] }))
      .sort((a, b) => area(a.rect) - area(b.rect));
    fillRepoList(repos);
    buildLights();
  });

  const area = ([x0, y0, x1, y1]) => (x1 - x0) * (y1 - y0);

  async function loadRepos() {
    try {
      const cached = sessionStorage.getItem('repos');
      if (cached) return JSON.parse(cached);
    } catch (e) { /* storage unavailable */ }
    try {
      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 4000);
      const res = await fetch(`https://api.github.com/users/${USER}/repos?per_page=100`, { signal: abort.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(res.status);
      const repos = (await res.json())
        .filter(r => !r.fork && !r.archived && r.name !== SITE_REPO)
        .sort((a, b) => b.stargazers_count - a.stargazers_count || b.pushed_at.localeCompare(a.pushed_at))
        .map(r => ({ name: r.name, description: r.description || '', language: r.language || '', stars: r.stargazers_count, url: r.html_url }));
      if (!repos.length) throw new Error('no repos');
      try { sessionStorage.setItem('repos', JSON.stringify(repos)); } catch (e) { /* ignore */ }
      return repos;
    } catch (e) {
      return FALLBACK_REPOS;
    }
  }

  function fillRepoList(repos) {
    const list = document.getElementById('repo-list');
    if (!list) return;
    list.replaceChildren(...repos.map(r => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = r.url;
      a.textContent = r.description ? `${r.name}: ${r.description}` : r.name;
      li.append(a);
      return li;
    }));
  }

  // Candlelight: find the warm window pixels already painted in each repo
  // house and give every window its own flickering glow on top.
  function buildLights() {
    if (!background || !hotspots.length || lights.length) return;
    let data;
    try {
      data = background.getContext('2d').getImageData(0, 0, W, H).data;
    } catch (e) {
      console.warn('Candlelight disabled: serve the page over http(s) instead of file://', e);
      return;
    }
    const warm = (x, y) => {
      const o = (y * W + x) * 4, r = data[o], g = data[o + 1], b = data[o + 2];
      return r > 170 && g > 95 && b < 130 && r - b > 90;
    };
    for (const house of hotspots) {
      const [x0, y0, x1, y1] = house.rect;
      const seen = new Set();
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          if (seen.has(y * W + x) || !warm(x, y)) continue;
          // Flood fill one window.
          const pixels = [], stack = [[x, y]];
          seen.add(y * W + x);
          while (stack.length) {
            const [px, py] = stack.pop();
            pixels.push([px, py]);
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nx = px + dx, ny = py + dy, k = ny * W + nx;
                if (nx < x0 || ny < y0 || nx >= x1 || ny >= y1 || seen.has(k) || !warm(nx, ny)) continue;
                seen.add(k);
                stack.push([nx, ny]);
              }
            }
          }
          lights.push(makeLight(house, pixels));
        }
      }
    }
  }

  function makeLight(house, pixels) {
    const R = 3;
    const xs = pixels.map(p => p[0]), ys = pixels.map(p => p[1]);
    const lx = Math.min(...xs) - R, ly = Math.min(...ys) - R;
    const w = Math.max(...xs) - lx + R + 1, h = Math.max(...ys) - ly + R + 1;
    const [glow, gg] = makeCanvas(w, h);
    const [dim, dg] = makeCanvas(w, h);
    const halo = new Float32Array(w * h);
    const core = new Set(pixels.map(([x, y]) => (y - ly) * w + (x - lx)));
    for (const [px, py] of pixels) {
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const d = Math.hypot(dx, dy), i = (py - ly + dy) * w + (px - lx + dx);
          // Stepped falloff keeps the halo looking hand-dithered.
          const a = d <= 1.5 ? 0.4 : d <= 2.3 ? 0.22 : d <= 3.2 ? 0.1 : 0;
          if (a > halo[i]) halo[i] = a;
        }
      }
    }
    const gd = gg.createImageData(w, h), dd = dg.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      if (core.has(i)) {
        gd.data.set([255, 205, 120, 255], o);
        dd.data.set([12, 5, 2, 210], o);
      } else if (halo[i]) {
        gd.data.set([255, 140, 50, Math.round(halo[i] * 255)], o);
      }
    }
    gg.putImageData(gd, 0, 0);
    dg.putImageData(dd, 0, 0);
    const seed = Math.random() * 1000;
    return { house, x: lx, y: ly, glow, dim, seed };
  }

  function flicker(light, t) {
    const s = light.seed;
    let f = 0.16 + 0.12 * Math.sin(t * 4.3 + s) + 0.08 * Math.sin(t * 10.7 + s * 1.7) + 0.06 * Math.sin(t * 23.1 + s * 2.3);
    // A cheap hash per ~1/12s for the jittery part of a candle.
    const n = Math.sin(Math.floor(t * 12) * 12.9898 + s * 78.233) * 43758.5453;
    f += (n - Math.floor(n) - 0.5) * 0.14;
    // Now and then a draught nearly snuffs it.
    if (Math.sin(t * 0.7 + s) > 0.985) f -= 0.5;
    return f;
  }

  function drawLights() {
    for (const light of lights) {
      const f = flicker(light, clock) + (light.house === hover ? 0.3 : 0);
      if (f > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, f);
        ctx.drawImage(light.glow, light.x, light.y);
      } else {
        ctx.globalAlpha = Math.min(1, -f);
        ctx.drawImage(light.dim, light.x, light.y);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  }

  const houseAt = (x, y) => hotspots.find(({ rect: [x0, y0, x1, y1] }) => x >= x0 && x < x1 && y >= y0 && y < y1) || null;

  // ---------------------------------------------------------------- verbs

  function act(verbId, house) {
    const { name, description, language, stars } = house.repo;
    const atDoor = then => walkTo(house.door, () => {
      face(house);
      later(0.5, () => { if (!kid.path.length) then(); });
    });

    if (verbId === 'walk') {
      atDoor(() => {});
    } else if (verbId === 'look') {
      // Looking needs no walk: he just turns and has a good look.
      kid.path = [];
      kid.onArrive = null;
      face(house);
      later(0.5, () => {
        if (kid.path.length) return;
        kid.dir = 'front';
        say([
          `That's ${name}.`,
          description || (language ? `Smells like ${language} in there. No sign says more.` : 'No sign says more. Very mysterious.'),
          stars ? `Somebody carved ${plural(stars, 'star')} into the door.` : 'Not a single star carved into the door. Yet.'
        ]);
      });
    } else if (verbId === 'talk') {
      atDoor(() => say([
        pick(KNOCKS),
        { who: house, text: pick(GRUMBLES) },
        { who: house, text: stars ? `${plural(stars, 'star')} so far. Bring me another and we'll talk.` : 'Nobody has starred me yet. You could be the first!' }
      ]));
    } else if (verbId === 'use') {
      atDoor(() => { leaving = { t: 0, url: house.repo.url }; });
    }
  }

  const verbLabel = id => VERBS.find(v => v.id === id).label;
  const verbAt = (x, y) => VERBS.find(v => x >= v.x && x < v.x + v.w && y >= v.y && y < v.y + v.h) || null;

  // ---------------------------------------------------------------- input

  function toScene(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - r.left) * W / r.width),
      y: Math.floor((e.clientY - r.top) * (H + BAR) / r.height)
    };
  }

  function pointAt(p, visible) {
    if (!inView(p)) {
      mouse.visible = false;
      hover = null;
      verbHover = null;
      return;
    }
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.visible = visible;
    hover = p.y < H ? houseAt(p.x, p.y) : null;
    verbHover = p.y >= H ? verbAt(p.x, p.y) : null;
  }

  // The canvas reaches under the bezel; there it is just part of the photo.
  canvas.addEventListener('pointermove', e => {
    const p = toScene(e);
    canvas.style.cursor = inView(p) ? '' : 'default';
    pointAt(p, e.pointerType === 'mouse');
  });
  canvas.addEventListener('pointerleave', () => {
    mouse.visible = false;
    hover = null;
    verbHover = null;
  });

  canvas.addEventListener('click', e => clickAt(toScene(e)));

  // On phones pad.js steers the crosshair with its stick, at up to SPEED
  // scene pixels a second, and its button clicks where it points.
  const SPEED = 200;
  const stick = { x: 0, y: 0, aim: null };

  window.adventurePad = {
    stick(x, y) {
      stick.x = x;
      stick.y = y;
    },
    button(down) {
      if (down && started && mouse.visible) clickAt(mouse);
    }
  };

  function steer(dt) {
    if (!stick.x && !stick.y) return;
    stick.aim ??= { x: W / 2, y: H / 2 };
    const v = SPEED * Math.hypot(stick.x, stick.y) * dt;
    stick.aim.x = clamp(stick.aim.x + stick.x * v, SIDE, W - SIDE - 1);
    stick.aim.y = clamp(stick.aim.y + stick.y * v, TOP, H + BAR - TOP - 1);
    pointAt({ x: Math.floor(stick.aim.x), y: Math.floor(stick.aim.y) }, true);
  }

  function clickAt(p) {
    if (!background || !walk || leaving || !inView(p)) return;
    if (p.y >= H) {
      const v = verbAt(p.x, p.y);
      if (v) verb = v.id;
      return;
    }
    const house = houseAt(p.x, p.y);
    hover = house;
    if (house) act(verb, house);
    else walkTo([p.x, p.y]);
    verb = 'walk';
  }

  addEventListener('keydown', e => {
    if (!started) return;
    if (e.key === '.' || e.key === 'Escape') { // skip a line, like in the old games
      kid.speech.shift();
      kid.speechT = 0;
      return;
    }
    const v = VERBS.find(v => v.key === e.key.toLowerCase());
    if (v && !e.ctrlKey && !e.metaKey && !e.altKey) verb = v.id;
  });

  // Coming back from GitHub with the back button restores this page as it
  // was left, mid fade; open the curtains again.
  addEventListener('pageshow', e => { if (e.persisted) leaving = null; });

  // Phones and tablets only; a PC keeps the layout below. Held sideways, the
  // photo fills the screen, cropping the keyboard at its bottom (from
  // KEYBOARD down) first. Held upright, the monitor's bezel spans the window
  // edge to edge. In photo pixels; the same queries are in index.html.
  const KEYBOARD = 840;
  const BEZEL = { x: 389, w: 882 };
  const handheld = matchMedia('(hover: none) and (pointer: coarse)');
  const upright = matchMedia('(orientation: portrait)');

  // The scene fits #client, the inside of the window it sits in (index.html):
  // the whole screen, or upright on a phone a Windows 95 window as tall as
  // the photo at its width.
  const client = document.getElementById('client');

  function fit() {
    const phone = handheld.matches, tall = phone && upright.matches;
    client.style.height = tall ? `${PC.h * client.clientWidth / BEZEL.w}px` : '';
    const vw = client.clientWidth, vh = client.clientHeight;
    const s = tall ? vw / BEZEL.w
      : phone ? Math.max(vw / PC.w, vh / PC.h)
      : Math.min(Math.max(vw / PC.w, vh / PC.h), vw / MONITOR.w, vh / MONITOR.h);
    const pw = PC.w * s, ph = PC.h * s;
    // Centre on the screen, but never pull the photo's edge into the window.
    const place = (view, size, centre) => size <= view
      ? (view - size) / 2
      : Math.min(0, Math.max(view - size, view / 2 - centre));
    let left = tall ? -BEZEL.x * s : place(vw, pw, (GLASS.x + GLASS.w / 2) * s);
    if (!tall && left + POWER_RIGHT * s > vw) {
      left = Math.max(vw - POWER_RIGHT * s, vw - pw, -(GLASS.x + GLASS.w / 2 - MONITOR.w / 2) * s);
    }
    const stage = document.getElementById('pc');
    stage.style.width = `${pw}px`;
    stage.style.height = `${ph}px`;
    stage.style.left = `${left}px`;
    const middle = phone && !tall ? KEYBOARD / 2 : GLASS.y + GLASS.h / 2;
    const top = place(vh, ph, middle * s);
    stage.style.top = `${top}px`;
    // With the tower's power button cut off, the monitor's own stands in
    // (index.html).
    const cut = (c, view, offset) => offset + (c - POWER.r) * s < 0 || offset + (c + POWER.r) * s > view;
    stage.classList.toggle('tower-hidden', cut(POWER.x, vw, left) || cut(POWER.y, vh, top));

    // The canvas sits behind the photo, centred on the glass and covering it.
    const cw = W * FILL * s, ch = (H + BAR) * FILL * s;
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    canvas.style.left = `${(GLASS.x + GLASS.w / 2) * s - cw / 2}px`;
    canvas.style.top = `${(GLASS.y + GLASS.h / 2) * s - ch / 2}px`;

    const glass = document.getElementById('glass').style;
    glass.width = `${GLASS.w * s}px`;
    glass.height = `${GLASS.h * s}px`;
    glass.left = `${GLASS.x * s}px`;
    glass.top = `${GLASS.y * s}px`;
  }
  addEventListener('resize', fit);
  fit();

  // ---------------------------------------------------------------- frame

  function drawInterface() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, H, W, BAR);

    // Sentence line: "Look at omarchy-backdrop-plugin"
    const sentenceVerb = verbHover && !hover ? verbHover.id : verb;
    const verbImg = textImage(verbLabel(sentenceVerb), COLORS.verb);
    ctx.drawImage(verbImg, W / 2 - (verbImg.width + (hover ? textImage(hover.repo.name, COLORS.object).width + 2 : 0)) / 2, H + 1);
    if (hover) {
      const nameImg = textImage(hover.repo.name, COLORS.object);
      ctx.drawImage(nameImg, W / 2 - (verbImg.width + nameImg.width + 2) / 2 + verbImg.width + 2, H + 1);
    }

    for (const v of VERBS) {
      const color = v.id === verb ? COLORS.verbActive : v === verbHover ? COLORS.verbHover : COLORS.verbIdle;
      ctx.drawImage(textImage(v.label, color), v.x - 2, v.y - 2);
    }

    // Details of the hovered repo, to the right of the verbs.
    if (hover) {
      const { description, language, stars } = hover.repo;
      const left = VERBS[0].x + 152, maxChars = Math.floor((W - SIDE - 8 - left) / CHAR_W);
      const head = [language, stars ? `*${stars}` : ''].filter(Boolean).join('  ');
      const lines = wrap([head, description].filter(Boolean).join('  '), maxChars);
      if (lines.length > 2) lines[1] = lines[1].slice(0, maxChars - 3).trimEnd() + '...';
      lines.slice(0, 2).forEach((l, i) => ctx.drawImage(textImage(l, COLORS.detail), left - 2, H + 13 + i * 11));
    }
  }

  function drawCursor() {
    if (!mouse.visible) return;
    // The classic crosshair, pulsing through greys.
    const shades = ['#ffffff', '#d8d8d8', '#a8a8a8', '#787878', '#a8a8a8', '#d8d8d8'];
    ctx.fillStyle = shades[Math.floor(clock * 12) % shades.length];
    const { x, y } = mouse;
    ctx.fillRect(x - 5, y, 4, 1);
    ctx.fillRect(x + 2, y, 4, 1);
    ctx.fillRect(x, y - 5, 1, 4);
    ctx.fillRect(x, y + 2, 1, 4);
  }

  function drawSpeech() {
    if (!kid.speech.length) return;
    const { who, text } = kid.speech[0];
    if (who === kid) {
      drawTextCentered(wrap(text, 30), kid.x, Math.min(kid.y, H) - heightAt(kid.y) - 3, COLORS.speech);
    } else {
      const [x0, y0, x1] = who.rect;
      drawTextCentered(wrap(text, 30), (x0 + x1) / 2, y0 - 2, COLORS.house);
    }
  }

  function drawDebug() {
    ctx.globalAlpha = 0.35;
    ctx.drawImage(walk.canvas, 0, 0);
    ctx.globalAlpha = 1;
    for (const h of HOUSES) {
      const [x0, y0, x1, y1] = h.rect;
      ctx.strokeStyle = hotspots.some(s => s.id === h.id) ? '#f0f' : '#888';
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1);
      ctx.fillStyle = '#0ff';
      ctx.fillRect(h.door[0], h.door[1], 1, 1);
    }
    ctx.strokeStyle = '#ff0';
    ctx.beginPath();
    ctx.moveTo(kid.x, kid.y);
    for (const [x, y] of kid.path) ctx.lineTo(x + 0.5, y + 0.5);
    ctx.stroke();
  }

  let clock = 0, last = performance.now(), raf = 0;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    for (let i = timers.length - 1; i >= 0; i--) {
      if (timers[i].at <= clock) timers.splice(i, 1)[0].fn();
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H + BAR);
    steer(dt);
    if (background && walk) {
      updateKid(dt);
      ctx.drawImage(background, 0, 0);
      drawLights();
      drawKid();
      if (DEBUG) drawDebug();
      if (hover && !kid.speech.length) {
        const [x0, y0, x1] = hover.rect;
        drawTextCentered([hover.repo.name], (x0 + x1) / 2, y0 - 1, COLORS.object);
      }
      drawSpeech();
    } else {
      drawTextCentered(['Loading...'], W / 2, H / 2, COLORS.speech);
    }
    drawInterface();
    drawCursor();

    // Going inside: fade to black, then follow the door to GitHub.
    if (leaving) {
      leaving.t += dt;
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, leaving.t / 0.6)})`;
      ctx.fillRect(0, 0, W, H + BAR);
      if (leaving.t >= 0.6 && !leaving.gone) {
        leaving.gone = true;
        location.href = leaving.url;
      }
    }
    raf = requestAnimationFrame(frame);
  }

  document.fonts.load(FONT).then(() => {
    fontReady = true;
    textCache.clear();
  }, () => { fontReady = true; });

  // The island loads straight away, but only comes to life when boot.js runs
  // ADVENTURE.EXE.
  window.startAdventure = () => {
    if (started) return;
    started = true;
    canvas.style.visibility = 'visible';
    // The kid strolls in from the bottom of the screen and introduces himself.
    kid.path = [[318, 288]];
    kid.onArrive = () => {
      kid.dir = 'front';
      say([
        'My name is Mark Priem, and I want to be a programmer!',
        'Every candle-lit window on this island has a story to tell about me.'
      ]);
    };
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  // Switching the PC off ends the game; the next ADVENTURE.EXE starts it
  // from the beginning.
  window.stopAdventure = () => {
    if (!started) return;
    started = false;
    cancelAnimationFrame(raf);
    canvas.style.visibility = 'hidden';
    Object.assign(kid, {
      x: 318, y: 338, dir: 'back',
      path: [], walkT: 0, onArrive: null,
      speech: [], speechT: 0, idleT: 0
    });
    timers.length = 0;
    hover = verbHover = leaving = null;
    verb = 'walk';
    Object.assign(stick, { x: 0, y: 0, aim: null });
    mouse.visible = false;
  };
})();
