import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage, LEGACY_KEYS, trackerState, wheyState, personalState, shoppingState, plannerState, trainingJournal, localDay } from './fixtures.mjs';
import { installGlobals, routes, renderRoute, badAttributes, emDashes, loadView, ctxFor } from './render-harness.mjs';

// State (b): a real user several weeks in. Original journals plus every Forme section in use.
const now = new Date();
const iso = offset => localDay(offset);
const at = (offset, hour) => { const d = new Date(now); d.setDate(d.getDate() + offset); d.setHours(hour, 15, 0, 0); return d.toISOString(); };

const storage = new MemoryStorage();
const training = trainingJournal({ draft: true, draftDate: iso(0) });
storage.setItem(LEGACY_KEYS.training, JSON.stringify(training));
storage.setItem(LEGACY_KEYS.tracker, JSON.stringify(trackerState()));
storage.setItem(LEGACY_KEYS.whey, JSON.stringify(wheyState()));
storage.setItem(LEGACY_KEYS.planner, JSON.stringify(plannerState()));
storage.setItem(LEGACY_KEYS.shopping, JSON.stringify(shoppingState()));
storage.setItem(LEGACY_KEYS.personal, JSON.stringify(personalState()));

const entries = {};
for (let offset = -34; offset <= 0; offset += 1) {
  if (offset % 3 === 0 && offset !== 0) continue;
  entries[iso(offset)] = { weight: Math.round((180 + (offset + 34) * 0.03) * 10) / 10, ...(offset % 2 ? { kcal: 2900, protein: 165 } : { sleep: 7.5 }) };
}
entries[iso(-30)] = { ...entries[iso(-30)], waist: 33.5 };
entries[iso(-2)] = { ...entries[iso(-2)], waist: 33.2, note: 'Good week' };

const forme = {
  profile: { version: 1, name: 'Sam', unit: 'lb', weight: 181, activity: 'feet', maintenance: null, mode: 'lean-gain', modeHistory: [], longTerm: 190, targets: { 'lean-gain': { kcal: 3300, protein: 175, fat: null, carried: true }, recomp: null }, whey: { kcal: 130, protein: 24, carbs: 3, fat: 2, custom: true }, diet: { halal: true, noSeafood: true, heat: 2, avoid: [] } },
  body: { version: 1, entries },
  kitchen: {
    version: 1,
    recipes: { 'butter-chicken': { saved: true, rating: 5, cooked: [iso(-9), iso(-2)], lastVersion: 'std' }, 'smash-burger-bowl': { skips: 1 } },
    weeks: { 'lean-gain': { '2:dinner': { r: 'smash-burger-bowl' } }, recomp: {} }, dayKinds: { 'lean-gain': {}, recomp: {} },
    pantry: {}, checked: {}, extras: [], onHand: ['chickenBreast', 'rice', 'tortilla'], oilNote: '', snackLog: {},
    batches: [
      { id: 'b1', recipeId: 'butter-chicken', part: 'Butter chicken', portions: 4, left: 3, where: 'fridge', madeOn: iso(-2), frozenOn: null, texture: null, note: '' },
      { id: 'b2', recipeId: 'keema-matar', part: 'Keema', portions: 3, left: 2, where: 'freezer', madeOn: iso(-12), frozenOn: iso(-12), texture: 4, note: 'Thaw overnight' },
    ],
  },
  move: {
    version: 1,
    setup: { primary: 'pelvis', secondary: 'ankle', equipment: { wall: true, chair: true, mat: true, step: true, band: false }, firstSide: 'left' },
    plan: { id: 'p1', kind: 'week', primary: 'pelvis', secondary: 'ankle', startedOn: iso(-4), done: 2 },
    sessions: [
      { id: 'm1', planId: 'p1', n: 1, date: iso(-4), short: false, seconds: 320, feel: 'same', off: [], drills: ['pelvic-rock', 'dead-bug', 'glute-bridge'], skipped: [] },
      { id: 'm2', planId: 'p1', n: 2, date: iso(-2), short: true, seconds: 130, feel: 'easier', off: [], drills: ['pelvic-rock', 'dead-bug'], skipped: [] },
    ],
    checks: [{ id: 'c1', at: at(-4, 9), date: iso(-4), planId: 'p1', squat: 3, stairs: 4, balance: 3, comfort: 4, holdL: 18, holdR: 22, wallL: 9, wallR: 10, flag: null }],
    levels: { 'dead-bug': 1 }, streaks: { 'pelvic-rock': 1 }, ease: {}, paused: {}, pastPlans: [],
  },
  habits: {
    version: 1, muteStreaks: false, seeded: true,
    habits: [
      { id: 'h1', name: 'Short walk', kind: 'check', target: 1, unit: '', days: [0, 1, 2, 3, 4, 5, 6], reminder: '', tiny: 'To the end of the street and back.', createdOn: iso(-20), paused: false },
      { id: 'h2', name: 'Read', kind: 'count', target: 10, unit: 'min', days: [0, 1, 2, 3, 4], reminder: '', tiny: 'One page counts.', createdOn: iso(-20), paused: false },
    ],
    log: { [iso(-1)]: { h1: 1, h2: 10 }, [iso(-2)]: { h1: 1, h2: 4 }, [iso(-3)]: { h1: 'skip' }, [iso(-5)]: { h1: 1, h2: 12 } },
  },
  priv: {
    version: 1, enabled: true, label: '', instead: 'Walk to the end of the street', pauseMin: 10, hideOnToday: false, checkDue: null,
    events: Array.from({ length: 6 }, (_, index) => ({ id: `e${index}`, kind: 'pause', at: at(-index - 1, 8 + index * 3), seconds: 300 + index * 20, situations: index % 2 ? ['Bored', 'Late night'] : ['Tired'], note: index === 0 ? 'Rough shift' : '', helped: index % 3 ? ['Cold water on your wrists and face.'] : [], outcome: ['passed', 'instead', 'acted', 'unsure', 'passed', 'passed'][index] })),
  },
  reset: { version: 1, actions: null, oneThing: { id: 'o1', text: 'Book the dentist', date: iso(0), done: false }, evenings: { [iso(-1)]: { firstMove: 'Lay out gym clothes' } } },
  fun: { version: 1, enabled: true, night: false, stickers: { 'first-frame': { n: 1, first: iso(-30), last: iso(-30) }, cooked: { n: 2, first: iso(-9), last: iso(-2) } }, quests: {}, replays: [], hidden: {}, lastActive: iso(-1) },
  ui: { version: 1, modules: null, motion: 'system', sound: false, haptics: true, migrated: null, intro: true, lastRoute: '' },
};
for (const [section, value] of Object.entries(forme)) storage.setItem(`forme.${section}.v1`, JSON.stringify(value));

installGlobals(storage);
const store = await import('../app/store.js');
const { RECIPES } = await import('../app/data/recipes.js');
const { EXERCISES: DRILLS } = await import('../app/data/exercises.js');
const { EXERCISES: LIFTS } = await import('../assets/training-data.js');
store.migrate();

test('the seeded state is valid for the store', () => {
  for (const section of store.SECTIONS) assert.equal(store.sectionProblem(section), null, section);
  assert.equal(store.training.read().error, null);
  assert.equal(store.training.read().value.sessions.length, 4);
  assert.ok(store.training.read().value.draft, 'open draft');
  assert.equal(store.legacy.tracker().error, null);
});

const list = routes({ recipeIds: RECIPES.map(recipe => recipe.id), drillIds: DRILLS.map(drill => drill.id), firstLift: Object.keys(LIFTS)[0], sessionId: training.sessions[0].id });

for (const item of list) {
  test(`seeded state renders ${item.label}`, async () => {
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

test('Today offers to resume the open workout', async () => {
  const { markup } = await renderRoute({ route: 'today', query: '', view: 'today' });
  assert.match(markup, /Resume workout/);
  assert.match(markup, /href="#\/train\/go"/);
});

test('switching goal mode changes the week but keeps history, kitchen memory and training', async () => {
  const plan = await loadView('plan');
  const averageKcal = () => {
    const markup = String(plan.render(ctxFor('eat/week')).body);
    const match = markup.match(/<div class="stat__v num">([\d,]+)<\/div><div class="stat__l">kcal<\/div>/);
    assert.ok(match, 'daily average kcal not found on eat/week');
    return Number(match[1].replace(/,/g, ''));
  };
  const body = structuredClone(store.get('body'));
  const recipes = structuredClone(store.get('kitchen').recipes);
  const journal = structuredClone(store.training.read().value);
  store.update('profile', profile => { profile.mode = 'lean-gain'; });
  const gain = averageKcal();
  store.update('profile', profile => { profile.mode = 'recomp'; });
  const recomp = averageKcal();
  assert.notEqual(gain, recomp);
  assert.ok(recomp < gain, `recomp ${recomp} should average fewer kcal than lean gain ${gain}`);
  assert.deepEqual(store.get('body'), body);
  assert.deepEqual(store.get('kitchen').recipes, recipes);
  assert.deepEqual(store.training.read().value, journal);
  store.update('profile', profile => { profile.mode = 'lean-gain'; });
  assert.equal(averageKcal(), gain, 'switching back restores the same week');
});

test('numbers on screen use the saved whey label and the edited week', async () => {
  const { recipeTotals } = await import('../app/logic/nutrition.js');
  const { effectiveWeek, weekSummary } = await import('../app/logic/week.js');
  const { RECIPE_BY_ID } = await import('../app/data/recipes.js');
  const { visibleText } = await import('./render-harness.mjs');
  const whey = store.get('profile').whey;
  assert.equal(whey.kcal, 130);
  const shake = Math.round(recipeTotals(RECIPE_BY_ID['house-shake'], {}, whey).per.kcal);
  const eat = await loadView('eat');
  const text = visibleText(String(eat.render(ctxFor('eat/r/house-shake')).body)).replace(/\s+/g, ' ');
  assert.match(text, new RegExp(`\\b${shake.toLocaleString('en-CA')} kcal`), `house shake page should show ${shake} kcal with a 130 kcal scoop`);
  const kitchen = store.get('kitchen'); const mode = store.get('profile').mode;
  const expected = Math.round(weekSummary(effectiveWeek(mode, kitchen.weeks[mode], kitchen.dayKinds[mode]), whey).average.kcal / 10) * 10;
  const plan = await loadView('plan');
  const week = String(plan.render(ctxFor('eat/week')).body);
  assert.match(week, new RegExp(`<div class="stat__v num">${expected.toLocaleString('en-CA')}</div><div class="stat__l">kcal</div>`), `eat/week should average ${expected} kcal including the Wednesday dinner override`);
});

test('screens reflect the seeded history: movement day, trend reading, records', async () => {
  const { visibleText } = await import('./render-harness.mjs');
  const { weightTrend, readTrend } = await import('../app/logic/nutrition.js');
  const text = async (view, route, query = '') => visibleText(String((await loadView(view)).render(ctxFor(route, query)).body)).replace(/\s+/g, ' ');
  assert.match(await text('move', 'move'), /Day 3 of 7/, 'two sessions done means day 3 is next');
  assert.match(await text('today', 'today'), /Day 3 of 7/, 'Today shows the same movement day');
  const reading = readTrend(weightTrend(store.get('body').entries, 4), store.get('profile').mode);
  assert.notEqual(reading.code, 'collect', 'five weeks of weigh-ins is enough for a trend');
  assert.ok((await text('you', 'you/progress')).includes(reading.text), 'Progress shows the trend reading for the current mode');
  assert.match(await text('train', 'train/records'), /105/, 'the 105 lb bench set is a record');
});

test('rendering every screen did not change the original journals', () => {
  assert.deepEqual(JSON.parse(storage.getItem(LEGACY_KEYS.training)), training);
  assert.deepEqual(JSON.parse(storage.getItem(LEGACY_KEYS.tracker)), trackerState());
  assert.deepEqual(JSON.parse(storage.getItem(LEGACY_KEYS.personal)), personalState());
});
