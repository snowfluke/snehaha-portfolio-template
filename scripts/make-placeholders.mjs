// Writes every placeholder image into public/placeholders/.
// Style: Claude editorial illustration — flat accent field, irregular ivory carrier, bold black ink.
// Each image carries its own file name in the corner, so a placeholder on screen names the file to replace.
// Run: npm run placeholders   (overwrites only files listed below)
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('../public/placeholders/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const INK = '#141413';
const IVORY = '#FAF9F5';
const C = {
  cactus: '#BCD1CA', heather: '#CBCADB', oat: '#E3DACC', clay: '#D97757',
  olive: '#788C5D', sky: '#6A9BCC', fig: '#C46686', coral: '#EBCECE',
};
const ACCENTS = Object.values(C);

// Small seeded PRNG so every run draws the same pictures.
function rng(seed) {
  let s = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const f = (n) => Math.round(n * 10) / 10;

// Catmull-Rom through closed points -> smooth cubic path.
function closedPath(pts) {
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length], p3 = pts[(i + 2) % pts.length];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + 'Z';
}

function blob(r, cx, cy, rx, ry, wobble = 0.16, n = 9) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.3;
    const k = 1 - wobble + r() * wobble * 2;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return closedPath(pts);
}

// A hand-drawn stroke: jitter each point a little.
function ink(r, pts, w, j = 0.012, s = 1) {
  const q = pts.map(([x, y]) => [x + (r() - 0.5) * j * s, y + (r() - 0.5) * j * s]);
  let d = `M${f(q[0][0])},${f(q[0][1])}`;
  for (let i = 1; i < q.length; i++) {
    const [px, py] = q[i - 1], [x, y] = q[i];
    d += `Q${f(px + (x - px) / 2 + (r() - 0.5) * j * s)},${f(py + (y - py) / 2 + (r() - 0.5) * j * s)} ${f(x)},${f(y)}`;
  }
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f(w * (0.85 + r() * 0.3))}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const dot = (x, y, rad) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="${INK}"/>`;
const ring = (r, cx, cy, rad, w, s) =>
  ink(r, Array.from({ length: 15 }, (_, i) => {
    const a = (i / 13) * Math.PI * 2 - 0.4;
    return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
  }), w, 0.04, s);

// Motifs draw inside a unit box scaled to size s at (cx, cy).
const MOTIFS = {
  sun(r, cx, cy, s, w) {
    let o = ring(r, cx, cy, s * 0.2, w, s);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      o += ink(r, [[cx + Math.cos(a) * s * 0.3, cy + Math.sin(a) * s * 0.3], [cx + Math.cos(a) * s * 0.42, cy + Math.sin(a) * s * 0.42]], w, 0.01, s);
    }
    return o + dot(cx - s * 0.07, cy - s * 0.03, w * 0.6) + dot(cx + s * 0.07, cy - s * 0.03, w * 0.6);
  },
  spiral(r, cx, cy, s, w) {
    const pts = Array.from({ length: 40 }, (_, i) => {
      const a = i * 0.45, k = (i / 40) * s * 0.4;
      return [cx + Math.cos(a) * k, cy + Math.sin(a) * k];
    });
    return ink(r, pts, w, 0.02, s) + dot(cx + s * 0.38, cy - s * 0.3, w * 0.7);
  },
  waves(r, cx, cy, s, w) {
    let o = '';
    for (let row = -1; row <= 1; row++) {
      const pts = Array.from({ length: 9 }, (_, i) => [cx - s * 0.4 + i * s * 0.1, cy + row * s * 0.16 + (i % 2 ? -1 : 1) * s * 0.04]);
      o += ink(r, pts, w, 0.02, s);
    }
    return o + dot(cx + s * 0.3, cy - s * 0.34, w * 0.9);
  },
  leaf(r, cx, cy, s, w) {
    const L = [[cx - s * 0.3, cy + s * 0.32], [cx - s * 0.2, cy - s * 0.05], [cx + s * 0.05, cy - s * 0.3], [cx + s * 0.32, cy - s * 0.36], [cx + s * 0.26, cy - s * 0.05], [cx + s * 0.05, cy + s * 0.2], [cx - s * 0.3, cy + s * 0.32]];
    return ink(r, L, w, 0.02, s) + ink(r, [[cx - s * 0.36, cy + s * 0.4], [cx, cy], [cx + s * 0.26, cy - s * 0.3]], w * 0.8, 0.02, s);
  },
  flower(r, cx, cy, s, w) {
    let o = ink(r, [[cx, cy + s * 0.1], [cx + s * 0.02, cy + s * 0.25], [cx - s * 0.01, cy + s * 0.42]], w, 0.02, s);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      o += ring(r, cx + Math.cos(a) * s * 0.13, cy - s * 0.08 + Math.sin(a) * s * 0.13, s * 0.08, w * 0.8, s);
    }
    return o + dot(cx, cy - s * 0.08, w * 1.1);
  },
  eye(r, cx, cy, s, w) {
    return ink(r, [[cx - s * 0.4, cy], [cx - s * 0.15, cy - s * 0.2], [cx + s * 0.15, cy - s * 0.2], [cx + s * 0.4, cy]], w, 0.02, s) +
      ink(r, [[cx - s * 0.4, cy], [cx - s * 0.15, cy + s * 0.18], [cx + s * 0.15, cy + s * 0.18], [cx + s * 0.4, cy]], w, 0.02, s) +
      dot(cx, cy, s * 0.08);
  },
  hill(r, cx, cy, s, w) {
    return ink(r, [[cx - s * 0.44, cy + s * 0.25], [cx - s * 0.18, cy - s * 0.2], [cx, cy + s * 0.05], [cx + s * 0.18, cy - s * 0.32], [cx + s * 0.44, cy + s * 0.25]], w, 0.02, s) +
      ring(r, cx - s * 0.28, cy - s * 0.34, s * 0.07, w * 0.8, s);
  },
  hand(r, cx, cy, s, w) {
    const o = [];
    for (let i = 0; i < 4; i++) {
      const x = cx - s * 0.15 + i * s * 0.1;
      o.push(ink(r, [[x, cy + s * 0.1], [x + (i - 1.5) * s * 0.02, cy - s * 0.15 - (i === 1 || i === 2 ? s * 0.08 : 0)]], w, 0.02, s));
    }
    o.push(ink(r, [[cx - s * 0.2, cy + s * 0.05], [cx - s * 0.3, cy - s * 0.05], [cx - s * 0.32, cy - s * 0.15]], w, 0.02, s));
    o.push(ink(r, [[cx - s * 0.2, cy + s * 0.05], [cx - s * 0.15, cy + s * 0.35], [cx + s * 0.15, cy + s * 0.35], [cx + s * 0.18, cy + s * 0.1]], w, 0.02, s));
    return o.join('') + dot(cx + s * 0.32, cy - s * 0.36, w);
  },
  cup(r, cx, cy, s, w) {
    return ink(r, [[cx - s * 0.25, cy - s * 0.1], [cx - s * 0.2, cy + s * 0.3], [cx + s * 0.15, cy + s * 0.3], [cx + s * 0.2, cy - s * 0.1], [cx - s * 0.25, cy - s * 0.1]], w, 0.02, s) +
      ring(r, cx + s * 0.27, cy + s * 0.08, s * 0.08, w * 0.8, s) +
      ink(r, [[cx - s * 0.08, cy - s * 0.2], [cx - s * 0.12, cy - s * 0.3], [cx - s * 0.06, cy - s * 0.4]], w * 0.7, 0.02, s) +
      ink(r, [[cx + s * 0.06, cy - s * 0.2], [cx + s * 0.02, cy - s * 0.3], [cx + s * 0.08, cy - s * 0.4]], w * 0.7, 0.02, s);
  },
  star(r, cx, cy, s, w) {
    const pts = Array.from({ length: 11 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2, k = i % 2 ? s * 0.15 : s * 0.38;
      return [cx + Math.cos(a) * k, cy + Math.sin(a) * k];
    });
    return ink(r, pts, w, 0.02, s);
  },
};
const MOTIF_NAMES = Object.keys(MOTIFS);

function label(name, W, H, top = false) {
  const fs = Math.min(22, Math.max(11, Math.round(Math.min(W, H) * 0.035)));
  const txt = `${name} · ${W}×${H}`;
  const pw = txt.length * fs * 0.62 + fs * 1.2;
  const y = top ? fs * 0.6 : H - fs * 2.4;
  return `<g font-family="ui-monospace, Menlo, monospace" font-size="${fs}"><rect x="${fs * 0.6}" y="${f(y)}" width="${f(pw)}" height="${f(fs * 1.8)}" rx="${f(fs * 0.9)}" fill="${IVORY}" stroke="${INK}" stroke-width="1"/><text x="${fs * 1.2}" y="${f(y + fs * 1.3)}" fill="${INK}">${txt}</text></g>`;
}

const wrap = (W, H, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>\n`;

// Standard card: accent field + ivory carrier + one motif + slot label.
function card(name, W, H, { bg, motif, tag = true, tagTop = false } = {}) {
  const r = rng(name);
  bg ??= ACCENTS[Math.floor(r() * ACCENTS.length)];
  motif ??= MOTIF_NAMES[Math.floor(r() * MOTIF_NAMES.length)];
  const m = Math.min(W, H);
  const body =
    `<rect width="${W}" height="${H}" fill="${bg}"/>` +
    `<path d="${blob(r, W / 2, H / 2, W * 0.36, H * 0.36)}" fill="${IVORY}"/>` +
    MOTIFS[motif](r, W / 2, H / 2, m * 0.7, m * 0.028) +
    (tag ? label(name, W, H, tagTop) : '');
  return wrap(W, H, body);
}

// Transparent cut-outs (ball, doll parts) — need no background so they stack or float.
function ball(name) {
  const r = rng(name), S = 400, c = S / 2;
  const body = `<circle cx="${c}" cy="${c}" r="${c - 12}" fill="${C.clay}" stroke="${INK}" stroke-width="10"/>` +
    ink(r, [[c, 20], [c - 30, c], [c, S - 20]], 9, 0.02, S) +
    ink(r, [[20, c], [c, c + 20], [S - 20, c]], 9, 0.02, S) +
    ink(r, [[70, 60], [130, c], [70, S - 60]], 8, 0.02, S) +
    ink(r, [[S - 70, 60], [S - 130, c], [S - 70, S - 60]], 8, 0.02, S);
  return wrap(S, S, body);
}

// Original paper-doll character, drawn in four stackable parts on a 300-wide grid.
const DOLL_W = 300;
function dollHead(name, hair, accessory) {
  const r = rng(name), H = 220, cx = 150;
  let b = `<path d="${blob(r, cx, 120, 70, 78, 0.06)}" fill="${IVORY}" stroke="${INK}" stroke-width="7"/>`;
  b += `<path d="${blob(r, cx, 70, 82, 42, 0.18, 7)}" fill="${hair}" stroke="${INK}" stroke-width="7"/>`;
  b += dot(cx - 25, 125, 7) + dot(cx + 25, 125, 7);
  b += ink(r, [[cx - 22, 155], [cx, 168], [cx + 22, 155]], 6, 0.01, H);
  b += ink(r, [[cx - 10, 200], [cx - 10, 220]], 8, 0, H) + ink(r, [[cx + 10, 200], [cx + 10, 220]], 8, 0, H);
  if (accessory === 'glasses') b += ring(r, cx - 25, 125, 20, 5, H) + ring(r, cx + 25, 125, 20, 5, H) + ink(r, [[cx - 5, 125], [cx + 5, 125]], 5, 0, H);
  if (accessory === 'cap') b += `<path d="M${cx - 80},70 Q${cx},0 ${cx + 80},70 L${cx + 120},78 Z" fill="${C.sky}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`;
  if (accessory === 'flower') b += MOTIFS.flower(r, cx + 60, 40, 90, 5);
  return wrap(DOLL_W, H, b);
}
function dollTop(name, fill, stripes) {
  const r = rng(name), H = 200;
  let b = `<path d="M60,30 L110,10 Q150,40 190,10 L240,30 L290,90 L245,115 L230,95 L230,195 L70,195 L70,95 L55,115 L10,90 Z" fill="${fill}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`;
  if (stripes) for (let y = 70; y < 190; y += 34) b += ink(r, [[75, y], [225, y]], 6, 0.01, H);
  else b += dot(150, 110, 9);
  return wrap(DOLL_W, H, b);
}
function dollBottom(name, fill, shorts) {
  const r = rng(name), H = 220, L = shorts ? 110 : 210;
  const b = `<path d="M75,5 L225,5 L235,${L} L165,${L} L150,60 L135,${L} L65,${L} Z" fill="${fill}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>` +
    ink(r, [[150, 10], [150, 55]], 5, 0.01, H);
  return wrap(DOLL_W, H, b);
}
function dollShoes(name, fill) {
  const r = rng(name), H = 70;
  const b = `<path d="${blob(r, 98, 40, 50, 24, 0.08, 7)}" fill="${fill}" stroke="${INK}" stroke-width="7"/>` +
    `<path d="${blob(r, 202, 40, 50, 24, 0.08, 7)}" fill="${fill}" stroke="${INK}" stroke-width="7"/>`;
  return wrap(DOLL_W, H, b);
}

// Open hand cut-out for the waving character under the box. Wrist at the bottom centre.
function waveHand(name) {
  const r = rng(name), W = 160, H = 200;
  let b = `<path d="${blob(r, 80, 130, 46, 44, 0.06, 8)}" fill="${IVORY}" stroke="${INK}" stroke-width="7"/>`;
  [[44, 100, 30, 40], [66, 92, 62, 22], [92, 92, 98, 20], [114, 102, 128, 44]].forEach(([x1, y1, x2, y2]) => {
    b += ink(r, [[x1, y1], [x2, y2]], 22, 0, H).replace(INK, IVORY) + ink(r, [[x1, y1], [x2, y2]], 7, 0.01, H);
  });
  b += ink(r, [[36, 140], [14, 112]], 7, 0.01, H) + ink(r, [[80, 172], [80, 200]], 9, 0, H);
  return wrap(W, H, b);
}

// Footer mascot: an original round ink creature with both arms up, ready to catch.
function mascot(name) {
  const r = rng(name), W = 320, H = 360;
  let b = `<path d="${blob(r, 160, 250, 110, 100, 0.07, 9)}" fill="${C.oat}" stroke="${INK}" stroke-width="8"/>`;
  b += ink(r, [[70, 200], [40, 120], [30, 40]], 12, 0.01, H) + ink(r, [[250, 200], [282, 120], [292, 40]], 12, 0.01, H);
  b += ring(r, 30, 34, 16, 8, H) + ring(r, 292, 34, 16, 8, H);
  b += dot(125, 235, 10) + dot(195, 235, 10);
  b += ink(r, [[135, 275], [160, 292], [185, 275]], 8, 0.01, H);
  b += ink(r, [[110, 345], [110, 360]], 10, 0, H) + ink(r, [[210, 345], [210, 360]], 10, 0, H);
  return wrap(W, H, b);
}

// Wordmark placeholder for "worked with" logos and brand rows.
function logo(name, text) {
  const r = rng(name), W = 360, H = 90;
  const b = MOTIFS.star(r, 45, 45, 80, 6) +
    `<text x="90" y="58" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="700" font-size="34" fill="${INK}">${text}</text>`;
  return wrap(W, H, b);
}

const files = {};
const add = (n, svg) => (files[n] = svg);

// Hero
add('hero-bg.svg', card('hero-bg.svg', 1920, 1200, { bg: C.cactus, motif: 'leaf', tagTop: true }));
add('hero-portrait.svg', card('hero-portrait.svg', 400, 400, { bg: C.clay, motif: 'sun' }));
add('ball.svg', ball('ball.svg'));
for (const [i, m] of ['star', 'flower', 'cup', 'eye', 'spiral'].entries())
  add(`sticker-0${i + 1}.svg`, card(`sticker-0${i + 1}.svg`, 200, 200, { motif: m, tag: false }));
add('resume-preview.svg', card('resume-preview.svg', 640, 260, { bg: C.oat, motif: 'waves' }));
['brand one', 'brand two', 'brand three', 'brand four', 'brand five'].forEach((t, i) => add(`logo-0${i + 1}.svg`, logo(`logo-0${i + 1}`, t)));

// Work + play
for (let i = 1; i <= 3; i++) add(`work-0${i}.svg`, card(`work-0${i}.svg`, 1600, 920));
const ratios = [[800, 1000], [800, 600], [800, 1200], [800, 800], [800, 1000], [800, 700], [800, 1100], [800, 800], [800, 600], [800, 1000], [800, 900], [800, 1200]];
ratios.forEach(([w, h], i) => add(`play-${String(i + 1).padStart(2, '0')}.svg`, card(`play-${String(i + 1).padStart(2, '0')}.svg`, w, h)));

// Timeline
for (let i = 1; i <= 10; i++) add(`timeline-${String(i).padStart(2, '0')}.svg`, card(`timeline-${String(i).padStart(2, '0')}.svg`, 600, 600));

// About
add('about-avatar.svg', card('about-avatar.svg', 200, 200, { bg: C.fig, motif: 'eye', tag: false }));
[['head-01.svg', '#2b2420', null], ['head-02.svg', C.clay, 'glasses'], ['head-03.svg', '#2b2420', 'cap'], ['head-04.svg', C.olive, 'flower']]
  .forEach(([n, hair, acc]) => add(`doll-${n}`, dollHead(`doll-${n}`, hair, acc)));
[['top-01.svg', C.sky, true], ['top-02.svg', C.coral, false], ['top-03.svg', C.olive, true]].forEach(([n, c, s]) => add(`doll-${n}`, dollTop(`doll-${n}`, c, s)));
[['bottom-01.svg', C.heather, false], ['bottom-02.svg', C.oat, true], ['bottom-03.svg', '#3b3a36', false]].forEach(([n, c, s]) => add(`doll-${n}`, dollBottom(`doll-${n}`, c, s)));
[['shoes-01.svg', C.clay], ['shoes-02.svg', IVORY], ['shoes-03.svg', C.sky]].forEach(([n, c]) => add(`doll-${n}`, dollShoes(`doll-${n}`, c)));
const boxItems = [['box-01.svg', 360, 260, 'cup'], ['box-02.svg', 300, 380, 'waves'], ['box-03.svg', 260, 320, 'spiral'], ['box-04.svg', 300, 340, 'sun'], ['box-05.svg', 300, 340, 'flower'], ['box-06.svg', 260, 380, 'hill'], ['box-07.svg', 320, 300, 'hand']];
boxItems.forEach(([n, w, h, m]) => add(n, card(n, w, h, { motif: m })));
add('wave-hand.svg', waveHand('wave-hand.svg'));
add('box-tray.svg', card('box-tray.svg', 1840, 1140, { bg: C.oat, motif: 'cup', tagTop: true }));
add('footer-mascot.svg', mascot('footer-mascot.svg'));

// Footer + social + site meta
add('footer-bg.svg', card('footer-bg.svg', 1920, 1200, { bg: C.sky, motif: 'waves', tagTop: true }));
['social-01.svg', 'social-02.svg', 'social-03.svg', 'social-04.svg'].forEach((n, i) =>
  add(n, card(n, 160, 160, { bg: [C.clay, C.fig, C.olive, C.heather][i], motif: ['star', 'eye', 'leaf', 'spiral'][i], tag: false })));
add('og.svg', card('og.svg', 1600, 965, { bg: C.clay, motif: 'hand' }));
add('favicon.svg', card('favicon.svg', 64, 64, { bg: C.clay, motif: 'star', tag: false }));

for (const [n, svg] of Object.entries(files)) writeFileSync(new URL(n, OUT), svg);
console.log(`wrote ${Object.keys(files).length} files to public/placeholders/`);
