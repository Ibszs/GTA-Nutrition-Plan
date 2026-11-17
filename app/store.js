// Forme storage. Everything stays in this browser.
//
// Two families of keys live side by side:
//   gtaNutrition.*  - the original Form & Fuel journals. They keep their exact shape and
//                     validators, so every existing workout, list, tracker period and private
//                     entry stays readable. Training, custom shopping lists and the private log
//                     are still written here.
//   forme.*.v1      - everything the rebuild adds (goals, body log, kitchen, movement, habits...).
// The first run copies daily tracker rows into the new body log without changing the originals.

import { createStorage } from '../assets/common.js';
import { buildLocalDates } from '../assets/core.js';
import { DATA_KEYS, validateTrackerState, validateWheyState } from '../assets/backup.js';
import { validateShoppingState } from '../assets/shopping-state.js';
import { validatePlannerState } from '../assets/planner-state.js';
import { validatePersonalState } from '../assets/personal-state.js';
import { TRAINING_KEY, createTrainingState, validateTrainingState } from '../assets/training-state.js';

export const LEGACY = Object.freeze({ ...DATA_KEYS });
export const SECTIONS = Object.freeze(['profile', 'body', 'kitchen', 'move', 'habits', 'priv', 'reset', 'fun', 'ui']);
const keyOf = section => `forme.${section}.v1`;

const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export const DEFAULTS = Object.freeze({
  profile: () => ({
    version: 1, name: '', unit: 'lb', weight: null, activity: 'feet', maintenance: null,
    mode: 'lean-gain', modeHistory: [], longTerm: 190,
    targets: { 'lean-gain': null, recomp: null },
    whey: { kcal: 120, protein: 25, carbs: 2, fat: 1, custom: false },
    diet: { halal: true, noSeafood: true, heat: 2, avoid: [] },
  }),
  body: () => ({ version: 1, entries: {} }),
  kitchen: () => ({
    version: 1, recipes: {}, weeks: { 'lean-gain': {}, recomp: {} }, dayKinds: { 'lean-gain': {}, recomp: {} },
    pantry: {}, checked: {}, extras: [], batches: [], onHand: [], oilNote: '', snackLog: {},
  }),
  move: () => ({ version: 1, setup: null, plan: null, sessions: [], checks: [], levels: {}, paused: {}, pastPlans: [] }),
  habits: () => ({ version: 1, muteStreaks: false, seeded: false, habits: [], log: {} }),
  priv: () => ({ version: 1, enabled: false, label: '', instead: '', pauseMin: 10, hideOnToday: true, events: [], checkDue: null }),
  reset: () => ({ version: 1, actions: null, oneThing: null, evenings: {} }),
  fun: () => ({ version: 1, enabled: true, night: false, stickers: {}, quests: {}, replays: [], hidden: {} }),
  ui: () => ({ version: 1, modules: null, theme: 'dark', motion: 'system', sound: false, haptics: true, migrated: null, intro: false, lastRoute: '' }),
});

const { storage, persistent } = createStorage();
export const isPersistent = persistent;
const cache = new Map();
const problems = new Map();

function emit(section) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('forme:change', { detail: { section } }));
}

function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

/** Read one Forme section. A missing or unreadable section yields defaults; unreadable data is never overwritten silently. */
export function get(section) {
  if (cache.has(section)) return cache.get(section);
  const base = DEFAULTS[section]();
  let value = base;
  try {
    const text = storage.getItem(keyOf(section));
    if (text !== null) {
      const parsed = JSON.parse(text);
      if (!isObject(parsed) || parsed.version !== 1) throw new Error('unexpected shape');
      value = { ...base, ...parsed };
    }
    problems.delete(section);
  } catch (error) {
    problems.set(section, error.message);
  }
  cache.set(section, value);
  return value;
}

export function set(section, value) {
  if (!SECTIONS.includes(section) || !isObject(value)) throw new TypeError('Unknown section or invalid value.');
  if (problems.has(section)) throw new Error(`Saved ${section} data could not be read, so it was not overwritten. Export a backup from You, then reset this section.`);
  const next = { ...value, version: 1 };
  storage.setItem(keyOf(section), JSON.stringify(next));
  cache.set(section, next);
  emit(section);
  return next;
}

/** Clone, mutate, save. Returns the saved value. */
export function update(section, change) {
  const next = structuredClone(get(section));
  const result = change(next);
  return set(section, result === undefined ? next : result);
}

export const sectionProblem = section => problems.get(section) ?? null;
export function resetSection(section) {
  storage.removeItem(keyOf(section)); cache.delete(section); problems.delete(section); emit(section);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === null) { cache.clear(); emit('*'); return; }
    const section = SECTIONS.find(name => keyOf(name) === event.key);
    if (section) { cache.delete(section); emit(section); } else if (Object.values(LEGACY).includes(event.key)) emit('legacy');
  });
}

// ---------- original journals ----------
function readLegacy(key, validate, fallback) {
  const text = storage.getItem(key);
  if (text === null) return { value: fallback ? fallback() : null, saved: false, error: null };
  try { return { value: validate(JSON.parse(text)), saved: true, error: null }; }
  catch (error) { return { value: fallback ? fallback() : null, saved: true, error: error.message }; }
}

export const training = {
  read() { return readLegacy(TRAINING_KEY, validateTrainingState, () => createTrainingState(localToday())); },
  /** Validates before writing; throws with the validator's message when the change is not allowed. */
  write(state) {
    const current = storage.getItem(TRAINING_KEY);
    if (current !== null) { try { validateTrainingState(JSON.parse(current)); } catch { throw new Error('Saved training data could not be read, so it was not overwritten. Restore a backup from You.'); } }
    const valid = validateTrainingState(state);
    storage.setItem(TRAINING_KEY, JSON.stringify(valid));
    emit('training');
    return valid;
  },
};

export const legacy = {
  tracker: () => readLegacy(LEGACY.tracker, validateTrackerState),
  whey: () => readLegacy(LEGACY.whey, validateWheyState),
  shopping: () => readLegacy(LEGACY.shopping, validateShoppingState),
  planner: () => readLegacy(LEGACY.planner, validatePlannerState),
  personal: () => readLegacy(LEGACY.personal, validatePersonalState, () => ({ version: 1, entries: [] })),
  writeShopping(state) { storage.setItem(LEGACY.shopping, JSON.stringify(validateShoppingState(state))); emit('legacy'); },
  writePersonal(state) { storage.setItem(LEGACY.personal, JSON.stringify(validatePersonalState(state))); emit('legacy'); },
  removePersonal() { storage.removeItem(LEGACY.personal); emit('legacy'); },
};

const toNumber = text => { if (text === '' || text === null || text === undefined) return null; const n = Number(text); return Number.isFinite(n) ? n : null; };

/**
 * Pure: turn an original 14-day tracker (plus its archived periods) into dated body-log entries
 * and carried-over targets. Nothing is dropped; blank rows are skipped.
 */
export function trackerToBody(tracker) {
  const entries = {};
  const periods = [...(tracker.history ?? []), tracker];
  for (const period of periods) {
    const dates = buildLocalDates(period.meta.startDate, 14);
    period.rows.forEach((row, index) => {
      if (Object.values(row).every(value => value === '')) return;
      const entry = {};
      const weight = toNumber(row.weight); if (weight !== null) entry.weight = weight;
      const kcal = toNumber(row.calories); if (kcal !== null) entry.kcal = kcal;
      const protein = toNumber(row.protein); if (protein !== null) entry.protein = protein;
      const sleep = toNumber(row.sleep); if (sleep !== null) entry.sleep = sleep;
      if (row.note) entry.note = row.note;
      if (row.training) entry.trained = row.training === 'Yes';
      if (row.gi !== '') entry.gi = Number(row.gi);
      if (Object.keys(entry).length) entries[dates[index]] = { ...entries[dates[index]], ...entry };
    });
  }
  const meta = tracker.meta;
  return {
    entries,
    targets: { kcal: toNumber(meta.targetCalories), protein: toNumber(meta.targetProtein) },
    goalRange: [toNumber(meta.goalMin), toNumber(meta.goalMax)],
    waist: { baseline: toNumber(meta.waistBaseline), current: toNumber(meta.waistCurrent), startDate: meta.startDate },
  };
}

/** One-time, additive import of the original tracker and whey label. Safe to call on every start. */
export function migrate() {
  const ui = get('ui');
  if (ui.migrated) return ui.migrated;
  const report = { at: new Date().toISOString(), bodyDays: 0, targets: false, whey: false, notes: [] };
  try {
    const tracker = legacy.tracker();
    if (tracker.error) report.notes.push(`Old progress tracker could not be read (${tracker.error}); it was left untouched.`);
    else if (tracker.value) {
      const mapped = trackerToBody(tracker.value);
      update('body', body => {
        for (const [day, entry] of Object.entries(mapped.entries)) {
          if (!body.entries[day]) { body.entries[day] = entry; report.bodyDays += 1; }
        }
        if (mapped.waist.baseline !== null && !body.entries[mapped.waist.startDate]?.waist) {
          body.entries[mapped.waist.startDate] = { ...body.entries[mapped.waist.startDate], waist: mapped.waist.baseline };
        }
      });
      update('profile', profile => {
        if (mapped.targets.kcal && mapped.targets.protein && !profile.targets['lean-gain']) {
          profile.targets['lean-gain'] = { kcal: mapped.targets.kcal, protein: mapped.targets.protein, fat: null, carried: true };
          report.targets = true;
        }
        const weights = Object.entries(mapped.entries).filter(([, entry]) => entry.weight).sort(([a], [b]) => a.localeCompare(b));
        if (weights.length && !profile.weight) profile.weight = weights.at(-1)[1].weight;
        if (mapped.goalRange[0]) profile.longTerm = mapped.goalRange[0];
      });
    }
    const whey = legacy.whey();
    if (whey.value && [whey.value.scoopCalories, whey.value.scoopProtein, whey.value.scoopCarbs, whey.value.scoopFat].every(value => value !== '')) {
      update('profile', profile => {
        profile.whey = { kcal: Number(whey.value.scoopCalories), protein: Number(whey.value.scoopProtein), carbs: Number(whey.value.scoopCarbs), fat: Number(whey.value.scoopFat), custom: true };
      });
      report.whey = true;
    }
  } catch (error) {
    report.notes.push(`Import stopped early: ${error.message}`);
  }
  try { update('ui', next => { next.migrated = report; }); } catch { /* storage problems surface elsewhere */ }
  return report;
}

// ---------- complete backup ----------
const LEGACY_VALIDATORS = {
  personal: validatePersonalState, shopping: validateShoppingState, tracker: validateTrackerState,
  whey: validateWheyState, training: validateTrainingState, planner: validatePlannerState,
};

/** Version 3 keeps the original envelope and sections and adds a `forme` section. */
export function buildBackup(exportedAt = new Date().toISOString()) {
  const data = {};
  for (const [name, key] of Object.entries(LEGACY)) {
    const text = storage.getItem(key);
    if (text === null) continue;
    data[name] = LEGACY_VALIDATORS[name](JSON.parse(text));
  }
  data.forme = Object.fromEntries(SECTIONS.map(section => [section, get(section)]));
  return { application: 'gta-nutrition-plan', version: 3, exportedAt, data };
}

export function parseBackup(text) {
  let doc;
  try { doc = JSON.parse(text); } catch { throw new SyntaxError('That file is not valid JSON.'); }
  if (!isObject(doc) || doc.application !== 'gta-nutrition-plan') throw new TypeError('That file is not a Forme or Form & Fuel backup.');
  if (![1, 2, 3].includes(doc.version)) throw new RangeError('That backup version is not supported.');
  if (typeof doc.exportedAt !== 'string' || Number.isNaN(Date.parse(doc.exportedAt))) throw new TypeError('The backup has no valid export time.');
  if (!isObject(doc.data)) throw new TypeError('The backup has no data sections.');
  const out = { version: doc.version, exportedAt: doc.exportedAt, legacy: {}, forme: null };
  for (const name of Object.keys(LEGACY)) {
    if (Object.hasOwn(doc.data, name)) out.legacy[name] = LEGACY_VALIDATORS[name](doc.data[name]);
  }
  if (doc.version < 3) {
    for (const required of ['shopping', 'tracker', 'whey']) if (!out.legacy[required]) throw new TypeError(`The backup is missing its ${required} section.`);
  } else {
    if (!isObject(doc.data.forme)) throw new TypeError('The backup is missing its Forme section.');
    out.forme = {};
    for (const section of SECTIONS) {
      const value = doc.data.forme[section];
      if (value === undefined) continue;
      if (!isObject(value) || value.version !== 1) throw new TypeError(`The ${section} section of the backup is not valid.`);
      out.forme[section] = value;
    }
  }
  return out;
}

/** Writes every section in the backup, or none of them. */
export function restoreBackup(parsed) {
  const writes = [];
  for (const [name, value] of Object.entries(parsed.legacy)) writes.push([LEGACY[name], JSON.stringify(value)]);
  if (parsed.forme) for (const [section, value] of Object.entries(parsed.forme)) writes.push([keyOf(section), JSON.stringify(value)]);
  const previous = writes.map(([key]) => [key, storage.getItem(key)]);
  try {
    for (const [key, text] of writes) storage.setItem(key, text);
  } catch (error) {
    for (const [key, text] of previous) { try { if (text === null) storage.removeItem(key); else storage.setItem(key, text); } catch { /* best effort */ } }
    throw error;
  }
  cache.clear(); problems.clear();
  if (!parsed.forme) { try { update('ui', ui => { ui.migrated = null; }); } catch { /* ignore */ } migrate(); }
  emit('*');
  return writes.length;
}

export const rawStorage = storage;
