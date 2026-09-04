import {
  buildBackup,
  createDefaultTrackerState,
  createDefaultWheyState,
  parseBackup,
  validateTrackerState,
  validateWheyState,
} from './backup.js';
import { createStorage, downloadText, loadJson, saveJson } from './common.js';
import { calculateWheyLabel, formatLocalDate } from './core.js';
import { createDefaultShoppingState, shoppingProgress, validateShoppingState } from './shopping-state.js';

const KEYS = {
  shopping: 'gtaNutrition.shopping.v2',
  tracker: 'gtaNutrition.tracker.v2',
  whey: 'gtaNutrition.whey.v1',
};
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
  try {
    return validate(loadJson(storage, key, fallback));
  } catch (_) {
    return fallback;
  }
}

function currentData() {
  return {
    shopping: validatedLoad(KEYS.shopping, createDefaultShoppingState(), validateShoppingState),
    tracker: validatedLoad(KEYS.tracker, trackerDefault(), validateTrackerState),
    whey: validatedLoad(KEYS.whey, createDefaultWheyState(), validateWheyState),
  };
}

let whey = currentData().whey;
let installPrompt = null;

function setStatus(message, error = false) {
  elements.homeStatus.textContent = message;
  elements.homeStatus.dataset.error = String(error);
}

function renderSummaries() {
  const data = currentData();
  const progress = shoppingProgress(data.shopping);
  const weights = data.tracker.rows.filter((row) => row.weight !== '').length;
  const intakeDays = data.tracker.rows.filter((row) => row.calories !== '').length;
  elements.shoppingSummary.textContent = `${progress.checked} of ${progress.total} items checked.`;
  elements.trackerSummary.textContent = `${weights} weight entries; ${intakeDays} calorie entries.`;
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
    const correction = result.method === 'honey'
      ? `Use ${result.honeyGrams} g breakfast honey.`
      : `Keep 20 g breakfast honey and ${result.oilAdjustmentGrams >= 0 ? 'add' : 'remove'} ${Math.abs(result.oilAdjustmentGrams)} g olive oil.`;
    elements.wheyResult.textContent = `${correction} Day: ${result.uncorrectedCalories} kcal before correction, ${result.dailyProteinGrams} g protein, ${result.dailyCarbGrams} g carbohydrate, ${result.dailyFatGrams} g fat.`;
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

elements.exportBackupButton.addEventListener('click', () => {
  try {
    const backup = buildBackup(currentData());
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
    if (!window.confirm(`Replace all saved nutrition data with “${file.name}”?`)) return;
    saveJson(storage, KEYS.shopping, backup.data.shopping);
    saveJson(storage, KEYS.tracker, backup.data.tracker);
    saveJson(storage, KEYS.whey, backup.data.whey);
    whey = backup.data.whey;
    renderWhey();
    renderSummaries();
    setStatus('Complete backup imported. Shopping and tracker pages now use imported data.');
  } catch (error) {
    setStatus(`Import rejected: ${error.message}`, true);
  }
});

window.addEventListener('gta-data-changed', renderSummaries);
window.addEventListener('storage', renderSummaries);
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
