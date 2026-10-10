const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const parse=async(request,max=900000)=>{const text=await request.text();if(text.length>max)throw new Error('This save is too large.');return JSON.parse(text);};
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
 const user=request.headers.get('oai-authenticated-user-id');
 if(!user)return json({error:'Sign in to save your kitchen.'},401);
 if(request.method!=='GET'&&((request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)||request.headers.get('Sec-Fetch-Site')==='cross-site'))return json({error:'This request must come from your kitchen.'},403);
 if(!env.DB)return json({error:'Your cookbook is temporarily unavailable.'},503);
 try{
  if(url.pathname==='/api/kitchen'&&request.method==='GET'){
   const row=await env.DB.prepare('SELECT state, revision, updated_at FROM kitchen_saves WHERE user_id = ?').bind(user).first();
   const dishes=await env.DB.prepare('SELECT id, name, dish, score, created_at FROM kitchen_creations WHERE user_id = ? ORDER BY created_at DESC LIMIT 200').bind(user).all();
   return json({state:row?JSON.parse(row.state):null,revision:row?.revision||0,updatedAt:row?.updated_at||null,creations:(dishes.results||[]).map(d=>({...d,dish:JSON.parse(d.dish)}))});
  }
  if(url.pathname==='/api/kitchen'&&request.method==='PUT'){
   const body=await parse(request);if(body.state?.version!==2||!body.state.objects||typeof body.state.objects!=='object'||Object.keys(body.state.objects).length>800||!Number.isInteger(body.revision)||body.revision<0)return json({error:'Invalid kitchen save.'},400);
   const now=new Date().toISOString(),state=JSON.stringify(body.state);
   if(body.revision===0){const r=await env.DB.prepare('INSERT OR IGNORE INTO kitchen_saves (user_id, state, revision, updated_at) VALUES (?, ?, 1, ?)').bind(user,state,now).run();if(!r.meta.changes)return json({error:'This kitchen changed in another tab. Reload to continue.'},409);return json({revision:1,updatedAt:now});}
   const r=await env.DB.prepare('UPDATE kitchen_saves SET state = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?').bind(state,now,user,body.revision).run();if(!r.meta.changes)return json({error:'This kitchen changed in another tab. Reload to continue.'},409);return json({revision:body.revision+1,updatedAt:now});
  }
  if(url.pathname==='/api/creations'&&request.method==='POST'){
   const b=await parse(request,750000);if(typeof b.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(b.id)||typeof b.name!=='string'||!b.name.trim()||b.name.length>120||!Array.isArray(b.dish?.ingredients)||b.dish.ingredients.length>40||!Number.isFinite(b.score)||b.score<0||b.score>100)return json({error:'Invalid creation or score.'},400);
   await env.DB.prepare('INSERT INTO kitchen_creations (user_id, id, name, dish, score, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, id) DO UPDATE SET name = excluded.name, dish = excluded.dish, score = excluded.score').bind(user,b.id,b.name.trim(),JSON.stringify(b.dish),Math.round(b.score),new Date().toISOString()).run();return json({id:b.id,name:b.name.trim()});
  }
  if(url.pathname.startsWith('/api/creations/')&&request.method==='PATCH'){
   const b=await parse(request,1000),id=decodeURIComponent(url.pathname.split('/').pop());if(typeof b.name!=='string'||!b.name.trim()||b.name.length>120)return json({error:'Use a name between 1 and 120 characters.'},400);
   const r=await env.DB.prepare('UPDATE kitchen_creations SET name = ? WHERE user_id = ? AND id = ?').bind(b.name.trim(),user,id).run();return r.meta.changes?json({id,name:b.name.trim()}):json({error:'Creation not found.'},404);
  }
  return json({error:'Not found.'},404);
 }catch(error){console.error('Kitchen storage:',error.message);return json({error:'Could not save or load your kitchen. Your current cooking is still here; please try again.'},503);}
}};
