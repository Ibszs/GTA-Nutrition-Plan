// Train: start or resume, log sets fast, review history. Built on the original training journal
// (same key, same validators), so every earlier workout, draft and backup stays valid.

import * as store from '../store.js';
import { html, raw, icon, sheet, ask, toast, haptic, blip, today, fmtDay, relDay, addDays, clock, uid, sec, meter, plural, fmt, motionOK, DOW, dow } from '../ui.js';
import { trainingInfo, award, touch } from '../actions.js';
import { EXERCISES, SESSIONS, isRealDate } from '../../assets/training-data.js';
import { NEW_SESSIONS, PROGRAM_DAYS, getSessionTemplate, getSessionPrescription, getProgramDay, mondayAnchor } from '../../assets/training-program.js';
import { createDraft, editDraft, finishDraft, repeatSession, findLastEntry, copyLastSets, progressionSuggestion, setProgramDay, createTrainingState } from '../../assets/training-state.js';
import { getExerciseGuide } from '../../assets/exercise-visuals.js';
import { findRecords, recordsIn, weeklySets, liftHistory, lastComparable, sessionStats, draftProgress, LEG_GROUPS, groupsOf, bestSet } from '../logic/lifts.js';

const undoStack = [];
let openIndex = null;
let rest = null; // { until, total, label }
let restTimer = null;
let libraryQuery = '';
let libraryGroup = '';

const variantName = entry => EXERCISES[entry.exerciseId].variants.find(variant => variant.id === entry.variantId)?.name ?? EXERCISES[entry.exerciseId].name;
const step = unit => (unit === 'kg' ? 2.5 : 5);
const setText = (set, unit) => `${fmt(set.load, 1)} ${unit} × ${set.reps}`;

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

// ---------- home ----------
function home(ctx, info) {
  const { state, planned, template, draft, draftTemplate } = info;
  const records = findRecords(state.sessions);
  const week = Array.from({ length: 7 }, (_, index) => addDays(addDays(today(), -dow(today())), index));
  const last = template ? lastComparable(state.sessions, template.id) : null;
  const hams = weeklySets(state.sessions, today(), 6);
  const maxHam = Math.max(4, ...hams.map(row => row.sets.Hamstrings ?? 0));
  const recent = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const heroTitle = draft ? draftTemplate.name : planned?.kind === 'session' ? template.name : planned?.kind === 'rest' ? 'Rest day' : 'Not started';
  const done = planned?.completed; const partial = planned?.partial;
  const heroMeta = draft ? `In progress · ${draftProgress(draft).done} of ${draftProgress(draft).total} sets · ${relDay(draft.date)}`
    : planned?.kind === 'session' ? `${template.focus}${template.duration ? `, ${template.duration.replace(/–/g, ' to ')}` : ''}`
    : planned?.kind === 'rest' ? 'Nothing is planned in the gym today.' : `Your journal starts ${fmtDay(state.startDate)}.`;
  return html`<div class="wrap cut">
    <section class="slab slab--bleed slab--lead" aria-label="Today in the gym">
      <p class="slab__k"><span>${draft ? html`<span class="tag tag--mark">Recording</span>` : done ? 'Done today' : partial ? 'Partly done today' : planned?.kind === 'session' ? 'Planned for today' : 'Today'}</span><span>Day ${planned?.cycleDay ?? 1} of 7</span></p>
      <h1 class="display ${String(heroTitle).length <= 6 ? 'display--xl' : ''} head-in">${heroTitle}</h1>
      <p class="slab__sub">${heroMeta}</p>
      <figure class="slab__ph"><img src="assets/photos/gym-rack.jpg" alt="" width="1280" height="1035" fetchpriority="high"></figure>
      ${!state.program && !draft ? html`<p class="hero-note">Your earlier four-session plan is still in use. <button class="linkish" type="button" data-act="adopt">Switch to the five-day rotation</button></p>` : ''}
      <div class="slab__go stack">
        ${draft ? html`<a class="btn btn--go btn--mark" href="#/train/go"><span>Resume workout</span>${icon('arrow-right')}</a>`
    : planned?.kind === 'session' && !done ? html`<button class="btn btn--go" type="button" data-act="start" data-session="${template.id}"><span>Start ${template.name}</span>${icon('arrow-right')}</button>`
    : html`<button class="btn btn--go btn--ghost" type="button" data-act="pick"><span>Train anyway</span>${icon('plus')}</button>`}
        <button class="btn btn--ghost btn--sm btn--block" type="button" data-act="quicklog" aria-label="Quick log a workout you forgot to track">${icon('clock-3')} Forgot to log</button>
        ${last && !draft && planned?.kind === 'session' && !done ? html`<button class="linkish tiny" type="button" data-act="repeat" data-id="${last.id}">Or repeat the lineup from ${fmtDay(last.date, { month: 'short', day: 'numeric' })} (${plural(sessionStats(last).sets, 'set')})</button>` : ''}
      </div>
    </section>

    <section aria-label="This week">
      ${sec('This week', html`<button type="button" data-act="shift">Shift rotation</button>`)}
      <div class="strip" style="margin-top:10px">${week.map(day => {
    let cell; try { cell = getProgramDay(state, day); } catch { cell = { kind: 'rest' }; }
    const name = cell.sessionId ? getSessionTemplate(cell.sessionId).name : cell.kind === 'rest' ? 'Rest' : '';
    const logged = state.sessions.filter(session => session.date === day);
    return html`<a class="fr ${day === today() ? 'fr--today' : ''} ${logged.length ? 'fr--lit' : ''} ${cell.kind !== 'session' ? 'fr--off' : ''}" href="${logged.length ? `#/train/s/${logged[0].id}` : '#/train'}" aria-label="${fmtDay(day)}: ${name || 'no session'}${logged.length ? ', logged' : ''}">
          <span class="fr__d">${DOW[dow(day)]}</span><span class="fr__n fr__n--word">${name.replace(' + ', ' ').replace('Shoulders', 'Delts')}</span><span class="fr__s">${logged.length ? raw('<i class="t"></i>') : ''}</span>
          ${logged.some(session => !session.partial) ? raw('<svg class="gp" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M8 30 C6 12 30 3 54 5 C82 7 97 19 95 33 C93 49 69 58 44 56 C20 54 5 46 9 27"/></svg>') : ''}</a>`;
  })}</div>
    </section>

    <div class="cols">
      <a class="frame frame--press" href="#/train/hams">
        <div class="frame__head"><span>Legs and hamstrings</span><span>Last 6 weeks</span></div>
        <div class="frame__body">
          ${hams.some(row => row.sets.Hamstrings) ? html`<div class="row" style="align-items:flex-end;gap:6px;height:64px" role="img" aria-label="Hamstring sets per week: ${hams.map(row => row.sets.Hamstrings ?? 0).join(', ')}">${hams.map((row, index) => html`<span style="flex:1;background:${index === hams.length - 1 ? 'var(--accent)' : 'var(--line-2)'};height:${Math.max(4, ((row.sets.Hamstrings ?? 0) / maxHam) * 100)}%;border-radius:1px"></span>`)}</div>` : ''}
          <p class="title">${hams.at(-1).sets.Hamstrings ?? 0} hamstring sets this week</p>
          <p class="tiny muted">Sets per week for each leg muscle, and your RDL and leg-curl top sets.</p>
        </div>
      </a>
      <a class="frame frame--press" href="#/train/records">
        <div class="frame__head"><span>Records</span><span>${plural(records.length, 'record')}</span></div>
        <div class="frame__body">${records.length ? (() => { const record = records.at(-1); return html`
          <p class="eyebrow">${fmtDay(record.date)}</p><p class="title">${EXERCISES[record.exerciseId].name}</p>
          <p class="data">${record.load > 0 ? `${fmt(record.load, 1)} ${record.unit} × ${record.reps}` : `${record.reps} reps`} <span class="tag tag--amber" style="margin-left:6px">▶ Replay</span></p>`; })()
    : html`<p class="title">No records yet</p><p class="tiny muted">Forme starts comparing from the second time you log a movement. Records are listed here, each with a replay.</p>`}</div>
      </a>
    </div>

    <section aria-label="Recent sessions">
      ${sec('Recent', html`<a href="#/train/history">All history</a>`)}
      ${recent.length ? html`<div class="list">${recent.map(session => html`<a class="list__i list__i--tap" href="#/train/s/${session.id}">
        <span class="list__m"><span class="title">${getSessionTemplate(session.sessionId).name}${session.customized ? ' (adapted)' : ''}</span><span class="tiny muted" style="display:block">${fmtDay(session.date)} · ${plural(sessionStats(session).sets, 'set')}${session.partial ? ' · partial' : ''}</span></span>
        <span class="list__e">${recordsIn(state.sessions, session.id).length ? html`<span class="tag tag--amber">PR</span>` : ''}${icon('chevron-right')}</span></a>`)}</div>`
    : html`<div class="empty"><p class="empty__t">No sessions yet</p><p class="muted small">Start today's session above. If you trained and forgot to track it, use Forgot to log.</p></div>`}
    </section>

    <div class="row row--wrap">
      <a class="btn btn--quiet btn--sm grow" href="#/train/library">${icon('book-open')} Lift library</a>
      <button class="btn btn--quiet btn--sm grow" type="button" data-act="settings">${icon('sliders-horizontal')} Settings</button>
    </div>
  </div>`;
}

// ---------- logger ----------
function logger(ctx, info) {
  const { state, draft } = info;
  if (!draft) return html`<div class="wrap"><div class="empty"><p class="empty__t">No workout in progress</p><p class="muted">Start one from Train.</p><a class="btn" href="#/train">Go to Train</a></div></div>`;
  const template = getSessionTemplate(draft.sessionId);
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
      <div class="grow"><p class="eyebrow">${past ? `Logging for ${fmtDay(draft.date)}` : 'Recording'} · RIR ${rir}${draft.lightWeek ? ' · lighter' : ''}</p><h1 class="display display--m">${template.name}${draft.customized ? html` <span class="tag tag--line">Adapted</span>` : ''}</h1></div>
      <button class="icon-btn icon-btn--line" type="button" data-act="undo" aria-label="Undo the last change" ${undoStack.length ? '' : 'disabled style="opacity:.4"'}>${icon('rotate-ccw')}</button>
    </header>
    <div class="lg__prog" role="img" aria-label="${progress.done} of ${progress.total} sets done"><span class="data num">${progress.done}/${progress.total} sets</span>${meter(progress.total ? progress.done / progress.total : 0, 'meter--amber')}</div>
    <div class="restbar" id="restBar" ${rest ? '' : 'hidden'} role="timer" aria-label="Rest timer">
      <span class="restbar__fill" data-rest-fill></span>
      <span class="eyebrow">Rest</span><span class="clock restbar__t" data-rest-time>${rest ? clock((rest.until - Date.now()) / 1000) : '0:00'}</span>
      <button type="button" data-act="restplus">+30 s</button><button type="button" data-act="restskip">Skip</button>
    </div>
    ${past ? html`<div class="note"><p>Fill in what you remember. <button class="linkish" style="min-height:0" type="button" data-act="fillall">Fill every blank set from last time</button>, then tick the ones you did.</p></div>` : ''}
    ${legSession && hamSets > 0 && hamSets < 6 && !draft.exercises.every(entry => entry.sets.every(set => set.completed)) ? html`<div class="note note--warn"><p><strong>Hamstring focus.</strong> This session has ${hamSets} hamstring sets. <button class="linkish" style="min-height:0" type="button" data-act="hamplus">Add one set of leg curls</button></p></div>` : ''}

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
      <span class="lgx__n">${index + 1}</span><span class="grow"><span class="title">${variantName(entry)}</span><span class="tiny muted" style="display:block">${entry.sets.length} × ${entry.repMin}-${entry.repMax} · ${done ? `${done} done` : lastLine}</span></span>
      ${allDone ? html`<span class="tag tag--amber">Done</span>` : icon('chevron-down')}</button>`;
  return html`<section class="lgx" aria-label="${variantName(entry)}">
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
  if (!session) return html`<div class="wrap"><div class="empty"><p class="empty__t">That session is not in the journal</p><a class="btn" href="#/train/history">History</a></div></div>`;
  const stats = sessionStats(session); const records = recordsIn(info.state.sessions, id);
  return html`<div class="wrap cut">
    <a class="linkish linkish--quiet" href="#/train/history">${icon('arrow-left', 'ic--sm')} History</a>
    <header><p class="eyebrow">${fmtDay(session.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p><h1 class="display display--l">${getSessionTemplate(session.sessionId).name}</h1>
      <div class="row row--wrap" style="margin-top:8px">${session.partial ? html`<span class="tag tag--line">Partial</span>` : html`<span class="tag">Complete</span>`}${session.customized ? html`<span class="tag tag--line">Adapted</span>` : ''}${session.lightWeek ? html`<span class="tag tag--line">Lighter</span>` : ''}</div></header>
    ${ctx.query.has('new') ? html`<div class="note note--good stamp-in"><p><strong>Saved.</strong> ${plural(stats.sets, 'set')} in the journal.${records.length ? ` ${plural(records.length, 'record')} today.` : ''}</p></div>` : ''}
    <div class="statrow statrow--3"><div class="stat"><div class="stat__v num">${stats.sets}</div><div class="stat__l">Sets</div></div><div class="stat"><div class="stat__v num">${stats.exercises}</div><div class="stat__l">Movements</div></div><div class="stat"><div class="stat__v num">${fmt(stats.volume)}<small>${session.unit}</small></div><div class="stat__l">Load × reps</div></div></div>
    ${records.map(record => html`<button class="frame frame--press" type="button" data-act="replay" data-id="${id}" data-ex="${record.exerciseId}">
      <div class="frame__head"><span>Record</span><span>▶ Replay</span></div><div class="frame__body"><p class="title">${EXERCISES[record.exerciseId].name}</p>
      <p class="data">${record.load > 0 ? `${fmt(record.load, 1)} ${record.unit} × ${record.reps}` : `${record.reps} reps`} <span class="muted">· was ${record.previous.load > 0 ? `${fmt(record.previous.load, 1)} × ${record.previous.reps}` : `${record.previous.reps} reps`}</span></p></div></button>`)}
    <div class="list">${session.exercises.map(entry => html`<div class="list__i"><span class="list__m"><span class="title">${variantName(entry)}</span>
      <span class="data num" style="display:block">${entry.sets.map(set => `${fmt(set.load, 1)}×${set.reps}`).join('   ')}</span>${entry.setup ? html`<span class="tiny muted">${entry.setup}</span>` : ''}</span></div>`)}</div>
    <button class="btn btn--quiet btn--block" type="button" data-act="repeat" data-id="${id}">${icon('rotate-ccw')} Repeat this lineup</button>
  </div>`;
}

function historyPage(info) {
  const sessions = [...info.state.sessions].sort((a, b) => b.date.localeCompare(a.date));
  return html`<div class="wrap cut"><a class="linkish linkish--quiet" href="#/train">${icon('arrow-left', 'ic--sm')} Train</a>
    <h1 class="display display--l">History</h1>
    ${sessions.length ? html`<div class="list">${sessions.map(session => html`<a class="list__i list__i--tap" href="#/train/s/${session.id}"><span class="list__m"><span class="title">${getSessionTemplate(session.sessionId).name}</span>
      <span class="tiny muted" style="display:block">${fmtDay(session.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${plural(sessionStats(session).sets, 'set')}${session.partial ? ' · partial' : ''}</span></span><span class="list__e">${icon('chevron-right')}</span></a>`)}</div>`
    : html`<div class="empty"><p class="empty__t">Nothing logged yet</p><p class="muted small">Finished workouts are listed here, newest first.</p><a class="btn" href="#/train">Start one</a></div>`}</div>`;
}

function recordsPage(info) {
  const records = [...findRecords(info.state.sessions)].reverse();
  return html`<div class="wrap cut"><a class="linkish linkish--quiet" href="#/train">${icon('arrow-left', 'ic--sm')} Train</a>
    <h1 class="display display--l">Records</h1><p class="muted">A record is a set that beats your best estimated max for that exact movement and setup. The first log of a movement is a baseline, not a record.</p>
    ${records.length ? html`<div class="list">${records.map(record => html`<button class="list__i list__i--tap" type="button" data-act="replay" data-id="${record.sessionId}" data-ex="${record.exerciseId}"><span class="list__m"><span class="title">${EXERCISES[record.exerciseId].name}</span>
      <span class="data num" style="display:block">${record.load > 0 ? `${fmt(record.load, 1)} ${record.unit} × ${record.reps}` : `${record.reps} reps`}</span><span class="tiny muted">${fmtDay(record.date)}</span></span><span class="list__e"><span class="tag tag--amber">▶ Replay</span></span></button>`)}</div>`
    : html`<div class="empty"><p class="empty__t">No records yet</p><p class="muted small">Log a movement twice and Forme starts comparing.</p></div>`}</div>`;
}

function hamsPage(info) {
  const weeks = weeklySets(info.state.sessions, today(), 6);
  const max = Math.max(6, ...weeks.flatMap(row => LEG_GROUPS.map(group => row.sets[group] ?? 0)));
  const lifts = ['rdl', 'legcurl', 'lying-legcurl', 'hip-thrust', 'squat', 'legpress'].map(id => ({ id, rows: liftHistory(info.state.sessions, id, 6) })).filter(item => item.rows.length);
  const now = weeks.at(-1).sets;
  return html`<div class="wrap cut"><a class="linkish linkish--quiet" href="#/train">${icon('arrow-left', 'ic--sm')} Train</a>
    <header><p class="eyebrow">Focus view</p><h1 class="display display--l">Legs and hamstrings</h1><p class="muted">Completed leg sets per week, counted from your journal.</p></header>
    ${LEG_GROUPS.map(group => html`<section class="frame"><div class="frame__head"><span>${group}</span><span>${now[group] ?? 0} sets this week</span></div><div class="frame__body">
      <div class="row" style="align-items:flex-end;gap:6px;height:72px" role="img" aria-label="${group} sets per week, oldest first: ${weeks.map(row => row.sets[group] ?? 0).join(', ')}">${weeks.map((row, index) => html`<span style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%;gap:3px;align-items:center"><span class="data" style="font-size:.56rem">${row.sets[group] ?? 0}</span><span style="width:100%;background:${index === weeks.length - 1 ? 'var(--accent)' : 'var(--line-2)'};height:${Math.max(3, ((row.sets[group] ?? 0) / max) * 74)}%;border-radius:1px"></span></span>`)}</div>
    </div></section>`)}
    <div class="note"><p><strong>Reading it.</strong> Your five-day plan gives hamstrings about 8 sets a week across Lower and Legs (Romanian deadlift and leg curl). If the hamstring bar sits well under the quads bar most weeks, the simplest fix is one extra set of leg curls on each leg day. Forme offers that inside the workout.</p></div>
    ${lifts.length ? html`${sec('Top sets')}<div class="list">${lifts.map(lift => html`<a class="list__i list__i--tap" href="#/train/x/${lift.id}"><span class="list__m"><span class="title">${EXERCISES[lift.id].name}</span><span class="data num" style="display:block">${lift.rows.map(row => (row.loaded ? `${fmt(row.load, 1)}×${row.reps}` : `${row.reps}r`)).join('  →  ')}</span></span><span class="list__e">${icon('chevron-right')}</span></a>`)}</div>`
    : html`<div class="empty"><p class="empty__t">No leg sets logged yet</p><p class="muted small">After your first Lower or Legs session, the top sets for RDL, leg curl, squat and leg press show up here.</p></div>`}
  </div>`;
}

function libraryPage() {
  const groups = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs'];
  const query = libraryQuery.trim().toLowerCase();
  const list = Object.values(EXERCISES).filter(exercise => (!query || `${exercise.name} ${exercise.muscle} ${exercise.variants.map(variant => variant.name).join(' ')}`.toLowerCase().includes(query)) && (!libraryGroup || groupsOf(exercise.id).includes(libraryGroup)));
  return html`<div class="wrap"><a class="linkish linkish--quiet" href="#/train">${icon('arrow-left', 'ic--sm')} Train</a>
    <h1 class="display display--l">Movement library</h1>
    <label class="field"><span class="field__l">Search ${Object.keys(EXERCISES).length} movements</span><input class="input" id="libq" type="search" value="${libraryQuery}" placeholder="Name, muscle or equipment" data-input="libq" autocomplete="off"></label>
    <div class="chips" role="group" aria-label="Muscle group">${groups.map(group => html`<button class="chip" type="button" aria-pressed="${libraryGroup === group ? 'true' : 'false'}" data-act="libg" data-g="${group}">${group}</button>`)}</div>
    ${list.length ? html`<div class="list">${list.map(exercise => { const guide = getExerciseGuide(exercise.id); return html`<a class="list__i list__i--tap" href="#/train/x/${exercise.id}">
      ${guide?.visual ? html`<img src="assets/images/exercises/${guide.visual.imageId}-0.jpg" alt="" width="56" height="42" loading="lazy" style="width:56px;height:42px;object-fit:cover;border-radius:2px;filter:grayscale(.3) contrast(1.05)">` : html`<span style="width:56px;height:42px;display:grid;place-items:center;border:1px dashed var(--line-2);border-radius:2px" class="eyebrow">Text</span>`}
      <span class="list__m"><span class="title">${exercise.name}</span><span class="tiny muted" style="display:block">${exercise.muscle} · ${exercise.repMin}-${exercise.repMax} reps</span></span><span class="list__e">${icon('chevron-right')}</span></a>`; })}</div>`
    : html`<div class="empty"><p class="empty__t">Nothing matches</p><p class="muted small">Try a muscle (hamstrings), a tool (cable) or clear the filter.</p><button class="btn btn--quiet btn--sm" type="button" data-act="libclear">Clear search</button></div>`}
  </div>`;
}

function guideBody(exerciseId, variantId, state) {
  const exercise = EXERCISES[exerciseId];
  const guide = getExerciseGuide(exerciseId, variantId);
  const rows = state ? liftHistory(state.sessions, exerciseId, 6) : [];
  return html`
    ${guide.visual ? html`<div class="pair2"><figure><img src="assets/images/exercises/${guide.visual.imageId}-0.jpg" alt="${guide.name}: start position" loading="lazy"><figcaption class="eyebrow">Start</figcaption></figure><figure><img src="assets/images/exercises/${guide.visual.imageId}-1.jpg" alt="${guide.name}: end position" loading="lazy"><figcaption class="eyebrow">Finish</figcaption></figure></div>
      <p class="tiny muted">Photos show this exact variation. They show two positions, not your range of motion.</p>`
    : html`<div class="note"><p>No audited photo for this variation, so Forme shows text only instead of a different setup.</p></div>`}
    <p class="lead">${guide.cues}</p>
    <dl class="kv"><dt>Works</dt><dd>${guide.muscle}</dd><dt>Reps</dt><dd>${guide.repMin}-${guide.repMax}</dd><dt>Rest</dt><dd>${clock(guide.rest)}</dd><dt>Log as</dt><dd>${guide.loadLabel ?? 'Total load'}</dd></dl>
    <p class="tiny muted">${guide.loadNote}</p>
    ${rows.length ? html`<div><p class="eyebrow">Your top sets</p><p class="data num">${rows.map(row => `${row.loaded ? `${fmt(row.load, 1)}×${row.reps}` : `${row.reps}r`} (${fmtDay(row.date, { month: 'short', day: 'numeric' })})`).join('  ·  ')}</p></div>` : ''}
    <div><p class="eyebrow">Variations</p><div class="chips" style="margin-top:6px">${exercise.variants.map(variant => html`<span class="tag ${variant.id === (variantId ?? exercise.variants[0].id) ? '' : 'tag--line'}">${variant.name}</span>`)}</div></div>`;
}

function guidePage(info, id) {
  if (!Object.hasOwn(EXERCISES, id)) return html`<div class="wrap"><div class="empty"><p class="empty__t">Unknown movement</p><a class="btn" href="#/train/library">Library</a></div></div>`;
  return html`<div class="wrap cut"><a class="linkish linkish--quiet" href="#/train/library">${icon('arrow-left', 'ic--sm')} Library</a>
    <header><p class="eyebrow">${EXERCISES[id].muscle}</p><h1 class="display display--l">${EXERCISES[id].name}</h1></header>${guideBody(id, undefined, info.state)}</div>`;
}

// ---------- sheets ----------
function pickSession(state, { quick = false } = {}) {
  let date = today(); let light = false;
  const legacy = SESSIONS.filter(session => state.sessions.some(item => item.sessionId === session.id));
  const api = sheet({
    title: quick ? 'Log a past workout' : 'Start a session', eyebrow: quick ? 'Forgot to track' : 'Train',
    body: () => html`
      ${quick ? html`<label class="field"><span class="field__l">When was it</span><input class="input" type="date" id="qdate" value="${date}" min="${state.sessions.length || state.draft ? state.startDate : '2020-01-01'}" max="${today()}" data-change="date"></label>
        <p class="tiny muted">${state.sessions.length ? `Your journal starts ${fmtDay(state.startDate)}, so that is as far back as this goes.` : 'Pick the day you trained. Forme fills the sets from your last numbers when it has them.'}</p>` : ''}
      <div class="list">${[...NEW_SESSIONS, ...legacy].map(session => html`<button class="list__i list__i--tap" type="button" data-act="go" data-session="${session.id}"><span class="list__m"><span class="title">${session.name}</span><span class="tiny muted" style="display:block">${session.focus} · ${session.exercises.length} movements</span></span><span class="list__e">${icon('chevron-right')}</span></button>`)}</div>
      <button class="switch" type="button" role="switch" aria-checked="${light ? 'true' : 'false'}" data-act="light"><span class="switch__t"><span class="title" style="font-size:.98rem">Lighter session</span><span class="tiny muted" style="display:block">About half the sets, 4 reps in reserve. For a tired or sore day.</span></span><span class="switch__k"></span></button>`,
    changes: { date: (_d, el) => { date = el.value; } },
    actions: {
      light: (_d, _e, _ev, self) => { light = !light; self.update(); },
      go: (data, _e, _ev, self) => { if (begin(data.session, date, light, quick)) self.close(); },
    },
  });
  return api;
}

function begin(sessionId, date = today(), light = false, quick = false) {
  let state = store.training.read().value;
  if (state.draft) { toast('Finish or discard the workout in progress first.'); return false; }
  if (!isRealDate(date) || date > today()) { toast('Pick today or an earlier date.'); return false; }
  if (date < state.startDate) {
    if (state.sessions.length) { toast(`Your journal starts ${fmtDay(state.startDate)}. Pick that day or later.`); return false; }
    state = { ...createTrainingState(date), unit: state.unit };
  }
  try {
    const draft = createDraft(state, sessionId, date, light);
    if (quick) draft.exercises = draft.exercises.map(entry => { const last = findLastEntry(state.sessions, entry.exerciseId, entry.variantId, draft.unit, entry.setup, addDays(date, 1)); return last ? copyLastSets(entry, last) : entry; });
    if (!write({ ...state, draft }, { undo: false })) return false;
  } catch (error) { toast(error.message.replace(/^Training data: /, '')); return false; }
  undoStack.length = 0; openIndex = null; touch();
  location.hash = '#/train/go';
  return true;
}

function replay(state, sessionId, exerciseId) {
  const record = findRecords(state.sessions).find(item => item.sessionId === sessionId && item.exerciseId === exerciseId);
  if (!record) return;
  const oldValue = record.previous.value; const newValue = record.value;
  const label = value => (record.load > 0 ? `${fmt(value, 0)} ${record.unit} est. max` : `${fmt(value)} reps`);
  const body = () => html`<div class="pr ${motionOK() ? 'pr--play' : ''}" aria-live="polite">
      <div class="pr__kick"><span>Record</span><span>${fmtDay(record.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
      <p class="eyebrow">${EXERCISES[record.exerciseId].name}</p>
      <p class="display display--l">${record.load > 0 ? `${fmt(record.load, 1)} ${record.unit} × ${record.reps}` : `${record.reps} reps`}</p>
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
  const apply = (action, self, message) => { const { state: now } = read(); try { if (write(editDraft(now, action))) { toast(message, { action: 'Undo', onAction: undo }); self.close(); } } catch (error) { toast(error.message.replace(/^Training data: /, '')); } };
  sheet({
    title: exercise.name, eyebrow: 'Edit this movement',
    body: () => html`
      <div><p class="eyebrow">Variation</p><div class="chips" style="margin-top:6px">${exercise.variants.map(variant => html`<button class="chip" type="button" aria-pressed="${variant.id === entry.variantId ? 'true' : 'false'}" data-act="variant" data-v="${variant.id}">${variant.name}</button>`)}</div>
        ${recorded ? html`<p class="tiny muted" style="margin-top:6px">Changing the variation keeps your numbers. Compare only like with like.</p>` : ''}</div>
      <div class="grid2"><label class="field"><span class="field__l">Working sets</span><input class="input input--num" id="psets" inputmode="numeric" value="${entry.prescribedSets}"></label>
        <label class="field"><span class="field__l">Rep range</span><span class="row"><input class="input input--num" id="pmin" inputmode="numeric" value="${entry.repMin}" aria-label="Lowest reps"><span>to</span><input class="input input--num" id="pmax" inputmode="numeric" value="${entry.repMax}" aria-label="Highest reps"></span></label></div>
      <button class="btn btn--quiet btn--sm btn--block" type="button" data-act="rx">Save sets and reps</button>
      <label class="field"><span class="field__l">Setup note (machine, seat, grip)</span><input class="input" id="psetup" maxlength="120" value="${entry.setup}" placeholder="e.g. seat 4, far cable station"></label>
      <button class="btn btn--quiet btn--sm btn--block" type="button" data-act="setup">Save note</button>
      <div class="row"><button class="btn btn--quiet btn--sm grow" type="button" data-act="up" ${index === 0 ? 'disabled' : ''}>${icon('arrow-up')} Earlier</button><button class="btn btn--quiet btn--sm grow" type="button" data-act="down" ${index === state.draft.exercises.length - 1 ? 'disabled' : ''}>${icon('arrow-down')} Later</button></div>
      <details class="fold"><summary>Swap for another movement</summary><div class="fold__b">${recorded ? html`<p class="small muted">This movement has numbers in it. Clear them first, or add the new movement and keep both.</p>` : ''}
        <div class="list">${same.map(other => html`<button class="list__i list__i--tap" type="button" data-act="${recorded ? 'addit' : 'swap'}" data-x="${other.id}"><span class="list__m"><span class="title">${other.name}</span><span class="tiny muted" style="display:block">${other.muscle}</span></span><span class="list__e">${recorded ? 'Add' : 'Swap'}</span></button>`)}</div></div></details>
      <button class="btn btn--quiet btn--sm btn--block" type="button" data-act="remove" ${recorded ? 'disabled' : ''}>${icon('trash')} Remove from this workout</button>`,
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

function settingsSheet(state) {
  sheet({
    title: 'Program settings', eyebrow: 'Train',
    body: () => { const now = store.training.read().value; return html`
      <div><p class="eyebrow">Load unit</p><div class="segc" style="margin-top:6px">${['lb', 'kg'].map(unit => html`<button type="button" aria-pressed="${now.unit === unit ? 'true' : 'false'}" data-act="unit" data-u="${unit}">${unit}</button>`)}</div><p class="tiny muted" style="margin-top:6px">Applies to new workouts. Saved sessions keep the unit they were logged in.</p></div>
      <dl class="kv"><dt>Journal starts</dt><dd>${fmtDay(now.startDate, { day: 'numeric', month: 'short', year: 'numeric' })}</dd><dt>Program</dt><dd>${now.program ? 'Five-day rotation' : 'Earlier four-session plan'}</dd><dt>Sessions saved</dt><dd>${now.sessions.length}</dd></dl>
      <p class="small muted">The rotation is Upper, Lower, Rest, Chest and Back, Legs, Shoulders and Arms, Rest. A missed day is not carried forward; shift the rotation when your week changes.</p>
      <button class="btn btn--quiet btn--block" type="button" data-act="shift">Shift rotation</button>`; },
    actions: {
      unit: (data, _e, _ev, self) => { const now = store.training.read().value; if (now.draft) return toast('Finish the workout in progress before changing units.'); if (write({ ...now, unit: data.u }, { undo: false })) self.update(); },
      shift: (_d, _e, _ev, self) => { self.close(); shiftSheet(); },
    },
  });
}

function shiftSheet() {
  const names = PROGRAM_DAYS.map(id => (id ? getSessionTemplate(id).name : 'Rest'));
  sheet({
    title: 'What is today?', eyebrow: 'Shift rotation',
    body: html`<p class="muted">Pick the day of the rotation that today should be. Past records do not move.</p>
      <div class="list">${names.map((name, index) => html`<button class="list__i list__i--tap" type="button" data-act="set" data-d="${index + 1}"><span class="lgx__n">${index + 1}</span><span class="list__m title">${name}</span></button>`)}</div>`,
    actions: { set: (data, _e, _ev, self) => { const state = store.training.read().value; try { if (write(setProgramDay(state, today(), Number(data.d)), { undo: false })) { toast('Rotation shifted.'); self.close(); } } catch (error) { toast(error.message); } } },
  });
}

// ---------- entry ----------
export function render(ctx) {
  const info = trainingInfo();
  if (info.error) return { room: 'street', where: 'Train', body: html`<div class="wrap"><div class="frame"><div class="frame__head"><span>Training journal</span><span>Not overwritten</span></div><div class="frame__body">
      <h1 class="display display--m">Your training journal could not be read.</h1><p class="muted">${info.error}</p><p>Forme has not changed it. Restore a backup, or export what is here first.</p><a class="btn" href="#/you/data">Backup and data</a></div></div></div>`, actions: {} };
  const sub = ctx.path[1];
  const state = info.state;
  let body; let where = 'Train'; let bare = false;
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
    room: 'street', where, bare, body,
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
      pick: () => pickSession(state),
      quicklog: () => { if (state.draft) return toast('Finish or discard the workout in progress first.'); pickSession(state, { quick: true }); },
      repeat: data => { try { if (write(repeatSession(store.training.read().value, data.id, today()), { undo: false })) { undoStack.length = 0; openIndex = null; touch(); location.hash = '#/train/go'; } } catch (error) { toast(error.message.replace(/^Training data: /, '')); } },
      adopt: () => shiftSheet(),
      shift: () => shiftSheet(),
      settings: () => settingsSheet(state),
      open: data => { openIndex = Number(data.i); ctx.refresh(); },
      undo: () => undo(),
      bump: data => {
        const now = store.training.read().value; const ghost = ghostFor(now, data);
        mutateSet(data, (set, _entry, next) => {
          const base = set[data.f] === '' ? (ghost ? ghost[data.f] : (data.f === 'reps' ? next.draft.exercises[Number(data.i)].repMin : 0)) : set[data.f];
          const delta = Number(data.d) * (data.f === 'load' ? step(next.draft.unit) : 1);
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
        startRest(EXERCISES[entry.exerciseId].rest, EXERCISES[entry.exerciseId].name);
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
        if (write(editDraft(now, action))) toast(index >= 0 ? 'One more set of leg curls added.' : 'Leg curls added.', { action: 'Undo', onAction: undo }); } catch (error) { toast(error.message.replace(/^Training data: /, '')); } },
      guide: data => { const now = store.training.read().value; const entry = now.draft.exercises[Number(data.i)]; sheet({ title: EXERCISES[entry.exerciseId].name, eyebrow: 'How to', body: guideBody(entry.exerciseId, entry.variantId, now) }); },
      more: data => moreSheet(Number(data.i)),
      add: () => { const now = store.training.read().value; const options = Object.values(EXERCISES).filter(exercise => !now.draft.exercises.some(entry => entry.exerciseId === exercise.id));
        sheet({ title: 'Add a movement', eyebrow: 'This workout', body: html`<div class="list">${options.map(exercise => html`<button class="list__i list__i--tap" type="button" data-act="pick" data-x="${exercise.id}"><span class="list__m"><span class="title">${exercise.name}</span><span class="tiny muted" style="display:block">${exercise.muscle}</span></span><span class="list__e">Add</span></button>`)}</div>`,
          actions: { pick: (d, _e, _ev, self) => { try { const latest = store.training.read().value; if (write(editDraft(latest, { type: 'add', exerciseId: d.x }))) { openIndex = latest.draft.exercises.length; self.close(); toast(`${EXERCISES[d.x].name} added.`, { action: 'Undo', onAction: undo }); } } catch (error) { toast(error.message.replace(/^Training data: /, '')); } } } }); },
      discard: async () => { if (!await ask({ title: 'Discard this workout?', text: 'The sets you entered in this draft will be removed. Saved sessions are not affected.', yes: 'Discard', no: 'Keep going', danger: true })) return; const now = store.training.read().value; if (write({ ...now, draft: null }, { undo: true })) { rest = null; toast('Draft discarded.', { action: 'Undo', onAction: undo }); location.hash = '#/train'; } },
      finish: async () => {
        const now = store.training.read().value; const progress = draftProgress(now.draft);
        if (!progress.done) return toast('Tick at least one set before finishing.');
        if (progress.done < progress.total && !await ask({ title: 'Finish with sets left?', text: `${progress.done} of ${progress.total} sets are ticked. The rest are dropped and the session is saved as partial.`, yes: 'Save as partial', no: 'Keep going' })) return;
        const id = uid(); const wasPast = now.draft.date !== today();
        try { if (!write(finishDraft(now, id), { undo: false })) return; } catch (error) { return toast(error.message.replace(/^Training data: /, '')); }
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
