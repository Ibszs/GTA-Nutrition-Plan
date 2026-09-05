import { confirmAction } from './common.js';
import { archiveTracker, createDefaultTrackerState, validateTrackerState } from './backup.js';
import { createStorage, downloadText, saveJson } from './common.js';
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
  'downloadCsvButton', 'clearTrackerButton', 'daySelect', 'nextPeriodButton', 'periodHistory',
].map((id) => [id, document.getElementById(id)]));

let storageBlocked = false;
let state = loadState();

function defaultState() {
  return createDefaultTrackerState(formatLocalDate(new Date()));
}

function loadState() {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw === null ? defaultState() : validateTrackerState(JSON.parse(raw));
  } catch (_) {
    storageBlocked = true;
    return defaultState();
  }
}

function save() {
  if (storageBlocked) { showError('Saved progress could not be read and has not been overwritten. Restore a valid backup from Today, then reload.'); return false; }
  let validState;
  try {
    validState = validateTrackerState(state);
  } catch (error) {
    showError(`Not saved: ${error.message} Correct this field to save your changes.`);
    return false;
  }
  try { saveJson(storage, STORAGE_KEY, validState); }
  catch (_) { showError('This change could not be saved. Keep this page open and free browser storage.'); return false; }
  elements.startDate.disabled = state.rows.some(row => Object.values(row).some(v => v !== ''));
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
  elements.startDate.disabled = state.rows.some(row => Object.values(row).some(v => v !== ''));
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
  const priorDay = elements.daySelect.value;
  elements.daySelect.replaceChildren();
  const all = node('option', 'All 14 days'); all.value = 'all'; elements.daySelect.append(all);
  dates.forEach((date,index) => { const option=node('option', date); option.value=String(index); elements.daySelect.append(option); });
  const todayIndex=dates.indexOf(formatLocalDate(new Date()));
  elements.daySelect.value = priorDay || String(todayIndex < 0 ? 0 : todayIndex);
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
  filterDays();
}

function filterDays() {
  [...elements.trackerRows.children].forEach((row,index)=>{row.hidden=elements.daySelect.value !== 'all' && Number(elements.daySelect.value)!==index;});
}
elements.daySelect.addEventListener('change',filterDays);

function showError(message = '') {
  elements.trackerError.hidden = !message;
  elements.trackerError.textContent = message;
}

function displayNumber(value, suffix = '') {
  return value === null ? '—' : `${value}${suffix}`;
}

function calculate() {
  try {
    validateTrackerState(state);
    const result = calculateTracker({ ...state.meta, rows: state.rows });
    if (!storageBlocked) showError();
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
  elements.waistFlag.hidden = !(state.meta.waistBaseline && state.meta.waistCurrent && current - baseline >= 2);
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
  calculate();
  save();
}

elements.trackerRows.addEventListener('input', (event) => {
  const rowIndex = Number(event.target.dataset.row);
  const field = event.target.dataset.field;
  if (!Number.isInteger(rowIndex) || !field) return;
  state.rows[rowIndex][field] = event.target.value;
  calculate();
  save();
});

elements.trackerRows.addEventListener('change', (event) => {
  const rowIndex = Number(event.target.dataset.row);
  const field = event.target.dataset.field;
  if (!Number.isInteger(rowIndex) || !field) return;
  state.rows[rowIndex][field] = event.target.value;
  calculate();
  save();
});

metaFields.forEach((field) => elements[field].addEventListener('input', updateMeta));

function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+@-]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

elements.downloadCsvButton.addEventListener('click', async () => {
  const headers = ['Date', 'Weight lb', 'Calories', 'Protein g', 'Sleep h', 'Training', 'GI 0-3', 'Note'];
  const records = [...(state.history || []), state].flatMap(period => {
    const dates=buildLocalDates(period.meta.startDate,14);
    return period.rows.map((row,index)=>[dates[index],row.weight,row.calories,row.protein,row.sleep,row.training,row.gi,row.note]);
  });
  const lines=[headers,...records].map(row=>row.map(csvCell).join(','));
  const downloaded = downloadText('Form-and-Fuel-Progress.csv', `\uFEFF${lines.join('\r\n')}\r\n`, 'text/csv;charset=utf-8');
  elements.trackerStatus.textContent = downloaded ? 'CSV downloaded.' : 'CSV download unavailable.';
});

elements.clearTrackerButton.addEventListener('click', async () => {
  if (!await confirmAction('Clear entries in the current 14-day period? Previous periods and your targets will be kept.')) return;
  const previous=state;
  state={...state,rows:defaultState().rows};
  if(!save()){state=previous;return;}
  syncMetaToForm();
  renderRows();
  calculate();
  elements.trackerStatus.textContent = 'Current period cleared. Earlier periods retained.';
});

function renderHistory() {
  elements.periodHistory.replaceChildren();
  for(const period of (state.history || []).slice().reverse()) {
    const details=node('details');
    const dates=buildLocalDates(period.meta.startDate,14);
    const logged=period.rows.filter(row=>row.weight!=='');
    const average=logged.length ? (logged.reduce((sum,row)=>sum+Number(row.weight),0)/logged.length).toFixed(1)+' lb average' : 'No weights';
    details.append(node('summary',`${dates[0]} – ${dates[13]} · ${average}`));
    const list=node('ul');
    period.rows.forEach((row,index)=>{if(Object.values(row).every(v=>v===''))return;list.append(node('li',`${dates[index]} · ${row.weight || '—'} lb · ${row.calories || '—'} kcal · ${row.protein || '—'} g protein · ${row.sleep || '—'} h sleep${row.note ? ' · '+row.note : ''}`));});
    details.append(list); elements.periodHistory.append(details);
  }
  if(!state.history?.length)elements.periodHistory.append(node('p','Earlier 14-day periods appear here when you start the next one.','small'));
}
elements.nextPeriodButton.addEventListener('click',async()=>{
  const nextDate=buildLocalDates(state.meta.startDate,15)[14];
  if(!await confirmAction(`Save this period to history and start ${nextDate}? Existing entries stay available below and in your backup.`))return;
  const previous=state;
  try { state=archiveTracker(state,nextDate); if(!save()){state=previous;return;} }
  catch(issue){state=previous;showError(issue.message);return;}
  syncMetaToForm(); elements.daySelect.value=''; renderRows(); renderHistory(); calculate();
  elements.trackerStatus.textContent='Previous period saved. Your next 14 days are ready.';
});

if (!persistent) {
  elements.trackerStorageNotice.dataset.mode = 'memory';
  elements.trackerStorageNotice.textContent = 'Browser blocked local storage. Changes last only on this page; download CSV before leaving. They will not appear in the backup on Today.';
}

syncMetaToForm();
renderRows();
renderHistory();
calculate();
if(storageBlocked)showError('Saved progress could not be read and has not been overwritten. Restore a valid backup from Today, then reload.');
window.addEventListener('resize', calculate);

window.addEventListener('storage', event => {
  if(event.key!==STORAGE_KEY && event.key!==null)return;
  storageBlocked=false;state=loadState();syncMetaToForm();renderRows();renderHistory();calculate();
  if(storageBlocked)showError('Saved progress needs recovery; restore a valid backup.');
  else elements.trackerStatus.textContent='Updated with changes from your other tab.';
});
