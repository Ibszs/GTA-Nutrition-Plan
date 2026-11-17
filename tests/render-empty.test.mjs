import test from 'node:test';
import assert from 'node:assert/strict';
import { installGlobals, routes, renderRoute, badAttributes, emDashes, loadView, ctxFor } from './render-harness.mjs';

// State (a): a first visit. Nothing saved at all.
installGlobals();
const store = await import('../app/store.js');
const { RECIPES } = await import('../app/data/recipes.js');
const { EXERCISES: DRILLS } = await import('../app/data/exercises.js');
const { EXERCISES: LIFTS } = await import('../assets/training-data.js');
store.migrate();

const list = routes({ recipeIds: RECIPES.map(recipe => recipe.id), drillIds: DRILLS.map(drill => drill.id), firstLift: Object.keys(LIFTS)[0], sessionId: 'missing-session' });

for (const item of list) {
  test(`empty state renders ${item.label}`, async () => {
    const { markup } = await renderRoute(item);
    assert.deepEqual(badAttributes(markup), [], 'attribute values contain NaN, undefined or [object Object]');
  });
}

test('no screen shows an em dash', async () => {
  const hits = [];
  for (const item of list) {
    const module = await loadView(item.view);
    for (const hit of emDashes(String(module.render(ctxFor(item.route, item.query)).body))) hits.push(`${item.label}: ${hit}`);
  }
  assert.deepEqual(hits, []);
});

test('an empty first visit wrote nothing to the original journals', () => {
  for (const key of ['gtaNutrition.training.v1', 'gtaNutrition.tracker.v2', 'gtaNutrition.whey.v1', 'gtaNutrition.planner.v1', 'gtaNutrition.shopping.v2', 'gtaNutrition.personal.v1']) {
    assert.equal(globalThis.localStorage.getItem(key), null, `${key} was created just by looking`);
  }
});
