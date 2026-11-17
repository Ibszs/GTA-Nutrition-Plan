// You: goal mode and targets, multi-week progress, settings, backup, and where everything came from.

import * as store from '../store.js';
import { html, raw, icon, sheet, ask, toast, today, addDays, fmtDay, sec, plural, fmt, round, num, download, extLink, meter } from '../ui.js';
import { logBody } from '../actions.js';
import { MODES, activeTargets, suggestTargets, guessMaintenance, weeklyAverages, weightTrend, readTrend, LB_PER_KG } from '../logic/nutrition.js';
import { GOAL_CLAIMS, GOAL_NOTE, SOURCES, CLAIMS, FOOD_SAFETY } from '../data/evidence.js';
import { PHOTOS, OTHER_CREDITS } from '../data/credits.js';
import { RECIPES } from '../data/recipes.js';
import { EXERCISES } from '../data/exercises.js';
import { liftHistory } from '../logic/lifts.js';
import { EXERCISES as LIFTS } from '../../assets/training-data.js';

export const VERSION = '4.0.0';
let logDay = today();

const PAPERS = [['rosa', 'Pink', '#f9bfcb'], ['sky', 'Sky', '#a9d3f2'], ['butter', 'Butter', '#f5dc7d'], ['news', 'Grey', '#d9d7d2']];
const back = (label = 'You', to = 'you') => html`<a class="linkish linkish--quiet" href="#/${to}">${icon('arrow-left', 'ic--sm')} ${label}</a>`;

function hub() {
  const profile = store.get('profile'); const targets = activeTargets(profile); const fun = store.get('fun'); const priv = store.get('priv');
  const rows = [
    ['you/goal', 'target', 'Goal and targets', `${MODES[profile.mode].name}${targets ? ` · ${fmt(targets.kcal)} kcal · ${targets.protein} g protein` : ' · set your weight'}`],
    ['you/progress', 'chart-no-axes-combined', 'Progress', 'Weight, waist and lifts across weeks'],
    ['habits', 'check-check', 'Habits', `${plural(store.get('habits').habits.filter(habit => !habit.archived).length, 'habit')}`],
    ['reset', 'rotate-ccw', 'Reset', 'Short actions for a bad afternoon'],
    ['private', 'lock', 'Private', priv.enabled ? 'A minute is on' : 'Opt-in, off the main screens'],
    ['fun', 'sparkles', 'Stickers, quests and replays', fun.enabled ? `${Object.keys(fun.stickers).length} stickers` : 'Off'],
    ['you/settings', 'sliders-horizontal', 'Settings', 'Appearance, diet, motion, sound'],
    ['you/data', 'download', 'Backup and data', 'Export, import, what is stored'],
    ['you/credits', 'info', 'Credits and sources', 'Photos, creators, studies'],
  ];
  return html`<div class="wrap cut">
    <header><p class="eyebrow">You</p><h1 class="display display--l">${profile.name || 'Forme'}</h1>
      <p class="muted">${profile.weight ? `${fmt(profile.weight, 1)} lb · ` : ''}${MODES[profile.mode].name}. Everything is stored in this browser only.</p></header>
    <div class="list">${rows.map(([route, glyph, title, note]) => html`<a class="list__i list__i--tap" href="#/${route}"><span class="icon-btn icon-btn--line" aria-hidden="true">${icon(glyph)}</span><span class="list__m"><span class="title">${title}</span><span class="tiny muted" style="display:block">${note}</span></span><span class="list__e">${icon('chevron-right')}</span></a>`)}</div>
    <p class="tiny muted">Forme ${VERSION}. Rebuilt from Form & Fuel 3.0; your earlier journals are intact.</p>
  </div>`;
}

// ---------- goal ----------
function goalPage() {
  const profile = store.get('profile'); const mode = profile.mode;
  const maintenance = profile.maintenance ?? (profile.weight ? guessMaintenance(profile.weight, profile.activity) : null);
  const kg = profile.weight ? profile.weight / LB_PER_KG : null;
  return html`<div class="wrap cut">${back()}
    <header><h1 class="display display--l">Goal</h1><p class="muted" style="margin-top:10px">Pick one of two. You can switch at any time and your logs, saved recipes and history are kept.</p></header>
    <div class="segc" role="group" aria-label="Goal mode">${Object.values(MODES).map(item => html`<button type="button" aria-pressed="${mode === item.id ? 'true' : 'false'}" data-act="mode" data-m="${item.id}">${item.name}</button>`)}</div>
    <div class="cols">${Object.values(MODES).map(item => html`<section class="frame ${mode === item.id ? 'frame--lift' : ''}" style="${mode === item.id ? 'border-color:var(--accent)' : ''}"><div class="frame__head"><span>${item.name}</span><span>${mode === item.id ? 'Current' : 'Other option'}</span></div><div class="frame__body">
      <p>${item.plain}</p><p class="small"><strong>Pace.</strong> ${item.pace}</p>
      <p class="eyebrow">What you watch, over weeks</p><ul class="dots">${item.watch.map(line => html`<li>${line}</li>`)}</ul><p class="small"><strong>When to adjust.</strong> ${item.adjust}</p></div></section>`)}</div>

    <section class="frame" aria-label="Your numbers"><div class="frame__head"><span>Your numbers</span><span>All editable</span></div><div class="frame__body">
      <div class="grid2"><label class="field"><span class="field__l">Current weight (lb)</span><input class="input input--num" id="gWeight" inputmode="decimal" value="${profile.weight ?? ''}" placeholder="180" data-change="weight"></label>
        <label class="field"><span class="field__l">Maintenance guess (kcal)</span><input class="input input--num" id="gMaint" inputmode="numeric" value="${maintenance ?? ''}" placeholder="2900" data-change="maint"></label></div>
      <div><p class="eyebrow">Your day job</p><div class="segc" style="margin-top:6px" role="group" aria-label="Activity at work">${[['desk', 'Mostly seated'], ['feet', 'On my feet'], ['heavy', 'Heavy manual']].map(([id, label]) => html`<button type="button" aria-pressed="${profile.activity === id ? 'true' : 'false'}" data-act="activity" data-a="${id}">${label}</button>`)}</div></div>
      <p class="tiny muted">Maintenance is a starting guess from your weight and how active your job is${profile.maintenance ? ' (you set this one yourself)' : ''}. It is a rough estimate. Two to four weeks of weigh-ins will correct it.${profile.maintenance ? html` <button class="linkish" style="min-height:0" type="button" data-act="unmaint">Use the guess again</button>` : ''}</p>
    </div></section>

    ${Object.values(MODES).map(item => { const t = activeTargets(profile, item.id); const suggested = profile.weight && maintenance ? suggestTargets(profile.weight, maintenance, item.id) : null; const saved = profile.targets[item.id];
    return html`<section class="frame" aria-label="${item.name} targets"><div class="frame__head"><span>${item.name} targets</span><span>${!t ? 'Needs your weight' : t.source === 'carried' ? 'Carried from your old plan' : t.source === 'saved' ? 'Set by you' : 'Suggested'}</span></div><div class="frame__body">
        ${t ? html`<div class="grid2">${[['kcal', 'Calories'], ['protein', 'Protein (g)'], ['fat', 'Fat (g)'], ['carbs', 'Carbs (g)']].map(([key, label]) => html`<label class="field"><span class="field__l">${label}</span><input class="input input--num" inputmode="numeric" value="${t[key]}" data-change="target" data-m="${item.id}" data-k="${key}"></label>`)}</div>
          ${kg ? html`<p class="tiny muted">That is ${fmt(t.protein / kg, 1)} g protein and ${fmt(t.fat / kg, 1)} g fat per kg of body weight. Reviews put protein for muscle gain at 1.6 to 2.2 g per kg and fat at 0.5 to 1.5 g per kg.</p>` : ''}
          ${suggested && saved ? html`<p class="small">Forme’s suggestion from your weight: ${fmt(suggested.kcal)} kcal, ${suggested.protein} g protein, ${suggested.fat} g fat, ${suggested.carbs} g carbs. <button class="linkish" style="min-height:0" type="button" data-act="usesuggest" data-m="${item.id}">Use it</button></p>` : ''}
          ${t.source === 'carried' ? html`<p class="small muted">These came from your earlier 16-week plan, which aimed higher than a slow lean gain needs. Compare them with the suggestion before you keep them.</p>` : ''}`
    : html`<p class="muted small">Enter your weight above and Forme suggests a starting point. You can overwrite every number.</p>`}
      </div></section>`; })}

    <section class="frame" aria-label="Long-term marker"><div class="frame__head"><span>Long-term marker</span><span>An ambition, not a forecast</span></div><div class="frame__body">
      <label class="field"><span class="field__l">Long-term target (lb)</span><input class="input input--num" inputmode="decimal" value="${profile.longTerm ?? ''}" data-change="longterm"></label>
      <p class="small">${GOAL_NOTE}</p></div></section>

    <section class="frame" aria-label="Whey label"><div class="frame__head"><span>Your whey, per scoop</span><span>${profile.whey.custom ? 'From your tub' : 'Assumed label'}</span></div><div class="frame__body">
      <div class="grid2">${[['kcal', 'Calories'], ['protein', 'Protein (g)'], ['carbs', 'Carbs (g)'], ['fat', 'Fat (g)']].map(([key, label]) => html`<label class="field"><span class="field__l">${label}</span><input class="input input--num" inputmode="decimal" value="${profile.whey[key]}" data-change="whey" data-k="${key}"></label>`)}</div>
      <p class="tiny muted">Used anywhere a recipe has whey in it, so the shake totals match your tub.</p></div></section>

    <details class="fold"><summary>Where this guidance comes from</summary><div class="fold__b">${GOAL_CLAIMS.map(claim => html`<p class="small">${claim.text} <span class="muted">${claim.level}; ${claim.who}; ${claim.span}. ${extLink(SOURCES[claim.src].url, SOURCES[claim.src].cite.split('.')[0])}, ${SOURCES[claim.src].date}.</span></p>`)}<p class="tiny muted">Forme is a planning tool, not a dietitian. If you have a medical condition, or your weight is moving in a way that worries you, talk to a clinician.</p></div></details>
    ${profile.modeHistory?.length ? html`<details class="fold"><summary>Mode history</summary><div class="fold__b"><ul class="dots">${[...profile.modeHistory].reverse().map(item => html`<li>${fmtDay(item.on, { day: 'numeric', month: 'short', year: 'numeric' })}: ${MODES[item.from]?.name} to ${MODES[item.to]?.name}</li>`)}</ul></div></details>` : ''}
  </div>`;
}

// ---------- progress ----------
function spark(values, { width = 300, height = 70, mark = false } = {}) {
  const points = values.filter(item => Number.isFinite(item.v));
  if (points.length < 2) return html`<p class="tiny muted">Two or more weeks with entries draws the line.</p>`;
  const min = Math.min(...points.map(p => p.v)); const max = Math.max(...points.map(p => p.v)); const span = max - min || 1;
  const x = i => 6 + (i / (points.length - 1)) * (width - 12); const y = v => height - 8 - ((v - min) / span) * (height - 18);
  return raw(`<svg viewBox="0 0 ${width} ${height}" class="spark" role="img" aria-label="Trend from ${round(points[0].v, 1)} to ${round(points.at(-1).v, 1)} over ${points.length} weeks"><polyline points="${points.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')}" fill="none" stroke="${mark ? 'var(--ink-2)' : 'var(--accent)'}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>${points.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${i === points.length - 1 ? 4 : 2.4}" fill="${mark ? 'var(--ink-2)' : 'var(--accent)'}"/>`).join('')}<text x="6" y="10" class="spark__t">${round(max, 1)}</text><text x="6" y="${height - 1}" class="spark__t">${round(min, 1)}</text></svg>`);
}

function progressPage() {
  const profile = store.get('profile'); const body = store.get('body'); const entries = body.entries;
  const trend = weightTrend(entries, 6); const reading = readTrend(weightTrend(entries, 4), profile.mode);
  const weights = weeklyAverages(entries, 'weight').slice(-8); const waists = weeklyAverages(entries, 'waist').slice(-8);
  const entry = entries[logDay] ?? {};
  const training = store.training.read().value;
  const lifts = ['flat', 'incline', 'row', 'pulldown', 'squat', 'legpress', 'rdl', 'legcurl'].map(id => ({ id, rows: liftHistory(training?.sessions ?? [], id, 8) })).filter(item => item.rows.length >= 2);
  const days = Object.keys(entries).sort().reverse().slice(0, 14);
  const targets = activeTargets(profile);
  return html`<div class="wrap cut">${back()}
    <header><h1 class="display display--l">Progress</h1><p class="muted" style="margin-top:10px">Weekly averages for weight and waist, and your top sets. All of it is optional. Forme does not forecast when you will reach a weight or how you will look.</p></header>

    <section class="frame" aria-label="Log"><div class="frame__head"><span>Log</span><span>${fmtDay(logDay, { weekday: 'short', day: 'numeric', month: 'short' })}</span></div><div class="frame__body">
      <div class="segc" role="group" aria-label="Day"><button type="button" aria-pressed="${logDay === addDays(today(), -1) ? 'true' : 'false'}" data-act="logday" data-d="${addDays(today(), -1)}">Yesterday</button><button type="button" aria-pressed="${logDay === today() ? 'true' : 'false'}" data-act="logday" data-d="${today()}">Today</button></div>
      <div class="grid2">${[['weight', 'Weight (lb)', 'decimal'], ['waist', 'Waist (in)', 'decimal'], ['sleep', 'Sleep (h)', 'decimal'], ['kcal', 'Calories eaten', 'numeric'], ['protein', 'Protein eaten (g)', 'numeric']].map(([key, label, modeAttr]) => html`<label class="field"><span class="field__l">${label}</span><input class="input input--num" inputmode="${modeAttr}" value="${entry[key] ?? ''}" data-change="body" data-k="${key}" id="b-${key}"></label>`)}</div>
      <p class="tiny muted">Weigh after the bathroom, before breakfast. Measure the waist at the navel, relaxed. Calories and protein are only worth logging if you already track them.</p></div></section>

    <section class="frame" aria-label="Weight trend"><div class="frame__head"><span>Weight, weekly average</span><span>${trend.enough ? `${trend.perWeek > 0 ? '+' : ''}${fmt(trend.perWeek, 2)} lb a week` : 'Not enough yet'}</span></div><div class="frame__body">
      ${spark(weights.map(w => ({ v: w.avg })))}
      <p>${reading.text}</p>
      ${trend.enough ? html`<p class="tiny muted">${fmt(trend.from, 1)} to ${fmt(trend.to, 1)} lb across ${plural(Number(fmt(trend.spanWeeks, 0)), 'week')}, ${trend.ratePct > 0 ? '+' : ''}${fmt(trend.ratePct, 2)}% of body weight a week. Weeks with fewer than three weigh-ins are left out.</p>` : ''}
      ${profile.longTerm && profile.weight ? html`<p class="tiny muted">Long-term marker: ${fmt(profile.longTerm)} lb, ${fmt(Math.abs(profile.longTerm - profile.weight), 1)} lb from today’s ${fmt(profile.weight, 1)}. Shown for orientation only.</p>` : ''}</div></section>

    <section class="frame" aria-label="Waist trend"><div class="frame__head"><span>Waist, weekly average</span><span>${waists.length ? `${fmt(waists.at(-1).avg, 1)} in` : 'Optional'}</span></div><div class="frame__body">${waists.length >= 2 ? spark(waists.map(w => ({ v: w.avg })), { mark: true }) : html`<p class="muted small">Log a waist measurement once a week if you want a second signal. In a lean gain, weight rising while the waist holds is the pattern to look for; in a recomp, weight flat while the waist eases.</p>`}</div></section>

    <section class="frame" aria-label="Gym performance"><div class="frame__head"><span>Gym performance</span><span>Top sets</span></div><div class="frame__body">
      ${lifts.length ? html`<div class="list">${lifts.map(lift => { const first = lift.rows[0]; const last = lift.rows.at(-1); const change = first.value ? ((last.value - first.value) / first.value) * 100 : 0; return html`<a class="list__i list__i--tap" href="#/train/x/${lift.id}"><span class="list__m"><span class="title">${LIFTS[lift.id].name}</span><span class="data num" style="display:block">${first.loaded ? `${fmt(first.load, 1)}×${first.reps}` : `${first.reps}r`} → ${last.loaded ? `${fmt(last.load, 1)}×${last.reps}` : `${last.reps}r`}</span></span><span class="list__e data num">${change >= 0 ? '+' : ''}${fmt(change, 0)}%</span></a>`; })}</div><p class="tiny muted">Change in estimated max between your first and latest logged top set, last 8 sessions. Different variations are not strictly comparable.</p>`
    : html`<p class="muted small">Once a movement has two logged sessions, its top sets line up here. Holding or adding reps is the clearest sign either goal mode is working.</p>`}</div></section>

    ${targets && days.some(day => entries[day].kcal) ? html`<section class="frame"><div class="frame__head"><span>Intake, last 14 logged days</span><span>Against your target</span></div><div class="frame__body">${(() => { const logged = days.filter(day => Number.isFinite(entries[day].kcal)); const avg = logged.reduce((sum, day) => sum + entries[day].kcal, 0) / logged.length; const p = days.filter(day => Number.isFinite(entries[day].protein)); const avgP = p.length ? p.reduce((sum, day) => sum + entries[day].protein, 0) / p.length : null; return html`<p>${fmt(round(avg / 10) * 10)} kcal a day on average across ${plural(logged.length, 'logged day')}${avgP ? `, ${round(avgP)} g protein` : ''}. Target: ${fmt(targets.kcal)} kcal, ${targets.protein} g.</p>${meter(avg / targets.kcal, 'meter--amber')}`; })()}</div></section>` : ''}

    <section aria-label="Entries">${sec('Recent entries', html`<button type="button" data-act="csv">Export CSV</button>`)}
      ${days.length ? html`<div class="list">${days.map(day => { const e = entries[day]; return html`<button class="list__i list__i--tap" type="button" data-act="logday" data-d="${day}"><span class="list__m"><span class="title">${fmtDay(day, { weekday: 'short', day: 'numeric', month: 'short' })}</span><span class="tiny muted" style="display:block">${[e.weight ? `${e.weight} lb` : '', e.waist ? `${e.waist} in` : '', e.sleep ? `${e.sleep} h` : '', e.kcal ? `${e.kcal} kcal` : '', e.protein ? `${e.protein} g protein` : '', e.note ?? ''].filter(Boolean).join(' · ') || 'Empty'}</span></span><span class="list__e">${icon('pencil', 'ic--sm')}</span></button>`; })}</div>` : html`<div class="empty"><p class="empty__t">No entries yet</p><p class="muted small">A weight a few mornings a week is enough to start.</p></div>`}</section>
  </div>`;
}

// ---------- settings ----------
function settingsPage() {
  const profile = store.get('profile'); const ui = store.get('ui'); const fun = store.get('fun');
  const toggle = (act, on, title, hint) => html`<button class="switch" type="button" role="switch" aria-checked="${on ? 'true' : 'false'}" data-act="${act}"><span class="switch__t"><span class="title" style="font-size:.98rem">${title}</span>${hint ? html`<span class="tiny muted" style="display:block">${hint}</span>` : ''}</span><span class="switch__k"></span></button>`;
  return html`<div class="wrap cut">${back()}
    <header><h1 class="display display--l">Settings</h1></header>
    <section class="frame"><div class="frame__head"><span>You</span><span>Optional</span></div><div class="frame__body"><label class="field"><span class="field__l">Name</span><input class="input" maxlength="30" value="${profile.name}" placeholder="Shown on the You screen and as the initial in the top bar" data-change="name"></label></div></section>
    <section class="frame"><div class="frame__head"><span>Food</span><span>Used by every recipe</span></div><div class="frame__body">
      ${toggle('halal', profile.diet.halal, 'Halal-friendly ingredients', 'Meat is listed as halal-certified and recipes flag broths, cheeses and rotisserie chicken that often are not.')}
      <div class="switch" aria-disabled="true"><span class="switch__t"><span class="title" style="font-size:.98rem">No seafood</span><span class="tiny muted" style="display:block">Always on. No fish, shellfish, fish sauce, oyster sauce, anchovy or Worcestershire in any recipe, sauce or seasoning. Recipes warn where a store-bought item might hide it.</span></span><span class="tag">Locked on</span></div>
      <div><p class="eyebrow">How hot do you like it</p><div class="segc" style="margin-top:6px">${[[1, 'Mild'], [2, 'Medium'], [3, 'Hot']].map(([value, label]) => html`<button type="button" aria-pressed="${profile.diet.heat === value ? 'true' : 'false'}" data-act="heat" data-v="${value}">${label}</button>`)}</div></div>
    </div></section>
    <section class="frame"><div class="frame__head"><span>Appearance</span><span>Applies to every screen</span></div><div class="frame__body">
      <div class="segc" role="group" aria-label="Appearance">${[['dark', 'Dark'], ['light', 'Light'], ['auto', 'Match device']].map(([id, label]) => html`<button type="button" aria-pressed="${(ui.theme ?? 'dark') === id ? 'true' : 'false'}" data-act="theme" data-v="${id}">${label}</button>`)}</div>
      <p class="tiny muted">Cook mode and the pause timer are always dark.${fun.enabled && fun.night ? ' Night Drive is on, which keeps everything dark until you turn it off.' : ''}</p>
      <p class="field__l" style="margin-top:16px">Paper</p>
      <div class="stocks" role="group" aria-label="Paper colour">${PAPERS.map(([id, label, swatch]) => html`<button class="stock" type="button" aria-pressed="${(ui.paper ?? 'rosa') === id ? 'true' : 'false'}" data-act="paper" data-v="${id}"><i style="--sw:${swatch}"></i>${label}</button>`)}</div>
      <p class="tiny muted">The colour Forme is printed on. Pink is the house colour.</p>
    </div></section>
    <section class="frame"><div class="frame__head"><span>Motion, sound, touch</span><span>All optional</span></div><div class="frame__body">
      <div><p class="eyebrow">Motion</p><div class="segc" style="margin-top:6px">${[['system', 'Follow device'], ['reduced', 'Reduced'], ['full', 'Full']].map(([id, label]) => html`<button type="button" aria-pressed="${ui.motion === id ? 'true' : 'false'}" data-act="motion" data-v="${id}">${label}</button>`)}</div><p class="tiny muted" style="margin-top:6px">Reduced swaps every animation for a plain state change. Timers and counts still update.</p></div>
      ${toggle('haptics', ui.haptics !== false, 'Haptics', 'A short buzz when you finish a set, tick a habit or a timer ends. Only on phones that support it.')}
      ${toggle('sound', ui.sound === true, 'Sounds', 'A soft tone for timers and finished sets. Off by default.')}
    </div></section>
    <section class="frame"><div class="frame__head"><span>Play</span><span></span></div><div class="frame__body">
      ${toggle('fun', fun.enabled, 'Stickers, quests and replays', 'Off hides them on every screen. Nothing is deleted.')}
      ${toggle('night', fun.enabled && fun.night, 'Night Drive', 'Slow streetlight sweeps across the top of every screen. The app stays dark while it is on.')}
    </div></section>
    <section class="frame"><div class="frame__head"><span>Today</span><span></span></div><div class="frame__body"><p class="small muted">Pin, hide and reorder the sections of Today with the "Edit layout" button at the bottom of that screen.</p><button class="btn btn--quiet btn--sm" type="button" data-act="layoutreset">Reset Today layout</button></div></section>
  </div>`;
}

// ---------- data ----------
function dataPage() {
  const ui = store.get('ui'); const report = ui.migrated;
  const counts = { workouts: store.training.read().value?.sessions?.length ?? 0, body: Object.keys(store.get('body').entries).length, cooked: Object.values(store.get('kitchen').recipes).reduce((sum, record) => sum + (record.cooked?.length ?? 0), 0), move: store.get('move').sessions.length, habits: store.get('habits').habits.length };
  const problems = store.SECTIONS.map(section => [section, store.sectionProblem(section)]).filter(([, problem]) => problem);
  return html`<div class="wrap cut">${back()}
    <header><h1 class="display display--l">Backup and data</h1><p class="muted" style="margin-top:10px">Forme has no account, no server and no analytics. Your logs live in this browser on this device. That also means clearing browser data deletes them, so export a backup now and then.</p></header>
    ${!store.isPersistent ? html`<div class="note note--bad"><p>This browser is blocking storage. Nothing you enter will survive closing the tab.</p></div>` : ''}
    ${problems.length ? html`<div class="note note--bad"><p><strong>Some saved data could not be read</strong> and has not been overwritten: ${problems.map(([section]) => section).join(', ')}. Export a backup, then restore an older one or reset those parts below.</p></div>` : ''}
    <section class="frame"><div class="frame__head"><span>On this device</span><span>${store.isPersistent ? 'Saved' : 'Temporary'}</span></div><div class="frame__body"><dl class="kv"><dt>Workouts</dt><dd>${counts.workouts}</dd><dt>Body-log days</dt><dd>${counts.body}</dd><dt>Meals cooked</dt><dd>${counts.cooked}</dd><dt>Movement sessions</dt><dd>${counts.move}</dd><dt>Habits</dt><dd>${counts.habits}</dd></dl>
      <div class="row row--wrap"><button class="btn grow" type="button" data-act="export">${icon('download')} Export everything</button><label class="btn btn--quiet grow" for="importFile">${icon('upload')} Import a backup</label><input class="vh" id="importFile" type="file" accept="application/json,.json" data-change="import"></div>
      <p class="tiny muted">One file holds everything, including the private log and private check-ins, so keep it somewhere only you can reach. Imports are checked before anything is written and rolled back if a write fails. Backups from Form & Fuel (versions 1 and 2) still import.</p></div></section>
    <section class="frame"><div class="frame__head"><span>From the earlier app</span><span>${report ? fmtDay(report.at.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span></div><div class="frame__body">
      <ul class="dots"><li>Training journal: used as is. Same sessions, drafts and program.</li><li>Progress tracker: ${report?.bodyDays ? `${plural(report.bodyDays, 'day')} copied into the new body log` : 'no daily entries to copy'}. The original is still stored untouched.</li><li>Targets: ${report?.targets ? 'your calorie and protein targets were carried into Lean gain' : 'none carried over'}.</li><li>Whey label: ${report?.whey ? 'carried over' : 'using the assumed label'}.</li><li>Saved recipes and notes: readable in the <a href="#/eat/archive">recipe archive</a>.</li><li>Custom shopping lists: under Groceries, "Your earlier store lists".</li><li>Private log: under <a href="#/private">Private</a>, unchanged.</li></ul>
      ${report?.notes?.length ? html`<div class="note note--warn">${report.notes.map(note => html`<p>${note}</p>`)}</div>` : ''}
      <details class="fold"><summary>Original reference documents</summary><div class="fold__b"><p class="small muted">The PDFs from the first version. Their guidance is superseded; they are kept because they are yours.</p><ul class="dots"><li><a href="GTA_16_Week_Nutrition_Plan.pdf" target="_blank" rel="noopener">16-week nutrition plan (PDF)</a></li><li><a href="Mothers_Sunday_Cooking_Sheet.pdf" target="_blank" rel="noopener">Sunday cooking sheet (PDF)</a></li><li><a href="Quick_Start_Card.pdf" target="_blank" rel="noopener">Quick start card (PDF)</a></li></ul></div></details></div></section>
    <section class="frame"><div class="frame__head"><span>App</span><span>Version ${VERSION}</span></div><div class="frame__body"><p class="small muted">Installed to your home screen, Forme works offline after the first visit. Demo videos and source links need a connection; nothing else does.</p><button class="btn btn--quiet btn--sm" type="button" data-act="update">Check for an update</button></div></section>
    <details class="fold"><summary>Reset one part</summary><div class="fold__b"><p class="small muted">Each button clears only that part of Forme on this device. Export first.</p><div class="stack--s">${[['kitchen', 'Kitchen: saves, ratings, weeks, batches'], ['move', 'Movement: plan, sessions, checks'], ['habits', 'Habits and their history'], ['body', 'Body log'], ['reset', 'Reset actions and check-ins'], ['fun', 'Stickers, quests, replays'], ['ui', 'Layout and app settings']].map(([section, label]) => html`<button class="btn btn--quiet btn--sm btn--block btn--left" type="button" data-act="wipe" data-s="${section}">${icon('trash', 'ic--sm')} ${label}</button>`)}</div><p class="tiny muted">The training journal and the private areas have their own delete controls where they live.</p></div></details>
  </div>`;
}

// ---------- credits ----------
function creditsPage() {
  const creators = RECIPES.filter(recipe => recipe.source.type === 'creator');
  const usedSources = [...new Set([...Object.values(CLAIMS).flat().map(claim => claim.src), ...GOAL_CLAIMS.map(claim => claim.src), ...FOOD_SAFETY.rules.map(rule => rule.src), 'lally2010', 'singh2024', 'gollwitzer2006', 'tapper2018', 'hlbcBack', 'hlbcAnkle', 'hlbcKnee', 'hlbcShoulder'])].filter(Boolean);
  return html`<div class="wrap cut">${back()}
    <header><h1 class="display display--l">Credits</h1><p class="muted" style="margin-top:10px">Every photo, recipe idea, typeface and study Forme uses, with its licence or link. Read or retrieved 16 to 17 Nov 2026.</p></header>
    ${sec('Recipe creators', plural(creators.length, 'recipe'))}
    <div class="list">${creators.map(recipe => html`<div class="list__i"><span class="list__m"><span class="title">${recipe.source.creator}, ${recipe.source.outlet}</span><span class="small" style="display:block">${extLink(recipe.source.url, recipe.source.title)}</span><span class="tiny muted" style="display:block">Adapted as <a href="#/eat/r/${recipe.id}">${recipe.short}</a>. Instructions rewritten; quantities and nutrition recalculated.</span></span></div>`)}</div>
    ${sec('Photographs', plural(Object.keys(PHOTOS).length, 'photo'))}
    <div class="list">${Object.entries(PHOTOS).map(([key, photo]) => html`<div class="list__i"><img src="${photo.file}" alt="" width="56" height="56" loading="lazy" style="width:56px;height:56px;object-fit:cover;border-radius:2px"><span class="list__m"><span class="title">${extLink(photo.source, photo.title)}</span><span class="tiny muted" style="display:block">${photo.creator ?? 'Unnamed photographer'} · ${extLink(photo.licenceUrl, photo.licence)} · via ${photo.via} · ${photo.changes}</span></span></div>`)}</div>
    <p class="tiny muted">Four dishes have no photo: no properly licensed picture matched them, so they use a designed text card instead of a stand-in.</p>
    ${sec('Everything else')}
    <div class="list">${OTHER_CREDITS.map(item => html`<div class="list__i"><span class="list__m"><span class="title">${item.url ? extLink(item.url, item.what) : item.what}</span><span class="tiny muted" style="display:block">${item.detail}</span></span></div>`)}</div>
    ${sec('Movement demo videos', plural(EXERCISES.filter(exercise => exercise.video).length, 'link'))}
    <div class="list">${EXERCISES.filter(exercise => exercise.video).map(exercise => html`<div class="list__i"><span class="list__m"><span class="title">${extLink(exercise.video.url, exercise.video.title)}</span><span class="tiny muted" style="display:block">${exercise.video.channel} · for <a href="#/move/x/${exercise.id}">${exercise.name}</a></span></span></div>`)}</div>
    ${sec('Studies and guidance', plural(usedSources.length, 'source'))}
    <div class="list">${usedSources.map(key => html`<div class="list__i"><span class="list__m"><span class="small">${extLink(SOURCES[key].url, SOURCES[key].cite)}</span><span class="tiny muted" style="display:block">${SOURCES[key].type} · ${SOURCES[key].date}</span></span></div>`)}</div>
  </div>`;
}

export function render(ctx) {
  const sub = ctx.path[1];
  const body = sub === 'goal' ? goalPage() : sub === 'progress' ? progressPage() : sub === 'settings' ? settingsPage() : sub === 'data' ? dataPage() : sub === 'credits' ? creditsPage() : hub();
  const where = { goal: 'Goal', progress: 'Progress', settings: 'Settings', data: 'Backup', credits: 'Credits' }[sub] ?? 'You';
  const setProfile = change => store.update('profile', change);
  const setMode = next => setProfile(profile => { if (profile.mode === next) return; profile.modeHistory = [...(profile.modeHistory ?? []), { from: profile.mode, to: next, on: today() }].slice(-40); profile.mode = next; });
  return { room: 'street', where, body,
    changes: {
      weight: (_d, el) => { const value = num(el.value); if (value === null || value < 60 || value > 600) return toast('Enter a weight in pounds.'); logBody(today(), { weight: value }); },
      maint: (_d, el) => { const value = num(el.value); setProfile(profile => { profile.maintenance = value && value > 1000 && value < 7000 ? Math.round(value) : null; }); },
      target: (d, el) => { const value = num(el.value); if (value === null || value <= 0) return toast('Enter a number.'); setProfile(profile => { const current = activeTargets(profile, d.m) ?? {}; profile.targets[d.m] = { kcal: current.kcal, protein: current.protein, fat: current.fat, carbs: current.carbs, [d.k]: Math.round(value) }; if (d.k !== 'carbs' && d.k !== 'kcal') { const t = profile.targets[d.m]; t.carbs = Math.max(0, Math.round((t.kcal - t.protein * 4 - t.fat * 9) / 4 / 5) * 5); } }); },
      longterm: (_d, el) => setProfile(profile => { profile.longTerm = num(el.value); }),
      whey: (d, el) => { const value = num(el.value); if (value === null || value < 0) return; setProfile(profile => { profile.whey = { ...profile.whey, [d.k]: value, custom: true }; }); },
      name: (_d, el) => setProfile(profile => { profile.name = el.value.trim(); }),
      body: (d, el) => { const value = el.value.trim() === '' ? null : num(el.value); if (el.value.trim() !== '' && (value === null || value < 0)) return toast('Numbers only.'); logBody(logDay, { [d.k]: value }); },
      import: async (_d, el) => { const file = el.files?.[0]; if (!file) return; try { const parsed = store.parseBackup(await file.text()); if (!await ask({ title: 'Replace what is here?', text: `This backup was exported ${fmtDay(parsed.exportedAt.slice(0, 10), { day: 'numeric', month: 'long', year: 'numeric' })}. It will replace the matching data on this device.`, yes: 'Import' })) return; const count = store.restoreBackup(parsed); toast(`Imported ${plural(count, 'section')}.`); } catch (error) { toast(`Not imported: ${error.message}`); } el.value = ''; },
    },
    actions: {
      mode: d => setMode(d.m),
      activity: d => setProfile(profile => { profile.activity = d.a; }),
      unmaint: () => setProfile(profile => { profile.maintenance = null; }),
      usesuggest: d => setProfile(profile => { profile.targets[d.m] = null; }),
      logday: d => { logDay = d.d; ctx.refresh(); window.scrollTo({ top: 0 }); },
      csv: () => { const entries = store.get('body').entries; const cell = value => { let text = String(value ?? ''); if (/^[=+@-]/.test(text)) text = `'${text}`; return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }; const lines = [['Date', 'Weight lb', 'Waist in', 'Sleep h', 'Calories', 'Protein g', 'Note'], ...Object.keys(entries).sort().map(day => [day, entries[day].weight, entries[day].waist, entries[day].sleep, entries[day].kcal, entries[day].protein, entries[day].note])].map(row => row.map(cell).join(',')); toast(download(`forme-body-log-${today()}.csv`, `﻿${lines.join('\r\n')}\r\n`, 'text/csv;charset=utf-8') ? 'CSV exported.' : 'Export is blocked in this browser.'); },
      halal: () => setProfile(profile => { profile.diet = { ...profile.diet, halal: !profile.diet.halal }; }),
      heat: d => setProfile(profile => { profile.diet = { ...profile.diet, heat: Number(d.v) }; }),
      motion: d => store.update('ui', ui => { ui.motion = d.v; }),
      theme: d => store.update('ui', ui => { ui.theme = d.v; }),
      paper: d => store.update('ui', ui => { ui.paper = d.v; }),
      haptics: () => store.update('ui', ui => { ui.haptics = ui.haptics === false; }),
      sound: () => store.update('ui', ui => { ui.sound = !ui.sound; }),
      fun: () => store.update('fun', fun => { fun.enabled = !fun.enabled; if (!fun.enabled) fun.night = false; }),
      night: () => store.update('fun', fun => { if (!fun.enabled) fun.enabled = true; fun.night = !fun.night; }),
      layoutreset: () => { store.update('ui', ui => { ui.modules = null; }); toast('Today is back to the default layout.'); },
      export: () => { try { const text = JSON.stringify(store.buildBackup(), null, 2); toast(download(`forme-backup-${today()}.json`, text) ? 'Backup exported. Keep the file somewhere private.' : 'Export is blocked in this browser.'); } catch (error) { toast(`Export failed: ${error.message}`); } },
      update: async () => { if (!('serviceWorker' in navigator)) return toast('This browser cannot install Forme for offline use.'); try { const registration = await navigator.serviceWorker.getRegistration(); if (!registration) return toast('Forme is running straight from the network here; there is nothing to update.'); await registration.update(); toast(registration.waiting || registration.installing ? 'An update is downloading.' : 'You are on the latest version.'); } catch { toast('Could not check. You may be offline.'); } },
      wipe: async d => { if (!await ask({ title: 'Reset this part?', text: 'It will be cleared on this device. This cannot be undone without a backup.', yes: 'Reset', danger: true })) return; store.resetSection(d.s); toast('Reset.'); },
    } };
}
