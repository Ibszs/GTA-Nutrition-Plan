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
