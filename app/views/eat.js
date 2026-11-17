// Eat: the recipe index, a recipe page that shows every number it claims, and a hands-busy cook mode.

import * as store from '../store.js';
import { html, raw, icon, sheet, toast, haptic, blip, today, fmtDay, clock, sec, meter, ticks, plural, fmt, round, extLink, motionOK, stamp } from '../ui.js';
import { whey, recipeRecord, updateRecipe, markCooked, addBatch, award, textureScore } from '../actions.js';
import { RECIPES, RECIPE_BY_ID, COLLECTIONS, FILTERS, CRAVINGS } from '../data/recipes.js';
import { FOODS, foodSource, OIL_TBSP_G } from '../data/foods.js';
import { PHOTOS } from '../data/credits.js';
import { FOOD_SAFETY, SOURCES } from '../data/evidence.js';
import { recipeTotals, compareVersions, household, metric, scaleLines, oilText, activeTargets, MODES } from '../logic/nutrition.js';
import { DAYS, SLOTS, effectiveWeek } from '../logic/week.js';
import { legacy } from '../store.js';

let query = '';
let filters = new Set();
const session = {}; // per-recipe view state: { servings, version, levers, oilTsp }
let cook = { id: null, step: 0, timerEnd: null, timerTotal: 0 };
let cookInterval = null; let wakeLock = null;

const viewState = id => {
  if (!session[id]) { const record = recipeRecord(id); const recipe = RECIPE_BY_ID[id]; session[id] = { servings: record.servings ?? recipe.yield.n, version: record.lastVersion === 'light' && recipe.lighter ? 'light' : 'std', levers: { ...(record.levers ?? {}) }, oilTsp: null }; }
  return session[id];
};
const foodName = id => { const food = FOODS[id]; const diet = store.get('profile').diet; return food.meat && diet.halal ? `Halal ${food.name.charAt(0).toLowerCase()}${food.name.slice(1)}` : food.name; };
const score = recipe => { const record = recipeRecord(recipe.id); return (record.saved ? 3 : 0) + (record.rating ? (record.rating - 3) * 1.5 : 0) + Math.min(3, record.cooked?.length ?? 0) * 0.8 - (record.skips ?? 0) * 2.5; };
const reason = recipe => { const record = recipeRecord(recipe.id); if ((record.cooked?.length ?? 0) >= 2) return 'You cook this'; if (record.rating >= 4) return 'You rated it'; if (record.saved) return 'Saved'; return ''; };

export function photoBlock(recipe, { size = 'card', eager = false } = {}) {
  const photo = recipe.photo ? PHOTOS[recipe.photo] : null;
  if (photo) return html`<div class="shot shot--${size} bd-${recipe.backdrop}"><img src="${photo.file}" alt="${photo.alt}" width="${photo.w}" height="${photo.h}" ${eager ? raw('fetchpriority="high"') : ''} decoding="async"></div>`;
  // No verified photo of this dish, so it gets a designed card in its own colour instead of a stand-in picture.
  if (size === 'thumb') return html`<div class="shot shot--thumb tcard bd-${recipe.backdrop}" aria-hidden="true"><span class="tcard__m serif">${recipe.short.split(' ').slice(0, 2).map(word => word.charAt(0)).join('')}</span></div>`;
  return html`<div class="shot shot--${size} tcard bd-${recipe.backdrop}" role="img" aria-label="${recipe.name}: ${recipe.kicker} No verified photo of this dish, so this is a text card.">
    <span class="tcard__k">${recipe.cuisine}</span><span class="tcard__t serif">${recipe.kicker}</span></div>`;
}

function card(recipe, wide = false) {
  const per = recipeTotals(recipe, {}, whey()).per; const record = recipeRecord(recipe.id); const why = reason(recipe);
  return html`<a class="rcard ${wide ? 'rcard--wide' : ''}" href="#/eat/r/${recipe.id}" aria-label="${recipe.name}, ${recipe.time.total} minutes, ${round(per.kcal)} calories, ${round(per.protein)} grams protein">
    ${photoBlock(recipe)}
    <span class="rcard__b"><span class="rcard__t serif">${recipe.short}</span>
      <span class="meta"><span>${recipe.time.total} min</span><span>${round(per.kcal / 10) * 10} kcal</span><span>${round(per.protein)} g protein</span></span>
      <span class="rcard__tags">${record.saved ? html`<span class="tag tag--amber">Saved</span>` : ''}${why && !record.saved ? html`<span class="tag tag--ghost">${why}</span>` : ''}${recipe.storage.freezes === 'well' ? html`<span class="tag tag--line">Freezes</span>` : ''}${recipe.fallback ? html`<span class="tag tag--line">Fallback</span>` : ''}</span></span></a>`;
}

// ---------- index ----------
function index() {
  const profile = store.get('profile'); const kitchen = store.get('kitchen');
  const mode = MODES[profile.mode];
  const week = effectiveWeek(profile.mode, kitchen.weeks[profile.mode], kitchen.dayKinds[profile.mode]);
  const dayIndex = (new Date().getDay() + 6) % 7;
  const tonight = week[dayIndex].slots.find(slot => slot.slot === 'dinner')?.entry;
  const tonightRecipe = tonight ? RECIPE_BY_ID[tonight.r] : null;
  const searching = query.trim() || filters.size;
  const q = query.trim().toLowerCase();
  let list = RECIPES.filter(recipe => recipe.course !== 'base' || searching).filter(recipe => !q || `${recipe.name} ${recipe.kicker} ${recipe.cuisine} ${recipe.tags.join(' ')} ${recipe.ingredients.map(line => FOODS[line.f].name).join(' ')} ${recipe.source.creator ?? ''}`.toLowerCase().includes(q));
  for (const id of filters) { const filter = FILTERS.find(item => item.id === id); if (filter) list = list.filter(filter.test); if (id === 'saved') list = list.filter(recipe => recipeRecord(recipe.id).saved); if (id === 'cooked') list = list.filter(recipe => recipeRecord(recipe.id).cooked?.length); }
  list = [...list].sort((a, b) => score(b) - score(a));
  const inFridge = kitchen.batches.filter(batch => batch.left > 0).length;
  const legacySaved = Object.values(legacy.planner().value?.recipeBook ?? {}).filter(item => item.saved || item.note).length;
  return html`<div class="wrap kitchen">
    <header class="mast"><p class="mast__k"><span>Forme Kitchen</span><span>${mode.name} week</span></p>
      <h1 class="mast__t serif stretch-in">Food you would eat twice.</h1>
      <p class="mast__d">Sixteen recipes, no seafood anywhere, every calorie traced to an ingredient. Measured oil, real leftovers.</p></header>

    ${tonightRecipe ? html`<a class="tonight" href="#/eat/r/${tonightRecipe.id}">
      ${photoBlock(tonightRecipe, { size: 'tonight', eager: true })}
      <span class="tonight__b bd-${tonightRecipe.backdrop}"><span class="tag">Tonight · ${DAYS[dayIndex]}</span><span class="tonight__t serif">${tonightRecipe.name}</span>
        <span class="meta"><span>${tonightRecipe.time.total} min</span><span>${round(recipeTotals(tonightRecipe, { version: tonight.ver, levers: tonight.levers }, whey()).per.kcal / 10) * 10} kcal</span><span>${tonight.ver === 'light' ? 'Lighter version' : 'As written'}</span></span>
        <span class="tonight__go">Open recipe ${icon('arrow-right', 'ic--sm')}</span></span></a>` : ''}

    <nav class="qrow" aria-label="Kitchen tools">
      <a class="qtile" href="#/eat/week">${icon('calendar-days')}<span>Week plan</span><small>${mode.short}</small></a>
      <a class="qtile" href="#/eat/list">${icon('receipt')}<span>Groceries</span><small>From your week</small></a>
      <a class="qtile" href="#/eat/prep">${icon('fridge')}<span>Use it first</span><small>${inFridge ? plural(inFridge, 'batch', 'batches') : 'Prep once, eat twice'}</small></a>
      <a class="qtile" href="#/eat/fridge">${icon('search')}<span>What can I make?</span><small>From what you have</small></a>
    </nav>

    <label class="field"><span class="field__l">Search recipes, ingredients, creators</span><input class="input" id="eatq" type="search" value="${query}" placeholder="chicken, 15 minutes, freezer…" data-input="q" autocomplete="off"></label>
    <div class="chips" role="group" aria-label="Filters">${[...FILTERS, { id: 'saved', label: 'Saved' }, { id: 'cooked', label: 'Cooked' }].map(filter => html`<button class="chip" type="button" aria-pressed="${filters.has(filter.id) ? 'true' : 'false'}" data-act="filter" data-f="${filter.id}">${filter.label}</button>`)}</div>

    ${searching ? html`${sec(`${plural(list.length, 'recipe')}`, html`<button type="button" data-act="clear">Clear</button>`)}
      ${list.length ? html`<div class="rgrid">${list.map(recipe => card(recipe))}</div>` : html`<div class="empty"><p class="empty__t">Nothing matches that</p><p class="muted small">Try an ingredient you have, a time, or clear the filters.</p><button class="btn btn--sm" type="button" data-act="clear">Clear search</button></div>`}`
    : html`${COLLECTIONS.map(collection => { const items = RECIPES.filter(collection.test).sort((a, b) => score(b) - score(a)); return items.length ? html`<section aria-label="${collection.name}">${sec(collection.name, collection.note)}<div class="scroller" style="margin-top:10px">${items.map(recipe => card(recipe, true))}</div></section>` : ''; })}
      <section aria-label="All recipes">${sec('Everything', 'Sorted by what you save, rate and cook')}<div class="rgrid" style="margin-top:10px">${list.map(recipe => card(recipe))}</div></section>
      <section aria-label="Snack swaps">${sec('When a craving hits', 'Swaps that actually satisfy')}
        <div class="stack" style="margin-top:10px">${CRAVINGS.map(item => html`<a class="frame frame--press" href="#/eat/r/${item.swap}"><div class="frame__rebate"><span>${item.want}</span><span>Try: ${RECIPE_BY_ID[item.swap].short}</span></div><div class="frame__body"><p>${item.why}</p><p class="tiny muted">${item.usual}</p><p class="tiny muted">Also works: ${item.also}</p></div></a>`)}</div></section>`}
    ${legacySaved ? html`<a class="linkish linkish--quiet" href="#/eat/archive">${icon('book-open', 'ic--sm')} Your earlier recipe book (${plural(legacySaved, 'saved item')})</a>` : html`<a class="linkish linkish--quiet" href="#/eat/archive">${icon('book-open', 'ic--sm')} Earlier Form & Fuel recipes (archive)</a>`}
  </div>`;
}

// ---------- recipe ----------
function recipePage(recipe) {
  const state = viewState(recipe.id); const record = recipeRecord(recipe.id); const w = whey();
  const options = { version: state.version, levers: state.levers };
  const totals = recipeTotals(recipe, options, w); const compare = compareVersions(recipe, state.levers, w);
  const lines = scaleLines(totals.lines, recipe.yield.n, state.servings);
  const parts = [...new Set(lines.map(line => line.part || ''))];
  const targets = activeTargets(store.get('profile'));
  const photo = recipe.photo ? PHOTOS[recipe.photo] : null;
  const oilBatch = totals.oil.g * (state.servings / recipe.yield.n);
  const usedG = state.oilTsp === null ? null : state.oilTsp * (OIL_TBSP_G / 3);
  const tex = textureScore(recipe.id);
  const src = recipe.source;
  return html`<article class="wrap kitchen rp">
    <a class="linkish linkish--quiet" href="#/eat">${icon('arrow-left', 'ic--sm')} Kitchen</a>
    <header class="rp__hero ${photo ? '' : 'rp__hero--text'}">${photo ? photoBlock(recipe, { size: 'hero', eager: true }) : ''}
      <div class="rp__title bd-${recipe.backdrop}"><p class="meta"><span>${recipe.cuisine}</span><span>${recipe.time.total} min</span><span>Makes ${recipe.yield.n} ${recipe.yield.unit}</span></p><h1 class="serif rp__h stretch-in">${recipe.name}</h1><p>${recipe.kicker}</p></div></header>
    ${recipe.photoNote ? html`<p class="tiny muted">${photo ? recipe.photoNote : ''}</p>` : !photo ? html`<p class="tiny muted">No properly licensed photo of this exact dish was found, so Forme shows no picture rather than a stand-in.</p>` : ''}

    <div class="rp__acts">
      <button class="btn btn--block" type="button" data-act="cook">${icon('cooking-pot')} Cook</button>
      <button class="icon-btn icon-btn--line" type="button" aria-pressed="${record.saved ? 'true' : 'false'}" data-act="save" aria-label="${record.saved ? 'Remove from saved' : 'Save this recipe'}">${icon('bookmark')}</button>
      <button class="icon-btn icon-btn--line" type="button" data-act="addweek" aria-label="Add to this week's plan">${icon('calendar-days')}</button>
      <button class="icon-btn icon-btn--line" type="button" data-act="rmore" aria-label="Rate, skip or log as cooked">${icon('more')}</button>
    </div>
    ${record.cooked?.length || record.rating || record.skips ? html`<p class="tiny muted">${record.cooked?.length ? `Cooked ${plural(record.cooked.length, 'time')}, last ${fmtDay(record.cooked.at(-1), { month: 'short', day: 'numeric' })}. ` : ''}${record.rating ? `You rated it ${record.rating}/5. ` : ''}${record.skips ? 'Marked not for me. ' : ''}${tex !== null ? `Reheats ${fmt(tex, 1)}/5 for you.` : ''}</p>` : ''}

    <section class="frame" aria-label="Nutrition per serving"><div class="frame__rebate"><span>Per ${recipe.yield.unit.replace(/s$/, '').replace(/ \(.*/, '')}</span><span>${state.version === 'light' ? 'Lighter version' : 'As written'}</span></div><div class="frame__body">
      <div class="statrow"><div class="stat"><div class="stat__v num">${round(totals.per.kcal)}</div><div class="stat__l">kcal</div></div><div class="stat"><div class="stat__v num">${round(totals.per.protein)}<small>g</small></div><div class="stat__l">Protein</div></div><div class="stat"><div class="stat__v num">${round(totals.per.carbs)}<small>g</small></div><div class="stat__l">Carbs</div></div><div class="stat"><div class="stat__v num">${round(totals.per.fat)}<small>g</small></div><div class="stat__l">Fat</div></div></div>
      <p class="tiny muted">Fat is part of the meal, not a problem to remove: ${round(totals.addedFatPerServing)} g of it comes from added oil, butter, cream, mayo or nut butter, the rest from the food itself.${targets ? ` One serving is ${round((totals.per.kcal / targets.kcal) * 100)}% of your ${MODES[store.get('profile').mode].name.toLowerCase()} calories and ${round((totals.per.protein / targets.protein) * 100)}% of your protein.` : ''}</p>
    </div></section>

    ${compare ? html`<section class="frame" aria-label="Standard and lighter versions"><div class="frame__rebate"><span>Two ways to cook it</span><span>Saves ${round(compare.saved.kcal)} kcal a serving</span></div><div class="frame__body">
      <div class="segc" role="group" aria-label="Version"><button type="button" aria-pressed="${state.version === 'std' ? 'true' : 'false'}" data-act="ver" data-v="std">As written</button><button type="button" aria-pressed="${state.version === 'light' ? 'true' : 'false'}" data-act="ver" data-v="light">Lighter</button></div>
      <table class="cmp"><thead><tr><th scope="col"><span class="vh">Measure</span></th><th scope="col">As written</th><th scope="col">Lighter</th></tr></thead><tbody>
        <tr><th scope="row">Calories</th><td>${round(compare.std.per.kcal)}</td><td>${round(compare.light.per.kcal)}</td></tr>
        <tr><th scope="row">Fat</th><td>${round(compare.std.per.fat)} g</td><td>${round(compare.light.per.fat)} g</td></tr>
        <tr><th scope="row">Protein</th><td>${round(compare.std.per.protein)} g</td><td>${round(compare.light.per.protein)} g</td></tr>
        <tr><th scope="row">Cooking oil</th><td>${oilText(compare.std.oil.perServingG)}</td><td>${oilText(compare.light.oil.perServingG)}</td></tr></tbody></table>
      <p class="small"><strong>What keeps the taste.</strong> ${recipe.lighter.keeps}</p>
    </div></section>` : ''}

    <section class="frame" aria-label="Servings"><div class="frame__body">
      <div class="spread"><div><p class="eyebrow">Make</p><p class="title">${fmt(state.servings)} ${recipe.yield.unit}</p></div>
        <span class="stepper"><button type="button" data-act="serv" data-d="-1" aria-label="Fewer servings">−</button><output aria-live="polite">${fmt(state.servings)}</output><button type="button" data-act="serv" data-d="1" aria-label="More servings">+</button></span></div>
      ${(recipe.levers ?? []).map(lever => html`<div><p class="eyebrow">${lever.label}</p><div class="chips" style="margin-top:6px">${lever.options.map(option => html`<button class="chip" type="button" aria-pressed="${(state.levers[lever.id] ?? 1) === option[1] ? 'true' : 'false'}" data-act="lever" data-l="${lever.id}" data-v="${option[1]}">${option[0]}</button>`)}</div></div>`)}
      ${recipe.tags.includes('template') ? html`<button class="btn btn--quiet btn--sm" type="button" data-act="keeplevers">Keep these portions</button>` : ''}
    </div></section>

    ${totals.oil.g > 0 ? html`<section class="frame oilm" aria-label="Oil meter"><div class="frame__rebate"><span>${icon('oil', 'ic--sm')} Oil meter</span><span>${round(oilBatch * 8.84)} kcal in the batch</span></div><div class="frame__body">
      <p><strong>${oilText(oilBatch)}</strong> of cooking oil for ${fmt(state.servings)} ${recipe.yield.unit}: <strong>${oilText(oilBatch / state.servings)}</strong> a serving, ${round((oilBatch / state.servings) * 8.84)} kcal.</p>
      <div class="spread"><div><p class="eyebrow">What you actually poured</p><p class="tiny muted">Measure into a spoon once and you will know.</p></div>
        <span class="stepper"><button type="button" data-act="oil" data-d="-1" aria-label="Less oil used">−</button><output>${state.oilTsp === null ? '-' : household(state.oilTsp, 'tsp')}</output><button type="button" data-act="oil" data-d="1" aria-label="More oil used">+</button></span></div>
      ${usedG !== null ? html`<div class="note ${usedG > oilBatch * 1.25 ? 'note--warn' : 'note--good'}"><p>${Math.abs(usedG - oilBatch) < 2 ? 'Right on the recipe.' : usedG > oilBatch ? `That is ${round(((usedG - oilBatch) / state.servings) * 8.84)} kcal more per serving than written. Nothing wrong with it; it is just worth seeing.` : `That is ${round(((oilBatch - usedG) / state.servings) * 8.84)} kcal less per serving than written.`}</p></div>` : ''}
    </div></section>` : ''}

    <section aria-label="Ingredients">${sec('Ingredients', html`<button type="button" data-act="togroceries">Add to groceries</button>`)}
      ${parts.map(part => html`${part ? html`<p class="eyebrow" style="margin-top:14px">${part}</p>` : ''}<ul class="ing">${lines.filter(line => (line.part || '') === part).map(line => html`<li class="${line.swapped ? 'ing--swap' : ''}"><span class="ing__q num">${metric(line.g, line.f)}</span><span class="ing__n">${foodName(line.f)}${line.n ? html`<small>, ${line.n}</small>` : ''}</span><span class="ing__h">${household(line.q, line.u)}</span></li>`)}</ul>`)}
      <p class="tiny muted" style="margin-top:8px">Weights are raw or dry unless a line says cooked. ${store.get('profile').diet.halal ? 'Meat is listed as halal; change that in Settings.' : ''} No seafood, including in sauces.${recipe.seafood ? ` ${recipe.seafood}` : ''}</p>
    </section>

    <section aria-label="Method">${sec('Method', `${recipe.time.active} min hands-on · ${recipe.time.total} total`)}
      <ol class="steps">${recipe.steps.map((step, i) => { const text = typeof step === 'string' ? step : step.t; return html`<li><span class="steps__n">${i + 1}</span><span>${text}</span></li>`; })}</ol>
      ${recipe.time.quick ? html`<p class="small muted">${recipe.time.quick}</p>` : ''}
      ${recipe.temp ? html`<p class="small"><span class="tag tag--amber">${recipe.temp.c}°C</span> ${recipe.temp.food}: safe internal temperature (Health Canada). Thickest part, not touching bone.</p>` : ''}
      <p class="tiny muted">You need: ${recipe.equipment.join(', ')}.</p>
      ${recipe.variations ? recipe.variations.map(variation => html`<div class="note" id="v-${variation.id}"><p><strong>${variation.name}.</strong> ${variation.text}</p></div>`) : ''}
    </section>

    <section class="frame" aria-label="Taste profile"><div class="frame__rebate"><span>Taste</span><span>Out of five</span></div><div class="frame__body tastes">${[['Heat', 'heat'], ['Tang', 'tang'], ['Richness', 'rich'], ['Crunch', 'crunch'], ['Sweetness', 'sweet']].map(([label, key]) => html`<div class="spread"><span>${label}</span><span class="row">${ticks(recipe.taste[key], 5, 'ticks--mark')}<span class="vh">${recipe.taste[key]} of 5</span></span></div>`)}</div></section>

    <details class="fold"><summary>Swaps and flavour notes</summary><div class="fold__b"><ul class="dots">${recipe.subs.map(item => html`<li>${item}</li>`)}</ul><p class="eyebrow">Flavour without more fat</p><ul class="dots">${recipe.tips.map(item => html`<li>${item}</li>`)}</ul></div></details>

    <section class="frame" aria-label="Leftovers"><div class="frame__rebate"><span>Worth reheating?</span><span>${recipe.storage.freezes === 'well' ? 'Freezes well' : recipe.storage.freezes === 'ok' ? 'Freezes okay' : 'Does not freeze well'}</span></div><div class="frame__body">
      <p class="title">${recipe.storage.verdict}. <span style="font-weight:420">${recipe.storage.line}</span></p>
      ${tex !== null && tex <= 2 ? html`<div class="note note--warn"><p><strong>Cook this one fresh.</strong> You rated its leftovers ${fmt(tex, 1)} out of 5. Halve the batch, or freeze what you will not eat the same day.</p></div>` : ''}
      ${recipe.storage.parts.map(part => html`<div class="part"><p class="tag">${part.name}</p><dl class="kv"><dt>Fridge</dt><dd>${part.fridge}</dd><dt>Freezer</dt><dd>${part.freezer}</dd><dt>Reheat</dt><dd>${part.reheat}</dd><dt>Texture</dt><dd>${part.texture}</dd></dl></div>`)}
      <p class="small">${recipe.storage.fresh}</p>
      ${recipe.storage.better ? html`<p class="small">Want something from this family that reheats better? <a href="#/eat/r/${recipe.storage.better}">${RECIPE_BY_ID[recipe.storage.better].name}</a>.</p>` : ''}
      <details class="fold"><summary>Safety limits (Health Canada)</summary><div class="fold__b"><p class="small">${FOOD_SAFETY.split}</p><dl class="kv kv--stack">${FOOD_SAFETY.rules.map(rule => html`<dt>${rule.k}</dt><dd>${rule.v} ${extLink(SOURCES[rule.src].url, `Source, ${SOURCES[rule.src].date.toLowerCase()}`)}</dd>`)}</dl></div></details>
      <button class="btn btn--quiet btn--block btn--sm" type="button" data-act="cooked">${icon('check')} I cooked this</button>
    </div></section>

    <section class="frame" aria-label="Where this recipe came from"><div class="frame__rebate"><span>${src.type === 'creator' ? 'Creator credit' : 'House recipe'}</span><span>${src.type === 'creator' ? 'Adapted' : 'Forme'}</span></div><div class="frame__body">
      ${src.type === 'creator' ? html`<p class="title">${src.creator}, ${src.outlet}</p><p class="small muted">${src.where}. ${src.rating}.</p>
        <p>${extLink(src.url, `“${src.title}”`)}</p>
        ${src.second ? html`<p class="small">Also drawn on: ${src.second.creator}, ${extLink(src.second.url, `“${src.second.title}”`)}.</p>` : ''}
        <p class="small"><strong>What Forme changed.</strong> ${src.adapted}</p>
        <p class="small"><strong>Checking the numbers.</strong> ${src.check}</p>
        ${src.claimed ? html`<p class="tiny muted">Creator’s card: ${[src.claimed.kcal ? `${src.claimed.kcal} kcal` : '', src.claimed.protein ? `${src.claimed.protein} g protein` : '', src.claimed.carbs ? `${src.claimed.carbs} g carbs` : '', src.claimed.fat ? `${src.claimed.fat} g fat` : ''].filter(Boolean).join(', ')} per ${src.claimed.per}. Forme: ${round(recipeTotals(recipe, {}, w).per.kcal)} kcal, ${round(recipeTotals(recipe, {}, w).per.protein)} g protein per ${recipe.yield.unit.replace(/s$/, '').replace(/ \(.*/, '')}.</p>` : ''}
        <p class="tiny muted">Instructions here are written from scratch. The idea and the credit belong to the creator.</p>`
    : html`<p>${src.note}</p>`}
      ${photo ? html`<p class="tiny muted">Photo: “${photo.title}” by ${photo.creator ?? 'an unnamed photographer'}, ${extLink(photo.licenceUrl, photo.licence)}, via ${extLink(photo.source, photo.via)}. ${photo.changes}.</p>` : ''}
      <details class="fold"><summary>Where every number comes from</summary><div class="fold__b"><p class="small muted">Per 100 g values from USDA FoodData Central (SR Legacy). Estimates, not lab results; your package label wins.</p>
        <table class="cmp cmp--left"><thead><tr><th scope="col">Ingredient</th><th scope="col">Amount</th><th scope="col">kcal</th><th scope="col">P</th></tr></thead><tbody>${totals.lines.map(line => { const source = foodSource(FOODS[line.f]); return html`<tr><th scope="row">${source.url ? extLink(source.url, FOODS[line.f].name) : FOODS[line.f].name}</th><td>${metric(line.g, line.f)}</td><td>${round(line.nut.kcal)}</td><td>${round(line.nut.protein, 1)}</td></tr>`; })}
          <tr class="cmp__sum"><th scope="row">Batch of ${recipe.yield.n}</th><td></td><td>${round(totals.batch.kcal)}</td><td>${round(totals.batch.protein)}</td></tr></tbody></table></div></details>
    </div></section>
  </article>`;
}

// ---------- cook mode ----------
function cookPage(recipe) {
  const state = viewState(recipe.id);
  const steps = recipe.steps.map(step => (typeof step === 'string' ? { t: step } : step));
  const i = Math.min(cook.step, steps.length); const done = i >= steps.length;
  const lines = scaleLines(recipeTotals(recipe, { version: state.version, levers: state.levers }, whey()).lines, recipe.yield.n, state.servings);
  const timerLeft = cook.timerEnd ? Math.max(0, (cook.timerEnd - Date.now()) / 1000) : null;
  return html`<div class="cookm" data-room-lock>
    <header class="cookm__top"><button class="icon-btn" type="button" data-act="exitcook" aria-label="Leave cook mode">${icon('x')}</button>
      <div class="grow"><p class="eyebrow" style="color:inherit;opacity:.7">${recipe.short} · ${fmt(state.servings)} ${recipe.yield.unit}${state.version === 'light' ? ' · lighter' : ''}</p>
        <div class="cookm__dots" role="img" aria-label="Step ${Math.min(i + 1, steps.length)} of ${steps.length}">${steps.map((_s, n) => raw(`<i class="${n < i ? 'done' : n === i ? 'now' : ''}"></i>`))}</div></div>
      <button class="icon-btn" type="button" data-act="cooking" aria-label="Show the ingredient list">${icon('list-filter')}</button></header>
    <main class="cookm__main">${done ? html`<p class="eyebrow" style="color:inherit;opacity:.7">Done</p><h1 class="cookm__t">Plate it. Eat it hot.</h1>
        <p class="cookm__sub">${recipe.storage.fresh}</p>
        <button class="btn btn--block" type="button" data-act="cooked">${icon('check')} Log it</button>`
    : html`<p class="cookm__n seg">${String(i + 1).padStart(2, '0')}<span>/${String(steps.length).padStart(2, '0')}</span></p><h1 class="cookm__t">${steps[i].t}</h1>
        ${steps[i].timer ? html`<button class="cookm__timer ${timerLeft !== null ? 'cookm__timer--on' : ''}" type="button" data-act="ctimer" data-s="${steps[i].timer}"><span class="seg" id="cookClock">${timerLeft !== null ? clock(timerLeft) : clock(steps[i].timer)}</span><span>${timerLeft !== null ? 'Tap to stop' : 'Start timer'}</span></button>` : ''}
        ${recipe.temp && /74|71/.test(steps[i].t) ? html`<p class="cookm__sub">Check ${recipe.temp.c}°C in the thickest part.</p>` : ''}`}</main>
    <footer class="cookm__nav"><button class="btn btn--quiet" type="button" data-act="cprev" ${i === 0 ? 'disabled' : ''}>${icon('arrow-left')} Back</button>
      ${done ? html`<button class="btn" type="button" data-act="exitcook">Close</button>` : html`<button class="btn" type="button" data-act="cnext">${i === steps.length - 1 ? 'Finish' : 'Next'} ${icon('arrow-right')}</button>`}</footer>
    <template id="cookIngredients">${lines.map(line => `${metric(line.g, line.f)} ${foodName(line.f)} (${household(line.q, line.u)})`).join('\n')}</template>
  </div>`;
}

// ---------- archive of the original recipe book ----------
async function archiveBody() {
  const [{ RECIPES: OLD, FOODS: OLD_FOODS }, { getRecipeGuide }] = await Promise.all([import('../../assets/food-data.js'), import('../../assets/recipe-guides.js')]);
  const book = legacy.planner().value?.recipeBook ?? {};
  const ordered = [...OLD].sort((a, b) => Number(Boolean(book[b.id]?.saved)) - Number(Boolean(book[a.id]?.saved)));
  return html`${ordered.map(recipe => { const record = book[recipe.id]; let guide = null; try { guide = getRecipeGuide(recipe.id); } catch { guide = null; } return html`<details class="fold"><summary><span>${recipe.name}${record?.saved ? html` <span class="tag tag--amber">Saved</span>` : ''}${record?.note ? html` <span class="tag tag--line">Your note</span>` : ''}</span></summary><div class="fold__b">
      ${record?.note ? html`<div class="note"><p><strong>Your kitchen note.</strong> ${record.note}</p></div>` : ''}
      <p class="eyebrow">${recipe.category} · ${recipe.minutes} min</p>
      <ul class="dots">${recipe.ingredients.map(item => html`<li>${item.amount} ${OLD_FOODS[item.food].unit === 'count' ? '' : OLD_FOODS[item.food].unit} ${OLD_FOODS[item.food].name}</li>`)}</ul>
      <ol class="steps">${(guide?.steps?.length ? guide.steps.map(step => step.text ?? step) : recipe.steps).map((step, i) => html`<li><span class="steps__n">${i + 1}</span><span>${step}</span></li>`)}</ol>
      <p class="tiny muted">${recipe.note}</p></div></details>`; })}`;
}

function archivePage() {
  return html`<div class="wrap kitchen"><a class="linkish linkish--quiet" href="#/eat">${icon('arrow-left', 'ic--sm')} Kitchen</a>
    <header><p class="eyebrow">Archive</p><h1 class="serif rp__h">The earlier recipe book</h1><p class="muted">The 21 Form & Fuel recipes, with anything you saved and every kitchen note, exactly as they were. They are kept for reference; the meal plans built on them are retired.</p></header>
    <div id="archive" class="stack"><div class="leader" role="status" aria-label="Loading the archive"></div></div></div>`;
}

// ---------- sheets ----------
function cookedSheet(recipe) {
  const state = viewState(recipe.id);
  let made = state.servings; let ate = Math.min(1, made); let where = recipe.storage.freezes === 'well' ? 'fridge' : 'fridge';
  const partName = recipe.storage.parts[0].name;
  sheet({ title: 'Cooked', eyebrow: recipe.short,
    body: () => html`
      <div class="spread"><div><p class="eyebrow">Servings made</p></div><span class="stepper"><button type="button" data-act="made" data-d="-1" aria-label="Fewer made">−</button><output>${fmt(made)}</output><button type="button" data-act="made" data-d="1" aria-label="More made">+</button></span></div>
      <div class="spread"><div><p class="eyebrow">Eaten now</p></div><span class="stepper"><button type="button" data-act="ate" data-d="-1" aria-label="Fewer eaten">−</button><output>${fmt(ate)}</output><button type="button" data-act="ate" data-d="1" aria-label="More eaten">+</button></span></div>
      ${made - ate > 0 ? html`<div><p class="eyebrow">${fmt(made - ate)} left over: ${partName.toLowerCase()}</p><div class="segc" style="margin-top:6px"><button type="button" aria-pressed="${where === 'fridge' ? 'true' : 'false'}" data-act="where" data-w="fridge">Fridge</button><button type="button" aria-pressed="${where === 'freezer' ? 'true' : 'false'}" data-act="where" data-w="freezer" ${recipe.storage.freezes === 'poorly' ? 'disabled' : ''}>Freezer</button></div>
        <p class="tiny muted" style="margin-top:6px">${where === 'fridge' ? 'Shallow container, lid off until the steam stops, then in. Use within 2 to 3 days.' : recipe.storage.parts[0].freezer}</p></div>` : html`<p class="muted small">Nothing left over to track.</p>`}`,
    footer: html`<button class="btn btn--block" type="button" data-act="done">Save</button>`,
    actions: {
      made: (d, _e, _ev, self) => { made = Math.max(1, made + Number(d.d)); ate = Math.min(ate, made); self.update(); },
      ate: (d, _e, _ev, self) => { ate = Math.min(made, Math.max(0, ate + Number(d.d))); self.update(); },
      where: (d, _e, _ev, self) => { where = d.w; self.update(); },
      done: (_d, _e, _ev, self) => {
        markCooked(recipe.id, { version: state.version });
        if (state.oilTsp !== null) award('measured');
        if (made - ate > 0) { addBatch({ recipeId: recipe.id, part: partName, portions: made - ate, where }); toast(`${fmt(made - ate)} ${where === 'fridge' ? 'in the fridge' : 'in the freezer'}. It is on Use It First.`, { action: 'Open', onAction: () => { location.hash = '#/eat/prep'; } }); }
        else toast('Logged as cooked.');
        haptic('done'); self.close();
      },
    } });
}

function weekSheet(recipe) {
  const profile = store.get('profile');
  sheet({ title: 'Add to the week', eyebrow: `${MODES[profile.mode].name} plan`,
    body: html`<p class="muted small">Pick a day and a meal. It replaces what is planned there; you can undo it in the plan.</p>
      ${DAYS.map((day, index) => html`<div><p class="eyebrow">${day}</p><div class="chips" style="margin-top:6px">${SLOTS.filter(slot => recipe.slots.includes(slot.id) || (slot.id === 'extra' && recipe.slots.includes('snack'))).map(slot => html`<button class="chip" type="button" data-act="put" data-k="${index}:${slot.id}">${slot.label}</button>`)}</div></div>`)}`,
    actions: { put: (d, _e, _ev, self) => { const state = viewState(recipe.id); store.update('kitchen', kitchen => { kitchen.weeks[profile.mode][d.k] = { r: recipe.id, ver: state.version, p: 1, levers: { ...state.levers } }; }); toast('Added to the plan.', { action: 'Open week', onAction: () => { location.hash = '#/eat/week'; } }); self.close(); } } });
}

function moreSheet(recipe) {
  sheet({ title: recipe.short, eyebrow: 'Tell Forme what you think',
    body: () => { const record = recipeRecord(recipe.id); return html`
      <div><p class="eyebrow">Your rating</p><div class="row" style="margin-top:6px" role="group" aria-label="Rate out of five">${[1, 2, 3, 4, 5].map(value => html`<button class="icon-btn icon-btn--line" type="button" aria-pressed="${record.rating >= value ? 'true' : 'false'}" aria-label="${value} out of 5" data-act="rate" data-v="${value}" style="${record.rating >= value ? 'background:var(--accent);color:var(--accent-ink);border-color:var(--accent)' : ''}">${icon('star')}</button>`)}</div></div>
      <button class="switch" type="button" role="switch" aria-checked="${record.skips ? 'true' : 'false'}" data-act="skip"><span class="switch__t"><span class="title" style="font-size:.98rem">Not for me</span><span class="tiny muted" style="display:block">Forme stops suggesting it. It stays in the index.</span></span><span class="switch__k"></span></button>
      <label class="field"><span class="field__l">Kitchen note</span><textarea class="textarea" id="rnote" maxlength="600" placeholder="More chili next time. Needed 2 extra minutes in my air fryer.">${record.note ?? ''}</textarea></label>
      <button class="btn btn--quiet btn--sm btn--block" type="button" data-act="note">Save note</button>
      <button class="btn btn--quiet btn--block" type="button" data-act="cookedit">${icon('check')} Log as cooked</button>`; },
    actions: {
      rate: (d, _e, _ev, self) => { updateRecipe(recipe.id, record => { record.rating = record.rating === Number(d.v) ? null : Number(d.v); }); self.update(); },
      skip: (_d, _e, _ev, self) => { updateRecipe(recipe.id, record => { record.skips = record.skips ? 0 : 1; }); self.update(); },
      note: (_d, _e, _ev, self) => { updateRecipe(recipe.id, record => { record.note = self.el.querySelector('#rnote').value.trim(); }); toast('Note saved.'); },
      cookedit: (_d, _e, _ev, self) => { self.close(); cookedSheet(recipe); },
    } });
}

function flyToList(root) {
  if (!motionOK()) return;
  const items = [...root.querySelectorAll('.ing li')].slice(0, 12);
  items.forEach((item, index) => { item.style.setProperty('--i', index); item.classList.remove('ing--fly'); void item.offsetWidth; item.classList.add('ing--fly'); });
}

export function render(ctx) {
  const sub = ctx.path[1]; const id = ctx.path[2];
  const recipe = id ? RECIPE_BY_ID[id] : null;
  const missing = html`<div class="wrap kitchen"><div class="empty"><p class="empty__t">That recipe is not in the kitchen</p><a class="btn" href="#/eat">Back to the index</a></div></div>`;
  let body; let where = 'Kitchen'; let bare = false; let room = 'kitchen';
  if (sub === 'r') { body = recipe ? recipePage(recipe) : missing; where = recipe?.short ?? 'Kitchen'; if (recipe && ctx.query.get('v') && recipe.lighter) viewState(recipe.id).version = ctx.query.get('v') === 'light' ? 'light' : 'std'; if (recipe && ctx.query.get('v')) body = recipePage(recipe); }
  else if (sub === 'cook') { body = recipe ? cookPage(recipe) : missing; where = 'Cook mode'; bare = Boolean(recipe); }
  else if (sub === 'archive') { body = archivePage(); where = 'Archive'; }
  else body = index();

  const tickCook = () => { const el = document.getElementById('cookClock'); if (!cook.timerEnd) return; const left = (cook.timerEnd - Date.now()) / 1000; if (left <= 0) { cook.timerEnd = null; clearInterval(cookInterval); haptic('done'); blip('timer'); toast('Timer done.'); ctx.refresh(); return; } if (el) el.textContent = clock(left); };

  return {
    room, where, bare, body,
    after: root => {
      if (sub === 'archive') archiveBody().then(content => { const host = document.getElementById('archive'); if (host) host.innerHTML = String(content); }).catch(() => { const host = document.getElementById('archive'); if (host) host.innerHTML = '<div class="note note--bad"><p>The archive could not be loaded. The saved data itself is untouched.</p></div>'; });
      if (sub === 'cook' && recipe) { if (cook.id !== recipe.id) cook = { id: recipe.id, step: recipeRecord(recipe.id).step ?? 0, timerEnd: null, timerTotal: 0 }; navigator.wakeLock?.request('screen').then(lock => { wakeLock = lock; }).catch(() => {}); clearInterval(cookInterval); if (cook.timerEnd) cookInterval = setInterval(tickCook, 500); }
      if (ctx.query.get('fly')) flyToList(root);
    },
    leave: () => { clearInterval(cookInterval); wakeLock?.release?.().catch(() => {}); wakeLock = null; },
    inputs: { q: (_d, el) => { query = el.value; ctx.refresh(); } },
    actions: {
      filter: d => { if (filters.has(d.f)) filters.delete(d.f); else filters.add(d.f); ctx.refresh(); },
      clear: () => { query = ''; filters = new Set(); ctx.refresh(); },
      save: () => { updateRecipe(recipe.id, record => { record.saved = !record.saved; }); haptic('tap'); },
      ver: d => { viewState(recipe.id).version = d.v; updateRecipe(recipe.id, record => { record.lastVersion = d.v; }); },
      serv: d => { const state = viewState(recipe.id); const stepSize = recipe.yield.n >= 4 ? 1 : 1; state.servings = Math.min(24, Math.max(1, state.servings + Number(d.d) * stepSize)); updateRecipe(recipe.id, record => { record.servings = state.servings; }); },
      lever: d => { const state = viewState(recipe.id); state.levers = { ...state.levers, [d.l]: Number(d.v) }; ctx.refresh(); },
      keeplevers: () => { updateRecipe(recipe.id, record => { record.levers = { ...viewState(recipe.id).levers }; }); toast('Saved as your portions.'); },
      oil: d => { const state = viewState(recipe.id); const totals = recipeTotals(recipe, { version: state.version, levers: state.levers }, whey()); const base = (totals.oil.g * (state.servings / recipe.yield.n)) / (OIL_TBSP_G / 3); state.oilTsp = Math.max(0, round((state.oilTsp ?? Math.round(base)) + Number(d.d), 0)); ctx.refresh(); },
      togroceries: () => { const state = viewState(recipe.id); store.update('kitchen', kitchen => { kitchen.adds = [...(kitchen.adds ?? []).filter(item => item.r !== recipe.id), { r: recipe.id, servings: state.servings, ver: state.version }]; }); flyToList(document.getElementById('view')); haptic('set'); toast(`Ingredients for ${fmt(state.servings)} ${recipe.yield.unit} are on the grocery list.`, { action: 'Open list', onAction: () => { location.hash = '#/eat/list'; } }); },
      addweek: () => weekSheet(recipe),
      rmore: () => moreSheet(recipe),
      cooked: () => cookedSheet(recipe),
      cook: () => { cook = { id: recipe.id, step: 0, timerEnd: null, timerTotal: 0 }; location.hash = `#/eat/cook/${recipe.id}`; },
      exitcook: () => { cook.timerEnd = null; location.hash = `#/eat/r/${recipe.id}`; },
      cnext: () => { cook.step += 1; cook.timerEnd = null; clearInterval(cookInterval); haptic('tap'); ctx.refresh(); },
      cprev: () => { cook.step = Math.max(0, cook.step - 1); cook.timerEnd = null; clearInterval(cookInterval); ctx.refresh(); },
      ctimer: d => { if (cook.timerEnd) { cook.timerEnd = null; clearInterval(cookInterval); } else { cook.timerEnd = Date.now() + Number(d.s) * 1000; clearInterval(cookInterval); cookInterval = setInterval(tickCook, 500); } ctx.refresh(); },
      cooking: () => sheet({ title: 'Ingredients', eyebrow: recipe.short, body: html`<ul class="dots">${document.getElementById('cookIngredients').innerHTML.split('\n').map(line => html`<li>${raw(line)}</li>`)}</ul>` }),
    },
  };
}
