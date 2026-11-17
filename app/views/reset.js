// Reset: a tiny menu for an afternoon that got away. Four actions, all editable, none of them homework.

import * as store from '../store.js';
import { html, icon, sheet, toast, haptic, blip, today, addDays, fmtDay, clock, sec, uid, ticks } from '../ui.js';
import { award, touch, whey } from '../actions.js';
import { pickDinner } from '../logic/week.js';
import { recipeTotals } from '../logic/nutrition.js';

export const DEFAULT_ACTIONS = [
  { id: 'tidy', kind: 'timer', label: 'One-song tidy', minutes: 4, note: 'Put one song on. Tidy one surface until it ends.' },
  { id: 'meal', kind: 'meal', label: 'Quick meal', minutes: 0, note: 'The fastest thing that still counts as a meal.' },
  { id: 'one', kind: 'one', label: 'The one thing', minutes: 0, note: 'Write down the single thing that has to happen today.' },
  { id: 'quiet', kind: 'timer', label: 'Quiet two minutes', minutes: 2, note: 'Sit down. Nothing to do until it ends.' },
];
let running = null; // { id, until, total, label }
let interval = null;
let editMode = false;

export const resetActions = () => store.get('reset').actions ?? DEFAULT_ACTIONS;

function mealSheet() {
  const kitchen = store.get('kitchen');
  const picks = pickDinner({ minutes: 10, energy: 'low', onHand: kitchen.onHand ?? [], memory: kitchen.recipes }).slice(0, 3);
  sheet({ title: 'Quick meal', eyebrow: 'Lowest effort first', body: html`<div class="list">${picks.map(pick => { const per = recipeTotals(pick.recipe, {}, whey()).per; return html`<a class="list__i list__i--tap" href="#/eat/r/${pick.recipe.id}" data-act="__close"><span class="list__m"><span class="title">${pick.recipe.short}</span><span class="tiny muted" style="display:block">${pick.recipe.time.total} min · ${Math.round(per.kcal)} kcal · ${Math.round(per.protein)} g protein</span></span><span class="list__e">${icon('chevron-right')}</span></a>`; })}</div><p class="tiny muted">Not hungry enough for any of these? Have the house shake.</p>` });
}

export function render(ctx) {
  const state = store.get('reset'); const actions = resetActions();
  const evening = state.evenings[today()] ?? {};
  const yesterday = state.evenings[addDays(today(), -1)];
  const one = state.oneThing && !state.oneThing.done ? state.oneThing : null;
  const left = running ? Math.max(0, (running.until - Date.now()) / 1000) : 0;
  const body = html`<div class="wrap cut">
    <a class="linkish linkish--quiet" href="#/today">${icon('arrow-left', 'ic--sm')} Today</a>
    <header class="reset__head"><img src="assets/photos/street-quiet.jpg" alt="" width="1024" height="683" loading="lazy"><div><h1 class="display display--l">Reset</h1><p>Four short things to do when the afternoon has gone badly. One is enough.</p></div></header>

    ${running ? html`<section class="frame timerbox" aria-label="Timer"><div class="frame__body center"><p class="eyebrow">${running.label}</p><p class="clock timerbox__t" id="resetClock" role="timer">${clock(left)}</p><div class="row" style="justify-content:center"><button class="btn btn--quiet btn--sm" type="button" data-act="stop">Stop</button><button class="btn btn--quiet btn--sm" type="button" data-act="plus">+1 min</button></div></div></section>` : ''}

    <div class="rgrid2">${actions.map(action => html`<div class="rtile">${editMode
    ? html`<label class="field"><span class="field__l">Name</span><input class="input" maxlength="40" value="${action.label}" data-change="rename" data-id="${action.id}"></label>
          ${action.kind === 'timer' ? html`<div class="spread" style="margin-top:8px"><span class="eyebrow">Minutes</span><span class="stepper"><button type="button" data-act="mins" data-id="${action.id}" data-d="-1" aria-label="Fewer minutes">−</button><output>${action.minutes}</output><button type="button" data-act="mins" data-id="${action.id}" data-d="1" aria-label="More minutes">+</button></span></div>` : ''}
          <button class="linkish linkish--quiet tiny" type="button" data-act="del" data-id="${action.id}">Remove</button>`
    : html`<button class="rtile__b" type="button" data-act="run" data-id="${action.id}"><span class="rtile__k">${action.kind === 'timer' ? `${action.minutes} min` : action.kind === 'meal' ? 'Food' : 'Write'}</span><span class="rtile__t">${action.label}</span><span class="tiny muted">${action.note}</span></button>`}</div>`)}</div>
    <div class="row row--wrap"><button class="btn btn--quiet btn--sm grow" type="button" data-act="edit">${editMode ? 'Done editing' : 'Edit these'}</button>${editMode ? html`<button class="btn btn--quiet btn--sm" type="button" data-act="addtimer">${icon('plus', 'ic--sm')} Add a timer</button><button class="btn btn--quiet btn--sm" type="button" data-act="defaults">Restore the four</button>` : ''}</div>

    <section class="frame" aria-label="The one thing"><div class="frame__head"><span>The one thing</span><span>${one ? 'Open' : 'Empty'}</span></div><div class="frame__body">
      ${one ? html`<p class="title">${one.text}</p><p class="tiny muted">Written ${fmtDay(one.date, { weekday: 'short', day: 'numeric', month: 'short' })}. It shows on Today until you tick it.</p><div class="row"><button class="btn btn--sm grow" type="button" data-act="onedone">${icon('check', 'ic--sm')} Done</button><button class="btn btn--quiet btn--sm" type="button" data-act="oneclear">Clear</button></div>`
    : html`<form data-form="one" class="row"><label class="vh" for="oneText">The one thing I need to do</label><input class="input grow" id="oneText" maxlength="120" placeholder="Call the landlord. Book the shift. Wash the gym bag."><button class="btn btn--sm" type="submit">Keep</button></form>`}
    </div></section>

    <section class="frame" aria-label="Evening check-in"><div class="frame__head"><span>Evening check-in</span><span>Optional, ten seconds</span></div><div class="frame__body">
      <div><p class="eyebrow">Energy now</p><div class="segc" style="margin-top:6px" role="group" aria-label="Energy, 1 to 5">${[1, 2, 3, 4, 5].map(n => html`<button type="button" aria-pressed="${evening.energy === n ? 'true' : 'false'}" data-act="energy" data-v="${n}">${n}</button>`)}</div></div>
      <div><p class="eyebrow">Appetite</p><div class="segc" style="margin-top:6px" role="group" aria-label="Appetite">${[['low', 'Low'], ['ok', 'Normal'], ['high', 'Hungry']].map(([id, label]) => html`<button type="button" aria-pressed="${evening.appetite === id ? 'true' : 'false'}" data-act="appetite" data-v="${id}">${label}</button>`)}</div></div>
      ${evening.appetite === 'low' ? html`<p class="small">Low appetite? <a href="#/eat/r/house-shake">The house shake</a> is the easiest calories in the kitchen, and the week plan has a <a href="#/eat/week">low appetite day</a>.</p>` : ''}
      <label class="field"><span class="field__l">Tomorrow’s first move</span><input class="input" id="firstMove" maxlength="100" value="${evening.firstMove ?? ''}" placeholder="Shake, then pack the gym bag." data-change="first"></label>
      ${yesterday?.firstMove ? html`<p class="tiny muted">Yesterday you wrote: “${yesterday.firstMove}”.</p>` : ''}
    </div></section>
  </div>`;
  const edit = change => store.update('reset', next => { next.actions = change(structuredClone(next.actions ?? DEFAULT_ACTIONS)); });
  const setEvening = patch => store.update('reset', next => { next.evenings = { ...next.evenings, [today()]: { ...(next.evenings[today()] ?? {}), ...patch } }; });
  return { room: 'street', where: 'Reset', body,
    after: root => {
      clearInterval(interval);
      if (running) interval = setInterval(() => { if (!running) return clearInterval(interval); const now = (running.until - Date.now()) / 1000; const el = document.getElementById('resetClock'); if (el) el.textContent = clock(now); if (now <= 0) { const label = running.label; running = null; clearInterval(interval); haptic('done'); blip('done'); award('reset'); touch(); toast(`${label}: done.`); ctx.refresh(); } }, 500);
      root.querySelector('[data-form="one"]')?.addEventListener('submit', event => { event.preventDefault(); const text = root.querySelector('#oneText').value.trim(); if (!text) return; store.update('reset', next => { next.oneThing = { id: uid(), text, date: today(), done: false }; }); });
    },
    leave: () => clearInterval(interval),
    changes: { rename: (d, el) => edit(list => list.map(item => (item.id === d.id ? { ...item, label: el.value.trim() || item.label } : item))), first: (_d, el) => setEvening({ firstMove: el.value.trim() }) },
    actions: {
      run: d => { const action = actions.find(item => item.id === d.id); if (action.kind === 'timer') { running = { id: action.id, until: Date.now() + action.minutes * 60000, total: action.minutes * 60, label: action.label }; haptic('tap'); ctx.refresh(); } else if (action.kind === 'meal') mealSheet(); else document.getElementById('oneText')?.focus(); },
      stop: () => { running = null; clearInterval(interval); ctx.refresh(); },
      plus: () => { if (running) running.until += 60000; },
      edit: () => { editMode = !editMode; ctx.refresh(); },
      mins: d => edit(list => list.map(item => (item.id === d.id ? { ...item, minutes: Math.min(30, Math.max(1, item.minutes + Number(d.d))) } : item))),
      del: d => edit(list => list.filter(item => item.id !== d.id)),
      addtimer: () => edit(list => [...list, { id: uid(), kind: 'timer', label: 'New timer', minutes: 5, note: 'Yours to name.' }]),
      defaults: () => store.update('reset', next => { next.actions = null; }),
      onedone: () => { store.update('reset', next => { next.oneThing = { ...next.oneThing, done: true }; }); award('reset'); touch(); toast('Done. That was the one thing.'); },
      oneclear: () => store.update('reset', next => { next.oneThing = null; }),
      energy: d => setEvening({ energy: Number(d.v) }),
      appetite: d => setEvening({ appetite: d.v }),
    } };
}

export { ticks };
