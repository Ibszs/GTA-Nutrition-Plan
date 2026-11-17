// Shared harness for the render smoke tests. Not a test file itself.
// Each render test file runs in its own process (node --test isolates files), so each one gets
// its own app/store.js instance over its own in-memory localStorage.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MemoryStorage, installStorage } from './fixtures.mjs';

const ICONS = new Set([...fs.readFileSync(new URL('../assets/icons.svg', import.meta.url), 'utf8').matchAll(/<symbol\b[^>]*\bid=["']([^"']+)["']/g)].map(match => match[1]));

/**
 * Globals the views need in Node. Kept to what an import or a render actually touches; each entry
 * is listed in the report with the module that forced it.
 */
export function installGlobals(storage = new MemoryStorage()) {
  installStorage(storage);
  return storage;
}

const VIEW_FOR = path => {
  if (path[0] === 'eat' && ['week', 'list', 'prep', 'fridge'].includes(path[1])) return 'plan';
  return { eat: 'eat', train: 'train', move: 'move', habits: 'habits', reset: 'reset', private: 'private', you: 'you', search: 'search', fun: 'fun' }[path[0]] ?? 'today';
};

export async function loadView(name) { return import(`../app/views/${name}.js`); }

export function ctxFor(route, query = '') {
  const path = route.split('/').filter(Boolean);
  return { path: path.length ? path : ['today'], query: new URLSearchParams(query), go() {}, replace() {}, refresh() {}, back() {} };
}

/** Every route the brief lists. `ids` supplies the dynamic parts. */
export function routes({ recipeIds, drillIds, firstLift, sessionId }) {
  const list = [
    ['today'],
    ['train'], ['train/go'], ['train/history'], ['train/records'], ['train/hams'], ['train/library'], [`train/x/${firstLift}`], [`train/s/${sessionId}`],
    ['eat'], ...recipeIds.map(id => [`eat/r/${id}`]), [`eat/cook/${recipeIds[1]}`], ['eat/archive'], ['eat/week'], ['eat/list'], ['eat/prep'], ['eat/fridge'],
    ['move'], ['move/library'], ['move/why'], ['move/check'], ['move/done'], ['move/play'], ...drillIds.map(id => [`move/x/${id}`]),
    ['habits'], ['reset'], ['private'], ['private', 'log=1'],
    ['you'], ['you/goal'], ['you/progress'], ['you/settings'], ['you/data'], ['you/credits'],
    ['search'], ['search', 'q=chicken'], ['fun'], ['fun/sheet'], ['fun/replay'],
  ];
  return list.map(([route, query = '']) => ({ route, query, view: VIEW_FOR(route.split('/')), label: query ? `${route}?${query}` : route }));
}

export const visibleText = markup => markup
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]*>/g, ' ');

export const BAD_TEXT = /\bundefined\b|\bNaN\b|\[object Object\]/;

/** Render one route and check the screen contract. Returns the screen and its markup. */
export async function renderRoute({ route, query, view }) {
  const module = await loadView(view);
  assert.equal(typeof module.render, 'function', `${view}.js has no render`);
  const screen = module.render(ctxFor(route, query));
  assert.ok(screen && typeof screen === 'object', 'render returns an object');
  const markup = String(screen.body ?? '');
  assert.ok(markup.trim().length > 0, 'body is empty');
  assert.ok(['street', 'kitchen', 'studio'].includes(screen.room), `room is ${screen.room}`);
  const text = visibleText(markup);
  const bad = text.match(new RegExp(`.{0,60}(?:${BAD_TEXT.source}).{0,60}`));
  assert.equal(bad, null, `visible text contains: ${bad?.[0]?.replace(/\s+/g, ' ')}`);
  const missingIcons = [...new Set([...markup.matchAll(/icons\.svg#([^"'\s)]+)/g)].map(match => match[1]))].filter(name => !ICONS.has(name));
  assert.deepEqual(missingIcons, [], 'rendered icons missing from assets/icons.svg');
  const missingFiles = [...new Set([...markup.matchAll(/\bsrc="(assets\/[^"]+)"/g)].map(match => match[1]))].filter(file => !fs.existsSync(new URL(`../${file}`, import.meta.url)));
  assert.deepEqual(missingFiles, [], 'rendered images missing on disk');
  return { screen, markup };
}

/** Visible em dashes. ui.js fmt() prints one for a non-number, so this also catches NaN that fmt hides. */
export function emDashes(markup) {
  return [...visibleText(markup).matchAll(/.{0,50}—.{0,30}/g)].map(match => match[0].replace(/\s+/g, ' ').trim());
}

/** Attribute values with NaN, undefined or [object Object]: invisible, but still broken markup. */
export function badAttributes(markup) {
  return [...markup.matchAll(/\s([\w:-]+)="([^"]*)"/g)].filter(([, , value]) => BAD_TEXT.test(value)).map(([whole]) => whole.trim().slice(0, 120));
}
