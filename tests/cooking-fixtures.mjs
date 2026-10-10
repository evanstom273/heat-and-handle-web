import assert from 'node:assert/strict';
import {Kitchen} from '../web/simulation.mjs';
import {FOODS,PREPS} from '../web/catalog.mjs';
export const act=(k,type,args={})=>{const r=k.action(type,args);assert.equal(r.ok,true,type+': '+r.message);return r;};
export const at=(k,id)=>{k.station=id;k.selected=null;};
export const tick=(k,seconds)=>{for(let t=0;t<seconds;t+=.1)k.tick(Math.min(.1,seconds-t));};
export const fresh=()=>{const k=new Kitchen();k.reset('free');return k;};
export const vessel=(k,type,station)=>Object.values(k.objects).find(o=>o.type===type&&(!station||o.loc.station===station));
export function take(k,id,prep){at(k,FOODS[id].source);act(k,'take-supply',{id});const f=k.objects[k.hand];if(prep){at(k,'board');act(k,'place');for(let n=0;n<PREPS[prep].cuts;n++)act(k,'prepare',{uid:f.uid,method:prep});act(k,'pick-up',{uid:f.uid});}return f;}
export function toVessel(k,v){at(k,v.loc.station);act(k,'add-held',{target:v.uid});}
export function finish(k,f,target=90){let n=0;while(f.cook<target&&n++<3000){k.tick(.1);if(FOODS[f.ingredient].flip&&f.cook>=40&&!f.flipped){at(k,k.stationOf(f));act(k,'flip',{uid:f.uid});}}assert.ok(n<3000,'Food failed to cook: '+f.ingredient);}
export function cook(k,id,{method='grill',target=90,prep,spices=['salt','pepper'],slot=0}={}){
 const f=take(k,id,prep),v=method==='grill'?vessel(k,'tray','grill'):['bake','roast'].includes(method)?vessel(k,'tray','oven'):['boil','simmer','steam'].includes(method)?vessel(k,'stockpot','hob'):Object.values(k.objects).find(o=>o.type==='pan'&&o.loc.slot===slot);
 if(v.loc.station==='oven')at(k,'oven'),act(k,'appliance',{setting:'door',value:true});toVessel(k,v);
 for(const seasoning of spices)act(k,'season',{uid:f.uid,seasoning});
 if(v.loc.station==='hob'){act(k,'method',{uid:v.uid,method});act(k,'fluid',{uid:v.uid,fluid:['boil','simmer','steam'].includes(method)?'water':'oil'});act(k,'burner',{slot:v.loc.slot,heat:2});}
 else{act(k,'appliance',{setting:'temperature',value:190});if(v.loc.station==='oven'){act(k,'appliance',{setting:'mode',value:method});act(k,'appliance',{setting:'door',value:false});}act(k,'appliance',{setting:'power',value:true});}
 finish(k,f,target);if(v.loc.station==='oven')act(k,'appliance',{setting:'door',value:true});act(k,'pick-up',{uid:f.uid});const p=vessel(k,'plate','plate');at(k,'plate');act(k,'add-held',{target:p.uid});return f;
}
export function serve(k,{arrange=true,condition='auto'}={}){const p=vessel(k,'plate','plate');at(k,'plate');if(arrange)act(k,'arrange',{uid:p.uid});act(k,'serving-condition',{uid:p.uid,value:condition});act(k,'pick-up',{uid:p.uid});at(k,'pass');return act(k,'serve').result;}
export function salmon(){const k=fresh();cook(k,'salmon',{spices:['paprika','salt','pepper']});return {k,result:serve(k)};}
