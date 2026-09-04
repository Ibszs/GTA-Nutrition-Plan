import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addItem,
  addStore,
  clearChecks,
  createDefaultShoppingState,
  removeItem,
  removeStore,
  renameStore,
  shoppingProgress,
  shoppingToText,
  toggleItem,
  updateItem,
  validateShoppingState,
} from '../assets/shopping-state.js';

test('default shopping state contains supplied stores and twenty-two items', () => {
  const state = createDefaultShoppingState();
  const itemCount = state.stores.reduce((count, store) => count + store.items.length, 0);

  assert.equal(state.version, 2);
  assert.deepEqual(state.stores.map((store) => store.name), [
    'Costco - Burlington',
    'Food Basics - Milton',
    'Iqbal Foods - Erin Mills',
  ]);
  assert.equal(itemCount, 22);
});

test('addStore adds trimmed store without mutating original state', () => {
  const original = createDefaultShoppingState();
  const added = addStore(original, '  Farmers Market  ', () => 'store-new');

  assert.equal(original.stores.length, 3);
  assert.equal(added.stores.length, 4);
  assert.deepEqual(added.stores[3], { id: 'store-new', name: 'Farmers Market', items: [] });
});

test('renameStore updates requested store only', () => {
  const original = createDefaultShoppingState();
  const renamed = renameStore(original, 'costco-burlington', 'Costco North');

  assert.equal(renamed.stores[0].name, 'Costco North');
  assert.equal(renamed.stores[1].name, original.stores[1].name);
  assert.equal(original.stores[0].name, 'Costco - Burlington');
});

test('removeStore removes matching store and preserves others', () => {
  const original = createDefaultShoppingState();
  const removed = removeStore(original, 'food-basics-milton');

  assert.deepEqual(removed.stores.map((store) => store.id), [
    'costco-burlington',
    'iqbal-erin-mills',
  ]);
});

test('addItem appends normalized item to selected store', () => {
  const state = createDefaultShoppingState();
  const added = addItem(state, 'costco-burlington', {
    name: '  Apples ',
    quantity: ' 6 ',
    note: '  Gala ',
    tag: ' produce ',
  }, () => 'item-new');
  const item = added.stores[0].items.at(-1);

  assert.deepEqual(item, {
    id: 'item-new',
    name: 'Apples',
    quantity: '6',
    note: 'Gala',
    tag: 'PRODUCE',
    checked: false,
  });
});

test('updateItem preserves original state and changes requested fields', () => {
  const original = createDefaultShoppingState();
  const item = original.stores[0].items[0];
  const edited = updateItem(original, original.stores[0].id, item.id, {
    name: 'Chicken thighs',
    quantity: '2 packs',
    note: 'Freeze one',
    tag: 'PLAIN',
  });

  assert.notEqual(edited, original);
  assert.equal(original.stores[0].items[0].quantity, '1 pack, about 2.1 kg');
  assert.deepEqual(edited.stores[0].items[0], {
    ...item,
    name: 'Chicken thighs',
    quantity: '2 packs',
    note: 'Freeze one',
    tag: 'PLAIN',
  });
});

test('toggleItem and clearChecks update purchased state', () => {
  const original = createDefaultShoppingState();
  const toggled = toggleItem(original, 'costco-burlington', 'chicken-thighs', true);
  const cleared = clearChecks(toggled);

  assert.equal(toggled.stores[0].items[0].checked, true);
  assert.equal(cleared.stores[0].items[0].checked, false);
  assert.equal(original.stores[0].items[0].checked, false);
});

test('removeItem removes requested item only', () => {
  const original = createDefaultShoppingState();
  const removed = removeItem(original, 'costco-burlington', 'chicken-thighs');

  assert.equal(removed.stores[0].items.length, 7);
  assert.equal(removed.stores[0].items.some((item) => item.id === 'chicken-thighs'), false);
});

test('shoppingProgress handles empty state without division error', () => {
  assert.deepEqual(shoppingProgress({ version: 2, stores: [] }), {
    checked: 0,
    total: 0,
    percent: 0,
  });
});

test('shoppingProgress counts current edited list', () => {
  let state = createDefaultShoppingState();
  state = toggleItem(state, 'costco-burlington', 'chicken-thighs', true);
  state = toggleItem(state, 'food-basics-milton', 'eggs', true);

  assert.deepEqual(shoppingProgress(state), {
    checked: 2,
    total: 22,
    percent: 9,
  });
});

test('shoppingToText produces readable store headings and quantities', () => {
  const text = shoppingToText(createDefaultShoppingState());

  assert.match(text, /COSTCO - BURLINGTON/);
  assert.match(text, /Halal boneless skinless chicken thighs - 1 pack, about 2\.1 kg/);
  assert.match(text, /IQBAL FOODS - ERIN MILLS/);
});

test('shopping transforms reject blank names', () => {
  const state = createDefaultShoppingState();

  assert.throws(() => addStore(state, '   ', () => 'x'), /store name/i);
  assert.throws(() => addItem(state, 'costco-burlington', {
    name: '', quantity: '1', note: '', tag: '',
  }, () => 'x'), /item name/i);
});

test('shopping transforms reject missing store and item identifiers', () => {
  const state = createDefaultShoppingState();

  assert.throws(() => renameStore(state, 'missing', 'Name'), /store.*not found/i);
  assert.throws(() => toggleItem(state, 'costco-burlington', 'missing', true), /item.*not found/i);
});

test('validateShoppingState rejects malformed imported values', () => {
  assert.throws(() => validateShoppingState({ version: 2, stores: [{ id: 'x' }] }), /shopping/i);
  assert.throws(() => validateShoppingState({ version: 3, stores: [] }), /version/i);
});

