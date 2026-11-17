import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage, installStorage, LEGACY_KEYS, trainingJournal, localDay } from './fixtures.mjs';

// app/actions.js: shared derived facts and small writes. toast() looks up #toasts, so a document
// whose getElementById finds nothing is the one global this file adds (toasts become no-ops).
installStorage(new MemoryStorage({ [LEGACY_KEYS.training]: JSON.stringify(trainingJournal({ draft: true, draftDate: localDay(0) })) }));
const store = await import('../app/store.js');
const actions = await import('../app/actions.js');
// Set after the imports: assets/common.js wires dialogs at import time when a document exists.
globalThis.document = { getElementById: () => null };
const today = localDay(0);

test('logBody merges a day, drops blank fields and deletes an emptied day', () => {
  actions.logBody(localDay(-1), { weight: 180.6, sleep: 7 });
  actions.logBody(localDay(-1), { sleep: null, kcal: 2900 });
  assert.deepEqual(store.get('body').entries[localDay(-1)], { weight: 180.6, kcal: 2900 });
  actions.logBody(localDay(-1), { weight: '', kcal: undefined });
  assert.equal(store.get('body').entries[localDay(-1)], undefined);
});

test('logBody keeps profile.weight on the most recent weigh-in, not the last one typed', () => {
  actions.logBody(localDay(-2), { weight: 181 });
  actions.logBody(localDay(-5), { weight: 179 });
  assert.equal(store.get('profile').weight, 181);
  actions.logBody(localDay(-2), { weight: null });
  assert.equal(store.get('profile').weight, 179);
});

test('touch records today once and gives the first-frame sticker', () => {
  store.update('fun', fun => { delete fun.lastActive; fun.stickers = {}; });
  actions.touch();
  assert.equal(store.get('fun').lastActive, today);
  assert.equal(store.get('fun').stickers['first-frame'].n, 1);
  actions.touch();
  assert.equal(store.get('fun').stickers['first-frame'].n, 1, 'a second touch the same day changes nothing');
});

test('touch after three or more days away gives the comeback sticker', () => {
  store.update('fun', fun => { fun.lastActive = localDay(-4); });
  actions.touch();
  assert.ok(store.get('fun').stickers.comeback);
});

test('award is silent and gives nothing when the playful layer is off', () => {
  store.update('fun', fun => { fun.enabled = false; });
  assert.equal(actions.award('pr'), false);
  assert.equal(store.get('fun').stickers.pr, undefined);
  store.update('fun', fun => { fun.enabled = true; });
  assert.equal(actions.award('pr', true), true);
  assert.equal(actions.award('pr', true), false, 'only the first time counts as new');
  assert.equal(store.get('fun').stickers.pr.n, 2);
  assert.equal(actions.award('no-such-sticker'), false);
});

test('markCooked records the day once, sorted, with the version cooked', () => {
  actions.markCooked('butter-chicken', { day: localDay(-1) });
  actions.markCooked('butter-chicken', { version: 'light', day: localDay(-3) });
  actions.markCooked('butter-chicken', { version: 'light', day: localDay(-3) });
  const record = actions.recipeRecord('butter-chicken');
  assert.deepEqual(record.cooked, [localDay(-3), localDay(-1)]);
  assert.equal(record.lastVersion, 'light');
  assert.ok(store.get('fun').stickers.lighter);
  assert.deepEqual(actions.recipeRecord('nothing-here'), {});
});

test('addBatch, batchClock and useBy follow the 3-day fridge rule', () => {
  const id = actions.addBatch({ recipeId: 'keema-matar', part: 'Keema', portions: 3, madeOn: localDay(-1) });
  const batch = store.get('kitchen').batches.find(item => item.id === id);
  assert.equal(batch.left, 3); assert.equal(batch.where, 'fridge'); assert.equal(batch.frozenOn, null);
  const fridge = madeOn => actions.batchClock({ where: 'fridge', madeOn }, today);
  assert.deepEqual([0, -1, -2, -3, -4].map(offset => fridge(localDay(offset)).state), ['fine', 'fine', 'soon', 'last', 'over']);
  assert.equal(fridge(today).left, 3);
  assert.equal(actions.useBy({ madeOn: today }), localDay(3));
  const thawed = actions.batchClock({ where: 'fridge', madeOn: localDay(-30), thawedOn: localDay(-1) }, today);
  assert.equal(thawed.state, 'last'); assert.equal(thawed.thawed, true);
  assert.equal(actions.useBy({ madeOn: localDay(-30), thawedOn: today }), localDay(1));
  const frozenId = actions.addBatch({ recipeId: 'keema-matar', part: 'Keema', portions: 2, where: 'freezer', madeOn: localDay(-10) });
  const frozen = store.get('kitchen').batches.find(item => item.id === frozenId);
  assert.equal(frozen.frozenOn, localDay(-10));
  assert.deepEqual(actions.batchClock(frozen, today), { where: 'freezer', days: 10, state: 'frozen' });
});

test('textureScore averages leftover ratings for one recipe', () => {
  store.update('kitchen', kitchen => { kitchen.batches.forEach((batch, index) => { if (batch.recipeId === 'keema-matar') batch.texture = index % 2 ? 4 : 2; }); });
  assert.equal(actions.textureScore('keema-matar'), 3);
  assert.equal(actions.textureScore('house-shake'), null);
});

test('trainingInfo reports the open draft and the day the programme plans', () => {
  const info = actions.trainingInfo();
  assert.equal(info.error, null);
  assert.ok(info.draft);
  assert.equal(info.draftTemplate.id, 'hybrid5-upper-v1');
  assert.ok(info.planned === null || typeof info.planned === 'object');
  if (info.planned?.kind === 'session') assert.equal(info.legDay, !info.upperDay);
  assert.equal(info.legDay && info.upperDay, false);
});

test('dayActivity collects what happened on one day', () => {
  store.update('move', move => { move.sessions = [{ id: 'm', planId: 'p', date: today, seconds: 120 }]; });
  store.update('habits', habits => { habits.habits = [{ id: 'h', name: 'Walk', kind: 'check', target: 1, days: [0, 1, 2, 3, 4, 5, 6], createdOn: localDay(-10) }]; habits.log = { [today]: { h: 1 } }; });
  actions.markCooked('house-shake', { day: today });
  const day = actions.dayActivity(today);
  assert.equal(day.move.length, 1);
  assert.deepEqual(day.cooked, ['house-shake']);
  assert.deepEqual(day.habits, { due: 1, done: 1 });
  assert.equal(day.kinds, 3);
  const training = actions.dayActivity('2026-09-07');
  assert.equal(training.train.length, 1);
});
