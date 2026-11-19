// Training plans: which session falls on which day, and how each session is set up.
// Pure functions. The training journal itself is untouched: a plan only decides what Forme offers
// on a given day. The choice, any reshuffled week and any edited session live in Forme's own
// "train" section, so the original journal, its validators and old backups keep working.

import { NEW_SESSIONS, PLAN_SESSIONS, PROGRAM_DAYS, getProgramDay, getSessionTemplate, getSessionPrescription } from '../../assets/training-program.js';
import { EXERCISES } from '../../assets/training-data.js';
import { createDraft } from '../../assets/training-state.js';
import { groupsOf, LEG_GROUPS } from './lifts.js';

const R = null; // a rest day

/**
 * The plan library. `week` is seven cycle days; day 1 is a Monday unless the rotation was shifted.
 * `suits` and `blurb` describe how the week is built. They make no promise about results.
 */
export const PLANS = Object.freeze([
  { id: 'hybrid-5', name: 'Hybrid 5', days: 5, kicker: 'The house rotation',
    blurb: 'Two heavier days, a rest, then three volume days. Each muscle group comes up twice a week.',
    suits: 'Five gym days and a steady week.',
    art: [['flat', 'barbell'], ['squat', 'hack'], ['lateral', 'db']],
    week: [...PROGRAM_DAYS] },
  { id: 'ppl-6', name: 'Push Pull Legs', days: 6, kicker: 'Six days, three patterns',
    blurb: 'Push, pull and legs, run twice. The first round is heavier, the second has more reps.',
    suits: 'Six gym days and shorter sessions.',
    art: [['shoulder-press', 'db'], ['pullup', 'bodyweight'], ['legpress', 'sled']],
    week: ['ppl-push-a-v1', 'ppl-pull-a-v1', 'ppl-legs-a-v1', 'ppl-push-b-v1', 'ppl-pull-b-v1', 'ppl-legs-b-v1', R] },
  { id: 'ul-4', name: 'Upper Lower', days: 4, kicker: 'Four days, two halves',
    blurb: 'Upper and lower body, twice each, with a rest in the middle and a free weekend.',
    suits: 'Four gym days and longer sessions.',
    art: [['incline', 'db'], ['rdl', 'barbell'], ['seated-row', 'neutral']],
    week: ['hybrid5-upper-v1', 'hybrid5-lower-v1', R, 'ul-upper-b-v1', 'ul-lower-b-v1', R, R] },
  { id: 'posterior-4', name: 'Legs First', days: 4, kicker: 'Hamstrings and glutes lead',
    blurb: 'Two leg days built around the hinge and the leg curl, with two upper days around them. About twelve direct hamstring sets a week.',
    suits: 'Bringing up legs and hamstrings without dropping upper-body work.',
    art: [['rdl', 'barbell'], ['hip-thrust', 'barbell'], ['legcurl', 'seated']],
    week: ['post-hinge-v1', 'hybrid5-upper-v1', R, 'post-quads-v1', 'ul-upper-b-v1', R, R] },
  { id: 'full-3', name: 'Full Body 3', days: 3, kicker: 'Three days, everything',
    blurb: 'Three different full-body sessions with a rest day after each one.',
    suits: 'Three gym days, or a week with a lot of shifts.',
    art: [['squat', 'hack'], ['flat', 'db'], ['pulldown', 'neutral']],
    week: ['fb-a-v1', R, 'fb-b-v1', R, 'fb-c-v1', R, R] },
  { id: 'express-3', name: 'Express', days: 3, kicker: 'Four movements, out the door',
    blurb: 'Three short sessions of four movements each. Upper, lower, then one of everything.',
    suits: 'Thirty to forty minutes, three times a week.',
    art: [['triceps', 'overhead'], ['legpress', 'sled'], ['curl', 'db']],
    week: ['exp-upper-v1', R, 'exp-lower-v1', R, 'exp-full-v1', R, R] },
  { id: 'dumbbell-3', name: 'Dumbbells Only', days: 3, kicker: 'A bench and a rack of dumbbells',
    blurb: 'Three sessions that need dumbbells, a bench and the floor. No machines, no barbell.',
    suits: 'A busy gym, a hotel gym or training at home.',
    art: [['one-arm-row', 'bench'], ['reverse-lunge', 'db'], ['shoulder-press', 'db']],
    week: ['db-upper-v1', R, 'db-lower-v1', R, 'db-full-v1', R, R] },
  { id: 'custom', name: 'Your Own Week', days: 0, kicker: 'Built by you',
    blurb: 'Pick any session for any day. Every session can be edited too.',
    suits: 'When none of the above fits your week.',
    art: [],
    week: [R, R, R, R, R, R, R] },
]);
export const PLAN_BY_ID = Object.freeze(Object.fromEntries(PLANS.map(plan => [plan.id, plan])));
export const DEFAULT_PLAN = 'hybrid-5';
/** Every session a plan or a custom week can use. */
export const CATALOGUE = Object.freeze([...NEW_SESSIONS, ...PLAN_SESSIONS]);
const CATALOGUE_IDS = new Set(CATALOGUE.map(session => session.id));

export const REST_CHOICES = Object.freeze(['auto', 60, 90, 120, 180, 'off']);
export const STEP_CHOICES = Object.freeze(['auto', 1, 2.5, 5, 10]);

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const whole = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

export const activePlan = train => PLAN_BY_ID[train?.plan] ?? PLAN_BY_ID[DEFAULT_PLAN];

/** A saved week is used only if it is seven entries, each a known session or a rest. */
export function cleanWeek(week) {
  if (!Array.isArray(week) || week.length !== 7) return null;
  return week.every(id => id === null || CATALOGUE_IDS.has(id)) ? [...week] : null;
}
export function planWeek(train, planId = activePlan(train).id) {
  const plan = PLAN_BY_ID[planId] ?? PLAN_BY_ID[DEFAULT_PLAN];
  return cleanWeek(train?.weeks?.[plan.id]) ?? [...plan.week];
}
export const weekIsCustom = (train, planId = activePlan(train).id) => cleanWeek(train?.weeks?.[planId]) !== null && planId !== 'custom';
export const trainingDays = week => week.filter(Boolean).length;

/** The sessions of a plan, each once, in the order the week meets them. */
export function planSessions(train, planId = activePlan(train).id) {
  return [...new Set(planWeek(train, planId).filter(Boolean))].map(getSessionTemplate);
}

// ---------- a session's lineup ----------
const fromTemplate = template => template.exercises.map(([exerciseId, sets, repMin, repMax, variantId]) => {
  const exercise = EXERCISES[exerciseId];
  return { exerciseId, variantId: variantId ?? exercise.variants[0].id, sets, repMin: repMin ?? exercise.repMin, repMax: repMax ?? exercise.repMax };
});

/** An edited lineup is used only when every row is something the journal would accept. */
export function cleanLineup(rows) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 25) return null;
  const seen = new Set();
  for (const row of rows) {
    if (!isObject(row) || !Object.hasOwn(EXERCISES, row.exerciseId) || seen.has(row.exerciseId)) return null;
    seen.add(row.exerciseId);
    if (!EXERCISES[row.exerciseId].variants.some(variant => variant.id === row.variantId)) return null;
    if (!whole(row.sets, 1, 20) || !whole(row.repMin, 1, 100) || !whole(row.repMax, row.repMin, 100)) return null;
  }
  return rows.map(({ exerciseId, variantId, sets, repMin, repMax }) => ({ exerciseId, variantId, sets, repMin, repMax }));
}
const editOf = (train, sessionId) => (isObject(train?.edits?.[sessionId]) ? train.edits[sessionId] : null);
export const isEdited = (train, sessionId) => cleanLineup(editOf(train, sessionId)?.exercises) !== null;

/** The movements of a session as Forme will set it up: your edit if there is one, otherwise the plan's. */
export function sessionLineup(train, sessionId) {
  const template = getSessionTemplate(sessionId);
  if (!template) return [];
  return cleanLineup(editOf(train, sessionId)?.exercises) ?? fromTemplate(template);
}
export function sessionName(train, sessionId) {
  const name = editOf(train, sessionId)?.name;
  return typeof name === 'string' && name.trim() ? name.trim().slice(0, 28) : getSessionTemplate(sessionId)?.name ?? 'Session';
}
export const sessionSets = (train, sessionId) => sessionLineup(train, sessionId).reduce((sum, row) => sum + row.sets, 0);

/** Rough length of a session from its sets and the rest each movement asks for, in minutes. */
export function sessionMinutes(train, sessionId) {
  const seconds = sessionLineup(train, sessionId).reduce((sum, row) => sum + row.sets * (45 + EXERCISES[row.exerciseId].rest) + 60, 0);
  return Math.round(seconds / 60 / 5) * 5;
}

/** Working sets per muscle group across one week of a plan. */
export function weeklyVolume(train, planId = activePlan(train).id) {
  const out = {};
  for (const sessionId of planWeek(train, planId)) {
    if (!sessionId) continue;
    for (const row of sessionLineup(train, sessionId)) for (const group of groupsOf(row.exerciseId)) out[group] = (out[group] ?? 0) + row.sets;
  }
  return out;
}

/** A leg day is a session where most of the sets go to the legs. */
export function isLegSession(train, sessionId) {
  const rows = sessionLineup(train, sessionId);
  const total = rows.reduce((sum, row) => sum + row.sets, 0);
  if (!total) return false;
  const legs = rows.filter(row => groupsOf(row.exerciseId).some(group => LEG_GROUPS.includes(group))).reduce((sum, row) => sum + row.sets, 0);
  return legs / total >= 0.6;
}

// ---------- the calendar ----------
/**
 * What is planned on a date. Same shape as the journal's own getProgramDay. A journal that still
 * runs the earlier four-session plan (no `program`) is left to that plan.
 */
export function planDay(state, train, date) {
  const base = getProgramDay(state, date);
  if (!state.program || base.kind === 'before-start') return base;
  const sessionId = planWeek(train)[base.cycleDay - 1] ?? null;
  const matches = sessionId ? state.sessions.filter(session => session.date === date && session.sessionId === sessionId) : [];
  return { ...base, kind: sessionId ? 'session' : 'rest', sessionId,
    completed: matches.some(session => !session.partial), partial: matches.some(session => session.partial) && !matches.some(session => !session.partial) };
}

/**
 * A new draft for a session. An edited session is written the way the journal already records an
 * adapted workout (`customized`), so nothing about the saved format changes.
 */
export function buildDraft(state, train, sessionId, date, lighter = false) {
  const draft = createDraft(state, sessionId, date, lighter);
  if (!isEdited(train, sessionId)) return draft;
  const multiplier = getSessionPrescription(state, sessionId, date, lighter).setMultiplier;
  draft.customized = true;
  draft.exercises = sessionLineup(train, sessionId).map(row => {
    const count = Math.max(1, Math.ceil(row.sets * multiplier));
    return { exerciseId: row.exerciseId, variantId: row.variantId, setup: '', prescribedSets: count, repMin: row.repMin, repMax: row.repMax,
      sets: Array.from({ length: count }, () => ({ load: '', reps: '', rir: '', completed: false, clean: false })) };
  });
  return draft;
}

// ---------- preferences ----------
/** Seconds of rest after a set of this movement. 0 means the timer stays off. */
export function restSeconds(train, exerciseId) {
  const choice = train?.rest;
  if (choice === 'off') return 0;
  if (typeof choice === 'number' && REST_CHOICES.includes(choice)) return choice;
  return EXERCISES[exerciseId]?.rest ?? 90;
}
/** How much one tap of + or - changes the load. */
export function loadStep(train, unit) {
  const choice = train?.step;
  if (typeof choice === 'number' && STEP_CHOICES.includes(choice)) return choice;
  return unit === 'kg' ? 2.5 : 5;
}

/** Two or three photo ids that stand for a list of movements: the first of each with a photograph. */
export function leadMovements(rows, count = 3) {
  const seen = new Set(); const out = [];
  for (const row of rows) {
    if (seen.has(row.exerciseId)) continue;
    seen.add(row.exerciseId); out.push(row);
    if (out.length === count) break;
  }
  return out;
}
