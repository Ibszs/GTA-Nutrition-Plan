// Shared actions and derived facts used by several screens: what is planned today, what happened
// on a given day, logging the body numbers, cooking, stickers.

import * as store from './store.js';
import { today, addDays, dayDiff, uid, toast } from './ui.js';
import { getSessionTemplate } from '../assets/training-program.js';
import { STICKER_BY_ID } from './data/fun.js';
import { RECIPE_BY_ID } from './data/recipes.js';
import { todayList } from './logic/habits.js';
import { todaySession } from './logic/movement.js';
import { planDay, isLegSession } from './logic/plans.js';

export const whey = () => store.get('profile').whey;
export const go = route => { location.hash = `#/${route}`; };

/** Give a sticker. Returns true the first time it is earned. Silent when the playful layer is off. */
export function award(id, quiet = false) {
  const fun = store.get('fun');
  if (!fun.enabled || !STICKER_BY_ID[id]) return false;
  const first = !fun.stickers[id];
  store.update('fun', next => { const record = next.stickers[id] ?? { n: 0, first: today() }; record.n += 1; record.last = today(); next.stickers[id] = record; });
  if (first && !quiet && !fun.hidden?.toasts) toast(`New sticker: ${STICKER_BY_ID[id].name}`, { action: 'See it', onAction: () => go('fun') });
  return first;
}

/** Note that something was logged today. Handles the first-ever and comeback stickers. */
export function touch() {
  const fun = store.get('fun');
  const last = fun.lastActive;
  if (last === today()) return;
  store.update('fun', next => { next.lastActive = today(); });
  if (!last) award('first-frame');
  else if (dayDiff(today(), last) >= 3) award('comeback');
}

export function logBody(day, patch) {
  store.update('body', body => {
    const entry = { ...(body.entries[day] ?? {}), ...patch };
    for (const key of Object.keys(entry)) if (entry[key] === null || entry[key] === '' || entry[key] === undefined) delete entry[key];
    if (Object.keys(entry).length) body.entries[day] = entry; else delete body.entries[day];
  });
  if (Object.hasOwn(patch, 'weight')) {
    const entries = store.get('body').entries;
    const latest = Object.keys(entries).filter(key => Number.isFinite(entries[key].weight)).sort().at(-1);
    if (latest) store.update('profile', profile => { profile.weight = entries[latest].weight; });
  }
  touch();
}

/** Today's planned gym session and any draft in progress. */
export function trainingInfo(day = today()) {
  const read = store.training.read();
  const state = read.value;
  if (read.error) return { error: read.error, state, saved: true, planned: null, template: null, draft: null };
  const train = store.get('train');
  let planned = null;
  try { planned = planDay(state, train, day); } catch { planned = null; }
  const template = planned?.sessionId ? getSessionTemplate(planned.sessionId) : null;
  const isSession = planned?.kind === 'session';
  const legs = isSession && isLegSession(train, planned.sessionId);
  return {
    error: null, state, saved: read.saved, planned, template, draft: state.draft, train,
    draftTemplate: state.draft ? getSessionTemplate(state.draft.sessionId) : null,
    legDay: legs, upperDay: isSession && !legs,
  };
}

export function movementToday() {
  const move = store.get('move');
  if (!move.plan) return { move, session: null };
  const info = trainingInfo();
  return { move, session: todaySession(move, { legDay: info.legDay, upperDay: info.upperDay }), legDay: info.legDay, upperDay: info.upperDay };
}

/** Everything logged on one day, for the week strip, the contact sheet and the replay. */
export function dayActivity(day) {
  const training = store.training.read().value;
  const train = (training?.sessions ?? []).filter(session => session.date === day);
  const move = store.get('move').sessions.filter(session => session.date === day);
  const kitchen = store.get('kitchen');
  const cooked = Object.entries(kitchen.recipes).filter(([, record]) => record.cooked?.includes(day)).map(([id]) => id).filter(id => RECIPE_BY_ID[id]);
  const habits = store.get('habits');
  const list = todayList(habits.habits, habits.log, day);
  const body = store.get('body').entries[day] ?? null;
  const done = list.filter(item => item.done).length;
  return { day, train, move, cooked, habits: { due: list.length, done }, body, kinds: [train.length > 0, cooked.length > 0, move.length > 0, done > 0].filter(Boolean).length };
}

export const recipeRecord = id => store.get('kitchen').recipes[id] ?? {};
export function updateRecipe(id, change) {
  store.update('kitchen', kitchen => { const record = kitchen.recipes[id] ?? {}; change(record); kitchen.recipes[id] = record; });
}

export function markCooked(id, { version = 'std', day = today() } = {}) {
  updateRecipe(id, record => { record.cooked = [...new Set([...(record.cooked ?? []), day])].sort(); record.lastVersion = version; });
  touch(); award('cooked'); if (version === 'light') award('lighter');
}

export function addBatch({ recipeId, part, portions, where = 'fridge', madeOn = today() }) {
  const id = uid();
  store.update('kitchen', kitchen => { kitchen.batches.push({ id, recipeId, part, portions, left: portions, where, madeOn, frozenOn: where === 'freezer' ? madeOn : null, texture: null, note: '' }); });
  award('batch');
  return id;
}

/** Days a refrigerated batch has left under Health Canada's 2 to 3 day guidance (Forme flags at day 3). */
export function batchClock(batch, day = today()) {
  if (batch.where === 'freezer') return { where: 'freezer', days: dayDiff(day, batch.frozenOn ?? batch.madeOn), state: 'frozen' };
  const age = dayDiff(day, batch.thawedOn ?? batch.madeOn);
  const limit = batch.thawedOn ? 1 : 3;
  return { where: 'fridge', age, left: limit - age, state: age > limit ? 'over' : age >= limit ? 'last' : age >= limit - 1 ? 'soon' : 'fine', thawed: Boolean(batch.thawedOn) };
}
export const useBy = batch => addDays(batch.thawedOn ?? batch.madeOn, batch.thawedOn ? 1 : 3);

/** Average texture rating a recipe has earned as a leftover, or null. */
export function textureScore(recipeId) {
  const ratings = store.get('kitchen').batches.filter(batch => batch.recipeId === recipeId && Number.isFinite(batch.texture)).map(batch => batch.texture);
  return ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null;
}
