import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep,basename} from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {apiHandler} from '../server/api.js';

test('PostgreSQL API persists QR and receipts across reopen and protects review transitions',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'mercury-registration-'));
 let pg=new PGlite(directory);
 try{
 for(const file of ['20261102_initial.sql','20261105132850_site_metrics.sql','20261115000000_direct_payments.sql','20261115010000_optional_event_instructions.sql','20261116000000_event_covers.sql','20261116010000_cancellation_requests.sql','20261116020000_event_review.sql'])await pg.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
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
 const req=async(path,user,body,method=body?'POST':'GET')=>{const r=await apiHandler(new Request('https://mercury.test/api/'+path,{method,headers:{origin:'https://mercury.test','content-type':'application/json'},body:body?JSON.stringify(body):undefined}),db,user,{adminEmail:'host@example.test'});const result=await r.json();assert.equal(r.status,200,JSON.stringify(result));return result};
 for(const user of [host,player])await req('session',user);
 await req('organizer/profile',host,{name:'Test Club',contact:'host@example.test'});
 const {id:emptyId}=await req('organizer/events',host,{title:'Optional instructions',sport:'Badminton',area:'Powai',venue:'QA Court Mumbai',date:'2030-11-22',time:'18:00',capacity:2,price:0,level:'All levels',format:'Social play'});
 const emptyRow=(await pg.query('SELECT description,included,bring,cancellation FROM events WHERE id=$1',[emptyId])).rows[0];
 for(const value of Object.values(emptyRow))assert.equal(value,null);
 const savedEmpty=(await req('organizer/events',host)).events.find(event=>event.id===emptyId);
 await req('organizer/events/'+emptyId,host,{...savedEmpty.draft,revision:savedEmpty.revision,publish:true},'PATCH');
 await req('admin/events/'+emptyId+'/review',host,{decision:'approve',revision:2});
 assert.equal((await req('events/'+emptyId,null)).event.status,'published');
 await req('events/'+emptyId+'/register',player,{name:'Test Player',level:'Beginner',rulesAccepted:true,revision:2,idempotencyKey:'no-age-confirmation-key'});
 const image='data:image/png;base64,'+(await readFile(new URL('./fixtures/payment-upi.png',import.meta.url))).toString('base64');
 const cover='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=';
 const {id}=await req('organizer/events',host,{title:'Paid PostgreSQL Rally',sport:'Badminton',area:'Powai',venue:'QA Court Mumbai',description:'A friendly paid doubles session for testing.',date:'2030-11-22',time:'18:00',capacity:2,price:250,level:'All levels',format:'Social play',included:'Court time',bring:'Racket and water',cancellation:'Contact organizer for cancellation and refunds.',paymentMethods:['upi','cash'],qrImage:image,coverImage:cover,publish:true});
 assert.equal((await pg.query('SELECT status FROM events WHERE id=$1',[id])).rows[0].status,'pending_review');
 assert.equal((await apiHandler(new Request('https://mercury.test/api/events/'+id),db,null)).status,404);
 await pg.exec("CREATE FUNCTION fail_event_notice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'notice unavailable'; END; $$; CREATE TRIGGER block_review_notice BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION fail_event_notice();");
 const failedReview=await apiHandler(new Request('https://mercury.test/api/admin/events/'+id+'/review',{method:'POST',headers:{origin:'https://mercury.test','content-type':'application/json'},body:JSON.stringify({decision:'approve',revision:1})}),db,host,{adminEmail:host.email});
 assert.equal(failedReview.status,500);
 const unchanged=(await pg.query('SELECT status,approved_at,reviewed_at FROM events WHERE id=$1',[id])).rows[0];
 assert.equal(unchanged.status,'pending_review');
 assert.equal(unchanged.approved_at,null);
 assert.equal(unchanged.reviewed_at,null);
 await pg.exec('DROP TRIGGER block_review_notice ON notifications; DROP FUNCTION fail_event_notice();');
 await req('admin/events/'+id+'/review',host,{decision:'approve',revision:1});
 assert.equal((await req('events/'+id,null)).event.status,'published');
 await req('organizer/events/'+id+'/publish',host,{});
 const entry={name:'Test Player',adultConfirmed:true,rulesAccepted:true,revision:1,idempotencyKey:'postgres-paid-test-key',paymentMethod:'cash',paymentConsentVersion:'2026-11-15-direct-payments'};
 const b=await req('events/'+id+'/register',player,entry);assert.equal(b.status,'pending');
 assert.equal((await req('events/'+id+'/register',player,entry)).id,b.id);
 assert.equal((await req('events/'+id,null)).event.spots,1);
 const second={userId:'second-player',email:'second@example.test'};
 const pending=await req('events/'+id+'/register',second,{...entry,idempotencyKey:'second-postgres-request',paymentMethod:'upi',paymentProof:image,email:'spoofed@example.test'});
 assert.equal(pending.status,'pending');
 const roster=await req('organizer/events/'+id+'/attendees',host);
 assert.equal(roster.attendees.find(a=>a.id===pending.id).player_email,second.email);
 assert.equal(roster.attendees.find(a=>a.id===pending.id).has_proof,1);
 assert.equal(roster.event.pendingCount,2);
 const imageResponse=await apiHandler(new Request('https://mercury.test/api/events/'+id+'/qr'),db,second);
 assert.equal(imageResponse.status,200);
 assert.equal(Buffer.from(await imageResponse.arrayBuffer()).toString('base64'),image.split(',')[1]);
 const proofResponse=await apiHandler(new Request('https://mercury.test/api/bookings/'+pending.id+'/proof'),db,host);
 assert.equal(proofResponse.status,200);
 assert.equal(Buffer.from(await proofResponse.arrayBuffer()).toString('base64'),image.split(',')[1]);
 assert.ok((await req('session',host)).notifications.some(n=>n.actionPath==='/participants/'+id));
 await req('organizer/events/'+id+'/review',host,{bookingId:b.id,decision:'accept'});
 assert.equal((await req('bookings',player)).bookings.find(entry=>entry.id===b.id).status,'confirmed');
 const cancelled=await req('bookings/'+b.id+'/cancel',player,{});assert.equal(cancelled.status,'cancellation_pending');
 assert.equal((await req('bookings',player)).bookings.find(entry=>entry.id===b.id).status,'cancellation_pending');
 await req('organizer/events/'+id+'/resolve-cancellation',host,{bookingId:b.id,paymentResolution:'not_collected'});
 await req('organizer/events/'+id+'/cancel',host,{});
 assert.equal((await req('bookings',player)).bookings.find(entry=>entry.id===b.id).status,'cancelled');
 await pg.close();pg=new PGlite(directory);
 assert.equal((await pg.query('SELECT reviewed_by FROM events WHERE id=$1',[id])).rows[0].reviewed_by,'host');
 assert.ok((await pg.query('SELECT approved_at FROM events WHERE id=$1',[id])).rows[0].approved_at);
 assert.equal((await pg.query('SELECT refund_resolution FROM bookings WHERE id=$1',[b.id])).rows[0].refund_resolution,'not_collected');
 assert.equal((await pg.query('SELECT cover_image FROM events WHERE id=$1',[id])).rows[0].cover_image,cover);
 assert.equal((await pg.query('SELECT qr_image FROM events WHERE id=$1',[id])).rows[0].qr_image,image);
 assert.equal((await pg.query('SELECT payment_proof FROM bookings WHERE id=$1',[pending.id])).rows[0].payment_proof,image);
 }finally{
  await pg.close();
  if(resolve(directory).startsWith(resolve(tmpdir())+sep)&&basename(directory).startsWith('mercury-registration-'))await rm(directory,{recursive:true,force:true});
 }
});
