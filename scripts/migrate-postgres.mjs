import { readFile } from 'node:fs/promises';
import pg from 'pg';

const url = process.env.SUPABASE_DB_URL;
if (!url) throw new Error('Set SUPABASE_DB_URL to the Supabase Postgres connection string.');
const ca = process.env.SUPABASE_DB_CA?.replace(/\\n/g, '\n');
const address = new URL(url);
address.searchParams.delete('sslmode');
address.searchParams.delete('sslrootcert');
const client = new pg.Client({ connectionString: address.toString(), ssl: { ca, rejectUnauthorized: true } });
await client.connect();
try {
  for (const [table, file] of [
    ['users', '20261102_initial.sql'],
    ['site_metrics', '20261105132850_site_metrics.sql'],
  ]) {
    const { rows: [{ exists }] } = await client.query('SELECT to_regclass($1) IS NOT NULL AS exists', [`public.${table}`]);
    if (exists) { console.log(`Skipped ${file}; public.${table} already exists.`); continue; }
    const source = await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8');
    const statements = source.split(/;\s*(?:\r?\n|$)/).map(value => value.trim()).filter(Boolean);
    await client.query('BEGIN');
    try {
      for (const statement of statements) await client.query(statement);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    console.log(`Applied ${file} (${statements.length} statements).`);
  }
  await client.query('CREATE TABLE IF NOT EXISTS mercury_migrations (name text PRIMARY KEY)');
  await client.query('ALTER TABLE mercury_migrations ENABLE ROW LEVEL SECURITY');
  const name = '20261115000000_direct_payments.sql';
  await client.query('BEGIN');
  try {
    await client.query("SELECT pg_advisory_xact_lock(15000000)");
    if (!(await client.query('SELECT 1 FROM mercury_migrations WHERE name=$1', [name])).rowCount) {
      const applied = await client.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bookings' AND column_name='payment_consent_version'");
      if (!applied.rowCount) await client.query(await readFile(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8'));
      await client.query('INSERT INTO mercury_migrations(name) VALUES($1)', [name]);
      console.log('Applied ' + name);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  for (const migrationName of ['20261115010000_optional_event_instructions.sql', '20261116000000_event_covers.sql']) {
    await client.query('BEGIN');
    try {
      await client.query('SELECT pg_advisory_xact_lock(15000000)');
      if (!(await client.query('SELECT 1 FROM mercury_migrations WHERE name=$1', [migrationName])).rowCount) {
        await client.query(await readFile(new URL('../supabase/migrations/' + migrationName, import.meta.url), 'utf8'));
        await client.query('INSERT INTO mercury_migrations(name) VALUES($1)', [migrationName]);
        console.log('Applied ' + migrationName);
      }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  }
} finally {
  await client.end();
}
