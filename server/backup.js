export const BACKUP_TABLES = ['users','account_consents','organizers','events','bookings','saved_events','saved_listings','notifications','listing_reports','listing_overrides','listing_clicks','support_requests'];
export async function createBackup(db, now, fail) {
  const counts=await db.batch(BACKUP_TABLES.map(table=>db.prepare(`SELECT COUNT(*) AS n FROM ${table}`)));
  if(counts.reduce((n,r)=>n+Number(r.results[0].n),0)>5000) fail(413,'Use a provider database export for a backup larger than 5,000 rows.','backup_too_large');
  const images=await db.prepare('SELECT (SELECT COALESCE(SUM(length(qr_image)),0) FROM events) + (SELECT COALESCE(SUM(length(payment_proof)),0) FROM bookings) AS n').first();
  if(Number(images.n)>8*1024*1024) fail(413,'Use a provider database export for backups with more than 8 MB of payment images.','backup_too_large');
  const results=await db.batch(BACKUP_TABLES.map(table=>db.prepare(`SELECT * FROM ${table}`)));
  return {format:'mercury-backup-v1',createdAt:new Date(now).toISOString(),tables:Object.fromEntries(BACKUP_TABLES.map((table,i)=>[table,results[i].results]))};
}
