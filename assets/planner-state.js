import { buildLocalDates, formatLocalDate } from './core.js';
import { FOODS, MEAL_PLANS, RECIPES } from './food-data.js';

export const PLANNER_KEY = 'gtaNutrition.planner.v1';
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const id = value => typeof value === 'string' && /^[a-z][a-zA-Z0-9-]{0,79}$/.test(value);
export function weekDates(date) {
  buildLocalDates(date, 1);
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() - (value.getDay() + 6) % 7);
  return buildLocalDates(formatLocalDate(value), 7);
}
export function createPlannerState(date = formatLocalDate(new Date())) {
  return {version:1, weekStart:weekDates(date)[0], days:{}, pantry:{}, checked:{}};
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
  return structuredClone(state);
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
