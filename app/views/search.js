// Search: one field over everything Forme knows. Recipes (by name, tag or ingredient), movement
// drills, lifts, your habits, the evidence notes and every screen. Runs on the device; nothing is sent.

import * as store from '../store.js';
import { html, raw, icon, round, plural } from '../ui.js';
import { whey } from '../actions.js';
import { RECIPES } from '../data/recipes.js';
import { FOODS } from '../data/foods.js';
import { EXERCISES as DRILLS, LANES } from '../data/exercises.js';
import { EXERCISES as LIFTS } from '../../assets/training-data.js';
import { CLAIMS, SOURCES } from '../data/evidence.js';
import { recipeTotals } from '../logic/nutrition.js';
import { frame } from '../figure.js';
import { photoBlock } from './eat.js';

const PLACES = [
  ['Today', 'today', 'home dashboard start'],
  ['Train', 'train', 'gym workout lift log session'],
  ['Workout history', 'train/history', 'past sessions log'],
  ['Records', 'train/records', 'pr personal best strongest'],
  ['Leg and hamstring focus', 'train/hams', 'hamstrings legs volume sets'],
  ['Lift library', 'train/library', 'exercises guide form'],
  ['Recipes', 'eat', 'food kitchen cook dinner'],
  ['Sample week', 'eat/week', 'meal plan planner lean gain recomp macros'],
  ['Grocery list', 'eat/list', 'shopping groceries store receipt pantry'],
  ['Prep and Use It First', 'eat/prep', 'leftovers batch meal prep fridge freezer reheat'],
  ['What can I make?', 'eat/fridge', 'fridge finder ingredients on hand'],
  ['Earlier recipe book', 'eat/archive', 'old previous archive'],
  ['Move', 'move', 'posture movement practice'],
  ['Drill library', 'move/library', 'exercises drills stretches'],
  ['Movement evidence', 'move/why', 'research studies sources science'],
  ['When to get checked', 'move/check', 'pain injury doctor physio numb'],
  ['Habits', 'habits', 'routine streak daily'],
  ['Reset', 'reset', 'tidy timer quiet evening check-in bad day'],
  ['Goal and targets', 'you/goal', 'calories protein lean gain recomp mode maintenance weight'],
  ['Progress', 'you/progress', 'weight waist trend chart sleep'],
  ['Settings', 'you/settings', 'motion sound haptics halal seafood heat name'],
  ['Backup and data', 'you/data', 'export import restore delete reset'],
  ['Credits and sources', 'you/credits', 'photos licences creators fonts'],
  ['Stickers and side quests', 'fun', 'night drive play quest'],
  ['Month', 'fun/sheet', 'month calendar days contact sheet'],
  ['Weekly replay', 'fun/replay', 'recap week summary'],
];
const KINDS = [['all', 'Everything'], ['recipe', 'Recipes'], ['drill', 'Movement'], ['lift', 'Lifts'], ['place', 'Screens'], ['note', 'Evidence']];
const TRY = ['chicken', '15 min', 'freezes', 'hamstring', 'ankle', 'shoulder blade', 'protein', 'groceries'];

const words = text => String(text).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(Boolean);

/** Score a haystack made of weighted fields. Every query word must start a word somewhere. */
export function score(query, fields) {
  const q = words(query);
  if (!q.length) return 0;
  let total = 0;
  for (const part of q) {
    let best = 0;
    for (const [text, weight] of fields) {
      const list = words(text);
      const hit = list.findIndex(word => word.startsWith(part));
      if (hit >= 0) best = Math.max(best, weight * (0.6 + 0.4 * (part.length / list[hit].length)) + (hit === 0 ? weight * 0.2 : 0));
    }
    if (!best) return 0;
    total += best;
  }
  return total / q.length;
}

let index = null;
function buildIndex() {
  const items = [];
  for (const recipe of RECIPES) {
    const foods = [...new Set(recipe.ingredients.map(line => FOODS[line.f]?.name ?? ''))].join(' ');
    const quick = recipe.time.total <= 15 ? '15 min 10 min quick fast' : recipe.time.total <= 20 ? '20 min quick' : '';
    items.push({ kind: 'recipe', id: recipe.id, title: recipe.name, route: `eat/r/${recipe.id}`, recipe,
      fields: [[recipe.name, 10], [recipe.short, 9], [`${recipe.tags.join(' ')} ${recipe.cuisine} ${recipe.course} ${quick} ${recipe.storage.freezes === 'well' ? 'freezes freezer' : ''}`, 5], [foods, 4], [recipe.kicker, 3], [recipe.source.creator ?? '', 3], [recipe.source.outlet ?? '', 3]] });
  }
  for (const drill of DRILLS) {
    items.push({ kind: 'drill', id: drill.id, title: drill.name, route: `move/x/${drill.id}`, drill,
      fields: [[drill.name, 10], [`${LANES[drill.lane].name} ${LANES[drill.lane].short}`, 6], [drill.targets.map(target => target.name).join(' '), 5], [drill.what, 3]] });
  }
  for (const lift of Object.values(LIFTS)) {
    items.push({ kind: 'lift', id: lift.id, title: lift.name, route: `train/x/${lift.id}`, sub: lift.muscle,
      fields: [[lift.name, 10], [lift.muscle ?? '', 6], [(lift.variants ?? []).map(variant => (typeof variant === 'string' ? variant : variant.name ?? '')).join(' '), 3]] });
  }
  for (const [title, route, keywords] of PLACES) items.push({ kind: 'place', id: route, title, route, fields: [[title, 9], [keywords, 5]] });
  for (const [lane, claims] of Object.entries(CLAIMS)) {
    claims.forEach((claim, n) => items.push({ kind: 'note', id: `${lane}-${n}`, title: claim.text, route: 'move/why', sub: `${LANES[lane].short} · ${claim.level}${claim.src ? ` · ${SOURCES[claim.src].cite.split('.')[0]}` : ''}`, fields: [[claim.text, 5], [LANES[lane].name, 3]] }));
  }
  return items;
}

function find(query, kind) {
  index ??= buildIndex();
  const habits = store.get('habits').habits.map(habit => ({ kind: 'habit', id: habit.id, title: habit.name, route: 'habits', sub: habit.paused ? 'Paused habit' : 'Habit', fields: [[habit.name, 10]] }));
  return [...index, ...habits].map(item => ({ item, score: score(query, item.fields) })).filter(hit => hit.score > 0 && (kind === 'all' || hit.item.kind === kind || (kind === 'place' && hit.item.kind === 'habit')))
    .sort((a, b) => b.score - a.score).slice(0, 40).map(hit => hit.item);
}

function row(item) {
  if (item.kind === 'recipe') {
    const per = recipeTotals(item.recipe, {}, whey()).per;
    return html`<a class="sres" href="#/${item.route}">${photoBlock(item.recipe, { size: 'thumb' })}<span class="grow"><span class="eyebrow">Recipe · ${item.recipe.time.total} min</span><span class="sres__t dish">${item.recipe.name}</span><span class="data num tiny">${round(per.kcal)} kcal · ${round(per.protein)} g protein</span></span>${icon('chevron-right', 'ic--sm')}</a>`;
  }
  if (item.kind === 'drill') return html`<a class="sres" href="#/${item.route}"><span class="mthumb">${raw(frame(item.drill, { t: 1, targets: false }))}</span><span class="grow"><span class="eyebrow">Movement · ${LANES[item.drill.lane].short}</span><span class="sres__t">${item.title}</span><span class="tiny muted">${item.drill.what}</span></span>${icon('chevron-right', 'ic--sm')}</a>`;
  const label = { lift: 'Lift', place: 'Screen', habit: 'Habit', note: 'Evidence' }[item.kind];
  const glyph = { lift: 'dumbbell', place: 'arrow-right', habit: 'check', note: 'info' }[item.kind];
  return html`<a class="sres" href="#/${item.route}"><span class="sres__g">${icon(glyph)}</span><span class="grow"><span class="eyebrow">${label}</span><span class="sres__t ${item.kind === 'note' ? 'sres__t--note' : ''}">${item.title}</span>${item.sub ? html`<span class="tiny muted">${item.sub}</span>` : ''}</span>${icon('chevron-right', 'ic--sm')}</a>`;
}

function results(query, kind) {
  if (!query.trim()) {
    return html`<div class="empty"><p class="empty__t">Search the whole app</p><p class="muted small">Dishes, ingredients, drills, lifts, your habits, the research notes and every screen.</p>
      <div class="chips" style="justify-content:center">${TRY.map(word => html`<button class="chip" type="button" data-act="try" data-q="${word}">${word}</button>`)}</div></div>`;
  }
  const hits = find(query, kind);
  if (!hits.length) {
    return html`<div class="empty"><p class="empty__t">Nothing for “${query}”</p><p class="muted small">Try one word, or the start of a word: “chick” finds every chicken dish. Seafood is not in Forme at all.</p>
      <div class="row row--wrap" style="justify-content:center"><a class="btn btn--quiet btn--sm" href="#/eat">Browse recipes</a><a class="btn btn--quiet btn--sm" href="#/move/library">Browse drills</a></div></div>`;
  }
  return html`<p class="tiny muted" role="status">${plural(hits.length, 'result')}${hits.length === 40 ? ' (showing the best 40)' : ''}</p><div class="sresults">${hits.map(row)}</div>`;
}

export function render(ctx) {
  let query = ctx.query.get('q') ?? '';
  let kind = KINDS.some(([id]) => id === ctx.query.get('k')) ? ctx.query.get('k') : 'all';
  const sync = () => {
    const params = new URLSearchParams(); if (query.trim()) params.set('q', query.trim()); if (kind !== 'all') params.set('k', kind);
    const text = params.toString();
    history.replaceState(null, '', `#/search${text ? `?${text}` : ''}`);
  };
  const paint = () => {
    const box = document.getElementById('sBox'); if (box) box.innerHTML = String(results(query, kind));
    document.querySelectorAll('[data-act="kind"]').forEach(el => el.setAttribute('aria-pressed', el.dataset.k === kind ? 'true' : 'false'));
  };
  const body = html`<div class="wrap search">
    <header><p class="eyebrow">Search</p><h1 class="display display--l">Search</h1></header>
    <div class="search__bar"><label class="vh" for="sInput">Search Forme</label>${icon('search')}
      <input class="input" id="sInput" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" placeholder="A dish, an ingredient, a drill, a screen" value="${query}" data-input="q"></div>
    <div class="chips" role="group" aria-label="Narrow the results">${KINDS.map(([id, label]) => html`<button class="chip" type="button" aria-pressed="${kind === id ? 'true' : 'false'}" data-act="kind" data-k="${id}">${label}</button>`)}</div>
    <div id="sBox" class="stack">${results(query, kind)}</div>
  </div>`;
  return { room: 'street', where: 'Search', live: false, body,
    after: root => { const input = root.querySelector('#sInput'); if (input && matchMedia('(hover: hover) and (pointer: fine)').matches) input.focus({ preventScroll: true }); },
    inputs: { q: (_d, el) => { query = el.value; sync(); paint(); } },
    actions: {
      kind: d => { kind = d.k; sync(); paint(); },
      try: d => { query = d.q; const input = document.getElementById('sInput'); if (input) input.value = query; sync(); paint(); },
    } };
}
