// Quick-add command parsing. Pure: text in, a ranked list of things Forme could do with it out.
// "181.4" logs weight, "sleep 7.5" logs sleep, a habit name ticks it, a dish opens it.

const number = '(\\d+(?:\\.\\d+)?)';
const RULES = [
  { re: new RegExp(`^${number}$`), make: m => (Number(m[1]) >= 60 && Number(m[1]) <= 500 ? { type: 'weight', value: Number(m[1]) } : null) },
  { re: new RegExp(`^(?:w|wt|weight)\\s*${number}$`, 'i'), make: m => ({ type: 'weight', value: Number(m[1]) }) },
  { re: new RegExp(`^(?:s|sl|sleep|slept)\\s*${number}$`, 'i'), make: m => (Number(m[1]) <= 24 ? { type: 'sleep', value: Number(m[1]) } : null) },
  { re: new RegExp(`^(?:waist)\\s*${number}$`, 'i'), make: m => ({ type: 'waist', value: Number(m[1]) }) },
  { re: new RegExp(`^(?:kcal|cal|cals|calories)\\s*${number}$`, 'i'), make: m => ({ type: 'kcal', value: Math.round(Number(m[1])) }) },
  { re: new RegExp(`^(?:p|pro|protein)\\s*${number}$`, 'i'), make: m => ({ type: 'protein', value: Math.round(Number(m[1])) }) },
];

const PLACES = [
  ['groceries', 'eat/list', 'Grocery list'], ['grocery', 'eat/list', 'Grocery list'], ['shopping', 'eat/list', 'Grocery list'], ['week', 'eat/week', 'Sample week'], ['plan', 'eat/week', 'Sample week'],
  ['prep', 'eat/prep', 'Prep and Use It First'], ['leftovers', 'eat/prep', 'Use It First'], ['fridge', 'eat/fridge', 'What can I make?'], ['habits', 'habits', 'Habits'], ['reset', 'reset', 'Reset'],
  ['settings', 'you/settings', 'Settings'], ['backup', 'you/data', 'Backup and data'], ['export', 'you/data', 'Backup and data'], ['progress', 'you/progress', 'Progress'], ['goal', 'you/goal', 'Goal and targets'],
  ['targets', 'you/goal', 'Goal and targets'], ['history', 'train/history', 'Workout history'], ['stickers', 'fun', 'Stickers and replays'], ['replay', 'fun/replay', 'Weekly replay'], ['evidence', 'move/why', 'Movement evidence'],
];

const words = text => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
/** 0 = no match; higher is better. Every query word must start some word of the name. */
export function matchScore(query, name) {
  const q = words(query); const n = words(name);
  if (!q.length) return 0;
  let score = 0;
  for (const part of q) {
    const hit = n.findIndex(word => word.startsWith(part));
    if (hit < 0) return 0;
    score += (part.length / n[hit].length) + (hit === 0 ? 0.5 : 0);
  }
  return score / q.length + (name.toLowerCase() === query.toLowerCase().trim() ? 2 : 0);
}

/**
 * catalog: { habits: [{id,name}], recipes: [{id,name}], lifts: [{id,name}], drills: [{id,name}] }
 * Returns up to `limit` suggestions, best first: { type, label, value?, id?, route? }.
 */
export function parseCommand(text, catalog = {}, limit = 6) {
  const input = text.trim();
  if (!input) return [];
  for (const rule of RULES) {
    const match = rule.re.exec(input);
    if (match) { const result = rule.make(match); if (result) return [{ ...result, label: labelFor(result) }]; }
  }
  const out = [];
  const push = (list, type, labeller, route) => {
    for (const item of list ?? []) {
      const score = matchScore(input, item.name);
      if (score > 0) out.push({ type, id: item.id, label: labeller(item), route: route?.(item), score });
    }
  };
  push(catalog.habits, 'habit', item => `Tick: ${item.name}`, null);
  push(catalog.recipes, 'recipe', item => `Recipe: ${item.name}`, item => `eat/r/${item.id}`);
  push(catalog.drills, 'drill', item => `Movement: ${item.name}`, item => `move/x/${item.id}`);
  push(catalog.lifts, 'lift', item => `Lift guide: ${item.name}`, item => `train/x/${item.id}`);
  for (const [word, route, name] of PLACES) {
    const score = matchScore(input, word);
    if (score > 0 && !out.some(item => item.route === route)) out.push({ type: 'place', label: `Go to: ${name}`, route, score: score * 0.9 });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

function labelFor(result) {
  switch (result.type) {
    case 'weight': return `Log weight: ${result.value}`;
    case 'sleep': return `Log sleep: ${result.value} h`;
    case 'waist': return `Log waist: ${result.value}`;
    case 'kcal': return `Log calories eaten: ${result.value} kcal`;
    case 'protein': return `Log protein eaten: ${result.value} g`;
    default: return '';
  }
}
