import { openExercise } from './experience.js';
import { icon, iconLabel } from './ui-icons.js';
import { confirmAction } from './common.js';
import { createStorage, makeId, saveJson } from './common.js';
import { EXERCISES, SESSIONS, localToday, getWeek, getPrescription, isRealDate } from './training-data.js';
import { TRAINING_KEY, createTrainingState, validateTrainingState, createDraft, editDraft, repeatSession, finishDraft, copyLastSets, findLastEntry, progressionSuggestion } from './training-state.js';

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
function hasNumbers(entry) { return entry.sets.some(s => s.load !== '' || s.reps !== '' || s.rir !== '' || s.completed || s.clean); }
function draftHasNumbers() { return state.draft?.exercises.some(hasNumbers); }
function completedCount(session) { return session.exercises.reduce((n, e) => n + e.sets.filter(s => s.completed).length, 0); }
function selectedWeek() {
  try { return getWeek(state.startDate, $('workoutDate').value); } catch (_) { return 1; }
}
function renderOverview() {
  const selected=SESSIONS.find(s=>s.id===$('sessionSelect').value);
  $('sessionFocus').textContent=selected?.focus??'';
  $('sessionSize').textContent=`${selected.exercises.length} exercises · ${selected.exercises.reduce((n,e)=>n+e[1],0)} standard working sets · 60–75 min`;
  const week = selectedWeek();
  const prescription = getPrescription(week, $('lighterSession').checked);
  $('phaseSummary').textContent = `Week ${week} · ${prescription.phase}. ${prescription.note}${prescription.checkpoint ? ' Review performance, fatigue, soreness and sleep this week.' : ''}`;
  $('weekRail').replaceChildren();
  for (const session of SESSIONS) {
    const saved = state.sessions.filter(s => s.week === week && s.sessionId === session.id);
    const status = saved.some(s => !s.partial) ? 'Complete' : saved.length ? 'Partial' : 'To do';
    const item = element('button', undefined, `week-day ${status === 'Complete' ? 'is-complete' : ''}`);
    item.type='button';item.setAttribute('aria-pressed',String($('sessionSelect').value===session.id));item.addEventListener('click',()=>{$('sessionSelect').value=session.id;renderOverview();});
    item.append(element('span', session.day, 'small'), element('strong', session.name), element('span', status, 'small'));
    $('weekRail').append(item);
  }
  $('blockStart').disabled = Boolean(state.draft || state.sessions.length);
  $('loadUnit').disabled = Boolean(draftHasNumbers());
  $('beginSession').textContent = state.draft ? 'Replace current draft' : 'Start session';
  const last = state.sessions.slice().reverse().find(s => s.sessionId === selected.id);
  $('repeatLastLineup').hidden = !last;
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
    details.append(element('summary', `${session.date} · ${sessionName} · ${completedCount(session)} sets${session.customized ? ' · Adapted' : ''}${session.partial ? ' · Partial' : ''}${session.lightWeek ? ' · Lighter' : ''}`));
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
    details.append(button('Repeat this lineup', () => startRepeatedSession(session.id), 'button secondary'));
    $('trainingHistory').append(details);
  }
}

function updateProgress() {
  if (!state.draft) return;
  const total = state.draft.exercises.reduce((n, e) => n + e.prescribedSets, 0);
  $('workoutProgress').textContent = `${completedCount(state.draft)} of ${total} working sets done`;
  $('loadUnit').disabled = Boolean(draftHasNumbers());
  [...$('exerciseList').children].forEach((card, index) => {
    const entry = state.draft.exercises[index];
    const done = entry.sets.filter(set => set.completed).length;
    const badge = card.querySelector('.exercise-completion');
    if (badge) badge.textContent = `${done}/${entry.prescribedSets}`;
    card.classList.toggle('exercise-complete', done === entry.prescribedSets);
  });
}
function focusExercise() {
  const selected=$('exerciseFocus').value;
  if (selected !== 'all') [...$('exerciseList').children].forEach((card,index) => { card.open = Number(selected) === index; });
  $('previousExercise').disabled=selected==='all'||Number(selected)===0;
  $('nextExercise').disabled=selected==='all'||Number(selected)>=(state.draft?.exercises.length??0)-1;
}
function applyWorkoutEdit(action) {
  try {
    const old = state;
    state = editDraft(state, action);
    if (!save('Workout updated. Your recorded sets are preserved.')) { state = old; return; }
    if (action.type === 'add' || action.type === 'move') $('exerciseFocus').value = 'all';
    renderWorkout(); renderOverview();
    if (action.type === 'add') {
      $('exerciseFocus').value = String(state.draft.exercises.length - 1); focusExercise();
      $('exerciseList').lastElementChild.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    if (action.type === 'move') {
      const name = EXERCISES[state.draft.exercises[action.to].exerciseId].name;
      $('workoutOrderStatus').textContent = `${name} moved to position ${action.to + 1}.`;
      $('exerciseList').children[action.to].querySelector('.drag-handle').focus({ preventScroll: true });
    }
  } catch (issue) { error(issue.message); $('trainingError').scrollIntoView({ block: 'center', behavior: 'smooth' }); }
}
function exerciseChoices(select, currentId) {
  const placeholder = element('option', 'Choose a movement'); placeholder.value = ''; select.append(placeholder);
  Object.values(EXERCISES).filter(ex => ex.id !== currentId && !state.draft.exercises.some(e => e.exerciseId === ex.id)).forEach(ex => {
    const option = element('option', `${ex.muscle} · ${ex.name}`); option.value = ex.id; select.append(option);
  });
}
$('addExercise').addEventListener('click', () => applyWorkoutEdit({ type: 'add', exerciseId: $('addExerciseSelect').value }));
$('collapseExercises').addEventListener('click', () => { [...$('exerciseList').children].forEach(card => { card.open = false; }); $('exerciseFocus').value = 'all'; focusExercise(); });
$('expandExercises').addEventListener('click', () => { [...$('exerciseList').children].forEach(card => { card.open = true; }); $('exerciseFocus').value = 'all'; focusExercise(); });

function attachReorder(handle, card, index) {
  let startY, dragging = false, target = index;
  const clear = () => {
    card.classList.remove('is-dragging');
    [...$('exerciseList').children].forEach(item => item.classList.remove('drop-before', 'drop-after'));
  };
  handle.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); });
  handle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    startY = event.clientY; target = index; dragging = false;
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', event => {
    if (!handle.hasPointerCapture(event.pointerId)) return;
    if (!dragging && Math.abs(event.clientY - startY) < 7) return;
    dragging = true; card.classList.add('is-dragging');
    const cards = [...$('exerciseList').children];
    cards.forEach(item => item.classList.remove('drop-before', 'drop-after'));
    const over = cards.find(item => { const r = item.getBoundingClientRect(); return event.clientY >= r.top && event.clientY <= r.bottom; });
    if (over && over !== card) {
      const overIndex = cards.indexOf(over), after = event.clientY > over.getBoundingClientRect().top + over.getBoundingClientRect().height / 2;
      const slot = overIndex + (after ? 1 : 0);
      target = Math.max(0, Math.min(cards.length - 1, slot > index ? slot - 1 : slot));
      over.classList.add(after ? 'drop-after' : 'drop-before');
    } else if (over === card) target = index;
    if (event.clientY < 90) window.scrollBy(0, -16);
    if (event.clientY > window.innerHeight - 120) window.scrollBy(0, 16);
  });
  handle.addEventListener('pointerup', event => {
    if (!handle.hasPointerCapture(event.pointerId)) return;
    handle.releasePointerCapture(event.pointerId); clear();
    if (dragging && target !== index) applyWorkoutEdit({ type: 'move', index, to: target });
    dragging = false;
  });
  handle.addEventListener('pointercancel', clear);
  handle.addEventListener('keydown', event => {
    if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const to = index + (event.key === 'ArrowUp' ? -1 : 1);
    if (to >= 0 && to < state.draft.exercises.length) applyWorkoutEdit({ type: 'move', index, to });
  });
}
$('exerciseFocus').addEventListener('change',focusExercise);
for(const [id,delta] of [['previousExercise',-1],['nextExercise',1]])$(''+id).addEventListener('click',async()=>{
  $('exerciseFocus').value=String(Number($('exerciseFocus').value)+delta);focusExercise();$('exerciseFocus').scrollIntoView({block:'start',behavior:'smooth'});
});
function renderWorkout() {
  $('activeWorkout').hidden = !state.draft;
  const openExercises = new Set([...$('exerciseList').children].filter(card => card.open).map(card => card.dataset.exercise));
  const hadCards = $('exerciseList').children.length > 0;
  $('exerciseList').replaceChildren();
  if (!state.draft) return;
  const draft = state.draft;
  $('addExerciseSelect').replaceChildren(); exerciseChoices($('addExerciseSelect'));
  const previousFocus=$('exerciseFocus').value;
  $('exerciseFocus').replaceChildren();
  draft.exercises.forEach((entry,index)=>{const option=element('option',`${index+1}. ${EXERCISES[entry.exerciseId].name}`);option.value=String(index);$('exerciseFocus').append(option);});
  const all=element('option','Workout overview');all.value='all';$('exerciseFocus').append(all);
  $('exerciseFocus').value=previousFocus==='all'||draft.exercises[Number(previousFocus)]&&previousFocus!==''?previousFocus:'all';
  const target = getPrescription(draft.week, draft.lightWeek).rir;
  $('active-title').textContent = `${SESSIONS.find(s => s.id === draft.sessionId).name}${draft.customized ? ' · Adapted' : ''} · ${draft.date}`;
  draft.exercises.forEach((entry, exerciseIndex) => {
    const definition = EXERCISES[entry.exerciseId];
    const wrapper = element('details', undefined, 'panel exercise-card'); wrapper.dataset.exercise = entry.exerciseId;
    wrapper.open = hadCards ? openExercises.has(entry.exerciseId) : exerciseIndex === 0;
    const summary = element('summary', undefined, 'exercise-heading');
    const handle = button('', () => {}, 'drag-handle');
    handle.setAttribute('aria-label', `Reorder ${definition.name}`); handle.title = 'Drag to reorder, or use Alt + arrow keys';
    const grip = element('span', undefined, 'grip-dots'); grip.setAttribute('aria-hidden', 'true'); handle.append(grip);
    const title = element('div', undefined, 'exercise-heading-copy');
    title.append(element('span', `${exerciseIndex + 1}. ${definition.muscle}`, 'eyebrow'), element('h3', definition.name), element('span', `${entry.prescribedSets} sets · ${entry.repMin}–${entry.repMax} reps`, 'small'));
    summary.append(handle, title, element('span', '', 'exercise-completion'), icon('chevron-down', 'ui-icon exercise-chevron'));
    wrapper.append(summary);
    const card = element('div', undefined, 'exercise-body');
    const reorder = element('div', undefined, 'exercise-reorder');
    const up = button('Move up', () => applyWorkoutEdit({ type: 'move', index: exerciseIndex, to: exerciseIndex - 1 }), 'button ghost'); up.disabled = exerciseIndex === 0;
    const down = button('Move down', () => applyWorkoutEdit({ type: 'move', index: exerciseIndex, to: exerciseIndex + 1 }), 'button ghost'); down.disabled = exerciseIndex === draft.exercises.length - 1;
    reorder.append(up, down); card.append(reorder);
    card.append(iconLabel(button('',()=>openExercise(entry.exerciseId),'button secondary'), 'Movement guide', 'play'));
    card.append(element('p', `${entry.prescribedSets} sets × ${entry.repMin}–${entry.repMax} reps · suggested ${target} RIR · ${definition.rest / 60} min rest`));
    const adapt = element('details', undefined, 'adapt-exercise');
    adapt.append(element('summary', 'Adapt exercise · sets, reps & swaps'));
    const prescriptionForm = element('form', undefined, 'form-grid');
    const inputs = {};
    for (const [key, label, value, max] of [['count', 'Working sets', entry.prescribedSets, 20], ['repMin', 'Min reps', entry.repMin, 100], ['repMax', 'Max reps', entry.repMax, 100]]) {
      const wrapper = element('label', label, 'span-4');
      const input = element('input'); input.type = 'number'; input.min = '1'; input.max = String(max); input.step = '1'; input.required = true; input.value = String(value); input.setAttribute('aria-label', `${definition.name} ${label.toLowerCase()}`);
      wrapper.append(input); prescriptionForm.append(wrapper); inputs[key] = input;
    }
    const apply = element('button', 'Apply sets & reps', 'button secondary'); apply.type = 'submit'; prescriptionForm.append(apply);
    prescriptionForm.addEventListener('submit', event => { event.preventDefault(); applyWorkoutEdit({ type: 'prescription', index: exerciseIndex, count: Number(inputs.count.value), repMin: Number(inputs.repMin.value), repMax: Number(inputs.repMax.value) }); });
    adapt.append(prescriptionForm);
    const swapLabel = element('label', 'Swap this movement'); const swapSelect = element('select'); swapSelect.setAttribute('aria-label', `Swap ${definition.name}`); exerciseChoices(swapSelect, entry.exerciseId); swapLabel.append(swapSelect);
    adapt.append(swapLabel, button('Swap movement', () => applyWorkoutEdit({ type: 'swap', index: exerciseIndex, exerciseId: swapSelect.value }), 'button secondary'), button('Remove movement', () => applyWorkoutEdit({ type: 'remove', index: exerciseIndex }), 'button ghost'));
    adapt.append(element('p', 'Already entered numbers? Add another movement to keep those sets. Swapping or removing requires explicitly clearing this exercise first. Set reductions only remove blank sets.', 'small'));
    card.append(adapt);
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
    card.append(setGrid); wrapper.append(card); $('exerciseList').append(wrapper); attachReorder(handle, wrapper, exerciseIndex); updatePrevious();
  });
  updateProgress();focusExercise();
}

async function startRepeatedSession(id) {
  if (state.draft && !await confirmAction('Replace the current draft with this lineup? Its recorded numbers will be discarded.')) return;
  try {
    const old = state;
    state = repeatSession(state, id, $('workoutDate').value || localToday());
    if (!save('Lineup ready. Every working set starts blank.')) { state = old; return; }
    syncForm(); renderOverview(); renderWorkout();
    $('active-title').scrollIntoView({ block: 'start', behavior: 'smooth' });
  } catch (issue) { error(issue.message); }
}
$('repeatLastLineup').addEventListener('click', () => {
  const last = state.sessions.slice().reverse().find(session => session.sessionId === $('sessionSelect').value);
  if (last) startRepeatedSession(last.id);
});

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
function startTimer(seconds) { $('timerDisplay').closest('.rest-timer').classList.add('timer-floating'); timerEnd = Date.now() + seconds * 1000; $('timerStatus').textContent = `Resting for ${seconds} seconds.`; tickTimer(); }
document.querySelectorAll('[data-rest]').forEach(node => node.addEventListener('click', async () => startTimer(Number(node.dataset.rest))));
$('stopTimer').addEventListener('click', async () => { $('timerDisplay').closest('.rest-timer').classList.remove('timer-floating');timerEnd = 0; tickTimer(); $('timerStatus').textContent = 'Timer stopped.'; });
setInterval(tickTimer, 500);

syncForm(); renderOverview(); renderWorkout(); renderHistory();
$('trainingStorageNotice').textContent = storageBlocked ? 'Saved data needs recovery; the existing record is preserved.' : persistent ? state.draft ? 'Your saved draft is ready to resume.' : 'Training saves automatically in this browser.' : 'Browser storage is unavailable. This session is temporary and cannot be backed up from Today. Keep this page open.';
$('trainingStorageNotice').dataset.mode = persistent ? 'persistent' : 'memory';

window.addEventListener('storage',event=>{if(event.key===TRAINING_KEY || event.key===null)location.reload();});

function renderExerciseLibrary() {
  const search = $('librarySearch').value.toLowerCase().trim();
  const muscle = $('libraryMuscle').value;
  const groups = { chest: /chest/i, back: /back/i, delts: /delts|shoulders/i, arms: /biceps|triceps/i, legs: /quads|hamstrings|glutes|calves/i, abs: /abs/i };
  $('exerciseLibrary').replaceChildren();
  for (const ex of Object.values(EXERCISES)) {
    if (muscle !== 'all' && !groups[muscle].test(ex.muscle)) continue;
    if (!`${ex.name} ${ex.muscle} ${ex.variants.map(v => v.name).join(' ')}`.toLowerCase().includes(search)) continue;
    const tile = button('', () => openExercise(ex.id), 'exercise-tile');
    const image = element('img'); image.src = `assets/images/exercises/${ex.id}-0.jpg`; image.alt = ''; image.loading = 'lazy'; image.className = 'exercise-thumb';
    const copy = element('span', undefined, 'exercise-tile-copy');
    copy.append(element('span', ex.muscle, 'eyebrow'), element('strong', ex.name), element('span', `${ex.repMin}–${ex.repMax} reps`, 'small'), icon('arrow-up-right'));
    tile.append(image, copy); $('exerciseLibrary').append(tile);
  }
  if (!$('exerciseLibrary').children.length) $('exerciseLibrary').append(element('p', 'No matching movements. Try another name or muscle group.', 'empty'));
}
$('librarySearch').addEventListener('input', renderExerciseLibrary);
$('libraryMuscle').addEventListener('change', renderExerciseLibrary);
renderExerciseLibrary();
const requestedSession=new URLSearchParams(location.search).get('session');if(!state.draft&&SESSIONS.some(s=>s.id===requestedSession)){$('sessionSelect').value=requestedSession;renderOverview();}
