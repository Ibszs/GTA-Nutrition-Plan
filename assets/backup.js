import { buildLocalDates } from './core.js';
import { validateShoppingState } from './shopping-state.js';

const TRACKER_META_FIELDS = [
  'startDate',
  'targetCalories',
  'targetProtein',
  'goalMin',
  'goalMax',
  'weeksRemaining',
  'waistBaseline',
  'waistCurrent',
];

const TRACKER_ROW_FIELDS = [
  'weight',
  'calories',
  'protein',
  'sleep',
  'training',
  'gi',
  'note',
];

function clone(value) {
  return structuredClone(value);
}

function validNumberText(value, { positive = false } = {}) {
  if (typeof value !== 'string') return false;
  if (value === '') return true;
  const converted = Number(value);
  return Number.isFinite(converted) && (positive ? converted > 0 : converted >= 0);
}

export function validateTrackerState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new TypeError('Tracker data must be an object.');
  }
  if (state.version !== 2) throw new RangeError('Unsupported tracker version.');
  if (!state.meta || typeof state.meta !== 'object' || Array.isArray(state.meta)) {
    throw new TypeError('Tracker metadata must be an object.');
  }
  if (!Array.isArray(state.rows) || state.rows.length !== 14) {
    throw new TypeError('Tracker data must contain fourteen rows.');
  }

  for (const field of TRACKER_META_FIELDS) {
    if (typeof state.meta[field] !== 'string') {
      throw new TypeError(`Tracker metadata field must be text: ${field}`);
    }
  }
  if (typeof state.meta.priorOver !== 'boolean') {
    throw new TypeError('Tracker previous-projection value must be boolean.');
  }
  buildLocalDates(state.meta.startDate, 1);

  for (const field of ['targetCalories', 'targetProtein', 'goalMin', 'goalMax']) {
    if (!validNumberText(state.meta[field], { positive: true }) || state.meta[field] === '') {
      throw new TypeError(`Tracker ${field} must be a positive number.`);
    }
  }
  if (Number(state.meta.goalMin) > Number(state.meta.goalMax)) {
    throw new RangeError('Goal minimum cannot exceed goal maximum.');
  }
  for (const field of ['weeksRemaining', 'waistBaseline', 'waistCurrent']) {
    if (!validNumberText(state.meta[field])) {
      throw new TypeError(`Tracker ${field} must be a non-negative number.`);
    }
  }

  for (const row of state.rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new TypeError('Tracker row must be an object.');
    }
    for (const field of TRACKER_ROW_FIELDS) {
      if (typeof row[field] !== 'string') {
        throw new TypeError(`Tracker row field must be text: ${field}`);
      }
    }
    for (const field of ['weight', 'calories', 'protein', 'sleep']) {
      if (!validNumberText(row[field])) {
        throw new TypeError(`Tracker row ${field} must be a non-negative number.`);
      }
    }
    if (!['', 'Yes', 'No'].includes(row.training)) {
      throw new TypeError('Tracker row training value is invalid.');
    }
    if (!['', '0', '1', '2', '3'].includes(row.gi)) {
      throw new TypeError('Tracker row GI value is invalid.');
    }
  }

  return clone(state);
}

export function validateWheyState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new TypeError('Whey data must be an object.');
  }
  if (state.version !== 1) throw new RangeError('Unsupported whey version.');

  for (const field of ['scoopCalories', 'scoopProtein', 'scoopCarbs', 'scoopFat']) {
    if (!validNumberText(state[field])) {
      throw new TypeError(`Whey ${field} must be a non-negative number or blank.`);
    }
  }
  return clone(state);
}

export function createDefaultTrackerState(startDate) {
  const state = {
    version: 2,
    meta: {
      startDate,
      targetCalories: '3300',
      targetProtein: '175',
      goalMin: '190',
      goalMax: '195',
      weeksRemaining: '14',
      waistBaseline: '',
      waistCurrent: '',
      priorOver: false,
    },
    rows: Array.from({ length: 14 }, () => ({
      weight: '',
      calories: '',
      protein: '',
      sleep: '',
      training: '',
      gi: '',
      note: '',
    })),
  };
  return validateTrackerState(state);
}

export function createDefaultWheyState() {
  return {
    version: 1,
    scoopCalories: '',
    scoopProtein: '',
    scoopCarbs: '',
    scoopFat: '',
  };
}

function validateBackupDocument(document) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new TypeError('Backup must be an object.');
  }
  if (document.application !== 'gta-nutrition-plan') {
    throw new TypeError('Backup application marker is invalid.');
  }
  if (document.version !== 1) throw new RangeError('Unsupported backup version.');
  if (typeof document.exportedAt !== 'string' || Number.isNaN(Date.parse(document.exportedAt))) {
    throw new TypeError('Backup export timestamp is invalid.');
  }
  if (!document.data || typeof document.data !== 'object' || Array.isArray(document.data)) {
    throw new TypeError('Backup data sections are missing.');
  }

  return {
    application: 'gta-nutrition-plan',
    version: 1,
    exportedAt: document.exportedAt,
    data: {
      shopping: validateShoppingState(document.data.shopping),
      tracker: validateTrackerState(document.data.tracker),
      whey: validateWheyState(document.data.whey),
    },
  };
}

export function buildBackup(data, exportedAt = new Date().toISOString()) {
  return validateBackupDocument({
    application: 'gta-nutrition-plan',
    version: 1,
    exportedAt,
    data,
  });
}

export function parseBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (_) {
    throw new SyntaxError('Backup must be valid JSON.');
  }
  return validateBackupDocument(parsed);
}
