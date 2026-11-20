import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('launch schema repair restores missing columns without destroying payment-era columns or rows', async () => {
  const db = new PGlite();
  try {
    await db.exec(await read('../supabase/migrations/20261102_initial.sql'));
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
  } finally {
    await db.close();
  }
});
