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
for (const session of NEW_SESSIONS) {
  session.exercises.forEach(Object.freeze); Object.freeze(session.exercises); Object.freeze(session);
}
Object.freeze(NEW_SESSIONS);
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
export const getSessionTemplate = id => NEW_SESSIONS.find(s => s.id === id) ?? SESSIONS.find(s => s.id === id);
export function getSessionPrescription(state, sessionId, date, lighter = false) {
  if (!NEW_SESSIONS.some(s => s.id === sessionId)) return getPrescription(getWeek(state.startDate,date),lighter);
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
