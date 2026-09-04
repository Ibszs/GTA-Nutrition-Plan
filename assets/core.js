const BASE_CALORIES = 3186;
const BASE_PROTEIN = 151.7;
const BASE_CARBS = 425.3;
const BASE_FAT = 100.6;
const TARGET_CALORIES = 3300;
const DEFAULT_HONEY_GRAMS = 20;
const HONEY_CALORIES_PER_GRAM = 3.04;
const OIL_CALORIES_PER_GRAM = 8.84;

function round(value, digits = 1) {
  return Number(value.toFixed(digits));
}

function numeric(value) {
  if (value === '' || value === null || value === undefined) return Number.NaN;
  const converted = Number(value);
  return Number.isFinite(converted) ? converted : Number.NaN;
}

function mean(values) {
  if (!values.length) return Number.NaN;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function requireNonNegative(value, label) {
  const converted = numeric(value);
  if (!Number.isFinite(converted) || converted < 0) {
    throw new TypeError(`${label} must be a non-negative number.`);
  }
  return converted;
}

function requirePositive(value, label) {
  const converted = numeric(value);
  if (!Number.isFinite(converted) || converted <= 0) {
    throw new TypeError(`${label} must be a positive number.`);
  }
  return converted;
}

export function formatLocalDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError('A valid Date is required.');
  }
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildLocalDates(startDate, count = 14) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  if (!match || !Number.isInteger(count) || count < 1) {
    throw new TypeError('Start date must be a valid local date and count must be positive.');
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const day = Number(dayText);
  const start = new Date(year, month, day, 12);

  if (
    start.getFullYear() !== year
    || start.getMonth() !== month
    || start.getDate() !== day
  ) {
    throw new TypeError('Start date must be a valid local date.');
  }

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return formatLocalDate(date);
  });
}

export function calculateWheyLabel(input) {
  const scoopCalories = requireNonNegative(input?.scoopCalories, 'Scoop calories');
  const scoopProtein = requireNonNegative(input?.scoopProtein, 'Scoop protein');
  const scoopCarbs = requireNonNegative(input?.scoopCarbs, 'Scoop carbohydrate');
  const scoopFat = requireNonNegative(input?.scoopFat, 'Scoop fat');
  const uncorrectedCalories = BASE_CALORIES + scoopCalories;
  const differenceCalories = TARGET_CALORIES - uncorrectedCalories;
  const calculatedHoney = DEFAULT_HONEY_GRAMS + differenceCalories / HONEY_CALORIES_PER_GRAM;
  const useHoney = calculatedHoney >= 5 && calculatedHoney <= 40;

  return {
    uncorrectedCalories: round(uncorrectedCalories, 0),
    differenceCalories: round(differenceCalories, 0),
    method: useHoney ? 'honey' : 'oil',
    honeyGrams: useHoney ? round(calculatedHoney, 0) : DEFAULT_HONEY_GRAMS,
    oilAdjustmentGrams: useHoney ? null : round(differenceCalories / OIL_CALORIES_PER_GRAM, 1),
    dailyProteinGrams: round(BASE_PROTEIN + scoopProtein, 1),
    dailyCarbGrams: round(BASE_CARBS + scoopCarbs, 1),
    dailyFatGrams: round(BASE_FAT + scoopFat, 1),
  };
}

export function calculateTracker(input) {
  if (!Array.isArray(input?.rows)) {
    throw new TypeError('Tracker rows must be an array.');
  }

  const targetCalories = requirePositive(input.targetCalories, 'Target calories');
  const targetProtein = requirePositive(input.targetProtein, 'Target protein');
  const goalMin = requirePositive(input.goalMin, 'Goal minimum');
  const goalMax = requirePositive(input.goalMax, 'Goal maximum');
  const weeksRemaining = requireNonNegative(input.weeksRemaining, 'Weeks remaining');
  if (goalMin > goalMax) {
    throw new RangeError('Goal minimum cannot exceed goal maximum.');
  }

  const rows = Array.from({ length: 14 }, (_, index) => {
    const row = input.rows[index] || {};
    return {
      weight: numeric(row.weight),
      calories: numeric(row.calories),
      protein: numeric(row.protein),
    };
  });
  const weights = rows.map((row) => row.weight);
  const firstWeek = weights.slice(0, 7).filter(Number.isFinite);
  const secondWeek = weights.slice(7, 14).filter(Number.isFinite);
  const firstAverageRaw = mean(firstWeek);
  const secondAverageRaw = mean(secondWeek);
  const weeklyRateRaw = secondAverageRaw - firstAverageRaw;
  const projectionRaw = secondAverageRaw + weeklyRateRaw * weeksRemaining;
  const loggedCalories = rows.map((row) => row.calories).filter(Number.isFinite);
  const loggedProtein = rows.map((row) => row.protein).filter(Number.isFinite);
  const calorieAdherentDays = loggedCalories.filter((value) => value >= targetCalories * 0.9).length;
  const proteinAdherentDays = loggedProtein.filter((value) => value >= targetProtein).length;
  const calorieAdherence = loggedCalories.length ? calorieAdherentDays / loggedCalories.length : 0;
  const proteinAdherence = loggedProtein.length ? proteinAdherentDays / loggedProtein.length : 0;
  const rollingAverages = weights.map((_, index) => {
    const values = weights
      .slice(Math.max(0, index - 6), index + 1)
      .filter(Number.isFinite);
    return values.length === 7 ? round(mean(values), 2) : null;
  });

  let decisionCode = 'hold-review';
  let decisionText = 'HOLD intake and review scale, sodium, sleep and digestion signals.';

  if (
    firstWeek.length < 6
    || secondWeek.length < 6
    || loggedCalories.length < 12
    || calorieAdherence < 0.9
  ) {
    decisionCode = 'collect-more';
    decisionText = 'HOLD - collect seven more days. Data or calorie adherence is not strong enough for a correction.';
  } else if (!Number.isFinite(weeklyRateRaw) || !Number.isFinite(projectionRaw)) {
    decisionCode = 'collect-more';
    decisionText = 'HOLD - collect seven more days. Trend is ambiguous.';
  } else if (projectionRaw > goalMax && Boolean(input.priorOver)) {
    decisionCode = 'remove-module';
    decisionText = `REMOVE the most recently added 250-kcal module. Two consecutive projections exceed ${goalMax} lb.`;
  } else if (projectionRaw > goalMax) {
    decisionCode = 'first-over';
    decisionText = `HOLD. This is the first projection above ${goalMax} lb; review again in seven days.`;
  } else if (weeklyRateRaw < 0.5 && projectionRaw < goalMin) {
    decisionCode = 'add-module';
    decisionText = 'ADD one +250-kcal module. Rice Drive is the default; PB-Honey if stomach volume is the limiter.';
  } else if (
    weeklyRateRaw >= 0.5
    && weeklyRateRaw <= 1.5
    && projectionRaw >= goalMin
    && projectionRaw <= goalMax
  ) {
    decisionCode = 'hold-range';
    decisionText = 'HOLD intake. Weight trend projects into the configured target range.';
  } else if (weeklyRateRaw > 1.5 && projectionRaw <= goalMax) {
    decisionCode = 'hold-fast';
    decisionText = `HOLD and report body-composition direction. Projection remains at or below ${goalMax} lb.`;
  }

  return {
    firstAverage: Number.isFinite(firstAverageRaw) ? round(firstAverageRaw, 2) : null,
    secondAverage: Number.isFinite(secondAverageRaw) ? round(secondAverageRaw, 2) : null,
    weeklyRate: Number.isFinite(weeklyRateRaw) ? round(weeklyRateRaw, 2) : null,
    projection: Number.isFinite(projectionRaw) ? round(projectionRaw, 1) : null,
    calorieEntries: loggedCalories.length,
    calorieAdherentDays,
    calorieAdherence,
    proteinEntries: loggedProtein.length,
    proteinAdherentDays,
    proteinAdherence,
    rollingAverages,
    decisionCode,
    decisionText,
  };
}

