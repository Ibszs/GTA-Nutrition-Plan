import test from 'node:test';
import assert from 'node:assert/strict';
import { dueReminders } from '../app/reminders.js';
import { POOR_LEFTOVER, swapOptions } from '../app/logic/week.js';

const habit = (overrides = {}) => ({ id: 'h1', name: 'Calf stretch', kind: 'check', target: 1, days: [0, 1, 2, 3, 4, 5, 6], reminder: '21:30', paused: false, ...overrides });
const DAY = '2026-11-17'; // a Tuesday
const at = (hours, minutes = 0) => hours * 60 + minutes;

test('a reminder is due from its time until an hour later, and not before', () => {
  const list = [habit()];
  assert.deepEqual(dueReminders(list, {}, DAY, at(21, 29)), []);
  assert.equal(dueReminders(list, {}, DAY, at(21, 30)).length, 1);
  assert.equal(dueReminders(list, {}, DAY, at(22, 30)).length, 1);
  assert.deepEqual(dueReminders(list, {}, DAY, at(22, 31)), []);
});

test('no reminder for a habit that is done, skipped, paused, not due today or has no time', () => {
  assert.deepEqual(dueReminders([habit()], { [DAY]: { h1: 1 } }, DAY, at(21, 45)), []);
  assert.deepEqual(dueReminders([habit({ paused: true })], {}, DAY, at(21, 45)), []);
  assert.deepEqual(dueReminders([habit({ reminder: '' })], {}, DAY, at(21, 45)), []);
  assert.deepEqual(dueReminders([habit({ reminder: 'soon' })], {}, DAY, at(21, 45)), []);
  assert.deepEqual(dueReminders([habit({ days: [5, 6] })], {}, DAY, at(21, 45)), []); // weekend only, DAY is a Tuesday
});

test('a count habit is reminded until it reaches its target', () => {
  const count = habit({ kind: 'count', target: 3 });
  assert.equal(dueReminders([count], { [DAY]: { h1: 2 } }, DAY, at(21, 45)).length, 1);
  assert.deepEqual(dueReminders([count], { [DAY]: { h1: 3 } }, DAY, at(21, 45)), []);
});

test('each reminder is offered once: keys already shown are left out', () => {
  assert.deepEqual(dueReminders([habit()], {}, DAY, at(21, 45), new Set([`${DAY}:h1`])), []);
});

test('a poorly rated leftover drops to the bottom of the shift-lunch swaps only', () => {
  const lunch = swapOptions('lunch', null, {}, undefined, {});
  const top = lunch[0].recipe.id;
  const rated = swapOptions('lunch', null, {}, undefined, { [top]: POOR_LEFTOVER });
  assert.equal(rated.at(-1).recipe.id, top);
  assert.equal(rated.at(-1).reheatsPoorly, true);
  assert.equal(swapOptions('lunch', null, {}, undefined, { [top]: POOR_LEFTOVER + 1 })[0].recipe.id, top);
  const dinner = swapOptions('dinner', null, {}, undefined, {});
  const dinnerRated = swapOptions('dinner', null, {}, undefined, { [dinner[0].recipe.id]: 1 });
  assert.equal(dinnerRated[0].recipe.id, dinner[0].recipe.id); // dinners are cooked fresh, so the order holds
  assert.equal(dinnerRated[0].reheatsPoorly, true);
});
