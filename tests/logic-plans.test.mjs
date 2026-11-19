import test from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES } from '../assets/training-data.js';
import { NEW_SESSIONS, PLAN_SESSIONS, PROGRAM_DAYS, getProgramDay, getSessionTemplate, isModernSession, shiftDate } from '../assets/training-program.js';
import { createTrainingState, createDraft, finishDraft, validateTrainingState, setProgramDay } from '../assets/training-state.js';
import { getExerciseGuide } from '../assets/exercise-visuals.js';
import { PLANS, PLAN_BY_ID, CATALOGUE, DEFAULT_PLAN, REST_CHOICES, STEP_CHOICES, activePlan, cleanWeek, planWeek, weekIsCustom, trainingDays, planSessions, cleanLineup, isEdited, sessionLineup, sessionName, sessionSets, sessionMinutes, weeklyVolume, isLegSession, planDay, buildDraft, restSeconds, loadStep } from '../app/logic/plans.js';
import { DEFAULTS } from '../app/store.js';

const START = '2026-09-07'; // a Monday
const fresh = () => createTrainingState(START);
const prefs = (extra = {}) => ({ ...DEFAULTS.train(), ...extra });
const done = (load, reps, rir = 2) => ({ load, reps, rir, completed: true, clean: true });

// ---------- the library ----------

test('the plan library has the house plan first, a custom plan last, and unique ids', () => {
  assert.equal(PLANS[0].id, DEFAULT_PLAN);
  assert.equal(PLANS.at(-1).id, 'custom');
  assert.ok(PLANS.length >= 7, `expected at least 7 plans, found ${PLANS.length}`);
  assert.equal(new Set(PLANS.map(plan => plan.id)).size, PLANS.length);
  assert.deepEqual(PLAN_BY_ID[DEFAULT_PLAN].week, [...PROGRAM_DAYS], 'Hybrid 5 is the original five-day rotation, unchanged');
});

test('every plan week is seven days of known sessions, and its day count matches', () => {
  for (const plan of PLANS) {
    assert.equal(plan.week.length, 7, plan.id);
    for (const id of plan.week) if (id !== null) assert.ok(getSessionTemplate(id), `${plan.id}: unknown session ${id}`);
    assert.equal(trainingDays(plan.week), plan.days, `${plan.id}: days`);
    for (const key of ['name', 'kicker', 'blurb', 'suits']) assert.ok(typeof plan[key] === 'string' && plan[key].length > 3, `${plan.id}: ${key}`);
  }
});

test('every plan picture is a lift from that plan with an audited photograph', () => {
  for (const plan of PLANS) {
    if (plan.id === 'custom') { assert.deepEqual(plan.art, []); continue; }
    assert.equal(plan.art.length, 3, plan.id);
    const inPlan = new Set(plan.week.filter(Boolean).flatMap(id => getSessionTemplate(id).exercises.map(row => `${row[0]}:${row[4]}`)));
    for (const [exerciseId, variantId] of plan.art) {
      assert.ok(getExerciseGuide(exerciseId, variantId)?.visual, `${plan.id}: no audited photo for ${exerciseId}:${variantId}`);
      assert.ok(inPlan.has(`${exerciseId}:${variantId}`), `${plan.id}: ${exerciseId}:${variantId} is not in the plan`);
    }
  }
});

test('plan-library sessions follow the journal tuple contract and never repeat a movement', () => {
  const ids = new Set();
  for (const session of PLAN_SESSIONS) {
    assert.match(session.id, /^[a-z0-9-]+-v\d+$/, `${session.id}: versioned id`);
    assert.ok(!ids.has(session.id) && !NEW_SESSIONS.some(item => item.id === session.id), `${session.id}: duplicate id`);
    ids.add(session.id);
    assert.ok(isModernSession(session.id));
    assert.ok(Object.isFrozen(session) && Object.isFrozen(session.exercises), `${session.id}: frozen`);
    const seen = new Set();
    for (const [exerciseId, sets, repMin, repMax, variantId] of session.exercises) {
      assert.ok(Object.hasOwn(EXERCISES, exerciseId), `${session.id}: unknown movement ${exerciseId}`);
      assert.ok(!seen.has(exerciseId), `${session.id}: ${exerciseId} twice`);
      seen.add(exerciseId);
      assert.ok(EXERCISES[exerciseId].variants.some(variant => variant.id === variantId), `${session.id}: ${exerciseId} has no variant ${variantId}`);
      assert.ok(Number.isInteger(sets) && sets >= 1 && sets <= 5, `${session.id}: ${exerciseId} sets`);
      assert.ok(Number.isInteger(repMin) && Number.isInteger(repMax) && repMin >= 1 && repMax >= repMin && repMax <= 30, `${session.id}: ${exerciseId} reps`);
    }
    assert.ok(session.exercises.length >= 4 && session.exercises.length <= 8, `${session.id}: movement count`);
  }
  assert.equal(CATALOGUE.length, NEW_SESSIONS.length + PLAN_SESSIONS.length);
});

test('every catalogue session can be drafted, logged and saved through the unchanged journal', () => {
  for (const session of CATALOGUE) {
    const state = fresh();
    const draft = createDraft(state, session.id, START);
    assert.equal(draft.targetRir, 2, `${session.id}: modern prescription`);
    draft.exercises.forEach(entry => { entry.sets = entry.sets.map(() => done(50, entry.repMin)); });
    const saved = finishDraft({ ...state, draft }, `s-${session.id}`);
    assert.equal(saved.sessions[0].partial, false);
    assert.deepEqual(validateTrainingState(JSON.parse(JSON.stringify(saved))), saved, `${session.id}: round trip`);
  }
});

// ---------- the calendar ----------

test('with default preferences the calendar is exactly the journal\'s own five-day rotation', () => {
  const state = fresh();
  for (let i = 0; i < 21; i += 1) {
    const date = shiftDate(START, i);
    assert.deepEqual(planDay(state, prefs(), date), getProgramDay(state, date), date);
  }
});

test('a chosen plan drives the calendar and follows a shifted rotation', () => {
  const state = fresh(); const train = prefs({ plan: 'ppl-6' });
  const week = PLAN_BY_ID['ppl-6'].week;
  for (let i = 0; i < 14; i += 1) {
    const day = planDay(state, train, shiftDate(START, i));
    assert.equal(day.sessionId, week[i % 7]);
    assert.equal(day.kind, week[i % 7] ? 'session' : 'rest');
    assert.equal(day.cycleDay, (i % 7) + 1);
  }
  const shifted = setProgramDay(state, '2026-09-09', 1); // Wednesday becomes day 1
  assert.equal(planDay(shifted, train, '2026-09-09').sessionId, 'ppl-push-a-v1');
  assert.equal(planDay(shifted, train, '2026-09-10').sessionId, 'ppl-pull-a-v1');
});

test('days before the journal started, and a journal on the earlier four-session plan, are left to the journal', () => {
  const state = createTrainingState('2026-09-09');
  assert.equal(planDay(state, prefs({ plan: 'ppl-6' }), '2026-09-08').kind, 'before-start');
  const legacy = fresh(); delete legacy.program;
  for (let i = 0; i < 7; i += 1) {
    const date = shiftDate(START, i);
    assert.deepEqual(planDay(legacy, prefs({ plan: 'ppl-6' }), date), getProgramDay(legacy, date), date);
  }
});

test('completion on a day is judged against that plan\'s session', () => {
  let state = fresh(); const train = prefs({ plan: 'full-3' });
  const draft = createDraft(state, 'fb-a-v1', START);
  draft.exercises[0].sets[0] = done(100, 8);
  state = finishDraft({ ...state, draft }, 'half');
  assert.equal(planDay(state, train, START).partial, true);
  assert.equal(planDay(state, train, START).completed, false);
  assert.equal(planDay(state, prefs(), START).partial, false, 'the same day under Hybrid 5 expects a different session');
});

test('an unknown plan falls back to the house plan', () => {
  assert.equal(activePlan({ plan: 'nope' }).id, DEFAULT_PLAN);
  assert.equal(activePlan(undefined).id, DEFAULT_PLAN);
  assert.deepEqual(planWeek({ plan: 'nope' }), [...PROGRAM_DAYS]);
});

// ---------- a rearranged week ----------

test('a saved week is used only when it is seven known sessions or rests', () => {
  const good = ['post-hinge-v1', null, 'post-quads-v1', null, 'hybrid5-upper-v1', null, null];
  assert.deepEqual(cleanWeek(good), good);
  assert.notEqual(cleanWeek(good), good, 'a copy, not the saved array');
  for (const bad of [null, 'x', [], good.slice(0, 6), [...good.slice(0, 6), 'made-up'], [...good.slice(0, 6), undefined], [...good.slice(0, 6), 'upper-a']]) assert.equal(cleanWeek(bad), null);
  const train = prefs({ plan: 'posterior-4', weeks: { 'posterior-4': good } });
  assert.deepEqual(planWeek(train), good);
  assert.equal(weekIsCustom(train), true);
  assert.equal(weekIsCustom(prefs({ plan: 'posterior-4' })), false);
  assert.deepEqual(planWeek(prefs({ plan: 'posterior-4', weeks: { 'posterior-4': ['junk'] } })), PLAN_BY_ID['posterior-4'].week);
  assert.equal(planDay(fresh(), train, '2026-09-09').sessionId, 'post-quads-v1');
});

test('the custom plan starts empty and takes any catalogue session', () => {
  assert.equal(trainingDays(planWeek(prefs({ plan: 'custom' }))), 0);
  const week = ['exp-full-v1', null, 'db-lower-v1', null, 'ppl-pull-b-v1', null, null];
  const train = prefs({ plan: 'custom', weeks: { custom: week } });
  assert.deepEqual(planSessions(train).map(session => session.id), ['exp-full-v1', 'db-lower-v1', 'ppl-pull-b-v1']);
  assert.equal(weekIsCustom(train), false, 'a custom plan has no original week to differ from');
});

test('a session used on two days is listed once', () => {
  const train = prefs({ plan: 'posterior-4', weeks: { 'posterior-4': ['post-hinge-v1', null, 'post-hinge-v1', null, null, null, null] } });
  assert.deepEqual(planSessions(train).map(session => session.id), ['post-hinge-v1']);
});

// ---------- an edited session ----------

test('a session\'s lineup is the plan\'s own until a valid edit replaces it', () => {
  const template = getSessionTemplate('post-quads-v1');
  const base = sessionLineup(prefs(), 'post-quads-v1');
  assert.deepEqual(base.map(row => [row.exerciseId, row.sets, row.repMin, row.repMax, row.variantId]), template.exercises.map(row => [...row]));
  assert.equal(isEdited(prefs(), 'post-quads-v1'), false);
  const mine = [{ exerciseId: 'legpress', variantId: 'sled', sets: 4, repMin: 8, repMax: 12 }, { exerciseId: 'legcurl', variantId: 'seated', sets: 4, repMin: 10, repMax: 15 }];
  const train = prefs({ edits: { 'post-quads-v1': { name: '  Press day  ', exercises: mine } } });
  assert.deepEqual(sessionLineup(train, 'post-quads-v1'), mine);
  assert.equal(isEdited(train, 'post-quads-v1'), true);
  assert.equal(sessionName(train, 'post-quads-v1'), 'Press day');
  assert.equal(sessionName(prefs(), 'post-quads-v1'), 'Quads');
  assert.equal(sessionSets(train, 'post-quads-v1'), 8);
  assert.deepEqual(sessionLineup(prefs(), 'no-such-session'), []);
});

test('an edit the journal would refuse is ignored, never half-applied', () => {
  const row = { exerciseId: 'squat', variantId: 'hack', sets: 3, repMin: 6, repMax: 10 };
  const bad = [
    [], [{ ...row, exerciseId: 'made-up' }], [row, { ...row }], [{ ...row, variantId: 'nope' }], [{ ...row, sets: 0 }], [{ ...row, sets: 21 }], [{ ...row, sets: 2.5 }],
    [{ ...row, repMin: 0 }], [{ ...row, repMin: 12, repMax: 8 }], [{ ...row, repMax: 101 }], ['squat'], Array.from({ length: 26 }, () => row),
  ];
  for (const rows of bad) {
    assert.equal(cleanLineup(rows), null);
    const train = prefs({ edits: { 'post-quads-v1': { exercises: rows } } });
    assert.equal(isEdited(train, 'post-quads-v1'), false);
    assert.equal(sessionLineup(train, 'post-quads-v1').length, getSessionTemplate('post-quads-v1').exercises.length);
  }
  assert.equal(cleanLineup(null), null);
  assert.deepEqual(cleanLineup([{ ...row, extra: 'dropped' }]), [row], 'only the known fields are kept');
});

test('an edited session is drafted as an adapted workout the journal accepts, and saves', () => {
  const mine = [{ exerciseId: 'legpress', variantId: 'sled', sets: 4, repMin: 8, repMax: 12 }, { exerciseId: 'hip-thrust', variantId: 'barbell', sets: 3, repMin: 8, repMax: 12 }];
  const train = prefs({ edits: { 'post-quads-v1': { exercises: mine } } });
  let state = fresh();
  const draft = buildDraft(state, train, 'post-quads-v1', START);
  assert.equal(draft.customized, true);
  assert.deepEqual(draft.exercises.map(entry => [entry.exerciseId, entry.variantId, entry.prescribedSets, entry.sets.length, entry.repMin, entry.repMax]), [['legpress', 'sled', 4, 4, 8, 12], ['hip-thrust', 'barbell', 3, 3, 8, 12]]);
  state = validateTrainingState({ ...state, draft });
  state.draft.exercises.forEach(entry => { entry.sets = entry.sets.map(() => done(200, 10)); });
  const saved = finishDraft(state, 'mine');
  assert.equal(saved.sessions[0].customized, true);
  assert.equal(saved.sessions[0].partial, false);
  assert.deepEqual(validateTrainingState(JSON.parse(JSON.stringify(saved))), saved);
});

test('an unedited session drafts exactly as the journal does, and a lighter edited one halves the sets', () => {
  const state = fresh();
  assert.deepEqual(buildDraft(state, prefs(), 'post-quads-v1', START), createDraft(state, 'post-quads-v1', START));
  const mine = [{ exerciseId: 'legpress', variantId: 'sled', sets: 5, repMin: 8, repMax: 12 }, { exerciseId: 'calves', variantId: 'seated', sets: 1, repMin: 10, repMax: 15 }];
  const light = buildDraft(state, prefs({ edits: { 'post-quads-v1': { exercises: mine } } }), 'post-quads-v1', START, true);
  assert.deepEqual(light.exercises.map(entry => entry.prescribedSets), [3, 1]);
  assert.equal(light.targetRir, 4);
  validateTrainingState({ ...state, draft: light });
});

// ---------- derived facts ----------

test('leg days are recognised from the sets, for plan sessions, edits and the earlier plan', () => {
  for (const id of ['hybrid5-lower-v1', 'hybrid5-legs-v1', 'ppl-legs-a-v1', 'ppl-legs-b-v1', 'ul-lower-b-v1', 'post-hinge-v1', 'post-quads-v1', 'exp-lower-v1', 'db-lower-v1', 'lower-a', 'lower-b']) assert.equal(isLegSession(prefs(), id), true, id);
  for (const id of ['hybrid5-upper-v1', 'hybrid5-chest-back-v1', 'hybrid5-shoulders-arms-v1', 'ppl-push-a-v1', 'ppl-pull-b-v1', 'ul-upper-b-v1', 'fb-a-v1', 'exp-upper-v1', 'db-upper-v1', 'upper-a']) assert.equal(isLegSession(prefs(), id), false, id);
  const train = prefs({ edits: { 'hybrid5-upper-v1': { exercises: [{ exerciseId: 'squat', variantId: 'hack', sets: 4, repMin: 6, repMax: 10 }, { exerciseId: 'curl', variantId: 'db', sets: 2, repMin: 10, repMax: 15 }] } } });
  assert.equal(isLegSession(train, 'hybrid5-upper-v1'), true, 'an edit that turns it into a leg day counts');
  assert.equal(isLegSession(prefs(), 'no-such-session'), false);
});

test('weekly volume counts sets by muscle, and Legs First delivers the hamstring sets it promises', () => {
  const volume = weeklyVolume(prefs({ plan: 'posterior-4' }));
  assert.equal(volume.Hamstrings, 12);
  assert.match(PLAN_BY_ID['posterior-4'].blurb, /twelve direct hamstring sets/);
  assert.equal(weeklyVolume(prefs()).Hamstrings, 8, 'the house plan is unchanged at 8');
  assert.ok(volume.Hamstrings > weeklyVolume(prefs()).Hamstrings);
  assert.deepEqual(weeklyVolume(prefs({ plan: 'custom' })), {});
});

test('session length is a rough estimate that grows with the work', () => {
  assert.ok(sessionMinutes(prefs(), 'exp-upper-v1') < sessionMinutes(prefs(), 'hybrid5-legs-v1'));
  for (const session of CATALOGUE) { const minutes = sessionMinutes(prefs(), session.id); assert.ok(minutes >= 20 && minutes <= 90 && minutes % 5 === 0, `${session.id}: ${minutes}`); }
});

// ---------- preferences ----------

test('rest follows the movement, a fixed choice, or stays off', () => {
  assert.equal(restSeconds(prefs(), 'flat'), EXERCISES.flat.rest);
  assert.equal(restSeconds(prefs(), 'curl'), EXERCISES.curl.rest);
  assert.equal(restSeconds(prefs({ rest: 120 }), 'curl'), 120);
  assert.equal(restSeconds(prefs({ rest: 'off' }), 'flat'), 0);
  assert.equal(restSeconds(prefs({ rest: 45 }), 'flat'), EXERCISES.flat.rest, 'a value that is not offered is ignored');
  assert.equal(restSeconds(undefined, 'flat'), EXERCISES.flat.rest);
  assert.ok(REST_CHOICES.includes('auto') && REST_CHOICES.includes('off'));
});

test('one tap changes the load by the unit default or the chosen step', () => {
  assert.equal(loadStep(prefs(), 'lb'), 5);
  assert.equal(loadStep(prefs(), 'kg'), 2.5);
  assert.equal(loadStep(prefs({ step: 2.5 }), 'lb'), 2.5);
  assert.equal(loadStep(prefs({ step: 10 }), 'kg'), 10);
  assert.equal(loadStep(prefs({ step: 3 }), 'lb'), 5, 'a value that is not offered is ignored');
  assert.ok(STEP_CHOICES.includes('auto'));
});

test('the default training preferences are the house plan with nothing changed', () => {
  const train = DEFAULTS.train();
  assert.deepEqual(train, { version: 1, plan: DEFAULT_PLAN, weeks: {}, edits: {}, rest: 'auto', step: 'auto' });
});
