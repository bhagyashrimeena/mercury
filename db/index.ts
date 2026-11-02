import { getDatabase } from './vercel';

export function getDb() {
  const db = getDatabase();
  if (!db) throw new Error('SUPABASE_DB_URL is missing.');
  return db;
}
