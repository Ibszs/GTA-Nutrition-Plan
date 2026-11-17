import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, RECIPE_BY_ID } from '../app/data/recipes.js';
import { FOODS } from '../app/data/foods.js';
import { recipeTotals, add, ZERO } from '../app/logic/nutrition.js';
import {
  SLOTS, DAYS, TEMPLATE, MODE_RULES, DAY_KINDS, effectiveWeek, slotTotals, dayTotals, weekSummary, leverMoves, swapOptions,
  shopAmount, groceryList, servingsNeeded, fridgeMatches, FRIDGE_FOODS, pickDinner,
} from '../app/logic/week.js';

const close = (actual, expected, tolerance = 1e-6, label = '') => assert.ok(Math.abs(actual - expected) <= tolerance, `${label} expected ${expected}, got ${actual}`);
const entry = (r, extra = {}) => ({ r, ver: 'std', p: 1, levers: {}, ...extra });
const oneDay = entries => [{ index: 0, slots: entries.map((item, index) => ({ slot: SLOTS[index % SLOTS.length].id, key: `0:${index}`, entry: item })) }];

test('the template is 7 days of 5 slots and every recipe in it exists', () => {
  assert.equal(TEMPLATE.length, 7);
  assert.deepEqual(SLOTS.map(slot => slot.id), ['breakfast', 'lunch', 'snack', 'dinner', 'extra']);
  for (const day of TEMPLATE) for (const slot of SLOTS) assert.ok(RECIPE_BY_ID[day.slots[slot.id]], `${slot.id}: ${day.slots[slot.id]}`);
  for (const kind of Object.values(DAY_KINDS)) for (const id of Object.values(kind.slots)) assert.ok(RECIPE_BY_ID[id], id);
});

test('effectiveWeek in lean gain: 7 x 5, standard versions, no starch levers', () => {
  const week = effectiveWeek('lean-gain');
  assert.equal(week.length, 7);
  week.forEach((day, index) => {
    assert.equal(day.index, index); assert.equal(day.name, DAYS[index]); assert.equal(day.kind, null);
    assert.equal(day.cook, TEMPLATE[index].cook);
    assert.equal(day.slots.length, 5);
    for (const slot of day.slots) {
      assert.equal(slot.custom, false);
      assert.equal(slot.entry.r, TEMPLATE[index].slots[slot.slot]);
      assert.equal(slot.entry.ver, 'std'); assert.equal(slot.entry.p, 1);
      assert.deepEqual(slot.entry.levers, {});
      assert.equal(slot.key, `${index}:${slot.slot}`);
    }
  });
});

test('effectiveWeek in recomp: lighter version wherever one exists, smaller starch portions', () => {
  const week = effectiveWeek('recomp');
  for (const day of week) for (const slot of day.slots) {
    const recipe = RECIPE_BY_ID[slot.entry.r];
    assert.equal(slot.entry.ver, recipe.lighter ? 'light' : 'std', `${day.name} ${slot.slot} ${recipe.id}`);
    assert.deepEqual(slot.entry.levers, MODE_RULES.recomp.levers[recipe.id] ?? {});
  }
  const butter = week[5].slots.find(slot => slot.slot === 'dinner');
  assert.equal(butter.entry.r, 'butter-chicken');
  assert.deepEqual(butter.entry.levers, { rice: 0.75 });
  assert.throws(() => effectiveWeek('bulk'), RangeError);
});

test('effectiveWeek applies overrides, including a cleared slot, and day kinds', () => {
  const overrides = { '0:dinner': null, '1:lunch': { r: 'pita-box', p: 2 }, '2:snack': { r: 'not-a-recipe' }, '3:dinner': { r: 'butter-chicken', ver: 'std', levers: { rice: 1.5 } } };
  const week = effectiveWeek('recomp', overrides, { 4: 'cant-cook', 5: 'made-up' });
  const slot = (day, id) => week[day].slots.find(item => item.slot === id);
  assert.deepEqual(slot(0, 'dinner'), { slot: 'dinner', key: '0:dinner', entry: null, custom: true });
  assert.equal(slot(1, 'lunch').entry.r, 'pita-box'); assert.equal(slot(1, 'lunch').entry.p, 2); assert.equal(slot(1, 'lunch').custom, true);
  assert.equal(slot(2, 'snack').entry, null, 'an unknown recipe id clears the slot rather than crashing');
  assert.equal(slot(3, 'dinner').entry.ver, 'std', 'an explicit version beats the mode rule');
  assert.deepEqual(slot(3, 'dinner').entry.levers, { rice: 1.5 }, 'saved levers beat the mode levers');
  assert.equal(week[4].kind, 'cant-cook');
  assert.equal(week[4].cook, DAY_KINDS['cant-cook'].note);
  for (const item of week[4].slots) assert.equal(item.entry.r, DAY_KINDS['cant-cook'].slots[item.slot]);
  assert.equal(week[5].kind, null, 'unknown day kinds are ignored');
  assert.equal(slot(0, 'breakfast').custom, false);
});

test('slotTotals, dayTotals and weekSummary agree with each other', () => {
  for (const mode of ['lean-gain', 'recomp']) {
    const week = effectiveWeek(mode, { '2:extra': null, '6:lunch': { r: 'store-run', p: 1.5 } });
    const summary = weekSummary(week);
    let total = { ...ZERO };
    week.forEach((day, index) => {
      const bySlot = day.slots.reduce((sum, slot) => add(sum, slotTotals(slot.entry)), { ...ZERO });
      const byDay = dayTotals(day);
      close(byDay.kcal, bySlot.kcal, 1e-6, `${mode} day ${index}`);
      close(summary.days[index].protein, byDay.protein, 1e-6);
      total = add(total, byDay);
    });
    close(summary.total.kcal, total.kcal, 1e-6, mode);
    close(summary.average.kcal, total.kcal / 7, 1e-6, mode);
    assert.ok(summary.oilG > 0);
  }
  const shake = slotTotals(entry('house-shake', { p: 2 }));
  close(shake.kcal, recipeTotals(RECIPE_BY_ID['house-shake']).per.kcal * 2);
  assert.deepEqual(slotTotals(null), { ...ZERO });
});

test('recomp averages fewer calories than lean gain from the same template', () => {
  const gain = weekSummary(effectiveWeek('lean-gain')).average.kcal;
  const recomp = weekSummary(effectiveWeek('recomp')).average.kcal;
  assert.ok(recomp < gain - 100, `recomp ${recomp} vs gain ${gain}`);
});

test('the two modes shop for mostly the same groceries (90%+ overlap)', () => {
  const ids = mode => new Set(groceryList(effectiveWeek(mode)).map(row => row.id));
  const gain = ids('lean-gain'); const recomp = ids('recomp');
  const shared = [...gain].filter(id => recomp.has(id)).length;
  const union = new Set([...gain, ...recomp]).size;
  assert.ok(shared / union >= 0.9, `overlap ${shared}/${union}`);
});

test('groceryList combines the same food across recipes into one row', () => {
  // House shake (1 serving) uses 40 g oats and 375 mL milk; overnight oats (1 serving) 40 g oats and 125 mL milk.
  const rows = groceryList(oneDay([entry('house-shake'), entry('overnight-oats')]));
  const oats = rows.filter(row => row.id === 'oats');
  assert.equal(oats.length, 1);
  close(oats[0].amount, 80);
  assert.deepEqual([...oats[0].recipes].sort(), [RECIPE_BY_ID['house-shake'].short, RECIPE_BY_ID['overnight-oats'].short].sort());
  close(rows.find(row => row.id === 'milk').amount, 500);
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length, 'one row per food');
});

test('groceryList follows portion multipliers, batch yields and hand-added recipes', () => {
  const doubled = groceryList(oneDay([entry('house-shake', { p: 2 })]));
  close(doubled.find(row => row.id === 'oats').amount, 80);
  // One serving of a 4-wrap batch buys a quarter of the chicken.
  const wrap = groceryList(oneDay([entry('crispy-chicken-wrap')]));
  close(wrap.find(row => row.id === 'chickenBreast').amount, 150);
  const added = groceryList(oneDay([entry('house-shake')]), [{ r: 'house-shake', servings: 1 }, { r: 'ghost', servings: 3 }]);
  close(added.find(row => row.id === 'oats').amount, 80);
  const lighter = groceryList([], [{ r: 'crispy-chicken-wrap', servings: 4, ver: 'light' }]);
  close(lighter.find(row => row.id === 'yogurt0').amount, 120);
  assert.equal(lighter.find(row => row.id === 'mayo'), undefined);
  const levered = groceryList(oneDay([entry('house-shake', { levers: { oats: 0 } })]));
  assert.equal(levered.find(row => row.id === 'oats'), undefined);
});

test('groceryList rows are sorted by aisle and carry a shopping amount', () => {
  const rows = groceryList(effectiveWeek('lean-gain'));
  const aisles = ['Produce', 'Meat', 'Dairy & eggs', 'Bakery', 'Frozen', 'Pantry', 'Snacks', 'Spices'];
  const order = rows.map(row => aisles.indexOf(row.aisle));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  for (const row of rows) { assert.equal(typeof row.text, 'string'); assert.ok(row.text.length > 0); assert.doesNotMatch(row.text, /NaN|undefined/); }
});

test('shopAmount counts, rounds up and keeps staples vague', () => {
  assert.equal(shopAmount('egg', 50), '1 egg');
  assert.equal(shopAmount('egg', 120), '3 eggs');
  assert.equal(shopAmount('egg', 152), '3 eggs');
  assert.equal(shopAmount('garlic', 9), '3 cloves');
  assert.equal(shopAmount('salt', 4), 'a little');
  assert.equal(shopAmount('rice', 10), 'a little');
  assert.equal(shopAmount('rice', 302), '305 g');
  assert.equal(shopAmount('chickenBreast', 333), '340 g');
  assert.equal(shopAmount('chickenBreast', 1000), '1 kg');
  assert.equal(shopAmount('chickenBreast', 1234), '1.25 kg');
  assert.equal(shopAmount('chickenBreast', 1500), '1.5 kg');
  assert.equal(shopAmount('milk', 1500), '1.5 L');
  assert.equal(shopAmount('milk', 500), '500 mL');
});

test('leverMoves stays quiet inside 120 kcal and only moves toward the target', () => {
  for (const mode of ['lean-gain', 'recomp']) for (const day of effectiveWeek(mode)) {
    const kcal = dayTotals(day).kcal;
    assert.deepEqual(leverMoves(day, { kcal: kcal + 100 }).moves, []);
    assert.deepEqual(leverMoves(day, { kcal: kcal - 119 }).moves, []);
    const up = leverMoves(day, { kcal: kcal + 500 });
    close(up.gap, 500, 1e-6);
    assert.ok(up.moves.length > 0 && up.moves.length <= 4);
    for (const move of up.moves) assert.ok(move.delta > 0, `${mode} ${day.name}: ${move.label} ${move.delta}`);
    const down = leverMoves(day, { kcal: kcal - 500 });
    for (const move of down.moves) assert.ok(move.delta < 0, `${mode} ${day.name}: ${move.label} ${move.delta}`);
  }
});

test('leverMoves offers to fill an empty snack or extra when more food is needed', () => {
  const week = effectiveWeek('lean-gain', { '0:extra': null });
  const kcal = dayTotals(week[0]).kcal;
  const moves = leverMoves(week[0], { kcal: kcal + 700 }).moves;
  const fill = moves.find(move => move.key === '0:extra');
  assert.ok(fill, 'an empty extra slot should be offered');
  assert.ok(['house-shake', 'yogurt-bark'].includes(fill.change.r));
  const skip = leverMoves(effectiveWeek('lean-gain')[0], { kcal: kcal - 300 }).moves.find(move => move.change === null);
  if (skip) assert.equal(skip.key, '0:extra');
});

test('swapOptions excludes the current recipe and learns from saves, ratings and skips', () => {
  const plain = swapOptions('dinner', 'butter-chicken');
  assert.ok(plain.length > 0);
  assert.ok(plain.every(option => option.recipe.id !== 'butter-chicken'));
  assert.ok(plain.every(option => option.recipe.slots.includes('dinner') && option.recipe.course !== 'base'));
  assert.ok(plain.every(option => typeof option.delta === 'number'));
  const scores = plain.map(option => option.score);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
  const loved = swapOptions('dinner', 'butter-chicken', { 'store-run': { saved: true, rating: 5, cooked: ['2026-11-01', '2026-11-08'] } });
  assert.equal(loved[0].recipe.id, 'store-run');
  const firstPlain = plain[0].recipe.id;
  const skipped = swapOptions('dinner', 'butter-chicken', { [firstPlain]: { skips: 3 } });
  assert.notEqual(skipped[0].recipe.id, firstPlain);
  assert.equal(skipped.at(-1).recipe.id, firstPlain);
  const fresh = swapOptions('snack', null);
  assert.ok(fresh.every(option => option.delta === null));
});

test('servingsNeeded sums portions and rounds batches up', () => {
  const needs = servingsNeeded(effectiveWeek('lean-gain'));
  const shake = needs.find(item => item.recipe.id === 'house-shake');
  const template = TEMPLATE.flatMap(day => Object.values(day.slots)).filter(id => id === 'house-shake').length;
  assert.equal(shake.servings, template);
  assert.equal(shake.batches, template, 'a one-serving recipe needs one batch per serving');
  const burritos = needs.find(item => item.recipe.id === 'breakfast-burritos');
  assert.equal(burritos.batches, Math.ceil(burritos.servings / RECIPE_BY_ID['breakfast-burritos'].yield.n));
  const counts = needs.map(item => item.servings);
  assert.deepEqual(counts, [...counts].sort((a, b) => b - a));
  assert.deepEqual(servingsNeeded(oneDay([entry('house-shake', { p: 0.5 })])).map(item => item.batches), [1]);
});

test('fridgeMatches ranks recipes by how much of their shopping is already in', () => {
  const have = RECIPE_BY_ID['crispy-chicken-wrap'].ingredients.map(line => line.f);
  const matches = fridgeMatches(have);
  assert.equal(matches[0].recipe.id, 'crispy-chicken-wrap');
  assert.equal(matches[0].ratio, 1);
  assert.deepEqual(matches[0].missing, []);
  assert.ok(matches.every(match => match.covered > 0 && match.recipe.course !== 'base'));
  const ratios = matches.map(match => match.ratio);
  assert.deepEqual(ratios, [...ratios].sort((a, b) => b - a));
  assert.deepEqual(fridgeMatches([]), []);
  assert.ok(FRIDGE_FOODS.every(id => !FOODS[id].staple && !FOODS[id].trace));
});

test('pickDinner honours minutes, energy and exclude, and explains itself', () => {
  const quick = pickDinner({ minutes: 10, energy: 'low' });
  assert.equal(quick[0].recipe.id, 'store-run');
  assert.ok(quick[0].why.some(line => /inside your 10/.test(line)));
  assert.ok(quick[0].why.some(line => /on your feet/.test(line)));
  assert.ok(quick.every(option => option.recipe.slots.includes('dinner')));
  assert.ok(quick.every(option => Array.isArray(option.why) && option.why.length >= 1));
  const without = pickDinner({ minutes: 10, energy: 'low', exclude: ['store-run'] });
  assert.ok(without.every(option => option.recipe.id !== 'store-run'));
  const long = pickDinner({ minutes: 60 });
  assert.ok(long.slice(0, 3).every(option => option.recipe.time.total <= 60));
  const stocked = pickDinner({ minutes: 60, onHand: RECIPE_BY_ID['keema-matar'].ingredients.map(line => line.f) });
  assert.equal(stocked[0].recipe.id, 'keema-matar');
  assert.ok(stocked[0].why.some(line => /you have 100% of it/.test(line)));
  const rated = pickDinner({ minutes: 60, memory: { 'cheeseburger-pasta': { rating: 5, saved: true } } });
  assert.ok(rated[0].why.includes('you rated it well') || rated[0].recipe.id !== 'cheeseburger-pasta');
  assert.ok(RECIPES.filter(recipe => recipe.slots.includes('dinner')).length === pickDinner().length);
});
