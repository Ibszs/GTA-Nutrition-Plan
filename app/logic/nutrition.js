// Pure nutrition maths for Forme: recipe totals from traceable ingredient rows, serving scaling,
// household measures, goal-mode targets and multi-week trends. No DOM, no storage.

import { FOODS, OIL_TBSP_G } from '../data/foods.js';

export const ZERO = Object.freeze({ kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 });
const KEYS = ['kcal', 'protein', 'carbs', 'fat', 'fibre'];
export const add = (a, b) => Object.fromEntries(KEYS.map(key => [key, a[key] + b[key]]));
export const scale = (a, factor) => Object.fromEntries(KEYS.map(key => [key, a[key] * factor]));
export const DEFAULT_WHEY = Object.freeze({ kcal: 120, protein: 25, carbs: 2, fat: 1 });
const SCOOP_G = 30;

/** Nutrition for one ingredient line. Whey uses the per-scoop label saved in settings. */
export function lineNutrition(line, whey = DEFAULT_WHEY) {
  const food = FOODS[line.f];
  if (!food) throw new RangeError(`Unknown food: ${line.f}`);
  if (line.f === 'whey') {
    const scoops = line.g / SCOOP_G;
    return { kcal: whey.kcal * scoops, protein: whey.protein * scoops, carbs: whey.carbs * scoops, fat: whey.fat * scoops, fibre: 0 };
  }
  const factor = line.g / 100;
  return { kcal: food.kcal * factor, protein: food.protein * factor, carbs: food.carbs * factor, fat: food.fat * factor, fibre: food.fibre * factor };
}

/**
 * The ingredient list actually cooked: standard or lighter, with lever factors applied.
 * options: { version: 'std' | 'light', levers: { [leverId]: factor } }
 */
export function resolveLines(recipe, options = {}) {
  const { version = 'std', levers = {} } = options;
  let lines = recipe.ingredients.map(line => ({ ...line }));
  if (version === 'light' && recipe.lighter) {
    lines = lines.map(line => (recipe.lighter.swaps?.[line.k] ? { ...recipe.lighter.swaps[line.k], swapped: true } : line));
    for (const extra of recipe.lighter.add ?? []) lines.push({ ...extra, swapped: true });
  }
  for (const lever of recipe.levers ?? []) {
    const factor = levers[lever.id];
    if (factor === undefined || factor === 1) continue;
    lines = lines.map(line => (line.k === lever.k ? { ...line, g: line.g * factor, q: line.q * factor, levered: true } : line));
  }
  return lines.filter(line => line.g > 0);
}

/** Batch and per-serving totals, plus the cooking-oil ledger for the batch. */
export function recipeTotals(recipe, options = {}, whey = DEFAULT_WHEY) {
  const lines = resolveLines(recipe, options);
  let batch = { ...ZERO };
  let oilG = 0; let addedFatG = 0;
  const detail = lines.map(line => {
    const food = FOODS[line.f];
    const nut = lineNutrition(line, whey);
    batch = add(batch, nut);
    if (food.oil) oilG += line.g;
    if (food.addedFat) addedFatG += nut.fat;
    return { ...line, nut }; // `n` stays the line's note ("2%", "frozen"); nutrition lives in `nut`
  });
  const servings = recipe.yield.n;
  return {
    lines: detail, batch, per: scale(batch, 1 / servings), servings,
    oil: { g: oilG, tbsp: oilG / OIL_TBSP_G, kcal: oilG * 8.84, perServingG: oilG / servings, perServingTsp: (oilG / servings) / (OIL_TBSP_G / 3) },
    addedFatPerServing: addedFatG / servings,
  };
}

/** Standard beside lighter, per serving. Returns null when the recipe has no lighter version. */
export function compareVersions(recipe, levers = {}, whey = DEFAULT_WHEY) {
  if (!recipe.lighter) return null;
  const std = recipeTotals(recipe, { version: 'std', levers }, whey);
  const light = recipeTotals(recipe, { version: 'light', levers }, whey);
  return { std, light, saved: { kcal: std.per.kcal - light.per.kcal, fat: std.per.fat - light.per.fat, oilTsp: std.oil.perServingTsp - light.oil.perServingTsp } };
}

// ---------- fat to protein ----------
/** The aim: 1 g of fat for every 2 g of protein, or leaner. 1 to 3 is the ideal. */
export const FAT_AIM = Object.freeze({ ok: 2, ideal: 3 });

/** Grams of protein for each gram of fat, and how that sits against the aim. */
export function fatProtein(per) {
  const ratio = per.fat > 0 ? per.protein / per.fat : Infinity;
  const grade = ratio >= FAT_AIM.ideal ? 'ideal' : ratio >= FAT_AIM.ok ? 'ok' : 'over';
  // Rounded down, so a recipe that misses the aim is never shown as meeting it.
  return { ratio, grade, text: Number.isFinite(ratio) ? `1:${(Math.floor(ratio * 10 + 1e-9) / 10).toFixed(1)}` : 'no fat' };
}

/** Every way a recipe can already be cooked: each version with each portion option it offers. */
function builds(recipe, whey) {
  let combos = [{}];
  for (const lever of recipe.levers ?? []) combos = combos.flatMap(base => lever.options.map(([label, factor]) => ({ ...base, [lever.id]: { label, factor, name: lever.label } })));
  const out = [];
  for (const version of recipe.lighter ? ['std', 'light'] : ['std']) for (const combo of combos) {
    const changed = Object.entries(combo).filter(([, option]) => option.factor !== 1);
    const levers = Object.fromEntries(changed.map(([id, option]) => [id, option.factor]));
    const per = recipeTotals(recipe, { version, levers }, whey).per;
    out.push({ version, levers, per, fp: fatProtein(per), steps: [...(version === 'light' ? ['the lighter version'] : []), ...changed.map(([, option]) => `${option.name.toLowerCase()}: ${option.label.toLowerCase()}`)] });
  }
  return out;
}

const leanCache = new Map();
/**
 * The smallest change that brings a recipe to a fat-to-protein aim, using only the versions and
 * portion options the recipe already has. Returns null when none of them reaches it: nothing is
 * invented to close the gap.
 */
export function leanBuild(recipe, goal = FAT_AIM.ok, whey = DEFAULT_WHEY) {
  const key = `${recipe.id}|${goal}|${whey.kcal}|${whey.protein}|${whey.fat}`;
  if (!leanCache.has(key)) {
    const written = recipeTotals(recipe, {}, whey).per.kcal;
    const reach = builds(recipe, whey).filter(build => build.fp.ratio >= goal)
      .sort((a, b) => a.steps.length - b.steps.length || Math.abs(a.per.kcal - written) - Math.abs(b.per.kcal - written));
    leanCache.set(key, reach[0] ?? null);
  }
  return leanCache.get(key);
}

/** The closest any existing version gets, for a recipe that cannot reach the aim. */
export function leanest(recipe, whey = DEFAULT_WHEY) {
  const all = builds(recipe, whey);
  const best = Math.max(...all.map(build => build.fp.ratio));
  // Within a tenth of the best, the build with the fewest changes is the one worth naming.
  return all.filter(build => build.fp.ratio >= best - 0.1).sort((a, b) => a.steps.length - b.steps.length || b.fp.ratio - a.fp.ratio)[0];
}

/**
 * How Forme cooks a recipe unless told otherwise: the smallest change that reaches 1 to 2. A recipe
 * that cannot reach it is cooked in its lighter version if it has one, and is flagged, not altered.
 */
export function leanDefault(recipe, whey = DEFAULT_WHEY) {
  const build = leanBuild(recipe, FAT_AIM.ok, whey);
  if (build) return { ...build, reaches: true };
  const version = recipe.lighter ? 'light' : 'std';
  const per = recipeTotals(recipe, { version }, whey).per;
  return { version, levers: {}, per, fp: fatProtein(per), steps: version === 'light' ? ['the lighter version'] : [], reaches: false };
}

// ---------- measures ----------
const FRACTIONS = [[0, ''], [0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '']];
/** 1.5 -> "1½", 0.33 -> "⅓". Values under ⅛ show as "a pinch". */
export function fraction(value) {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value < 0.09) return 'a pinch';
  let whole = Math.floor(value + 1e-9);
  const rest = value - whole;
  let best = FRACTIONS[0];
  for (const candidate of FRACTIONS) if (Math.abs(candidate[0] - rest) < Math.abs(best[0] - rest)) best = candidate;
  if (best[0] === 1) { whole += 1; best = FRACTIONS[0]; }
  if (whole === 0 && best[1] === '') return '⅛';
  return `${whole || ''}${best[1]}`;
}

const PLURAL = { cup: 'cups', clove: 'cloves', slice: 'slices', brick: 'bricks', stalk: 'stalks', pita: 'pitas', portion: 'portions', can: 'cans', pouch: 'pouches', scoop: 'scoops', chili: 'chilies', thumb: 'thumbs', lime: 'limes', onion: 'onions', pepper: 'peppers', cucumber: 'cucumbers' };
/** Household measure for a scaled quantity, moving between tsp, tbsp and cup when that reads better. */
export function household(qty, unit) {
  let q = qty; let u = unit;
  if (u === 'tsp' && q >= 2.95) { q /= 3; u = 'tbsp'; }
  if (u === 'tbsp' && q >= 3.95) { q /= 16; u = 'cup'; }
  if (u === 'tbsp' && q < 0.3) { q *= 3; u = 'tsp'; }
  if (u === 'cup' && q < 0.2) { q *= 16; u = 'tbsp'; }
  const text = fraction(q);
  if (text === 'a pinch') return 'a pinch';
  const many = q > 1.01 && PLURAL[u];
  return `${text} ${many || u}`.trim();
}

/** Metric amount with sensible rounding: "600 g", "375 mL", "1.5 g", "1.2 kg". */
export function metric(amount, foodId) {
  const unit = FOODS[foodId]?.ml ? 'mL' : 'g';
  if (amount >= 1000) return `${(amount / 1000).toFixed(amount % 1000 < 50 ? 0 : 1)} ${unit === 'g' ? 'kg' : 'L'}`;
  if (amount >= 100) return `${Math.round(amount / 5) * 5} ${unit}`;
  if (amount >= 10) return `${Math.round(amount)} ${unit}`;
  return `${Math.round(amount * 2) / 2} ${unit}`;
}

/** Scale a resolved line list to a different number of servings. */
export function scaleLines(lines, fromServings, toServings) {
  const factor = toServings / fromServings;
  return lines.map(line => ({ ...line, g: line.g * factor, q: line.q * factor, ...(line.nut ? { nut: scale(line.nut, factor) } : {}) }));
}

export const oilText = grams => {
  const tsp = grams / (OIL_TBSP_G / 3);
  return household(tsp, 'tsp');
};

// ---------- goal modes ----------
export const LB_PER_KG = 2.20462;
export const MODES = Object.freeze({
  'lean-gain': {
    id: 'lean-gain', name: 'Lean gain', short: 'Gain',
    plain: 'Eat a little above maintenance so training has material to build with, and gain slowly enough that most of it is muscle.',
    pace: 'About 0.25 to 0.5% of body weight a week. Slower is fine; faster mostly adds fat.',
    watch: ['Weekly average weight drifting up slowly', 'Lifts moving: more reps or load on your main movements', 'Waist roughly steady, or rising far slower than weight'],
    adjust: 'After 2 to 4 steady weeks: below the pace with lifts stalling, add about 100 to 150 kcal. Above the pace with the waist climbing, take the same amount off.',
    surplus: 0.08, proteinPerKg: 2.0, fatPerKg: 1.0,
  },
  recomp: {
    id: 'recomp', name: 'Recomp', short: 'Recomp',
    plain: 'Eat at about maintenance with high protein and train hard. Weight stays roughly level while muscle slowly replaces some fat.',
    pace: 'Weight within about a pound either way over a month. Change is slower than in a bulk and easier to miss.',
    watch: ['Weekly average weight flat', 'Lifts holding or improving', 'Waist steady or slowly coming down'],
    adjust: 'After 4 or more steady weeks: lifts sliding and weight dropping, add 100 to 150 kcal. Weight and waist both climbing, take the same amount off.',
    surplus: 0, proteinPerKg: 2.2, fatPerKg: 0.9,
  },
});

const ACTIVITY = Object.freeze({ desk: 14, feet: 16, heavy: 17 });
/** A starting guess only: body weight in lb times an activity factor. The trend corrects it. */
export const guessMaintenance = (weightLb, activity = 'feet') => Math.round((weightLb * (ACTIVITY[activity] ?? 16)) / 10) * 10;

/** Targets from weight, maintenance estimate and mode. Ranges come from the sources in evidence.js. */
export function suggestTargets(weightLb, maintenance, modeId) {
  const mode = MODES[modeId];
  if (!mode || !(weightLb > 0) || !(maintenance > 0)) return null;
  const kg = weightLb / LB_PER_KG;
  const kcal = Math.round((maintenance * (1 + mode.surplus)) / 10) * 10;
  const protein = Math.round((kg * mode.proteinPerKg) / 5) * 5;
  const fat = Math.round((kg * mode.fatPerKg) / 5) * 5;
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4 / 5) * 5);
  return { kcal, protein, fat, carbs, proteinRange: [Math.round(kg * 1.6), Math.round(kg * 2.2)], fatRange: [Math.round(kg * 0.5), Math.round(kg * 1.5)] };
}

/** The targets in force for a mode: saved ones if present (fat and carbs filled in), else suggested. */
export function activeTargets(profile, modeId = profile.mode) {
  const weight = profile.weight;
  const maintenance = profile.maintenance ?? (weight ? guessMaintenance(weight, profile.activity) : null);
  const suggested = weight && maintenance ? suggestTargets(weight, maintenance, modeId) : null;
  const saved = profile.targets?.[modeId];
  if (!saved) return suggested ? { ...suggested, source: 'suggested' } : null;
  const kcal = saved.kcal; const protein = saved.protein;
  const fat = saved.fat ?? suggested?.fat ?? Math.round((kcal * 0.27) / 9 / 5) * 5;
  const carbs = saved.carbs ?? Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4 / 5) * 5);
  return { kcal, protein, fat, carbs, source: saved.carried ? 'carried' : 'saved', proteinRange: suggested?.proteinRange, fatRange: suggested?.fatRange };
}

// ---------- trends ----------
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const dayNumber = day => Math.round(new Date(`${day}T12:00:00`).getTime() / 86400000);
const mondayOf = day => { const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Weekly averages (Monday weeks) for one body-log field, oldest first. Weeks with no entries are skipped. */
export function weeklyAverages(entries, field) {
  const weeks = new Map();
  for (const [day, entry] of Object.entries(entries)) {
    const value = entry?.[field];
    if (!Number.isFinite(value)) continue;
    const key = mondayOf(day);
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key).push(value);
  }
  return [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, values]) => ({ week, avg: mean(values), n: values.length }));
}

/**
 * Multi-week weight trend. Needs at least two weeks with 3 or more weigh-ins each to say anything.
 * ratePct is percent of body weight per week across the span used.
 */
export function weightTrend(entries, weeksBack = 4) {
  const weekly = weeklyAverages(entries, 'weight').filter(week => week.n >= 3).slice(-weeksBack);
  if (weekly.length < 2) return { enough: false, weekly };
  const first = weekly[0]; const last = weekly.at(-1);
  const spanWeeks = Math.max(1, (dayNumber(last.week) - dayNumber(first.week)) / 7);
  const perWeek = (last.avg - first.avg) / spanWeeks;
  return { enough: true, weekly, perWeek, ratePct: (perWeek / first.avg) * 100, from: first.avg, to: last.avg, spanWeeks };
}

/** A plain reading of the trend for the chosen mode. Never a forecast. */
export function readTrend(trend, modeId) {
  if (!trend.enough) return { code: 'collect', text: 'Not enough weigh-ins yet. Three or more mornings a week, for two weeks, gives a trend worth reading.' };
  const rate = trend.ratePct;
  if (modeId === 'lean-gain') {
    if (rate > 0.5) return { code: 'fast', text: 'Gaining faster than the 0.25 to 0.5% a week range. Check the waist and how training feels before changing anything; one high week is often water.' };
    if (rate < 0.1) return { code: 'slow', text: 'Close to flat. If lifts are also stalling after 2 to 4 steady weeks, about 100 to 150 kcal more a day is a reasonable nudge.' };
    return { code: 'range', text: 'Inside the slow-gain range. Hold the food steady and keep training.' };
  }
  if (Math.abs(rate) <= 0.15) return { code: 'range', text: 'Weight is holding level, which is what a recomp looks like on the scale. Watch the waist and the lifts instead.' };
  if (rate > 0.15) return { code: 'fast', text: 'Drifting up. That is fine if you wanted a slow gain; for a recomp, check portions of oil, snacks and the evening extra first.' };
  return { code: 'slow', text: 'Drifting down. If lifts are holding, fine. If they are sliding, add about 100 to 150 kcal a day.' };
}

export const lbToKg = lb => lb / LB_PER_KG;
