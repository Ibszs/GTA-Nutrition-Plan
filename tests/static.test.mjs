import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pages = [
  'index.html',
  'quick-start.html',
  'shopping.html',
  'tracker.html',
  'plan.html',
  'cooking.html',
];
const legacyFiles = [
  'START_HERE.html',
  'quick_start_card.html',
  'shopping_checklist.html',
  'intake_response_tracker.html',
  'gta_16_week_nutrition_plan.html',
  'mothers_sunday_cooking_sheet.html',
  'shopping_list_phone_notes.txt',
];
const navTargets = [
  'index.html',
  'quick-start.html',
  'shopping.html',
  'tracker.html',
  'plan.html',
  'cooking.html',
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function attributes(html, name) {
  const pattern = new RegExp(`\\b${name}=["']([^"']+)["']`, 'gi');
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

test('final page set replaces legacy filenames', () => {
  for (const page of pages) {
    assert.equal(fs.existsSync(path.join(root, page)), true, `${page} must exist`);
  }
  for (const legacy of legacyFiles) {
    assert.equal(fs.existsSync(path.join(root, legacy)), false, `${legacy} must be removed`);
  }
});

for (const page of pages) {
  test(`${page} exposes shared accessible application shell`, () => {
    const html = read(page);
    assert.match(html, /<html\s+lang=["']en["']/i);
    assert.match(html, /<meta\s+name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i);
    assert.match(html, /<link\s+rel=["']stylesheet["'][^>]*href=["']assets\/styles\.css["']/i);
    assert.match(html, /class=["'][^"']*skip-link[^"']*["']/i);
    assert.match(html, /<main\s+[^>]*id=["']main-content["']/i);
    assert.match(html, /<nav\s+[^>]*class=["'][^"']*site-nav[^"']*["']/i);
    assert.equal((html.match(/aria-current=["']page["']/gi) || []).length, 1);
    assert.match(html, /<script\s+type=["']module["'][^>]*src=["']assets\/common\.js["']/i);
    assert.doesNotMatch(html, /\sonclick\s*=/i);
  });

  test(`${page} navigation reaches every primary page`, () => {
    const html = read(page);
    for (const target of navTargets) {
      assert.match(html, new RegExp(`href=["']${target.replace('.', '\\.')}["']`, 'i'));
    }
  });

  test(`${page} contains unique element identifiers`, () => {
    const ids = attributes(read(page), 'id');
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    assert.deepEqual([...new Set(duplicates)], []);
  });

  test(`${page} loads no third-party scripts or stylesheets`, () => {
    const html = read(page);
    const scriptSources = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((match) => match[1]);
    const styleSources = [...html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["']/gi)].map((match) => match[1]);
    assert.equal([...scriptSources, ...styleSources].some((source) => /^https?:/i.test(source)), false);
  });
}

test('every local link target and fragment resolves with exact filename case', () => {
  for (const page of pages) {
    const html = read(page);
    for (const href of attributes(html, 'href')) {
      if (/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(href)) continue;
      const url = new URL(href, `https://local.test/${page}`);
      const target = decodeURIComponent(url.pathname.slice(1)) || page;
      assert.equal(fs.existsSync(path.join(root, target)), true, `${page} links to missing ${target}`);

      if (url.hash && target.endsWith('.html')) {
        const targetHtml = read(target);
        const fragment = decodeURIComponent(url.hash.slice(1));
        const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        assert.match(targetHtml, new RegExp(`\\b(?:id|name)=["']${escaped}["']`, 'i'));
      }
    }
  }
});

test('shopping page exposes complete editable-list controls', () => {
  const html = read('shopping.html');
  const controller = read('assets/shopping.js');

  for (const id of [
    'shoppingCounter',
    'shoppingBar',
    'shoppingStorageNotice',
    'stores',
    'addStoreButton',
    'clearChecksButton',
    'restoreDefaultsButton',
    'copyListButton',
    'exportShoppingButton',
    'importShoppingInput',
    'storeDialog',
    'storeForm',
    'itemDialog',
    'itemForm',
  ]) {
    assert.match(html, new RegExp(`\\bid=["']${id}["']`, 'i'), `missing #${id}`);
  }

  for (const action of ['rename-store', 'delete-store', 'add-item', 'edit-item', 'delete-item']) {
    assert.match(controller, new RegExp(`data-action["', )]+${action}|${action}`, 'i'), `missing ${action} action`);
  }

  assert.match(controller, /confirm\([^)]*Delete store/i);
  assert.match(controller, /confirm\([^)]*Delete item/i);
  assert.match(controller, /confirm\([^)]*Restore default/i);
  assert.match(controller, /\.textContent\s*=/);
  assert.doesNotMatch(controller, /\.innerHTML\s*=/);
  assert.match(html, /<script\s+type=["']module["'][^>]*src=["']assets\/shopping\.js["']/i);
});

test('tracker exposes corrected goals, labeled rows, export, and module controller', () => {
  const html = read('tracker.html');
  const controller = read('assets/tracker.js');

  for (const id of [
    'trackerStorageNotice', 'startDate', 'targetCalories', 'targetProtein',
    'goalMin', 'goalMax', 'weeksRemaining', 'waistBaseline', 'waistCurrent',
    'priorOver', 'trackerRows', 'calorieAdherence', 'proteinAdherence',
    'trackerDecision', 'trendChart', 'downloadCsvButton', 'clearTrackerButton',
    'trackerBackupLink',
  ]) {
    assert.match(html, new RegExp(`\\bid=["']${id}["']`, 'i'), `missing #${id}`);
  }

  assert.doesNotMatch(html, /id=["']targetFinish["']/i);
  assert.match(controller, /buildLocalDates/);
  assert.match(controller, /dataset\.label|data-label/i);
  assert.match(controller, /calculateTracker/);
  assert.match(controller, /gtaNutrition\.tracker\.v2/);
  assert.match(html, /<script\s+type=["']module["'][^>]*src=["']assets\/tracker\.js["']/i);
});

test('dashboard exposes whey setup, complete backup, and install controls', () => {
  const html = read('index.html');
  const controller = read('assets/home.js');

  for (const id of [
    'wheyCalories', 'wheyProtein', 'wheyCarbs', 'wheyFat', 'wheyResult',
    'homeStorageNotice', 'installButton', 'exportBackupButton', 'importBackupInput',
    'homeStatus', 'shoppingSummary', 'trackerSummary',
  ]) {
    assert.match(html, new RegExp(`\\bid=["']${id}["']`, 'i'), `missing #${id}`);
  }

  assert.match(controller, /beforeinstallprompt/);
  assert.match(controller, /calculateWheyLabel/);
  assert.match(controller, /buildBackup/);
  assert.match(controller, /parseBackup/);
  assert.match(controller, /navigator\.serviceWorker/);
  assert.match(html, /<script\s+type=["']module["'][^>]*src=["']assets\/home\.js["']/i);
});

test('manifest defines installable relative-scope application', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.name, 'GTA Nutrition Plan');
  assert.equal(manifest.short_name, 'GTA Fuel Log');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ['192x192', '512x512']);
  for (const icon of manifest.icons) {
    assert.equal(fs.existsSync(path.join(root, icon.src)), true, `missing ${icon.src}`);
  }
});

test('service worker precaches every shipped application asset', () => {
  const worker = read('sw.js');
  const expected = [
    './', './index.html', './quick-start.html', './shopping.html', './tracker.html',
    './plan.html', './cooking.html', './assets/styles.css', './assets/common.js',
    './assets/core.js', './assets/shopping-state.js', './assets/backup.js',
    './assets/shopping.js', './assets/tracker.js', './assets/home.js',
    './icons/icon-192.png', './icons/icon-512.png', './manifest.webmanifest',
    './GTA_16_Week_Nutrition_Plan.pdf', './Mothers_Sunday_Cooking_Sheet.pdf',
    './Quick_Start_Card.pdf',
  ];
  assert.match(worker, /gta-nutrition-v1/);
  for (const asset of expected) {
    assert.match(worker, new RegExp(`['"]${asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`), `cache omits ${asset}`);
    if (asset !== './') assert.equal(fs.existsSync(path.join(root, asset.slice(2))), true, `missing ${asset}`);
  }
});

test('every page exposes install metadata', () => {
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /<link\s+rel=["']manifest["'][^>]*href=["']manifest\.webmanifest["']/i);
    assert.match(html, /<link\s+rel=["']icon["'][^>]*href=["']icons\/icon-192\.png["']/i);
    assert.match(html, /<link\s+rel=["']apple-touch-icon["'][^>]*href=["']icons\/icon-192\.png["']/i);
    assert.match(html, /<meta\s+name=["']theme-color["'][^>]*content=["']#[0-9a-f]{6}["']/i);
  }
  assert.equal(fs.existsSync(path.join(root, 'README.md')), true);
  assert.equal(fs.existsSync(path.join(root, 'README.txt')), false);
});

test('shopping action buttons retain 44-pixel touch targets', () => {
  const styles = read('assets/styles.css');
  assert.match(styles, /\.store-actions button,\s*\n\.item-actions button\s*\{[^}]*min-height:\s*44px/s);
});

test('tracker never persists an invalid intermediate form state', () => {
  const controller = read('assets/tracker.js');
  assert.match(controller, /function save\(\)[\s\S]*?validateTrackerState\(state\)[\s\S]*?saveJson/);
  assert.match(controller, /catch \(_\) \{\s*return false;/);
  assert.match(controller, /metaFields\.forEach\([^\n]*addEventListener\('input', updateMeta\)/);
});
