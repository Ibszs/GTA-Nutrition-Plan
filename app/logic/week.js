// Sample weeks, swaps, portion levers, day kinds and the grocery list. Pure: no DOM, no storage.
// One template feeds both goal modes, so the grocery list barely changes when the mode does.
// Both modes aim for 1 g of fat to 2 g of protein. Lean gain cooks each recipe the leanest way it
// needs to get there, with an evening extra; recomp cooks the lighter versions with smaller starch
// portions. Only versions and portion options a recipe already has are used. Anything the user
// changes is stored as a small override on top.

import { FOODS, AISLES } from '../data/foods.js';
import { RECIPE_BY_ID, RECIPES } from '../data/recipes.js';
import { ZERO, add, scale, recipeTotals, resolveLines, DEFAULT_WHEY, leanDefault, fatProtein } from './nutrition.js';

export const SLOTS = Object.freeze([
  { id: 'breakfast', label: 'Breakfast' }, { id: 'lunch', label: 'Shift lunch' }, { id: 'snack', label: 'Snack' }, { id: 'dinner', label: 'Dinner' }, { id: 'extra', label: 'Evening extra' },
]);
export const DAYS = Object.freeze(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

/** The shared sample week. `cook` says what actually gets cooked that day. */
export const TEMPLATE = Object.freeze([
  { cook: 'Sunday prep covers today: oats, burritos and spiced chicken are ready. Wraps tonight, 25 minutes.',
    slots: { breakfast: 'overnight-oats', lunch: 'pita-box', snack: 'house-shake', dinner: 'crispy-chicken-wrap', extra: 'yogurt-bark' } },
  { cook: 'Fifteen-minute night: prepped chicken becomes noodles.',
    slots: { breakfast: 'breakfast-burritos', lunch: 'shawarma-plate', snack: 'house-shake', dinner: 'chili-noodles', extra: 'masala-popcorn' } },
  { cook: 'Rest day, so there is time for a pot of keema. It covers tomorrow’s lunch.',
    slots: { breakfast: 'overnight-oats', lunch: 'pita-box', snack: 'yogurt-bark', dinner: 'keema-matar', extra: 'house-shake' } },
  { cook: 'Burger bowls, 20 minutes. Lunch is last night’s keema.',
    slots: { breakfast: 'breakfast-burritos', lunch: 'keema-matar', snack: 'house-shake', dinner: 'smash-burger-bowl', extra: 'masala-popcorn' } },
  { cook: 'Lunch is the store-run plate: no cooking. Air-fryer bowls after legs.',
    slots: { breakfast: 'overnight-oats', lunch: 'store-run', snack: 'house-shake', dinner: 'beef-sweet-potato-bowl', extra: 'yogurt-bark' } },
  { cook: 'Butter chicken batch: 40 minutes. Freeze two portions before the cream goes in.',
    slots: { breakfast: 'breakfast-burritos', lunch: 'beef-sweet-potato-bowl', snack: 'house-shake', dinner: 'butter-chicken', extra: 'masala-popcorn' } },
  { cook: 'One-pot pasta tonight covers Monday and Tuesday lunches. Prep oats, burritos and chicken for the week.',
    slots: { breakfast: 'breakfast-burritos', lunch: 'butter-chicken', snack: 'house-shake', dinner: 'cheeseburger-pasta', extra: 'yogurt-bark' } },
]);

const STARCH_LEVERS = { 'shawarma-plate': { rice: 0.75 }, 'butter-chicken': { rice: 0.75 }, 'keema-matar': { roti: 0.5 }, 'cheeseburger-pasta': { pasta: 0.75 }, 'chili-noodles': { noodles: 1 } };
export const MODE_RULES = Object.freeze({
  'lean-gain': { version: 'lean', levers: {}, note: 'Each recipe is cooked the leanest way it needs to reach 1 g of fat for every 2 g of protein. Full starch portions, an evening extra every day.' },
  recomp: { version: 'light', levers: STARCH_LEVERS, note: 'Lighter versions where one exists, smaller rice, roti and pasta portions, same groceries.' },
});
/** Every recipe exactly as written, for comparison. */
export const AS_WRITTEN = Object.freeze({ version: 'std', levers: {}, lean: false });

/** Day kinds swap a whole day for something easier. They are still editable slot by slot. */
export const DAY_KINDS = Object.freeze({
  'low-appetite': { name: 'Low appetite day', note: 'Drinkable, cold and small. Nothing heavy until dinner, and dinner is soft.',
    slots: { breakfast: 'house-shake', lunch: 'overnight-oats', snack: 'yogurt-bark', dinner: 'cheeseburger-pasta', extra: 'house-shake' } },
  'cant-cook': { name: 'Cannot cook today', note: 'Nothing here needs a stove. The fastest realistic option at every meal.',
    slots: { breakfast: 'house-shake', lunch: 'pita-box', snack: 'yogurt-bark', dinner: 'store-run', extra: 'overnight-oats' } },
});

const slotKey = (dayIndex, slotId) => `${dayIndex}:${slotId}`;

/**
 * The week actually planned for a mode.
 * overrides: { 'day:slot': null | { r, ver?, p?, levers?, v? } }, kinds: { [dayIndex]: kindId }
 * Returns 7 days of { index, kind, cook, slots: [{ slot, key, entry | null, custom }] }.
 */
export function effectiveWeek(modeId, overrides = {}, kinds = {}, custom = null) {
  if (!MODE_RULES[modeId]) throw new RangeError(`Unknown goal mode: ${modeId}`);
  const rules = custom ?? MODE_RULES[modeId];
  return TEMPLATE.map((day, index) => {
    const kind = DAY_KINDS[kinds[index]] ? kinds[index] : null;
    const base = kind ? DAY_KINDS[kind].slots : day.slots;
    const slots = SLOTS.map(({ id }) => {
      const key = slotKey(index, id);
      if (Object.hasOwn(overrides, key)) {
        const custom = overrides[key];
        if (custom === null || !RECIPE_BY_ID[custom.r]) return { slot: id, key, entry: null, custom: true };
        return { slot: id, key, entry: normalise(custom, rules), custom: true };
      }
      const recipeId = base[id];
      if (!recipeId) return { slot: id, key, entry: null, custom: false };
      return { slot: id, key, entry: normalise({ r: recipeId }, rules), custom: false };
    });
    return { index, name: DAYS[index], kind, cook: kind ? DAY_KINDS[kind].note : day.cook, slots };
  });
}

function normalise(entry, rules) {
  const recipe = RECIPE_BY_ID[entry.r];
  // The lean default is the smallest existing change that reaches 1 to 2. An explicit choice on the slot wins.
  const lean = rules.lean === false ? { version: 'std', levers: {} } : leanDefault(recipe);
  const ruled = rules.version === 'lean' ? lean.version : rules.version;
  const version = entry.ver ?? (recipe.lighter ? ruled : 'std');
  return { r: entry.r, v: entry.v ?? null, ver: recipe.lighter ? version : 'std', p: entry.p ?? 1, levers: { ...lean.levers, ...(rules.levers[entry.r] ?? {}), ...(entry.levers ?? {}) } };
}

/** Nutrition for one planned slot: one serving of the recipe times the portion multiplier. */
export function slotTotals(entry, whey = DEFAULT_WHEY) {
  if (!entry) return { ...ZERO };
  return scale(recipeTotals(RECIPE_BY_ID[entry.r], { version: entry.ver, levers: entry.levers }, whey).per, entry.p);
}

export function dayTotals(day, whey = DEFAULT_WHEY) {
  return day.slots.reduce((sum, slot) => add(sum, slotTotals(slot.entry, whey)), { ...ZERO });
}

export function weekSummary(week, whey = DEFAULT_WHEY) {
  const days = week.map(day => dayTotals(day, whey));
  const total = days.reduce((sum, day) => add(sum, day), { ...ZERO });
  let oilG = 0;
  for (const day of week) for (const slot of day.slots) {
    if (!slot.entry) continue;
    const totals = recipeTotals(RECIPE_BY_ID[slot.entry.r], { version: slot.entry.ver, levers: slot.entry.levers }, whey);
    oilG += totals.oil.perServingG * slot.entry.p;
  }
  return { days, total, average: scale(total, 1 / 7), oilG };
}

/**
 * Practical ways to close the gap between a day and its target. Each move says what it changes
 * and by how much; nothing is applied until the user taps it.
 */
export function leverMoves(day, target, whey = DEFAULT_WHEY) {
  const totals = dayTotals(day, whey);
  const gap = target.kcal - totals.kcal;
  const moves = [];
  if (Math.abs(gap) < 120) return { gap, moves };
  const wantMore = gap > 0;
  for (const slot of day.slots) {
    const entry = slot.entry;
    if (!entry) {
      if (wantMore && (slot.slot === 'extra' || slot.slot === 'snack')) {
        for (const id of ['house-shake', 'yogurt-bark']) {
          const lean = leanDefault(RECIPE_BY_ID[id], whey);
          const kcal = slotTotals({ r: id, ver: lean.version, p: 1, levers: lean.levers }, whey).kcal;
          moves.push({ key: slot.key, label: `Add ${RECIPE_BY_ID[id].short.toLowerCase()} as ${slot.slot === 'extra' ? 'an evening extra' : 'a snack'}`, delta: kcal, change: { r: id } });
        }
      }
      continue;
    }
    const recipe = RECIPE_BY_ID[entry.r];
    const nowAll = slotTotals(entry, whey); const now = nowAll.kcal; const nowFp = fatProtein(nowAll);
    for (const lever of recipe.levers ?? []) {
      const current = entry.levers[lever.id] ?? 1;
      const sorted = [...lever.options].sort((a, b) => a[1] - b[1]);
      const next = wantMore ? sorted.find(option => option[1] > current + 1e-6) : [...sorted].reverse().find(option => option[1] < current - 1e-6);
      if (!next) continue;
      const afterAll = slotTotals({ ...entry, levers: { ...entry.levers, [lever.id]: next[1] } }, whey); const after = afterAll.kcal;
      if (Math.abs(after - now) < 15) continue;
      // A bigger portion that pushes the meal further over 1 g fat to 2 g protein is not offered.
      const afterFp = fatProtein(afterAll);
      if (wantMore && afterFp.grade === 'over' && afterFp.ratio < nowFp.ratio) continue;
      moves.push({ key: slot.key, label: `${recipe.short}: ${lever.label.toLowerCase()} to ${next[0].toLowerCase()}`, delta: after - now, change: { ...entry, levers: { ...entry.levers, [lever.id]: next[1] } } });
    }
    if (recipe.lighter) {
      const otherVersion = entry.ver === 'light' ? 'std' : 'light';
      // Never suggest closing a calorie gap with a version that goes over 1 g fat to 2 g protein.
      const other = slotTotals({ ...entry, ver: otherVersion }, whey);
      if ((wantMore && otherVersion === 'std' && fatProtein(other).grade !== 'over') || (!wantMore && otherVersion === 'light')) {
        const after = other.kcal;
        moves.push({ key: slot.key, label: `${recipe.short}: cook the ${otherVersion === 'light' ? 'lighter' : 'standard'} version`, delta: after - now, change: { ...entry, ver: otherVersion } });
      }
    }
    if (!wantMore && slot.slot === 'extra') moves.push({ key: slot.key, label: `Skip the evening extra (${recipe.short.toLowerCase()})`, delta: -now, change: null });
  }
  moves.sort((a, b) => Math.abs(Math.abs(a.delta) - Math.abs(gap)) - Math.abs(Math.abs(b.delta) - Math.abs(gap)));
  return { gap, moves: moves.filter(move => (wantMore ? move.delta > 0 : move.delta < 0)).slice(0, 4) };
}

/** A leftover you rated this low (out of 5) is treated as one to cook fresh rather than pack. */
export const POOR_LEFTOVER = 2;

/**
 * Swap candidates for a slot, best fit first. Learns from saves, ratings, cooks and skips.
 * texture: { [recipeId]: average leftover rating }. Shift lunches are eaten reheated, so a recipe
 * whose leftovers you rated poorly drops down that list and is flagged `reheatsPoorly`.
 */
export function swapOptions(slotId, currentId, memory = {}, whey = DEFAULT_WHEY, texture = {}) {
  const current = currentId ? recipeTotals(RECIPE_BY_ID[currentId], {}, whey).per.kcal : null;
  return RECIPES.filter(recipe => recipe.id !== currentId && recipe.course !== 'base' && recipe.slots.includes(slotId)).map(recipe => {
    const record = memory[recipe.id] ?? {};
    const per = recipeTotals(recipe, {}, whey).per;
    const reheatsPoorly = Number.isFinite(texture[recipe.id]) && texture[recipe.id] <= POOR_LEFTOVER;
    let score = 0;
    if (record.saved) score += 3;
    if (record.rating) score += (record.rating - 3) * 1.5;
    score += Math.min(3, (record.cooked?.length ?? 0)) * 0.8;
    score -= (record.skips ?? 0) * 2;
    if (current) score -= Math.abs(per.kcal - current) / 200;
    if (reheatsPoorly && slotId === 'lunch') score -= 5;
    return { recipe, per, score, delta: current === null ? null : per.kcal - current, reheatsPoorly, lean: leanDefault(recipe, whey) };
  }).sort((a, b) => b.score - a.score);
}

// ---------- groceries ----------
/** How shoppers count some foods: [grams each, singular, plural]. */
const COUNTS = {
  egg: [50, 'egg', 'eggs'], tortilla: [70, 'tortilla', 'tortillas'], pita: [60, 'pita', 'pitas'], roti: [45, 'roti', 'roti'], naan: [90, 'naan', 'naan'], ramen: [85, 'brick', 'bricks'], ramenLight: [85, 'portion', 'portions'],
  garlic: [3, 'clove', 'cloves'], onion: [150, 'onion', 'onions'], redOnion: [120, 'red onion', 'red onions'], tomato: [100, 'tomato', 'tomatoes'], cucumber: [200, 'cucumber', 'cucumbers'],
  avocado: [150, 'avocado', 'avocados'], potato: [150, 'potato', 'potatoes'], sweetPotato: [300, 'sweet potato', 'sweet potatoes'], redPepper: [150, 'pepper', 'peppers'],
  scallion: [15, 'green onion', 'green onions'], lemon: [40, 'lemon', 'lemons'], lime: [25, 'lime', 'limes'], greenChili: [15, 'chili', 'chilies'], riceCooked: [250, 'pouch', 'pouches'], banana: [120, 'banana', 'bananas'],
};

export function shopAmount(foodId, amount) {
  const food = FOODS[foodId];
  const count = COUNTS[foodId];
  if (count) {
    const n = Math.max(1, Math.ceil(amount / count[0] - 0.05));
    return `${n} ${n === 1 ? count[1] : count[2]}`;
  }
  const unit = food.ml ? 'mL' : 'g';
  if (food.trace || food.staple) return amount < 20 ? 'a little' : `${Math.ceil(amount / 5) * 5} ${unit}`;
  if (amount >= 1000) return `${(Math.ceil(amount / 50) * 50 / 1000).toFixed(2).replace(/0$/, '').replace(/\.0$/, '')} ${food.ml ? 'L' : 'kg'}`;
  return `${Math.ceil(amount / 10) * 10} ${unit}`;
}

/**
 * One combined list for the planned week plus any recipes added by hand.
 * adds: [{ r, servings, ver }]. Returns rows grouped by aisle with the recipes each item is for.
 */
export function groceryList(week, adds = []) {
  const totals = new Map();
  const push = (foodId, amount, recipeId) => {
    const row = totals.get(foodId) ?? { food: foodId, amount: 0, recipes: new Set() };
    row.amount += amount; row.recipes.add(recipeId); totals.set(foodId, row);
  };
  for (const day of week) for (const slot of day.slots) {
    if (!slot.entry) continue;
    const recipe = RECIPE_BY_ID[slot.entry.r];
    const factor = slot.entry.p / recipe.yield.n;
    for (const line of resolveLines(recipe, { version: slot.entry.ver, levers: slot.entry.levers })) push(line.f, line.g * factor, recipe.id);
  }
  for (const item of adds) {
    const recipe = RECIPE_BY_ID[item.r];
    if (!recipe) continue;
    const factor = item.servings / recipe.yield.n;
    for (const line of resolveLines(recipe, { version: item.ver ?? 'std' })) push(line.f, line.g * factor, recipe.id);
  }
  const rows = [...totals.values()].map(row => {
    const food = FOODS[row.food];
    return { id: row.food, name: food.name, aisle: food.aisle, staple: food.staple, amount: row.amount, text: shopAmount(row.food, row.amount), recipes: [...row.recipes].map(id => RECIPE_BY_ID[id].short), meat: food.meat };
  });
  const order = aisle => { const index = AISLES.indexOf(aisle); return index < 0 ? 99 : index; };
  rows.sort((a, b) => order(a.aisle) - order(b.aisle) || a.name.localeCompare(b.name));
  return rows;
}

/** Servings of each recipe the week calls for, so batch cooking can be planned. */
export function servingsNeeded(week) {
  const needs = {};
  for (const day of week) for (const slot of day.slots) if (slot.entry) needs[slot.entry.r] = (needs[slot.entry.r] ?? 0) + slot.entry.p;
  return Object.entries(needs).map(([id, servings]) => {
    const recipe = RECIPE_BY_ID[id];
    return { recipe, servings, batches: Math.ceil(servings / recipe.yield.n - 1e-6) };
  }).sort((a, b) => b.servings - a.servings);
}

/** "What can I make with what is in the fridge?" Ranks recipes by how much of the shopping they already cover. */
export function fridgeMatches(onHand) {
  const have = new Set(onHand);
  return RECIPES.filter(recipe => recipe.course !== 'base').map(recipe => {
    const needed = recipe.ingredients.filter(line => !FOODS[line.f].staple && !FOODS[line.f].trace);
    const missing = needed.filter(line => !have.has(line.f));
    const covered = needed.length - missing.length;
    return { recipe, covered, total: needed.length, missing: missing.map(line => FOODS[line.f].name), ratio: needed.length ? covered / needed.length : 0 };
  }).filter(match => match.covered > 0).sort((a, b) => b.ratio - a.ratio || a.missing.length - b.missing.length);
}

/** Foods worth offering in the fridge picker: everything recipes use that is not a pantry staple. */
export const FRIDGE_FOODS = Object.freeze([...new Set(RECIPES.flatMap(recipe => recipe.ingredients.map(line => line.f)))].filter(id => !FOODS[id].staple && !FOODS[id].trace)
  .sort((a, b) => AISLES.indexOf(FOODS[a].aisle) - AISLES.indexOf(FOODS[b].aisle) || FOODS[a].name.localeCompare(FOODS[b].name)));

/**
 * "Pick for me": one committed recommendation from time, energy and what is on hand.
 * Returns the ranked list so the caller can show the runner-up when the first is declined.
 */
export function pickDinner({ minutes = 20, energy = 'ok', onHand = [], memory = {}, exclude = [] } = {}) {
  const have = new Set(onHand);
  return RECIPES.filter(recipe => recipe.slots.includes('dinner') && !exclude.includes(recipe.id)).map(recipe => {
    const record = memory[recipe.id] ?? {};
    const needed = recipe.ingredients.filter(line => !FOODS[line.f].staple && !FOODS[line.f].trace);
    const coverage = needed.length ? needed.filter(line => have.has(line.f)).length / needed.length : 0;
    const time = recipe.time.total;
    let score = 0;
    score += time <= minutes ? 4 : -Math.min(6, (time - minutes) / 5);
    if (energy === 'low') score += (recipe.tags.includes('nocook') ? 3 : 0) + (recipe.time.active <= 10 ? 2 : -2) + (recipe.fallback ? 1 : 0);
    if (energy === 'good') score += recipe.tags.includes('batch') ? 1.5 : 0;
    score += coverage * 5;
    if (record.saved) score += 1.5;
    if (record.rating) score += (record.rating - 3);
    score -= (record.skips ?? 0) * 2;
    const last = record.cooked?.at(-1);
    if (last) { const days = (Date.now() - new Date(`${last}T12:00:00`).getTime()) / 86400000; if (days < 2) score -= 2; }
    const why = [];
    why.push(time <= minutes ? `${time} minutes, inside your ${minutes}` : `${time} minutes, a little over`);
    if (coverage >= 0.6) why.push(`you have ${Math.round(coverage * 100)}% of it`);
    if (energy === 'low' && recipe.time.active <= 10) why.push(`only ${recipe.time.active} minutes on your feet`);
    if (record.rating >= 4) why.push('you rated it well');
    return { recipe, score, why, coverage };
  }).sort((a, b) => b.score - a.score);
}
