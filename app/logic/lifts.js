// Read-only analysis of the original training journal: personal records, weekly sets by muscle
// group, the last comparable session. Pure functions over the unchanged training state.

import { EXERCISES } from '../../assets/training-data.js';

/** Estimated one-rep max (Epley). Bodyweight sets (load 0) are compared by reps. */
export const e1rm = (load, reps) => (load > 0 ? load * (1 + reps / 30) : 0);
const keyOf = (entry, unit) => `${entry.exerciseId}|${entry.variantId}|${unit}|${entry.setup ?? ''}`;
const sortSessions = sessions => sessions.map((session, index) => ({ session, index })).sort((a, b) => a.session.date.localeCompare(b.session.date) || a.index - b.index).map(item => item.session);

/** Best set of an entry: highest estimated max, or most reps when unloaded. */
export function bestSet(entry) {
  let best = null;
  for (const set of entry.sets) {
    if (!set.completed) continue;
    const value = set.load > 0 ? e1rm(set.load, set.reps) : set.reps;
    if (!best || value > best.value) best = { load: set.load, reps: set.reps, value, loaded: set.load > 0 };
  }
  return best;
}

/**
 * Every personal record in the journal, oldest first. The first time a movement is logged sets a
 * baseline and is not counted as a record.
 */
export function findRecords(sessions) {
  const bests = new Map();
  const records = [];
  for (const session of sortSessions(sessions)) {
    for (const entry of session.exercises) {
      const best = bestSet(entry);
      if (!best) continue;
      const key = keyOf(entry, session.unit);
      const previous = bests.get(key);
      if (previous && previous.loaded === best.loaded && best.value > previous.value + 1e-9) {
        records.push({ date: session.date, sessionId: session.id, exerciseId: entry.exerciseId, variantId: entry.variantId, unit: session.unit, load: best.load, reps: best.reps, value: best.value, previous });
      }
      if (!previous || best.value > previous.value || previous.loaded !== best.loaded) bests.set(key, best);
    }
  }
  return records;
}

export const recordsIn = (sessions, sessionId) => findRecords(sessions).filter(record => record.sessionId === sessionId);

const GROUPS = [
  ['Hamstrings', /hamstring/i], ['Glutes', /glute/i], ['Quads', /quad/i], ['Calves', /calves/i], ['Chest', /chest/i], ['Back', /back/i],
  ['Shoulders', /shoulder|delt/i], ['Biceps', /bicep/i], ['Triceps', /tricep/i], ['Abs', /abs/i],
];
/** Muscle groups an exercise counts toward, from its original "muscle" label. */
export function groupsOf(exerciseId) {
  const label = EXERCISES[exerciseId]?.muscle ?? '';
  return GROUPS.filter(([, test]) => test.test(label)).map(([name]) => name);
}
export const LEG_GROUPS = Object.freeze(['Hamstrings', 'Glutes', 'Quads', 'Calves']);

const mondayOf = day => { const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const shift = (day, days) => { const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Completed sets per muscle group for each of the last `weeks` Monday weeks, oldest first. */
export function weeklySets(sessions, today, weeks = 6) {
  const start = mondayOf(today);
  const out = Array.from({ length: weeks }, (_, index) => ({ week: shift(start, -7 * (weeks - 1 - index)), sets: {} }));
  const byWeek = new Map(out.map(row => [row.week, row]));
  for (const session of sessions) {
    const row = byWeek.get(mondayOf(session.date));
    if (!row) continue;
    for (const entry of session.exercises) {
      const done = entry.sets.filter(set => set.completed).length;
      for (const group of groupsOf(entry.exerciseId)) row.sets[group] = (row.sets[group] ?? 0) + done;
    }
  }
  return out;
}

/** Top-set history for one movement (any variant), oldest first. */
export function liftHistory(sessions, exerciseId, limit = 8) {
  const rows = [];
  for (const session of sortSessions(sessions)) {
    const entry = session.exercises.find(item => item.exerciseId === exerciseId);
    const best = entry && bestSet(entry);
    if (best) rows.push({ date: session.date, unit: session.unit, variantId: entry.variantId, ...best });
  }
  return rows.slice(-limit);
}

/** The most recent finished session of the same template: the "last comparable session". */
export function lastComparable(sessions, sessionId, beforeDate = '9999-12-31') {
  return sortSessions(sessions).filter(session => session.sessionId === sessionId && session.date <= beforeDate).at(-1) ?? null;
}

export function sessionStats(session) {
  let sets = 0; let volume = 0;
  for (const entry of session.exercises) for (const set of entry.sets) if (set.completed) { sets += 1; volume += set.load * set.reps; }
  return { sets, volume, exercises: session.exercises.length };
}

export const draftProgress = draft => {
  let done = 0; let total = 0;
  for (const entry of draft.exercises) { total += entry.sets.length; done += entry.sets.filter(set => set.completed).length; }
  return { done, total };
};
