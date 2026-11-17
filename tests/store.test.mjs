import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBackup as buildLegacyBackup } from '../assets/backup.js';
import { MemoryStorage, installStorage, LEGACY_KEYS, trackerState, wheyState, personalState, shoppingState, plannerState, trainingJournal } from './fixtures.mjs';

// app/store.js picks its storage when it is first imported, so every case loads a fresh module
// instance over its own in-memory localStorage.
let instance = 0;
async function freshStore(storage = new MemoryStorage()) {
  installStorage(storage);
  instance += 1;
  const store = await import(`../app/store.js?case=${instance}`);
  return { store, storage };
}

function seedLegacy(storage) {
  const values = {
    training: trainingJournal({ draft: false }), tracker: trackerState(), whey: wheyState(),
    planner: plannerState(), shopping: shoppingState(), personal: personalState(),
  };
  for (const [name, value] of Object.entries(values)) storage.setItem(LEGACY_KEYS[name], JSON.stringify(value));
  return values;
}

test('every section starts from its defaults and the storage is persistent', async () => {
  const { store } = await freshStore();
  assert.equal(store.isPersistent, true);
  assert.deepEqual([...store.SECTIONS].sort(), Object.keys(store.DEFAULTS).sort());
  for (const section of store.SECTIONS) {
    assert.deepEqual(store.get(section), store.DEFAULTS[section](), section);
    assert.equal(store.get(section).version, 1);
    assert.equal(store.sectionProblem(section), null);
  }
  assert.equal(store.get('profile').mode, 'lean-gain');
  assert.equal(store.get('profile').diet.noSeafood, true);
});

test('defaults are fresh objects, so editing one read does not leak into DEFAULTS', async () => {
  const { store } = await freshStore();
  const first = store.DEFAULTS.kitchen();
  first.batches.push({ id: 'x' });
  assert.deepEqual(store.DEFAULTS.kitchen().batches, []);
});

test('set and update round-trip through storage into a new instance', async () => {
  const { store, storage } = await freshStore();
  const saved = store.update('profile', profile => { profile.name = 'Sam'; profile.weight = 181; });
  assert.equal(saved.name, 'Sam'); assert.equal(saved.version, 1);
  assert.equal(JSON.parse(storage.getItem('forme.profile.v1')).name, 'Sam');
  store.update('habits', () => ({ version: 1, muteStreaks: true, seeded: true, habits: [], log: {} }));
  assert.equal(store.get('habits').muteStreaks, true, 'update may return a replacement value');
  store.set('ui', { ...store.get('ui'), motion: 'reduced', version: 7 });
  assert.equal(store.get('ui').version, 1, 'set always writes version 1');
  const { store: again } = await freshStore(storage);
  assert.equal(again.get('profile').name, 'Sam');
  assert.equal(again.get('profile').weight, 181);
  assert.equal(again.get('ui').motion, 'reduced');
  assert.deepEqual(again.get('profile').targets, { 'lean-gain': null, recomp: null }, 'untouched fields keep their defaults');
});

test('update clones: the cached value is not changed when the change throws', async () => {
  const { store } = await freshStore();
  assert.throws(() => store.update('kitchen', kitchen => { kitchen.extras.push('x'); throw new Error('stop'); }), /stop/);
  assert.deepEqual(store.get('kitchen').extras, []);
});

test('set rejects unknown sections and non-object values', async () => {
  const { store } = await freshStore();
  assert.throws(() => store.set('nope', { version: 1 }), TypeError);
  assert.throws(() => store.set('profile', null), TypeError);
  assert.throws(() => store.set('profile', []), TypeError);
});

test('an unreadable section is reported and never overwritten by set()', async () => {
  const storage = new MemoryStorage({ 'forme.habits.v1': '{not json', 'forme.reset.v1': JSON.stringify({ version: 2, actions: [] }), 'forme.fun.v1': '[1,2]' });
  const { store } = await freshStore(storage);
  for (const section of ['habits', 'reset', 'fun']) {
    assert.deepEqual(store.get(section), store.DEFAULTS[section](), `${section} falls back to defaults`);
    assert.ok(store.sectionProblem(section), `${section} reports a problem`);
    assert.throws(() => store.set(section, store.DEFAULTS[section]()), /could not be read/);
  }
  assert.throws(() => store.update('habits', habits => { habits.seeded = true; }), /could not be read/);
  assert.equal(storage.getItem('forme.habits.v1'), '{not json');
  assert.equal(storage.getItem('forme.reset.v1'), JSON.stringify({ version: 2, actions: [] }));
  store.resetSection('habits');
  assert.equal(store.sectionProblem('habits'), null);
  assert.equal(storage.getItem('forme.habits.v1'), null);
  store.update('habits', habits => { habits.seeded = true; });
  assert.equal(store.get('habits').seeded, true);
});

test('trackerToBody maps a real tracker and its archive into dated entries', async () => {
  const { store } = await freshStore();
  const mapped = store.trackerToBody(trackerState());
  assert.deepEqual(mapped.entries, {
    '2026-08-20': { weight: 178 },
    '2026-09-03': { weight: 180.4, kcal: 3200, protein: 170, sleep: 7, note: 'Felt fine', trained: true, gi: 1 },
    '2026-09-05': { weight: 181, trained: false },
    '2026-09-08': { kcal: 2950, protein: 160, gi: 0 },
  });
  assert.deepEqual(mapped.targets, { kcal: 3300, protein: 175 });
  assert.deepEqual(mapped.goalRange, [190, 195]);
  assert.deepEqual(mapped.waist, { baseline: 33, current: null, startDate: '2026-09-03' });
  const empty = trackerState(); empty.rows = empty.rows.map(row => Object.fromEntries(Object.keys(row).map(key => [key, '']))); delete empty.history;
  assert.deepEqual(store.trackerToBody(empty).entries, {});
});

test('migrate is additive and idempotent, and never touches the original journals', async () => {
  const storage = new MemoryStorage();
  seedLegacy(storage);
  const before = Object.fromEntries(Object.values(LEGACY_KEYS).map(key => [key, storage.getItem(key)]));
  const { store } = await freshStore(storage);
  const first = store.migrate();
  assert.equal(first.bodyDays, 4);
  assert.equal(first.targets, true); assert.equal(first.whey, true);
  assert.deepEqual(first.notes, []);
  const bodyAfterFirst = structuredClone(store.get('body'));
  const second = store.migrate();
  assert.deepEqual(second, first, 'a second run returns the saved report and changes nothing');
  for (const [key, text] of Object.entries(before)) assert.equal(storage.getItem(key), text, `${key} changed`);

  const body = store.get('body');
  assert.deepEqual(body, bodyAfterFirst);
  assert.deepEqual(Object.keys(body.entries).sort(), ['2026-08-20', '2026-09-03', '2026-09-05', '2026-09-08']);
  assert.equal(body.entries['2026-09-03'].weight, 180.4);
  assert.equal(body.entries['2026-09-03'].waist, 33, 'waist baseline lands on the tracker start date');
  const profile = store.get('profile');
  assert.deepEqual(profile.targets['lean-gain'], { kcal: 3300, protein: 175, fat: null, carried: true });
  assert.equal(profile.targets.recomp, null);
  assert.deepEqual(profile.whey, { kcal: 130, protein: 24, carbs: 3, fat: 2, custom: true });
  assert.equal(profile.weight, 181, 'the latest weigh-in becomes the current weight');
  assert.equal(profile.longTerm, 190);

  const { store: restarted } = await freshStore(storage);
  restarted.migrate();
  assert.deepEqual(restarted.get('body'), bodyAfterFirst, 'a new start does not copy the rows again');
  for (const [key, text] of Object.entries(before)) assert.equal(storage.getItem(key), text);
});

test('migrate keeps what is already in the new body log and saved targets', async () => {
  const storage = new MemoryStorage({
    'forme.body.v1': JSON.stringify({ version: 1, entries: { '2026-09-03': { weight: 179, note: 'mine' } } }),
    'forme.profile.v1': JSON.stringify({ version: 1, weight: 185, targets: { 'lean-gain': { kcal: 3000, protein: 180 }, recomp: null } }),
  });
  seedLegacy(storage);
  const { store } = await freshStore(storage);
  const report = store.migrate();
  assert.equal(report.bodyDays, 3);
  assert.equal(report.targets, false);
  assert.deepEqual(store.get('body').entries['2026-09-03'], { weight: 179, note: 'mine', waist: 33 });
  assert.deepEqual(store.get('profile').targets['lean-gain'], { kcal: 3000, protein: 180 });
  assert.equal(store.get('profile').weight, 185);
});

test('migrate leaves an unreadable tracker alone and says so', async () => {
  const storage = new MemoryStorage({ [LEGACY_KEYS.tracker]: '{"version":2,"meta":{}}' });
  const { store } = await freshStore(storage);
  const report = store.migrate();
  assert.equal(report.bodyDays, 0);
  assert.match(report.notes.join(' '), /could not be read/);
  assert.equal(storage.getItem(LEGACY_KEYS.tracker), '{"version":2,"meta":{}}');
  assert.deepEqual(store.get('body').entries, {});
});

test('buildBackup keeps the original envelope and adds data.forme', async () => {
  const storage = new MemoryStorage();
  const legacy = seedLegacy(storage);
  const { store } = await freshStore(storage);
  store.migrate();
  store.update('kitchen', kitchen => { kitchen.recipes['butter-chicken'] = { saved: true, rating: 5, cooked: ['2026-11-10'] }; });
  const backup = store.buildBackup('2026-11-17T12:00:00.000Z');
  assert.equal(backup.application, 'gta-nutrition-plan');
  assert.equal(backup.version, 3);
  assert.equal(backup.exportedAt, '2026-11-17T12:00:00.000Z');
  for (const name of Object.keys(LEGACY_KEYS)) assert.deepEqual(backup.data[name], legacy[name], name);
  assert.deepEqual(Object.keys(backup.data.forme).sort(), [...store.SECTIONS].sort());
  assert.equal(backup.data.forme.kitchen.recipes['butter-chicken'].rating, 5);
  assert.deepEqual(JSON.parse(JSON.stringify(backup)), backup, 'the backup is plain JSON');
});

test('parseBackup accepts its own v3 file and v1/v2 files from the earlier app', async () => {
  const storage = new MemoryStorage();
  seedLegacy(storage);
  const { store } = await freshStore(storage);
  const v3 = store.parseBackup(JSON.stringify(store.buildBackup('2026-11-17T12:00:00.000Z')));
  assert.equal(v3.version, 3);
  assert.deepEqual(Object.keys(v3.legacy).sort(), Object.keys(LEGACY_KEYS).sort());
  assert.ok(v3.forme && v3.forme.profile.version === 1);

  const v2 = buildLegacyBackup({ shopping: shoppingState(), tracker: trackerState(), whey: wheyState(), training: trainingJournal({ draft: false }) }, '2026-09-20T10:00:00.000Z');
  const parsed2 = store.parseBackup(JSON.stringify(v2));
  assert.equal(parsed2.version, 2); assert.equal(parsed2.forme, null);
  assert.deepEqual(parsed2.legacy.tracker, trackerState());
  assert.equal(parsed2.legacy.training.sessions.length, 4);

  const v1 = { application: 'gta-nutrition-plan', version: 1, exportedAt: '2026-09-01T10:00:00.000Z', data: { shopping: shoppingState(), tracker: trackerState(), whey: wheyState() } };
  const parsed1 = store.parseBackup(JSON.stringify(v1));
  assert.equal(parsed1.version, 1);
  assert.deepEqual(Object.keys(parsed1.legacy).sort(), ['shopping', 'tracker', 'whey']);
});

test('parseBackup refuses files that are not valid backups', async () => {
  const { store } = await freshStore();
  const good = { application: 'gta-nutrition-plan', version: 2, exportedAt: '2026-09-01T10:00:00.000Z', data: { shopping: shoppingState(), tracker: trackerState(), whey: wheyState() } };
  assert.throws(() => store.parseBackup('{oops'), SyntaxError);
  assert.throws(() => store.parseBackup(JSON.stringify({ ...good, application: 'other' })), TypeError);
  assert.throws(() => store.parseBackup(JSON.stringify({ ...good, version: 4 })), RangeError);
  assert.throws(() => store.parseBackup(JSON.stringify({ ...good, exportedAt: 'yesterday' })), TypeError);
  assert.throws(() => store.parseBackup(JSON.stringify({ ...good, data: { shopping: shoppingState(), whey: wheyState() } })), /tracker/);
  assert.throws(() => store.parseBackup(JSON.stringify({ ...good, version: 3 })), /Forme section/);
  assert.throws(() => store.parseBackup(JSON.stringify({ ...good, version: 3, data: { ...good.data, forme: { body: { version: 2 } } } })), /body/);
  const badTracker = trackerState(); badTracker.rows = badTracker.rows.slice(0, 3);
  assert.throws(() => store.parseBackup(JSON.stringify({ ...good, data: { ...good.data, tracker: badTracker } })));
});

test('restoreBackup round-trips a v3 backup into a clean browser', async () => {
  const source = new MemoryStorage();
  seedLegacy(source);
  const { store: from } = await freshStore(source);
  from.migrate();
  from.update('habits', habits => { habits.habits.push({ id: 'h1', name: 'Read', kind: 'count', target: 10, unit: 'min', days: [0, 1, 2, 3, 4, 5, 6], createdOn: '2026-11-01' }); habits.log = { '2026-11-16': { h1: 10 } }; });
  const text = JSON.stringify(from.buildBackup('2026-11-17T12:00:00.000Z'));

  const target = new MemoryStorage();
  const { store: to } = await freshStore(target);
  const writes = to.restoreBackup(to.parseBackup(text));
  assert.equal(writes, Object.keys(LEGACY_KEYS).length + from.SECTIONS.length);
  for (const section of from.SECTIONS) assert.deepEqual(to.get(section), from.get(section), section);
  for (const key of Object.values(LEGACY_KEYS)) assert.deepEqual(JSON.parse(target.getItem(key)), JSON.parse(source.getItem(key)), key);
  assert.equal(to.training.read().value.sessions.length, 4);
});

test('restoring a v2 backup imports its tracker into the body log', async () => {
  const v2 = buildLegacyBackup({ shopping: shoppingState(), tracker: trackerState(), whey: wheyState() }, '2026-09-20T10:00:00.000Z');
  const { store } = await freshStore();
  store.restoreBackup(store.parseBackup(JSON.stringify(v2)));
  assert.deepEqual(Object.keys(store.get('body').entries).sort(), ['2026-08-20', '2026-09-03', '2026-09-05', '2026-09-08']);
  assert.equal(store.get('profile').whey.kcal, 130);
  assert.ok(store.get('ui').migrated, 'the import ran and recorded itself');
});

test('restoreBackup writes everything or nothing when a write fails', async () => {
  const source = new MemoryStorage();
  seedLegacy(source);
  const { store: from } = await freshStore(source);
  from.migrate();
  from.update('kitchen', kitchen => { kitchen.oilNote = 'from the backup'; });
  const parsed = from.parseBackup(JSON.stringify(from.buildBackup('2026-11-17T12:00:00.000Z')));

  const target = new MemoryStorage({ 'forme.profile.v1': JSON.stringify({ version: 1, name: 'Before' }), [LEGACY_KEYS.whey]: JSON.stringify(wheyState()) });
  const { store: to } = await freshStore(target);
  const before = target.snapshot();
  target.failOn = 'forme.kitchen.v1';
  assert.throws(() => to.restoreBackup(parsed), /QuotaExceeded/);
  target.failOn = null;
  assert.deepEqual(target.snapshot(), before, 'every key is back to what it was, and new keys are removed');
  assert.equal(to.get('profile').name, 'Before');
  assert.equal(to.get('kitchen').oilNote, '');
});
