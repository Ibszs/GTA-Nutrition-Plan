import {createStorage,makeId,saveJson,confirmAction,downloadText} from './common.js';
import {PERSONAL_KEY,createPersonalState,validatePersonalState,addPersonalEntry,referenceTime} from './personal-state.js';
const {storage,persistent}=createStorage();
const $=id=>document.getElementById(id);
let editing=null;
function read(){const raw=storage.getItem(PERSONAL_KEY);return raw===null?createPersonalState():validatePersonalState(JSON.parse(raw));}
function status(message,error=false){$('personalStatus').textContent=message;$('personalStatus').dataset.error=String(error);}
function localInput(iso=new Date().toISOString()){
  const date=new Date(iso);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}
function label(iso){return new Date(iso).toLocaleString('en-CA',{dateStyle:'medium',timeStyle:'short'})+' '+Intl.DateTimeFormat().resolvedOptions().timeZone;}
function node(tag,text){const element=document.createElement(tag);element.textContent=text;return element;}
function reset(){editing=null;$('personalForm').reset();$('pinAmount').value='250';$('pinTime').value=localInput();$('savePin').textContent='Save actual entry';$('cancelPinEdit').hidden=true;}
function save(state){saveJson(storage,PERSONAL_KEY,validatePersonalState(state));window.dispatchEvent(new CustomEvent('gta-data-changed',{detail:{section:'personal'}}));}
function render(){
  try{
    const state=read(),reference=referenceTime(state);
    $('personalReference').textContent=reference ? `84-hour reference after the latest entry: ${label(reference)}${Date.parse(reference)<Date.now()?' · Reference time has passed.':''}` : 'Log the first actual entry to calculate an 84-hour reference time.';
    $('personalHistory').replaceChildren();
    for(const entry of state.entries.slice().sort((a,b)=>b.at.localeCompare(a.at))){
      const card=node('article','');card.className='panel';
      card.append(node('h4',`${label(entry.at)} · ${entry.amountMg} mg`));
      if(entry.site)card.append(node('p',`Site: ${entry.site}`));
      if(entry.note)card.append(node('p',entry.note));
      const actions=node('div','');actions.className='button-row';
      const edit=node('button','Edit');edit.type='button';edit.className='ghost';edit.addEventListener('click',()=>{editing=entry.id;$('pinTime').value=localInput(entry.at);$('pinAmount').value=entry.amountMg;$('pinSite').value=entry.site;$('pinNote').value=entry.note;$('savePin').textContent='Save correction';$('cancelPinEdit').hidden=false;$('personalForm').scrollIntoView({block:'center'});});
      const remove=node('button','Delete');remove.type='button';remove.className='ghost';remove.addEventListener('click',async()=>{
        if(!await confirmAction('Delete this personal log entry? Export a backup first if you want to keep a copy.'))return;
        try{const current=read();save({...current,entries:current.entries.filter(item=>item.id!==entry.id)});if(editing===entry.id)reset();render();status('Entry deleted.');}catch(error){status(error.message,true);}
      });actions.append(edit,remove);card.append(actions);$('personalHistory').append(card);
    }
    if(!state.entries.length)$('personalHistory').append(node('p','No entries yet.'));
  }catch(error){status(`Saved data was preserved. Restore a valid backup to recover it. ${error.message}`,true);}
}
$('personalForm').addEventListener('submit',event=>{
  event.preventDefault();
  try{
    let state=read();const typed=$('pinTime').value,date=new Date(typed);
    if(!Number.isFinite(date.getTime()) || localInput(date.toISOString())!==typed)throw new Error('Choose a real local date and time.');
    const entry={id:editing??makeId(),at:editing && state.entries.find(item=>item.id===editing && localInput(item.at)===typed)?.at || date.toISOString(),amountMg:Number($('pinAmount').value),site:$('pinSite').value.trim(),note:$('pinNote').value.trim()};
    if(editing){if(!state.entries.some(item=>item.id===editing))throw new Error('This entry changed in another tab. Reload before editing.');state={...state,entries:state.entries.filter(item=>item.id!==editing)};}
    save(addPersonalEntry(state,entry));reset();render();status(persistent?'Saved on this browser.':'Temporary entry only. Export this log before leaving this page.',!persistent);
  }catch(error){status(`Not saved: ${error.message}`,true);}
});
$('cancelPinEdit').addEventListener('click',reset);
$('pinNow').addEventListener('click',()=>{$('pinTime').value=localInput();});
$('exportPersonal').addEventListener('click',()=>{try{status(downloadText('Personal-Log.json',JSON.stringify({application:'form-fuel-personal',data:read()},null,2),'application/json')?'Personal log exported. This file contains private health information.':'Export unavailable.',false);}catch(error){status(error.message,true);}});
$('showPersonal').addEventListener('click',()=>{
  if(!editing)$('pinTime').value=localInput();
  render();$('personalLog').showModal();$('showPersonal').setAttribute('aria-expanded','true');$('personalTitle').focus();
});
$('hidePersonal').addEventListener('click',()=>$('personalLog').close());
$('personalLog').addEventListener('close',()=>{$('showPersonal').setAttribute('aria-expanded','false');$('showPersonal').focus();});
window.addEventListener('storage',event=>{if(event.key===PERSONAL_KEY || event.key===null){reset();render();}});
window.addEventListener('gta-data-changed',event=>{if(event.detail?.section!=='personal')render();});
reset();
