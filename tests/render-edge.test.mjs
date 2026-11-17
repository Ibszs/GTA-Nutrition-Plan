import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage, LEGACY_KEYS, localDay } from './fixtures.mjs';
import { installGlobals, routes, renderRoute } from './render-harness.mjs';
import { createTrainingState, createDraft, finishDraft } from '../assets/training-state.js';

// State (c), beyond the brief's two: unusual but reachable data. Recomp with no weight, a stale
// draft of an old-programme session, a finished movement plan with everything paused and no
// equipment, a thawed batch past its date, an unreadable private log, the playful layer off.
const iso = localDay;
const dow = (new Date().getDay() + 6) % 7;

let training = createTrainingState('2026-09-07');
const old = createDraft(training, 'upper-a', '2026-09-10');
old.exercises[0].sets[0] = { load: 50, reps: 10, rir: 2, completed: true, clean: true };
training = finishDraft({ ...training, draft: old }, 'legacy-1');
training = { ...training, draft: createDraft(training, 'hybrid5-legs-v1', iso(-1)) };

const storage = new MemoryStorage({
  [LEGACY_KEYS.training]: JSON.stringify(training),
  [LEGACY_KEYS.personal]: '{"version":1,"entries":"broken"}',
  'forme.profile.v1': JSON.stringify({ version: 1, mode: 'recomp', weight: null, unit: 'kg' }),
  'forme.body.v1': JSON.stringify({ version: 1, entries: { [iso(-1)]: { waist: 32 } } }),
  'forme.kitchen.v1': JSON.stringify({
    version: 1, recipes: { 'keema-matar': { rating: 1, skips: 4, cooked: [] } },
    weeks: { 'lean-gain': {}, recomp: { [`${dow}:dinner`]: null, [`${dow}:lunch`]: { r: 'retired-recipe' } } }, dayKinds: { 'lean-gain': {}, recomp: { [(dow + 1) % 7]: 'low-appetite' } },
    batches: [
      { id: 't1', recipeId: 'butter-chicken', part: 'Butter chicken', portions: 2, left: 1, where: 'fridge', madeOn: iso(-20), frozenOn: iso(-20), thawedOn: iso(-3), texture: null, note: '' },
      { id: 't2', recipeId: 'retired-recipe', part: 'Mystery', portions: 2, left: 2, where: 'fridge', madeOn: iso(-1), frozenOn: null, texture: null, note: '' },
      { id: 't3', recipeId: 'keema-matar', part: 'Keema', portions: 3, left: 0, where: 'freezer', madeOn: iso(-40), frozenOn: iso(-40), texture: 2, note: '' },
    ],
  }),
  'forme.move.v1': JSON.stringify({
    version: 1, setup: { primary: 'scap', secondary: null, equipment: { wall: false, chair: false, mat: false, step: false, band: false }, firstSide: 'right' },
    plan: { id: 'p9', kind: 'month', primary: 'scap', secondary: null, startedOn: iso(-40), done: 20 },
    sessions: [{ id: 'x', planId: 'p9', n: 20, date: iso(-1), short: false, seconds: 400, feel: 'off', off: ['wall-slide'], drills: ['wall-slide'], skipped: [] }],
    checks: [], levels: { 'prone-y': 2 }, paused: { 'wall-slide': { on: iso(-1), level: 1 } }, pastPlans: [{ id: 'p8', kind: 'week', primary: 'knee', secondary: null, startedOn: iso(-60), done: 7 }],
  }),
  'forme.habits.v1': JSON.stringify({ version: 1, muteStreaks: true, seeded: true, habits: [{ id: 'z', name: 'Stretch', kind: 'count', target: 3, unit: '', days: [], tiny: '', createdOn: iso(0), paused: true }], log: {} }),
  'forme.priv.v1': JSON.stringify({ version: 1, enabled: true, label: 'Scrolling', instead: '', events: [], checkDue: new Date(Date.now() - 60000).toISOString(), hideOnToday: false }),
  'forme.reset.v1': JSON.stringify({ version: 1, actions: null, oneThing: { id: 'o', text: 'Done thing', date: iso(-2), done: true }, evenings: {} }),
  'forme.fun.v1': JSON.stringify({ version: 1, enabled: false, night: true, stickers: { 'not-a-sticker': { n: 1 } }, quests: {}, replays: [{ week: '2026-01-05' }], hidden: {} }),
  'forme.ui.v1': JSON.stringify({ version: 1, motion: 'reduced', migrated: { at: '2026-11-01T00:00:00.000Z', bodyDays: 0, targets: false, whey: false, notes: [] } }),
});

installGlobals(storage);
await import('../app/store.js');
const { RECIPES } = await import('../app/data/recipes.js');
const { EXERCISES: DRILLS } = await import('../app/data/exercises.js');
const { EXERCISES: LIFTS } = await import('../assets/training-data.js');

const list = routes({ recipeIds: RECIPES.map(recipe => recipe.id), drillIds: DRILLS.map(drill => drill.id), firstLift: Object.keys(LIFTS).at(-1), sessionId: 'legacy-1' });

for (const item of list) test(`edge state renders ${item.label}`, async () => { await renderRoute(item); });

test('an unreadable training journal does not stop Today, Train or the replay', async () => {
  storage.setItem(LEGACY_KEYS.training, '{"version":1,"startDate":"nope"}');
  for (const item of [{ route: 'today', view: 'today' }, { route: 'train', view: 'train' }, { route: 'train/history', view: 'train' }, { route: 'fun/replay', view: 'fun' }, { route: 'you/progress', view: 'you' }]) {
    await assert.doesNotReject(renderRoute({ ...item, query: '' }), item.route);
  }
});
