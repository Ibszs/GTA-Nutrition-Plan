import test from 'node:test';
import assert from 'node:assert/strict';
import { FOODS, AISLES, foodSource } from '../app/data/foods.js';
import { RECIPES, RECIPE_BY_ID, COLLECTIONS, FILTERS, PREP_FLOWS, CRAVINGS } from '../app/data/recipes.js';
import { EXERCISES, EX, LANES, EQUIPMENT } from '../app/data/exercises.js';
import { SOURCES, CLAIMS, BUCKETS, EXPERIENCES, GET_CHECKED, FOOD_SAFETY, GOAL_CLAIMS, HABIT_CLAIMS, URGE_CLAIMS, SUPPORT } from '../app/data/evidence.js';
import { PHOTOS, OTHER_CREDITS, TEXT_CARDS } from '../app/data/credits.js';
import { STICKERS, STICKER_BY_ID, QUESTS, questFor } from '../app/data/fun.js';
import { recipeTotals } from '../app/logic/nutrition.js';
import { TEMPLATE, DAY_KINDS, MODE_RULES } from '../app/logic/week.js';
import { frame, legend } from '../app/figure.js';

const text = value => typeof value === 'string' && value.trim().length > 0;
const https = value => typeof value === 'string' && /^https:\/\/[^\s]+$/.test(value);

// ---------- foods and recipes ----------

test('foods: every row has a name, a known aisle and finite per-100 g numbers', () => {
  for (const [id, food] of Object.entries(FOODS)) {
    assert.equal(food.id, id);
    assert.ok(text(food.name), id);
    assert.ok(AISLES.includes(food.aisle), `${id}: aisle ${food.aisle}`);
    for (const key of ['kcal', 'protein', 'carbs', 'fat', 'fibre']) assert.ok(Number.isFinite(food[key]) && food[key] >= 0, `${id}.${key}`);
    assert.ok(food.kcal <= 900, `${id}: ${food.kcal} kcal per 100 g is impossible`);
    const source = foodSource(food);
    if (food.fdc) assert.ok(https(source.url)); else assert.equal(source.url, null);
  }
});

test('there are 16 recipes with unique ids', () => {
  assert.equal(RECIPES.length, 16);
  assert.equal(new Set(RECIPES.map(recipe => recipe.id)).size, 16);
  assert.deepEqual(Object.keys(RECIPE_BY_ID).sort(), RECIPES.map(recipe => recipe.id).sort());
});

for (const recipe of RECIPES) {
  test(`recipe ${recipe.id}: complete card`, () => {
    for (const key of ['id', 'name', 'short', 'kicker', 'course', 'cuisine', 'backdrop']) assert.ok(text(recipe[key]), `${key}`);
    for (const key of ['slots', 'tags', 'equipment', 'ingredients', 'steps', 'subs', 'tips']) assert.ok(Array.isArray(recipe[key]), `${key} must be an array`);
    assert.ok(recipe.slots.length >= 1); assert.ok(recipe.ingredients.length >= 1); assert.ok(recipe.steps.length >= 1);
    assert.ok(recipe.subs.length >= 1, 'subs'); assert.ok(recipe.tips.length >= 1, 'tips');
    assert.ok(recipe.source && text(recipe.source.type), 'source');
    assert.ok(Number.isInteger(recipe.yield?.n) && recipe.yield.n >= 1 && text(recipe.yield.unit), 'yield');
    assert.ok(Number.isFinite(recipe.time?.active) && Number.isFinite(recipe.time?.total) && recipe.time.active <= recipe.time.total, 'time');
    assert.deepEqual(Object.keys(recipe.taste).sort(), ['crunch', 'heat', 'rich', 'sweet', 'tang']);
    for (const [key, value] of Object.entries(recipe.taste)) assert.ok(Number.isInteger(value) && value >= 0 && value <= 5, `taste.${key}`);
    for (const step of recipe.steps) assert.ok(text(step) || (text(step.t) && (step.timer === undefined || Number.isFinite(step.timer))), 'step');
    for (const line of [...recipe.subs, ...recipe.tips]) assert.ok(text(line));
    const storage = recipe.storage;
    assert.ok(storage && text(storage.verdict) && text(storage.line) && text(storage.freezes), 'storage');
    assert.ok(['well', 'ok', 'poorly'].includes(storage.freezes), `storage.freezes ${storage.freezes}`);
    assert.ok(Array.isArray(storage.parts) && storage.parts.length >= 1, 'storage.parts');
    for (const part of storage.parts) for (const key of ['name', 'fridge', 'freezer', 'reheat', 'texture']) assert.ok(text(part[key]), `storage part ${part.name}: ${key}`);
  });

  test(`recipe ${recipe.id}: ingredients, levers and lighter swaps point at real things`, () => {
    const keys = recipe.ingredients.map(line => line.k);
    assert.equal(new Set(keys).size, keys.length, 'ingredient keys are unique');
    for (const line of recipe.ingredients) {
      assert.ok(FOODS[line.f], `${line.k}: unknown food ${line.f}`);
      assert.ok(line.g > 0 && Number.isFinite(line.q) && text(line.u), `${line.k}: amounts`);
    }
    for (const lever of recipe.levers ?? []) {
      assert.ok(keys.includes(lever.k), `lever ${lever.id} names missing line ${lever.k}`);
      assert.ok(lever.options.length >= 2 && lever.options.every(([label, factor]) => text(label) && Number.isFinite(factor) && factor >= 0), `lever ${lever.id} options`);
      assert.ok(lever.options.some(([, factor]) => factor === 1), `lever ${lever.id} has no "as written" option`);
    }
    if (recipe.lighter) {
      assert.ok(text(recipe.lighter.keeps), 'lighter.keeps');
      for (const [key, line] of Object.entries(recipe.lighter.swaps ?? {})) {
        assert.ok(keys.includes(key), `lighter swap names missing line ${key}`);
        assert.ok(FOODS[line.f], `lighter swap ${key}: unknown food ${line.f}`);
      }
      for (const line of recipe.lighter.add ?? []) assert.ok(FOODS[line.f], `lighter add: unknown food ${line.f}`);
    }
    if (recipe.uses) assert.ok(RECIPE_BY_ID[recipe.uses.base], `uses.base ${recipe.uses.base}`);
  });

  test(`recipe ${recipe.id}: sources and nutrition are plausible`, () => {
    if (recipe.source.type === 'creator') {
      for (const key of ['creator', 'outlet', 'adapted', 'check']) assert.ok(text(recipe.source[key]), `source.${key}`);
      assert.ok(https(recipe.source.url), 'source.url must be https');
    } else assert.ok(text(recipe.source.note), 'house recipes explain themselves in source.note');
    for (const version of recipe.lighter ? ['std', 'light'] : ['std']) {
      const totals = recipeTotals(recipe, { version });
      assert.ok(totals.per.kcal >= 120 && totals.per.kcal <= 950, `${version}: ${totals.per.kcal} kcal per serving`);
      assert.ok(totals.per.protein > 0, `${version}: protein`);
    }
    const hasOil = recipe.ingredients.some(line => FOODS[line.f].oil);
    if (hasOil) assert.ok(recipeTotals(recipe).oil.g > 0, 'oil is counted');
    else assert.equal(recipeTotals(recipe).oil.g, 0);
  });
}

test('collections, filters, prep flows, cravings and day plans reference real recipes', () => {
  for (const group of [...COLLECTIONS, ...FILTERS]) {
    assert.ok(text(group.id) && typeof group.test === 'function');
    for (const recipe of RECIPES) assert.equal(typeof group.test(recipe), 'boolean');
  }
  for (const flow of PREP_FLOWS) {
    assert.ok(RECIPE_BY_ID[flow.base], flow.base);
    for (const step of flow.plan) {
      assert.ok(RECIPE_BY_ID[step.recipe], step.recipe);
      if (step.variation) assert.ok(RECIPE_BY_ID[step.recipe].variations?.some(item => item.id === step.variation), `${step.recipe} variation ${step.variation}`);
    }
    assert.ok(flow.plan.reduce((sum, step) => sum + step.uses, 0) <= flow.portions, `${flow.id} uses more portions than it makes`);
  }
  for (const craving of CRAVINGS) assert.ok(RECIPE_BY_ID[craving.swap], craving.swap);
  for (const rule of Object.values(MODE_RULES)) for (const id of Object.keys(rule.levers)) {
    for (const lever of Object.keys(rule.levers[id])) assert.ok(RECIPE_BY_ID[id].levers.some(item => item.id === lever), `${id}: mode lever ${lever}`);
  }
});

// The data warns about seafood in a few places. Those exact sentences are allowed; anything else is not.
const SEAFOOD = /\b(fish|shrimp|prawn|salmon|tuna|anchov\w*|oyster|crab|lobster|clam|mussel|squid|sardine|cod|tilapia|worcestershire)\b/i;
const SEAFOOD_WARNINGS = new Map([
  ['recipes.chili-noodles.tips[2]', 'Check the chili crisp label. A few brands add dried shrimp.'],
  ['recipes.chili-noodles.seafood', 'No fish sauce or oyster sauce in this recipe. Some chili crisps contain dried shrimp; read the jar.'],
  ['recipes.store-run.tips[0]', 'Caesar salad kits contain anchovy in the dressing. Pick another kit, or use hummus and lemon.'],
  ['recipes.store-run.seafood', 'Skip Caesar kits: the dressing is made with anchovy.'],
]);

test('no seafood anywhere in the food data, except the listed warnings', () => {
  const hits = [];
  const walk = (value, where) => {
    if (typeof value === 'string') {
      if (SEAFOOD.test(value) && SEAFOOD_WARNINGS.get(where) !== value) hits.push(`${where}: ${value}`);
    } else if (Array.isArray(value)) value.forEach((item, index) => walk(item, `${where}[${index}]`));
    else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) walk(item, `${where}.${key}`);
  };
  for (const recipe of RECIPES) walk(recipe, `recipes.${recipe.id}`);
  walk(FOODS, 'foods'); walk(PREP_FLOWS, 'prep'); walk(CRAVINGS, 'cravings'); walk(TEMPLATE, 'template'); walk(DAY_KINDS, 'dayKinds');
  assert.deepEqual(hits, []);
  for (const where of SEAFOOD_WARNINGS.keys()) {
    const [, id, ...rest] = where.split('.');
    assert.ok(RECIPE_BY_ID[id], `whitelist names unknown recipe ${id}`);
    assert.ok(rest.length, where);
  }
});

test('the seafood warnings are warnings: each one says to avoid or check', () => {
  for (const sentence of SEAFOOD_WARNINGS.values()) assert.match(sentence, /\b(no|skip|check|read|pick another|contain)\b/i);
});

// ---------- movement drills ----------

test('there are 18 drills with unique ids and every lane lists real drills', () => {
  assert.equal(EXERCISES.length, 18);
  assert.equal(new Set(EXERCISES.map(item => item.id)).size, 18);
  for (const lane of Object.values(LANES)) {
    assert.ok(text(lane.name) && text(lane.short) && text(lane.about));
    for (const id of lane.order) assert.ok(EX[id], `${lane.id} lists unknown drill ${id}`);
  }
  for (const exercise of EXERCISES) assert.ok(Object.values(LANES).some(lane => lane.order.includes(exercise.id)), `${exercise.id} is in no lane`);
});

const doseOk = dose => dose && Number.isInteger(dose.sets) && dose.sets >= 1 && ((Number.isFinite(dose.reps) && dose.reps >= 1) || (Number.isFinite(dose.hold) && dose.hold >= 1));

for (const exercise of EXERCISES) {
  test(`drill ${exercise.id}: complete teaching card`, () => {
    assert.ok(text(exercise.name));
    assert.ok(LANES[exercise.lane], `lane ${exercise.lane}`);
    assert.ok(Array.isArray(exercise.equip) && exercise.equip.every(key => Object.hasOwn(EQUIPMENT, key)), `equip ${exercise.equip}`);
    assert.ok(['none', 'low', 'moderate'].includes(exercise.load), `load ${exercise.load}`);
    for (const key of ['what', 'setup', 'feel', 'easier', 'dosage', 'ifSore', 'benefit', 'around']) assert.ok(text(exercise[key]), key);
    assert.ok(doseOk(exercise.dose), 'dose'); assert.ok(doseOk(exercise.short), 'short');
    assert.ok(exercise.levels.length >= 2, 'levels');
    exercise.levels.forEach((level, index) => {
      assert.ok(text(level.name) && text(level.change), `level ${index}`);
      if (index < exercise.levels.length - 1) assert.ok(text(level.nextWhen), `level ${index} needs nextWhen`);
      if (level.dose) assert.ok(doseOk(level.dose), `level ${index} dose`);
    });
    assert.ok(exercise.cues.length >= 2 && exercise.cues.every(text), 'cues');
    assert.ok(exercise.watch.length >= 2 && exercise.watch.every(text), 'watch');
    assert.ok(exercise.refs.length >= 1, 'refs');
    for (const ref of exercise.refs) assert.ok(SOURCES[ref], `ref ${ref} is not in SOURCES`);
    assert.ok(exercise.targets.length >= 1);
    for (const target of exercise.targets) assert.ok(text(target.area) && ['load', 'stretch'].includes(target.kind) && text(target.name), `target ${JSON.stringify(target)}`);
    assert.ok(typeof exercise.alt === 'string' && exercise.alt.length >= 60, 'alt text');
    assert.ok(exercise.poses?.start && exercise.poses?.end, 'poses');
    const video = exercise.video;
    for (const key of ['id', 'channel', 'title', 'len']) assert.ok(text(video?.[key]), `video.${key}`);
    assert.ok(video.url.startsWith('https://www.youtube.com/'), 'video url');
    assert.match(video.len, /^\d+:\d{2}$/);
  });

  test(`drill ${exercise.id}: figure frames render and the legend matches the targets`, () => {
    for (const t of [0, 0.5, 1]) {
      let svg;
      assert.doesNotThrow(() => { svg = frame(exercise, { t }); }, `t=${t}`);
      assert.ok(svg.startsWith('<svg'), `t=${t}`);
      assert.ok(svg.trim().endsWith('</svg>'), `t=${t}`);
      assert.ok(!svg.includes('NaN'), `t=${t}: NaN in SVG`);
      assert.ok(!svg.includes('undefined'), `t=${t}: undefined in SVG`);
    }
    const full = frame(exercise, { t: 0.5, ghost: true, arrows: true, trace: true });
    assert.ok(!full.includes('NaN') && !full.includes('undefined'), 'ghost/arrows/trace frame');
    const rows = legend(exercise);
    assert.equal(rows.length, exercise.targets.length);
    rows.forEach((row, index) => { assert.equal(row.n, index + 1); assert.equal(row.name, exercise.targets[index].name); assert.ok(text(row.word)); });
  });
}

// ---------- evidence ----------

test('every claim has text and a level, and any source it names exists', () => {
  assert.deepEqual(Object.keys(CLAIMS).sort(), Object.keys(LANES).sort());
  const all = [...Object.values(CLAIMS).flat(), ...GOAL_CLAIMS, ...HABIT_CLAIMS, ...URGE_CLAIMS];
  assert.ok(all.length > 20);
  for (const claim of all) {
    assert.ok(text(claim.text), JSON.stringify(claim).slice(0, 80));
    assert.ok(text(claim.level), claim.text.slice(0, 60));
    if (claim.src !== null && claim.src !== undefined) assert.ok(SOURCES[claim.src], `unknown source ${claim.src}`);
  }
  for (const claim of Object.values(CLAIMS).flat()) assert.ok(Object.hasOwn(BUCKETS, claim.bucket), `bucket ${claim.bucket}`);
  for (const claim of [...GOAL_CLAIMS, ...HABIT_CLAIMS, ...URGE_CLAIMS]) assert.ok(SOURCES[claim.src], `${claim.text.slice(0, 40)}: needs a source`);
});

test('every source has a citation, an https link, a type and a date', () => {
  for (const [key, source] of Object.entries(SOURCES)) {
    assert.ok(text(source.cite), `${key}.cite`);
    assert.ok(https(source.url), `${key}.url`);
    assert.ok(text(source.type), `${key}.type`);
    assert.ok(text(source.date), `${key}.date`);
  }
});

test('support lines, experiences, get-checked lists and food safety rules are complete', () => {
  assert.ok(SUPPORT.length >= 1);
  for (const item of SUPPORT) {
    for (const key of ['name', 'how', 'when', 'what']) assert.ok(text(item[key]), `${item.name}.${key}`);
    assert.ok(https(item.url), `${item.name}.url`);
  }
  for (const item of EXPERIENCES) { assert.ok(LANES[item.lane]); assert.ok(https(item.url)); assert.ok(text(item.text)); }
  assert.ok(SOURCES[GET_CHECKED.urgent.src]);
  for (const [lane, block] of Object.entries(GET_CHECKED.lanes)) {
    assert.ok(LANES[lane], lane);
    assert.ok(SOURCES[block.src], `${lane}: ${block.src}`);
    assert.ok(block.items.length >= 1 && block.items.every(text));
  }
  for (const rule of FOOD_SAFETY.rules) { assert.ok(text(rule.k) && text(rule.v)); assert.ok(SOURCES[rule.src], `food safety ${rule.k}: ${rule.src}`); }
});

// ---------- credits ----------

test('every photo has its file, size, alt text, title and licence trail', () => {
  for (const [key, photo] of Object.entries(PHOTOS)) {
    assert.match(photo.file, /^assets\/photos\/[\w-]+\.jpg$/, key);
    assert.ok(Number.isInteger(photo.w) && photo.w > 0 && Number.isInteger(photo.h) && photo.h > 0, `${key}: size`);
    for (const field of ['alt', 'title', 'licence', 'via', 'changes']) assert.ok(text(photo[field]), `${key}.${field}`);
    assert.ok(https(photo.licenceUrl), `${key}.licenceUrl`);
    assert.ok(https(photo.source), `${key}.source`);
    assert.ok(photo.creator === null || text(photo.creator), `${key}.creator`);
    if (photo.creator === null) assert.match(photo.licence, /CC0|public domain/i, `${key}: only public-domain photos may omit the creator`);
  }
  for (const item of OTHER_CREDITS) assert.ok(text(item.what) && text(item.detail) && (item.url === null || https(item.url)));
});

test('every recipe has a photo or a text card, never both', () => {
  for (const id of TEXT_CARDS) assert.ok(RECIPE_BY_ID[id], `TEXT_CARDS names unknown recipe ${id}`);
  for (const recipe of RECIPES) {
    const card = TEXT_CARDS.includes(recipe.id);
    assert.ok(Boolean(recipe.photo) !== card, `${recipe.id}: photo=${recipe.photo} textCard=${card}`);
    if (recipe.photo) assert.ok(PHOTOS[recipe.photo], `${recipe.id}: ${recipe.photo}`);
  }
});

// ---------- fun ----------

test('16 stickers with unique ids and complete fields', () => {
  assert.equal(STICKERS.length, 16);
  assert.equal(new Set(STICKERS.map(sticker => sticker.id)).size, 16);
  const shapes = ['ring', 'burst', 'tape', 'ticket', 'drop', 'bolt', 'frame', 'moon'];
  for (const sticker of STICKERS) {
    assert.ok(text(sticker.name) && text(sticker.line), sticker.id);
    assert.ok(shapes.includes(sticker.shape), `${sticker.id}: shape ${sticker.shape}`);
    assert.match(sticker.ink, /^#[0-9a-f]{6}$/i); assert.match(sticker.fill, /^#[0-9a-f]{6}$/i);
    assert.equal(STICKER_BY_ID[sticker.id], sticker);
  }
});

test('questFor is deterministic and always in range', () => {
  assert.ok(QUESTS.length > 0 && QUESTS.every(text));
  for (let offset = 0; offset < 30; offset += 1) {
    for (const day of ['2026-01-01', '2026-11-17', '2027-02-28', '2030-12-31']) {
      const index = questFor(day, offset);
      assert.ok(Number.isInteger(index) && index >= 0 && index < QUESTS.length, `${day}/${offset}: ${index}`);
      assert.equal(questFor(day, offset), index);
    }
  }
  assert.equal(questFor('2026-11-17'), questFor('2026-11-17', 0));
  const days = Array.from({ length: 28 }, (_, index) => `2026-11-${String(index + 1).padStart(2, '0')}`);
  assert.ok(new Set(days.map(day => questFor(day))).size > 5, 'quests vary from day to day');
  assert.notEqual(questFor('2026-11-17', 0), questFor('2026-11-17', 1), 'a redraw changes the quest');
});
