// The playful layer: a sticker sheet, a side quest, Night Drive, the month as a contact sheet and
// the week as a two-second replay with a cover. All optional, all private, all replayable.

import * as store from '../store.js';
import { html, raw, icon, sheet, toast, haptic, today, addDays, weekStart, weekDays, fmtDay, sec, plural, fmt, dow, DOW, motionOK, loop } from '../ui.js';
import { award, dayActivity, touch, whey } from '../actions.js';
import { STICKERS, QUESTS, questFor } from '../data/fun.js';
import { RECIPE_BY_ID } from '../data/recipes.js';
import { PHOTOS } from '../data/credits.js';
import { EX } from '../data/exercises.js';
import { findRecords, sessionStats } from '../logic/lifts.js';
import { getSessionTemplate } from '../../assets/training-program.js';
import { effectiveWeek } from '../logic/week.js';
import { MODES } from '../logic/nutrition.js';

let month = today().slice(0, 7);
let replayTimer = null;

const SHAPES = {
  ring: 'M50 6a44 44 0 1 0 0 88a44 44 0 1 0 0-88Z', burst: 'M50 4l9 14 16-6 2 17 17 3-8 15 12 12-15 8 3 17-17-2-6 16-13-11-13 11-6-16-17 2 3-17-15-8 12-12-8-15 17-3 2-17 16 6Z',
  tape: 'M6 30h88v40H6Z', ticket: 'M8 24h84v16a10 10 0 0 0 0 20v16H8V60a10 10 0 0 0 0-20Z', drop: 'M50 6c18 22 30 37 30 54a30 30 0 0 1-60 0c0-17 12-32 30-54Z',
  bolt: 'M58 4L18 54h26l-6 42 44-54H54Z', frame: 'M10 14h80v72H10Z', moon: 'M62 8a42 42 0 1 0 30 62a34 34 0 0 1-30-62Z',
};
function stickerSvg(sticker, earned, tilt = 0) {
  const words = sticker.name.toUpperCase().split(' ');
  const lines = words.length > 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : words.length === 2 && sticker.name.length > 9 ? words : [words.join(' ')];
  return raw(`<svg viewBox="-6 -6 112 112" class="stk ${earned ? '' : 'stk--locked'}" style="--tilt:${tilt}deg" aria-hidden="true"><path d="${SHAPES[sticker.shape]}" fill="${earned ? '#fff' : 'none'}" stroke="${earned ? '#fff' : 'currentColor'}" stroke-width="${earned ? 9 : 1.5}" stroke-linejoin="round" ${earned ? '' : 'stroke-dasharray="3 4"'}/>${earned ? `<path d="${SHAPES[sticker.shape]}" fill="${sticker.fill}"/>` : ''}
${lines.map((line, index) => `<text x="50" y="${50 + (index - (lines.length - 1) / 2) * 12 + 3.5}" text-anchor="middle" fill="${earned ? sticker.ink : 'currentColor'}" class="stk__t" style="font-size:${line.length > 9 ? 8 : 10}px">${line}</text>`).join('')}</svg>`);
}

// ---------- week stats, shared by the replay and the cover ----------
export function weekStats(start) {
  const days = weekDays(start).map(day => dayActivity(day));
  const training = store.training.read().value;
  const sessions = days.flatMap(day => day.train);
  const records = findRecords(training?.sessions ?? []).filter(record => record.date >= start && record.date <= addDays(start, 6));
  const cooked = days.flatMap(day => day.cooked.map(id => ({ id, day: day.day })));
  const weights = days.map(day => day.body?.weight).filter(Number.isFinite);
  const moveSeconds = days.flatMap(day => day.move).reduce((sum, session) => sum + (session.seconds ?? 0), 0);
  return {
    start, days, sessions: sessions.length, sets: sessions.reduce((sum, session) => sum + sessionStats(session).sets, 0), records, cooked,
    moves: days.reduce((sum, day) => sum + day.move.length, 0), moveMinutes: Math.round(moveSeconds / 60), habits: days.reduce((sum, day) => sum + day.habits.done, 0),
    weight: weights.length ? weights.reduce((a, b) => a + b, 0) / weights.length : null, active: days.filter(day => day.kinds > 0).length,
  };
}
const weekNumber = day => { const d = new Date(`${day}T12:00:00`); const first = new Date(d.getFullYear(), 0, 1, 12); return Math.ceil(((d - first) / 86400000 + ((first.getDay() + 6) % 7) + 1) / 7); };

export function coverBlock(start, small = false) {
  const stats = weekStats(start); const profile = store.get('profile'); const kitchen = store.get('kitchen');
  let ids = [...new Set(stats.cooked.map(item => item.id))];
  const planned = !ids.length;
  if (planned) ids = [...new Set(effectiveWeek(profile.mode, kitchen.weeks[profile.mode] ?? {}, kitchen.dayKinds[profile.mode] ?? {}).flatMap(day => day.slots.filter(slot => slot.slot === 'dinner' && slot.entry).map(slot => slot.entry.r)))];
  const withPhoto = ids.filter(id => RECIPE_BY_ID[id]?.photo).slice(0, 4);
  return html`<div class="cover ${small ? 'cover--s' : ''}" role="img" aria-label="Cover for week ${weekNumber(start)}: ${ids.slice(0, 6).map(id => RECIPE_BY_ID[id].short).join(', ')}">
    <div class="cover__art cover__art--${Math.max(1, withPhoto.length)}">${withPhoto.length ? withPhoto.map(id => html`<img src="${PHOTOS[RECIPE_BY_ID[id].photo].file}" alt="" loading="lazy">`) : html`<span class="cover__blank serif">Forme</span>`}</div>
    <div class="cover__txt"><p class="cover__k">FORME · WK ${String(weekNumber(start)).padStart(2, '0')} · ${MODES[profile.mode].short.toUpperCase()}</p><p class="cover__t">${planned ? 'The plan' : 'What got cooked'}</p>
      <ol class="cover__list">${ids.slice(0, 6).map((id, index) => html`<li><span>${index < 3 ? 'A' : 'B'}${(index % 3) + 1}</span>${RECIPE_BY_ID[id].short}</li>`)}</ol></div></div>`;
}

// ---------- hub ----------
function hub() {
  const fun = store.get('fun'); const earned = STICKERS.filter(sticker => fun.stickers[sticker.id]);
  const quest = fun.quests[today()] ?? { offset: 0, done: false };
  const questText = QUESTS[questFor(today(), quest.offset)];
  const start = weekStart(today());
  if (!fun.enabled) return html`<div class="wrap"><a class="linkish linkish--quiet" href="#/you">${icon('arrow-left', 'ic--sm')} You</a><div class="empty"><p class="empty__t">The playful layer is off</p><p class="muted small">Stickers, quests, Night Drive and replays are hidden. Nothing you earned was deleted.</p><button class="btn" type="button" data-act="enable">Turn it back on</button></div></div>`;
  return html`<div class="wrap cut">
    <a class="linkish linkish--quiet" href="#/you">${icon('arrow-left', 'ic--sm')} You</a>
    <header><p class="eyebrow">Just for fun</p><h1 class="display display--l">The sheet.</h1><p class="muted">${earned.length} of ${STICKERS.length} stickers. They come from things you actually did, and nobody else sees them.</p></header>
    <div class="stksheet">${STICKERS.map((sticker, index) => { const record = fun.stickers[sticker.id]; return html`<button class="stksheet__c" type="button" data-act="sticker" data-id="${sticker.id}" aria-label="${sticker.name}: ${record ? `earned ${plural(record.n, 'time')}` : 'not earned yet'}">${stickerSvg(sticker, Boolean(record), ((index * 37) % 13) - 6)}${record && record.n > 1 ? html`<span class="stksheet__n">×${record.n}</span>` : ''}</button>`; })}</div>

    <section class="frame" aria-label="Side quest"><div class="frame__rebate"><span>${icon('dice', 'ic--sm')} Today’s side quest</span><span>${quest.done ? 'Done' : 'Harmless, optional'}</span></div><div class="frame__body">
      <p class="title" style="font-size:1.15rem">${questText}</p>
      <div class="row row--wrap">${quest.done ? html`<span class="tag tag--amber">Done today</span>` : html`<button class="btn btn--sm grow" type="button" data-act="questdone">${icon('check', 'ic--sm')} Did it</button>`}<button class="btn btn--quiet btn--sm" type="button" data-act="questdraw">${icon('dice', 'ic--sm')} Draw another</button></div></div></section>

    <section class="frame" aria-label="Night Drive"><div class="frame__body"><button class="switch" type="button" role="switch" aria-checked="${fun.night ? 'true' : 'false'}" data-act="night"><span class="switch__t"><span class="title">Night Drive</span><span class="tiny muted" style="display:block">Slow streetlight passes drift across the top of every screen, like the city going by a car window. Always dark while it is on.</span></span><span class="switch__k"></span></button></div></section>

    <section aria-label="This week">${sec('This week on tape', html`<a href="#/fun/sheet">Contact sheet</a>`)}
      <div class="cols" style="margin-top:10px"><a class="frame frame--press" href="#/fun/replay"><div class="frame__rebate"><span>${icon('film', 'ic--sm')} Weekly replay</span><span>2 seconds</span></div><div class="frame__body"><p class="title">Play week ${weekNumber(start)}</p><p class="small muted">Two seconds of your week, then a cover made from what you cooked.</p></div></a>
        <a class="frame frame--press" href="#/fun/replay">${coverBlock(start, true)}</a></div></section>

    ${fun.replays.length ? html`<section aria-label="Kept replays">${sec('Kept', plural(fun.replays.length, 'replay'))}<div class="list">${[...fun.replays].reverse().map(item => html`<a class="list__i list__i--tap" href="#/fun/replay?w=${item.start}"><span class="list__m"><span class="title">Week ${weekNumber(item.start)} · ${fmtDay(item.start, { day: 'numeric', month: 'short' })}</span><span class="tiny muted" style="display:block">${item.line}</span></span><span class="list__e">▶</span></a>`)}</div></section>` : ''}

    <section aria-label="Controls">${sec('Controls')}
      <button class="switch" type="button" role="switch" aria-checked="${fun.hidden?.toasts ? 'true' : 'false'}" data-act="quiet"><span class="switch__t"><span class="title" style="font-size:.98rem">No sticker pop-ups</span><span class="tiny muted" style="display:block">Stickers still collect here, silently.</span></span><span class="switch__k"></span></button>
      <button class="linkish linkish--quiet" type="button" data-act="disable">Turn the whole playful layer off</button></section>
  </div>`;
}

// ---------- contact sheet ----------
function sheetPage() {
  const first = `${month}-01`; const start = weekStart(first);
  const cells = Array.from({ length: 42 }, (_, index) => addDays(start, index)).filter((day, index, list) => index < 35 || list[35].slice(0, 7) === month);
  const acts = cells.map(day => (day.slice(0, 7) === month && day <= today() ? dayActivity(day) : null));
  const keepers = acts.filter(act => act && act.kinds >= 2).length;
  const shift = delta => { const d = new Date(`${first}T12:00:00`); d.setMonth(d.getMonth() + delta); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  return html`<div class="wrap cut">
    <a class="linkish linkish--quiet" href="#/today">${icon('arrow-left', 'ic--sm')} Today</a>
    <header><p class="eyebrow">Contact sheet</p><h1 class="display display--l">${fmtDay(first, { month: 'long', year: 'numeric' })}</h1><p class="muted">Every day is a frame. Circled frames are the days two or more things happened: a lift, a cooked meal, a movement session, a habit.${keepers ? ` ${plural(keepers, 'circled day')} so far.` : ''}</p></header>
    <div class="row"><button class="btn btn--quiet btn--sm" type="button" data-act="month" data-m="${shift(-1)}" aria-label="Previous month">${icon('chevron-left')}</button><span class="grow center mono">${month}</span><button class="btn btn--quiet btn--sm" type="button" data-act="month" data-m="${shift(1)}" ${shift(1) > today().slice(0, 7) ? 'disabled' : ''} aria-label="Next month">${icon('chevron-right')}</button></div>
    <div class="csheet" role="grid" aria-label="${fmtDay(first, { month: 'long', year: 'numeric' })}">
      ${DOW.map(name => html`<span class="csheet__h" role="columnheader">${name}</span>`)}
      ${cells.map((day, index) => { const act = acts[index]; const inMonth = day.slice(0, 7) === month;
    if (!inMonth) return html`<span class="fr fr--off" style="opacity:.25" role="gridcell" aria-hidden="true"><span class="fr__n">${Number(day.slice(8))}</span></span>`;
    return html`<button class="fr ${day === today() ? 'fr--today' : ''} ${act?.kinds ? 'fr--lit' : ''}" role="gridcell" type="button" data-act="day" data-d="${day}" ${day > today() ? 'disabled' : ''} aria-label="${fmtDay(day)}${act ? `: ${act.train.length ? 'trained, ' : ''}${act.cooked.length ? 'cooked, ' : ''}${act.move.length ? 'movement, ' : ''}${act.habits.done ? `${act.habits.done} habits` : ''}` : ''}">
          <span class="fr__n">${Number(day.slice(8))}</span>
          <span class="fr__s">${act?.train.length ? raw('<i class="t"></i>') : ''}${act?.cooked.length ? raw('<i class="e"></i>') : ''}${act?.move.length ? raw('<i class="m"></i>') : ''}${act?.habits.done ? raw('<i class="h"></i>') : ''}</span>${act && act.kinds >= 2 ? loop(false, index) : ''}</button>`; })}
    </div>
    <p class="tiny muted row row--wrap" style="gap:14px"><span class="row" style="gap:5px"><i class="dot dot--t"></i>Lift</span><span class="row" style="gap:5px"><i class="dot dot--e"></i>Cooked</span><span class="row" style="gap:5px"><i class="dot dot--m"></i>Movement</span><span class="row" style="gap:5px"><i class="dot dot--h"></i>Habit</span></p>
  </div>`;
}

function daySheet(day) {
  const act = dayActivity(day);
  sheet({ title: fmtDay(day, { weekday: 'long', day: 'numeric', month: 'long' }), eyebrow: 'Frame',
    body: html`${act.kinds || act.body ? html`<div class="list">
      ${act.train.map(session => html`<a class="list__i list__i--tap" href="#/train/s/${session.id}" data-act="__close"><span class="list__m"><span class="title">${getSessionTemplate(session.sessionId).name}</span><span class="tiny muted" style="display:block">${plural(sessionStats(session).sets, 'set')}${session.partial ? ' · partial' : ''}</span></span><span class="list__e">${icon('chevron-right')}</span></a>`)}
      ${act.cooked.map(id => html`<a class="list__i list__i--tap" href="#/eat/r/${id}" data-act="__close"><span class="list__m"><span class="title">Cooked: ${RECIPE_BY_ID[id].short}</span></span><span class="list__e">${icon('chevron-right')}</span></a>`)}
      ${act.move.map(session => html`<div class="list__i"><span class="list__m"><span class="title">Movement${session.short ? ', 2-minute version' : ''}</span><span class="tiny muted" style="display:block">${(session.drills ?? []).map(id => EX[id]?.name).filter(Boolean).join(', ')}</span></span></div>`)}
      ${act.habits.due ? html`<div class="list__i"><span class="list__m"><span class="title">Habits</span><span class="tiny muted" style="display:block">${act.habits.done} of ${act.habits.due} due</span></span></div>` : ''}
      ${act.body ? html`<div class="list__i"><span class="list__m"><span class="title">Body log</span><span class="tiny muted" style="display:block">${[act.body.weight ? `${act.body.weight} lb` : '', act.body.sleep ? `${act.body.sleep} h sleep` : '', act.body.kcal ? `${act.body.kcal} kcal` : ''].filter(Boolean).join(' · ')}</span></span></div>` : ''}</div>`
    : html`<p class="muted">Nothing logged that day.</p>`}` });
}

// ---------- replay ----------
function replayPage(start) {
  const stats = weekStats(start); const kept = store.get('fun').replays.some(item => item.start === start);
  const line = [stats.sessions ? plural(stats.sessions, 'lift') : '', stats.cooked.length ? plural(stats.cooked.length, 'meal') + ' cooked' : '', stats.moves ? plural(stats.moves, 'movement session') : '', stats.habits ? plural(stats.habits, 'habit tick') : ''].filter(Boolean).join(' · ') || 'A quiet week';
  const best = stats.records.at(-1);
  return html`<div class="wrap cut">
    <a class="linkish linkish--quiet" href="#/fun">${icon('arrow-left', 'ic--sm')} The sheet</a>
    <div class="replay ${motionOK() ? 'replay--play' : 'replay--still'}" id="replay" aria-label="Replay of the week of ${fmtDay(start)}">
      <div class="replay__bar"><span>▶ REPLAY</span><span class="seg" id="replayTc">00:00:00</span><span>WK ${String(weekNumber(start)).padStart(2, '0')}</span></div>
      <div class="replay__reel">${stats.days.map((day, index) => html`<div class="replay__f" style="--i:${index}"><span class="replay__d">${DOW[index]}</span><span class="replay__n">${Number(day.day.slice(8))}</span>
        <span class="replay__w">${day.train.length ? getSessionTemplate(day.train[0].sessionId).name : day.cooked.length ? RECIPE_BY_ID[day.cooked[0]].short : day.move.length ? 'Movement' : day.habits.done ? 'Habits' : day.day > today() ? 'Not yet' : 'Blank frame'}</span>
        <span class="fr__s">${day.train.length ? raw('<i class="t"></i>') : ''}${day.cooked.length ? raw('<i class="e"></i>') : ''}${day.move.length ? raw('<i class="m"></i>') : ''}${day.habits.done ? raw('<i class="h"></i>') : ''}</span>${day.kinds >= 2 ? loop(false, index) : ''}</div>`)}</div>
      <div class="replay__end"><p class="eyebrow" style="color:var(--bone-dim)">Week of ${fmtDay(start, { day: 'numeric', month: 'long' })}</p><p class="display display--l">${stats.active} of 7 days on tape.</p>
        <div class="statrow"><div class="stat"><div class="stat__v num">${stats.sessions}</div><div class="stat__l">Lifts</div></div><div class="stat"><div class="stat__v num">${stats.sets}</div><div class="stat__l">Sets</div></div><div class="stat"><div class="stat__v num">${stats.cooked.length}</div><div class="stat__l">Cooked</div></div><div class="stat"><div class="stat__v num">${stats.moveMinutes}</div><div class="stat__l">Move min</div></div></div>
        ${best ? html`<p class="small" style="color:var(--bone)"><span class="tag tag--amber">New best</span> ${best.load > 0 ? `${fmt(best.load, 1)} ${best.unit} × ${best.reps}` : `${best.reps} reps`}</p>` : ''}
        ${stats.weight ? html`<p class="tiny" style="color:var(--bone-dim)">Average weigh-in ${fmt(stats.weight, 1)} lb.</p>` : ''}</div>
    </div>
    <div class="row row--wrap"><button class="btn grow" type="button" data-act="again">${icon('rotate-ccw')} Play again</button>${kept ? html`<button class="btn btn--quiet" type="button" data-act="unkeep">Stop keeping it</button>` : html`<button class="btn btn--quiet" type="button" data-act="keep" data-line="${line}">Keep this one</button>`}</div>
    ${coverBlock(start)}
    <div class="row"><a class="btn btn--quiet btn--sm grow" href="#/fun/replay?w=${addDays(start, -7)}">${icon('chevron-left', 'ic--sm')} Week before</a>${addDays(start, 7) <= today() ? html`<a class="btn btn--quiet btn--sm grow" href="#/fun/replay?w=${addDays(start, 7)}">Week after ${icon('chevron-right', 'ic--sm')}</a>` : ''}</div>
    <p class="tiny muted">The replay is built from your own logs, on this device, each time you open it. Nothing is uploaded.</p>
  </div>`;
}
function runTimecode() {
  clearInterval(replayTimer); const el = document.getElementById('replayTc'); if (!el || !motionOK()) { if (el) el.textContent = '00:02:00'; return; }
  const begun = performance.now();
  replayTimer = setInterval(() => { const ms = Math.min(2000, performance.now() - begun); const frames = Math.floor((ms % 1000) / 41.6); el.textContent = `00:0${Math.floor(ms / 1000)}:${String(frames).padStart(2, '0')}`; if (ms >= 2000) clearInterval(replayTimer); }, 41);
}

export function render(ctx) {
  const sub = ctx.path[1];
  const start = weekStart(/^\d{4}-\d{2}-\d{2}$/.test(ctx.query.get('w') ?? '') ? ctx.query.get('w') : today());
  const body = sub === 'sheet' ? sheetPage() : sub === 'replay' ? replayPage(start) : hub();
  return { room: 'street', where: sub === 'sheet' ? 'Contact sheet' : sub === 'replay' ? 'Replay' : 'The sheet', body,
    after: () => { if (sub === 'replay') runTimecode(); },
    leave: () => clearInterval(replayTimer),
    actions: {
      enable: () => store.update('fun', fun => { fun.enabled = true; }),
      disable: () => { store.update('fun', fun => { fun.enabled = false; fun.night = false; }); toast('Playful layer off. Turn it back on in Settings.'); },
      quiet: () => store.update('fun', fun => { fun.hidden = { ...(fun.hidden ?? {}), toasts: !fun.hidden?.toasts }; }),
      night: () => { const on = !store.get('fun').night; store.update('fun', fun => { fun.night = on; }); if (on) award('night-drive', true); haptic('tap'); },
      sticker: d => { const sticker = STICKERS.find(item => item.id === d.id); const record = store.get('fun').stickers[d.id]; sheet({ title: sticker.name, eyebrow: record ? `Earned ${plural(record.n, 'time')}` : 'Not yet', cls: 'sheet--center', body: html`<div class="center"><div style="width:150px;margin:0 auto">${stickerSvg(sticker, Boolean(record))}</div><p class="lead">${sticker.line}</p>${record ? html`<p class="tiny muted">First ${fmtDay(record.first, { day: 'numeric', month: 'short', year: 'numeric' })}${record.n > 1 ? `, last ${fmtDay(record.last, { day: 'numeric', month: 'short' })}` : ''}.</p>` : ''}</div>` }); },
      questdone: () => { store.update('fun', fun => { fun.quests = { ...fun.quests, [today()]: { ...(fun.quests[today()] ?? { offset: 0 }), done: true } }; }); award('quest'); touch(); haptic('done'); },
      questdraw: () => store.update('fun', fun => { const current = fun.quests[today()] ?? { offset: 0, done: false }; fun.quests = { ...fun.quests, [today()]: { offset: current.offset + 1, done: false } }; }),
      month: d => { month = d.m; ctx.refresh(); },
      day: d => daySheet(d.d),
      again: () => { const el = document.getElementById('replay'); if (el) { el.classList.remove('replay--play'); void el.offsetWidth; if (motionOK()) el.classList.add('replay--play'); } runTimecode(); },
      keep: d => { store.update('fun', fun => { fun.replays = [...fun.replays.filter(item => item.start !== start), { start, keptOn: today(), line: d.line }].sort((a, b) => a.start.localeCompare(b.start)).slice(-52); }); award('replay'); toast('Kept. It is on the sheet.'); },
      unkeep: () => store.update('fun', fun => { fun.replays = fun.replays.filter(item => item.start !== start); }),
    } };
}

export { stickerSvg, weekNumber };
