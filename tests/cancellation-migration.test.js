import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';

test('cancellation migration removes levels while preserving existing registrations, payments and references', () => {
  const db=new DatabaseSync(':memory:');
  try {
    const directory=new URL('../drizzle/',import.meta.url);
    db.exec('PRAGMA foreign_keys=ON');
    for(const file of readdirSync(directory).filter(name=>name.endsWith('.sql')&&name<'0007_').sort()) db.exec(readFileSync(new URL(file,directory),'utf8'));
    db.exec(`INSERT INTO users VALUES('host','Host','host@example.test',1);
      INSERT INTO events(id,owner_id,title,sport,area,venue,date,time,starts_at,capacity,price,level,format,cover_image,qr_image,created_at,updated_at)
      VALUES('game','host','Original tournament','Tennis','Powai','Court','2030-11-22','18:00',9999999999999,12,250,'All levels','Tournament','cover-bytes','qr-bytes',1,1);
      INSERT INTO bookings(id,user_id,event_id,idempotency_key,player_name,level,rules_revision,consent_at,created_at,status,payment_method,payment_proof,amount,organizer_contact)
      VALUES('pass','host','game','migration-request','Host','Beginner',1,1,1,'pending','upi','receipt-bytes',250,'host@example.test');
      INSERT INTO saved_events VALUES('host','game',1);
      INSERT INTO notifications(id,user_id,event_id,message,created_at) VALUES('notice','host','game','Existing notice',1);`);
    db.exec(readFileSync(new URL('0007_cancellation_requests.sql',directory),'utf8'));
    for(const table of ['events','bookings']) assert.equal(db.prepare(`PRAGMA table_info(${table})`).all().some(column=>column.name==='level'),false);
    const booking=db.prepare('SELECT * FROM bookings').get();
    assert.equal(booking.status,'pending');
    assert.equal(booking.amount,250);
    assert.equal(booking.payment_proof,'receipt-bytes');
    assert.equal(booking.cancellation_requested_at,null);
    assert.equal(booking.refund_resolution,'');
    assert.equal(db.prepare('SELECT cover_image FROM events').get().cover_image,'cover-bytes');
    db.exec("UPDATE bookings SET status='cancellation_pending',cancellation_requested_at=2");
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys,1);
  } finally {db.close();}
});
