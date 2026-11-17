// Habit reminders. There is no server, so a reminder can only fire while Forme is open or kept
// alive in the background. With the app in view it is a line at the bottom of the screen; with the
// app hidden and notifications allowed it is a plain system notification. Nothing leaves the device.

import * as store from './store.js';
import { today, toast } from './ui.js';
import { isDue, isDone, isSkipped } from './logic/habits.js';

const WINDOW_MIN = 60; // a reminder is offered for an hour after its time, then dropped for the day
const sent = new Set();
let timer = null;

/**
 * Habits whose reminder time has arrived today and that are still open. Pure.
 * minutesNow: minutes since local midnight. already: keys `${day}:${habitId}` shown this session.
 */
export function dueReminders(habits, log, day, minutesNow, already = new Set()) {
  return habits.filter(habit => {
    if (!habit.reminder || habit.paused || habit.archived) return false;
    const [hours, minutes] = String(habit.reminder).split(':').map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return false;
    const at = hours * 60 + minutes;
    if (minutesNow < at || minutesNow > at + WINDOW_MIN) return false;
    return isDue(habit, day) && !isDone(log, habit, day) && !isSkipped(log, habit, day) && !already.has(`${day}:${habit.id}`);
  });
}

async function notify(body, tag) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) await registration.showNotification('Forme', { body, tag, icon: 'icons/icon-192.png' });
    else new Notification('Forme', { body, tag, icon: 'icons/icon-192.png' });
    return true;
  } catch { return false; }
}

async function check() {
  const state = store.get('habits'); const day = today(); const now = new Date();
  for (const habit of dueReminders(state.habits, state.log, day, now.getHours() * 60 + now.getMinutes(), sent)) {
    sent.add(`${day}:${habit.id}`);
    const body = habit.tiny ? `${habit.name}. Smallest version: ${habit.tiny}` : habit.name;
    if (document.hidden && await notify(body, `forme-habit-${habit.id}`)) continue;
    toast(`Reminder: ${body}`, { action: 'Habits', onAction: () => { location.hash = '#/habits'; }, ms: 9000 });
  }
}

export function startReminders() {
  clearInterval(timer);
  timer = setInterval(check, 30000);
  setTimeout(check, 4000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
}
