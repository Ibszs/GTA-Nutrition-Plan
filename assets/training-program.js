import { SESSIONS, isRealDate, getWeek, getPrescription } from './training-data.js';

export const PROGRAM_ID = 'hybrid-5-v1';
// IDs and tuples are a persisted prescription contract: add a new ID for future revisions.
export const NEW_SESSIONS = [
  { id: 'hybrid5-upper-v1', name: 'Upper', focus: 'Heavy chest and back, side delts', duration: '50–65 min', exercises: [['flat',3,5,8,'barbell'],['row',3,6,10,'db'],['incline',2,8,12,'db'],['pulldown',2,8,12,'neutral'],['lateral',2,12,20,'db']] },
  { id: 'hybrid5-lower-v1', name: 'Lower', focus: 'Squat, hinge, calves and abs', duration: '55–70 min', exercises: [['squat',3,5,8,'hack'],['rdl',3,6,8,'barbell'],['legcurl',2,8,12,'seated'],['calves',3,8,12,'standing'],['abs',2,10,15,'cable']] },
  { id: 'hybrid5-chest-back-v1', name: 'Chest + Back', focus: 'Chest and back volume', duration: '45–60 min', exercises: [['incline',3,8,12,'db'],['seated-row',3,8,12,'neutral'],['fly',2,10,15,'cable'],['pulldown',3,10,15,'neutral']] },
  { id: 'hybrid5-legs-v1', name: 'Legs', focus: 'Leg press, single-leg work, calves and abs', duration: '60–75 min', exercises: [['legpress',3,10,15,'sled'],['bulgarian',2,8,12,'db'],['legcurl',3,10,15,'seated'],['extension',2,12,20,'machine'],['calves',3,12,20,'standing'],['abs',2,10,15,'cable']] },
  { id: 'hybrid5-shoulders-arms-v1', name: 'Shoulders + Arms', focus: 'Delts, biceps and triceps', duration: '60–75 min', exercises: [['shoulder-press',2,6,10,'db'],['lateral',3,12,20,'db'],['rear',3,12,20,'machine'],['curl',3,8,12,'db'],['triceps',3,10,15,'overhead'],['hammer',2,10,15,'db'],['pushdown',2,10,15,'rope']] },
];
// Sessions used by the other plans in the plan library. Same tuple contract as above:
// [exerciseId, sets, repMin, repMax, variantId]. Never edit a shipped tuple; add a new ID instead.
export const PLAN_SESSIONS = [
  { id: 'ppl-push-a-v1', name: 'Push A', focus: 'Heavy press, delts and triceps', duration: '50–65 min', exercises: [['flat',3,5,8,'barbell'],['shoulder-press',3,6,10,'db'],['incline',2,8,12,'db'],['lateral',3,12,20,'db'],['pushdown',3,10,15,'rope']] },
  { id: 'ppl-pull-a-v1', name: 'Pull A', focus: 'Heavy rows, lats and biceps', duration: '50–65 min', exercises: [['row',3,6,10,'machine'],['pulldown',3,8,12,'neutral'],['face-pull',2,12,20,'rope'],['curl',3,8,12,'db'],['hammer',2,10,15,'db']] },
  { id: 'ppl-legs-a-v1', name: 'Legs A', focus: 'Squat, hinge, calves and abs', duration: '55–70 min', exercises: [['squat',3,5,8,'hack'],['rdl',3,6,8,'barbell'],['legcurl',2,8,12,'seated'],['calves',3,8,12,'standing'],['abs',2,10,15,'cable']] },
  { id: 'ppl-push-b-v1', name: 'Push B', focus: 'Upper chest and pressing volume', duration: '50–65 min', exercises: [['incline',3,8,12,'db'],['fly',3,10,15,'cable'],['lateral',3,12,20,'cable'],['dips',2,6,15,'bodyweight'],['triceps',3,10,15,'overhead']] },
  { id: 'ppl-pull-b-v1', name: 'Pull B', focus: 'Lats, rear delts and arms', duration: '50–65 min', exercises: [['pullup',3,5,10,'bodyweight'],['seated-row',3,8,12,'neutral'],['straight-arm',2,10,15,'bar'],['rear',3,12,20,'machine'],['preacher',3,10,15,'ez']] },
  { id: 'ppl-legs-b-v1', name: 'Legs B', focus: 'Leg press, single-leg work and hamstrings', duration: '60–75 min', exercises: [['legpress',3,10,15,'sled'],['bulgarian',2,8,12,'db'],['lying-legcurl',3,10,15,'machine'],['extension',2,12,20,'machine'],['calves',3,12,20,'seated'],['hanging-raise',2,8,15,'knees']] },
  { id: 'ul-upper-b-v1', name: 'Upper B', focus: 'Pressing and pulling volume, arms', duration: '55–70 min', exercises: [['incline',3,8,12,'db'],['seated-row',3,8,12,'neutral'],['shoulder-press',2,8,12,'db'],['pulldown',2,10,15,'neutral'],['lateral',3,12,20,'db'],['curl',2,10,15,'db'],['pushdown',2,10,15,'rope']] },
  { id: 'ul-lower-b-v1', name: 'Lower B', focus: 'Leg press, hip thrust and hamstrings', duration: '55–70 min', exercises: [['legpress',3,10,15,'sled'],['hip-thrust',3,8,12,'barbell'],['legcurl',3,10,15,'seated'],['extension',2,12,20,'machine'],['calves',3,12,20,'standing'],['abs',2,10,15,'cable']] },
  { id: 'fb-a-v1', name: 'Full Body A', focus: 'Squat, press and row', duration: '55–70 min', exercises: [['squat',3,6,10,'hack'],['flat',3,6,10,'db'],['row',3,8,12,'machine'],['legcurl',2,10,15,'seated'],['lateral',2,12,20,'db'],['abs',2,10,15,'cable']] },
  { id: 'fb-b-v1', name: 'Full Body B', focus: 'Hinge, incline press and pulldown', duration: '55–70 min', exercises: [['rdl',3,6,10,'barbell'],['incline',3,8,12,'db'],['pulldown',3,8,12,'neutral'],['extension',2,12,15,'machine'],['curl',2,10,15,'db'],['pushdown',2,10,15,'rope']] },
  { id: 'fb-c-v1', name: 'Full Body C', focus: 'Leg press, overhead press and row', duration: '55–70 min', exercises: [['legpress',3,10,15,'sled'],['shoulder-press',3,6,10,'db'],['seated-row',3,8,12,'neutral'],['lying-legcurl',2,10,15,'machine'],['fly',2,10,15,'cable'],['calves',3,10,15,'standing']] },
  { id: 'post-hinge-v1', name: 'Hinge', focus: 'Hamstrings and glutes first', duration: '55–70 min', exercises: [['rdl',4,6,10,'barbell'],['hip-thrust',3,8,12,'barbell'],['legcurl',3,8,12,'seated'],['lying-legcurl',2,10,15,'machine'],['calves',3,10,15,'standing'],['hanging-raise',2,8,15,'knees']] },
  { id: 'post-quads-v1', name: 'Quads', focus: 'Quads, with a second hamstring visit', duration: '55–70 min', exercises: [['squat',3,6,10,'hack'],['bulgarian',3,8,12,'db'],['extension',3,10,15,'machine'],['legcurl',3,10,15,'seated'],['calves',3,12,20,'seated'],['abs',2,10,15,'cable']] },
  { id: 'exp-upper-v1', name: 'Express Upper', focus: 'Four movements: press, row, delts, triceps', duration: '30–40 min', exercises: [['incline',3,8,12,'db'],['seated-row',3,8,12,'neutral'],['lateral',2,12,20,'db'],['triceps',2,10,15,'overhead']] },
  { id: 'exp-lower-v1', name: 'Express Lower', focus: 'Four movements: press, hinge, curl, calves', duration: '30–40 min', exercises: [['legpress',3,10,15,'sled'],['rdl',3,8,12,'db'],['legcurl',2,10,15,'seated'],['calves',2,10,15,'standing']] },
  { id: 'exp-full-v1', name: 'Express Full', focus: 'Four movements: press, pull, squat, curl', duration: '30–40 min', exercises: [['flat',3,6,10,'db'],['pulldown',3,8,12,'neutral'],['goblet',3,8,15,'db'],['curl',2,10,15,'db']] },
  { id: 'db-upper-v1', name: 'Dumbbell Upper', focus: 'Press, row, shoulders and arms', duration: '45–60 min', exercises: [['flat',3,8,12,'db'],['one-arm-row',3,8,15,'bench'],['shoulder-press',3,8,12,'db'],['curl',2,10,15,'db'],['lying-triceps',2,10,15,'db'],['pushup',2,8,25,'floor']] },
  { id: 'db-lower-v1', name: 'Dumbbell Lower', focus: 'Squat, hinge, lunge, calves and trunk', duration: '45–60 min', exercises: [['goblet',3,8,15,'db'],['rdl',3,8,12,'db'],['reverse-lunge',3,8,12,'db'],['db-calves',3,10,20,'db'],['deadbug',2,8,15,'legs']] },
  { id: 'db-full-v1', name: 'Dumbbell Full', focus: 'Incline press, split squat, row and delts', duration: '45–60 min', exercises: [['incline',3,8,12,'db'],['split',3,8,12,'db'],['row',3,8,12,'db'],['lateral',3,12,20,'db'],['hammer',2,10,15,'db'],['deadbug',2,8,15,'legs']] },
];
for (const session of [...NEW_SESSIONS, ...PLAN_SESSIONS]) {
  session.exercises.forEach(Object.freeze); Object.freeze(session.exercises); Object.freeze(session);
}
Object.freeze(NEW_SESSIONS); Object.freeze(PLAN_SESSIONS);
const MODERN = new Set([...NEW_SESSIONS, ...PLAN_SESSIONS].map(session => session.id));
/** True for the five-day rotation and the plan-library sessions, which share one prescription style. */
export const isModernSession = id => MODERN.has(id);
export const PROGRAM_DAYS = Object.freeze([NEW_SESSIONS[0].id, NEW_SESSIONS[1].id, null, NEW_SESSIONS[2].id, NEW_SESSIONS[3].id, NEW_SESSIONS[4].id, null]);
const legacyDays = ['upper-a','lower-a',null,'upper-b',null,'lower-b',null];
const dayNumber = date => Date.parse(`${date}T12:00:00Z`) / 86400000;
export function shiftDate(date, days) {
  if (!isRealDate(date) || !Number.isInteger(days)) throw new Error('Training data: invalid calendar date or offset.');
  return new Date((dayNumber(date) + days) * 86400000).toISOString().slice(0,10);
}
export function mondayAnchor(date) {
  if (!isRealDate(date)) throw new Error('Training data: invalid calendar date.');
  return shiftDate(date, -((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7));
}
export function validateProgram(program) {
  if (!program || typeof program !== 'object' || Array.isArray(program) || Object.keys(program).length !== 2 || program.id !== PROGRAM_ID || !isRealDate(program.anchorDate)) throw new Error('Training data: invalid program settings.');
  return program;
}
export const getSessionTemplate = id => NEW_SESSIONS.find(s => s.id === id) ?? PLAN_SESSIONS.find(s => s.id === id) ?? SESSIONS.find(s => s.id === id);
export function getSessionPrescription(state, sessionId, date, lighter = false) {
  if (!MODERN.has(sessionId)) return getPrescription(getWeek(state.startDate,date),lighter);
  return { rir: lighter ? 4 : 2, setMultiplier: lighter ? 0.5 : 1, checkpoint: false,
    phase: lighter ? 'Lighter session' : 'Build with steady reps',
    note: lighter ? 'About half the usual sets, with 4 reps in reserve. Resume normal training when recovered.' : 'Finish sets with about 2 good reps in reserve. Build reps before adding load.' };
}
export function getProgramDay(state, date) {
  if (!isRealDate(date) || !isRealDate(state.startDate)) throw new Error('Training data: invalid calendar date.');
  if (state.program !== undefined) validateProgram(state.program);
  const anchor = state.program?.anchorDate ?? mondayAnchor(date);
  const cycleDay = ((dayNumber(date) - dayNumber(anchor)) % 7 + 7) % 7 + 1;
  const before = date < state.startDate;
  const sessionId = before ? null : (state.program ? PROGRAM_DAYS : legacyDays)[cycleDay - 1];
  const matches = sessionId ? state.sessions.filter(s => s.date === date && s.sessionId === sessionId) : [];
  return { date, kind: before ? 'before-start' : sessionId ? 'session' : 'rest', sessionId, cycleDay, cycleLength: 7,
    completed: matches.some(s => !s.partial), partial: matches.some(s => s.partial) && !matches.some(s => !s.partial) };
}
