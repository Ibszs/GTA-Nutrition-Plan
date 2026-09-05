import { FOODS, recipeGroceryTotals, quantityToBuy } from './food-data.js';
import { PLANNER_KEY, createPlannerState, validatePlannerState, weekDates } from './planner-state.js';
import { readPlanner, dayMenu, el } from './meal-utils.js';
import { createStorage, saveJson, copyText, downloadText } from './common.js';
const {storage,persistent}=createStorage();
const $=id=>document.getElementById(id);
let state,blocked=false;
try{state=readPlanner(storage);}catch(error){state=createPlannerState();blocked=true;status(`${error.message} Existing data was preserved. Restore a valid backup to edit.`,true);}
function status(message,error=false){$('plannedStatus').textContent=message;$('plannedStatus').dataset.error=String(error);}
function save(next){
  if(blocked){status('Restore a valid backup before changing this list.',true);return false;}
  try{const valid=validatePlannerState(next);saveJson(storage,PLANNER_KEY,valid);state=valid;status(persistent?'Shopping check saved.':'Storage blocked. These changes last only in this page.',!persistent);return true;}catch(error){status(`Not saved: ${error.message}`,true);return false;}
}
function totals(){return recipeGroceryTotals(weekDates(state.weekStart).flatMap(date=>dayMenu(state,date).meals.map(meal=>meal.recipe)));}
function amount(value,unit){return `${Number(value.toFixed(1)).toLocaleString()} ${unit}`;}
function render(){
  $('shopWeek').value=state.weekStart;$('generatedGroceries').replaceChildren();
  const items=totals(),by=$('shopGroup').value,groups=new Map();
  for(const item of items){const food=FOODS[item.food],group=food[by];if(!groups.has(group))groups.set(group,[]);groups.get(group).push(item);}
  let bought=0;
  for(const [name,items] of groups){
    const section=el('section',undefined,'shop-group');section.append(el('h3',name));
    for(const item of items){
      const food=FOODS[item.food],key=`${state.weekStart}:${item.food}`,checked=Boolean(state.checked[key]),stock=state.pantry[item.food]??0;
      if(checked)bought++;
      const row=el('div',undefined,`shop-row${checked?' checked':''}`);
      const tick=el('input');tick.type='checkbox';tick.checked=checked;tick.setAttribute('aria-label',`Bought ${food.name}`);
      const copy=el('div');copy.append(el('b',food.name,'food-name'),el('small',`Need ${amount(item.amount,food.unit)} · ${food.weightState}`));
      if(item.food==='banana')copy.append(el('small','This is peeled weight. Buy extra weight for the peel.'));
      if(item.food==='lemon')copy.append(el('small','Juice weight. Actual juice yield per lemon varies.'));
      if(item.food==='pita')copy.append(el('small','Use your pack weight to convert grams to pieces.'));
      const haveLabel=el('label','Have now','stock'),have=el('input');have.type='number';have.min='0';have.max='1000000';have.step=food.unit==='count'?'1':'0.1';have.inputMode='decimal';have.value=String(stock);have.setAttribute('aria-label',`Have ${food.name} in ${food.unit}`);haveLabel.append(have);
      const buy=el('div',`Buy ${amount(quantityToBuy(item.amount,stock),food.unit)}`,'buy');
      tick.addEventListener('change',()=>{const next=structuredClone(state);next.checked[key]=tick.checked;if(save(next)){row.classList.toggle('checked',tick.checked);updateSummary();}else tick.checked=checked;});
      have.addEventListener('input',()=>{
        if(have.value===''||!have.checkValidity()){status('Enter a non-negative stock amount, or 0 if you have none.',true);return;}
        const next=structuredClone(state);next.pantry[item.food]=Number(have.value);next.checked[key]=false;
        if(save(next)){tick.checked=false;row.classList.remove('checked');buy.textContent=`Buy ${amount(quantityToBuy(item.amount,Number(have.value)),food.unit)}`;updateSummary();}
      });
      row.append(tick,copy,haveLabel,buy);section.append(row);
    }
    $('generatedGroceries').append(section);
  }
  updateSummary();
}
function updateSummary(){const items=totals();const checked=items.filter(item=>state.checked[`${state.weekStart}:${item.food}`]).length;$('plannedSummary').textContent=`7 days · ${items.length} ingredients · ${checked} checked`;
}
$('shopWeek').addEventListener('change',()=>{try{const next={...state,weekStart:weekDates($('shopWeek').value)[0]};if(save(next))render();}catch(error){blocked=true;status(error.message,true);}});
$('shopGroup').addEventListener('change',render);
$('copyPlannedGroceries').addEventListener('click',async()=>{
  const lines=totals().map(item=>{const food=FOODS[item.food],need=quantityToBuy(item.amount,state.pantry[item.food]??0);return `${state.checked[`${state.weekStart}:${item.food}`]?'[x]':'[ ]'} ${food.name}: buy ${amount(need,food.unit)} (total needed ${amount(item.amount,food.unit)})`;});
  const text=`GROCERIES · WEEK OF ${state.weekStart}\nFor one person; quantities before package rounding.\n\n${lines.join('\n')}`;
  if(await copyText(text))status('Menu shopping list copied.');else if(downloadText('Menu-Groceries.txt',text))status('Text list downloaded.');else status('Copy unavailable. Use the visible list.',true);
});
window.addEventListener('storage',()=>{try{state=readPlanner(storage);blocked=false;render();}catch(error){blocked=true;status(error.message,true);}});
if(!persistent)status('Storage blocked. Changes last only in this page.',true);
render();
