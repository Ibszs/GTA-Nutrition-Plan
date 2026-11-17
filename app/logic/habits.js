// Habit maths. Pure. A habit is due on chosen weekdays and is either a yes/no or a count.
// log shape: { 'YYYY-MM-DD': { [habitId]: number | 'skip' } }

const asDate = day => new Date(`${day}T12:00:00`);
const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (day, count) => { const d = asDate(day); d.setDate(d.getDate() + count); return iso(d); };
const dow = day => (asDate(day).getDay() + 6) % 7;
const weekStart = day => addDays(day, -dow(day));

/** Editable suggestions offered on first use. Clearly marked as suggestions in the UI. */
export const SEEDS = Object.freeze([
  { name: 'In bed on time', kind: 'check', target: 1, unit: '', days: [0, 1, 2, 3, 4, 5, 6], tiny: 'Lights down and phone on the charger, even if sleep comes later.' },
  { name: 'Read', kind: 'count', target: 10, unit: 'min', days: [0, 1, 2, 3, 4, 5, 6], tiny: 'One page counts.' },
  { name: 'Short walk', kind: 'check', target: 1, unit: '', days: [0, 1, 2, 3, 4, 5, 6], tiny: 'To the end of the street and back.' },
  { name: 'Ten-minute tidy', kind: 'check', target: 1, unit: '', days: [0, 2, 4, 6], tiny: 'One surface.' },
  { name: 'Movement break', kind: 'count', target: 2, unit: 'breaks', days: [0, 1, 2, 3, 4], tiny: 'Stand up and reach overhead once.' },
]);

export const valueOn = (log, habitId, day) => log?.[day]?.[habitId];
export const isDue = (habit, day) => !habit.paused && !habit.archived && habit.days.includes(dow(day)) && day >= (habit.createdOn ?? '0000-00-00');
export const isSkipped = (log, habit, day) => valueOn(log, habit.id, day) === 'skip';
export function isDone(log, habit, day) {
  const value = valueOn(log, habit.id, day);
  return typeof value === 'number' && value >= (habit.kind === 'count' ? habit.target : 1);
}
export const countOn = (log, habit, day) => { const value = valueOn(log, habit.id, day); return typeof value === 'number' ? value : 0; };

function withValue(log, habitId, day, value) {
  const next = { ...log, [day]: { ...(log[day] ?? {}) } };
  if (value === undefined || value === 0) { delete next[day][habitId]; if (!Object.keys(next[day]).length) delete next[day]; }
  else next[day][habitId] = value;
  return next;
}

/** One tap: yes/no toggles; a count goes up by one and wraps to zero once past the target. */
export function tap(log, habit, day) {
  const current = countOn(log, habit, day);
  if (habit.kind !== 'count') return withValue(log, habit.id, day, current >= 1 ? 0 : 1);
  return withValue(log, habit.id, day, current >= habit.target ? 0 : current + 1);
}
export const setCount = (log, habit, day, value) => withValue(log, habit.id, day, Math.max(0, Math.round(value)));
export const skip = (log, habit, day) => withValue(log, habit.id, day, isSkipped(log, habit, day) ? 0 : 'skip');

/** Seven cells for the week containing `day`. */
export function weekPattern(habit, log, day) {
  const start = weekStart(day);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return { date, due: isDue(habit, date), done: isDone(log, habit, date), skipped: isSkipped(log, habit, date), value: countOn(log, habit, date), future: date > day };
  });
}

/**
 * Current run of due days done, ending today or yesterday. Skipped days and days that are not
 * due neither add to it nor break it. Today only breaks it once it is over.
 */
export function streak(habit, log, today) {
  let run = 0; let day = today; let guard = 0;
  while (guard < 400) {
    guard += 1;
    if (day < (habit.createdOn ?? '0000-00-00')) break;
    if (isDue(habit, day) && !isSkipped(log, habit, day)) {
      if (isDone(log, habit, day)) run += 1;
      else if (day !== today) break;
    }
    day = addDays(day, -1);
  }
  return run;
}

/** Share of due days done over the last `span` days, skips excluded. */
export function rate(habit, log, today, span = 28) {
  let due = 0; let done = 0;
  for (let offset = 0; offset < span; offset += 1) {
    const day = addDays(today, -offset);
    if (!isDue(habit, day) || isSkipped(log, habit, day)) continue;
    if (day === today && !isDone(log, habit, day)) continue;
    due += 1; if (isDone(log, habit, day)) done += 1;
  }
  return { due, done, ratio: due ? done / due : null };
}

/** After a missed day: a next action, never a verdict. */
export function nextStep(habit, log, today) {
  if (!isDue(habit, today) || isDone(log, habit, today) || isSkipped(log, habit, today)) return null;
  let missed = 0; let day = addDays(today, -1);
  for (let guard = 0; guard < 14; guard += 1) {
    if (isDue(habit, day) && !isSkipped(log, habit, day)) { if (isDone(log, habit, day)) break; missed += 1; }
    day = addDays(day, -1);
  }
  if (!missed) return null;
  const tiny = habit.tiny ? ` Smallest version: ${habit.tiny.charAt(0).toLowerCase()}${habit.tiny.slice(1)}` : '';
  return missed === 1 ? `Yesterday did not happen. Today is a normal day for it.${tiny}` : `${missed} days since the last one. Start again with the small version; the count restarts from here.${tiny}`;
}

export function todayList(habits, log, day) {
  return habits.filter(habit => isDue(habit, day)).map(habit => ({ habit, done: isDone(log, habit, day), skipped: isSkipped(log, habit, day), value: countOn(log, habit, day) }));
}
