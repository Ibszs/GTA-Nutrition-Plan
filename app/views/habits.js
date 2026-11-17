// Habits: recurring things you want to do, on the days you choose. Yes/no or a count.
// A missed day gets a next action, not a verdict. Streaks can be muted entirely.

import * as store from '../store.js';
import { html, raw, icon, sheet, ask, toast, haptic, today, addDays, fmtDay, sec, plural, uid, loop, slash, DOW, extLink } from '../ui.js';
import { touch } from '../actions.js';
import { SEEDS, isDue, isDone, isSkipped, countOn, tap, setCount, skip, weekPattern, streak, rate, nextStep } from '../logic/habits.js';
import { HABIT_CLAIMS, SOURCES } from '../data/evidence.js';

let viewDay = today();
let justTapped = null; // the habit whose mark should draw itself on the next paint

export function habitTap(habit, day = today()) {
  store.update('habits', state => { state.log = tap(state.log, habit, day); });
  haptic('set'); touch();
}

const dayLetters = days => (days.length === 7 ? 'Every day' : days.length === 5 && [0, 1, 2, 3, 4].every(d => days.includes(d)) ? 'Weekdays' : days.map(d => DOW[d]).join(' '));

function editSheet(existing) {
  const fresh = !existing;
  const draft = existing ? structuredClone(existing) : { id: uid(), name: '', kind: 'check', target: 1, unit: '', days: [0, 1, 2, 3, 4, 5, 6], reminder: '', tiny: '', createdOn: today(), paused: false };
  const canNotify = 'Notification' in window;
  sheet({ title: fresh ? 'New habit' : 'Edit habit', eyebrow: 'Habits',
    body: () => html`
      <label class="field"><span class="field__l">What is it</span><input class="input" id="hname" maxlength="60" value="${draft.name}" placeholder="Read, stretch calves, call home…" data-input="name"></label>
      <div><p class="eyebrow">How it is counted</p><div class="segc" style="margin-top:6px"><button type="button" aria-pressed="${draft.kind === 'check' ? 'true' : 'false'}" data-act="kind" data-k="check">Yes or no</button><button type="button" aria-pressed="${draft.kind === 'count' ? 'true' : 'false'}" data-act="kind" data-k="count">A count</button></div></div>
      ${draft.kind === 'count' ? html`<div class="grid2"><label class="field"><span class="field__l">Target</span><input class="input input--num" inputmode="numeric" value="${draft.target}" data-change="target"></label><label class="field"><span class="field__l">Unit</span><input class="input" maxlength="12" value="${draft.unit}" placeholder="min, pages, glasses" data-input="unit"></label></div>` : ''}
      <div><p class="eyebrow">Which days</p><div class="chips" style="margin-top:6px" role="group" aria-label="Days of the week">${DOW.map((name, index) => html`<button class="chip" type="button" aria-pressed="${draft.days.includes(index) ? 'true' : 'false'}" data-act="day" data-d="${index}">${name}</button>`)}</div></div>
      <label class="field"><span class="field__l">Smallest version, for a bad day (optional)</span><input class="input" maxlength="100" value="${draft.tiny}" placeholder="One page counts." data-input="tiny"></label>
      <label class="field"><span class="field__l">Reminder time (optional)</span><input class="input" type="time" value="${draft.reminder}" data-change="reminder"><span class="hint">${canNotify ? 'A plain notification with the habit name, shown only while Forme is open or running in the background. No server sends it.' : 'This browser does not support notifications, so the time is only shown beside the habit.'}</span></label>
      ${fresh ? '' : html`<button class="switch" type="button" role="switch" aria-checked="${draft.paused ? 'true' : 'false'}" data-act="pause"><span class="switch__t"><span class="title" style="font-size:.98rem">Paused</span><span class="tiny muted" style="display:block">Hidden from Today. History kept. Resume any time.</span></span><span class="switch__k"></span></button>
        <button class="btn btn--quiet btn--sm btn--block" type="button" data-act="remove">${icon('trash')} Delete habit</button>`}`,
    footer: html`<button class="btn btn--block" type="button" data-act="save">${fresh ? 'Add habit' : 'Save'}</button>`,
    inputs: { name: (_d, el) => { draft.name = el.value; }, unit: (_d, el) => { draft.unit = el.value; }, tiny: (_d, el) => { draft.tiny = el.value; } },
    changes: { target: (_d, el) => { draft.target = Math.max(1, Math.round(Number(el.value) || 1)); }, reminder: (_d, el) => { draft.reminder = el.value; } },
    actions: {
      kind: (d, _e, _ev, self) => { draft.kind = d.k; if (d.k === 'check') draft.target = 1; else if (draft.target < 2) draft.target = 10; self.update(); },
      day: (d, _e, _ev, self) => { const n = Number(d.d); draft.days = draft.days.includes(n) ? draft.days.filter(x => x !== n) : [...draft.days, n].sort(); self.update(); },
      pause: (_d, _e, _ev, self) => { draft.paused = !draft.paused; self.update(); },
      remove: async (_d, _e, _ev, self) => { if (!await ask({ title: 'Delete this habit?', text: 'Its history is deleted with it. Pausing keeps the history instead.', yes: 'Delete', danger: true })) return; store.update('habits', state => { state.habits = state.habits.filter(habit => habit.id !== draft.id); for (const day of Object.keys(state.log)) { delete state.log[day][draft.id]; if (!Object.keys(state.log[day]).length) delete state.log[day]; } }); self.close(); },
      save: async (_d, _e, _ev, self) => {
        draft.name = draft.name.trim(); draft.tiny = draft.tiny.trim(); draft.unit = draft.unit.trim();
        if (!draft.name) return toast('Give the habit a name.');
        if (!draft.days.length) return toast('Pick at least one day.');
        if (draft.reminder && canNotify && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch { /* optional */ } }
        store.update('habits', state => { const index = state.habits.findIndex(habit => habit.id === draft.id); if (index >= 0) state.habits[index] = draft; else state.habits.push(draft); state.seeded = true; });
        self.close();
      },
    } });
}

function logSheet(habit, day) {
  sheet({ title: habit.name, eyebrow: fmtDay(day, { weekday: 'long', day: 'numeric', month: 'short' }),
    body: () => { const state = store.get('habits'); const value = countOn(state.log, habit, day); const skipped = isSkipped(state.log, habit, day); return html`
      ${habit.kind === 'count' ? html`<div class="spread"><div><p class="eyebrow">${habit.unit || 'Count'}</p><p class="title">Target ${habit.target}</p></div><span class="stepper"><button type="button" data-act="adj" data-d="-1" aria-label="Less">−</button><output>${value}</output><button type="button" data-act="adj" data-d="1" aria-label="More">+</button></span></div>`
    : html`<button class="switch" type="button" role="switch" aria-checked="${value >= 1 ? 'true' : 'false'}" data-act="toggle"><span class="switch__t"><span class="title" style="font-size:.98rem">Done</span></span><span class="switch__k"></span></button>`}
      <button class="switch" type="button" role="switch" aria-checked="${skipped ? 'true' : 'false'}" data-act="skip"><span class="switch__t"><span class="title" style="font-size:.98rem">Skip this day</span><span class="tiny muted" style="display:block">For a sick day, travel or a day off. A skipped day does not count against you.</span></span><span class="switch__k"></span></button>`; },
    actions: {
      adj: (d, _e, _ev, self) => { store.update('habits', state => { state.log = setCount(state.log, habit, day, countOn(state.log, habit, day) + Number(d.d)); }); self.update(); },
      toggle: (_d, _e, _ev, self) => { store.update('habits', state => { state.log = tap(state.log, habit, day); }); self.update(); },
      skip: (_d, _e, _ev, self) => { store.update('habits', state => { state.log = skip(state.log, habit, day); }); self.update(); },
    } });
}

export function render(ctx) {
  const state = store.get('habits');
  const active = state.habits.filter(habit => !habit.archived);
  const due = active.filter(habit => isDue(habit, viewDay));
  const notDue = active.filter(habit => !habit.paused && !isDue(habit, viewDay));
  const paused = active.filter(habit => habit.paused);
  const yesterday = addDays(today(), -1);
  const body = html`<div class="wrap cut">
    <a class="linkish linkish--quiet" href="#/today">${icon('arrow-left', 'ic--sm')} Today</a>
    <header class="reset__head reset__head--slim"><img src="assets/photos/street-rain.jpg" alt="" width="1024" height="1024" loading="lazy"><div><p class="eyebrow">Habits</p><h1 class="display display--l">${viewDay === today() ? 'Today' : 'Yesterday'}</h1></div></header>
    <div class="segc" role="group" aria-label="Which day"><button type="button" aria-pressed="${viewDay === yesterday ? 'true' : 'false'}" data-act="when" data-d="${yesterday}">Yesterday</button><button type="button" aria-pressed="${viewDay === today() ? 'true' : 'false'}" data-act="when" data-d="${today()}">Today</button></div>

    ${!active.length ? html`<div class="empty"><p class="empty__t">No habits yet</p><p class="muted small">Add your own, or start from a suggestion and edit it. Suggestions are only examples.</p></div>
      ${sec('Suggestions', 'Tap to add, then edit')}<div class="stack">${SEEDS.map((seed, index) => html`<button class="frame frame--press" type="button" data-act="seed" data-i="${index}"><div class="frame__head"><span>Suggestion</span><span>${dayLetters(seed.days)}</span></div><div class="frame__body"><p class="title">${seed.name}${seed.kind === 'count' ? html` <span class="muted">· ${seed.target} ${seed.unit}</span>` : ''}</p><p class="tiny muted">${seed.tiny}</p></div></button>`)}</div>` : ''}

    ${due.length ? html`<div class="stack">${due.map(habit => { const done = isDone(state.log, habit, viewDay); const skipped = isSkipped(state.log, habit, viewDay); const value = countOn(state.log, habit, viewDay); const run = streak(habit, state.log, today()); const step = viewDay === today() ? nextStep(habit, state.log, today()) : null; const cells = weekPattern(habit, state.log, today());
    return html`<article class="hb ${done ? 'hb--done' : ''}">
        <button class="hb__tap" type="button" role="${habit.kind === 'count' ? 'button' : 'checkbox'}" ${habit.kind === 'count' ? '' : raw(`aria-checked="${done ? 'true' : 'false'}"`)} data-act="tap" data-id="${habit.id}" aria-label="${habit.name}${habit.kind === 'count' ? `, ${value} of ${habit.target} ${habit.unit}. Tap to add one.` : ''}">
          <span class="hb__mark">${done ? loop(habit.id === justTapped, habit.name.length) : skipped ? slash(false) : ''}<span class="hb__n">${habit.kind === 'count' ? value : done ? '✓' : ''}</span></span>
          <span class="grow"><span class="title">${habit.name}</span><span class="tiny muted" style="display:block">${skipped ? 'Skipped' : habit.kind === 'count' ? `${value} of ${habit.target} ${habit.unit}` : done ? 'Done' : 'Tap when done'}${habit.reminder ? ` · ${habit.reminder}` : ''}${!state.muteStreaks && run >= 2 ? ` · ${run} in a row` : ''}</span></span></button>
        <button class="icon-btn" type="button" data-act="more" data-id="${habit.id}" aria-label="Log, skip or edit ${habit.name}">${icon('more')}</button>
        <div class="hb__week" role="img" aria-label="This week: ${cells.map(cell => `${DOW[cells.indexOf(cell)]} ${cell.done ? 'done' : cell.skipped ? 'skipped' : cell.due ? (cell.future ? 'planned' : 'not done') : 'off'}`).join(', ')}">${cells.map((cell, index) => html`<span class="hb__c ${cell.done ? 'is-done' : ''} ${!cell.due ? 'is-off' : ''} ${cell.date === today() ? 'is-today' : ''}">${DOW[index].charAt(0)}${cell.skipped ? slash(false) : ''}</span>`)}</div>
        ${step ? html`<p class="hb__step small">${step}</p>` : ''}</article>`; })}</div>` : active.length ? html`<div class="empty"><p class="empty__t">Nothing due ${viewDay === today() ? 'today' : 'that day'}</p><p class="muted small">Your habits are set for other days.</p></div>` : ''}

    ${notDue.length ? html`<details class="fold"><summary>Not due ${viewDay === today() ? 'today' : 'that day'}: ${notDue.length}</summary><div class="fold__b"><div class="list">${notDue.map(habit => html`<button class="list__i list__i--tap" type="button" data-act="edit" data-id="${habit.id}"><span class="list__m"><span class="title">${habit.name}</span><span class="tiny muted" style="display:block">${dayLetters(habit.days)}</span></span><span class="list__e">${icon('pencil', 'ic--sm')}</span></button>`)}</div></div></details>` : ''}
    ${paused.length ? html`<details class="fold"><summary>Paused: ${paused.length}</summary><div class="fold__b"><div class="list">${paused.map(habit => html`<button class="list__i list__i--tap" type="button" data-act="edit" data-id="${habit.id}"><span class="list__m"><span class="title">${habit.name}</span><span class="tiny muted" style="display:block">History kept</span></span><span class="list__e">Resume</span></button>`)}</div></div></details>` : ''}

    <button class="btn btn--block" type="button" data-act="new">${icon('plus')} New habit</button>

    ${active.length ? html`<section aria-label="Four weeks">${sec('Last four weeks', state.muteStreaks ? 'Streaks muted' : 'Share of due days done')}
      <div class="list">${active.filter(habit => !habit.paused).map(habit => { const r = rate(habit, state.log, today()); return html`<div class="list__i"><span class="list__m"><span class="title">${habit.name}</span><span class="tiny muted" style="display:block">${r.due ? `${r.done} of ${r.due} due days` : 'No due days yet'}</span></span><span class="list__e data num">${r.ratio === null ? '-' : `${Math.round(r.ratio * 100)}%`}</span></div>`; })}</div></section>` : ''}

    <button class="switch" type="button" role="switch" aria-checked="${state.muteStreaks ? 'true' : 'false'}" data-act="mute"><span class="switch__t"><span class="title" style="font-size:.98rem">Mute streaks</span><span class="tiny muted" style="display:block">Hides every "in a row" count. The weekly pattern stays.</span></span><span class="switch__k"></span></button>
    <details class="fold"><summary>Why streaks are optional here</summary><div class="fold__b">${HABIT_CLAIMS.map(claim => html`<p class="small">${claim.text} <span class="muted">${claim.level}. ${extLink(SOURCES[claim.src].url, SOURCES[claim.src].cite.split('.')[0])}, ${SOURCES[claim.src].date}.</span></p>`)}</div></details>
  </div>`;
  const find = id => store.get('habits').habits.find(habit => habit.id === id);
  return { room: 'street', where: 'Habits', body,
    after: () => { justTapped = null; },
    actions: {
      when: d => { viewDay = d.d; ctx.refresh(); },
      tap: d => { const habit = find(d.id); justTapped = d.id; store.update('habits', next => { next.log = tap(next.log, habit, viewDay); }); haptic('set'); touch(); const now = store.get('habits'); toast(habit.kind === 'count' ? `${habit.name}: ${countOn(now.log, habit, viewDay)} of ${habit.target}` : isDone(now.log, habit, viewDay) ? `${habit.name}: done` : `${habit.name}: unticked`, { action: 'Undo', onAction: () => store.update('habits', next => { next.log = state.log; }) }); },
      more: d => { const habit = find(d.id); sheet({ title: habit.name, eyebrow: 'Habit', body: html`<div class="stack--s"><button class="btn btn--quiet btn--block btn--left" type="button" data-act="today">Log or skip ${viewDay === today() ? 'today' : 'that day'}</button><button class="btn btn--quiet btn--block btn--left" type="button" data-act="yday">Log yesterday</button><button class="btn btn--quiet btn--block btn--left" type="button" data-act="edit">Edit, pause or delete</button></div>`,
        actions: { today: (_x, _e, _ev, self) => { self.close(); logSheet(habit, viewDay); }, yday: (_x, _e, _ev, self) => { self.close(); logSheet(habit, yesterday); }, edit: (_x, _e, _ev, self) => { self.close(); editSheet(habit); } } }); },
      edit: d => editSheet(find(d.id)),
      new: () => editSheet(null),
      seed: d => { const seed = SEEDS[Number(d.i)]; store.update('habits', next => { next.habits.push({ id: uid(), ...seed, days: [...seed.days], reminder: '', createdOn: today(), paused: false, fromSuggestion: true }); next.seeded = true; }); toast(`Added "${seed.name}". Edit it to suit you.`); },
      mute: () => store.update('habits', next => { next.muteStreaks = !next.muteStreaks; }),
    } };
}
