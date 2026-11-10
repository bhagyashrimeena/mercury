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
} finally {
  await client.end();
}
