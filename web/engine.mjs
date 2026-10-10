export const FOOD = {
  tomato: {name:'Tomato',sprite:0,cutSprite:8,chops:4,time:17},
  potato: {name:'Potato',sprite:1,cutSprite:9,chops:5,time:24},
  carrot: {name:'Carrot',sprite:2,cutSprite:10,chops:5,time:20},
  mushroom: {name:'Mushrooms',sprite:3,cutSprite:11,chops:3,time:17},
  steak: {name:'Steak',sprite:4,cookSprite:12,chops:0,time:28,flip:true},
  salmon: {name:'Salmon',sprite:5,cookSprite:13,chops:0,time:22,flip:true},
  pasta: {name:'Penne',sprite:6,cookSprite:6,chops:0,time:24},
  basil: {name:'Basil',sprite:7,chops:0,time:8}
};
export const RECIPES = [
  {id:'garden',name:'Market garden salad',subtitle:'Fresh, crisp, beautifully simple.',price:12,time:210,items:[{id:'tomato',cut:true},{id:'carrot',cut:true},{id:'basil'}],salt:1,pepper:0,steps:['Chop a tomato and a carrot on the board.','Plate both with a sprig of fresh basil.','Add one pinch of salt. Carry the plate to the pass.']},
  {id:'steak',name:'Steak & golden potatoes',subtitle:'A good sear. A little patience.',price:26,time:270,items:[{id:'steak',method:'pan'},{id:'potato',cut:true,method:'pan'}],salt:1,pepper:1,steps:['Chop a potato. Oil both pans and set medium heat.','Cook the steak and potato separately. Flip the steak halfway.','Lift each when its cooking bar is green. Plate, salt and pepper.']},
  {id:'salmon',name:'Bistro salmon',subtitle:'Pan-seared fish, tomato & basil.',price:24,time:260,items:[{id:'salmon',method:'pan'},{id:'tomato',cut:true},{id:'basil'}],salt:1,pepper:1,steps:['Oil a pan and set medium heat. Add a salmon fillet.','Flip halfway and lift it when the cooking bar is green.','Chop a tomato. Plate with salmon and basil. Salt and pepper.']},
  {id:'penne',name:'Woodland penne',subtitle:'Golden mushrooms. Fresh herbs.',price:19,time:300,items:[{id:'pasta',method:'pot'},{id:'mushroom',cut:true,method:'pan'},{id:'basil'}],salt:1,pepper:1,steps:['Fill the pot with water, set medium heat and add penne.','Slice mushrooms; sauté in an oiled pan on medium.','Lift each in the green zone. Plate with basil, salt and pepper.']},
  {id:'soup',name:'Rustic tomato soup',subtitle:'A little comfort in a bowl.',price:16,time:280,items:[{id:'tomato',cut:true,method:'pot'},{id:'carrot',cut:true,method:'pot'},{id:'basil'}],salt:1,pepper:0,steps:['Chop a tomato and a carrot. Fill the pot with water.','Simmer both on medium. Stir, then lift each in the green zone.','Plate with basil and one pinch of salt. The pass will bowl it up.']}
];
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const vessel=(id,name,type)=>({id,name,type,heat:0,temp:20,oil:false,water:false,items:[]});
export const emptyPlate=()=>({kind:'plate',items:[],salt:0,pepper:0});
export class Kitchen {
  constructor(){this.reset('service');this.status='menu';}
  reset(mode='service') {
    this.mode=mode;this.status='playing';this.elapsed=0;this.duration=360;this.money=0;this.served=0;this.missed=0;this.waste=0;this.ratings=[];this.hygiene=100;this.hand=null;this.board=null;this.plate=emptyPlate();this.vessels=[vessel('pan1','Pan 1','pan'),vessel('pan2','Pan 2','pan'),vessel('pot','Stockpot','pot')];this.orders=[];this.orderSeq=0;this.nextRecipe=1;this.nextOrderAt=55;this.lastResult=null;this.addOrder('garden');this.selected=this.orders[0].id;this.events=[];
  }
  addOrder(recipeId){const recipe=RECIPES.find(r=>r.id===recipeId)||RECIPES[0];const order={id:++this.orderSeq,recipeId:recipe.id,remaining:recipe.time,total:recipe.time};this.orders.push(order);return order;}
  recipe(order=this.orders.find(o=>o.id===this.selected)||this.orders[0]){return RECIPES.find(r=>r.id===(order?.recipeId||'garden'));}
  allFood(){return [this.hand?.kind==='food'?this.hand:null,this.board,...this.vessels.flatMap(v=>v.items),...this.plate.items,...(this.hand?.kind==='plate'?this.hand.items:[])].filter(Boolean);}
  tick(dt){
    if(this.status!=='playing')return;
    dt=Math.min(dt,.25);this.elapsed+=dt;
    for(const v of this.vessels){
      const target=v.heat===0?20:(v.type==='pot'&&v.water?100:[20,125,185,255][v.heat]);
      v.temp+=(target-v.temp)*Math.min(1,dt*(v.heat?.35:.12));
      for(const f of v.items){
        if(v.temp>65){let rate=(v.temp-55)/100;if(v.type==='pot')rate=v.water?1:1.5;if(!f.cut&&FOOD[f.id].chops>0)rate*=.72;f.cook+=dt/FOOD[f.id].time*100*rate;f.temperature=Math.min(v.temp,95);f.method=v.type;if(v.type==='pan'&&!v.oil)f.dry+=dt;}
      }
    }
    for(const f of [this.hand?.kind==='food'?this.hand:null,...this.plate.items,...(this.hand?.kind==='plate'?this.hand.items:[])].filter(Boolean))f.temperature=Math.max(20,f.temperature-dt*.22);
    if(this.mode==='service'){
      for(const o of this.orders)o.remaining-=dt;
      const expired=this.orders.filter(o=>o.remaining<=0);
      for(const o of expired){this.missed++;this.events.push({type:'missed',text:`Table ${o.id} left. Keep going, chef.`});}
      this.orders=this.orders.filter(o=>o.remaining>0);
      if(!this.orders.some(o=>o.id===this.selected))this.selected=this.orders[0]?.id;
      if(this.elapsed>=this.nextOrderAt&&this.orders.length<3){const o=this.addOrder(RECIPES[this.nextRecipe++%RECIPES.length].id);this.nextOrderAt=this.elapsed+85;this.events.push({type:'order',text:`New ticket: ${this.recipe(o).name}`});if(!this.selected)this.selected=o.id;}
      if(this.elapsed>=this.duration){this.status='finished';this.events.push({type:'finished'});}
    }
  }
  fail(message){return {ok:false,message};}
  ok(message){return {ok:true,message};}
  action(type,arg){
    if(this.status!=='playing')return this.fail('Start or resume your kitchen first.');
    if(type==='take'){
      if(!FOOD[arg])return this.fail('That ingredient is not in the pantry.');
      if(this.hand)return this.fail('Your hands are full. Put down what you are carrying first.');
      this.hand={kind:'food',id:arg,cuts:0,cut:!FOOD[arg].chops,cook:0,method:null,flipped:false,stirred:false,temperature:20,dry:0};return this.ok(`Picked up ${FOOD[arg].name.toLowerCase()}.`);
    }
    if(type==='board-put'){
      if(this.board)return this.fail('There is already food on the board.');
      if(this.hand?.kind!=='food')return this.fail('Pick up an ingredient first.');
      this.board=this.hand;this.hand=null;return this.ok('On the board.');
    }
    if(type==='chop'){
      if(!this.board)return this.fail('Put an ingredient on the board first.');
      if(this.board.cut)return this.fail('This ingredient is ready to use.');
      this.board.cuts++;this.hygiene=Math.max(0,this.hygiene-.8);if(this.board.cuts>=FOOD[this.board.id].chops){this.board.cut=true;return this.ok('Chopped and ready.');}return this.ok('Chop!');
    }
    if(type==='board-take'){
      if(this.hand)return this.fail('Your hands are full.');if(!this.board)return this.fail('The board is empty.');this.hand=this.board;this.board=null;return this.ok('Ready to carry.');
    }
    if(['heat','oil','water','cook-put','cook-take','flip','stir'].includes(type)){
      const v=this.vessels.find(v=>v.id===arg?.vessel);if(!v)return this.fail('Choose a cooking vessel.');
      if(type==='heat'){if(!Number.isInteger(arg.value)||arg.value<0||arg.value>3)return this.fail('Choose off, low, medium or high.');v.heat=arg.value;return this.ok(`${v.name}: ${['off','low heat','medium heat','high heat'][v.heat]}.`);}
      if(type==='oil'){if(v.type!=='pan')return this.fail('Oil is for the frying pans.');v.oil=true;return this.ok('Pan lightly oiled.');}
      if(type==='water'){if(v.type!=='pot')return this.fail('Water is for the stockpot.');v.water=true;return this.ok('Stockpot filled.');}
      if(type==='cook-put'){
        if(this.hand?.kind!=='food')return this.fail('Carry an ingredient to the hob.');if(v.items.length>=(v.type==='pan'?1:3))return this.fail(`${v.name} is full.`);if(v.type==='pot'&&!v.water)return this.fail('Fill the stockpot with water first.');v.items.push(this.hand);this.hand=null;return this.ok(`Added to ${v.name.toLowerCase()}.`);
      }
      if(type==='cook-take'){if(this.hand)return this.fail('Your hands are full.');const index=arg.index??0;if(!Number.isInteger(index)||index<0||index>=v.items.length)return this.fail('There is no food to lift.');this.hand=v.items.splice(index,1)[0];return this.ok('Lifted from the heat.');}
      if(type==='flip'){const f=v.items[0];if(!f)return this.fail('The pan is empty.');if(!FOOD[f.id].flip)return this.fail('This ingredient does not need flipping.');if(f.cook<30)return this.fail('Let the first side cook a little longer.');f.flipped=true;return this.ok('Flipped. A lovely sear.');}
      if(type==='stir'){if(!v.items.length)return this.fail('Add food to the pot first.');for(const f of v.items)f.stirred=true;return this.ok('Gently stirred.');}
    }
    if(type==='plate-add'){
      if(this.hand?.kind!=='food')return this.fail('Bring an ingredient to the plating counter.');if(this.plate.items.length>=6)return this.fail('The plate is full.');this.plate.items.push(this.hand);this.hand=null;return this.ok('Added to the plate.');
    }
    if(type==='plate-remove'){if(this.hand)return this.fail('Your hands are full.');if(!this.plate.items.length)return this.fail('The plate is empty.');this.hand=this.plate.items.pop();return this.ok('Removed the last ingredient.');}
    if(type==='season'){
      if(!['salt','pepper'].includes(arg))return this.fail('Choose salt or pepper.');const plate=this.hand?.kind==='plate'?this.hand:this.plate;if(!plate.items.length)return this.fail('Plate some food before seasoning.');if(plate[arg]>=3)return this.fail('That is plenty of seasoning.');plate[arg]++;return this.ok(`A pinch of ${arg}.`);
    }
    if(type==='plate-take'){
      if(this.hand)return this.fail('Your hands are full.');if(!this.plate.items.length)return this.fail('The plate is empty.');this.hand=this.plate;this.plate=emptyPlate();return this.ok('Plate up! Take it to the service pass.');
    }
    if(type==='plate-put'){
      if(this.hand?.kind!=='plate')return this.fail('You are not carrying a plate.');if(this.plate.items.length)return this.fail('There is already food on this counter.');this.plate=this.hand;this.hand=null;return this.ok('Plate set down.');
    }
    if(type==='discard'){if(!this.hand)return this.fail('You have nothing to discard.');this.waste+=this.hand.kind==='plate'?this.hand.items.length:1;this.hand=null;return this.ok('Discarded. A fresh start.');}
    if(type==='wash'){this.hygiene=100;return this.ok('Board and work surfaces cleaned.');}
    if(type==='select-order'){if(!this.orders.some(o=>o.id===arg))return this.fail('That ticket is no longer open.');this.selected=arg;return this.ok('Ticket selected.');}
    if(type==='choose-recipe'){
      if(this.mode!=='free')return this.fail('Recipe selection is available in free cook.');if(!RECIPES.some(r=>r.id===arg))return this.fail('Unknown recipe.');this.orders=[];const o=this.addOrder(arg);this.selected=o.id;return this.ok('Recipe pinned to the rail.');
    }
    if(type==='serve'){
      if(this.hand?.kind!=='plate')return this.fail('Carry a finished plate to the pass.');const order=this.orders.find(o=>o.id===this.selected)||this.orders[0];if(!order)return this.fail('Wait for the next ticket.');const recipe=this.recipe(order);const result=evaluate(this.hand,recipe,this.hygiene);result.recipe=recipe.name;result.earned=Math.round(recipe.price*result.score/100*100)/100;result.tip=result.score>=85?Math.round(recipe.price*.2*100)/100:0;
      this.money+=result.earned+result.tip;this.served++;this.ratings.push(result.score);this.hand=null;this.orders=this.orders.filter(o=>o.id!==order.id);this.lastResult=result;
      if(this.mode==='free'){const o=this.addOrder(recipe.id);this.selected=o.id;}else {if(this.orders.length<2&&this.elapsed<this.duration-30)this.addOrder(RECIPES[this.nextRecipe++%RECIPES.length].id);this.selected=this.orders[0]?.id;this.nextOrderAt=this.elapsed+80;}
      return {ok:true,message:result.title,result};
    }
    return this.fail('Unknown kitchen action.');
  }
  snapshot(){return {mode:this.mode,status:this.status,elapsed:Math.round(this.elapsed),money:this.money,served:this.served,hand:this.hand,board:this.board,plate:this.plate,vessels:this.vessels.map(v=>({...v,temp:Math.round(v.temp)})),orders:this.orders.map(o=>({...o,remaining:Math.round(o.remaining),recipe:this.recipe(o).name})),selected:this.selected,hygiene:Math.round(this.hygiene)};}
}
export function evaluate(plate,recipe,hygiene=100){
  let quality=0;const notes=[];const available=[...plate.items];
  for(const req of recipe.items){
    const i=available.findIndex(f=>f.id===req.id);if(i===-1){notes.push(`Missing ${FOOD[req.id].name.toLowerCase()}.`);continue;}
    const f=available.splice(i,1)[0];let q=100;
    if(req.cut&&!f.cut){q-=30;notes.push(`${FOOD[f.id].name} needed chopping.`);}
    if(req.method){
      if(f.method!==req.method){q-=40;notes.push(`${FOOD[f.id].name}: use the ${req.method==='pan'?'frying pan':'stockpot'}.`);}
      if(f.cook<75){q-=Math.min(60,(75-f.cook)*.85);notes.push(`${FOOD[f.id].name} was undercooked.`);}else if(f.cook>112){q-=Math.min(70,(f.cook-112)*1.3);notes.push(`${FOOD[f.id].name} was overcooked.`);}
      if(FOOD[f.id].flip&&!f.flipped){q-=12;notes.push(`Remember to flip the ${FOOD[f.id].name.toLowerCase()}.`);}
      if(f.dry>8){q-=12;notes.push('A little oil would help the sear.');}
      if(f.temperature<40){q-=8;notes.push('Serve cooked food while it is warm.');}
    }else if(f.cook>20){q-=30;notes.push(`${FOOD[f.id].name} should be fresh.`);}
    quality+=clamp(q,0,100)/recipe.items.length;
  }
  if(available.length){quality-=available.length*12;notes.push('The plate had extra ingredients.');}
  for(const s of ['salt','pepper'])if(plate[s]!==recipe[s]){quality-=Math.abs(plate[s]-recipe[s])*7;notes.push(plate[s]>recipe[s]?`Too much ${s}.`:`Needs ${recipe[s]-plate[s]} pinch of ${s}.`);}
  if(hygiene<40){quality-=8;notes.push('Give the work surfaces a wash.');}
  const score=Math.round(clamp(quality,0,100));return {score,stars:Math.max(1,Math.ceil(score/20)),title:score>=90?'Chef’s kiss.':score>=75?'A lovely plate.':score>=55?'Room to improve.':'Back to the chopping board.',notes:notes.length?[...new Set(notes)].slice(0,3):['Beautifully prepared and perfectly seasoned.']};
}
export function foodStatus(f){if(!f)return '';if(f.cook>135)return 'Burnt';if(f.cook>112)return 'Overcooking';if(f.cook>=75)return 'Ready';if(f.cook>4)return 'Cooking';return f.cut&&FOOD[f.id].chops?'Chopped':'Fresh';}
export function spriteFor(f){const d=FOOD[f.id];return f.cook>=75&&d.cookSprite!==undefined?d.cookSprite:f.cut&&d.cutSprite!==undefined?d.cutSprite:d.sprite;}
