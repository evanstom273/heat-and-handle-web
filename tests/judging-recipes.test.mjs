import assert from 'node:assert/strict';
import {fresh,act,at,tick,take,toVessel,vessel,finish,cook,serve,salmon} from './cooking-fixtures.mjs';
import {judgeFreeform,judgeOrder,rating} from '../web/judging.mjs';
import {creationRecipe,reconstructRecipe} from '../web/recipe.mjs';
import {recipeView,judgingView} from '../web/recipe-view.mjs';
import {Kitchen} from '../web/simulation.mjs';
const m=(r,id)=>r.metrics.find(m=>m.id===id);
const outcomes=[];
function check(label,r){assert.equal(r.metrics.length,10);assert.equal(r.metrics.reduce((s,m)=>s+m.weight,0),100);assert.ok(r.metrics.every(m=>Number.isFinite(m.score)&&m.score>=0&&m.score<=100&&m.why.length>20));assert.deepEqual({stars:r.stars,title:r.title},rating(r.score));assert.ok(r.score<=r.scoreCap);if(r.unsafe){assert.ok(r.score<=40);assert.equal(r.earned,0);assert.equal(r.tip,0);}outcomes.push({dish:label,score:r.score,stars:r.stars});}
const {result:fish}=salmon();check('Whole grilled salmon, paprika, salt, pepper',fish);assert.equal(fish.score,100);assert.equal(m(fish,'technique').score,100);assert.match(m(fish,'technique').why,/whole cut is appropriate/i);assert.match(m(fish,'flavour').why,/Paprika/);assert.ok(fish.metrics.every(m=>/salmon/i.test(m.why)));
const rr=fish.recipeRecord;assert.equal(rr.ingredients[0].amount,100);assert.deepEqual(rr.additions.map(d=>[d.id,d.amount]),[['paprika',.6],['salt',.7],['blackpepper',.12]]);assert.ok(rr.steps.some(s=>/Grill.*190°C/.test(s.text)));assert.ok(rr.steps.some(s=>/Turn Salmon/.test(s.text)));const flipIndex=rr.steps.findIndex(s=>/Turn Salmon/.test(s.text));assert.ok(rr.steps.slice(0,flipIndex).some(s=>/Grill Salmon/.test(s.text)));assert.ok(rr.steps.slice(flipIndex+1).some(s=>/Grill Salmon/.test(s.text)));assert.ok(!rr.unknown.length);assert.equal(rr.serving.baseGrams,100);assert.match(recipeView(rr),/The recipe you cooked/);assert.match(judgingView(fish),/Paprika/);
{
 const k=fresh();cook(k,'steak',{method:'sear'});const r=serve(k);check('Properly seared whole steak',r);assert.equal(r.score,100);assert.equal(m(r,'technique').score,100);assert.ok(r.recipeRecord.media.some(m=>m.id==='oil'&&m.amount===10));
}
for(const target of [0,40]){const k=fresh();if(target) cook(k,'chicken',{method:'roast',target});else{take(k,'chicken');toVessel(k,vessel(k,'plate','plate'));}const r=serve(k);check(target?'Undercooked chicken':'Raw chicken',r);assert.ok(r.unsafe);assert.equal(m(r,'safety').score,0);assert.match(m(r,'safety').why,/Chicken.*74°C/);assert.ok(m(r,'doneness').score<60);}
{
 const k=fresh();cook(k,'salmon',{target:134});const r=serve(k);check('Overcooked fish',r);assert.ok(r.score<90);assert.ok(m(r,'doneness').score<60);assert.match(m(r,'doneness').why,/Salmon.*passed/);assert.ok(m(r,'texture').score<80);
}
{
 const k=fresh();const f=cook(k,'steak',{method:'sear',spices:['salt','salt','salt','salt','salt']});const r=serve(k);check('Excessively salted steak',r);assert.ok(r.score<70);assert.ok(m(r,'seasoning').score<25);assert.match(m(r,'seasoning').why,/Salt.*Steak/);assert.equal(r.recipeRecord.additions.filter(a=>a.id==='salt').reduce((s,a)=>s+a.amount,0),3.5);
}
{
 const k=fresh();cook(k,'pasta',{method:'boil',target:35});const r=serve(k);check('Undercooked pasta',r);assert.equal(r.unsafe,false);assert.equal(m(r,'safety').score,100);assert.ok(r.score<=65);assert.ok(m(r,'texture').score<50);assert.match(m(r,'texture').why,/Penne|pasta/i);
}
{
 const k=fresh();cook(k,'carrot',{method:'roast',prep:'chop'});cook(k,'broccoli',{method:'steam',prep:'chop'});const r=serve(k);check('Prepared roast and steamed vegetables',r);assert.ok(r.score>=95);assert.equal(m(r,'technique').score,100);assert.deepEqual(new Set(r.ingredients.map(f=>f.method)),new Set(['roast','steam']));assert.ok(r.recipeRecord.steps.some(s=>/Roast.*Carrot/.test(s.text)));assert.ok(r.recipeRecord.steps.some(s=>/Steam.*Broccoli/.test(s.text)));
}
{
 const k=fresh();cook(k,'steak',{method:'sear'});cook(k,'pineapple',{method:'grill',prep:'slice'});const r=serve(k);check('Steak with grilled pineapple',r);assert.equal(r.score,100);assert.equal(m(r,'temperature').score,100);assert.match(m(r,'flavour').why,/Pineapple.*Steak|Steak.*Pineapple/);assert.equal(r.recipe,undefined);
 const stripped=r.ingredients.map(f=>({...f,history:[]}));assert.deepEqual(judgeFreeform(stripped,{dirty:0}),judgeFreeform(stripped,{dirty:0}));
}
{
 const k=fresh();cook(k,'pasta',{method:'boil'});cook(k,'mushroom',{method:'saute',prep:'slice',slot:1});at(k,'plate');const p=vessel(k,'plate','plate');act(k,'season',{uid:p.uid,seasoning:'cream'});act(k,'mix',{uid:p.uid});act(k,'stir',{uid:p.uid});const r=serve(k);check('Separately boiled pasta and sautéed mushrooms',r);assert.ok(r.score>=90);assert.equal(r.ingredients.length,2);assert.equal(r.recipeRecord.additions.filter(a=>a.id==='cream').reduce((s,a)=>s+a.amount,0),20);assert.ok(r.recipeRecord.steps.some(s=>/Mix.*Penne.*Mushroom|Mix.*Penne.*mushroom/i.test(s.text)));assert.ok(r.recipeRecord.steps.some(s=>/Stir/.test(s.text)));assert.ok(r.recipeRecord.steps.every((s,i,a)=>i===0||s.at>=a[i-1].at));assert.equal(m(r,'plating').score,100);
}
{
 const k=fresh();const f=cook(k,'salmon');at(k,'plate');act(k,'plate-position',{uid:f.uid,x:.1,y:.1});const r=serve(k,{arrange:false});check('Salmon crowded against rim',r);assert.ok(m(r,'plating').score<80);assert.match(m(r,'plating').why,/Salmon.*edge/);
}
{
 const k=fresh();cook(k,'salmon');tick(k,220);const p=vessel(k,'plate','plate'),food=k.contents(p);const hot=judgeFreeform(food,{...p,servingCondition:'hot'}),chilled=judgeFreeform(food,{...p,servingCondition:'room'});assert.ok(m(hot,'temperature').score<70);assert.equal(m(chilled,'temperature').score,100);assert.equal(chilled.unsafe,false);assert.match(m(chilled,'temperature').why,/room-temperature/);
}
{
 const old={id:'old',name:'Original fish',score:82,dish:{ingredients:[{id:'salmon',name:'Salmon',amount:100,prep:'whole',method:'grill',cook:95,temperature:65,season:{salt:1,pepper:1},history:[{at:4,action:'season',seasoning:'salt'},{at:8,action:'flip'}]}],metrics:[{id:'technique',label:'Technique',score:82,why:'Original feedback'}]}};
 const legacy=creationRecipe(old);assert.equal(old.score,82);assert.ok(legacy.unknown.length);assert.ok(legacy.additions.every(a=>a.unit.includes('unknown')));assert.ok(!legacy.steps.some(s=>/190°C|10g|paprika/i.test(s.text)));assert.match(recipeView(legacy),/Incomplete earlier record/);assert.match(judgingView(old.dish),/Original feedback/);
 const empty=creationRecipe({name:'Very old',dish:{ingredients:[{id:'tomato'}]}});assert.equal(empty.ingredients[0].amount,null);assert.match(recipeView(empty),/Quantity unknown/);
 const k=fresh();take(k,'steak');const snapshot=k.snapshot(),f=snapshot.objects[snapshot.hand];delete f.recordingVersion;delete f.doses;delete snapshot.eventSequence;const restored=new Kitchen();assert.ok(restored.restore(snapshot));restored.action('resume');act(restored,'season',{uid:f.uid,seasoning:'salt'});const rec=reconstructRecipe([restored.objects[f.uid]]);assert.equal(rec.additions.filter(d=>d.unit==='g').length,1);assert.ok(rec.unknown.length);
}
{
 const k=fresh();const f=cook(k,'steak',{method:'sear'});const p=vessel(k,'plate','plate');act(k,'arrange',{uid:p.uid});const free=judgeFreeform([f],p),req={name:'Steak',items:[{id:'steak',method:'sear'},{id:'basil',optional:true}],salt:1,pepper:1};assert.equal(judgeOrder([f],p,req).score,free.score);assert.equal(judgeOrder([f],p,{...req,items:[...req.items,{id:'carrot'}]}).checks.some(c=>c.why.includes('Missing')),true);
 // Excessive seasoning concentration changes flavour; unconventional combinations are not blanket-approved.
 const spicy={...f,uid:'chilli',ingredient:'chilli',amount:200,method:null,cook:0,flipped:false,season:{},doses:[],platePos:{x:.7,y:.5}};const r=judgeFreeform([f,spicy],p);assert.ok(m(r,'flavour').score<50);assert.match(m(r,'flavour').why,/Chilli.*heat/);
}
{
 const k=fresh(),f=take(k,'mushroom','slice'),pan=vessel(k,'pan','hob');toVessel(k,pan);act(k,'season',{uid:f.uid,seasoning:'oil'});act(k,'season',{uid:f.uid,seasoning:'lemon'});act(k,'marinate',{uid:f.uid});tick(k,25);act(k,'method',{uid:pan.uid,method:'saute'});act(k,'burner',{slot:0,heat:1});tick(k,12);act(k,'stir',{uid:f.uid});act(k,'burner',{slot:0,heat:2});finish(k,f);act(k,'pick-up',{uid:f.uid});toVessel(k,vessel(k,'plate','plate'));const r=serve(k);const heats=r.ingredients[0].history.filter(h=>h.action==='cook');assert.ok(heats.some(h=>h.setpoint===120));assert.ok(heats.some(h=>h.setpoint===180));assert.equal(f.dryTime,0);const resting=r.ingredients[0].history.find(h=>h.action==='marinate').rested;assert.ok(resting>=25&&resting<30);assert.ok(r.recipeRecord.steps.some(s=>/recorded resting time/.test(s.text)));assert.ok(r.recipeRecord.steps.some(s=>/Stir/.test(s.text)));assert.ok(r.recipeRecord.additions.some(a=>a.id==='oil'&&a.amount===3));
 const old=k.snapshot();const pot=Object.values(old.objects).find(o=>o.type==='stockpot');delete pot.media;pot.fluid='water';const restored=new Kitchen();restored.restore(old);assert.equal(restored.objects[pot.uid].media[0].amount,null);assert.equal(restored.objects[pot.uid].media[0].id,'water');
}
console.table(outcomes);console.log('Ingredient-specific judging, complete recorded recipes, serving conditions, presentation and legacy compatibility passed.');
export {fish};
