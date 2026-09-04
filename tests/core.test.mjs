import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLocalDates,
  calculateTracker,
  calculateWheyLabel,
  formatLocalDate,
} from '../assets/core.js';

function completeRows(firstWeight = 170, secondWeight = 171.5) {
  return Array.from({ length: 14 }, (_, index) => ({
    weight: index < 7 ? firstWeight : secondWeight,
    calories: 3300,
    protein: index === 13 ? 160 : 175,
  }));
}

function trackerInput(overrides = {}) {
  return {
    rows: completeRows(),
    targetCalories: 3300,
    targetProtein: 175,
    goalMin: 190,
    goalMax: 195,
    weeksRemaining: 14,
    priorOver: false,
    ...overrides,
  };
}

test('formatLocalDate keeps late-evening date on local calendar day', () => {
  const date = new Date(2026, 8, 3, 23, 30);
  assert.equal(formatLocalDate(date), '2026-09-03');
});

test('buildLocalDates crosses daylight-saving boundary without skipping dates', () => {
  assert.deepEqual(buildLocalDates('2026-10-31', 4), [
    '2026-10-31',
    '2026-11-01',
    '2026-11-02',
    '2026-11-03',
  ]);
});

test('buildLocalDates rejects impossible calendar dates', () => {
  assert.throws(() => buildLocalDates('2026-02-30', 14), /valid local date/i);
});

test('calculateWheyLabel uses honey inside allowed range', () => {
  assert.deepEqual(calculateWheyLabel({
    scoopCalories: 120,
    scoopProtein: 25,
    scoopCarbs: 2,
    scoopFat: 1,
  }), {
    uncorrectedCalories: 3306,
    differenceCalories: -6,
    method: 'honey',
    honeyGrams: 18,
    oilAdjustmentGrams: null,
    dailyProteinGrams: 176.7,
    dailyCarbGrams: 427.3,
    dailyFatGrams: 101.6,
  });
});

test('calculateWheyLabel uses oil when honey leaves allowed range', () => {
  const result = calculateWheyLabel({
    scoopCalories: 250,
    scoopProtein: 25,
    scoopCarbs: 2,
    scoopFat: 1,
  });

  assert.equal(result.method, 'oil');
  assert.equal(result.honeyGrams, 20);
  assert.equal(result.oilAdjustmentGrams, -15.4);
});

test('calculateWheyLabel rejects negative label values', () => {
  assert.throws(() => calculateWheyLabel({
    scoopCalories: -1,
    scoopProtein: 25,
    scoopCarbs: 2,
    scoopFat: 1,
  }), /non-negative/i);
});

test('calculateTracker requests more data when fewer than twelve calorie days exist', () => {
  const rows = completeRows();
  rows[0].calories = '';
  rows[1].calories = '';
  rows[2].calories = '';

  const result = calculateTracker(trackerInput({ rows }));

  assert.equal(result.decisionCode, 'collect-more');
  assert.equal(result.calorieEntries, 11);
});

test('calculateTracker removes module after repeated projection above configured maximum', () => {
  const result = calculateTracker(trackerInput({
    rows: completeRows(170, 172),
    priorOver: true,
  }));

  assert.equal(result.projection, 200);
  assert.equal(result.decisionCode, 'remove-module');
});

test('calculateTracker holds first projection above configured maximum', () => {
  const result = calculateTracker(trackerInput({ rows: completeRows(170, 172) }));

  assert.equal(result.decisionCode, 'first-over');
});

test('calculateTracker adds module when slow pace projects below configured minimum', () => {
  const result = calculateTracker(trackerInput({ rows: completeRows(170, 170.4) }));

  assert.equal(result.projection, 176);
  assert.equal(result.decisionCode, 'add-module');
});

test('calculateTracker holds when pace projects inside configured range', () => {
  const result = calculateTracker(trackerInput());

  assert.equal(result.firstAverage, 170);
  assert.equal(result.secondAverage, 171.5);
  assert.equal(result.weeklyRate, 1.5);
  assert.equal(result.projection, 192.5);
  assert.equal(result.decisionCode, 'hold-range');
});

test('calculateTracker holds fast pace that remains below configured maximum', () => {
  const result = calculateTracker(trackerInput({
    rows: completeRows(170, 171.6),
    weeksRemaining: 10,
  }));

  assert.equal(result.projection, 187.6);
  assert.equal(result.decisionCode, 'hold-fast');
});

test('calculateTracker returns review fallback for valid uncovered combination', () => {
  const result = calculateTracker(trackerInput({
    rows: completeRows(170, 170.5),
  }));

  assert.equal(result.decisionCode, 'hold-review');
  assert.match(result.decisionText, /review/i);
});

test('calculateTracker uses configured goal range instead of hidden constants', () => {
  const result = calculateTracker(trackerInput({
    rows: completeRows(170, 171.5),
    goalMin: 180,
    goalMax: 190,
  }));

  assert.equal(result.decisionCode, 'first-over');
});

test('calculateTracker reports protein adherence independently', () => {
  const result = calculateTracker(trackerInput());

  assert.equal(result.proteinEntries, 14);
  assert.equal(result.proteinAdherentDays, 13);
  assert.equal(result.proteinAdherence, 13 / 14);
});

test('calculateTracker rejects inverted goal range', () => {
  assert.throws(() => calculateTracker(trackerInput({ goalMin: 196, goalMax: 195 })), /minimum/i);
});
