import test from 'node:test';
import assert from 'node:assert/strict';
import * as journal from '../assets/training-state.js';
import { EXERCISES, SESSIONS, getPrescription, getWeek } from '../assets/training-data.js';
import { createTrainingState, validateTrainingState, createDraft, finishDraft, copyLastSets, findLastEntry, progressionSuggestion } from '../assets/training-state.js';

const state = () => createTrainingState('2026-09-07');
const draft = () => createDraft(state(), 'upper-a', '2026-09-07');
const performed = (load = 50, reps = 10, rir = 3) => ({ load, reps, rir, completed: true, clean: true });

test('expanded non-chest library movements can be added, logged and restored', () => {
  const additions = ['seated-row','one-arm-row','straight-arm','shoulder-press','face-pull','hammer','preacher','pushdown','lying-triceps','goblet','reverse-lunge','hip-thrust','lying-legcurl','db-calves','deadbug','hanging-raise'];
  for (const id of additions) {
    assert.ok(EXERCISES[id], id);
    let value = state(); value.draft = draft();
    value = journal.editDraft(value, {type:'add', exerciseId:id});
    const entry = value.draft.exercises.at(-1);
    entry.sets[0] = performed(0, 10, 3);
    const saved = finishDraft(value, `library-${id}`);
    assert.equal(validateTrainingState(JSON.parse(JSON.stringify(saved))).sessions[0].exercises.at(-1).exerciseId, id);
  }
});

test('reordering a workout moves complete entries without losing sets or setup', () => {
  const value = state(); value.draft = draft();
  value.draft.exercises[0].sets[0] = performed();
  value.draft.exercises[0].setup = 'Bench 2';
  const moved = journal.editDraft(value, { type: 'move', index: 0, to: 3 });
  assert.equal(moved.draft.exercises[0].exerciseId, 'row');
  assert.deepEqual(moved.draft.exercises[3], value.draft.exercises[0]);
  assert.equal(value.draft.exercises[0].exerciseId, 'incline');
  assert.deepEqual(validateTrainingState(moved), moved);
  for (const to of [-1, 7, 1.5]) assert.throws(() => journal.editDraft(value, { type: 'move', index: 0, to }));
});

test('repeating an adapted lineup keeps order and prescription but clears every recorded set', () => {
  assert.equal(typeof journal.repeatSession, 'function');
  let value = state(); value.draft = draft();
  value = journal.editDraft(value, { type: 'swap', index: 0, exerciseId: 'fly' });
  value = journal.editDraft(value, { type: 'prescription', index: 0, count: 2, repMin: 10, repMax: 18 });
  value.draft.exercises[0].variantId = 'pecdeck'; value.draft.exercises[0].setup = 'Seat 4';
  value.draft.exercises[0].sets[0] = performed(40, 15, 2);
  value = finishDraft(value, 'lineup-1');
  const repeated = journal.repeatSession(value, 'lineup-1', '2026-09-14');
  const entry = repeated.draft.exercises[0];
  assert.equal(repeated.draft.week, 2);
  assert.equal(entry.exerciseId, 'fly'); assert.equal(entry.variantId, 'pecdeck');
  assert.equal(entry.setup, 'Seat 4'); assert.equal(entry.repMax, 18);
  assert.equal(entry.sets.length, 2);
  assert.ok(entry.sets.every(s => s.load === '' && s.reps === '' && s.rir === '' && !s.completed && !s.clean));
  assert.deepEqual(repeated.sessions, value.sessions);
  assert.equal(value.draft, null);
});

test('custom workout additions and prescriptions survive finishing and backup validation', () => {
  assert.equal(typeof journal.editDraft, 'function');
  let value = state(); value.draft = draft();
  value = journal.editDraft(value, { type: 'add', exerciseId: 'fly' });
  const index = value.draft.exercises.length - 1;
  value = journal.editDraft(value, { type: 'prescription', index, count: 2, repMin: 10, repMax: 18 });
  value.draft.exercises[index].sets[0] = performed(30, 15);
  const finished = finishDraft(value, 'custom-1');
  assert.equal(finished.sessions[0].customized, true);
  assert.equal(finished.sessions[0].exercises.at(-1).exerciseId, 'fly');
  assert.equal(finished.sessions[0].exercises.at(-1).repMax, 18);
  assert.deepEqual(validateTrainingState(JSON.parse(JSON.stringify(finished))), finished);
  assert.equal(findLastEntry(finished.sessions, 'incline', 'db', 'lb', '', '2026-09-08'), null);
  assert.equal(findLastEntry(finished.sessions, 'fly', 'cable', 'lb', '', '2026-09-08').sets[0].load, 30);
});

test('changing a workout preserves recorded sets and rejects silent removal or relabeling', () => {
  assert.equal(typeof journal.editDraft, 'function');
  let value = state(); value.draft = draft();
  value.draft.exercises[0].sets[0] = performed();
  const before = structuredClone(value);
  for (const action of [{ type: 'swap', index: 0, exerciseId: 'flat' }, { type: 'remove', index: 0 }]) {
    assert.throws(() => journal.editDraft(value, action), /recorded/i);
  }
  value = journal.editDraft(value, { type: 'prescription', index: 0, count: 1, repMin: 6, repMax: 12 });
  assert.deepEqual(value.draft.exercises[0].sets, [performed()]);
  assert.deepEqual(before.draft.exercises[0].sets[0], value.draft.exercises[0].sets[0]);
  value = journal.editDraft(value, { type: 'swap', index: 1, exerciseId: 'flat' });
  assert.equal(value.draft.exercises[1].exerciseId, 'flat');
  value = journal.editDraft(value, { type: 'remove', index: 1 });
  assert.equal(value.draft.exercises.length, 6);
  value.draft.exercises[0].sets.push({ ...performed(), completed: false });
  value.draft.exercises[0].prescribedSets = 2;
  assert.throws(() => journal.editDraft(value, { type: 'prescription', index: 0, count: 1, repMin: 6, repMax: 10 }), /recorded/i);
});

test('custom prescriptions reject invalid bounds, repeated movements and malformed backups', () => {
  assert.equal(typeof journal.editDraft, 'function');
  const value = state(); value.draft = draft();
  for (const action of [
    { type: 'add', exerciseId: 'incline' },
    { type: 'add', exerciseId: 'unknown' },
    { type: 'prescription', index: 0, count: 0, repMin: 6, repMax: 10 },
    { type: 'prescription', index: 0, count: 21, repMin: 6, repMax: 10 },
    { type: 'prescription', index: 0, count: 3, repMin: 15, repMax: 6 },
  ]) assert.throws(() => journal.editDraft(value, action));
  const custom = journal.editDraft(value, { type: 'add', exerciseId: 'pushup' });
  for (const mutate of [s => s.draft.exercises.push(s.draft.exercises[0]), s => s.draft.exercises[0].repMax = 101, s => s.draft.customized = 'yes']) {
    const bad = structuredClone(custom); mutate(bad); assert.throws(() => validateTrainingState(bad));
  }
});

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
  assert.match(progressionSuggestion({ exerciseId: 'dips', variantId: 'assisted' }).text, /less assistance/);
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

// Program changes must not rewrite the original journal contract.
test('hybrid program defaults, calendar dates and explicit shifts preserve records', async () => {
  const p = await import('../assets/training-program.js');
  let value = createTrainingState('2026-09-09');
  assert.deepEqual(value.program, { id: 'hybrid-5-v1', anchorDate: '2026-09-07' });
  assert.equal(p.getProgramDay(value, '2026-09-08').kind, 'before-start');
  assert.equal(p.getProgramDay(value, '2026-09-09').kind, 'rest');
  value.draft = createDraft(value, 'hybrid5-chest-back-v1', '2026-09-10');
  value.draft.exercises[0].sets[0] = performed();
  value = finishDraft(value, 'partial-hybrid');
  assert.equal(p.getProgramDay(value, '2026-09-10').partial, true);
  assert.equal(p.getProgramDay(value, '2026-09-10').sessionId, 'hybrid5-chest-back-v1');
  value.draft = createDraft(value, 'hybrid5-legs-v1', '2026-09-11');
  const shifted = journal.setProgramDay(value, '2026-09-12', 1);
  assert.deepEqual(shifted.sessions, value.sessions);
  assert.deepEqual(shifted.draft, value.draft);
  assert.equal(shifted.startDate, value.startDate);
  assert.equal(shifted.program.anchorDate, '2026-09-12');
  assert.equal(p.getProgramDay(shifted, '2026-09-12').cycleDay, 1);
  assert.deepEqual(validateTrainingState(JSON.parse(JSON.stringify(shifted))), shifted);
});

test('hybrid prescriptions are distinct, stable beyond sixteen weeks and permit variants', async () => {
  const p = await import('../assets/training-program.js');
  assert.equal(p.NEW_SESSIONS.length, 5);
  assert.equal(p.NEW_SESSIONS.reduce((n,s) => n+s.exercises.reduce((m,e) => m+e[1],0),0),69);
  for (const session of p.NEW_SESSIONS) {
    for (const lighter of [false,true]) {
      const value = state(); value.draft = createDraft(value,session.id,'2027-09-07',lighter);
      assert.equal(value.draft.targetRir,lighter?4:2);
      session.exercises.forEach(([id,count,min,max,variant],i) => {
        const e=value.draft.exercises[i];
        assert.deepEqual([e.exerciseId,e.prescribedSets,e.repMin,e.repMax,e.variantId],[id,lighter?Math.ceil(count/2):count,min,max,variant]);
        e.variantId=EXERCISES[id].variants.at(-1).id;
      });
      assert.deepEqual(validateTrainingState(value),value);
      value.draft.exercises[0].sets[0]=performed();
      const saved=finishDraft(value,session.id);
      const e=saved.sessions[0].exercises[0];
      assert.equal(findLastEntry(saved.sessions,e.exerciseId,e.variantId,'lb','','2027-09-08').targetRir,lighter?4:2);
    }
  }
});

test('legacy states roundtrip without a program and keep their original prescriptions', async () => {
  const p=await import('../assets/training-program.js');
  let value={version:1,startDate:'2026-09-07',unit:'lb',sessions:[],draft:null};
  value.draft=createDraft(value,'upper-a','2026-09-07');
  assert.equal(value.draft.exercises[0].prescribedSets,4);
  assert.equal(value.draft.exercises[0].repMin,6);
  assert.equal(value.draft.targetRir,undefined);
  value.draft.exercises[0].sets[0]=performed();
  value=finishDraft(value,'legacy');
  value.draft=createDraft(value,'lower-a','2026-09-08');
  assert.deepEqual(validateTrainingState(JSON.parse(JSON.stringify(value))),value);
  assert.equal(Object.hasOwn(validateTrainingState(value),'program'),false);
  assert.equal(p.getProgramDay(value,'2026-09-10').sessionId,'upper-b');
  const switched=journal.setProgramDay(value,'2026-09-10',4);
  assert.deepEqual(switched.sessions,value.sessions); assert.deepEqual(switched.draft,value.draft);
  for(const change of [e=>e.repMin=5,e=>e.prescribedSets=4]) {
    const bad=structuredClone(value);change(bad.draft.exercises[0]);assert.throws(()=>validateTrainingState(bad));
  }
});

test('program rejects invalid settings and calendar ignores DST and year boundaries', async () => {
  const p=await import('../assets/training-program.js');
  for(const program of [null,{}, {id:'other',anchorDate:'2026-09-07'},{id:'hybrid-5-v1',anchorDate:'2026-02-30'},{id:'hybrid-5-v1',anchorDate:'2026-09-07',extra:true}]) assert.throws(()=>validateTrainingState({...state(),program}));
  for(const day of [0,8,1.5,'1']) assert.throws(()=>journal.setProgramDay(state(),'2026-09-07',day));
  for(const [start,end] of [['2026-03-02','2026-03-09'],['2026-10-26','2026-11-02'],['2026-12-28','2027-01-04']]) {
    const value=createTrainingState(start);assert.equal(p.getProgramDay(value,end).cycleDay,1);
    assert.equal(p.getProgramDay(value,end).sessionId,'hybrid5-upper-v1');
  }
  const value=state();value.draft=createDraft(value,'hybrid5-upper-v1');
  for(const target of [-1,11,'2',null]) assert.throws(()=>validateTrainingState({...value,draft:{...value.draft,targetRir:target}}));
});

test('weekly schedule never carries missed work forward and completion matches date plus template', async () => {
  const p=await import('../assets/training-program.js');
  const value=state();
  const expected=['hybrid5-upper-v1','hybrid5-lower-v1',null,'hybrid5-chest-back-v1','hybrid5-legs-v1','hybrid5-shoulders-arms-v1',null];
  for(let i=0;i<14;i++) assert.equal(p.getProgramDay(value,p.shiftDate('2026-09-07',i)).sessionId,expected[i%7]);
  value.draft=createDraft(value,'hybrid5-upper-v1','2026-09-07');
  value.draft.exercises.forEach(e=>{e.sets=e.sets.map(()=>performed());});
  const saved=finishDraft(value,'full-hybrid');
  assert.equal(p.getProgramDay(saved,'2026-09-07').completed,true);
  assert.equal(p.getProgramDay(saved,'2026-09-14').completed,false);
  const shifted=journal.setProgramDay(saved,'2026-09-07',2);
  assert.equal(p.getProgramDay(shifted,'2026-09-07').completed,false);
  assert.deepEqual(shifted.sessions,saved.sessions);
});

test('legacy immutable tuple and rep contracts stay readable and reject silent rewrites', () => {
  assert.deepEqual(SESSIONS.map(s=>s.exercises),[
    [['incline',4],['row',3],['pulldown',3],['lateral',4],['rear',2],['triceps',2],['curl',2]],
    [['squat',3],['rdl',3],['extension',2],['legcurl',2],['calves',3],['abs',3]],
    [['pulldown',3],['incline',4],['row',3],['lateral',4],['rear',2],['triceps',2],['curl',2]],
    [['legpress',3],['split',2],['legcurl',3],['calves',3],['abs',3]],
  ]);
  const reps={incline:[6,10],row:[8,12],pulldown:[8,12],lateral:[12,20],rear:[12,20],triceps:[10,15],curl:[10,15],squat:[6,10],rdl:[6,10],extension:[10,15],legcurl:[10,15],calves:[10,15],abs:[10,15],legpress:[8,12],split:[8,12]};
  for(const [id,bounds] of Object.entries(reps)) assert.deepEqual([EXERCISES[id].repMin,EXERCISES[id].repMax],bounds);
  const value=state();value.draft=draft();
  [value.draft.exercises[0],value.draft.exercises[1]]=[value.draft.exercises[1],value.draft.exercises[0]];
  assert.throws(()=>validateTrainingState(value),/order/);
});
