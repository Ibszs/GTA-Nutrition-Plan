import { mealPhoto } from './meal-visuals.js';
import { icon, iconLabel } from './ui-icons.js';
import { createStorage, saveJson } from './common.js';
import { buildLocalDates, formatLocalDate } from './core.js';
import { createDefaultTrackerState, validateTrackerState, archiveTracker } from './backup.js';
import { TRAINING_KEY, createTrainingState, validateTrainingState } from './training-state.js';
import { SESSIONS, getWeek } from './training-data.js';
import { readPlanner, dayMenu, recipeById, el } from './meal-utils.js';
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
    $('nextTrainingNote').textContent=training.draft?'Your workout is still open. Pick up where you left off.':`${next.focus} · 60–75 min`;
    $('trainingWeek').textContent=`WEEK ${blockWeek} OF 16 · ${training.draft?'SESSION IN PROGRESS':'NEXT IN YOUR ROTATION'}`;
    iconLabel($('startTrainingLink'), training.draft?'Resume workout':'Start your workout', 'arrow-up-right', true);
    const dates=weekDates(today);$('todayWeek').replaceChildren();
    const dateText = date => new Date(`${date}T12:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
    $('homeWeekRange').textContent = `${dateText(dates[0])} – ${dateText(dates[6])}, ${dates[6].slice(0,4)}`;
    const schedule=['Upper A','Lower A','Recover','Upper B','Recover','Lower B','Recover'];
    for(const [index,date] of dates.entries()){
      const entries=training.sessions.filter(session=>session.date===date);
      const full=entries.some(session=>!session.partial);
      const node=el('a',undefined,`week-cell${date===today?' today':''}${full?' complete':''}`);
      node.href=entries.length?'training.html#history':index===2||index===4||index===6?'plan.html':'training.html?session='+['upper-a','lower-a','','upper-b','','lower-b',''][index];
      if (date === today) node.setAttribute('aria-current', 'date');
      const heading = el('div', undefined, 'week-date-heading');
      heading.append(el('span', new Date(`${date}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'short' }), 'week-weekday'), el('strong', String(Number(date.slice(8))), 'week-date'));
      const sessionName = entries.length ? [...new Set(entries.map(entry => SESSIONS.find(s => s.id === entry.sessionId).name))].join(' + ') : schedule[index];
      node.append(heading, icon(full ? 'check-check' : sessionName === 'Recover' ? 'moon' : 'dumbbell', 'ui-icon week-session-icon'), el('b', sessionName), el('span', full ? 'Completed' : entries.length ? 'Partial' : date === today ? 'Today' : 'Planned', 'week-state'));
      $('todayWeek').append(node);
    }
    if (matchMedia('(max-width: 760px)').matches) {
      const current = $('todayWeek').querySelector('.today');
      $('todayWeek').scrollLeft = current.offsetLeft - $('todayWeek').offsetLeft - $('todayWeek').clientWidth / 2 + current.clientWidth / 2;
    }
    const fullCount=new Set(training.sessions.filter(session=>dates.includes(session.date)&&!session.partial).map(session=>session.sessionId)).size;
    $('weekSessions').textContent=`${fullCount} / 4 sessions`;
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
window.addEventListener('gta-data-changed',render);window.addEventListener('storage',render);render();
