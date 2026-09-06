import { ACTIVE_RECIPES, RECIPES, FOODS, recipeNutrition } from './food-data.js';
import { recipeRecord, setRecipeRecord } from './planner-state.js';
import { getRecipeGuide, ingredientQuantity, stepText, FOOD_SAFETY_SOURCES } from './recipe-guides.js';
import { mealPhoto } from './meal-visuals.js';
import { el, macroText, wheyLabel } from './meal-utils.js';
import { icon } from './ui-icons.js';

const techniques = {
  pan: ['Give food room', 'A single layer leaves room to turn. Use more trays or cook in batches when making extra servings.'],
  probe: ['Measure the middle', 'Insert a clean probe into the thickest part. Chicken pieces, egg dishes and reheated leftovers need 74°C.'],
  rice: ['Simmer, then rest', 'Use the water ratio and time on the rice package. Keep the lid on during cooking; fluff after the specified rest.'],
  store: ['Portion, chill, label', 'Shallow containers cool faster. For rice, cool ideally within 1 hour, refrigerate up to 24 hours, or freeze later portions the same day.'],
};
function illustration(kind, full = false) {
  const [title,copy] = techniques[kind];
  const figure = el('figure',undefined,'technique-card');
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 360 170'); svg.setAttribute('aria-hidden','true');
  const use = document.createElementNS(svg.namespaceURI,'use');use.setAttribute('href',`assets/kitchen.svg#${kind}`);svg.append(use);
  const caption=el('figcaption');caption.append(el('strong',title));if(full)caption.append(el('p',copy));
  figure.append(svg,caption); return figure;
}

export function initRecipeBook({getState,update,storage}) {
  const $=id=>document.getElementById(id);
  let active=null, savedOnly=false, cooking=false, returnFocus=null;
  const record=()=>recipeRecord(getState(),active);
  function patch(changes, message='Recipe saved on this browser.') {
    const ok=update(state=>setRecipeRecord(state,active,changes),message);
    $('recipeSaveStatus').textContent=$('mealStatus').textContent;
    $('recipeSaveStatus').dataset.error=$('mealStatus').dataset.error;
    return ok;
  }
  function setView(book, push=false) {
    $('plannerView').hidden=book; $('bookView').hidden=!book; document.querySelector('.hero').hidden=book;
    $('plannerViewLink').toggleAttribute('aria-current',!book);
    $('bookViewLink').toggleAttribute('aria-current',book);
    (book?$('bookViewLink'):$('plannerViewLink')).setAttribute('aria-current','page');
    if(push){const url=new URL(location.href);url.searchParams.delete('recipe');url.hash='';if(book)url.searchParams.set('view','recipes');else url.searchParams.delete('view');history.pushState({},'',url);}
  }
  function route(){const params=new URLSearchParams(location.search);setView(params.get('view')==='recipes'||params.has('recipe')||location.hash==='#recipes');}
  for(const [id,book] of [['plannerViewLink',false],['bookViewLink',true]])$(id).addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey)return;event.preventDefault();setView(book,true);});
  window.addEventListener('popstate',()=>{if($('recipeDialog').open)$('recipeDialog').close();route();});
  window.addEventListener('hashchange',route);route();
  for(const category of [...new Set(ACTIVE_RECIPES.map(r=>r.category))]){const option=el('option',category);option.value=category;$('recipeCategory').append(option);}
  for(let i=1;i<=7;i++){const option=el('option',`${i} ${i===1?'serving':'servings'}`);option.value=String(i);$('recipeServings').append(option);}
  for(const kind of ['pan','probe','store'])$('techniqueCards').append(illustration(kind,true));
  for(const [name,url] of FOOD_SAFETY_SOURCES){const li=el('li'),a=el('a',name);a.href=url;a.target='_blank';a.rel='noopener';li.append(a);$('recipeSources').append(li);}
  function renderBook(){
    const term=$('recipeSearch').value.toLowerCase().trim(),category=$('recipeCategory').value,sort=$('recipeSort').value;
    const list=ACTIVE_RECIPES.filter(r=>(category==='all'||r.category===category)&&(!savedOnly||recipeRecord(getState(),r.id).saved)&&`${r.name} ${r.ingredients.map(i=>FOODS[i.food].name).join(' ')}`.toLowerCase().includes(term));
    if(sort==='quick')list.sort((a,b)=>a.minutes-b.minutes||a.name.localeCompare(b.name));
    if(sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name));
    $('savedCount').textContent=String(ACTIVE_RECIPES.filter(r=>recipeRecord(getState(),r.id).saved).length);
    $('recipeResultCount').textContent=`${list.length} ${list.length===1?'recipe':'recipes'}${savedOnly?' saved':''}${term?` matching “${$('recipeSearch').value.trim()}”`:''}`;
    $('recipeGrid').replaceChildren();
    const groups=sort==='category'?['Breakfast','Main meal','Snack']:['All recipes'];
    for(const group of groups){
      const recipes=sort==='category'?list.filter(r=>r.category===group):list;if(!recipes.length)continue;
      const section=el('section',undefined,'recipe-category');
      if(sort==='category'){const heading=el('div',undefined,'section-heading');heading.append(el('h3',{Breakfast:'Breakfast', 'Main meal':'Lunch & dinner', Snack:'Snacks & evening bowls'}[group]),el('span',String(recipes.length),'small'));section.append(heading);}
      const grid=el('div',undefined,'book-grid');
      for(const recipe of recipes){
        const r=recipeRecord(getState(),recipe.id),guide=getRecipeGuide(recipe.id);
        const card=el('article',undefined,'book-card');
        const openButton=el('button',undefined,'book-card-open');openButton.type='button';openButton.dataset.recipeOpen=recipe.id;openButton.setAttribute('aria-label',`Open ${recipe.name}`);
        openButton.addEventListener('click',()=>open(recipe.id));
        const copy=el('span',undefined,'book-card-copy');
        copy.append(el('span',recipe.category,'eyebrow'),el('strong',recipe.name),el('span',`${recipe.minutes} min${guide.wait?' + chill':''} · ${Math.round(recipeNutrition(recipe.id,wheyLabel(storage)).protein)} g protein`,'small'));
        if(r.step!==null && r.step<guide.steps.length)copy.append(el('span',`Continue at step ${r.step+1}`,'resume-label'));
        openButton.append(mealPhoto(recipe),copy);
        const save=el('button',undefined,'book-save icon-button');save.type='button';save.dataset.recipeSave=recipe.id;save.setAttribute('aria-label',`${r.saved?'Unsave':'Save'} ${recipe.name}`);save.setAttribute('aria-pressed',String(r.saved));save.append(icon('bookmark'));
        save.addEventListener('click',()=>{if(update(state=>setRecipeRecord(state,recipe.id,{saved:!r.saved}),r.saved?'Recipe removed from saved.':'Recipe saved.')){renderBook();(document.querySelector(`[data-recipe-save="${recipe.id}"]`)??$('savedRecipes')).focus({preventScroll:true});}});
        card.append(openButton,save);grid.append(card);
      }
      section.append(grid);$('recipeGrid').append(section);
    }
    if(!list.length){const empty=el('div',undefined,'book-empty');empty.append(icon('utensils-crossed'),el('h3',savedOnly?'Your saved shelf is waiting.':'No recipes found.'),el('p',savedOnly?'Tap the bookmark on a recipe to keep it here.':'Try a different ingredient or clear your filters.'));const reset=el('button','Show all recipes','ghost');reset.addEventListener('click',()=>{$('recipeSearch').value='';$('recipeCategory').value='all';savedOnly=false;$('savedRecipes').setAttribute('aria-pressed','false');renderBook();});empty.append(reset);$('recipeGrid').append(empty);}
  }
  function renderDetail(){
    const recipe=RECIPES.find(r=>r.id===active),guide=getRecipeGuide(active),r=record();
    $('recipeTitle').textContent=recipe.name;$('recipeType').textContent=recipe.archived?'Archived recipe':recipe.category;
    $('recipePhoto').replaceChildren(mealPhoto(recipe));$('recipeSummary').textContent=guide.summary;
    $('recipeTiming').replaceChildren();
    for(const [label,value] of [['Prep',`${guide.prep} min`],['Cook',guide.cook?`${guide.cook} min`:'No cooking'],...(guide.wait?[['Chill',guide.wait]]:[])]){const stat=el('div');stat.append(el('span',label),el('b',value));$('recipeTiming').append(stat);}
    $('recipeMeta').textContent=`For one serving · ${recipe.equipment.join(' · ')}. ${r.servings>1?'Allow more space and time for a batch.':''}`;
    $('recipeMacros').textContent=`Per serving: ${macroText(recipeNutrition(active,wheyLabel(storage)))}`;
    $('recipeServings').value=String(r.servings);$('recipeServings').disabled=Boolean(recipe.archived);
    $('recipeIngredients').replaceChildren();
    recipe.ingredients.forEach((item,index)=>{
      const food=FOODS[item.food],li=el('li'),label=el('label',undefined,'book-ingredient'),check=el('input');check.type='checkbox';check.checked=r.checked.includes(index);
      const text=el('span');text.append(el('strong',food.name),el('small',food.weightState));
      label.append(check,text,el('b',ingredientQuantity(item,r.servings),'ingredient-amount'));li.append(label);$('recipeIngredients').append(li);
      check.addEventListener('change',()=>{const before=record().checked;const checked=check.checked?[...new Set([...before,index])]:before.filter(i=>i!==index);if(!patch({checked},'Ingredient check saved.'))check.checked=before.includes(index);});
    });
    $('methodStepCount').textContent=`${guide.steps.length} steps`;$('recipeSteps').replaceChildren();
    guide.steps.forEach(step=>{const li=el('li');li.append(el('h4',step.title),el('p',stepText(active,step,r.servings)));if(step.cue)li.append(el('p',step.cue,'step-cue'));$('recipeSteps').append(li);});
    $('recipeStorage').replaceChildren();for(const [title,body]of guide.storage){const section=el('div');section.append(el('h4',title),el('p',body));$('recipeStorage').append(section);}
    $('recipePersonalNote').value=r.note;
    $('saveRecipe').setAttribute('aria-pressed',String(r.saved));$('saveRecipe').replaceChildren(icon('bookmark'),document.createTextNode(r.saved?'Saved recipe':'Save recipe'));
    $('startCooking').textContent=r.step===null?'Start cooking →':r.step<guide.steps.length?`Resume step ${r.step+1} →`:'Cook again →';
  }
  function renderCook(focus=true){
    const guide=getRecipeGuide(active),r=record(),index=r.step??0,done=index===guide.steps.length;
    $('recipeOverview').hidden=true;$('cookMode').hidden=false;
    $('cookStepCount').textContent=done?'METHOD COMPLETE':`STEP ${index+1} OF ${guide.steps.length}`;
    $('cookServingCount').textContent=`Making ${r.servings} ${r.servings===1?'serving':'servings'}`;
    $('cookProgress').max=guide.steps.length;$('cookProgress').value=index;
    $('cookStepTitle').textContent=done?'Ready to serve.':guide.steps[index].title;
    $('cookStepText').textContent=done?`${guide.cook?'Check doneness before eating. ':guide.wait?'Finish the stated chilling time before eating. ':''}If saving portions for later, follow the storage instructions below.`:stepText(active,guide.steps[index],r.servings);
    $('cookIllustration').replaceChildren();const kind=done?'store':guide.steps[index].technique;if(kind)$('cookIllustration').append(illustration(kind));
    if(done){for(const [title,body]of guide.storage){const section=el('div',undefined,'completion-storage');section.append(el('h4',title),el('p',body));$('cookIllustration').append(section);}}
    $('cookCue').textContent=done?'Your cooking progress is saved.':guide.steps[index].cue;
    $('cookCue').hidden=!$('cookCue').textContent;
    $('cookPrevious').disabled=index===0;$('cookNext').hidden=done;$('cookNext').textContent=index===guide.steps.length-1?'Finish method ✓':'Next step →';
    if(focus){$('recipeDialog').querySelector('.sheet-content').scrollTop=0;$('cookStepTitle').focus({preventScroll:true});}
  }
  function open(id){returnFocus=document.activeElement;active=id;cooking=false;$('recipeSaveStatus').textContent='';$('recipeOverview').hidden=false;$('cookMode').hidden=true;renderDetail();if(!$('recipeDialog').open)$('recipeDialog').showModal();$('recipeDialog').querySelector('.sheet-content').scrollTop=0;$('recipeTitle').focus({preventScroll:true});}
  $('closeRecipe').addEventListener('click',()=>$('recipeDialog').close());
  $('recipeDialog').addEventListener('close',()=>{renderBook();const target=returnFocus?.isConnected&&returnFocus!==document.body?returnFocus:document.querySelector(`[data-recipe-open="${active}"]`)??$('bookViewLink');target.focus({preventScroll:true});});
  $('recipeServings').addEventListener('change',()=>{if(patch({servings:Number($('recipeServings').value)},'Servings saved. Ingredient checks and cooking progress reset.'))renderDetail();else $('recipeServings').value=String(record().servings);});
  $('clearIngredients').addEventListener('click',()=>{if(patch({checked:[]},'Ingredient checks cleared.'))renderDetail();});
  $('saveRecipe').addEventListener('click',()=>{if(patch({saved:!record().saved}))renderDetail();});
  $('recipePersonalNote').addEventListener('input',()=>patch({note:$('recipePersonalNote').value},'Kitchen note saved.'));
  $('startCooking').addEventListener('click',()=>{const r=record(),steps=getRecipeGuide(active).steps;const step=r.step!==null&&r.step<steps.length?r.step:0;if(patch(r.step===steps.length?{step,checked:[]}:{step},'Cooking progress saved.')){cooking=true;renderCook();}});
  $('cookNext').addEventListener('click',()=>{if(patch({step:Math.min(getRecipeGuide(active).steps.length,(record().step??0)+1)},'Cooking progress saved.'))renderCook();});
  $('cookPrevious').addEventListener('click',()=>{if(patch({step:Math.max(0,(record().step??0)-1)},'Cooking progress saved.'))renderCook();});
  $('cookExit').addEventListener('click',()=>{cooking=false;$('cookMode').hidden=true;$('recipeOverview').hidden=false;renderDetail();$('startCooking').focus();});
  for(const button of document.querySelectorAll('[data-recipe-section]'))button.addEventListener('click',()=>$(button.dataset.recipeSection).scrollIntoView({block:'start',behavior:'auto'}));
  for(const id of ['recipeSearch','recipeCategory','recipeSort'])$(id).addEventListener(id==='recipeSearch'?'input':'change',renderBook);
  $('savedRecipes').addEventListener('click',()=>{savedOnly=!savedOnly;$('savedRecipes').setAttribute('aria-pressed',String(savedOnly));renderBook();});
  renderBook();const requested=new URLSearchParams(location.search).get('recipe');if(RECIPES.some(r=>r.id===requested))open(requested);
  return {open, refresh(){renderBook();if(active&&$('recipeDialog').open){renderDetail();if(cooking)renderCook(false);}}};
}
