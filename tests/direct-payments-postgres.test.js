import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {apiHandler} from '../server/api.js';

test('PostgreSQL API persists paid review transitions and preserves pending uniqueness',async()=>{
 const pg=new PGlite();
 try{
 for(const file of ['20261102_initial.sql','20261105132850_site_metrics.sql','20261115000000_direct_payments.sql'])await pg.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 function adapter(runner) {
   return { async batch(statements) {
     const results=[];
     for(const statement of statements) results.push(await adapter(runner).prepare(statement.sql,statement.args).run());
     return results;
   }, prepare(sql, args = []) {
     const execute = () => { let n=0; return runner.query(sql.replace(/\?/g, () => '$' + ++n), args); };
     return {sql,args,bind(...values) { return adapter(runner).prepare(sql,values); },
       async first() { return (await execute()).rows[0] || null; },
       async all() { return {results:(await execute()).rows}; },
       async run() { return {meta:{changes:(await execute()).affectedRows}}; }
     };
   }};
 }
 const db={...adapter(pg),
   batch(statements) { return pg.transaction(async tx => {
     const results=[];
     for(const statement of statements) results.push(await adapter(tx).prepare(statement.sql,statement.args).run());
     return results;
   }); },
   withEventLock(id, work) { return pg.transaction(async tx => {
     await tx.query('SELECT id FROM events WHERE id=$1 FOR UPDATE',[id]);
     return work(adapter(tx));
   }); }
 };
 const host={userId:'host',email:'host@example.test'}, player={userId:'player',email:'player@example.test'};
 const req=async(path,user,body)=>{const r=await apiHandler(new Request('https://mercury.test/api/'+path,{method:body?'POST':'GET',headers:{origin:'https://mercury.test','content-type':'application/json'},body:body?JSON.stringify(body):undefined}),db,user);const result=await r.json();assert.equal(r.status,200,JSON.stringify(result));return result};
 for(const user of [host,player])await req('account/consent',user,{accepted:true,adult:true,version:'2026-11-02'});
 await req('organizer/profile',host,{name:'Test Club',contact:'host@example.test'});
 const {id}=await req('organizer/events',host,{title:'Paid PostgreSQL Rally',sport:'Badminton',area:'Powai',venue:'QA Court Mumbai',description:'A friendly paid doubles session for testing.',date:'2030-11-22',time:'18:00',capacity:2,price:250,level:'All levels',format:'Social play',included:'Court time',bring:'Racket and water',cancellation:'Contact organizer for cancellation and refunds.',paymentMethods:['cash']});
 await req('organizer/events/'+id+'/publish',host,{});
 const entry={name:'Test Player',level:'Beginner',adultConfirmed:true,rulesAccepted:true,revision:1,idempotencyKey:'postgres-paid-test-key',paymentMethod:'cash',paymentConsentVersion:'2026-11-15-direct-payments'};
 const b=await req('events/'+id+'/register',player,entry);assert.equal(b.status,'pending');
 assert.equal((await req('events/'+id+'/register',player,entry)).id,b.id);
 assert.equal((await req('events/'+id,null)).event.spots,1);
 await req('organizer/events/'+id+'/review',host,{bookingId:b.id,decision:'accept'});
 assert.equal((await req('bookings',player)).bookings[0].status,'confirmed');
 await req('organizer/events/'+id+'/cancel',host,{});
 assert.equal((await req('bookings',player)).bookings[0].status,'event_cancelled');
 }finally{await pg.close()}
});
