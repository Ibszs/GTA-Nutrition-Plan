import test from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES, EX, LANES } from '../app/data/exercises.js';
import { PLANS, CHECKS, MEASURES, buildSessions, todaySession, applyFeedback, resumeDrill, recap, newPlan, doseSeconds, doseText } from '../app/logic/movement.js';

const EQUIP = { wall: true, chair: true, mat: true, step: true, band: false };
const state = (plan, extra = {}) => ({ plan, levels: {}, streaks: {}, ease: {}, paused: {}, setup: { equipment: { ...EQUIP } }, sessions: [], checks: [], ...extra });
const plan = (kind = 'week', primary = 'pelvis', secondary = null, done = 0) => ({ ...newPlan(kind, primary, secondary, '2026-11-01', 'p1'), done });

test('PLANS and buildSessions: a week is 7 sessions, a month is 20', () => {
  assert.equal(PLANS.week.sessions, 7);
  assert.equal(PLANS.month.sessions, 20);
  for (const lane of Object.keys(LANES)) {
    for (const secondary of [null, ...Object.keys(LANES).filter(other => other !== lane)]) {
      const week = buildSessions('week', lane, secondary);
      const month = buildSessions('month', lane, secondary);
      assert.equal(week.length, PLANS.week.sessions);
      assert.equal(month.length, PLANS.month.sessions);
      for (const session of [...week, ...month]) {
        assert.ok(session.items.length >= 1, `${lane}/${secondary}: empty session`);
        for (const id of session.items) assert.ok(EX[id], id);
        assert.equal(typeof session.title, 'string');
      }
      assert.equal(week[0].kind, 'first'); assert.equal(week[5].kind, 'light'); assert.equal(week[6].kind, 'retest');
      assert.equal(month.filter(session => session.kind === 'checkin').length, 3);
      assert.equal(month.at(-1).kind, 'retest');
    }
  }
});

test('no session template lists the same drill twice', () => {
  const duplicates = [];
  for (const kind of ['week', 'month']) for (const lane of Object.keys(LANES)) for (const secondary of [null, ...Object.keys(LANES).filter(other => other !== lane)]) {
    buildSessions(kind, lane, secondary).forEach((session, index) => {
      if (new Set(session.items).size !== session.items.length) duplicates.push(`${kind} ${lane}/${secondary} #${index + 1}: ${session.items.join(', ')}`);
    });
  }
  assert.deepEqual(duplicates, []);
});

test('newPlan starts at zero and drops a secondary lane equal to the primary', () => {
  assert.deepEqual(newPlan('month', 'knee', 'knee', '2026-11-17', 'x'), { id: 'x', kind: 'month', primary: 'knee', secondary: null, startedOn: '2026-11-17', done: 0 });
  assert.equal(newPlan('week', 'knee', 'ankle', '2026-11-17', 'x').secondary, 'ankle');
});

test('todaySession follows plan.done, not the calendar: a missed day resumes the same session', () => {
  const early = state({ ...plan('week', 'pelvis', null, 2), startedOn: '2026-11-01' });
  const late = state({ ...plan('week', 'pelvis', null, 2), startedOn: '2026-09-01' });
  const a = todaySession(early); const b = todaySession(late);
  assert.equal(a.n, 3); assert.equal(a.of, 7);
  assert.deepEqual(a, b);
  assert.equal(todaySession(state(plan('week', 'pelvis', null, 3))).n, 4);
  const done = todaySession(state(plan('week', 'pelvis', null, 7)));
  assert.equal(done.finished, true); assert.equal(done.n, 7);
  assert.equal(todaySession(state(null)), null);
});

test('todaySession items carry a level, a dose and the seconds that dose takes', () => {
  for (let index = 0; index < 7; index += 1) {
    const session = todaySession(state(plan('week', 'pelvis', null, index)));
    assert.ok(session.items.length >= 1);
    for (const item of session.items) {
      assert.equal(item.level, 0);
      assert.equal(item.levelName, EX[item.id].levels[0].name);
      assert.equal(item.seconds, doseSeconds(item.dose));
      assert.ok(item.dose.sets >= 1);
    }
    assert.equal(session.minutes, Math.max(1, Math.round(session.items.reduce((sum, item) => sum + item.seconds, 0) / 60)));
    if (session.kind === 'light') assert.ok(session.items.every(item => item.dose.sets === 1) && /Lighter day/.test(session.why[0]));
  }
});

test('the short version exists for every session and runs about two minutes', () => {
  for (const lane of Object.keys(LANES)) for (let index = 0; index < 20; index += 1) {
    const session = todaySession(state(plan('month', lane, null, index)));
    assert.ok(session.short.items.length >= 1 && session.short.items.length <= 2);
    for (const item of session.short.items) assert.deepEqual(item.dose, { ...EX[item.id].short });
    assert.ok(session.short.minutes >= 1 && session.short.minutes <= 3, `${lane} #${index + 1}: short is ${session.short.minutes} min`);
    assert.ok(session.short.minutes <= session.minutes);
  }
});

test('leg day swaps loaded leg drills for unloaded ones from the same lane', () => {
  const move = state(plan('week', 'pelvis', null, 1));
  const normal = todaySession(move);
  assert.ok(normal.items.some(item => EX[item.id].legLoad), 'session 2 of the pelvis week includes the glute bridge');
  const leg = todaySession(move, { legDay: true });
  assert.ok(leg.items.every(item => !EX[item.id].legLoad));
  assert.ok(leg.items.every(item => EX[item.id].lane === 'pelvis' || LANES.pelvis.order.includes(item.id)));
  assert.ok(leg.why.some(line => /Leg day/.test(line)));
});

test('upper-body gym day trims loaded shoulder-blade drills to one set', () => {
  const move = state(plan('week', 'scap', null, 1));
  const normal = todaySession(move);
  const upper = todaySession(move, { upperDay: true });
  for (const item of upper.items) {
    const exercise = EX[item.id];
    if (exercise.lane === 'scap' && exercise.load !== 'none') assert.equal(item.dose.sets, 1, item.id);
  }
  assert.ok(normal.items.some(item => item.dose.sets > 1));
  assert.ok(upper.why.some(line => /upper body today/.test(line)));
});

test('equipment switched off swaps a drill for one that fits', () => {
  const move = state(plan('week', 'pelvis', null, 1), { setup: { equipment: { ...EQUIP, mat: false } } });
  const session = todaySession(move);
  for (const item of session.items) assert.ok(EX[item.id].equip.every(key => key !== 'mat'), `${item.id} needs the mat`);
  assert.ok(session.why.length > 0);
});

test('two "easier" answers in a row raise a level', () => {
  const move = state(plan('week', 'pelvis', null, 1));
  const session = todaySession(move);
  const first = applyFeedback(move, session, 'easier');
  for (const item of session.items) { assert.equal(first.levels[item.id] ?? 0, 0); assert.equal(first.streaks[item.id], 1); }
  assert.ok(first.notes.some(note => /one more easier session/.test(note)));
  const second = applyFeedback({ ...move, ...first }, session, 'easier');
  for (const item of session.items) {
    assert.equal(second.levels[item.id], 1, `${item.id} should move up`);
    assert.equal(second.streaks[item.id], 0);
  }
  assert.ok(second.notes.some(note => /moves up to/.test(note)));
  const next = todaySession({ ...move, ...second });
  for (const item of next.items) if (session.items.some(old => old.id === item.id)) assert.equal(item.level, 1);
});

test('a "same" answer resets the easier streak', () => {
  const move = state(plan('week', 'pelvis', null, 1));
  const session = todaySession(move);
  const once = applyFeedback(move, session, 'easier');
  const same = applyFeedback({ ...move, ...once }, session, 'same');
  for (const item of session.items) assert.equal(same.streaks[item.id], 0);
  const again = applyFeedback({ ...move, ...same }, session, 'easier');
  for (const item of session.items) assert.equal(again.levels[item.id] ?? 0, 0);
});

test('a band level is never chosen when no band is available', () => {
  const found = EXERCISES.flatMap(exercise => exercise.levels.map((level, index) => ({ exercise, index, level }))).find(item => item.index > 0 && /band/i.test(item.level.name));
  if (!found) return;
  const { exercise, index } = found;
  const move = { ...state(plan('week', exercise.lane, null, 1)), levels: { [exercise.id]: index - 1 }, streaks: { [exercise.id]: 1 } };
  const result = applyFeedback(move, { items: [{ id: exercise.id }] }, 'easier');
  assert.equal(result.levels[exercise.id], index - 1);
  const banded = applyFeedback({ ...move, setup: { equipment: { ...EQUIP, band: true } } }, { items: [{ id: exercise.id }] }, 'easier');
  assert.equal(banded.levels[exercise.id], index);
});

test('"harder" steps back a level, or drops a set at the bottom level', () => {
  const move = { ...state(plan('week', 'pelvis', null, 1)), levels: { 'dead-bug': 1 } };
  const session = todaySession(move);
  const result = applyFeedback(move, session, 'harder');
  assert.equal(result.levels['dead-bug'], 0);
  assert.ok(result.notes.some(note => /Dead bug steps back/.test(note)));
  assert.equal(result.ease['dead-bug'], undefined);
  assert.equal(result.ease['glute-bridge'], 'down');
  const next = todaySession({ ...move, ...result });
  const bridge = next.items.find(item => item.id === 'glute-bridge');
  assert.equal(bridge.dose.sets, (EX['glute-bridge'].levels[0].dose ?? EX['glute-bridge'].dose).sets - 1);
  assert.ok(next.why.some(line => /one set fewer/.test(line)));
});

test('"off" pauses only the listed drills and pins them to the easiest level', () => {
  const move = { ...state(plan('week', 'pelvis', null, 1)), levels: { 'dead-bug': 1, 'glute-bridge': 1 } };
  const session = todaySession(move);
  const result = applyFeedback(move, session, 'off', ['dead-bug'], '2026-11-17');
  assert.deepEqual(result.paused['dead-bug'], { on: '2026-11-17', level: 1 });
  assert.equal(result.levels['dead-bug'], 0);
  assert.equal(result.levels['glute-bridge'], 1, 'drills not listed keep their level');
  assert.equal(result.paused['glute-bridge'], undefined);
  const next = todaySession({ ...move, ...result });
  const bug = next.items.find(item => item.id === 'dead-bug');
  assert.equal(bug.level, 0); assert.equal(bug.paused, true); assert.equal(bug.dose.sets, 1);
  assert.ok(next.why.some(line => /progression paused since 2026-11-17/.test(line)));
  const easier = applyFeedback({ ...move, ...result }, next, 'easier');
  assert.equal(easier.levels['dead-bug'], 0, 'a paused drill does not progress');
  const all = applyFeedback(move, session, 'off', [], '2026-11-17');
  for (const item of session.items) assert.ok(all.paused[item.id], `${item.id} pauses when no drill is named`);
});

test('resumeDrill clears a pause and restores the saved level', () => {
  const move = { levels: { 'dead-bug': 0 }, paused: { 'dead-bug': { on: '2026-11-17', level: 2 }, 'bird-dog': { on: '2026-11-10', level: 1 } } };
  const result = resumeDrill(move, 'dead-bug');
  assert.equal(result.levels['dead-bug'], 2);
  assert.equal(result.paused['dead-bug'], undefined);
  assert.ok(result.paused['bird-dog']);
  assert.deepEqual(resumeDrill(move, 'not-paused').levels, move.levels);
  assert.equal(move.paused['dead-bug'].level, 2, 'input is not mutated');
});

test('recap counts this plan only, with the first and last check-in compared', () => {
  const move = {
    ...state(plan('week', 'pelvis', null, 2)),
    levels: { 'dead-bug': 1 }, paused: { 'glute-bridge': { on: '2026-11-11', level: 0 } },
    sessions: [
      { planId: 'p1', date: '2026-11-10', seconds: 300, feel: 'same' },
      { planId: 'p1', date: '2026-11-11', seconds: 150, short: true, feel: 'easier' },
      { planId: 'old', date: '2026-10-01', seconds: 900, feel: 'harder' },
    ],
    checks: [
      { planId: 'p1', at: '2026-11-12T10:00:00Z', squat: 4, holdL: 20 },
      { planId: 'p1', at: '2026-11-10T10:00:00Z', squat: 2, holdL: 10 },
      { planId: 'old', at: '2026-10-01T10:00:00Z', squat: 1 },
    ],
  };
  const result = recap(move);
  assert.equal(result.sessions, 2); assert.equal(result.of, 7);
  assert.equal(result.minutes, 8); assert.equal(result.short, 1); assert.equal(result.days, 2);
  assert.deepEqual(result.feels, { same: 1, easier: 1 });
  assert.equal(result.hasBaseline, true); assert.equal(result.hasRetest, true);
  assert.deepEqual(result.changes.map(change => [change.label, change.from, change.to]), [[CHECKS[0].label, 2, 4], [MEASURES[0].label, 10, 20]]);
  assert.deepEqual(result.levelUps, [{ name: 'Dead bug', level: EX['dead-bug'].levels[1].name }]);
  assert.deepEqual(result.paused, ['Glute bridge']);
  const none = recap(state(plan()));
  assert.equal(none.sessions, 0); assert.equal(none.hasBaseline, false); assert.deepEqual(none.changes, []);
  assert.equal(recap(state(null)), null);
});

test('doseSeconds and doseText describe a dose', () => {
  assert.equal(doseSeconds({ sets: 2, reps: 6, each: true, pace: 5 }), 2 * 6 * 5 * 2 + 3 * 12 + 8);
  assert.equal(doseSeconds({ sets: 1, hold: 30 }), 38);
  assert.equal(doseSeconds({ sets: 2, reps: 10 }), 2 * 10 * 4 + 12 + 8);
  assert.equal(doseText({ sets: 2, reps: 6, each: true }), '2 × 6 each side');
  assert.equal(doseText({ sets: 1, hold: 30 }), '1 × 30 s');
  assert.equal(doseText({ sets: 3, hold: 20, each: true }), '3 × 20 s each side');
});
