// Forme shell: hash router, appearance, the dock and the quick-add button.
// Each screen is a module with render(ctx) -> { room, where, body, actions, changes, inputs, after, leave, live }.

import * as store from './store.js';
import { html, icon, prefs, delegate, closeAllSheets, today, toast, dateline } from './ui.js';
import { trainingInfo } from './actions.js';
import { startReminders } from './reminders.js';

const ROUTES = [
  { test: path => path[0] === 'eat' && ['week', 'list', 'prep', 'fridge'].includes(path[1]), load: () => import('./views/plan.js'), nav: 'eat' },
  { test: path => path[0] === 'eat', load: () => import('./views/eat.js'), nav: 'eat' },
  { test: path => path[0] === 'train', load: () => import('./views/train.js'), nav: 'train' },
  { test: path => path[0] === 'move', load: () => import('./views/move.js'), nav: 'move' },
  { test: path => path[0] === 'habits', load: () => import('./views/habits.js'), nav: 'today' },
  { test: path => path[0] === 'reset', load: () => import('./views/reset.js'), nav: 'today' },
  { test: path => path[0] === 'private', load: () => import('./views/private.js'), nav: '' },
  { test: path => path[0] === 'you', load: () => import('./views/you.js'), nav: '' },
  { test: path => path[0] === 'search', load: () => import('./views/search.js'), nav: '' },
  { test: path => path[0] === 'fun', load: () => import('./views/fun.js'), nav: '' },
  { test: () => true, load: () => import('./views/today.js'), nav: 'today' },
];

const PAPERS = ['rosa', 'sky', 'butter', 'news'];
const root = document.documentElement;
const view = document.getElementById('view');
let current = null; // { route, module, screen, dispose, key }
let renderQueued = false;

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [pathPart, queryPart = ''] = raw.split('?');
  const path = pathPart.split('/').filter(Boolean).map(decodeURIComponent);
  return { path: path.length ? path : ['today'], query: new URLSearchParams(queryPart), key: raw };
}

function applySettings() {
  const ui = store.get('ui');
  const system = matchMedia('(prefers-reduced-motion: reduce)').matches;
  prefs.motion = ui.motion === 'reduced' || (ui.motion === 'system' && system) ? 'reduced' : 'full';
  prefs.haptics = ui.haptics !== false; prefs.sound = ui.sound === true;
  root.dataset.motion = prefs.motion;
  const fun = store.get('fun');
  const night = fun.enabled && fun.night;
  if (night) root.dataset.night = '1'; else delete root.dataset.night;
  // One appearance for every screen. Night Drive is a night scene, so it is always dark.
  const light = !night && (ui.theme === 'light' || (ui.theme === 'auto' && matchMedia('(prefers-color-scheme: light)').matches));
  root.dataset.theme = light ? 'light' : 'dark';
  // The switch in the top bar shows the appearance it will change to. Night Drive is always dark, so it hides.
  const toggle = document.getElementById('themeToggle');
  toggle.hidden = Boolean(night);
  toggle.setAttribute('aria-label', light ? 'Switch to dark appearance' : 'Switch to light appearance');
  toggle.title = light ? 'Dark appearance' : 'Light appearance';
  toggle.querySelector('use').setAttribute('href', `assets/icons.svg#${light ? 'moon' : 'sun'}`);
  // The paper stock. Pink is the default and needs no attribute.
  if (PAPERS.includes(ui.paper) && ui.paper !== 'rosa') root.dataset.paper = ui.paper; else delete root.dataset.paper;
}

/**
 * The page colour as a hex value, for the browser bar. The token is a colour mix, and the page itself
 * fades between appearances, so this paints the token onto a 1px canvas instead of reading the page.
 */
function pageColour() {
  try {
    const probe = document.createElement('i');
    probe.style.cssText = 'position:absolute;width:0;height:0;background:var(--bg);transition:none';
    document.getElementById('app').append(probe);
    const colour = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const context = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d');
    context.fillStyle = colour; context.fillRect(0, 0, 1, 1);
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
    return `#${[r, g, b].map(value => value.toString(16).padStart(2, '0')).join('')}`;
  } catch { return root.dataset.theme === 'light' ? '#f9bfcb' : '#131012'; }
}

function paintShell(screen, route, path) {
  root.dataset.room = screen.room ?? 'street';
  // Today is the home screen and the dock already says so; its bar carries the date instead of a name.
  document.getElementById('where').textContent = path[0] === 'today' ? '' : screen.where ?? '';
  document.title = screen.where ? `${screen.where} · Forme` : 'Forme';
  document.getElementById('stampLink').textContent = dateline(today());
  document.querySelectorAll('.dock__item').forEach(link => { if (link.dataset.nav === route.nav) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
  const profile = store.get('profile');
  document.getElementById('avatar').textContent = (profile.name || 'F').trim().charAt(0).toUpperCase();
  const priv = store.get('priv');
  const hasLog = (store.legacy.personal().value?.entries?.length ?? 0) > 0;
  document.getElementById('privateLink').hidden = !(path[0] === 'today' && (priv.enabled || hasLog) && !priv.hideEntry);
  const info = trainingInfo();
  const rec = document.getElementById('recButton');
  if (info.draft) { rec.dataset.live = '1'; rec.setAttribute('aria-label', 'Quick add. A workout is in progress.'); } else { delete rec.dataset.live; rec.setAttribute('aria-label', 'Quick add: log something now'); }
  const chrome = screen.bare ? 'none' : '';
  document.getElementById('topbar').style.display = chrome; document.querySelector('.dock').style.display = chrome;
  view.style.paddingBottom = screen.bare ? '0' : '';
  document.querySelector('meta[name="theme-color"]').setAttribute('content', pageColour());
}

function errorScreen(error) {
  return { room: 'street', where: 'Problem', body: html`<div class="wrap">
    <div class="frame"><div class="frame__head"><span>Error</span><span>Your data is untouched</span></div><div class="frame__body">
      <h1 class="display display--m">This screen could not be shown</h1>
      <p class="muted">${error?.message ?? 'Unknown error'}</p>
      <p>Nothing was deleted. Go back to Today, or export a backup first.</p>
      <div class="row row--wrap"><a class="btn" href="#/today">Back to Today</a><a class="btn btn--ghost" href="#/you/data">Backup and data</a></div>
    </div></div></div>`, actions: {} };
}

function ctxFor(parsed) {
  return {
    path: parsed.path, query: parsed.query,
    go: target => { location.hash = `#/${target}`; },
    replace: target => { history.replaceState(null, '', `#/${target}`); navigate(); },
    refresh: () => queueRender(),
    back: fallback => { if (history.length > 1) history.back(); else location.hash = `#/${fallback ?? 'today'}`; },
  };
}

function draw(module, route, parsed, entering) {
  let screen;
  try { screen = module.render(ctxFor(parsed)); } catch (error) { console.error(error); screen = errorScreen(error); }
  const keep = entering ? null : { scroll: window.scrollY, focus: document.activeElement?.id || null, pos: document.activeElement?.selectionStart ?? null };
  current?.dispose?.();
  view.innerHTML = String(screen.body);
  view.classList.toggle('cut-view', entering);
  const dispose = delegate(view, { actions: screen.actions ?? {}, changes: screen.changes ?? {}, inputs: screen.inputs ?? {} });
  current = { route, module, screen, dispose, key: parsed.key };
  paintShell(screen, route, parsed.path);
  try { screen.after?.(view); } catch (error) { console.error(error); }
  if (entering) { window.scrollTo(0, 0); view.focus({ preventScroll: true }); }
  else if (keep) {
    window.scrollTo(0, keep.scroll);
    if (keep.focus) { const el = document.getElementById(keep.focus); if (el) { el.focus({ preventScroll: true }); if (keep.pos !== null && el.setSelectionRange) { try { el.setSelectionRange(keep.pos, keep.pos); } catch { /* not a text field */ } } } }
  }
}

async function navigate() {
  const parsed = parseHash();
  const route = ROUTES.find(item => item.test(parsed.path));
  closeAllSheets();
  try { current?.screen?.leave?.(); } catch (error) { console.error(error); }
  let module;
  try { module = await route.load(); } catch (error) {
    console.error(error);
    current?.dispose?.();
    const screen = errorScreen(new Error('This screen could not be loaded. If you are offline, open Forme once with a connection so it can save itself for offline use.'));
    view.innerHTML = String(screen.body); current = { route, module: null, screen, dispose: null, key: parsed.key }; paintShell(screen, route, parsed.path);
    return;
  }
  if (parseHash().key !== parsed.key) return;
  let painted = false;
  const paint = () => { if (painted) return; painted = true; draw(module, route, parsed, true); };
  // The first screen paints straight away. Later ones cross-cut with a view transition, but a
  // background tab can stall its update callback, so a short timer guarantees the paint.
  if (current && prefs.motion === 'full' && document.startViewTransition && document.visibilityState === 'visible') {
    const transition = document.startViewTransition(paint);
    for (const settled of [transition.ready, transition.finished, transition.updateCallbackDone]) settled?.catch(() => {});
    setTimeout(paint, 250);
  } else paint();
}

function queueRender() {
  if (renderQueued || !current?.module) return;
  renderQueued = true;
  const run = () => {
    if (!renderQueued) return;
    renderQueued = false;
    if (!current?.module) return;
    const parsed = parseHash();
    if (parsed.key !== current.key) return;
    draw(current.module, current.route, parsed, false);
  };
  // Paint on the next frame. Frames are throttled or stopped in a background tab, so a short timer
  // is the fallback; whichever fires first does the work.
  requestAnimationFrame(run);
  setTimeout(run, 60);
}

// ---------- boot ----------
store.migrate();
applySettings();
window.addEventListener('hashchange', navigate);
window.addEventListener('forme:change', event => {
  if (['ui', 'fun', '*'].includes(event.detail?.section)) applySettings();
  if (current?.screen?.live === false) return;
  queueRender();
});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => { applySettings(); queueRender(); });
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => { applySettings(); queueRender(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) queueRender(); });
document.getElementById('themeToggle').addEventListener('click', () => store.update('ui', ui => { ui.theme = root.dataset.theme === 'light' ? 'dark' : 'light'; }));
document.getElementById('recButton').addEventListener('click', async () => { const quick = await import('./quick.js'); quick.openQuick(); });
document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.querySelector('dialog[open]')) return;
  if (event.key === '/' || event.key === 'k') { event.preventDefault(); import('./quick.js').then(quick => quick.openQuick()); }
  const jump = { 1: 'today', 2: 'train', 3: 'eat', 4: 'move', 5: 'you' }[event.key];
  if (jump) location.hash = `#/${jump}`;
});
if (!store.isPersistent) toast('This browser is blocking storage. Changes will last only until you close the tab.', { ms: 9000 });
if (!location.hash) history.replaceState(null, '', '#/today');
navigate();
startReminders();

// Offline copy. Skipped on localhost unless ?sw=1, so development never serves stale files.
const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
if ('serviceWorker' in navigator && (!local || new URLSearchParams(location.search).has('sw'))) {
  navigator.serviceWorker.register('sw.js').then(registration => {
    const offer = worker => {
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) toast('A new version of Forme is ready.', { action: 'Reload', ms: 15000, onAction: () => location.reload() });
      });
    };
    offer(registration.installing);
    registration.addEventListener('updatefound', () => offer(registration.installing));
  }).catch(() => { /* offline copy is optional */ });
}

export { icon };
