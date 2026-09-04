import { createDefaultTrackerState, validateTrackerState } from './backup.js';
import { createStorage, downloadText, loadJson, saveJson } from './common.js';
import { buildLocalDates, calculateTracker, formatLocalDate } from './core.js';

const STORAGE_KEY = 'gtaNutrition.tracker.v2';
const { storage, persistent } = createStorage();
const metaFields = [
  'startDate', 'targetCalories', 'targetProtein', 'goalMin', 'goalMax',
  'weeksRemaining', 'waistBaseline', 'waistCurrent', 'priorOver',
];
const elements = Object.fromEntries([
  ...metaFields, 'trackerRows', 'trackerStorageNotice', 'trackerError', 'trackerStatus',
  'firstAverage', 'secondAverage', 'weeklyRate', 'projection', 'calorieAdherence',
  'proteinAdherence', 'trackerDecision', 'waistFlag', 'trendChart',
  'downloadCsvButton', 'clearTrackerButton',
].map((id) => [id, document.getElementById(id)]));

let state = loadState();

function defaultState() {
  return createDefaultTrackerState(formatLocalDate(new Date()));
}

function loadState() {
  try {
    return validateTrackerState(loadJson(storage, STORAGE_KEY, defaultState()));
  } catch (_) {
    return defaultState();
  }
}

function save() {
  let validState;
  try {
    validState = validateTrackerState(state);
  } catch (_) {
    return false;
  }
  saveJson(storage, STORAGE_KEY, validState);
  window.dispatchEvent(new CustomEvent('gta-data-changed', { detail: { section: 'tracker' } }));
  return true;
}

function node(tag, text) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  return element;
}

function syncMetaToForm() {
  metaFields.forEach((field) => {
    if (field === 'priorOver') elements[field].checked = state.meta[field];
    else elements[field].value = state.meta[field];
  });
}

function createInput(field, label, date, rowIndex) {
  const input = document.createElement('input');
  input.type = field === 'note' ? 'text' : 'number';
  input.value = state.rows[rowIndex][field];
  input.dataset.row = String(rowIndex);
  input.dataset.field = field;
  input.setAttribute('aria-label', `${label} for ${date}`);
  if (field !== 'note') {
    input.min = '0';
    input.inputMode = 'decimal';
    input.step = ['calories', 'protein'].includes(field) ? '1' : '0.1';
  } else {
    input.maxLength = 240;
  }
  return input;
}

function createSelect(field, label, date, rowIndex, options) {
  const select = document.createElement('select');
  select.dataset.row = String(rowIndex);
  select.dataset.field = field;
  select.setAttribute('aria-label', `${label} for ${date}`);
  options.forEach(([value, text]) => {
    const option = node('option', text);
    option.value = value;
    select.append(option);
  });
  select.value = state.rows[rowIndex][field];
  return select;
}

function renderRows() {
  const dates = buildLocalDates(state.meta.startDate, 14);
  elements.trackerRows.replaceChildren();
  dates.forEach((date, rowIndex) => {
    const row = node('tr');
    const dateCell = node('td', date);
    dateCell.dataset.label = 'Date';
    row.append(dateCell);

    const fields = [
      ['weight', 'Weight lb'],
      ['calories', 'Calories'],
      ['protein', 'Protein g'],
      ['sleep', 'Sleep h'],
    ];
    fields.forEach(([field, label]) => {
      const cell = node('td');
      cell.dataset.label = label;
      cell.append(createInput(field, label, date, rowIndex));
      row.append(cell);
    });

    const trainingCell = node('td');
    trainingCell.dataset.label = 'Training';
    trainingCell.append(createSelect('training', 'Training', date, rowIndex, [['', '—'], ['Yes', 'Yes'], ['No', 'No']]));
    row.append(trainingCell);

    const giCell = node('td');
    giCell.dataset.label = 'GI 0–3';
    giCell.append(createSelect('gi', 'GI score', date, rowIndex, [['', '—'], ['0', '0'], ['1', '1'], ['2', '2'], ['3', '3']]));
    row.append(giCell);

    const noteCell = node('td');
    noteCell.dataset.label = 'Note';
    noteCell.append(createInput('note', 'Note', date, rowIndex));
    row.append(noteCell);
    elements.trackerRows.append(row);
  });
}

function showError(message = '') {
  elements.trackerError.hidden = !message;
  elements.trackerError.textContent = message;
}

function displayNumber(value, suffix = '') {
  return value === null ? '—' : `${value}${suffix}`;
}

function calculate() {
  try {
    const result = calculateTracker({ ...state.meta, rows: state.rows });
    showError();
    elements.firstAverage.textContent = displayNumber(result.firstAverage, ' lb');
    elements.secondAverage.textContent = displayNumber(result.secondAverage, ' lb');
    elements.weeklyRate.textContent = displayNumber(result.weeklyRate, ' lb/wk');
    elements.projection.textContent = displayNumber(result.projection, ' lb');
    elements.calorieAdherence.textContent = `${result.calorieAdherentDays} of ${result.calorieEntries} logged days (${Math.round(result.calorieAdherence * 100)}%)`;
    elements.proteinAdherence.textContent = `${result.proteinAdherentDays} of ${result.proteinEntries} logged days (${Math.round(result.proteinAdherence * 100)}%)`;
    elements.trackerDecision.textContent = result.decisionText;
    renderWaistFlag();
    drawChart(result.rollingAverages);
  } catch (error) {
    showError(error.message);
    elements.trackerDecision.textContent = 'Fix target fields before using result.';
    drawChart([]);
  }
}

function renderWaistFlag() {
  const baseline = Number(state.meta.waistBaseline);
  const current = Number(state.meta.waistCurrent);
  elements.waistFlag.hidden = !(state.meta.waistBaseline && state.meta.waistCurrent && current - baseline >= 4);
}

function drawChart(rollingAverages) {
  const canvas = elements.trendChart;
  const width = Math.max(300, Math.floor(canvas.getBoundingClientRect().width));
  const height = 230;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const context = canvas.getContext('2d');
  context.scale(ratio, ratio);
  context.clearRect(0, 0, width, height);

  const weights = state.rows.map((row) => row.weight === '' ? null : Number(row.weight));
  const values = [...weights, ...rollingAverages].filter(Number.isFinite);
  if (!values.length) {
    context.fillStyle = '#5c6a70';
    context.font = '14px Segoe UI, sans-serif';
    context.fillText('Weight trend appears after entries.', 18, 32);
    return;
  }

  let minimum = Math.min(...values);
  let maximum = Math.max(...values);
  if (minimum === maximum) {
    minimum -= 1;
    maximum += 1;
  } else {
    minimum -= 0.5;
    maximum += 0.5;
  }
  const left = 38;
  const right = 16;
  const top = 18;
  const bottom = 30;
  const x = (index) => left + (index / 13) * (width - left - right);
  const y = (value) => top + ((maximum - value) / (maximum - minimum)) * (height - top - bottom);

  context.strokeStyle = '#ced8d7';
  context.lineWidth = 1;
  for (let line = 0; line <= 3; line += 1) {
    const lineY = top + (line / 3) * (height - top - bottom);
    context.beginPath();
    context.moveTo(left, lineY);
    context.lineTo(width - right, lineY);
    context.stroke();
  }

  context.fillStyle = '#12364b';
  weights.forEach((value, index) => {
    if (!Number.isFinite(value)) return;
    context.beginPath();
    context.arc(x(index), y(value), 4, 0, Math.PI * 2);
    context.fill();
  });

  context.strokeStyle = '#0c7c75';
  context.lineWidth = 3;
  context.beginPath();
  let started = false;
  rollingAverages.forEach((value, index) => {
    if (!Number.isFinite(value)) return;
    if (!started) context.moveTo(x(index), y(value));
    else context.lineTo(x(index), y(value));
    started = true;
  });
  if (started) context.stroke();

  context.fillStyle = '#5c6a70';
  context.font = '11px Segoe UI, sans-serif';
  context.fillText(`${maximum.toFixed(1)} lb`, 2, top + 4);
  context.fillText(`${minimum.toFixed(1)} lb`, 2, height - bottom + 4);
  context.fillText('Day 1', left, height - 8);
  context.fillText('Day 14', width - right - 38, height - 8);
}

function updateMeta(event) {
  const field = event.target.id;
  state.meta[field] = field === 'priorOver' ? event.target.checked : event.target.value;
  if (field === 'startDate') renderRows();
  save();
  calculate();
}

elements.trackerRows.addEventListener('input', (event) => {
  const rowIndex = Number(event.target.dataset.row);
  const field = event.target.dataset.field;
  if (!Number.isInteger(rowIndex) || !field) return;
  state.rows[rowIndex][field] = event.target.value;
  save();
  calculate();
});

elements.trackerRows.addEventListener('change', (event) => {
  const rowIndex = Number(event.target.dataset.row);
  const field = event.target.dataset.field;
  if (!Number.isInteger(rowIndex) || !field) return;
  state.rows[rowIndex][field] = event.target.value;
  save();
  calculate();
});

metaFields.forEach((field) => elements[field].addEventListener('input', updateMeta));

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

elements.downloadCsvButton.addEventListener('click', () => {
  const dates = buildLocalDates(state.meta.startDate, 14);
  const headers = ['Date', 'Weight lb', 'Calories', 'Protein g', 'Sleep h', 'Training', 'GI 0-3', 'Note'];
  const lines = [headers, ...state.rows.map((row, index) => [
    dates[index], row.weight, row.calories, row.protein, row.sleep, row.training, row.gi, row.note,
  ])].map((row) => row.map(csvCell).join(','));
  const downloaded = downloadText('GTA-14-Day-Tracker.csv', `\uFEFF${lines.join('\r\n')}\r\n`, 'text/csv;charset=utf-8');
  elements.trackerStatus.textContent = downloaded ? 'CSV downloaded.' : 'CSV download unavailable.';
});

elements.clearTrackerButton.addEventListener('click', () => {
  if (!window.confirm('Clear all tracker entries and reset targets?')) return;
  state = defaultState();
  save();
  syncMetaToForm();
  renderRows();
  calculate();
  elements.trackerStatus.textContent = 'Tracker cleared.';
});

if (!persistent) {
  elements.trackerStorageNotice.dataset.mode = 'memory';
  elements.trackerStorageNotice.textContent = 'Browser blocked local storage. Tracker entries last only until this tab closes; download CSV before leaving.';
}

syncMetaToForm();
renderRows();
calculate();
window.addEventListener('resize', calculate);
