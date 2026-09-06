import { initRecipeBook } from './recipe-book.js';
import { mealPhoto } from './meal-visuals.js';
import { icon, iconLabel } from './ui-icons.js';
import { openCalendar } from './calendar.js';
import { confirmAction } from './common.js';
import { FOODS, RECIPES, MEAL_PLANS, ACTIVE_RECIPES, ACTIVE_MEAL_PLANS, recipeNutrition, dayNutrition } from './food-data.js';
import { PLANNER_KEY, createPlannerState, validatePlannerState, weekDates, setDay, copyWeek } from './planner-state.js';
import { createStorage, saveJson } from './common.js';
import { formatLocalDate, buildLocalDates } from './core.js';
import { readPlanner, wheyLabel, dayMenu, menuNutrition, recipeById, macroText, el } from './meal-utils.js';

const {storage,persistent}=createStorage();
const $=id=>document.getElementById(id);
const today=formatLocalDate(new Date());
let state,readOnly=false;
try {state=readPlanner(storage);} catch(error) {state=createPlannerState();readOnly=true;status(`${error.message} Saved data was preserved. Restore a valid backup to edit.`,true);}
let selectedDate=weekDates(state.weekStart).includes(today)?today:state.weekStart;
const queryDate=new URLSearchParams(location.search).get('date');
if(queryDate){try{buildLocalDates(queryDate,1);selectedDate=queryDate;state.weekStart=weekDates(queryDate)[0];}catch{}}
function status(text,error=false){$('mealStatus').textContent=text;$('mealStatus').dataset.error=String(error);}
function update(transform,message='Saved on this browser.') {
  if(readOnly){status('Restore a valid backup before editing this planner.',true);return false;}
  try {
    const next=validatePlannerState(transform(structuredClone(state)));
    saveJson(storage,PLANNER_KEY,next);state=next;
    status(persistent?message:'Storage is blocked. Changes last only in this page; keep it open.',!persistent);
    return true;
  } catch(error){status(`Not saved: ${error.message}`,true);return false;}
}
function option(value,label){const node=el('option',label);node.value=value;return node;}
for(const plan of ACTIVE_MEAL_PLANS){$('dayPlan').append(option(plan.id,plan.name));$('fillPlan').append(option(plan.id,plan.name));}

function prettyDate(date,options={weekday:'long',month:'long',day:'numeric'}){return new Date(`${date}T12:00:00`).toLocaleDateString('en-CA',options);}
function renderCalendar(){
  $('mealWeek').value=state.weekStart;$('mealCalendar').replaceChildren();
  const dates = weekDates(state.weekStart);
  $('mealMonthLabel').textContent = prettyDate(selectedDate, { month: 'long', year: 'numeric' });
  $('mealWeekRange').textContent = `${prettyDate(dates[0], { month: 'short', day: 'numeric' })} – ${prettyDate(dates[6], { month: 'short', day: 'numeric' })}`;
  for(const date of weekDates(state.weekStart)){
    const {plan,day}=dayMenu(state,date);
    const node=el('button',undefined,'calendar-day');node.type='button';node.setAttribute('aria-pressed',String(selectedDate===date));
    node.setAttribute('aria-label',`${prettyDate(date)}: ${plan.name}, ${day.done.length} meals eaten`);
    if (date === today) node.setAttribute('aria-current', 'date');
    const dots = el('span', undefined, 'meal-dots'); dots.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 6; i++) dots.append(el('i', undefined, i < day.done.length ? 'eaten' : ''));
    node.append(el('small',prettyDate(date,{weekday:'short'})),el('b',String(Number(date.slice(8)))),dots);
    node.addEventListener('click',async()=>{selectedDate=date;render();});$('mealCalendar').append(node);
  }
}
$('chooseMealDate').addEventListener('click', () => openCalendar(selectedDate, date => {
  if (!update(current => ({ ...current, weekStart: weekDates(date)[0] }))) return false;
  selectedDate = date; render(); return true;
}, $('chooseMealDate')));
function renderMenu(){
  const menu=dayMenu(state,selectedDate);
  $('selectedDayTitle').textContent=prettyDate(selectedDate);
  $('mealCompletion').textContent=`${menu.day.done.length} of 6 eaten`;
  $('dayPlan').querySelectorAll('[data-archived]').forEach(node=>node.remove());
  const archived = !ACTIVE_MEAL_PLANS.some(plan=>plan.id===menu.plan.id);
  if(archived){const old=option(menu.plan.id,`Archived: ${menu.plan.name}`);old.disabled=true;old.dataset.archived='true';$('dayPlan').append(old);}
  $('archiveMenu').hidden=!archived;
  $('dayPlan').value=menu.plan.id;$('selectedPlanName').textContent=menu.plan.name;$('fillPlan').value=archived?'build':menu.plan.id;
  $('dayDescription').textContent=menu.plan.description;
  const nutrition=menuNutrition(menu,wheyLabel(storage));
  $('dayMacros').replaceChildren();
  for(const [key,label] of [['kcal','Calories'],['protein','Protein'],['carbs','Carbs'],['fat','Fat']]){
    const stat=el('div');stat.append(icon({kcal:'flame',protein:'beef',carbs:'wheat',fat:'droplets'}[key]),el('b',`${Math.round(nutrition[key]).toLocaleString('en-CA')}${key==='kcal'?'':' g'}`),el('span',label));$('dayMacros').append(stat);
  }
  $('dayMacros').setAttribute('aria-label',`Estimated nutrition: ${macroText(nutrition)}`);
  $('mealList').replaceChildren();
  menu.meals.forEach((meal,index)=>{
    const recipe=recipeById(meal.recipe);
    const row=el('article',undefined,`meal-row${meal.done?' done':''}`);
    const done=el('input');done.type='checkbox';done.checked=meal.done;done.setAttribute('aria-label',`Eaten: ${recipe.name}`);
    done.addEventListener('change',()=>{
      const day=structuredClone(dayMenu(state,selectedDate).day);
      day.done=done.checked?[...new Set([...day.done,index])]:day.done.filter(slot=>slot!==index);
      if(update(current=>setDay(current,selectedDate,day),'Meal check saved.'))render();
    });
    const copy=el('div');copy.append(el('div',meal.label,'eyebrow'),el('h3',recipe.name),el('p',`≈ ${Math.round(recipeNutrition(recipe.id,wheyLabel(storage)).kcal)} kcal · ${Math.round(recipeNutrition(recipe.id,wheyLabel(storage)).protein)} g protein · ${recipe.minutes} min`));
    const controls=el('div',undefined,'meal-tools');const view=el('button','Recipe','ghost');view.addEventListener('click',async()=>openRecipe(recipe.id));
    const swap=el('button','Swap','ghost');swap.setAttribute('aria-label',`Swap ${meal.label}`);swap.addEventListener('click',()=>openSwap(index));
    controls.append(view,swap);row.append(mealPhoto(recipe),done,copy,controls);$('mealList').append(row);
  });
}
function render(){renderCalendar();renderMenu();}
function moveWeek(delta){const date=new Date(`${state.weekStart}T12:00:00`);date.setDate(date.getDate()+delta);const next=formatLocalDate(date);if(update(current=>({...current,weekStart:weekDates(next)[0]}))) {selectedDate=state.weekStart;render();}}
$('previousWeek').addEventListener('click',async()=>moveWeek(-7));$('nextWeek').addEventListener('click',async()=>moveWeek(7));
$('currentWeek').addEventListener('click',async()=>{if(update(current=>({...current,weekStart:weekDates(today)[0]}))) {selectedDate=today;render();}});
$('mealWeek').addEventListener('change',()=>{try{const start=weekDates($('mealWeek').value)[0];if(update(current=>({...current,weekStart:start}))) {selectedDate=start;render();}}catch(error){status(error.message,true);}});
$('dayPlan').addEventListener('change',()=>{const value=$('dayPlan').value;if(update(current=>setDay(current,selectedDate,{planId:value,overrides:{},done:[]}),'Day plan saved. Grocery quantities updated.'))render();});
$('fillWeek').addEventListener('click',async()=>{
  if(!await confirmAction('Replace all seven menus and meal checks in this selected week?'))return;
  const planId=$('fillPlan').value;
  if(update(current=>weekDates(current.weekStart).reduce((next,date)=>setDay(next,date,{planId,overrides:{},done:[]}),current),'Week planned.'))render();
});
$('copyWeek').addEventListener('click',async()=>{
  const next=buildLocalDates(state.weekStart,8)[7];
  if(!await confirmAction(`Replace next week's menus (${next}) with this week? Meal checks start empty.`))return;
  if(update(current=>copyWeek(current,current.weekStart,next),'Menu copied to next week.')){selectedDate=next;render();}
});
function renderPlans(){
  $('planOptions').replaceChildren();
  ACTIVE_MEAL_PLANS.forEach(plan=>{
    const card=el('article',undefined,'plan-option');card.append(el('h3',plan.name),el('p',plan.description),el('p',macroText(dayNutrition(plan.id,wheyLabel(storage))),'macro-line'));
    const button=el('button','Use for selected day','ghost');button.addEventListener('click',async()=>{if(update(current=>setDay(current,selectedDate,{planId:plan.id,overrides:{},done:[]}))){render();$('plansDialog').close();$('selectedDayTitle').scrollIntoView({block:'start'});}});card.append(button);$('planOptions').append(card);
  });
}
const book = initRecipeBook({getState:()=>state, update, storage});
const openRecipe = id => book.open(id);
window.addEventListener('storage',()=>{try{state=readPlanner(storage);readOnly=false;render();renderPlans();book.refresh();}catch(error){readOnly=true;status(error.message,true);}});
if(!persistent)status('Storage is blocked. Changes last only in this page.',true);
render();renderPlans();

function openSwap(index){
  const meal=dayMenu(state,selectedDate).meals[index],currentRecipe=recipeById(meal.recipe);
  const date=selectedDate;
  $('swapTitle').textContent=`Swap ${meal.label.replace(/^\d{2}:\d{2} /,'').toLowerCase()}`;
  $('swapOptions').replaceChildren();
  for(const recipe of ACTIVE_RECIPES.filter(item=>item.category===currentRecipe.category)){
    const button=el('button',undefined,'choice-card');button.type='button';
    button.append(el('strong',recipe.name),el('span',macroText(recipeNutrition(recipe.id,wheyLabel(storage))),'small'));
    if(recipe.id===meal.recipe){button.append(el('span','Current meal','tag'));button.disabled=true;}
    button.addEventListener('click',()=>{
      const day=structuredClone(dayMenu(state,date).day);day.overrides[index]=recipe.id;day.done=day.done.filter(slot=>slot!==index);
      if(update(current=>setDay(current,date,day),'Meal swapped. Grocery quantities updated.')){
        $('swapDialog').close();render();
        $('mealList').querySelectorAll('.meal-tools')[index]?.querySelector('button:last-child')?.focus();
      }
    });$('swapOptions').append(button);
  }
  $('swapDialog').showModal();$('swapTitle').focus();
}
$('browsePlans').addEventListener('click',()=>{$('plansDialog').showModal();$('plansTitle').focus();});

$('chooseDayPlan').addEventListener('click',()=>{$('plansDialog').showModal();$('plansTitle').focus();});
