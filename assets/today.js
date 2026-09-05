import { createStorage, saveJson } from './common.js';
import { buildLocalDates, formatLocalDate } from './core.js';
import { createDefaultTrackerState, validateTrackerState, archiveTracker } from './backup.js';
import { TRAINING_KEY, createTrainingState, validateTrainingState } from './training-state.js';
import { SESSIONS, getWeek } from './training-data.js';
import { readPlanner, dayMenu, menuNutrition, recipeById, wheyLabel, macroText, el } from './meal-utils.js';
import { weekDates } from './planner-state.js';
const {storage,persistent}=createStorage();
const $=id=>document.getElementById(id),today=formatLocalDate(new Date()),trackerKey='gtaNutrition.tracker.v2';
function readTracker(){const raw=storage.getItem(trackerKey);return raw===null?createDefaultTrackerState(today):validateTrackerState(JSON.parse(raw));}
function status(message,error=false){$('quickWeightStatus').textContent=message;$('quickWeightStatus').dataset.error=String(error);}
function render(){
  $('todayDate').textContent=new Date(`${today}T12:00:00`).toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric'});
  try {
    const raw=storage.getItem(TRAINING_KEY),training=raw===null?createTrainingState(today):validateTrainingState(JSON.parse(raw));
    const blockWeek=today<training.startDate?1:getWeek(training.startDate,today);
    const next=training.draft?SESSIONS.find(item=>item.id===training.draft.sessionId):SESSIONS.find(item=>!training.sessions.some(session=>session.week===blockWeek&&session.sessionId===item.id&&!session.partial))||SESSIONS[0];
    $('nextTrainingName').textContent=next.name;
    $('nextTrainingNote').textContent=training.draft?'Your workout is still open. Pick up where you left off.':`${next.focus || 'Build a repeatable session.'} Your last completed sets will be beside today's entries.`;
    $('trainingWeek').textContent=`WEEK ${blockWeek} OF 16 · ${training.draft?'SESSION IN PROGRESS':'NEXT IN YOUR ROTATION'}`;
    $('startTrainingLink').textContent=training.draft?'Resume workout ↗':'Open workout ↗';
    const dates=weekDates(today);$('todayWeek').replaceChildren();
    const schedule=['Upper A','Lower A','Recover','Upper B','Recover','Lower B','Recover'];
    for(const [index,date] of dates.entries()){
      const entries=training.sessions.filter(session=>session.date===date);
      const full=entries.some(session=>!session.partial);
      const node=el('div',undefined,`week-cell${date===today?' today':''}${full?' complete':''}`);
      node.append(el('div',new Date(`${date}T12:00:00`).toLocaleDateString('en-CA',{weekday:'short'})),el('b',schedule[index]),el('span',full?'Done':entries.length?'Partial':date===today?'Today':'Suggested'));
      $('todayWeek').append(node);
    }
    const fullCount=new Set(training.sessions.filter(session=>dates.includes(session.date)&&!session.partial).map(session=>session.sessionId)).size;
    $('weekSessions').textContent=`${fullCount} / 4`;
  } catch(error){$('nextTrainingNote').textContent=`Open Train to review saved data. ${error.message}`;}
  try {
    const menu=dayMenu(readPlanner(storage),today),meal=menu.meals.find(item=>!item.done);
    $('nextMealName').textContent=meal?recipeById(meal.recipe).name:'All six meals checked.';
    $('nextMealCopy').textContent=meal?`${meal.label}. ${menu.plan.name}.`:'Your menu is complete for today.';
    $('todayMacros').textContent=macroText(menuNutrition(menu,wheyLabel(storage)));
  } catch(error){$('todayMacros').textContent=`Open Meals to review saved data. ${error.message}`;}
  try {const tracker=readTracker(),index=buildLocalDates(tracker.meta.startDate,14).indexOf(today);if(index>=0){$('quickWeight').value=tracker.rows[index].weight;$('quickSleep').value=tracker.rows[index].sleep;}}catch(error){status(`Saved progress needs recovery: ${error.message}`,true);}
}
$('quickWeightForm').addEventListener('submit',event=>{
  event.preventDefault();
  try {
    let state=readTracker();
    if(today<state.meta.startDate)throw new Error('Your tracker begins in the future. Open Progress to review its dates.');
    if(today>buildLocalDates(state.meta.startDate,14)[13])state=archiveTracker(state,today);
    const index=buildLocalDates(state.meta.startDate,14).indexOf(today);
    const weight=Number($('quickWeight').value),sleep=$('quickSleep').value;
    if(!Number.isFinite(weight)||weight<=0||weight>1500||sleep!==''&&(!Number.isFinite(Number(sleep))||Number(sleep)<0||Number(sleep)>24))throw new Error('Check weight and sleep values.');
    state.rows[index].weight=String(weight);state.rows[index].sleep=sleep;
    saveJson(storage,trackerKey,validateTrackerState(state));
    status(persistent?'Morning saved. Open Progress to see your trend.':'Storage blocked. Keep this page open; this entry is temporary.',!persistent);
    window.dispatchEvent(new CustomEvent('gta-data-changed'));
  } catch(error){status(`Not saved: ${error.message}`,true);}
});
window.addEventListener('gta-data-changed',render);window.addEventListener('storage',render);render();
