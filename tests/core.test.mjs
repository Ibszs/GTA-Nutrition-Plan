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

test('whey label updates the original meal estimate without secretly changing portions', () => {
  const empty=calculateWheyLabel({scoopCalories:0,scoopProtein:0,scoopCarbs:0,scoopFat:0});
  const actual=calculateWheyLabel({scoopCalories:120,scoopProtein:25,scoopCarbs:2,scoopFat:1});
  assert.equal(actual.dailyCalories-empty.dailyCalories,120);
  assert.equal(actual.dailyProteinGrams-empty.dailyProteinGrams,25);
  assert.equal(actual.dailyCarbGrams-empty.dailyCarbGrams,2);
  assert.equal(actual.dailyFatGrams-empty.dailyFatGrams,1);
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

test('calculateTracker flags rapid gain even if a deadline projection looks acceptable', () => {
  const result = calculateTracker(trackerInput({
    rows: completeRows(170, 172),
    priorOver: true,
  }));

  assert.equal(result.projection, 200);
  assert.equal(result.decisionCode, 'review-fast');
});

test('calculateTracker reviews a rapid first trend without automatically changing calories', () => {
  const result = calculateTracker(trackerInput({ rows: completeRows(170, 172) }));

  assert.equal(result.decisionCode, 'review-fast');
});

test('calculateTracker suggests a modest increase for a consistently slow trend', () => {
  const result = calculateTracker(trackerInput({ rows: completeRows(170, 170.4) }));

  assert.equal(result.projection, 176);
  assert.equal(result.decisionCode, 'review-slow');
});

test('calculateTracker does not endorse rapid gain to satisfy a finish target', () => {
  const result = calculateTracker(trackerInput());

  assert.equal(result.firstAverage, 170);
  assert.equal(result.secondAverage, 171.5);
  assert.equal(result.weeklyRate, 1.5);
  assert.equal(result.projection, 192.5);
  assert.equal(result.decisionCode, 'review-fast');
});

test('calculateTracker reviews fast pace even when projected finish is below goal', () => {
  const result = calculateTracker(trackerInput({
    rows: completeRows(170, 171.6),
    weeksRemaining: 10,
  }));

  assert.equal(result.projection, 187.6);
  assert.equal(result.decisionCode, 'review-fast');
});

test('calculateTracker holds a modest trend independent of an ambitious goal', () => {
  const result = calculateTracker(trackerInput({
    rows: completeRows(170, 170.5),
  }));

  assert.equal(result.decisionCode, 'hold-range');
});

test('calculateTracker keeps goal projection informational', () => {
  const result = calculateTracker(trackerInput({
    rows: completeRows(170, 171.5),
    goalMin: 180,
    goalMax: 190,
  }));

  assert.equal(result.decisionCode, 'review-fast');
});

test('calorie adherence has both a lower and upper bound', () => {
  const rows=completeRows(170,170.5).map(row=>({...row,calories:5000}));
  const result=calculateTracker(trackerInput({rows}));
  assert.equal(result.calorieAdherentDays,0);
  assert.equal(result.decisionCode,'collect-more');
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
