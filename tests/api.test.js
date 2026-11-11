import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { apiHandler } from '../server/api.js';
import { currentListings } from '../public/catalogue.js';
const now = Date.parse('2026-11-01T00:00:00Z');
const host = { userId: 'host-1', email: 'host@example.test', fullName: 'Host One' };
const player = n => ({ userId: 'player-' + n, email: `player${n}@example.test`, fullName: 'Player ' + n });
const draft = { title: 'Sunday Rally Test', sport: 'Badminton', area: 'Powai', venue: 'Test Hall, 1 Test Road, Mumbai', description: 'A friendly badminton session with rotating doubles.', date: '2026-11-08', time: '08:00', capacity: 2, price: 0, level: 'All levels', format: 'Social play', included: 'Court and shuttles', bring: 'Racket and water', cancellation: 'Cancel for free before the session starts.' };
function database() { const sqlite = new DatabaseSync(':memory:'); sqlite.exec('PRAGMA foreign_keys=ON'); for (const file of readdirSync(new URL('../drizzle/', import.meta.url)).filter(f => f.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8')); const db = { prepare(sql) { let args = []; const q = { bind(...values) { args = values; return q; }, async first() { return sqlite.prepare(sql).get(...args) || null; }, async all() { return { results: sqlite.prepare(sql).all(...args) }; }, async run() { const r = sqlite.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; }, sync() { if (/^SELECT\s/i.test(sql)) return {results:sqlite.prepare(sql).all(...args)}; const r = sqlite.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; } }; return q; }, async batch(queries) { sqlite.exec('BEGIN'); try {
        const results = queries.map(q => q.sync());
        sqlite.exec('COMMIT');
        return results;
    }
    catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
    } } }; return { db, sqlite }; }
function harness() { const { db, sqlite } = database(); const consented = new Set(); const req = async (path, user = host, body, method = body ? 'POST' : 'GET', options = {}) => { if (user && options.consent !== false && path !== 'account/consent' && !consented.has(user.userId)) { await apiHandler(new Request('https://mercury.test/api/account/consent', { method:'POST',headers:{Origin:'https://mercury.test','Content-Type':'application/json'},body:JSON.stringify({accepted:true,adult:true,version:'2026-11-02'}) }),db,user,{now}); consented.add(user.userId); } const request = new Request('https://mercury.test/api/' + path, { method, headers: { Origin: options.origin || 'https://mercury.test', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const r = await apiHandler(request, db, user, { now: options.now ?? now, adminEmail: options.adminEmail ?? 'host@example.test' }); return { status: r.status, data: await r.json() }; }; const create = async (data = {}) => { await req('organizer/profile', host, { name: 'Weekend Club', bio: 'For the love of play', contact: 'host@example.test' }); const result = await req('organizer/events', host, { ...draft, ...data }); assert.equal(result.status, 200); return result.data.id; }; const publish = async (data = {}) => { const id = await create(data); assert.equal((await req(`organizer/events/${id}/publish`, host, {})).status, 200); return id; }; const join = (id, n, extra = {}) => req(`events/${id}/register`, player(n), { name: 'Player ' + n, level: 'Beginner', rulesAccepted: true, adultConfirmed: true, revision: 1, idempotencyKey: 'request-key-player-' + n, ...extra }); return { req, create, publish, join, sqlite }; }
test('auth, origin and owner boundaries protect private records', async () => { const h = harness(); assert.equal((await h.req('session', null)).data.user, null); assert.equal((await h.req('organizer/events', null)).status, 401); const id = await h.publish(); assert.equal((await h.req('organizer/events/' + id + '/attendees', player(1))).status, 404); assert.equal((await h.req('organizer/events/' + id, player(1), { ...draft, revision: 1 }, 'PATCH')).status, 404); assert.equal((await h.req('profile', host, { name: 'Changed' }, 'POST', { origin: 'https://evil.test' })).status, 403); assert.equal((await h.req('organizer/events/' + id + '/cancel', player(1), {})).status, 404); h.sqlite.close(); });
test('drafts are private; free publication and paid blocking are enforced', async () => { const h = harness(); const id = await h.create(); assert.equal((await h.req('events')).data.events.length, 0); assert.equal((await h.req('events/' + id)).status, 404); await h.req('organizer/events/' + id + '/publish', host, {}); assert.equal((await h.req('events')).data.events.length, 1); const paid = await h.create({ price: 450 }); const result = await h.req('organizer/events/' + paid + '/publish', host, {}); assert.equal(result.status, 409); assert.equal(result.data.error.code, 'payments_unavailable'); assert.equal((await h.join(paid, 1)).status, 409); h.sqlite.close(); });
test('simultaneous requests never oversell the final places', async () => { const h = harness(); const id = await h.publish(); const results = await Promise.all(Array.from({ length: 12 }, (_, i) => h.join(id, i))); assert.equal(results.filter(r => r.status === 200).length, 2); assert.equal(results.filter(r => r.status === 409).length, 10); assert.equal((await h.req('events/' + id)).data.event.spots, 0); assert.equal(h.sqlite.prepare('SELECT count(*) n FROM bookings').get().n, 2); h.sqlite.close(); });
test('retry and duplicate requests create exactly one active registration', async () => { const h = harness(); const id = await h.publish(); const results = await Promise.all([h.join(id, 1), h.join(id, 1), h.join(id, 1, { idempotencyKey: 'another-key-player-1' })]); assert.ok(results.every(r => r.status === 200)); assert.equal(new Set(results.map(r => r.data.id)).size, 1); assert.equal((await h.req('bookings', player(1))).data.bookings.length, 1); assert.equal((await h.req('bookings', player(2))).data.bookings.length, 0); h.sqlite.close(); });
test('consent, event revision and start time are checked server-side', async () => { const h = harness(); const id = await h.publish(); assert.equal((await h.join(id, 1, { adultConfirmed: false })).status, 422); assert.equal((await h.join(id, 1, { rulesAccepted: false })).status, 422); assert.equal((await h.join(id, 1, { revision: 0 })).data.error.code, 'event_changed'); const updated = await h.req('organizer/events/' + id, host, { ...draft, title: 'Changed session name', revision: 1 }, 'PATCH'); assert.equal(updated.status, 200); assert.equal((await h.join(id, 1)).status, 409); assert.equal((await h.join(id, 1, { revision: 2 })).status, 200); const expired = await h.req('events/' + id + '/register', player(2), { name: 'Player Two', level: 'Beginner', adultConfirmed: true, rulesAccepted: true, idempotencyKey: 'expired-test-key-2', revision: 2 }, 'POST', { now: Date.parse('2026-11-09') }); assert.equal(expired.data.error.code, 'event_started'); h.sqlite.close(); });
test('registered events lock editing and unpublishing; stale edits fail', async () => { const h = harness(); const id = await h.publish(); assert.equal((await h.req('organizer/events/' + id, host, { ...draft, revision: 0 }, 'PATCH')).status, 409); await h.join(id, 1); assert.equal((await h.req('organizer/events/' + id, host, { ...draft, revision: 1 }, 'PATCH')).data.error.code, 'has_registrations'); assert.equal((await h.req('organizer/events/' + id + '/unpublish', host, {})).status, 409); h.sqlite.close(); });
test('cancellation releases capacity and cancelled request keys cannot resurrect passes', async () => { const h = harness(); const id = await h.publish(); const { data: b } = await h.join(id, 1); await h.join(id, 2); assert.equal((await h.req('bookings/' + b.id + '/cancel', player(2), {})).status, 404); assert.equal((await h.req('bookings/' + b.id + '/cancel', player(1), {})).status, 200); assert.equal((await h.req('events/' + id)).data.event.spots, 1); assert.equal((await h.join(id, 1)).data.error.code, 'request_cancelled'); assert.equal((await h.join(id, 3)).status, 200); assert.ok((await h.req('session', host)).data.notifications.some(n => n.message.includes('cancelled their place'))); h.sqlite.close(); });
test('attendance is owner-only, idempotent, and blocks subsequent player cancellation', async () => { const h = harness(); const id = await h.publish(); const { data: b } = await h.join(id, 1); assert.equal((await h.req('organizer/events/' + id + '/check-in', player(1), { bookingId: b.id })).status, 404); assert.equal((await h.req('organizer/events/' + id + '/check-in', host, { bookingId: b.id })).status, 200); assert.equal((await h.req('organizer/events/' + id + '/check-in', host, { bookingId: b.id })).status, 200); assert.equal((await h.req('bookings/' + b.id + '/cancel', player(1), {})).status, 409); const roster = (await h.req('organizer/events/' + id + '/attendees')).data.attendees; assert.equal(roster[0].status, 'checked_in'); assert.equal(roster[0].email, undefined); h.sqlite.close(); });
test('host cancellation updates every active pass and notifies players once', async () => { const h = harness(); const id = await h.publish(); await h.join(id, 1); await h.join(id, 2); await h.req('organizer/events/' + id + '/cancel', host, {}); await h.req('organizer/events/' + id + '/cancel', host, {}); assert.equal((await h.req('events')).data.events.length, 0); assert.equal((await h.req('events/' + id)).data.event.status, 'cancelled'); assert.equal((await h.req('bookings', player(1))).data.bookings[0].status, 'event_cancelled'); assert.equal((await h.req('session', player(1))).data.notifications.filter(n => n.message.includes('cancelled by')).length, 1); assert.equal((await h.req('organizer/events/' + id + '/publish', host, {})).status, 409); h.sqlite.close(); });
test('saved games and read status are isolated between accounts', async () => { const h = harness(); const id = await h.publish(); await h.req('saved/' + id, player(1), { saved: true }); assert.deepEqual((await h.req('session', player(1))).data.saved, [id]); assert.deepEqual((await h.req('session', player(2))).data.saved, []); await h.join(id, 1); await h.req('notifications/read', player(1), {}); assert.ok((await h.req('session', player(1))).data.notifications.every(n => n.read_at)); assert.ok((await h.req('session', host)).data.notifications.some(n => !n.read_at)); await h.req('saved/' + id, player(1), { saved: false }); assert.deepEqual((await h.req('session', player(1))).data.saved, []); h.sqlite.close(); });

// External discovery cannot create Mercury passes or imply availability.
test('external discovery is public, expires in IST and never creates native bookings', async () => {
  const h = harness(); const r = await h.req('listings', null);
  assert.equal(r.status, 200); assert.equal(r.data.listings.length, currentListings(now).length);
  const id = r.data.listings[0].id;
  assert.equal((await h.req('listings/missing', null)).status, 404);
  assert.equal((await h.req('listings', null, undefined, 'GET', { now: Date.parse('2027-04-01') })).data.listings.length, 0);
  assert.equal((await h.req('listings/' + id, null, undefined, 'GET', { now: Date.parse('2026-11-02T12:30:00Z') })).data.listing.availability.code, 'closed');
  assert.equal((await h.join(id, 1)).status, 409);
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM bookings').get().n, 0);
  h.sqlite.close();
});
test('external saves are private, persistent, idempotent and separate from reservations', async () => {
  const h = harness(), id = 'mumbai-pickleball-cup-s3';
  assert.equal((await h.req('listings/' + id + '/save', null, { saved: true })).status, 401);
  assert.equal((await h.req('listings/missing/save', player(1), { saved: true })).status, 404);
  assert.equal((await h.req('listings/' + id + '/save', player(1), { saved: 'yes' })).status, 422);
  for (let i = 0; i < 2; i++) assert.equal((await h.req('listings/' + id + '/save', player(1), { saved: true })).status, 200);
  assert.deepEqual((await h.req('session', player(1))).data.savedListings, [id]);
  assert.equal((await h.req('saved-listings', player(2))).data.listings.length, 0);
  assert.equal((await h.req('saved-listings', player(1))).data.listings.length, 1);
  assert.equal((await h.req('bookings', player(1))).data.bookings.length, 0);
  await h.req('listings/' + id + '/save', player(1), { saved: false });
  assert.equal((await h.req('saved-listings', player(1))).data.listings.length, 0);
  h.sqlite.close();
});
test('corrections require identity and origin; click counts store no player identity', async () => {
  const h = harness(), id = 'basch-pickleball-2026', route = 'listings/' + id;
  assert.equal((await h.req(route + '/report', null, { reason: 'The venue has changed.' })).status, 401);
  assert.equal((await h.req(route + '/report', player(1), { reason: 'short' })).status, 422);
  assert.equal((await h.req(route + '/report', player(1), { reason: 'The venue has changed.' }, 'POST', { origin: 'https://evil.test' })).status, 403);
  await h.req(route + '/report', player(1), { reason: 'Please check the venue.' });
  await h.req(route + '/report', player(1), { reason: 'Please check the new venue.' });
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM listing_reports').get().n, 1);
  assert.equal((await h.req(route + '/report', player(2))).status, 404);
  for (let i = 0; i < 2; i++) assert.equal((await h.req(route + '/click', null, {})).status, 200);
  assert.equal((await h.req('listings/missing/click', null, {})).status, 404);
  assert.equal(h.sqlite.prepare('SELECT count FROM listing_clicks WHERE listing_id=?').get(id).count, 2);
  assert.deepEqual(h.sqlite.prepare('PRAGMA table_info(listing_clicks)').all().map(r => r.name), ['listing_id', 'day', 'count']);
  const reviewed = 'mumbai-flex-nov-2026';
  await h.req('listings/' + reviewed + '/report', player(2), { reason: 'Please check the event information.' });
  await h.req('admin/correction', host, { listingId: reviewed, userId: 'player-2', resolved: true });
  assert.deepEqual((await h.req('admin/overview', host)).data.corrections.map(row => row.status), ['open', 'resolved']);
  h.sqlite.close();
});

test('aggregate funnel counts are bounded, owner-only and contain no player identifiers', async () => {
  const h = harness();
  assert.equal((await h.req('metrics', null, { metric: 'home_view' })).status, 200);
  assert.equal((await h.req('metrics', null, { metric: 'zero_results' })).status, 200);
  assert.equal((await h.req('metrics', null, { metric: 'invented' })).status, 422);
  assert.equal((await h.req('metrics', null, { metric: 'home_view' }, 'POST', { origin: 'https://evil.test' })).status, 403);
  assert.equal((await h.req('admin/overview', player(1), undefined, 'GET', { consent: false })).status, 403);
  const before = await h.req('admin/overview', host, undefined, 'GET', { consent: false });
  assert.equal(before.data.metricsAvailable, true);
  assert.deepEqual(before.data.metrics.map(row => [row.metric, row.count]).sort(), [['home_view', 1], ['zero_results', 1]]);
  const id = await h.publish();
  await h.req('saved/' + id, player(1), { saved: true });
  await h.join(id, 1);
  await h.join(id, 2);
  const after = await h.req('admin/overview');
  const counts = new Map(after.data.metrics.map(row => [row.metric, row.count]));
  assert.equal(counts.get('saved_native'), 1);
  assert.equal(counts.get('booking_confirmed'), 2);
  assert.deepEqual(h.sqlite.prepare('PRAGMA table_info(site_metrics)').all().map(row => row.name), ['day', 'metric', 'count']);
  for (let i = 0; i < 118; i++) assert.equal((await h.req('metrics', null, { metric: 'home_view' })).status, 200);
  assert.equal((await h.req('metrics', null, { metric: 'home_view' })).status, 429);
  h.sqlite.close();
});

test('missing optional metrics table never blocks consent or free booking', async () => {
  const h = harness();
  h.sqlite.exec('DROP TABLE site_metrics');
  assert.equal((await h.req('metrics', null, { metric: 'home_view' })).status, 503);
  const id = await h.publish();
  assert.equal((await h.join(id, 1)).status, 200);
  const overview = await h.req('admin/overview');
  assert.equal(overview.status, 200);
  assert.equal(overview.data.metricsAvailable, false);
  h.sqlite.close();
});

test('sign-in alone persists no profile; consent is explicit, versioned and adult-only', async () => {
  const h=harness(), u=player(50), opts={consent:false};
  const session=await h.req('session',u,undefined,'GET',opts);
  assert.equal(session.data.consentAccepted,false);
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM users').get().n,0);
  assert.equal((await h.req('listings/mumbai-pickleball-cup-s3/save',u,{saved:true},'POST',opts)).data.error.code,'consent_required');
  for(const body of [{accepted:false,adult:true,version:'2026-11-02'},{accepted:true,adult:false,version:'2026-11-02'},{accepted:true,adult:true,version:'old'}]) assert.equal((await h.req('account/consent',u,body)).status,422);
  assert.equal((await h.req('account/consent',u,{accepted:true,adult:true,version:'2026-11-02'})).status,200);
  assert.equal((await h.req('session',u,undefined,'GET',opts)).data.consentAccepted,true);
  h.sqlite.close();
});
test('public support validates permission and limits abuse without leaking requests', async()=>{
  const h=harness(), message={name:'Test User',email:'support@example.test',category:'Sign-in issue',message:'I need help signing into my account.',consent:true};
  assert.equal((await h.req('support',null,{...message,consent:false})).status,422);
  assert.equal((await h.req('support',null,{...message,website:'bot'})).status,422);
  assert.equal((await h.req('support',null,message,'POST',{origin:'https://evil.test'})).status,403);
  assert.equal((await h.req('support',null,message,'POST',{adminEmail:''})).status,503);
  for(let n=0;n<3;n++) assert.equal((await h.req('support',null,message)).status,200);
  assert.equal((await h.req('support',null,message)).status,429);
  assert.equal((await h.req('admin/overview',null)).status,403);
  assert.equal((await h.req('admin/overview',player(1))).status,403);
  assert.equal((await h.req('admin/overview')).data.support.length,3);
  assert.equal((await h.req('admin/overview',host,undefined,'GET',{adminEmail:''})).status,403);
  assert.ok(h.sqlite.prepare('SELECT bucket FROM request_limits').all().every(r=>/^[a-f0-9]{64}$/.test(r.bucket)));
  h.sqlite.close();
});
test('owner withdrawal hides discovery and click entry; restoration preserves the listing identity',async()=>{
  const h=harness(), id='mumbai-pickleball-cup-s3';
  assert.equal((await h.req('admin/listing/'+id,player(1),{hidden:true,reason:'Cancelled'})).status,403);
  assert.equal((await h.req('admin/listing/'+id,host,{hidden:true,reason:'x'})).status,422);
  assert.equal((await h.req('admin/listing/'+id,host,{hidden:true,reason:'Organizer cancelled this event'})).status,200);
  assert.ok(!(await h.req('listings',null)).data.listings.some(e=>e.id===id));
  assert.equal((await h.req('listings/'+id,null)).data.listing.availability.code,'withdrawn');
  assert.equal((await h.req('listings/'+id+'/click',null,{})).status,410);
  await h.req('admin/listing/'+id,host,{hidden:false,reason:''});
  assert.ok((await h.req('listings',null)).data.listings.some(e=>e.id===id));
  h.sqlite.close();
});
test('export isolates accounts and excludes owner notes; discovery deletion removes only own records',async()=>{
  const h=harness(), a=player(1), b=player(2), id='mumbai-pickleball-cup-s3';
  await h.req('listings/'+id+'/save',a,{saved:true}); await h.req('listings/'+id+'/save',b,{saved:true});
  const support=await h.req('support',a,{name:'Player One',email:a.email,category:'General help',message:'Please help with this listing.',consent:true});
  await h.req('admin/support/'+support.data.id,host,{status:'open',note:'Internal routing information'});
  const exp=(await h.req('account/export',a)).data.data;
  assert.equal(exp.profile[0].id,a.userId); assert.equal(exp.support.length,1); assert.equal(exp.support[0].internal_note,undefined);
  assert.equal((await h.req('account/export',b)).data.data.support.length,0);
  assert.equal((await h.req('account/export',null)).status,401);
  assert.equal((await h.req('account/delete',a,{confirmation:'DELETE'})).status,422);
  assert.equal((await h.req('account/delete',a,{confirmation:'DELETE MY ACCOUNT'})).status,200);
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM users WHERE id=?').get(a.userId).n,0);
  assert.equal((await h.req('saved-listings',b)).data.listings.length,1);
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM support_requests WHERE user_id=?').get(a.userId).n,0);
  const event=await h.publish(); await h.join(event,2);
  assert.equal((await h.req('account/delete',b,{confirmation:'DELETE MY ACCOUNT'})).data.error.code,'history_requires_review');
  h.sqlite.close();
});
test('correction review can reopen and retention removes only old resolved records',async()=>{
  const h=harness(), id='basch-pickleball-2026';
  await h.req('listings/'+id+'/report',player(1),{reason:'Please confirm the entry fee.'});
  await h.req('admin/correction',host,{listingId:id,userId:'player-1',resolved:true});
  assert.equal(h.sqlite.prepare('SELECT status FROM listing_reports').get().status,'resolved');
  await h.req('listings/'+id+'/report',player(1),{reason:'Another detail needs checking.'});
  assert.equal(h.sqlite.prepare('SELECT status FROM listing_reports').get().status,'open');
  await h.req('admin/correction',host,{listingId:id,userId:'player-1',resolved:true});
  const support=await h.req('support',null,{name:'Test User',email:'support@example.test',category:'General help',message:'Please review this general question.',consent:true});
  await h.req('admin/support/'+support.data.id,host,{status:'resolved',note:'Handled'});
  await h.req('support',null,{name:'Still Open',email:'open@example.test',category:'General help',message:'Keep this request open for review.',consent:true});
  assert.equal((await h.req('admin/retention',player(2),{})).status,403);
  const r=await h.req('admin/retention',host,{},'POST',{now:now+91*86400000});
  assert.equal(r.status,200); assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM listing_reports').get().n,0);
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM support_requests').get().n,1);
  h.sqlite.close();
});

import { restoreBackup } from '../scripts/restore-backup.mjs';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as joinPath } from 'node:path';
test('owner backups restore into a new database and refuse overwriting existing files',async()=>{
  const h=harness(), id=await h.publish(); await h.join(id,1);
  await h.req('listings/mumbai-pickleball-cup-s3/save',player(1),{saved:true});
  await h.req('support',player(1),{name:'Player One',email:'p1@example.test',category:'General help',message:'Synthetic support request for recovery test.',consent:true});
  assert.equal((await h.req('admin/backup',player(1))).status,403);
  const snapshot=await h.req('admin/backup'); assert.equal(snapshot.status,200);
  const dir=mkdtempSync(joinPath(tmpdir(),'mercury-recovery-')),file=joinPath(dir,'recovered.sqlite');
  try {
    const counts=restoreBackup(snapshot.data,file);
    assert.equal(counts.bookings,1); assert.equal(counts.support_requests,1); assert.equal(counts.saved_listings,1);
    const recovered=new DatabaseSync(file); assert.equal(recovered.prepare('SELECT title FROM events').get().title,draft.title);recovered.close();
    assert.throws(()=>restoreBackup(snapshot.data,file),/EEXIST/);
    assert.throws(()=>restoreBackup({...snapshot.data,tables:{}},joinPath(dir,'bad.sqlite')),/complete/);
  }finally{rmSync(dir,{recursive:true,force:true});h.sqlite.close();}
});


test('game pass includes the event duration without exposing request keys or account identifiers', async () => {
  const h = harness();
  try {
    const id = await h.publish();
    await h.join(id, 1);
    const { data } = await h.req('bookings', player(1));
    assert.equal(data.bookings[0].duration, 90);
    assert.equal(data.bookings[0].user_id, undefined);
    assert.equal(data.bookings[0].idempotency_key, undefined);
  } finally { h.sqlite.close(); }
});
