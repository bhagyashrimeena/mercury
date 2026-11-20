import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('launch schema repair restores missing columns without destroying payment-era columns or rows', async () => {
  const db = new PGlite();
  try {
    await db.exec(await read('../supabase/migrations/20261102_initial.sql'));
    // Model the important payment-era change: a paid event with a pending UPI
    // booking, and a partial unique index that treats pending as a reservation.
    await db.exec(`
      ALTER TABLE public.bookings DROP CONSTRAINT booking_status_valid;
      ALTER TABLE public.bookings ADD CONSTRAINT booking_status_valid
        CHECK (status IN ('pending','rejected','confirmed','checked_in','cancelled','event_cancelled'));
      ALTER TABLE public.bookings ADD COLUMN payment_method text NOT NULL DEFAULT 'free';
      DROP INDEX public.booking_active_unique;
      CREATE UNIQUE INDEX booking_active_unique ON public.bookings(user_id,event_id)
        WHERE status IN ('pending','confirmed','checked_in');
      INSERT INTO public.users(id,name,email,created_at) VALUES
        ('owner','Owner','owner@example.test',1),('player','Player','player@example.test',1);
      INSERT INTO public.organizers(user_id,name,created_at) VALUES ('owner','Club',1);
      INSERT INTO public.events(id,owner_id,title,sport,area,venue,description,date,time,starts_at,capacity,price,level,format,included,bring,cancellation,created_at,updated_at)
        VALUES ('paid-event','owner','Synthetic Paid Event','Tennis','Powai','Test venue','Synthetic test data','2027-01-01','10:00',1800000000000,2,1993,'All levels','Singles','Court','Racket','See rules',1,1);
      INSERT INTO public.bookings(id,user_id,event_id,idempotency_key,player_name,level,status,rules_revision,consent_at,created_at,payment_method)
        VALUES ('pending-booking','player','paid-event','request-test','Player','Beginner','pending',1,1,1,'upi');
    `);
    // Simulate a database drifted away from the legacy app's required columns.
    await db.exec('ALTER TABLE public.bookings DROP COLUMN level; ALTER TABLE public.events DROP COLUMN level;');
    const before = await db.query(`SELECT table_name FROM information_schema.columns
      WHERE table_schema='public' AND column_name='level' AND table_name IN ('events','bookings')`);
    assert.equal(before.rows.length, 0);
    const repair = await read('../docs/release/level-columns-repair.sql');
    await db.exec(repair);
    await db.exec(repair); // Additive SQL is safe to re-run in staging.
    const after = await db.query(`SELECT table_name, is_nullable FROM information_schema.columns
      WHERE table_schema='public' AND column_name='level' AND table_name IN ('events','bookings')
      ORDER BY table_name`);
    assert.deepEqual(after.rows, [
      { table_name: 'bookings', is_nullable: 'YES' },
      { table_name: 'events', is_nullable: 'YES' }
    ]);
    await db.query('SELECT level FROM public.bookings LIMIT 0');
    await db.query('SELECT level FROM public.events LIMIT 0');
    const payment = await db.query(`SELECT b.id,b.status,b.payment_method,b.level,e.price
      FROM public.bookings b JOIN public.events e ON e.id=b.event_id`);
    assert.deepEqual(payment.rows, [{ id: 'pending-booking', status: 'pending', payment_method: 'upi', level: null, price: 1993 }]);
    // The staging repair must not accidentally release a pending reservation.
    await assert.rejects(db.query(`INSERT INTO public.bookings
      (id,user_id,event_id,idempotency_key,player_name,level,status,rules_revision,consent_at,created_at)
      VALUES ('duplicate','player','paid-event','new-request','Player','Beginner','confirmed',1,1,1)`));

  } finally {
    await db.close();
  }
});
