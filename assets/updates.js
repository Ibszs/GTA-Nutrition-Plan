import { el } from './meal-utils.js';

export const APP_VERSION = '2.2.0';

export function initUpdates() {
  const settings=document.getElementById('backup');
  const status=el('p',`You’re viewing version ${APP_VERSION}.`,'status-line');status.id='updateStatus';status.setAttribute('role','status');
  const check=el('button','Check for updates','button ghost');check.type='button';
  if(settings){settings.append(el('h3','App updates'),status,check);}
  if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol)){check.disabled=true;status.textContent=`Version ${APP_VERSION}. Open the HTTPS app to enable offline updates.`;return;}
  let controlled=Boolean(navigator.serviceWorker.controller),available=false,banner;
  function ready(){
    available=true;status.textContent='An update is ready. Reload when you have finished editing.';
    if(banner)return;
    banner=el('aside',undefined,'update-banner');banner.setAttribute('aria-label','App update');
    banner.append(el('span','A fresh version is ready.'));
    const reload=el('button','Reload app');reload.type='button';reload.addEventListener('click',()=>location.reload());
    const later=el('button','Later','ghost');later.type='button';later.addEventListener('click',()=>{banner.remove();banner=null;});
    banner.append(reload,later);document.body.append(banner);
  }
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(controlled)ready();controlled=true;});
  const registration=navigator.serviceWorker.register('sw.js').catch(()=>{status.textContent='Offline setup could not finish. Reconnect and check for updates.';return null;});
  check.addEventListener('click',async()=>{
    if(available){ready();return;}
    if(!navigator.onLine){status.textContent='You’re offline. Reconnect to check for updates. Your saved entries are unchanged.';return;}
    check.disabled=true;status.textContent='Checking for an update…';
    try{
      const reg=await registration || await navigator.serviceWorker.register('sw.js');
      await reg.update();
      const worker=reg.installing;
      if(worker){
        status.textContent='Downloading the new app. Keep this page open.';
        await new Promise((resolve,reject)=>{const changed=()=>{if(worker.state==='activated'){worker.removeEventListener('statechange',changed);resolve();}else if(worker.state==='redundant'){worker.removeEventListener('statechange',changed);reject(new Error('Update could not install'));}};worker.addEventListener('statechange',changed);changed();});
      }
      if(!available)status.textContent=`No newer download found. You’re viewing version ${APP_VERSION}.`;
    }catch{status.textContent='Could not check for updates. Check your connection and try again. Your saved entries are unchanged.';}
    finally{check.disabled=false;}
  });
}
