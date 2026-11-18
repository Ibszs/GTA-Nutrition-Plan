// Kitchen planning: the two sample weeks, the grocery receipt, Prep Once Eat Twice with the
// Use It First shelf, and "what can I make with what is in the fridge?".

import * as store from '../store.js';
import { html, raw, icon, sheet, ask, toast, haptic, today, addDays, fmtDay, sec, meter, plural, fmt, round, uid, extLink, dow, motionOK } from '../ui.js';
import { whey, award, addBatch, batchClock, useBy, textureScore, touch } from '../actions.js';
import { RECIPES, RECIPE_BY_ID, PREP_FLOWS } from '../data/recipes.js';
import { FOODS, AISLES } from '../data/foods.js';
import { FOOD_SAFETY, SOURCES } from '../data/evidence.js';
import { recipeTotals, activeTargets, MODES, oilText } from '../logic/nutrition.js';
import { SLOTS, DAYS, DAY_KINDS, MODE_RULES, effectiveWeek, slotTotals, dayTotals, weekSummary, leverMoves, swapOptions, groceryList, servingsNeeded, fridgeMatches, FRIDGE_FOODS, POOR_LEFTOVER } from '../logic/week.js';
import { toggleItem, addItem, removeItem, validateShoppingState } from '../../assets/shopping-state.js';
import { photoBlock } from './eat.js';

let daySel = dow(today());
let shopMode = false;

const kitchenWeek = () => { const profile = store.get('profile'); const kitchen = store.get('kitchen'); return { profile, kitchen, mode: profile.mode, week: effectiveWeek(profile.mode, kitchen.weeks[profile.mode] ?? {}, kitchen.dayKinds[profile.mode] ?? {}) }; };
const setSlot = (key, value) => { const { mode } = kitchenWeek(); store.update('kitchen', kitchen => { kitchen.weeks[mode] = { ...(kitchen.weeks[mode] ?? {}), [key]: value }; }); };
const tabs = active => html`<nav class="ktabs" aria-label="Kitchen planning">${[['week', 'Week'], ['list', 'Groceries'], ['prep', 'Prep'], ['fridge', 'Fridge']].map(([id, label]) => html`<a href="#/eat/${id}" ${active === id ? raw('aria-current="page"') : ''}>${label}</a>`)}</nav>`;

function setMode(next) {
  store.update('profile', profile => { if (profile.mode === next) return; profile.modeHistory = [...(profile.modeHistory ?? []), { from: profile.mode, to: next, on: today() }].slice(-40); profile.mode = next; });
  toast(`${MODES[next].name} week. Your saved recipes, ratings and logs are unchanged.`);
}

// ---------- week ----------
function weekPage() {
  const { profile, mode, week } = kitchenWeek();
  const w = whey(); const targets = activeTargets(profile);
  const summary = weekSummary(week, w);
  const day = week[daySel]; const totals = summary.days[daySel];
  const moves = targets ? leverMoves(day, targets, w) : { gap: 0, moves: [] };
  const needs = servingsNeeded(week).filter(item => item.recipe.yield.n > 1);
  return html`<div class="wrap kitchen">
    <a class="linkish linkish--quiet" href="#/eat">${icon('arrow-left', 'ic--sm')} Kitchen</a>${tabs('week')}
    <header><h1 class="display display--l">Week plan</h1><p class="muted" style="margin-top:10px">A sample week for each goal, built on mostly the same groceries. Swap a meal or change a portion and the totals and the grocery list follow.</p></header>
    <div class="segc" role="group" aria-label="Goal mode">${Object.values(MODES).map(item => html`<button type="button" aria-pressed="${mode === item.id ? 'true' : 'false'}" data-act="mode" data-m="${item.id}">${item.name}</button>`)}</div>
    <p class="small">${MODES[mode].plain} <span class="muted">${MODE_RULES[mode].note}</span></p>

    <section class="frame" aria-label="Week totals"><div class="frame__head"><span>Daily average</span><span>${targets ? `Target ${fmt(targets.kcal)} kcal · ${targets.protein} g protein` : 'No target set'}</span></div><div class="frame__body">
      <div class="statrow"><div class="stat"><div class="stat__v num">${fmt(round(summary.average.kcal / 10) * 10)}</div><div class="stat__l">kcal</div></div><div class="stat"><div class="stat__v num">${round(summary.average.protein)}<small>g</small></div><div class="stat__l">Protein</div></div><div class="stat"><div class="stat__v num">${round(summary.average.carbs)}<small>g</small></div><div class="stat__l">Carbs</div></div><div class="stat"><div class="stat__v num">${round(summary.average.fat)}<small>g</small></div><div class="stat__l">Fat</div></div></div>
      ${targets ? html`<div class="stack--s"><div class="spread tiny"><span>Calories vs target</span><span class="num">${round((summary.average.kcal / targets.kcal) * 100)}%</span></div>${meter(summary.average.kcal / targets.kcal, 'meter--amber')}<div class="spread tiny"><span>Protein vs target</span><span class="num">${round((summary.average.protein / targets.protein) * 100)}%</span></div>${meter(summary.average.protein / targets.protein)}</div>`
    : html`<div class="note"><p>Enter your weight to get targets for this mode. <a href="#/you/goal">Set goal and targets</a></p></div>`}
      <p class="small">${icon('oil', 'ic--sm')} <strong>Cooking oil this week: ${fmt(summary.oilG / 13.6, 1)} tbsp</strong>, about ${fmt(round(summary.oilG * 8.84 / 10) * 10)} kcal, or ${oilText(summary.oilG / 7)} a day. The same week cooked as written uses ${fmt(weekSummary(effectiveWeek('lean-gain', {}, {}), w).oilG / 13.6, 1)} tbsp.</p>
      ${targets?.source === 'carried' ? html`<p class="tiny muted">Your target was carried over from your earlier plan. <a href="#/you/goal">Review it for this goal</a>.</p>` : ''}
    </div></section>

    <div class="daytabs" role="tablist" aria-label="Day">${week.map((item, index) => html`<button role="tab" type="button" aria-selected="${index === daySel ? 'true' : 'false'}" data-act="day" data-d="${index}" class="${index === dow(today()) ? 'is-today' : ''}"><span>${item.name}</span><small class="num">${fmt(round(summary.days[index].kcal / 50) * 50)}</small></button>`)}</div>

    <section aria-label="${day.name}">
      <p class="small"><strong>${day.kind ? DAY_KINDS[day.kind].name : 'Cooking today'}.</strong> ${day.cook}</p>
      <div class="chips" role="group" aria-label="Kind of day" style="margin:10px 0">${[['', 'Normal day'], ['low-appetite', 'Low appetite'], ['cant-cook', 'Cannot cook']].map(([id, label]) => html`<button class="chip" type="button" aria-pressed="${(day.kind ?? '') === id ? 'true' : 'false'}" data-act="kind" data-k="${id}">${label}</button>`)}</div>
      <div class="slots">${day.slots.map(slot => { const entry = slot.entry; const meta = SLOTS.find(item => item.id === slot.slot);
    if (!entry) return html`<div class="slot slot--empty"><span class="eyebrow">${meta.label}</span><button class="btn btn--quiet btn--xs" type="button" data-act="swap" data-k="${slot.key}" data-s="${slot.slot}">${icon('plus', 'ic--sm')} Add</button></div>`;
    const recipe = RECIPE_BY_ID[entry.r]; const n = slotTotals(entry, w);
    return html`<div class="slot"><div class="slot__h"><span class="eyebrow">${meta.label}${slot.custom ? ', changed' : ''}</span><span class="data num">${round(n.kcal)} kcal, ${round(n.protein)} g protein</span>
          <button class="icon-btn slot__x" type="button" data-act="drop" data-k="${slot.key}" aria-label="Remove ${recipe.short} from ${meta.label}">${icon('x', 'ic--sm')}</button></div>
        <a class="slot__t dish" href="#/eat/r/${recipe.id}?v=${entry.ver}">${recipe.short}</a>
        <div class="slot__c"><span class="stepper" aria-label="Portion"><button type="button" data-act="portion" data-k="${slot.key}" data-d="-0.25" aria-label="Smaller portion">−</button><output>×${entry.p}</output><button type="button" data-act="portion" data-k="${slot.key}" data-d="0.25" aria-label="Larger portion">+</button></span>
          ${recipe.lighter ? html`<button class="chip" type="button" aria-pressed="${entry.ver === 'light' ? 'true' : 'false'}" data-act="lite" data-k="${slot.key}">Lighter</button>` : ''}
          ${recipe.levers?.length ? html`<button class="chip" type="button" data-act="adjust" data-k="${slot.key}">Adjust</button>` : ''}
          <button class="chip" type="button" data-act="swap" data-k="${slot.key}" data-s="${slot.slot}">Swap</button></div></div>`; })}</div>
      <div class="frame" style="margin-top:12px"><div class="frame__head"><span>${day.name} total</span><span>${targets ? (Math.abs(moves.gap) < 120 ? 'On target' : moves.gap > 0 ? `${fmt(round(moves.gap / 10) * 10)} kcal under` : `${fmt(round(-moves.gap / 10) * 10)} kcal over`) : ''}</span></div><div class="frame__body">
        <p class="data num">${fmt(round(totals.kcal))} kcal · ${round(totals.protein)} g protein · ${round(totals.carbs)} g carbs · ${round(totals.fat)} g fat</p>
        ${moves.moves.length ? html`<p class="eyebrow">Ways to close the gap</p><div class="stack--s">${moves.moves.map((move, index) => html`<button class="btn btn--quiet btn--sm btn--block btn--left" type="button" data-act="move" data-i="${index}"><span class="grow">${move.label}</span><span class="data num">${move.delta > 0 ? '+' : ''}${round(move.delta)}</span></button>`)}</div>` : ''}
        ${day.slots.some(slot => slot.custom) || day.kind ? html`<button class="linkish linkish--quiet tiny" type="button" data-act="resetday">Put ${day.name} back to the sample</button>` : ''}
      </div></div>
    </section>

    <section aria-label="Batch cooking this week">${sec('What to cook', 'Batches the week needs')}
      <div class="list">${needs.map(item => html`<a class="list__i list__i--tap" href="#/eat/r/${item.recipe.id}"><span class="list__m"><span class="title">${item.recipe.short}</span><span class="tiny muted" style="display:block">${fmt(item.servings)} ${item.servings === 1 ? 'serving' : 'servings'} planned · makes ${item.recipe.yield.n} · ${plural(item.batches, 'batch', 'batches')}${item.batches * item.recipe.yield.n - item.servings >= 1 && item.recipe.storage.freezes === 'well' ? ` · freeze ${fmt(item.batches * item.recipe.yield.n - item.servings)}` : ''}${(textureScore(item.recipe.id) ?? 5) <= POOR_LEFTOVER ? ` · you rated its leftovers ${fmt(textureScore(item.recipe.id), 1)}/5, so cook only what you will eat` : ''}</span></span><span class="list__e">${icon('chevron-right')}</span></a>`)}</div></section>
    <div class="row row--wrap"><a class="btn grow" href="#/eat/list">${icon('receipt')} Grocery list</a><button class="btn btn--quiet" type="button" data-act="resetweek">Reset week</button></div>
  </div>`;
}

// ---------- groceries ----------
function listPage() {
  const { kitchen, mode, week } = kitchenWeek();
  const rows = groceryList(week, kitchen.adds ?? []);
  const have = id => kitchen.pantry[id] === true; const bought = id => kitchen.checked[id] === true;
  const need = rows.filter(row => !have(row.id) && !row.staple);
  const staples = rows.filter(row => row.staple && !have(row.id));
  const owned = rows.filter(row => have(row.id));
  const left = need.filter(row => !bought(row.id)).length + (kitchen.extras ?? []).filter(item => !item.checked).length;
  const old = store.legacy.shopping();
  const monday = addDays(today(), -dow(today()));
  const row = item => html`<li class="rc__row ${bought(item.id) ? 'rc__row--done' : ''}" ${shopMode && bought(item.id) ? 'hidden' : ''}>
      <button class="rc__tick" type="button" role="checkbox" aria-checked="${bought(item.id) ? 'true' : 'false'}" aria-label="${item.name}, ${item.text}" data-act="buy" data-id="${item.id}">${bought(item.id) ? icon('check', 'ic--sm') : ''}</button>
      <span class="rc__n">${item.meat && store.get('profile').diet.halal ? `Halal ${item.name.charAt(0).toLowerCase()}${item.name.slice(1)}` : item.name}<small>${item.recipes.join(', ')}</small></span><span class="rc__q num">${item.text}</span>
      <button class="rc__have" type="button" data-act="have" data-id="${item.id}" aria-label="I already have ${item.name}">Have</button></li>`;
  return html`<div class="wrap kitchen">
    <a class="linkish linkish--quiet" href="#/eat">${icon('arrow-left', 'ic--sm')} Kitchen</a>${tabs('list')}
    <div class="rc ${motionOK() ? 'rc--print' : ''}" aria-label="Grocery list">
      <header class="rc__head"><h1 class="rc__brand">Groceries</h1><p class="data">Week of ${fmtDay(monday, { day: 'numeric', month: 'short' })} · ${MODES[mode].name} · ${left} to buy</p></header>
      ${need.length ? AISLES.filter(aisle => need.some(item => item.aisle === aisle)).map(aisle => html`<p class="rc__aisle">${aisle}</p><ul>${need.filter(item => item.aisle === aisle).map(row)}</ul>`) : html`<p class="rc__empty">Nothing left to buy from the plan.</p>`}
      ${(kitchen.adds ?? []).length ? html`<p class="rc__aisle">Also cooking</p><ul>${kitchen.adds.map(item => html`<li class="rc__row"><span class="rc__n">${RECIPE_BY_ID[item.r]?.short ?? item.r}<small>${fmt(item.servings)} ${item.servings === 1 ? 'serving' : 'servings'}, counted above</small></span><button class="rc__have" type="button" data-act="unadd" data-r="${item.r}">Remove</button></li>`)}</ul>` : ''}
      <p class="rc__aisle">Your own items</p>
      <ul>${(kitchen.extras ?? []).map(item => html`<li class="rc__row ${item.checked ? 'rc__row--done' : ''}" ${shopMode && item.checked ? 'hidden' : ''}><button class="rc__tick" type="button" role="checkbox" aria-checked="${item.checked ? 'true' : 'false'}" aria-label="${item.name}" data-act="xbuy" data-id="${item.id}">${item.checked ? icon('check', 'ic--sm') : ''}</button><span class="rc__n">${item.name}</span><button class="rc__have" type="button" data-act="xdel" data-id="${item.id}">Delete</button></li>`)}</ul>
      <form class="rc__add" data-form="extra"><label class="vh" for="extraName">Add an item</label><input class="input" id="extraName" maxlength="80" placeholder="Add anything: foil, dish soap…" autocomplete="off"><button class="btn btn--sm" type="submit">Add</button></form>
      <details class="rc__fold"><summary>Pantry check: ${plural(staples.length, 'staple')} the week uses</summary><ul>${staples.map(row)}</ul><p class="tiny" style="padding:6px 0">Oil, spices, flour and sauces you probably own. Tap Have for each one that is in the cupboard.</p></details>
      ${owned.length ? html`<details class="rc__fold"><summary>Already have: ${owned.length}</summary><ul>${owned.map(item => html`<li class="rc__row"><span class="rc__n">${item.name}</span><span class="rc__q num">${item.text}</span><button class="rc__have" type="button" data-act="have" data-id="${item.id}">Need it</button></li>`)}</ul></details>` : ''}
      <footer class="rc__foot"><p class="data">${rows.length} items · ${plural(new Set(week.flatMap(day => day.slots.filter(slot => slot.entry).map(slot => slot.entry.r))).size, 'recipe')}. Quantities follow your portions.</p></footer>
    </div>
    <div class="row row--wrap"><button class="btn btn--quiet btn--sm grow" type="button" aria-pressed="${shopMode ? 'true' : 'false'}" data-act="shop">${shopMode ? 'Show ticked' : 'Hide ticked'}</button><button class="btn btn--quiet btn--sm" type="button" data-act="copy">Copy as text</button><button class="btn btn--quiet btn--sm" type="button" data-act="unbuy">Clear ticks</button></div>
    ${old.value && old.saved ? html`<details class="fold"><summary>Your earlier store lists</summary><div class="fold__b">${old.error ? html`<p class="err">These lists could not be read and were left untouched: ${old.error}</p>` : old.value.stores.map(shop => html`<p class="eyebrow">${shop.name}</p><ul class="oldlist">${shop.items.map(item => html`<li><button class="rc__tick" type="button" role="checkbox" aria-checked="${item.checked ? 'true' : 'false'}" aria-label="${item.name}" data-act="oldbuy" data-s="${shop.id}" data-id="${item.id}">${item.checked ? icon('check', 'ic--sm') : ''}</button><span>${item.name}${item.quantity ? html` <small class="muted">${item.quantity}</small>` : ''}</span><button class="linkish linkish--quiet tiny" type="button" data-act="olddel" data-s="${shop.id}" data-id="${item.id}" style="min-height:32px;margin-left:auto">Delete</button></li>`)}</ul>`)}
      <p class="tiny muted">These are the custom lists you kept before the rebuild. They are saved exactly where they were.</p></div></details>` : ''}
  </div>`;
}

// ---------- prep and Use It First ----------
function prepPage() {
  const { kitchen } = kitchenWeek();
  const live = kitchen.batches.filter(batch => batch.left > 0).map(batch => ({ batch, clock: batchClock(batch) })).sort((a, b) => (a.clock.where === 'freezer') - (b.clock.where === 'freezer') || (a.clock.left ?? 99) - (b.clock.left ?? 99));
  const rated = kitchen.batches.filter(batch => Number.isFinite(batch.texture));
  const stateWord = clock => (clock.where === 'freezer' ? `Frozen ${plural(clock.days, 'day')}` : clock.state === 'over' ? 'Past the limit' : clock.state === 'last' ? 'Use today' : clock.state === 'soon' ? 'Use by tomorrow' : `${plural(clock.left, 'day')} left`);
  return html`<div class="wrap kitchen">
    <a class="linkish linkish--quiet" href="#/eat">${icon('arrow-left', 'ic--sm')} Kitchen</a>${tabs('prep')}
    <header><h1 class="display display--l">Use it first</h1><p class="muted" style="margin-top:10px">Cooked food, in the order it should be eaten. The date is the safety limit. Texture is for you to judge.</p></header>

    ${live.length ? html`<div class="stack">${live.map(({ batch, clock }) => { const recipe = RECIPE_BY_ID[batch.recipeId]; return html`<article class="tape tape--${clock.where === 'freezer' ? 'frozen' : clock.state}">
      <div class="tape__label"><span>${recipe?.short ?? 'Batch'}</span><span>${clock.where === 'freezer' ? 'Freezer' : 'Fridge'}</span></div>
      <div class="tape__b"><p class="title">${batch.part} · ${plural(batch.left, 'portion')} left</p>
        <p class="meta tape__d"><span>Made ${fmtDay(batch.madeOn, { weekday: 'short', day: 'numeric', month: 'short' })}</span>${clock.where === 'fridge' ? html`<span>Use by ${fmtDay(useBy(batch), { weekday: 'short', day: 'numeric', month: 'short' })}</span>` : html`<span>Frozen ${fmtDay(batch.frozenOn ?? batch.madeOn, { day: 'numeric', month: 'short' })}</span>`}</p>
        <p class="small"><strong>${stateWord(clock)}.</strong> ${clock.where === 'freezer' ? 'Freezer time is about quality, not safety. Thaw in the fridge overnight.' : clock.state === 'over' ? 'Health Canada says 2 to 3 days for refrigerated leftovers. Past that, throw it out; smell is not a test.' : clock.thawed ? 'Thawed food: eat it within a day, reheat once, do not refreeze.' : `Reheat only what you will eat, to 74°C. ${recipe?.storage.parts[0]?.reheat ?? ''}`}</p>
        <div class="row row--wrap"><button class="btn btn--sm" type="button" data-act="ate" data-id="${batch.id}" ${clock.state === 'over' ? 'disabled' : ''}>${icon('check', 'ic--sm')} Ate one</button>
          ${clock.where === 'fridge' && !clock.thawed && clock.state !== 'over' && recipe?.storage.freezes !== 'poorly' ? html`<button class="btn btn--quiet btn--sm" type="button" data-act="freeze" data-id="${batch.id}">${icon('snow', 'ic--sm')} Freeze</button>` : ''}
          ${clock.where === 'freezer' ? html`<button class="btn btn--quiet btn--sm" type="button" data-act="thaw" data-id="${batch.id}">Thaw in fridge</button>` : ''}
          <button class="btn btn--quiet btn--sm" type="button" data-act="toss" data-id="${batch.id}">Threw it out</button></div></div></article>`; })}</div>`
    : html`<div class="empty"><p class="empty__t">Nothing cooked and waiting</p><p class="muted small">When you log a recipe as cooked, its leftovers are listed here with a use-by date. You can also add a batch by hand.</p></div>`}
    <button class="btn btn--quiet btn--block" type="button" data-act="addbatch">${icon('plus')} Add a batch</button>

    ${PREP_FLOWS.map(flow => { const base = RECIPE_BY_ID[flow.base]; return html`<section class="frame" aria-label="${flow.title}"><div class="frame__head"><span>Prep once, eat twice</span><span>${flow.portions} portions</span></div><div class="frame__body">
      <h2 class="dish" style="font-size:1.5rem">${flow.title}</h2>
      <ol class="steps">${flow.plan.map((step, index) => { const recipe = RECIPE_BY_ID[step.recipe]; const variation = step.variation ? recipe.variations?.find(item => item.id === step.variation) : null; return html`<li><span class="steps__n">${index + 1}</span><span><strong>${step.when}:</strong> <a href="#/eat/r/${recipe.id}">${variation ? variation.name : recipe.short}</a> (${plural(step.uses, 'portion')}). ${step.why}</span></li>`; })}</ol>
      <p class="small muted">${flow.rest}</p>
      <div class="row row--wrap"><a class="btn btn--sm grow" href="#/eat/r/${base.id}">Cook the base: ${base.time.total} min</a><button class="btn btn--quiet btn--sm" type="button" data-act="flow" data-f="${flow.id}">Put it in my week</button></div></div></section>`; })}

    <section class="frame" aria-label="Texture ratings"><div class="frame__head"><span>How things reheated for you</span><span>${plural(rated.length, 'rating')}</span></div><div class="frame__body">
      ${rated.length ? html`<div class="list">${[...new Set(rated.map(batch => batch.recipeId))].map(id => html`<div class="list__i"><span class="list__m"><span class="title">${RECIPE_BY_ID[id]?.short ?? id}</span><span class="tiny muted" style="display:block">${rated.filter(batch => batch.recipeId === id).map(batch => `${batch.texture}/5 from the ${batch.ratedFrom ?? 'fridge'}`).join(' · ')}</span></span><span class="list__e data">${fmt(textureScore(id), 1)}/5</span></div>`)}</div><p class="tiny muted">Anything that averages 2 or lower drops to the bottom of the shift-lunch swaps and gets a cook-fresh note on its recipe and in the week plan. The date label still decides what is safe.</p>`
    : html`<p class="muted small">After you eat a stored portion, Forme asks one question: how was the texture? Your answers decide which leftovers it suggests again.</p>`}
      <details class="fold"><summary>Safety limits (Health Canada)</summary><div class="fold__b"><p class="small">${FOOD_SAFETY.split}</p><dl class="kv kv--stack">${FOOD_SAFETY.rules.map(rule => html`<dt>${rule.k}</dt><dd>${rule.v} ${extLink(SOURCES[rule.src].url, `Source, ${SOURCES[rule.src].date.toLowerCase()}`)}</dd>`)}</dl></div></details>
    </div></section>
  </div>`;
}

// ---------- fridge ----------
// Fridge chips use the short food name, unless two foods would then read the same.
const chipName = id => { const short = name => name.split(/[,(]/)[0]; const label = short(FOODS[id].name); return FRIDGE_FOODS.some(other => other !== id && short(FOODS[other].name) === label) ? FOODS[id].name : label; };

function fridgePage() {
  const { kitchen } = kitchenWeek();
  const onHand = kitchen.onHand ?? [];
  const matches = fridgeMatches(onHand).filter(match => !(store.get('kitchen').recipes[match.recipe.id]?.skips));
  return html`<div class="wrap kitchen">
    <a class="linkish linkish--quiet" href="#/eat">${icon('arrow-left', 'ic--sm')} Kitchen</a>${tabs('fridge')}
    <header><h1 class="display display--l">What can I make?</h1><p class="muted">Tap what is in the kitchen right now. Oil, spices and sauces are assumed.</p></header>
    ${AISLES.filter(aisle => FRIDGE_FOODS.some(id => FOODS[id].aisle === aisle)).map(aisle => html`<div><p class="eyebrow">${aisle}</p><div class="chips" style="margin-top:6px">${FRIDGE_FOODS.filter(id => FOODS[id].aisle === aisle).map(id => html`<button class="chip chip--mark" type="button" aria-pressed="${onHand.includes(id) ? 'true' : 'false'}" data-act="hand" data-id="${id}">${chipName(id)}</button>`)}</div></div>`)}
    ${onHand.length ? html`<button class="linkish linkish--quiet tiny" type="button" data-act="handclear">Clear everything</button>` : ''}
    ${sec(onHand.length ? `${plural(matches.length, 'match', 'matches')}` : 'Matches', 'Closest first')}
    ${!onHand.length ? html`<div class="empty"><p class="empty__t">Tap a few ingredients</p><p class="muted small">Start with the protein. Three or four taps is enough for a useful answer.</p></div>`
    : matches.length ? html`<div class="stack">${matches.slice(0, 8).map(match => html`<a class="fmatch" href="#/eat/r/${match.recipe.id}">${photoBlock(match.recipe, { size: 'thumb' })}<span class="grow"><span class="dish fmatch__t">${match.recipe.short}</span>
        <span class="meta"><span>${match.covered} of ${match.total} on hand</span><span>${match.recipe.time.total} min</span></span>${meter(match.ratio, 'meter--amber')}
        <span class="tiny muted">${match.missing.length ? `Missing: ${match.missing.slice(0, 4).map(name => name.split(/[,(]/)[0].toLowerCase()).join(', ')}${match.missing.length > 4 ? ` and ${match.missing.length - 4} more` : ''}` : 'You have everything.'}</span></span></a>`)}</div>`
    : html`<div class="empty"><p class="empty__t">No close match</p><p class="muted small">The store-run plate needs three items and no cooking.</p><a class="btn btn--sm" href="#/eat/r/store-run">Open the fallback</a></div>`}
  </div>`;
}

// ---------- sheets ----------
function swapSheet(key, slotId) {
  const { kitchen, week } = kitchenWeek();
  const current = week.flatMap(day => day.slots).find(slot => slot.key === key)?.entry;
  const texture = Object.fromEntries(RECIPES.map(recipe => [recipe.id, textureScore(recipe.id)]).filter(([, value]) => value !== null));
  const options = swapOptions(slotId, current?.r, kitchen.recipes, whey(), texture);
  sheet({ title: current ? 'Swap this meal' : 'Add a meal', eyebrow: SLOTS.find(slot => slot.id === slotId).label,
    body: html`<p class="muted small">Ordered by what you save, rate and cook, then by how close the calories are.${slotId === 'lunch' ? ' Leftovers you rated poorly go to the bottom.' : ''}</p><div class="list">${options.map(option => html`<button class="list__i list__i--tap" type="button" data-act="take" data-r="${option.recipe.id}"><span class="list__m"><span class="title">${option.recipe.short}</span><span class="tiny muted" style="display:block">${option.recipe.time.total} min · ${round(option.per.kcal)} kcal · ${round(option.per.protein)} g protein${kitchen.recipes[option.recipe.id]?.saved ? ' · saved' : ''}${option.reheatsPoorly ? ` · you rated its leftovers ${fmt(texture[option.recipe.id], 1)}/5` : ''}</span></span><span class="list__e data num">${option.delta === null ? '' : `${option.delta > 0 ? '+' : ''}${round(option.delta)}`}</span></button>`)}</div>`,
    actions: { take: (d, _e, _ev, self) => { setSlot(key, { r: d.r }); toast(`${RECIPE_BY_ID[d.r].short} is in. Totals and groceries updated.`); haptic('tap'); self.close(); } } });
}

function adjustSheet(key) {
  const read = () => kitchenWeek().week.flatMap(day => day.slots).find(slot => slot.key === key)?.entry;
  const recipe = RECIPE_BY_ID[read().r];
  sheet({ title: recipe.short, eyebrow: 'Adjust this serving',
    body: () => { const entry = read(); const n = slotTotals(entry, whey()); return html`<p class="data num">${round(n.kcal)} kcal · ${round(n.protein)} g protein · ${round(n.fat)} g fat</p>
      ${recipe.levers.map(lever => html`<div><p class="eyebrow">${lever.label}</p><div class="chips" style="margin-top:6px">${lever.options.map(option => html`<button class="chip" type="button" aria-pressed="${(entry.levers[lever.id] ?? 1) === option[1] ? 'true' : 'false'}" data-act="lv" data-l="${lever.id}" data-v="${option[1]}">${option[0]}</button>`)}</div></div>`)}
      <p class="tiny muted">The grocery list follows these choices.</p>`; },
    actions: { lv: (d, _e, _ev, self) => { const entry = read(); setSlot(key, { ...entry, levers: { ...entry.levers, [d.l]: Number(d.v) } }); self.update(); } } });
}

function textureSheet(batch, from) {
  let value = 3;
  sheet({ title: 'How was the texture?', eyebrow: `${RECIPE_BY_ID[batch.recipeId]?.short ?? 'Leftover'}, from the ${from}`,
    body: () => html`<p class="muted small">This is about texture only. The use-by date covers safety. Would you want it reheated again?</p>
      <div class="segc" role="group" aria-label="Texture out of five">${[1, 2, 3, 4, 5].map(n => html`<button type="button" aria-pressed="${value === n ? 'true' : 'false'}" data-act="pick" data-v="${n}">${n}</button>`)}</div>
      <div class="spread tiny muted"><span>Sad</span><span>Like fresh</span></div>`,
    footer: html`<button class="btn btn--quiet" type="button" data-act="__close">Skip</button><button class="btn" type="button" data-act="save">Save rating</button>`,
    actions: { pick: (d, _e, _ev, self) => { value = Number(d.v); self.update(); }, save: (_d, _e, _ev, self) => { store.update('kitchen', kitchen => { const item = kitchen.batches.find(entry => entry.id === batch.id); if (item) { item.texture = value; item.ratedFrom = from; } }); toast(value <= 2 ? 'Noted. Forme will suggest cooking that one fresh.' : 'Noted.'); self.close(); } } });
}

function addBatchSheet() {
  let recipeId = RECIPES.find(recipe => recipe.tags.includes('batch')).id; let portions = 2; let where = 'fridge'; let madeOn = today();
  sheet({ title: 'Add a batch', eyebrow: 'Use it first',
    body: () => html`<label class="field"><span class="field__l">What is it</span><select class="select" data-change="r">${RECIPES.filter(recipe => recipe.course !== 'shake').map(recipe => html`<option value="${recipe.id}" ${recipe.id === recipeId ? 'selected' : ''}>${recipe.short}</option>`)}</select></label>
      <div class="grid2"><label class="field"><span class="field__l">Portions</span><input class="input input--num" inputmode="numeric" value="${portions}" data-change="p"></label><label class="field"><span class="field__l">Made on</span><input class="input" type="date" value="${madeOn}" max="${today()}" data-change="d"></label></div>
      <div class="segc" role="group" aria-label="Where it is stored"><button type="button" aria-pressed="${where === 'fridge' ? 'true' : 'false'}" data-act="w" data-w="fridge">Fridge</button><button type="button" aria-pressed="${where === 'freezer' ? 'true' : 'false'}" data-act="w" data-w="freezer">Freezer</button></div>`,
    footer: html`<button class="btn btn--block" type="button" data-act="save">Add to the shelf</button>`,
    changes: { r: (_d, el) => { recipeId = el.value; }, p: (_d, el) => { portions = Math.max(1, Math.round(Number(el.value) || 1)); }, d: (_d, el) => { madeOn = el.value || today(); } },
    actions: { w: (d, _e, _ev, self) => { where = d.w; self.update(); }, save: (_d, _e, _ev, self) => { addBatch({ recipeId, part: RECIPE_BY_ID[recipeId].storage.parts[0].name, portions, where, madeOn }); self.close(); } } });
}

export function render(ctx) {
  const sub = ctx.path[1];
  const body = sub === 'list' ? listPage() : sub === 'prep' ? prepPage() : sub === 'fridge' ? fridgePage() : weekPage();
  const where = { week: 'Week plan', list: 'Groceries', prep: 'Use it first', fridge: 'Fridge check' }[sub];
  const toggle = (map, id) => store.update('kitchen', kitchen => { kitchen[map] = { ...kitchen[map], [id]: !kitchen[map][id] }; if (!kitchen[map][id]) delete kitchen[map][id]; });
  const entryAt = key => kitchenWeek().week.flatMap(day => day.slots).find(slot => slot.key === key)?.entry;
  const batchBy = id => store.get('kitchen').batches.find(batch => batch.id === id);
  const oldEdit = change => { const read = store.legacy.shopping(); if (read.error || !read.value) return toast('Those lists could not be read, so nothing was changed.'); try { store.legacy.writeShopping(validateShoppingState(change(read.value))); } catch (error) { toast(error.message); } };
  return {
    room: 'kitchen', where, body,
    after: root => { root.querySelector('[data-form="extra"]')?.addEventListener('submit', event => { event.preventDefault(); const input = root.querySelector('#extraName'); const name = input.value.trim(); if (!name) return; store.update('kitchen', kitchen => { kitchen.extras = [...(kitchen.extras ?? []), { id: uid(), name, checked: false }]; }); }); },
    actions: {
      mode: d => setMode(d.m),
      day: d => { daySel = Number(d.d); ctx.refresh(); },
      kind: d => { const { mode } = kitchenWeek(); store.update('kitchen', kitchen => { const kinds = { ...(kitchen.dayKinds[mode] ?? {}) }; if (d.k) kinds[daySel] = d.k; else delete kinds[daySel]; kitchen.dayKinds[mode] = kinds; const week = { ...(kitchen.weeks[mode] ?? {}) }; for (const key of Object.keys(week)) if (key.startsWith(`${daySel}:`)) delete week[key]; kitchen.weeks[mode] = week; }); },
      portion: d => { const entry = entryAt(d.k); if (entry) setSlot(d.k, { ...entry, p: Math.min(3, Math.max(0.25, round(entry.p + Number(d.d), 2))) }); },
      lite: d => { const entry = entryAt(d.k); if (entry) setSlot(d.k, { ...entry, ver: entry.ver === 'light' ? 'std' : 'light' }); },
      adjust: d => adjustSheet(d.k),
      swap: d => swapSheet(d.k, d.s),
      drop: d => { const before = store.get('kitchen').weeks[kitchenWeek().mode]?.[d.k]; const had = Object.hasOwn(store.get('kitchen').weeks[kitchenWeek().mode] ?? {}, d.k); setSlot(d.k, null); toast('Removed from the day.', { action: 'Undo', onAction: () => { const { mode } = kitchenWeek(); store.update('kitchen', kitchen => { const week = { ...(kitchen.weeks[mode] ?? {}) }; if (had) week[d.k] = before; else delete week[d.k]; kitchen.weeks[mode] = week; }); } }); },
      move: d => { const { profile, week } = kitchenWeek(); const moves = leverMoves(week[daySel], activeTargets(profile), whey()).moves; const move = moves[Number(d.i)]; if (move) { setSlot(move.key, move.change); haptic('tap'); } },
      resetday: () => { const { mode } = kitchenWeek(); store.update('kitchen', kitchen => { const week = { ...(kitchen.weeks[mode] ?? {}) }; for (const key of Object.keys(week)) if (key.startsWith(`${daySel}:`)) delete week[key]; kitchen.weeks[mode] = week; const kinds = { ...(kitchen.dayKinds[mode] ?? {}) }; delete kinds[daySel]; kitchen.dayKinds[mode] = kinds; }); },
      resetweek: async () => { if (!await ask({ title: 'Reset this week?', text: 'Every swap, portion change and day kind in this goal mode goes back to the sample. Saved recipes, ratings and cooking logs are not touched.', yes: 'Reset week' })) return; const { mode } = kitchenWeek(); store.update('kitchen', kitchen => { kitchen.weeks[mode] = {}; kitchen.dayKinds[mode] = {}; }); },
      buy: d => { toggle('checked', d.id); haptic('tap'); },
      have: d => toggle('pantry', d.id),
      unadd: d => store.update('kitchen', kitchen => { kitchen.adds = (kitchen.adds ?? []).filter(item => item.r !== d.r); }),
      xbuy: d => store.update('kitchen', kitchen => { const item = kitchen.extras.find(entry => entry.id === d.id); if (item) item.checked = !item.checked; }),
      xdel: d => store.update('kitchen', kitchen => { kitchen.extras = kitchen.extras.filter(entry => entry.id !== d.id); }),
      shop: () => { shopMode = !shopMode; ctx.refresh(); },
      unbuy: () => store.update('kitchen', kitchen => { kitchen.checked = {}; kitchen.extras = (kitchen.extras ?? []).map(item => ({ ...item, checked: false })); }),
      copy: async () => { const { kitchen, week } = kitchenWeek(); const rows = groceryList(week, kitchen.adds ?? []).filter(item => !kitchen.pantry[item.id]); const text = AISLES.filter(aisle => rows.some(item => item.aisle === aisle)).map(aisle => `${aisle.toUpperCase()}\n${rows.filter(item => item.aisle === aisle).map(item => `[${kitchen.checked[item.id] ? 'x' : ' '}] ${item.name} - ${item.text}`).join('\n')}`).join('\n\n') + ((kitchen.extras ?? []).length ? `\n\nOTHER\n${kitchen.extras.map(item => `[${item.checked ? 'x' : ' '}] ${item.name}`).join('\n')}` : ''); try { await navigator.clipboard.writeText(text); toast('List copied.'); } catch { toast('Copying is blocked in this browser.'); } },
      oldbuy: d => oldEdit(state => toggleItem(state, d.s, d.id)),
      olddel: d => oldEdit(state => removeItem(state, d.s, d.id)),
      ate: d => { const batch = batchBy(d.id); if (!batch) return; const from = batch.where === 'freezer' || batch.thawedOn ? 'freezer' : 'fridge'; const clock = batchClock(batch); store.update('kitchen', kitchen => { const item = kitchen.batches.find(entry => entry.id === d.id); item.left = Math.max(0, item.left - 1); item.lastAte = today(); }); touch(); if (clock.where === 'fridge' && clock.state !== 'over') award('used-first'); haptic('set'); textureSheet(batch, from); },
      freeze: d => { store.update('kitchen', kitchen => { const item = kitchen.batches.find(entry => entry.id === d.id); item.where = 'freezer'; item.frozenOn = today(); }); toast('Moved to the freezer. Label the bag with today’s date.'); },
      thaw: d => { store.update('kitchen', kitchen => { const item = kitchen.batches.find(entry => entry.id === d.id); item.where = 'fridge'; item.thawedOn = today(); }); toast('Thawing in the fridge. Eat it within a day and do not refreeze it.'); },
      toss: d => { const snapshot = structuredClone(store.get('kitchen').batches); store.update('kitchen', kitchen => { kitchen.batches = kitchen.batches.filter(entry => entry.id !== d.id); }); toast('Removed. Throwing food out on time is the right call.', { action: 'Undo', onAction: () => store.update('kitchen', kitchen => { kitchen.batches = snapshot; }) }); },
      addbatch: () => addBatchSheet(),
      flow: d => { const flow = PREP_FLOWS.find(item => item.id === d.f); const start = dow(today()); const picks = flow.id === 'spiced-chicken' ? [[start, 'dinner', { r: 'shawarma-plate' }], [(start + 2) % 7, 'dinner', { r: 'chili-noodles', v: 'cumin' }], [(start + 1) % 7, 'lunch', { r: 'pita-box' }]] : [[start, 'dinner', { r: 'keema-matar' }], [(start + 1) % 7, 'lunch', { r: 'keema-matar', v: 'toastie' }]]; const { mode } = kitchenWeek(); store.update('kitchen', kitchen => { const week = { ...(kitchen.weeks[mode] ?? {}) }; for (const [day, slot, entry] of picks) week[`${day}:${slot}`] = entry; kitchen.weeks[mode] = week; }); toast('Added to your week, starting today.', { action: 'Open week', onAction: () => { location.hash = '#/eat/week'; } }); },
      hand: d => store.update('kitchen', kitchen => { const list = new Set(kitchen.onHand ?? []); if (list.has(d.id)) list.delete(d.id); else list.add(d.id); kitchen.onHand = [...list]; }),
      handclear: () => store.update('kitchen', kitchen => { kitchen.onHand = []; }),
    },
  };
}
