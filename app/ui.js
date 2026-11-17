// Small DOM, date and feedback helpers shared by every Forme screen. No framework.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ESCAPES[char]);

class Raw {
  constructor(text) { this.text = text; }
  toString() { return this.text; }
}
export const raw = value => new Raw(String(value ?? ''));

function part(value) {
  if (value === null || value === undefined || value === false || value === true) return '';
  if (value instanceof Raw) return value.text;
  if (Array.isArray(value)) return value.map(part).join('');
  return esc(value);
}

/** Tagged template: every interpolation is escaped unless it is html`` or raw(). */
export function html(strings, ...values) {
  let out = '';
  strings.forEach((chunk, index) => {
    out += chunk;
    if (index < values.length) out += part(values[index]);
  });
  return new Raw(out);
}

export const icon = (name, extra = '') => raw(`<svg class="ic ${extra}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="assets/icons.svg#${esc(name)}"/></svg>`);

// ---------- numbers ----------
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const round = (value, digits = 0) => { const m = 10 ** digits; return Math.round((Number(value) + Number.EPSILON) * m) / m; };
export const fmt = (value, digits = 0) => Number.isFinite(Number(value)) ? round(value, digits).toLocaleString('en-CA', { maximumFractionDigits: digits }) : '-';
export const num = value => { if (value === '' || value === null || value === undefined) return null; const n = Number(value); return Number.isFinite(n) ? n : null; };
export const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
export const uid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

// ---------- dates (local calendar days as YYYY-MM-DD) ----------
const pad = value => String(value).padStart(2, '0');
export const iso = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const today = () => iso(new Date());
export const asDate = day => new Date(`${day}T12:00:00`);
export const addDays = (day, count) => { const d = asDate(day); d.setDate(d.getDate() + count); return iso(d); };
export const dayDiff = (a, b) => Math.round((asDate(a) - asDate(b)) / 86400000);
/** Monday-based weekday index, 0 = Monday. */
export const dow = day => (asDate(day).getDay() + 6) % 7;
export const weekStart = day => addDays(day, -dow(day));
export const weekDays = day => Array.from({ length: 7 }, (_, index) => addDays(weekStart(day), index));
export const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const fmtDay = (day, options = { weekday: 'short', month: 'short', day: 'numeric' }) => asDate(day).toLocaleDateString('en-CA', options);
export const fmtTime = date => new Date(date).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' });
export function relDay(day) {
  const delta = dayDiff(day, today());
  if (delta === 0) return 'Today';
  if (delta === -1) return 'Yesterday';
  if (delta === 1) return 'Tomorrow';
  if (delta < 0 && delta > -7) return `${-delta} days ago`;
  return fmtDay(day, { month: 'short', day: 'numeric' });
}
/** Compact-camera date stamp, e.g. '26 11 17. */
export const stamp = (day = today()) => html`<span class="stamp" aria-hidden="true">'${day.slice(2, 4)} ${day.slice(5, 7)} ${day.slice(8, 10)}</span>`;
export const clock = seconds => { const s = Math.max(0, Math.round(seconds)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
export function partOfDay(date = new Date()) {
  const hour = date.getHours();
  return hour < 5 ? 'Late' : hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : hour < 22 ? 'Evening' : 'Late';
}

// ---------- preferences that shape feedback (set by main.js from saved settings) ----------
export const prefs = { motion: 'full', haptics: true, sound: false };
export const motionOK = () => prefs.motion !== 'reduced';

export function haptic(kind = 'tap') {
  if (!prefs.haptics || !navigator.vibrate) return;
  const patterns = { tap: 8, set: [10, 30, 14], done: [16, 40, 16, 40, 30], warn: [30, 60, 30] };
  try { navigator.vibrate(patterns[kind] ?? 8); } catch { /* vibration is optional */ }
}

let audio;
export function blip(kind = 'tap') {
  if (!prefs.sound) return;
  try {
    audio ??= new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    const notes = { tap: [520], set: [440, 660], done: [440, 554, 660, 880], timer: [880, 880] }[kind] ?? [520];
    notes.forEach((frequency, index) => {
      const osc = audio.createOscillator(); const gain = audio.createGain();
      osc.type = 'triangle'; osc.frequency.value = frequency;
      const start = audio.currentTime + index * 0.09;
      gain.gain.setValueAtTime(0.0001, start); gain.gain.exponentialRampToValueAtTime(0.09, start + 0.012); gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      osc.connect(gain).connect(audio.destination); osc.start(start); osc.stop(start + 0.18);
    });
  } catch { /* sound is optional */ }
}

// ---------- event delegation ----------
/** Wire data-act (click), data-change (change) and data-input (input) to handler maps. */
export function delegate(root, { actions = {}, changes = {}, inputs = {} } = {}) {
  const run = (map, attr) => event => {
    const target = event.target.closest?.(`[${attr}]`);
    if (!target || !root.contains(target)) return;
    const handler = map[target.getAttribute(attr)];
    if (!handler) return;
    if (attr === 'data-act' && target.tagName === 'A' && target.getAttribute('href') === '#') event.preventDefault();
    handler(target.dataset, target, event);
  };
  const listeners = [['click', run(actions, 'data-act')], ['change', run(changes, 'data-change')], ['input', run(inputs, 'data-input')]];
  listeners.forEach(([type, fn]) => root.addEventListener(type, fn));
  return () => listeners.forEach(([type, fn]) => root.removeEventListener(type, fn));
}

// ---------- sheets ----------
const openSheets = [];
/**
 * Bottom sheet built on <dialog>: focus is trapped, Escape closes, tapping the backdrop closes.
 * `body` and `footer` may be html`` or functions returning html`` (re-run by `update()`).
 */
export function sheet({ title, eyebrow = '', body, footer = null, cls = '', actions = {}, changes = {}, inputs = {}, onClose, dismissable = true }) {
  const dialog = document.createElement('dialog');
  dialog.className = `sheet ${cls}`;
  const labelId = `sh-${uid().slice(0, 8)}`;
  dialog.setAttribute('aria-labelledby', labelId);
  const paint = () => {
    const bodyHtml = typeof body === 'function' ? body() : body;
    const footHtml = typeof footer === 'function' ? footer() : footer;
    dialog.innerHTML = String(html`
      <div class="sheet__h">
        <div class="grow">${eyebrow ? html`<p class="eyebrow">${eyebrow}</p>` : ''}<h2 class="display display--m" id="${labelId}" tabindex="-1">${title}</h2></div>
        ${dismissable ? html`<button class="icon-btn" type="button" data-act="__close" aria-label="Close">${icon('x')}</button>` : ''}
      </div>
      <div class="sheet__b">${bodyHtml}</div>
      ${footHtml ? html`<div class="sheet__f">${footHtml}</div>` : ''}`);
  };
  let finished = false;
  // Runs once, as soon as the sheet is closed by any route. It does not wait for the dialog's own
  // `close` event, which a browser may deliver late when the page is not being painted.
  const finalize = result => {
    if (finished) return;
    finished = true;
    const index = openSheets.indexOf(api); if (index >= 0) openSheets.splice(index, 1);
    dialog.remove(); onClose?.(result);
  };
  const api = {
    el: dialog,
    update() { if (finished) return; const top = dialog.querySelector('.sheet__b')?.scrollTop ?? 0; paint(); const box = dialog.querySelector('.sheet__b'); if (box) box.scrollTop = top; },
    close(result) { if (finished) return; if (dialog.open) dialog.close(); finalize(result); },
  };
  paint();
  delegate(dialog, { actions: { __close: () => api.close(), ...wrap(actions, api) }, changes: wrap(changes, api), inputs: wrap(inputs, api) });
  let downOnBackdrop = false;
  dialog.addEventListener('pointerdown', event => { downOnBackdrop = event.target === dialog; });
  dialog.addEventListener('click', event => { if (dismissable && downOnBackdrop && event.target === dialog) api.close(); downOnBackdrop = false; });
  dialog.addEventListener('cancel', event => { if (!dismissable) event.preventDefault(); });
  dialog.addEventListener('close', () => finalize(undefined)); // Escape, or anything else that closes it
  document.body.append(dialog);
  dialog.showModal();
  openSheets.push(api);
  dialog.querySelector(`#${labelId}`)?.focus({ preventScroll: true });
  return api;
}
function wrap(map, api) {
  return Object.fromEntries(Object.entries(map).map(([key, fn]) => [key, (data, el, event) => fn(data, el, event, api)]));
}
export const closeAllSheets = () => [...openSheets].forEach(item => item.close());

/** Yes/no question as a centred dialog. Resolves true or false. */
export function ask({ title, text = '', yes = 'Continue', no = 'Cancel', danger = false, eyebrow = 'Check' }) {
  return new Promise(resolve => {
    sheet({
      title, eyebrow, cls: 'sheet--center',
      body: html`${text ? html`<p class="lead">${text}</p>` : ''}`,
      footer: html`<button class="btn btn--quiet" type="button" data-act="no">${no}</button><button class="btn ${danger ? 'btn--mark' : ''}" type="button" data-act="yes">${yes}</button>`,
      actions: { yes: (_d, _e, _ev, api) => api.close(true), no: (_d, _e, _ev, api) => api.close(false) },
      onClose: result => resolve(result === true),
    });
  });
}

// ---------- toasts ----------
export function toast(message, { action = '', onAction, ms = 4200 } = {}) {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = String(html`<span>${message}</span>${action ? html`<button type="button">${action}</button>` : ''}`);
  const leave = () => { el.classList.add('toast--out'); setTimeout(() => el.remove(), 240); };
  const timer = setTimeout(leave, ms);
  el.querySelector('button')?.addEventListener('click', () => { clearTimeout(timer); el.remove(); onAction?.(); });
  host.replaceChildren(el);
}

// ---------- drawn marks ----------
const LOOPS = [
  'M8 30 C6 12 30 3 54 5 C82 7 97 19 95 33 C93 49 69 58 44 56 C20 54 5 46 9 27 C11 17 20 11 33 8',
  'M10 34 C4 15 28 4 52 4 C80 4 98 16 95 32 C92 50 66 58 42 56 C18 54 6 44 8 28 C10 18 22 9 38 7',
];
/** Hand-drawn grease-pencil circle that hugs its positioned parent. */
export const loop = (draw = false, variant = 0, extra = '') => raw(`<svg class="gp ${draw ? 'gp--draw' : ''} ${extra}" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="${LOOPS[variant % LOOPS.length]}"/></svg>`);
export const slash = (draw = false) => raw(`<svg class="gp ${draw ? 'gp--draw' : ''}" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M12 52 C36 38 62 22 90 7"/></svg>`);

// ---------- common fragments ----------
export const sec = (title, meta = '') => html`<div class="sec"><h2 class="sec__t">${title}</h2><span class="sec__m">${meta}</span></div>`;
export const switchRow = (act, checked, label, hint = '', data = '') => html`
  <button class="switch" type="button" role="switch" aria-checked="${checked ? 'true' : 'false'}" data-act="${act}" ${raw(data)}>
    <span class="switch__t"><span class="title" style="font-size:.98rem">${label}</span>${hint ? html`<span class="tiny muted" style="display:block">${hint}</span>` : ''}</span>
    <span class="switch__k" aria-hidden="true"></span>
  </button>`;
export const meter = (ratio, extra = '') => html`<div class="meter ${extra}" aria-hidden="true"><i style="width:${round(clamp(ratio, 0, 1) * 100, 1)}%"></i></div>`;
export const ticks = (value, max = 5, extra = '') => html`<span class="ticks ${extra}" aria-hidden="true" style="width:${max * 14}px">${Array.from({ length: max }, (_, i) => raw(`<i class="${i < value ? 'on' : ''}"></i>`))}</span>`;
export const extLink = (href, label) => html`<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;

export function download(filename, text, type = 'application/json') {
  try {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const anchor = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch { return false; }
}
