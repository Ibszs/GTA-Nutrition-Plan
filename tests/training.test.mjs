import test from 'node:test';
import assert from 'node:assert/strict';
import { SESSIONS, getPrescription, getWeek } from '../assets/training-data.js';
import { createTrainingState, validateTrainingState, createDraft, finishDraft, copyLastSets, findLastEntry, progressionSuggestion } from '../assets/training-state.js';

const state = () => createTrainingState('2026-09-07');
const draft = () => createDraft(state(), 'upper-a', '2026-09-07');
const performed = (load = 50, reps = 10, rir = 3) => ({ load, reps, rir, completed: true, clean: true });

test('new journal uses real local dates and isolated empty data', () => {
  const first = state(); first.sessions.push({});
  assert.equal(state().sessions.length, 0);
  assert.equal(state().startDate, '2026-09-07');
  assert.throws(() => createTrainingState('2026-02-30'), /date/i);
});

test('sixteen-week block uses calibration, review checkpoints and optional lighter sessions', () => {
  assert.equal(getWeek('2026-09-07', '2026-09-13'), 1);
  assert.equal(getWeek('2026-09-07', '2026-09-14'), 2);
  assert.equal(getPrescription(1).rir, 3);
  assert.equal(getPrescription(2).rir, 3);
  assert.equal(getPrescription(5).rir, 2);
  assert.equal(getPrescription(8).checkpoint, true);
  assert.equal(getPrescription(8).setMultiplier, 1);
  assert.equal(getPrescription(9, true).setMultiplier, 0.5);
  assert.equal(getPrescription(9, true).rir, 4);
  assert.equal(SESSIONS.length, 4);
});

test('draft blanks survive validation without inventing performed sets', () => {
  const value = state(); value.draft = draft();
  assert.deepEqual(validateTrainingState(value), value);
  assert.equal(value.draft.exercises[0].sets[0].completed, false);
});

test('backup validation rejects impossible dates, units, ids and invalid numbers', () => {
  for (const mutate of [
    s => { s.startDate = '2026-02-30'; },
    s => { s.unit = 'stone'; },
    s => { s.draft.date = '2026-13-01'; },
    s => { s.draft.sessionId = 'unknown'; },
    s => { s.draft.exercises[0].exerciseId = 'unknown'; },
    s => { s.draft.exercises[0].variantId = 'unknown'; },
    s => { s.draft.exercises[0].sets[0] = performed(-1); },
    s => { s.draft.exercises[0].sets[0] = performed(20, 0); },
    s => { s.draft.exercises[0].sets[0] = performed(20, 10, NaN); },
    s => { s.draft.exercises[0].sets[0] = performed(20, 10, '2'); },
  ]) {
    const value = state(); value.draft = draft(); mutate(value);
    assert.throws(() => validateTrainingState(value));
  }
});

test('finishing rejects zero sets and preserves only explicitly completed sets in a partial session', () => {
  const value = state(); value.draft = draft();
  assert.throws(() => finishDraft(value, 'test-1'), /complete.*set/i);
  value.draft.exercises[0].sets[0] = performed();
  value.draft.exercises[0].sets[1] = { ...performed(), completed: false };
  const finished = finishDraft(value, 'test-1');
  assert.equal(finished.sessions[0].partial, true);
  assert.equal(finished.sessions[0].exercises[0].sets.length, 1);
  assert.equal(finished.sessions[0].exercises[1].sets.length, 0);
  assert.equal(finished.draft, null);
  assert.deepEqual(validateTrainingState(finished), finished);
});

test('completed sessions cannot contain unfinished sets, duplicate ids or mismatched week', () => {
  const value = state(); value.draft = draft(); value.draft.exercises[0].sets[0] = performed();
  const finished = finishDraft(value, 'test-1');
  const bad = structuredClone(finished); bad.sessions[0].exercises[0].sets[0].completed = false;
  assert.throws(() => validateTrainingState(bad));
  finished.sessions.push(structuredClone(finished.sessions[0]));
  assert.throws(() => validateTrainingState(finished));
  const badWeek = state(); badWeek.draft = draft(); badWeek.draft.week = 8;
  assert.throws(() => validateTrainingState(badWeek));
});

test('copying previous values clears completion and clean flags', () => {
  const entry = draft().exercises[0];
  const copied = copyLastSets(entry, { ...entry, sets: [performed()] });
  assert.equal(copied.sets[0].load, 50);
  assert.equal(copied.sets[0].completed, false);
  assert.equal(copied.sets[0].clean, false);
  assert.equal(copied.sets[1].load, '');
});

test('load increases require every prescribed set, top reps, clean form and sufficient RIR', () => {
  const entry = draft().exercises[0];
  entry.sets = entry.sets.map(() => performed(50, entry.repMax, 3));
  assert.equal(progressionSuggestion(entry, 3).action, 'increase');
  for (const change of [
    e => e.sets.pop(),
    e => { e.sets[0].reps -= 1; },
    e => { e.sets[0].rir = 0; },
    e => { e.sets[0].clean = false; },
    e => { e.sets[0].completed = false; },
  ]) {
    const altered = structuredClone(entry); change(altered);
    assert.notEqual(progressionSuggestion(altered, 3).action, 'increase');
  }
});

test('previous performance matches exercise, variant, unit, setup and earlier dates only', () => {
  const value = state(); value.draft = draft(); value.draft.exercises[0].sets[0] = performed();
  const finished = finishDraft(value, 'test-1'); const e = finished.sessions[0].exercises[0];
  assert.ok(findLastEntry(finished.sessions, e.exerciseId, e.variantId, 'lb', e.setup, '2026-09-08'));
  assert.equal(findLastEntry(finished.sessions, e.exerciseId, e.variantId, 'kg', e.setup, '2026-09-08'), null);
  assert.equal(findLastEntry(finished.sessions, e.exerciseId, e.variantId, 'lb', 'Other machine', '2026-09-08'), null);
  assert.equal(findLastEntry(finished.sessions, e.exerciseId, 'other', 'lb', e.setup, '2026-09-08'), null);
  assert.equal(findLastEntry(finished.sessions, e.exerciseId, e.variantId, 'lb', e.setup, '2026-09-06'), null);
});

test('invalid performed numbers and lighter sessions never recommend an increase', () => {
  const entry = draft().exercises[0];
  entry.sets = entry.sets.map(() => performed(50, 10, 3));
  assert.notEqual(progressionSuggestion({ ...entry, lightWeek: true }, 3).action, 'increase');
  for (const change of [
    e => { e.sets[0].load = NaN; },
    e => { e.sets[0].reps = Infinity; },
    e => { e.sets[0].rir = NaN; },
    e => { e.sets[0].load = -5; },
  ]) {
    const altered = structuredClone(entry); change(altered);
    assert.notEqual(progressionSuggestion(altered, 3).action, 'increase');
  }
});

test('week dates ignore DST and backups are independent clones', () => {
  assert.equal(getWeek('2026-03-02', '2026-03-09'), 2);
  assert.equal(getWeek('2026-10-26', '2026-11-02'), 2);
  const value = state(); value.draft = draft();
  const result = validateTrainingState(value); result.draft.exercises[0].setup = 'Changed';
  assert.equal(value.draft.exercises[0].setup, '');
});
