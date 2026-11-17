// Shared fixtures for the Forme store and render tests. Not a test file itself.
import { createTrainingState, createDraft, finishDraft } from '../assets/training-state.js';
import { createDefaultShoppingState } from '../assets/shopping-state.js';
import { createPlannerState } from '../assets/planner-state.js';

/** Minimal Web Storage in memory. `failOn` makes setItem throw for one key, to test rollbacks. */
export class MemoryStorage {
  constructor(entries = {}) { this.map = new Map(Object.entries(entries)); this.failOn = null; this.writes = 0; }
  get length() { return this.map.size; }
  key(index) { return [...this.map.keys()][index] ?? null; }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) {
    if (this.failOn !== null && key === this.failOn) throw new Error(`QuotaExceededError: ${key}`);
    this.writes += 1; this.map.set(key, String(value));
  }
  removeItem(key) { this.map.delete(key); }
  clear() { this.map.clear(); }
  snapshot() { return Object.fromEntries(this.map); }
}

export function installStorage(storage) {
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
  return storage;
}

export const LEGACY_KEYS = {
  training: 'gtaNutrition.training.v1', tracker: 'gtaNutrition.tracker.v2', whey: 'gtaNutrition.whey.v1',
  planner: 'gtaNutrition.planner.v1', shopping: 'gtaNutrition.shopping.v2', personal: 'gtaNutrition.personal.v1',
};

const blankRow = () => ({ weight: '', calories: '', protein: '', sleep: '', training: '', gi: '', note: '' });

/** A v2 tracker with an archived period and some filled rows. */
export function trackerState(startDate = '2026-09-03') {
  const rows = Array.from({ length: 14 }, blankRow);
  rows[0] = { weight: '180.4', calories: '3200', protein: '170', sleep: '7', training: 'Yes', gi: '1', note: 'Felt fine' };
  rows[2] = { ...blankRow(), weight: '181', training: 'No' };
  rows[5] = { ...blankRow(), calories: '2950', protein: '160', gi: '0' };
  const oldRows = Array.from({ length: 14 }, blankRow);
  oldRows[0] = { ...blankRow(), weight: '178' };
  return {
    version: 2,
    meta: { startDate, targetCalories: '3300', targetProtein: '175', goalMin: '190', goalMax: '195', weeksRemaining: '14', waistBaseline: '33', waistCurrent: '', priorOver: false },
    rows,
    history: [{ version: 2, meta: { startDate: '2026-08-20', targetCalories: '3300', targetProtein: '175', goalMin: '190', goalMax: '195', weeksRemaining: '16', waistBaseline: '', waistCurrent: '', priorOver: false }, rows: oldRows }],
  };
}

export const wheyState = () => ({ version: 1, scoopCalories: '130', scoopProtein: '24', scoopCarbs: '3', scoopFat: '2' });
export const personalState = () => ({ version: 1, entries: [{ id: 'p1', at: '2026-10-30T12:00:00.000Z', amountMg: 250, site: '', note: '' }] });
export const shoppingState = () => createDefaultShoppingState();
export const plannerState = () => createPlannerState('2026-09-07');

const done = (load, reps, rir = 2) => ({ load, reps, rir, completed: true, clean: true });

/** A training journal with finished sessions (s1..s4) and, optionally, an open draft dated `draftDate`. */
export function trainingJournal({ draft = true, draftDate = null } = {}) {
  let state = createTrainingState('2026-09-07');
  const log = (sessionId, date, id, sets) => {
    const next = createDraft(state, sessionId, date);
    for (const entry of next.exercises) (sets[entry.exerciseId] ?? []).slice(0, entry.sets.length).forEach(([load, reps], index) => { entry.sets[index] = done(load, reps); });
    state = finishDraft({ ...state, draft: next }, id);
  };
  log('hybrid5-upper-v1', '2026-09-07', 's1', { flat: [[100, 8], [100, 7], [95, 8]], row: [[50, 10]], lateral: [[15, 15]] });
  log('hybrid5-lower-v1', '2026-09-08', 's2', { squat: [[140, 6]], calves: [[90, 12], [90, 12]] });
  log('hybrid5-upper-v1', '2026-09-14', 's3', { flat: [[105, 8], [100, 8]], row: [[50, 9]], pulldown: [[120, 10]] });
  log('hybrid5-chest-back-v1', '2026-09-17', 's4', { incline: [[60, 10]], fly: [[30, 15]] });
  if (draft) {
    const open = createDraft(state, 'hybrid5-upper-v1', draftDate ?? localDay());
    open.exercises[0].sets[0] = done(105, 8);
    state = { ...state, draft: open };
  }
  return state;
}

export const localDay = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
