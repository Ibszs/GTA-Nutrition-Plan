// Quick add: the red button in the dock. One sheet that logs almost anything in a tap or two,
// with a command line on top: "181.4" logs weight, "sleep 7.5" logs sleep, a habit name ticks it,
// a dish or a drill opens it. Nothing here leaves the device.

import * as store from './store.js';
import { html, icon, sheet, toast, haptic, today, fmt, round, plural, loop, dow } from './ui.js';
import { trainingInfo, movementToday, logBody, markCooked, whey } from './actions.js';
import { parseCommand } from './logic/command.js';
import { RECIPES, RECIPE_BY_ID } from './data/recipes.js';
import { EXERCISES as DRILLS } from './data/exercises.js';
import { EXERCISES as LIFTS } from '../assets/training-data.js';
import { todayList } from './logic/habits.js';
import { draftProgress } from './logic/lifts.js';
import { effectiveWeek } from './logic/week.js';
import { recipeTotals } from './logic/nutrition.js';
import { PLANS } from './logic/movement.js';

const UNITS = { weight: ['weight', 'lb', 1], sleep: ['sleep', 'h', 1], waist: ['waist', 'in', 1], kcal: ['kcal', 'kcal', 0], protein: ['protein', 'g', 0] };
const LABELS = { weight: 'Weight', sleep: 'Sleep', waist: 'Waist', kcal: 'Calories eaten', protein: 'Protein eaten' };

function catalog() {
  const habits = store.get('habits').habits.filter(habit => !habit.paused).map(habit => ({ id: habit.id, name: habit.name }));
  const recipes = RECIPES.flatMap(recipe => (recipe.short && recipe.short !== recipe.name ? [{ id: recipe.id, name: recipe.name }, { id: recipe.id, name: recipe.short }] : [{ id: recipe.id, name: recipe.name }]));
  return { habits, recipes, drills: DRILLS.map(drill => ({ id: drill.id, name: drill.name })), lifts: Object.values(LIFTS).map(lift => ({ id: lift.id, name: lift.name })) };
}

/** Run one suggestion. Returns true when the sheet should close. */
function run(result) {
  if (UNITS[result.type]) {
    const [key, unit, digits] = UNITS[result.type];
    const before = store.get('body').entries[today()]?.[key] ?? null;
    logBody(today(), { [key]: result.value });
    haptic('set');
    toast(`${LABELS[result.type]} saved: ${fmt(result.value, digits)} ${unit}`, { action: 'Undo', onAction: () => logBody(today(), { [key]: before }) });
    return true;
  }
  if (result.type === 'habit') {
    const state = store.get('habits'); const habit = state.habits.find(item => item.id === result.id);
    if (!habit) return false;
    const before = state.log;
    import('./views/habits.js').then(module => { module.habitTap(habit); toast(`${habit.name}: ticked`, { action: 'Undo', onAction: () => store.update('habits', next => { next.log = before; }) }); });
    return true;
  }
  if (result.route) { location.hash = `#/${result.route}`; return true; }
  return false;
}

function plannedDinner() {
  const profile = store.get('profile'); const kitchen = store.get('kitchen');
  const week = effectiveWeek(profile.mode, kitchen.weeks[profile.mode] ?? {}, kitchen.dayKinds[profile.mode] ?? {});
  return week[dow(today())].slots.find(slot => slot.slot === 'dinner')?.entry ?? null;
}

export function openQuick() {
  if (document.querySelector('dialog.sheet--quick')) return;
  let text = ''; let results = [];
  const info = trainingInfo();
  const priv = store.get('priv');

  const tiles = () => {
    const { move, session } = movementToday();
    const habits = store.get('habits'); const due = todayList(habits.habits, habits.log, today());
    const entry = store.get('body').entries[today()] ?? {};
    const dinner = plannedDinner(); const recipe = dinner ? RECIPE_BY_ID[dinner.r] : null;
    const cookedToday = recipe ? (store.get('kitchen').recipes[recipe.id]?.cooked ?? []).includes(today()) : false;
    const moveDone = move.plan && move.plan.done >= PLANS[move.plan.kind].sessions;
    return html`
      <div class="qgrid">
        ${info.error ? html`<a class="qbtn" href="#/train">${icon('dumbbell')}<span><b>Train</b><small>Journal needs attention</small></span></a>`
    : info.draft ? html`<a class="qbtn qbtn--live" href="#/train/go">${icon('play')}<span><b>Resume workout</b><small>${draftProgress(info.draft).done} of ${draftProgress(info.draft).total} sets in</small></span></a>`
    : info.planned?.kind === 'session' && !info.planned.completed ? html`<a class="qbtn" href="#/train">${icon('dumbbell')}<span><b>Start ${info.template.name}</b><small>Planned for today</small></span></a>`
    : html`<a class="qbtn" href="#/train">${icon('dumbbell')}<span><b>Log a workout</b><small>Any session, any date</small></span></a>`}
        ${moveDone ? html`<a class="qbtn" href="#/move/done">${icon('figure')}<span><b>Movement recap</b><small>Choose what is next</small></span></a>`
    : html`<button class="qbtn" type="button" data-act="move">${icon('figure')}<span><b>${move.plan ? `Movement, day ${session.n}` : 'Movement, day 1'}</b><small>${move.plan ? `About ${session.minutes} minutes` : 'About 6 minutes'}</small></span></button>`}
        ${moveDone ? '' : html`<button class="qbtn" type="button" data-act="moveshort">${icon('bolt')}<span><b>2-minute movement</b><small>The short version counts</small></span></button>`}
        ${recipe ? html`<button class="qbtn" type="button" data-act="cooked" data-id="${recipe.id}" data-v="${dinner.ver}" ${cookedToday ? 'disabled' : ''}>${icon('flame')}<span><b>${cookedToday ? 'Cooked today' : 'I cooked it'}</b><small>${recipe.short}</small></span></button>` : html`<a class="qbtn" href="#/eat">${icon('flame')}<span><b>Find dinner</b><small>Nothing planned tonight</small></span></a>`}
        <a class="qbtn" href="#/reset">${icon('rotate-ccw')}<span><b>Reset</b><small>One small thing</small></span></a>
        ${moveDone ? html`<a class="qbtn" href="#/eat/list">${icon('receipt')}<span><b>Grocery list</b><small>Tick as you shop</small></span></a>` : ''}
        ${priv.enabled ? html`<button class="qbtn qbtn--wide" type="button" data-act="minute">${icon('timer')}<span><b>I need a minute</b><small>${priv.pauseMin} minute pause</small></span></button>` : ''}
      </div>
      <div class="grid2">
        <label class="field"><span class="field__l">Weight (lb)</span><input class="input input--num" inputmode="decimal" value="${entry.weight ?? ''}" placeholder="${store.get('profile').weight ?? '180.0'}" data-change="num" data-k="weight"></label>
        <label class="field"><span class="field__l">Sleep (h)</span><input class="input input--num" inputmode="decimal" value="${entry.sleep ?? ''}" placeholder="7.5" data-change="num" data-k="sleep"></label>
      </div>
      ${due.length ? html`<div><p class="eyebrow">Habits due today</p><div class="hchips" style="margin-top:8px">${due.map(item => html`<button class="hchip ${item.done ? 'is-done' : ''}" type="button" data-act="habit" data-id="${item.habit.id}" aria-label="${item.habit.name}${item.habit.kind === 'count' ? `, ${item.value} of ${item.habit.target}` : item.done ? ', done' : ', not done'}">
        <span class="hchip__m">${item.done ? loop(false, item.habit.name.length) : ''}${item.habit.kind === 'count' ? item.value : item.done ? '✓' : ''}</span><span>${item.habit.name}${item.habit.kind === 'count' ? html`<small> ${item.value}/${item.habit.target}</small>` : ''}</span></button>`)}</div></div>` : ''}`;
  };

  const list = () => html`<ul class="qres" role="listbox" aria-label="Suggestions">${results.length
    ? results.map((result, index) => html`<li><button class="qres__i" type="button" role="option" aria-selected="${index === 0 ? 'true' : 'false'}" data-act="pick" data-i="${index}"><span>${result.label}</span>${index === 0 ? html`<kbd>Enter</kbd>` : icon('chevron-right', 'ic--sm')}</button></li>`)
    : html`<li class="qres__none">Nothing matches “${text}”. <a href="#/search?q=${encodeURIComponent(text)}">Search everything</a></li>`}</ul>`;

  const api = sheet({
    title: 'Log it.', eyebrow: 'Quick add', cls: 'sheet--quick',
    body: () => html`
      <div class="qcmd"><label class="vh" for="qInput">Type a number, a habit, a dish or a place</label>
        <input class="input qcmd__in" id="qInput" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" placeholder="A number, a habit or a dish" value="${text}" data-input="type">
        <p class="tiny muted">A bare number between 60 and 500 is your weight. Try “waist 33”, “protein 160” or “groceries”.</p></div>
      <div id="qBody">${text.trim() ? list() : tiles()}</div>`,
    inputs: {
      type: (_d, el) => {
        text = el.value; results = parseCommand(text, catalog(), 6);
        const box = api.el.querySelector('#qBody'); if (box) box.innerHTML = String(text.trim() ? list() : tiles());
      },
    },
    changes: {
      num: (d, el) => {
        const value = el.value.trim() === '' ? null : Number(el.value);
        if (value !== null && (!Number.isFinite(value) || value < 0)) return toast('Numbers only.');
        if (d.k === 'weight' && value !== null && (value < 60 || value > 600)) return toast('Enter your weight in pounds.');
        if (d.k === 'sleep' && value !== null && value > 24) return toast('Enter hours of sleep.');
        logBody(today(), { [d.k]: value });
        if (value !== null) toast(`${LABELS[d.k]} saved: ${fmt(value, 1)} ${UNITS[d.k][1]}`);
      },
    },
    actions: {
      pick: (d, _e, _ev, self) => { const result = results[Number(d.i)]; if (result && run(result)) self.close(); },
      move: (_d, _e, _ev, self) => { self.close(); import('./views/move.js').then(module => module.quickStart(false)); },
      moveshort: (_d, _e, _ev, self) => { self.close(); import('./views/move.js').then(module => module.quickStart(true)); },
      minute: (_d, _e, _ev, self) => { self.close(); import('./views/private.js').then(module => module.startMinute()); },
      habit: (d, _e, _ev, self) => { const habit = store.get('habits').habits.find(item => item.id === d.id); if (!habit) return; import('./views/habits.js').then(module => { module.habitTap(habit); self.update(); }); },
      cooked: (d, _e, _ev, self) => {
        const recipe = RECIPE_BY_ID[d.id]; const per = recipeTotals(recipe, { version: d.v }, whey()).per;
        markCooked(d.id, { version: d.v }); haptic('done');
        toast(`${recipe.short} cooked: ${round(per.kcal)} kcal, ${round(per.protein)} g protein a serving`, { action: 'Leftovers?', onAction: () => { location.hash = '#/eat/prep'; } });
        self.close();
      },
    },
  });

  const input = api.el.querySelector('#qInput');
  api.el.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.target.id !== 'qInput') return;
    event.preventDefault();
    const first = results[0];
    if (first && run(first)) api.close();
    else if (text.trim()) { api.close(); location.hash = `#/search?q=${encodeURIComponent(text.trim())}`; }
  });
  // A hardware keyboard gets the cursor straight away; a phone keeps the tiles in view instead.
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) input?.focus({ preventScroll: true });
  return api;
}

export { plural };
