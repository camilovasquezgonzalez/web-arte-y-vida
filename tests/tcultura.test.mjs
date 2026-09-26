import assert from 'node:assert/strict';
import { test } from 'node:test';
process.env.TCULTURA_API_KEY='test-only-key';
const { getTculturaAgenda } = await import('../src/lib/tcultura.ts');
const nativeFetch=globalThis.fetch;
const future=new Date(Date.now()+86400000).toISOString();
const base={id:'future',title:'Reactivemos el Teatro',fecha_inicio:future,url_inscripcion:'https://tcultura.com/eventos/inscripcion/test/?instancia_id=original',estado:'AGOTADO'};
const json=results=>new Response(JSON.stringify({results,next:null}),{headers:{'Content-Type':'application/json'}});
await test('Tcultura: future dates, original links, availability and server credentials',async()=>{
 globalThis.fetch=async(url,init)=>{assert.equal(init.headers['X-Project-Api-Key'],'test-only-key');assert.equal(init.cache,'no-store');assert.ok(init.signal);return json(String(url).includes('actividades/')?[base,{...base,id:'past',fecha_inicio:'2020-01-01'}, {...base,id:'invalid',fecha_inicio:'invalid'}, {...base,id:'missing',fecha_inicio:''}]:[])};
 const result=await getTculturaAgenda();assert.equal(result.status,'ready');assert.equal(result.items.length,1);assert.equal(result.items[0].link,base.url_inscripcion);assert.equal(result.items[0].status,'AGOTADO');
});
await test('Tcultura: genuine empty response and historical/public undated fallback excluded',async()=>{
 globalThis.fetch=async url=>String(url).includes('/api/')?json([]):new Response('<article class="card-tcultura-event"><h3 class="event-card-title">Reactivemos</h3></article>');
 const result=await getTculturaAgenda();assert.equal(result.status,'empty');assert.equal(result.error,null);assert.equal(result.items.length,0);
});
await test('Tcultura: partial endpoint failure retains valid results',async()=>{
 globalThis.fetch=async url=>String(url).includes('actividades/')?json([base]):new Response('',{status:503});
 const result=await getTculturaAgenda();assert.equal(result.status,'partial');assert.equal(result.items.length,1);assert.ok(result.error);
});
await test('Tcultura: total outage is unavailable, not empty',async()=>{
 globalThis.fetch=async()=>{throw Error('offline')};const result=await getTculturaAgenda();assert.equal(result.status,'unavailable');assert.equal(result.items.length,0);
});
await test('Tcultura: public fallback with verifiable future datetime retains original link',async()=>{
 globalThis.fetch=async url=>String(url).includes('/api/')?new Response('',{status:503}):new Response(`<article class="card-tcultura-event"><h3 class="event-card-title">Reactivemos</h3><time datetime="${future}"></time><a onclick="window.location.href='/eventos/inscripcion/original/'"></a></article>`);
 const result=await getTculturaAgenda();assert.equal(result.source,'public');assert.equal(result.items.length,1);assert.equal(result.items[0].link,'https://tcultura.com/eventos/inscripcion/original/');
});
await test('Tcultura: API pagination and public fallback share bounded stage deadlines',async()=>{
 globalThis.fetch=async(_url,init)=>new Promise((_,reject)=>{init.signal.addEventListener('abort',()=>reject(init.signal.reason),{once:true})});
 // Keep event loop alive while testing AbortSignal.timeout, whose timers are unrefed.
 const keepAlive=setInterval(()=>{},1000);const start=Date.now();
 try {const result=await getTculturaAgenda();assert.equal(result.status,'unavailable');assert.ok(Date.now()-start<9500)}finally{clearInterval(keepAlive)}
});
globalThis.fetch=nativeFetch;

await test('Tcultura: supplied metadata is retained without assumed price or availability',async()=>{
 globalThis.fetch=async url=>String(url).includes('actividades/')?json([{...base,estado:'',slug:'encuentro',fecha_fin:future,comuna:'Coelemu',free:false,price:3000,currency:'CLP',accessibility_info:'Acceso a nivel'}]):json([]);
 try {const r=await getTculturaAgenda();assert.equal(r.items[0].status,'');assert.equal(r.items[0].free,false);assert.deepEqual(r.items[0].price,{amount:3000,currency:'CLP'});assert.equal(r.items[0].locality,'Coelemu');assert.equal(r.items[0].accessibilityInfo,'Acceso a nivel');}finally{globalThis.fetch=nativeFetch}
});
