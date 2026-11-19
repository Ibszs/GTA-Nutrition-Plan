// Train: pick a plan, start or resume, log sets fast, review history. Built on the original training
// journal (same key, same validators), so every earlier workout, draft and backup stays valid. The
// plan choice, a rearranged week and edited sessions are Forme's own (see logic/plans.js).

import * as store from '../store.js';
import { html, raw, icon, sheet, ask, toast, haptic, blip, today, fmtDay, relDay, addDays, clock, uid, sec, meter, plural, fmt, motionOK, why, DOW, dow } from '../ui.js';
import { trainingInfo, award, touch } from '../actions.js';
import { demo, collage } from '../demo.js';
import { EXERCISES, SESSIONS, isRealDate } from '../../assets/training-data.js';
import { getSessionTemplate, getSessionPrescription } from '../../assets/training-program.js';
import { editDraft, finishDraft, repeatSession, findLastEntry, copyLastSets, progressionSuggestion, setProgramDay, createTrainingState } from '../../assets/training-state.js';
import { getExerciseGuide } from '../../assets/exercise-visuals.js';
import { findRecords, recordsIn, weeklySets, liftHistory, lastComparable, sessionStats, draftProgress, LEG_GROUPS, groupsOf } from '../logic/lifts.js';
import { PLANS, PLAN_BY_ID, CATALOGUE, REST_CHOICES, STEP_CHOICES, activePlan, planWeek, planDay, planSessions, sessionLineup, sessionName, sessionSets, sessionMinutes, weeklyVolume, weekIsCustom, trainingDays, isEdited, cleanLineup, buildDraft, restSeconds, loadStep } from '../logic/plans.js';

const undoStack = [];
let openIndex = null;
let rest = null; // { until, total, label }
let restTimer = null;
let libraryQuery = '';
let libraryGroup = '';

const prefs = () => store.get('train');
const variantOf = (exerciseId, variantId) => EXERCISES[exerciseId].variants.find(variant => variant.id === variantId)?.name ?? EXERCISES[exerciseId].name;
const variantName = entry => variantOf(entry.exerciseId, entry.variantId);
const setText = (set, unit) => `${fmt(set.load, 1)} ${unit} × ${set.reps}`;
const nameOf = sessionId => sessionName(prefs(), sessionId);
/** A session name short enough for one cell of the week. */
const shortName = name => name.replace(' + ', ' ').replace('Shoulders', 'Delts').replace('Full Body', 'Full').replace('Express', 'Exp').replace('Dumbbell', 'DB');
const clean = message => message.replace(/^Training data: /, '');
const restLabel = choice => (choice === 'auto' ? 'Auto' : choice === 'off' ? 'Off' : clock(choice));

function write(next, { undo = true } = {}) {
  const before = store.training.read().value;
  try { store.training.write(next); } catch (error) { toast(error.message.replace(/^Training data: /, 'Not saved: ')); haptic('warn'); return false; }
  if (undo) { undoStack.push(JSON.stringify(before)); if (undoStack.length > 30) undoStack.shift(); }
  return true;
}
function undo() {
  const previous = undoStack.pop();
  if (!previous) return toast('Nothing to undo.');
  try { store.training.write(JSON.parse(previous)); toast('Undone.'); } catch (error) { toast(error.message); }
}
const lastFor = (state, draft, entry) => findLastEntry(state.sessions, entry.exerciseId, entry.variantId, draft.unit, entry.setup, draft.date > today() ? today() : addDays(draft.date, 1));
const targetRir = (state, draft) => draft.targetRir ?? getSessionPrescription(state, draft.sessionId, draft.date, draft.lightWeek).rir;

function startRest(seconds, label) {
  if (!(seconds > 0)) return;
  rest = { until: Date.now() + seconds * 1000, total: seconds, label };
  clearInterval(restTimer);
  restTimer = setInterval(() => {
    const bar = document.getElementById('restBar');
    if (!rest) return clearInterval(restTimer);
    const left = (rest.until - Date.now()) / 1000;
    if (left <= 0) { rest = null; clearInterval(restTimer); haptic('done'); blip('timer'); if (bar) bar.hidden = true; return; }
    if (bar) { bar.hidden = false; bar.querySelector('[data-rest-time]').textContent = clock(left); bar.querySelector('[data-rest-fill]').style.width = `${Math.max(0, 100 - (left / rest.total) * 100)}%`; }
  }, 250);
}

// ---------- shared pieces ----------
/** One movement of a lineup: picture, name, sets and reps. */
const lineupRow = row => html`<div class="xrow">${demo(row.exerciseId, row.variantId, { cls: 'demo--thumb', still: true })}
  <span class="grow"><span class="title" style="display:block">${variantOf(row.exerciseId, row.variantId)}</span><span class="tiny muted">${EXERCISES[row.exerciseId].muscle}</span></span>
  <span class="data num">${row.sets} × ${row.repMin}-${row.repMax}</span></div>`;

/** Seven cells for the calendar week: what the plan puts on each day and whether it was logged. */
function weekCells(state, train) {
  const monday = addDays(today(), -dow(today()));
  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(monday, index);
    let cell; try { cell = planDay(state, train, day); } catch { cell = { kind: 'rest', sessionId: null }; }
    const logged = state.sessions.filter(session => session.date === day);
    // A day before the journal began still shows what the plan would put there, as a quiet cell.
    const ghost = cell.kind === 'before-start' && state.program ? planWeek(train)[(cell.cycleDay ?? 1) - 1] : null;
    return { day, cell, logged, name: cell.sessionId ? nameOf(cell.sessionId) : ghost ? nameOf(ghost) : 'Rest' };
  });
}

// ---------- home ----------
function home(ctx, info) {
  const { state, planned, template, draft, draftTemplate, train } = info;
  const plan = activePlan(train);
  const records = findRecords(state.sessions);
  const hams = weeklySets(state.sessions, today(), 6);
  const maxHam = Math.max(4, ...hams.map(row => row.sets.Hamstrings ?? 0));
  const recent = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const isSession = planned?.kind === 'session';
  const done = planned?.completed; const partial = planned?.partial;
  const heroId = draft ? draft.sessionId : isSession ? template.id : null;
  const heroTitle = draft ? nameOf(draft.sessionId) : isSession ? nameOf(template.id) : planned?.kind === 'rest' ? 'Rest day' : 'Not started';
  const lineup = draft ? draft.exercises.map(entry => ({ exerciseId: entry.exerciseId, variantId: entry.variantId, sets: entry.sets.length, repMin: entry.repMin, repMax: entry.repMax })) : heroId ? sessionLineup(train, heroId) : [];
  const lead = lineup.find(row => getExerciseGuide(row.exerciseId, row.variantId)?.visual) ?? lineup[0];
  const heroMeta = draft ? `${draftProgress(draft).done} of ${draftProgress(draft).total} sets · started ${relDay(draft.date).toLowerCase()}`
    : isSession ? `${template.focus} · ${plural(lineup.length, 'movement')} · about ${sessionMinutes(train, template.id)} min`
    : planned?.kind === 'rest' ? 'Nothing is planned in the gym today.' : `Your journal starts ${fmtDay(state.startDate)}.`;
  const kicker = draft ? html`<span class="tag tag--mark">Recording</span>` : done ? 'Done today' : partial ? 'Partly done today' : isSession ? 'Planned for today' : 'Today';
  const cells = weekCells(state, train);
  return html`<div class="wrap cut">
    <section class="slab slab--bleed slab--lead" aria-label="Today in the gym">
      <p class="slab__k"><span>${kicker}</span><span>${state.program ? plan.name : 'Earlier plan'}</span></p>
      <h1 class="display ${String(heroTitle).length <= 6 ? 'display--xl' : ''} head-in">${heroTitle}</h1>
      <p class="slab__sub">${heroMeta}</p>
      ${lead ? html`<figure class="slab__ph hero-demo">${demo(lead.exerciseId, lead.variantId, { cls: 'demo--fill', badge: true, eager: true })}<figcaption><span>${draft ? 'In this workout' : 'First up'}</span><b>${variantOf(lead.exerciseId, lead.variantId)}</b><span class="data num">${lead.sets} × ${lead.repMin}-${lead.repMax}</span></figcaption></figure>`
    : html`<figure class="slab__ph"><img src="assets/photos/gym-rack.jpg" alt="" width="1280" height="1035" fetchpriority="high"></figure>`}
      ${!state.program && !draft ? html`<p class="hero-note">Your earlier four-session plan is still in use. <button class="linkish" type="button" data-act="plans">Choose a plan</button></p>` : ''}
      <div class="slab__go stack">
        ${draft ? html`<a class="btn btn--go btn--mark" href="#/train/go"><span>Resume workout</span>${icon('arrow-right')}</a>`
    : isSession && !done ? html`<button class="btn btn--go" type="button" data-act="start" data-session="${template.id}"><span>Start ${nameOf(template.id)}</span>${icon('arrow-right')}</button>`
    : html`<button class="btn btn--go btn--ghost" type="button" data-act="pick"><span>Train anyway</span>${icon('plus')}</button>`}
        <div class="row">
          ${heroId ? html`<button class="btn btn--quiet btn--sm grow" type="button" data-act="preview" data-session="${heroId}">${icon('list-filter')} ${plural(lineup.length, 'movement')}</button>` : ''}
          <button class="btn btn--quiet btn--sm ${heroId ? '' : 'grow'}" type="button" data-act="options" aria-label="More ways to start: lighter, another session, a past workout">${icon('more')}${heroId ? '' : ' More ways to start'}</button>
        </div>
      </div>
    </section>

    <section aria-label="Your plan">
      ${sec('Your plan', html`<button type="button" data-act="plans">Change plan</button>`)}
      <div class="plan" style="margin-top:10px">
        <div class="plan__top">
          <span class="ring" style="--p:${cells.filter(item => item.cell.kind === 'session').length ? cells.filter(item => item.cell.kind === 'session' && item.logged.length).length / cells.filter(item => item.cell.kind === 'session').length : 0}" role="img" aria-label="${cells.filter(item => item.logged.length).length} sessions logged this week"><span>${cells.filter(item => item.logged.length).length}/${cells.filter(item => item.cell.kind === 'session').length}</span></span>
          <div class="grow"><p class="plan__n">${state.program ? plan.name : 'Earlier four-session plan'}</p><p class="tiny muted">${state.program ? `${plural(trainingDays(planWeek(train)), 'day')} a week${weekIsCustom(train) ? ' · your layout' : ''}` : 'From the first version of the app'}</p></div>
          ${why('plans')}
        </div>
        <div class="plan__days">${cells.map(({ day, cell, logged, name }) => html`<a class="plan__day ${day === today() ? 'is-today' : ''} ${cell.kind !== 'session' ? 'is-rest' : ''}" href="${logged.length ? `#/train/s/${logged[0].id}` : '#/train'}" ${logged.length ? '' : raw(`data-act="daypeek" data-session="${cell.sessionId ?? ''}"`)} aria-label="${fmtDay(day)}: ${name || 'no session'}${logged.length ? ', logged' : ''}">
          <b>${DOW[dow(day)]}</b><span>${shortName(name)}</span>${logged.length ? icon('check', 'ic--sm') : raw('<i style="height:16px"></i>')}</a>`)}</div>
        ${state.program ? html`<div class="row"><button class="btn btn--quiet btn--sm grow" type="button" data-act="editweek">${icon('calendar-days')} Edit week</button><button class="btn btn--quiet btn--sm grow" type="button" data-act="sessions">${icon('pencil')} Edit sessions</button></div>` : ''}
      </div>
    </section>

    <div class="cols">
      <a class="frame frame--press" href="#/train/hams">
        <div class="frame__head"><span>Legs and hamstrings</span><span>Last 6 weeks</span></div>
        <div class="frame__body">
          ${hams.some(row => row.sets.Hamstrings) ? html`<div class="bars" role="img" aria-label="Hamstring sets per week: ${hams.map(row => row.sets.Hamstrings ?? 0).join(', ')}">${hams.map((row, index) => html`<i class="${index === hams.length - 1 ? 'is-now' : ''}" style="height:${Math.max(6, ((row.sets.Hamstrings ?? 0) / maxHam) * 100)}%"></i>`)}</div>` : ''}
          <p class="title">${plural(hams.at(-1).sets.Hamstrings ?? 0, 'hamstring set')} this week</p>
          ${hams.some(row => row.sets.Hamstrings) ? '' : html`<p class="tiny muted">Your plan has ${weeklyVolume(train).Hamstrings ?? 0} planned. Sets per week show here once you log.</p>`}
        </div>
      </a>
      <a class="frame frame--press" href="#/train/records">
        <div class="frame__head"><span>Records</span><span>${plural(records.length, 'record')}</span></div>
        <div class="frame__body">${records.length ? (() => { const record = records.at(-1); return html`
          <div class="row">${demo(record.exerciseId, record.variantId, { cls: 'demo--row', still: true })}<div class="grow"><p class="eyebrow">${fmtDay(record.date)}</p><p class="title">${EXERCISES[record.exerciseId].name}</p>
          <p class="data">${record.load > 0 ? `${fmt(record.load, 1)} ${record.unit} × ${record.reps}` : plural(record.reps, 'rep')}</p></div><span class="tag tag--amber">Replay</span></div>`; })()
    : html`<p class="title">No records yet</p><p class="tiny muted">They start from the second time you log a movement.</p>`}</div>
      </a>
    </div>

    <section aria-label="Recent sessions">
      ${sec('Recent', html`<a href="#/train/history">All history</a>`)}
      ${recent.length ? html`<div class="list list--card" style="margin-top:10px">${recent.map(session => sessionRow(state, session))}</div>`
    : html`<p class="small muted" style="margin-top:8px">Nothing logged yet. Finished workouts show up here.</p>`}
    </section>

    <div class="row row--wrap">
      <a class="btn btn--quiet btn--sm grow" href="#/train/library">${icon('book-open')} Lift library</a>
      <button class="btn btn--quiet btn--sm grow" type="button" data-act="settings">${icon('sliders-horizontal')} Settings</button>
    </div>
  </div>`;
}

/** A logged session as a list row: the first lift's photograph, the name, the day. */
function sessionRow(state, session, { year = false } = {}) {
  const first = session.exercises[0];
  return html`<a class="list__i list__i--tap" href="#/train/s/${session.id}">${first ? demo(first.exerciseId, first.variantId, { cls: 'demo--thumb', still: true }) : ''}
    <span class="list__m"><span class="title">${nameOf(session.sessionId)}${session.customized ? html` <span class="tag tag--line">Adapted</span>` : ''}</span><span class="tiny muted" style="display:block">${fmtDay(session.date, year ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' } : undefined)} · ${plural(sessionStats(session).sets, 'set')}${session.partial ? ' · partial' : ''}</span></span>
    <span class="list__e">${recordsIn(state.sessions, session.id).length ? html`<span class="tag tag--amber">PR</span>` : ''}${icon('chevron-right')}</span></a>`;
}

// ---------- logger ----------
function logger(ctx, info) {
  const { state, draft } = info;
  if (!draft) return html`<div class="wrap"><div class="empty empty--pic"><img src="assets/photos/gym-rack.jpg" alt="" loading="lazy"><div><p class="empty__t">No workout in progress</p><p class="muted small">Start one from Train.</p><a class="btn btn--sm" href="#/train">Go to Train</a></div></div></div>`;
  const progress = draftProgress(draft);
  const rir = targetRir(state, draft);
  const firstOpen = draft.exercises.findIndex(entry => entry.sets.some(set => !set.completed));
  const open = openIndex !== null && openIndex < draft.exercises.length ? openIndex : (firstOpen < 0 ? 0 : firstOpen);
  const past = draft.date !== today();
  const hamSets = draft.exercises.filter(entry => groupsOf(entry.exerciseId).includes('Hamstrings')).reduce((sum, entry) => sum + entry.sets.length, 0);
  const legSession = draft.exercises.some(entry => LEG_GROUPS.some(group => groupsOf(entry.exerciseId).includes(group)));
  return html`<div class="wrap lg">
    <header class="lg__head">
      <a class="icon-btn icon-btn--line" href="#/train" aria-label="Leave the workout. It is saved and you can resume.">${icon('arrow-left')}</a>
      <div class="grow"><p class="eyebrow">${past ? `Logging for ${fmtDay(draft.date)}` : 'Recording'}${draft.lightWeek ? ' · lighter' : ''}</p><h1 class="display display--m">${nameOf(draft.sessionId)}${draft.customized ? html` <span class="tag tag--line">Adapted</span>` : ''}</h1></div>
      <button class="icon-btn icon-btn--line" type="button" data-act="undo" aria-label="Undo the last change" ${undoStack.length ? '' : 'disabled style="opacity:.4"'}>${icon('rotate-ccw')}</button>
    </header>
    <div class="lg__prog" role="img" aria-label="${progress.done} of ${progress.total} sets done"><span class="ring" style="--p:${progress.total ? progress.done / progress.total : 0}"><span>${progress.done}</span></span>
      <div class="grow"><p class="title">${progress.done} of ${progress.total} sets</p>${meter(progress.total ? progress.done / progress.total : 0, 'meter--amber')}</div>
      ${why('rir', `RIR ${rir}`)}</div>
    <div class="restbar" id="restBar" ${rest ? '' : 'hidden'} role="timer" aria-label="Rest timer">
      <span class="restbar__fill" data-rest-fill></span>
      <span class="eyebrow">Rest</span><span class="clock restbar__t" data-rest-time>${rest ? clock((rest.until - Date.now()) / 1000) : '0:00'}</span>
      <button type="button" data-act="restplus">+30 s</button><button type="button" data-act="restskip">Skip</button>
    </div>
    ${past ? html`<div class="note"><p>Fill in what you remember, then tick the sets you did. <button class="linkish" style="min-height:0" type="button" data-act="fillall">Fill blanks from last time</button></p></div>` : ''}
    ${legSession && hamSets > 0 && hamSets < 6 && !draft.exercises.every(entry => entry.sets.every(set => set.completed)) ? html`<div class="note note--warn"><p><strong>${plural(hamSets, 'hamstring set')} today.</strong> <button class="linkish" style="min-height:0" type="button" data-act="hamplus">Add one set of leg curls</button></p></div>` : ''}

    ${draft.exercises.map((entry, index) => exerciseCard(state, draft, entry, index, index === open, rir))}

    <div class="row row--wrap">
      <button class="btn btn--quiet btn--sm grow" type="button" data-act="add">${icon('plus')} Add a movement</button>
      <button class="btn btn--quiet btn--sm" type="button" data-act="discard">${icon('trash')} Discard</button>
    </div>
    <button class="btn btn--block ${progress.done ? '' : 'btn--quiet'}" type="button" data-act="finish">${icon('check-check')} Finish workout<span class="vh">, ${progress.done} of ${progress.total} sets done</span></button>
  </div>`;
}

function exerciseCard(state, draft, entry, index, isOpen, rir) {
  const exercise = EXERCISES[entry.exerciseId];
  const last = lastFor(state, draft, entry);
  const done = entry.sets.filter(set => set.completed).length;
  const allDone = done === entry.sets.length;
  const guide = getExerciseGuide(entry.exerciseId, entry.variantId);
  const lastLine = last ? `${last.sets.map(set => `${fmt(set.load, 1)}×${set.reps}`).join('  ')} · ${fmtDay(last.date, { month: 'short', day: 'numeric' })}` : 'First time with this setup';
  if (!isOpen) return html`<button class="lgx lgx--shut ${allDone ? 'lgx--done' : ''}" type="button" data-act="open" data-i="${index}" aria-expanded="false">
      ${demo(entry.exerciseId, entry.variantId, { cls: 'demo--thumb', still: true })}<span class="grow"><span class="title">${variantName(entry)}</span><span class="tiny muted" style="display:block">${entry.sets.length} × ${entry.repMin}-${entry.repMax} · ${done ? `${done} done` : lastLine}</span></span>
      ${allDone ? html`<span class="tag tag--amber">Done</span>` : icon('chevron-down')}</button>`;
  return html`<section class="lgx lgx--open" aria-label="${variantName(entry)}">
    ${guide?.visual ? html`<button class="lgx__demo" type="button" data-act="guide" data-i="${index}" aria-label="How to do ${exercise.name}">${demo(entry.exerciseId, entry.variantId, { cls: 'demo--wide', badge: true })}</button>` : ''}
    <div class="lgx__top">
      <span class="lgx__n">${index + 1}</span>
      <div class="grow"><h2 class="title">${variantName(entry)}</h2><p class="tiny muted">${exercise.muscle} · ${entry.sets.length} × ${entry.repMin}-${entry.repMax} · ${guide?.loadLabel ?? 'total load'}</p></div>
      <button class="icon-btn" type="button" data-act="guide" data-i="${index}" aria-label="How to do ${exercise.name}">${icon('info')}</button>
      <button class="icon-btn" type="button" data-act="more" data-i="${index}" aria-label="Swap, reorder or edit ${exercise.name}">${icon('more')}</button>
    </div>
    <div class="lgx__last"><span class="eyebrow">Last time</span><span class="${last ? 'data num' : 'small muted'}">${lastLine}</span>${last && entry.sets.some(set => !set.completed && set.load === '') ? html`<button class="btn btn--xs btn--quiet" type="button" data-act="copylast" data-i="${index}">Fill</button>` : ''}</div>
    <div class="lgs" role="group" aria-label="Sets">
      <div class="lgs__h"><span>Set</span><span>Load (${draft.unit})</span><span>Reps</span><span>RIR</span><span class="vh">Done</span></div>
      ${entry.sets.map((set, s) => {
    const ghost = last?.sets[s] ?? last?.sets.at(-1) ?? entry.sets.slice(0, s).reverse().find(item => item.completed) ?? null;
    return html`<div class="lgs__r ${set.completed ? 'lgs__r--done' : ''}" data-row="${index}-${s}">
          <span class="lgs__i">${s + 1}</span>
          <span class="stepper stepper--block"><button type="button" data-act="bump" data-i="${index}" data-s="${s}" data-f="load" data-d="-1" aria-label="Less load, set ${s + 1}">−</button>
            <input inputmode="decimal" aria-label="Load, set ${s + 1}" value="${set.load}" placeholder="${ghost ? ghost.load : ''}" data-change="setv" data-i="${index}" data-s="${s}" data-f="load" id="l-${index}-${s}">
            <button type="button" data-act="bump" data-i="${index}" data-s="${s}" data-f="load" data-d="1" aria-label="More load, set ${s + 1}">+</button></span>
          <span class="stepper stepper--block"><button type="button" data-act="bump" data-i="${index}" data-s="${s}" data-f="reps" data-d="-1" aria-label="Fewer reps, set ${s + 1}">−</button>
            <input inputmode="numeric" aria-label="Reps, set ${s + 1}" value="${set.reps}" placeholder="${ghost ? ghost.reps : ''}" data-change="setv" data-i="${index}" data-s="${s}" data-f="reps" id="r-${index}-${s}">
            <button type="button" data-act="bump" data-i="${index}" data-s="${s}" data-f="reps" data-d="1" aria-label="More reps, set ${s + 1}">+</button></span>
          <select class="lgs__rir" aria-label="Reps in reserve, set ${s + 1}" data-change="setv" data-i="${index}" data-s="${s}" data-f="rir">${[0, 1, 2, 3, 4, 5].map(value => html`<option value="${value}" ${(set.rir === '' ? rir : set.rir) === value ? 'selected' : ''}>${value}</option>`)}</select>
          <button class="lgs__ok" type="button" role="checkbox" aria-checked="${set.completed ? 'true' : 'false'}" aria-label="Set ${s + 1} done" data-act="tick" data-i="${index}" data-s="${s}">${icon('check')}</button>
          ${set.completed ? html`<button class="lgs__clean" type="button" aria-pressed="${set.clean ? 'false' : 'true'}" data-act="rough" data-i="${index}" data-s="${s}">${set.clean ? 'Clean reps' : 'Rough reps'}</button>` : ''}
        </div>`;
  })}
    </div>
    ${allDone ? (() => { const tip = progressionSuggestion({ ...entry, lightWeek: draft.lightWeek }, rir); return html`<p class="tiny muted lgx__tip">${tip.text}</p>`; })() : ''}
  </section>`;
}

// ---------- other screens ----------
function sessionPage(ctx, info, id) {
  const session = info.state.sessions.find(item => item.id === id);
  if (!session) return html`<div class="wrap"><div class="empty"><p class="empty__t">That session is not in the journal</p><a class="btn btn--sm" href="#/train/history">History</a></div></div>`;
  const records = recordsIn(info.state.sessions, id);
  // A partial session keeps the movements you never reached, with no sets. Count and list only what was done.
  const performed = session.exercises.filter(entry => entry.sets.length);
  const stats = { ...sessionStats(session), exercises: performed.length };
  const fresh = ctx.query.has('new');
  const statRow = html`<div class="statrow statrow--3"><div class="stat"><div class="stat__v num">${stats.sets}</div><div class="stat__l">Sets</div></div><div class="stat"><div class="stat__v num">${stats.exercises}</div><div class="stat__l">Movements</div></div><div class="stat"><div class="stat__v num">${fmt(stats.volume)}<small>${session.unit}</small></div><div class="stat__l">Load × reps</div></div></div>`;
  return html`<div class="wrap cut">
    <a class="linkish linkish--quiet" href="#/train/history">${icon('arrow-left', 'ic--sm')} History</a>
    ${fresh ? html`<section class="done stamp-in" aria-label="Workout saved"><p class="eyebrow">${fmtDay(session.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1 class="done__t">Saved</h1><p class="title">${nameOf(session.sessionId)}${records.length ? ` · ${plural(records.length, 'record')}` : ''}</p>${statRow}</section>`
    : html`<header><p class="eyebrow">${fmtDay(session.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p><h1 class="display display--l">${nameOf(session.sessionId)}</h1>
      <div class="row row--wrap" style="margin-top:8px">${session.partial ? html`<span class="tag tag--line">Partial</span>` : html`<span class="tag">Complete</span>`}${session.customized ? html`<span class="tag tag--line">Adapted</span>` : ''}${session.lightWeek ? html`<span class="tag tag--line">Lighter</span>` : ''}</div></header>${statRow}`}
    ${records.map(record => html`<button class="frame frame--press" type="button" data-act="replay" data-id="${id}" data-ex="${record.exerciseId}">
      <div class="frame__head"><span>Record</span><span>Replay</span></div><div class="frame__body"><div class="row">${demo(record.exerciseId, record.variantId, { cls: 'demo--row', still: true })}<div class="grow"><p class="title">${EXERCISES[record.exerciseId].name}</p>
      <p class="data">${record.load > 0 ? `${fmt(record.load, 1)} ${record.unit} × ${record.reps}` : plural(record.reps, 'rep')} <span class="muted">· was ${record.previous.load > 0 ? `${fmt(record.previous.load, 1)} × ${record.previous.reps}` : plural(record.previous.reps, 'rep')}</span></p></div></div></div></button>`)}
    <div class="list list--card">${performed.map(entry => html`<div class="list__i">${demo(entry.exerciseId, entry.variantId, { cls: 'demo--thumb', still: true })}<span class="list__m"><span class="title">${variantName(entry)}</span>
      <span class="data num" style="display:block">${entry.sets.map(set => `${fmt(set.load, 1)}×${set.reps}`).join('   ')}</span>${entry.setup ? html`<span class="tiny muted">${entry.setup}</span>` : ''}</span></div>`)}</div>
    <div class="row row--wrap">${fresh ? html`<a class="btn btn--sm grow" href="#/today">Done</a>` : ''}<button class="btn btn--quiet btn--sm grow" type="button" data-act="repeat" data-id="${id}">${icon('rotate-ccw')} Repeat this lineup</button></div>
  </div>`;
}

function historyPage(info) {
  const sessions = [...info.state.sessions].sort((a, b) => b.date.localeCompare(a.date));
  return html`<div class="wrap cut"><a class="linkish linkish--quiet" href="#/train">${icon('arrow-left', 'ic--sm')} Train</a>
    <h1 class="display display--l">History</h1>
    ${sessions.length ? html`<div class="list list--card">${sessions.map(session => sessionRow(info.state, session, { year: true }))}</div>`
    : html`<div class="empty empty--pic"><img src="assets/photos/gym-rack.jpg" alt="" loading="lazy"><div><p class="empty__t">Nothing logged yet</p><p class="muted small">Finished workouts are listed here, newest first.</p><a class="btn btn--sm" href="#/train">Start one</a></div></div>`}</div>`;
}

function recordsPage(info) {
  const records = [...findRecords(info.state.sessions)].reverse();
  return html`<div class="wrap cut"><a class="linkish linkish--quiet" href="#/train">${icon('arrow-left', 'ic--sm')} Train</a>
    <div class="spread"><h1 class="display display--l">Records</h1>${why('records')}</div>
    ${records.length ? html`<div class="list list--card">${records.map(record => html`<button class="list__i list__i--tap" type="button" data-act="replay" data-id="${record.sessionId}" data-ex="${record.exerciseId}">${demo(record.exerciseId, record.variantId, { cls: 'demo--thumb', still: true })}<span class="list__m"><span class="title">${EXERCISES[record.exerciseId].name}</span>
      <span class="data num" style="display:block">${record.load > 0 ? `${fmt(record.load, 1)} ${record.unit} × ${record.reps}` : plural(record.reps, 'rep')}</span><span class="tiny muted">${fmtDay(record.date)}</span></span><span class="list__e"><span class="tag tag--amber">Replay</span></span></button>`)}</div>`
    : html`<div class="empty empty--pic"><img src="assets/photos/gym-rack.jpg" alt="" loading="lazy"><div><p class="empty__t">No records yet</p><p class="muted small">Log a movement twice and Forme starts comparing.</p></div></div>`}</div>`;
}

function hamsPage(info) {
  const weeks = weeklySets(info.state.sessions, today(), 6);
  const max = Math.max(6, ...weeks.flatMap(row => LEG_GROUPS.map(group => row.sets[group] ?? 0)));
  const lifts = ['rdl', 'legcurl', 'lying-legcurl', 'hip-thrust', 'squat', 'legpress'].map(id => ({ id, rows: liftHistory(info.state.sessions, id, 6) })).filter(item => item.rows.length);
  const now = weeks.at(-1).sets;
  const planned = weeklyVolume(info.train);
  const reading = `Your plan, ${activePlan(info.train).name}, puts about ${planned.Hamstrings ?? 0} hamstring sets and ${planned.Quads ?? 0} quad sets in a full week.\nIf the hamstring bar sits well under the quads bar most weeks, the simplest fix is one extra set of leg curls on each leg day. Forme offers that inside the workout.\nThe bars count sets you ticked, so a missed or partial session shows up here.`;
  return html`<div class="wrap cut"><a class="linkish linkish--quiet" href="#/train">${icon('arrow-left', 'ic--sm')} Train</a>
    <header><p class="eyebrow">Focus view</p><div class="spread"><h1 class="display display--l">Legs and hamstrings</h1>${why('text', '', { title: 'Reading these bars', body: reading })}</div></header>
    <div class="cols">${LEG_GROUPS.map(group => html`<section class="frame"><div class="frame__head"><span>${group}</span><span>${plural(now[group] ?? 0, 'set')} this week</span></div><div class="frame__body">
      <div class="bars bars--lab" role="img" aria-label="${group} sets per week, oldest first: ${weeks.map(row => row.sets[group] ?? 0).join(', ')}">${weeks.map((row, index) => html`<span><b class="data">${row.sets[group] ?? 0}</b><i class="${index === weeks.length - 1 ? 'is-now' : ''}" style="height:${Math.max(4, ((row.sets[group] ?? 0) / max) * 100)}%"></i></span>`)}</div>
    </div></section>`)}</div>
    ${lifts.length ? html`${sec('Top sets')}<div class="list list--card">${lifts.map(lift => html`<a class="list__i list__i--tap" href="#/train/x/${lift.id}">${demo(lift.id, undefined, { cls: 'demo--thumb', still: true })}<span class="list__m"><span class="title">${EXERCISES[lift.id].name}</span><span class="data num" style="display:block">${lift.rows.map(row => (row.loaded ? `${fmt(row.load, 1)}×${row.reps}` : `${row.reps}r`)).join('  →  ')}</span></span><span class="list__e">${icon('chevron-right')}</span></a>`)}</div>`
    : html`<p class="small muted">After your first leg session, the top sets for RDL, leg curl, squat and leg press show up here.</p>`}
  </div>`;
}

function libraryPage() {
  const groups = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs'];
  const query = libraryQuery.trim().toLowerCase();
  const list = Object.values(EXERCISES).filter(exercise => (!query || `${exercise.name} ${exercise.muscle} ${exercise.variants.map(variant => variant.name).join(' ')}`.toLowerCase().includes(query)) && (!libraryGroup || groupsOf(exercise.id).includes(libraryGroup)));
  return html`<div class="wrap"><a class="linkish linkish--quiet" href="#/train">${icon('arrow-left', 'ic--sm')} Train</a>
    <h1 class="display display--l">Lift library</h1>
    <div class="search__bar">${icon('search')}<input class="input" id="libq" type="search" value="${libraryQuery}" placeholder="Search ${Object.keys(EXERCISES).length} lifts" aria-label="Search lifts by name, muscle or equipment" data-input="libq" autocomplete="off"></div>
    <div class="scroller" role="group" aria-label="Muscle group">${groups.map(group => html`<button class="chip" type="button" aria-pressed="${libraryGroup === group ? 'true' : 'false'}" data-act="libg" data-g="${group}">${group}</button>`)}</div>
    ${list.length ? html`<div class="lgrid">${list.map(exercise => html`<a class="lcard" href="#/train/x/${exercise.id}">${demo(exercise.id, undefined, { still: true })}
      <span class="lcard__t">${exercise.name}</span><span class="tiny muted">${exercise.muscle} · ${exercise.repMin}-${exercise.repMax} reps</span></a>`)}</div>`
    : html`<div class="empty"><p class="empty__t">Nothing matches</p><p class="muted small">Try a muscle (hamstrings), a tool (cable) or clear the filter.</p><button class="btn btn--quiet btn--sm" type="button" data-act="libclear">Clear search</button></div>`}
  </div>`;
}

function guideBody(exerciseId, variantId, state) {
  const exercise = EXERCISES[exerciseId];
  const guide = getExerciseGuide(exerciseId, variantId);
  const rows = state ? liftHistory(state.sessions, exerciseId, 6) : [];
  return html`
    ${guide.visual ? html`<div class="pair2"><figure><img src="assets/images/exercises/${guide.visual.imageId}-0.jpg" alt="${guide.name}: start position" loading="lazy"><figcaption class="eyebrow">Start</figcaption></figure><figure><img src="assets/images/exercises/${guide.visual.imageId}-1.jpg" alt="${guide.name}: end position" loading="lazy"><figcaption class="eyebrow">Finish</figcaption></figure></div>`
    : html`<div class="note"><p>No audited photo for this variation, so Forme shows the cues only.</p></div>`}
    <p class="lead">${guide.cues}</p>
    <div class="statrow statrow--3"><div class="stat"><div class="stat__v num">${guide.repMin}-${guide.repMax}</div><div class="stat__l">Reps</div></div><div class="stat"><div class="stat__v num">${clock(guide.rest)}</div><div class="stat__l">Rest</div></div><div class="stat"><div class="stat__v" style="font-size:1.25rem;line-height:1.05">${guide.muscle}</div><div class="stat__l">Works</div></div></div>
    <div class="row row--wrap">${why('text', `Log as: ${guide.loadLabel ?? 'total load'}`, { title: 'How to log the load', body: guide.loadNote })}${guide.visual ? why('demos', 'About the photos') : ''}</div>
    ${rows.length ? html`<div><p class="eyebrow">Your top sets</p><p class="data num">${rows.map(row => `${row.loaded ? `${fmt(row.load, 1)}×${row.reps}` : `${row.reps}r`} (${fmtDay(row.date, { month: 'short', day: 'numeric' })})`).join('  ·  ')}</p></div>` : ''}
    ${exercise.variants.length > 1 ? html`<div><p class="eyebrow">Variations</p><div class="chips" style="margin-top:6px">${exercise.variants.map(variant => html`<span class="tag ${variant.id === (variantId ?? exercise.variants[0].id) ? '' : 'tag--line'}">${variant.name}</span>`)}</div></div>` : ''}`;
}

function guidePage(info, id) {
  if (!Object.hasOwn(EXERCISES, id)) return html`<div class="wrap"><div class="empty"><p class="empty__t">Unknown movement</p><a class="btn btn--sm" href="#/train/library">Library</a></div></div>`;
  return html`<div class="wrap cut"><a class="linkish linkish--quiet" href="#/train/library">${icon('arrow-left', 'ic--sm')} Library</a>
    <header><p class="eyebrow">${EXERCISES[id].muscle}</p><h1 class="display display--l">${EXERCISES[id].name}</h1></header>${guideBody(id, undefined, info.state)}</div>`;
}

// ---------- sheets: starting ----------
function begin(sessionId, date = today(), light = false, quick = false) {
  let state = store.training.read().value;
  if (state.draft) { toast('Finish or discard the workout in progress first.'); return false; }
  if (!isRealDate(date) || date > today()) { toast('Pick today or an earlier date.'); return false; }
  if (date < state.startDate) {
    if (state.sessions.length) { toast(`Your journal starts ${fmtDay(state.startDate)}. Pick that day or later.`); return false; }
    state = { ...createTrainingState(date), unit: state.unit };
  }
  try {
    const draft = buildDraft(state, prefs(), sessionId, date, light);
    if (quick) draft.exercises = draft.exercises.map(entry => { const last = findLastEntry(state.sessions, entry.exerciseId, entry.variantId, draft.unit, entry.setup, addDays(date, 1)); return last ? copyLastSets(entry, last) : entry; });
    if (!write({ ...state, draft }, { undo: false })) return false;
  } catch (error) { toast(clean(error.message)); return false; }
  undoStack.length = 0; openIndex = null; touch();
  location.hash = '#/train/go';
  return true;
}

/** Sessions you can start: the plan's own first, then everything else in the library. */
function startable(state) {
  const train = prefs();
  const mine = state.program ? planSessions(train) : [];
  const legacy = SESSIONS.filter(session => !state.program || state.sessions.some(item => item.sessionId === session.id));
  const others = CATALOGUE.filter(session => !mine.some(item => item.id === session.id));
  return { mine, others, legacy };
}

const sessionButton = (session, act = 'go') => { const train = prefs(); const rows = sessionLineup(train, session.id); const first = rows[0];
  return html`<button class="sess" type="button" data-act="${act}" data-session="${session.id}">${first ? demo(first.exerciseId, first.variantId, { cls: 'demo--row', still: true }) : ''}
    <span class="grow"><span class="title" style="display:block">${sessionName(train, session.id)}${isEdited(train, session.id) ? html` <span class="tag tag--line">Yours</span>` : ''}</span><span class="tiny muted">${session.focus}</span><span class="tiny muted" style="display:block">${plural(rows.length, 'movement')} · ${plural(sessionSets(train, session.id), 'set')} · about ${sessionMinutes(train, session.id)} min</span></span>${icon('chevron-right')}</button>`; };

function pickSession(state, { quick = false } = {}) {
  let date = today(); let light = false; let all = false;
  const { mine, others, legacy } = startable(state);
  return sheet({
    title: quick ? 'Log a past workout' : 'Start a session', eyebrow: quick ? 'Forgot to track' : activePlan(prefs()).name,
    body: () => html`
      ${quick ? html`<label class="field"><span class="field__l">When was it</span><input class="input" type="date" id="qdate" value="${date}" min="${state.sessions.length || state.draft ? state.startDate : '2020-01-01'}" max="${today()}" data-change="date"></label>` : ''}
      <div>${mine.map(session => sessionButton(session))}${legacy.map(session => sessionButton(session))}</div>
      ${all ? html`<div><p class="eyebrow" style="margin-bottom:8px">From other plans</p>${others.map(session => sessionButton(session))}</div>`
    : html`<button class="btn btn--quiet btn--sm btn--block" type="button" data-act="all">${icon('plus')} ${plural(others.length, 'more session')} from other plans</button>`}
      <div class="row"><button class="switch" type="button" role="switch" aria-checked="${light ? 'true' : 'false'}" data-act="light"><span class="switch__t"><span class="title" style="font-size:.98rem">Lighter session</span></span><span class="switch__k"></span></button>${why('lighter')}</div>`,
    changes: { date: (_d, el) => { date = el.value; } },
    actions: {
      light: (_d, _e, _ev, self) => { light = !light; self.update(); },
      all: (_d, _e, _ev, self) => { all = true; self.update(); },
      go: (data, _e, _ev, self) => { if (begin(data.session, date, light, quick)) self.close(); },
    },
  });
}

/** Everything in one session before you start it. */
function previewSheet(sessionId, { startable: canStart = true } = {}) {
  const template = getSessionTemplate(sessionId);
  if (!template) return null;
  const state = store.training.read().value;
  const live = state.draft?.sessionId === sessionId ? state.draft : null;
  return sheet({
    title: nameOf(sessionId), eyebrow: template.focus,
    body: () => { const train = prefs(); const rows = live ? live.exercises.map(entry => ({ exerciseId: entry.exerciseId, variantId: entry.variantId, sets: entry.sets.length, repMin: entry.repMin, repMax: entry.repMax })) : sessionLineup(train, sessionId);
      return html`<div class="statrow statrow--3"><div class="stat"><div class="stat__v num">${rows.length}</div><div class="stat__l">Movements</div></div><div class="stat"><div class="stat__v num">${rows.reduce((sum, row) => sum + row.sets, 0)}</div><div class="stat__l">Sets</div></div><div class="stat"><div class="stat__v num">${sessionMinutes(train, sessionId)}<small>min</small></div><div class="stat__l">About</div></div></div>
      <div>${rows.map(lineupRow)}</div>`; },
    footer: live ? html`<a class="btn" href="#/train/go">Resume workout</a>`
      : html`<button class="btn btn--quiet" type="button" data-act="edit">${icon('pencil')} Edit</button>${canStart && !state.draft ? html`<button class="btn" type="button" data-act="go">Start</button>` : ''}`,
    actions: {
      edit: (_d, _e, _ev, self) => { self.close(); editSession(sessionId); },
      go: (_d, _e, _ev, self) => { if (begin(sessionId)) self.close(); },
    },
  });
}

/** Lighter, another session, a past workout, the last lineup: the ways to start that are not the big button. */
function optionsSheet(info) {
  const { state, planned, template } = info;
  const last = template ? lastComparable(state.sessions, template.id) : null;
  const canStart = planned?.kind === 'session' && !planned.completed && !state.draft;
  sheet({
    title: 'More ways to start', eyebrow: 'Train',
    body: html`<div class="qgrid">
      ${canStart ? html`<button class="qbtn" type="button" data-act="lighter">${icon('minus')}<span><b>Lighter</b><small>Half the sets today</small></span></button>` : ''}
      <button class="qbtn" type="button" data-act="pick">${icon('arrow-left-right')}<span><b>Another session</b><small>Any session, any plan</small></span></button>
      <button class="qbtn" type="button" data-act="past">${icon('clock-3')}<span><b>Forgot to log</b><small>A workout from an earlier day</small></span></button>
      ${last && canStart ? html`<button class="qbtn" type="button" data-act="repeat" data-id="${last.id}">${icon('rotate-ccw')}<span><b>Repeat last time</b><small>The lineup from ${fmtDay(last.date, { month: 'short', day: 'numeric' })}</small></span></button>` : ''}
    </div>`,
    actions: {
      lighter: (_d, _e, _ev, self) => { if (begin(template.id, today(), true)) self.close(); },
      pick: (_d, _e, _ev, self) => { self.close(); if (state.draft) return toast('Finish or discard the workout in progress first.'); pickSession(store.training.read().value); },
      past: (_d, _e, _ev, self) => { self.close(); if (state.draft) return toast('Finish or discard the workout in progress first.'); pickSession(store.training.read().value, { quick: true }); },
      repeat: (data, _e, _ev, self) => { self.close(); repeat(data.id); },
    },
  });
}

function repeat(id) {
  try { if (write(repeatSession(store.training.read().value, id, today()), { undo: false })) { undoStack.length = 0; openIndex = null; touch(); location.hash = '#/train/go'; } } catch (error) { toast(clean(error.message)); }
}

// ---------- sheets: plans ----------
const planFacts = (train, plan) => { const week = planWeek(train, plan.id); const volume = weeklyVolume(train, plan.id);
  return { week, days: trainingDays(week), sets: week.filter(Boolean).reduce((sum, id) => sum + sessionSets(train, id), 0), volume }; };

/** The plan library: every plan as a card with the lifts it is built from. */
function plansSheet() {
  sheet({
    title: 'Plans', eyebrow: 'Choose how your week runs', cls: 'sheet--tall',
    body: () => { const train = prefs(); const current = activePlan(train).id; const state = store.training.read().value;
      return html`<div class="pcards">${PLANS.map(plan => { const facts = planFacts(train, plan); const rows = plan.art.map(([exerciseId, variantId]) => ({ exerciseId, variantId }));
        const on = state.program && current === plan.id;
        return html`<button class="pcard" type="button" data-act="open" data-plan="${plan.id}" aria-pressed="${on ? 'true' : 'false'}">
          <span class="pcard__art">${rows.length ? collage(rows, 3) : html`<img src="assets/photos/gym-rack.jpg" alt="" loading="lazy" style="grid-column:1 / -1">`}<span class="pcard__badge"><b>${plan.name}</b>${on ? html`<span class="pcard__on">${icon('check')} Current</span>` : ''}</span></span>
          <span class="pcard__b"><span class="eyebrow">${plan.kicker}</span><span class="meta"><span>${facts.days ? `${plural(facts.days, 'day')} a week` : 'You choose the days'}</span>${facts.sets ? html`<span>${facts.sets} sets a week</span>` : ''}${facts.volume.Hamstrings ? html`<span>${facts.volume.Hamstrings} hamstring sets</span>` : ''}</span></span></button>`; })}</div>
      <div class="row">${why('plans', 'What changing plan does')}</div>`; },
    actions: { open: (data, _e, _ev, self) => { self.close(); planSheet(data.plan); } },
  });
}

/** One plan in full: the week, the sessions, the weekly sets, and the button that switches to it. */
function planSheet(planId) {
  const plan = PLAN_BY_ID[planId];
  if (!plan) return;
  sheet({
    title: plan.name, eyebrow: plan.kicker,
    body: () => { const train = prefs(); const facts = planFacts(train, plan); const sessions = planSessions(train, plan.id);
      const groups = Object.entries(facts.volume).sort((a, b) => b[1] - a[1]);
      return html`<p class="lead">${plan.blurb}</p>
      <p class="small muted"><strong>Suits.</strong> ${plan.suits}</p>
      <div class="plan__days">${facts.week.map((id, index) => html`<span class="plan__day ${id ? '' : 'is-rest'}"><b>Day ${index + 1}</b><span>${id ? shortName(sessionName(train, id)) : 'Rest'}</span></span>`)}</div>
      ${sessions.length ? html`<div>${sessions.map(session => sessionButton(session, 'peek'))}</div>` : html`<div class="note"><p>This one starts empty. Use it, then pick a session for each day you train.</p></div>`}
      ${groups.length ? html`<div><p class="eyebrow" style="margin-bottom:8px">Sets a week, by muscle</p><div class="chips">${groups.map(([group, sets]) => html`<span class="tag tag--line">${group} ${sets}</span>`)}</div></div>` : ''}`; },
    footer: () => { const state = store.training.read().value; const on = state.program && activePlan(prefs()).id === plan.id;
      return html`<button class="btn btn--quiet" type="button" data-act="back">All plans</button>${on ? html`<button class="btn" type="button" data-act="week">Edit week</button>` : html`<button class="btn" type="button" data-act="use">Use this plan</button>`}`; },
    actions: {
      back: (_d, _e, _ev, self) => { self.close(); plansSheet(); },
      peek: (data, _e, _ev, self) => { self.close(); previewSheet(data.session, { startable: false }); },
      week: (_d, _e, _ev, self) => { self.close(); weekSheet(); },
      use: (_d, _e, _ev, self) => {
        const state = store.training.read().value;
        // A journal still on the earlier four-session plan moves to the rotation calendar first, week starting Monday.
        if (!state.program) { try { if (!write(setProgramDay(state, today(), dow(today()) + 1), { undo: false })) return; } catch (error) { return toast(clean(error.message)); } }
        store.update('train', train => { train.plan = plan.id; });
        haptic('done'); self.close();
        toast(`${plan.name} is your plan now.${state.draft ? ' The workout in progress is unchanged.' : ''}`);
        if (plan.id === 'custom' && !trainingDays(planWeek(prefs(), 'custom'))) weekSheet();
      },
    },
  });
}

/** Move sessions between days. The week shown is this calendar week. */
function weekSheet() {
  const state = store.training.read().value;
  if (!state.program) return plansSheet();
  const plan = activePlan(prefs());
  const monday = addDays(today(), -dow(today()));
  const cycleOf = day => planDay(store.training.read().value, prefs(), day).cycleDay - 1;
  sheet({
    title: 'Your week', eyebrow: plan.name,
    body: () => { const train = prefs(); const week = planWeek(train);
      return html`<div class="list list--card">${Array.from({ length: 7 }, (_, index) => { const day = addDays(monday, index); const slot = cycleOf(day); const id = week[slot]; const first = id ? sessionLineup(train, id)[0] : null;
        return html`<button class="list__i list__i--tap" type="button" data-act="slot" data-slot="${slot}" data-day="${DOW[index]}">
          ${first ? demo(first.exerciseId, first.variantId, { cls: 'demo--thumb', still: true }) : html`<span class="demo demo--blank demo--thumb" aria-hidden="true">${icon('moon')}</span>`}
          <span class="list__m"><span class="eyebrow">${DOW[index]}${day === today() ? ' · today' : ''}</span><span class="title" style="display:block">${id ? sessionName(train, id) : 'Rest'}</span></span><span class="list__e">${icon('chevron-right')}</span></button>`; })}</div>
      <div class="row row--wrap">${weekIsCustom(train) ? html`<button class="btn btn--quiet btn--sm grow" type="button" data-act="reset">${icon('rotate-ccw')} Put the plan's week back</button>` : ''}<button class="btn btn--quiet btn--sm grow" type="button" data-act="shift">${icon('arrow-left-right')} Slide the whole week</button></div>`; },
    actions: {
      slot: (data, _e, _ev, self) => slotSheet(Number(data.slot), data.day, () => self.update()),
      reset: (_d, _e, _ev, self) => { store.update('train', train => { delete train.weeks[plan.id]; }); toast('Back to the plan\'s own week.'); self.update(); },
      shift: (_d, _e, _ev, self) => { self.close(); shiftSheet(); },
    },
  });
}

/** Choose what one day holds: a session of this plan, any other session, or rest. */
function slotSheet(slot, dayLabel, onDone) {
  const plan = activePlan(prefs());
  let all = plan.id === 'custom';
  sheet({
    title: dayLabel, eyebrow: 'What goes here',
    body: () => { const train = prefs(); const current = planWeek(train)[slot]; const mine = planSessions(train); const others = CATALOGUE.filter(session => !mine.some(item => item.id === session.id));
      const row = session => html`<button class="list__i list__i--tap" type="button" data-act="set" data-session="${session.id}"><span class="list__m"><span class="title">${sessionName(train, session.id)}</span><span class="tiny muted" style="display:block">${session.focus}</span></span>${current === session.id ? html`<span class="list__e">${icon('check')}</span>` : ''}</button>`;
      return html`<div class="list list--card"><button class="list__i list__i--tap" type="button" data-act="set" data-session=""><span class="list__m"><span class="title">Rest</span><span class="tiny muted" style="display:block">Nothing planned</span></span>${current === null ? html`<span class="list__e">${icon('check')}</span>` : ''}</button>${mine.map(row)}${all ? others.map(row) : ''}</div>
      ${all ? '' : html`<button class="btn btn--quiet btn--sm btn--block" type="button" data-act="all">${icon('plus')} Sessions from other plans</button>`}`; },
    actions: {
      all: (_d, _e, _ev, self) => { all = true; self.update(); },
      set: (data, _e, _ev, self) => {
        store.update('train', train => { const week = planWeek(train); week[slot] = data.session || null; train.weeks[plan.id] = week; });
        self.close(); onDone?.();
      },
    },
  });
}

/** Slide the whole rotation so that today is a chosen day of it. Past records do not move. */
function shiftSheet() {
  const train = prefs(); const week = planWeek(train);
  sheet({
    title: 'What is today?', eyebrow: 'Slide the week',
    body: html`<p class="muted">Pick the day of the plan that today should be. Every other day follows. Past records do not move.</p>
      <div class="list list--card">${week.map((id, index) => html`<button class="list__i list__i--tap" type="button" data-act="set" data-d="${index + 1}"><span class="lgx__n">${index + 1}</span><span class="list__m title">${id ? sessionName(train, id) : 'Rest'}</span></button>`)}</div>`,
    actions: { set: (data, _e, _ev, self) => { const state = store.training.read().value; try { if (write(setProgramDay(state, today(), Number(data.d)), { undo: false })) { toast('Week moved.'); self.close(); } } catch (error) { toast(clean(error.message)); } } },
  });
}

/** Pick one of the plan's sessions to edit. */
function sessionsSheet() {
  const sessions = planSessions(prefs());
  if (!sessions.length) return weekSheet();
  sheet({
    title: 'Edit sessions', eyebrow: activePlan(prefs()).name,
    body: () => html`<div>${planSessions(prefs()).map(session => sessionButton(session, 'edit'))}</div><div class="row">${why('edited', 'How your version is used')}</div>`,
    actions: { edit: (data, _e, _ev, self) => { self.close(); editSession(data.session); } },
  });
}

/** Change a session for good: movements, order, sets, reps, variation, name. */
function editSession(sessionId) {
  const template = getSessionTemplate(sessionId);
  if (!template) return;
  let rows = sessionLineup(prefs(), sessionId);
  let name = sessionName(prefs(), sessionId);
  let open = null; let adding = false;
  const bump = (index, key, delta) => {
    const row = { ...rows[index] };
    if (key === 'sets') row.sets = Math.min(20, Math.max(1, row.sets + delta));
    if (key === 'repMin') row.repMin = Math.min(row.repMax, Math.max(1, row.repMin + delta));
    if (key === 'repMax') row.repMax = Math.min(100, Math.max(row.repMin, row.repMax + delta));
    rows = rows.map((item, i) => (i === index ? row : item));
  };
  const stepper = (index, key, label) => html`<div><p class="field__l">${label}</p><span class="stepper stepper--sm"><button type="button" data-act="bump" data-i="${index}" data-k="${key}" data-d="-1" aria-label="Less: ${label}">−</button><output>${rows[index][key]}</output><button type="button" data-act="bump" data-i="${index}" data-k="${key}" data-d="1" aria-label="More: ${label}">+</button></span></div>`;
  sheet({
    title: 'Edit session', eyebrow: template.name, cls: 'sheet--tall',
    body: () => {
      if (adding) {
        const options = Object.values(EXERCISES).filter(exercise => !rows.some(row => row.exerciseId === exercise.id));
        return html`<button class="linkish linkish--quiet" type="button" data-act="cancel">${icon('arrow-left', 'ic--sm')} Back to the session</button>
          <div class="list list--card">${options.map(exercise => html`<button class="list__i list__i--tap" type="button" data-act="pick" data-x="${exercise.id}">${demo(exercise.id, undefined, { cls: 'demo--thumb', still: true })}<span class="list__m"><span class="title">${exercise.name}</span><span class="tiny muted" style="display:block">${exercise.muscle}</span></span><span class="list__e">${adding === true ? 'Add' : 'Swap'}</span></button>`)}</div>`;
      }
      return html`<label class="field"><span class="field__l">Name</span><input class="input" id="sname" maxlength="28" value="${name}" data-input="name"></label>
        <div class="list list--card">${rows.map((row, index) => html`<div class="list__i" style="flex-wrap:wrap">
          <button class="row grow" type="button" data-act="open" data-i="${index}" aria-expanded="${open === index ? 'true' : 'false'}" style="text-align:left;min-width:0">${demo(row.exerciseId, row.variantId, { cls: 'demo--thumb', still: true })}
            <span class="grow"><span class="title" style="display:block">${variantOf(row.exerciseId, row.variantId)}</span><span class="tiny muted">${row.sets} × ${row.repMin}-${row.repMax} · ${EXERCISES[row.exerciseId].muscle}</span></span></button>
          <button class="icon-btn" type="button" data-act="up" data-i="${index}" aria-label="Move ${EXERCISES[row.exerciseId].name} earlier" ${index === 0 ? 'disabled' : ''}>${icon('arrow-up')}</button>
          <button class="icon-btn" type="button" data-act="down" data-i="${index}" aria-label="Move ${EXERCISES[row.exerciseId].name} later" ${index === rows.length - 1 ? 'disabled' : ''}>${icon('arrow-down')}</button>
          ${open === index ? html`<div class="stack" style="flex-basis:100%;padding:4px 0 6px">
            <div class="grid3">${stepper(index, 'sets', 'Sets')}${stepper(index, 'repMin', 'Reps from')}${stepper(index, 'repMax', 'Reps to')}</div>
            ${EXERCISES[row.exerciseId].variants.length > 1 ? html`<div class="chips">${EXERCISES[row.exerciseId].variants.map(variant => html`<button class="chip" type="button" aria-pressed="${variant.id === row.variantId ? 'true' : 'false'}" data-act="variant" data-i="${index}" data-v="${variant.id}">${variant.name}</button>`)}</div>` : ''}
            <div class="row"><button class="btn btn--quiet btn--xs grow" type="button" data-act="swap" data-i="${index}">${icon('arrow-left-right', 'ic--sm')} Swap</button><button class="btn btn--quiet btn--xs grow" type="button" data-act="remove" data-i="${index}" ${rows.length === 1 ? 'disabled' : ''}>${icon('trash', 'ic--sm')} Remove</button></div>
          </div>` : ''}</div>`)}</div>
        <button class="btn btn--quiet btn--sm btn--block" type="button" data-act="add" ${rows.length >= 25 ? 'disabled' : ''}>${icon('plus')} Add a movement</button>
        ${isEdited(prefs(), sessionId) || prefs().edits?.[sessionId] ? html`<button class="btn btn--quiet btn--sm btn--block" type="button" data-act="reset">${icon('rotate-ccw')} Put the plan's version back</button>` : ''}`;
    },
    footer: () => (adding ? null : html`<button class="btn btn--quiet" type="button" data-act="__close">Cancel</button><button class="btn" type="button" data-act="save">Save session</button>`),
    inputs: { name: (_d, el) => { name = el.value; } },
    actions: {
      open: (data, _e, _ev, self) => { open = open === Number(data.i) ? null : Number(data.i); self.update(); },
      bump: (data, _e, _ev, self) => { bump(Number(data.i), data.k, Number(data.d)); haptic('tap'); self.update(); },
      variant: (data, _e, _ev, self) => { rows = rows.map((row, i) => (i === Number(data.i) ? { ...row, variantId: data.v } : row)); self.update(); },
      up: (data, _e, _ev, self) => { const i = Number(data.i); if (i < 1) return; const next = [...rows]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; rows = next; open = open === i ? i - 1 : open === i - 1 ? i : open; self.update(); },
      down: (data, _e, _ev, self) => { const i = Number(data.i); if (i >= rows.length - 1) return; const next = [...rows]; [next[i + 1], next[i]] = [next[i], next[i + 1]]; rows = next; open = open === i ? i + 1 : open === i + 1 ? i : open; self.update(); },
      remove: (data, _e, _ev, self) => { rows = rows.filter((_row, i) => i !== Number(data.i)); open = null; self.update(); },
      add: (_d, _e, _ev, self) => { adding = true; self.update(); },
      swap: (data, _e, _ev, self) => { adding = Number(data.i) + 1; self.update(); },
      cancel: (_d, _e, _ev, self) => { adding = false; self.update(); },
      pick: (data, _e, _ev, self) => {
        const exercise = EXERCISES[data.x];
        const fresh = { exerciseId: exercise.id, variantId: exercise.variants[0].id, sets: 3, repMin: exercise.repMin, repMax: exercise.repMax };
        if (adding === true) { rows = [...rows, fresh]; open = rows.length - 1; }
        else { const i = adding - 1; rows = rows.map((row, index) => (index === i ? { ...fresh, sets: row.sets } : row)); open = i; }
        adding = false; self.update();
      },
      reset: (_d, _e, _ev, self) => { store.update('train', train => { delete train.edits[sessionId]; }); toast('Back to the plan\'s version.'); self.close(); },
      save: (_d, _e, _ev, self) => {
        const lineup = cleanLineup(rows);
        if (!lineup) return toast('Check the sets and reps: at least one movement, 1 to 20 sets.');
        const trimmed = name.trim();
        store.update('train', train => { train.edits[sessionId] = { ...(trimmed && trimmed !== template.name ? { name: trimmed.slice(0, 28) } : {}), exercises: lineup }; });
        haptic('done'); toast(`${trimmed || template.name} saved. It is used from your next workout.`); self.close();
      },
    },
  });
}

// ---------- sheets: the workout ----------
function replay(state, sessionId, exerciseId) {
  const record = findRecords(state.sessions).find(item => item.sessionId === sessionId && item.exerciseId === exerciseId);
  if (!record) return;
  const oldValue = record.previous.value; const newValue = record.value;
  const label = value => (record.load > 0 ? `${fmt(value, 0)} ${record.unit} est. max` : `${fmt(value)} reps`);
  const body = () => html`<div class="pr ${motionOK() ? 'pr--play' : ''}" aria-live="polite">
      <div class="pr__kick"><span>Record</span><span>${fmtDay(record.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
      <p class="eyebrow">${EXERCISES[record.exerciseId].name}</p>
      <p class="display display--l">${record.load > 0 ? `${fmt(record.load, 1)} ${record.unit} × ${record.reps}` : plural(record.reps, 'rep')}</p>
      <div class="pr__bars"><div><span class="eyebrow">Before</span><div class="pr__bar pr__bar--old" style="--w:${(oldValue / newValue) * 100}%"></div><span class="data">${label(oldValue)}</span></div>
        <div><span class="eyebrow">This set</span><div class="pr__bar pr__bar--new" style="--w:100%"></div><span class="data">${label(newValue)}</span></div></div>
      <p class="muted small">Up ${fmt(((newValue - oldValue) / oldValue) * 100, 1)}% on your previous best for this exact setup.</p></div>`;
  sheet({ title: 'New best', eyebrow: 'Record', body, footer: html`<button class="btn btn--quiet" type="button" data-act="again">${icon('rotate-ccw')} Replay</button><button class="btn" type="button" data-act="__close">Done</button>`, actions: { again: (_d, _e, _ev, self) => self.update() } });
}

function moreSheet(index) {
  const read = () => { const state = store.training.read().value; return { state, entry: state.draft?.exercises[index] }; };
  const { state, entry } = read();
  if (!entry) return;
  const exercise = EXERCISES[entry.exerciseId];
  const same = Object.values(EXERCISES).filter(other => other.id !== exercise.id && groupsOf(other.id).some(group => groupsOf(exercise.id).includes(group)) && !state.draft.exercises.some(item => item.exerciseId === other.id));
  const recorded = entry.sets.some(set => set.load !== '' || set.reps !== '' || set.completed);
  const apply = (action, self, message) => { const { state: now } = read(); try { if (write(editDraft(now, action))) { toast(message, { action: 'Undo', onAction: undo }); self.close(); } } catch (error) { toast(clean(error.message)); } };
  sheet({
    title: exercise.name, eyebrow: 'Just for this workout',
    body: () => html`
      ${exercise.variants.length > 1 ? html`<div class="opt"><p class="opt__l"><span>Variation</span></p><div class="chips">${exercise.variants.map(variant => html`<button class="chip" type="button" aria-pressed="${variant.id === entry.variantId ? 'true' : 'false'}" data-act="variant" data-v="${variant.id}">${variant.name}</button>`)}</div></div>` : ''}
      <div class="opt"><div class="grid2"><label class="field"><span class="field__l">Working sets</span><input class="input input--num" id="psets" inputmode="numeric" value="${entry.prescribedSets}"></label>
        <label class="field"><span class="field__l">Rep range</span><span class="row"><input class="input input--num" id="pmin" inputmode="numeric" value="${entry.repMin}" aria-label="Lowest reps"><span>to</span><input class="input input--num" id="pmax" inputmode="numeric" value="${entry.repMax}" aria-label="Highest reps"></span></label></div>
      <button class="btn btn--quiet btn--sm btn--block" type="button" data-act="rx">Save sets and reps</button></div>
      <div class="opt"><label class="field"><span class="field__l">Setup note (machine, seat, grip)</span><input class="input" id="psetup" maxlength="120" value="${entry.setup}" placeholder="e.g. seat 4, far cable station"></label>
      <button class="btn btn--quiet btn--sm btn--block" type="button" data-act="setup">Save note</button></div>
      <div class="opt"><div class="row"><button class="btn btn--quiet btn--sm grow" type="button" data-act="up" ${index === 0 ? 'disabled' : ''}>${icon('arrow-up')} Earlier</button><button class="btn btn--quiet btn--sm grow" type="button" data-act="down" ${index === state.draft.exercises.length - 1 ? 'disabled' : ''}>${icon('arrow-down')} Later</button></div>
      <details class="fold"><summary>${recorded ? 'Add another movement' : 'Swap for another movement'}</summary><div class="fold__b">
        <div class="list">${same.map(other => html`<button class="list__i list__i--tap" type="button" data-act="${recorded ? 'addit' : 'swap'}" data-x="${other.id}">${demo(other.id, undefined, { cls: 'demo--thumb', still: true })}<span class="list__m"><span class="title">${other.name}</span><span class="tiny muted" style="display:block">${other.muscle}</span></span><span class="list__e">${recorded ? 'Add' : 'Swap'}</span></button>`)}</div></div></details>
      <button class="btn btn--quiet btn--sm btn--block" type="button" data-act="remove" ${recorded ? 'disabled' : ''}>${icon('trash')} Remove from this workout</button></div>`,
    actions: {
      variant: (data, _e, _ev, self) => { const { state: now } = read(); const next = structuredClone(now); next.draft.exercises[index].variantId = data.v; if (write(next)) { toast('Variation changed.', { action: 'Undo', onAction: undo }); self.close(); } },
      rx: (_d, _e, _ev, self) => apply({ type: 'prescription', index, count: Number(self.el.querySelector('#psets').value), repMin: Number(self.el.querySelector('#pmin').value), repMax: Number(self.el.querySelector('#pmax').value) }, self, 'Sets and reps updated.'),
      setup: (_d, _e, _ev, self) => { const { state: now } = read(); const next = structuredClone(now); next.draft.exercises[index].setup = self.el.querySelector('#psetup').value.trim(); if (write(next)) { toast('Note saved.'); self.close(); } },
      up: (_d, _e, _ev, self) => { openIndex = index - 1; apply({ type: 'move', index, to: index - 1 }, self, 'Moved earlier.'); },
      down: (_d, _e, _ev, self) => { openIndex = index + 1; apply({ type: 'move', index, to: index + 1 }, self, 'Moved later.'); },
      swap: (data, _e, _ev, self) => apply({ type: 'swap', index, exerciseId: data.x }, self, `Swapped to ${EXERCISES[data.x].name}.`),
      addit: (data, _e, _ev, self) => apply({ type: 'add', exerciseId: data.x }, self, `${EXERCISES[data.x].name} added.`),
      remove: (_d, _e, _ev, self) => { openIndex = null; apply({ type: 'remove', index }, self, 'Removed.'); },
    },
  });
}

function settingsSheet() {
  sheet({
    title: 'Training settings', eyebrow: 'Train',
    body: () => { const now = store.training.read().value; const train = prefs(); const ui = store.get('ui');
      const seg = (act, choices, current, label) => html`<div class="segc" role="group" aria-label="${label}">${choices.map(([value, text]) => html`<button type="button" aria-pressed="${String(current) === String(value) ? 'true' : 'false'}" data-act="${act}" data-v="${value}">${text}</button>`)}</div>`;
      return html`
      <div class="opt"><p class="opt__l"><span>Load unit</span>${why('units')}</p>${seg('unit', [['lb', 'lb'], ['kg', 'kg']], now.unit, 'Load unit')}</div>
      <div class="opt"><p class="opt__l"><span>Rest timer</span>${why('rest')}</p>${seg('rest', REST_CHOICES.map(choice => [choice, restLabel(choice)]), train.rest ?? 'auto', 'Rest timer')}</div>
      <div class="opt"><p class="opt__l"><span>One tap of + or − changes the load by</span></p>${seg('step', STEP_CHOICES.map(choice => [choice, choice === 'auto' ? `Auto (${loadStep({}, now.unit)})` : String(choice)]), train.step ?? 'auto', 'Load step')}</div>
      <div class="opt"><p class="opt__l"><span>Lift demos</span>${why('demos')}</p>${seg('demo', [['loop', 'Loop'], ['still', 'Still']], ui.demo === 'still' ? 'still' : 'loop', 'Lift demos')}
        ${seg('photos', [['colour', 'Colour'], ['mono', 'Black and white']], ui.photos === 'mono' ? 'mono' : 'colour', 'Lift photographs')}</div>
      <div class="opt"><dl class="kv"><dt>Plan</dt><dd>${now.program ? activePlan(train).name : 'Earlier four-session plan'}</dd><dt>Journal starts</dt><dd>${fmtDay(now.startDate, { day: 'numeric', month: 'short', year: 'numeric' })}</dd><dt>Sessions saved</dt><dd>${now.sessions.length}</dd></dl>
        <button class="btn btn--quiet btn--sm btn--block" type="button" data-act="plans">${icon('calendar-days')} Change plan</button></div>`; },
    actions: {
      unit: (data, _e, _ev, self) => { const now = store.training.read().value; if (now.draft) return toast('Finish the workout in progress before changing units.'); if (write({ ...now, unit: data.v }, { undo: false })) self.update(); },
      rest: (data, _e, _ev, self) => { store.update('train', train => { train.rest = ['auto', 'off'].includes(data.v) ? data.v : Number(data.v); }); self.update(); },
      step: (data, _e, _ev, self) => { store.update('train', train => { train.step = data.v === 'auto' ? 'auto' : Number(data.v); }); self.update(); },
      demo: (data, _e, _ev, self) => { store.update('ui', ui => { ui.demo = data.v; }); self.update(); },
      photos: (data, _e, _ev, self) => { store.update('ui', ui => { ui.photos = data.v; }); self.update(); },
      plans: (_d, _e, _ev, self) => { self.close(); plansSheet(); },
    },
  });
}

// ---------- entry ----------
export function render(ctx) {
  const info = trainingInfo();
  if (info.error) return { room: 'street', where: 'Train', body: html`<div class="wrap"><div class="frame"><div class="frame__head"><span>Training journal</span><span>Not overwritten</span></div><div class="frame__body">
      <h1 class="display display--m">Your training journal could not be read.</h1><p class="muted">${info.error}</p><p>Forme has not changed it. Restore a backup, or export what is here first.</p><a class="btn" href="#/you/data">Backup and data</a></div></div></div>`, actions: {} };
  const sub = ctx.path[1];
  const state = info.state;
  let body; let where = 'Train';
  if (sub === 'go') { body = logger(ctx, info); where = 'Workout'; }
  else if (sub === 's') { body = sessionPage(ctx, info, ctx.path[2]); where = 'Session'; }
  else if (sub === 'history') { body = historyPage(info); where = 'History'; }
  else if (sub === 'records') { body = recordsPage(info); where = 'Records'; }
  else if (sub === 'hams') { body = hamsPage(info); where = 'Leg focus'; }
  else if (sub === 'library') { body = libraryPage(); where = 'Library'; }
  else if (sub === 'x') { body = guidePage(info, ctx.path[2]); where = 'Guide'; }
  else body = home(ctx, info);

  const mutateSet = (data, change) => {
    const now = store.training.read().value; const next = structuredClone(now);
    const set = next.draft?.exercises[Number(data.i)]?.sets[Number(data.s)];
    if (!set) return false;
    change(set, next.draft.exercises[Number(data.i)], next);
    return write(next);
  };
  const ghostFor = (now, data) => {
    const entry = now.draft.exercises[Number(data.i)]; const last = lastFor(now, now.draft, entry); const s = Number(data.s);
    return last?.sets[s] ?? last?.sets.at(-1) ?? entry.sets.slice(0, s).reverse().find(item => item.completed) ?? null;
  };

  return {
    room: 'street', where, body,
    after: () => { if (sub === 'go' && rest) startRest(Math.max(1, (rest.until - Date.now()) / 1000), rest.label); },
    inputs: { libq: (_d, el) => { libraryQuery = el.value; ctx.refresh(); } },
    changes: {
      setv: (data, el) => {
        const value = el.value.trim() === '' ? '' : Number(el.value);
        if (value !== '' && !Number.isFinite(value)) { toast('Numbers only.'); return ctx.refresh(); }
        mutateSet(data, set => { set[data.f] = data.f === 'reps' && value !== '' ? Math.round(value) : value; if (value === '' && set.completed) { set.completed = false; set.clean = false; } });
      },
    },
    actions: {
      start: data => begin(data.session),
      pick: () => { if (state.draft) return toast('Finish or discard the workout in progress first.'); pickSession(state); },
      options: () => optionsSheet(info),
      preview: data => previewSheet(data.session),
      daypeek: (data, _el, event) => { if (!data.session) return; event.preventDefault(); previewSheet(data.session, { startable: false }); },
      repeat: data => repeat(data.id),
      plans: () => plansSheet(),
      editweek: () => weekSheet(),
      sessions: () => sessionsSheet(),
      settings: () => settingsSheet(),
      open: data => { openIndex = Number(data.i); ctx.refresh(); },
      undo: () => undo(),
      bump: data => {
        const now = store.training.read().value; const ghost = ghostFor(now, data);
        mutateSet(data, (set, _entry, next) => {
          const base = set[data.f] === '' ? (ghost ? ghost[data.f] : (data.f === 'reps' ? next.draft.exercises[Number(data.i)].repMin : 0)) : set[data.f];
          const delta = Number(data.d) * (data.f === 'load' ? loadStep(prefs(), next.draft.unit) : 1);
          set[data.f] = Math.max(data.f === 'reps' ? 1 : 0, set[data.f] === '' && Number(data.d) > 0 && data.f === 'reps' ? base : base + delta);
        });
        haptic('tap');
      },
      tick: data => {
        const now = store.training.read().value; const ghost = ghostFor(now, data);
        const entry = now.draft.exercises[Number(data.i)]; const current = entry.sets[Number(data.s)];
        if (current.completed) { mutateSet(data, set => { set.completed = false; set.clean = false; }); return; }
        const load = current.load === '' ? ghost?.load : current.load; const reps = current.reps === '' ? ghost?.reps : current.reps;
        if (load === undefined || load === '' || reps === undefined || reps === '') { toast('Enter load and reps for this set first.'); haptic('warn'); document.getElementById(`l-${data.i}-${data.s}`)?.focus(); return; }
        const ok = mutateSet(data, set => { set.load = load; set.reps = reps; if (set.rir === '') set.rir = targetRir(now, now.draft); set.completed = true; set.clean = true; });
        if (!ok) return;
        haptic('set'); blip('set'); touch();
        startRest(restSeconds(prefs(), entry.exerciseId), EXERCISES[entry.exerciseId].name);
        toast(`Set ${Number(data.s) + 1}: ${setText({ load, reps }, now.draft.unit)}`, { action: 'Undo', onAction: undo });
        requestAnimationFrame(() => document.querySelector(`[data-row="${data.i}-${data.s}"]`)?.classList.add('flash'));
        const after = store.training.read().value.draft.exercises[Number(data.i)];
        if (after.sets.every(set => set.completed)) { const nextOpen = store.training.read().value.draft.exercises.findIndex(item => item.sets.some(set => !set.completed)); if (nextOpen >= 0) openIndex = nextOpen; }
      },
      rough: data => mutateSet(data, set => { set.clean = !set.clean; }),
      copylast: data => { const now = store.training.read().value; const next = structuredClone(now); const entry = next.draft.exercises[Number(data.i)]; const last = lastFor(now, now.draft, entry); if (!last) return; const filled = copyLastSets(entry, last); next.draft.exercises[Number(data.i)].sets = entry.sets.map((set, s) => (set.completed || set.load !== '' ? set : filled.sets[s])); if (write(next)) toast('Filled from last time. Tick each set as you do it.', { action: 'Undo', onAction: undo }); },
      fillall: () => { const now = store.training.read().value; const next = structuredClone(now); next.draft.exercises = next.draft.exercises.map(entry => { const last = lastFor(now, now.draft, entry); if (!last) return entry; const filled = copyLastSets(entry, last); return { ...entry, sets: entry.sets.map((set, s) => (set.completed || set.load !== '' ? set : filled.sets[s])) }; }); if (write(next)) toast('Blank sets filled from your last numbers.', { action: 'Undo', onAction: undo }); },
      hamplus: () => { const now = store.training.read().value; const index = now.draft.exercises.findIndex(entry => ['legcurl', 'lying-legcurl'].includes(entry.exerciseId)); try {
        const action = index >= 0 ? { type: 'prescription', index, count: now.draft.exercises[index].prescribedSets + 1, repMin: now.draft.exercises[index].repMin, repMax: now.draft.exercises[index].repMax } : { type: 'add', exerciseId: 'legcurl' };
        if (write(editDraft(now, action))) toast(index >= 0 ? 'One more set of leg curls added.' : 'Leg curls added.', { action: 'Undo', onAction: undo }); } catch (error) { toast(clean(error.message)); } },
      guide: data => { const now = store.training.read().value; const entry = now.draft.exercises[Number(data.i)]; sheet({ title: EXERCISES[entry.exerciseId].name, eyebrow: 'How to', body: guideBody(entry.exerciseId, entry.variantId, now) }); },
      more: data => moreSheet(Number(data.i)),
      add: () => { const now = store.training.read().value; const options = Object.values(EXERCISES).filter(exercise => !now.draft.exercises.some(entry => entry.exerciseId === exercise.id));
        sheet({ title: 'Add a movement', eyebrow: 'This workout', body: html`<div class="list list--card">${options.map(exercise => html`<button class="list__i list__i--tap" type="button" data-act="pick" data-x="${exercise.id}">${demo(exercise.id, undefined, { cls: 'demo--thumb', still: true })}<span class="list__m"><span class="title">${exercise.name}</span><span class="tiny muted" style="display:block">${exercise.muscle}</span></span><span class="list__e">Add</span></button>`)}</div>`,
          actions: { pick: (d, _e, _ev, self) => { try { const latest = store.training.read().value; if (write(editDraft(latest, { type: 'add', exerciseId: d.x }))) { openIndex = latest.draft.exercises.length; self.close(); toast(`${EXERCISES[d.x].name} added.`, { action: 'Undo', onAction: undo }); } } catch (error) { toast(clean(error.message)); } } } }); },
      discard: async () => { if (!await ask({ title: 'Discard this workout?', text: 'The sets you entered in this draft will be removed. Saved sessions are not affected.', yes: 'Discard', no: 'Keep going', danger: true })) return; const now = store.training.read().value; if (write({ ...now, draft: null }, { undo: true })) { rest = null; toast('Draft discarded.', { action: 'Undo', onAction: undo }); location.hash = '#/train'; } },
      finish: async () => {
        const now = store.training.read().value; const progress = draftProgress(now.draft);
        if (!progress.done) return toast('Tick at least one set before finishing.');
        if (progress.done < progress.total && !await ask({ title: 'Finish with sets left?', text: `${progress.done} of ${progress.total} sets are ticked. The rest are dropped and the session is saved as partial.`, yes: 'Save as partial', no: 'Keep going' })) return;
        const id = uid(); const wasPast = now.draft.date !== today();
        try { if (!write(finishDraft(now, id), { undo: false })) return; } catch (error) { return toast(clean(error.message)); }
        undoStack.length = 0; rest = null; openIndex = null; haptic('done'); blip('done'); touch();
        const after = store.training.read().value;
        if (recordsIn(after.sessions, id).length) award('pr');
        if (wasPast) award('quick-log');
        location.hash = `#/train/s/${id}?new=1`;
      },
      restplus: () => { if (rest) { rest.until += 30000; rest.total += 30; } },
      restskip: () => { rest = null; const bar = document.getElementById('restBar'); if (bar) bar.hidden = true; },
      replay: data => replay(store.training.read().value, data.id, data.ex),
      libg: data => { libraryGroup = libraryGroup === data.g ? '' : data.g; ctx.refresh(); },
      libclear: () => { libraryQuery = ''; libraryGroup = ''; ctx.refresh(); },
    },
  };
}
