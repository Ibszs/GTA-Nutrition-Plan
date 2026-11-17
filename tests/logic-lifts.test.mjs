import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrainingState, createDraft, finishDraft, validateTrainingState } from '../assets/training-state.js';
import { e1rm, bestSet, findRecords, recordsIn, groupsOf, LEG_GROUPS, weeklySets, liftHistory, lastComparable, sessionStats, draftProgress } from '../app/logic/lifts.js';

const UPPER = 'hybrid5-upper-v1';
const LOWER = 'hybrid5-lower-v1';
const done = (load, reps, rir = 2) => ({ load, reps, rir, completed: true, clean: true });

/** Finish one session through the real journal helpers. `sets` maps exerciseId -> array of [load, reps]. */
function log(state, sessionId, date, id, sets) {
  const draft = createDraft(state, sessionId, date);
  for (const entry of draft.exercises) {
    const wanted = sets[entry.exerciseId] ?? [];
    wanted.slice(0, entry.sets.length).forEach(([load, reps], index) => { entry.sets[index] = done(load, reps); });
  }
  return finishDraft({ ...state, draft }, id);
}

function journal() {
  let state = createTrainingState('2026-09-07');
  state = log(state, UPPER, '2026-09-07', 's1', { flat: [[100, 8], [100, 7], [95, 8]], row: [[50, 10]], lateral: [[15, 15]] });
  state = log(state, LOWER, '2026-09-08', 's2', { squat: [[140, 6]], calves: [[90, 12], [90, 12]] });
  state = log(state, UPPER, '2026-09-14', 's3', { flat: [[105, 8], [100, 8]], row: [[50, 9]], lateral: [[15, 15]] });
  state = log(state, UPPER, '2026-09-21', 's4', { flat: [[100, 10]], row: [[55, 10]] });
  return state;
}

test('the helper journal is valid training state', () => {
  const state = journal();
  assert.deepEqual(validateTrainingState(JSON.parse(JSON.stringify(state))), state);
  assert.equal(state.sessions.length, 4);
  assert.equal(state.draft, null);
});

test('e1rm is Epley, and unloaded sets have no estimated max', () => {
  assert.ok(Math.abs(e1rm(100, 10) - 133.3333333) < 1e-6);
  assert.equal(e1rm(100, 0), 100);
  assert.equal(e1rm(0, 12), 0);
});

test('bestSet picks the highest estimated max among completed sets, or most reps when unloaded', () => {
  const entry = { sets: [done(100, 8), done(110, 3), { ...done(200, 10), completed: false }] };
  const best = bestSet(entry);
  assert.equal(best.load, 100); assert.equal(best.reps, 8); assert.equal(best.loaded, true);
  assert.ok(Math.abs(best.value - e1rm(100, 8)) < 1e-9);
  assert.deepEqual(bestSet({ sets: [done(0, 8), done(0, 12)] }), { load: 0, reps: 12, value: 12, loaded: false });
  assert.equal(bestSet({ sets: [] }), null);
});

test('findRecords: the first log is a baseline; a later better set is a record carrying previous', () => {
  const records = findRecords(journal().sessions);
  assert.equal(records.filter(record => record.sessionId === 's1').length, 0, 'first session sets baselines only');
  assert.equal(records.filter(record => record.sessionId === 's2').length, 0);
  const flat = records.find(record => record.exerciseId === 'flat' && record.sessionId === 's3');
  assert.ok(flat, '105 x 8 beats 100 x 8');
  assert.equal(flat.load, 105); assert.equal(flat.reps, 8); assert.equal(flat.unit, 'lb');
  assert.equal(flat.previous.load, 100); assert.equal(flat.previous.reps, 8);
  assert.equal(records.some(record => record.exerciseId === 'row' && record.sessionId === 's3'), false, '50 x 9 is not better than 50 x 10');
  assert.equal(records.some(record => record.exerciseId === 'lateral' && record.sessionId === 's3'), false, 'equal is not a record');
  const row = records.find(record => record.exerciseId === 'row' && record.sessionId === 's4');
  assert.ok(row); assert.equal(row.previous.load, 50);
  const flatAgain = records.find(record => record.exerciseId === 'flat' && record.sessionId === 's4');
  assert.ok(flatAgain, '100 x 10 (e1rm 133.3) beats 105 x 8 (e1rm 133.0)');
  assert.equal(flatAgain.previous.load, 105);
});

test('findRecords orders by date even when sessions are stored out of order', () => {
  const sessions = journal().sessions;
  const shuffled = [sessions[2], sessions[0], sessions[3], sessions[1]];
  assert.deepEqual(findRecords(shuffled), findRecords(sessions));
  const dates = findRecords(sessions).map(record => record.date);
  assert.deepEqual(dates, [...dates].sort());
});

test('recordsIn returns the records set in one session', () => {
  const sessions = journal().sessions;
  assert.deepEqual(recordsIn(sessions, 's1'), []);
  assert.deepEqual(recordsIn(sessions, 's3').map(record => record.exerciseId), ['flat']);
  assert.deepEqual(recordsIn(sessions, 's4').map(record => record.exerciseId).sort(), ['flat', 'row']);
  assert.deepEqual(recordsIn(sessions, 'missing'), []);
});

test('groupsOf maps the original muscle labels to groups', () => {
  assert.deepEqual(groupsOf('flat'), ['Chest']);
  assert.deepEqual(groupsOf('row'), ['Back']);
  assert.ok(groupsOf('lateral').includes('Shoulders'));
  assert.deepEqual(groupsOf('nope'), []);
  assert.deepEqual(LEG_GROUPS, ['Hamstrings', 'Glutes', 'Quads', 'Calves']);
});

test('weeklySets counts completed sets per muscle group per Monday week', () => {
  const weeks = weeklySets(journal().sessions, '2026-09-23', 3);
  assert.deepEqual(weeks.map(week => week.week), ['2026-09-07', '2026-09-14', '2026-09-21']);
  assert.equal(weeks[0].sets.Chest, 3);
  assert.equal(weeks[0].sets.Back, 1);
  assert.equal(weeks[0].sets.Calves, 2);
  assert.equal(weeks[1].sets.Chest, 2);
  assert.equal(weeks[2].sets.Back, 1);
  assert.equal(weeks[2].sets.Calves, undefined);
  const recent = weeklySets(journal().sessions, '2026-12-01', 2);
  assert.ok(recent.every(week => Object.keys(week.sets).length === 0), 'old sessions fall outside the window');
});

test('liftHistory lists the top set per session for one movement, oldest first', () => {
  const history = liftHistory(journal().sessions, 'flat');
  assert.deepEqual(history.map(row => [row.date, row.load, row.reps]), [['2026-09-07', 100, 8], ['2026-09-14', 105, 8], ['2026-09-21', 100, 10]]);
  assert.equal(history[0].variantId, 'barbell');
  assert.deepEqual(liftHistory(journal().sessions, 'flat', 2).map(row => row.date), ['2026-09-14', '2026-09-21']);
  assert.deepEqual(liftHistory(journal().sessions, 'squat').length, 1);
  assert.deepEqual(liftHistory(journal().sessions, 'curl'), []);
});

test('lastComparable finds the most recent finished session of the same template', () => {
  const sessions = journal().sessions;
  assert.equal(lastComparable(sessions, UPPER).id, 's4');
  assert.equal(lastComparable(sessions, UPPER, '2026-09-15').id, 's3');
  assert.equal(lastComparable(sessions, LOWER).id, 's2');
  assert.equal(lastComparable(sessions, 'hybrid5-legs-v1'), null);
});

test('sessionStats sums completed sets and load times reps', () => {
  const s1 = journal().sessions[0];
  const stats = sessionStats(s1);
  assert.equal(stats.sets, 5);
  assert.equal(stats.volume, 100 * 8 + 100 * 7 + 95 * 8 + 50 * 10 + 15 * 15);
  assert.equal(stats.exercises, s1.exercises.length);
});

test('draftProgress counts completed sets in an open draft', () => {
  const state = createTrainingState('2026-09-07');
  const draft = createDraft(state, UPPER, '2026-09-07');
  const total = draft.exercises.reduce((sum, entry) => sum + entry.sets.length, 0);
  assert.deepEqual(draftProgress(draft), { done: 0, total });
  draft.exercises[0].sets[0] = done(100, 8);
  draft.exercises[1].sets[0] = done(50, 10);
  assert.deepEqual(draftProgress(draft), { done: 2, total });
});
