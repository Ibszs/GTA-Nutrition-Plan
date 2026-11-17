// Movement plan engine. Pure: takes saved movement state and context, returns what to do today,
// what changes after feedback, and a factual recap. Sessions are counted, not dated, so a missed
// day simply resumes at the next session.

import { EX, LANES } from '../data/exercises.js';

export const CHECKS = Object.freeze([
  { id: 'squat', label: 'An easy bodyweight squat feels', lo: 'Awkward', hi: 'Easy' },
  { id: 'stairs', label: 'Walking down stairs feels', lo: 'Careful', hi: 'Easy' },
  { id: 'balance', label: 'On one leg, near a wall, I feel', lo: 'Unsure', hi: 'Steady' },
  { id: 'comfort', label: 'Moving around today feels', lo: 'Stiff or sore', hi: 'Comfortable' },
]);
export const MEASURES = Object.freeze([
  { id: 'holdL', label: 'One-leg hold, left', unit: 's', max: 60, hint: 'Fingertip support, eyes open. Stop at 30.' },
  { id: 'holdR', label: 'One-leg hold, right', unit: 's', max: 60, hint: 'Same rules as the left.' },
  { id: 'wallL', label: 'Knee-to-wall, left', unit: 'cm', max: 25, hint: 'Furthest toe-to-wall distance with the heel down.' },
  { id: 'wallR', label: 'Knee-to-wall, right', unit: 'cm', max: 25, hint: 'Same rules as the left.' },
]);

export const PLANS = Object.freeze({
  week: { id: 'week', name: '7-day start', sessions: 7, about: 'Seven short sessions. Day 1 sets up, day 6 is lighter, day 7 is a retest and a choice.' },
  month: { id: 'month', name: '30-day plan', sessions: 20, about: 'Twenty sessions across about thirty days: five a week, two days off. A check-in every fifth session.' },
});

/** Drills from a lane by position, wrapping past the end. A repeat is replaced by the next unused drill, so a day never lists one twice. */
const pick = (lane, indexes) => {
  const order = LANES[lane].order; const out = [];
  for (const index of indexes) {
    let at = index % order.length;
    for (let tries = 0; out.includes(order[at]) && tries < order.length; tries += 1) at = (at + 1) % order.length;
    if (!out.includes(order[at])) out.push(order[at]);
  }
  return out;
};
const unique = list => [...new Set(list)];

/** The session templates for a plan: which drills, in what order, and what kind of day it is. */
export function buildSessions(kind, primary, secondary = null) {
  const P = indexes => pick(primary, indexes);
  const S = indexes => (secondary ? pick(secondary, indexes) : []);
  const second = secondary ? LANES[secondary].short : null;
  const first = LANES[primary].short;
  if (kind === 'week') {
    return [
      { kind: 'first', title: 'Setup and first practice', items: P([0, 1, 2]) },
      { kind: 'focus', title: `${first} focus`, items: P([0, 1, 2, 3]) },
      { kind: 'focus', title: secondary ? `${second} focus` : `${first}, second pass`, items: secondary ? unique([...S([0, 1, 2]), ...P([1])]) : P([1, 2, 3, 4]) },
      { kind: 'focus', title: `${first} focus`, items: P([1, 2, 3, 4]) },
      { kind: 'focus', title: secondary ? 'Both, mixed' : `${first}, mixed`, items: secondary ? unique([...P([0, 3]), ...S([0, 2])]) : P([0, 2, 3, 4]) },
      { kind: 'light', title: 'Lighter day, or catch up', items: unique([...P([0, 1]), ...(secondary ? S([0]) : P([2]))]) },
      { kind: 'retest', title: 'Retest and choose', items: P([0, 1]) },
    ];
  }
  const block = week => [
    { kind: 'focus', title: `${first} focus`, items: P([week, week + 1, week + 2, week + 3]) },
    { kind: 'focus', title: secondary ? `${second} focus` : `${first}, second pass`, items: secondary ? unique([...S([week, week + 1, week + 2]), ...P([week + 1])]) : P([week + 1, week + 2, week + 3, week + 4]) },
    { kind: 'focus', title: `${first} focus`, items: P([week + 1, week + 2, week + 3, week + 4]) },
    { kind: 'focus', title: secondary ? 'Both, mixed' : `${first}, mixed`, items: secondary ? unique([...P([week, week + 3]), ...S([week, week + 2])]) : P([week, week + 2, week + 3, week + 4]) },
    { kind: week === 3 ? 'retest' : 'checkin', title: week === 3 ? 'Final retest and choose' : 'Lighter day and check-in', items: unique([...P([0, 1]), ...(secondary ? S([0]) : [])]) },
  ];
  return [0, 1, 2, 3].flatMap(block);
}

/** Seconds a dose takes, with short rests between sets. */
export function doseSeconds(dose) {
  const sides = dose.each ? 2 : 1;
  const work = dose.hold ? dose.sets * dose.hold * sides : dose.sets * dose.reps * (dose.pace ?? 4) * sides;
  return work + Math.max(0, dose.sets * sides - 1) * 12 + 8;
}
export const doseText = dose => `${dose.sets} × ${dose.hold ? `${dose.hold} s` : `${dose.reps}`}${dose.each ? ' each side' : ''}`;

const hasBand = level => /band/i.test(level.name);
const fits = (exercise, equipment) => exercise.equip.every(item => equipment[item] !== false);

/**
 * Today's session, adjusted for equipment, lifting and anything paused.
 * move: saved state { plan, levels, streaks, ease, paused, setup }
 * context: { legDay, upperDay }
 */
export function todaySession(move, context = {}) {
  const plan = move.plan;
  if (!plan) return null;
  const templates = buildSessions(plan.kind, plan.primary, plan.secondary);
  const index = Math.min(plan.done, templates.length - 1);
  const template = templates[index];
  const equipment = move.setup?.equipment ?? {};
  const why = [];
  const light = template.kind === 'light' || template.kind === 'checkin';
  let ids = [...template.items];

  ids = ids.map(id => {
    const exercise = EX[id];
    if (fits(exercise, equipment)) return id;
    const swap = [...LANES[exercise.lane].order, ...LANES[plan.primary].order].find(other => other !== id && !ids.includes(other) && fits(EX[other], equipment));
    why.push(swap ? `${exercise.name} needs ${exercise.equip.find(item => equipment[item] === false)}, so ${EX[swap].name.toLowerCase()} stands in.` : `${exercise.name} is left out: it needs equipment you switched off.`);
    return swap ?? null;
  }).filter(Boolean);

  if (context.legDay) {
    const before = ids.length;
    ids = ids.map(id => {
      if (!EX[id].legLoad) return id;
      const swap = LANES[EX[id].lane].order.find(other => !EX[other].legLoad && !ids.includes(other) && fits(EX[other], equipment));
      return swap ?? null;
    }).filter(Boolean);
    if (ids.length !== before || template.items.some(id => EX[id].legLoad)) why.push('Leg day in the gym, so the loaded leg drills are swapped for control and mobility work.');
  }
  ids = unique(ids);

  const items = ids.map(id => {
    const exercise = EX[id];
    const paused = Boolean(move.paused?.[id]);
    let level = paused ? 0 : Math.min(move.levels?.[id] ?? 0, exercise.levels.length - 1);
    while (level > 0 && hasBand(exercise.levels[level]) && equipment.band !== true) level -= 1;
    let dose = { ...(exercise.levels[level].dose ?? exercise.dose) };
    if (light || paused) dose.sets = 1;
    else if (move.ease?.[id] === 'down') { dose.sets = Math.max(1, dose.sets - 1); why.push(`${exercise.name}: one set fewer, because last time felt harder.`); }
    if (context.upperDay && exercise.lane === 'scap' && exercise.load !== 'none' && dose.sets > 1 && !light) { dose.sets = 1; why.push(`${exercise.name}: one set only, since you are training upper body today.`); }
    if (paused) why.push(`${exercise.name}: easiest version only, progression paused since ${move.paused[id].on}.`);
    return { id, level, levelName: exercise.levels[level].name, change: exercise.levels[level].change, dose, seconds: doseSeconds(dose), paused };
  });
  if (light) why.unshift('Lighter day: one set of each.');

  const shortItems = items.slice(0, 2).map(item => { const dose = { ...EX[item.id].short }; return { ...item, dose, seconds: doseSeconds(dose) }; });
  const total = items.reduce((sum, item) => sum + item.seconds, 0);
  const shortTotal = shortItems.reduce((sum, item) => sum + item.seconds, 0);
  return {
    n: index + 1, of: templates.length, kind: template.kind, title: template.title, why: unique(why),
    items, minutes: Math.max(1, Math.round(total / 60)), short: { items: shortItems, minutes: Math.max(1, Math.round(shortTotal / 60)) },
    finished: plan.done >= templates.length,
  };
}

/**
 * What a post-session answer changes. Returns the new { levels, streaks, ease, paused } and
 * plain-language notes about next time.
 * feel: 'easier' | 'same' | 'harder' | 'off'; offIds: drills that felt off
 */
export function applyFeedback(move, session, feel, offIds = [], date = '') {
  const levels = { ...(move.levels ?? {}) }; const streaks = { ...(move.streaks ?? {}) };
  const ease = { ...(move.ease ?? {}) }; const paused = { ...(move.paused ?? {}) };
  const notes = [];
  const band = move.setup?.equipment?.band === true;
  for (const item of session.items) {
    const exercise = EX[item.id];
    delete ease[item.id];
    if (feel === 'off') {
      if (offIds.length && !offIds.includes(item.id)) continue;
      paused[item.id] = { on: date, level: levels[item.id] ?? 0 }; levels[item.id] = 0; streaks[item.id] = 0;
      notes.push(`${exercise.name}: progression paused. Next time it appears in its easiest version, one set.`);
      continue;
    }
    if (paused[item.id]) continue;
    if (feel === 'easier') {
      streaks[item.id] = (streaks[item.id] ?? 0) + 1;
      const next = (levels[item.id] ?? 0) + 1;
      const nextLevel = exercise.levels[next];
      if (streaks[item.id] >= 2 && nextLevel && (!hasBand(nextLevel) || band)) {
        levels[item.id] = next; streaks[item.id] = 0;
        notes.push(`${exercise.name} moves up to "${nextLevel.name}": two sessions in a row felt easier.`);
      } else if (nextLevel && (!hasBand(nextLevel) || band)) notes.push(`${exercise.name}: one more easier session and it moves up to "${nextLevel.name}".`);
    } else if (feel === 'harder') {
      streaks[item.id] = 0;
      if ((levels[item.id] ?? 0) > 0) { levels[item.id] -= 1; notes.push(`${exercise.name} steps back to "${exercise.levels[levels[item.id]].name}".`); }
      else { ease[item.id] = 'down'; notes.push(`${exercise.name}: one set fewer next time.`); }
    } else streaks[item.id] = 0;
  }
  if (feel === 'same') notes.push('Same again next time. Holding a level is progress when the reps are cleaner.');
  if (feel === 'easier' && !notes.length) notes.push('Noted. These drills are already at their top version.');
  return { levels, streaks, ease, paused, notes };
}

/** Clear a pause and return the drill to where it was. */
export function resumeDrill(move, id) {
  const paused = { ...(move.paused ?? {}) }; const levels = { ...(move.levels ?? {}) };
  if (paused[id]) { levels[id] = paused[id].level ?? 0; delete paused[id]; }
  return { paused, levels };
}

const tally = list => list.reduce((counts, value) => ({ ...counts, [value]: (counts[value] ?? 0) + 1 }), {});

/** Factual summary of a plan so far: counts and differences, no judgement. */
export function recap(move) {
  const plan = move.plan;
  if (!plan) return null;
  const sessions = (move.sessions ?? []).filter(session => session.planId === plan.id);
  const seconds = sessions.reduce((sum, session) => sum + (session.seconds ?? 0), 0);
  const days = unique(sessions.map(session => session.date));
  const checks = (move.checks ?? []).filter(check => check.planId === plan.id).sort((a, b) => a.at.localeCompare(b.at));
  const first = checks[0]; const last = checks.length > 1 ? checks.at(-1) : null;
  const changes = [];
  if (first && last) {
    for (const item of CHECKS) if (first[item.id] && last[item.id]) changes.push({ label: item.label, from: first[item.id], to: last[item.id], unit: '/5' });
    for (const item of MEASURES) if (Number.isFinite(first[item.id]) && Number.isFinite(last[item.id])) changes.push({ label: item.label, from: first[item.id], to: last[item.id], unit: ` ${item.unit}` });
  }
  return {
    sessions: sessions.length, of: PLANS[plan.kind].sessions, minutes: Math.round(seconds / 60), short: sessions.filter(session => session.short).length,
    days: days.length, feels: tally(sessions.map(session => session.feel).filter(Boolean)), changes, hasBaseline: Boolean(first), hasRetest: Boolean(last),
    levelUps: Object.entries(move.levels ?? {}).filter(([, level]) => level > 0).map(([id, level]) => ({ name: EX[id].name, level: EX[id].levels[level].name })),
    paused: Object.keys(move.paused ?? {}).map(id => EX[id].name),
  };
}

export const newPlan = (kind, primary, secondary, date, id) => ({ id, kind, primary, secondary: secondary && secondary !== primary ? secondary : null, startedOn: date, done: 0 });
