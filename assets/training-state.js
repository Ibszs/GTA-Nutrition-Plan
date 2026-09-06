import { EXERCISES, SESSIONS, localToday, isRealDate, getWeek, getPrescription } from './training-data.js';

export const TRAINING_KEY = 'gtaNutrition.training.v1';
const blankSet = () => ({ load: '', reps: '', rir: '', completed: false, clean: false });
const check = (condition, message) => { if (!condition) throw new Error(`Training data: ${message}`); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const numeric = (value, min, max, integer = false) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value));

export function createTrainingState(startDate = localToday()) {
  check(isRealDate(startDate), 'start date must be a real calendar date.');
  return { version: 1, startDate, unit: 'lb', sessions: [], draft: null };
}

export function createDraft(state, sessionId, date = localToday(), lightWeek = false) {
  const session = SESSIONS.find(item => item.id === sessionId);
  check(session && isRealDate(date) && date >= state.startDate, 'choose a session and a date on or after the block start.');
  const week = getWeek(state.startDate, date);
  const prescription = getPrescription(week, lightWeek);
  return {
    date, week, sessionId, unit: state.unit, lightWeek,
    exercises: session.exercises.map(([exerciseId, count]) => {
      const exercise = EXERCISES[exerciseId];
      const prescribedSets = Math.max(1, Math.ceil(count * prescription.setMultiplier));
      return { exerciseId, variantId: exercise.variants[0].id, setup: '', prescribedSets,
        repMin: exercise.repMin, repMax: exercise.repMax,
        sets: Array.from({ length: prescribedSets }, blankSet) };
    }),
  };
}

export function validateTrainingState(value) {
  check(object(value) && value.version === 1, 'unsupported state version.');
  check(isRealDate(value.startDate), 'invalid start date.');
  check(['lb', 'kg'].includes(value.unit), 'invalid load unit.');
  check(Array.isArray(value.sessions) && value.sessions.length <= 5000, 'invalid session history.');
  const ids = new Set();
  function validateSession(item, isDraft) {
    check(object(item) && isRealDate(item.date) && item.date >= value.startDate, 'invalid session date.');
    check(item.week === getWeek(value.startDate, item.date), 'session week does not match its date.');
    check(['lb', 'kg'].includes(item.unit), 'invalid session load unit.');
    check(typeof item.lightWeek === 'boolean', 'invalid lighter-session setting.');
    const template = SESSIONS.find(s => s.id === item.sessionId);
    check(item.customized === undefined || typeof item.customized === 'boolean', 'invalid customization marker.');
    check(template && Array.isArray(item.exercises) && (item.customized ? item.exercises.length >= 1 && item.exercises.length <= 25 : item.exercises.length === template.exercises.length), 'invalid session or exercise list.');
    const movements = new Set();
    let completed = 0; let prescribed = 0;
    item.exercises.forEach((entry, index) => {
      const [expectedId, count] = template.exercises[index] ?? [];
      check(object(entry) && Object.hasOwn(EXERCISES, entry.exerciseId) && (item.customized || entry.exerciseId === expectedId) && !movements.has(entry.exerciseId), 'invalid or repeated exercise id or order.');
      movements.add(entry.exerciseId);
      const definition = EXERCISES[entry.exerciseId];
      check(definition.variants.some(v => v.id === entry.variantId), 'invalid exercise substitution.');
      check(typeof entry.setup === 'string' && entry.setup.length <= 120, 'setup must be at most 120 characters.');
      const expectedSets = item.customized ? entry.prescribedSets : Math.max(1, Math.ceil(count * getPrescription(item.week, item.lightWeek).setMultiplier));
      check(numeric(expectedSets, 1, 20, true) && numeric(entry.repMin, 1, 100, true) && numeric(entry.repMax, entry.repMin, 100, true), 'invalid exercise prescription bounds.');
      check(entry.prescribedSets === expectedSets && (item.customized || entry.repMin === definition.repMin && entry.repMax === definition.repMax), 'invalid exercise prescription.');
      check(Array.isArray(entry.sets) && (isDraft ? entry.sets.length === expectedSets : entry.sets.length <= expectedSets), 'invalid set count.');
      prescribed += expectedSets;
      entry.sets.forEach(set => {
        check(object(set) && typeof set.completed === 'boolean' && typeof set.clean === 'boolean', 'invalid set flags.');
        check(isDraft || set.completed, 'history may only contain completed sets.');
        const allowBlank = isDraft && !set.completed;
        check((allowBlank && set.load === '') || numeric(set.load, 0, 3000), 'load must be a number from 0 to 3000.');
        check((allowBlank && set.reps === '') || numeric(set.reps, 1, 100, true), 'reps must be a whole number from 1 to 100.');
        check((allowBlank && set.rir === '') || numeric(set.rir, 0, 10), 'RIR must be a number from 0 to 10.');
        if (set.completed) completed++;
      });
    });
    if (!isDraft) {
      check(typeof item.id === 'string' && item.id.length > 0 && item.id.length <= 100 && !ids.has(item.id), 'invalid or duplicate session id.');
      ids.add(item.id);
      check(completed > 0, 'complete at least one set before finishing.');
      check(item.partial === (completed < prescribed), 'incorrect partial-session marker.');
    }
  }
  value.sessions.forEach(item => validateSession(item, false));
  check(value.draft === null || object(value.draft), 'invalid draft.');
  if (value.draft) validateSession(value.draft, true);
  return structuredClone(value);
}

const hasRecordedSet = set => set.load !== '' || set.reps !== '' || set.rir !== '' || set.completed || set.clean;
export function editDraft(state, action) {
  const next = validateTrainingState(state);
  check(next.draft, 'start a session first.');
  const draft = next.draft;
  const entry = draft.exercises[action.index];
  if (action.type === 'add' || action.type === 'swap') {
    check(Object.hasOwn(EXERCISES, action.exerciseId), 'choose a known exercise.');
    check(!draft.exercises.some(e => e.exerciseId === action.exerciseId), 'this exercise is already in the session; adjust its sets instead.');
    if (action.type === 'swap') check(entry && !entry.sets.some(hasRecordedSet), 'recorded numbers must be cleared explicitly before swapping; add the new exercise to keep them.');
    const definition = EXERCISES[action.exerciseId];
    const count = entry && action.type === 'swap' ? entry.prescribedSets : 3;
    const replacement = { exerciseId: definition.id, variantId: definition.variants[0].id, setup: '', prescribedSets: count, repMin: definition.repMin, repMax: definition.repMax, sets: Array.from({ length: count }, blankSet) };
    if (action.type === 'swap') draft.exercises[action.index] = replacement;
    else draft.exercises.push(replacement);
  } else if (action.type === 'remove') {
    check(entry && !entry.sets.some(hasRecordedSet), 'recorded numbers must be cleared explicitly before removing this exercise.');
    draft.exercises.splice(action.index, 1);
  } else if (action.type === 'prescription') {
    check(entry && numeric(action.count, 1, 20, true), 'choose 1–20 sets.');
    check(!entry.sets.slice(action.count).some(hasRecordedSet), 'recorded sets cannot be removed; clear their numbers explicitly first.');
    entry.sets = Array.from({ length: action.count }, (_, i) => entry.sets[i] ?? blankSet());
    entry.prescribedSets = action.count; entry.repMin = action.repMin; entry.repMax = action.repMax;
  } else check(false, 'unknown workout edit.');
  draft.customized = true;
  return validateTrainingState(next);
}

export function finishDraft(state, id) {
  check(state.draft, 'no session is in progress.');
  validateTrainingState(state);
  const session = structuredClone(state.draft);
  const performedCount = session.exercises.reduce((sum, e) => sum + e.sets.filter(s => s.completed).length, 0);
  check(performedCount > 0, 'complete at least one set before finishing.');
  session.id = id;
  session.partial = session.exercises.some(e => e.sets.some(s => !s.completed));
  session.exercises.forEach(e => { e.sets = e.sets.filter(s => s.completed); });
  return validateTrainingState({ ...state, sessions: [...state.sessions, session], draft: null });
}

export function copyLastSets(entry, previous) {
  return { ...structuredClone(entry), sets: entry.sets.map((_, index) => {
    const set = previous?.sets[index];
    return set ? { load: set.load, reps: set.reps, rir: set.rir, completed: false, clean: false } : blankSet();
  }) };
}

export function findLastEntry(sessions, exerciseId, variantId, unit, setup, beforeDate) {
  const sorted = sessions.filter(s => s.unit === unit && s.date < beforeDate).slice().reverse().sort((a, b) => b.date.localeCompare(a.date));
  for (const session of sorted) {
    const entry = session.exercises.find(e => e.exerciseId === exerciseId && e.variantId === variantId && e.setup === setup && e.sets.some(s => s.completed));
    if (entry) return { ...structuredClone(entry), date: session.date, lightWeek: session.lightWeek, targetRir: getPrescription(session.week, session.lightWeek).rir };
  }
  return null;
}

export function progressionSuggestion(entry, targetRir = 2) {
  if (entry.exerciseId === 'dips' && entry.variantId === 'assisted') return { action: 'hold', text: 'Assisted dips: build controlled reps, then consider slightly less assistance. A larger assistance number makes the exercise easier.' };
  const complete = entry.sets.filter(s => s.completed);
  if (entry.lightWeek) return { action: 'hold', text: 'Lighter session: return to your normal prescription once recovered; no automatic increase.' };
  if (!numeric(targetRir, 0, 10) || !numeric(entry.prescribedSets, 1, 20, true) || !numeric(entry.repMax, 1, 100, true) || complete.some(s => !numeric(s.load, 0, 3000) || !numeric(s.reps, 1, 100, true) || !numeric(s.rir, 0, 10))) return { action: 'hold', text: 'Check the recorded numbers before considering a load increase.' };
  if (complete.length !== entry.prescribedSets) return { action: 'hold', text: 'Keep the same load. Complete the full prescription before considering an increase.' };
  if (complete.some(s => !s.clean || s.rir < targetRir)) return { action: 'hold', text: 'Keep the load or reduce it to restore clean reps and the target RIR.' };
  if (complete.every(s => s.reps >= entry.repMax)) return { action: 'increase', text: 'All sets reached the top with clean reps and enough reserve. Next time, try the smallest available increase only if you can stay in range at the target RIR.' };
  return { action: 'reps', text: 'Keep the same load and build toward the top of the rep range with clean reps and the target RIR.' };
}
