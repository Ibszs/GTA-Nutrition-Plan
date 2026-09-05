import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalState, validatePersonalState, addPersonalEntry, referenceTime } from '../assets/personal-state.js';

test('empty personal log never invents an injection or reference time',()=>{
  assert.deepEqual(createPersonalState(),{version:1,entries:[]});
  assert.equal(referenceTime(createPersonalState()),null);
});
test('reference is exactly 84 elapsed hours across daylight saving and uses newest actual entry',()=>{
  const state=addPersonalEntry(createPersonalState(),{id:'one',at:'2026-10-30T12:00:00.000Z',amountMg:250,site:'',note:''},Date.parse('2026-11-05T00:00:00Z'));
  const next=addPersonalEntry(state,{id:'older',at:'2026-10-20T12:00:00.000Z',amountMg:200,site:'',note:''},Date.parse('2026-11-05T00:00:00Z'));
  assert.equal(referenceTime(next),'2026-11-03T00:00:00.000Z');
  assert.equal(state.entries.length,1);
});
test('actual log rejects future dates, duplicate timestamps and invalid amounts',()=>{
  const entry={id:'a',at:'2026-09-05T12:00:00.000Z',amountMg:250,site:'Left',note:'Test'};
  const now=Date.parse('2026-09-05T13:00:00Z');
  const state=addPersonalEntry(createPersonalState(),entry,now);
  assert.throws(()=>addPersonalEntry(state,{...entry,id:'b'},now),/already/i);
  assert.throws(()=>addPersonalEntry(createPersonalState(),entry,now-7200000),/future/i);
  for(const amountMg of [0,-1,Infinity,'250'])assert.throws(()=>validatePersonalState({version:1,entries:[{...entry,amountMg}]}));
  assert.throws(()=>validatePersonalState({version:1,entries:[{...entry,at:'2026-02-30T12:00:00Z'}]}));
  assert.throws(()=>validatePersonalState({version:1,entries:[{...entry,note:{html:'x'}}]}));
});
