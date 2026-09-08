import { openExercise } from './experience.js';
import { getExerciseGuide } from './exercise-visuals.js';
import { confirmAction, createStorage, makeId, saveJson } from './common.js';
import { EXERCISES, SESSIONS, localToday, getWeek, getPrescription, isRealDate } from './training-data.js';
import { NEW_SESSIONS, PROGRAM_DAYS, getSessionTemplate, getProgramDay, getSessionPrescription } from './training-program.js';
import { TRAINING_KEY, createTrainingState, validateTrainingState, createDraft, editDraft, repeatSession, finishDraft, copyLastSets, findLastEntry, progressionSuggestion, setProgramDay } from './training-state.js';

const $ = id => document.getElementById(id);
const { storage, persistent } = createStorage();
let state = createTrainingState(), storageBlocked = false, exerciseIndex = 0, editingSet = null, choosingSession = false;
try { const raw = storage.getItem(TRAINING_KEY); if (raw !== null) state = validateTrainingState(JSON.parse(raw)); }
catch (_) { storageBlocked = true; }
const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
const button = (text, action, cls = 'button secondary') => { const n = el('button', text, cls); n.type = 'button'; n.addEventListener('click', action); return n; };
const guide = entry => getExerciseGuide(entry.exerciseId, entry.variantId, entry);
const doneCount = session => session.exercises.reduce((n, e) => n + e.sets.filter(s => s.completed).length, 0);
const totalCount = session => session.exercises.reduce((n, e) => n + e.prescribedSets, 0);
const hasNumbers = entry => entry.sets.some(s => s.load !== '' || s.reps !== '' || s.rir !== '' || s.clean || s.completed);
const nameOf = id => getSessionTemplate(id)?.name ?? id;
let trainingScene = null, sceneRequested = false, feedbackTimer;
function syncTrainingScene() {
  const active = !$('view-session').hidden && !$('sessionReady').hidden && !$('sessionHero').classList.contains('is-rest');
  if (trainingScene) { trainingScene.setActive(active); return; }
  if (!active || sceneRequested) return;
  sceneRequested = true;
  import('./training-scene.js').then(module => module.mountTrainingScene($('trainingSculpture'))).then(scene => { trainingScene = scene; syncTrainingScene(); }).catch(() => { $('trainingSculpture').classList.add('scene-unavailable'); });
}
function updateProgress() {
  if (!state.draft) return;
  const completed = doneCount(state.draft), total = totalCount(state.draft);
  $('workoutProgress').textContent = `${completed} / ${total} sets complete`;
  $('sessionProgressBar').max = total;
  $('sessionProgressBar').value = completed;
}
function celebrateSavedSet() {
  clearTimeout(feedbackTimer);
  $('setSavedFeedback').textContent = '✓ Set saved';
  $('sessionProgressBar').classList.remove('set-just-saved');
  requestAnimationFrame(() => $('sessionProgressBar').classList.add('set-just-saved'));
  feedbackTimer = setTimeout(() => { $('setSavedFeedback').textContent = ''; $('sessionProgressBar').classList.remove('set-just-saved'); }, 1500);
}
function movementImage(g, className = 'exercise-thumb') {
  if (!g.visual) return null;
  const image = el('img');
  Object.assign(image, { src: `assets/images/exercises/${g.visual.imageId}-0.jpg`, alt: '', loading: 'lazy', className });
  return image;
}
function error(message = '') { $('trainingError').hidden = !message; $('trainingError').textContent = message; }
function save(message = 'Saved on this device.') {
  if (storageBlocked) { error('Saved training could not be read. It has not been overwritten. Restore a valid backup from Today, then reload.'); return false; }
  try { validateTrainingState(state); saveJson(storage, TRAINING_KEY, state); error(); $('trainingStorageNotice').textContent = persistent ? message : 'Browser storage is unavailable. Keep this page open; these changes are temporary and cannot be backed up from Today.'; return true; }
  catch (issue) { error(issue.message.startsWith('Training data:') ? issue.message : 'This change could not be saved. Keep this page open and free browser storage. Your last successful save remains stored.'); return false; }
}
function commit(next, message) { const old = state; state = next; if (save(message)) return true; state = old; return false; }
function mutate(action, message) { const next = structuredClone(state); action(next); return commit(next, message); }
function showTab(name, focus = false) {
  document.querySelectorAll('.training-tabs [role=tab]').forEach(tab => { const active = tab.id === `tab-${name}`; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; $(tab.getAttribute('aria-controls')).hidden = !active; if (active && focus) tab.focus({preventScroll:true}); });
  syncTrainingScene();
  document.querySelector('.training-tabs').scrollIntoView({block:'start',behavior:'instant'});
}
// Include navigation height, bottom offset and safe-area space when clearing the rest dock.
const bottomNavigation = document.querySelector('.site-nav');
function updateNavigationClearance() {
  const mobile = window.matchMedia('(max-width:760px)').matches;
  const height = mobile ? Math.ceil(window.innerHeight - bottomNavigation.getBoundingClientRect().top) : 0;
  document.body.style.setProperty('--training-nav-clearance', `${height + 12}px`);
}
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(updateNavigationClearance).observe(bottomNavigation);
window.addEventListener('resize', updateNavigationClearance);
updateNavigationClearance();
const tabs = [...document.querySelectorAll('.training-tabs [role=tab]')];
tabs.forEach((tab, index) => { tab.addEventListener('click', () => showTab(tab.id.slice(4))); tab.addEventListener('keydown', event => { let i; if (event.key === 'ArrowRight') i = (index + 1) % tabs.length; if (event.key === 'ArrowLeft') i = (index + tabs.length - 1) % tabs.length; if (event.key === 'Home') i = 0; if (event.key === 'End') i = tabs.length - 1; if (i !== undefined) { event.preventDefault(); showTab(tabs[i].id.slice(4), true); } }); });
function focusExerciseHeading(){const heading=$('exerciseList').querySelector('.focused-exercise h3');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});heading.closest('article').scrollIntoView({block:'start',behavior:'instant'});}}
function renderSetupKeepingFocus(selector){renderWorkout();const setup=$('exerciseList').querySelector('.exercise-setup');if(setup){setup.open=true;const control=setup.querySelector(selector);control?.focus({preventScroll:true});control?.scrollIntoView({block:'nearest',behavior:'instant'});}}
function focusCurrentSet(){
  const heading=$('exerciseList').querySelector('.active-set h4, .exercise-finished strong');
  if(!heading)return;
  heading.tabIndex=-1;heading.focus({preventScroll:true});heading.scrollIntoView({block:'nearest',behavior:'instant'});
  const form=heading.closest('.active-set'),dock=$('restTimer');
  if(form&&!dock.hidden&&form.getBoundingClientRect().bottom>dock.getBoundingClientRect().top-12){
    heading.closest('article').scrollIntoView({block:'start',behavior:'instant'});
  }
}
function firstUnfinished() { return Math.max(0, state.draft?.exercises.findIndex(e => e.sets.some(s => !s.completed)) ?? 0); }
function syncForm() {
  $('blockStart').value = state.startDate; $('blockStart').disabled = Boolean(state.draft || state.sessions.length);
  $('workoutDate').value = state.draft?.date ?? localToday(); $('workoutDate').min = state.startDate;
  $('loadUnit').value = state.draft?.unit ?? state.unit;
  $('lighterSession').checked = state.draft?.lightWeek ?? false;
  const day = getProgramDay(state, $('workoutDate').value);
  $('sessionSelect').value = state.draft?.sessionId ?? day?.sessionId ?? NEW_SESSIONS[0].id;
}
function renderOverview() {
  const date = $('workoutDate').value || localToday();
  if(!isRealDate(date)||date<state.startDate){error('Choose a workout date on or after the training block start.');return;}
  const day = getProgramDay(state, date);
  const template = getSessionTemplate($('sessionSelect').value) ?? NEW_SESSIONS[0];
  const rest = day?.kind === 'rest';
  const p = getSessionPrescription(state, template.id, date, $('lighterSession').checked);
  const workingSets = count => Math.max(1, Math.ceil(count * p.setMultiplier));
  $('sessionReady').hidden = Boolean(state.draft) && !choosingSession;
  $('sessionContext').textContent = state.program ? `${date} · Day ${day.cycleDay} of 7` : 'Previous plan · your saved schedule';
  $('session-title').textContent = rest ? 'Rest day' : template.name;
  $('sessionFocus').textContent = rest ? 'Make room for recovery. The next gym day stays on your schedule.' : template.focus;
  $('sessionHero').classList.toggle('is-rest',rest);
  $('planHeading').hidden=rest;
  $('sessionInvitation').textContent=rest?'A little movement if you feel like it. Give yourself time to recover.':'Warm up, find your working load, then take it one set at a time.';
  $('sessionSize').textContent = rest ? 'No working sets scheduled' : `${template.exercises.length} exercises · ${template.exercises.reduce((n,e) => n + workingSets(e[1]),0)} working sets${template.duration ? ` · ${template.duration}` : ''}`;
  $('beginSession').textContent = rest ? 'View rotation' : day?.completed && day.sessionId === template.id ? 'Session saved · view history' : 'Start session';
  $('beginSession').dataset.action = rest ? 'program' : day?.completed && day.sessionId === template.id ? 'history' : 'start';
  if(state.draft){$('beginSession').textContent='Resume current session';$('beginSession').dataset.action='resume';}
  $('sessionPreview').replaceChildren();
  if (!rest) template.exercises.forEach(([id, count, repMin, repMax, variantId], index) => {
    const g = getExerciseGuide(id, variantId, { repMin, repMax }), row = el('li');
    const preview = button('', () => openExercise(id, variantId, {repMin:g.repMin,repMax:g.repMax}), 'preview-movement');
    const image = movementImage(g,'preview-photo');
    preview.append(image ?? el('span', String(index+1).padStart(2,'0'), 'preview-photo text-guide-mark'));
    const copy = el('span',undefined,'preview-copy'); copy.append(el('span',g.muscle,'eyebrow'),el('strong',g.name),el('span',`${workingSets(count)} sets × ${g.repMin}–${g.repMax} reps`,'small'));
    preview.append(copy,el('span','→','preview-arrow'));row.append(preview);$('sessionPreview').append(row);
  });
  $('adoptRotation').hidden = Boolean(state.program);
  const last = state.sessions.slice().reverse().find(s => s.sessionId === template.id); $('repeatLastLineup').hidden = !last;
  $('loadUnit').disabled = Boolean(state.draft?.exercises.some(hasNumbers));
  $('weekRail').replaceChildren();
  PROGRAM_DAYS.forEach((id, index) => {
    const item = el('li', undefined, day?.cycleDay === index + 1 ? 'is-current' : '');
    item.append(el('span', String(index + 1), 'program-day-number'));
    if(id){const template=getSessionTemplate(id),details=el('details'),summary=el('summary');summary.append(el('strong',template.name),el('span',`${template.exercises.reduce((n,e)=>n+e[1],0)} sets`,'small'));details.append(summary,el('p',template.focus,'program-focus'));const list=el('ul',undefined,'program-movements');template.exercises.forEach(([exerciseId,count,repMin,repMax,variantId])=>{const g=getExerciseGuide(exerciseId,variantId,{repMin,repMax});list.append(el('li',`${g.name} · ${count} × ${g.repMin}–${g.repMax}`));});details.append(list,el('p',`${template.duration} · 2 RIR`,'small'));item.append(details);}else {item.classList.add('is-rest');item.append(el('strong','Rest'),el('span','Recover & reset','small'));}
    $('weekRail').append(item);
  });
  $('programStatus').replaceChildren();
  if (!state.program) $('programStatus').append(el('p', 'Your existing log is preserved. Set a day below to begin this rotation.', 'small'));
  else $('programStatus').append(el('p', `Rotation anchored ${state.program.anchorDate}. Rest days stay scheduled even when a workout is partial.`, 'small'));
  $('phaseSummary').textContent = `${p.rir} RIR target${p.note ? ` · ${p.note}` : ''}`;
  syncTrainingScene();
}
function choices(select, current) {
  select.replaceChildren(); const placeholder = el('option','Choose a movement'); placeholder.value=''; select.append(placeholder);
  Object.values(EXERCISES).filter(ex=>ex.id!==current && !state.draft.exercises.some(e=>e.exerciseId===ex.id)).forEach(ex=>{const option=el('option',getExerciseGuide(ex.id).name);option.value=ex.id;select.append(option);});
}
function applyEdit(action) {
  try { if (!commit(editDraft(state, action), 'Session updated. Recorded sets preserved.')) return;
    if(action.type==='add') exerciseIndex=state.draft.exercises.length-1; else if(action.type==='move') exerciseIndex=action.to; else if(action.type==='swap') exerciseIndex=action.index;
    exerciseIndex=Math.min(exerciseIndex,state.draft.exercises.length-1); editingSet=null; renderWorkout(); renderOverview();
    $('workoutOrderStatus').textContent='Session updated.';
    if(['add','swap','remove','move'].includes(action.type))focusExerciseHeading();
  } catch(issue) {error(issue.message);}
}
function renderEditor() {
  $('sessionEditor').replaceChildren(); choices($('addExerciseSelect'));
  state.draft.exercises.forEach((entry,index)=>{
    const details=el('details',undefined,'edit-movement'); details.append(el('summary',`${index+1}. ${guide(entry).name}`));
    const moves=el('div',undefined,'button-row');
    const up=button('Move up',()=>applyEdit({type:'move',index,to:index-1}),'ghost'); up.disabled=index===0;
    const down=button('Move down',()=>applyEdit({type:'move',index,to:index+1}),'ghost');down.disabled=index===state.draft.exercises.length-1;moves.append(up,down);details.append(moves);
    const form=el('form',undefined,'prescription-edit');const fields={};
    for(const [key,label,value,max] of [['count','Sets',entry.prescribedSets,20],['repMin','Min reps',entry.repMin,100],['repMax','Max reps',entry.repMax,100]]) { const wrap=el('label',label);const input=el('input');Object.assign(input,{type:'number',min:'1',max:String(max),step:'1',required:true,value:String(value)});fields[key]=input;wrap.append(input);form.append(wrap); }
    const apply=el('button','Apply sets & reps','button secondary');apply.type='submit';form.append(apply);form.addEventListener('submit',e=>{e.preventDefault();applyEdit({type:'prescription',index,...Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,Number(v.value)]))});});details.append(form);
    const swap=el('select');swap.setAttribute('aria-label',`Replace ${guide(entry).name}`);choices(swap,entry.exerciseId);details.append(swap,button('Swap movement',()=>applyEdit({type:'swap',index,exerciseId:swap.value})),button('Remove movement',()=>applyEdit({type:'remove',index}),'ghost'),button('Clear numbers & checks',async()=>{if(!await confirmAction(`Clear every number and completion check for ${guide(entry).name}?`))return;if(mutate(next=>{next.draft.exercises[index].sets=entry.sets.map(()=>({load:'',reps:'',rir:'',clean:false,completed:false}));}))renderWorkout();},'ghost'));
    details.append(el('p','Clear entered numbers before swapping or removing. Reducing sets only removes blank sets.','small'));$('sessionEditor').append(details);
  });
}
function renderWorkout() {
  const draft=state.draft; document.body.classList.toggle('has-active-session',Boolean(draft)&&!choosingSession); $('activeWorkout').hidden=!draft || choosingSession; $('sessionReady').hidden=Boolean(draft) && !choosingSession;$('exerciseList').replaceChildren();$('exerciseRail').replaceChildren();syncTrainingScene();if(!draft)return;
  exerciseIndex=Math.max(0,Math.min(exerciseIndex,draft.exercises.length-1));
  $('active-title').textContent=nameOf(draft.sessionId);$('activeDate').textContent=`${draft.date}${draft.customized?' · Adapted':''}${draft.lightWeek?' · Lighter':''}`;
  updateProgress();
  draft.exercises.forEach((entry,index)=>{const b=button(String(index+1),()=>{exerciseIndex=index;editingSet=null;renderWorkout();focusExerciseHeading();},'exercise-step');b.classList.toggle('is-current',index===exerciseIndex);b.classList.toggle('is-done',entry.sets.every(s=>s.completed));b.setAttribute('aria-label',`${index+1}. ${guide(entry).name}, ${entry.sets.filter(s=>s.completed).length} of ${entry.prescribedSets} sets complete`);if(index===exerciseIndex)b.setAttribute('aria-current','step');$('exerciseRail').append(b);});
  const entry=draft.exercises[exerciseIndex], g=guide(entry), target=draft.targetRir??getPrescription(draft.week,draft.lightWeek).rir;
  const card=el('article',undefined,'focused-exercise'),heading=el('div',undefined,'movement-heading'),headingCopy=el('div',undefined,'movement-heading-copy');
  headingCopy.append(el('p',`EXERCISE ${exerciseIndex+1} OF ${draft.exercises.length} · ${g.muscle}`,'eyebrow'),el('h3',g.name),el('p',`${entry.prescribedSets} sets · ${entry.repMin}–${entry.repMax} reps · ${target} RIR`,'exercise-target'));
  heading.append(headingCopy);
  const exactPhoto=movementImage(g,'active-movement-photo');if(exactPhoto){const open=button('',()=>openExercise(entry.exerciseId,entry.variantId,entry),'active-photo-guide');open.setAttribute('aria-label',`Movement guide: ${g.name}`);open.append(exactPhoto);heading.append(open);}
  card.append(heading);
  const loadConvention=el('p',`Load: ${g.loadLabel ?? g.loadNote}`,'load-convention');loadConvention.id='loadConvention';card.append(loadConvention);
  const setup=el('details',undefined,'exercise-setup');setup.append(el('summary',entry.setup?`Setup · ${entry.setup}`:'Setup & movement guide'));
  const variantLabel=el('label','Exercise choice'), variant=el('select'); EXERCISES[entry.exerciseId].variants.forEach(v=>{const o=el('option',v.name);o.value=v.id;variant.append(o);});variant.value=entry.variantId;variant.disabled=hasNumbers(entry);variantLabel.append(variant);
  const setupLabel=el('label','Machine / bench setup'),setupInput=el('input');Object.assign(setupInput,{value:entry.setup,maxLength:120,placeholder:'e.g. seat 3, gym A',disabled:hasNumbers(entry)});setupLabel.append(setupInput);setup.append(variantLabel,setupLabel,el('p',g.loadNote,'small'),button('Movement guide',()=>openExercise(entry.exerciseId,entry.variantId,entry),'ghost'));
  variant.addEventListener('change',()=>{if(mutate(next=>{next.draft.exercises[exerciseIndex].variantId=variant.value;}))renderSetupKeepingFocus('select');else variant.value=state.draft.exercises[exerciseIndex].variantId;});
  setupInput.addEventListener('change',()=>{if(mutate(next=>{next.draft.exercises[exerciseIndex].setup=setupInput.value;}))renderSetupKeepingFocus('input');});
  if(hasNumbers(entry))setup.append(el('p','Setup locks after numbers are entered so comparisons stay consistent. Clear this movement in Edit session to change it.','small'));// Setup is placed below the set entry to keep the primary action in view.
  const previous=findLastEntry(state.sessions,entry.exerciseId,entry.variantId,draft.unit,entry.setup,draft.date);
  const prior=el('details',undefined,'previous-performance');prior.append(el('summary',previous?`Last time · ${previous.sets[0]?.load} ${draft.unit} × ${previous.sets[0]?.reps}${previous.sets.length>1?` + ${previous.sets.length-1} ${previous.sets.length===2?'set':'sets'}`:''}`:'No previous sets for this setup'));
  if(previous){prior.append(el('p',`${previous.date} · ${previous.sets.map(s=>`${s.load} ${draft.unit} × ${s.reps} @ ${s.rir} RIR`).join(' / ')}`,'small'));prior.append(el('p',previous.prescribedSets===entry.prescribedSets&&!previous.lightWeek?progressionSuggestion(previous,Math.max(target,previous.targetRir??target)).text:'Your prescription changed. Establish this full set count before increasing load.','small'));prior.append(button('Copy last numbers',async()=>{if(hasNumbers(state.draft.exercises[exerciseIndex])&&!await confirmAction('Replace these numbers with the previous session? All Clean and completed checks will be cleared.'))return;if(mutate(next=>{next.draft.exercises[exerciseIndex]=copyLastSets(next.draft.exercises[exerciseIndex],previous);},'Numbers copied. Perform each set, then mark it complete.')){editingSet=null;renderWorkout();focusCurrentSet();}},'ghost'));}else prior.append(el('p','Match exercise, setup, unit and an earlier date to compare. Start with a load you can control.','small'));// Previous comparisons sit below the current set.
  const index=editingSet!==null?editingSet:entry.sets.findIndex(s=>!s.completed);
  const ledger=el('div',undefined,'set-ledger');
  entry.sets.forEach((set,i)=>{if(i===index)return;const row=el('div',undefined,'set-summary');row.append(el('span',`Set ${i+1}`),el('span',set.completed?`${set.load} ${draft.unit} × ${set.reps} · ${set.rir} RIR${set.clean?' · Clean':''}`:'Not completed','small'));row.append(button(set.completed?'Edit':'Enter',()=>{editingSet=i;renderWorkout();focusCurrentSet();},'ghost'));ledger.append(row);});
  if(index>=0) {
    const set=entry.sets[index], form=el('form',undefined,'active-set');form.append(el('h4',`${set.completed?'Edit set':'Set'} ${index+1} of ${entry.prescribedSets}`));form.append(el('p',`${target} RIR: leave about ${target} good reps in reserve.`,'set-context'));const grid=el('div',undefined,'set-inputs'),fields={};
    for(const [key,label,min,max,step] of [['load',`Load (${draft.unit})`,0,3000,'any'],['reps','Reps',1,100,'1'],['rir','RIR',0,10,'0.5']]){const wrap=el('label',label),input=el('input');Object.assign(input,{type:'number',inputMode:key==='reps'?'numeric':'decimal',min:String(min),max:String(max),step,value:set[key],required:true});input.setAttribute('aria-label',`${g.name}, set ${index+1}, ${label}`);if(key==='load')input.setAttribute('aria-describedby','loadConvention');input.addEventListener('input',()=>{const value=input.value===''?'':Number(input.value);const next=structuredClone(state);const updated=next.draft.exercises[exerciseIndex].sets[index];updated[key]=value;updated.completed=false;if(commit(next)){variant.disabled=setupInput.disabled=hasNumbers(next.draft.exercises[exerciseIndex]);updateProgress();}});fields[key]=input;wrap.append(input);grid.append(wrap);}form.append(grid);
    const clean=el('label',undefined,'clean-control'),check=el('input');check.type='checkbox';check.checked=set.clean;check.addEventListener('change',()=>mutate(next=>{next.draft.exercises[exerciseIndex].sets[index].clean=check.checked;}));clean.append(check,el('span','Clean technique'),el('small','Controlled reps and range'));form.append(clean);
    const complete=el('button',set.completed?'Save completed set':'Complete set','button train-primary');complete.type='submit';form.append(complete);
    form.addEventListener('submit',event=>{event.preventDefault();if(Object.values(fields).some(input=>!input.validity.valid||input.value==='')){error('Enter a valid load, whole reps and RIR before completing the set.');return;}const next=structuredClone(state),s=next.draft.exercises[exerciseIndex].sets[index];for(const [key,input]of Object.entries(fields))s[key]=Number(input.value);s.clean=check.checked;s.completed=true;if(commit(next,'Set completed.')){editingSet=null;renderWorkout();startTimer(g.rest);celebrateSavedSet();focusCurrentSet();}});
    if(set.completed)form.append(button('Undo completion',()=>{if(mutate(next=>{next.draft.exercises[exerciseIndex].sets[index].completed=false;},'Completion undone. Numbers kept.')){editingSet=index;renderWorkout();}},'ghost'));
    card.append(form);
  }else{const complete=el('div',undefined,'exercise-finished');complete.append(el('strong','Exercise complete'),el('p','Every working set is logged.','small'));card.append(complete);}
  if(!previous)card.append(el('p','This is your baseline for this setup. Keep a controlled range and build from here.','baseline-note'));
  card.append(ledger,setup);if(previous)card.append(prior);$('exerciseList').append(card);
  $('previousExercise').disabled=exerciseIndex===0;$('nextExercise').textContent=exerciseIndex===draft.exercises.length-1?'Review & finish':'Next exercise';
  renderEditor();
}
async function startSession() {
  if(storageBlocked){save();return;}
  if(state.draft&&!await confirmAction('Replace the current draft and its recorded numbers?'))return;
  try{let next=structuredClone(state);next.unit=$('loadUnit').value;next.draft=createDraft(next,$('sessionSelect').value,$('workoutDate').value,$('lighterSession').checked);if(commit(next,'Session started. Sets save as you enter them.')){choosingSession=false;exerciseIndex=0;editingSet=null;renderOverview();renderWorkout();showTab('session');focusCurrentSet();}}catch(issue){error(issue.message);}
}
$('adoptRotation').addEventListener('click',()=>showTab('program'));
$('beginSession').addEventListener('click',()=>{const action=$('beginSession').dataset.action;if(action==='resume'){choosingSession=false;renderOverview();renderWorkout();}else if(action!=='start')showTab(action);else startSession();});
$('sessionForm').addEventListener('submit',event=>{event.preventDefault();startSession();});
$('chooseAnotherSession').addEventListener('click',()=>{choosingSession=true;renderOverview();renderWorkout();$('sessionReady').querySelector('details').open=true;$('session-title').scrollIntoView({block:'start'});});
$('addExercise').addEventListener('click',()=>applyEdit({type:'add',exerciseId:$('addExerciseSelect').value}));
$('previousExercise').addEventListener('click',()=>{exerciseIndex--;editingSet=null;renderWorkout();focusExerciseHeading();});
$('nextExercise').addEventListener('click',()=>{if(exerciseIndex===state.draft.exercises.length-1)finishSession();else{exerciseIndex++;editingSet=null;renderWorkout();focusExerciseHeading();}});
async function finishSession(){if(!state.draft)return;try{const next=finishDraft(state,makeId()),finished=next.sessions.at(-1);if(!await confirmAction(`${finished.partial?'Save partial session':'Finish session'} with ${doneCount(finished)} completed ${doneCount(finished)===1?'set':'sets'}?${finished.partial?' Unfinished sets and their numbers will be removed from this draft.':''}`))return;if(commit(next,`${doneCount(finished)} performed ${doneCount(finished)===1?'set':'sets'} saved.`)){editingSet=null;syncForm();renderOverview();renderWorkout();renderHistory();showTab('history');}}catch(issue){error(issue.message);}}
$('finishSession').addEventListener('click',finishSession);
$('discardDraft').addEventListener('click',async()=>{if(!await confirmAction('Discard this draft and all its entered numbers?'))return;if(mutate(next=>{next.draft=null;},'Draft discarded.')){syncForm();renderOverview();renderWorkout();}});
async function repeat(id){if(state.draft&&!await confirmAction('Replace your current draft with this lineup? Its recorded numbers will be discarded.'))return;try{if(commit(repeatSession(state,id,localToday()),'Lineup ready. All sets start blank.')){choosingSession=false;exerciseIndex=0;editingSet=null;syncForm();renderOverview();renderWorkout();showTab('session');focusCurrentSet();}}catch(issue){error(issue.message);}}
$('repeatLastLineup').addEventListener('click',()=>{const last=state.sessions.slice().reverse().find(s=>s.sessionId===$('sessionSelect').value);if(last)repeat(last.id);});
function renderHistory(){
  $('trainingHistory').replaceChildren();$('weekSummaries').replaceChildren();
  if(!state.sessions.length){const empty=el('div',undefined,'history-empty');empty.append(el('span','→','history-empty-mark'),el('h3','Your work starts here.'),el('p','Finish a session to start your training record. Every performed set counts, including a partial workout.','small'),button('Go to your session',()=>showTab('session'),'button train-primary'));$('trainingHistory').append(empty);return;}
  for(const [value,label]of [[state.sessions.length,'Saved sessions'],[state.sessions.reduce((n,s)=>n+doneCount(s),0),'Performed sets']]){const stat=el('div',undefined,'history-stat');stat.append(el('strong',String(value)),el('span',label));$('weekSummaries').append(stat);}
  state.sessions.slice().reverse().sort((a,b)=>b.date.localeCompare(a.date)).forEach(session=>{const details=el('details',undefined,'history-entry');details.append(el('summary',`${nameOf(session.sessionId)} · ${session.date}${session.partial?' · Partial':''}`),el('p',`${doneCount(session)} ${doneCount(session)===1?'set':'sets'}${session.lightWeek?' · Lighter':''}${session.customized?' · Adapted':''}`,'small'));session.exercises.filter(e=>e.sets.length).forEach(entry=>{details.append(el('h3',guide(entry).name));if(entry.setup)details.append(el('p',entry.setup,'small'));const list=el('ol');entry.sets.forEach(set=>list.append(el('li',`${set.load} ${session.unit} × ${set.reps} · ${set.rir} RIR · ${set.clean?'Clean':'Form not confirmed'}`)));details.append(list);});details.append(button('Repeat this lineup',()=>repeat(session.id)),button('Delete session',async()=>{if(!await confirmAction(`Delete ${nameOf(session.sessionId)} on ${session.date}? This cannot be undone.`))return;if(mutate(next=>{next.sessions=next.sessions.filter(s=>s.id!==session.id);},'Session deleted.')){renderHistory();renderOverview();}},'ghost'));$('trainingHistory').append(details);});
}
function renderLibrary(){const search=$('librarySearch').value.toLowerCase().trim(),muscle=$('libraryMuscle').value,groups={chest:/chest/i,back:/back/i,delts:/delts|shoulders/i,arms:/biceps|triceps/i,legs:/quads|hamstrings|glutes|calves/i,abs:/abs/i};$('exerciseLibrary').replaceChildren();Object.values(EXERCISES).forEach(ex=>{const g=getExerciseGuide(ex.id);if(muscle!=='all'&&!groups[muscle].test(ex.muscle)||!`${g.name} ${ex.muscle} ${ex.variants.map(v=>v.name).join(' ')}`.toLowerCase().includes(search))return;const tile=button('',()=>openExercise(ex.id,ex.variants[0].id),'exercise-tile');if(g.visual){const image=el('img');Object.assign(image,{src:`assets/images/exercises/${g.visual.imageId}-0.jpg`,alt:'',loading:'lazy',className:'exercise-thumb'});tile.append(image);}else tile.append(el('span','Guide','text-guide-mark'));const copy=el('span',undefined,'exercise-tile-copy');copy.append(el('span',g.muscle,'eyebrow'),el('strong',g.name),el('span',`${g.repMin}–${g.repMax} reps`,'small'));tile.append(copy);$('exerciseLibrary').append(tile);});if(!$('exerciseLibrary').children.length)$('exerciseLibrary').append(el('p','No matching movements. Try another name or muscle group.'));}
$('librarySearch').addEventListener('input',renderLibrary);$('libraryMuscle').addEventListener('change',renderLibrary);
for(const [label,sessions]of [['Current rotation',NEW_SESSIONS],['Previous templates',SESSIONS]]){const group=el('optgroup');group.label=label;sessions.forEach(s=>{const option=el('option',s.name);option.value=s.id;group.append(option);});$('sessionSelect').append(group);}
$('workoutDate').addEventListener('change',()=>{if(!isRealDate($('workoutDate').value))return;const day=getProgramDay(state,$('workoutDate').value);if(day?.sessionId)$('sessionSelect').value=day.sessionId;renderOverview();});$('sessionSelect').addEventListener('change',renderOverview);$('lighterSession').addEventListener('change',renderOverview);
$('loadUnit').addEventListener('change',()=>{if(state.draft?.exercises.some(hasNumbers)){$('loadUnit').value=state.draft.unit;return;}if(mutate(next=>{next.unit=$('loadUnit').value;if(next.draft)next.draft.unit=next.unit;},'Units changed. No weights converted.'))renderWorkout();});
$('blockStart').addEventListener('change',()=>{if(state.draft||state.sessions.length)return;if(!isRealDate($('blockStart').value)){error('Choose a valid block start date.');return;}if(mutate(next=>{next.startDate=$('blockStart').value;},'Block start saved.')){syncForm();renderOverview();}});
$('rotationDate').value=localToday();$('applyRotation').addEventListener('click',()=>{try{if(commit(setProgramDay(state,$('rotationDate').value,Number($('rotationDay').value)),'Rotation saved. Your workouts are preserved.')){syncForm();renderOverview();}}catch(issue){error(issue.message);}});
let timerEnd=0;function tickTimer(){const remaining=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));$('timerDisplay').textContent=`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;if(timerEnd&&!remaining){timerEnd=0;$('timerStatus').textContent='Rest complete. Start when ready.';}}
function startTimer(seconds){timerEnd=Date.now()+seconds*1000;document.body.classList.add('has-rest-timer');$('restTimer').hidden=false;$('timerStatus').textContent='Take your rest. Continue when ready.';tickTimer();}
$('stopTimer').addEventListener('click',()=>{timerEnd=0;tickTimer();$('restTimer').hidden=true;document.body.classList.remove('has-rest-timer');});setInterval(tickTimer,500);
syncForm();const params=new URLSearchParams(location.search),requested=params.get('session'),requestedDate=params.get('date');if(!state.draft){if(isRealDate(requestedDate)&&requestedDate>=state.startDate)$('workoutDate').value=requestedDate;if(getSessionTemplate(requested))$('sessionSelect').value=requested;}exerciseIndex=firstUnfinished();renderOverview();renderWorkout();renderHistory();renderLibrary();if(location.hash==='#history')showTab('history');
$('trainingStorageNotice').textContent=storageBlocked?'Saved data needs recovery. Existing records preserved.':persistent?'Saved automatically on this device.':'Browser storage is unavailable. Keep this page open; this session is temporary.';$('trainingStorageNotice').dataset.mode=persistent?'persistent':'memory';if(storageBlocked)save();
window.addEventListener('storage',event=>{if(event.key===TRAINING_KEY||event.key===null)location.reload();});
