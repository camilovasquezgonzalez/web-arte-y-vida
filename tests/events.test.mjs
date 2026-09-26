import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeTculturaEvent } from '../src/lib/tcultura-events.ts';
import { upcomingEvents, groupEventsByMonth, eventCategories, combineEventSources, formatEventDate, formatEventTime } from '../src/lib/events.ts';
const raw={id:'one',title:'Encuentro de prueba',description:'',dateIso:'2030-09-25T19:00:00-03:00',dateFormatted:'',category:'Teatro',location:'Sala de prueba',image:'',link:'https://tcultura.com/eventos/inscripcion/original/?instancia_id=one',status:'AGOTADO',type:'actividad',typeLabel:'Actividad'};
const event=normalizeTculturaEvent(raw);
await test('adapter preserves identity, date, source, original link and status',()=>{
 assert.equal(event.registrationUrl,raw.link);assert.equal(event.startDate,raw.dateIso);assert.equal(event.status,'AGOTADO');assert.equal(event.source.label,'Tcultura');assert.equal(event.time,'19:00');
});
await test('adapter does not fabricate optional facts or availability',()=>{
 const item=normalizeTculturaEvent({...raw,status:'',category:'',link:'https://tcultura.com/eventos/detail/'});
 assert.equal(item.registrationUrl,undefined);assert.equal(item.status,'unknown');
 for(const key of ['free','price','program','locality','accessibilityInfo','category'])assert.equal(item[key],undefined);
});
await test('adapter rejects invalid dates and unsafe destinations',()=>{
 assert.equal(normalizeTculturaEvent({...raw,dateIso:'bad'}),null);
 const item=normalizeTculturaEvent({...raw,link:'javascript:alert(1)',image:'//untrusted.invalid/image'});
 assert.equal(item.detailUrl,undefined);assert.equal(item.image,undefined);
});
await test('future selection is chronological, excludes expired/invalid and does not mutate',()=>{
 const future={...event,id:'later',startDate:'2030-10-02T12:00:00-03:00'};
 const all=[future,event,{...event,id:'past',startDate:'2020-01-01'},{...event,id:'bad',startDate:'bad'}];
 assert.deepEqual(upcomingEvents(all,Date.parse('2030-09-01')).map(e=>e.id),[event.id,'later']);assert.equal(all[0],future);
});
await test('month grouping uses Santiago time at the UTC boundary',()=>{
 const groups=groupEventsByMonth([{...event,startDate:'2030-10-01T05:00:00Z'},{...event,startDate:'2030-10-01T01:00:00Z'}]);
 assert.deepEqual(groups.map(g=>g.key),['2030-09','2030-10']);assert.equal(groups[0].label,'septiembre de 2030');
});
await test('Spanish dates and 24-hour times',()=>{
 assert.equal(formatEventDate('2026-09-25T19:00:00-03:00'),'Viernes 25 de septiembre');assert.equal(formatEventTime('2026-09-25T19:00:00-03:00'),'19:00');
});
await test('categories only represent supplied data',()=>{
 assert.deepEqual(eventCategories([event,event,{...event,category:undefined},{...event,category:'Cine'}]),['Cine','Teatro']);
});
await test('source aggregation distinguishes empty, partial and unavailable and deduplicates by source',()=>{
 const result=(status,items=[])=>({status,items,generatedAt:'2030-01-01'});const now=Date.parse('2030-01-01');
 assert.equal(combineEventSources([result('empty')],now).status,'empty');
 assert.equal(combineEventSources([result('empty'),result('unavailable')],now).status,'unavailable');
 const merged=combineEventSources([result('ready',[event,event]),result('unavailable')],now);
 assert.equal(merged.status,'partial');assert.equal(merged.items.length,1);
 assert.equal(combineEventSources([result('ready',[event])],now).status,'ready');
});

await test('agenda service loads each endpoint once and limits only after chronological ordering',async()=>{
 process.env.TCULTURA_API_KEY='test-only-key';
 const {getAgenda}=await import('../src/lib/agenda.server.ts');
 const nativeFetch=globalThis.fetch;let calls=0;
 globalThis.fetch=async url=>{calls++;return new Response(JSON.stringify({next:null,results:String(url).includes('actividades/')?[4,2,1,3].map(n=>({id:String(n),title:`Reactivemos prueba ${n}`,fecha_inicio:new Date(Date.now()+n*86400000).toISOString(),url_inscripcion:`https://tcultura.com/eventos/inscripcion/prueba/?id=${n}`})):[]}))};
 try {const result=await getAgenda(3);assert.equal(calls,2);assert.deepEqual(result.items.map(e=>e.id),['actividad:1','actividad:2','actividad:3']);assert.equal(result.status,'ready');}finally{globalThis.fetch=nativeFetch}
});
