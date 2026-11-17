// The playful layer: a sticker sheet earned by real actions, and harmless side quests.
// Everything here can be turned off in Settings. Nothing is public and nothing counts against you.

/** shape: one of ring, burst, tape, ticket, drop, bolt, frame, moon. Colours are the stock, the ink, the spot red and the food tag colours. */
export const STICKERS = Object.freeze([
  { id: 'first-frame', name: 'First log', line: 'The first thing you logged in Forme.', shape: 'frame', ink: '#141114', fill: '#f9bfcb' },
  { id: 'comeback', name: 'Back again', line: 'You came back after three or more days away.', shape: 'burst', ink: '#f9bfcb', fill: '#141114' },
  { id: 'cooked', name: 'Cooked it', line: 'You cooked a Forme recipe.', shape: 'ring', ink: '#141114', fill: '#ff8a3d' },
  { id: 'measured', name: 'Measured the oil', line: 'You set the oil with a spoon instead of a pour.', shape: 'drop', ink: '#141114', fill: '#f7e7a8' },
  { id: 'lighter', name: 'Lighter version', line: 'You cooked the lighter version of a recipe.', shape: 'tape', ink: '#ffffff', fill: '#2f7d4f' },
  { id: 'batch', name: 'Batch stored', line: 'You put a batch in the fridge or freezer.', shape: 'ticket', ink: '#141114', fill: '#a9d3f2' },
  { id: 'used-first', name: 'Used it first', line: 'You ate a leftover before its date.', shape: 'ring', ink: '#ffffff', fill: '#5b1f3d' },
  { id: 'two-minutes', name: 'Two minutes', line: 'You did the two-minute movement session.', shape: 'bolt', ink: '#141114', fill: '#f2c230' },
  { id: 'day-seven', name: 'Day seven', line: 'Seven movement sessions done.', shape: 'frame', ink: '#ffffff', fill: '#1f5fd0' },
  { id: 'pr', name: 'New best', line: 'A personal record in the gym.', shape: 'burst', ink: '#ffffff', fill: '#d6001c' },
  { id: 'full-week', name: 'Full week', line: 'Every planned workout in a week.', shape: 'ticket', ink: '#ffffff', fill: '#141114' },
  { id: 'quick-log', name: 'Better late', line: 'You logged a workout after the fact.', shape: 'tape', ink: '#141114', fill: '#d9d7d2' },
  { id: 'quest', name: 'Side quest', line: 'You finished a side quest.', shape: 'bolt', ink: '#141114', fill: '#a9d3f2' },
  { id: 'reset', name: 'Reset', line: 'You used a reset on a rough afternoon.', shape: 'ring', ink: '#fbe4e9', fill: '#2a2327' },
  { id: 'night-drive', name: 'Night drive', line: 'You turned Night Drive on.', shape: 'moon', ink: '#f9bfcb', fill: '#141114' },
  { id: 'replay', name: 'Kept a replay', line: 'You saved a weekly replay.', shape: 'frame', ink: '#141114', fill: '#f2c230' },
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
