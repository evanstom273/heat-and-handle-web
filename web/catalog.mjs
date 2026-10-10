import {FOOD as originalFood,RECIPES as originalRecipes} from './engine.mjs';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const veg={category:'Vegetables',source:'fridge',role:'vegetable',raw:true,time:24,perishable:.002,flavour:{savory:2,sweet:1,fat:0,acid:0,aroma:0},methods:['pan-fry','saute','sear','boil','simmer','steam','roast','bake','grill','deep-fry'],prep:['slice','chop','dice','mince']};
const fruit={...veg,category:'Fruit',role:'fruit',time:15,flavour:{sweet:5,acid:2},methods:[...veg.methods]};
const meat={...veg,category:'Meat & seafood',role:'protein',raw:false,hazard:true,safe:74,time:32,perishable:.006,flavour:{savory:6,fat:3},methods:[...veg.methods]};
const grain={...veg,category:'Grains & pasta',source:'pantry',role:'starch',raw:false,safe:68,time:30,perishable:.0003,flavour:{savory:1},methods:['boil','simmer','steam','bake','pan-fry'],needsWater:true,prep:[]};
const dairy={...veg,category:'Dairy & eggs',role:'dairy',time:12,perishable:.006,flavour:{fat:6,savory:2},methods:['simmer','pan-fry','bake','roast'],prep:[]};
const herb={...veg,category:'Herbs & spices',role:'herb',time:5,flavour:{aroma:7,bitter:1},methods:[...veg.methods],weight:8,prep:['chop','mince']};
const condiment={...veg,category:'Oils & sauces',source:'pantry',role:'sauce',weight:15,perishable:.0003,flavour:{savory:2},methods:[...veg.methods],prep:[]};
const baking={...grain,category:'Baking',role:'baking',time:28,needsWater:false,methods:['bake','pan-fry','deep-fry'],prep:[]};
const extras=[
 ['onion','Onion',veg,{flavour:{savory:3,sweet:2,aroma:2}}],['garlic','Garlic',herb,{flavour:{savory:4,aroma:7},source:'pantry'}],['pepper','Bell pepper',veg,{}],['broccoli','Broccoli',veg,{flavour:{savory:3,bitter:1}}],['zucchini','Courgette',veg,{}],['aubergine','Aubergine',veg,{raw:false,safe:65,flavour:{savory:4,bitter:2}}],['cucumber','Cucumber',veg,{time:12}],['lettuce','Lettuce',veg,{methods:['steam','grill','saute'],time:6}],
 ['lemon','Lemon',fruit,{role:'acid',weight:15,flavour:{acid:9,aroma:2},prep:['slice','chop','juice']}],['lime','Lime',fruit,{role:'acid',weight:15,flavour:{acid:9,aroma:3},prep:['slice','juice']}],['apple','Apple',fruit,{}],['banana','Banana',fruit,{flavour:{sweet:7,fat:1}}],['strawberry','Strawberries',fruit,{}],['orange','Orange',fruit,{flavour:{sweet:5,acid:4},prep:['slice','juice']}],['blueberry','Blueberries',fruit,{}],['pineapple','Pineapple',fruit,{flavour:{sweet:5,acid:5}}],
 ['chicken','Chicken',meat,{safe:74}],['pork','Pork chop',meat,{safe:71}],['bacon','Bacon',meat,{time:18,flavour:{savory:7,fat:7,salt:3}}],['sausage','Sausage',meat,{time:27,flavour:{savory:5,fat:5,salt:2}}],['whitefish','White fish',meat,{safe:65,time:23,flavour:{savory:4,fat:1}}],['shrimp','Prawns',meat,{safe:65,time:17,flavour:{savory:5,sweet:2}}],['egg','Egg',dairy,{raw:false,hazard:true,safe:72,role:'protein',time:18,flavour:{savory:3,fat:3}}],['tofu','Tofu',veg,{role:'protein',flavour:{savory:3,fat:2},time:20}],
 ['rice','Rice',grain,{}],['oats','Oats',grain,{raw:true,needsWater:false}],['flour','Flour',baking,{safe:72,hazard:true,requiresMix:true}],['sugar','Sugar',condiment,{category:'Baking',role:'sweetener',weight:10,flavour:{sweet:10}}],['milk','Milk',dairy,{role:'liquid',weight:70,flavour:{fat:3,sweet:1}}],['cream','Cream',dairy,{role:'cream',weight:40,flavour:{fat:9,sweet:1}}],['butter','Butter',dairy,{role:'fat',weight:12,flavour:{fat:10}}],['cheese','Cheese',dairy,{flavour:{savory:6,fat:8,salt:2},prep:['slice','dice','grate']}],
 ['bread','Bread',baking,{raw:true,role:'starch',time:10,requiresMix:false}],['dough','Dough',baking,{safe:72,requiresMix:false,flavour:{savory:1}}],['chocolate','Chocolate',condiment,{source:'pantry',category:'Baking',role:'sweet',weight:35,flavour:{sweet:6,bitter:3,fat:5},prep:['chop','grate']}],['honey','Honey',condiment,{category:'Baking',role:'sweetener',weight:10,flavour:{sweet:10,aroma:2}}],['oil','Olive oil',condiment,{role:'fat',weight:10,flavour:{fat:10,aroma:1}}],['soy','Soy sauce',condiment,{flavour:{salt:8,savory:8},weight:6}],['ketchup','Tomato sauce',condiment,{flavour:{sweet:3,acid:4,savory:3}}],['mustard','Mustard',condiment,{flavour:{acid:4,heat:3,aroma:3},weight:8}],
 ['parsley','Parsley',herb,{}],['rosemary','Rosemary',herb,{source:'pantry',flavour:{aroma:8,bitter:1}}],['thyme','Thyme',herb,{source:'pantry'}],['chilli','Chilli',herb,{flavour:{heat:8,aroma:3},weight:5}],['blackpepper','Black pepper',herb,{source:'pantry',role:'spice',flavour:{heat:3,aroma:6},weight:2,prep:[]}],['salt','Salt',condiment,{category:'Herbs & spices',role:'salt',flavour:{salt:10},weight:2}],['cumin','Cumin',herb,{source:'pantry',role:'spice',flavour:{aroma:8,bitter:1},weight:2,prep:[]}],['paprika','Paprika',herb,{source:'pantry',role:'spice',flavour:{aroma:6,sweet:2},weight:2,prep:[]}]
];
export const FOODS={};
for(const[id,d]of Object.entries(originalFood)){
 const base=['steak','salmon'].includes(id)?meat:id==='pasta'?grain:id==='basil'?herb:veg;
 FOODS[id]={...base,...d,id,art:{sheet:'original',index:d.sprite},weight:base.weight||100,time:d.time||base.time,flavour:{...base.flavour}};
}
Object.assign(FOODS.steak,{safe:65,flavour:{savory:7,fat:4},flip:true});Object.assign(FOODS.salmon,{safe:65,flavour:{savory:5,fat:6},flip:true});Object.assign(FOODS.potato,{raw:false,safe:68,time:28,role:'starch'});Object.assign(FOODS.tomato,{flavour:{savory:3,acid:3,sweet:2}});Object.assign(FOODS.carrot,{flavour:{sweet:3,savory:2}});Object.assign(FOODS.mushroom,{flavour:{savory:7},time:20});
extras.forEach(([id,name,base,more],index)=>{FOODS[id]={...base,...more,id,name,art:{sheet:'expanded',index},weight:more.weight||base.weight||100,flavour:{...base.flavour,...more.flavour}};});
export const CATEGORIES=[...new Set(Object.values(FOODS).map(f=>f.category))];
export const PREPS={slice:{label:'Slice',result:'sliced',cuts:3},chop:{label:'Chop',result:'chopped',cuts:4},dice:{label:'Dice',result:'diced',cuts:5},mince:{label:'Mince',result:'minced',cuts:6},grate:{label:'Grate',result:'grated',cuts:4},juice:{label:'Juice',result:'juiced',cuts:2},roll:{label:'Roll',result:'rolled',cuts:3}};
export const METHODS={
 'pan-fry':{name:'Pan-fry',past:'Pan-fried',rate:1.0},saute:{name:'Sauté',past:'Sautéed',rate:1.1},sear:{name:'Sear',past:'Pan-seared',rate:1.35},boil:{name:'Boil',past:'Boiled',rate:1},simmer:{name:'Simmer',past:'Simmered',rate:.8},steam:{name:'Steam',past:'Steamed',rate:.85},'deep-fry':{name:'Deep-fry',past:'Crisp-fried',rate:1.15},bake:{name:'Bake',past:'Baked',rate:.85},roast:{name:'Roast',past:'Roasted',rate:1},grill:{name:'Grill',past:'Grilled',rate:1.15},reheat:{name:'Reheat',past:'Reheated',rate:.25},defrost:{name:'Defrost',past:'Defrosted',rate:0}};
export const EQUIPMENT={pan:{name:'Frying pan',sprite:0,capacity:8,methods:['pan-fry','saute','sear']},saucepan:{name:'Saucepan',sprite:1,capacity:8,methods:['simmer','boil','saute']},stockpot:{name:'Stockpot',sprite:2,capacity:14,methods:['boil','simmer','steam']},basket:{name:'Fryer basket',sprite:3,capacity:10,methods:['deep-fry']},plate:{name:'Dinner plate',sprite:4,capacity:14,serve:true},bowl:{name:'Serving bowl',sprite:5,capacity:14,serve:true},mixing:{name:'Mixing bowl',sprite:6,capacity:18},tray:{name:'Baking tray',sprite:7,capacity:16,methods:['bake','roast']},knife:{name:'Chef’s knife',sprite:8,tool:true},spatula:{name:'Spatula',sprite:9,tool:true},spoon:{name:'Wooden spoon',sprite:10,tool:true},whisk:{name:'Whisk',sprite:11,tool:true},tongs:{name:'Tongs',sprite:12,tool:true},rollingpin:{name:'Rolling pin',sprite:13,tool:true},steamer:{name:'Steamer basket',sprite:14,capacity:10,methods:['steam']},saucebowl:{name:'Sauce bowl',sprite:15,capacity:6,serve:true}};
export const STATIONS=[
 {id:'pantry',name:'Dry pantry',kind:'supply',rect:[28,32,118,279],at:[198,318],source:'pantry',label:[81,330]},
 {id:'fridge',name:'Refrigerator',kind:'supply',rect:[1280,35,215,199],at:[1337,284],source:'fridge',label:[1380,255]},
 {id:'freezer',name:'Freezer',kind:'supply',rect:[1153,33,123,203],at:[1180,284],source:'freezer',label:[1215,255]},
 {id:'hob',name:'Stovetop',kind:'appliance',rect:[207,50,211,171],at:[314,278],surface:[211,63,192,110],label:[313,240]},
 {id:'grill',name:'Griddle',kind:'appliance',rect:[451,59,160,162],at:[532,278],surface:[465,75,133,88],label:[532,241]},
 {id:'fryer',name:'Deep fryer',kind:'appliance',rect:[688,55,145,165],at:[757,278],surface:[700,75,114,95],label:[756,240]},
 {id:'oven',name:'Oven',kind:'appliance',rect:[910,57,167,163],at:[994,278],surface:[923,82,139,82],label:[993,240]},
 {id:'board',name:'Main prep',kind:'prep',rect:[375,359,371,255],at:[551,658],surface:[395,381,328,180],label:[560,345]},
 {id:'prep2',name:'Second prep',kind:'prep',rect:[873,359,219,258],at:[935,658],surface:[894,381,181,178],label:[975,345]},
 {id:'plate',name:'Plating',kind:'plating',rect:[1093,360,110,255],at:[1142,657],surface:[1101,382,96,175],label:[1151,345]},
 {id:'counter',name:'Side counter',kind:'counter',rect:[27,319,119,184],at:[197,419],surface:[42,333,88,163],label:[81,510]},
 {id:'sink',name:'Sink',kind:'wash',rect:[30,521,112,157],at:[198,591],surface:[40,536,89,130],label:[84,695]},
 {id:'wash',name:'Dishwash',kind:'wash',rect:[145,673,161,231],at:[348,817],surface:[162,683,116,85],label:[251,928]},
 {id:'bin',name:'Rubbish',kind:'bin',rect:[27,807,108,157],at:[190,952],label:[81,979]},
 {id:'storage',name:'Cookware & tools',kind:'storage',rect:[444,735,404,185],at:[640,680],surface:[465,753,352,86],label:[643,942]},
 {id:'pastry',name:'Pastry bench',kind:'prep',rect:[850,741,267,169],at:[982,682],surface:[868,757,225,91],label:[980,930]},
 {id:'counter2',name:'Holding counter',kind:'counter',rect:[1209,741,158,173],at:[1255,683],surface:[1227,758,132,88],label:[1280,935]},
 {id:'microwave',name:'Microwave',kind:'appliance',rect:[1368,728,120,141],at:[1340,685],surface:[1382,745,91,81],label:[1428,892]},
 {id:'pass',name:'Service pass',kind:'pass',rect:[1412,291,99,298],at:[1346,458],surface:[1429,318,65,245],label:[1457,618]}
];
export const STATION_BY_ID=Object.fromEntries(STATIONS.map(s=>[s.id,s]));
export const WORLD={width:1536,height:1024,bounds:[166,249,1224,707],obstacles:[[362,345,397,281],[861,345,356,284],[133,663,175,253],[433,726,416,207],[842,728,280,199],[1197,719,309,198]]};
const req=(id,method=null,cut=false)=>({id,method,cut});
export const RECIPES=originalRecipes.map(r=>({...r,items:r.items.map(i=>({...i,method:i.method==='pan'?'pan-fry':i.method==='pot'?'boil':null})),salt:r.salt,pepper:r.pepper}));
const additional=[
 ['roastveg','Roasted market vegetables',[req('potato','roast',true),req('carrot','roast',true),req('zucchini','roast',true),req('basil')],18,'Dice the vegetables, combine on a baking tray with oil, roast at 190°C, then plate with basil.'],
 ['fishchips','Fish & chips',[req('whitefish','deep-fry'),req('potato','deep-fry',true),req('lemon',null,true)],24,'Slice potato into chips. Fry fish and potatoes in separate baskets at 180°C. Lift the baskets in the green zone.'],
 ['herbsalmon','Grilled salmon & herb potatoes',[req('salmon','grill'),req('potato','roast',true),req('rosemary')],28,'Roast chopped potatoes at 190°C. Grill salmon, turn halfway, and finish with rosemary.'],
 ['creamypasta','Creamy mushroom penne',[req('pasta','boil'),req('mushroom','saute',true),req('cream'),req('parsley')],22,'Boil penne. Sauté mushrooms, add cream, combine with pasta and stir. Finish with parsley.'],
 ['ricebowl','Tofu & broccoli rice bowl',[req('rice','boil'),req('tofu','saute',true),req('broccoli','steam',true),req('soy')],21,'Boil rice in water, steam broccoli and sauté diced tofu. Combine with a little soy sauce.'],
 ['chicken','Roast chicken & carrots',[req('chicken','roast'),req('carrot','roast',true),req('thyme')],25,'Chop carrots. Roast alongside chicken at 190°C; check each ingredient separately. Finish with thyme.'],
 ['omelette','Cheese omelette',[req('egg','pan-fry'),req('cheese','pan-fry')],16,'Combine egg and grated cheese in a bowl. Whisk, transfer to an oiled pan, and cook gently.'],
 ['fruit','Citrus fruit salad',[req('apple',null,true),req('strawberry',null,true),req('orange',null,true)],14,'Slice the fruit, arrange on a clean plate, and serve fresh. No salt or pepper needed.'],
 ['bread','Freshly baked bread',[req('dough','bake')],10,'Roll the dough on the pastry bench, place on a baking tray and bake at 180°C.'],
 ['pancakes','Bistro pancakes',[req('flour','pan-fry'),req('milk','pan-fry'),req('egg','pan-fry'),req('sugar','pan-fry')],18,'Whisk flour, milk, egg and sugar in a mixing bowl. Pour into an oiled pan and cook at medium heat.'],
 ['chocolatebake','Chocolate bake',[req('flour','bake'),req('egg','bake'),req('butter','bake'),req('sugar','bake'),req('chocolate','bake')],20,'Mix all ingredients thoroughly in a bowl, transfer to a tray and bake at 175°C.'],
 ['steambowl','Steamed garden bowl',[req('broccoli','steam',true),req('carrot','steam',true),req('rice','boil')],17,'Chop vegetables and steam in a water-filled stockpot. Serve over rice with seasoning.']
];
for(const[id,name,items,price,instruction]of additional)RECIPES.push({id,name,items,price,time:300,salt:['fruit','bread','pancakes','chocolatebake'].includes(id)?0:1,pepper:['fruit','bread','pancakes','chocolatebake'].includes(id)?0:1,subtitle:'From the expanded house menu.',steps:[instruction,'Cooked ingredients are ready at 75–112% progress. Serve proteins only after their safety check is clear.','Plate, season to the ticket, then carry the dish to the pass.']});
export const cookingLabel=f=>f.frozen>.1?'Frozen':f.cook>140?'Burnt':f.cook>112?'Overcooked':f.cook>=75?'Ready':f.cook>2?'Cooking':f.prep==='whole'?'Raw / fresh':f.prep;
export const objectName=o=>o?.kind==='food'?FOODS[o.ingredient]?.name||'Ingredient':EQUIPMENT[o?.type]?.name||'Object';
export function artFor(o){if(o.kind!=='food')return {sheet:'equipment',index:EQUIPMENT[o.type].sprite};const d=FOODS[o.ingredient];if(d.art.sheet==='original'){if(o.cook>=75&&d.cookSprite!==undefined)return{sheet:'original',index:d.cookSprite};if(o.prep!=='whole'&&d.cutSprite!==undefined)return{sheet:'original',index:d.cutSprite};}return d.art;}
