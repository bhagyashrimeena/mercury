import { Pool, type PoolClient } from 'pg';

type Bound = { sql: string; args: unknown[] };
type Row = Record<string, unknown>;

let pool: Pool | undefined;

function connection() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) return null;
  const ca = process.env.SUPABASE_DB_CA?.replace(/\\n/g, '\n');
  const address = new URL(url);
  address.searchParams.delete('sslmode');
  address.searchParams.delete('sslrootcert');
  if (!pool) pool = new Pool({ connectionString: address.toString(), max: 2, idleTimeoutMillis: 10000, ssl: { ca, rejectUnauthorized: true } });
  return pool;
}

function numbered(sql: string) {
  let number = 0;
  return sql.replace(/\?/g, () => `$${++number}`);
}

function normalized(row: Row) {
  for (const key of ['count', 'registered', 'n']) {
    if (typeof row[key] === 'string' && /^\d+$/.test(row[key])) row[key] = Number(row[key]);
  }
  return row;
}

function adapter(runner: Pool | PoolClient) {
  async function execute(bound: Bound) {
    return runner.query<Row>(numbered(bound.sql), bound.args);
  }
  function statement(sql: string, args: unknown[] = []) {
    const bound = { sql, args };
    return {
      sql,
      args,
      bind(...values: unknown[]) { return statement(sql, values); },
      async first<T extends Row = Row>(): Promise<T | null> {
        const result = await execute(bound);
        return result.rows[0] ? normalized(result.rows[0]) as T : null;
      },
      async all<T extends Row = Row>(): Promise<{ results: T[] }> {
        const result = await execute(bound);
        return { results: result.rows.map(row => normalized(row) as T) };
      },
      async run(): Promise<{ meta: { changes: number } }> {
        const result = await execute(bound);
        return { meta: { changes: result.rowCount ?? 0 } };
      },
    };
  }
  async function batch(statements: Bound[]) {
    const results = [];
    for (const item of statements) {
      const result = await execute(item);
      results.push({ results: result.rows.map(normalized), meta: { changes: result.rowCount ?? 0 } });
    }
    return results;
  }
  return { prepare: statement, batch };
}

async function transaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** D1-shaped interface for the existing server rules, backed by PostgreSQL. */
export function getDatabase() {
  const pool = connection();
  if (!pool) return null;
  const base = adapter(pool);
  return {
    prepare: base.prepare,
    batch(statements: Bound[]) { return transaction(pool, client => adapter(client).batch(statements)); },
    withEventLock<T>(id: string, work: (db: ReturnType<typeof adapter>) => Promise<T>): Promise<T> {
      return transaction(pool, async client => {
        await client.query('SELECT id FROM events WHERE id=$1 FOR UPDATE', [id]);
        return work(adapter(client));
      });
    },
  };
}
