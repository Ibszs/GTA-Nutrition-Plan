import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPE_BY_ID } from '../app/data/recipes.js';
import { FOODS, OIL_TBSP_G } from '../app/data/foods.js';
import {
  ZERO, add, scale, DEFAULT_WHEY, lineNutrition, resolveLines, recipeTotals, compareVersions, fraction, household, metric,
  scaleLines, oilText, MODES, LB_PER_KG, guessMaintenance, suggestTargets, activeTargets, weeklyAverages, weightTrend, readTrend,
} from '../app/logic/nutrition.js';

const close = (actual, expected, tolerance = 1e-6, label = '') => assert.ok(Math.abs(actual - expected) <= tolerance, `${label} expected ${expected}, got ${actual}`);

test('add and scale work field by field on the five nutrition keys', () => {
  const a = { kcal: 100, protein: 10, carbs: 5, fat: 2, fibre: 1 };
  const b = { kcal: 50, protein: 1, carbs: 20, fat: 3, fibre: 0.5 };
  assert.deepEqual(add(a, b), { kcal: 150, protein: 11, carbs: 25, fat: 5, fibre: 1.5 });
  assert.deepEqual(scale(a, 0.5), { kcal: 50, protein: 5, carbs: 2.5, fat: 1, fibre: 0.5 });
  assert.deepEqual(add(ZERO, a), a);
  assert.ok(Object.isFrozen(ZERO));
});

test('recipeTotals for the house shake equals a hand-computed ingredient sum', () => {
  // milk 375 mL, 1 scoop whey (default label), oats 40 g, peanut butter 16 g, honey 14 g, berries 100 g.
  const kcal = 51.5 * 3.75 + 120 + 379 * 0.4 + 598 * 0.16 + 304 * 0.14 + 43 * 1;
  const protein = 3.4 * 3.75 + 25 + 13.15 * 0.4 + 22.21 * 0.16 + 0.3 * 0.14 + 0.43;
  const fat = 2.04 * 3.75 + 1 + 6.52 * 0.4 + 51.36 * 0.16 + 0 + 0.38;
  const totals = recipeTotals(RECIPE_BY_ID['house-shake']);
  assert.equal(totals.servings, 1);
  close(totals.batch.kcal, kcal, 1e-6, 'kcal');
  close(totals.per.protein, protein, 1e-6, 'protein');
  close(totals.per.fat, fat, 1e-6, 'fat');
  assert.equal(totals.lines.length, 6);
  assert.equal(totals.oil.g, 0);
});

test('recipeTotals keeps each ingredient note and puts line nutrition beside it', () => {
  // Ingredient lines use `n` for the note ("2%", "frozen"); per-line nutrition must not overwrite it.
  const totals = recipeTotals(RECIPE_BY_ID['house-shake']);
  const milk = totals.lines.find(line => line.k === 'milk');
  assert.equal(milk.n, '2%');
  assert.ok(Math.abs(milk.nut.kcal - 51.5 * 3.75) < 1e-9);
  for (const line of totals.lines) assert.equal(typeof line.n, 'string', `${line.k}: note replaced by ${JSON.stringify(line.n)}`);
});

test('whey follows the saved scoop label, 30 g per scoop', () => {
  const label = { kcal: 150, protein: 30, carbs: 4, fat: 2 };
  assert.deepEqual(lineNutrition({ f: 'whey', g: 45 }, label), { kcal: 225, protein: 45, carbs: 6, fat: 3, fibre: 0 });
  assert.equal(lineNutrition({ f: 'whey', g: 30 }).kcal, DEFAULT_WHEY.kcal);
  const shake = recipeTotals(RECIPE_BY_ID['house-shake'], {}, label);
  close(shake.per.kcal - recipeTotals(RECIPE_BY_ID['house-shake']).per.kcal, 30, 1e-9, 'label delta');
  assert.throws(() => lineNutrition({ f: 'nope', g: 1 }), RangeError);
});

test('recipeTotals counts the cooking oil in grams, tablespoons and per serving', () => {
  const recipe = RECIPE_BY_ID['smash-burger-bowl'];
  const oilLines = recipe.ingredients.filter(line => FOODS[line.f].oil);
  const grams = oilLines.reduce((sum, line) => sum + line.g, 0);
  assert.equal(grams, 27.2);
  const totals = recipeTotals(recipe);
  close(totals.oil.g, 27.2);
  close(totals.oil.tbsp, 2);
  close(totals.oil.kcal, 27.2 * 8.84);
  close(totals.oil.perServingG, 27.2 / 3);
  close(totals.oil.perServingTsp, 2, 1e-9, 'tsp per bowl');
  assert.ok(totals.addedFatPerServing >= 27.2 / 3);
});

test('compareVersions: the lighter version has fewer kcal and the standard numbers do not move', () => {
  for (const id of ['smash-burger-bowl', 'crispy-chicken-wrap', 'shawarma-plate', 'butter-chicken', 'keema-matar']) {
    const recipe = RECIPE_BY_ID[id];
    assert.ok(recipe.lighter, `${id} should have a lighter block`);
    const before = structuredClone(recipe.ingredients);
    const plain = recipeTotals(recipe);
    const result = compareVersions(recipe);
    assert.ok(result.light.per.kcal < result.std.per.kcal, `${id}: lighter is not lighter`);
    assert.deepEqual(result.std.per, plain.per, `${id}: standard numbers changed`);
    close(result.saved.kcal, result.std.per.kcal - result.light.per.kcal, 1e-9, id);
    assert.deepEqual(recipe.ingredients, before, `${id}: resolving the lighter version mutated the recipe`);
  }
  const smash = compareVersions(RECIPE_BY_ID['smash-burger-bowl']);
  close(smash.saved.kcal, ((27.2 - 9) * 8.84) / 3, 1e-6, 'smash oil saving');
  close(smash.saved.oilTsp, 2 - 9 / 3 / (OIL_TBSP_G / 3), 1e-9, 'smash tsp saving');
  assert.equal(compareVersions(RECIPE_BY_ID['house-shake']), null);
});

test('resolveLines applies lighter swaps, lighter additions and lever factors', () => {
  const shawarma = RECIPE_BY_ID['shawarma-plate'];
  const light = resolveLines(shawarma, { version: 'light' });
  assert.ok(light.some(line => line.k === 'soil' && line.swapped), 'lighter add line');
  assert.equal(light.find(line => line.k === 'mayo').f, 'yogurtWhole');
  const shake = RECIPE_BY_ID['house-shake'];
  const noOats = resolveLines(shake, { levers: { oats: 0 } });
  assert.equal(noOats.some(line => line.k === 'oats'), false, 'a zero factor drops the line');
  const moreOats = resolveLines(shake, { levers: { oats: 1.5 } }).find(line => line.k === 'oats');
  assert.equal(moreOats.g, 60); assert.equal(moreOats.q, 0.75); assert.equal(moreOats.levered, true);
  assert.equal(resolveLines(shake, { version: 'light' }).length, shake.ingredients.length, 'no lighter block: unchanged');
});

test('fraction and household measures read like a recipe card', () => {
  assert.equal(fraction(1.5), '1½');
  assert.equal(fraction(0.33), '⅓');
  assert.equal(fraction(2 / 3), '⅔');
  assert.equal(fraction(0.95), '1');
  assert.equal(fraction(0), '0');
  assert.equal(fraction(0.05), 'a pinch');
  assert.equal(household(1.5, 'cup'), '1½ cups');
  assert.equal(household(0.33, 'cup'), '⅓ cup');
  assert.equal(household(6, 'tsp'), '2 tbsp');
  assert.equal(household(4, 'tbsp'), '¼ cup');
  assert.equal(household(0.25, 'tbsp'), '¾ tsp');
  assert.equal(household(0.1, 'cup'), '1⅔ tbsp');
  assert.equal(household(0.02, 'tsp'), 'a pinch');
  assert.equal(household(1, 'clove'), '1 clove');
  assert.equal(household(2, 'clove'), '2 cloves');
  assert.equal(household(3, 'large'), '3 large');
  assert.equal(oilText(OIL_TBSP_G), '1 tbsp');
});

test('metric rounds sensibly and uses mL for milk', () => {
  assert.equal(metric(600, 'chickenBreast'), '600 g');
  assert.equal(metric(375, 'milk'), '375 mL');
  assert.equal(metric(102, 'chickenBreast'), '100 g');
  assert.equal(metric(12.4, 'salt'), '12 g');
  assert.equal(metric(1.3, 'salt'), '1.5 g');
  assert.equal(metric(1200, 'chickenBreast'), '1.2 kg');
  assert.equal(metric(1000, 'chickenBreast'), '1 kg');
  assert.equal(metric(1500, 'milk'), '1.5 L');
});

test('scaleLines scales grams, household quantities and attached nutrition', () => {
  const totals = recipeTotals(RECIPE_BY_ID['crispy-chicken-wrap']);
  const doubled = scaleLines(totals.lines, 4, 8);
  assert.equal(doubled.length, totals.lines.length);
  doubled.forEach((line, index) => {
    close(line.g, totals.lines[index].g * 2);
    close(line.q, totals.lines[index].q * 2);
    close(line.nut.kcal, totals.lines[index].nut.kcal * 2);
    assert.equal(line.n, totals.lines[index].n, 'the ingredient note is kept as written');
  });
  const plain = scaleLines([{ f: 'egg', g: 50, q: 1, n: 'beaten' }], 1, 3);
  assert.deepEqual(plain, [{ f: 'egg', g: 150, q: 3, n: 'beaten' }]);
});

test('guessMaintenance is weight times an activity factor, rounded to 10', () => {
  assert.equal(guessMaintenance(180), 2880);
  assert.equal(guessMaintenance(180, 'feet'), 2880);
  assert.equal(guessMaintenance(180, 'desk'), 2520);
  assert.equal(guessMaintenance(180, 'heavy'), 3060);
  assert.equal(guessMaintenance(181, 'unknown'), 2900);
});

test('suggestTargets follows MODES: surplus, protein g/kg and fat g/kg', () => {
  const kg = 180 / LB_PER_KG;
  const gain = suggestTargets(180, 2880, 'lean-gain');
  assert.deepEqual({ kcal: gain.kcal, protein: gain.protein, fat: gain.fat, carbs: gain.carbs }, { kcal: 3110, protein: 165, fat: 80, carbs: 435 });
  assert.equal(gain.kcal, Math.round((2880 * (1 + MODES['lean-gain'].surplus)) / 10) * 10);
  assert.ok(Math.abs(gain.protein - kg * MODES['lean-gain'].proteinPerKg) <= 2.5);
  const recomp = suggestTargets(180, 2880, 'recomp');
  assert.deepEqual({ kcal: recomp.kcal, protein: recomp.protein, fat: recomp.fat, carbs: recomp.carbs }, { kcal: 2880, protein: 180, fat: 75, carbs: 370 });
  assert.equal(MODES.recomp.surplus, 0);
  assert.ok(recomp.protein > gain.protein, 'recomp asks for more protein per kg');
  assert.deepEqual(gain.proteinRange, [Math.round(kg * 1.6), Math.round(kg * 2.2)]);
  for (const result of [gain, recomp]) assert.ok(Math.abs(result.protein * 4 + result.fat * 9 + result.carbs * 4 - result.kcal) <= 20, 'macros add up to the calories');
  assert.equal(suggestTargets(0, 2880, 'recomp'), null);
  assert.equal(suggestTargets(180, null, 'recomp'), null);
  assert.equal(suggestTargets(180, 2880, 'cut'), null);
});

test('activeTargets: saved beats suggested, carried is marked, nothing without a weight', () => {
  const base = { weight: null, maintenance: null, activity: 'feet', mode: 'lean-gain', targets: { 'lean-gain': null, recomp: null } };
  assert.equal(activeTargets(base), null);
  const suggested = activeTargets({ ...base, weight: 180 });
  assert.equal(suggested.source, 'suggested');
  assert.equal(suggested.kcal, 3110);
  assert.equal(activeTargets({ ...base, weight: 180 }, 'recomp').kcal, 2880);
  assert.equal(activeTargets({ ...base, weight: 180, maintenance: 3000 }).kcal, 3240);
  const saved = activeTargets({ ...base, weight: 180, targets: { 'lean-gain': { kcal: 2950, protein: 170, fat: null }, recomp: null } });
  assert.equal(saved.source, 'saved'); assert.equal(saved.kcal, 2950); assert.equal(saved.protein, 170);
  assert.equal(saved.fat, 80, 'fat filled from the suggestion');
  assert.equal(saved.carbs, Math.max(0, Math.round((2950 - 170 * 4 - 80 * 9) / 4 / 5) * 5));
  const carried = activeTargets({ ...base, targets: { 'lean-gain': { kcal: 2900, protein: 160, fat: null, carried: true }, recomp: null } });
  assert.equal(carried.source, 'carried');
  assert.equal(carried.fat, Math.round((2900 * 0.27) / 9 / 5) * 5);
  assert.equal(carried.proteinRange, undefined);
  assert.equal(activeTargets(base, 'recomp'), null);
});

test('weeklyAverages groups by Monday week, oldest first, and skips blank fields', () => {
  const entries = {
    '2026-11-09': { weight: 180 }, '2026-11-11': { weight: 182 }, '2026-11-15': { weight: 181 },
    '2026-11-16': { weight: 183, kcal: 2900 }, '2026-11-02': { weight: 179 }, '2026-11-03': { kcal: 2800 }, '2026-11-04': { weight: '180' },
  };
  assert.deepEqual(weeklyAverages(entries, 'weight'), [
    { week: '2026-11-02', avg: 179, n: 1 }, { week: '2026-11-09', avg: 181, n: 3 }, { week: '2026-11-16', avg: 183, n: 1 },
  ]);
  assert.deepEqual(weeklyAverages(entries, 'kcal').map(row => row.week), ['2026-11-02', '2026-11-16']);
  assert.deepEqual(weeklyAverages({}, 'weight'), []);
});

const trendEntries = () => ({
  // Week of 5 Oct: three weigh-ins averaging 180.
  '2026-10-05': { weight: 179.5 }, '2026-10-07': { weight: 180 }, '2026-10-09': { weight: 180.5 },
  // Week of 12 Oct: only two, so it is left out.
  '2026-10-12': { weight: 195 }, '2026-10-14': { weight: 195 },
  // Week of 19 Oct: three averaging 181.
  '2026-10-19': { weight: 181 }, '2026-10-21': { weight: 180.5 }, '2026-10-23': { weight: 181.5 },
});

test('weightTrend needs two dense weeks and leaves sparse weeks out', () => {
  const trend = weightTrend(trendEntries());
  assert.equal(trend.enough, true);
  assert.deepEqual(trend.weekly.map(row => row.week), ['2026-10-05', '2026-10-19']);
  close(trend.spanWeeks, 2);
  close(trend.perWeek, 0.5);
  close(trend.ratePct, (0.5 / 180) * 100);
  assert.equal(trend.from, 180); assert.equal(trend.to, 181);
  const single = weightTrend({ '2026-10-05': { weight: 180 }, '2026-10-06': { weight: 180 }, '2026-10-07': { weight: 180 }, '2026-10-12': { weight: 181 } });
  assert.equal(single.enough, false);
  assert.equal(weightTrend({}).enough, false);
});

test('weightTrend only looks back the requested number of dense weeks', () => {
  const entries = trendEntries();
  Object.assign(entries, { '2026-10-26': { weight: 182 }, '2026-10-27': { weight: 182 }, '2026-10-28': { weight: 182 } });
  const trend = weightTrend(entries, 2);
  assert.deepEqual(trend.weekly.map(row => row.week), ['2026-10-19', '2026-10-26']);
  close(trend.perWeek, 1);
});

test('readTrend words the same trend differently for each mode', () => {
  const trend = weightTrend(trendEntries());
  const gain = readTrend(trend, 'lean-gain');
  const recomp = readTrend(trend, 'recomp');
  assert.equal(gain.code, 'range');
  assert.equal(recomp.code, 'fast');
  assert.notEqual(gain.text, recomp.text);
  assert.equal(readTrend({ enough: false }, 'recomp').code, 'collect');
  assert.equal(readTrend({ enough: true, ratePct: 0.8 }, 'lean-gain').code, 'fast');
  assert.equal(readTrend({ enough: true, ratePct: 0.05 }, 'lean-gain').code, 'slow');
  assert.equal(readTrend({ enough: true, ratePct: 0.1 }, 'recomp').code, 'range');
  assert.equal(readTrend({ enough: true, ratePct: -0.4 }, 'recomp').code, 'slow');
  for (const reading of [gain, recomp]) assert.doesNotMatch(reading.text, /will reach|by (?:January|February|March|April|May|June|July|August|September|October|November|December)/i, 'never a forecast');
});
