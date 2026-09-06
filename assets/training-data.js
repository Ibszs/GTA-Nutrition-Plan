const exercise = (id, name, muscle, reps, rest, cues, variants, loadNote = 'Record the total external load.') => ({
  id, name, muscle, repMin: reps[0], repMax: reps[1], rest, cues, loadNote,
  variants: variants.map(([id, name]) => ({ id, name })),
});

export const EXERCISES = {
  flat: exercise('flat', 'Flat chest press', 'Chest', [6, 12], 180,
    'Set your feet and upper back. Lower with control to a comfortable depth, then press without bouncing or lifting your hips.',
    [['db', 'Flat dumbbell press'], ['barbell', 'Barbell bench press'], ['machine', 'Chest-press machine'], ['smith', 'Flat Smith press']], 'Dumbbells: record ONE dumbbell. Barbell: include the bar. Machine or Smith: use a consistent indicated load and note the setup.'),
  fly: exercise('fly', 'Chest fly', 'Chest', [10, 20], 90,
    'Keep a soft elbow bend. Bring your arms together in a hugging arc, then return through a comfortable stretch without forcing your shoulders back.',
    [['cable', 'Cable chest fly'], ['pecdeck', 'Pec deck'], ['db', 'Dumbbell fly']], 'Cables or dumbbells: record ONE side. Pec deck: record the stack. Note pulley height or bench angle in Setup.'),
  dips: exercise('dips', 'Chest dips', 'Chest / triceps', [6, 15], 150,
    'Use a stable station and a comfortable forward lean. Lower only as far as your shoulders tolerate, then press smoothly. Choose assistance if needed.',
    [['bodyweight', 'Bodyweight dips'], ['weighted', 'Weighted dips'], ['assisted', 'Assisted dip machine']], 'Bodyweight: enter 0. Weighted: record added weight only. Assisted: record assistance and note it in Setup; more assistance makes the movement easier.'),
  pushup: exercise('pushup', 'Push-up', 'Chest / triceps', [8, 25], 120,
    'Keep your trunk steady and hands at a comfortable width. Lower chest and hips together, then press the floor away. Elevate your hands to make the movement easier.',
    [['floor', 'Floor push-up'], ['weighted', 'Weighted push-up'], ['incline', 'Hands-elevated push-up'], ['decline', 'Feet-elevated push-up']], 'Enter 0 for bodyweight or the added load for weighted work. Record hand or foot height in Setup.'),
  incline: exercise('incline', 'Incline dumbbell press', 'Upper chest', [6, 10], 180,
    'Use a low incline, feet planted and shoulder blades comfortably set. Lower under control through a pain-free range; keep wrists above elbows.',
    [['db', 'Incline dumbbell press'], ['machine', 'Incline chest-press machine'], ['smith', 'Low-incline Smith press']], 'Dumbbells: record the weight of ONE dumbbell. For a bar or machine, record its total indicated load.'),
  row: exercise('row', 'Chest-supported row', 'Back', [8, 12], 150,
    'Keep your chest on the pad. Reach at the bottom, then pull elbows back without lifting your torso. Avoid jerking the load.',
    [['machine', 'Chest-supported row machine'], ['db', 'Chest-supported dumbbell row'], ['cable', 'Seated cable row']], 'Dumbbells: record ONE dumbbell. Machine/cable: record the displayed stack load.'),
  pulldown: exercise('pulldown', 'Neutral-grip pulldown', 'Back', [8, 12], 150,
    'Start with a comfortable overhead reach. Pull elbows toward your ribs, with only a slight lean. Do not swing or pull behind your neck.',
    [['neutral', 'Neutral-grip lat pulldown'], ['overhand', 'Medium overhand pulldown'], ['single', 'Single-arm cable pulldown']], 'For one-arm work, log the load per arm and reps completed on each side (use the lower rep count).'),
  lateral: exercise('lateral', 'Cable lateral raise', 'Side delts', [12, 20], 90,
    'Lead with elbows, using a soft bend. Raise in a comfortable plane to about shoulder height. Keep the torso still; reduce load if you need to swing.',
    [['cable', 'Single-arm cable lateral raise'], ['db', 'Dumbbell lateral raise'], ['machine', 'Lateral-raise machine']], 'Log the load per arm. One set includes both sides; record the lower rep count.'),
  rear: exercise('rear', 'Reverse pec deck', 'Rear delts', [12, 20], 90,
    'Keep a soft elbow bend and ribs steady. Open your arms without shrugging or arching. Use a controlled return.',
    [['machine', 'Reverse pec deck'], ['cable', 'Cable rear-delt fly'], ['db', 'Chest-supported rear-delt raise']], 'Dumbbells/cables: log one side. A set includes both sides.'),
  triceps: exercise('triceps', 'Cable triceps extension', 'Triceps', [10, 15], 90,
    'Keep upper arms steady and use a comfortable elbow range. Extend without leaning your whole body into the weight.',
    [['overhead', 'Overhead cable triceps extension'], ['pushdown', 'Rope pushdown']], 'Record the displayed stack load; keep the attachment consistent.'),
  curl: exercise('curl', 'Dumbbell curl', 'Biceps', [10, 15], 90,
    'Keep elbows quiet and shoulders relaxed. Lower fully under control without swinging. Use a range your elbows tolerate.',
    [['db', 'Dumbbell curl'], ['cable', 'Cable curl'], ['preacher', 'Preacher-curl machine']], 'Dumbbells: log ONE dumbbell. Alternating curls: reps are per arm.'),
  squat: exercise('squat', 'Hack squat', 'Quads', [6, 10], 180,
    'Keep your whole foot planted and knees tracking with toes. Descend as far as you can control comfortably; avoid bouncing out of the bottom.',
    [['hack', 'Hack-squat machine'], ['smith', 'Smith squat'], ['barbell', 'High-bar squat']], 'Machine: record added plates using the same machine. Barbell: include the bar. Never compare these directly.'),
  extension: exercise('extension', 'Leg extension', 'Quads', [10, 15], 90,
    'Align the machine pivot with your knee, keep hips down, and extend smoothly. Do not kick or force a painful range.',
    [['machine', 'Leg-extension machine'], ['single', 'Single-leg extension']], 'Single-leg: load and reps are per leg; one set includes both legs.'),
  rdl: exercise('rdl', 'Romanian deadlift', 'Hamstrings / glutes', [6, 10], 180,
    'Keep knees softly bent, brace your trunk and push hips back. Keep the load close. Stop the descent where you can maintain your position; standing on a platform is unnecessary.',
    [['barbell', 'Barbell Romanian deadlift'], ['db', 'Dumbbell Romanian deadlift'], ['smith', 'Smith Romanian deadlift']], 'Barbell: include the bar. Dumbbells: record ONE dumbbell.'),
  legcurl: exercise('legcurl', 'Seated leg curl', 'Hamstrings', [10, 15], 90,
    'Align your knee with the pivot and secure the thigh pad. Curl smoothly without lifting hips; control the return.',
    [['seated', 'Seated leg curl'], ['lying', 'Lying leg curl']], 'Record the stack load and identify the machine in Setup.'),
  legpress: exercise('legpress', 'Leg press', 'Quads / glutes', [8, 12], 180,
    'Place feet where knees track comfortably. Lower without your pelvis rolling off the pad; press smoothly and avoid forceful knee locking.',
    [['sled', '45-degree leg press'], ['horizontal', 'Horizontal leg press'], ['hack', 'Hack-squat machine']], 'Record added plates on a sled or the stack number. Use Setup to distinguish machines; do not compare different sleds.'),
  split: exercise('split', 'Supported split squat', 'Quads / glutes', [8, 12], 150,
    'Hold a stable support if needed. Lower straight down with the front foot planted, then push through that leg. Complete both sides.',
    [['db', 'Supported dumbbell split squat'], ['smith', 'Smith split squat'], ['lunge', 'Dumbbell reverse lunge']], 'Dumbbell variations: record ONE dumbbell. Smith: record the indicated bar weight plus added plates; if bar weight is unknown, consistently record added plates only and note that in Setup. Do not compare Smith loads with dumbbell loads. Reps are per leg; log the lower rep count. One set includes both legs.'),
  calves: exercise('calves', 'Calf raise', 'Calves', [10, 15], 90,
    'Lower slowly into a comfortable stretch, pause briefly and rise without bouncing. Keep the ankle path controlled.',
    [['standing', 'Standing calf-raise machine'], ['seated', 'Seated calf raise'], ['press', 'Leg-press calf raise']], 'Record indicated stack or added plates and keep the same setup.'),
  abs: exercise('abs', 'Cable crunch', 'Abs', [10, 15], 90,
    'Bring ribs toward pelvis through controlled trunk flexion. Keep hips fairly still; do not turn it into a hip hinge or pull with your arms.',
    [['cable', 'Kneeling cable crunch'], ['machine', 'Ab-crunch machine'], ['reverse', 'Controlled reverse crunch']], 'Reverse crunch: use 0 for bodyweight. Record reps with a controlled pelvic curl.'),
};

const upper = [['incline', 4], ['row', 3], ['pulldown', 3], ['lateral', 4], ['rear', 2], ['triceps', 2], ['curl', 2]];
export const SESSIONS = [
  { id: 'upper-a', name: 'Upper A', day: 'Mon', focus: 'Upper chest, back & shoulders', exercises: upper },
  { id: 'lower-a', name: 'Lower A', day: 'Tue', focus: 'Quads, hinge & abs', exercises: [['squat', 3], ['rdl', 3], ['extension', 2], ['legcurl', 2], ['calves', 3], ['abs', 3]] },
  { id: 'upper-b', name: 'Upper B', day: 'Thu', focus: 'Back, upper chest & shoulders', exercises: [['pulldown', 3], ['incline', 4], ['row', 3], ['lateral', 4], ['rear', 2], ['triceps', 2], ['curl', 2]] },
  { id: 'lower-b', name: 'Lower B', day: 'Sat', focus: 'Leg press, single-leg & abs', exercises: [['legpress', 3], ['split', 2], ['legcurl', 3], ['calves', 3], ['abs', 3]] },
];

export function localToday(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isRealDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value >= '1900-01-01' && value <= '2200-12-31';
}

export function getWeek(startDate, date) {
  if (!isRealDate(startDate) || !isRealDate(date)) throw new Error('Use a valid calendar date.');
  return Math.floor((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${startDate}T12:00:00Z`)) / 604800000) + 1;
}

export function getPrescription(week, lighter = false) {
  return {
    rir: lighter ? 4 : week <= 2 ? 3 : 2,
    setMultiplier: lighter ? 0.5 : 1,
    checkpoint: [4, 8, 12].includes(week),
    phase: lighter ? 'Lighter session' : week <= 2 ? 'Calibrate your loads' : week >= 16 ? 'Consolidate & review' : 'Build with steady reps',
    note: lighter ? 'About half the usual sets, with 4 reps in reserve. Resume normal training when recovered.' : week <= 2 ? 'Learn the movements and finish each set with about 3 good reps left.' : week >= 16 ? 'Keep technique and loads repeatable. Review performance and recovery before your next block.' : 'Aim for 1–2 good reps left. The logger uses 2 RIR as its conservative progression threshold.',
  };
}
