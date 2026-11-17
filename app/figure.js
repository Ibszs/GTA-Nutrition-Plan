// Movement figure: an original, jointed studio mannequin drawn in SVG.
// A pose is a handful of angles and contact points; the figure is solved from them, so the same
// data draws the start view, the finish view and every frame in between.
// Target areas are drawn on top: solid red for what is working, blue hatching for what is
// lengthening, each with a numbered marker that matches the legend. Illustrative, not an anatomy plate.
//
// Angles are absolute, in degrees, clockwise from "pointing down": 0 down, 90 toward the
// right of the frame, 180 up, 270 toward the left.

const LEN = { pelvis: 13, thorax: 22, neck: 5, head: 6.8, ua: 19, fa: 17, th: 27, sh: 26, foot: 11, heel: 2.6 };
const W = { trunk: 13, neck: 5.2, ua: 6.4, fa: 5.2, th: 10.4, sh: 7.6, foot: 5 };
export const VIEW = { w: 200, h: 150, floor: 134 };

const rad = deg => (deg * Math.PI) / 180;
const vec = (deg, len) => [Math.sin(rad(deg)) * len, Math.cos(rad(deg)) * len];
const addv = (a, b) => [a[0] + b[0], a[1] + b[1]];
const subv = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mulv = (a, k) => [a[0] * k, a[1] * k];
const lenv = a => Math.hypot(a[0], a[1]);
const unit = a => { const l = lenv(a) || 1; return [a[0] / l, a[1] / l]; };
const mix = (a, b, t) => a + (b - a) * t;
const mixv = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t)];
const angleOf = v => (Math.atan2(v[0], v[1]) * 180) / Math.PI;
/** Front-of-limb normal for a segment running from a to b (proximal to distal). */
const frontOf = (a, b) => { const d = unit(subv(b, a)); return [d[1], -d[0]]; };
const r1 = n => Math.round(n * 10) / 10;
const pt = p => `${r1(p[0])} ${r1(p[1])}`;

/** Two-bone solve: where the middle joint sits between a and c. bend picks the side. */
function ik(a, c, l1, l2, bend = 1) {
  const delta = subv(c, a);
  const d = Math.min(Math.max(lenv(delta), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const dir = unit(delta);
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const height = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const mid = addv(a, mulv(dir, along));
  const perp = [-dir[1], dir[0]];
  return addv(mid, mulv(perp, -bend * height));
}

function limb(spec, origin, l1, l2, fallback) {
  const s = spec ?? fallback;
  if (Array.isArray(s)) { const mid = addv(origin, vec(s[0], l1)); return [mid, addv(mid, vec(s[1], l2))]; }
  if (s.pts) return [s.pts[0], s.pts[1]];
  if (s.k) return [s.k, addv(s.k, vec(s.s, l2))];
  return [ik(origin, s.to, l1, l2, s.b ?? 1), s.to];
}

/** Solve a pose into joint positions. */
export function solve(pose) {
  const front = pose.view === 'front';
  let hip; let waist; let sh;
  if (pose.sh) {
    sh = pose.sh; const dir = unit(subv(pose.hip, pose.sh));
    hip = addv(sh, mulv(dir, LEN.pelvis + LEN.thorax)); waist = addv(sh, mulv(dir, LEN.thorax));
  } else {
    hip = pose.hip; waist = addv(hip, vec(pose.L ?? pose.T ?? 180, LEN.pelvis)); sh = addv(waist, vec(pose.T ?? 180, LEN.thorax));
  }
  const up = angleOf(subv(sh, waist));
  const neckA = pose.H ?? up;
  const neck = addv(sh, vec(neckA, LEN.neck));
  const head = addv(neck, vec(neckA, LEN.head));
  const spine = unit(subv(sh, hip));
  // Front view spreads the limbs sideways; a side-lying pose stacks them along the trunk's front.
  const across = front ? unit([spine[1], -spine[0]]) : (pose.wide ? [-spine[1], spine[0]] : [0, 0]);
  const wide = pose.wide ?? (front ? [9.5, 5.6] : [0, 0]);
  const footLen = pose.footLen ?? LEN.foot;
  const armShift = pose.aOff ?? [0, 0];
  const side = sign => {
    const shJ = addv(addv(sh, mulv(across, sign * wide[0])), armShift);
    const hipJ = addv(hip, mulv(across, sign * wide[1]));
    const key = sign > 0 ? 'N' : 'F';
    const [el, wr] = limb(pose[`a${key}`], shJ, LEN.ua, LEN.fa, pose.aN ?? [4, 8]);
    const [kn, an] = limb(pose[`l${key}`], hipJ, LEN.th, LEN.sh, pose.lN ?? [0, 0]);
    const ft = pose[`f${key}`] ?? pose.fN ?? 90;
    return { sh: shJ, el, wr, hip: hipJ, kn, an, toe: addv(an, vec(ft, footLen)), heel: subv(an, vec(ft, Math.min(LEN.heel, footLen * 0.4))), ft };
  };
  return { front, hip, waist, shc: sh, neck, head, N: side(1), F: side(-1) };
}

const limbKind = s => (Array.isArray(s) ? 'ang' : s?.pts ? 'pts' : s?.k ? 'pin' : s?.to ? 'ik' : 'none');
function mixLimb(a, b, t, ja, jb, mid, end) {
  const ka = limbKind(a); const kb = limbKind(b);
  if (ka === 'ang' && kb === 'ang') return [mix(a[0], b[0], t), mix(a[1], b[1], t)];
  if (ka === 'ik' && kb === 'ik') return { to: mixv(a.to, b.to, t), b: t < 0.5 ? a.b : b.b };
  if (ka === 'pin' && kb === 'pin') return { k: mixv(a.k, b.k, t), s: mix(a.s, b.s, t) };
  return { pts: [mixv(ja[mid], jb[mid], t), mixv(ja[end], jb[end], t)] };
}

/** A pose part-way between two poses. Contact points stay planted; free limbs swing by angle. */
export function between(a, b, t) {
  if (t <= 0) return a; if (t >= 1) return b;
  const ja = solve(a); const jb = solve(b);
  const out = { view: a.view, wide: a.wide, footLen: a.footLen };
  if (a.aOff || b.aOff) out.aOff = mixv(a.aOff ?? [0, 0], b.aOff ?? [0, 0], t);
  out.hip = mixv(a.hip, b.hip, t);
  if (a.sh && b.sh) out.sh = mixv(a.sh, b.sh, t);
  else if (a.sh || b.sh) { out.sh = mixv(ja.shc, jb.shc, t); }
  else { out.T = mix(a.T ?? 180, b.T ?? 180, t); out.L = mix(a.L ?? a.T ?? 180, b.L ?? b.T ?? 180, t); }
  if (a.H !== undefined || b.H !== undefined) out.H = mix(a.H ?? angleOf(subv(ja.shc, ja.waist)), b.H ?? angleOf(subv(jb.shc, jb.waist)), t);
  for (const key of ['N', 'F']) {
    out[`a${key}`] = mixLimb(a[`a${key}`] ?? a.aN ?? [4, 8], b[`a${key}`] ?? b.aN ?? [4, 8], t, ja[key], jb[key], 'el', 'wr');
    out[`l${key}`] = mixLimb(a[`l${key}`] ?? a.lN ?? [0, 0], b[`l${key}`] ?? b.lN ?? [0, 0], t, ja[key], jb[key], 'kn', 'an');
    out[`f${key}`] = mix(ja[key].ft, jb[key].ft, t);
  }
  return out;
}

const seg = (a, b, width, cls) => `<line class="${cls}" x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" stroke-width="${width}"/>`;

function body(j, ghost = false) {
  const near = ghost ? 'fg-ghost' : 'fg-near'; const far = ghost ? 'fg-ghost' : 'fg-far';
  const arm = (s, cls) => seg(s.sh, s.el, W.ua, cls) + seg(s.el, s.wr, W.fa, cls);
  const leg = (s, cls) => seg(s.hip, s.kn, W.th, cls) + seg(s.kn, s.an, W.sh, cls) + seg(s.heel, s.toe, W.foot, cls);
  const headAngle = -angleOf(subv(j.head, j.neck));
  const head = `<ellipse class="${near}-fill" cx="${r1(j.head[0])}" cy="${r1(j.head[1])}" rx="6.1" ry="7.3" transform="rotate(${r1(headAngle)} ${pt(j.head)})"/>`;
  if (j.front) {
    const trunk = `<path class="${near}-fill" d="M${pt(j.F.sh)} L${pt(j.N.sh)} L${pt(addv(j.N.hip, [1.5, 2]))} L${pt(addv(j.F.hip, [-1.5, 2]))} Z" stroke-linejoin="round" stroke-width="3.4" />`;
    return leg(j.F, near) + leg(j.N, near) + trunk + seg(j.shc, j.neck, W.neck, near) + head + arm(j.F, near) + arm(j.N, near);
  }
  return arm(j.F, far) + leg(j.F, far) + seg(j.hip, j.waist, W.trunk, near) + seg(j.waist, j.shc, W.trunk, near) + seg(j.shc, j.neck, W.neck, near) + head + leg(j.N, near) + arm(j.N, near);
}

/** Geometry for each named target area. Returns { d | ellipse, at } in figure space. */
function region(name, j, sideKey = 'N') {
  const s = j[sideKey];
  const tf = (() => { const d = unit(subv(j.shc, j.hip)); return [-d[1], d[0]]; })(); // front of trunk
  const along = (a, b, t) => mixv(a, b, t);
  const band = (a, b, normal, offset, width, from, to) => {
    const p = addv(along(a, b, from), mulv(normal, offset)); const q = addv(along(a, b, to), mulv(normal, offset));
    return { d: `M${pt(p)} L${pt(q)}`, width, at: addv(mixv(p, q, 0.5), mulv(normal, Math.sign(offset || 1) * (width / 2 + 6))) };
  };
  const blob = (c, rx, ry, rot, out) => ({ ellipse: [c, rx, ry, rot], at: addv(c, mulv(out, Math.max(rx, ry) + 6)) });
  const thF = frontOf(s.hip, s.kn); const shF = frontOf(s.kn, s.an); const ftF = frontOf(s.an, s.toe);
  switch (name) {
    case 'quads': return band(s.hip, s.kn, thF, 2.7, 4.8, 0.14, 0.9);
    case 'hamstrings': return band(s.hip, s.kn, thF, -2.7, 4.8, 0.16, 0.9);
    case 'calf': return band(s.kn, s.an, shF, -2.1, 4.2, 0.08, 0.74);
    case 'shin': return band(s.kn, s.an, shF, 2, 3.4, 0.1, 0.8);
    case 'ankle': return band(s.kn, s.an, shF, 0.2, 4, 0.56, 0.98);
    case 'foot': return band(s.heel, s.toe, ftF, -1, 3.4, 0.12, 0.88);
    case 'glutes': return blob(addv(addv(s.hip, mulv(tf, -4.6)), mulv(unit(subv(j.shc, j.hip)), 1.5)), 6.6, 5.4, -angleOf(subv(j.shc, j.hip)), mulv(tf, -1));
    case 'hipside': return blob(addv(s.hip, j.front ? [sideKey === 'N' ? 4 : -4, 2] : [0, -4.6]), 5.6, 4.6, 0, j.front ? [sideKey === 'N' ? 1 : -1, 0] : [0, -1]);
    case 'hipflexor': { const a = addv(addv(s.hip, mulv(unit(subv(j.shc, j.hip)), 5)), mulv(tf, 3.8)); const b = addv(along(s.hip, s.kn, 0.36), mulv(thF, 3.1)); return { d: `M${pt(a)} L${pt(b)}`, width: 4.4, at: addv(mixv(a, b, 0.5), mulv(tf, 9)) }; }
    case 'abs': return band(j.hip, j.shc, tf, 4.2, 4.6, 0.1, 0.6);
    case 'lowback': return band(j.hip, j.shc, tf, -4.2, 4.6, 0.08, 0.58);
    case 'upperback': return band(j.hip, j.shc, tf, -4.1, 5.2, 0.6, 0.96);
    case 'serratus': return blob(addv(along(j.hip, j.shc, 0.72), mulv(tf, 1.6)), 6.2, 3.9, -angleOf(subv(j.shc, j.hip)) + 90, tf);
    case 'shoulder': return blob(s.sh, 4.8, 4.8, 0, mulv(unit(subv(j.shc, j.hip)), 1));
    default: return null;
  }
}

function overlays(j, targets, trace, box) {
  let marks = ''; let dots = '';
  const maxY = Math.min(box[1] + box[3] - 7, VIEW.floor - 7);
  targets.forEach((target, index) => {
    const shape = region(target.area, j, target.side ?? 'N');
    if (!shape) return;
    const cls = `tg tg--${target.kind}${trace ? ' tg--trace' : ''}`;
    const delay = trace ? ` style="animation-delay:${120 + index * 160}ms"` : '';
    if (shape.d) marks += `<path class="${cls}" pathLength="1" d="${shape.d}" stroke-width="${shape.width}"${delay}/>`;
    else { const [c, rx, ry, rot] = shape.ellipse; marks += `<ellipse class="${cls} tg--blob" pathLength="1" cx="${r1(c[0])}" cy="${r1(c[1])}" rx="${rx}" ry="${ry}" transform="rotate(${r1(rot)} ${pt(c)})"${delay}/>`; }
    const at = [Math.min(box[0] + box[2] - 7, Math.max(box[0] + 7, shape.at[0])), Math.min(maxY, Math.max(box[1] + 7, shape.at[1]))];
    dots += `<g class="tg-dot tg-dot--${target.kind}"><circle cx="${r1(at[0])}" cy="${r1(at[1])}" r="5.6"/><text x="${r1(at[0])}" y="${r1(at[1] + 2.5)}" text-anchor="middle">${index + 1}</text></g>`;
  });
  return marks + dots;
}

function props(list = []) {
  return list.map(prop => {
    switch (prop.t) {
      case 'wall': return `<rect class="pr-solid" x="${prop.x}" y="6" width="7" height="${VIEW.floor - 6}"/><line class="pr-line" x1="${prop.x}" y1="6" x2="${prop.x}" y2="${VIEW.floor}"/>`;
      case 'mat': return `<rect class="pr-mat" x="${prop.x}" y="${VIEW.floor - 2.4}" width="${prop.w}" height="3.4" rx="1.6"/>`;
      case 'chair': return `<path class="pr-line" fill="none" d="M${prop.x} ${prop.y - 38} L${prop.x} ${prop.y} L${prop.x + 30} ${prop.y} M${prop.x + 2} ${prop.y} L${prop.x + 2} ${VIEW.floor} M${prop.x + 28} ${prop.y} L${prop.x + 28} ${VIEW.floor}" stroke-width="2.6"/>`;
      case 'step': return `<rect class="pr-solid" x="${prop.x}" y="${prop.y}" width="${prop.w}" height="${VIEW.floor - prop.y}"/><line class="pr-line" x1="${prop.x}" y1="${prop.y}" x2="${prop.x + prop.w}" y2="${prop.y}"/>`;
      case 'guide': return `<line class="pr-guide" x1="${prop.x1}" y1="${prop.y1}" x2="${prop.x2}" y2="${prop.y2}"/>`;
      default: return '';
    }
  }).join('');
}

function arrow(from, to, bow = 0.22) {
  const delta = subv(to, from);
  if (lenv(delta) < 5) return '';
  const mid = addv(mixv(from, to, 0.5), mulv([-delta[1], delta[0]], bow));
  const dir = unit(subv(to, mid)); const left = [-dir[1], dir[0]];
  const tip = to; const b1 = addv(subv(tip, mulv(dir, 6)), mulv(left, 3.2)); const b2 = subv(subv(tip, mulv(dir, 6)), mulv(left, 3.2));
  return `<path class="mv" d="M${pt(from)} Q${pt(mid)} ${pt(to)}"/><path class="mv-head" d="M${pt(tip)} L${pt(b1)} L${pt(b2)} Z"/>`;
}

const jointAt = (j, key) => (key === 'hip' ? j.hip : key === 'sh' ? j.shc : key === 'head' ? j.head : j[key[key.length - 1]][key.slice(0, -1)]);

const GRID = `<defs><pattern id="fg-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" class="pr-grid"/></pattern>
<pattern id="fg-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" class="hatch-bg"/><line x1="0" y1="0" x2="0" y2="4" class="hatch-ln"/></pattern></defs>`;

/**
 * One SVG frame of an exercise.
 * options: { t: 0..1, ghost: show the start outline, arrows: show direction, trace: animate overlays, targets: on/off }
 */
export function frame(exercise, options = {}) {
  const { t = 1, ghost = false, arrows = false, trace = false, targets = true, id = '' } = options;
  const { start, end } = exercise.poses;
  const pose = between(start, end, t);
  const j = solve(pose);
  const js = solve(start); const je = solve(end);
  const move = arrows ? (exercise.poses.track ?? []).map(key => arrow(jointAt(js, key), jointAt(je, key), exercise.poses.bow ?? 0.22)).join('') : '';
  const flip = exercise.poses.flip ? ` transform="translate(${VIEW.w} 0) scale(-1 1)"` : '';
  const inset = exercise.poses.inset === 'foot' ? footInset(t) : '';
  const box = exercise.poses.box ?? STANDING_BOX;
  return `<svg class="fgsvg" viewBox="${box.join(' ')}" role="img" aria-hidden="true"${id ? ` data-fig="${id}"` : ''}>${GRID}
<rect x="-200" y="-200" width="600" height="600" fill="url(#fg-grid)"/><line class="pr-floor" x1="-200" y1="${VIEW.floor}" x2="400" y2="${VIEW.floor}"/>
<g${flip}>${props((exercise.poses.props ?? []).filter(prop => prop.t !== 'guide'))}${ghost ? body(js, true) : ''}${body(j)}${props((exercise.poses.props ?? []).filter(prop => prop.t === 'guide'))}${targets ? overlays(j, exercise.targets, trace, box) : ''}${move}</g>${inset}</svg>`;
}

/** Default framing for standing drills; lying and kneeling drills set a tighter `box` of their own. All boxes are 4:3. */
const STANDING_BOX = [16, 14, 168, 126];

/** Close-up of the arch for the foot-doming drill: flat at t = 0, lifted at t = 1. */
function footInset(t) {
  const lift = 5 * t;
  return `<g transform="translate(106 20)"><rect class="pr-inset" x="0" y="0" width="72" height="46" rx="3"/>
<path class="fg-near-fill" d="M8 30 C8 18 20 12 30 13 C42 14 50 24 62 28 C66 29.5 67 34 63 35 L52 35 C44 35 40 ${r1(33 - lift)} 30 ${r1(33 - lift)} C22 ${r1(33 - lift)} 20 35 12 35 C9 35 8 33 8 30 Z"/>
<path class="tg tg--load" d="M19 ${r1(35.6 - lift * 0.5)} C28 ${r1(31.6 - lift)} 40 ${r1(31.6 - lift)} 50 ${r1(35.6 - lift * 0.5)}" stroke-width="3" fill="none"/>
<line class="pr-floor" x1="4" y1="37" x2="68" y2="37"/><text class="pr-text" x="36" y="9" text-anchor="middle">ARCH, CLOSE UP</text></g>`;
}

const KIND_WORD = { load: 'Working', stretch: 'Lengthening' };
/** Legend rows as plain data so the view can render accessible HTML next to the drawing. */
export const legend = exercise => exercise.targets.map((target, index) => ({ n: index + 1, name: target.name, kind: target.kind, word: KIND_WORD[target.kind] }));
