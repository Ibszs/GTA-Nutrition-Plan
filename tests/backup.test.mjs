import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBackup,
  createDefaultTrackerState,
  createDefaultWheyState,
  parseBackup,
  validateTrackerState,
  validateWheyState,
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
  assert.equal(parsed.version, 1);
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
  backup.version = 2;
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
