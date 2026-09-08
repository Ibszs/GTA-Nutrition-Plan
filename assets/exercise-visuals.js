import { EXERCISES } from './training-data.js';
// Paired movement photos from free-exercise-db. See docs/asset-sources.md.
export const EXERCISE_VISUALS = {
  pullup: { name: 'Bodyweight overhand pull-up', sourceId: 'Pullups' },
  bulgarian: { name: 'Dumbbell rear-foot-elevated split squat', sourceId: 'Split_Squat_with_Dumbbells', imageId: 'split' },
  "incline": {
    "name": "Incline Dumbbell Press",
    "sourceId": "Incline_Dumbbell_Press"
  },
  "row": {
    "name": "Dumbbell Incline Row",
    "sourceId": "Dumbbell_Incline_Row"
  },
  "pulldown": {
    "name": "V-Bar Pulldown",
    "sourceId": "V-Bar_Pulldown"
  },
  "lateral": {
    "name": "Side Lateral Raise",
    "sourceId": "Side_Lateral_Raise"
  },
  "rear": {
    "name": "Reverse Machine Flyes",
    "sourceId": "Reverse_Machine_Flyes"
  },
  "triceps": {
    "name": "Triceps Overhead Extension with Rope",
    "sourceId": "Triceps_Overhead_Extension_with_Rope"
  },
  "curl": {
    "name": "Dumbbell Bicep Curl",
    "sourceId": "Dumbbell_Bicep_Curl"
  },
  "squat": {
    "name": "Hack Squat",
    "sourceId": "Hack_Squat"
  },
  "extension": {
    "name": "Leg Extensions",
    "sourceId": "Leg_Extensions"
  },
  "rdl": {
    "name": "Romanian Deadlift",
    "sourceId": "Romanian_Deadlift"
  },
  "legcurl": {
    "name": "Seated Leg Curl",
    "sourceId": "Seated_Leg_Curl"
  },
  "legpress": {
    "name": "Leg Press",
    "sourceId": "Leg_Press"
  },
  "split": {
    "name": "Split Squat with Dumbbells",
    "sourceId": "Split_Squat_with_Dumbbells"
  },
  "calves": {
    "name": "Standing Calf Raises",
    "sourceId": "Standing_Calf_Raises"
  },
  "abs": {
    "name": "Cable Crunch",
    "sourceId": "Cable_Crunch"
  },
  "flat": {
    "name": "Dumbbell Bench Press",
    "sourceId": "Dumbbell_Bench_Press"
  },
  "fly": {
    "name": "Cable Crossover",
    "sourceId": "Cable_Crossover"
  },
  "dips": {
    "name": "Dips - Chest Version",
    "sourceId": "Dips_-_Chest_Version"
  },
  "pushup": {
    "name": "Push-up",
    "sourceId": "Pushups"
  },
  "seated-row": {
    "name": "Seated Cable Rows",
    "sourceId": "Seated_Cable_Rows"
  },
  "one-arm-row": {
    "name": "One-Arm Dumbbell Row",
    "sourceId": "One-Arm_Dumbbell_Row"
  },
  "straight-arm": {
    "name": "Straight-Arm Pulldown",
    "sourceId": "Straight-Arm_Pulldown"
  },
  "shoulder-press": {
    "name": "Seated Dumbbell Press",
    "sourceId": "Seated_Dumbbell_Press"
  },
  "face-pull": {
    "name": "Face Pull",
    "sourceId": "Face_Pull"
  },
  "hammer": {
    "name": "Hammer Curls",
    "sourceId": "Hammer_Curls"
  },
  "preacher": {
    "name": "Preacher Curl",
    "sourceId": "Preacher_Curl"
  },
  "pushdown": {
    "name": "Triceps Pushdown - Rope Attachment",
    "sourceId": "Triceps_Pushdown_-_Rope_Attachment"
  },
  "lying-triceps": {
    "name": "Lying Triceps Press",
    "sourceId": "Lying_Triceps_Press"
  },
  "goblet": {
    "name": "Goblet Squat",
    "sourceId": "Goblet_Squat"
  },
  "reverse-lunge": {
    "name": "Dumbbell Rear Lunge",
    "sourceId": "Dumbbell_Rear_Lunge"
  },
  "hip-thrust": {
    "name": "Barbell Hip Thrust",
    "sourceId": "Barbell_Hip_Thrust"
  },
  "lying-legcurl": {
    "name": "Lying Leg Curls",
    "sourceId": "Lying_Leg_Curls"
  },
  "db-calves": {
    "name": "Standing Dumbbell Calf Raise",
    "sourceId": "Standing_Dumbbell_Calf_Raise"
  },
  "deadbug": {
    "name": "Dead Bug",
    "sourceId": "Dead_Bug"
  },
  "hanging-raise": {
    "name": "Hanging Leg Raise",
    "sourceId": "Hanging_Leg_Raise"
  }
};

// Only visually audited equipment/variation matches belong here. An available
// photograph is not evidence that it demonstrates every substitution.
export const EXACT_VISUAL_VARIANTS = {
  'seated-row': { neutral: 'seated-row' }, 'one-arm-row': { bench: 'one-arm-row' },
  'straight-arm': { bar: 'straight-arm' }, 'shoulder-press': { db: 'shoulder-press' },
  hammer: { db: 'hammer' }, preacher: { ez: 'preacher' }, pushdown: { rope: 'pushdown' },
  'lying-triceps': { ez: 'lying-triceps' }, goblet: { kb: 'goblet' },
  'reverse-lunge': { db: 'reverse-lunge' }, 'hip-thrust': { barbell: 'hip-thrust' },
  'lying-legcurl': { machine: 'lying-legcurl' }, 'db-calves': { db: 'db-calves' },
  deadbug: { legs: 'deadbug' }, 'hanging-raise': { knees: 'hanging-raise' },
  fly: { cable: 'fly' }, dips: { bodyweight: 'dips' }, pushup: { floor: 'pushup' },
  incline: { db: 'incline' }, pulldown: { neutral: 'pulldown' }, rear: { machine: 'rear' },
  triceps: { overhead: 'triceps', pushdown: 'pushdown' }, curl: { db: 'curl' }, squat: { hack: 'squat' },
  extension: { machine: 'extension' }, legcurl: { seated: 'legcurl', lying: 'lying-legcurl' },
  legpress: { sled: 'legpress', hack: 'squat' }, calves: { standing: 'calves' }, abs: { cable: 'abs' },
  row: { db: 'row', cable: 'seated-row' }, lateral: { db: 'lateral' }, split: { lunge: 'reverse-lunge' },
  flat: { db: 'flat', barbell: 'flat-barbell' },
  rdl: { barbell: 'rdl' }, 'face-pull': { rope: 'face-pull' },
  bulgarian: { db: 'split' }, pullup: { bodyweight: 'pullup', weighted: 'pullup-weighted' },
};
const extraVisuals = {
  split: { name: 'Dumbbell rear-foot-elevated split squat', sourceId: 'Split_Squat_with_Dumbbells' },
  'flat-barbell': { name: 'Barbell bench press', sourceId: 'Barbell_Bench_Press_-_Medium_Grip' },
  'pullup-weighted': { name: 'Weighted overhand pull-up', sourceId: 'Weighted_Pull_Ups' },
};

const variantLoadNotes = {
  'lateral:machine': 'Record the indicated stack or plate load for the machine, not a per-arm dumbbell load. Note the seat and machine.',
  'lateral:db': 'Record ONE dumbbell. Complete both arms for one set and use the lower rep count.',
  'rdl:smith': 'Record the indicated Smith bar load plus added plates. If the bar weight is unknown, consistently record added plates only and note that in Setup. Do not compare different machines.',
  'rdl:db': 'Record ONE dumbbell, not the combined weight of both.',
  'row:cable': EXERCISES['seated-row'].loadNote,
  'legpress:hack': 'Record added plates using the same machine. Note its setup and do not compare different machines directly.',
  'pullup:bodyweight': 'Enter 0 for added load. Keep the same grip and controlled range when comparing sessions.',
  'pullup:weighted': 'Record only the securely attached added load, not your body weight. Keep the same grip, attachment and range.',
};

const variantCues = {
  'row:cable': 'Plant your feet and sit tall. Pull the handle toward your lower ribs without rocking backward. Reach forward through your shoulders on the controlled return.',
  'lateral:db': 'Hold a dumbbell in each hand with softly bent elbows. Raise both arms in a comfortable plane to about shoulder height, then lower slowly without swinging.',
  'lateral:machine': 'Adjust the seat and pads to your machine. Raise your arms through a comfortable range without shrugging or leaning, then lower under control.',
  'flat:barbell': 'Set your feet and upper back on a flat bench. Use a secure grip with wrists above your forearms. Lower the bar under control toward your chest through a comfortable range, then press without bouncing. Use rack safeties or a competent spotter.',
  'split:db': 'Keep the rear toes on the floor in a staggered stance. Hold a stable support if needed. Lower straight down with the front foot planted, then stand through the front leg. Complete both sides; a rear-foot-elevated split squat is a different setup.',
  'split:smith': 'Set the Smith bar securely across your upper back and use its safety stops. Keep both feet on the floor in a staggered stance. Lower with control, then push through your front foot. Complete both sides.',
  'split:lunge': EXERCISES['reverse-lunge'].cues,
  'incline:machine': 'Adjust the seat for an inclined press path with handles near your upper chest. Keep your back supported and feet planted. Press and lower through a comfortable range without lifting your shoulders.',
  'incline:smith': 'Set a low-incline bench securely beneath the Smith bar and set the safety stops. Keep feet planted and wrists above elbows. Lower under control through a comfortable range, then press.',
  'pulldown:single': 'Set a single handle on a high pulley. Keep your torso steady and pull one elbow toward your ribs. Return to a comfortable overhead reach, then complete the other side.',
  'rear:cable': 'Set the cables around shoulder height. With soft elbows, open your arms through a comfortable range without shrugging or arching. Return under control.',
  'rear:db': 'Support your chest on an incline bench. With soft elbows, raise the dumbbells outward without shrugging or lifting your torso. Lower slowly.',
  'triceps:pushdown': EXERCISES.pushdown.cues,
  'curl:preacher': EXERCISES.preacher.cues,
  'legcurl:lying': EXERCISES['lying-legcurl'].cues,
  'legpress:hack': EXERCISES.squat.cues,
  'calves:seated': 'Sit with the thigh pad secured and the balls of your feet on the platform. Lower your heels through a comfortable stretch, then rise slowly without bouncing.',
  'calves:press': 'Use the leg press safety stops and keep your back supported. Place the balls of your feet securely on the platform. Move through your ankles under control without forcefully locking your knees.',
  'one-arm-row:bench': EXERCISES['one-arm-row'].cues,
  'shoulder-press:machine': 'Adjust the seat so the handles begin around shoulder height. Keep your back supported and ribs steady. Press through a comfortable overhead range and lower smoothly.',
  'hammer:rope': 'Stand at a low cable with a rope attachment. Keep palms facing inward and upper arms steady. Curl without swinging, then lower under control.',
  'pushdown:bar': 'Grip the bar on a high cable. Keep elbows beside your ribs and wrists steady. Extend your elbows, then return without swinging your upper arms.',
  'lying-triceps:db': 'Lie on a stable bench with a dumbbell in each hand. Keep upper arms steady and bend your elbows to lower beside your head through a comfortable range. Extend smoothly without swinging.',
  'hip-thrust:machine': 'Adjust the machine and secure its hip pad or belt. Keep your feet planted and ribs steady. Extend your hips without arching your lower back, then lower under control.',
  'hanging-raise:straight': 'Use a secure bar and steady your hang. Raise your legs with knees comfortably straight through a range you control, then lower without swinging. Add a small pelvic curl rather than arching your back.',
  'abs:reverse': 'Lie on your back with hips and knees bent. Curl your pelvis gently toward your ribs so your tailbone lifts, then lower slowly. Avoid swinging your legs or pulling on your neck.',
  'abs:machine': 'Adjust the seat and pads to your machine. Bring your ribs toward your pelvis with controlled trunk flexion, then return slowly without pulling with your arms.',
  'pushup:incline': 'Place your hands on a secure elevated surface. Keep your trunk steady and lower chest and hips together, then press away. Use a surface that cannot slide or tip.',
  'pushup:decline': 'Place your feet on a stable low platform and hands on the floor. Keep your trunk steady and lower chest and hips together, then press without arching your back.',
  'pushup:weighted': 'Secure the added resistance so it cannot shift. Keep your trunk steady and lower chest and hips together, then press smoothly. Start with a load you can control.',
};

const loadLabels = {
  pullup: {bodyweight:'0 added load',weighted:'Added load only'},
  bulgarian: {db:'One dumbbell'},
  'seated-row': {neutral:'Stack load',wide:'Stack load'},
  'one-arm-row': {bench:'One dumbbell'},
  'straight-arm': {bar:'Stack load',rope:'Stack load'},
  'shoulder-press': {db:'One dumbbell',machine:'Indicated machine load'},
  'face-pull': {rope:'Stack load'},
  hammer: {db:'One dumbbell',rope:'Stack load'},
  preacher: {ez:'Bar + plates',machine:'Indicated machine load'},
  pushdown: {rope:'Stack load',bar:'Stack load'},
  'lying-triceps': {ez:'Bar + plates',db:'One dumbbell'},
  goblet: {kb:'One kettlebell',db:'One dumbbell'},
  'reverse-lunge': {db:'One dumbbell',bodyweight:'0 added load'},
  'hip-thrust': {barbell:'Bar + plates',machine:'Indicated machine load'},
  'lying-legcurl': {machine:'Stack load'},
  'db-calves': {db:'One dumbbell',bodyweight:'0 added load'},
  deadbug: {legs:'0 added load'},
  'hanging-raise': {knees:'0 added load',straight:'0 added load'},
  flat: {db:'One dumbbell',barbell:'Bar + plates',machine:'Indicated machine load',smith:'Consistent indicated Smith load; note setup'},
  fly: {cable:'One cable side',pecdeck:'Stack load',db:'One dumbbell'},
  dips: {bodyweight:'0 added load',weighted:'Added load only',assisted:'Assistance load; more is easier'},
  pushup: {floor:'0 added load',weighted:'Added load only',incline:'0 added load',decline:'0 added load'},
  incline: {db:'One dumbbell',machine:'Indicated machine load',smith:'Consistent indicated Smith load; note setup'},
  row: {machine:'Displayed stack load',db:'One dumbbell',cable:'Stack load'},
  pulldown: {neutral:'Stack load',overhand:'Stack load',single:'Stack load per arm'},
  lateral: {cable:'Cable load per arm',db:'One dumbbell',machine:'Indicated machine load'},
  rear: {machine:'Indicated machine load',cable:'One cable side',db:'One dumbbell'},
  triceps: {overhead:'Stack load',pushdown:'Stack load'},
  curl: {db:'One dumbbell',cable:'Stack load',preacher:'Indicated machine load'},
  squat: {hack:'Added plates; same machine',smith:'Consistent Smith load; note setup',barbell:'Bar + plates'},
  extension: {machine:'Indicated machine load',single:'Indicated load per leg'},
  rdl: {barbell:'Bar + plates',db:'One dumbbell',smith:'Smith bar + plates, or plates only if bar unknown; note setup'},
  legcurl: {seated:'Stack load',lying:'Stack load'},
  legpress: {sled:'Added plates; same sled',horizontal:'Indicated machine load',hack:'Added plates; same machine'},
  split: {db:'One dumbbell',smith:'Smith bar + plates, or plates only if bar unknown; note setup',lunge:'One dumbbell'},
  calves: {standing:'Stack or added plates; same setup',seated:'Stack or added plates; same setup',press:'Stack or added plates; same setup'},
  abs: {cable:'Stack load',machine:'Indicated machine load',reverse:'0 added load'},
};

export function getExerciseGuide(id, variantId, prescription) {
  if (!Object.hasOwn(EXERCISES, id)) return null;
  const ex = EXERCISES[id];
  const variant = ex.variants.find(item => item.id === (variantId ?? ex.variants[0].id));
  if (!variant) return null;
  const match = EXACT_VISUAL_VARIANTS[id];
  const imageId = match && Object.hasOwn(match, variant.id) ? match[variant.id] : null;
  const photo = imageId ? (extraVisuals[imageId] ?? EXERCISE_VISUALS[imageId]) : null;
  const validReps = prescription && Number.isInteger(prescription.repMin) && Number.isInteger(prescription.repMax) && prescription.repMin >= 1 && prescription.repMax >= prescription.repMin && prescription.repMax <= 100;
  return {
    name: variant.name, muscle: ex.muscle,
    loadLabel: loadLabels[id]?.[variant.id] ?? null,
    cues: variantCues[`${id}:${variant.id}`] ?? ex.cues, loadNote: variantLoadNotes[`${id}:${variant.id}`] ?? ex.loadNote,
    repMin: validReps ? prescription.repMin : ex.repMin,
    repMax: validReps ? prescription.repMax : ex.repMax,
    rest: Number.isFinite(prescription?.rest) && prescription.rest > 0 && prescription.rest <= 900 ? prescription.rest : ex.rest,
    visual: photo ? { ...photo, imageId } : null,
  };
}
