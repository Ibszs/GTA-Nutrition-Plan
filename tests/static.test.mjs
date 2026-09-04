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
