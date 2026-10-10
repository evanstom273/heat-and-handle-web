// Freeform judging deliberately has no dependency on the recipe database.
import {FOODS,METHODS,clamp} from './catalog.mjs';
import {reconstructRecipe,DOSES,ingredientId,number} from './recipe.mjs';
const mean=(values)=>values.reduce((s,[v,w])=>s+v*w,0)/Math.max(1,values.reduce((s,[,w])=>s+w,0));
const desc=f=>FOODS[f.ingredient].name.toLowerCase();
const mainFoods=foods=>foods.filter(f=>!['herb','spice','salt','fat','sauce','acid','sweetener'].includes(FOODS[f.ingredient].role));
export function nameDish(foods){
 if(!foods.length)return 'An empty plate';
 const ids=new Set(foods.flatMap(f=>[f.ingredient,...(f.additions||[]).map(a=>a.id)])),mains=mainFoods(foods),cooked=mains.filter(f=>f.cook>=60),methods=[...new Set(cooked.map(f=>f.method))],garnish=foods.find(f=>['herb','acid'].includes(FOODS[f.ingredient].role));
 const suffix=garnish?` with ${desc(garnish)}`:'';
 if(ids.has('pasta'))return `${ids.has('cream')?'Creamy ':''}${ids.has('mushroom')?'mushroom ':''}${ids.has('tomato')?'tomato ':''}penne${suffix}`.replace(/^./,x=>x.toUpperCase());
 if(ids.has('flour')&&foods.some(f=>f.mixed))return `${ids.has('chocolate')?'Chocolate ':ids.has('apple')?'Apple ':ids.has('banana')?'Banana ':''}${methods.includes('bake')?'bake':methods.includes('pan-fry')?'pancakes':'batter'}`.replace(/^./,x=>x.toUpperCase());
 if(mains.length>1&&mains.every(f=>FOODS[f.ingredient].role==='fruit')&&!cooked.length)return 'Fresh fruit medley'+suffix;
 if(mains.length>1&&mains.every(f=>['vegetable','starch'].includes(FOODS[f.ingredient].role))&&methods.length===1)return `${METHODS[methods[0]]?.past||'Prepared'} vegetables${suffix}`;
 if(ids.has('egg')&&ids.has('cheese')&&foods.some(f=>f.mixed)&&methods.includes('pan-fry'))return 'Cheese omelette'+suffix;
 const priority={protein:0,starch:1,baking:2,vegetable:3,fruit:4,dairy:5};
 const sorted=[...mains].sort((a,b)=>(priority[FOODS[a.ingredient].role]??6)-(priority[FOODS[b.ingredient].role]??6)||b.amount-a.amount),head=sorted[0]||foods[0],others=sorted.filter(f=>f.ingredient!==head.ingredient);
 const prefix=head.cook>=55?(METHODS[head.method]?.past||'Cooked'):head.prep==='whole'?'Fresh':head.prep.charAt(0).toUpperCase()+head.prep.slice(1);
 const sides=[...new Map(others.map(f=>[f.ingredient,f])).values()].slice(0,2).map(f=>`${f.cook>=55?(METHODS[f.method]?.past||'cooked').toLowerCase()+' ':''}${desc(f)}`);
 return `${prefix} ${desc(head)}${sides.length?' with '+sides.join(' & '):suffix}`;
}
const fmt=n=>number(Math.round(n*10)/10);
const list=xs=>[...new Set(xs)].join(', ');
const round=n=>Math.round(clamp(n,0,100));
const salty={salt:1,soy:.14,bacon:.025,sausage:.018,cheese:.018,ketchup:.012,mustard:.016};
export function rating(score){return {stars:score>=90?5:score>=75?4:score>=55?3:score>=35?2:1,title:score>=95?'Chef’s kiss.':score>=90?'An excellent plate.':score>=75?'A lovely plate.':score>=55?'Room to improve.':'Back to the chopping board.'};}
export function judgeFreeform(input,plate={},context={}){
 const foods=input.map(f=>({...f,ingredient:f.ingredient||f.id,amount:f.amount??0,season:f.season||{},additions:f.additions||[],history:f.history||[],doses:f.doses||[]}));
 if(!foods.length)return {score:0,...rating(0),name:'Empty plate',metrics:[],notes:['There is no food on this plate.'],positives:[],ingredients:[],unsafe:false,limits:[],scoreCap:100};
 const meaningful=mainFoods(foods),main=meaningful.length?meaningful:foods,weight=main.reduce((s,f)=>s+f.amount,0)||1;
 const weighted=(group,fn)=>mean(group.map(f=>[fn(f,FOODS[f.ingredient]),Math.max(1,f.amount)]));
 const metric=(id,label,w,group,fn)=>{const rows=group.map(f=>({f,...fn(f,FOODS[f.ingredient])}));return {id,label,weight:w,score:round(mean(rows.map(r=>[clamp(r.score,0,100),Math.max(1,r.f.amount)]))),why:rows.map(r=>r.text).join(' ')};};
 const preparedDessert=foods.some(f=>['sweet','sweetener'].includes(FOODS[f.ingredient].role))&&foods.some(f=>FOODS[f.ingredient].requiresMix&&f.mixed)&&!foods.some(f=>FOODS[f.ingredient].role==='protein'&&f.ingredient!=='egg');
 const sweetDish=preparedDessert||main.every(f=>['fruit','sweet','sweetener','baking','dairy','liquid','cream'].includes(FOODS[f.ingredient].role));
 const isHot=f=>plate.servingCondition==='hot'||(!['chilled','room'].includes(plate.servingCondition)&&f.cook>20&&!['baking','sweet','fruit'].includes(FOODS[f.ingredient].role)&&f.ingredient!=='bread');
 const unsafeFoods=foods.filter(f=>FOODS[f.ingredient].hazard&&(f.cook<60||f.safeTime<2)),contaminated=foods.filter(f=>f.contamination>20),spoiled=foods.filter(f=>f.freshness<25);
 const unsafe=!!(unsafeFoods.length||contaminated.length||spoiled.length||plate.contamination>20);
 const freshness=metric('freshness','Freshness & ingredient quality',8,foods,(f)=>{const known=Number.isFinite(f.freshness)&&Number.isFinite(f.quality);const q=known?Math.min(f.freshness,f.quality):null;return {score:q===null?70:q>=95?100:q,text:known?`${FOODS[f.ingredient].name}: freshness ${fmt(f.freshness)}%, quality ${fmt(f.quality)}%${f.storage?' after '+f.storage+' storage':''}.${q<80?' Use a fresher portion and return perishable ingredients to cold storage.':''}`:`${FOODS[f.ingredient].name}: freshness or quality was not recorded; full freshness credit cannot be established.`};});
 const technique=metric('technique','Preparation & technique',10,main,(f,d)=>{let score=100,notes=[];const cooked=f.cook>3;
  if(d.requiresMix&&!f.mixed){score-=40;notes.push(`${d.name} remained unmixed; combine it into a hydrated batter or dough.`);}
  if(f.prepTask){score-=10;notes.push(`${d.name}'s ${f.prepTask} preparation was left unfinished.`);}
  const alternative=['bake','roast'].includes(f.method)&&d.methods.some(m=>['bake','roast'].includes(m))||['boil','steam','simmer'].includes(f.method)&&(['liquid','cream','dairy'].includes(d.role)||(d.requiresMix&&f.mixed&&f.hydrated)||f.ingredient==='dough');
  if(cooked&&f.method&&!alternative&&!d.methods.includes(f.method)&&!['reheat','defrost'].includes(f.method)){score-=18;notes.push(`${METHODS[f.method]?.name||f.method} is less suitable for ${d.name.toLowerCase()}'s recorded cooking properties; try ${d.methods.slice(0,2).map(m=>METHODS[m].name.toLowerCase()).join(' or ')}.`);}
  const direct=['pan-fry','sear','grill'].includes(f.method);
  if(d.flip&&direct&&f.prep==='whole'&&f.cook>55&&!f.flipped){score-=8;notes.push(`${d.name} was not turned on direct heat; turning would help both sides finish evenly.`);}
  if(f.dryTime>10&&['saute','sear','pan-fry'].includes(f.method)&&(d.flavour.fat||0)<3){score-=10;notes.push(`${d.name} spent ${fmt(f.dryTime)} seconds in a dry pan; a little fat would protect it.`);}
  if(!notes.length)notes.push(`${d.name}: ${f.prep||'unrecorded preparation'}${f.method?', '+METHODS[f.method]?.name.toLowerCase():', served fresh'}${f.flipped&&direct?', turned on direct heat':''}. ${f.prep==='whole'&&d.role==='protein'?'A whole cut is appropriate; cutting is not required.':`This preparation suits ${d.name.toLowerCase()}.`}`);
  return {score,text:notes.join(' ')};
 });
 const doneness=metric('doneness','Cooking accuracy',22,main,(f,d)=>{const c=f.cook||0;let score=100,text;
  if(c<3&&d.raw)text=`${d.name} was served fresh; cooking was optional.`;
  else if(c<75&&!d.raw){score=c/75*100;text=`${d.name} reached ${fmt(c)}% doneness, below the 75–112% cooked window. Keep ${f.method?METHODS[f.method]?.name.toLowerCase()+'ing':'cooking'} until the centre is ready.`;}
  else if(c>112){score=100-(c-112)*(['salmon','whitefish','shrimp'].includes(f.ingredient)?2.4:1.8);text=`${d.name} reached ${fmt(c)}% and ${c>140?'burnt':'passed its cooked window'}; remove this component sooner.`;}
  else text=`${d.name} reached ${fmt(c)}%${c<75?' in a light cook; this ingredient is also suitable fresh':', inside the 75–112% cooked window'}.`;
  return {score:clamp(score,0,100),text};
 });
 const temperature=metric('temperature','Serving temperature',8,main,(f,d)=>{let low=0,high=30,target='fresh or room-temperature';if(plate.servingCondition==='chilled'){low=0;high=15;target='chilled';}else if(plate.servingCondition==='room'){low=15;high=35;target='room-temperature';}else if(isHot(f)){low=45;high=100;target='hot';}else if(d.category==='Baking'||d.role==='fruit'&&f.cook>3){low=0;high=100;target=d.role==='fruit'?'cooked fruit, warm or cooled':'warm or cooled';}
  if(!Number.isFinite(f.temperature))return {score:70,text:`${d.name}'s serving temperature was not recorded.`};
  const distance=Math.max(0,low-f.temperature,f.temperature-high),score=100-distance*2;return {score,text:`${d.name} was ${fmt(f.temperature)}°C at service, ${distance?'outside':'within'} its ${target} range (${low}–${high}°C).${distance?(f.temperature<low?' Gently reheat this component, or choose a chilled serving condition when intentional.':' Cool this component before serving.'):''}`};
 });
 // Sum actual portions and measured additions. Legacy counters remain identifiable estimates.
 const components=foods.map(f=>({id:f.ingredient,amount:f.amount,on:FOODS[f.ingredient].name}));let legacy=false;
 for(const f of foods){components.push(...f.doses.map(d=>({...d,on:FOODS[f.ingredient].name})));const old=f.recordingVersion===3?null:(f.legacySeason||f.season);if(old){legacy=true;for(const [key,level]of Object.entries(old))if(DOSES[key]&&level>0)components.push({id:ingredientId(key),amount:DOSES[key]*level*f.amount/100,on:FOODS[f.ingredient].name,estimated:true});}}
 const total=components.reduce((s,c)=>s+c.amount,0)||1,saltMass=components.reduce((s,c)=>s+c.amount*(salty[c.id]||0),0),salt=saltMass/total*100,pepper=components.filter(c=>c.id==='blackpepper').reduce((s,c)=>s+c.amount,0)/total*100;
 const saltMin=sweetDish?0:.35,saltMax=sweetDish?.6:1.25;let seasoningScore=100;const seasoningNotes=[];
 const named=list(main.map(f=>FOODS[f.ingredient].name)),saltSources=list(components.filter(c=>salty[c.id]&&c.amount>0).map(c=>FOODS[c.id]?.name||c.id));
 if(salt<saltMin){seasoningScore-=(saltMin-salt)*45;seasoningNotes.push(`${named} has only ${fmt(salt)}% salt equivalent; a small amount would bring out its savoury flavours.`);}else if(salt>saltMax){seasoningScore-=(salt-saltMax)*48;seasoningNotes.push(`${saltSources} contributes ${fmt(salt)}% salt equivalent to ${named}, above the ${saltMax}% balance range. Reduce the salty additions or dilute them with unseasoned food.`);}else seasoningNotes.push(`${saltSources||named} leaves ${named} at ${fmt(salt)}% salt equivalent, within the ${sweetDish?'sweet dish':'savoury dish'} balance range.`);
 if(pepper>.4){seasoningScore-=(pepper-.4)*85;seasoningNotes.push(`Black pepper makes up ${fmt(pepper)}% of ${named}; use less so its heat does not mask the food.`);}else if(pepper>0)seasoningNotes.push(`Black pepper is ${fmt(pepper)}% of the dish, a supporting amount.`);
 if(legacy)seasoningNotes.push('Older dose counters were used for the balance estimate; their original gram amounts are unknown.');
 const seasoning={id:'seasoning',label:'Seasoning balance',weight:12,score:round(seasoningScore),why:seasoningNotes.join(' ')};
 const profile={};for(const k of ['savory','sweet','fat','acid','aroma','heat','bitter'])profile[k]=components.reduce((s,c)=>{const d=FOODS[c.id];const boost=k==='heat'&&['chilli','blackpepper'].includes(c.id)?8:k==='aroma'&&d?.role==='spice'?5:1;return s+c.amount*(d?.flavour[k]||0)*boost;},0)/total;
 const strongest=k=>components.filter(c=>(FOODS[c.id]?.flavour[k]||0)>0).sort((a,b)=>b.amount*(FOODS[b.id].flavour[k]||0)-a.amount*(FOODS[a.id].flavour[k]||0))[0];
 const concentratedSweet=components.filter(c=>['sweet','sweetener'].includes(FOODS[c.id]?.role)).reduce((s,c)=>s+c.amount,0)/total;
 let flavourScore=100;const flavourNotes=[];
 if(!sweetDish&&main.some(f=>FOODS[f.ingredient].role==='protein')&&concentratedSweet>.18){flavourScore-=(concentratedSweet-.18)*150;flavourNotes.push(`${list(components.filter(c=>['sweet','sweetener'].includes(FOODS[c.id]?.role)).map(c=>FOODS[c.id].name))} makes up ${Math.round(concentratedSweet*100)}% of ${named}; this concentrated sweetness overwhelms the savoury base. Reduce the sweet component.`);}
 if(salt>saltMax){flavourScore-=Math.min(70,(salt-saltMax)*30);flavourNotes.push(`${saltSources} at ${fmt(salt)}% salt equivalent masks the underlying flavours of ${named}.`);}
 if(pepper>.4){flavourScore-=Math.min(65,(pepper-.4)*30);flavourNotes.push(`Black pepper at ${fmt(pepper)}% competes with ${named}'s main flavours.`);}
 const heatLimit=2+Math.min(3,(profile.fat+profile.sweet)*.35),acidLimit=main.every(f=>FOODS[f.ingredient].role==='fruit')?7:4.5;
 for(const[k,limit,reason]of [['heat',heatLimit,'heat dominates the milder ingredients'],['acid',acidLimit,'acidity overwhelms the other flavours'],['aroma',4.5,'aromatics mask the main ingredients'],['bitter',3,'bitterness dominates']])if(profile[k]>limit){flavourScore-=(profile[k]-limit)*14;flavourNotes.push(`${FOODS[strongest(k).id].name} contributes most of the ${k}; at this quantity its ${reason}. Reduce that component.`);}
 if(profile.fat>8&&components.some(c=>['cream','oil','butter'].includes(c.id))&&profile.acid<.3){flavourScore-=(profile.fat-8)*12;flavourNotes.push(`${FOODS[strongest('fat').id].name} dominates ${named} with richness; use less or balance it with an acidic ingredient.`);}
 const a=strongest('savory'),b=strongest('aroma'),acid=strongest('acid'),fat=strongest('fat'),sweet=strongest('sweet'),heat=strongest('heat');
 if(acid&&fat&&acid.id!==fat.id&&profile.acid>.4&&profile.fat>1)flavourNotes.push(`${FOODS[acid.id].name}'s acidity contrasts with the richness from ${FOODS[fat.id].name}, at ${fmt(acid.amount)}g and ${fmt(fat.amount)}g respectively.`);
 else if(sweet&&heat&&sweet.id!==heat.id&&profile.sweet>1&&profile.heat>.1)flavourNotes.push(`${FOODS[sweet.id].name}'s sweetness balances the warmth from ${FOODS[heat.id].name}.`);
 else if(a&&b&&a.id!==b.id)flavourNotes.push(`${FOODS[b.id].name} adds aroma alongside ${FOODS[a.id].name}'s savouriness (${fmt(b.amount)}g and ${fmt(a.amount)}g used).`);
 else flavourNotes.push(`${named} supplies ${['savory','sweet','fat','acid'].filter(k=>profile[k]>=1).map(k=>({savory:'savouriness',sweet:'sweetness',fat:'richness',acid:'acidity'}[k])).join(' and ')||'a mild flavour base'}${components.length===1?'; a single ingredient does not need extra components to work':(flavourScore>=85?'. The measured flavour concentrations remain in balance':'. The dominant concentrations above need adjusting')}.`);
 const flavour={id:'flavour',label:'Flavour compatibility',weight:12,score:round(flavourScore),why:flavourNotes.join(' ')};
 const texture=metric('texture','Texture & consistency',8,main,(f,d)=>{let score=100,notes=[];if(d.needsWater&&!f.hydrated){score-=65;notes.push(`${d.name} did not absorb water and remained dry; use a water-filled pot.`);}else if(!d.raw&&f.cook<75){score-=Math.min(65,(75-f.cook)*1.3);notes.push(`${d.name} at ${fmt(f.cook)}% is insufficiently softened or set.`);}if(d.requiresMix&&!f.mixed){score-=35;notes.push(`${d.name} was not incorporated into a batter or dough.`);}if(f.cook>112){score-=(f.cook-112)*1.5;notes.push(`${d.name} at ${fmt(f.cook)}% lost texture through overcooking.`);}
  const same=main.filter(x=>x.ingredient===f.ingredient&&x.prep===f.prep&&x.method===f.method);if(same.length>1&&Math.max(...same.map(x=>x.cook))-Math.min(...same.map(x=>x.cook))>40){score-=12;notes.push(`Matching ${d.name.toLowerCase()} pieces finished at very different doneness levels.`);}
  if(!notes.length)notes.push(`${d.name}: ${f.prep||'unrecorded cut'}${f.hydrated?', hydrated':''}${f.mixed?', mixed':''}${f.cook>3?', '+fmt(f.cook)+'% cooked':', fresh'}. This state supports ${f.cook>3?'an even cooked':'a fresh'} texture.`);return {score:clamp(score,0,100),text:notes.join(' ')};
 });
 const safetyNotes=[];for(const f of foods){const d=FOODS[f.ingredient];if(unsafeFoods.includes(f))safetyNotes.push(`${d.name} failed its recorded safety check: ${fmt(f.cook)}% doneness and ${fmt(f.safeTime||0)} seconds at or above its ${d.safe}°C simulation threshold. Continue cooking; do not serve this portion yet.`);else if(d.hazard)safetyNotes.push(`${d.name} passed its heat check (${fmt(f.safeTime)} seconds at or above ${d.safe}°C).`);if(contaminated.includes(f))safetyNotes.push(`${d.name} has ${fmt(f.contamination)}% contamination${f.contaminationSource?' from '+f.contaminationSource:'; the source was not recorded'}. Use clean equipment and safely recook or discard it.`);if(spoiled.includes(f))safetyNotes.push(`${d.name} is only ${fmt(f.freshness)}% fresh; discard it.`);}
 if(plate.contamination>20)safetyNotes.push(`The serving vessel has ${fmt(plate.contamination)}% contamination; wash it before plating.`);
 if(!safetyNotes.length)safetyNotes.push(`${named}: no recorded contamination, spoilage or mandatory heat-safety failure.`);
 const safety={id:'safety',label:'Food safety & hygiene',weight:12,score:unsafe?0:100,why:safetyNotes.join(' ')};
 let presentation=100;const pn=[],positions=main.filter(f=>f.platePos),mixed=main.length>1&&main.every(f=>f.mixed);if(!positions.length){presentation=70;pn.push(`${named}'s plated positions were not recorded, so arrangement cannot be fully assessed.`);}else{const cx=weighted(positions,f=>f.platePos.x),cy=weighted(positions,f=>f.platePos.y),offset=Math.hypot(cx-.5,cy-.5);if(offset>.2){presentation-=Math.min(25,(offset-.2)*100);pn.push(`${named}'s visual weight sits toward the plate edge; move the main portion inward.`);}let overlap=[];if(!mixed)for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){const f=positions[i],g=positions[j];if(Math.hypot(f.platePos.x-g.platePos.x,f.platePos.y-g.platePos.y)<.17)overlap.push(`${FOODS[f.ingredient].name} and ${FOODS[g.ingredient].name}`);}if(overlap.length){presentation-=Math.min(45,overlap.length*15);pn.push(`${list(overlap)} overlap tightly; separate these components.`);}const edge=positions.filter(f=>Math.min(f.platePos.x,1-f.platePos.x,f.platePos.y,1-f.platePos.y)<.16);if(edge.length){presentation-=Math.min(25,edge.length*10);pn.push(`${namesFor(edge)} sits close to the rim.`);}if(!pn.length)pn.push(`${named} ${mixed?'forms an intentional combined portion':main.length===1?'sits centrally with room around the portion':'has a balanced placement with space between separate components'} on the plate.`);}
 if(plate.dirty>5){presentation-=Math.min(50,(plate.dirty-5)*.8);pn.push(`The serving vessel is ${fmt(plate.dirty)}% dirty; use a clean one.`);}else pn.push(`The recorded serving vessel is clean.`);
 const plating={id:'plating',label:'Plating & presentation',weight:5,score:round(presentation),why:pn.join(' ')};
 const nonMain=components.filter(c=>['spice','salt','herb','fat','sauce','acid','sweetener'].includes(FOODS[c.id]?.role)).reduce((s,c)=>s+c.amount,0)/total;
 const dressing=!meaningful.length&&foods.some(f=>FOODS[f.ingredient].role==='fat')&&foods.some(f=>['acid','herb'].includes(FOODS[f.ingredient].role))&&foods.every(f=>f.mixed);
 let coherenceScore=meaningful.length||dressing?100:35;let coherenceText=meaningful.length?`${named} ${main.length===1?'is a complete simple preparation':'provides the substantial components of this dish'}; complexity and recipe matching add no points.`:dressing?`${namesFor(foods)} were mixed into a dressing-like preparation.`:`${namesFor(foods)} consists of supporting ingredients without a prepared main component or combined dressing.`;
 if(meaningful.length&&nonMain>.65){coherenceScore-=30;coherenceText+=` Supporting additions make up ${Math.round(nonMain*100)}% of the mass and dominate ${named}.`;}
 if(texture.score<50){coherenceScore-=15;coherenceText+=` The unresolved texture problems prevent these components working as a finished dish.`;}
 const coherence={id:'coherence',label:'Overall coherence',weight:3,score:round(coherenceScore),why:coherenceText};
 const metrics=[freshness,technique,doneness,temperature,seasoning,flavour,texture,safety,plating,coherence];let score=Math.round(metrics.reduce((s,m)=>s+m.weight*m.score/100,0)),scoreCap=100;const limits=[];
 const cap=(n,why)=>{scoreCap=Math.min(scoreCap,n);limits.push(why+' Overall score limited to '+n+'.');};
 if(unsafe)cap(unsafeFoods.some(f=>['chicken','egg','pork','sausage'].includes(f.ingredient)&&f.cook<35)?25:40,`${namesFor([...new Set([...unsafeFoods,...contaminated,...spoiled])])||'The serving vessel'} failed a food-safety check.`);
 if(!meaningful.length&&!dressing)cap(60,`${named} does not yet form a substantial dish or a mixed dressing.`);
 if(weighted(main,(f,d)=>!d.raw&&f.cook<60?100:0)>=50)cap(65,`${named} contains a substantial undercooked component.`);
 if(flavour.score<50)cap(75,`Overpowering flavours dominate ${named}.`);
 if(main.some(f=>f.cook>140))cap(60,`${namesFor(main.filter(f=>f.cook>140))} burnt.`);
 if(salt>2)cap(Math.max(35,Math.round(75-(salt-2)*20)),`${named} is severely over-salted (${fmt(salt)}% salt equivalent).`);
 if(main.every(f=>isHot(f)&&f.temperature<30))cap(80,`${named} was intended hot but arrived cold.`);
 score=Math.min(score,scoreCap);const name=nameDish(foods),ingredients=foods.map(f=>({...JSON.parse(JSON.stringify(f)),id:f.ingredient,name:FOODS[f.ingredient].name}));
 return {evaluationVersion:3,score,...rating(score),name,metrics,unsafe,scoreCap,limits,notes:metrics.filter(m=>m.score<85).sort((a,b)=>a.score-b.score).map(m=>m.why),positives:metrics.filter(m=>m.score>=95).map(m=>m.why),flavour:{...profile,salt,pepper},ingredients,recipeRecord:reconstructRecipe(ingredients,{name,plate,servedAt:context.servedAt})};
}
const namesFor=foods=>list(foods.map(f=>FOODS[f.ingredient||f.id]?.name||f.name||'Unknown ingredient'));
export function judgeOrder(foods,plate,recipe,context){
 const result=judgeFreeform(foods,plate,context),unused=[...foods],checks=[];
 for(const r of recipe.items){const index=unused.findIndex(f=>f.ingredient===r.id);if(index<0){if(!r.optional)checks.push({label:FOODS[r.id].name,score:0,why:'Missing from the requested dish.'});continue;}const f=unused.splice(index,1)[0];let q=100,why=[];
  if(r.cut&&f.prep==='whole'){q-=30;why.push('Needed the requested preparation.');}else if(r.prep&&f.prep!==r.prep){q-=20;why.push('Requested '+r.prep+' preparation.');}
  const allowed=r.methods||[r.method,...(r.method==='pan-fry'?['sear','saute']:[])];if(r.method&&!allowed.includes(f.method)){q-=45;why.push(`Requested ${METHODS[r.method]?.name.toLowerCase()}.`);}if(!r.method&&f.cook>20){q-=20;why.push('Requested fresh.');}
  checks.push({label:FOODS[r.id].name,score:q,why:why.join(' ')||FOODS[r.id].name+' matches the requested preparation.'});
 }
 const extras=unused.filter(f=>!['herb','spice','salt','fat','sauce','sweetener'].includes(FOODS[f.ingredient].role));let accuracy=checks.reduce((s,c)=>s+c.score,0)/Math.max(1,checks.length)-extras.length*12;
 // House recipes specify dose counters, not grams; keep request accuracy separate from concentration-based food quality.
 const salt=mean(foods.map(f=>[f.season?.salt||0,f.amount])),pepper=mean(foods.map(f=>[f.season?.pepper||0,f.amount]));accuracy-=Math.abs(salt-(recipe.salt||0))*6+Math.abs(pepper-(recipe.pepper||0))*4;
 result.qualityScore=result.score;result.accuracy=round(accuracy);result.score=Math.min(result.scoreCap,Math.round(result.qualityScore*.55+result.accuracy*.45));Object.assign(result,rating(result.score));result.recipe=recipe.name;result.checks=checks;return result;
}
