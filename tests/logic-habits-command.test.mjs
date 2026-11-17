import test from 'node:test';
import assert from 'node:assert/strict';
import { SEEDS, isDue, isDone, isSkipped, countOn, tap, setCount, skip, weekPattern, streak, rate, nextStep, todayList } from '../app/logic/habits.js';
import { parseCommand, matchScore } from '../app/logic/command.js';
import { RECIPES } from '../app/data/recipes.js';

// 2026-11-16 is a Monday.
const walk = { id: 'h1', name: 'Short walk', kind: 'check', target: 1, unit: '', days: [0, 1, 2, 3, 4, 5, 6], createdOn: '2026-11-01', tiny: 'To the end of the street and back.' };
const read = { id: 'h2', name: 'Read', kind: 'count', target: 3, unit: 'min', days: [0, 2, 4], createdOn: '2026-11-01', tiny: 'One page counts.' };
const JUDGEMENT = /\b(fail\w*|broke\w*|lost|los(?:e|ing)|shame\w*|bad|guilt\w*)\b/i;

test('SEEDS are editable suggestions with valid weekdays', () => {
  assert.ok(SEEDS.length >= 3);
  for (const seed of SEEDS) {
    assert.ok(['check', 'count'].includes(seed.kind));
    assert.ok(seed.days.every(day => Number.isInteger(day) && day >= 0 && day <= 6));
    assert.ok(seed.target >= 1);
  }
});

test('isDue uses Monday = 0 weekdays and respects creation, pause and archive', () => {
  assert.equal(isDue(read, '2026-11-16'), true);
  assert.equal(isDue(read, '2026-11-17'), false);
  assert.equal(isDue(read, '2026-11-18'), true);
  assert.equal(isDue(read, '2026-11-22'), false, 'Sunday is 6');
  assert.equal(isDue({ ...read, days: [6] }, '2026-11-22'), true);
  assert.equal(isDue(walk, '2026-10-31'), false, 'not due before it was created');
  assert.equal(isDue({ ...walk, paused: true }, '2026-11-16'), false);
  assert.equal(isDue({ ...walk, archived: true }, '2026-11-16'), false);
  assert.equal(isDue({ ...walk, createdOn: undefined }, '2020-01-01'), true);
});

test('tap toggles a yes/no habit and steps a count habit, wrapping past the target', () => {
  let log = {};
  log = tap(log, walk, '2026-11-16');
  assert.deepEqual(log, { '2026-11-16': { h1: 1 } });
  assert.equal(isDone(log, walk, '2026-11-16'), true);
  log = tap(log, walk, '2026-11-16');
  assert.deepEqual(log, {}, 'untapping removes the empty day');
  let counts = {};
  const seen = [];
  for (let index = 0; index < 4; index += 1) { counts = tap(counts, read, '2026-11-16'); seen.push(countOn(counts, read, '2026-11-16')); }
  assert.deepEqual(seen, [1, 2, 3, 0]);
  assert.equal(isDone(tap(tap(tap({}, read, '2026-11-16'), read, '2026-11-16'), read, '2026-11-16'), read, '2026-11-16'), true);
  assert.equal(isDone(tap({}, read, '2026-11-16'), read, '2026-11-16'), false, 'one of three is not done');
  const before = { '2026-11-16': { h1: 1 } };
  tap(before, walk, '2026-11-16');
  assert.deepEqual(before, { '2026-11-16': { h1: 1 } }, 'tap does not mutate the log it is given');
});

test('setCount rounds and clamps at zero', () => {
  assert.deepEqual(setCount({}, read, '2026-11-16', 2.6), { '2026-11-16': { h2: 3 } });
  assert.deepEqual(setCount({ '2026-11-16': { h2: 2 } }, read, '2026-11-16', -5), {});
  assert.deepEqual(setCount({ '2026-11-16': { h1: 1, h2: 2 } }, read, '2026-11-16', 0), { '2026-11-16': { h1: 1 } });
  assert.equal(countOn(setCount({}, read, '2026-11-16', 12), read, '2026-11-16'), 12);
});

test('skip toggles, and a skipped day neither counts nor breaks a streak', () => {
  let log = skip({}, walk, '2026-11-17');
  assert.equal(isSkipped(log, walk, '2026-11-17'), true);
  assert.equal(countOn(log, walk, '2026-11-17'), 0);
  assert.deepEqual(skip(log, walk, '2026-11-17'), {});
  log = { '2026-11-16': { h1: 1 }, '2026-11-17': { h1: 'skip' }, '2026-11-18': { h1: 1 } };
  assert.equal(streak(walk, log, '2026-11-18'), 2);
  assert.equal(streak(walk, log, '2026-11-19'), 2, 'today only breaks the run once it is over');
  assert.equal(streak(walk, log, '2026-11-20'), 0, 'a missed due day breaks it');
});

test('streak skips days that are not due and needs the full count', () => {
  const log = { '2026-11-16': { h2: 3 }, '2026-11-18': { h2: 3 }, '2026-11-20': { h2: 2 } };
  assert.equal(streak(read, log, '2026-11-19'), 2, 'Tuesday and Thursday are not due');
  assert.equal(streak(read, log, '2026-11-20'), 2, 'today, partly done, does not break it yet');
  assert.equal(streak(read, log, '2026-11-23'), 0, 'Friday with 2 of 3 broke it');
  assert.equal(streak(walk, {}, '2026-11-01'), 0);
});

test('weekPattern gives 7 cells starting Monday', () => {
  const log = { '2026-11-16': { h2: 3 }, '2026-11-18': { h2: 'skip' } };
  const cells = weekPattern(read, log, '2026-11-19');
  assert.equal(cells.length, 7);
  assert.equal(cells[0].date, '2026-11-16');
  assert.equal(cells[6].date, '2026-11-22');
  assert.deepEqual(cells.map(cell => cell.due), [true, false, true, false, true, false, false]);
  assert.equal(cells[0].done, true); assert.equal(cells[0].value, 3);
  assert.equal(cells[2].skipped, true);
  assert.deepEqual(cells.map(cell => cell.future), [false, false, false, false, true, true, true]);
  assert.equal(weekPattern(read, log, '2026-11-22')[0].date, '2026-11-16', 'Sunday belongs to the week that started Monday');
});

test('rate counts due days done, leaving out skips and an unfinished today', () => {
  const log = { '2026-11-16': { h1: 1 }, '2026-11-17': { h1: 'skip' }, '2026-11-18': { h1: 1 } };
  assert.deepEqual(rate(walk, log, '2026-11-18', 7), { due: 6, done: 2, ratio: 2 / 6 });
  assert.deepEqual(rate(walk, log, '2026-11-19', 3), { due: 1, done: 1, ratio: 1 });
  assert.deepEqual(rate({ ...walk, createdOn: '2026-11-19' }, {}, '2026-11-19'), { due: 0, done: 0, ratio: null });
});

test('nextStep after a miss offers a next action, never a verdict', () => {
  const log = { '2026-11-18': { h1: 1 } };
  const one = nextStep(walk, log, '2026-11-20');
  assert.match(one, /^Yesterday did not happen/);
  assert.match(one, /to the end of the street and back/);
  const several = nextStep(walk, log, '2026-11-23');
  assert.match(several, /^4 days since the last one/);
  for (const text of [one, several]) assert.doesNotMatch(text, JUDGEMENT);
  assert.equal(nextStep(walk, log, '2026-11-19'), null, 'nothing missed yet');
  assert.equal(nextStep(walk, { ...log, '2026-11-20': { h1: 1 } }, '2026-11-20'), null, 'already done today');
  assert.equal(nextStep(walk, { ...log, '2026-11-20': { h1: 'skip' } }, '2026-11-20'), null, 'skipped today');
  assert.equal(nextStep(read, {}, '2026-11-17'), null, 'not due today');
  assert.doesNotMatch(nextStep({ ...walk, tiny: '' }, log, '2026-11-20'), /Smallest version/);
});

test('todayList shows only habits due that day with their state', () => {
  const log = { '2026-11-16': { h1: 1, h2: 2 } };
  const monday = todayList([walk, read], log, '2026-11-16');
  assert.deepEqual(monday.map(item => [item.habit.id, item.done, item.value]), [['h1', true, 1], ['h2', false, 2]]);
  assert.deepEqual(todayList([walk, read], log, '2026-11-17').map(item => item.habit.id), ['h1']);
  assert.deepEqual(todayList([{ ...walk, paused: true }], log, '2026-11-16'), []);
});

// ---------- quick-add commands ----------

const catalog = {
  habits: [{ id: 'h2', name: 'Read' }, { id: 'h1', name: 'Short walk' }],
  recipes: RECIPES.map(recipe => ({ id: recipe.id, name: recipe.name })),
  drills: [{ id: 'dead-bug', name: 'Dead bug' }],
  lifts: [{ id: 'flat', name: 'Flat press' }],
};

test('parseCommand reads numbers as body log entries', () => {
  const one = text => { const result = parseCommand(text, catalog); assert.equal(result.length, 1, text); return result[0]; };
  assert.deepEqual(one('181.4'), { type: 'weight', value: 181.4, label: 'Log weight: 181.4' });
  assert.equal(one('w 181').type, 'weight'); assert.equal(one('w 181').value, 181);
  assert.equal(one('weight181').value, 181);
  assert.deepEqual([one('sleep 7.5').type, one('sleep 7.5').value], ['sleep', 7.5]);
  assert.match(one('sleep 7.5').label, /7\.5 h/);
  assert.deepEqual([one('waist 33').type, one('waist 33').value], ['waist', 33]);
  assert.deepEqual([one('kcal 2900').type, one('kcal 2900').value], ['kcal', 2900]);
  assert.equal(one('cal 2899.6').value, 2900);
  assert.deepEqual([one('protein 160').type, one('protein 160').value], ['protein', 160]);
  assert.equal(one('P 160').type, 'protein');
  assert.equal(one('  181  ').value, 181, 'surrounding spaces are ignored');
});

test('a bare number outside 60 to 500 is not a weight', () => {
  for (const text of ['42', '59.9', '501', '1200']) assert.ok(parseCommand(text, catalog).every(item => item.type !== 'weight'), text);
  assert.equal(parseCommand('60', catalog)[0].type, 'weight');
  assert.equal(parseCommand('500', catalog)[0].type, 'weight');
  assert.ok(parseCommand('sleep 30', catalog).every(item => item.type !== 'sleep'), 'more than 24 hours is not sleep');
  assert.deepEqual(parseCommand('   ', catalog), []);
});

test('parseCommand finds habits by prefix, recipes by name and places by word', () => {
  const habit = parseCommand('rea', catalog)[0];
  assert.equal(habit.type, 'habit'); assert.equal(habit.id, 'h2'); assert.equal(habit.label, 'Tick: Read');
  const walkHit = parseCommand('short', catalog)[0];
  assert.equal(walkHit.id, 'h1');
  const recipe = parseCommand('butter chicken', catalog)[0];
  assert.equal(recipe.type, 'recipe'); assert.equal(recipe.route, 'eat/r/butter-chicken');
  const place = parseCommand('groceries', catalog).find(item => item.type === 'place');
  assert.equal(place.route, 'eat/list');
  assert.equal(parseCommand('settings', catalog)[0].route, 'you/settings');
  assert.equal(parseCommand('dead', catalog)[0].route, 'move/x/dead-bug');
  assert.equal(parseCommand('flat', catalog)[0].route, 'train/x/flat');
  assert.ok(parseCommand('grocery', catalog).filter(item => item.route === 'eat/list').length === 1, 'a place is listed once');
  assert.ok(parseCommand('chicken', catalog, 3).length <= 3);
  assert.deepEqual(parseCommand('zzzz', catalog), []);
});

test('matchScore needs every query word to start a word of the name', () => {
  assert.equal(matchScore('', 'Read'), 0);
  assert.equal(matchScore('xyz', 'Butter chicken'), 0);
  assert.equal(matchScore('but zzz', 'Butter chicken'), 0);
  assert.ok(matchScore('but chi', 'Butter chicken') > 0);
  assert.ok(matchScore('chicken', 'Butter chicken') > 0);
  assert.ok(matchScore('butter', 'Butter chicken') > matchScore('chicken', 'Butter chicken'), 'matching the first word scores higher');
  assert.ok(matchScore('read', 'Read') > matchScore('rea', 'Read'), 'an exact name wins');
  assert.ok(matchScore('READ', 'Read') >= 2, 'case does not matter');
});
