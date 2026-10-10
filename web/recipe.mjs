import {FOODS,EQUIPMENT,METHODS,STATION_BY_ID} from './catalog.mjs';
export const DOSES={salt:.7,pepper:.12,paprika:.6,cumin:.35,chilli:.25,garlic:2,lemon:5,oil:3,butter:3,cream:10,soy:2};
export const ingredientId=key=>key==='pepper'?'blackpepper':key;
export const number=n=>Number.isFinite(n)?String(Math.round(n*100)/100):'unknown';
const title=id=>FOODS[id]?.name||id||'Unknown ingredient';
const names=foods=>foods.map(f=>title(f.ingredient||f.id)).join(', ');
export function reconstructRecipe(input,{name='Your creation',plate={},servedAt=null}={}){
 const foods=input.map(f=>({...f,ingredient:f.ingredient||f.id,history:f.history||[]}));
 const ingredients=foods.map(f=>({uid:f.uid||null,id:f.ingredient,name:title(f.ingredient),amount:Number.isFinite(f.amount)?f.amount:null,unit:'g',prep:f.prep||null,method:f.method||null,doneness:Number.isFinite(f.cook)?Math.round(f.cook):null,temperature:Number.isFinite(f.temperature)?Math.round(f.temperature):null}));
 const additions=[],media=new Map(),events=new Map(),unknown=[];
 for(const f of foods){
  if(f.recordingVersion!==3||f.historyTruncated)unknown.push('Some earlier actions, equipment and temperatures were not recorded. The method below includes only available evidence.');
  for(const d of f.doses||[])additions.push({id:d.id,name:title(d.id),amount:d.amount,unit:d.unit||'g',on:title(f.ingredient),eventId:d.eventId});
  // Legacy counters are doses, not a physical mass. Never convert them into invented grams.
  if(f.recordingVersion!==3){for(const[key,value]of Object.entries(f.legacySeason||f.season||{}))if(value>0)additions.push({id:ingredientId(key),name:title(ingredientId(key))+' (legacy balance counter)',amount:value,unit:'counter units; mass unknown',on:title(f.ingredient)});for(const a of f.legacyAdditions||f.additions||[])if(!(f.season?.[a.id]>0))additions.push({id:a.id,name:title(a.id),amount:Number.isFinite(a.amount)?a.amount:null,unit:'recorded addition(s); mass unknown',on:title(f.ingredient)});}
  for(const e of f.history){const key=['mix','stir','flip','marinate','arrange'].includes(e.action)&&e.eventId?`${e.action}:${e.at}:${e.vesselUid||f.uid}`:e.eventId||`old:${f.uid||foods.indexOf(f)}:${f.history.indexOf(e)}`;if(!events.has(key))events.set(key,{...e,foods:[]});events.get(key).foods.push(f);for(const m of e.media||[])media.set(m.eventId||JSON.stringify(m),m);}
 }
 for(const m of media.values())if(Number.isFinite(m.at)&&Number.isFinite(m.amount))events.set(m.eventId,{...m,action:'medium',foods:[]});
 const steps=[];const add=(e,text)=>{if(text)steps.push({at:Number.isFinite(e.at)?e.at:null,text});};
 for(const e of [...events.values()].sort((a,b)=>(a.at??Infinity)-(b.at??Infinity)||(a.sequence??0)-(b.sequence??0))){
  const who=names(e.foods),v=e.equipmentName|| (e.equipment?(EQUIPMENT[e.equipment]?.name||e.equipment):(e.vessel?EQUIPMENT[e.vessel]?.name:null)),where=v?` ${/plate|tray|griddle/i.test(v)?'on':'in'} the ${v.toLowerCase()}`:'';
  if(e.action==='medium')add(e,`Add ${number(e.amount)}${e.unit} ${e.id==='water'?'water':title(e.id)} to the ${(EQUIPMENT[e.equipment]?.name||e.equipment||'cookware').toLowerCase()}.`);
  else if(['slice','chop','dice','mince','grate','juice','roll'].includes(e.action))add(e,`${e.action.charAt(0).toUpperCase()+e.action.slice(1)} ${who}${e.tool?` using the ${EQUIPMENT[e.tool]?.name||e.tool}`:''}.`);
  else if(e.action==='season')add(e,`Add ${Number.isFinite(e.amount)?number(e.amount)+'g ':''}${title(ingredientId(e.seasoning))} to ${who}${Number.isFinite(e.amount)?'':'; the amount was not recorded'}.`);
  else if(e.action==='combine')add(e,`Place ${who}${where||' into the recorded mixture'}${e.with?.length?' with '+e.with.map(title).join(', '):''}.`);
  else if(e.action==='mix')add(e,`Mix ${who}${where}.`);
  else if(e.action==='marinate')add(e,`Marinate ${who}${where}${Number.isFinite(e.rested)?`; recorded resting time ${number(e.rested)} game seconds`:''}.`);
  else if(e.action==='stir'||e.action==='flip')add(e,`${e.action==='flip'?'Turn':'Stir'} ${who}${where}.`);
  else if(e.action==='cook'){
   const method=METHODS[e.method]?.name||e.method||'Heat',temp=Number.isFinite(e.setpoint)?` set to ${Math.round(e.setpoint)}°C`:' (setting not recorded)',actual=Number.isFinite(e.minHeat)?`; actual heat ${Math.round(e.minHeat)}–${Math.round(e.maxHeat)}°C`:'';
   add(e,`${method} ${who}${where}${e.station?` at ${STATION_BY_ID[e.station]?.name||e.station}`:''}${temp} for ${number(e.duration)} game seconds${actual}. ${e.method==='defrost'?'Thawing progress': 'Doneness'} ${number(e.startCook)}% → ${number(e.endCook)}%${Number.isFinite(e.endCore)?`; ingredient temperature ${Math.round(e.endCore)}°C`:''}.`);
  }else if(e.action==='plate')add(e,`Plate ${who}${where}.`);
  else if(e.action==='arrange')add(e,`Arrange ${who} on the serving vessel.`);
  else if(e.action==='position')add(e,`Position ${who} at ${number(e.x*100)}% across and ${number(e.y*100)}% down the plate.`);
 }
 // Final states support a factual summary, but cannot establish chronology or unrecorded actions.
 for(const f of foods)if(!f.history.some(e=>e.action==='cook')&&f.method)unknown.push(`${title(f.ingredient)}: final recorded method ${METHODS[f.method]?.name||f.method}; equipment, heat setting, duration and cooking order are unknown.`);
 if(!steps.length)unknown.push('No chronological preparation method was recorded. Use the ingredient states as a partial reference.');
 const total=ingredients.reduce((sum,i)=>sum+(i.amount||0),0),added=additions.filter(a=>a.unit==='g').reduce((s,a)=>s+a.amount,0);
 return {version:1,name,serving:{vessel:plate.type?EQUIPMENT[plate.type]?.name||plate.type:null,count:1,baseGrams:total,additionGrams:added,completeMass:ingredients.every(i=>i.amount!==null)&&additions.every(i=>i.unit==='g'),condition:plate.servingCondition||'auto',servedAt},ingredients,additions,media:[...media.values()].map(m=>({...m,name:m.id==='water'?'Water':title(m.id)})),steps,unknown:[...new Set(unknown)],notes:['Quantities describe the ingredients used. Water uptake, cooking loss and absorbed frying oil are not measured. Timings use the game clock.']};
}
export function creationRecipe(c){return c.dish?.recipeRecord?{...c.dish.recipeRecord,name:c.name}:reconstructRecipe(c.dish?.ingredients||[],{name:c.name});}
