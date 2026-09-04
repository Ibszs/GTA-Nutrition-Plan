import test from 'node:test';
import assert from 'node:assert/strict';

import {
  copyText,
  createStorage,
  downloadText,
  loadJson,
  makeId,
  saveJson,
} from '../assets/common.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test('createStorage reports persistent storage when probe succeeds', () => {
  const storage = memoryStorage();
  const result = createStorage(storage);

  assert.equal(result.persistent, true);
  result.storage.setItem('x', '1');
  assert.equal(storage.getItem('x'), '1');
});

test('createStorage supplies working memory fallback when probe fails', () => {
  const blocked = {
    setItem() { throw new Error('blocked'); },
  };
  const result = createStorage(blocked);

  assert.equal(result.persistent, false);
  result.storage.setItem('x', '1');
  assert.equal(result.storage.getItem('x'), '1');
});

test('loadJson returns fallback for missing or malformed stored values', () => {
  const storage = memoryStorage();
  assert.deepEqual(loadJson(storage, 'x', { safe: true }), { safe: true });
  storage.setItem('x', '{broken');
  assert.deepEqual(loadJson(storage, 'x', { safe: true }), { safe: true });
});

test('saveJson stores serialized object', () => {
  const storage = memoryStorage();
  saveJson(storage, 'x', { value: 4 });
  assert.equal(storage.getItem('x'), '{"value":4}');
});

test('makeId uses available random UUID', () => {
  assert.equal(makeId({ randomUUID: () => 'stable-id' }), 'stable-id');
});

test('copyText reports clipboard success and absence', async () => {
  let copied = '';
  const clipboard = { writeText: async (text) => { copied = text; } };
  assert.equal(await copyText('list', clipboard), true);
  assert.equal(copied, 'list');
  assert.equal(await copyText('list', null), false);
});

test('downloadText clicks download and schedules URL cleanup', () => {
  let clicked = false;
  let removed = '';
  const anchor = { click: () => { clicked = true; } };
  const environment = {
    document: { createElement: () => anchor },
    URL: {
      createObjectURL: () => 'blob:test',
      revokeObjectURL: (value) => { removed = value; },
    },
    Blob,
    schedule: (callback) => callback(),
  };

  assert.equal(downloadText('backup.json', '{}', 'application/json', environment), true);
  assert.equal(anchor.download, 'backup.json');
  assert.equal(anchor.href, 'blob:test');
  assert.equal(clicked, true);
  assert.equal(removed, 'blob:test');
});

