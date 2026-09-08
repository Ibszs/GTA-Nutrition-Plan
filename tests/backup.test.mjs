import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBackup,
  createDefaultTrackerState,
  createDefaultWheyState,
  parseBackup,
  validateTrackerState,
  validateWheyState,
  archiveTracker,
  restoreBackup,
} from '../assets/backup.js';
import { createDefaultShoppingState } from '../assets/shopping-state.js';
import { createTrainingState, createDraft, editDraft, finishDraft } from '../assets/training-state.js';
import { createPlannerState, setRecipeRecord } from '../assets/planner-state.js';

test('recipe bookmarks, notes, quantities and cooking progress survive full backup restore', () => {
  const planner = setRecipeRecord(createPlannerState('2026-09-07'), 'tomato-chicken-rice', {saved:true, servings:4, checked:[0,2], step:6, note:'Use the wide pan.'});
  planner.days['2026-09-07'] = {planId:'original', overrides:{}, done:[0,2]};
  const backup = buildBackup({...validBackup().data, planner});
  const records = new Map();
  restoreBackup({getItem:key=>records.get(key)??null,setItem:(key,value)=>records.set(key,value),removeItem:key=>records.delete(key)},parseBackup(JSON.stringify(backup)));
  assert.deepEqual(JSON.parse(records.get('gtaNutrition.planner.v1')), planner);
  const legacy = structuredClone(backup); delete legacy.data.planner.recipeBook;
  assert.deepEqual(parseBackup(JSON.stringify(legacy)).data.planner.recipeBook, {});
  assert.deepEqual(parseBackup(JSON.stringify(legacy)).data.planner.days, planner.days);
});

test('complete backup restores customized workouts without altering their performed sets', () => {
  let training = createTrainingState('2026-09-03');
  training.draft = createDraft(training, 'upper-a', '2026-09-03');
  training = editDraft(training, { type: 'add', exerciseId: 'fly' });
  training.draft.exercises.at(-1).sets[0] = { load: 30, reps: 15, rir: 2, completed: true, clean: true };
  training = finishDraft(training, 'adapted-session');
  const backup = buildBackup({ ...validBackup().data, training });
  const records = new Map();
  restoreBackup({ getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) }, parseBackup(JSON.stringify(backup)));
  assert.deepEqual(JSON.parse(records.get('gtaNutrition.training.v1')), training);
});

function trackerState() {
  return {
    version: 2,
    meta: {
      startDate: '2026-09-03',
      targetCalories: '3300',
      targetProtein: '175',
      goalMin: '190',
      goalMax: '195',
      weeksRemaining: '14',
      waistBaseline: '',
      waistCurrent: '',
      priorOver: false,
    },
    rows: Array.from({ length: 14 }, () => ({
      weight: '', calories: '', protein: '', sleep: '', training: '', gi: '', note: '',
    })),
  };
}

function wheyState() {
  return {
    version: 1,
    scoopCalories: '120',
    scoopProtein: '25',
    scoopCarbs: '2',
    scoopFat: '1',
  };
}

function validBackup() {
  return buildBackup({
    shopping: createDefaultShoppingState(),
    tracker: trackerState(),
    whey: wheyState(),
  }, '2026-09-03T20:00:00.000Z');
}

test('buildBackup creates versioned document and parseBackup returns independent data', () => {
  const built = validBackup();
  const parsed = parseBackup(JSON.stringify(built));

  assert.equal(parsed.application, 'gta-nutrition-plan');
  assert.equal(parsed.version, 2);
  assert.equal(parsed.exportedAt, '2026-09-03T20:00:00.000Z');
  assert.equal(parsed.data.shopping.stores.length, 3);
  parsed.data.shopping.stores[0].name = 'Changed';
  assert.equal(built.data.shopping.stores[0].name, 'Costco - Burlington');
});

test('parseBackup rejects malformed JSON', () => {
  assert.throws(() => parseBackup('{broken'), /valid JSON/i);
});

test('parseBackup rejects wrong application marker', () => {
  const backup = validBackup();
  backup.application = 'other-app';
  assert.throws(() => parseBackup(JSON.stringify(backup)), /application/i);
});

test('parseBackup rejects unsupported document version', () => {
  const backup = validBackup();
  backup.version = 3;
  assert.throws(() => parseBackup(JSON.stringify(backup)), /backup version/i);
});

test('parseBackup rejects missing data sections', () => {
  const backup = validBackup();
  delete backup.data.tracker;
  assert.throws(() => parseBackup(JSON.stringify(backup)), /tracker/i);
});

test('parseBackup rejects malformed shopping without returning partial document', () => {
  const backup = validBackup();
  backup.data.shopping.stores[0].items[0].checked = 'yes';
  assert.throws(() => parseBackup(JSON.stringify(backup)), /shopping/i);
});

test('validateTrackerState rejects wrong row count and unknown versions', () => {
  const short = trackerState();
  short.rows.pop();
  assert.throws(() => validateTrackerState(short), /fourteen/i);

  const future = trackerState();
  future.version = 3;
  assert.throws(() => validateTrackerState(future), /tracker version/i);
});

test('validateTrackerState rejects executable-shaped row values', () => {
  const tracker = trackerState();
  tracker.rows[0].note = { html: '<img>' };
  assert.throws(() => validateTrackerState(tracker), /tracker row/i);
});

test('validateTrackerState rejects an inverted goal range', () => {
  const tracker = trackerState();
  tracker.meta.goalMin = '190';
  tracker.meta.goalMax = '180';
  assert.throws(() => validateTrackerState(tracker), /minimum cannot exceed goal maximum/i);
});

test('validateWheyState rejects negative and unsupported values', () => {
  const negative = wheyState();
  negative.scoopCalories = '-1';
  assert.throws(() => validateWheyState(negative), /whey/i);

  const future = wheyState();
  future.version = 2;
  assert.throws(() => validateWheyState(future), /whey version/i);
});

test('default interactive states match validated current schemas', () => {
  const tracker = createDefaultTrackerState('2026-09-03');
  const whey = createDefaultWheyState();

  assert.deepEqual(validateTrackerState(tracker), tracker);
  assert.deepEqual(validateWheyState(whey), whey);
  assert.equal(tracker.rows.length, 14);
  assert.equal(tracker.meta.startDate, '2026-09-03');
});

test('new backup roundtrip includes calendar and training, old backups remain readable', () => {
  const backup=validBackup();
  assert.equal(backup.data.training.version,1);
  assert.equal(backup.data.planner.version,1);
  const old={...backup,version:1,data:{shopping:backup.data.shopping,tracker:backup.data.tracker,whey:backup.data.whey}};
  const parsed=parseBackup(JSON.stringify(old));
  assert.equal(parsed.version,1);
  assert.equal(parsed.data.training,undefined);
});
test('backup refuses an invalid added section before any restore', () => {
  const backup=validBackup();
  backup.data.planner.pantry.rice=-1;
  assert.throws(()=>parseBackup(JSON.stringify(backup)),/pantry/i);
});
test('starting a new response period preserves previous dated readings', () => {
  const state=trackerState();state.rows[0].weight='170';
  const next=archiveTracker(state,'2026-09-17');
  assert.equal(next.history[0].meta.startDate,'2026-09-03');
  assert.equal(next.history[0].rows[0].weight,'170');
  assert.equal(next.rows[0].weight,'');
  assert.throws(()=>archiveTracker(state,'2026-09-10'),/overlap/i);
});
test('failed multi-section import rolls earlier writes back', () => {
  const values=new Map([['gtaNutrition.shopping.v2','old list'],['gtaNutrition.tracker.v2','old tracker']]);
  let fail=true;
  const storage={getItem:key=>values.get(key)??null,removeItem:key=>values.delete(key),setItem(key,value){if(key==='gtaNutrition.whey.v1'&&fail){fail=false;throw new Error('full');}values.set(key,value);}};
  assert.throws(()=>restoreBackup(storage,validBackup()),/full/);
  assert.equal(values.get('gtaNutrition.shopping.v2'),'old list');
  assert.equal(values.get('gtaNutrition.tracker.v2'),'old tracker');
});

test('personal records roundtrip while backups without that section preserve the existing log',()=>{
  const personal={version:1,entries:[{id:'private-one',at:'2026-09-05T12:00:00.000Z',amountMg:250,site:'Left',note:'Example'}]};
  const backup=buildBackup({...validBackup().data,personal});
  assert.deepEqual(parseBackup(JSON.stringify(backup)).data.personal,personal);
  const values=new Map([['gtaNutrition.personal.v1',JSON.stringify(personal)]]);
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  restoreBackup(storage,validBackup());
  assert.deepEqual(JSON.parse(values.get('gtaNutrition.personal.v1')),personal);
  const invalid=structuredClone(backup);invalid.data.personal.entries[0].amountMg=-1;
  assert.throws(()=>restoreBackup(storage,invalid),/Personal log/);
  assert.deepEqual(JSON.parse(values.get('gtaNutrition.personal.v1')),personal);
});

test('full backup preserves mixed legacy and hybrid records, shifted calendar and unfinished input', async () => {
  const { setProgramDay } = await import('../assets/training-state.js');
  const legacy = {
    version: 1, startDate: '2026-09-03', unit: 'kg',
    sessions: [{ id: 'old-custom', date: '2026-09-03', week: 1, sessionId: 'upper-a', unit: 'kg', lightWeek: false, customized: true, partial: true,
      exercises: [{ exerciseId: 'incline', variantId: 'db', setup: 'Bench 2', prescribedSets: 2, repMin: 6, repMax: 10,
        sets: [{ load: 20, reps: 8, rir: 3, completed: true, clean: true }] }] }],
    draft: null,
  };
  const legacyBackup = buildBackup({ ...validBackup().data, training: legacy });
  assert.deepEqual(parseBackup(JSON.stringify(legacyBackup)).data.training, legacy);
  assert.equal(Object.hasOwn(legacyBackup.data.training, 'program'), false);
  let training = setProgramDay(legacy, '2026-09-07', 1);
  training.draft = createDraft(training, 'hybrid5-upper-v1', '2026-09-07', true);
  training.draft.exercises[0].variantId = 'db';
  training.draft.exercises[0].sets[0] = { load: 25, reps: 8, rir: 4, completed: true, clean: true };
  training = finishDraft(training, 'hybrid-partial');
  training.draft = createDraft(training, 'hybrid5-lower-v1', '2026-09-08');
  training.draft.exercises[0].setup = 'Machine 3';
  training.draft.exercises[0].sets[0].load = 80; // Typed, still unperformed.
  const original = structuredClone(training);
  training = setProgramDay(training, '2026-09-09', 1);
  assert.deepEqual(training.sessions, original.sessions);
  assert.deepEqual(training.draft, original.draft);
  assert.equal(training.startDate, original.startDate);
  const built = buildBackup({ ...validBackup().data, training });
  const parsed = parseBackup(JSON.stringify(built));
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  restoreBackup(storage, parsed);
  assert.deepEqual(JSON.parse(values.get('gtaNutrition.training.v1')), training);
  assert.equal(parsed.data.training.sessions[1].targetRir, 4);
  assert.equal(parsed.data.training.sessions[1].partial, true);
  assert.equal(parsed.data.training.draft.targetRir, 2);
  parsed.data.training.draft.exercises[0].setup = 'Changed after parsing';
  assert.equal(built.data.training.draft.exercises[0].setup, 'Machine 3');
  const before = new Map(values);
  for (const mutate of [
    t => { t.program.anchorDate = '2026-02-30'; },
    t => { t.sessions[1].targetRir = '4'; },
    t => { t.sessions[1].partial = false; },
    t => { t.draft.exercises[0].repMax = 100; },
  ]) {
    const bad = structuredClone(built); mutate(bad.data.training);
    assert.throws(() => parseBackup(JSON.stringify(bad)), /Training data/);
    assert.throws(() => restoreBackup(storage, bad), /Training data/);
    assert.deepEqual(values, before, 'invalid imports must not write any section');
  }
});
