import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

test('optional instruction migration preserves existing events, bookings, saves and references', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys=ON');
    const directory = new URL('../drizzle/', import.meta.url);
    const migrations = readdirSync(directory).filter(name => name.endsWith('.sql')).sort();
    for (const name of migrations.filter(name => !name.startsWith('0005_')))
      db.exec(readFileSync(new URL(name, directory), 'utf8'));
    db.exec(`INSERT INTO users VALUES('host','Host','host@example.test',1);
      INSERT INTO events(id,owner_id,title,sport,area,venue,description,date,time,starts_at,capacity,price,level,format,included,bring,cancellation,created_at,updated_at)
      VALUES('game','host','Original game','Tennis','Powai','Court','Description','2030-11-22','18:00',9999999999999,12,0,'All levels','Social play','Court time','Water','Contact host',1,1);
      INSERT INTO saved_events VALUES('host','game',1);
      INSERT INTO notifications(id,user_id,event_id,message,created_at) VALUES('notice','host','game','Hello',1);
      INSERT INTO bookings(id,user_id,event_id,idempotency_key,player_name,level,rules_revision,consent_at,created_at)
      VALUES('pass','host','game','migration-test-key','Host','Beginner',1,1,1);`);
    db.exec(readFileSync(new URL('0005_optional_event_instructions.sql', directory), 'utf8'));
    assert.equal(db.prepare('SELECT title FROM events').get().title, 'Original game');
    for (const table of ['bookings', 'saved_events', 'notifications'])
      assert.equal(db.prepare(`SELECT event_id FROM ${table}`).get().event_id, 'game');
    db.exec('UPDATE events SET description=NULL,included=NULL,bring=NULL,cancellation=NULL');
    assert.equal(db.prepare('SELECT description FROM events').get().description, null);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  } finally { db.close(); }
});
