import { el } from './meal-utils.js';

// Serving inspiration, never used as an ingredient or portion reference.
export function mealPhoto(recipe, className='') {
  const id=recipe.id;
  const snack = recipe.category !== 'Main meal' && /snack|pre-workout|dairy|yogurt|oats|pancake/.test(id);
  const tile = snack ? id==='work-snack'?0:id==='pre-workout'?1:/dairy|yogurt/.test(id)?2:/oats/.test(id)?3:/pancake/.test(id)?4:5 : /shake/.test(id)?0:/potato/.test(id)?4:/pita/.test(id)?5:2;
  const node=el('div',undefined,`food-photo ${className}`);
  node.setAttribute('aria-hidden','true');
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),image=document.createElementNS(ns,'image');
  svg.setAttribute('viewBox',`${tile%3*512} ${Math.floor(tile/3)*512} 512 512`);svg.setAttribute('preserveAspectRatio','xMidYMid slice');
  image.setAttribute('href',`assets/images/${snack?'snack':'meal'}-editorial.jpg`);image.setAttribute('width','1536');image.setAttribute('height','1024');svg.append(image);node.append(svg);
  return node;
}
