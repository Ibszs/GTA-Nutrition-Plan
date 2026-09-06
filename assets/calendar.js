import { monthGrid, shiftCalendarMonth } from './planner-state.js';
import { formatLocalDate } from './core.js';
import { iconLabel } from './ui-icons.js';

const displayDate = (date, options) => new Date(`${date}T12:00:00`).toLocaleDateString('en-CA', options);
const element = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
};

export function openCalendar(selected, onSelect, trigger) {
  const today = formatLocalDate(new Date());
  let month = selected;
  const dialog = element('dialog', undefined, 'date-dialog');
  dialog.setAttribute('aria-label', 'Choose a meal date');
  const header = element('div', undefined, 'date-dialog-header');
  header.append(element('span', 'Choose your day', 'eyebrow'));
  const close = element('button', undefined, 'icon-button');
  close.type = 'button'; close.setAttribute('aria-label', 'Close calendar');
  iconLabel(close, '', 'x'); close.addEventListener('click', () => dialog.close());
  header.append(close);
  const monthBar = element('div', undefined, 'month-navigation');
  const monthTitle = element('h2'); monthTitle.setAttribute('aria-live', 'polite');
  const grid = element('div', undefined, 'month-grid');
  const gridDays = element('div', undefined, 'month-weekdays'); gridDays.setAttribute('aria-hidden', 'true');
  ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(day => gridDays.append(element('span', day)));
  function choose(date) { if (onSelect(date) !== false) dialog.close(); }
  function render(focusDate) {
    monthTitle.textContent = displayDate(month, { month: 'long', year: 'numeric' });
    grid.replaceChildren();
    for (const date of monthGrid(month)) {
      const day = element('button', String(Number(date.slice(8))), date.slice(0, 7) === month.slice(0, 7) ? '' : 'outside-month');
      day.type = 'button'; day.dataset.date = date;
      day.setAttribute('aria-label', displayDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
      day.setAttribute('aria-pressed', String(date === selected));
      if (date === today) day.setAttribute('aria-current', 'date');
      day.addEventListener('click', () => choose(date));
      day.addEventListener('keydown', event => {
        const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
        if (!(event.key in offsets) && !['Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) return;
        event.preventDefault();
        const next = new Date(`${date}T12:00:00`);
        if (event.key === 'PageUp' || event.key === 'PageDown') {
          const nextDate = shiftCalendarMonth(date, event.key === 'PageUp' ? -1 : 1);
          month = nextDate; render(nextDate); return;
        }
        const weekday = (next.getDay() + 6) % 7;
        next.setDate(next.getDate() + (event.key === 'Home' ? -weekday : event.key === 'End' ? 6 - weekday : offsets[event.key]));
        const nextDate = formatLocalDate(next);
        month = nextDate; render(nextDate);
      });
      grid.append(day);
    }
    if (focusDate) grid.querySelector(`[data-date="${focusDate}"]`)?.focus();
  }
  const navigation = delta => {
    const button = element('button', undefined, 'icon-button'); button.type = 'button';
    button.setAttribute('aria-label', delta < 0 ? 'Previous month' : 'Next month');
    iconLabel(button, '', delta < 0 ? 'chevron-left' : 'chevron-right');
    button.addEventListener('click', () => { month = shiftCalendarMonth(month, delta); render(); });
    return button;
  };
  monthBar.append(navigation(-1), monthTitle, navigation(1));
  const footer = element('div', undefined, 'calendar-footer');
  const jumpToday = element('button', undefined, 'button secondary'); jumpToday.type = 'button';
  iconLabel(jumpToday, 'Go to today', 'calendar-check-2'); jumpToday.addEventListener('click', () => choose(today));
  footer.append(jumpToday, element('p', 'Arrow keys to move · Enter to choose', 'tiny'));
  dialog.append(header, monthBar, gridDays, grid, footer);
  dialog.addEventListener('close', () => { dialog.remove(); trigger?.focus(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  render(); document.body.append(dialog); dialog.showModal();
  grid.querySelector(`[data-date="${selected}"]`)?.focus();
}
