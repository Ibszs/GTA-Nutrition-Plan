import { buildLocalDates, formatLocalDate } from './core.js';
import { FOODS, MEAL_PLANS, RECIPES } from './food-data.js';
import { getRecipeGuide } from './recipe-guides.js';

export const PLANNER_KEY = 'gtaNutrition.planner.v1';
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const id = value => typeof value === 'string' && /^[a-z][a-zA-Z0-9-]{0,79}$/.test(value);
export function weekDates(date) {
  buildLocalDates(date, 1);
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() - (value.getDay() + 6) % 7);
  return buildLocalDates(formatLocalDate(value), 7);
}

export function monthGrid(date) {
  buildLocalDates(date, 1);
  const first = `${date.slice(0, 7)}-01`;
  return buildLocalDates(weekDates(first)[0], 42);
}

export function shiftCalendarMonth(date, delta) {
  buildLocalDates(date, 1);
  if (!Number.isInteger(delta)) throw new Error('Month offset must be a whole number.');
  const value = new Date(`${date}T12:00:00`);
  const day = value.getDate();
  value.setDate(1);
  value.setMonth(value.getMonth() + delta);
  const last = new Date(value.getFullYear(), value.getMonth() + 1, 0, 12).getDate();
  value.setDate(Math.min(day, last));
  return buildLocalDates(formatLocalDate(value), 1)[0];
}
export function createPlannerState(date = formatLocalDate(new Date())) {
  return {version:1, weekStart:weekDates(date)[0], days:{}, pantry:{}, checked:{}, recipeBook:{}};
}
export function validatePlannerState(state) {
  if (!object(state) || state.version !== 1 || !object(state.days) || !object(state.pantry) || !object(state.checked)) throw new Error('Meal planner data is not valid.');
  buildLocalDates(state.weekStart,1);
  if (weekDates(state.weekStart)[0] !== state.weekStart) throw new Error('Meal week must start on Monday.');
  for (const [date,day] of Object.entries(state.days)) {
    buildLocalDates(date,1);
    if (!object(day) || !MEAL_PLANS.some(plan=>plan.id===day.planId) || !object(day.overrides) || !Array.isArray(day.done)) throw new Error('Meal day is not valid.');
    for (const [slot,recipe] of Object.entries(day.overrides)) {
      if (!/^[0-5]$/.test(slot) || !RECIPES.some(item=>item.id===recipe)) throw new Error('Meal replacement is not valid.');
    }
    if (new Set(day.done).size !== day.done.length || day.done.some(slot => !Number.isInteger(slot) || slot<0 || slot>5)) throw new Error('Meal checks are not valid.');
  }
  for (const [food,amount] of Object.entries(state.pantry)) {
    if (!id(food) || !Object.hasOwn(FOODS,food) || !Number.isFinite(amount) || amount < 0 || amount > 1000000) throw new Error('Pantry amounts must be non-negative numbers.');
  }
  for (const [key,value] of Object.entries(state.checked)) {
    if (!/^\d{4}-\d{2}-\d{2}:[a-z][a-zA-Z0-9-]{0,79}$/.test(key) || !Object.hasOwn(FOODS,key.slice(11)) || typeof value !== 'boolean') throw new Error('Shopping checks are not valid.');
    buildLocalDates(key.slice(0,10),1);
  }
  const recipeBook = state.recipeBook ?? {};
  if (!object(recipeBook)) throw new Error('Saved recipes are not valid.');
  for (const [recipeId, record] of Object.entries(recipeBook)) {
    const recipe = RECIPES.find(item => item.id === recipeId);
    if (!recipe || !object(record) || typeof record.saved !== 'boolean' || typeof record.note !== 'string' || record.note.length > 2000 || !Number.isInteger(record.servings) || record.servings < 1 || record.servings > 7) throw new Error('Saved recipe details are not valid.');
    if (!Array.isArray(record.checked) || new Set(record.checked).size !== record.checked.length || record.checked.some(index => !Number.isInteger(index) || index < 0 || index >= recipe.ingredients.length)) throw new Error('Recipe ingredient checks are not valid.');
    if (record.step !== null && (!Number.isInteger(record.step) || record.step < 0 || record.step > getRecipeGuide(recipeId).steps.length)) throw new Error('Cooking progress is not valid.');
  }
  return structuredClone({...state, recipeBook});
}

export function recipeRecord(state, recipeId) {
  return structuredClone(state.recipeBook?.[recipeId] ?? {saved:false, servings:1, checked:[], step:null, note:''});
}

export function setRecipeRecord(state, recipeId, changes) {
  if (!RECIPES.some(recipe => recipe.id === recipeId) || !object(changes)) throw new Error('Choose a valid recipe.');
  const next = validatePlannerState(state);
  const current = recipeRecord(next, recipeId);
  next.recipeBook[recipeId] = {...current, ...changes};
  if (changes.servings !== undefined && changes.servings !== current.servings) {
    if (!Object.hasOwn(changes, 'checked')) next.recipeBook[recipeId].checked = [];
    if (!Object.hasOwn(changes, 'step')) next.recipeBook[recipeId].step = null;
  }
  return validatePlannerState(next);
}
export function setDay(state,date,day) {
  buildLocalDates(date,1);
  const next = validatePlannerState(state);
  const previous=state.days[date] || {planId:'build',overrides:{},done:[]};
  next.days[date] = structuredClone(day);
  // A changed menu needs a fresh ingredient check, not stale purchase ticks.
  const prefix = `${weekDates(date)[0]}:`;
  if (previous.planId !== day.planId || JSON.stringify(previous.overrides) !== JSON.stringify(day.overrides)) {
    for (const key of Object.keys(next.checked)) if (key.startsWith(prefix)) delete next.checked[key];
  }
  return validatePlannerState(next);
}
export function copyWeek(state,from,to) {
  const next = validatePlannerState(state);
  const source = weekDates(from), target = weekDates(to);
  source.forEach((date,index) => {
    const day = state.days[date] || {planId:'build',overrides:{},done:[]};
    next.days[target[index]] = {...structuredClone(day),done:[]};
  });
  next.weekStart = target[0];
  for (const key of Object.keys(next.checked)) if (key.startsWith(`${target[0]}:`)) delete next.checked[key];
  return validatePlannerState(next);
}
