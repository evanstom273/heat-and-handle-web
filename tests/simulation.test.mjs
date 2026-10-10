import assert from 'node:assert/strict';
import {Kitchen} from '../web/simulation.mjs';
import {FOODS,PREPS,RECIPES} from '../web/catalog.mjs';
import {judgeFreeform} from '../web/judging.mjs';
const kitchen=mode=>{const k=new Kitchen();k.reset(mode||'free');return k;};
const action=(k,type,args={})=>{const r=k.action(type,args);assert.equal(r.ok,true,`${type}: ${r.message}`);return r;};
const at=(k,s)=>{k.station=s;k.selected=null;};
const find=(k,type,station)=>Object.values(k.objects).find(o=>o.type===type&&(!station||o.loc.station===station));
const tick=(k,seconds)=>{for(let t=0;t<seconds;t+=.1)k.tick(.1);};
function ingredient(k,id,prep=null){at(k,FOODS[id].source);action(k,'take-supply',{id});const f=k.objects[k.hand];if(prep){at(k,'board');action(k,'place',{x:.2,y:.3});for(let i=0;i<PREPS[prep].cuts;i++)action(k,'prepare',{uid:f.uid,method:prep});action(k,'pick-up',{uid:f.uid});}return f;}
function put(k,v){at(k,v.loc.station);action(k,'add-held',{target:v.uid});}
function season(k,uid){action(k,'season',{uid,seasoning:'salt'});action(k,'season',{uid,seasoning:'pepper'});}
function finish(k,v,food){let n=0;while(food.cook<90&&n++<2500){k.tick(.1);if(FOODS[food.ingredient].flip&&food.cook>=40&&!food.flipped)action(k,'flip',{uid:food.uid});}assert.ok(n<2500,food.ingredient+' did not cook');assert.ok(food.safeTime>=2||FOODS[food.ingredient].raw,food.ingredient+' stayed unsafe');action(k,'pick-up',{uid:food.uid});}
function plate(k){at(k,'plate');return find(k,'plate','plate');}
function serve(k,p){at(k,'plate');action(k,'arrange',{uid:p.uid});season(k,p.uid);action(k,'pick-up',{uid:p.uid});at(k,'pass');return action(k,'serve').result;}
{
 const k=kitchen();assert.equal(k.recipe(),null);assert.equal(k.orders.length,0);const a=ingredient(k,'tomato');at(k,'board');action(k,'place',{x:.2,y:.2});const b=ingredient(k,'carrot');at(k,'board');action(k,'place',{x:.8,y:.7});assert.equal(k.at('board').filter(o=>o.kind==='food').length,2);action(k,'move',{uid:a.uid,x:.7,y:.15});assert.equal(k.objects[b.uid].prep,'whole');for(let i=0;i<4;i++)action(k,'prepare',{uid:a.uid,method:'chop'});assert.equal(a.prep,'chopped');assert.equal(b.prep,'whole');const before=JSON.stringify(k.objects);action(k,'switch-mode',{mode:'service'});action(k,'switch-mode',{mode:'free'});assert.equal(JSON.stringify(k.objects),before);const restored=kitchen();assert.ok(restored.restore(k.snapshot()));assert.deepEqual(restored.objects,k.objects);console.log('Multiple objects, independent prep, positions, mode switching and restore passed.');
}
{
 const k=kitchen(),pan=find(k,'pan','hob'),p=plate(k);const steak=ingredient(k,'steak');put(k,pan);action(k,'fluid',{uid:pan.uid,fluid:'oil'});action(k,'method',{uid:pan.uid,method:'sear'});action(k,'burner',{slot:0,heat:2});tick(k,8);const mushroom=ingredient(k,'mushroom','slice');put(k,pan);tick(k,3);assert.notEqual(steak.cook,mushroom.cook);assert.equal(pan.items.length,2);
 let limit=0;while(pan.items.length&&limit++<1500){k.tick(.1);if(steak.cook>=40&&!steak.flipped&&k.objects[steak.uid].loc.container)action(k,'flip',{uid:steak.uid});for(const f of [...k.contents(pan)])if(f.cook>=90){at(k,'hob');action(k,'pick-up',{uid:f.uid});at(k,'plate');action(k,'add-held',{target:p.uid});at(k,'hob');}}
 const r=serve(k,p);assert.ok(r.score>=85,JSON.stringify(r));assert.match(r.name,/steak/i);assert.equal(r.recipe,undefined);assert.equal(r.accuracy,undefined);assert.equal(r.metrics.length,10);console.log('Recipe-free steak and mushrooms:',r.score,r.name);
}
{
 const k=kitchen(),p=plate(k);ingredient(k,'chicken');at(k,'plate');action(k,'add-held',{target:p.uid});const r=serve(k,p);assert.equal(r.unsafe,true);assert.ok(r.score<=40);assert.ok(r.notes.some(n=>n.includes('safety')));console.log('Raw protein receives a deterministic safety cap.');
}
{
 const k=kitchen(),basket=find(k,'basket','fryer'),f=ingredient(k,'potato','slice');put(k,basket);action(k,'appliance',{setting:'power',value:true});action(k,'appliance',{setting:'temperature',value:180});tick(k,15);assert.equal(f.cook,0);action(k,'basket',{uid:basket.uid});tick(k,30);assert.ok(f.cook>0);action(k,'basket',{uid:basket.uid});const progress=f.cook;tick(k,6);assert.equal(f.cook,progress);action(k,'pick-up',{uid:basket.uid});assert.equal(k.contents(basket)[0].uid,f.uid);console.log('Independent fryer heat, lifted basket and carrying cooked contents passed.');
}
{
 const k=kitchen();at(k,'freezer');action(k,'take-supply',{id:'salmon'});const f=k.objects[k.hand];const p=plate(k);action(k,'add-held',{target:p.uid});action(k,'pick-up',{uid:p.uid});at(k,'microwave');action(k,'place');action(k,'appliance',{setting:'mode',value:'defrost'});action(k,'appliance',{setting:'power',value:true});tick(k,31);assert.equal(f.frozen,0);assert.equal(f.cook,0);assert.equal(k.appliances.microwave.enabled,false);assert.ok(f.temperature>0);console.log('Microwave defrost thaws without cooking and stops on its timer.');
}
{
 const k=kitchen(),tray=find(k,'tray','oven'),f=ingredient(k,'chicken');put(k,tray);action(k,'appliance',{setting:'power',value:true});action(k,'appliance',{setting:'mode',value:'roast'});tick(k,20);assert.equal(f.cook,0);action(k,'appliance',{setting:'door',value:false});tick(k,8);assert.ok(f.cook>0);const before=k.snapshot();assert.equal(k.action('pick-up',{uid:tray.uid}).ok,false);assert.equal(JSON.stringify(k.objects),JSON.stringify(before.objects));action(k,'appliance',{setting:'door',value:true});action(k,'pick-up',{uid:tray.uid});console.log('Oven door, roast mode and removable trays passed.');
}
{
 const k=kitchen(),bowl=find(k,'mixing','pastry'),tray=find(k,'tray','oven');for(const id of ['flour','milk','egg','sugar','chocolate']){ingredient(k,id);put(k,bowl);}at(k,'pastry');action(k,'mix',{uid:bowl.uid});assert.ok(k.contents(bowl).every(f=>f.mixed&&f.hydrated));action(k,'pick-up',{uid:bowl.uid});at(k,'oven');action(k,'add-held',{target:tray.uid});assert.equal(bowl.items.length,0);at(k,'counter');action(k,'place');at(k,'oven');action(k,'appliance',{setting:'power',value:true});action(k,'appliance',{setting:'door',value:false});tick(k,42);assert.ok(k.contents(tray).every(f=>f.cook>30));assert.ok(k.contents(tray).every(f=>f.method==='bake'));console.log('Mixed batters, hydration, pouring and baking are connected.');
}
{
 const k=kitchen();const f=ingredient(k,'chicken','dice');at(k,'counter');action(k,'place');const t=ingredient(k,'tomato','slice');assert.ok(t.contamination>20);at(k,'sink');action(k,'wash',{surfaces:true});assert.equal(k.surfaces.board.contamination,0);const fresh=k.spawnFood('tomato','fridge');fresh.loc={station:'board',x:.6,y:.6};k.contaminationContact(fresh,'board');assert.equal(fresh.contamination,0);console.log('Raw-food contamination and cleaning passed.');
}
{
 const k=kitchen();at(k,'microwave');const before=k.snapshot();assert.equal(k.action('appliance',{setting:'power',value:true}).ok,false);assert.deepEqual(k.appliances,before.appliances);k.status='paused';tick(k,10);assert.equal(k.elapsed,0);k.status='playing';action(k,'switch-mode',{mode:'service'});tick(k,365);assert.equal(k.status,'paused');assert.ok(k.events.some(e=>e.type==='finished'));console.log('Rejected controls, pause and service completion passed.');
}
{
 const k=kitchen(),f=k.spawnFood('steak','fridge');Object.assign(f,{cook:92,temperature:68,safeTime:12,method:'sear',flipped:true,season:{salt:1,pepper:1},prep:'whole'});const veg=k.spawnFood('pineapple','fridge');Object.assign(veg,{cook:90,temperature:65,safeTime:12,method:'grill',prep:'sliced',season:{salt:1,pepper:1}});delete f.recordingVersion;delete veg.recordingVersion;const p={dirty:0};const a=judgeFreeform([f,veg],p),b=judgeFreeform([f,veg],p);assert.deepEqual(a,b);assert.ok(a.score>=85);veg.cook=180;const bad=judgeFreeform([f,veg],p);assert.ok(bad.score<a.score);f.season.salt=5;assert.ok(judgeFreeform([f,veg],p).metrics.find(m=>m.id==='seasoning').score<80);console.log('Unusual prepared combinations accepted; deterministic burning and seasoning penalties passed.');
}
console.log('Simulation integration checks passed.');
{
 const k=kitchen(),pot=find(k,'stockpot','hob'),rice=ingredient(k,'rice');put(k,pot);action(k,'fluid',{uid:pot.uid,fluid:'water'});action(k,'method',{uid:pot.uid,method:'boil'});action(k,'burner',{slot:pot.loc.slot,heat:2});at(k,'fridge');tick(k,45);assert.ok(rice.hydrated);assert.ok(rice.cook>=75);assert.equal(rice.method,'boil');assert.equal(k.appliances.hob.burners[0].temperature,20);
 at(k,'hob');action(k,'method',{uid:pot.uid,method:'simmer'});assert.ok(k.heatFor(pot).temperature<=92);
 const k2=kitchen(),steamer=find(k2,'stockpot','hob'),broccoli=ingredient(k2,'broccoli','chop');put(k2,steamer);action(k2,'fluid',{uid:steamer.uid,fluid:'water'});action(k2,'method',{uid:steamer.uid,method:'steam'});action(k2,'burner',{slot:steamer.loc.slot,heat:2});tick(k2,40);assert.ok(broccoli.hydrated&&broccoli.cook>70);assert.equal(broccoli.method,'steam');
 console.log('Boiling, simmer temperature, steaming, independent burners and cooking while elsewhere passed.');
}
{
 const k=kitchen(),griddle=find(k,'tray','grill'),f=ingredient(k,'salmon');put(k,griddle);action(k,'fluid',{uid:griddle.uid,fluid:'oil'});action(k,'appliance',{setting:'temperature',value:190});action(k,'appliance',{setting:'power',value:true});finish(k,griddle,f);const p=plate(k);action(k,'add-held',{target:p.uid});const cooked=f.cook;f.temperature=20;action(k,'pick-up',{uid:p.uid});at(k,'microwave');action(k,'place');action(k,'appliance',{setting:'mode',value:'reheat'});action(k,'appliance',{setting:'duration',value:20});action(k,'appliance',{setting:'power',value:true});tick(k,20);assert.ok(f.temperature>60);assert.ok(f.cook-cooked<5);assert.equal(f.method,'grill');
 console.log('Grilling and gentle reheating preserve the actual cooking history.');
}
{
 const k=kitchen(),p=plate(k);const f=ingredient(k,'tomato','chop');at(k,'plate');action(k,'add-held',{target:p.uid});action(k,'pin-recipe',{id:'chicken'});const free=serve(k,p);assert.ok(free.score>85);assert.equal(free.accuracy,undefined);
 const structured=kitchen('service'),sp=plate(structured);ingredient(structured,'tomato','chop');at(structured,'plate');action(structured,'add-held',{target:sp.uid});const ordered=serve(structured,sp);assert.ok(ordered.accuracy<75);assert.ok(ordered.checks.some(c=>c.why.includes('Missing')));assert.ok(ordered.score<free.score);
 const seasoned=kitchen(),sf=ingredient(seasoned,'steak');at(seasoned,'board');action(seasoned,'place');action(seasoned,'season',{uid:sf.uid,seasoning:'lemon'});action(seasoned,'marinate',{uid:sf.uid});tick(seasoned,25);assert.ok(sf.marinated>=20);for(let i=0;i<4;i++)action(seasoned,'season',{uid:sf.uid,seasoning:'lemon'});const additions=sf.additions.length;assert.equal(seasoned.action('season',{uid:sf.uid,seasoning:'lemon'}).ok,false);assert.equal(sf.additions.length,additions);
 console.log('Pinned references do not affect Free Cook; ordered plates enforce requirements; marination and seasoning limits passed.');
}
