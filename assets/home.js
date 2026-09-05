import {createPersonalState,validatePersonalState} from './personal-state.js';
import { confirmAction } from './common.js';
import {
  buildBackup,
  createDefaultTrackerState,
  createDefaultWheyState,
  parseBackup,
  validateTrackerState,
  validateWheyState,
  restoreBackup,
  DATA_KEYS,
} from './backup.js';
import { createTrainingState, validateTrainingState } from './training-state.js';
import { createPlannerState, validatePlannerState } from './planner-state.js';
import { createStorage, downloadText, loadJson, saveJson } from './common.js';
import { calculateWheyLabel, formatLocalDate } from './core.js';
import { createDefaultShoppingState, shoppingProgress, validateShoppingState } from './shopping-state.js';

const KEYS = DATA_KEYS;
const { storage, persistent } = createStorage();
const elements = Object.fromEntries([
  'wheyCalories', 'wheyProtein', 'wheyCarbs', 'wheyFat', 'wheyResult',
  'homeStorageNotice', 'installButton', 'exportBackupButton', 'importBackupInput',
  'homeStatus', 'shoppingSummary', 'trackerSummary',
].map((id) => [id, document.getElementById(id)]));
const wheyFields = {
  wheyCalories: 'scoopCalories',
  wheyProtein: 'scoopProtein',
  wheyCarbs: 'scoopCarbs',
  wheyFat: 'scoopFat',
};

function trackerDefault() {
  return createDefaultTrackerState(formatLocalDate(new Date()));
}

function validatedLoad(key, fallback, validate) {
  const raw=storage.getItem(key);
  return validate(raw===null?fallback:JSON.parse(raw));
}

function currentData(includePersonal=false) {
  return {
    ...(includePersonal && storage.getItem(KEYS.personal)!==null ? {personal:validatedLoad(KEYS.personal,createPersonalState(),validatePersonalState)} : {}),
    shopping: validatedLoad(KEYS.shopping, createDefaultShoppingState(), validateShoppingState),
    tracker: validatedLoad(KEYS.tracker, trackerDefault(), validateTrackerState),
    whey: validatedLoad(KEYS.whey, createDefaultWheyState(), validateWheyState),
    training: validatedLoad(KEYS.training, createTrainingState(), validateTrainingState),
    planner: validatedLoad(KEYS.planner, createPlannerState(), validatePlannerState),
  };
}

let whey=createDefaultWheyState();
try {whey=validatedLoad(KEYS.whey,whey,validateWheyState);}catch(error){setStatus(`Saved label could not be loaded: ${error.message}`,true);}
let installPrompt = null;

function setStatus(message, error = false) {
  elements.homeStatus.textContent = message;
  elements.homeStatus.dataset.error = String(error);
}

function renderSummaries() {
  try {
  const data = currentData();
  const progress = shoppingProgress(data.shopping);
  const weights = data.tracker.rows.filter((row) => row.weight !== '').length;
  const intakeDays = data.tracker.rows.filter((row) => row.calories !== '').length;
  elements.shoppingSummary.textContent = `${progress.checked} of ${progress.total} items checked.`;
  elements.trackerSummary.textContent = `${weights} weight entries; ${intakeDays} calorie entries.`;
  } catch(error){setStatus(`Some saved data could not be read. Restore a valid backup. ${error.message}`,true);}
}

function renderWhey() {
  for (const [elementId, field] of Object.entries(wheyFields)) {
    elements[elementId].value = whey[field];
  }
  if (Object.values(wheyFields).some((field) => whey[field] === '')) {
    elements.wheyResult.textContent = 'Enter all four label values.';
    return;
  }

  try {
    const result = calculateWheyLabel(whey);
    elements.wheyResult.textContent = `Original day with this scoop: approximately ${Math.round(result.dailyCalories)} kcal, ${result.dailyProteinGrams} g protein, ${result.dailyCarbGrams} g carbs and ${result.dailyFatGrams} g fat. Meal portions stay unchanged. All menu estimates use this label.`;
  } catch (error) {
    elements.wheyResult.textContent = error.message;
  }
}

for (const [elementId, field] of Object.entries(wheyFields)) {
  elements[elementId].addEventListener('input', () => {
    whey[field] = elements[elementId].value;
    try {
      whey = validateWheyState(whey);
      saveJson(storage, KEYS.whey, whey);
      window.dispatchEvent(new CustomEvent('gta-data-changed', { detail: { section: 'whey' } }));
      renderWhey();
    } catch (error) {
      elements.wheyResult.textContent = error.message;
    }
  });
}

elements.exportBackupButton.addEventListener('click', async () => {
  try {
    const backup = buildBackup(currentData(true));
    const downloaded = downloadText('GTA-Nutrition-Backup.json', `${JSON.stringify(backup, null, 2)}\n`, 'application/json');
    setStatus(downloaded ? 'Complete backup downloaded.' : 'Backup download unavailable.', !downloaded);
  } catch (error) {
    setStatus(`Backup failed: ${error.message}`, true);
  }
});

elements.importBackupInput.addEventListener('change', async () => {
  const file = elements.importBackupInput.files?.[0];
  elements.importBackupInput.value = '';
  if (!file) return;
  try {
    const backup = parseBackup(await file.text());
    if (!await confirmAction(`Replace the saved sections included in this backup with “${file.name}”?`)) return;
    restoreBackup(storage,backup);
    const personalNote=backup.data.personal?' Personal log restored.':' Existing personal log was kept.';
    whey = backup.data.whey;
    renderWhey();
    renderSummaries();
    window.dispatchEvent(new CustomEvent('gta-data-changed'));
    setStatus((backup.version===1?'Older backup imported. Existing training and meal-calendar data were kept.':'Complete backup imported. Training, meals, shopping and progress restored.')+personalNote);
  } catch (error) {
    setStatus(`Import rejected: ${error.message}`, true);
  }
});

window.addEventListener('gta-data-changed', renderSummaries);
window.addEventListener('storage',()=>{try{whey=validatedLoad(KEYS.whey,createDefaultWheyState(),validateWheyState);renderWhey();}catch(error){setStatus(error.message,true);}renderSummaries();});
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  elements.installButton.hidden = false;
});
elements.installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  elements.installButton.hidden = true;
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  elements.installButton.hidden = true;
  setStatus('App installed.');
});

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register('sw.js').catch(() => setStatus('Offline setup will retry on next visit.', true));
}

if (!persistent) {
  elements.homeStorageNotice.dataset.mode = 'memory';
  elements.homeStorageNotice.textContent = 'Browser blocked local storage. Values last only until this tab closes; export a backup before leaving.';
}

renderWhey();
renderSummaries();
