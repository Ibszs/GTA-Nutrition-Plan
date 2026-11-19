// Explanations that open in a sheet when you tap an "i", instead of sitting on the page as paragraphs.
// Each entry: a title, an optional picture, and short blocks. A block is a paragraph, or a small
// heading with its paragraph. Wording that came from a researched screen is kept as it was written.

import { html, sheet } from './ui.js';

export const EXPLAIN = {
  // ---------- training ----------
  rir: { eyebrow: 'Training', title: 'Reps in reserve', pic: 'assets/photos/gym-rack.jpg', blocks: [
    'RIR is how many more good reps you could have done when you stopped the set. RIR 2 means you racked it with two left.',
    ['Why Forme uses it', 'Stopping a little short keeps your reps clean and repeatable from week to week. Most sets here aim for about 2.'],
    ['How to log it', 'Each set has a small RIR box. Leave it alone if the set felt like the target, or change it if it was easier or harder.'],
  ] },
  records: { eyebrow: 'Training', title: 'What counts as a record', blocks: [
    'A record is a set that beats your best estimated max for that exact movement and setup.',
    'The first log of a movement is a baseline, not a record. Forme starts comparing from the second time you log it.',
    ['Like with like', 'A machine, a seat position or a grip you noted in Setup is treated as its own lift, so a record always means the same thing was done better.'],
  ] },
  lighter: { eyebrow: 'Training', title: 'Lighter session', blocks: [
    'About half the usual sets, with 4 reps in reserve. For a tired or sore day.',
    'Forme does not suggest a load increase from a lighter session. Go back to the normal session when you feel recovered.',
  ] },
  plans: { eyebrow: 'Training', title: 'Changing plan', pic: 'assets/photos/gym-rack.jpg', blocks: [
    'A plan only decides which session Forme offers on which day. Changing it never touches your journal.',
    ['What stays', 'Every workout you logged stays in History. Records still compare the same movement and setup, whichever plan it came from.'],
    ['What you can change', 'Move sessions to different days with Edit week. Change the movements, sets and reps of any session with Edit session. Both can be put back.'],
    ['A missed day', 'It is not carried forward. If your week moved, use Edit week or tell Forme what today is.'],
  ] },
  edited: { eyebrow: 'Training', title: 'Your version of a session', blocks: [
    'When you edit a session, Forme sets up your version every time that session comes around.',
    'Workouts logged from it are marked Adapted in History, the same way a workout you changed on the day is.',
    'Reset puts the plan\'s own version back. Workouts you already logged do not change.',
  ] },
  units: { eyebrow: 'Training', title: 'Load unit', blocks: [
    'The unit applies to new workouts. Saved sessions keep the unit they were logged in, and records only compare sets in the same unit.',
  ] },
  rest: { eyebrow: 'Training', title: 'Rest timer', blocks: [
    'The timer starts when you tick a set. Automatic uses the rest written for each movement: longer for heavy presses, squats and hinges, shorter for curls and raises.',
    'Pick a fixed time to use the same rest everywhere, or turn it off. You can always add 30 seconds or skip it while it runs.',
  ] },
  demos: { eyebrow: 'Training', title: 'Lift demos', blocks: [
    'Each demo is two photographs of the same lift: the start and the finish. Forme fades between them so the movement reads at a glance.',
    'They show two positions, not your range of motion. Move through the range you can control.',
    'A lift only gets a demo when the photographs match that exact variation. Otherwise Forme shows the written cues and no picture.',
  ] },
  // ---------- kitchen ----------
  ratio: { eyebrow: 'Kitchen', title: 'Fat to protein', blocks: [
    'The figure on each recipe is grams of fat to grams of protein in one serving. 1:2 means two grams of protein for every gram of fat.',
    'Forme opens a recipe cooked the smallest existing way that reaches 1:2. It only uses the lighter versions and portion options already written into the recipe.',
    'Where no version of a recipe reaches 1:2, the recipe page says so and the recipe is left as it is.',
  ] },
  macros: { eyebrow: 'Kitchen', title: 'Where the numbers come from', blocks: [
    'Calories and macros are worked out from the ingredient list: every quantity, including the cooking oil, sauces and toppings, against USDA FoodData Central.',
    'Where a creator\'s own macro claim does not match the ingredient maths, the recipe shows both.',
  ] },
  plates: { eyebrow: 'Kitchen', title: 'Drawn plates', blocks: [
    'Four dishes have no photograph, because no properly licensed picture matched the dish.',
    'Rather than use a photo of something else, Forme draws the plate from the recipe: what is in it and how it is served. It is an illustration, not a photograph of your dinner.',
  ] },
  // ---------- you ----------
  maintenance: { eyebrow: 'Goal', title: 'Maintenance calories', blocks: [
    'Maintenance is a starting guess from your weight and how active your job is. It is a rough estimate.',
    'Two to four weeks of weigh-ins will correct it. If you already know your number, type it in and Forme uses yours.',
  ] },
  storage: { eyebrow: 'Your data', title: 'Where everything is kept', blocks: [
    'Forme has no account, no server and no analytics. Your logs live in this browser on this device.',
    'That also means clearing browser data deletes them, so export a backup now and then.',
    ['One file', 'A backup holds everything, including the private log and private check-ins. Keep it somewhere only you can reach.'],
    ['Importing', 'An import is checked before anything is written and rolled back if a write fails. Backups from Form & Fuel still import.'],
  ] },
  appearance: { eyebrow: 'Appearance', title: 'How the look is built', blocks: [
    ['Accent', 'One colour for the action you take, the place you are in and your progress.'],
    ['Dark ground', 'The dark page comes in four tones. Graphite is neutral, Midnight leans blue, Plum leans warm, and Black is true black for OLED screens.'],
    ['Lead cards', 'The big card at the top of each screen can be a block of the accent colour or a soft card that lets the photograph carry the colour. Automatic uses the block on the light page and the soft card on the dark one.'],
    ['Always dark', 'Cook mode and the pause timer stay dark whatever you pick.'],
  ] },
};

function render(entry) {
  return html`<div class="explain">
    ${entry.pic ? html`<img class="explain__pic" src="${entry.pic}" alt="" loading="lazy">` : ''}
    ${(entry.blocks ?? []).map(block => (Array.isArray(block) ? html`<h3>${block[0]}</h3><p>${block[1]}</p>` : html`<p class="${block === entry.blocks[0] ? 'lead' : ''}">${block}</p>`))}
  </div>`;
}

/** Open an explanation. `adhoc` carries a title and body for text worked out on the spot. */
export function explain(id, adhoc = null) {
  const entry = adhoc?.body ? { eyebrow: 'About this', title: adhoc.title || 'About this', blocks: adhoc.body.split('\n').filter(Boolean) } : EXPLAIN[id];
  if (!entry) return null;
  return sheet({ title: entry.title, eyebrow: entry.eyebrow ?? '', body: render(entry), footer: html`<button class="btn btn--quiet" type="button" data-act="__close">Got it</button>` });
}
