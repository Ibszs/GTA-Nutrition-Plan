import { confirmAction } from './common.js';
import { createStorage, makeId, saveJson } from './common.js';
import { EXERCISES, SESSIONS, localToday, getWeek, getPrescription, isRealDate } from './training-data.js';
import { TRAINING_KEY, createTrainingState, validateTrainingState, createDraft, finishDraft, copyLastSets, findLastEntry, progressionSuggestion } from './training-state.js';

const $ = id => document.getElementById(id);
const { storage, persistent } = createStorage();
let state = createTrainingState();
let storageBlocked = false;
try {
  const raw = storage.getItem(TRAINING_KEY);
  if (raw !== null) state = validateTrainingState(JSON.parse(raw));
} catch (_) {
  storageBlocked = true;
  $('trainingError').hidden = false;
  $('trainingError').textContent = 'Saved training could not be read. It has not been overwritten. Restore a valid backup from Today, then reload this page.';
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text, action, className = 'button secondary') {
  const node = element('button', text, className); node.type = 'button'; node.addEventListener('click', action); return node;
}
function error(message = '') { $('trainingError').hidden = !message; $('trainingError').textContent = message; }
function save(message = 'Draft saved on this device.') {
  if (storageBlocked) { error('Saved training needs recovery from a valid backup before new changes can be stored.'); return false; }
  try {
    validateTrainingState(state);
    saveJson(storage, TRAINING_KEY, state);
    error();
    $('trainingStorageNotice').textContent = persistent ? message : 'Browser storage is unavailable. Changes last only while this page stays open and will not appear in Today’s backup. Keep this page open.';
    $('trainingStorageNotice').dataset.mode = persistent ? 'persistent' : 'memory';
    return true;
  } catch (issue) {
    error(issue.message.startsWith('Training data:') ? issue.message : 'The browser could not save this change (storage may be full or blocked). Keep this page open and free browser space. Your last successful save remains stored.');
    return false;
  }
}
function hasNumbers(entry) { return entry.sets.some(s => s.load !== '' || s.reps !== '' || s.rir !== '' || s.completed); }
function draftHasNumbers() { return state.draft?.exercises.some(hasNumbers); }
function completedCount(session) { return session.exercises.reduce((n, e) => n + e.sets.filter(s => s.completed).length, 0); }
function selectedWeek() {
  try { return getWeek(state.startDate, $('workoutDate').value); } catch (_) { return 1; }
}
function renderOverview() {
  $('sessionFocus').textContent=SESSIONS.find(s=>s.id===$('sessionSelect').value)?.focus??'';
  const week = selectedWeek();
  const prescription = getPrescription(week, $('lighterSession').checked);
  $('phaseSummary').textContent = `Week ${week} · ${prescription.phase}. ${prescription.note}${prescription.checkpoint ? ' Review performance, fatigue, soreness and sleep this week.' : ''}`;
  $('weekRail').replaceChildren();
  for (const session of SESSIONS) {
    const saved = state.sessions.filter(s => s.week === week && s.sessionId === session.id);
    const status = saved.some(s => !s.partial) ? 'Complete' : saved.length ? 'Partial' : 'To do';
    const item = element('div', undefined, `week-day ${status === 'Complete' ? 'is-complete' : ''}`);
    item.append(element('span', session.day, 'small'), element('strong', session.name), element('span', status, 'small'));
    $('weekRail').append(item);
  }
  $('blockStart').disabled = Boolean(state.draft || state.sessions.length);
  $('loadUnit').disabled = Boolean(draftHasNumbers());
  $('beginSession').textContent = state.draft ? 'Replace current draft' : 'Start session';
}

function renderHistory() {
  $('trainingHistory').replaceChildren(); $('weekSummaries').replaceChildren();
  if (!state.sessions.length) { $('trainingHistory').append(element('p', 'Your first finished session will appear here.')); return; }
  const weeks = [...new Set(state.sessions.map(s => s.week))].sort((a, b) => b - a);
  for (const week of weeks) {
    const items = state.sessions.filter(s => s.week === week);
    const full = new Set(items.filter(s => !s.partial).map(s => s.sessionId)).size;
    const partial = items.filter(s => s.partial).length;
    $('weekSummaries').append(element('p', `Week ${week}: ${full}/4 different full sessions · ${partial} partial · ${items.reduce((n, s) => n + completedCount(s), 0)} performed sets`, 'small'));
  }
  for (const session of state.sessions.slice().reverse().sort((a, b) => b.date.localeCompare(a.date))) {
    const details = element('details');
    const sessionName = SESSIONS.find(s => s.id === session.sessionId).name;
    details.append(element('summary', `${session.date} · ${sessionName} · ${completedCount(session)} sets${session.partial ? ' · Partial' : ''}${session.lightWeek ? ' · Lighter' : ''}`));
    session.exercises.filter(e => e.sets.length).forEach(entry => {
      const definition = EXERCISES[entry.exerciseId];
      const variant = definition.variants.find(v => v.id === entry.variantId).name;
      details.append(element('h3', variant));
      if (entry.setup) details.append(element('p', `Setup: ${entry.setup}`, 'small'));
      const list = element('ol');
      entry.sets.forEach(set => list.append(element('li', `${set.load} ${session.unit} × ${set.reps} · ${set.rir} RIR · ${set.clean ? 'Clean' : 'Form not confirmed'}`)));
      details.append(list);
      details.append(element('p', progressionSuggestion({ ...entry, lightWeek: session.lightWeek }, getPrescription(session.week, session.lightWeek).rir).text, 'small'));
    });
    details.append(button('Delete this session', async () => {
      if (!await confirmAction(`Delete ${sessionName} on ${session.date}? This cannot be undone.`)) return;
      const old = state; state = { ...state, sessions: state.sessions.filter(s => s.id !== session.id) };
      if (!save('Session deleted.')) { state = old; return; }
      renderHistory(); renderOverview(); renderWorkout();
    }, 'button ghost'));
    $('trainingHistory').append(details);
  }
}

function updateProgress() {
  if (!state.draft) return;
  const total = state.draft.exercises.reduce((n, e) => n + e.prescribedSets, 0);
  $('workoutProgress').textContent = `${completedCount(state.draft)} of ${total} working sets done`;
  $('loadUnit').disabled = Boolean(draftHasNumbers());
}
function focusExercise() {
  const selected=$('exerciseFocus').value;
  [...$('exerciseList').children].forEach((card,index)=>card.hidden=selected!=='all' && Number(selected)!==index);
  $('previousExercise').disabled=selected==='all'||Number(selected)===0;
  $('nextExercise').disabled=selected==='all'||Number(selected)>=(state.draft?.exercises.length??0)-1;
}
$('exerciseFocus').addEventListener('change',focusExercise);
for(const [id,delta] of [['previousExercise',-1],['nextExercise',1]])$(''+id).addEventListener('click',async()=>{
  $('exerciseFocus').value=String(Number($('exerciseFocus').value)+delta);focusExercise();$('exerciseFocus').scrollIntoView({block:'start',behavior:'smooth'});
});
function renderWorkout() {
  $('activeWorkout').hidden = !state.draft;
  $('exerciseList').replaceChildren();
  if (!state.draft) return;
  const draft = state.draft;
  const previousFocus=$('exerciseFocus').value;
  $('exerciseFocus').replaceChildren();
  draft.exercises.forEach((entry,index)=>{const option=element('option',`${index+1}. ${EXERCISES[entry.exerciseId].name}`);option.value=String(index);$('exerciseFocus').append(option);});
  const all=element('option','Show every exercise');all.value='all';$('exerciseFocus').append(all);
  $('exerciseFocus').value=previousFocus==='all'||draft.exercises[Number(previousFocus)]&&previousFocus!==''?previousFocus:String(Math.max(0,draft.exercises.findIndex(entry=>entry.sets.some(set=>!set.completed))));
  const target = getPrescription(draft.week, draft.lightWeek).rir;
  $('active-title').textContent = `${SESSIONS.find(s => s.id === draft.sessionId).name} · ${draft.date}`;
  draft.exercises.forEach((entry, exerciseIndex) => {
    const definition = EXERCISES[entry.exerciseId];
    const card = element('article', undefined, 'panel exercise-card');
    card.append(element('p', `${exerciseIndex + 1} / ${draft.exercises.length} · ${definition.muscle}`, 'kicker'));
    card.append(element('h3', definition.name));
    card.append(element('p', `${entry.prescribedSets} sets × ${entry.repMin}–${entry.repMax} reps · ${target} RIR · ${definition.rest / 60} min rest`));
    const setupGrid = element('div', undefined, 'form-grid');
    const variantLabel = element('label', 'Exercise choice', 'span-6');
    const variantSelect = element('select'); variantSelect.setAttribute('aria-label', `${definition.name} exercise choice`);
    definition.variants.forEach(v => { const option = element('option', v.name); option.value = v.id; variantSelect.append(option); });
    variantSelect.value = entry.variantId; variantSelect.disabled = hasNumbers(entry);
    variantLabel.append(variantSelect);
    const setupLabel = element('label', 'Machine / bench setup (optional)', 'span-6');
    const setupInput = element('input'); setupInput.type = 'text'; setupInput.maxLength = 120; setupInput.placeholder = 'e.g. gym A, seat 3'; setupInput.value = entry.setup; setupInput.disabled = hasNumbers(entry);
    setupLabel.append(setupInput); setupGrid.append(variantLabel, setupLabel); card.append(setupGrid);
    const coaching = element('details'); coaching.append(element('summary', 'Technique & how to record the load'), element('p', definition.cues), element('p', definition.loadNote)); card.append(coaching);
    const previousPanel = element('div', undefined, 'last-performance');
    const suggestions = element('p', undefined, 'small');
    const controls = element('div', undefined, 'button-row');
    let previous;
    const copyButton = button('Copy last numbers', async () => {
      if (!previous) return;
      if (hasNumbers(entry) && !await confirmAction('Replace these exercise numbers with the last session? Done and Clean checks will be cleared.')) return;
      draft.exercises[exerciseIndex] = copyLastSets(entry, previous); save(); renderWorkout();
    });
    function updatePrevious() {
      previous = findLastEntry(state.sessions, entry.exerciseId, entry.variantId, draft.unit, entry.setup, draft.date);
      previousPanel.replaceChildren(); copyButton.disabled = !previous;
      if (previous) {
        previousPanel.append(element('p', `Last performed · ${previous.date}`, 'small'));
        previousPanel.append(element('p', previous.sets.map(s => `${s.load} ${draft.unit} × ${s.reps} @ ${s.rir} RIR`).join(' / '), 'performance-numbers'));
        suggestions.textContent = previous.prescribedSets === entry.prescribedSets && !previous.lightWeek
          ? progressionSuggestion(previous, Math.max(target, previous.targetRir)).text
          : 'Your prescription changed. Establish the current full set count before considering a load increase.';
      } else {
        previousPanel.append(element('p', 'No previous sets for this exercise, setup and unit before this date. Choose a comfortable starting load.', 'small'));
        suggestions.textContent = 'Start near the lower end of the rep range. Keep the target reps in reserve.';
      }
    }
    variantSelect.addEventListener('change', () => { entry.variantId = variantSelect.value; save(); updatePrevious(); });
    setupInput.addEventListener('input', () => { entry.setup = setupInput.value; save(); updatePrevious(); });
    controls.append(copyButton, button(`Rest ${definition.rest} sec`, () => startTimer(definition.rest)), button('Clear exercise', async () => {
      if (!await confirmAction('Clear all numbers and checks for this exercise? You can then change its setup.')) return;
      entry.sets = entry.sets.map(() => ({ load: '', reps: '', rir: '', completed: false, clean: false })); save(); renderWorkout();
    }, 'button ghost'));
    card.append(previousPanel, suggestions, controls);
    const setGrid = element('div', undefined, 'set-grid');
    entry.sets.forEach((set, setIndex) => {
      const row = element('fieldset', undefined, 'set-row'); row.append(element('legend', `Set ${setIndex + 1}`));
      const fields = [];
      for (const [key, label, min, max, step] of [['load', `Load (${draft.unit})`, 0, 3000, 'any'], ['reps', 'Reps', 1, 100, '1'], ['rir', 'RIR', 0, 10, '0.5']]) {
        const wrapper = element('label', label); const input = element('input');
        input.type = 'number'; input.inputMode = key === 'reps' ? 'numeric' : 'decimal'; input.min = String(min); input.max = String(max); input.step = step;
        input.value = set[key]; input.setAttribute('aria-label', `${definition.name}, set ${setIndex + 1}, ${label}`);
        input.addEventListener('input', () => {
          set[key] = input.value === '' ? '' : Number(input.value);
          if (set.completed && (input.value === '' || !input.validity.valid)) { set.completed = false; doneInput.checked = false; }
          variantSelect.disabled = setupInput.disabled = hasNumbers(entry);
          save(); updateProgress();
        });
        fields.push(input); wrapper.append(input); row.append(wrapper);
      }
      const cleanLabel = element('label', 'Clean', 'checkbox-field'); const cleanInput = element('input'); cleanInput.type = 'checkbox'; cleanInput.checked = set.clean;
      cleanInput.setAttribute('aria-label', `${definition.name}, set ${setIndex + 1}, clean technique`);
      cleanInput.addEventListener('change', () => { set.clean = cleanInput.checked; save(); }); cleanLabel.prepend(cleanInput);
      const doneLabel = element('label', 'Done', 'checkbox-field'); const doneInput = element('input'); doneInput.type = 'checkbox'; doneInput.checked = set.completed;
      doneInput.setAttribute('aria-label', `${definition.name}, set ${setIndex + 1}, completed`);
      doneInput.addEventListener('change', () => {
        if (doneInput.checked && fields.some(input => input.value === '' || !input.validity.valid)) {
          doneInput.checked = false; error('Enter a valid load, whole reps and RIR before marking this set done.');
          fields.find(input => input.value === '' || !input.validity.valid)?.focus(); return;
        }
        set.completed = doneInput.checked; save(); updateProgress();
      });
      doneLabel.prepend(doneInput); row.append(cleanLabel, doneLabel); setGrid.append(row);
    });
    card.append(setGrid); $('exerciseList').append(card); updatePrevious();
  });
  updateProgress();focusExercise();
}

function syncForm() {
  $('blockStart').value = state.startDate;
  $('workoutDate').value = state.draft?.date ?? localToday();
  $('workoutDate').min = state.startDate;
  $('loadUnit').value = state.draft?.unit ?? state.unit;
  $('lighterSession').checked = state.draft?.lightWeek ?? false;
  if (state.draft) $('sessionSelect').value = state.draft.sessionId;
  else {
    const week = selectedWeek();
    const next = SESSIONS.find(s => !state.sessions.some(saved => saved.week === week && saved.sessionId === s.id && !saved.partial));
    $('sessionSelect').value = (next ?? SESSIONS[0]).id;
  }
}
SESSIONS.forEach(s => { const option = element('option', s.name); option.value = s.id; $('sessionSelect').append(option); });
$('blockStart').addEventListener('change', () => {
  if (state.draft || state.sessions.length) return;
  if (!isRealDate($('blockStart').value)) { error('Choose a valid block start date.'); return; }
  state.startDate = $('blockStart').value; $('workoutDate').min = state.startDate;
  if ($('workoutDate').value < state.startDate) $('workoutDate').value = state.startDate;
  save('Block start saved.'); renderOverview();
});
['workoutDate', 'sessionSelect', 'lighterSession'].forEach(id => $(id).addEventListener('change', renderOverview));
$('loadUnit').addEventListener('change', () => {
  if (draftHasNumbers()) { $('loadUnit').value = state.draft.unit; return; }
  state.unit = $('loadUnit').value;
  if (state.draft) state.draft.unit = state.unit;
  save('Load unit saved. No weight values have been converted.'); renderWorkout();
});
$('sessionForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (storageBlocked) { error('Restore valid saved training before starting a new workout.'); return; }
  if (state.draft && !await confirmAction('Replace the current draft? Its unfinished session and numbers will be discarded.')) return;
  try {
    const next = createDraft(state, $('sessionSelect').value, $('workoutDate').value, $('lighterSession').checked);
    const old = state.draft; state.draft = next;
    if (!save()) { state.draft = old; return; }
    renderOverview(); renderWorkout(); $('active-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (issue) { error(issue.message); }
});
$('finishSession').addEventListener('click', async () => {
  if (!state.draft) return;
  try {
    const next = finishDraft(state, makeId());
    const finished = next.sessions.at(-1);
    if (finished.partial && !await confirmAction(`Save a partial workout with ${completedCount(finished)} performed sets? Unchecked sets and their numbers will not enter history.`)) return;
    const old = state; state = next;
    if (!save(`${finished.partial ? 'Partial workout' : 'Workout'} saved: ${completedCount(finished)} performed sets.`)) { state = old; return; }
    syncForm(); renderOverview(); renderWorkout(); renderHistory();
    $('history-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (issue) { error(issue.message); }
});
$('discardDraft').addEventListener('click', async () => {
  if (!await confirmAction('Discard this draft and all of its unsaved workout numbers?')) return;
  const old = state.draft; state.draft = null;
  if (!save('Draft discarded.')) { state.draft = old; return; }
  syncForm(); renderOverview(); renderWorkout();
});

let timerEnd = 0;
function tickTimer() {
  const remaining = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
  $('timerDisplay').textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  if (timerEnd && !remaining) { timerEnd = 0; $('timerStatus').textContent = 'Rest complete. Start when you feel ready.'; }
}
function startTimer(seconds) { $('timerDisplay').scrollIntoView({block:'center',behavior:'smooth'}); timerEnd = Date.now() + seconds * 1000; $('timerStatus').textContent = `Resting for ${seconds} seconds.`; tickTimer(); }
document.querySelectorAll('[data-rest]').forEach(node => node.addEventListener('click', async () => startTimer(Number(node.dataset.rest))));
$('stopTimer').addEventListener('click', async () => { timerEnd = 0; tickTimer(); $('timerStatus').textContent = 'Timer stopped.'; });
setInterval(tickTimer, 500);

syncForm(); renderOverview(); renderWorkout(); renderHistory();
$('trainingStorageNotice').textContent = storageBlocked ? 'Saved data needs recovery; the existing record is preserved.' : persistent ? state.draft ? 'Your saved draft is ready to resume.' : 'Training saves automatically in this browser.' : 'Browser storage is unavailable. This session is temporary and cannot be backed up from Today. Keep this page open.';
$('trainingStorageNotice').dataset.mode = persistent ? 'persistent' : 'memory';
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

window.addEventListener('storage',event=>{if(event.key===TRAINING_KEY || event.key===null)location.reload();});
