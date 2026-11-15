import { operations, isAdmin, consumeLimit } from './operations.js';
import { clientIp } from './client-ip.js';
import { findListing, currentListings, listingStatus, indiaDay } from '../public/catalogue.js';
import { validateDraft, newId } from '../public/domain.js';
import { CLIENT_METRICS, recordMetric } from './metrics.js';
const ACTIVE = "('pending','confirmed','checked_in')";
const PUBLIC_SELECT = `SELECT e.id,e.owner_id,e.title,e.sport,e.area,e.venue,e.description,e.date,e.time,e.starts_at,e.duration,e.capacity,e.price,e.level,e.format,e.included,e.bring,e.cancellation,e.status,e.revision,e.created_at,e.payment_methods,CASE WHEN length(e.qr_image)>0 THEN 'present' ELSE '' END AS qr_image,o.name AS host,o.bio AS host_bio,o.contact AS host_contact,(SELECT COUNT(*) FROM bookings b WHERE b.event_id=e.id AND b.status IN ${ACTIVE}) AS registered,(SELECT COUNT(*) FROM bookings pending WHERE pending.event_id=e.id AND pending.status='pending') AS pending_count FROM events e JOIN organizers o ON o.user_id=e.owner_id`;
export class ApiError extends Error {
    constructor(status, message, code = 'request_failed', fields = null) { super(message); this.status = status; this.code = code; this.fields = fields; }
}
const fail = (status, message, code, fields) => { throw new ApiError(status, message, code, fields); };
const clean = (value, max = 150) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const one = (db, sql, ...values) => db.prepare(sql).bind(...values).first();
const all = async (db, sql, ...values) => (await db.prepare(sql).bind(...values).all()).results;
const run = (db, sql, ...values) => db.prepare(sql).bind(...values).run();
export function publicEvent(row) { if (!row)
    return null; return { id: row.id, title: row.title, sport: row.sport, area: row.area, venue: row.venue, description: row.description, date: row.date, time: row.time, startsAt: row.starts_at, duration: row.duration, capacity: row.capacity, price: row.price, paymentMethods: (row.payment_methods || '').split(',').filter(Boolean), qrImage: row.qr_image ? '/api/events/' + encodeURIComponent(row.id) + '/qr' : '', level: row.level, type: row.format, format: row.format + ' · individual entry', included: row.included ? row.included.split('\n').filter(Boolean) : null, bring: row.bring, cancellation: row.cancellation, status: row.status, revision: row.revision, host: row.host, hostBio: row.host_bio, hostContact: row.host_contact, spots: Math.max(0, row.capacity - Number(row.registered)), registered: Number(row.registered), pendingCount: Number(row.pending_count || 0), image: row.sport === 'Badminton' ? 'badminton.jpg' : row.sport === 'Tennis' ? 'tennis.jpg' : 'court.jpg', solo: true, isDemo: false, tag: 'YOUR NEXT GAME STARTS HERE' }; }
function ensureUser(user) {
    if (!user?.userId || !user?.email) fail(401, 'Sign in to continue.', 'sign_in_required');
    return user.userId;
}
async function provisionUser(db, user, now) {
    if (!user?.userId || !user?.email) return;
    await run(db, 'INSERT INTO users(id,name,email,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email WHERE users.email<>excluded.email', user.userId, clean(user.fullName || 'Player',80) || 'Player', user.email, now);
}
async function ownedEvent(db, id, userId) { const e = await one(db, 'SELECT * FROM events WHERE id=? AND owner_id=?', id, userId); if (!e)
    fail(404, 'This event is not available in your organizer account.', 'not_found'); return e; }
function eventValues(d) { return [d.title, d.sport, d.area, d.venue, d.description, d.date, d.time, Date.parse(`${d.date}T${d.time}:00+05:30`), d.capacity, d.price, d.level, d.format, d.included, d.bring, d.cancellation]; }
function validate(input, now) { const result = validateDraft(input, new Date(now)); if (!result.valid)
    fail(422, 'Check the highlighted event details.', 'validation_failed', result.errors); return result.value; }
const notify = (db, userId, eventId, message, now) => db.prepare('INSERT INTO notifications(id,user_id,event_id,message,created_at) VALUES(?,?,?,?,?)').bind(newId(), userId, eventId, message, now);
const PAYMENT_TERMS = '2026-11-15-direct-payments';
function imageData(value, required = false) {
    if (!value && !required) return '';
    if (typeof value !== 'string' || value.length > 1050000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) fail(422, 'Upload a PNG, JPEG or WebP image under 750 KB.', 'invalid_image');
    let bytes;
    try { bytes = Uint8Array.from(atob(value.split(',')[1]), c => c.charCodeAt(0)); } catch { fail(422, 'The image could not be read.', 'invalid_image'); }
    const hex = [...bytes.slice(0,12)].map(x => x.toString(16).padStart(2,'0')).join('');
    const valid = value.startsWith('data:image/png;') ? hex.startsWith('89504e470d0a1a0a') : value.startsWith('data:image/jpeg;') ? hex.startsWith('ffd8ff') : hex.startsWith('52494646') && hex.endsWith('57454250');
    if (!valid || bytes.length > 768000) fail(422, 'The image format or size is invalid.', 'invalid_image');
    return value;
}
function paymentConfig(b, event) {
    const methods = Array.isArray(b.paymentMethods) ? [...new Set(b.paymentMethods)] : [];
    if (methods.some(m => !['upi','cash'].includes(m))) fail(422, 'Choose UPI or cash.', 'validation_failed');
    return [methods.join(','), event && b.qrImage === '/api/events/' + encodeURIComponent(event.id) + '/qr' ? event.qr_image : imageData(b.qrImage)];
}
async function parseBody(request) { if (!(request.headers.get('content-type') || '').startsWith('application/json'))
    fail(415, 'Send JSON data.', 'content_type'); const origin = request.headers.get('origin'); if (origin !== new URL(request.url).origin)
    fail(403, 'This request must come from Mercury.', 'origin_mismatch'); const limit = /^\/api\/(organizer\/events(?:\/[^/]+)?|events\/[^/]+\/register)$/.test(new URL(request.url).pathname) ? 1100000 : 16384; if (Number(request.headers.get('content-length') || 0) > limit)
    fail(413, 'The request is too large.', 'body_too_large'); let raw = '';
    const reader = request.body?.getReader();
    if (reader) {
        let length = 0; const decoder = new TextDecoder();
        try { while (true) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.byteLength; if (length > limit) { await reader.cancel(); fail(413, 'The request is too large.', 'body_too_large'); } raw += decoder.decode(chunk.value, {stream:true}); } raw += decoder.decode(); }
        finally { reader.releaseLock(); }
    } try {
    const b = JSON.parse(raw);
    if (!b || typeof b !== 'object' || Array.isArray(b))
        throw Error();
    return b;
}
catch {
    fail(400, 'The submitted data could not be read.', 'invalid_json');
} }
export async function apiHandler(request, db, user, { now = Date.now(), adminEmail = '' } = {}) {
    try {
        if (!db)
            fail(503, 'Mercury is temporarily unavailable. Please try again.', 'database_unavailable');
        const url = new URL(request.url);
        const path = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
        const method = request.method;
        let body = {};
        if (!['GET', 'HEAD'].includes(method))
            body = await parseBody(request);
        if (path[0] === 'account' && ['consent','export'].includes(path[1])) fail(404, 'This action is not available.', 'not_found');
        await provisionUser(db, user, now);
        let bookingNotifications = null;
        const options = { request, db, user, now, path, method, body, config: { adminEmail }, onBookingCreated: statements => { bookingNotifications = statements; } };
        // PostgreSQL needs an event-row lock across the capacity check and insert.
        // The SQLite test adapter keeps its existing serial-write behavior.
        const lockId = method === 'POST' && path[0] === 'events' && path[2] === 'register' ? path[1] : ['POST','PATCH'].includes(method) && path[0] === 'organizer' && path[1] === 'events' ? path[2] : null;
        const result = lockId && db.withEventLock
            ? await db.withEventLock(lockId, lockedDb => dispatch({ ...options, db: lockedDb }))
            : await dispatch(options);
        // The event lock transaction has committed before best-effort notifications run.
        if (bookingNotifications) {
            try {
                await db.batch(bookingNotifications);
            }
            catch {
                console.error('Booking notification unavailable');
            }
        }
        const completedMetric = method === 'POST' && path[0] === 'listings' && path[2] === 'save' && body.saved === true ? 'saved_external'
            : method === 'POST' && path[0] === 'saved' && body.saved === true ? 'saved_native'
            : method === 'POST' && path[0] === 'events' && path[2] === 'register' && !result.existing && result.status !== 'pending' ? 'booking_confirmed'
            : null;
        if (completedMetric) await recordMetric(db, completedMetric, now);
        if (result instanceof Response) return result;
        return Response.json(result, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Cookie' } });
    }
    catch (error) {
        const known = error instanceof ApiError;
        if (!known)
            console.error('Mercury API failure', { name:error?.name || 'Error', path:new URL(request.url).pathname.slice(0,180) });
        const failurePath = new URL(request.url).pathname;
        if (db && failurePath !== '/api/metrics') {
            if (failurePath.endsWith('/register') && (known ? error.status >= 400 : true)) await recordMetric(db, 'booking_failed', now);
            if (!known || error.status >= 500) await recordMetric(db, 'api_error', now);
        }
        return Response.json({ error: { code: known ? error.code : 'server_error', message: known ? error.message : 'Something went wrong. Please try again.', fields: known ? error.fields : null } }, { status: known ? error.status : 500, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    }
}
async function dispatch({ request, db, user, now, path: p, method: m, body: b, config, onBookingCreated }) {
    const route = p.join('/');
    const op = await operations({ db, user, now, path: p, method: m, body: b, request, config, fail });
    if (op !== undefined) return op;
    if (m === 'GET' && route === 'health') {
        await one(db, 'SELECT 1 AS ok');
        return { ok: true, version: '0.5.0', paymentsEnabled: false };
    }
    if (m === 'POST' && route === 'metrics') {
        if (!CLIENT_METRICS.has(b.metric)) fail(422, 'Choose a supported count.', 'validation_failed');
        await consumeLimit(db, 'metric:' + clientIp(request), 120, now, fail);
        if (!await recordMetric(db, b.metric, now)) fail(503, 'Counting is temporarily unavailable.', 'metrics_unavailable');
        return { ok: true };
    }
    if (m === 'GET' && route === 'listings') {
        const hidden = new Set((await all(db, 'SELECT listing_id FROM listing_overrides WHERE hidden=1')).map(x => x.listing_id));
        return { listings: currentListings(now).filter(e => !hidden.has(e.id)).map(e => ({ ...e, availability: listingStatus(e, now) })) };
    }
    if (p[0] === 'listings' && p.length >= 2) {
        const listing = findListing(p[1]);
        if (!listing) fail(404, 'This listing is not available.', 'not_found');
        const override = await one(db, 'SELECT hidden,reason FROM listing_overrides WHERE listing_id=?', listing.id);
        if (m === 'GET' && p.length === 2)
            return { listing: { ...listing, availability: override?.hidden ? { code: 'withdrawn', label: 'Listing withdrawn', reason: override.reason } : listingStatus(listing, now) } };
        if (override?.hidden && p[2] === 'click') fail(410, 'This listing was withdrawn.', 'listing_withdrawn');
        if (m === 'POST' && p.length === 3 && p[2] === 'click') {
            await consumeLimit(db, 'click:' + clientIp(request) + ':' + listing.id, 30, now, fail);
            // Aggregate link activations, not unique people or confirmed registrations.
            await run(db, 'INSERT INTO listing_clicks(listing_id,day,count) VALUES(?,?,1) ON CONFLICT(listing_id,day) DO UPDATE SET count=listing_clicks.count+1', listing.id, indiaDay(now));
            return { ok: true };
        }
    }
    if (m === 'GET' && route === 'events') {
        const rows = await all(db, `${PUBLIC_SELECT} WHERE e.status='published' AND e.starts_at>? ORDER BY e.starts_at LIMIT 100`, now);
        return { events: rows.map(publicEvent) };
    }
    if (m === 'GET' && p[0] === 'events' && p.length === 2) {
        const row = await one(db, `${PUBLIC_SELECT} WHERE e.id=? AND e.status IN ('published','cancelled')`, p[1]);
        if (!row)
            fail(404, 'This game is not available.', 'not_found');
        return { event: publicEvent(row) };
    }
    if (m === 'GET' && route === 'session') {
        if (!user?.userId || !user?.email) return { user:null, organizer:null, saved:[], savedListings:[], notifications:[], paymentsEnabled:false, isAdmin:false };
        const uid = user.userId;
        const profile = await one(db, 'SELECT name,email FROM users WHERE id=?', uid);
        const organizer = await one(db, 'SELECT name,bio,contact FROM organizers WHERE user_id=?', uid);
        const saved = await all(db, 'SELECT event_id FROM saved_events WHERE user_id=?', uid);
        const savedListings = await all(db, 'SELECT listing_id FROM saved_listings WHERE user_id=?', uid);
        const notificationRows = await all(db, 'SELECT n.id,n.event_id,n.message,n.read_at,n.created_at,(SELECT owner_id FROM events WHERE id=n.event_id) AS event_owner FROM notifications n WHERE n.user_id=? ORDER BY n.created_at DESC LIMIT 50', uid);
        const notifications = notificationRows.map(({event_owner, ...n}) => ({...n, actionPath: n.event_id && event_owner === uid ? '/roster/' + encodeURIComponent(n.event_id) : '/my-games'}));
        return { user: { name:profile?.name || clean(user.fullName || 'Player',80), email:user.email }, organizer, saved:saved.map(x=>x.event_id), savedListings:savedListings.map(x=>x.listing_id), notifications, paymentsEnabled:false, isAdmin:isAdmin(user,config) };
    }
    const uid = ensureUser(user);
    if (m === 'GET' && ((p[0] === 'events' && p[2] === 'qr') || (p[0] === 'bookings' && p[2] === 'proof')) && p.length === 3) {
        const row = p[0] === 'events'
            ? await one(db, "SELECT qr_image AS image FROM events WHERE id=? AND (status='published' OR owner_id=?)", p[1], uid)
            : await one(db, 'SELECT b.payment_proof AS image FROM bookings b JOIN events e ON e.id=b.event_id WHERE b.id=? AND (b.user_id=? OR e.owner_id=?)', p[1], uid, uid);
        if (!row?.image) fail(404, 'Image not available.', 'not_found');
        const [header, data] = row.image.split(',');
        return new Response(Uint8Array.from(atob(data), c => c.charCodeAt(0)), {headers:{'Content-Type':header.slice(5).split(';')[0], 'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff', 'Content-Security-Policy':"default-src 'none'; sandbox"}});
    }
    if (m === 'GET' && route === 'saved-listings') {
        const rows = await all(db, 'SELECT listing_id FROM saved_listings WHERE user_id=? ORDER BY created_at DESC', uid);
        const hidden = new Set((await all(db, 'SELECT listing_id FROM listing_overrides WHERE hidden=1')).map(x=>x.listing_id));
        return { listings: rows.map(r => findListing(r.listing_id)).filter(Boolean).map(e => ({ ...e, availability: hidden.has(e.id) ? {code:'withdrawn',label:'Listing withdrawn'} : listingStatus(e, now) })) };
    }
    if (m === 'POST' && p[0] === 'listings' && p.length === 3) {
        const listing = findListing(p[1]);
        if (!listing) fail(404, 'This listing is not available.', 'not_found');
        if (p[2] === 'save') {
            if (typeof b.saved !== 'boolean') fail(422, 'Choose whether to save this listing.', 'validation_failed');
            if (b.saved) await run(db, 'INSERT INTO saved_listings(user_id,listing_id,created_at) VALUES(?,?,?) ON CONFLICT(user_id,listing_id) DO NOTHING', uid, listing.id, now);
            else await run(db, 'DELETE FROM saved_listings WHERE user_id=? AND listing_id=?', uid, listing.id);
            return { ok: true };
        }
        if (p[2] === 'report') {
            const reason = clean(b.reason, 500);
            if (reason.length < 10) fail(422, 'Please describe the correction in at least 10 characters.', 'validation_failed');
            await run(db, 'INSERT INTO listing_reports(user_id,listing_id,reason,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id,listing_id) DO UPDATE SET reason=excluded.reason,status=excluded.status,reviewed_at=NULL,updated_at=excluded.updated_at', uid, listing.id, reason, now);
            return { ok: true };
        }
    }
    if (m === 'POST' && route === 'profile') {
        const name = clean(b.name, 80);
        if (name.length < 2)
            fail(422, 'Enter a name with at least two characters.', 'validation_failed');
        await run(db, 'UPDATE users SET name=? WHERE id=?', name, uid);
        return { ok: true };
    }
    if (m === 'POST' && route === 'organizer/profile') {
        const name = clean(b.name, 80), bio = clean(b.bio, 500), contact = clean(b.contact, 150);
        if (name.length < 3)
            fail(422, 'Add your club or organizer name.', 'validation_failed');
        if (!contact && (await one(db, "SELECT COUNT(*) AS count FROM events WHERE owner_id=? AND price>0 AND status='published'", uid)).count > 0) fail(422, 'Keep a public contact while paid events are published.', 'contact_required');
        if (contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact))
            fail(422, 'Enter a valid public contact email or leave it empty.', 'validation_failed');
        await run(db, 'INSERT INTO organizers(user_id,name,bio,contact,created_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET name=excluded.name,bio=excluded.bio,contact=excluded.contact', uid, name, bio, contact, now);
        return { ok: true };
    }
    if (m === 'GET' && route === 'organizer/events') {
        const rows = await all(db, `${PUBLIC_SELECT} WHERE e.owner_id=? ORDER BY e.created_at DESC LIMIT 100`, uid);
        return { events: rows.map(row => ({ ...publicEvent(row), draft: { title: row.title, sport: row.sport, area: row.area, date: row.date, time: row.time, capacity: row.capacity, price: row.price, level: row.level, format: row.format, venue: row.venue, description: row.description, included: row.included, bring: row.bring, cancellation: row.cancellation, paymentMethods: row.payment_methods.split(',').filter(Boolean), qrImage: row.qr_image ? '/api/events/' + encodeURIComponent(row.id) + '/qr' : '' } })) };
    }
    if (m === 'POST' && route === 'organizer/events') {
        if (!await one(db, 'SELECT user_id FROM organizers WHERE user_id=?', uid))
            fail(403, 'Set up your organizer profile first.', 'organizer_required');
        await consumeLimit(db, 'event-create:' + uid, 20, now, fail);
        const d = validate(b, now);
        const [methods, qr] = paymentConfig(b);
        const id = newId();
        await run(db, 'INSERT INTO events(id,owner_id,title,sport,area,venue,description,date,time,starts_at,capacity,price,level,format,included,bring,cancellation,payment_methods,qr_image,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', id, uid, ...eventValues(d), methods, qr, now, now);
        return { id };
    }
    if (p[0] === 'organizer' && p[1] === 'events' && p.length >= 3) {
        const id = p[2];
        const e = await ownedEvent(db, id, uid);
        if (m === 'PATCH' && p.length === 3) {
            const d = validate(b, now);
        const [methods, qr] = paymentConfig(b, e);
            if (e.status === 'cancelled')
                fail(409, 'Cancelled events cannot be edited. Create a new event.', 'event_cancelled');
            const active = await one(db, `SELECT COUNT(*) AS count FROM bookings WHERE event_id=? AND status IN ${ACTIVE}`, id);
            if (active.count > 0 || (await one(db, 'SELECT COUNT(*) AS count FROM bookings WHERE event_id=? AND amount>0', id)).count > 0)
                fail(409, 'This event has registrations. Cancel it before changing the advertised details.', 'has_registrations');
            if (e.status === 'published' && d.price > 0 && !(await one(db, 'SELECT contact FROM organizers WHERE user_id=?', uid))?.contact) fail(422, 'Add a public payment contact.', 'contact_required');
            if (e.status === 'published' && d.price > 0 && (!methods || (methods.includes('upi') && !qr))) fail(422, 'Set payment options and upload a UPI QR image.', 'payments_unavailable');
            const result = await run(db, `UPDATE events SET title=?,sport=?,area=?,venue=?,description=?,date=?,time=?,starts_at=?,capacity=?,price=?,level=?,format=?,included=?,bring=?,cancellation=?,payment_methods=?,qr_image=?,revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND revision=? AND status!='cancelled' AND NOT EXISTS(SELECT 1 FROM bookings WHERE event_id=? AND status IN ${ACTIVE})`, ...eventValues(d), methods, qr, now, id, uid, Number(b.revision), id);
            if (!result.meta.changes)
                fail(409, 'This event changed or received a booking. Reload before editing.', 'version_conflict');
            return { ok: true };
        }
        if (m === 'POST' && p[3] === 'publish') {
            if (e.status === 'cancelled')
                fail(409, 'Cancelled events cannot be published again.', 'event_cancelled');
            if (e.price > 0 && (!e.payment_methods || (e.payment_methods.includes('upi') && !e.qr_image))) fail(409, 'Choose cash or upload your UPI QR image before publishing.', 'payments_unavailable');
            if (e.price > 0 && !(await one(db, 'SELECT contact FROM organizers WHERE user_id=?', uid))?.contact) fail(422, 'Add a public organizer contact email for payment and refund queries.', 'contact_required');
            if (e.starts_at <= now)
                fail(409, 'Choose a future event date before publishing.', 'event_started');
            if (e.status === 'published')
                return { ok: true };
            const r = await run(db, "UPDATE events SET status='published',updated_at=? WHERE id=? AND owner_id=? AND status='draft' AND starts_at>? AND revision=?", now, id, uid, now, e.revision);
            if (!r.meta.changes)
                fail(409, 'This event changed. Reload before publishing.', 'version_conflict');
            return { ok: true };
        }
        if (m === 'POST' && p[3] === 'unpublish') {
            const result = await run(db, `UPDATE events SET status='draft',updated_at=? WHERE id=? AND owner_id=? AND status='published' AND NOT EXISTS(SELECT 1 FROM bookings WHERE event_id=? AND status IN ${ACTIVE})`, now, id, uid, id);
            if (!result.meta.changes)
                fail(409, 'Events with registrations must be cancelled instead.', 'has_registrations');
            return { ok: true };
        }
        if (m === 'POST' && p[3] === 'cancel') {
            if (e.status === 'cancelled')
                return { ok: true };
            await db.batch([db.prepare("UPDATE events SET status='cancelled',updated_at=? WHERE id=? AND owner_id=?").bind(now, id, uid), db.prepare(`INSERT INTO notifications(id,user_id,event_id,message,created_at) SELECT 'cancel-'||id,user_id,event_id,?,? FROM bookings WHERE event_id=? AND status IN ${ACTIVE} ON CONFLICT(id) DO NOTHING`).bind(`${e.title} was cancelled by the organizer.`, now, id), db.prepare(`UPDATE bookings SET status='event_cancelled',cancelled_at=? WHERE event_id=? AND status IN ${ACTIVE}`).bind(now, id)]);
            return { ok: true };
        }
        if (m === 'GET' && p[3] === 'attendees') {
            const attendees = await all(db, 'SELECT id,player_name,level,status,created_at,checked_in_at,payment_method,amount,review_note,CASE WHEN length(payment_proof)>0 THEN 1 ELSE 0 END AS has_proof,(SELECT email FROM users WHERE users.id=bookings.user_id) AS player_email FROM bookings WHERE event_id=? ORDER BY created_at', id);
            return { event: publicEvent(await one(db, `${PUBLIC_SELECT} WHERE e.id=?`, id)), attendees };
        }
        if (m === 'POST' && p[3] === 'review' && p.length === 4) {
            if (!['accept','reject'].includes(b.decision)) fail(422, 'Choose accept or reject.', 'validation_failed');
            if (e.status !== 'published' || e.starts_at <= now) fail(409, 'Review is closed for this event.', 'event_unavailable');
            const booking = await one(db, 'SELECT id,user_id,status FROM bookings WHERE id=? AND event_id=?', clean(b.bookingId,100), id);
            if (!booking) fail(404, 'Registration not found.', 'not_found');
            const status = b.decision === 'accept' ? 'confirmed' : 'rejected';
            if (booking.status === status) return {ok:true};
            if (booking.status !== 'pending') fail(409, 'This registration was already reviewed or cancelled.', 'booking_changed');
            const note = clean(b.note,500);
            const result = await run(db, "UPDATE bookings SET status=?,review_note=?,reviewed_at=? WHERE id=? AND event_id=? AND status='pending'", status,note,now,booking.id,id);
            if (!result.meta.changes) fail(409, 'This registration changed. Refresh the roster.', 'booking_changed');
            onBookingCreated([notify(db,booking.user_id,id, status === 'confirmed' ? `Your registration for ${e.title} was accepted. Open My games for your pass.` : `Your registration for ${e.title} was rejected. Open My games for organizer contact and refund details.`,now)]);
            return {ok:true};
        }
        if (m === 'POST' && p[3] === 'check-in') {
            if (e.status !== 'published')
                fail(409, 'Only published events can check in players.', 'event_unavailable');
            const r = await run(db, "UPDATE bookings SET status='checked_in',checked_in_at=? WHERE id=? AND event_id=? AND status='confirmed' AND EXISTS(SELECT 1 FROM events WHERE id=? AND status='published')", now, clean(b.bookingId, 64), id, id);
            if (!r.meta.changes) {
                const existing = await one(db, "SELECT id FROM bookings WHERE id=? AND event_id=? AND status='checked_in'", clean(b.bookingId, 64), id);
                if (!existing)
                    fail(409, 'This registration cannot be checked in.', 'booking_unavailable');
            }
            return { ok: true };
        }
    }
    if (m === 'POST' && p[0] === 'events' && p[2] === 'register') {
        if (b.rulesAccepted !== true)
            fail(422, 'Read and accept the event rules.', 'consent_required');
        const name = clean(b.name, 80), level = clean(b.level, 30), key = clean(b.idempotencyKey, 100);
        if (name.length < 2 || !['Beginner', 'Intermediate', 'Advanced'].includes(level))
            fail(422, 'Enter your name and playing level.', 'validation_failed');
        if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
            fail(422, 'Refresh and try registration again.', 'invalid_request_key');
        const prior = await one(db, 'SELECT id,event_id,status FROM bookings WHERE user_id=? AND idempotency_key=?', uid, key);
        if (prior) {
            if (prior.event_id !== p[1])
                fail(409, 'This registration request belongs to another event.', 'request_conflict');
            if (!['pending', 'confirmed', 'checked_in'].includes(prior.status))
                fail(409, 'This request was already cancelled. Start a new registration.', 'request_cancelled');
            return { id: prior.id, existing: true };
        }
        const event = await one(db, 'SELECT * FROM events WHERE id=?', p[1]);
        if (!event || event.status !== 'published')
            fail(409, 'This event is not accepting registrations.', 'event_unavailable');

        if (event.starts_at <= now)
            fail(409, 'Registration for this event has closed.', 'event_started');
        if (Number(b.revision) !== event.revision)
            fail(409, 'The event details changed. Read the updated rules before joining.', 'event_changed');
        const existing = await one(db, `SELECT id FROM bookings WHERE user_id=? AND event_id=? AND status IN ${ACTIVE}`, uid, event.id);
        if (existing)
            return { id: existing.id, existing: true };
        const paid = event.price > 0;
        const method = paid ? b.paymentMethod : 'free';
        if (paid && (b.paymentConsentVersion !== PAYMENT_TERMS || !(event.payment_methods || '').split(',').includes(method))) fail(422, 'Choose an enabled payment method and accept the direct payment terms.', 'payment_consent_required');
        await consumeLimit(db, 'registration:' + uid, 20, now, fail);
        const proof = paid && method === 'upi' ? imageData(b.paymentProof,true) : '';
        const contact = paid ? (await one(db, 'SELECT contact FROM organizers WHERE user_id=?', event.owner_id))?.contact : '';
        if (paid && !contact) fail(409, 'Organizer payment contact is unavailable. Contact support before paying.', 'contact_required');
        const status = paid ? 'pending' : 'confirmed';
        const id = newId();
        const result = await run(db, `INSERT INTO bookings(id,user_id,event_id,idempotency_key,player_name,level,rules_revision,consent_at,created_at,status,payment_method,payment_proof,amount,organizer_contact,payment_consent_version) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM events e WHERE e.id=? AND e.status='published' AND e.starts_at>? AND e.revision=? AND (SELECT COUNT(*) FROM bookings b WHERE b.event_id=e.id AND b.status IN ${ACTIVE})<e.capacity) ON CONFLICT DO NOTHING`, id, uid, event.id, key, name, level, event.revision, now, now, status, method, proof, event.price, contact || '', paid ? PAYMENT_TERMS : '', event.id, now, event.revision);
        if (!result.meta.changes) {
            const duplicate = await one(db, `SELECT id FROM bookings WHERE user_id=? AND event_id=? AND status IN ${ACTIVE}`, uid, event.id);
            if (duplicate)
                return { id: duplicate.id, existing: true };
            fail(409, 'The last spot was taken or this event changed. Please refresh.', 'capacity_changed');
        }
        onBookingCreated([
            notify(db, uid, event.id, paid ? `Your registration for ${event.title} is pending organizer review.` : `You are registered for ${event.title}.`, now),
            notify(db, event.owner_id, event.id, paid ? `${name} submitted a paid registration for ${event.title}. Review it in your roster.` : `${name} joined ${event.title}.`, now),
        ]);
        return paid ? { id, status } : { id };
    }
    if (m === 'GET' && route === 'bookings') {
        const rows = await all(db, 'SELECT b.id,b.event_id,b.player_name,b.level,b.status,b.rules_revision,b.consent_at,b.created_at,b.checked_in_at,b.cancelled_at,b.payment_method,b.amount,b.organizer_contact,b.review_note,b.reviewed_at,e.title,e.sport,e.area,e.venue,e.date,e.time,e.starts_at,e.duration,e.status AS event_status,e.cancellation FROM bookings b JOIN events e ON e.id=b.event_id WHERE b.user_id=? ORDER BY e.starts_at DESC LIMIT 200', uid);
        return { bookings: rows };
    }
    if (m === 'POST' && p[0] === 'bookings' && p[2] === 'cancel') {
        const booking = await one(db, 'SELECT b.*,e.starts_at,e.owner_id,e.title FROM bookings b JOIN events e ON e.id=b.event_id WHERE b.id=? AND b.user_id=?', p[1], uid);
        if (!booking)
            fail(404, 'Booking not found.', 'not_found');
        if (booking.status === 'cancelled')
            return { ok: true };
        if (!['pending','confirmed'].includes(booking.status) || booking.starts_at <= now)
            fail(409, 'This booking can no longer be cancelled online. Contact the organizer.', 'cancellation_closed');
        const r = await run(db, "UPDATE bookings SET status='cancelled',cancelled_at=? WHERE id=? AND user_id=? AND status IN ('pending','confirmed')", now, booking.id, uid);
        if (!r.meta.changes)
            fail(409, 'This registration changed. Refresh your games.', 'booking_changed');
        try {
            await notify(db, booking.owner_id, booking.event_id, `${booking.player_name} cancelled their place in ${booking.title}.`, now).run();
        }
        catch {
            console.error('Cancellation notification unavailable');
        }
        return { ok: true };
    }
    if (m === 'POST' && p[0] === 'saved' && p.length === 2) {
        const e = await one(db, "SELECT id FROM events WHERE id=? AND status='published'", p[1]);
        if (!e)
            fail(404, 'Event not found.', 'not_found');
        if (b.saved === true)
            await run(db, 'INSERT INTO saved_events(user_id,event_id,created_at) VALUES(?,?,?) ON CONFLICT DO NOTHING', uid, e.id, now);
        else
            await run(db, 'DELETE FROM saved_events WHERE user_id=? AND event_id=?', uid, e.id);
        return { ok: true };
    }
    if (m === 'POST' && route === 'notifications/read') {
        await run(db, 'UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL', now, uid);
        return { ok: true };
    }
    fail(404, 'This action is not available.', 'not_found');
}
