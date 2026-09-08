import { mealPhoto } from './meal-visuals.js';
import { icon, iconLabel } from './ui-icons.js';
import { createStorage, saveJson } from './common.js';
import { buildLocalDates, formatLocalDate } from './core.js';
import { createDefaultTrackerState, validateTrackerState, archiveTracker } from './backup.js';
import { TRAINING_KEY, createTrainingState, validateTrainingState } from './training-state.js';
import { getProgramDay, getSessionTemplate } from './training-program.js';
import { readPlanner, dayMenu, recipeById, el } from './meal-utils.js';
import { weekDates } from './planner-state.js';
const {storage,persistent}=createStorage();
const $=id=>document.getElementById(id),trackerKey='gtaNutrition.tracker.v2';
let today=formatLocalDate(new Date());
function readTracker(){const raw=storage.getItem(trackerKey);return raw===null?createDefaultTrackerState(today):validateTrackerState(JSON.parse(raw));}
function status(message,error=false){$('quickWeightStatus').textContent=message;$('quickWeightStatus').dataset.error=String(error);}
function render(){
  today=formatLocalDate(new Date());
  $('todayDate').textContent=new Date(`${today}T12:00:00`).toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric'});
  try {
    const raw=storage.getItem(TRAINING_KEY),training=raw===null?createTrainingState(today):validateTrainingState(JSON.parse(raw));
    const planned=getProgramDay(training,today),active=training.draft;
    const next=getSessionTemplate(active?.sessionId ?? planned.sessionId);
    const savedState=planned.completed?'Completed':planned.partial?'Partial session saved':planned.kind==='rest'?'Rest day':planned.kind==='before-start'?'Not started':'Planned workout';
    $('nextTrainingName').textContent=active?next.name:next?.name ?? (planned.kind==='rest'?'Rest day':'Your program starts '+training.startDate);
    $('nextTrainingNote').textContent=active?`Resume your workout from ${active.date}.${planned.kind==='rest'?' Today is a planned rest day.':''}`:planned.completed?'Today’s planned session is saved. Recover and follow the next calendar day.':planned.partial?'Your partial session is saved. Review it in History; the calendar stays unchanged.':next?`${next.focus} · ${next.duration ?? '60–75 min'}`:planned.kind==='rest'?'Recover today. An easy walk is optional; your next workout stays on the calendar.':'Open Train to review your start date and program.';
    $('trainingWeek').textContent=active?'SESSION IN PROGRESS':`DAY ${planned.cycleDay} OF 7 · ${savedState.toUpperCase()}`;
    $('startTrainingLink').href=active?'training.html':planned.completed||planned.partial?'training.html#history':next?`training.html?session=${next.id}&date=${today}`:'training.html';
    iconLabel($('startTrainingLink'),active?'Resume workout':planned.completed||planned.partial?'Review session':next?'Start workout':'View program','arrow-up-right',true);
    if(!training.program && !active){
      $('trainingWeek').textContent='PREVIOUS PLAN';
      $('nextTrainingNote').textContent+=' Your previous plan is preserved. Choose the five-day rotation in Train when ready.';
      $('startTrainingLink').href='training.html';
      iconLabel($('startTrainingLink'),'Choose five-day rotation','arrow-up-right',true);
    }
    const dates=weekDates(today);$('todayWeek').replaceChildren();
    const dateText = date => new Date(`${date}T12:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
    $('homeWeekRange').textContent = `${dateText(dates[0])} – ${dateText(dates[6])}, ${dates[6].slice(0,4)}`;
    for(const date of dates){
      const day=getProgramDay(training,date),template=getSessionTemplate(day.sessionId);
      const entries=training.sessions.filter(session=>session.date===date);
      const full=entries.some(session=>!session.partial);
      const node=el('a',undefined,`week-cell${date===today?' today':''}${full?' complete':''}`);
      node.href=entries.length?'training.html#history':template?`training.html?session=${template.id}&date=${date}`:'training.html';
      if(date===today)node.setAttribute('aria-current','date');
      const heading=el('div',undefined,'week-date-heading');
      heading.append(el('span',new Date(`${date}T12:00:00`).toLocaleDateString('en-CA',{weekday:'short'}),'week-weekday'),el('strong',String(Number(date.slice(8))),'week-date'));
      const names=entries.length?[...new Set(entries.map(entry=>getSessionTemplate(entry.sessionId).name))].join(' + '):template?.name ?? (day.kind==='rest'?'Rest':'Before start');
      node.append(heading,icon(full?'check-check':day.kind==='rest'&&!entries.length?'moon':'dumbbell','ui-icon week-session-icon'),el('b',names),el('span',full?'Completed':entries.length?'Partial':day.kind==='rest'?'Recovery':day.kind==='before-start'?'Not started':date===today?'Today':'Planned','week-state'));
      $('todayWeek').append(node);
    }
    if(matchMedia('(max-width: 760px)').matches){
      const current=$('todayWeek').querySelector('.today');
      if(current)$('todayWeek').scrollLeft=current.offsetLeft-$('todayWeek').offsetLeft-$('todayWeek').clientWidth/2+current.clientWidth/2;
    }
    const plannedDays=dates.map(date=>getProgramDay(training,date)).filter(day=>day.kind==='session');
    const completeCount=plannedDays.filter(day=>day.completed).length;
    $('weekSessions').textContent=`${completeCount} / ${plannedDays.length} planned sessions`;
  } catch(error){$('nextTrainingNote').textContent=`Open Train to review saved data. ${error.message}`;}
  try {
    const menu=dayMenu(readPlanner(storage),today),meal=menu.meals.find(item=>!item.done);
    $('nextMealName').textContent=meal?recipeById(meal.recipe).name:'All six meals checked.';
    $('nextMealCopy').textContent=meal?`${meal.label}. ${menu.plan.name}.`:'Your menu is complete for today.';
    $('todayMacros').textContent=meal?`${recipeById(meal.recipe).minutes} min · View ingredients & method`:'';
    $('homeMealPhoto').replaceChildren(mealPhoto(recipeById(meal?.recipe||menu.meals[0].recipe)));
    $('homeMealLink').href=meal?`meals.html?recipe=${meal.recipe}`:'meals.html';
    iconLabel($('homeMealLink'), meal?'Make this meal':'View today’s menu', 'arrow-up-right', true);
    $('mealsEaten').textContent=`${menu.day.done.length} of 6 meals eaten`;
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
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});window.addEventListener('focus',render);window.addEventListener('gta-data-changed',render);window.addEventListener('storage',render);render();
