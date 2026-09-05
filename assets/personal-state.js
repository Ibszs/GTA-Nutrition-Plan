export const PERSONAL_KEY = 'gtaNutrition.personal.v1';
export const INTERVAL_HOURS = 84;
export function createPersonalState() { return {version:1,entries:[]}; }
export function validatePersonalState(state) {
  const fail=message=>{throw new Error(`Personal log: ${message}`);};
  if(!state || state.version!==1 || !Array.isArray(state.entries) || state.entries.length>5000)fail('invalid saved data.');
  const ids=new Set(),times=new Set();
  for(const entry of state.entries){
    if(!entry || typeof entry.id!=='string' || !entry.id || entry.id.length>100 || ids.has(entry.id))fail('invalid or duplicate entry ID.');
    if(typeof entry.at!=='string' || !Number.isFinite(Date.parse(entry.at)) || new Date(entry.at).toISOString()!==entry.at)fail('invalid date and time.');
    if(times.has(entry.at))fail('this time is already logged.');
    if(typeof entry.amountMg!=='number' || !Number.isFinite(entry.amountMg) || entry.amountMg<=0 || entry.amountMg>10000)fail('enter a positive numeric amount in mg.');
    if(typeof entry.site!=='string' || entry.site.length>80 || typeof entry.note!=='string' || entry.note.length>500)fail('invalid site or note.');
    ids.add(entry.id);times.add(entry.at);
  }
  return structuredClone(state);
}
export function addPersonalEntry(state,entry,now=Date.now()) {
  if(Date.parse(entry.at)>now)throw new Error('Record an actual event, not a future time.');
  return validatePersonalState({...state,entries:[...state.entries,entry]});
}
export function referenceTime(state) {
  const valid=validatePersonalState(state);
  if(!valid.entries.length)return null;
  return new Date(Math.max(...valid.entries.map(entry=>Date.parse(entry.at)))+INTERVAL_HOURS*3600000).toISOString();
}
