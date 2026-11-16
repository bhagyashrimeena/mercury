import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {eventReviewQueue,eventReviewMarkup} from '../public/event-review-ui.js';
import {organizerEventCard,organizerMenuMarkup} from '../public/organizer-studio.js';

test('event review migration preserves existing live events, uploads and registration references', () => {
  const db=new DatabaseSync(':memory:');
  try {
    const directory=new URL('../drizzle/',import.meta.url);
    db.exec('PRAGMA foreign_keys=ON');
    for(const file of readdirSync(directory).filter(name=>name.endsWith('.sql')&&name<'0008_').sort()) db.exec(readFileSync(new URL(file,directory),'utf8'));
    db.exec(`INSERT INTO users VALUES('host','Host','host@example.test',1);
      INSERT INTO events(id,owner_id,title,sport,area,venue,date,time,starts_at,capacity,price,format,cover_image,qr_image,status,created_at,updated_at)
      VALUES('game','host','Original event','Tennis','Powai','Court','2030-11-22','18:00',9999999999999,12,250,'Tournament','cover-bytes','qr-bytes','published',1,2),
      ('draft','host','Private draft','Tennis','Powai','Court','2030-11-22','18:00',9999999999999,12,0,'Tournament','','','draft',1,2);
      INSERT INTO bookings(id,user_id,event_id,idempotency_key,player_name,rules_revision,consent_at,created_at)
      VALUES('pass','host','game','request','Host',1,1,1);
      INSERT INTO saved_events VALUES('host','game',1);
      INSERT INTO notifications(id,user_id,event_id,message,created_at) VALUES('notice','host','game','Existing notice',1);`);
    db.exec(readFileSync(new URL('0008_event_review.sql',directory),'utf8'));
    const event=db.prepare("SELECT * FROM events WHERE id='game'").get();
    assert.equal(event.status,'published');
    assert.equal(event.approved_at,2);
    assert.equal(event.submitted_at,null);
    assert.equal(event.review_note,'');
    assert.equal(event.qr_image,'qr-bytes');
    assert.equal(event.cover_image,'cover-bytes');
    assert.equal(db.prepare("SELECT approved_at FROM events WHERE id='draft'").get().approved_at,null);
    for(const table of ['bookings','saved_events','notifications']) assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,1);
    db.exec("UPDATE events SET status='pending_review',submitted_at=3 WHERE id='draft'");
    db.exec("UPDATE events SET status='rejected',review_note='Correct the date' WHERE id='draft'");
    assert.throws(()=>db.exec("UPDATE events SET status='unreviewed_live' WHERE id='draft'"));
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  } finally { db.close(); }
});

test('pending and rejected cards show private review status and cannot share a public page', () => {
  const event={id:'review-event',title:'<Private event>',status:'pending_review',date:'2030-11-22',time:'18:00',capacity:12,price:250,registered:0};
  const card=organizerEventCard(event);
  assert.match(card,/Under review/);
  assert.match(card,/class="organizer-card-visual" href="\/host\/review-event"/);
  assert.doesNotMatch(organizerMenuMarkup(event),/Copy link|View page|Send for review/);
  const rejected={...event,status:'rejected',reviewNote:'<Correct the venue>'};
  assert.match(organizerEventCard(rejected),/&lt;Correct the venue&gt;/);
  assert.match(organizerMenuMarkup(rejected),/Send for review/);
});

test('admin review displays all supplied details and inert private images with escaped content', () => {
  const event={id:'review-event',title:'<Private event>',status:'pending_review',revision:4,host:'<Club>',hostBio:'Local community',hostContact:'club@example.test',sport:'Tennis',type:'Tournament',date:'2030-11-22',time:'18:00',duration:90,area:'Powai',venue:'Court address',capacity:12,price:250,paymentMethods:['upi'],description:'<script>bad()</script>',included:['Court time'],bring:'Racket',cancellation:'Contact organizer',coverImage:'/api/admin/events/review-event/cover?revision=4',qrImage:'/api/admin/events/review-event/qr?revision=4'};
  const html=eventReviewMarkup(event,{name:'Host',email:'verified@example.test'});
  for(const text of ['Local community','Court address','Court time','Racket','Contact organizer','verified@example.test','Approve and publish','Request changes']) assert.ok(html.includes(text));
  assert.match(html,/&lt;script&gt;/);
  assert.doesNotMatch(html,/<script>|upi:\/\//);
  assert.match(html,/src="\/api\/admin\/events\/review-event\/qr\?revision=4"/);
  assert.doesNotMatch(eventReviewMarkup({...event,status:'rejected'},null),/Approve and publish/);
  assert.match(eventReviewQueue([{...event,organizer:'<Club>'}]),/&lt;Club&gt;/);
});
