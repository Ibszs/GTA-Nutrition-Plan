// Private space. Two things live here, both off the main screens:
//   1. "A minute": opt-in urge support for any behaviour you want to change. Neutral wording,
//      a pause timer, something to do instead, optional notes, your own patterns. No scores.
//   2. Your private log from the earlier app (the T log), with the same data and the same key.
//      It is the first thing on the screen, as it was one tap from the eye icon before.
// Everything stays in this browser. Nothing here is treatment.

import * as store from '../store.js';
import { html, icon, sheet, ask, toast, haptic, blip, today, fmtDay, fmtTime, clock, sec, plural, uid, download, extLink, motionOK } from '../ui.js';
import { SUPPORT, SUPPORT_NOTE, URGE_CLAIMS, SOURCES } from '../data/evidence.js';
import { INTERVAL_HOURS, addPersonalEntry, validatePersonalState, referenceTime } from '../../assets/personal-state.js';

const SITUATIONS = ['Bored', 'Tired', 'Stressed', 'Alone', 'After work', 'Late night', 'On my phone', 'After an argument'];
const GROUNDING = ['Name five things you can see, four you can hear.', 'Cold water on your wrists and face.', 'Change rooms or step outside for the whole timer.', 'Ten slow breaths: four counts in, six out.', 'Put the phone in another room until the timer ends.'];
const OUTCOMES = [['passed', 'It passed'], ['instead', 'I did the other thing'], ['acted', 'I went ahead'], ['unsure', 'Not sure yet']];
let pause = null; // { until, total, started, situations:Set, note, helped:Set }
let pauseTimer = null;
let editing = null;

const bucket = hour => (hour < 6 ? 'Night' : hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : hour < 22 ? 'Evening' : 'Late');
function patterns(events) {
  const pauses = events.filter(event => event.kind === 'pause');
  const count = (list, pick) => list.reduce((map, item) => { for (const key of [].concat(pick(item) ?? [])) map[key] = (map[key] ?? 0) + 1; return map; }, {});
  const top = map => Object.entries(map).sort((a, b) => b[1] - a[1]);
  return { n: pauses.length, times: top(count(pauses, event => bucket(new Date(event.at).getHours()))), situations: top(count(pauses, event => event.situations)), helped: top(count(pauses.filter(event => ['passed', 'instead'].includes(event.outcome)), event => event.helped)), outcomes: count(pauses, event => event.outcome) };
}

// ---------- the pause ----------
function pauseScreen(priv) {
  const left = Math.max(0, (pause.until - Date.now()) / 1000); const over = left <= 0;
  return html`<div class="minute"><header class="minute__top"><button class="icon-btn" type="button" data-act="pclose" aria-label="Close without saving">${icon('x')}</button><p class="eyebrow grow" style="color:inherit;opacity:.7">A minute</p></header>
    <main class="minute__main">
      <div class="minute__ring ${motionOK() && !over ? 'minute__ring--breathe' : ''}" aria-hidden="true"></div>
      <p class="clock minute__clock" id="minuteClock" role="timer" aria-label="Time left">${clock(left)}</p>
      <p class="minute__line">${over ? 'Timer done. Take as long as you need.' : 'Nothing to decide right now. Wait for the timer to finish.'}</p>
      ${priv.instead ? html`<div class="minute__card"><p class="eyebrow" style="color:inherit;opacity:.7">What you said you would do instead</p><p class="title">${priv.instead}</p></div>` : ''}
      <div class="minute__card"><p class="eyebrow" style="color:inherit;opacity:.7">Or try one of these</p>
        <div class="chips" style="margin-top:8px">${GROUNDING.map((item, index) => html`<button class="chip" type="button" aria-pressed="${pause.helped.has(item) ? 'true' : 'false'}" data-act="ptry" data-i="${index}">${item}</button>`)}</div><p class="tiny" style="opacity:.7;margin-top:8px">Tap the ones you use. Later you can see which ones help.</p></div>
      <details class="fold minute__fold"><summary>Add a note about right now (optional)</summary><div class="fold__b"><div class="chips">${SITUATIONS.map(item => html`<button class="chip" type="button" aria-pressed="${pause.situations.has(item) ? 'true' : 'false'}" data-act="psit" data-s="${item}">${item}</button>`)}</div>
        <label class="field"><span class="field__l">In your words</span><textarea class="textarea" id="pnote" maxlength="300" data-input="pnote">${pause.note}</textarea></label></div></details>
    </main>
    <footer class="minute__foot"><p class="eyebrow" style="color:inherit;opacity:.7">How did it go?</p><div class="grid2">${OUTCOMES.map(([id, label]) => html`<button class="btn btn--quiet btn--sm" type="button" data-act="pdone" data-o="${id}">${label}</button>`)}</div>
      <div class="row"><button class="linkish linkish--quiet tiny grow" type="button" data-act="plater" style="color:inherit">Check in with me in 30 minutes</button><button class="linkish linkish--quiet tiny" type="button" data-act="pmore" style="color:inherit">+5 minutes</button></div></footer></div>`;
}

// ---------- the earlier private log ----------
function logSection() {
  const read = store.legacy.personal();
  if (read.error) return html`<div class="note note--bad"><p>The saved private log could not be read, so Forme has left it untouched: ${read.error}</p></div>`;
  const state = read.value; const entries = [...state.entries].sort((a, b) => b.at.localeCompare(a.at));
  let reference = null; try { reference = referenceTime(state); } catch { reference = null; }
  const local = value => { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const draft = editing ? state.entries.find(entry => entry.id === editing) : null;
  return html`
    <p class="small muted">Your entries from the earlier app, in the same place and format. This records what you did, not advice on what to do. No automatic or catch-up entries.</p>
    <div class="note" aria-live="polite"><p>${reference ? html`<strong>${INTERVAL_HOURS}-hour reference:</strong> ${fmtDay(local(reference).slice(0, 10), { weekday: 'short', day: 'numeric', month: 'short' })}, ${fmtTime(reference)}, counted from your newest entry.` : 'No entries yet. The reference time appears after the first one.'}</p></div>
    <form class="stack" data-form="plog">
      <div class="grid2"><label class="field"><span class="field__l">Actual date and time</span><input class="input" type="datetime-local" id="plAt" required value="${draft ? local(draft.at) : local(new Date())}" max="${local(new Date())}"></label>
        <label class="field"><span class="field__l">Amount (mg)</span><input class="input input--num" type="number" id="plAmt" min="0.1" max="10000" step="0.1" inputmode="decimal" required value="${draft ? draft.amountMg : entries[0]?.amountMg ?? ''}"></label></div>
      <label class="field"><span class="field__l">Site (optional)</span><input class="input" id="plSite" maxlength="80" value="${draft?.site ?? ''}"></label>
      <label class="field"><span class="field__l">Notes (optional)</span><textarea class="textarea" id="plNote" maxlength="500">${draft?.note ?? ''}</textarea></label>
      <div class="row row--wrap"><button class="btn btn--sm grow" type="submit">${draft ? 'Save changes' : 'Save entry'}</button>${draft ? html`<button class="btn btn--quiet btn--sm" type="button" data-act="lcancel">Cancel edit</button>` : ''}</div>
    </form>
    ${entries.length ? html`<div class="list">${entries.map(entry => html`<div class="list__i"><span class="list__m"><span class="title">${fmtDay(local(entry.at).slice(0, 10), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}, ${fmtTime(entry.at)}</span>
      <span class="tiny muted" style="display:block">${entry.amountMg} mg${entry.site ? ` · ${entry.site}` : ''}${entry.note ? ` · ${entry.note}` : ''}</span></span><span class="list__e"><button class="icon-btn" type="button" data-act="ledit" data-id="${entry.id}" aria-label="Edit this entry">${icon('pencil', 'ic--sm')}</button><button class="icon-btn" type="button" data-act="ldel" data-id="${entry.id}" aria-label="Delete this entry">${icon('trash', 'ic--sm')}</button></span></div>`)}</div>` : ''}
    <div class="row row--wrap"><button class="btn btn--quiet btn--sm grow" type="button" data-act="lexport">Export this log</button></div>
    <details class="fold"><summary>Health notes</summary><div class="fold__b"><p class="small">Share hormones, supplements and other drugs with your clinician. Arrange a baseline review and clinician-directed follow-up during and after use. Discuss blood pressure, blood count and hematocrit, cholesterol, kidney and liver function, sleep, mood and fertility. Normal results do not eliminate risk.</p>
      <p class="small">Chest pain, severe shortness of breath, fainting or sudden neurological symptoms need urgent medical care. This app does not prescribe drug management.</p>
      <p class="tiny muted">${extLink('https://www.health.nsw.gov.au/aod/Pages/pied-harm-min-quick-guide.aspx', 'NSW Health clinical guidance')}</p></div></details>`;
}

export function render(ctx) {
  const priv = store.get('priv');
  const personal = store.legacy.personal();
  const hasLog = (personal.value?.entries?.length ?? 0) > 0 || personal.error;
  const sub = ctx.path[1];
  if (sub === 'minute' && pause) {
    return { room: 'street', where: 'A minute', bare: true, live: false, body: pauseScreen(priv),
      after: () => { clearInterval(pauseTimer); pauseTimer = setInterval(() => { if (!pause) return clearInterval(pauseTimer); const left = (pause.until - Date.now()) / 1000; const el = document.getElementById('minuteClock'); if (el) el.textContent = clock(left); if (left <= 0 && !pause.rang) { pause.rang = true; haptic('done'); blip('timer'); ctx.refresh(); } }, 500); },
      leave: () => clearInterval(pauseTimer),
      inputs: { pnote: (_d, el) => { pause.note = el.value; } },
      actions: {
        ptry: d => { const item = GROUNDING[Number(d.i)]; if (pause.helped.has(item)) pause.helped.delete(item); else pause.helped.add(item); ctx.refresh(); },
        psit: d => { if (pause.situations.has(d.s)) pause.situations.delete(d.s); else pause.situations.add(d.s); ctx.refresh(); },
        pmore: () => { pause.until = Math.max(Date.now(), pause.until) + 300000; pause.rang = false; ctx.refresh(); },
        plater: () => { store.update('priv', next => { next.checkDue = new Date(Date.now() + 30 * 60000).toISOString(); }); toast('Forme will show a quiet check-in on Today in 30 minutes.'); },
        pdone: d => { const helped = [...pause.helped]; if (d.o === 'instead' && priv.instead && !helped.includes(priv.instead)) helped.push(priv.instead);
          store.update('priv', next => { next.events = [...next.events, { id: uid(), kind: 'pause', at: new Date(pause.started).toISOString(), seconds: Math.round((Date.now() - pause.started) / 1000), situations: [...pause.situations], note: pause.note.trim(), helped, outcome: d.o }].slice(-2000); next.checkDue = null; });
          pause = null; clearInterval(pauseTimer); toast(d.o === 'acted' ? 'Saved.' : 'Saved.'); location.hash = '#/private'; },
        pclose: async () => { if (!await ask({ title: 'Close without saving?', text: 'This check-in will be discarded.', yes: 'Discard', no: 'Keep going' })) return; pause = null; clearInterval(pauseTimer); location.hash = '#/private'; },
      } };
  }
  const stats = patterns(priv.events);
  const fresh = priv.events.filter(event => event.kind === 'fresh');
  const body = html`<div class="wrap cut">
    <a class="linkish linkish--quiet" href="#/you">${icon('arrow-left', 'ic--sm')} You</a>
    <header><p class="eyebrow">${icon('lock', 'ic--sm')} Stays on this device</p><h1 class="display display--l">Private</h1><p class="muted">Not encrypted, not password-protected, but kept off every main screen and out of sight unless you open it.</p></header>

    <details class="fold" ${hasLog || editing || ctx.query.has('log') ? 'open' : ''}><summary>T log</summary><div class="fold__b">${logSection()}</div></details>

    ${!priv.enabled ? html`<section class="frame"><div class="frame__head"><span>A minute</span><span>Off</span></div><div class="frame__body">
      <p class="title">Support for a behaviour you want to change.</p>
      <p class="small">Anything: scrolling, vaping, late-night snacking, something you would rather not name. You get one neutral button, "I need a minute", that starts a pause timer and shows what you decided to do instead. Optional notes build a picture of your own patterns. No streak counters, no badges, no judgement.</p>
      <p class="tiny muted">${SUPPORT_NOTE}</p>
      <button class="btn btn--block" type="button" data-act="enable">Turn it on</button></div></section>`
    : html`<button class="btn btn--block minute__go" type="button" data-act="start">I need a minute<span class="btn__sub">${priv.pauseMin}-minute pause · nothing is saved until you say so</span></button>
      ${priv.checkDue && new Date(priv.checkDue) <= new Date() ? html`<div class="note"><p><strong>You asked for a check-in.</strong> How are things now?</p><div class="row row--wrap">${OUTCOMES.slice(0, 3).map(([id, label]) => html`<button class="btn btn--quiet btn--xs" type="button" data-act="later" data-o="${id}">${label}</button>`)}<button class="btn btn--quiet btn--xs" type="button" data-act="later" data-o="">Dismiss</button></div></div>` : ''}

      <section class="frame"><div class="frame__head"><span>Your setup</span><span>Only you see this</span></div><div class="frame__body">
        <label class="field"><span class="field__l">What this is for (private, optional)</span><input class="input" id="pvLabel" maxlength="60" value="${priv.label}" placeholder="Leave blank if you prefer" data-change="label"></label>
        <label class="field"><span class="field__l">What I will do instead</span><input class="input" id="pvInstead" maxlength="120" value="${priv.instead}" placeholder="Walk to the end of the street" data-change="instead"><span class="hint">Decide it now, while it is easy. "If the urge shows up, I will do this."</span></label>
        <div class="spread"><div><p class="eyebrow">Pause length</p><p class="tiny muted">Pick a length you can get through. You can add five minutes at a time.</p></div><span class="stepper"><button type="button" data-act="pmin" data-d="-1" aria-label="Shorter pause">−</button><output>${priv.pauseMin} min</output><button type="button" data-act="pmin" data-d="1" aria-label="Longer pause">+</button></span></div>
      </div></section>

      <section class="frame"><div class="frame__head"><span>Your patterns</span><span>${plural(stats.n, 'check-in')}</span></div><div class="frame__body">
        ${stats.n < 5 ? html`<p class="muted small">After five check-ins, Forme shows the times of day and situations that come up most, and what tends to help. ${stats.n ? `${5 - stats.n} to go.` : ''}</p>`
    : html`<dl class="kv kv--stack"><dt>When</dt><dd>${stats.times.slice(0, 3).map(([key, n]) => `${key} (${n})`).join(', ')}</dd>
            ${stats.situations.length ? html`<dt>Situations</dt><dd>${stats.situations.slice(0, 4).map(([key, n]) => `${key} (${n})`).join(', ')}</dd>` : ''}
            ${stats.helped.length ? html`<dt>What helped</dt><dd>${stats.helped.slice(0, 3).map(([key, n]) => `${key} (${n})`).join('; ')}</dd>` : ''}
            <dt>How they ended</dt><dd>${OUTCOMES.filter(([id]) => stats.outcomes[id]).map(([id, label]) => `${label}: ${stats.outcomes[id]}`).join(' · ')}</dd></dl>
          <p class="tiny muted">Counts only. There is no score.</p>`}
        <div class="spread"><div><p class="eyebrow">Fresh starts</p><p class="tiny muted">${fresh.length ? `${fresh.length} so far, last ${fmtDay(fresh.at(-1).at.slice(0, 10), { day: 'numeric', month: 'short' })}.` : 'A way to mark "starting again from here", as many times as you need.'}</p></div><button class="btn btn--quiet btn--sm" type="button" data-act="fresh">Start fresh</button></div>
      </div></section>`}

    <section class="frame"><div class="frame__head"><span>If you want a person</span><span>Canada</span></div><div class="frame__body">
      <div class="list">${SUPPORT.map(item => html`<div class="list__i"><span class="list__m"><span class="title">${extLink(item.url, item.name)}</span><span class="small" style="display:block">${item.how} · ${item.when}</span><span class="tiny muted" style="display:block">${item.what}</span></span></div>`)}</div>
      <p class="tiny muted">${SUPPORT_NOTE} Details checked 16 to 17 Nov 2026.</p></div></section>

    ${priv.enabled ? html`<section class="stack" aria-label="Controls">${sec('Controls')}
      <button class="switch" type="button" role="switch" aria-checked="${priv.hideOnToday ? 'true' : 'false'}" data-act="hide"><span class="switch__t"><span class="title" style="font-size:.98rem">Keep it off Today</span><span class="tiny muted" style="display:block">No button on the home screen. Reach it from the + button ("A minute") or from You.</span></span><span class="switch__k"></span></button>
      <button class="switch" type="button" role="switch" aria-checked="${priv.hideEntry ? 'true' : 'false'}" data-act="hideentry"><span class="switch__t"><span class="title" style="font-size:.98rem">Hide the eye icon</span><span class="tiny muted" style="display:block">Removes the small shortcut at the top of Today.</span></span><span class="switch__k"></span></button>
      <div class="row row--wrap"><button class="btn btn--quiet btn--sm grow" type="button" data-act="export">Export my check-ins</button><button class="btn btn--quiet btn--sm grow" type="button" data-act="wipe">${icon('trash', 'ic--sm')} Delete all</button></div>
      <button class="linkish linkish--quiet tiny" type="button" data-act="disable">Turn "A minute" off (keeps your check-ins)</button></section>` : ''}

    <details class="fold"><summary>Why a pause and a plan</summary><div class="fold__b">${URGE_CLAIMS.map(claim => html`<p class="small">${claim.text} <span class="muted">${claim.level}. ${extLink(SOURCES[claim.src].url, SOURCES[claim.src].cite.split('.')[0])}, ${SOURCES[claim.src].date}.</span></p>`)}<p class="tiny muted">This is self-management support. It is not addiction treatment and not a substitute for it.</p></div></details>
  </div>`;

  const saveLog = change => { const read = store.legacy.personal(); if (read.error) return toast('The log could not be read, so nothing was changed.'); try { store.legacy.writePersonal(change(read.value)); return true; } catch (error) { toast(error.message.replace(/^Personal log: /, '')); return false; } };
  return { room: 'street', where: 'Private', body,
    after: root => { root.querySelector('[data-form="plog"]')?.addEventListener('submit', event => { event.preventDefault(); const at = new Date(root.querySelector('#plAt').value); const amountMg = Number(root.querySelector('#plAmt').value);
      if (Number.isNaN(at.getTime())) return toast('Enter the actual date and time.');
      const entry = { id: editing ?? uid(), at: at.toISOString(), amountMg, site: root.querySelector('#plSite').value.trim(), note: root.querySelector('#plNote').value.trim() };
      const ok = saveLog(state => (editing ? validatePersonalState({ ...state, entries: state.entries.map(item => (item.id === editing ? entry : item)) }) : addPersonalEntry(state, entry)));
      if (ok) { editing = null; toast('Entry saved.'); } }); },
    changes: { label: (_d, el) => store.update('priv', next => { next.label = el.value.trim(); }), instead: (_d, el) => store.update('priv', next => { next.instead = el.value.trim(); }) },
    actions: {
      enable: () => store.update('priv', next => { next.enabled = true; }),
      disable: () => store.update('priv', next => { next.enabled = false; }),
      start: () => { pause = { until: Date.now() + priv.pauseMin * 60000, total: priv.pauseMin * 60, started: Date.now(), situations: new Set(), helped: new Set(), note: '', rang: false }; location.hash = '#/private/minute'; },
      pmin: d => store.update('priv', next => { next.pauseMin = Math.min(60, Math.max(1, next.pauseMin + Number(d.d))); }),
      fresh: () => { store.update('priv', next => { next.events = [...next.events, { id: uid(), kind: 'fresh', at: new Date().toISOString() }]; }); toast('Marked. From here.'); },
      later: d => store.update('priv', next => { if (d.o) next.events = [...next.events, { id: uid(), kind: 'pause', at: new Date().toISOString(), seconds: 0, situations: [], note: 'Follow-up check-in', helped: [], outcome: d.o }]; next.checkDue = null; }),
      hide: () => store.update('priv', next => { next.hideOnToday = !next.hideOnToday; }),
      hideentry: () => store.update('priv', next => { next.hideEntry = !next.hideEntry; }),
      export: () => { const ok = download(`forme-private-${today()}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), note: 'Private check-ins exported from Forme. Keep this file somewhere only you can reach.', ...store.get('priv') }, null, 2)); toast(ok ? 'Exported. The file is in your downloads.' : 'Export is blocked in this browser.'); },
      wipe: async () => { if (!await ask({ title: 'Delete everything in "A minute"?', text: 'Your label, your plan and every check-in will be removed from this device. This cannot be undone. Your private log is separate and is not touched.', yes: 'Delete it all', danger: true })) return; store.resetSection('priv'); toast('Deleted.'); },
      ledit: d => { editing = d.id; ctx.refresh(); },
      lcancel: () => { editing = null; ctx.refresh(); },
      ldel: async d => { if (!await ask({ title: 'Delete this entry?', text: 'It is removed from the log on this device.', yes: 'Delete', danger: true })) return; saveLog(state => validatePersonalState({ ...state, entries: state.entries.filter(entry => entry.id !== d.id) })); },
      lexport: () => { const read = store.legacy.personal(); if (read.error || !read.value) return toast('Nothing to export.'); download(`private-log-${today()}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), entries: read.value.entries }, null, 2)); toast('Exported. Keep the file private.'); },
    } };
}

export function startMinute() {
  const priv = store.get('priv');
  pause = { until: Date.now() + priv.pauseMin * 60000, total: priv.pauseMin * 60, started: Date.now(), situations: new Set(), helped: new Set(), note: '', rang: false };
  location.hash = '#/private/minute';
}
