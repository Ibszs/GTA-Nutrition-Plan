// The playful layer: a sticker sheet earned by real actions, and harmless side quests.
// Everything here can be turned off in Settings. Nothing is public and nothing counts against you.

/** shape: one of ring, burst, tape, ticket, drop, bolt, frame, moon. Colours are from the Forme palette. */
export const STICKERS = Object.freeze([
  { id: 'first-frame', name: 'First frame', line: 'The first thing you logged in Forme.', shape: 'frame', ink: '#151412', fill: '#f0a53a' },
  { id: 'comeback', name: 'Good comeback', line: 'Back after three or more days away. That is the hard one.', shape: 'burst', ink: '#f7f4ed', fill: '#e8472b' },
  { id: 'cooked', name: 'Cooked it', line: 'You cooked a Forme recipe.', shape: 'ring', ink: '#151412', fill: '#f5b81c' },
  { id: 'measured', name: 'Measured the oil', line: 'You set the oil with a spoon instead of a pour.', shape: 'drop', ink: '#151412', fill: '#f8e3a6' },
  { id: 'lighter', name: 'Same taste, lighter', line: 'You cooked a lighter version.', shape: 'tape', ink: '#f7f4ed', fill: '#47752f' },
  { id: 'batch', name: 'Future you says thanks', line: 'You put a batch in the fridge or freezer.', shape: 'ticket', ink: '#151412', fill: '#9fd0e6' },
  { id: 'used-first', name: 'Used it first', line: 'You ate a leftover before its date.', shape: 'ring', ink: '#f7f4ed', fill: '#6a2a4c' },
  { id: 'two-minutes', name: 'Two minutes counts', line: 'You did the short movement session instead of none.', shape: 'bolt', ink: '#151412', fill: '#ebebe8' },
  { id: 'day-seven', name: 'Day seven', line: 'Seven movement sessions done.', shape: 'frame', ink: '#f7f4ed', fill: '#e3261c' },
  { id: 'pr', name: 'New best', line: 'A personal record in the gym.', shape: 'burst', ink: '#151412', fill: '#f0a53a' },
  { id: 'full-week', name: 'Full week', line: 'Every planned workout in a week.', shape: 'ticket', ink: '#151412', fill: '#f1ebdd' },
  { id: 'quick-log', name: 'Better late', line: 'You logged a workout after the fact.', shape: 'tape', ink: '#151412', fill: '#cfc8b8' },
  { id: 'quest', name: 'Side quest', line: 'You finished a side quest.', shape: 'bolt', ink: '#151412', fill: '#f5b81c' },
  { id: 'reset', name: 'Reset', line: 'You used a reset on a rough afternoon.', shape: 'ring', ink: '#f1ebdd', fill: '#2a2621' },
  { id: 'night-drive', name: 'Night drive', line: 'You turned the lights down.', shape: 'moon', ink: '#f0a53a', fill: '#100f0d' },
  { id: 'replay', name: 'Kept the tape', line: 'You saved a weekly replay.', shape: 'frame', ink: '#151412', fill: '#9fd0e6' },
]);
export const STICKER_BY_ID = Object.freeze(Object.fromEntries(STICKERS.map(sticker => [sticker.id, sticker])));

/** Small, harmless, finishable today. */
export const QUESTS = Object.freeze([
  'Drink a full glass of water before your next coffee or tea.',
  'Put on one song and tidy one surface until it ends.',
  'Stand outside for two minutes. No phone.',
  'Lay out tomorrow’s gym clothes tonight.',
  'Eat one meal today sitting down, with nothing on a screen.',
  'Stretch your calves while the kettle or microwave runs.',
  'Send someone a photo of what you cooked or ate.',
  'Take the long way from the bus stop or the parking spot.',
  'Do ten slow chair squats before your shower.',
  'Refill your water bottle and put it where you will see it.',
  'Measure tonight’s cooking oil with a spoon, just to see it.',
  'Write down one thing that went fine today.',
  'Wipe down your phone and your keys.',
  'Stand on one leg while you brush your teeth. Switch halfway.',
  'Put one thing in the freezer for a future tired night.',
  'Open a window for five minutes.',
  'Throw out one thing from the fridge that is past it.',
  'Text one person you have not talked to this month.',
  'Take the stairs once today when there is a choice.',
  'Set your alarm, then put the phone across the room.',
  'Taste one spice from the cupboard on its own. Decide what it wants to go on.',
  'Roll your shoulders ten times at the next red light or loading screen.',
]);

/** Deterministic pick for a date so the day’s quest stays put until you redraw. */
export function questFor(day, offset = 0) {
  let hash = 0;
  for (const char of day) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash + offset * 7) % QUESTS.length;
}
