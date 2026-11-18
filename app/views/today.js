// Today: a personal home screen. Start or resume a workout, find dinner, run a short movement
// session or tick a habit within a few seconds. Modules can be pinned, hidden and reordered.

import * as store from '../store.js';
import { html, raw, icon, sheet, toast, haptic, today, addDays, weekDays, fmtDay, relDay, sec, plural, fmt, round, num, partOfDay, loop, DOW, dow } from '../ui.js';
import { trainingInfo, movementToday, dayActivity, logBody, whey, batchClock, award, touch } from '../actions.js';
import { RECIPE_BY_ID } from '../data/recipes.js';
import { FOODS } from '../data/foods.js';
import { LANES } from '../data/exercises.js';
import { PLANS } from '../logic/movement.js';
import { recipeTotals, MODES } from '../logic/nutrition.js';
import { effectiveWeek, pickDinner, slotTotals } from '../logic/week.js';
import { todayList, countOn } from '../logic/habits.js';
import { habitTap } from './habits.js';
import { photoBlock } from './eat.js';
import { QUESTS, questFor } from '../data/fun.js';
import { draftProgress, lastComparable, sessionStats } from '../logic/lifts.js';
import { getSessionTemplate } from '../../assets/training-program.js';

let justTapped = null; // the habit whose mark should draw itself on the next paint

export const MODULES = [
  { id: 'now', name: 'Workout', note: 'Start or resume in one tap' },
  { id: 'home', name: 'Just got home and Pick for me', note: 'Two shortcuts for the evening' },
  { id: 'week', name: 'This week', note: 'Seven days and what you did on each' },
  { id: 'dinner', name: 'Dinner', note: 'Tonight from your week plan' },
  { id: 'move', name: 'Movement', note: 'Today’s short practice' },
  { id: 'habits', name: 'Habits', note: 'Tick the ones due today' },
  { id: 'checkin', name: 'Morning numbers', note: 'Weight and sleep' },
  { id: 'usefirst', name: 'Use it first', note: 'Cooked food that needs eating' },
  { id: 'one', name: 'The one thing', note: 'What you wrote in Reset' },
  { id: 'quest', name: 'Side quest', note: 'One small optional task a day' },
  { id: 'minute', name: 'A minute', note: 'Only shown if you turned it on' },
];
const layout = () => { const saved = store.get('ui').modules; const known = new Map(MODULES.map(module => [module.id, module])); const list = (saved ?? []).filter(item => known.has(item.id)); for (const module of MODULES) if (!list.some(item => item.id === module.id)) list.push({ id: module.id, hidden: false, pinned: false }); return list; };

function tonight() {
  const profile = store.get('profile'); const kitchen = store.get('kitchen');
  const week = effectiveWeek(profile.mode, kitchen.weeks[profile.mode] ?? {}, kitchen.dayKinds[profile.mode] ?? {});
  const entry = week[dow(today())].slots.find(slot => slot.slot === 'dinner')?.entry;
  return entry ? { entry, recipe: RECIPE_BY_ID[entry.r], per: slotTotals(entry, whey()) } : null; // includes the planned portion
}

// ---------- modules ----------
const render = {
  now() {
    const info = trainingInfo();
    if (info.error) return html`<a class="frame frame--press" href="#/train"><div class="frame__head"><span>Workout</span><span>Needs attention</span></div><div class="frame__body"><p class="title">The training journal could not be read.</p><p class="small muted">Nothing was overwritten. Open Train for options.</p></div></a>`;
    const { state, planned, template, draft, draftTemplate } = info;
    const last = template ? lastComparable(state.sessions, template.id) : null;
    const title = draft ? draftTemplate.name : planned?.kind === 'session' ? template.name : 'Rest day';
    const done = planned?.completed;
    const meta = draft ? `${draftProgress(draft).done} of ${draftProgress(draft).total} sets logged. Started ${relDay(draft.date).toLowerCase()}.`
      : planned?.kind === 'session' ? (done ? 'Logged for today.' : `${template.focus}.${last ? ` Last time: ${fmtDay(last.date, { day: 'numeric', month: 'short' })}, ${plural(sessionStats(last).sets, 'set')}.` : ''}`)
      : 'Nothing is planned in the gym today.';
    const kicker = draft ? html`<span class="tag tag--mark">Recording</span>` : done ? 'Done today' : planned?.kind === 'session' ? 'In the gym today' : 'Today';
    const go = draft ? html`<a class="btn btn--go btn--mark" href="#/train/go"><span>Resume workout</span>${icon('arrow-right')}</a>`
      : planned?.kind === 'session' && !done ? html`<a class="btn btn--go" href="#/train"><span>Start ${template.name}</span>${icon('arrow-right')}</a>`
      : html`<a class="btn btn--go btn--ghost" href="#/train"><span>Open Train</span>${icon('arrow-right')}</a>`;
    return html`<section class="slab slab--bleed slab--lead" aria-label="Workout">
      <p class="slab__k"><span>${kicker}</span><span>${planned ? `Day ${planned.cycleDay} of 7` : ''}</span></p>
      <h1 class="display ${title.length <= 6 ? 'display--xl' : ''} head-in">${title}</h1>
      <p class="slab__sub">${meta}</p>
      <figure class="slab__ph"><img src="assets/photos/street-toronto.jpg" alt="" width="1024" height="683" fetchpriority="high"></figure>
      <div class="slab__go">${go}</div></section>`;
  },
  home() {
    return html`<div class="shortcuts"><button class="shortcut" type="button" data-act="gothome">${icon('door')}<span><b>Just got home</b><small>Dinner, what is still open today, and a two-minute option</small></span></button>
      <button class="shortcut" type="button" data-act="pickforme">${icon('dice')}<span><b>Pick for me</b><small>One dinner, chosen from your time and energy</small></span></button></div>`;
  },
  week() {
    const days = weekDays(today()).map(day => (day <= today() ? dayActivity(day) : { day, kinds: 0, train: [], cooked: [], move: [], habits: { done: 0 } }));
    return html`<section aria-label="This week">${sec('This week', html`<a href="#/fun/sheet">Month</a>`)}
      <div class="strip" style="margin-top:8px">${days.map((act, index) => html`<a class="fr ${act.day === today() ? 'fr--today' : ''} ${act.kinds ? 'fr--lit' : ''}" href="#/fun/sheet" aria-label="${fmtDay(act.day)}: ${act.kinds ? `${act.train.length ? 'lifted, ' : ''}${act.cooked.length ? 'cooked, ' : ''}${act.move.length ? 'moved, ' : ''}${act.habits.done ? 'habits' : ''}` : 'nothing logged'}">
        <span class="fr__d">${DOW[index]}</span><span class="fr__n">${Number(act.day.slice(8))}</span><span class="fr__s">${act.train.length ? raw('<i class="t"></i>') : ''}${act.cooked.length ? raw('<i class="e"></i>') : ''}${act.move.length ? raw('<i class="m"></i>') : ''}${act.habits.done ? raw('<i class="h"></i>') : ''}</span>${act.kinds >= 2 ? loop(false, index) : ''}</a>`)}</div></section>`;
  },
  dinner() {
    const pick = tonight();
    if (!pick) return html`<section aria-label="Dinner">${sec('Dinner')}<div class="empty" style="margin-top:10px"><p class="empty__t">Nothing planned tonight</p><div class="row" style="justify-content:center"><button class="btn btn--sm" type="button" data-act="pickforme">Pick for me</button><a class="btn btn--quiet btn--sm" href="#/eat">Browse</a></div></div></section>`;
    return html`<section aria-label="Dinner">${sec('Dinner', html`<a href="#/eat/week">Change</a>`)}
      <a class="dinner" href="#/eat/r/${pick.recipe.id}?v=${pick.entry.ver}">${photoBlock(pick.recipe, { size: 'thumb' })}<span class="grow"><span class="eyebrow">${pick.recipe.time.total} min · ${pick.entry.ver === 'light' ? 'lighter version' : 'as written'}</span><span class="dinner__t">${pick.recipe.name}</span><span class="meta"><span>${round(pick.per.kcal)} kcal</span><span>${round(pick.per.protein)} g protein</span></span></span>${icon('chevron-right')}</a></section>`;
  },
  move() {
    const { move, session } = movementToday();
    if (!move.plan) return html`<section aria-label="Movement">${sec('Movement')}<div class="frame" style="margin-top:10px"><div class="frame__body"><p class="title">Posture and movement, 7 days</p><p class="small muted">About six minutes. You choose a focus on the first screen: pelvis, ankles, knees or upper back.</p><div class="row row--wrap"><button class="btn btn--sm grow" type="button" data-act="movestart">${icon('play', 'ic--sm')} Start day 1</button><a class="btn btn--quiet btn--sm" href="#/move">About the plan</a></div></div></div></section>`;
    const sessions = move.sessions.filter(item => item.planId === move.plan.id); const doneToday = sessions.at(-1)?.date === today();
    if (move.plan.done >= PLANS[move.plan.kind].sessions) return html`<section aria-label="Movement">${sec('Movement')}<a class="frame frame--press" style="margin-top:10px" href="#/move/done"><div class="frame__body"><p class="title">${PLANS[move.plan.kind].name} finished</p><p class="small muted">See the recap and choose what is next.</p></div></a></section>`;
    return html`<section aria-label="Movement">${sec('Movement', html`<a href="#/move">Open</a>`)}
      <div class="frame" style="margin-top:10px"><div class="frame__head"><span>Day ${session.n} of ${session.of}</span><span>${LANES[move.plan.primary].short}${move.plan.secondary ? ` + ${LANES[move.plan.secondary].short}` : ''}</span></div><div class="frame__body">
        <p class="title">${session.title}</p><p class="small muted">${doneToday ? 'Done today. You can run it again.' : `${plural(session.items.length, 'drill')}, about ${session.minutes} minutes.`}</p>
        <div class="row row--wrap"><button class="btn btn--sm grow" type="button" data-act="movestart">${icon('play', 'ic--sm')} ${doneToday ? 'Again' : 'Start'}</button><button class="btn btn--quiet btn--sm" type="button" data-act="moveshort">${icon('bolt', 'ic--sm')} 2 min</button></div></div></div></section>`;
  },
  habits() {
    const state = store.get('habits'); const list = todayList(state.habits, state.log, today());
    if (!state.habits.length) return html`<section aria-label="Habits">${sec('Habits')}<a class="frame frame--press" style="margin-top:10px" href="#/habits"><div class="frame__body"><p class="title">Add a habit</p><p class="small muted">Anything you want to repeat: bed on time, reading, a short walk. There are suggestions to start from.</p></div></a></section>`;
    return html`<section aria-label="Habits">${sec('Habits', html`<a href="#/habits">${list.filter(item => item.done).length} of ${list.length} done</a>`)}
      ${list.length ? html`<div class="hchips" style="margin-top:10px">${list.map(item => html`<button class="hchip ${item.done ? 'is-done' : ''}" type="button" role="${item.habit.kind === 'count' ? 'button' : 'checkbox'}" ${item.habit.kind === 'count' ? '' : raw(`aria-checked="${item.done ? 'true' : 'false'}"`)} data-act="habit" data-id="${item.habit.id}" aria-label="${item.habit.name}${item.habit.kind === 'count' ? `, ${item.value} of ${item.habit.target}` : ''}">
        <span class="hchip__m">${item.done ? loop(item.habit.id === justTapped, item.habit.name.length) : ''}${item.habit.kind === 'count' ? item.value : item.done ? '✓' : ''}</span><span>${item.habit.name}${item.habit.kind === 'count' ? html`<small> ${item.value}/${item.habit.target}</small>` : ''}</span></button>`)}</div>` : html`<p class="small muted" style="margin-top:10px">Nothing due today.</p>`}</section>`;
  },
  checkin() {
    const entry = store.get('body').entries[today()] ?? {};
    return html`<section aria-label="Morning numbers">${sec('Morning numbers', html`<a href="#/you/progress">Trends</a>`)}
      <div class="grid2" style="margin-top:10px"><label class="field"><span class="field__l">Weight (lb)</span><input class="input input--num" id="tWeight" inputmode="decimal" value="${entry.weight ?? ''}" placeholder="${store.get('profile').weight ?? '180.0'}" data-change="weight"></label>
        <label class="field"><span class="field__l">Sleep (h)</span><input class="input input--num" id="tSleep" inputmode="decimal" value="${entry.sleep ?? ''}" placeholder="7.5" data-change="sleep"></label></div></section>`;
  },
  usefirst() {
    const batches = store.get('kitchen').batches.filter(batch => batch.left > 0).map(batch => ({ batch, clock: batchClock(batch) })).filter(item => item.clock.where === 'fridge').sort((a, b) => a.clock.left - b.clock.left).slice(0, 2);
    if (!batches.length) return '';
    return html`<section aria-label="Use it first">${sec('Use it first', html`<a href="#/eat/prep">All</a>`)}<div class="list" style="margin-top:4px">${batches.map(({ batch, clock }) => html`<a class="list__i list__i--tap" href="#/eat/prep"><span class="tag ${clock.state === 'over' ? 'tag--mark' : clock.state === 'last' ? 'tag--amber' : 'tag--line'}">${clock.state === 'over' ? 'Past limit' : clock.state === 'last' ? 'Today' : clock.state === 'soon' ? 'By tomorrow' : plural(clock.left, 'day')}</span><span class="list__m"><span class="title">${RECIPE_BY_ID[batch.recipeId]?.short ?? batch.part}</span><span class="tiny muted" style="display:block">${plural(batch.left, 'portion')} · made ${fmtDay(batch.madeOn, { weekday: 'short' })}</span></span></a>`)}</div></section>`;
  },
  one() {
    const reset = store.get('reset'); const one = reset.oneThing && !reset.oneThing.done ? reset.oneThing : null; const first = reset.evenings[addDays(today(), -1)]?.firstMove;
    return html`<section aria-label="The one thing">${sec(one ? 'The one thing' : 'Reset', html`<a href="#/reset">Open Reset</a>`)}
      ${one ? html`<div class="row" style="margin-top:10px"><button class="hchip" type="button" data-act="onedone" aria-label="Mark done: ${one.text}"><span class="hchip__m"></span><span>${one.text}</span></button></div>`
    : html`<p class="small muted" style="margin-top:10px">${first ? `Last night you set today’s first move: “${first}”.` : 'Four short things for a bad afternoon: tidy, eat, write one thing down, or sit for two minutes.'}</p>`}</section>`;
  },
  quest() {
    const fun = store.get('fun'); if (!fun.enabled) return '';
    const quest = fun.quests[today()] ?? { offset: 0, done: false };
    return html`<section aria-label="Side quest">${sec('Side quest', html`<a href="#/fun">Stickers</a>`)}
      <div class="quest" style="margin-top:10px"><p>${QUESTS[questFor(today(), quest.offset)]}</p>${quest.done ? html`<span class="tag tag--amber">Done</span>` : html`<button class="btn btn--xs btn--quiet" type="button" data-act="questdone">Did it</button>`}</div></section>`;
  },
  minute() {
    const priv = store.get('priv'); if (!priv.enabled || priv.hideOnToday) return '';
    const due = priv.checkDue && new Date(priv.checkDue) <= new Date();
    return html`<section aria-label="A minute"><button class="btn btn--quiet btn--block" type="button" data-act="minute">I need a minute</button>${due ? html`<p class="tiny muted" style="margin-top:6px">A check-in is waiting. <a href="#/private">Open</a></p>` : ''}</section>`;
  },
};

// ---------- sheets ----------
function gotHomeSheet() {
  const info = trainingInfo(); const { move, session } = movementToday(); const habits = store.get('habits');
  const kitchen = store.get('kitchen'); const planned = tonight();
  const easy = planned && planned.recipe.time.total <= 20 ? planned.recipe : pickDinner({ minutes: 15, energy: 'low', onHand: kitchen.onHand ?? [], memory: kitchen.recipes })[0].recipe;
  const per = recipeTotals(easy, {}, whey()).per;
  const due = todayList(habits.habits, habits.log, today()).filter(item => !item.done && !item.skipped);
  const moveDone = move.plan && move.sessions.at(-1)?.date === today();
  const reset = store.get('reset'); const one = reset.oneThing && !reset.oneThing.done ? reset.oneThing : null;
  const urgent = kitchen.batches.filter(batch => batch.left > 0).map(batch => ({ batch, clock: batchClock(batch) })).filter(item => item.clock.where === 'fridge' && ['last', 'soon'].includes(item.clock.state));
  const left = [];
  if (info.draft) left.push(html`<a class="list__i list__i--tap" href="#/train/go" data-act="__close"><span class="list__m"><span class="title">Workout still open</span><span class="tiny muted" style="display:block">${draftProgress(info.draft).done} of ${draftProgress(info.draft).total} sets. Finish it or save it as partial.</span></span><span class="list__e">${icon('chevron-right')}</span></a>`);
  else if (info.planned?.kind === 'session' && !info.planned.completed) left.push(html`<a class="list__i list__i--tap" href="#/train" data-act="__close"><span class="list__m"><span class="title">${info.template.name} is planned</span><span class="tiny muted" style="display:block">You can skip it. Missed sessions do not stack up.</span></span><span class="list__e">${icon('chevron-right')}</span></a>`);
  if (move.plan && !moveDone && session) left.push(html`<button class="list__i list__i--tap" type="button" data-act="movestart"><span class="list__m"><span class="title">Movement, day ${session.n}</span><span class="tiny muted" style="display:block">${session.minutes} minutes, or 2.</span></span><span class="list__e">${icon('play', 'ic--sm')}</span></button>`);
  for (const item of urgent) left.push(html`<a class="list__i list__i--tap" href="#/eat/prep" data-act="__close"><span class="list__m"><span class="title">Eat the ${RECIPE_BY_ID[item.batch.recipeId]?.short.toLowerCase() ?? 'leftovers'}</span><span class="tiny muted" style="display:block">${item.clock.state === 'last' ? 'Today is its last day in the fridge.' : 'Use by tomorrow.'}</span></span><span class="list__e">${icon('chevron-right')}</span></a>`);
  if (one) left.push(html`<div class="list__i"><span class="list__m"><span class="title">${one.text}</span><span class="tiny muted" style="display:block">The one thing you wrote down.</span></span></div>`);
  sheet({ title: 'Home', eyebrow: `${partOfDay()} · ${fmtDay(today(), { weekday: 'long' })}`,
    body: () => { const state = store.get('habits'); return html`
      <a class="dinner dinner--sheet" href="#/eat/r/${easy.id}" data-act="__close">${photoBlock(easy, { size: 'thumb' })}<span class="grow"><span class="eyebrow">One easy dinner · ${easy.time.total} min</span><span class="dinner__t">${easy.name}</span><span class="meta"><span>${round(per.kcal)} kcal</span><span>${round(per.protein)} g protein</span></span></span>${icon('chevron-right')}</a>
      <p class="eyebrow">Still open today</p>
      ${left.length || due.length ? html`<div class="list">${left}</div>${due.length ? html`<div class="hchips">${due.map(item => html`<button class="hchip ${countOn(state.log, item.habit, today()) >= (item.habit.kind === 'count' ? item.habit.target : 1) ? 'is-done' : ''}" type="button" data-act="habit" data-id="${item.habit.id}"><span class="hchip__m">${item.habit.kind === 'count' ? countOn(state.log, item.habit, today()) : ''}</span><span>${item.habit.name}</span></button>`)}</div>` : ''}` : html`<p class="muted small">Nothing left for today.</p>`}
      <p class="eyebrow">If you only have two minutes</p>
      <div class="grid2"><button class="btn btn--quiet btn--sm" type="button" data-act="moveshort">${icon('bolt', 'ic--sm')} Move, 2 min</button><a class="btn btn--quiet btn--sm" href="#/reset" data-act="__close">Quiet 2 min</a></div>`; },
    footer: html`<button class="btn btn--quiet btn--block" type="button" data-act="__close">Not now</button>`,
    actions: {
      habit: (d, _e, _ev, self) => { const habit = store.get('habits').habits.find(item => item.id === d.id); habitTap(habit); self.update(); },
      movestart: (_d, _e, _ev, self) => { self.close(); import('./move.js').then(module => module.quickStart(false)); },
      moveshort: (_d, _e, _ev, self) => { self.close(); import('./move.js').then(module => module.quickStart(true)); },
    } });
}

const HAND = ['chickenThigh', 'chickenBreast', 'cookedChicken', 'beef90', 'egg', 'tortilla', 'rice', 'ramen', 'pasta', 'potato', 'sweetPotato', 'yogurt0', 'pita', 'hummus'];
function pickSheet() {
  const kitchen = store.get('kitchen');
  let minutes = 20; let energy = 'ok'; const hand = new Set((kitchen.onHand ?? []).filter(id => HAND.includes(id))); let result = null; let skipped = [];
  const go = () => { result = pickDinner({ minutes, energy, onHand: [...hand, ...(kitchen.onHand ?? [])], memory: kitchen.recipes, exclude: skipped })[0] ?? null; };
  sheet({ title: result ? 'Make this' : 'Pick for me', eyebrow: 'Dinner',
    body: () => { if (!result) return html`
        <div><p class="eyebrow">Time you have</p><div class="segc" style="margin-top:6px">${[10, 20, 30, 45].map(value => html`<button type="button" aria-pressed="${minutes === value ? 'true' : 'false'}" data-act="time" data-v="${value}">${value}${value === 45 ? '+' : ''} min</button>`)}</div></div>
        <div><p class="eyebrow">Energy</p><div class="segc" style="margin-top:6px">${[['low', 'Low'], ['ok', 'Okay'], ['good', 'Good']].map(([id, label]) => html`<button type="button" aria-pressed="${energy === id ? 'true' : 'false'}" data-act="energy" data-v="${id}">${label}</button>`)}</div></div>
        <div><p class="eyebrow">What is in the kitchen</p><div class="chips" style="margin-top:6px">${HAND.map(id => html`<button class="chip chip--mark" type="button" aria-pressed="${hand.has(id) ? 'true' : 'false'}" data-act="hand" data-id="${id}">${FOODS[id].name.split(/[,(]/)[0]}</button>`)}</div><p class="tiny muted" style="margin-top:6px">Skip this if you do not know. Forme will pick on time and energy alone.</p></div>`;
      const recipe = result.recipe; const per = recipeTotals(recipe, {}, whey()).per;
      return html`${photoBlock(recipe, { size: 'tonight' })}
        <h3 class="dish" style="font-size:2.4rem">${recipe.name}</h3><p class="data num">${recipe.time.total} min · ${round(per.kcal)} kcal · ${round(per.protein)} g protein</p>
        <ul class="dots">${result.why.map(line => html`<li>${line.charAt(0).toUpperCase()}${line.slice(1)}.</li>`)}</ul>`; },
    footer: () => (result ? html`<button class="btn btn--quiet" type="button" data-act="nope">Not this one</button><a class="btn" href="#/eat/r/${result.recipe.id}" data-act="__close">Cook it</a>` : html`<button class="btn btn--quiet" type="button" data-act="__close">Cancel</button><button class="btn" type="button" data-act="pick">Pick</button>`),
    actions: {
      time: (d, _e, _ev, self) => { minutes = Number(d.v); self.update(); }, energy: (d, _e, _ev, self) => { energy = d.v; self.update(); },
      hand: (d, _e, _ev, self) => { if (hand.has(d.id)) hand.delete(d.id); else hand.add(d.id); self.update(); },
      pick: (_d, _e, _ev, self) => { store.update('kitchen', next => { next.onHand = [...new Set([...(next.onHand ?? []).filter(id => !HAND.includes(id)), ...hand])]; }); go(); haptic('set'); self.update(); },
      nope: (_d, _e, _ev, self) => { skipped = [...skipped, result.recipe.id]; go(); if (!result) { skipped = []; go(); toast('That was everything that fits. Starting the list over.'); } self.update(); },
    } });
}

function layoutSheet() {
  sheet({ title: 'Edit layout', eyebrow: 'Today',
    body: () => { const list = layout(); return html`<p class="muted small">Pinned sections go to the top. Hidden ones are still in their own tab.</p>
      <ul class="lay">${list.map((item, index) => { const module = MODULES.find(entry => entry.id === item.id); return html`<li class="${item.hidden ? 'is-hidden' : ''}"><span class="grow"><span class="title" style="font-size:.98rem">${module.name}</span><span class="tiny muted" style="display:block">${item.hidden ? 'Hidden' : item.pinned ? 'Pinned' : module.note}</span></span>
        <button class="icon-btn" type="button" data-act="up" data-i="${index}" ${index === 0 ? 'disabled' : ''} aria-label="Move ${module.name} up">${icon('arrow-up', 'ic--sm')}</button><button class="icon-btn" type="button" data-act="down" data-i="${index}" ${index === list.length - 1 ? 'disabled' : ''} aria-label="Move ${module.name} down">${icon('arrow-down', 'ic--sm')}</button>
        <button class="icon-btn" type="button" aria-pressed="${item.pinned ? 'true' : 'false'}" data-act="pin" data-i="${index}" aria-label="${item.pinned ? 'Unpin' : 'Pin'} ${module.name}">${icon('bookmark', 'ic--sm')}</button>
        <button class="icon-btn" type="button" aria-pressed="${item.hidden ? 'true' : 'false'}" data-act="hide" data-i="${index}" aria-label="${item.hidden ? 'Show' : 'Hide'} ${module.name}">${icon(item.hidden ? 'eye-off' : 'eye', 'ic--sm')}</button></li>`; })}</ul>`; },
    footer: html`<button class="btn btn--quiet" type="button" data-act="reset">Default layout</button><button class="btn" type="button" data-act="__close">Done</button>`,
    actions: {
      up: (d, _e, _ev, self) => { const list = layout(); const i = Number(d.i); [list[i - 1], list[i]] = [list[i], list[i - 1]]; store.update('ui', ui => { ui.modules = list; }); self.update(); },
      down: (d, _e, _ev, self) => { const list = layout(); const i = Number(d.i); [list[i + 1], list[i]] = [list[i], list[i + 1]]; store.update('ui', ui => { ui.modules = list; }); self.update(); },
      pin: (d, _e, _ev, self) => { const list = layout(); list[Number(d.i)].pinned = !list[Number(d.i)].pinned; store.update('ui', ui => { ui.modules = list; }); self.update(); },
      hide: (d, _e, _ev, self) => { const list = layout(); list[Number(d.i)].hidden = !list[Number(d.i)].hidden; store.update('ui', ui => { ui.modules = list; }); self.update(); },
      reset: (_d, _e, _ev, self) => { store.update('ui', ui => { ui.modules = null; }); self.update(); },
    } });
}

function page() {
  const profile = store.get('profile'); const list = layout();
  const order = [...list.filter(item => item.pinned && !item.hidden), ...list.filter(item => !item.pinned && !item.hidden)];
  const hidden = list.filter(item => item.hidden).length;
  return html`<div class="wrap today cut">
    ${order.map(item => render[item.id]?.() ?? '')}
    <footer class="today__foot"><button class="btn btn--quiet btn--sm" type="button" data-act="layout">${icon('sliders-horizontal', 'ic--sm')} Edit layout${hidden ? ` · ${hidden} hidden` : ''}</button><span class="tiny faint">${MODES[profile.mode].name} · saved on this device</span></footer>
  </div>`;
}

function renderToday() {
  return { room: 'street', where: 'Today', body: page(),
    after: () => { justTapped = null; },
    changes: {
      weight: (_d, el) => { const value = num(el.value); if (el.value.trim() === '') return logBody(today(), { weight: null }); if (value === null || value < 60 || value > 600) return toast('Enter your weight in pounds.'); logBody(today(), { weight: value }); toast(`Weight saved: ${fmt(value, 1)} lb.`); },
      sleep: (_d, el) => { const value = num(el.value); if (el.value.trim() === '') return logBody(today(), { sleep: null }); if (value === null || value < 0 || value > 24) return toast('Enter hours of sleep.'); logBody(today(), { sleep: value }); toast(`Sleep saved: ${fmt(value, 1)} h.`); },
    },
    actions: {
      gothome: () => gotHomeSheet(), pickforme: () => pickSheet(), layout: () => layoutSheet(),
      habit: d => { const before = store.get('habits').log; const habit = store.get('habits').habits.find(item => item.id === d.id); justTapped = d.id; habitTap(habit); toast(`${habit.name}: updated`, { action: 'Undo', onAction: () => store.update('habits', next => { next.log = before; }) }); },
      movestart: () => import('./move.js').then(module => module.quickStart(false)),
      moveshort: () => import('./move.js').then(module => module.quickStart(true)),
      onedone: () => { store.update('reset', next => { next.oneThing = { ...next.oneThing, done: true }; }); award('reset'); touch(); toast('Marked done.'); },
      questdone: () => { store.update('fun', fun => { fun.quests = { ...fun.quests, [today()]: { ...(fun.quests[today()] ?? { offset: 0 }), done: true } }; }); award('quest'); touch(); haptic('done'); },
      minute: () => import('./private.js').then(module => module.startMinute()),
    } };
}

export { renderToday as render, getSessionTemplate };
