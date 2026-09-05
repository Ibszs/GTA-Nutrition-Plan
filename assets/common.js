export function createStorage(candidate) {
  let source;
  try {
    const storage = candidate ?? globalThis.localStorage;
    source=storage;
    const probe = '__gta_storage_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return { storage, persistent: true };
  } catch (_) {
    const values = new Map();
    return {
      persistent: false,
      storage: {
        getItem: (key) => {
          if(values.has(key))return values.get(key);
          try{return source?.getItem(key) ?? null;}catch{return null;}
        },
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.set(key,null),
      },
    };
  }
}

export function loadJson(storage, key, fallback) {
  const stored = storage.getItem(key);
  if (stored === null) return structuredClone(fallback);
  try {
    return JSON.parse(stored);
  } catch (_) {
    return structuredClone(fallback);
  }
}

export function saveJson(storage, key, value) {
  storage.setItem(key, JSON.stringify(value));
}

export function makeId(cryptoLike = globalThis.crypto) {
  if (cryptoLike?.randomUUID) return cryptoLike.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export async function copyText(text, clipboard = globalThis.navigator?.clipboard) {
  if (!clipboard?.writeText) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch (_) {
    return false;
  }
}

export function downloadText(filename, text, type = 'text/plain', environment = {}) {
  try {
    const documentObject = environment.document ?? globalThis.document;
    const urlObject = environment.URL ?? globalThis.URL;
    const BlobObject = environment.Blob ?? globalThis.Blob;
    const schedule = environment.schedule ?? globalThis.setTimeout;
    const blob = new BlobObject([text], { type });
    const url = urlObject.createObjectURL(blob);
    const anchor = documentObject.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    documentObject.body?.append(anchor);
    anchor.click();
    anchor.remove?.();
    schedule(() => urlObject.revokeObjectURL(url), 1000);
    return true;
  } catch (_) {
    return false;
  }
}


export function confirmAction(message) {
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');
    dialog.className='confirm-dialog';dialog.setAttribute('aria-label','Confirm change');
    const heading=document.createElement('h2');heading.textContent='Confirm change';
    const copy=document.createElement('p');copy.textContent=message;
    const actions=document.createElement('div');actions.className='button-row';
    const cancel=document.createElement('button');cancel.type='button';cancel.className='ghost';cancel.textContent='Cancel';
    const proceed=document.createElement('button');proceed.type='button';proceed.textContent='Continue';
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};
    cancel.addEventListener('click',()=>finish(false));proceed.addEventListener('click',()=>finish(true));
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
    actions.append(cancel,proceed);dialog.append(heading,copy,actions);document.body.append(dialog);dialog.showModal();cancel.focus();
  });
}

// Native dialogs contain focus and support Escape; the outer surface dismisses a sheet.
if(typeof document!=='undefined'){
  document.querySelectorAll('dialog').forEach(dialog=>{
    let backdropPress=false;
    dialog.addEventListener('pointerdown',event=>{backdropPress=event.target===dialog;});
    dialog.addEventListener('click',event=>{
      if(event.target===dialog && backdropPress){
        const box=dialog.getBoundingClientRect();
        if(event.clientX<box.left || event.clientX>box.right || event.clientY<box.top || event.clientY>box.bottom)dialog.close();
      }
      backdropPress=false;
    });
    dialog.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
  });
}
