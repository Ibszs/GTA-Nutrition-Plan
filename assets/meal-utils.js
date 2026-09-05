import { MEAL_PLANS, RECIPES, recipeNutrition } from './food-data.js';
import { PLANNER_KEY, createPlannerState, validatePlannerState } from './planner-state.js';
import { loadJson } from './common.js';

export function readPlanner(storage) {
  const raw=storage.getItem(PLANNER_KEY);
  return validatePlannerState(raw===null?createPlannerState():JSON.parse(raw));
}
export function wheyLabel(storage) {
  const whey=loadJson(storage,'gtaNutrition.whey.v1',null);
  if (!whey || ['scoopCalories','scoopProtein','scoopCarbs','scoopFat'].some(key=>whey[key]==='' || !Number.isFinite(Number(whey[key])) || Number(whey[key])<0)) return undefined;
  return {kcal:Number(whey.scoopCalories),protein:Number(whey.scoopProtein),carbs:Number(whey.scoopCarbs),fat:Number(whey.scoopFat)};
}
export function dayMenu(state,date) {
  const day=state.days[date] || {planId:'build',overrides:{},done:[]};
  const plan=MEAL_PLANS.find(plan=>plan.id===day.planId);
  return {day,plan,meals:plan.meals.map((meal,index)=>({...meal,recipe:day.overrides[index] || meal.recipe,done:day.done.includes(index)}))};
}
export function menuNutrition(menu,whey) {
  return menu.meals.reduce((total,meal)=>{
    const values=recipeNutrition(meal.recipe,whey);
    Object.keys(total).forEach(key=>total[key]+=values[key]);
    return total;
  },{kcal:0,protein:0,carbs:0,fat:0,fibre:0});
}
export const recipeById = id=>RECIPES.find(recipe=>recipe.id===id);
export const macroText = total=>`≈ ${Math.round(total.kcal).toLocaleString()} kcal · ${Math.round(total.protein)} g protein · ${Math.round(total.carbs)} g carbs · ${Math.round(total.fat)} g fat · ${Math.round(total.fibre)} g fibre`;
export const el = (tag,text,className)=>{
  const node=document.createElement(tag);
  if(text!==undefined) node.textContent=text;
  if(className) node.className=className;
  return node;
};
