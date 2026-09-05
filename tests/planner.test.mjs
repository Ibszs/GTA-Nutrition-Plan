import test from 'node:test';
import assert from 'node:assert/strict';
import * as planner from '../assets/planner-state.js';

test('a Monday week includes Sunday without a UTC date shift', () => {
  assert.deepEqual(planner.weekDates('2026-09-06'), ['2026-08-31','2026-09-01','2026-09-02','2026-09-03','2026-09-04','2026-09-05','2026-09-06']);
});
test('calendar changes are date-isolated and copied weeks clear meal checks', () => {
  let state = planner.createPlannerState('2026-09-07');
  state = planner.setDay(state, '2026-09-07', {planId:'original', overrides:{}, done:[0]});
  state = planner.copyWeek(state, '2026-09-07', '2026-09-14');
  assert.deepEqual(state.days['2026-09-14'].done, []);
  assert.deepEqual(state.days['2026-09-07'].done, [0]);
  assert.equal(state.days['2026-09-14'].planId, 'original');
});
test('planner rejects impossible dates, negative pantry stock and prototype-shaped day keys', () => {
  const state = planner.createPlannerState('2026-09-07');
  assert.throws(() => planner.setDay(state,'2026-02-30',{planId:'original',overrides:{},done:[]}));
  assert.throws(() => planner.validatePlannerState({...state,pantry:{rice:-1}}));
  assert.throws(() => planner.validatePlannerState({...state,days:JSON.parse('{"__proto__":{}}')}));
});
test('meal completion preserves shopping ticks but a different menu clears them', () => {
  const state=planner.createPlannerState('2026-09-07');
  state.days['2026-09-07']={planId:'original',overrides:{},done:[]};
  state.checked['2026-09-07:rice']=true;
  const eaten=planner.setDay(state,'2026-09-07',{planId:'original',overrides:{},done:[0]});
  assert.equal(eaten.checked['2026-09-07:rice'],true);
  const changed=planner.setDay(eaten,'2026-09-07',{planId:'busy-day',overrides:{},done:[]});
  assert.equal(changed.checked['2026-09-07:rice'],undefined);
});


test('malformed stored menu is rejected instead of silently replaced', async () => {
  const { readPlanner }=await import('../assets/meal-utils.js');
  assert.throws(()=>readPlanner({getItem:()=>'{broken'}),SyntaxError);
  assert.equal(readPlanner({getItem:()=>null}).version,1);
});
