// All nutrition is an estimate: kcal and grams of protein/carbs/fat/fibre per `per`
// units. Ingredient amounts use the food's unit and weightState, never cooked yield.
// Sources distinguish checked CNF records, package labels and generic planning assumptions.
const genericSource = 'Rounded generic planning estimate; check your package. Reference: https://food-nutrition.canada.ca/cnf-fce/?lang=eng';
function food(name, unit, category, store, per, weightState, values, source = genericSource) {
  const [kcal, protein, carbs, fat, fibre] = values;
  return { name, unit, category, store, per, weightState, kcal, protein, carbs, fat, fibre, source };
}

export const FOODS = {
  oats: food('Rolled oats', 'g', 'Grains & pulses', 'Costco Burlington', 100, 'dry', [388, 13.26, 66.67, 7.17, 9.3], 'CNF 2026 food 1464, Quaker large-flake oats: branded proxy, not a verified Costco bag label. https://open.canada.ca/data/en/dataset/1b6139bd-ed7e-4043-bc28-ff00e10f3109'),
  peanutButter: food('Natural peanut butter', 'g', 'Pantry', 'Costco Burlington', 100, 'as packaged; peanuts only', [585, 23.68, 21.51, 49.66, 8], 'CNF 2026 food 6289, natural peanut butter; generic proxy for your jar. https://open.canada.ca/data/en/dataset/1b6139bd-ed7e-4043-bc28-ff00e10f3109'),
  banana: food('Banana', 'g', 'Produce', 'Food Basics Milton', 100, 'raw edible flesh; peel excluded', [89, 1.1, 22.8, 0.3, 2.6]),
  honey: food('Honey', 'g', 'Pantry', 'Costco Burlington', 100, 'as packaged', [304, 0.3, 82.4, 0, 0]),
  whey: food('Whey powder — assumed label', 'scoop', 'Protein', 'Already owned; check tub', 1, 'as packaged; about 30 g per scoop, use your label', [120, 25, 2, 1, 0], 'Placeholder only: assumed 120 kcal, 25 g protein, 2 g carbs, 1 g fat per scoop; replace with your tub label.'),
  milk: food('2% milk', 'mL', 'Dairy & eggs', 'Food Basics Milton', 250, 'as packaged', [130, 9, 12, 5, 0]),
  egg: food('Large egg', 'count', 'Dairy & eggs', 'Food Basics Milton', 1, 'one large egg; about 50 g edible without shell', [72, 6.3, 0.4, 4.8, 0]),
  raisins: food('Plain raisins', 'g', 'Pantry', 'Food Basics Milton', 100, 'as packaged', [299, 3.1, 79.2, 0.5, 3.7]),
  chicken: food('Halal boneless skinless chicken thigh', 'g', 'Protein', 'Costco Burlington', 100, 'raw edible meat; bone and skin excluded', [121, 19.66, 0, 4.12, 0], 'CNF 2026 food 853, chicken thigh meat only, raw. https://open.canada.ca/data/en/dataset/1b6139bd-ed7e-4043-bc28-ff00e10f3109'),
  rice: food('White rice', 'g', 'Grains & pulses', 'Costco Burlington', 100, 'dry', [365, 7.13, 79.95, 0.66, 0.97], 'CNF 2026 food 4471, long-grain white rice, dry; generic proxy for your bag. https://open.canada.ca/data/en/dataset/1b6139bd-ed7e-4043-bc28-ff00e10f3109'),
  lentils: food('Red lentils', 'g', 'Grains & pulses', 'Iqbal Erin Mills', 100, 'dry', [352, 24.63, 63.35, 1.06, 10.66], 'CNF 2026 food 3392, dry mature lentil seeds; generic proxy for red lentils. https://open.canada.ca/data/en/dataset/1b6139bd-ed7e-4043-bc28-ff00e10f3109'),
  vegetables: food('Plain frozen mixed vegetables', 'g', 'Produce', 'Costco Burlington', 100, 'as packaged frozen; no sauce', [60, 3, 10, 0.5, 3]),
  oliveOil: food('Olive oil', 'g', 'Pantry', 'Costco Burlington', 100, 'as packaged; weigh in grams', [885, 0, 0, 100, 0], 'CNF 2026 food 422, olive oil. https://open.canada.ca/data/en/dataset/1b6139bd-ed7e-4043-bc28-ff00e10f3109'),
  yogurt: food('Plain high-protein Greek yogurt', 'g', 'Dairy & eggs', 'Costco Burlington', 115, 'as packaged; assumes Oikos High Protein Plain 0%', [70, 13, 4, 0, 0], 'Oikos Canada label checked September 5, 2026: https://www.oikos.ca/en/oikos-high-protein/high-protein-plain — your tub label wins.'),
  onion: food('Onion', 'g', 'Produce', 'Food Basics Milton', 100, 'raw peeled edible portion', [40, 1.1, 9.3, 0.1, 1.7]),
  lemon: food('Lemon juice', 'g', 'Produce', 'Food Basics Milton', 100, 'fresh squeezed juice; rind and seeds excluded', [22, 0.4, 6.9, 0.2, 0.3]),
  garlic: food('Garlic', 'g', 'Produce', 'Food Basics Milton', 100, 'raw peeled cloves', [149, 6.4, 33.1, 0.5, 2.1]),
  paprika: food('Paprika', 'g', 'Spices', 'Iqbal Erin Mills', 100, 'dry single spice', [282, 14.1, 54, 12.9, 34.9]),
  cumin: food('Ground cumin', 'g', 'Spices', 'Iqbal Erin Mills', 100, 'dry single spice', [375, 17.8, 44.2, 22.3, 10.5]),
  turmeric: food('Turmeric', 'g', 'Spices', 'Iqbal Erin Mills', 100, 'dry single spice', [312, 9.7, 67.1, 3.3, 22.7]),
  pepper: food('Black pepper', 'g', 'Spices', 'Iqbal Erin Mills', 100, 'dry single spice', [251, 10.4, 64, 3.3, 25.3]),
  salt: food('Salt', 'g', 'Spices', 'Iqbal Erin Mills', 100, 'as packaged', [0, 0, 0, 0, 0]),
  potato: food('Potato — optional variety', 'g', 'Produce', 'Food Basics Milton', 100, 'raw edible washed potato; remove damaged parts', [77, 2, 17.5, 0.1, 2.2]),
  tomatoes: food('Plain canned tomatoes', 'g', 'Pantry', 'Food Basics Milton', 100, 'as packaged with juice; no added sauce', [22, 1.1, 4.7, 0.2, 1.2]),
  pita: food('Plain pita bread', 'g', 'Grains & pulses', 'Food Basics Milton', 100, 'as packaged; weigh bread, check ingredients and label', [275, 9.1, 55.7, 1.2, 2.2]),
};

const riceSafety = 'Rice safety: divide hot food into shallow portions and cool rapidly within 1 hour. Refrigerate at 4°C or colder and use within 24 hours, or freeze the same day. Thaw in the fridge; reheat once to 74°C throughout. Never leave rice in a warm cooker or rely on smell to judge safety.';
const leftoverSafety = 'Cool promptly in shallow containers; refrigerate at 4°C or colder within 2 hours and eat within 2–3 days, or freeze. Thaw in the fridge and reheat leftovers to 74°C throughout.';
const ricePortion = 'This makes 1 full meal. Weigh rice/lentils dry and chicken raw before cooking. For a batch, multiply every ingredient by the number of meals, then divide each cooked component equally between that many containers; cooked weights vary with water loss.';
const ingredients = entries => entries.map(([food, amount]) => ({ food, amount }));

export const RECIPES = [
  {
    id: 'breakfast-shake', name: 'Dense breakfast shake', category: 'Breakfast', minutes: 5,
    equipment: ['Blender', 'Kitchen scale'],
    ingredients: ingredients([['oats', 60], ['peanutButter', 25], ['banana', 120], ['honey', 20], ['whey', 1]]),
    steps: ['Blend 60 g dry oats briefly into a finer texture.', 'Add the weighed peanut butter, peeled banana, honey and 1 label-sized scoop of whey. Add 250–400 mL cold water and a few ice cubes.', 'Blend until smooth, adding water a little at a time. Drink the full shake as one breakfast.'],
    note: 'Original 05:50 meal, unchanged quantities. Water and ice add no nutrition. Drink promptly or keep at 4°C or colder and use within 24 hours. Whey defaults to an assumed label; your saved label changes the estimate, not the ingredient amounts.',
  },
  {
    id: 'work-snack', name: 'Milk, eggs and raisins', category: 'Snack', minutes: 15,
    equipment: ['Saucepan', 'Insulated lunch bag with ice pack'],
    ingredients: ingredients([['milk', 250], ['egg', 2], ['raisins', 20]]),
    steps: ['Cover 2 eggs with cold water in a saucepan. Bring to a boil, lower to a gentle simmer and cook about 10–12 minutes until both yolks and whites are firm.', 'Cool the eggs under cold running water and refrigerate promptly. Pack with 250 mL milk and 20 g raisins.', 'Eat both eggs, drink the milk and finish the raisins at the same eating point. Keep the eggs and milk at 4°C or colder until eating.'],
    note: 'Original 09:15 meal. Prep time is about 2 minutes if eggs are already cooked. Use refrigerated prepped eggs within 2–3 days for this plan; keep raisins separate and dry.',
  },
  {
    id: 'box-a', name: 'Work Box A', archived: true, category: 'Main meal', minutes: 35,
    equipment: ['Two saucepans', 'Frying pan', 'Food thermometer', 'Kitchen scale'],
    ingredients: ingredients([['chicken', 100], ['rice', 100], ['lentils', 30], ['vegetables', 175], ['oliveOil', 15]]),
    steps: ['Rinse 100 g dry rice and cook in water using its package ratio and time. Separately rinse 30 g dry red lentils, simmer in about 150 mL water for 12–18 minutes until tender, and drain excess water.', 'Cut 100 g raw chicken into even pieces. Heat 10 g oil in a pan over medium heat and cook chicken for about 10–14 minutes, turning until the thickest pieces reach 74°C; time alone does not confirm doneness.', 'Cook 175 g frozen vegetables according to the bag. Combine with rice and lentils, then add chicken and the remaining 5 g oil. Scrape cooking oil into the meal so the measured portion is included.'],
    note: `Original 12:30 meal, unchanged quantities. ${ricePortion} ${riceSafety}`,
  },
  {
    id: 'pre-workout', name: 'Egg, raisins and honey', category: 'Snack', minutes: 15,
    equipment: ['Saucepan', 'Small food container'],
    ingredients: ingredients([['egg', 1], ['raisins', 20], ['honey', 15]]),
    steps: ['Cook 1 egg in gently simmering water for about 10–12 minutes until the white and yolk are firm, then cool promptly. If already cooked, assembly takes 2 minutes.', 'Pack the egg chilled, 20 g raisins and 15 g honey in separate small containers. Eat the egg and raisins, and have the honey directly or stirred into water.'],
    note: 'Original 16:15 meal. Keep the egg at 4°C or colder and use within 2–3 days of cooking. Keep this honey portion at 15 g when comparing to the original template.',
  },
  {
    id: 'box-b', name: 'Home Box B', archived: true, category: 'Main meal', minutes: 35,
    equipment: ['Two saucepans', 'Frying pan', 'Food thermometer', 'Kitchen scale'],
    ingredients: ingredients([['chicken', 100], ['rice', 130], ['lentils', 30], ['vegetables', 175], ['oliveOil', 20]]),
    steps: ['Cook 130 g dry rice using the water ratio on its package. Rinse 30 g dry red lentils and simmer separately in about 150 mL water for 12–18 minutes until tender; drain if needed.', 'Cut 100 g raw chicken into even pieces. Pan-cook in 10 g oil over medium heat for about 10–14 minutes, turning; verify 74°C in the thickest pieces.', 'Cook 175 g frozen vegetables as directed on the package. Plate the rice, lentils, vegetables and chicken with the remaining 10 g oil; include the pan oil in your serving.'],
    note: `Original 19:30 meal, unchanged quantities. ${ricePortion} ${riceSafety}`,
  },
  {
    id: 'night-dairy', name: 'Night dairy', category: 'Snack', minutes: 2,
    equipment: ['Bowl', 'Measuring jug', 'Kitchen scale'],
    ingredients: ingredients([['milk', 250], ['yogurt', 150]]),
    steps: ['Weigh 150 g plain high-protein Greek yogurt into a bowl and pour 250 mL 2% milk.', 'Eat the yogurt and drink the milk, or stir them together if you prefer a thinner bowl.'],
    note: 'Original 21:30 meal. One serving. Keep dairy at 4°C or colder and follow package use-by and after-opening directions. Yogurt nutrition assumes the cited Oikos plain label, which may differ from your tub.',
  },
  {
    id: 'overnight-oats', name: 'Banana and peanut butter overnight oats', category: 'Breakfast', minutes: 5,
    equipment: ['Lidded jar or bowl', 'Kitchen scale'],
    ingredients: ingredients([['oats', 60], ['milk', 150], ['yogurt', 100], ['peanutButter', 25], ['banana', 120], ['honey', 20]]),
    steps: ['Stir 60 g dry oats, 150 mL milk, 100 g yogurt, 25 g peanut butter and 20 g honey in a lidded bowl. Add 30–60 mL water if it is too thick.', 'Refrigerate at 4°C or colder for at least 4 hours or overnight. Slice in 120 g peeled banana just before eating.', 'Eat the whole bowl. For two breakfasts, double the ingredients and divide into two jars immediately.'],
    note: '5 minutes hands-on plus at least 4 hours chilling. Use within 24 hours of mixing. The whole jar replaces one breakfast; it is not an extra snack.',
  },
  {
    id: 'banana-oat-pancakes', name: 'Banana oat protein pancakes', category: 'Breakfast', minutes: 20,
    equipment: ['Blender', 'Nonstick frying pan', 'Spatula'],
    ingredients: ingredients([['oats', 60], ['egg', 2], ['milk', 150], ['banana', 120], ['honey', 20], ['peanutButter', 15], ['whey', 0.5]]),
    steps: ['Blend 60 g dry oats to flour. Add 2 eggs, 150 mL milk, 120 g peeled banana and half a label-sized scoop of whey. Blend, then rest 3 minutes so the oats thicken.', 'Heat a good nonstick pan over medium-low heat. Make small pancakes in batches, cooking about 2–3 minutes per side until set through with no wet egg batter; check 74°C in the centre if batch thickness varies. No added oil is included in this version.', 'Mix 15 g peanut butter with 20 g honey and a teaspoon or two of water. Spread over the cooked pancakes and eat the whole batch as one breakfast.'],
    note: `Makes about 6 small pancakes; pan size changes the count, not the serving. If you need pan oil, log it separately. ${leftoverSafety}`,
  },
  {
    id: 'lemon-chicken-rice', name: 'Lemon garlic chicken rice bowl', category: 'Main meal', minutes: 35,
    equipment: ['Two saucepans', 'Frying pan', 'Food thermometer'],
    ingredients: ingredients([['chicken', 100], ['rice', 110], ['lentils', 30], ['vegetables', 175], ['oliveOil', 15], ['onion', 40], ['lemon', 20], ['garlic', 5], ['paprika', 1], ['pepper', 0.3], ['salt', 0.5]]),
    steps: ['Cook 110 g dry rice using its package directions. Simmer 30 g rinsed dry lentils separately in about 150 mL water for 12–18 minutes until tender.', 'Dice 40 g onion and mince 5 g garlic. Heat 10 g oil in a pan; soften the onion for 4 minutes, then stir in garlic and 1 g paprika for 30 seconds.', 'Add 100 g chicken cut into even pieces, 0.3 g pepper and 0.5 g salt. Cook about 10–14 minutes until chicken reaches 74°C in the thickest pieces. Add a splash of water if the spices catch.', 'Cook the frozen vegetables as directed. Combine the components and finish with 20 g lemon juice and the remaining 5 g oil.'],
    note: `${ricePortion} About half a medium lemon may supply 20 g juice; weigh the juice. ${riceSafety}`,
  },
  {
    id: 'cumin-chicken-lentils', name: 'Cumin chicken with golden lentil rice', category: 'Main meal', minutes: 35,
    equipment: ['Two saucepans', 'Frying pan', 'Food thermometer'],
    ingredients: ingredients([['chicken', 100], ['rice', 110], ['lentils', 40], ['vegetables', 175], ['oliveOil', 20], ['onion', 50], ['garlic', 5], ['cumin', 1.5], ['turmeric', 0.5], ['lemon', 15], ['salt', 0.5]]),
    steps: ['Cook 110 g dry rice using the package directions. Rinse 40 g dry red lentils.', 'Soften 50 g diced onion in 10 g oil in a small saucepan for 4–5 minutes. Stir in 5 g minced garlic, 1.5 g cumin and 0.5 g turmeric for 30 seconds. Add lentils and about 200 mL water; simmer 12–18 minutes until tender and thick, adding small splashes of water as needed.', 'Cook 100 g diced chicken in the remaining 10 g oil in a separate pan, with 0.5 g salt, until the thickest pieces reach 74°C. Cook the frozen vegetables as directed on the bag.', 'Serve chicken and vegetables over rice and the thick lentils. Finish with 15 g lemon juice; scrape all measured oil into the serving.'],
    note: `${ricePortion} Use single spices, not a premixed curry powder or stock. ${riceSafety}`,
  },
  {
    id: 'egg-fried-rice', name: 'Egg and vegetable fried rice', category: 'Main meal', minutes: 35,
    equipment: ['Two saucepans', 'Large nonstick pan', 'Food thermometer'],
    ingredients: ingredients([['rice', 100], ['lentils', 30], ['egg', 2], ['vegetables', 175], ['oliveOil', 15], ['onion', 50], ['garlic', 5], ['paprika', 1], ['pepper', 0.3], ['salt', 0.5]]),
    steps: ['Cook 100 g dry rice according to its package and 30 g dry red lentils separately in about 150 mL water until tender. Drain excess water; use freshly cooked rice straight away for this version.', 'Heat 10 g oil in a large pan. Soften 50 g diced onion for 4 minutes, then add 5 g minced garlic, 1 g paprika, 0.3 g pepper and 175 g frozen vegetables. Cook until the vegetables meet their package cooking instructions.', 'Push vegetables aside, add the remaining 5 g oil and scramble 2 eggs until firm with no runny egg. Fold in rice, lentils and 0.5 g salt, and heat the entire dish to 74°C.', 'Eat the whole pan as one meal. If using safe refrigerated or thawed rice instead, this pan step is its one reheat; eat it immediately and discard the remaining reheated portion.'],
    note: `No soy sauce or packaged seasoning needed. ${ricePortion} Prep takes about 15 minutes if using safely stored cooked components. ${riceSafety}`,
  },
  {
    id: 'potato-chicken-tray', name: 'Paprika chicken and potato tray', category: 'Main meal', minutes: 45,
    equipment: ['Oven', 'Baking tray', 'Saucepan', 'Food thermometer'],
    ingredients: ingredients([['potato', 400], ['chicken', 100], ['lentils', 30], ['vegetables', 175], ['oliveOil', 20], ['onion', 60], ['garlic', 5], ['paprika', 2], ['lemon', 20], ['pepper', 0.3], ['salt', 0.5]]),
    steps: ['Heat oven to 220°C. Cut 400 g washed potato into 2 cm cubes and 60 g onion into wedges. Toss with 10 g oil, half the paprika, pepper and salt; spread on a tray and roast for 15 minutes.', 'Coat 100 g raw chicken in the remaining 10 g oil, paprika and 5 g minced garlic. Add to the tray with the frozen vegetables; roast about 20–25 minutes more, turning potatoes once. Follow any longer cooking instruction on the vegetable package.', 'Verify the thickest chicken pieces reach 74°C and the potatoes are tender; timing depends on thickness and oven. Meanwhile simmer 30 g dry lentils in about 150 mL water until tender.', 'Serve the whole tray with lentils and 20 g lemon juice. For multiple portions, multiply every ingredient and leave space on the trays so food roasts evenly.'],
    note: `One full meal. Potatoes are the optional extra grocery and are weighed raw, not as cooked fries. This is a more filling swap than the rice bowls; review the changed day total. ${leftoverSafety}`,
  },
  {
    id: 'yogurt-raisin-bowl', name: 'Peanut butter yogurt and raisin bowl', category: 'Snack', minutes: 3,
    equipment: ['Bowl', 'Kitchen scale'],
    ingredients: ingredients([['yogurt', 150], ['raisins', 30], ['peanutButter', 15]]),
    steps: ['Stir 15 g peanut butter into 150 g plain high-protein Greek yogurt until evenly mixed.', 'Top with 30 g raisins. Eat the whole bowl as one snack; add a teaspoon or two of water if you prefer a softer texture.'],
    note: 'One snack. Refrigerate at 4°C or colder and use within 24 hours of mixing. For work, transport with an ice pack. Uses existing groceries.',
  },
  {
    id: 'compact-shake', name: 'Milk and peanut butter breakfast shake', category: 'Breakfast', minutes: 5,
    equipment: ['Blender', 'Kitchen scale', 'Measuring jug'],
    ingredients: ingredients([['oats', 40], ['peanutButter', 40], ['banana', 120], ['milk', 150], ['whey', 1], ['honey', 20]]),
    steps: ['Blend 40 g dry oats into a finer texture. Add 150 mL milk, 40 g peanut butter, 120 g peeled banana, 1 label-sized scoop of whey and 20 g honey.', 'Blend until smooth. Add only as much cold water as you need for a drinkable texture; the listed milk stays at 150 mL.', 'Drink the whole shake as one breakfast. If easier, split into two small cups within your breakfast window and keep the second chilled.'],
    note: 'A higher-energy breakfast with fewer oats than the original shake; comfort is personal. Keep at 4°C or colder and use within 24 hours. This replaces breakfast; it is not added on top of the original shake.',
  },
  {
    id: 'tomato-chicken-rice', name: 'Tomato paprika chicken rice', category: 'Main meal', minutes: 35,
    equipment: ['Two saucepans', 'Frying pan', 'Food thermometer'],
    ingredients: ingredients([['chicken', 125], ['rice', 120], ['lentils', 30], ['vegetables', 175], ['oliveOil', 15], ['tomatoes', 100], ['onion', 50], ['garlic', 5], ['paprika', 1], ['pepper', 0.3], ['salt', 0.5]]),
    steps: ['Cook 120 g dry rice using its package water ratio. Separately simmer 30 g rinsed dry lentils in about 150 mL water for 12–18 minutes until tender; drain excess water.', 'Heat 10 g oil in a pan and soften 50 g diced onion for 4 minutes. Add 5 g minced garlic and 1 g paprika for 30 seconds, then add 125 g raw chicken cut into even pieces. Brown for about 5 minutes.', 'Add 100 g canned tomatoes with their juice, 0.3 g pepper and 0.5 g salt. Simmer for about 8–12 minutes, adding a little water if dry, until the thickest chicken pieces reach 74°C.', 'Cook 175 g frozen vegetables according to the package. Serve with rice, lentils and the tomato chicken; stir the remaining 5 g oil through the vegetables and scrape the measured pan oil into the meal.'],
    note: `${ricePortion} Use plain canned tomatoes, not a prepared sauce. ${riceSafety}`,
  },
  {
    id: 'chicken-potato-yogurt', name: 'Lemon chicken, roast potatoes and yogurt sauce', category: 'Main meal', minutes: 45,
    equipment: ['Oven', 'Baking tray', 'Saucepan', 'Food thermometer'],
    ingredients: ingredients([['potato', 400], ['chicken', 125], ['lentils', 40], ['vegetables', 175], ['oliveOil', 17], ['yogurt', 50], ['onion', 50], ['lemon', 20], ['garlic', 5], ['paprika', 2], ['cumin', 1], ['pepper', 0.3], ['salt', 0.5]]),
    steps: ['Heat the oven to 220°C. Cut 400 g washed potato into 2 cm cubes and 50 g onion into wedges. Toss with 10 g oil, 1 g paprika and half the salt; roast for 15 minutes.', 'Coat 125 g raw chicken with the remaining 7 g oil, 1 g paprika, 1 g cumin, pepper and remaining salt. Add chicken and 175 g frozen vegetables to the tray. Roast about 20–25 minutes more, turning the potatoes once; follow any longer vegetable package cooking instruction.', 'Check that the thickest chicken pieces reach 74°C and the potatoes are tender. Meanwhile simmer 40 g dry lentils in about 200 mL water until soft, draining if needed.', 'Mix 50 g yogurt with 20 g lemon juice and 5 g finely minced garlic in a clean bowl. Serve the cooked tray and lentils with the cold sauce, keeping sauce away from raw chicken utensils.'],
    note: `One full dinner; 400 g potato is weighed raw. Multiply every ingredient for extra meals, then divide the finished tray and lentils evenly. Keep yogurt sauce separate and add after reheating. ${leftoverSafety}`,
  },
  {
    id: 'chicken-pitas', name: 'Paprika chicken pitas with lemon yogurt', category: 'Main meal', minutes: 25,
    equipment: ['Frying pan', 'Saucepan or microwave-safe bowl', 'Food thermometer'],
    ingredients: ingredients([['pita', 120], ['chicken', 100], ['vegetables', 175], ['yogurt', 75], ['oliveOil', 22], ['onion', 40], ['lemon', 20], ['garlic', 5], ['paprika', 1], ['cumin', 1], ['pepper', 0.3], ['salt', 0.5]]),
    steps: ['Slice 100 g raw chicken into even strips and 40 g onion thinly. Coat with 12 g oil, 1 g paprika, 1 g cumin, pepper and salt. Pan-cook over medium heat for about 10–14 minutes, turning until the thickest chicken pieces reach 74°C.', 'Cook 175 g frozen vegetables following their package instructions. Toss with the remaining 10 g oil. Mix 75 g yogurt, 20 g lemon juice and 5 g minced garlic in a separate clean bowl.', 'Warm 120 g pita bread in a dry pan or according to the pack. This is often two small pitas, but weigh them because brands differ.', 'Fill the pitas with the chicken, onion and some vegetables, then spoon in the yogurt sauce. Eat the remaining vegetables alongside; the full bread and filling make one meal.'],
    note: `One meal inspired by lemon-yogurt chicken wraps. Keep sauce separate from raw chicken and from warm leftovers. If packing ahead, refrigerate filling and sauce separately, and assemble after reheating. ${leftoverSafety}`,
  },
  {
    id: 'tomato-egg-lentils', name: 'Tomato egg and lentil skillet with pita', category: 'Main meal', minutes: 30,
    equipment: ['Saucepan', 'Lidded frying pan', 'Food thermometer'],
    ingredients: ingredients([['pita', 100], ['egg', 2], ['lentils', 30], ['vegetables', 175], ['tomatoes', 150], ['oliveOil', 9], ['onion', 50], ['garlic', 5], ['paprika', 1], ['cumin', 1], ['pepper', 0.3], ['salt', 0.5]]),
    steps: ['Rinse 30 g dry lentils and simmer in about 150 mL water for 12–18 minutes until tender. Drain excess water.', 'Meanwhile soften 50 g diced onion in 9 g oil for 4–5 minutes. Stir in 5 g minced garlic, 1 g paprika, 1 g cumin, pepper and salt for 30 seconds. Add 150 g canned tomatoes with juice and the cooked lentils.', 'Cook 175 g frozen vegetables according to the package, then add them to the tomato pan. Make two wells and crack in 2 eggs. Cover and gently cook until whites and yolks are firm and the egg dish reaches 74°C; allow about 8–12 minutes and check the centre.', 'Warm 100 g pita bread and serve with the whole skillet as one meal, using the bread to scoop up the thick tomato sauce.'],
    note: `One meal. Use fully cooked eggs for this prep plan. The recipe contains no rice. ${leftoverSafety}`,
  },
  {
    id: 'yogurt-work-bowl', name: 'Yogurt, peanut butter and raisins with milk', category: 'Snack', minutes: 3,
    equipment: ['Bowl', 'Kitchen scale', 'Measuring jug', 'Insulated lunch bag with ice pack'],
    ingredients: ingredients([['yogurt', 200], ['peanutButter', 15], ['raisins', 30], ['milk', 250]]),
    steps: ['Stir 15 g peanut butter into 200 g plain high-protein Greek yogurt, then top with 30 g raisins.', 'Pour 250 mL milk. Eat the entire bowl and drink the milk as one substantial work snack.', 'If making ahead, seal the bowl and refrigerate at 4°C or colder. Pack the bowl and milk with an ice pack.'],
    note: 'One snack; use within 24 hours of mixing. Peanut butter is weighed and mixed through the bowl. Follow any shorter package instructions.',
  },
  {
    id: 'banana-night-dairy', name: 'Banana yogurt bowl with milk', category: 'Snack', minutes: 3,
    equipment: ['Bowl', 'Kitchen scale', 'Measuring jug'],
    ingredients: ingredients([['yogurt', 325], ['banana', 120], ['milk', 250]]),
    steps: ['Weigh 325 g plain high-protein Greek yogurt into a bowl. Slice 120 g peeled banana over it.', 'Pour 250 mL milk. Eat the whole yogurt and banana bowl and drink the milk as one night meal; stir some milk into the yogurt if preferred.'],
    note: 'One larger night meal. Keep dairy at 4°C or colder, follow package opening instructions and add banana just before eating. Its nutrition depends on the yogurt label; this estimate assumes the cited Oikos plain product.',
  },
  {
    id: 'peanut-raisin-snack', name: 'Peanut butter, honey and raisin snack', category: 'Snack', minutes: 2,
    equipment: ['Small lidded container', 'Kitchen scale', 'Spoon'],
    ingredients: ingredients([['peanutButter', 10], ['honey', 15], ['raisins', 20]]),
    steps: ['Stir 10 g peanut butter and 15 g honey in a small container, then fold in 20 g raisins.', 'Eat the whole portion with a spoon as the pre-workout snack. A little water can loosen the mixture if preferred.'],
    note: 'One small snack using pantry ingredients. Follow the peanut butter jar storage instructions and use a clean covered container. This replaces the egg snack on the pancakes-and-skillet day.',
  },
];

const times = ['05:50 Breakfast', '09:15 Work snack', '12:30 Lunch', '16:15 Pre-workout', '19:30 Dinner', '21:30 Night dairy'];
const meals = ids => ids.map((recipe, index) => ({ label: times[index], recipe }));
export const MEAL_PLANS = [
  { id: 'build', name: 'Build day: tomato chicken and roast potatoes', description: 'The original breakfast shake, tomato chicken rice lunch and a roast potato dinner with yogurt sauce. A larger banana dairy meal supplies more protein and carbohydrate at night.', meals: meals(['breakfast-shake', 'work-snack', 'tomato-chicken-rice', 'pre-workout', 'chicken-potato-yogurt', 'banana-night-dairy']) },
  { id: 'spice-build', name: 'Build day: overnight oats and chicken pitas', description: 'Overnight oats, a yogurt work bowl, tomato chicken rice and warm chicken pitas with lemon yogurt. Uses measured oil and the same everyday protein foods.', meals: meals(['overnight-oats', 'yogurt-work-bowl', 'tomato-chicken-rice', 'pre-workout', 'chicken-pitas', 'banana-night-dairy']) },
  { id: 'busy-build', name: 'Build day: pancakes and tomato egg skillet', description: 'Protein pancakes, a yogurt work bowl, tomato chicken rice and a two-egg lentil skillet with pita. A peanut-raisin snack keeps the day to four eggs. Prep pancakes ahead and freeze extra portions; follow the rice storage limit.', meals: meals(['banana-oat-pancakes', 'yogurt-work-bowl', 'tomato-chicken-rice', 'peanut-raisin-snack', 'tomato-egg-lentils', 'banana-night-dairy']) },
  { id: 'original', name: 'Original six-meal day', description: 'Your original six eating points and exact portions. The estimate is recalculated from the ingredient catalogue; it is not forced to the old 3,300 kcal headline.', meals: meals(['breakfast-shake', 'work-snack', 'box-a', 'pre-workout', 'box-b', 'night-dairy']) },
  { id: 'spice-rotation', name: 'Lemon and cumin rotation', description: 'Overnight oats, lemon garlic lunch and a cumin lentil dinner; the same core shopping basket.', meals: meals(['overnight-oats', 'work-snack', 'lemon-chicken-rice', 'pre-workout', 'cumin-chicken-lentils', 'night-dairy']) },
  { id: 'busy-day', name: 'Busy day with prepared portions', description: 'Make pancakes and Box A ahead; cook the egg rice dinner using safely stored components. Prepare the next day only or freeze extra portions.', meals: meals(['banana-oat-pancakes', 'work-snack', 'box-a', 'pre-workout', 'egg-fried-rice', 'night-dairy']) },
  { id: 'lower-appetite', name: 'Lower-appetite breakfast rotation', description: 'Use a milk and peanut butter shake plus a compact yogurt snack, with the familiar rice boxes. Main meal volumes are unchanged; try it and note your comfort.', meals: meals(['compact-shake', 'yogurt-raisin-bowl', 'box-a', 'pre-workout', 'box-b', 'night-dairy']) },
];

const nutrients = ['kcal', 'protein', 'carbs', 'fat', 'fibre'];
const zeroNutrition = () => ({ kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 });
function nonnegative(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new TypeError(`${name} must be a finite nonnegative number.`);
  return value;
}
function lookup(list, id, kind) {
  const result = list.find(item => item.id === id);
  if (!result) throw new RangeError(`Unknown ${kind}: ${String(id)}`);
  return result;
}
function wheyValues(override) {
  if (override === undefined) return FOODS.whey;
  if (!override || typeof override !== 'object' || Array.isArray(override)) throw new TypeError('Whey label must contain kcal, protein, carbs and fat per scoop.');
  const result = { fibre: 0 };
  for (const key of ['kcal', 'protein', 'carbs', 'fat']) result[key] = nonnegative(override[key], `Whey ${key}`);
  return result;
}

// Return unrounded estimates so callers can round once at the final display.
export const ACTIVE_RECIPES = RECIPES.filter(recipe => !recipe.archived);
export const ACTIVE_MEAL_PLANS = MEAL_PLANS.filter(plan => plan.meals.every(meal => ACTIVE_RECIPES.some(recipe => recipe.id === meal.recipe)));

export function recipeNutrition(recipeId, wheyOverride) {
  const recipe = lookup(RECIPES, recipeId, 'recipe');
  const whey = wheyValues(wheyOverride);
  const total = zeroNutrition();
  for (const item of recipe.ingredients) {
    const entry = FOODS[item.food];
    const values = item.food === 'whey' ? whey : entry;
    for (const key of nutrients) total[key] += values[key] * item.amount / entry.per;
  }
  return total;
}

export function dayNutrition(planId, wheyOverride) {
  const plan = lookup(MEAL_PLANS, planId, 'meal plan');
  const total = zeroNutrition();
  for (const meal of plan.meals) {
    const value = recipeNutrition(meal.recipe, wheyOverride);
    for (const key of nutrients) total[key] += value[key];
  }
  return total;
}

export function recipeGroceryTotals(recipeIds) {
  if (!Array.isArray(recipeIds)) throw new TypeError('Recipe ids must be an array.');
  const totals = new Map();
  for (const id of recipeIds) {
    for (const { food, amount } of lookup(RECIPES, id, 'recipe').ingredients) totals.set(food, (totals.get(food) ?? 0) + amount);
  }
  return [...totals].map(([food, amount]) => ({ food, amount }));
}

export function groceryTotals(planIds) {
  if (!Array.isArray(planIds)) throw new TypeError('Meal plan ids must be an array.');
  return recipeGroceryTotals(planIds.flatMap(id => lookup(MEAL_PLANS, id, 'meal plan').meals.map(meal => meal.recipe)));
}

// Both values must already share the same food unit; no pack-size conversion.
export function quantityToBuy(required, onHand) {
  return Math.max(0, nonnegative(required, 'Required quantity') - nonnegative(onHand, 'Stock quantity'));
}
