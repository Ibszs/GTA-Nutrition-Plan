import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { EXERCISES } from '../assets/training-data.js';
import { EXERCISE_VISUALS } from '../assets/exercise-visuals.js';
import * as exerciseVisuals from '../assets/exercise-visuals.js';

// Static contract for the Forme single-page app: shell, module graph, icons, offline cache,
// redirect stubs, manifest and text hygiene. Nothing here runs a browser.

const root = path.resolve(import.meta.dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = relativePath => fs.existsSync(path.join(root, relativePath));
const posix = file => file.split(path.sep).join('/');

function walk(directory) {
  const full = path.join(root, directory);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full, { withFileTypes: true }).flatMap(entry => {
    const relative = `${directory}/${entry.name}`;
    return entry.isDirectory() ? walk(relative) : [relative];
  });
}

const appJs = walk('app').filter(file => file.endsWith('.js'));
const appCss = walk('app/css').filter(file => file.endsWith('.css'));

function attributes(html, name) {
  const pattern = new RegExp(`\\b${name}=["']([^"']+)["']`, 'gi');
  return [...html.matchAll(pattern)].map(match => match[1]);
}

/** Remove block comments and whole-line // comments; string contents stay intact. */
const stripComments = source => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Static imports: [{ specifier, clause }] where clause is the text between `import` and `from`. */
function staticImports(source) {
  const code = stripComments(source);
  const out = [];
  for (const match of code.matchAll(/(?:^|[;\n])\s*import\s+([\w*{}\s,$]+?)\s+from\s+['"]([^'"]+)['"]/g)) out.push({ clause: match[1], specifier: match[2] });
  for (const match of code.matchAll(/(?:^|[;\n])\s*import\s+['"]([^'"]+)['"]/g)) out.push({ clause: '', specifier: match[1] });
  return out;
}
const dynamicImports = source => [...stripComments(source).matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)].map(match => match[1]);

/** Names a module exports, from its export statements. */
function exportsOf(source) {
  const code = stripComments(source);
  const names = new Set();
  for (const match of code.matchAll(/\bexport\s+(?:async\s+)?function\s*\*?\s*([\w$]+)/g)) names.add(match[1]);
  for (const match of code.matchAll(/\bexport\s+class\s+([\w$]+)/g)) names.add(match[1]);
  for (const match of code.matchAll(/\bexport\s+(?:const|let|var)\s+([\w$]+)/g)) names.add(match[1]);
  for (const match of code.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    for (const part of match[1].split(',').map(item => item.trim()).filter(Boolean)) names.add(part.split(/\s+as\s+/).at(-1).trim());
  }
  if (/\bexport\s+default\b/.test(code)) names.add('default');
  return names;
}

function parseClause(clause) {
  const result = { named: [], namespace: null, defaultName: null };
  const braces = clause.match(/\{([^}]*)\}/);
  if (braces) result.named = braces[1].split(',').map(item => item.trim()).filter(Boolean).map(item => item.split(/\s+as\s+/)[0].trim());
  const namespace = clause.match(/\*\s+as\s+([\w$]+)/);
  if (namespace) result.namespace = namespace[1];
  const rest = clause.replace(/\{[^}]*\}/, '').replace(/\*\s+as\s+[\w$]+/, '').replace(/,/g, ' ').trim();
  if (rest) result.defaultName = rest;
  return result;
}

const resolveFrom = (file, specifier) => posix(path.relative(root, path.resolve(path.dirname(path.join(root, file)), specifier)));

/** Every module reachable from an entry through static and dynamic imports. */
function importGraph(entry) {
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file) || !exists(file)) continue;
    seen.add(file);
    const source = read(file);
    for (const specifier of [...staticImports(source).map(item => item.specifier), ...dynamicImports(source)]) {
      if (/^[./]/.test(specifier)) queue.push(resolveFrom(file, specifier));
    }
  }
  return seen;
}

// ---------- carried over from the earlier suite: gym guides still feed the Train screen ----------

test('exercise guides match selected equipment and preserve legacy split meaning', () => {
  assert.equal(typeof exerciseVisuals.getExerciseGuide, 'function');
  const guide = exerciseVisuals.getExerciseGuide;
  assert.equal(guide('row', 'machine').visual, null);
  assert.equal(guide('row', 'db').visual.imageId, 'row');
  assert.equal(guide('lateral').visual, null);
  assert.equal(guide('lateral', 'db').visual.imageId, 'lateral');
  assert.equal(guide('flat', 'barbell').visual.imageId, 'flat-barbell');
  assert.equal(guide('flat', 'machine').visual, null);
  assert.equal(guide('split', 'db').visual, null);
  assert.match(guide('split', 'db').cues, /rear.*floor/i);
  assert.doesNotMatch(guide('row', 'cable').cues, /chest on.*pad/i);
  const prescribed = guide('flat', 'barbell', { repMin: 4, repMax: 6, rest: 240 });
  assert.equal(prescribed.name, 'Barbell bench press');
  assert.equal(prescribed.repMin, 4); assert.equal(prescribed.repMax, 6); assert.equal(prescribed.rest, 240);
  assert.equal(EXERCISES.flat.repMin, 6);
  assert.equal(guide('flat', 'unknown'), null);
  assert.equal(guide('__proto__'), null);
  assert.equal(guide('flat', 'db', { repMin: 12, repMax: 2 }).repMin, 6);
  assert.equal(guide('bulgarian', 'db').visual.imageId, 'split');
  assert.equal(guide('pullup', 'weighted').visual.imageId, 'pullup-weighted');
  assert.match(guide('pullup', 'bodyweight').loadNote, /0/);
  assert.match(guide('lateral', 'machine').loadNote, /stack|indicated/);
  for (const [id, variant, imageId] of [['row', 'cable', 'seated-row'], ['legcurl', 'lying', 'lying-legcurl'], ['split', 'lunge', 'reverse-lunge'], ['legpress', 'hack', 'squat'], ['triceps', 'pushdown', 'pushdown']]) {
    assert.equal(guide(id, variant).visual.imageId, imageId);
  }
  assert.match(guide('legpress', 'hack').loadNote, /same machine/);
  assert.doesNotMatch(guide('legpress', 'hack').loadNote, /sled/);
  assert.equal(guide('flat', 'db').loadLabel, 'One dumbbell');
  assert.equal(guide('flat', 'barbell').loadLabel, 'Bar + plates');
  assert.equal(guide('pulldown', 'neutral').loadLabel, 'Stack load');
  assert.equal(guide('pullup', 'bodyweight').loadLabel, '0 added load');
  assert.equal(guide('pullup', 'weighted').loadLabel, 'Added load only');
  assert.match(guide('rdl', 'smith').loadLabel, /Smith/);
});

const exerciseImageIds = () => {
  const ids = new Set(Object.entries(EXERCISE_VISUALS).map(([id, visual]) => visual.imageId ?? id));
  for (const variants of Object.values(exerciseVisuals.EXACT_VISUAL_VARIANTS)) for (const imageId of Object.values(variants)) ids.add(imageId);
  return ids;
};

test('every mapped gym demonstration has two local photos', () => {
  assert.deepEqual(Object.keys(EXERCISE_VISUALS).sort(), Object.keys(EXERCISES).sort());
  for (const id of exerciseImageIds()) {
    for (const position of [0, 1]) {
      const asset = `assets/images/exercises/${id}-${position}.jpg`;
      assert.ok(fs.statSync(path.join(root, asset)).size > 1000, asset);
    }
  }
});

// ---------- the shell ----------

test('index.html is the Forme shell: view, top bar, dock and quick-add button', () => {
  const html = read('index.html');
  assert.match(html, /<html\s+lang=["']en(?:-CA)?["']/i);
  assert.match(html, /<meta\s+name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i);
  assert.match(html, /<main\b[^>]*\bid=["']view["']/i);
  assert.match(html, /\bid=["']topbar["']/i);
  assert.match(html, /<nav\b[^>]*class=["'][^"']*\bdock\b/i);
  for (const nav of ['today', 'train', 'eat', 'move']) assert.match(html, new RegExp(`data-nav=["']${nav}["']`), `dock lacks ${nav}`);
  assert.match(html, /\bid=["']recButton["']/i);
  assert.doesNotMatch(html, /\sonclick\s*=/i);
});

test('index.html loads the two stylesheets, the module entry and the manifest', () => {
  const html = read('index.html');
  const styles = [...html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["']/gi)].map(match => match[1]);
  assert.ok(styles.includes('app/css/base.css'), 'base.css');
  assert.ok(styles.includes('app/css/rooms.css'), 'rooms.css');
  assert.match(html, /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']app\/main\.js["']|<script\b[^>]*\bsrc=["']app\/main\.js["'][^>]*\btype=["']module["']/i);
  assert.match(html, /<link\s+rel=["']manifest["'][^>]*href=["']manifest\.webmanifest["']/i);
  assert.match(html, /<meta\s+name=["']theme-color["'][^>]*content=["']#[0-9a-f]{6}["']/i);
});

test('index.html loads nothing from another origin and every local reference exists', () => {
  const html = read('index.html');
  const refs = [...attributes(html, 'src'), ...attributes(html, 'href')];
  assert.deepEqual(refs.filter(ref => /^(?:https?:)?\/\//i.test(ref)), []);
  for (const ref of refs) {
    if (/^(?:#|data:|mailto:|tel:)/i.test(ref)) continue;
    const file = decodeURIComponent(new URL(ref, 'https://local.test/').pathname.slice(1));
    assert.ok(exists(file), `index.html references missing ${file}`);
  }
});

test('index.html element ids are unique', () => {
  const ids = attributes(read('index.html'), 'id');
  assert.deepEqual([...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))], []);
});

// ---------- module graph ----------

for (const file of appJs) {
  test(`${file}: every import resolves to a file that exports what is imported`, () => {
    const source = read(file);
    for (const { specifier, clause } of staticImports(source)) {
      assert.match(specifier, /^\.\.?\//, `${file} imports a bare or absolute specifier ${specifier}`);
      const target = resolveFrom(file, specifier);
      assert.ok(exists(target), `${file} imports missing ${specifier}`);
      const exported = exportsOf(read(target));
      const { named, namespace, defaultName } = parseClause(clause);
      for (const name of named) assert.ok(exported.has(name), `${file}: ${target} does not export ${name}`);
      if (defaultName) assert.ok(exported.has('default'), `${file}: ${target} has no default export`);
      if (namespace) {
        const code = stripComments(source).replace(/(?:^|[;\n])\s*import\s+[\w*{}\s,$]+?\s+from\s+['"][^'"]+['"]/g, '\n');
        const used = new Set([...code.matchAll(new RegExp(`(?<![\\w$.])${namespace.replace('$', '\\$')}\\.([A-Za-z_$][\\w$]*)`, 'g'))].map(match => match[1]));
        for (const member of used) assert.ok(exported.has(member), `${file}: ${namespace}.${member} is not exported by ${target}`);
      }
    }
    for (const specifier of dynamicImports(source)) {
      assert.match(specifier, /^\.\.?\//, `${file} dynamically imports ${specifier}`);
      assert.ok(exists(resolveFrom(file, specifier)), `${file} dynamically imports missing ${specifier}`);
    }
  });
}

test('members used on dynamically imported modules are exported', () => {
  for (const file of appJs) {
    const code = stripComments(read(file));
    const bindings = [
      ...[...code.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)\.then\(\s*\(?\s*([\w$]+)\s*\)?\s*=>([\s\S]{0,400})/g)].map(match => ({ specifier: match[1], name: match[2], scope: match[3] })),
      ...[...code.matchAll(/const\s+([\w$]+)\s*=\s*await\s+import\(\s*['"]([^'"]+)['"]\s*\)\s*;([\s\S]{0,400})/g)].map(match => ({ specifier: match[2], name: match[1], scope: match[3] })),
    ];
    for (const { specifier, name, scope } of bindings) {
      const target = resolveFrom(file, specifier);
      const exported = exportsOf(read(target));
      const firstUse = scope.match(new RegExp(`(?<![\\w$.])${name}\\.([A-Za-z_$][\\w$]*)`));
      if (firstUse) assert.ok(exported.has(firstUse[1]), `${file}: ${specifier} has no export ${firstUse[1]}`);
    }
    for (const match of code.matchAll(/const\s+\[([^\]]+)\]\s*=\s*await\s+Promise\.all\(\[([^\]]+)\]\)/g)) {
      const patterns = match[1].match(/\{[^}]*\}/g) ?? [];
      const specifiers = [...match[2].matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)].map(item => item[1]);
      patterns.forEach((pattern, index) => {
        const exported = exportsOf(read(resolveFrom(file, specifiers[index])));
        for (const name of pattern.slice(1, -1).split(',').map(item => item.split(':')[0].trim()).filter(Boolean)) assert.ok(exported.has(name), `${file}: ${specifiers[index]} has no export ${name}`);
      });
    }
  }
});

test('every route in main.js ROUTES loads an existing view that exports render', () => {
  const main = read('app/main.js');
  const block = main.match(/const ROUTES = \[([\s\S]*?)\n\];/);
  assert.ok(block, 'ROUTES array not found');
  const views = [...block[1].matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)].map(match => resolveFrom('app/main.js', match[1]));
  assert.ok(views.length >= 11, `expected at least 11 routes, found ${views.length}`);
  for (const view of views) {
    assert.ok(exists(view), `route loads missing ${view}`);
    assert.ok(exportsOf(read(view)).has('render'), `${view} does not export render`);
  }
  assert.match(block[1], /test:\s*\(\)\s*=>\s*true/, 'ROUTES needs a catch-all last route');
});

// ---------- icons ----------

const iconSymbols = () => new Set([...read('assets/icons.svg').matchAll(/<symbol\b[^>]*\bid=["']([^"']+)["']/g)].map(match => match[1]));

test('every icon named in app code and index.html exists in assets/icons.svg', () => {
  const symbols = iconSymbols();
  const missing = [];
  for (const file of appJs) {
    const code = stripComments(read(file));
    const names = [
      ...[...code.matchAll(/\bicon\(\s*['"]([\w-]+)['"]/g)].map(match => match[1]),
      ...[...code.matchAll(/\bicon\(\s*[^,()'"]+\?\s*['"]([\w-]+)['"]\s*:\s*['"]([\w-]+)['"]/g)].flatMap(match => [match[1], match[2]]),
    ];
    for (const name of names) if (!symbols.has(name)) missing.push(`${file}: ${name}`);
  }
  for (const match of read('index.html').matchAll(/assets\/icons\.svg#([\w-]+)/g)) if (!symbols.has(match[1])) missing.push(`index.html: ${match[1]}`);
  assert.deepEqual(missing, []);
});

test('icon ids in assets/icons.svg are unique', () => {
  const ids = [...read('assets/icons.svg').matchAll(/<symbol\b[^>]*\bid=["']([^"']+)["']/g)].map(match => match[1]);
  assert.deepEqual(ids.filter((id, index) => ids.indexOf(id) !== index), []);
});

// ---------- no network ----------

test('app code makes no runtime network calls', () => {
  const offenders = [];
  for (const file of appJs) {
    const code = stripComments(read(file));
    for (const pattern of [/\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bWebSocket\b/, /\bsendBeacon\b/, /\bEventSource\b/]) if (pattern.test(code)) offenders.push(`${file}: ${pattern}`);
  }
  assert.deepEqual(offenders, []);
});

test('no script, stylesheet, font or image in app code is loaded from another origin', () => {
  const offenders = [];
  for (const file of appJs) {
    const code = read(file);
    for (const match of code.matchAll(/<(script|img|source|iframe|video|audio|link)\b[^>]*\b(src|srcset|href)=["']((?:https?:)?\/\/[^"']+)["'][^>]*>/gi)) {
      const tag = match[1].toLowerCase();
      if (tag === 'link' && !/rel=["'](?:stylesheet|preload|icon|modulepreload)/i.test(match[0])) continue;
      offenders.push(`${file}: <${tag}> ${match[3]}`);
    }
    for (const match of code.matchAll(/\bnew\s+(?:Image|Worker|SharedWorker)\s*\(\s*['"`]((?:https?:)?\/\/[^'"`]+)/g)) offenders.push(`${file}: ${match[1]}`);
    for (const match of code.matchAll(/\bimport\(\s*['"`]((?:https?:)?\/\/[^'"`]+)/g)) offenders.push(`${file}: import ${match[1]}`);
    for (const match of code.matchAll(/url\(\s*['"]?((?:https?:)?\/\/[^'")]+)/g)) offenders.push(`${file}: url ${match[1]}`);
  }
  for (const file of appCss) {
    const css = read(file);
    for (const match of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)) if (/^(?:https?:)?\/\//i.test(match[2])) offenders.push(`${file}: ${match[2]}`);
    for (const match of css.matchAll(/@import\s+(?:url\()?\s*['"]?((?:https?:)?\/\/[^'")\s]+)/g)) offenders.push(`${file}: @import ${match[1]}`);
  }
  assert.deepEqual(offenders, []);
});

// ---------- local files referenced by data and styles ----------

test('every photo file in credits.js exists and every recipe photo key is registered', async () => {
  const { PHOTOS } = await import('../app/data/credits.js');
  const { RECIPES } = await import('../app/data/recipes.js');
  for (const [key, photo] of Object.entries(PHOTOS)) assert.ok(exists(photo.file), `PHOTOS.${key}: missing ${photo.file}`);
  for (const recipe of RECIPES) if (recipe.photo) assert.ok(Object.hasOwn(PHOTOS, recipe.photo), `${recipe.id}: photo ${recipe.photo} is not in PHOTOS`);
});

test('every local image path written into app code exists', () => {
  const missing = [];
  for (const file of appJs) {
    for (const match of read(file).matchAll(/\b(?:src|href)=["'](assets\/[^"'$]+\.(?:jpg|jpeg|png|svg|webp))["']/g)) if (!exists(match[1])) missing.push(`${file}: ${match[1]}`);
  }
  assert.deepEqual(missing, []);
});

test('every url() in app/css that is not a data: URI or fragment exists', () => {
  const missing = [];
  for (const file of appCss) {
    for (const match of read(file).matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)) {
      const ref = match[2];
      if (/^(?:data:|#)/i.test(ref)) continue;
      const target = resolveFrom(file, ref.split(/[?#]/)[0]);
      if (!exists(target)) missing.push(`${file}: ${ref}`);
    }
  }
  assert.deepEqual(missing, []);
});

// ---------- service worker ----------

const FONTS = ['assets/fonts/sofia-sans.woff2', 'assets/fonts/sofia-sans-italic.woff2', 'assets/fonts/sofia-sans-condensed.woff2', 'assets/fonts/sofia-sans-extra-condensed.woff2', 'assets/fonts/sofia-sans-extra-condensed-italic.woff2'];

function precache() {
  const worker = read('sw.js');
  const block = worker.match(/const PRECACHE\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(block, 'sw.js has no `const PRECACHE = [ ... ];`');
  const entries = [...block[1].matchAll(/(['"`])([^'"`]*)\1/g)].map(match => match[2]);
  return entries;
}

test('sw.js names the Forme v4 cache on its first line', () => {
  const first = read('sw.js').split('\n')[0].replace(/\r$/, '');
  assert.equal(first, "const CACHE_NAME = 'forme-v4.0.2';");
});

test('sw.js PRECACHE holds only ./ paths that exist on disk, without duplicates', () => {
  const entries = precache();
  assert.ok(entries.length > 30, `PRECACHE looks too short (${entries.length})`);
  for (const entry of entries) {
    assert.match(entry, /^\.\//, `${entry} must start with ./`);
    if (entry !== './') assert.ok(exists(entry.slice(2)), `PRECACHE lists missing ${entry}`);
  }
  assert.deepEqual(entries.filter((entry, index) => entries.indexOf(entry) !== index), []);
});

test('sw.js precaches the shell, every app module and stylesheet, fonts and photos', () => {
  const entries = new Set(precache());
  const required = [
    './index.html', './manifest.webmanifest', './assets/icons.svg',
    ...FONTS.map(file => `./${file}`),
    ...walk('app').filter(file => /\.(js|css)$/.test(file)).map(file => `./${file}`),
    ...walk('assets/photos').map(file => `./${file}`),
  ];
  assert.deepEqual(required.filter(item => !entries.has(item)), []);
});

test('sw.js precaches every assets/ module reachable from app/main.js', () => {
  const entries = new Set(precache());
  const reachable = [...importGraph('app/main.js')].filter(file => file.startsWith('assets/'));
  assert.ok(reachable.includes('assets/training-state.js'), 'graph walk should reach assets/training-state.js');
  assert.ok(reachable.includes('assets/food-data.js'), 'graph walk should reach the dynamic import of assets/food-data.js');
  assert.deepEqual(reachable.filter(file => !entries.has(`./${file}`)), []);
});

test('sw.js leaves out vendor bundles and the old stylesheets', () => {
  const entries = precache();
  assert.deepEqual(entries.filter(entry => entry.startsWith('./assets/vendor/')), []);
  for (const old of ['styles.css', 'components.css', 'experience.css', 'recipes.css', 'training.css']) assert.ok(!entries.includes(`./assets/${old}`), `PRECACHE still lists ./assets/${old}`);
});

test('sw.js keeps a gym demonstration photo for offline use once it has been viewed', async () => {
  // The worker caches assets/images/exercises/ on first use instead of precaching all 76 photos.
  const handlers = {};
  const origin = 'https://example.test';
  const puts = [];
  const okResponse = { ok: true, clone() { return this; } };
  vm.runInNewContext(read('sw.js'), {
    URL, console,
    self: { location: { origin, href: `${origin}/app/sw.js` }, addEventListener: (event, handler) => { handlers[event] = handler; }, clients: { claim: async () => {} } },
    caches: { match: async () => undefined, open: async () => ({ put: async request => { puts.push(request.url); } }) },
    fetch: async () => okResponse,
    Response: { error: () => ({ error: true }) },
  });
  const [id] = exerciseImageIds();
  let response;
  const url = `${origin}/app/assets/images/exercises/${id}-0.jpg`;
  handlers.fetch({ request: { method: 'GET', mode: 'no-cors', url }, respondWith: value => { response = value; } });
  assert.equal(await response, okResponse);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(puts, [url]);
});

test('sw.js install caches every PRECACHE entry before activating', async () => {
  const handlers = {};
  const cached = [];
  let skipped = false; let installation;
  const cache = {
    addAll: async items => { cached.push(...items.map(item => (typeof item === 'string' ? item : item.url))); },
    add: async item => { cached.push(typeof item === 'string' ? item : item.url); },
    put: async request => { cached.push(typeof request === 'string' ? request : request.url); },
  };
  vm.runInNewContext(read('sw.js'), {
    URL, console,
    Request: class extends Request { constructor(input, options) { super(new URL(input, 'https://example.test/app/'), options); } },
    self: { location: { origin: 'https://example.test' }, addEventListener: (name, handler) => { handlers[name] = handler; }, skipWaiting: () => { skipped = true; }, clients: { claim: async () => {} } },
    caches: { open: async () => cache, keys: async () => [], delete: async () => true, match: async () => undefined },
    fetch: async () => { throw new Error('offline'); },
  });
  assert.equal(typeof handlers.install, 'function');
  handlers.install({ waitUntil: promise => { installation = promise; } });
  await installation;
  const normalised = new Set(cached.map(item => (item.startsWith('http') ? `.${new URL(item).pathname.replace(/^\/app/, '')}` : item)));
  for (const entry of precache()) assert.ok(normalised.has(entry) || (entry === './' && normalised.has('./')), `install did not cache ${entry}`);
  assert.equal(skipped, true, 'install should call skipWaiting so the update offer can reload into it');
});

test('sw.js answers an offline navigation with the cached index.html', async () => {
  const handlers = {};
  const origin = 'https://example.test';
  const shell = { page: 'index' };
  const store = new Map([[`${origin}/app/index.html`, shell], [`${origin}/app/`, shell]]);
  vm.runInNewContext(read('sw.js'), {
    URL, console,
    self: { location: { origin }, addEventListener: (event, handler) => { handlers[event] = handler; }, clients: { claim: async () => {} } },
    caches: {
      open: async () => ({ match: async request => store.get(new URL(typeof request === 'string' ? request : request.url, `${origin}/app/`).href.replace(/[?#].*$/, '')), put: async () => {} }),
      match: async request => store.get(new URL(typeof request === 'string' ? request : request.url, `${origin}/app/`).href.replace(/[?#].*$/, '')),
    },
    fetch: async () => { throw new Error('Offline'); },
    Response: { error: () => ({ error: true }) },
  });
  let response;
  handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: `${origin}/app/training.html`, headers: new Headers() }, respondWith: value => { response = value; }, waitUntil: () => {} });
  assert.equal(await response, shell);
});

// ---------- old pages become redirect stubs ----------

const REDIRECTS = {
  'training.html': 'index.html#/train',
  'meals.html': 'index.html#/eat',
  'shopping.html': 'index.html#/eat/list',
  'tracker.html': 'index.html#/you/progress',
  'plan.html': 'index.html#/eat/week',
  'cooking.html': 'index.html#/eat/prep',
  'quick-start.html': 'index.html#/today',
};

for (const [page, target] of Object.entries(REDIRECTS)) {
  test(`${page} is a small redirect stub to ${target}`, () => {
    assert.ok(exists(page), `${page} must stay so old bookmarks keep working`);
    const bytes = fs.statSync(path.join(root, page)).size;
    assert.ok(bytes < 2048, `${page} is ${bytes} bytes; a stub should be under 2 KB`);
    const html = read(page);
    const refresh = html.match(/<meta\b[^>]*http-equiv=["']refresh["'][^>]*>/i);
    assert.ok(refresh, `${page} has no meta refresh`);
    const url = refresh[0].match(/content=["'][^"']*?url=([^"';]+)["']/i);
    assert.ok(url, `${page} meta refresh has no url`);
    assert.equal(url[1].trim(), target);
    const escaped = target.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    assert.match(html, new RegExp(`location\\.replace\\(\\s*['"\`]${escaped}`), `${page} lacks location.replace('${target}')`);
  });
}

test('the old PDFs and the README that links them are still in place', () => {
  for (const file of ['GTA_16_Week_Nutrition_Plan.pdf', 'Mothers_Sunday_Cooking_Sheet.pdf', 'Quick_Start_Card.pdf', 'README.md']) assert.ok(exists(file), file);
  for (const legacy of ['START_HERE.html', 'quick_start_card.html', 'shopping_checklist.html', 'intake_response_tracker.html', 'gta_16_week_nutrition_plan.html', 'mothers_sunday_cooking_sheet.html', 'shopping_list_phone_notes.txt', 'README.txt']) {
    assert.equal(exists(legacy), false, `${legacy} must stay removed`);
  }
});

// ---------- manifest ----------

test('manifest names the app Forme and ships 192 and 512 icons that exist', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.name, 'Forme');
  assert.equal(manifest.short_name, 'Forme');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
  const sizes = manifest.icons.map(icon => icon.sizes);
  assert.ok(sizes.includes('192x192'), '192 icon');
  assert.ok(sizes.includes('512x512'), '512 icon');
  for (const icon of manifest.icons) assert.ok(exists(icon.src), `missing ${icon.src}`);
});

// ---------- text hygiene ----------

for (const file of [...appJs, ...appCss, 'index.html']) {
  test(`${file} contains no em dash`, () => {
    const lines = read(file).split('\n').map((line, index) => [index + 1, line]).filter(([, line]) => line.includes('—')).map(([n]) => `${file}:${n}`);
    assert.deepEqual(lines, []);
  });
}

test('text files under app/ are UTF-8 without BOM and use LF line endings', () => {
  const problems = [];
  for (const file of walk('app')) {
    const bytes = fs.readFileSync(path.join(root, file));
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) problems.push(`${file}: BOM`);
    if (bytes.includes(13)) problems.push(`${file}: CR`);
    const text = bytes.toString('utf8');
    if (text.includes('�')) problems.push(`${file}: invalid UTF-8`);
  }
  assert.deepEqual(problems, []);
});
