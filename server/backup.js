export const BACKUP_TABLES = ['users','account_consents','organizers','events','bookings','saved_events','saved_listings','notifications','listing_reports','listing_overrides','listing_clicks','support_requests'];
export async function createBackup(db, now, fail) {
  const counts=await db.batch(BACKUP_TABLES.map(table=>db.prepare(`SELECT COUNT(*) AS n FROM ${table}`)));
  if(counts.reduce((n,r)=>n+Number(r.results[0].n),0)>5000) fail(413,'Use a provider database export for a backup larger than 5,000 rows.','backup_too_large');
  const results=await db.batch(BACKUP_TABLES.map(table=>db.prepare(`SELECT * FROM ${table}`)));
  return {format:'mercury-backup-v1',createdAt:new Date(now).toISOString(),tables:Object.fromEntries(BACKUP_TABLES.map((table,i)=>[table,results[i].results]))};
}
