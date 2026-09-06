import { FOODS, RECIPES } from './food-data.js';

export const FOOD_SAFETY_SOURCES = [
  ['Health Canada · safe cooking temperatures', 'https://www.canada.ca/en/health-canada/services/general-food-safety-tips/safe-internal-cooking-temperatures.html'],
  ['Health Canada · storing leftovers', 'https://www.canada.ca/en/health-canada/services/general-food-safety-tips/food-safety-tips-leftovers.html'],
  ['UK Food Standards Agency · rice safety', 'https://www.food.gov.uk/safety-hygiene/home-food-fact-checker'],
];
const cold = [
  ['Keep chilled', 'Seal and refrigerate at 4°C or colder. Use mixed bowls and shakes within 24 hours, or sooner if a package requires it. Add banana just before eating for a better texture.'],
  ['Take it with you', 'Use an insulated bag with an ice pack. Keep dairy and eggs cold until eating; discard perishable food left at room temperature for more than 2 hours.'],
];
const leftovers = [
  ['Cool & label', 'Divide into shallow containers and refrigerate promptly, within 2 hours, at 4°C or colder. Label the cooking date. For this plan, eat refrigerated cooked portions within 2–3 days; freeze extra portions promptly.'],
  ['Thaw & reheat', 'Thaw in the fridge. Reheat only the portion you will eat to 74°C throughout, stirring and checking several spots. Discard reheated leftovers. Keep yogurt sauce separate and add cold after reheating.'],
];
const riceStorage = [
  ['Cool quickly', 'Divide into shallow portions. Cool rice as quickly as possible, ideally within 1 hour, and refrigerate at 4°C or colder. Keep only the next day’s portion in the fridge; use it within 24 hours. Freeze later portions the same day.'],
  ['Reheat once', 'Thaw in the fridge. Reheat once to 74°C throughout and eat straight away. Stir and check several spots. Discard the remaining reheated portion. If your fried rice used previously cooked rice, the pan step was its one reheat.'],
];
const S = (title, text, cue = '', technique = '') => ({title, text, cue, technique});
const rice = S('Start the rice', 'Rinse {rice} dry rice. Add the water quantity specified on your rice package and cook with the lid on for its stated time. Rest as directed, then fluff. Use freshly cooked rice straight away.', 'Gentle simmer, covered pot. Do not guess the water ratio.', 'rice');
const lentils = S('Simmer the lentils', 'Rinse {lentils} dry red lentils. Cover generously with water in a separate saucepan. Simmer gently for 12–18 minutes, stirring occasionally and adding water if needed. Drain excess water when tender.', 'The lentils should be soft, with no chalky centre.');
const veg = S('Cook the vegetables', 'Cook {vegetables} frozen vegetables using their package directions, including any minimum cooking time. Drain excess water.', 'Frozen vegetables need cooking; warming them briefly is not enough.');
const checkChicken = S('Check the chicken', 'Probe the centre of the thickest chicken pieces with a clean food thermometer; check more than one piece. All must reach 74°C. Keep cooking and recheck if needed. Wash the probe after use.', 'Colour and time alone cannot confirm doneness.', 'probe');
const portion = S('Plate or portion', 'Divide each cooked component equally between the selected number of servings. Include the measured cooking oil and pan juices. Serve now, or follow the cooling instructions below.', 'Cooked weights vary; divide the finished food evenly.', 'store');
const G = (summary, prep, cook, steps, storage = cold, wait = '') => ({summary, prep, cook, wait, steps, storage});
const guides = {
  'breakfast-shake': G('A quick oat, banana and peanut butter breakfast you can drink.', 5, 0, [
    S('Grind the oats', 'Pulse {oats} dry oats in a blender until finer, stopping to scrape down as needed.'),
    S('Add the rest', 'Add {peanutButter} peanut butter, {banana} peeled banana, {honey} honey and {whey} whey. Start with a little cold water; add more to reach a drinkable texture. Use your tub’s scoop size.'),
    S('Blend & pour', 'Blend until smooth. Work in batches if the jug would exceed its maximum fill line. Divide equally between your selected servings. Water and ice add no nutrition.', 'Drink promptly or refrigerate right away.'),
  ]),
  'compact-shake': G('A milk-based shake with a little less oat volume and more peanut butter.', 5, 0, [
    S('Make the base', 'Pulse {oats} dry oats until fine. Add {milk} milk, {peanutButter} peanut butter and {banana} peeled banana.'),
    S('Blend smooth', 'Add {whey} whey and {honey} honey. Blend, then add cold water a little at a time if needed. Keep the measured milk amount unchanged. Do not exceed the blender’s fill line.'),
    S('Divide & drink', 'Divide equally between the selected servings. Drink now or seal and refrigerate promptly.'),
  ]),
  'work-snack': G('Firm boiled eggs, cold milk and a small portion of raisins.', 3, 12, [
    S('Cook the eggs', 'Place {egg} eggs in a saucepan in a single layer and cover with cold water. Bring to a boil, then lower to a gentle simmer for about 10–12 minutes.', 'Both white and yolk should be firm.'),
    S('Cool promptly', 'Cool under cold running water, then refrigerate promptly. Use a clean covered container. For this plan, use cooked eggs within 2–3 days.'),
    S('Pack the snack', 'Divide the eggs, {milk} milk and {raisins} raisins equally between your selected servings. Keep raisins dry and separate; pack eggs and milk with an ice pack.'),
  ]),
  'pre-workout': G('A small egg snack with raisins and a measured portion of honey.', 3, 12, [
    S('Boil & cool', 'Cover {egg} eggs with cold water. Bring to a boil, then simmer gently for about 10–12 minutes until whites and yolks are firm. Cool under cold running water and refrigerate promptly.'),
    S('Pack separately', 'Divide the eggs, {raisins} raisins and {honey} honey equally between your selected servings. Keep honey in a separate small container. Eat it directly or stir into water.'),
  ], [['Cooked eggs', 'Refrigerate at 4°C or colder and use within 2–3 days for this plan. Keep chilled with an ice pack when travelling.'], cold[1]]),
  'night-dairy': G('A simple yogurt bowl with a glass of milk.', 2, 0, [
    S('Measure the dairy', 'Weigh {yogurt} yogurt and measure {milk} milk. Divide equally between your selected servings.'),
    S('Serve your way', 'Eat the yogurt and drink the milk alongside, or stir them together for a thinner bowl. Follow the earliest package storage instruction.'),
  ]),
  'overnight-oats': G('Creamy make-ahead oats. Add fresh banana when you are ready to eat.', 5, 0, [
    S('Mix the base', 'Stir {oats} dry oats, {milk} milk, {yogurt} yogurt, {peanutButter} peanut butter and {honey} honey until evenly combined. Add a little water if hard to stir.'),
    S('Portion & chill', 'Divide into the selected number of lidded jars. Refrigerate at 4°C or colder for at least 4 hours or overnight.', 'The oats soften as they absorb liquid.'),
    S('Finish with banana', 'Slice {banana} peeled banana and divide over the jars just before eating. Use the oats within 24 hours of mixing.'),
  ], cold, '4 hours or overnight'),
  'banana-oat-pancakes': G('Small oat pancakes with a measured peanut butter and honey topping.', 7, 13, [
    S('Blend the batter', 'Pulse {oats} dry oats to flour. Add {egg} eggs, {milk} milk, {banana} peeled banana and {whey} whey. Blend smooth, then rest for 3 minutes.'),
    S('Cook small pancakes', 'Heat a good nonstick pan over medium-low heat. Spoon in small pancakes with room to turn. Cook about 2–3 minutes per side, turning when the edges set. Work in batches.', 'No pan oil is included. If you add oil, track it separately.', 'pan'),
    S('Check the centre', 'Cook until the centre is set with no wet batter and reaches 74°C. Lower the heat if the outside browns before the middle cooks. Time depends on pancake thickness.', 'Use a thin probe inserted from the side.', 'probe'),
    S('Mix the topping', 'Stir {peanutButter} peanut butter with {honey} honey and a small splash of water. Divide the pancakes and topping equally between your selected servings.'),
  ], leftovers),
  'lemon-chicken-rice': G('Lemon, garlic and paprika brighten a chicken, rice and lentil bowl.', 10, 25, [rice, lentils,
    S('Soften the aromatics', 'Dice {onion} onion and mince {garlic} garlic on a clean board before handling chicken. Measure {oliveOil} oil; use two-thirds to soften the onion over medium heat for 4 minutes. Stir in garlic and {paprika} paprika for 30 seconds.'),
    S('Cook the chicken', 'Cut {chicken} raw chicken into even pieces using separate utensils. Add to the pan with {pepper} pepper and {salt} salt. Cook about 10–14 minutes, turning. Add a splash of water if spices catch. For a batch, use a larger pan or cook in batches.', 'Wash hands and utensils after handling raw chicken.', 'pan'),checkChicken,veg,
    S('Finish with lemon', 'Add {lemon} lemon juice and the remaining one-third of the measured oil to the cooked components.'),portion,
  ], riceStorage),
  'cumin-chicken-lentils': G('Golden spiced lentils, simple pan chicken and a lemon finish.', 10, 25, [rice,
    S('Build the lentil base', 'Dice {onion} onion and mince {garlic} garlic before handling chicken. Measure {oliveOil} oil. In a saucepan, soften the onion in half the oil for 4–5 minutes. Stir in garlic, {cumin} cumin and {turmeric} turmeric for 30 seconds.'),
    S('Simmer until soft', 'Add {lentils} rinsed dry lentils and enough water to cover generously. Simmer gently for 12–18 minutes, adding water as needed, until tender and thick.', 'Stir occasionally so the bottom does not catch.'),
    S('Pan-cook the chicken', 'Cut {chicken} raw chicken into even pieces. Cook in a separate pan over medium heat in the remaining half of the measured oil, with {salt} salt. Turn occasionally; allow about 10–14 minutes. Cook larger batches with space between pieces.', 'Use separate utensils for raw chicken.', 'pan'),checkChicken,veg,
    S('Add the lemon', 'Finish the cooked chicken and lentils with {lemon} lemon juice.'),portion,
  ], riceStorage),
  'egg-fried-rice': G('Freshly cooked rice folded through vegetables, lentils and fully set egg.', 10, 25, [rice,lentils,
    S('Soften the vegetables', 'Dice {onion} onion and mince {garlic} garlic. Measure {oliveOil} oil. Heat two-thirds in a large nonstick pan over medium heat. Soften onion for 4 minutes; stir in garlic, {paprika} paprika and {pepper} pepper. Add {vegetables} vegetables and cook for their full package instructions.'),
    S('Scramble the eggs', 'Push vegetables to one side. Add the remaining one-third of the measured oil, then {egg} beaten eggs. Stir until the egg is firm with no runny areas.', 'Use a wide pan; cook in batches if crowded.', 'pan'),
    S('Fold & heat through', 'Fold in freshly cooked rice, lentils and {salt} salt. Stir until the whole dish reaches 74°C. If using safely stored cooked rice instead, this is its one reheat: eat immediately and discard any reheated remainder.', 'Check several spots after stirring.', 'probe'),portion,
  ], riceStorage),
  'tomato-chicken-rice': G('Tender chicken in a simple tomato-paprika sauce, with rice and lentils.', 10, 25, [rice,lentils,
    S('Start the sauce', 'Dice {onion} onion and mince {garlic} garlic before handling chicken. Measure {oliveOil} oil; heat two-thirds in a pan over medium heat. Soften onion for 4 minutes. Add garlic and {paprika} paprika for 30 seconds.'),
    S('Brown the chicken', 'Cut {chicken} raw chicken into even pieces with separate utensils. Add to the pan and turn for about 5 minutes. Use a larger pan or cook in batches so the pieces have space.', 'Browning is flavour, not proof of doneness.', 'pan'),
    S('Simmer the sauce', 'Add {tomatoes} canned tomatoes with juice, {pepper} pepper and {salt} salt. Simmer gently for about 8–12 minutes, adding a splash of water if the sauce dries out.'),checkChicken,veg,
    S('Finish the vegetables', 'Stir the remaining one-third of the measured oil through the cooked vegetables.'),portion,
  ], riceStorage),
  'potato-chicken-tray': G('A paprika chicken tray with crisp-edged potatoes and lentils on the side.', 10, 35, [
    S('Start the potatoes', 'Heat the oven to 220°C. Cut {potato} potatoes into 2 cm cubes and {onion} onion into wedges. Measure {oliveOil} oil and {paprika} paprika. Toss potatoes and onion with half of each, {pepper} pepper and {salt} salt. Spread on a tray and roast for 15 minutes.', 'Leave space between pieces. Use extra trays for a batch.', 'pan'),
    S('Add the chicken', 'Using separate raw-meat utensils, coat {chicken} chicken with the remaining oil and paprika and {garlic} minced garlic. Add chicken and {vegetables} frozen vegetables to the tray. Roast about 20–25 minutes more, turning potatoes once. Follow any longer vegetable package instruction.'),lentils,checkChicken,
    S('Check & finish', 'Check the potatoes with a fork: the centres should be soft. Any food or juices that touched raw chicken must be fully cooked. Finish with {lemon} lemon juice.'),portion,
  ], leftovers),
  'chicken-potato-yogurt': G('Roast chicken and potatoes with a cool lemon-garlic yogurt sauce.', 10, 35, [
    S('Roast the potatoes first', 'Heat the oven to 220°C. Cut {potato} potatoes into 2 cm cubes and {onion} onion into wedges. Measure {oliveOil} oil, {paprika} paprika and {salt} salt. Use about three-fifths of the oil and half the paprika and salt on the potatoes and onion. Spread on a tray and roast for 15 minutes.', 'Leave room on the tray; use more trays for a batch.', 'pan'),
    S('Add seasoned chicken', 'Using separate raw-meat utensils, coat {chicken} chicken with the remaining measured oil, paprika and salt, plus {cumin} cumin and {pepper} pepper. Add chicken and {vegetables} frozen vegetables to the tray. Roast about 20–25 minutes more, turning potatoes once. Follow any longer vegetable package instruction.'),lentils,checkChicken,
    S('Make the cold sauce', 'In a clean bowl with clean utensils, stir {yogurt} yogurt, {lemon} lemon juice and {garlic} finely minced garlic. Keep away from raw chicken and refrigerate until serving.'),
    S('Serve with sauce', 'Check potatoes are tender. Divide the tray, lentils and sauce equally between the selected servings. Add sauce after cooking; store it separately for future portions.', 'Keep all the measured oil in the finished meal.', 'store'),
  ], leftovers),
  'chicken-pitas': G('Warm paprika chicken and vegetables tucked into pita with lemon yogurt.', 10, 15, [
    S('Make the sauce first', 'In a clean bowl, mix {yogurt} yogurt, {lemon} lemon juice and {garlic} minced garlic. Cover and refrigerate. Slice {onion} onion before handling raw chicken.'),
    S('Cook the filling', 'Cut {chicken} raw chicken into even strips. Measure {oliveOil} oil; use a little over half to coat the chicken and onion with {paprika} paprika, {cumin} cumin, {pepper} pepper and {salt} salt. Pan-cook over medium heat for about 10–14 minutes, turning. Work in batches if needed.', 'Use separate raw-meat utensils.', 'pan'),checkChicken,veg,
    S('Warm & fill', 'Toss cooked vegetables with all the remaining measured oil. Warm {pita} pita in a dry pan or as directed on its pack. Divide bread, chicken, vegetables and sauce equally between selected servings. Fill just before eating; serve extra vegetables alongside.'),
  ], leftovers),
  'tomato-egg-lentils': G('A thick tomato-lentil skillet with fully cooked eggs and warm pita.', 10, 20, [lentils,
    S('Build the tomato base', 'Soften {onion} diced onion in {oliveOil} oil over medium heat for 4–5 minutes. Add {garlic} minced garlic, {paprika} paprika, {cumin} cumin, {pepper} pepper and {salt} salt for 30 seconds. Stir in {tomatoes} canned tomatoes and the cooked lentils.'),veg,
    S('Add the eggs', 'Stir the cooked vegetables into the sauce. Make one well per egg and crack in {egg} eggs. Cover and cook gently for about 8–12 minutes. Use more pans for a large batch so the eggs fit in a single layer.', 'Keep a little moisture in the sauce so it does not burn.', 'pan'),
    S('Check & serve', 'Cook until whites and yolks are firm and the egg dish reaches 74°C. Warm {pita} pita and divide bread and skillet equally between your selected servings.', 'Probe the centre of the egg dish.', 'probe'),
  ], leftovers),
  'yogurt-raisin-bowl': G('Peanut butter stirred through creamy yogurt with a raisin topping.', 3, 0, [
    S('Stir smooth', 'Mix {peanutButter} peanut butter into {yogurt} yogurt. Add a small splash of water if you prefer a softer texture.'),
    S('Top & portion', 'Fold in or scatter over {raisins} raisins. Divide equally between your selected servings. Cover and chill if making ahead.'),
  ]),
  'yogurt-work-bowl': G('A substantial yogurt snack, with raisins and a glass of milk.', 3, 0, [
    S('Mix the bowl', 'Stir {peanutButter} peanut butter into {yogurt} yogurt and top with {raisins} raisins.'),
    S('Pour & pack', 'Measure {milk} milk. Divide the bowl and milk equally between your selected servings. Seal and refrigerate; carry both with an ice pack.'),
  ]),
  'banana-night-dairy': G('A generous banana yogurt bowl with cold milk alongside.', 3, 0, [
    S('Make the bowl', 'Weigh {yogurt} yogurt. Slice {banana} peeled banana and add just before serving.'),
    S('Add the milk', 'Measure {milk} milk. Divide the bowl and milk equally between selected servings. Drink the milk alongside or stir some into the yogurt.'),
  ]),
  'peanut-raisin-snack': G('A small, sweet pantry snack with no cooking needed.', 2, 0, [
    S('Stir together', 'Mix {peanutButter} peanut butter and {honey} honey in a clean container.'),
    S('Fold & portion', 'Fold in {raisins} raisins. Divide equally between the selected servings. Eat with a spoon; a little water can loosen the mixture.'),
  ], [['Keep covered', 'Use a clean, lidded container and follow the peanut butter jar’s storage instructions.'], ['Make ahead', 'For the best texture, mix near the time you will eat. Keep added water to a small amount.']]),
};

export function getRecipeGuide(id) {
  const recipe = RECIPES.find(r=>r.id===id);
  if (!recipe) throw new Error('Unknown recipe.');
  return guides[id] ?? G('Archived recipe retained for your saved menus.', 0, recipe.minutes, recipe.steps.map((text,index)=>S(`Step ${index+1}`,text)), [['Original storage note',recipe.note], ['Archive','Choose a current recipe from the recipe book for a new meal.']]);
}

export function ingredientQuantity(item, servings = 1) {
  const food = FOODS[item.food];
  const amount = Number((item.amount * servings).toFixed(2));
  return `${amount} ${food.unit === 'count' ? '' : food.unit === 'scoop' && amount !== 1 ? 'scoops' : food.unit}`.trim();
}

export function stepText(id, step, servings = 1) {
  const recipe = RECIPES.find(r=>r.id===id);
  return step.text.replace(/\{([a-zA-Z]+)\}/g, (_, food) => {
    const item = recipe.ingredients.find(item=>item.food===food);
    if (!item) throw new Error(`Unknown ingredient ${food} in ${id}.`);
    return ingredientQuantity(item, servings);
  });
}
