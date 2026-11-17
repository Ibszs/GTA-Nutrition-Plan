// Move: a guided posture and movement practice. Seven days first, then an explicit choice.
// Sessions are counted, not dated: a missed day resumes exactly where it stopped.

import * as store from '../store.js';
import { html, raw, icon, sheet, ask, toast, haptic, blip, today, fmtDay, relDay, dayDiff, clock, uid, sec, plural, fmt, extLink, motionOK, loop } from '../ui.js';
import { movementToday, trainingInfo, award, touch } from '../actions.js';
import { EXERCISES, EX, LANES, EQUIPMENT } from '../data/exercises.js';
import { CLAIMS, BUCKETS, SOURCES, EXPERIENCES, EXPERIENCE_NOTE, GET_CHECKED } from '../data/evidence.js';
import { frame, legend } from '../figure.js';
import { CHECKS, MEASURES, PLANS, buildSessions, todaySession, applyFeedback, resumeDrill, recap, newPlan, doseText, doseSeconds } from '../logic/movement.js';

let whyLane = null;
let play = null; // { steps, i, left, paused, started, elapsed, short, session, swapped, single }
let ticker = null;
let scrub = { id: null, t: 1, playing: false, raf: 0 };

const defaultSetup = () => ({ primary: 'pelvis', secondary: null, equipment: { wall: true, chair: true, mat: true, step: true, band: false }, firstSide: 'left' });
const ensureSetup = () => { const move = store.get('move'); if (move.setup) return move.setup; store.update('move', next => { next.setup = defaultSetup(); }); return store.get('move').setup; };
function startPlan(kind, primary, secondary) {
  store.update('move', move => {
    if (move.plan) move.pastPlans = [...(move.pastPlans ?? []), { ...move.plan, endedOn: today() }].slice(-12);
    move.setup = { ...(move.setup ?? defaultSetup()), primary, secondary: secondary && secondary !== primary ? secondary : null };
    move.plan = newPlan(kind, primary, secondary, today(), uid());
  });
}

// ---------- figure block with scrubber ----------
function figureBlock(exercise, { t = 1, trace = false } = {}) {
  const rows = legend(exercise);
  return html`<figure class="fig" aria-label="${exercise.alt}">
    <div class="fig__stage" id="figStage"><span class="tag fig__tag" id="figTag">${t <= 0.02 ? 'Start' : t >= 0.98 ? 'Finish' : 'Moving'}</span><span class="fig__ill">Illustrative diagram</span>${raw(frame(exercise, { t, ghost: t > 0.02, arrows: t >= 0.98, trace }))}</div>
    <div class="fig__ctl"><button class="icon-btn icon-btn--line" type="button" data-act="figplay" aria-label="Play the movement">${icon('play')}</button>
      <input class="range" type="range" min="0" max="100" value="${Math.round(t * 100)}" aria-label="Scrub between start and finish" data-input="figscrub"></div>
    <div class="fig__pair"><button class="fig__thumb" type="button" data-act="figto" data-t="0" aria-pressed="${t <= 0.02 ? 'true' : 'false'}"><span>Start view</span>${raw(frame(exercise, { t: 0, targets: false }))}</button>
      <button class="fig__thumb" type="button" data-act="figto" data-t="1" aria-pressed="${t >= 0.98 ? 'true' : 'false'}"><span>Finish view</span>${raw(frame(exercise, { t: 1, targets: false }))}</button></div>
    <ol class="legend" aria-label="Target areas">${rows.map(row => html`<li><span class="legend__n ${row.kind === 'stretch' ? 'legend__n--stretch' : ''}">${row.n}</span><span>${row.name}</span><span class="legend__k"><span class="swatch ${row.kind === 'stretch' ? 'swatch--stretch' : ''}"></span>${row.word}</span></li>`)}</ol>
    <figcaption class="fig__cap">Solid red marks what is working. Blue stripes mark what is lengthening. The drawing shows the idea of the movement; it is not an anatomical chart and not a picture of you.</figcaption>
  </figure>`;
}
function setScrub(exercise, t, trace = false) {
  scrub.t = t;
  const stage = document.getElementById('figStage'); if (!stage) return;
  stage.querySelector('svg')?.remove();
  stage.insertAdjacentHTML('beforeend', frame(exercise, { t, ghost: t > 0.02, arrows: t >= 0.98, trace }));
  const tag = document.getElementById('figTag'); if (tag) tag.textContent = t <= 0.02 ? 'Start' : t >= 0.98 ? 'Finish' : 'Moving';
  const range = document.querySelector('[data-input="figscrub"]'); if (range && !scrub.dragging) range.value = Math.round(t * 100);
}
function playScrub(exercise) {
  cancelAnimationFrame(scrub.raf);
  if (!motionOK()) { setScrub(exercise, scrub.t >= 0.5 ? 0 : 1, true); return; }
  const start = performance.now(); const span = 2600;
  const tick = now => { const p = Math.min(1, (now - start) / span); const wave = p < 0.5 ? p * 2 : 2 - p * 2; const eased = 0.5 - Math.cos(Math.PI * (p < 0.5 ? p * 2 : 1)) / 2; setScrub(exercise, p < 0.5 ? eased : wave); if (p < 1) scrub.raf = requestAnimationFrame(tick); else setScrub(exercise, 1, true); };
  setScrub(exercise, 0); scrub.raf = requestAnimationFrame(tick);
}

// ---------- home ----------
function home() {
  const { move, session, legDay } = movementToday();
  const setup = move.setup ?? defaultSetup();
  if (!move.plan) {
    return html`<div class="wrap studio cut">
      <section class="slab slab--bleed" aria-label="Posture and movement">
        <p class="slab__k"><span>Posture and movement</span><span>About 6 min</span></p>
        <h1 class="display display--xl head-in">Day 1<span class="mhead__of"> of 7</span></h1>
        <p class="slab__sub">Setup and first practice. It starts with ${LANES[setup.primary].name.toLowerCase()} as the focus, and you can change that on the first screen.</p>
        <div class="slab__go stack"><button class="btn btn--go" type="button" data-act="begin"><span>Start day 1</span>${icon('arrow-right')}</button>
          <button class="btn btn--ghost btn--block btn--sm" type="button" data-act="focus">Choose my focus first</button></div>
      </section>
      <p class="lead">A guided practice of six to twelve minutes a day for one week. You pick what to work on: how your pelvis sits, an ankle that rolls, a knee that drifts, or a shoulder blade that moves differently. On day 7 you decide whether to continue.</p>
      ${sec('Four areas', 'Pick one. A second is optional.')}
      <div class="stack">${Object.values(LANES).map(lane => html`<button class="frame frame--press" type="button" data-act="focus" data-l="${lane.id}"><div class="frame__head"><span>${lane.short}</span><span>${plural(lane.order.length, 'drill')}</span></div><div class="frame__body"><p class="title">${lane.name}</p><p class="small muted">${lane.line}</p></div></button>`)}</div>
      ${footLinks()}
    </div>`;
  }
  const plan = move.plan; const info = PLANS[plan.kind];
  const sessions = move.sessions.filter(item => item.planId === plan.id);
  const lastDate = sessions.at(-1)?.date;
  const gap = lastDate ? dayDiff(today(), lastDate) : 0;
  const doneToday = lastDate === today();
  const finished = plan.done >= info.sessions;
  const paused = Object.keys(move.paused ?? {});
  const hasBaseline = move.checks.some(check => check.planId === plan.id);
  if (finished) return html`<div class="wrap studio cut"><header class="mhead"><p class="eyebrow">${info.name}</p><h1 class="display display--l">Finished</h1></header>
      <a class="btn btn--block" href="#/move/done">See the recap</a>${footLinks()}</div>`;
  return html`<div class="wrap studio cut">
    <section class="slab slab--bleed" aria-label="Today's practice">
      <p class="slab__k"><span>${info.name} · ${LANES[plan.primary].short}${plan.secondary ? ` + ${LANES[plan.secondary].short}` : ''}</span><span>${session.minutes} min</span></p>
      <h1 class="display display--xl head-in">Day ${session.n}<span class="mhead__of"> of ${session.of}</span></h1>
      <p class="slab__sub">${session.title}. ${gap >= 2 ? `You last practised ${relDay(lastDate).toLowerCase()}. It is still day ${session.n}.` : doneToday ? 'Today is done. You can run another session.' : `About ${session.minutes} minutes.`}</p>
      <div class="dots7" role="img" aria-label="${plan.done} of ${info.sessions} sessions done">${Array.from({ length: info.sessions }, (_, index) => html`<span class="dots7__d ${index < plan.done ? 'is-done' : index === plan.done ? 'is-next' : ''}">${index + 1}</span>`)}</div>
      <div class="slab__go stack"><button class="btn btn--go" type="button" data-act="play"><span>${doneToday ? 'Practise again' : 'Start'} · ${session.minutes} min</span>${icon('arrow-right')}</button>
        <button class="btn btn--ghost btn--block btn--sm" type="button" data-act="playshort">${icon('bolt')} 2-minute version</button></div>
    </section>
    ${session.why.length ? html`<div class="note"><p class="eyebrow">Why today looks like this</p><ul class="dots">${session.why.map(line => html`<li>${line}</li>`)}</ul></div>` : ''}
    ${legDay && !session.why.length ? html`<p class="tiny muted">Leg day in the gym. Today’s drills are already light on the legs.</p>` : ''}

    <section aria-label="Today's drills">${sec('Today', `${plural(session.items.length, 'drill')}`)}
      <div class="list">${session.items.map(item => html`<a class="list__i list__i--tap" href="#/move/x/${item.id}"><span class="mthumb">${raw(frame(EX[item.id], { t: 1, targets: false }))}</span>
        <span class="list__m"><span class="title">${EX[item.id].name}</span><span class="tiny muted" style="display:block">${item.levelName} · ${doseText(item.dose)}${item.paused ? ' · paused' : ''}</span></span><span class="list__e">${icon('chevron-right')}</span></a>`)}</div></section>

    ${paused.length ? html`<div class="note note--warn"><p class="eyebrow">Paused</p>${paused.map(id => html`<p class="spread"><span>${EX[id].name}: easiest version only since ${fmtDay(move.paused[id].on, { month: 'short', day: 'numeric' })}.</span><button class="btn btn--xs btn--quiet" type="button" data-act="resume" data-id="${id}">Resume</button></p>`)}<p class="tiny"><a href="#/move/check">When to get checked</a></p></div>` : ''}

    <div class="cols">
      <button class="frame frame--press" type="button" data-act="checkin"><div class="frame__head"><span>Optional check</span><span>1 minute</span></div><div class="frame__body"><p class="title">${hasBaseline ? 'Check in again' : 'Baseline check'}</p><p class="small muted">Four ratings of how things feel, and two optional measures. Repeat it whenever you like. It is not a score.</p></div></button>
      <button class="frame frame--press" type="button" data-act="focus"><div class="frame__head"><span>Focus</span><span>Change any time</span></div><div class="frame__body"><p class="title">${LANES[plan.primary].name}${plan.secondary ? html` <span class="muted">+ ${LANES[plan.secondary].short.toLowerCase()}</span>` : ''}</p><p class="small muted">Equipment: ${Object.entries(setup.equipment).filter(([, on]) => on).map(([key]) => EQUIPMENT[key].split(' ')[0].toLowerCase()).join(', ')}.</p></div></button>
    </div>
    <button class="linkish linkish--quiet" type="button" data-act="restday">Not today: make it a rest day</button>
    ${footLinks()}
  </div>`;
}
const footLinks = () => html`<nav class="row row--wrap" aria-label="More about the practice"><a class="btn btn--quiet btn--sm grow" href="#/move/library">${icon('book-open')} All drills</a><a class="btn btn--quiet btn--sm grow" href="#/move/why">${icon('info')} Evidence</a><a class="btn btn--quiet btn--sm grow" href="#/move/check">${icon('door')} When to get checked</a></nav>`;

// ---------- teaching card ----------
function cardPage(exercise) {
  const move = store.get('move'); const level = Math.min(move.levels?.[exercise.id] ?? 0, exercise.levels.length - 1);
  const dose = exercise.levels[level].dose ?? exercise.dose;
  return html`<article class="wrap studio">
    <a class="linkish linkish--quiet" href="#/move">${icon('arrow-left', 'ic--sm')} Move</a>
    <header><p class="eyebrow">${(exercise.lanes ?? [exercise.lane]).map(id => LANES[id].short).join(' · ')} · ${exercise.load === 'none' ? 'No load' : exercise.load === 'low' ? 'Low load' : 'Moderate load'}</p><h1 class="display display--l">${exercise.name}</h1><p class="lead">${exercise.what}</p></header>
    ${figureBlock(exercise, { t: 1, trace: true })}
    <div class="row row--wrap"><button class="btn grow" type="button" data-act="single" data-id="${exercise.id}">${icon('play')} Practise this now</button>${exercise.video ? html`<a class="btn btn--quiet" href="${exercise.video.url}" target="_blank" rel="noopener noreferrer">${icon('ext', 'ic--sm')} Watch a demo</a>` : ''}</div>
    ${exercise.video ? html`<p class="tiny muted">Demo: “${exercise.video.title}” by ${exercise.video.channel} on YouTube (${exercise.video.len}). Opens YouTube in a new tab; nothing loads from it until you tap. If the link ever dies, the drawing and cues here are the full instruction.</p>` : ''}

    <section class="frame" aria-label="Dose"><div class="frame__head"><span>Your dose now</span><span>About ${clock(doseSeconds(dose))}</span></div><div class="frame__body">
      <p class="title">${doseText(dose)} · ${exercise.levels[level].name}</p><p class="small">${exercise.levels[level].change}</p><p class="tiny muted">${exercise.dosage}</p></div></section>

    <section aria-label="How to do it">${sec('Setup')}<p style="margin-top:8px">${exercise.setup}</p></section>
    <section aria-label="Cues">${sec('Cues', 'Explore, do not force')}<ol class="steps" style="margin-top:8px">${exercise.cues.map((cue, index) => html`<li><span class="steps__n">${index + 1}</span><span>${cue}</span></li>`)}</ol></section>
    <section aria-label="What you might feel">${sec('What you might feel')}<p style="margin-top:8px">${exercise.feel}</p></section>
    <section aria-label="Common compensations">${sec('Watch for')}<ul class="dots" style="margin-top:8px">${exercise.watch.map(item => html`<li>${item}</li>`)}</ul></section>

    <section class="frame" aria-label="Levels"><div class="frame__head"><span>Easier and harder</span><span>By feel, not by date</span></div><div class="frame__body">
      <p class="small"><strong>Easier.</strong> ${exercise.easier}</p>
      <ol class="lvl">${exercise.levels.map((item, index) => html`<li class="${index === level ? 'is-now' : ''}"><span class="tag ${index === level ? 'tag--amber' : 'tag--line'}">${index === level ? 'You are here' : `Level ${index + 1}`}</span><p class="title">${item.name}</p><p class="small">${item.change}</p>${item.nextWhen ? html`<p class="tiny muted">Move on when: ${item.nextWhen}</p>` : html`<p class="tiny muted">Top version. Hold it here.</p>`}</li>`)}</ol>
      <p class="tiny muted">Forme moves you up after two sessions in a row that you mark as easier. Harder steps you back. Felt off pauses it.</p></div></section>

    <section class="frame" aria-label="If it aggravates symptoms"><div class="frame__head"><span>If it bothers something</span><span><a href="#/move/check">When to get checked</a></span></div><div class="frame__body"><p>${exercise.ifSore}</p></div></section>
    <section class="frame" aria-label="Benefits and uncertainty"><div class="frame__head"><span>What it might do</span><span>And what is uncertain</span></div><div class="frame__body"><p>${exercise.benefit}</p>
      <p class="tiny muted">Sources: ${exercise.refs.map((ref, index) => html`${index ? '; ' : ''}${extLink(SOURCES[ref].url, `${SOURCES[ref].cite.split('.')[0]} (${SOURCES[ref].date})`)}`)}. <a href="#/move/why">All evidence</a>.</p></div></section>
    <p class="small"><strong>Around lifting.</strong> ${exercise.around}</p>
    <p class="tiny muted">Needs: ${exercise.equip.length ? exercise.equip.map(item => EQUIPMENT[item].toLowerCase()).join(', ') : 'a bit of floor'}.</p>
  </article>`;
}

function libraryPage() {
  return html`<div class="wrap studio"><a class="linkish linkish--quiet" href="#/move">${icon('arrow-left', 'ic--sm')} Move</a>
    <header><p class="eyebrow">${EXERCISES.length} drills</p><h1 class="display display--l">Library</h1><p class="muted">Every drill has its own teaching card: start and finish, target areas, cues, an easier version and when to move on.</p></header>
    ${Object.values(LANES).map(lane => html`<section aria-label="${lane.name}">${sec(lane.name, lane.line)}<p class="small muted" style="margin:8px 0">${lane.about}</p>
      <div class="mgrid">${lane.order.map(id => html`<a class="mcard" href="#/move/x/${id}">${raw(frame(EX[id], { t: 1, targets: true }))}<span class="mcard__t">${EX[id].name}</span><span class="tiny muted">${EX[id].load === 'none' ? 'No load' : EX[id].load === 'low' ? 'Low load' : 'Moderate'}</span></a>`)}</div></section>`)}
  </div>`;
}

// ---------- evidence ----------
function whyPage() {
  const move = store.get('move');
  const lane = whyLane ?? move.plan?.primary ?? 'pelvis';
  const claims = CLAIMS[lane];
  const voices = EXPERIENCES.filter(item => item.lane === lane);
  return html`<div class="wrap studio"><a class="linkish linkish--quiet" href="#/move">${icon('arrow-left', 'ic--sm')} Move</a>
    <header><p class="eyebrow">Read 16 to 17 Nov 2026</p><h1 class="display display--l">What the evidence says</h1><p class="muted">Each line names its source, what kind of study it is, who was studied, for how long, and what it cannot tell you.</p></header>
    <div class="chips" role="tablist" aria-label="Lane">${Object.values(LANES).map(item => html`<button class="chip" role="tab" type="button" aria-selected="${item.id === lane ? 'true' : 'false'}" data-act="lane" data-l="${item.id}">${item.short}</button>`)}</div>
    <p class="small">${LANES[lane].about}</p>
    ${Object.entries(BUCKETS).map(([bucket, title]) => { const rows = claims.filter(claim => claim.bucket === bucket); return rows.length ? html`<section aria-label="${title}">${sec(title)}<div class="stack" style="margin-top:10px">${rows.map(claim => html`<article class="claim claim--${bucket}">
        <p>${claim.text}</p>
        <dl class="kv kv--stack"><dt>Evidence</dt><dd>${claim.level}</dd><dt>Who and how long</dt><dd>${claim.who}. ${claim.span}.</dd><dt>Limits</dt><dd>${claim.limit}</dd>
          ${claim.src ? html`<dt>Source</dt><dd>${extLink(SOURCES[claim.src].url, SOURCES[claim.src].cite)} <span class="muted">${SOURCES[claim.src].type}, ${SOURCES[claim.src].date}.</span></dd>` : ''}</dl></article>`)}</div></section>` : ''; })}
    <section aria-label="What people report">${sec('What people report', 'Self-reported or opinion. Not evidence.')}
      <p class="small muted" style="margin:8px 0">${EXPERIENCE_NOTE}</p>
      ${voices.length ? html`<div class="stack">${voices.map(voice => html`<article class="claim claim--voice"><p class="eyebrow">${voice.kind}</p><p>${voice.text}</p><p class="tiny muted">${voice.who}, ${extLink(voice.url, voice.where)}, ${voice.date}. ${voice.range}.</p></article>`)}</div>` : html`<p class="small muted">No public first-hand account for this lane could be opened and verified in this run, so none is quoted.</p>`}</section>
    <a class="btn btn--quiet btn--block" href="#/move/check">${icon('door')} When to get checked</a>
  </div>`;
}

function checkPage() {
  return html`<div class="wrap studio"><a class="linkish linkish--quiet" href="#/move">${icon('arrow-left', 'ic--sm')} Move</a>
    <header><p class="eyebrow">Short and source-backed</p><h1 class="display display--l">When to get checked</h1><p class="lead">${GET_CHECKED.intro}</p></header>
    <section class="frame" style="border-color:var(--mark)"><div class="frame__head" style="color:var(--mark)"><span>${GET_CHECKED.urgent.label}</span><span></span></div><div class="frame__body"><ul class="dots">${GET_CHECKED.urgent.items.map(item => html`<li>${item}</li>`)}</ul></div></section>
    ${Object.entries(GET_CHECKED.lanes).map(([id, lane]) => html`<section class="frame"><div class="frame__head"><span>${lane.label}</span><span>${LANES[id].short}</span></div><div class="frame__body"><ul class="dots">${lane.items.map(item => html`<li>${item}</li>`)}</ul>
      <p class="eyebrow">Book an appointment if</p><ul class="dots">${lane.soon.map(item => html`<li>${item}</li>`)}</ul>
      <p class="tiny muted">Wording follows ${extLink(SOURCES[lane.src].url, SOURCES[lane.src].cite)} ${SOURCES[lane.src].date}.</p></div></section>`)}
    <div class="note"><p>${GET_CHECKED.ontario}</p><p>${GET_CHECKED.pause}</p></div>
    <p class="tiny muted">Forme does not diagnose, does not score symmetry and does not read photos. If you take photos to compare for yourself, keep them in your own camera roll; Forme does not store them.</p>
  </div>`;
}

// ---------- recap and choice ----------
function donePage() {
  const move = store.get('move'); const summary = recap(move);
  if (!summary) return html`<div class="wrap studio"><div class="empty"><p class="empty__t">No plan yet</p><a class="btn" href="#/move">Start the 7 days</a></div></div>`;
  const plan = move.plan; const complete = plan.done >= PLANS[plan.kind].sessions;
  const feelWord = { easier: 'easier', same: 'the same', harder: 'harder', off: 'felt off' };
  return html`<div class="wrap studio cut"><a class="linkish linkish--quiet" href="#/move">${icon('arrow-left', 'ic--sm')} Move</a>
    <header class="mhead"><p class="eyebrow">${PLANS[plan.kind].name} · started ${fmtDay(plan.startedOn, { month: 'short', day: 'numeric' })}</p><h1 class="display display--l">${complete ? 'The recap.' : 'So far.'}</h1></header>
    <div class="statrow"><div class="stat"><div class="stat__v num">${summary.sessions}<small>/${summary.of}</small></div><div class="stat__l">Sessions</div></div><div class="stat"><div class="stat__v num">${summary.minutes}</div><div class="stat__l">Minutes</div></div><div class="stat"><div class="stat__v num">${summary.days}</div><div class="stat__l">Days</div></div><div class="stat"><div class="stat__v num">${summary.short}</div><div class="stat__l">2-minute</div></div></div>
    <section class="frame"><div class="frame__head"><span>What you told Forme</span><span>After each session</span></div><div class="frame__body">
      ${Object.keys(summary.feels).length ? html`<p>${Object.entries(summary.feels).map(([feel, count]) => `${count} × ${feelWord[feel]}`).join(' · ')}</p>` : html`<p class="muted">No post-session answers recorded.</p>`}
      ${summary.levelUps.length ? html`<p class="small">Moved up: ${summary.levelUps.map(item => `${item.name} to "${item.level}"`).join('; ')}.</p>` : html`<p class="small muted">No drill has moved up a level yet. That takes two easier sessions in a row.</p>`}
      ${summary.paused.length ? html`<p class="small">Paused: ${summary.paused.join(', ')}.</p>` : ''}</div></section>
    <section class="frame"><div class="frame__head"><span>Your checks</span><span>${summary.hasRetest ? 'First and latest' : summary.hasBaseline ? 'Baseline only' : 'None recorded'}</span></div><div class="frame__body">
      ${summary.changes.length ? html`<dl class="kv">${summary.changes.map(change => html`<dt>${change.label}</dt><dd class="num">${fmt(change.from, 1)}${change.unit} → ${fmt(change.to, 1)}${change.unit}</dd>`)}</dl><p class="tiny muted">These are your own ratings and measures on two days. A week of practice mostly changes how a task feels and how steady you are at it; it does not change structure.</p>`
    : html`<p class="muted small">${summary.hasBaseline ? 'You have a baseline. A retest now gives you two points to compare.' : 'Checks are optional. One now still gives you a starting point for whatever is next.'}</p>`}
      <button class="btn btn--quiet btn--sm btn--block" type="button" data-act="checkin">${summary.hasBaseline ? 'Retest now' : 'Do a check now'} · 1 minute</button></div></section>
    ${sec('What next', 'Choose one')}
    <div class="stack">
      <button class="frame frame--press" type="button" data-act="again"><div class="frame__body"><p class="title">Repeat these 7 days</p><p class="small muted">Same focus, levels kept where they are now.</p></div></button>
      <button class="frame frame--press" type="button" data-act="focus"><div class="frame__body"><p class="title">Change my focus</p><p class="small muted">Pick a different primary lane, add or drop a second one, start a fresh 7 days.</p></div></button>
      <button class="frame frame--press" type="button" data-act="month"><div class="frame__body"><p class="title">Opt into the 30-day plan</p><p class="small muted">Twenty sessions over about thirty days: five a week, two off, a check-in every fifth session. You can stop any time and it asks again at the end before continuing.</p></div></button>
      <button class="frame frame--press" type="button" data-act="stop"><div class="frame__body"><p class="title">Stop here for now</p><p class="small muted">Your history is kept. Movement leaves Today until you start again.</p></div></button>
    </div>
  </div>`;
}

// ---------- player ----------
function buildSteps(items, firstSide = 'left') {
  const sides = firstSide === 'right' ? ['Right', 'Left'] : ['Left', 'Right'];
  const steps = [];
  items.forEach((item, itemIndex) => {
    const exercise = EX[item.id]; const dose = item.dose;
    for (let set = 0; set < dose.sets; set += 1) for (const side of dose.each ? sides : [null]) {
      steps.push({ itemIndex, id: item.id, set: set + 1, sets: dose.sets, side, hold: dose.hold ?? null, reps: dose.reps ?? null, pace: dose.pace ?? 4, seconds: dose.hold ?? dose.reps * (dose.pace ?? 4), levelName: item.levelName, change: item.change, name: exercise.name });
    }
  });
  return steps;
}
function startPlayer(session, { short = false, single = null } = {}) {
  const setup = ensureSetup();
  const items = single ? [single] : short ? session.short.items : session.items;
  play = { steps: buildSteps(items, setup.firstSide), i: -1, left: 0, paused: false, elapsed: 0, short, session, single: Boolean(single), swapped: {}, skipped: [], intro: !single && session.n === 1 && store.get('move').sessions.length === 0, cue: 0 };
  location.hash = '#/move/play';
}
/** One tap from Today or quick-add: start today's practice (or its 2-minute version). Starts the 7 days if there is no plan yet. */
export function quickStart(short = false) {
  const setup = ensureSetup();
  if (!store.get('move').plan) startPlan('week', setup.primary, setup.secondary);
  const move = store.get('move');
  if (move.plan.done >= PLANS[move.plan.kind].sessions) { location.hash = '#/move/done'; return; }
  const { session } = movementToday();
  if (session) startPlayer(session, { short });
}
function playerPage() {
  if (!play) return html`<div class="wrap studio"><div class="empty"><p class="empty__t">No session running</p><a class="btn" href="#/move">Back to Move</a></div></div>`;
  if (play.intro) {
    const setup = ensureSetup();
    return html`<div class="player"><header class="player__top"><button class="icon-btn" type="button" data-act="quit" aria-label="Leave the session">${icon('x')}</button><p class="eyebrow grow">Day 1 · setup, 20 seconds</p></header>
      <main class="player__main player__main--pad"><h1 class="display display--l">What do you want to work on?</h1><p class="muted">One main focus. A second is optional and gets a smaller share. You can change this any day.</p>
        <p class="eyebrow">Main focus</p><div class="chips">${Object.values(LANES).map(lane => html`<button class="chip chip--mark" type="button" aria-pressed="${setup.primary === lane.id ? 'true' : 'false'}" data-act="iprimary" data-l="${lane.id}">${lane.short}</button>`)}</div>
        <p class="eyebrow">Second focus</p><div class="chips"><button class="chip" type="button" aria-pressed="${setup.secondary ? 'false' : 'true'}" data-act="isecond" data-l="">None</button>${Object.values(LANES).filter(lane => lane.id !== setup.primary).map(lane => html`<button class="chip" type="button" aria-pressed="${setup.secondary === lane.id ? 'true' : 'false'}" data-act="isecond" data-l="${lane.id}">${lane.short}</button>`)}</div>
        <p class="eyebrow">What you have</p><div class="chips">${Object.entries(EQUIPMENT).map(([key, label]) => html`<button class="chip" type="button" aria-pressed="${setup.equipment[key] ? 'true' : 'false'}" data-act="iequip" data-k="${key}">${label}</button>`)}</div>
        <p class="eyebrow">Single-leg drills start on your</p><div class="segc"><button type="button" aria-pressed="${setup.firstSide === 'left' ? 'true' : 'false'}" data-act="iside" data-s="left">Left</button><button type="button" aria-pressed="${setup.firstSide === 'right' ? 'true' : 'false'}" data-act="iside" data-s="right">Right</button></div>
        <p class="tiny muted">Start on whichever side you like. Both sides always get the same work.</p></main>
      <footer class="player__nav"><button class="btn btn--block" type="button" data-act="ibegin">${icon('play')} Begin</button></footer></div>`;
  }
  const done = play.i >= play.steps.length;
  if (done) return html`<div class="player"><main class="player__main player__main--pad"><p class="eyebrow">Session done · ${clock(play.elapsed)}</p><h1 class="display display--l">How did that feel?</h1>
      <p class="muted">Your answer sets up the next session.</p>
      <div class="stack">${[['easier', 'Easier than expected', 'Two of these in a row and the drills move up a level.'], ['same', 'About right', 'Same again next time.'], ['harder', 'Harder than expected', 'One set fewer, or a step back, next time.'], ['off', 'Something felt off', 'Pauses that drill and shows what to do next.']].map(([id, title, note]) => html`<button class="frame frame--press" type="button" data-act="feel" data-f="${id}"><div class="frame__body"><p class="title">${title}</p><p class="small muted">${note}</p></div></button>`)}</div>
      ${play.single ? html`<button class="linkish linkish--quiet" type="button" data-act="quit">Skip and close</button>` : ''}</main></div>`;
  if (play.i < 0) play.i = 0, play.left = play.steps[0].seconds;
  const step = play.steps[play.i]; const exercise = EX[play.swapped[step.id] ?? step.id];
  const upcoming = play.steps[play.i + 1];
  const repNow = step.reps ? Math.min(step.reps, Math.floor((step.seconds - play.left) / step.pace) + 1) : null;
  return html`<div class="player" aria-live="off">
    <header class="player__top"><button class="icon-btn" type="button" data-act="quit" aria-label="Leave the session">${icon('x')}</button>
      <div class="grow"><p class="eyebrow">${play.short ? '2-minute version' : play.single ? 'Single drill' : `Day ${play.session.n}`} · step ${play.i + 1} of ${play.steps.length}</p><div class="player__bar"><i id="pBar" style="width:${(play.i / play.steps.length) * 100}%"></i></div></div>
      <a class="icon-btn" href="#/move/x/${exercise.id}" aria-label="Open the teaching card for ${exercise.name}">${icon('info')}</a></header>
    <main class="player__main">
      <div class="player__fig" id="pFig">${raw(frame(exercise, { t: 1, ghost: true, arrows: true }))}</div>
      <div class="player__info"><p class="eyebrow">${step.levelName}${step.sets > 1 ? ` · set ${step.set} of ${step.sets}` : ''}</p>
        <h1 class="display display--m">${exercise.name}</h1>
        ${step.side ? html`<p class="player__side stamp-in"><span class="tag tag--amber">${step.side} side</span></p>` : ''}
        <div class="player__clock"><span class="clock" id="pClock" data-rep="${repNow ?? ''}" role="timer" aria-label="${step.hold ? 'Hold time left' : 'Rep count'}">${step.hold ? clock(play.left) : `${repNow}/${step.reps}`}</span><span class="eyebrow" id="pUnit">${step.hold ? 'Hold' : `Reps · ${step.pace} s each`}</span></div>
        <p class="player__cue" id="pCue">${exercise.cues[play.cue % exercise.cues.length]}</p></div>
    </main>
    <footer class="player__nav">
      <button class="btn btn--quiet" type="button" data-act="pback" ${play.i === 0 ? 'disabled' : ''} aria-label="Previous step">${icon('arrow-left')}</button>
      <button class="btn ${play.paused ? '' : 'btn--quiet'} grow" type="button" data-act="ppause" id="pPause">${play.paused ? html`${icon('play')} Resume` : html`${icon('pause')} Pause`}</button>
      <button class="btn btn--quiet" type="button" data-act="pswap" aria-label="Use a different drill">${icon('arrow-left-right')}</button>
      <button class="btn btn--quiet" type="button" data-act="pskip">Skip ${icon('arrow-right')}</button>
    </footer>
    <p class="player__next">${upcoming ? `Next: ${EX[play.swapped[upcoming.id] ?? upcoming.id].name}${upcoming.side ? `, ${upcoming.side.toLowerCase()} side` : ''}` : 'Last one.'}</p>
  </div>`;
}
function tickPlayer(ctx) {
  if (!play || play.paused || play.intro || play.i < 0 || play.i >= play.steps.length) return;
  const step = play.steps[play.i]; const exercise = EX[play.swapped[step.id] ?? step.id];
  play.left -= 0.1; play.elapsed += 0.1;
  const clockEl = document.getElementById('pClock'); const fig = document.getElementById('pFig');
  if (step.hold) { if (clockEl) clockEl.textContent = clock(play.left); }
  else { const rep = Math.min(step.reps, Math.floor((step.seconds - play.left) / step.pace) + 1); if (clockEl && clockEl.dataset.rep !== String(rep)) { clockEl.dataset.rep = String(rep); clockEl.textContent = `${rep}/${step.reps}`; haptic('tap'); play.cue += 1; const cue = document.getElementById('pCue'); if (cue) cue.textContent = exercise.cues[play.cue % exercise.cues.length]; } }
  if (fig && motionOK()) {
    const phase = step.hold ? Math.min(1, (step.seconds - play.left) / 1.6) : ((step.seconds - play.left) % step.pace) / step.pace;
    const t = step.hold ? 0.5 - Math.cos(Math.PI * phase) / 2 : 0.5 - Math.cos(Math.PI * 2 * phase) / 2;
    const stamp = Math.round(t * 24); if (fig.dataset.t !== String(stamp)) { fig.dataset.t = String(stamp); fig.innerHTML = frame(exercise, { t: stamp / 24, ghost: true }); }
  }
  if (play.left <= 0) { haptic('set'); blip('set'); nextStep(ctx); }
}
function nextStep(ctx) { play.i += 1; play.cue = 0; if (play.i < play.steps.length) play.left = play.steps[play.i].seconds; else { haptic('done'); blip('done'); } ctx.refresh(); }

function finish(feel, offIds = []) {
  const move = store.get('move'); const session = play.session; const wasSingle = play.single; const wasShort = play.short;
  const used = { ...session, items: (wasShort ? session.short.items : session.items).map(item => ({ ...item })) };
  let result = { notes: [] };
  if (!wasSingle) {
    result = applyFeedback(move, used, feel, offIds, today());
    store.update('move', next => {
      next.levels = result.levels; next.streaks = result.streaks; next.ease = result.ease; next.paused = result.paused;
      next.sessions = [...next.sessions, { id: uid(), planId: next.plan.id, n: session.n, date: today(), short: wasShort, seconds: Math.round(play.elapsed), feel, off: offIds, drills: used.items.map(item => play.swapped[item.id] ?? item.id), skipped: play.skipped }];
      next.plan = { ...next.plan, done: Math.max(next.plan.done, session.n) };
    });
    touch(); if (wasShort) award('two-minutes');
    if (store.get('move').sessions.length === 7) award('day-seven');
  }
  const after = store.get('move'); const complete = !wasSingle && after.plan.done >= PLANS[after.plan.kind].sessions;
  const retest = !wasSingle && ['retest', 'checkin'].includes(session.kind);
  play = null; clearInterval(ticker);
  sheet({ title: feel === 'off' ? 'Paused, not stopped' : 'Logged', eyebrow: wasSingle ? 'Single drill' : `Day ${session.n} of ${session.of}`,
    body: html`${result.notes.length ? html`<p class="eyebrow">What changes next time</p><ul class="dots">${result.notes.map(note => html`<li>${note}</li>`)}</ul>` : html`<p class="muted">Practice logged.</p>`}
      ${feel === 'off' ? html`<div class="note note--warn"><p>If what you felt is on the get-checked list, or it is still there tomorrow, have someone look at it. Until you resume it, that drill stays at its easiest version.</p><a class="btn btn--quiet btn--sm" href="#/move/check" data-act="__close">When to get checked</a></div>` : ''}
      ${retest ? html`<div class="note"><p>This was a retest day. A one-minute check gives you something to compare.</p></div>` : ''}`,
    footer: html`${retest ? html`<button class="btn btn--quiet" type="button" data-act="check">Do the check</button>` : ''}<button class="btn" type="button" data-act="ok">${complete ? 'See the recap' : 'Done'}</button>`,
    actions: { ok: (_d, _e, _ev, self) => { self.close(); location.hash = complete ? '#/move/done' : '#/move'; }, check: (_d, _e, _ev, self) => { self.close(); location.hash = complete ? '#/move/done' : '#/move'; setTimeout(checkSheet, 350); } },
    onClose: () => { if (location.hash.startsWith('#/move/play')) location.hash = complete ? '#/move/done' : '#/move'; } });
}

// ---------- sheets ----------
function focusSheet(preselect) {
  const move = store.get('move'); const base = move.setup ?? defaultSetup();
  let primary = preselect ?? move.plan?.primary ?? base.primary; let secondary = move.plan?.secondary ?? base.secondary; let equipment = { ...base.equipment }; let firstSide = base.firstSide ?? 'left';
  if (secondary === primary) secondary = null;
  sheet({ title: 'Focus and equipment', eyebrow: move.plan ? 'Change the plan' : 'Before day 1',
    body: () => html`<p class="eyebrow">Main focus</p><div class="stack--s">${Object.values(LANES).map(lane => html`<button class="frame frame--press" type="button" aria-pressed="${primary === lane.id ? 'true' : 'false'}" data-act="p" data-l="${lane.id}" style="${primary === lane.id ? 'border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)' : ''}"><div class="frame__body"><p class="title">${lane.name}</p><p class="tiny muted">${lane.line}</p></div></button>`)}</div>
      <p class="eyebrow">Second focus (optional, smaller share)</p><div class="chips"><button class="chip" type="button" aria-pressed="${secondary ? 'false' : 'true'}" data-act="s" data-l="">None</button>${Object.values(LANES).filter(lane => lane.id !== primary).map(lane => html`<button class="chip" type="button" aria-pressed="${secondary === lane.id ? 'true' : 'false'}" data-act="s" data-l="${lane.id}">${lane.short}</button>`)}</div>
      <p class="eyebrow">What you have</p><div class="chips">${Object.entries(EQUIPMENT).map(([key, label]) => html`<button class="chip" type="button" aria-pressed="${equipment[key] ? 'true' : 'false'}" data-act="e" data-k="${key}">${label}</button>`)}</div>
      <p class="eyebrow">Single-leg drills start on your</p><div class="segc"><button type="button" aria-pressed="${firstSide === 'left' ? 'true' : 'false'}" data-act="side" data-s="left">Left</button><button type="button" aria-pressed="${firstSide === 'right' ? 'true' : 'false'}" data-act="side" data-s="right">Right</button></div>
      ${move.plan && (primary !== move.plan.primary || (secondary ?? null) !== (move.plan.secondary ?? null)) ? html`<div class="note"><p>Changing the focus starts a fresh 7 days. Your session history and the levels you reached are kept.</p></div>` : ''}`,
    footer: html`<button class="btn btn--block" type="button" data-act="save">${move.plan ? 'Save' : 'Save and start day 1'}</button>`,
    actions: {
      p: (d, _e, _ev, self) => { primary = d.l; if (secondary === primary) secondary = null; self.update(); },
      s: (d, _e, _ev, self) => { secondary = d.l || null; self.update(); },
      e: (d, _e, _ev, self) => { equipment = { ...equipment, [d.k]: !equipment[d.k] }; self.update(); },
      side: (d, _e, _ev, self) => { firstSide = d.s; self.update(); },
      save: (_d, _e, _ev, self) => {
        const current = store.get('move');
        const changed = !current.plan || primary !== current.plan.primary || (secondary ?? null) !== (current.plan.secondary ?? null);
        store.update('move', next => { next.setup = { ...(next.setup ?? defaultSetup()), primary, secondary, equipment, firstSide }; });
        if (changed) { startPlan('week', primary, secondary); toast(current.plan ? 'New 7 days started with your new focus.' : 'Plan set.'); }
        self.close();
        if (!current.plan) { const { session } = movementToday(); play = null; startPlayer(session); if (play) play.intro = false; }
      },
    } });
}

function checkSheet() {
  const move = store.get('move'); const values = {}; let flag = false; let area = move.plan?.primary ?? 'pelvis'; let showMeasures = false;
  sheet({ title: 'Quick check', eyebrow: 'Optional · about a minute',
    body: () => html`<p class="muted small">Rate how each feels today, 1 to 5. Skip any that do not apply.</p>
      ${CHECKS.map(item => html`<div><p class="title" style="font-size:.98rem">${item.label}</p><div class="segc" role="group" aria-label="${item.label}" style="margin-top:6px">${[1, 2, 3, 4, 5].map(n => html`<button type="button" aria-pressed="${values[item.id] === n ? 'true' : 'false'}" data-act="rate" data-id="${item.id}" data-v="${n}">${n}</button>`)}</div><div class="spread tiny muted"><span>${item.lo}</span><span>${item.hi}</span></div></div>`)}
      <button class="switch" type="button" role="switch" aria-checked="${showMeasures ? 'true' : 'false'}" data-act="measures"><span class="switch__t"><span class="title" style="font-size:.98rem">Add two measures</span><span class="tiny muted" style="display:block">One-leg hold time and knee-to-wall distance, per side.</span></span><span class="switch__k"></span></button>
      ${showMeasures ? html`<div class="grid2">${MEASURES.map(item => html`<label class="field"><span class="field__l">${item.label} (${item.unit})</span><input class="input input--num" inputmode="decimal" data-change="measure" data-id="${item.id}" value="${values[item.id] ?? ''}" aria-describedby="h-${item.id}"><span class="hint" id="h-${item.id}">${item.hint}</span></label>`)}</div><p class="tiny muted">Left and right are recorded side by side. Forme does not turn the difference into a score or a prescription.</p>` : ''}
      <button class="switch" type="button" role="switch" aria-checked="${flag ? 'true' : 'false'}" data-act="flag"><span class="switch__t"><span class="title" style="font-size:.98rem">Something needs attention</span><span class="tiny muted" style="display:block">Pain that is getting worse, giving way, numbness, new weakness, or a recent injury.</span></span><span class="switch__k"></span></button>
      ${flag ? html`<p class="eyebrow">Where</p><div class="chips">${Object.values(LANES).map(lane => html`<button class="chip chip--mark" type="button" aria-pressed="${area === lane.id ? 'true' : 'false'}" data-act="area" data-l="${lane.id}">${lane.short}</button>`)}</div><div class="note note--warn"><p>Saving this pauses progression for every ${LANES[area].short.toLowerCase()} drill and keeps the easiest versions only. <a href="#/move/check" data-act="__close">When to get checked</a> lists what to do next.</p></div>` : ''}`,
    footer: html`<button class="btn btn--quiet" type="button" data-act="__close">Discard</button><button class="btn" type="button" data-act="save">Save check</button>`,
    changes: { measure: (d, el) => { const n = Number(el.value); if (el.value.trim() === '' || !Number.isFinite(n) || n < 0) delete values[d.id]; else values[d.id] = n; } },
    actions: {
      rate: (d, _e, _ev, self) => { if (values[d.id] === Number(d.v)) delete values[d.id]; else values[d.id] = Number(d.v); self.update(); },
      measures: (_d, _e, _ev, self) => { showMeasures = !showMeasures; self.update(); },
      flag: (_d, _e, _ev, self) => { flag = !flag; self.update(); },
      area: (d, _e, _ev, self) => { area = d.l; self.update(); },
      save: (_d, _e, _ev, self) => {
        if (!Object.keys(values).length && !flag) return toast('Rate at least one line, or discard.');
        store.update('move', next => {
          next.checks = [...next.checks, { id: uid(), at: new Date().toISOString(), date: today(), planId: next.plan?.id ?? null, ...values, flag: flag ? area : null }];
          if (flag) { next.paused = { ...(next.paused ?? {}) }; for (const id of LANES[area].order) if (!next.paused[id]) { next.paused[id] = { on: today(), level: next.levels?.[id] ?? 0 }; next.levels = { ...(next.levels ?? {}), [id]: 0 }; } }
        });
        self.close();
        if (flag) { toast(`${LANES[area].short} progression is paused.`); location.hash = '#/move/check'; } else toast('Check saved.');
      },
    } });
}

function offSheet(ctx) {
  const ids = [...new Set((play.short ? play.session.short.items : play.session.items).map(item => item.id))]; const chosen = new Set();
  sheet({ title: 'What felt off?', eyebrow: 'Pick any that apply',
    body: () => html`<div class="chips">${ids.map(id => html`<button class="chip chip--mark" type="button" aria-pressed="${chosen.has(id) ? 'true' : 'false'}" data-act="pick" data-id="${id}">${EX[id].name}</button>`)}</div><p class="tiny muted">Leave all unpicked if it was the whole session.</p>`,
    footer: html`<button class="btn btn--block" type="button" data-act="go">Pause and continue</button>`,
    actions: { pick: (d, _e, _ev, self) => { if (chosen.has(d.id)) chosen.delete(d.id); else chosen.add(d.id); self.update(); }, go: (_d, _e, _ev, self) => { self.close(); finish('off', [...chosen]); ctx.refresh(); } } });
}

export function render(ctx) {
  const sub = ctx.path[1]; const id = ctx.path[2];
  let body; let where = 'Move'; let bare = false; let live = true;
  if (sub === 'x') { body = EX[id] ? cardPage(EX[id]) : html`<div class="wrap studio"><div class="empty"><p class="empty__t">Unknown drill</p><a class="btn" href="#/move/library">Library</a></div></div>`; where = EX[id]?.name ?? 'Move'; }
  else if (sub === 'library') { body = libraryPage(); where = 'Drills'; }
  else if (sub === 'why') { body = whyPage(); where = 'Evidence'; }
  else if (sub === 'check') { body = checkPage(); where = 'Get checked'; }
  else if (sub === 'done') { body = donePage(); where = 'Recap'; }
  else if (sub === 'play') { body = playerPage(); where = 'Practice'; bare = Boolean(play); live = false; }
  else body = home();
  const exercise = sub === 'x' ? EX[id] : null;
  const setupEdit = change => store.update('move', move => { move.setup = change({ ...(move.setup ?? defaultSetup()) }); });
  return {
    room: 'studio', where, bare, live, body,
    after: () => { clearInterval(ticker); if (sub === 'play' && play && !play.intro) ticker = setInterval(() => tickPlayer(ctx), 100); if (exercise) { scrub = { id: exercise.id, t: 1, raf: 0 }; } },
    leave: () => { clearInterval(ticker); cancelAnimationFrame(scrub.raf); },
    inputs: { figscrub: (_d, el) => { if (!exercise) return; cancelAnimationFrame(scrub.raf); scrub.dragging = true; setScrub(exercise, Number(el.value) / 100); scrub.dragging = false; } },
    actions: {
      begin: () => { const setup = ensureSetup(); startPlan('week', setup.primary, setup.secondary); const { session } = movementToday(); startPlayer(session); },
      focus: d => focusSheet(d.l),
      play: () => { const { session } = movementToday(); if (session) startPlayer(session); },
      playshort: () => { const { session } = movementToday(); if (session) startPlayer(session, { short: true }); },
      single: d => { const move = store.get('move'); const ex = EX[d.id]; const level = Math.min(move.levels?.[ex.id] ?? 0, ex.levels.length - 1); const dose = ex.levels[level].dose ?? ex.dose; startPlayer({ n: 0, of: 0, kind: 'single', items: [], short: { items: [] } }, { single: { id: ex.id, level, levelName: ex.levels[level].name, change: ex.levels[level].change, dose, seconds: doseSeconds(dose) } }); },
      restday: () => { store.update('move', move => { move.rests = { ...(move.rests ?? {}), [today()]: true }; }); toast('Rest day. Tomorrow picks up at the same session.'); },
      resume: d => { const result = resumeDrill(store.get('move'), d.id); store.update('move', move => { move.paused = result.paused; move.levels = result.levels; }); toast(`${EX[d.id].name} is back at its earlier level.`); },
      checkin: () => checkSheet(),
      lane: d => { whyLane = d.l; ctx.refresh(); },
      figplay: () => exercise && playScrub(exercise),
      figto: d => { if (!exercise) return; cancelAnimationFrame(scrub.raf); setScrub(exercise, Number(d.t), Number(d.t) === 1); document.querySelectorAll('.fig__thumb').forEach(el => el.setAttribute('aria-pressed', el.dataset.t === d.t ? 'true' : 'false')); },
      again: () => { const plan = store.get('move').plan; startPlan('week', plan.primary, plan.secondary); toast('A fresh 7 days, same focus.'); location.hash = '#/move'; },
      month: async () => { if (!await ask({ title: 'Start the 30-day plan?', text: 'Twenty sessions over about thirty days. You can stop whenever you like, and it will ask before continuing past the end.', yes: 'Start 30 days', eyebrow: 'Opt in' })) return; const plan = store.get('move').plan; startPlan('month', plan.primary, plan.secondary); location.hash = '#/move'; },
      stop: async () => { if (!await ask({ title: 'Stop for now?', text: 'Your sessions and checks are kept. Movement leaves Today until you start again.', yes: 'Stop for now' })) return; store.update('move', move => { move.pastPlans = [...(move.pastPlans ?? []), { ...move.plan, endedOn: today() }].slice(-12); move.plan = null; }); location.hash = '#/move'; },
      // player
      quit: async () => { if (play && !play.intro && play.i > 0 && play.i < play.steps.length && !await ask({ title: 'Leave the session?', text: 'This session will not be logged. Your plan stays on the same day.', yes: 'Leave', no: 'Keep going' })) return; play = null; clearInterval(ticker); location.hash = '#/move'; },
      iprimary: d => { setupEdit(setup => ({ ...setup, primary: d.l, secondary: setup.secondary === d.l ? null : setup.secondary })); },
      isecond: d => setupEdit(setup => ({ ...setup, secondary: d.l || null })),
      iequip: d => setupEdit(setup => ({ ...setup, equipment: { ...setup.equipment, [d.k]: !setup.equipment[d.k] } })),
      iside: d => setupEdit(setup => ({ ...setup, firstSide: d.s })),
      ibegin: () => { const setup = ensureSetup(); store.update('move', move => { move.plan = { ...move.plan, primary: setup.primary, secondary: setup.secondary }; }); const { session } = movementToday(); play = { ...play, session, steps: buildSteps(play.short ? session.short.items : session.items, setup.firstSide), i: -1, intro: false }; ctx.refresh(); },
      ppause: () => { if (!play) return; play.paused = !play.paused; ctx.refresh(); },
      pskip: () => { if (!play || play.i < 0 || play.i >= play.steps.length) return; play.skipped.push(play.steps[play.i].id); nextStep(ctx); },
      pback: () => { if (!play || play.i <= 0) return; play.i = Math.min(play.i, play.steps.length) - 1; play.left = play.steps[play.i].seconds; ctx.refresh(); },
      pswap: () => { const step = play.steps[play.i]; const current = play.swapped[step.id] ?? step.id; const setup = ensureSetup(); const options = [...new Set([...LANES[EX[step.id].lane].order, ...EXERCISES.filter(item => item.load === 'none').map(item => item.id)])].filter(other => other !== current && EX[other].equip.every(item => setup.equipment[item] !== false)).slice(0, 6); play.paused = true;
        sheet({ title: 'Use a different drill', eyebrow: `Instead of ${EX[current].name}`, body: html`<p class="small muted"><strong>Easier version first:</strong> ${EX[current].easier}</p><div class="list">${options.map(other => html`<button class="list__i list__i--tap" type="button" data-act="take" data-id="${other}"><span class="mthumb">${raw(frame(EX[other], { t: 1, targets: false }))}</span><span class="list__m"><span class="title">${EX[other].name}</span><span class="tiny muted" style="display:block">${EX[other].what}</span></span></button>`)}</div>`,
          actions: { take: (d, _e, _ev, self) => { play.swapped[step.id] = d.id; self.close(); } }, onClose: () => { if (play) { play.paused = false; ctx.refresh(); } } }); ctx.refresh(); },
      feel: d => { if (play.single) { play = null; clearInterval(ticker); toast('Practice done.'); location.hash = '#/move'; return; } if (d.f === 'off') offSheet(ctx); else { finish(d.f); } },
    },
  };
}
