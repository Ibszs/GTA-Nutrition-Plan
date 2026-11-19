// Drawn plates. Four dishes have no properly licensed photograph that matches them, so each gets
// an illustration built from its own recipe: what is in it, seen from above. They are drawings, and
// every place they appear says so to a screen reader. Shapes are placed by a seeded generator, so a
// plate is identical every time it is drawn.

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const n = value => Math.round(value * 10) / 10;
const between = (rand, min, max) => min + rand() * (max - min);
const pick = (rand, list) => list[Math.floor(rand() * list.length)];

/** Points scattered inside a region, kept a minimum distance apart. `inside(x, y)` defines the region. */
function scatter(rand, count, inside, gap, box = [46, 26, 194, 174]) {
  const points = [];
  for (let tries = 0; points.length < count && tries < count * 40; tries += 1) {
    const x = between(rand, box[0], box[2]); const y = between(rand, box[1], box[3]);
    if (!inside(x, y) || points.some(point => Math.hypot(point[0] - x, point[1] - y) < gap)) continue;
    points.push([x, y]);
  }
  return points;
}
const inCircle = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) <= r;
/** A wedge of the bowl between two angles (degrees, clockwise from 12 o'clock). */
const inWedge = (from, to, r = 66, r0 = 0) => (x, y) => {
  const d = Math.hypot(x - 120, y - 100); if (d > r || d < r0) return false;
  const angle = (Math.atan2(x - 120, 100 - y) * 180 / Math.PI + 360) % 360;
  return from <= to ? angle >= from && angle <= to : angle >= from || angle <= to;
};

// ---------- ingredients ----------
const crumb = (rand, x, y, size, tones) => { const tone = pick(rand, tones);
  // A piece of browned mince: three lumps pressed together, darker underneath.
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(between(rand, 0, 360))})"><circle r="${n(size * .78)}" fill="${tone[0]}"/><circle cx="${n(size * .62)}" cy="${n(size * .3)}" r="${n(size * .56)}" fill="${tone[0]}"/><circle cx="${n(-size * .44)}" cy="${n(size * .5)}" r="${n(size * .5)}" fill="${tone[0]}"/><circle cx="${n(-size * .12)}" cy="${n(-size * .16)}" r="${n(size * .46)}" fill="${tone[1]}"/><circle cx="${n(size * .56)}" cy="${n(size * .2)}" r="${n(size * .28)}" fill="${tone[1]}"/></g>`; };
const BEEF = [['#6b3a22', '#8a4f30'], ['#5a2f1b', '#7a4428'], ['#7a4326', '#9a5c38']];
const fry = (rand, x, y) => { const len = between(rand, 22, 34);
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(between(rand, -70, 70))})"><rect x="-3.6" y="${n(-len / 2)}" width="7.2" height="${n(len)}" rx="2.2" fill="#e2a02c"/><rect x="-2.2" y="${n(-len / 2 + 1.5)}" width="2.6" height="${n(len - 3)}" rx="1.3" fill="#f6cb5f"/></g>`; };
const pickle = (x, y, r = 8) => `<g transform="translate(${n(x)} ${n(y)})"><circle r="${r}" fill="#5f8526"/><circle r="${n(r * .78)}" fill="#a8c458"/><circle r="${n(r * .42)}" fill="#c3d87a"/>${[0, 72, 144, 216, 288].map(a => `<circle cx="${n(Math.cos(a * Math.PI / 180) * r * .5)}" cy="${n(Math.sin(a * Math.PI / 180) * r * .5)}" r=".9" fill="#f1f4c9"/>`).join('')}</g>`;
const leaf = (rand, x, y) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(between(rand, 9, 15))}" ry="${n(between(rand, 4, 7))}" transform="rotate(${n(between(rand, 0, 180))} ${n(x)} ${n(y)})" fill="${pick(rand, ['#7fb24a', '#93c45a', '#6aa03c', '#a6d06c'])}"/>`;
const dice = (rand, x, y, size, tones) => { const tone = pick(rand, tones);
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(between(rand, -30, 30))})"><rect x="${n(-size / 2)}" y="${n(-size / 2)}" width="${n(size)}" height="${n(size)}" rx="${n(size * .22)}" fill="${tone[0]}"/><rect x="${n(-size / 2 + 1.2)}" y="${n(-size / 2 + 1.2)}" width="${n(size * .56)}" height="${n(size * .5)}" rx="${n(size * .16)}" fill="${tone[1]}"/></g>`; };
const TOMATO = [['#c9351f', '#e45a3c']];
const SWEET = [['#c96a1d', '#ee9440'], ['#b85c16', '#e58634'], ['#d6792a', '#f4a455']];
const drizzle = (path, colour, width = 4) => `<path d="${path}" fill="none" stroke="${colour}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const fleck = (rand, points, colours, r = 1.3) => points.map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="${pick(rand, colours)}"/>`).join('');
const shell = (rand, x, y) => { const r = between(rand, 6, 8.5); const turn = between(rand, 0, 360);
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(turn)})"><path d="M ${n(-r)} 0 A ${n(r)} ${n(r)} 0 0 1 ${n(r)} 0" fill="none" stroke="#d99a2b" stroke-width="7.4" stroke-linecap="round"/><path d="M ${n(-r)} 0 A ${n(r)} ${n(r)} 0 0 1 ${n(r)} 0" fill="none" stroke="#f7d06a" stroke-width="4.4" stroke-linecap="round"/></g>`; };

// ---------- vessels ----------
const bowl = (key, inside, { rim = '#f7f2e8', well = '#ebe3d4' } = {}) => `
  <ellipse cx="125" cy="109" rx="88" ry="84" fill="#000" opacity=".2"/>
  <circle cx="120" cy="100" r="85" fill="${rim}"/><circle cx="120" cy="100" r="85" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>
  <clipPath id="plate-${key}"><circle cx="120" cy="100" r="72"/></clipPath>
  <circle cx="120" cy="100" r="72" fill="${well}"/>
  <g clip-path="url(#plate-${key})">${inside}</g>
  <circle cx="120" cy="100" r="72" fill="none" stroke="#000" stroke-width="5" opacity=".07"/>`;

// ---------- the four plates ----------
function burgerBowl() {
  const rand = seeded(11);
  const lettuce = scatter(rand, 60, inCircle(120, 100, 70), 7).map(([x, y]) => leaf(rand, x, y)).join('');
  const beef = scatter(rand, 30, inWedge(200, 345, 60), 8).map(([x, y]) => crumb(rand, x, y, between(rand, 5.5, 8.5), BEEF)).join('');
  const fries = scatter(rand, 13, inWedge(15, 120, 54, 10), 8).map(([x, y]) => fry(rand, x, y)).join('');
  const pickles = [[104, 138], [122, 148], [138, 134], [118, 126]].map(([x, y]) => pickle(x, y, 8.5)).join('');
  const tomato = scatter(rand, 8, inWedge(125, 195, 58, 30), 9).map(([x, y]) => dice(rand, x, y, 7.5, TOMATO)).join('');
  const sauce = drizzle('M 70 76 Q 86 60 98 78 T 126 76 T 150 92 T 132 110 T 100 104', '#f3b089', 4.2) + drizzle('M 72 77 Q 86 62 97 78', '#f9cfb4', 1.6);
  return bowl('burger', lettuce + beef + fries + tomato + pickles + sauce);
}

function beefBowl() {
  const rand = seeded(23);
  const base = '<circle cx="120" cy="100" r="72" fill="#e9dcc3"/>';
  const beef = scatter(rand, 44, inWedge(190, 330, 66), 7.5).map(([x, y]) => crumb(rand, x, y, between(rand, 5.5, 8.5), BEEF)).join('');
  const sweet = scatter(rand, 22, inWedge(335, 95, 64), 12).map(([x, y]) => dice(rand, x, y, between(rand, 11, 14), SWEET)).join('');
  const cheese = scatter(rand, 30, inWedge(100, 185, 62, 8), 6).map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(between(rand, 4.5, 6.5))}" fill="${pick(rand, ['#fffdf7', '#f6f1e4', '#fdf9ee'])}"/>`).join('');
  const avocado = [[-18, 0], [-6, -4], [6, -4], [18, 0]].map(([dx, dy], index) => `<g transform="translate(${120 + dx} ${106 + dy}) rotate(${-24 + index * 16})"><ellipse rx="5.4" ry="17" fill="#4d7a2a"/><ellipse rx="3.6" ry="14.6" fill="#b9d36b"/><ellipse cx="-.6" rx="1.8" ry="10" fill="#dbe79a"/></g>`).join('');
  const honey = drizzle('M 62 88 Q 80 70 96 90 T 130 84 T 164 96 T 150 122', '#d98a18', 3.4) + drizzle('M 64 88 Q 80 72 95 90', '#f3bd52', 1.3);
  const chili = fleck(rand, scatter(rand, 26, inCircle(120, 100, 64), 6), ['#b3261a', '#d1421f', '#8f1d12'], 1.25);
  return bowl('beef', base + sweet + beef + cheese + avocado + honey + chili, { rim: '#f3ede2' });
}

function pastaPot() {
  const rand = seeded(37);
  const shells = scatter(rand, 54, inCircle(120, 100, 66), 10).map(([x, y]) => shell(rand, x, y)).join('');
  const beef = scatter(rand, 26, inCircle(120, 100, 62), 11).map(([x, y]) => crumb(rand, x, y, between(rand, 4, 6), BEEF)).join('');
  const herbs = fleck(rand, scatter(rand, 34, inCircle(120, 100, 64), 5), ['#4e8a2c', '#6aa53a', '#3f7423'], 1.5);
  const steam = drizzle('M 92 92 Q 104 80 116 94 T 142 92', '#f9dc8c', 2.2);
  return `
  <ellipse cx="125" cy="110" rx="94" ry="84" fill="#000" opacity=".22"/>
  <rect x="14" y="88" width="34" height="24" rx="9" fill="#2a2629"/><rect x="192" y="88" width="34" height="24" rx="9" fill="#2a2629"/>
  <circle cx="120" cy="100" r="86" fill="#2f2b2e"/><circle cx="120" cy="100" r="86" fill="none" stroke="#5a5458" stroke-width="2"/>
  <circle cx="120" cy="100" r="76" fill="#1f1c1e"/>
  <clipPath id="plate-pasta"><circle cx="120" cy="100" r="72"/></clipPath>
  <circle cx="120" cy="100" r="72" fill="#e58b2a"/>
  <g clip-path="url(#plate-pasta)"><circle cx="100" cy="82" r="46" fill="#f0a23c" opacity=".7"/>${shells}${beef}${steam}${herbs}</g>
  <circle cx="120" cy="100" r="72" fill="none" stroke="#000" stroke-width="5" opacity=".12"/>`;
}

function pitaBox() {
  const rand = seeded(53);
  const chicken = [[-16, -20, -8], [-4, -8, 4], [8, 4, -6], [-12, 8, 10], [10, -18, 6]].map(([dx, dy, turn]) => `<g transform="translate(${88 + dx} ${68 + dy}) rotate(${turn})"><rect x="-21" y="-6.5" width="42" height="13" rx="6" fill="#d9a871"/><rect x="-18" y="-4.6" width="30" height="4.4" rx="2.2" fill="#eec99a"/><path d="M -12 5 L -6 -6 M 0 5 L 6 -6 M 11 5 L 16 -4" stroke="#b9854e" stroke-width="1.5" stroke-linecap="round"/></g>`).join('');
  const hummus = `<circle cx="172" cy="66" r="27" fill="#e2c391"/><circle cx="172" cy="66" r="27" fill="none" stroke="#c9a66f" stroke-width="2"/>${drizzle('M 156 66 Q 160 52 172 52 T 188 66 T 172 80 T 162 68 T 172 60', '#f0d9ae', 4)}<circle cx="173" cy="67" r="6" fill="#d9a01a" opacity=".85"/>${fleck(rand, scatter(rand, 14, inCircle(172, 66, 22), 6, [146, 40, 198, 92]), ['#b3311c', '#cf4a25'], 1.3)}`;
  const pita = [[70, 138, -14], [96, 146, 12], [84, 126, 40]].map(([x, y, turn]) => `<g transform="translate(${x} ${y}) rotate(${turn})"><path d="M -22 14 L 0 -22 L 22 14 Q 0 22 -22 14 Z" fill="#e7c88f"/><path d="M -16 11 L 0 -15 L 16 11 Q 0 16 -16 11 Z" fill="#f3dcae"/>${fleck(rand, [[-6, 4], [5, 2], [0, -6], [8, 8], [-9, 9]], ['#c9a066'], 1.1)}</g>`).join('');
  const cucumber = [[150, 126], [168, 138], [186, 124], [170, 116], [152, 146], [188, 146]].map(([x, y]) => pickle(x, y, 9.5)).join('');
  const tomatoes = [[202, 108], [140, 108], [200, 136]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="#c9351f"/><circle cx="${x - 2.2}" cy="${y - 2.4}" r="2.4" fill="#ee7a5e"/><circle cx="${x + 1.5}" cy="${y - 5.5}" r="1.3" fill="#3f7423"/>`).join('');
  return `
  <rect x="24" y="24" width="202" height="162" rx="26" fill="#000" opacity=".2"/>
  <rect x="18" y="16" width="204" height="164" rx="26" fill="#f4f6f8"/><rect x="18" y="16" width="204" height="164" rx="26" fill="none" stroke="#fff" stroke-width="2"/>
  <rect x="30" y="28" width="104" height="70" rx="14" fill="#dfe6ec"/><rect x="142" y="28" width="68" height="70" rx="14" fill="#dfe6ec"/>
  <rect x="30" y="106" width="94" height="62" rx="14" fill="#dfe6ec"/><rect x="132" y="106" width="78" height="62" rx="14" fill="#dfe6ec"/>
  ${chicken}${hummus}${pita}${cucumber}${tomatoes}`;
}

const DRAW = { 'smash-burger-bowl': burgerBowl, 'beef-sweet-potato-bowl': beefBowl, 'cheeseburger-pasta': pastaPot, 'pita-box': pitaBox };
const cache = new Map();

export const hasPlate = recipeId => Object.hasOwn(DRAW, recipeId);

/** The drawing for a recipe as an SVG string, or '' when the recipe has none. Decorative; label the wrapper. */
export function plate(recipeId) {
  if (!hasPlate(recipeId)) return '';
  if (!cache.has(recipeId)) cache.set(recipeId, `<svg viewBox="0 0 240 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${DRAW[recipeId]()}</svg>`);
  return cache.get(recipeId);
}
