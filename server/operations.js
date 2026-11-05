import { createBackup } from './backup.js';
import { clientIp } from './client-ip.js';
import { findListing, listings, listingStatus, indiaDay } from '../public/catalogue.js';
export const POLICY_VERSION = '2026-11-02';
const one = (db, sql, ...v) => db.prepare(sql).bind(...v).first();
const all = async (db, sql, ...v) => (await db.prepare(sql).bind(...v).all()).results;
const run = (db, sql, ...v) => db.prepare(sql).bind(...v).run();
const text = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const isAdmin = (user, config) => !!user?.userId && !!config.adminEmail && user.email?.toLowerCase() === config.adminEmail.toLowerCase();
export { isAdmin };
async function digest(value) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(v => v.toString(16).padStart(2, '0')).join(''); }
export async function consumeLimit(db, key, limit, now, fail) {
  const hour = Math.floor(now / 3600000);
  const bucket = await digest(key + ':' + hour);
  const result = await run(db, 'INSERT INTO request_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 WHERE count<?', bucket, (hour + 2) * 3600000, limit);
  if (!result.meta.changes) fail(429, 'Too many requests. Please try again later.', 'rate_limited');
  await run(db, 'DELETE FROM request_limits WHERE expires_at<?', now);
}
export async function operations({ db, user, now, path: p, method: m, body: b, request, config, fail }) {
  const route = p.join('/');
  const uid = user?.userId;
  if (route === 'support' && m === 'POST') {
    if (!config.adminEmail) fail(503, 'Support is temporarily unavailable. Please try again later.', 'support_unavailable');
    if (b.website) fail(422, 'Please submit the form again.', 'validation_failed');
    const email = text(b.email, 254), message = text(b.message, 2000), name = text(b.name, 80), category = text(b.category, 30);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length < 2 || message.length < 15 || !['General help','Sign-in issue','Listing correction','Organizer enquiry','Privacy request'].includes(category) || b.consent !== true)
      fail(422, 'Add your name, a valid email, a message and permission to respond.', 'validation_failed');
    // Platform-provided connecting IP is used only to derive a short-lived rate bucket.
    const address = clientIp(request);
    await consumeLimit(db, 'support-ip:' + address, 10, now, fail);
    await consumeLimit(db, 'support-email:' + email.toLowerCase(), 3, now, fail);
    const id = crypto.randomUUID();
    await run(db, 'INSERT INTO support_requests(id,user_id,name,email,category,message,status,created_at,updated_at) VALUES(?,?,?,?,?,?,\'open\',?,?)', id, uid || null, name, email, category, message, now, now);
    return { id, message: 'Your request is in Mercury’s support inbox. Keep this reference. Replies are handled by the team, not sent automatically.' };
  }
  if (route === 'account/consent' && m === 'POST') {
    if (!uid || !user.email) fail(401, 'Sign in to continue.', 'sign_in_required');
    if (b.accepted !== true || b.adult !== true || b.version !== POLICY_VERSION) fail(422, 'Confirm you are 18 or older and accept the current account notice and terms.', 'consent_required');
    await db.batch([
      db.prepare('INSERT INTO users(id,name,email,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email').bind(uid, text(user.fullName || 'Player', 80), user.email, now),
      db.prepare('INSERT INTO account_consents(user_id,version,accepted_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET version=excluded.version,accepted_at=excluded.accepted_at').bind(uid, POLICY_VERSION, now)
    ]);
    return { ok: true };
  }
  if (route === 'account/export' && m === 'GET') {
    if (!uid || !user.email) fail(401, 'Sign in to continue.', 'sign_in_required');
    const tables = [['profile','users','id'],['consent','account_consents','user_id'],['organizer','organizers','user_id'],['events','events','owner_id'],['bookings','bookings','user_id'],['savedEvents','saved_events','user_id'],['savedListings','saved_listings','user_id'],['corrections','listing_reports','user_id'],['notifications','notifications','user_id'],['support','support_requests','user_id']];
    const data = {};
    // Table and column identifiers are constants, never caller input.
    for (const [key, table, col] of tables) data[key] = await all(db, `SELECT * FROM ${table} WHERE ${col}=?`, uid);
    // Internal support review notes are not part of the self-service export.
    data.support = data.support.map(({ internal_note, ...row }) => row);
    return { exportedAt: new Date(now).toISOString(), data };
  }
  if (route === 'account/delete' && m === 'POST') {
    if (!uid || !user.email) fail(401, 'Sign in to continue.', 'sign_in_required');
    if (b.confirmation !== 'DELETE MY ACCOUNT') fail(422, 'Type DELETE MY ACCOUNT to confirm.', 'confirmation_required');
    const history = await one(db, 'SELECT (SELECT COUNT(*) FROM bookings WHERE user_id=?) + (SELECT COUNT(*) FROM events WHERE owner_id=?) AS count', uid, uid);
    if (history.count) fail(409, 'This account has Mercury event or registration history. Send a privacy request so we can remove your data without disrupting other players’ records.', 'history_requires_review');
    const queries = ['saved_listings','listing_reports','saved_events','notifications','account_consents','organizers'].map(table => db.prepare(`DELETE FROM ${table} WHERE user_id=?`).bind(uid));
    queries.push(db.prepare('DELETE FROM support_requests WHERE user_id=?').bind(uid));
    queries.push(db.prepare('DELETE FROM users WHERE id=?').bind(uid));
    await db.batch(queries);
    return { ok: true };
  }
  if (p[0] !== 'admin') return undefined;
  if (!isAdmin(user, config)) fail(403, 'This area is available to the Mercury owner only.', 'forbidden');
  if (m === 'GET' && route === 'admin/backup') return createBackup(db,now,fail);
  if (m === 'GET' && route === 'admin/overview') {
    const support = await all(db, 'SELECT * FROM support_requests ORDER BY CASE status WHEN \'open\' THEN 0 ELSE 1 END, created_at DESC LIMIT 100');
    const corrections = await all(db, 'SELECT r.*,u.name,u.email FROM listing_reports r JOIN users u ON u.id=r.user_id ORDER BY CASE r.status WHEN \'open\' THEN 0 ELSE 1 END, r.updated_at DESC LIMIT 100');
    const overrides = await all(db, 'SELECT * FROM listing_overrides');
    const clicks = await all(db, 'SELECT listing_id,SUM(count) AS count FROM listing_clicks WHERE day>=? GROUP BY listing_id', new Date(now - 30*86400000).toISOString().slice(0,10));
    let metrics = [], metricsAvailable = true;
    try {
      metrics = await all(db, 'SELECT metric,SUM(count) AS count FROM site_metrics WHERE day>=? GROUP BY metric', indiaDay(now - 30*86400000));
    } catch { metricsAvailable = false; }
    const saves = await all(db, 'SELECT listing_id,COUNT(*) AS count FROM saved_listings GROUP BY listing_id');
    const users = await one(db, 'SELECT COUNT(*) AS count FROM users');
    return { support, corrections, overrides, clicks, metrics, metricsAvailable, saves, users: users.count, listings: listings.map(e => ({ id:e.id,title:e.title,checkedOn:e.checkedOn,date:e.date,sourceUrl:e.sourceUrl,availability:listingStatus(e,now) })) };
  }
  if (m === 'POST' && p[1] === 'support' && p.length === 3) {
    if (!['open','resolved'].includes(b.status)) fail(422, 'Choose an open or resolved status.', 'validation_failed');
    const r = await run(db, 'UPDATE support_requests SET status=?,internal_note=?,updated_at=? WHERE id=?', b.status, text(b.note,1000), now, p[2]);
    if (!r.meta.changes) fail(404, 'Request not found.', 'not_found');
    return { ok:true };
  }
  if (m === 'POST' && route === 'admin/correction') {
    const r = await run(db, 'UPDATE listing_reports SET status=?,reviewed_at=? WHERE user_id=? AND listing_id=?', b.resolved === true ? 'resolved' : 'open', now, text(b.userId,200), text(b.listingId,100));
    if (!r.meta.changes) fail(404, 'Correction not found.', 'not_found');
    return { ok:true };
  }
  if (m === 'POST' && p[1] === 'listing' && p.length === 3) {
    if (!findListing(p[2])) fail(404,'Listing not found.','not_found');
    if (typeof b.hidden !== 'boolean') fail(422,'Choose a visibility state.','validation_failed');
    const reason = text(b.reason,200);
    if (b.hidden && reason.length < 5) fail(422,'Add a short reason for withdrawing this listing.','validation_failed');
    await run(db, 'INSERT INTO listing_overrides(listing_id,hidden,reason,updated_at) VALUES(?,?,?,?) ON CONFLICT(listing_id) DO UPDATE SET hidden=excluded.hidden,reason=excluded.reason,updated_at=excluded.updated_at', p[2], b.hidden ? 1 : 0, reason, now);
    return { ok:true };
  }
  if (m === 'POST' && route === 'admin/retention') {
    const result = await db.batch([
      db.prepare('DELETE FROM support_requests WHERE status=\'resolved\' AND updated_at<?').bind(now - 90*86400000),
      db.prepare('DELETE FROM listing_reports WHERE status=\'resolved\' AND reviewed_at<?').bind(now - 90*86400000),
      db.prepare('DELETE FROM listing_clicks WHERE day<?').bind(new Date(now - 365*86400000).toISOString().slice(0,10)),
      db.prepare('DELETE FROM request_limits WHERE expires_at<?').bind(now)
    ]);
    let metricRemoved = 0;
    try { metricRemoved = (await run(db, 'DELETE FROM site_metrics WHERE day<?', indiaDay(now - 90*86400000))).meta.changes; } catch { /* Older deployments may not have this table yet. */ }
    return { removed: result.reduce((sum,r) => sum + r.meta.changes,0) + metricRemoved };
  }
  fail(404,'Not found.','not_found');
}
