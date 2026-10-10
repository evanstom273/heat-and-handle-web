import {FOODS,EQUIPMENT,STATIONS,STATION_BY_ID,RECIPES,PREPS,METHODS,clamp,objectName} from './catalog.mjs';
import {judgeFreeform,judgeOrder} from './judging.mjs';
import {DOSES,ingredientId,creationRecipe} from './recipe.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
export class Kitchen {
 constructor(){this.reset('free');this.status='menu';}
 reset(mode='free'){
  this.version=2;this.sequence=0;this.eventSequence=0;this.objects={};this.station='board';this.selected=null;this.hand=null;this.elapsed=0;this.serviceElapsed=0;this.duration=360;this.mode=mode;this.status='playing';this.money=0;this.served=0;this.missed=0;this.waste=0;this.ratings=[];this.orders=[];this.orderSequence=0;this.nextRecipe=1;this.nextOrderAt=60;this.pinnedRecipe=null;this.customRecipe=null;this.selectedOrder=null;this.events=[];this.lastResult=null;this.surfaces=Object.fromEntries(STATIONS.map(s=>[s.id,{dirt:0,contamination:0}]));
  this.appliances={hob:{burners:Array.from({length:6},()=>({heat:0,temperature:20}))},grill:{enabled:false,setpoint:200,temperature:20,mode:'grill'},fryer:{enabled:false,setpoint:180,temperature:20,mode:'deep-fry'},oven:{enabled:false,setpoint:180,temperature:20,mode:'bake',door:true},microwave:{enabled:false,setpoint:95,temperature:20,mode:'reheat',duration:30,remaining:0,door:true}};
  ['pan','pan','saucepan','stockpot'].forEach((type,i)=>this.spawnEquipment(type,'hob',{x:.2+(i%3)*.3,y:.2+Math.floor(i/3)*.6},i));
  const rack=this.spawnEquipment('tray','grill',{x:.5,y:.5},0);rack.fixed=true;rack.type='tray';rack.label='Griddle surface';rack.method='grill';
  for(let i=0;i<2;i++)this.spawnEquipment('basket','fryer',{x:.25+i*.5,y:.5},i);
  this.spawnEquipment('tray','oven',{x:.4,y:.5},0);this.spawnEquipment('plate','plate',{x:.5,y:.6});this.spawnEquipment('bowl','prep2',{x:.65,y:.25});this.spawnEquipment('mixing','pastry',{x:.25,y:.5});
  for(const [type,station,pos]of [['knife','board',{x:.82,y:.45}],['knife','prep2',{x:.2,y:.4}],['spoon','hob',{x:.96,y:.5}],['spatula','grill',{x:.93,y:.4}],['whisk','pastry',{x:.7,y:.5}],['rollingpin','pastry',{x:.6,y:.8}]])this.spawnEquipment(type,station,pos);
  if(mode==='service'){const o=this.addOrder('garden');this.selectedOrder=o.id;}
 }
 get hygiene(){return Math.round(100-Object.values(this.surfaces).reduce((s,v)=>s+v.dirt,0)/Math.max(1,Object.values(this.surfaces).filter(s=>s.dirt>0).length));}
 uid(){return 'obj_'+(++this.sequence);}
 spawnEquipment(type,station,pos={x:.5,y:.5},slot=null){if(!EQUIPMENT[type])throw new Error('Unknown equipment');const d=EQUIPMENT[type],o={uid:this.uid(),kind:d.tool?'tool':'vessel',type,items:[],loc:{station,...pos,...(slot!==null?{slot}:{})},dirty:0,contamination:0,fluid:null,oil:false,method:d.methods?.[0]||null,mixed:false,basketDown:false,media:[],servingCondition:'auto'};this.objects[o.uid]=o;return o;}
 spawnFood(id,source){const d=FOODS[id],f={uid:this.uid(),kind:'food',ingredient:id,amount:d.weight,loc:{hand:true},prep:'whole',prepTask:null,prepCount:0,cook:0,temperature:source==='freezer'?-18:source==='fridge'?4:20,maxTemperature:20,safeTime:0,frozen:source==='freezer'?1:0,storage:source||d.source,freshness:100,quality:100,contamination:0,season:{salt:0,pepper:0},additions:[],doses:[],recordingVersion:3,history:[],activeCook:null,method:null,flipped:false,stirred:false,mixed:false,hydrated:false,dryTime:0,marinated:0,createdAt:this.elapsed};this.objects[f.uid]=f;this.remember(f,'supply',{source,amount:f.amount});return f;}
 root(o){let item=typeof o==='string'?this.objects[o]:o;const seen=new Set();while(item?.loc?.container){if(seen.has(item.uid))return null;seen.add(item.uid);item=this.objects[item.loc.container];}return item;}
 stationOf(o){const root=this.root(o);return root?.loc?.hand?this.station:root?.loc?.station;}
 accessible(o){return !!o&&this.stationOf(o)===this.station;}
 contents(o){return o?.kind==='food'?[o]:(o?.items||[]).map(id=>this.objects[id]).filter(f=>f?.kind==='food');}
 at(station=this.station){return Object.values(this.objects).filter(o=>o.loc?.station===station);}
 remember(f,action,details={}){if(action!=='cook')f.activeCook=null;const parent=f.loc?.container?this.objects[f.loc.container]:null;const sequence=++this.eventSequence;const event={at:Math.round(this.elapsed*100)/100,sequence,eventId:'event_'+sequence,action,...(parent?{equipment:parent.type,equipmentName:parent.label||EQUIPMENT[parent.type]?.name,vesselUid:parent.uid,media:clone(parent.media||[])}:{}),...details};f.history??=[];f.history.push(event);if(f.history.length>400){f.history.shift();f.historyTruncated=true;}return event;}
 recordHeat(f,v,heat,dt,beforeCook){
  if(!heat.cooking){f.activeCook=null;return;}
  const ap=this.appliances[v.loc.station],setpoint=v.loc.station==='hob'?[20,120,180,250][ap.burners[v.loc.slot].heat]:ap?.setpoint;
  const signature=[v.uid,heat.method,setpoint].join(':');let e=f.history.find(e=>e.eventId===f.activeCook);
  if(!e||e.signature!==signature){e=this.remember(f,'cook',{at:Math.round((this.elapsed-dt)*100)/100,signature,method:heat.method,station:v.loc.station,equipment:v.type,equipmentName:v.label||EQUIPMENT[v.type]?.name,burner:v.loc.slot,setpoint,duration:0,minHeat:heat.temperature,maxHeat:heat.temperature,startCook:beforeCook,endCook:f.cook,endCore:f.temperature,media:clone(heat.method==='deep-fry'?[...(v.media||[]),{eventId:'fryer-oil',id:'oil',amount:null,unit:'g',equipment:'deep fryer'}]:(v.media||[]))});f.activeCook=e.eventId;}
  e.duration=Math.round((e.duration+dt)*10000)/10000;e.minHeat=Math.min(e.minHeat,heat.temperature);e.maxHeat=Math.max(e.maxHeat,heat.temperature);e.endCook=Math.round(f.cook*100)/100;e.endCore=f.temperature;
 }
 detach(o){if(o.loc?.container){const p=this.objects[o.loc.container];if(p)p.items=p.items.filter(id=>id!==o.uid);}if(this.hand===o.uid)this.hand=null;}
 contaminationContact(o,station){const surface=this.surfaces[station];if(!surface)return;const contact=o.kind==='vessel'?o:surface;const foods=this.contents(o);if(foods.some(f=>FOODS[f.ingredient].hazard&&f.safeTime<2))contact.contamination=Math.max(contact.contamination,65);if(o.kind==='vessel'){if(!EQUIPMENT[o.type]?.serve)o.dirty=clamp(o.dirty+3,0,100);}else surface.dirt=clamp(surface.dirt+5,0,100);for(const f of foods){if(contact.contamination*.7>f.contamination)f.contaminationSource=o.kind==='vessel'?'contact with raw food or contamination in '+(EQUIPMENT[o.type]?.name||o.type):'contact with '+(STATION_BY_ID[station]?.name||station);f.contamination=Math.max(f.contamination,contact.contamination*.7);}}
 addOrder(recipeId){const r=RECIPES.find(r=>r.id===recipeId)||RECIPES[0],o={id:++this.orderSequence,recipeId:r.id,remaining:r.time,total:r.time};this.orders.push(o);return o;}
 recipe(){if(this.mode==='service'){const o=this.orders.find(o=>o.id===this.selectedOrder)||this.orders[0];return o?RECIPES.find(r=>r.id===o.recipeId):null;}if(this.pinnedRecipe==='custom')return this.customRecipe;return RECIPES.find(r=>r.id===this.pinnedRecipe)||null;}
 fail(message){return {ok:false,message};}ok(message,other={}){return {ok:true,message,...other};}
 locationFree(station,x,y){return {station,x:clamp(x??.5,.035,.965),y:clamp(y??.5,.035,.965)};}
 currentVessel(){const s=this.objects[this.selected];return s?.kind==='vessel'?s:this.at().find(o=>o.kind==='vessel')||null;}
 action(type,a={}){
  if(type==='resume'){if(this.status==='paused'||this.status==='menu')this.status='playing';return this.ok('Kitchen resumed.');}
  if(type==='pause'){this.status='paused';return this.ok('Kitchen paused.');}
  if(this.status!=='playing')return this.fail('Resume your kitchen first.');
  const o=this.objects[a.uid??this.selected],held=this.objects[this.hand],station=STATION_BY_ID[this.station];
  if(type==='switch-mode'){
   if(!['free','service','practice'].includes(a.mode))return this.fail('Choose Free Cook, recipe practice or dinner service.');this.mode=a.mode;
   if(a.mode==='service'&&!this.orders.length){this.serviceElapsed=0;this.nextOrderAt=60;const order=this.addOrder('garden');this.selectedOrder=order.id;}
   if(a.mode==='free')this.pinnedRecipe=null;
   if(a.mode==='practice'&&!this.pinnedRecipe)this.pinnedRecipe='garden';return this.ok('Mode changed. Everything in your kitchen stays where it is.');
  }
  if(type==='select'){if(!this.accessible(o))return this.fail('Walk to the item’s station first.');this.selected=o.uid;return this.ok(`${objectName(o)} selected.`);}
  if(type==='take-supply'){
   if(this.hand)return this.fail('Put down the item in your hands first.');const d=FOODS[a.id];if(!d)return this.fail('Unknown ingredient.');if(station.kind!=='supply')return this.fail('Visit the pantry, fridge or freezer.');
   if(this.station!=='freezer'&&d.source!==this.station)return this.fail(`Find this ingredient in the ${d.source==='fridge'?'refrigerator':'dry pantry'}.`);
   if(this.station==='freezer'&&!['Meat & seafood','Vegetables','Fruit','Dairy & eggs'].includes(d.category))return this.fail('This ingredient is not stocked in the freezer.');
   if(Object.keys(this.objects).length>=700)return this.fail('The kitchen is full. Use or discard some items.');const f=this.spawnFood(a.id,this.station);this.hand=f.uid;this.selected=f.uid;return this.ok(`Picked up ${d.name.toLowerCase()}.`);
  }
  if(type==='get-equipment'){
   if(this.station!=='storage')return this.fail('Visit cookware and tool storage.');if(this.hand)return this.fail('Your hands are full.');if(!EQUIPMENT[a.type])return this.fail('Unknown equipment.');if(Object.keys(this.objects).length>=700)return this.fail('The kitchen is full.');const eq=this.spawnEquipment(a.type,'storage');eq.loc={hand:true};this.hand=eq.uid;this.selected=eq.uid;return this.ok(`Picked up ${EQUIPMENT[a.type].name.toLowerCase()}.`);
  }
  if(type==='pick-up'){
   if(this.hand)return this.fail('Your hands are full.');if(!this.accessible(o))return this.fail('Select an item at this station.');if(o.fixed)return this.fail('This cooking surface stays at its station.');
   if(this.stationOf(o)==='oven'&&!this.appliances.oven.door)return this.fail('Open the oven door first.');
   this.detach(o);o.loc={hand:true};this.hand=o.uid;this.selected=o.uid;if(o.type==='basket')o.basketDown=false;return this.ok(`Carrying ${objectName(o).toLowerCase()}.`);
  }
  if(type==='place'){
   if(!held)return this.fail('Pick up something first.');if(['pass','bin'].includes(station.kind)&&station.id!=='pass')return this.fail('Use Discard to empty your hands.');
   if(station.kind==='appliance'&&held.kind==='vessel'){
    if(this.station==='hob'&&!['pan','saucepan','stockpot','steamer'].includes(held.type))return this.fail('Use a pan, saucepan, stockpot or steamer on a burner.');
    if(this.station==='fryer'&&held.type!=='basket')return this.fail('The fryer takes removable baskets.');
    if(this.station==='oven'&&!['tray','pan','saucepan'].includes(held.type))return this.fail('Use an oven-safe tray or metal pan.');
    if(this.station==='oven'&&!this.appliances.oven.door)return this.fail('Open the oven door before placing cookware.');
    if(this.station==='microwave'&&!['plate','bowl','mixing','saucebowl'].includes(held.type))return this.fail('Use a ceramic plate or bowl in the microwave. Metal cookware stays out.');
    if(this.station==='grill')return this.fail('Add food directly to the griddle surface.');
    const limit=this.station==='hob'?6:this.station==='fryer'||this.station==='oven'?2:1;
    let slot=Number.isInteger(a.slot)?a.slot:Array.from({length:limit},(_,i)=>i).find(i=>!this.at().some(x=>x.kind==='vessel'&&x.loc.slot===i));
    if(slot===undefined||slot<0||slot>=limit||this.at().some(x=>x.kind==='vessel'&&x.loc.slot===slot))return this.fail('That cooking position is occupied. Lift the cookware first.');
    held.loc={station:this.station,slot,x:.2+(slot%3)*.3,y:.25+Math.floor(slot/3)*.5};
   }else{if(station.kind==='appliance'&&held.kind==='food')return this.fail('Select cookware and use Add held food.');if(!station.surface&&station.kind!=='supply')return this.fail('There is no work surface here.');held.loc=this.locationFree(this.station,a.x,a.y);}
   this.hand=null;this.contaminationContact(held,this.station);this.selected=held.uid;return this.ok('Placed on the workspace.');
  }
  if(type==='move'){
   if(!this.accessible(o)||o.loc.hand||o.loc.container||o.fixed||station.kind==='appliance')return this.fail('Select a loose item on a counter to reposition it.');o.loc=this.locationFree(this.station,a.x,a.y);return this.ok('Item repositioned.');
  }
  if(type==='add-held'||type==='transfer'){
   const target=this.objects[a.target??this.selected],source=this.objects[a.source??this.hand];if(!target||target.kind!=='vessel'||!this.accessible(target))return this.fail('Select a pan, pot, bowl, tray or plate at this station.');if(!source||!this.accessible(source))return this.fail('Pick up food or choose a source vessel.');if(target.uid===source.uid)return this.fail('Choose a different vessel.');
   const foods=this.contents(source);if(!foods.length)return this.fail('There is no food to transfer.');if(target.items.length+foods.length>EQUIPMENT[target.type].capacity)return this.fail('That vessel is full. Use another one.');
   if((this.stationOf(target)==='oven'||this.stationOf(source)==='oven')&&!this.appliances.oven.door)return this.fail('Open the oven door first.');
   for(const f of foods){this.detach(f);f.loc={container:target.uid};target.items.push(f.uid);f.contamination=Math.max(f.contamination,target.contamination*.8);if(EQUIPMENT[target.type].serve){const i=target.items.length-1;f.platePos={x:.3+(i%3)*.2,y:.3+Math.floor(i/3)*.2};this.remember(f,'plate',{equipment:target.type});}else this.remember(f,'combine',{vessel:target.type,with:target.items.filter(id=>id!==f.uid).map(id=>this.objects[id].ingredient)});}
   this.contaminationContact(target,this.station);this.selected=target.uid;return this.ok('Ingredients combined. Each keeps its own cooking state.');
  }
  if(type==='prepare'){
   if(station.kind!=='prep')return this.fail('Use a preparation counter or pastry bench.');if(!o||o.kind!=='food'||!this.accessible(o)||o.loc.container||o.loc.hand)return this.fail('Put an ingredient on the counter and select it.');const p=PREPS[a.method],d=FOODS[o.ingredient];if(!p)return this.fail('Choose a preparation method.');if(!(d.prep||[]).includes(a.method)&&!(a.method==='roll'&&['dough','bread'].includes(o.ingredient)))return this.fail('That preparation does not suit this ingredient.');
   const toolType=a.method==='roll'?'rollingpin':'knife';const tool=this.at().find(t=>t.type===toolType)||(held?.type===toolType?held:null);if(!tool)return this.fail(`Bring a ${EQUIPMENT[toolType].name.toLowerCase()} from storage.`);
   if(o.prepTask!==a.method){o.prepTask=a.method;o.prepCount=0;}o.prepCount++;o.contamination=Math.max(o.contamination,tool.contamination*.8,this.surfaces[this.station].contamination*.8);if(d.hazard&&o.safeTime<2){tool.contamination=65;this.surfaces[this.station].contamination=65;}tool.dirty=clamp(tool.dirty+3,0,100);this.surfaces[this.station].dirt=clamp(this.surfaces[this.station].dirt+1.5,0,100);
   if(o.prepCount>=p.cuts){o.prep=p.result;o.prepTask=null;o.prepCount=0;this.remember(o,a.method,{tool:toolType});return this.ok(`${d.name} ${p.result}.`);}return this.ok(`${p.label} ${o.prepCount}/${p.cuts}.`);
  }
  if(type==='season'){
   const target=o||held,foods=this.contents(target);if(!this.accessible(target)||!foods.length)return this.fail('Select food or a vessel containing food.');if(!['salt','pepper','paprika','cumin','chilli','garlic','lemon','oil','butter','cream','soy'].includes(a.seasoning))return this.fail('Choose an available seasoning.');
   const key=a.seasoning;if(foods.every(f=>(f.season[key]||0)>=5))return this.fail('That seasoning is already at its maximum.');for(const f of foods){if((f.season[key]||0)>=5)continue;f.season[key]=clamp((f.season[key]||0)+1,0,5);if(!['salt','pepper'].includes(key))f.additions.push({id:key,amount:1});if(key==='soy')f.season.salt=clamp(f.season.salt+.7,0,5);const amount=Math.round(DOSES[key]*f.amount)/100;const e=this.remember(f,'season',{seasoning:key,amount});(f.doses??=[]).push({id:ingredientId(key),amount,unit:'g',eventId:e.eventId});}if(target.kind==='vessel'&&['oil','butter'].includes(a.seasoning))target.oil=true;return this.ok(`Added ${a.seasoning}.`);
  }
  if(type==='mix'||type==='marinate'||type==='stir'||type==='flip'){
   const target=o?.kind==='food'&&o.loc.container?this.objects[o.loc.container]:o,foods=this.contents(target);if(!this.accessible(target)||!foods.length)return this.fail('Select food or a filled vessel.');
   if(type==='flip'){const flipFoods=o.kind==='food'?[o]:foods;for(const f of flipFoods){if(f.cook>=25){f.flipped=true;this.remember(f,'flip');}}return this.ok('Turned the food.');}
   if(type==='mix'){
    if(target.kind!=='vessel')return this.fail('Combine ingredients in a bowl or cookware to mix them.');target.mixed=true;const moist=foods.some(f=>['liquid','cream','protein','fruit','fat','sauce'].includes(FOODS[f.ingredient].role))||target.fluid==='water';const meanSalt=foods.reduce((s,f)=>s+f.season.salt*f.amount,0)/foods.reduce((s,f)=>s+f.amount,0);for(const f of foods){f.mixed=true;f.hydrated=f.hydrated||moist;f.season.salt=meanSalt;this.remember(f,'mix');}return this.ok('Mixed together. Each ingredient is still tracked.');
   }
   for(const f of foods){if(type==='stir')f.stirred=true;else f.marinating=true;const e=this.remember(f,type);if(type==='marinate'){e.rested=0;f.activeMarinade=e.eventId;}}return this.ok(type==='stir'?'Gently stirred.':'Marinating. Flavours develop while you work elsewhere.');
  }
  if(type==='fluid'){
   if(!o||o.kind!=='vessel'||!this.accessible(o))return this.fail('Select cookware first.');if(!['water','oil','empty'].includes(a.fluid))return this.fail('Choose water or oil.');if(a.fluid==='water'&&!['stockpot','saucepan','steamer','mixing','bowl'].includes(o.type))return this.fail('Use a pot or bowl for water.');o.fluid=a.fluid==='empty'?null:a.fluid==='water'?'water':o.fluid;if(a.fluid==='oil')o.oil=true;if(a.fluid==='empty'){o.oil=false;o.media=[];}else{const sequence=++this.eventSequence;(o.media??=[]).push({eventId:'medium_'+sequence,sequence,id:a.fluid==='oil'?'oil':'water',amount:a.fluid==='oil'?10:300,unit:a.fluid==='oil'?'g':'ml',vesselUid:o.uid,equipment:o.type,at:this.elapsed});for(const f of this.contents(o))this.remember(f,'medium-change');}return this.ok(a.fluid==='empty'?'Vessel emptied.':`Added ${a.fluid}.`);
  }
  if(type==='method'){
   if(!o||o.kind!=='vessel'||!this.accessible(o)||(EQUIPMENT[o.type].methods||[]).includes(a.method)===false)return this.fail('Choose a method suitable for this vessel.');o.method=a.method;return this.ok(`${METHODS[a.method].name} selected.`);
  }
  if(type==='burner'){
   if(this.station!=='hob'||!Number.isInteger(a.slot)||a.slot<0||a.slot>5||!Number.isInteger(a.heat)||a.heat<0||a.heat>3)return this.fail('Choose a burner and heat from off to high.');this.appliances.hob.burners[a.slot].heat=a.heat;return this.ok(`Burner ${a.slot+1}: ${['off','low','medium','high'][a.heat]}.`);
  }
  if(type==='appliance'){
   const ap=this.appliances[this.station];if(!ap||this.station==='hob')return this.fail('Visit the appliance first.');
   if(a.setting==='power'){if(this.station==='microwave'&&a.value&&!this.at().some(o=>o.kind==='vessel'&&o.items.length))return this.fail('Put food in a microwave-safe plate or bowl first.');ap.enabled=!!a.value;if(this.station==='microwave'&&ap.enabled){ap.remaining=ap.duration;ap.door=false;}}
   else if(a.setting==='temperature'){const n=Number(a.value),limits=this.station==='fryer'?[120,210]:this.station==='oven'?[80,250]:this.station==='grill'?[80,280]:[40,100];if(!Number.isFinite(n)||n<limits[0]||n>limits[1])return this.fail(`Use a temperature from ${limits[0]} to ${limits[1]}°C.`);ap.setpoint=n;}
   else if(a.setting==='door'){ap.door=!!a.value;if(ap.door&&this.station==='microwave')ap.enabled=false;}
   else if(a.setting==='mode'){const allowed=this.station==='oven'?['bake','roast']:this.station==='microwave'?['reheat','defrost']:[];if(!allowed.includes(a.value))return this.fail('Unsupported mode.');ap.mode=a.value;}
   else if(a.setting==='duration'){if(this.station!=='microwave'||!Number.isFinite(a.value)||a.value<10||a.value>120)return this.fail('Set 10–120 seconds.');ap.duration=a.value;}
   else return this.fail('Unknown appliance control.');return this.ok('Appliance setting updated.');
  }
  if(type==='basket'){
   if(!o||o.type!=='basket'||o.loc.station!=='fryer'||this.station!=='fryer')return this.fail('Select a basket sitting in the fryer.');o.basketDown=!o.basketDown;return this.ok(o.basketDown?'Basket lowered into the oil.':'Basket lifted clear of the oil.');
  }
  if(type==='serving-condition'){if(!o||!EQUIPMENT[o.type]?.serve||!this.accessible(o)||!['auto','hot','room','chilled'].includes(a.value))return this.fail('Choose a serving condition for a plate or bowl.');o.servingCondition=a.value;return this.ok('Serving condition recorded.');}
  if(type==='arrange'){
   if(!o||!EQUIPMENT[o.type]?.serve||!this.accessible(o))return this.fail('Select a serving plate or bowl.');this.contents(o).forEach((f,i,arr)=>{const rad=arr.length===1?0:.28;f.platePos={x:.5+Math.cos(i/arr.length*Math.PI*2)*rad,y:.5+Math.sin(i/arr.length*Math.PI*2)*rad};this.remember(f,'arrange');});return this.ok('Plate arranged.');
  }
  if(type==='plate-position'){
   if(!o||o.kind!=='food'||!o.loc.container||!EQUIPMENT[this.objects[o.loc.container]?.type]?.serve||!this.accessible(o))return this.fail('Select food on a serving plate.');o.platePos={x:clamp(a.x,.1,.9),y:clamp(a.y,.1,.9)};this.remember(o,'position',o.platePos);return this.ok('Plating adjusted.');
  }
  if(type==='wash'){
   if(station.kind!=='wash')return this.fail('Take the item to a washing station.');const item=held||o;if(a.surfaces){for(const s of Object.values(this.surfaces)){s.dirt=0;s.contamination=0;}for(const t of Object.values(this.objects))if(t.kind==='tool'){t.dirty=0;t.contamination=0;}return this.ok('Work surfaces and preparation tools cleaned.');}
   if(!item||item.kind==='food'||!this.accessible(item))return this.fail('Carry or select a utensil or empty vessel.');if(item.items?.length)return this.fail('Remove the food before washing the vessel.');item.dirty=0;item.contamination=0;item.fluid=null;item.oil=false;item.media=[];return this.ok('Clean and ready to use.');
  }
  if(type==='discard'){
   if(this.station!=='bin')return this.fail('Take unwanted food to the rubbish bin.');if(!held)return this.fail('Carry the food you want to discard.');const foods=this.contents(held);this.waste+=foods.length;for(const f of foods)delete this.objects[f.uid];if(held.kind==='food'){this.hand=null;this.selected=null;}else{held.items=[];held.dirty=40;}return this.ok('Food discarded. Cookware kept.');
  }
  if(type==='pin-recipe'){
   if(a.id===null){this.pinnedRecipe=null;this.customRecipe=null;return this.ok('Recipe unpinned. Cook whatever you like.');}
   if(!RECIPES.some(r=>r.id===a.id))return this.fail('Recipe not found.');this.pinnedRecipe=a.id;return this.ok('Recipe pinned as a reference.');
  }
  if(type==='pin-creation'){
   if(!a.creation?.dish?.ingredients?.length)return this.fail('That creation is unavailable.');const c=a.creation,ingredients=c.dish.ingredients.filter(i=>FOODS[i.id]),total=ingredients.reduce((sum,i)=>sum+i.amount,0)||1,seasoning=key=>Math.round(ingredients.reduce((sum,i)=>sum+(i.season[key]||0)*i.amount,0)/total*10)/10;this.customRecipe={id:'custom',name:c.name,items:ingredients.map(i=>({id:i.id,method:i.method,prep:i.prep,cut:i.prep!=='whole'})),salt:seasoning('salt'),pepper:seasoning('pepper'),price:20,steps:ingredients.map(i=>`${i.amount}g ${i.prep!=='whole'?i.prep+' ':''}${i.name}: ${i.method?METHODS[i.method]?.name||i.method:'serve fresh'}${i.method?' to about '+i.cook+'%':''}. ${i.mixed?'Mix with the other components. ':''}${Object.entries(i.season).filter(([,v])=>v>0).map(([key,value])=>key+' '+Math.round(value*10)/10).join(', ')}${i.marinated?' · marinate about '+i.marinated+' seconds':''}.`)};this.customRecipe.steps=creationRecipe(c).steps.map(s=>s.text).concat(creationRecipe(c).unknown);this.pinnedRecipe='custom';return this.ok('Your creation is pinned with its original preparation notes.');
  }
  if(type==='select-order'){if(!this.orders.some(o=>o.id===a.id))return this.fail('That order is no longer open.');this.selectedOrder=a.id;return this.ok('Ticket selected.');}
  if(type==='serve'){
   if(this.station!=='pass')return this.fail('Bring your dish to the service pass.');const plate=held?.kind==='vessel'&&EQUIPMENT[held.type].serve?held:o?.kind==='vessel'&&EQUIPMENT[o.type].serve&&this.accessible(o)?o:null;if(!plate)return this.fail('Serve food on a plate, bowl or sauce bowl.');const foods=this.contents(plate);if(!foods.length)return this.fail('The serving vessel is empty.');const recipe=this.recipe();if(this.mode!=='free'&&!recipe)return this.fail('Select an order or a practice recipe first.');
   const result=this.mode==='free'?judgeFreeform(foods,plate,{hygiene:this.hygiene}):judgeOrder(foods,plate,recipe,{hygiene:this.hygiene});result.mode=this.mode;result.createdAt=new Date().toISOString();result.id='dish_'+Date.now().toString(36)+'_'+this.served;result.earned=result.unsafe?0:Math.round((recipe&&this.mode!=='free'?recipe.price:10+foods.length*2)*result.score)/100;result.tip=!result.unsafe&&result.score>=90?Math.round(result.earned*.2*100)/100:0;
   this.money+=result.earned+result.tip;this.served++;this.ratings.push(result.score);this.lastResult=result;
   for(const f of foods)delete this.objects[f.uid];plate.items=[];plate.dirty=45;plate.loc=this.locationFree('pass',.5,.2+(this.served%4)*.18);this.hand=null;this.selected=plate.uid;
   if(this.mode==='service'){const order=this.orders.find(o=>o.id===this.selectedOrder)||this.orders[0];this.orders=this.orders.filter(o=>o.id!==order?.id);if(this.orders.length<2&&this.serviceElapsed<this.duration-25)this.addOrder(RECIPES[this.nextRecipe++%RECIPES.length].id);this.selectedOrder=this.orders[0]?.id;this.nextOrderAt=this.serviceElapsed+70;}
   return this.ok(result.title,{result});
  }
  return this.fail('Unknown kitchen action.');
 }
 heatFor(v){
  if(v?.kind!=='vessel'||!v.loc?.station)return {temperature:20,method:null,cooking:false};const station=v.loc.station,ap=this.appliances[station];if(!ap)return {temperature:station==='fridge'?4:station==='freezer'?-18:20,method:null,cooking:false};
  if(station==='hob'){const b=ap.burners[v.loc.slot];if(!b)return {temperature:20,method:null,cooking:false};const wet=['boil','simmer','steam'].includes(v.method);return {temperature:wet&&v.fluid==='water'?Math.min(b.temperature,v.method==='simmer'?92:100):b.temperature,method:v.method,cooking:b.temperature>60,hydrated:wet&&v.fluid==='water',dryBoil:wet&&v.fluid!=='water'};}
  if(station==='fryer')return {temperature:v.basketDown?ap.temperature:20,method:'deep-fry',cooking:v.basketDown&&ap.temperature>70};
  if(station==='oven')return {temperature:ap.door?20:ap.temperature,method:ap.mode,cooking:!ap.door&&ap.temperature>65};
  if(station==='microwave')return {temperature:ap.enabled?(ap.mode==='defrost'?28:95):20,method:ap.mode,cooking:ap.enabled};
  return {temperature:ap.temperature,method:ap.mode,cooking:ap.temperature>65};
 }
 tick(dt){
  if(this.status!=='playing')return;dt=Math.min(.25,Math.max(0,dt));this.elapsed+=dt;
  for(const b of this.appliances.hob.burners){const target=[20,120,180,250][b.heat];b.temperature+=(target-b.temperature)*Math.min(1,dt*(b.heat?.3:.12));}
  for(const [id,ap]of Object.entries(this.appliances)){if(id==='hob')continue;const target=ap.enabled?ap.setpoint:20;ap.temperature+=(target-ap.temperature)*Math.min(1,dt*.2);if(id==='microwave'&&ap.enabled){ap.remaining-=dt;if(ap.remaining<=0){ap.remaining=0;ap.enabled=false;this.events.push({type:'ready',text:'Microwave finished.'});}}}
  for(const f of Object.values(this.objects).filter(o=>o.kind==='food')){
   const beforeCook=f.cook,root=this.root(f),station=root?.loc?.hand?null:root?.loc?.station,parent=f.loc.container?this.objects[f.loc.container]:null,heat=this.heatFor(parent),d=FOODS[f.ingredient],cold=station==='fridge'||station==='freezer';
   f.storage=cold?station:'counter';let ambient=cold?(station==='freezer'?-18:4):heat.cooking?Math.min(98,heat.temperature-4):20;
   if(heat.method==='defrost'&&heat.cooking)ambient=28;
   if(f.frozen>0&&ambient>0){f.frozen=Math.max(0,f.frozen-dt*(heat.method==='defrost'?.065:.009*(ambient>60?2:1)));ambient=Math.min(ambient,2);}
   if(station==='freezer'){f.frozen=Math.min(1,f.frozen+dt*.01);ambient=-18;}
   f.temperature+=(ambient-f.temperature)*Math.min(1,dt*(heat.cooking?.32:cold?.04:.012));f.maxTemperature=Math.max(f.maxTemperature,f.temperature);
   const rawContact=parent?.contamination||0;if(f.safeTime<2)f.contamination=Math.max(f.contamination,rawContact*.65);
   if(heat.cooking&&heat.method!=='defrost'&&f.frozen<.15&&f.temperature>45){
    const group=this.contents(parent),batter=parent.mixed&&group.some(x=>FOODS[x.ingredient].requiresMix);let baseTime=batter?30:d.time;
    const factor=heat.method==='reheat'?.16:['boil','simmer','steam'].includes(heat.method)?(heat.hydrated?1:.6):(heat.temperature-45)/125;
    const size=f.prep==='whole'&&d.prep?.length ? .82 : ['minced','diced'].includes(f.prep)?1.22:1;
    f.cook+=dt/Math.max(5,baseTime)*100*Math.max(0,factor)*(METHODS[heat.method]?.rate||1)*size;
    if(heat.method!=='reheat'||!f.method)f.method=heat.method;f.hydrated=f.hydrated||heat.hydrated;
    if(f.temperature>=(d.safe||60))f.safeTime+=dt;
    if(f.temperature>=70){f.contamination=Math.max(0,f.contamination-dt*18);parent.contamination=Math.max(0,parent.contamination-dt*18);}
    if(['pan-fry','saute','sear','grill'].includes(heat.method)&&!parent.oil&&!group.some(x=>FOODS[x.ingredient].role==='fat'||(x.season?.oil||0)>0||(x.season?.butter||0)>0))f.dryTime+=dt;
    if(f.cook>=75&&!f.readyNotified){this.events.push({type:'ready',text:`${d.name} is ready at ${STATION_BY_ID[station]?.name||'the heat'}.`});f.readyNotified=true;}
    if(f.cook>135&&!f.burnNotified){this.events.push({type:'burn',text:`${d.name} is burning!`});f.burnNotified=true;}
   }
   if(f.marinating&&!heat.cooking&&(f.additions.length||f.doses?.length)){f.marinated+=dt;const e=f.history.find(e=>e.eventId===f.activeMarinade);if(e)e.rested=(e.rested||0)+dt;}if(heat.cooking)f.marinating=false;
   this.recordHeat(f,parent,heat,dt,beforeCook);
   const decay=d.perishable*(station==='freezer'?.02:station==='fridge'?.12:f.temperature>45?.5:1);f.freshness=Math.max(0,f.freshness-decay*dt);
  }
  if(this.mode==='service'){
   this.serviceElapsed+=dt;for(const o of this.orders)o.remaining-=dt;
   const expired=this.orders.filter(o=>o.remaining<=0);for(const o of expired){this.missed++;this.events.push({type:'missed',text:`Table ${o.id} left. Keep going, chef.`});}this.orders=this.orders.filter(o=>o.remaining>0);
   if(!this.orders.some(o=>o.id===this.selectedOrder))this.selectedOrder=this.orders[0]?.id;
   if(this.serviceElapsed>=this.nextOrderAt&&this.orders.length<3){const o=this.addOrder(RECIPES[this.nextRecipe++%RECIPES.length].id);this.nextOrderAt=this.serviceElapsed+75;this.selectedOrder??=o.id;this.events.push({type:'order',text:`New ticket: ${RECIPES.find(r=>r.id===o.recipeId).name}`});}
   if(this.serviceElapsed>=this.duration){this.status='paused';this.events.push({type:'finished'});}
  }
 }
 snapshot(){return clone({version:2,sequence:this.sequence,eventSequence:this.eventSequence,objects:this.objects,surfaces:this.surfaces,appliances:this.appliances,station:this.station,selected:this.selected,hand:this.hand,elapsed:this.elapsed,serviceElapsed:this.serviceElapsed,duration:this.duration,mode:this.mode,status:this.status,money:this.money,served:this.served,missed:this.missed,waste:this.waste,ratings:this.ratings,orders:this.orders,orderSequence:this.orderSequence,nextRecipe:this.nextRecipe,nextOrderAt:this.nextOrderAt,pinnedRecipe:this.pinnedRecipe,customRecipe:this.customRecipe,selectedOrder:this.selectedOrder,lastResult:this.lastResult});}
 restore(state){if(state?.version!==2||!state.objects||Object.keys(state.objects).length>800)return false;this.reset('free');for(const key of Object.keys(this.snapshot()))if(Object.hasOwn(state,key))this[key]=clone(state[key]);this.eventSequence=Object.values(this.objects).reduce((n,o)=>(o.history||[]).reduce((n,e)=>Math.max(n,e.sequence||0),n),this.eventSequence);for(const f of Object.values(this.objects)){if(f.kind==='vessel'&&!f.media){f.media=[];if(f.oil)f.media.push({eventId:'legacy_oil_'+f.uid,id:'oil',amount:null,unit:'g',equipment:f.type});if(f.fluid==='water')f.media.push({eventId:'legacy_water_'+f.uid,id:'water',amount:null,unit:'ml',equipment:f.type});}if(f.kind==='food'){if(f.recordingVersion!==3){f.legacySeason??=clone(f.season||{});f.legacyAdditions??=clone(f.additions||[]);}f.doses??=[];f.history??=[];f.activeCook=null;}}this.status='paused';this.events=[];return true;}
}
