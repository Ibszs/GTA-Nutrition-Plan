// Ingredient catalogue. Values are per 100 g (per 100 mL for milk) of the food in the state named.
// Source for every numbered row: USDA FoodData Central, SR Legacy release (April 2018), by FDC ID.
// https://fdc.nal.usda.gov/ - open any row at https://fdc.nal.usda.gov/food-details/<FDC ID>/nutrients
// Rows without an ID are label-style estimates and say so. A package label always beats this table.
//
// Row: [name, aisle, [kcal, protein, carbs, fat, fibre], fdcId | null, flags, state]
// flags: oil = cooking oil that the oil meter counts, fat = other added fat, staple = pantry item
// you probably own, meat = default to halal-certified, ml = quantities are millilitres, zero = trace.

const rows = {
  // Meat and protein
  chickenBreast: ['Chicken breast, boneless skinless', 'Meat', [120, 22.5, 0, 2.62, 0], 171077, 'meat', 'raw'],
  chickenThigh: ['Chicken thighs, boneless skinless', 'Meat', [121, 19.66, 0, 4.12, 0], 173627, 'meat', 'raw'],
  beef90: ['Extra lean ground beef (about 90/10)', 'Meat', [176, 20, 0, 10, 0], 174030, 'meat', 'raw'],
  beef85: ['Lean ground beef (about 85/15)', 'Meat', [215, 18.59, 0, 15, 0], 171796, 'meat', 'raw'],
  beef80: ['Medium ground beef (about 80/20)', 'Meat', [254, 17.17, 0, 20, 0], 174036, 'meat', 'raw'],
  turkeyDeli: ['Deli turkey breast slices', 'Meat', [106, 14.81, 2.2, 3.77, 0], 172941, 'meat', 'as packaged'],
  cookedChicken: ['Cooked chicken breast (rotisserie or strips)', 'Meat', [137, 28, 0, 2.79, 0], 171518, 'meat', 'cooked, meat only'],
  egg: ['Large eggs', 'Dairy & eggs', [143, 12.56, 0.72, 9.51, 0], 171287, '', 'raw, about 50 g each without shell'],
  whey: ['Whey protein powder', 'Pantry', [400, 83.3, 6.7, 3.3, 0], null, 'label', 'default 30 g scoop: 120 kcal, 25 g protein; your tub label replaces this in Settings'],
  // Dairy
  milk: ['2% milk', 'Dairy & eggs', [51.5, 3.4, 4.94, 2.04, 0], 171267, 'ml', 'per 100 mL (USDA per 100 g x 1.03 density)'],
  yogurt0: ['Plain Greek yogurt, 0%', 'Dairy & eggs', [59, 10.19, 3.6, 0.39, 0], 170894, '', 'as packaged'],
  yogurtWhole: ['Plain Greek yogurt, whole milk', 'Dairy & eggs', [97, 9, 3.98, 5, 0], 171304, '', 'as packaged'],
  cottage: ['Cottage cheese, 2%', 'Dairy & eggs', [81, 10.45, 4.76, 2.27, 0], 172182, '', 'as packaged'],
  cheddar: ['Cheddar, shredded or sliced', 'Dairy & eggs', [403, 22.87, 3.37, 33.31, 0], 173414, '', 'as packaged'],
  butter: ['Salted butter', 'Dairy & eggs', [717, 0.85, 0.06, 81.11, 0], 173410, 'fat', 'as packaged'],
  cream: ['Whipping cream, 35%', 'Dairy & eggs', [340, 2.84, 2.84, 36.08, 0], 170859, 'fat', 'as packaged'],
  evapMilk: ['Evaporated milk', 'Pantry', [134, 6.81, 10.04, 7.56, 0], 172194, '', 'canned, undiluted'],
  // Grains and bread
  rice: ['Basmati or long-grain white rice', 'Pantry', [365, 7.13, 79.95, 0.66, 1.3], 168877, 'staple', 'dry'],
  riceCooked: ['Cooked white rice (pouch or leftover)', 'Pantry', [130, 2.69, 28.17, 0.28, 0.4], 168878, '', 'cooked'],
  pasta: ['Pasta shells or other short pasta', 'Pantry', [371, 13.04, 74.67, 1.51, 3.2], 169736, '', 'dry'],
  ramen: ['Instant ramen noodle bricks', 'Pantry', [440, 10.17, 60.26, 17.59, 2.9], 171177, '', 'dry, seasoning packet discarded'],
  ramenLight: ['Air-dried (non-fried) ramen or wheat noodles', 'Pantry', [350, 10.89, 70.95, 2.5, 2.7], 171822, '', 'dry; USDA reduced-fat ramen row'],
  oats: ['Rolled oats', 'Pantry', [379, 13.15, 67.7, 6.52, 10.1], 173904, 'staple', 'dry'],
  tortilla: ['Large flour tortillas (10 inch)', 'Bakery', [306, 8.2, 49.38, 7.99, 3.5], 175037, '', 'as packaged, about 70 g each'],
  pita: ['White pita bread', 'Bakery', [275, 9.1, 55.7, 1.2, 2.2], 174915, '', 'as packaged, about 60 g each'],
  naan: ['Plain naan', 'Bakery', [291, 9.62, 50.43, 5.65, 2.2], 171845, '', 'as packaged, about 90 g each'],
  roti: ['Roti or chapati', 'Bakery', [297, 11.25, 46.36, 7.45, 4.9], 171844, '', 'as packaged, about 45 g each'],
  cornflakes: ['Corn flakes cereal', 'Pantry', [384, 5.9, 88.01, 0.91, 2.7], 174648, '', 'as packaged'],
  flour: ['All-purpose flour', 'Pantry', [364, 10.33, 76.31, 0.98, 2.7], 168894, 'staple', 'dry'],
  cornstarch: ['Cornstarch', 'Pantry', [381, 0.26, 91.27, 0.05, 0.9], 169698, 'staple', 'dry'],
  granola: ['Granola', 'Pantry', [489, 13.67, 53.88, 24.31, 8.9], 171646, '', 'homemade-style reference; boxed brands vary a lot'],
  popcorn: ['Popcorn kernels', 'Snacks', [387, 12.94, 77.78, 4.54, 14.5], 167959, '', 'air-popped value used per gram of kernels'],
  // Vegetables and fruit
  potato: ['Yellow or russet potatoes', 'Produce', [77, 2.05, 17.49, 0.09, 2.1], 170026, '', 'raw, skin on'],
  sweetPotato: ['Sweet potatoes', 'Produce', [86, 1.57, 20.12, 0.05, 3], 168482, '', 'raw'],
  fries: ['Frozen oven fries', 'Frozen', [162, 2.47, 25.01, 5.84, 2.2], 169764, '', 'frozen, as packaged'],
  onion: ['Yellow onion', 'Produce', [40, 1.1, 9.34, 0.1, 1.7], 170000, '', 'raw, peeled'],
  redOnion: ['Red onion', 'Produce', [40, 1.1, 9.34, 0.1, 1.7], 170000, '', 'raw, peeled (onion values)'],
  garlic: ['Garlic', 'Produce', [149, 6.36, 33.06, 0.5, 2.1], 169230, 'staple', 'raw cloves, about 3 g each'],
  ginger: ['Fresh ginger', 'Produce', [80, 1.82, 17.77, 0.75, 2], 169231, '', 'raw, peeled'],
  tomato: ['Tomatoes', 'Produce', [18, 0.88, 3.89, 0.2, 1.2], 170457, '', 'raw'],
  lettuce: ['Iceberg or romaine lettuce', 'Produce', [14, 0.9, 2.97, 0.14, 1.2], 169248, '', 'raw'],
  cucumber: ['Cucumber', 'Produce', [15, 0.65, 3.63, 0.11, 0.5], 168409, '', 'raw, with peel'],
  redPepper: ['Red bell pepper', 'Produce', [26, 0.99, 6.03, 0.3, 2.1], 170108, '', 'raw'],
  scallion: ['Green onions', 'Produce', [32, 1.83, 7.34, 0.19, 2.6], 170005, '', 'raw'],
  cilantro: ['Fresh cilantro', 'Produce', [23, 2.13, 3.67, 0.52, 2.8], 169997, '', 'raw'],
  greenChili: ['Green chili or jalapeno', 'Produce', [29, 0.91, 6.5, 0.37, 2.8], 168576, '', 'raw'],
  avocado: ['Avocado', 'Produce', [160, 2, 8.53, 14.66, 6.7], 171705, '', 'raw flesh'],
  lemon: ['Lemon juice', 'Produce', [22, 0.35, 6.9, 0.24, 0.3], 167747, '', 'fresh juice; one lemon gives about 40 g'],
  lime: ['Lime juice', 'Produce', [25, 0.42, 8.42, 0.07, 0.4], 168156, '', 'fresh juice; one lime gives about 25 g'],
  banana: ['Banana', 'Produce', [89, 1.09, 22.84, 0.33, 2.6], 173944, '', 'raw, peeled'],
  berries: ['Frozen mixed berries', 'Frozen', [43, 0.43, 10.65, 0.38, 2.4], null, 'derived', 'mean of USDA frozen blueberries (173950) and strawberries (168173)'],
  peas: ['Frozen green peas', 'Frozen', [77, 5.22, 13.62, 0.4, 4.5], 170016, '', 'frozen, as packaged'],
  // Canned and jarred
  passata: ['Tomato passata or puree', 'Pantry', [38, 1.65, 8.98, 0.21, 1.9], 170460, '', 'as packaged'],
  crushedTomato: ['Canned crushed tomatoes', 'Pantry', [32, 1.64, 7.29, 0.28, 1.9], 170501, '', 'as packaged'],
  tomatoSauce: ['Canned tomato sauce', 'Pantry', [24, 1.2, 5.31, 0.3, 1.5], 170054, '', 'as packaged'],
  tomatoPaste: ['Tomato paste', 'Pantry', [82, 4.32, 18.91, 0.47, 4.1], 170459, 'staple', 'as packaged'],
  chickpeas: ['Canned chickpeas', 'Pantry', [139, 7.05, 22.53, 2.77, 6.4], 173800, '', 'drained'],
  hummus: ['Hummus', 'Dairy & eggs', [237, 7.78, 15, 17.82, 5.5], 174289, '', 'as packaged'],
  pickles: ['Dill pickles', 'Pantry', [12, 0.5, 2.41, 0.3, 1], 168558, '', 'drained'],
  relish: ['Sweet relish', 'Pantry', [130, 0.37, 35.06, 0.47, 1.1], 168561, 'staple', 'as packaged'],
  salsa: ['Salsa', 'Pantry', [29, 1.52, 6.64, 0.17, 1.9], 174524, '', 'as packaged'],
  broth: ['Beef or chicken broth', 'Pantry', [6, 0.64, 0.44, 0.21, 0], 174536, '', 'ready to serve; check the label is halal-suitable'],
  // Sauces and spreads
  ketchup: ['Ketchup', 'Pantry', [101, 1.04, 27.4, 0.1, 0.3], 168556, 'staple', 'as packaged'],
  mustard: ['Yellow or Dijon mustard', 'Pantry', [60, 3.74, 5.83, 3.34, 4], 172234, 'staple', 'as packaged'],
  mayo: ['Mayonnaise', 'Pantry', [680, 0.96, 0.57, 74.85, 0], 171009, 'fat staple', 'as packaged'],
  soy: ['Low-sodium soy sauce', 'Pantry', [57, 9.05, 5.59, 0.3, 0.7], 172473, 'staple', 'as packaged'],
  sriracha: ['Sriracha', 'Pantry', [93, 1.93, 19.16, 0.93, 2.2], 171186, 'staple', 'as packaged'],
  chiliOil: ['Chili oil with flakes', 'Pantry', [820, 2, 6, 88, 2], null, 'oil label staple', 'label-style estimate; brands range from about 700 to 880 kcal per 100 g'],
  honey: ['Honey', 'Pantry', [304, 0.3, 82.4, 0, 0.2], 169640, 'staple', 'as packaged'],
  jam: ['Strawberry jam', 'Pantry', [278, 0.37, 68.86, 0.07, 1.1], 169641, 'staple', 'as packaged'],
  pb: ['Natural peanut butter', 'Pantry', [598, 22.21, 22.31, 51.36, 5], 172470, 'fat staple', 'smooth, no added salt'],
  chia: ['Chia seeds', 'Pantry', [486, 16.54, 42.12, 30.74, 34.4], 170554, 'staple', 'dry'],
  sugar: ['Sugar', 'Pantry', [387, 0, 99.98, 0, 0], 169655, 'staple', 'granulated'],
  vinegar: ['White or cider vinegar', 'Pantry', [21, 0, 0.93, 0, 0], 173469, 'staple zero', 'as packaged'],
  // Oils
  canola: ['Canola or other neutral oil', 'Pantry', [884, 0, 0, 100, 0], 172336, 'oil staple', 'as packaged'],
  olive: ['Olive oil', 'Pantry', [884, 0, 0, 100, 0], 171413, 'oil staple', 'as packaged'],
  // Spices: counted, though they add little
  cumin: ['Ground cumin', 'Spices', [375, 17.81, 44.24, 22.27, 10.5], 170923, 'staple zero', 'dry'],
  cuminSeed: ['Cumin seeds', 'Spices', [375, 17.81, 44.24, 22.27, 10.5], 170923, 'staple zero', 'dry'],
  coriander: ['Ground coriander', 'Spices', [298, 12.37, 54.99, 17.77, 41.9], 170922, 'staple zero', 'dry'],
  paprika: ['Paprika (smoked if you have it)', 'Spices', [282, 14.14, 53.99, 12.89, 34.9], 171329, 'staple zero', 'dry'],
  turmeric: ['Ground turmeric', 'Spices', [312, 9.68, 67.14, 3.25, 22.7], 172231, 'staple zero', 'dry'],
  chiliPowder: ['Red chili powder or cayenne', 'Spices', [282, 13.46, 49.7, 14.28, 34.8], 171319, 'staple zero', 'dry'],
  garamMasala: ['Garam masala', 'Spices', [300, 12, 50, 15, 30], null, 'staple zero label', 'blend estimate; used by the half teaspoon'],
  pepper: ['Black pepper', 'Spices', [251, 10.39, 63.95, 3.26, 25.3], 170931, 'staple zero', 'ground'],
  garlicPowder: ['Garlic powder', 'Spices', [331, 16.55, 72.73, 0.73, 9], 171325, 'staple zero', 'dry'],
  onionPowder: ['Onion powder', 'Spices', [341, 10.41, 79.12, 1.04, 15.2], 171327, 'staple zero', 'dry'],
  methi: ['Dried fenugreek leaves (kasuri methi)', 'Spices', [300, 23, 58, 6, 25], null, 'staple zero label', 'estimate; optional but worth it'],
  chaat: ['Chaat masala', 'Spices', [250, 8, 45, 5, 15], null, 'staple zero label', 'blend estimate'],
  tacoSpice: ['Chili powder blend (taco-style)', 'Spices', [282, 13.46, 49.7, 14.28, 34.8], 171319, 'staple zero', 'dry'],
  salt: ['Salt', 'Spices', [0, 0, 0, 0, 0], 173468, 'staple zero', ''],
};

export const AISLES = Object.freeze(['Produce', 'Meat', 'Dairy & eggs', 'Bakery', 'Frozen', 'Pantry', 'Snacks', 'Spices']);

export const FOODS = Object.freeze(Object.fromEntries(Object.entries(rows).map(([id, [name, aisle, per, fdc, flags, state]]) => {
  const flagSet = new Set(flags.split(' ').filter(Boolean));
  return [id, Object.freeze({
    id, name, aisle, kcal: per[0], protein: per[1], carbs: per[2], fat: per[3], fibre: per[4], fdc, state,
    oil: flagSet.has('oil'), addedFat: flagSet.has('fat') || flagSet.has('oil'), staple: flagSet.has('staple'), meat: flagSet.has('meat'),
    ml: flagSet.has('ml'), trace: flagSet.has('zero'), estimate: fdc === null,
  })];
})));

export const foodSource = food => food.fdc
  ? { label: `USDA FoodData Central, SR Legacy, FDC ${food.fdc}`, url: `https://fdc.nal.usda.gov/food-details/${food.fdc}/nutrients` }
  : { label: food.id === 'whey' ? 'Your whey label (editable in Settings)' : `Estimate: ${food.state}`, url: null };

/** Tablespoon of oil in grams; used by the oil meter. */
export const OIL_TBSP_G = 13.6;
