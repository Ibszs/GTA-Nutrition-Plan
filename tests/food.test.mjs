import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, MEAL_PLANS, recipeNutrition, dayNutrition, groceryTotals, recipeGroceryTotals, quantityToBuy } from '../assets/food-data.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} != ${expected}`);

test('original day shopping retains the six eating points and their raw/dry quantities', () => {
  assert.equal(MEAL_PLANS.find(plan => plan.id === 'original').meals.length, 6);
  const amounts = Object.fromEntries(groceryTotals(['original']).map(item => [item.food, item.amount]));
  assert.deepEqual(amounts, { oats: 60, peanutButter: 25, banana: 120, honey: 35, whey: 1, milk: 500, egg: 3, raisins: 40, chicken: 200, rice: 230, lentils: 60, vegetables: 350, oliveOil: 35, yogurt: 150 });
});

test('night dairy computes milk in mL and the yogurt label per 115 g', () => {
  const nutrition = recipeNutrition('night-dairy');
  near(nutrition.kcal, 130 + 70 * 150 / 115);
  near(nutrition.protein, 9 + 13 * 150 / 115);
  near(nutrition.carbs, 12 + 4 * 150 / 115);
  near(nutrition.fat, 5);
  near(nutrition.fibre, 0);
});

test('changing the whey label propagates its nutrient delta through breakfast and the complete day', () => {
  const label = { kcal: 150, protein: 30, carbs: 5, fat: 2 };
  for (const [baseline, corrected] of [[recipeNutrition('breakfast-shake'), recipeNutrition('breakfast-shake', label)], [dayNutrition('original'), dayNutrition('original', label)]]) {
    for (const [key, delta] of Object.entries({ kcal: 30, protein: 5, carbs: 3, fat: 1, fibre: 0 })) near(corrected[key] - baseline[key], delta);
  }
  assert.deepEqual(recipeNutrition('night-dairy', label), recipeNutrition('night-dairy'));
});

test('two planned days double shopping quantities, including scoop and egg counts', () => {
  const single = groceryTotals(['original']);
  const double = groceryTotals(['original', 'original']);
  assert.deepEqual(double, single.map(item => ({ food: item.food, amount: item.amount * 2 })));
  assert.deepEqual(groceryTotals([]), []);
});

test('swapped meal shopping includes only selected recipes and sums repeated ingredients', () => {
  assert.deepEqual(recipeGroceryTotals(['work-snack', 'pre-workout']), [{ food: 'milk', amount: 250 }, { food: 'egg', amount: 3 }, { food: 'raisins', amount: 40 }, { food: 'honey', amount: 15 }]);
  assert.deepEqual(recipeGroceryTotals([]), []);
});

test('complete days calculate usable estimated totals in the planned intake range', () => {
  for (const plan of MEAL_PLANS.filter(plan => !['build', 'spice-build', 'busy-build'].includes(plan.id))) {
    const day = dayNutrition(plan.id);
    assert.ok(day.kcal >= 3000 && day.kcal <= 3400, `${plan.id}: ${day.kcal} kcal`);
    assert.ok(day.protein >= 160 && day.protein <= 185, `${plan.id}: ${day.protein} g protein`);
    for (const value of Object.values(day)) assert.ok(Number.isFinite(value) && value >= 0);
  }
  for (const recipe of RECIPES) assert.ok(recipeNutrition(recipe.id).kcal > 0);
});

test('three new complete days meet the agreed higher-protein moderate-fat bands', () => {
  for (const id of ['build', 'spice-build', 'busy-build']) {
    const day = dayNutrition(id);
    assert.ok(day.kcal >= 3500 && day.kcal <= 3600, `${id}: ${day.kcal} kcal`);
    assert.ok(day.protein >= 200 && day.protein <= 220, `${id}: ${day.protein} g protein`);
    assert.ok(day.fat >= 90 && day.fat <= 100, `${id}: ${day.fat} g fat`);
    assert.ok(day.carbs >= 440 && day.carbs <= 480, `${id}: ${day.carbs} g carbohydrate`);
    assert.equal(MEAL_PLANS.find(plan => plan.id === id).meals.length, 6);
  }
  assert.ok(groceryTotals(['busy-build']).find(item => item.food === 'egg').amount <= 4);
});

test('unknown ids and malformed id collections fail explicitly instead of silently undercounting', () => {
  for (const id of ['unknown', '', null, '__proto__']) {
    assert.throws(() => recipeNutrition(id));
    assert.throws(() => dayNutrition(id));
    assert.throws(() => groceryTotals([id]));
    assert.throws(() => recipeGroceryTotals([id]));
  }
  for (const invalid of [null, 'original', {}]) assert.throws(() => groceryTotals(invalid));
});

test('invalid whey labels cannot introduce negative or nonfinite nutrition', () => {
  for (const bad of [{}, { kcal: -1, protein: 25, carbs: 2, fat: 1 }, { kcal: 120, protein: NaN, carbs: 2, fat: 1 }, { kcal: 120, protein: 25, carbs: Infinity, fat: 1 }, { kcal: '120', protein: 25, carbs: 2, fat: 1 }, null]) assert.throws(() => dayNutrition('original', bad));
});

test('stock subtraction is unit preserving and never returns a negative purchase quantity', () => {
  assert.equal(quantityToBuy(230, 50), 180);
  assert.equal(quantityToBuy(230, 400), 0);
  assert.equal(quantityToBuy(0, 0), 0);
  assert.equal(quantityToBuy(1.5, 0.25), 1.25);
  for (const invalid of [-1, NaN, Infinity, '5', null, undefined]) {
    assert.throws(() => quantityToBuy(invalid, 0));
    assert.throws(() => quantityToBuy(10, invalid));
  }
});
