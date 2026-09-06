import { EXERCISES } from './training-data.js';
import { RECIPES } from './food-data.js';
import { el } from './meal-utils.js';
import { EXERCISE_VISUALS } from './exercise-visuals.js';
import { initUpdates } from './updates.js';

const route = location.pathname.split('/').pop() || 'index.html';
const guides = {
  'index.html': ['Make today simple.', 'Pick one thing to do now. Everything else can wait.', [['Train', 'Choose your session and log one set at a time.', 'training.html'], ['Eat', 'Open a recipe, cook it, then check off your meal.', 'meals.html'], ['Check in', 'Record your morning weight and watch the trend.', 'tracker.html']]],
  'training.html': ['Your first set, explained.', 'Choose your workout. Warm up. Record only the sets you perform.', [['Load', 'Enter the weight. For dumbbells, usually one dumbbell; read the exercise note.'], ['Reps', 'Count the repetitions you actually completed.'], ['Reps in reserve', 'Estimate how many more clean reps you could have done.']]],
  'meals.html': ['A menu you can actually follow.', 'Select a day, choose its menu, then make it your own.', [['Choose', 'Browse complete-day plans to change all six meals.'], ['Cook', 'Open a recipe, check your ingredients and use Cook along.'], ['Check', 'Tick Eaten after eating. Swap changes the meal and your grocery list.']]],
  'shopping.html': ['From kitchen to cart.', 'Your seven menus already make the list. Start with your pantry.', [['Check the kitchen', 'Enter what you already have in the unit shown.'], ['Shop the difference', 'Buy is the remaining amount. Round up to your package size.'], ['Tick as you go', 'Use shopping mode to hide bought items. Your pantry stays manual.']]],
  'tracker.html': ['See a pattern, not a single number.', 'Log a little each day. Compare the weeks when you have enough entries.', [['Morning', 'Enter weight after the bathroom and before breakfast.'], ['Evening', 'Add your actual intake and how you felt.'], ['Review', 'Weekly averages and consistency guide your next decision.']]],
};
const guide = guides[route] || ['Find the part you need.', 'Use the chapter links to jump straight to an answer.', [['Training', 'Your sessions, exercise cues and a practice set.', 'training.html'], ['Food', 'Recipes, portions and step-by-step cooking.', 'meals.html'], ['Your day', 'Return to your next workout and meal.', 'index.html']]];

function action(text, run, className = 'button') {
  const b = el('button', text, className); b.type = 'button'; b.addEventListener('click', run); return b;
}
export function sheet(title, eyebrow = 'FORM & FUEL') {
  const d = el('dialog', undefined, 'guide-dialog');
  const head = el('div', undefined, 'sheet-header'), copy = el('div');
  const h = el('h2', title); h.id = 'dynamic-sheet-title'; h.tabIndex = -1;
  copy.append(el('span', eyebrow, 'eyebrow'), h);
  const close = action('×', () => d.close(), 'icon-button'); close.setAttribute('aria-label', 'Close guide');
  head.append(copy, close); const content = el('div', undefined, 'sheet-content');
  d.append(head, content); d.setAttribute('aria-labelledby', h.id);
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', e => { if (e.target === d) { const r=d.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close(); } });
  return { d, content, open() { document.body.append(d); d.showModal(); h.focus(); } };
}

function practiceSet(content) {
  const box=el('section',undefined,'practice-set');
  box.append(el('span','TRY IT · EXAMPLE ONLY','eyebrow'),el('h3','8 reps done. 2 left in the tank.'));
  const reps=el('div',undefined,'rep-demo');
  for(let i=0;i<10;i++)reps.append(el('span',String(i+1),i<8?'rep-done':'rep-reserve'));
  box.append(reps,el('p','The first eight are completed reps. The last two show your estimate of what was left. This is 2 RIR.','small'));
  const form=el('form',undefined,'practice-form');
  for(const [name,value] of [['Load · lb','25'],['Reps','8'],['RIR','2']]){const label=el('label',name);const input=el('input');input.type='number';input.value=value;input.min=name==='Reps'?'1':'0';input.max=name==='RIR'?'10':name==='Reps'?'100':'3000';input.required=true;input.setAttribute('aria-label',`Practice ${name}`);label.append(input);form.append(label);}
  const result=el('p',undefined,'status-line');result.setAttribute('role','status');
  const done=el('button','Try marking this set done');done.type='submit';
  form.append(done);form.addEventListener('submit',e=>{e.preventDefault();const values=[...form.querySelectorAll('input')].map(n=>n.value);result.textContent=`Example complete: ${values[0]} lb × ${values[1]} reps, ${values[2]} RIR. In your workout, also check Clean when technique stayed controlled. Nothing was added to your journal.`;});
  box.append(form,result);content.append(box);
}

export function openGuide() {
  const s=sheet(guide[0],'A LITTLE GUIDANCE');s.content.append(el('p',guide[1],'guide-intro'));
  const steps=el('div',undefined,'guide-steps');
  guide[2].forEach(([title,copy,href],i)=>{const step=el(href?'a':'article',undefined,'guide-step');if(href)step.href=href;step.append(el('span',String(i+1),'step-number'),el('h3',title),el('p',copy));steps.append(step);});
  s.content.append(steps);if(route==='training.html'||route==='index.html')practiceSet(s.content);s.open();
}

export function openExercise(id) {
  const ex=EXERCISES[id];if(!ex)return;
  const s=sheet(ex.name,ex.muscle.toUpperCase());
  const visual=EXERCISE_VISUALS[id];
  const demo=el('div',undefined,'movement-demo'),photos=el('div',undefined,'movement-photos');
  const frames=[0,1].map(i=>{const figure=el('figure');const img=el('img');img.src=`assets/images/exercises/${id}-${i}.jpg`;img.alt=`${visual.name}, position ${i+1}`;figure.append(img,el('figcaption',`Position ${i+1}`));photos.append(figure);return figure;});
  let playing=false,frame=0,interval;
  const play=action('Play positions',()=>{playing=!playing;clearInterval(interval);demo.classList.toggle('is-playing',playing);play.textContent=playing?'Pause positions':'Play positions';play.setAttribute('aria-pressed',String(playing));frames.forEach(f=>f.classList.remove('active'));if(playing){frames[frame].classList.add('active');interval=setInterval(()=>{frames[frame].classList.remove('active');frame=1-frame;frames[frame].classList.add('active');},1400);}},'button secondary');
  play.setAttribute('aria-pressed','false');s.d.addEventListener('close',()=>clearInterval(interval));
  demo.append(photos,play,el('p',`Two-position reference · ${visual.name}. This shows one variation, not every available machine or setup.`,'tiny'));
  s.content.append(demo,el('p',`${ex.repMin}–${ex.repMax} reps · ${ex.rest/60} min rest`,'macro-line'));
  const list=el('ol',undefined,'cue-list');ex.cues.split(/(?<=\.)\s+/).forEach(c=>list.append(el('li',c)));
  s.content.append(list,el('h3','What goes in the Load box?'),el('p',ex.loadNote,'callout'),el('h3','Available exercise choices'));
  const choices=el('div',undefined,'variant-pills');ex.variants.forEach(v=>choices.append(el('span',v.name,'tag')));s.content.append(choices);
  s.content.append(el('p','Use the same setup for comparable logs. These cues describe the main exercise; ask a qualified coach to check an unfamiliar variation.','small'));
  s.content.append(action('Show me how to log a set',()=>{s.d.close();const practice=sheet('A set, made simple.','LEARN BY DOING');practiceSet(practice.content);practice.open();},'button secondary'));
  const credit=el('a','Movement photos: Free Exercise DB','tiny');credit.href='https://github.com/yuhonas/free-exercise-db';s.content.append(credit);s.open();
}

function openSearch() {
  const s=sheet('What are you looking for?','FIND YOUR WAY');
  const label=el('label','Search pages, recipes or exercises'),input=el('input');input.type='search';input.placeholder='Try chicken, shoulders, backup…';label.append(input);
  const list=el('div',undefined,'search-results');list.setAttribute('aria-live','polite');
  const pages=[['Today','Your next step','index.html'],['Train','Workouts and exercise library','training.html'],['Meals','Menu and recipes','meals.html'],['Shop','Groceries and pantry','shopping.html'],['Progress','Weight, calories and trends','tracker.html'],['Backup & settings','Export, import and whey label','index.html#backup'],['Kitchen guide','Cooking and storage','cooking.html'],['16-week guide','Training and nutrition sources','plan.html']];
  function render(){const term=input.value.toLowerCase().trim();list.replaceChildren();
    const results=[...pages.map(([name,copy,url])=>({name,copy,url})),...RECIPES.map(r=>({name:r.name,copy:`Recipe · ${r.category} · ${r.minutes} min`,url:`meals.html?recipe=${r.id}`})),...Object.values(EXERCISES).map(e=>({name:e.name,copy:`Exercise · ${e.muscle}`,exercise:e.id}))].filter(r=>`${r.name} ${r.copy}`.toLowerCase().includes(term));
    results.slice(0,term?40:8).forEach(r=>{const item=el(r.exercise?'button':'a',undefined,'search-result');if(r.url)item.href=r.url;else item.addEventListener('click',()=>{s.d.close();openExercise(r.exercise);});item.append(el('strong',r.name),el('span',r.copy,'small'),el('span','↗','result-arrow'));list.append(item);});
    if(!results.length)list.append(el('p','No matches. Try an ingredient, muscle or page name.','empty'));
  }
  input.addEventListener('input',render);s.content.append(label,list);render();s.open();input.focus();
}

const toolbar=el('div',undefined,'app-toolbar');
const context=el('span','YOUR PERSONAL TRAINING COMPANION','toolbar-caption');
const controls=el('div',undefined,'toolbar-actions');
controls.append(action('⌕  Find anything',openSearch,'toolbar-search'),action('How this works',openGuide,'toolbar-help'));
toolbar.append(context,controls);document.querySelector('main').prepend(toolbar);
document.querySelectorAll('[data-open-guide]').forEach(b=>b.addEventListener('click',openGuide));
initUpdates();

// Reading pages get direct chapter links; no duplicated reference content.
if(!guides[route]){
  const nav=el('nav',undefined,'chapter-nav');nav.setAttribute('aria-label','On this page');
  document.querySelectorAll('main h2').forEach((h,i)=>{if(!h.id)h.id=`chapter-${i}`;const a=el('a',h.textContent);a.href=`#${h.id}`;nav.append(a);});
  document.querySelector('.hero')?.after(nav);
}
