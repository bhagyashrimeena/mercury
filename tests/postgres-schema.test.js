import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('Supabase schema applies on PostgreSQL and preserves booking constraints', async () => {
  const db = new PGlite();
  try {
    const migration = await readFile(new URL('../supabase/migrations/20261102_initial.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    const { rows: tables } = await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    assert.equal(tables.length, 13);

    await db.query('INSERT INTO users(id,name,email,created_at) VALUES($1,$2,$3,$4)', ['player-1', 'Player One', 'one@example.test', Date.now()]);
    await db.query("INSERT INTO organizers(user_id,name,created_at) VALUES($1,$2,$3)", ['player-1', 'Test Club', Date.now()]);
    const future = Date.now() + 86400000;
    await db.query(`INSERT INTO events(id,owner_id,title,sport,area,venue,description,date,time,starts_at,capacity,price,level,format,included,bring,cancellation,created_at,updated_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      ['event-1', 'player-1', 'Test game', 'Tennis', 'Powai', 'Test venue', 'Test only', '2027-01-01', '10:00', future, 2, 0, 'Beginner', 'Singles', 'Rackets', 'Water', 'Cancel before start', Date.now(), Date.now()]);
    await db.query('INSERT INTO bookings(id,user_id,event_id,idempotency_key,player_name,level,rules_revision,consent_at,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      ['booking-1', 'player-1', 'event-1', 'key-1', 'Player One', 'Beginner', 1, Date.now(), Date.now()]);
    await assert.rejects(db.query('INSERT INTO bookings(id,user_id,event_id,idempotency_key,player_name,level,rules_revision,consent_at,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      ['booking-2', 'player-1', 'event-1', 'key-2', 'Player One', 'Beginner', 1, Date.now(), Date.now()]));
    const { rows: indexes } = await db.query("SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='bookings'");
    assert.ok(indexes.some(row => row.indexname === 'booking_active_unique'));
  } finally {
    await db.close();
  }
});
