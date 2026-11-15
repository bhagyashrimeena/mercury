import { organizerDashboardMarkup, organizerMenuMarkup, publicationMarkup, studioIcon } from './organizer-studio.js';
import { registrationFormMarkup, mountRegistrationJourney } from './registration-journey.js';
import { mountPaymentOptions } from './payment-qr.js';
import { renderAccount, renderSupport, renderAdmin, renderPolicy } from './service-ui.js';
import { listingCard, renderListing } from './discovery.js';
import { organizerLandingMarkup, eventSubmissionMarkup, howItWorksMarkup, mountEventSubmission } from './organizer-public.js';
import { sportPhoto } from './sport-media.js';
import { actionable, renderExplore, renderExploreLoading } from './explore.js';
import { findListing, listingDate } from './catalogue.js';
import { events as samples, dateLabel, timeLabel } from './data.js';
import { newId, validateDraft, indiaDate } from './domain.js';
import { eventState, eventDetailMarkup } from './event-detail.js';
import { trackMetric } from './metrics.js';
import { bookingPassMarkup, bindPassActions, passState } from './game-day.js';
import { savedGamesLoader } from './my-games.js';
import { mountOrganizerJourney, mountRosterSearch } from './organizer-journey.js';
import { renderRouteLoading } from './loading-ui.js';
let ctx, session = null, turn = 0;
let sessionReady = false, sessionPromise = null, sessionGeneration = 0;
// Public inventory and UI session state live only in this tab; private data is fetched per view.
let publicLineupCache = null;
const PUBLIC_CACHE_MS = 30_000;
const policy = 'Cancel a pending or confirmed place from My games before the event starts, unless already checked in. Organizer cancellation cancels your registration. For paid events, pay the organizer directly and contact them for any refund; refunds are not automatic.';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// If a stock CDN is unavailable, show the branded sport placeholder instead of a broken image.
document.addEventListener('error', event => {
    const image = event.target;
    if (image?.matches?.('img.sport-stock-img')) {
        image.hidden = true;
        image.parentElement?.classList.add('media-unavailable');
    }
}, true);
document.addEventListener('click', event => {
    const link = event.target.closest?.('a[data-outbound]');
    if (!link) return;
    // Count the handoff from Home, Explore, details and saved listings alike.
    // The external link opens independently of this best-effort request.
    fetch('/api/listings/' + encodeURIComponent(link.dataset.outbound) + '/click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', keepalive: true }).catch(() => {});
});
const btn = (text, url, kind = 'primary') => `<a class="button ${kind}" href="${url}">${text} ↗</a>`;
const heading = (label, title, sub = '') => `<section class="page-intro"><p class="eyebrow blue">${label}</p><h1>${title}</h1><p>${sub}</p></section>`;
const notice = t => `<div class="inline-notice">${t}</div>`;
const empty = (title, body, action = '') => `<div class="empty"><span>✳</span><h2>${title}</h2><p>${body}</p>${action}</div>`;
const stamp = status => `<span class="state state-${status}">${esc(status.replaceAll('_', ' '))}</span>`;
const bookingStamp = status => `<span class="state state-${esc(status)}">${esc(({ event_cancelled: 'Cancelled by organizer', cancelled: 'You cancelled' })[status] || status.replaceAll('_', ' '))}</span>`;
function page(html) { ctx.main.innerHTML = `<div class="page-width">${html}</div>`; }
async function api(path, body, method = body ? 'POST' : 'GET') {
    const initialPath = location.pathname + location.search;
    const initialTurn = turn;
    const assertCurrent = () => {
        if (initialTurn !== turn || initialPath !== location.pathname + location.search)
            throw Object.assign(Error('Navigation changed.'), { name: 'AbortError' });
    };
    let res;
    try {
        res = await fetch('/api/' + path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    }
    catch {
        assertCurrent();
        throw Error('You seem to be offline. Check your connection and try again.');
    }
    const result = await res.json().catch(() => ({ error: { message: 'Mercury could not load this page. Try again.' } }));
    assertCurrent();
    if (!res.ok) {
        if (res.status === 401 || res.status === 403) invalidateSession();
        throw Object.assign(Error(result.error?.message || 'Please try again.'), { status: res.status, fields: result.error?.fields });
    }
    return result;
}
function updateAccountLink() {
    const a = document.querySelector('#account-link');
    if (a) a.textContent = session?.user ? 'Account' : 'Sign in';
}
function invalidateSession() {
    session = null;
    sessionReady = false;
    sessionPromise = null;
    sessionGeneration++;
    updateAccountLink();
}
function loadSession({ refresh = false } = {}) {
    if (refresh) { sessionReady = false; sessionPromise = null; sessionGeneration++; }
    if (sessionReady) return Promise.resolve(session);
    if (sessionPromise) return sessionPromise;
    const generation = sessionGeneration;
    const request = (async () => {
        let response;
        try { response = await fetch('/api/session', { credentials: 'same-origin' }); }
        catch { throw Error('You seem to be offline. Check your connection and try again.'); }
        const data = await response.json().catch(() => ({ error: { message: 'Mercury could not load your account. Try again.' } }));
        if (!response.ok) {
            if (generation === sessionGeneration && (response.status === 401 || response.status === 403)) invalidateSession();
            throw Object.assign(Error(data.error?.message || 'Please try again.'), { status: response.status });
        }
        if (generation === sessionGeneration) {
            session = data;
            sessionReady = true;
            updateAccountLink();
        }
        return data;
    })();
    sessionPromise = request;
    void request.finally(() => { if (sessionPromise === request) sessionPromise = null; }).catch(() => {});
    return request;
}
function hydratePublicSession(route, id, sequence) {
    void loadSession().then(() => {
        if (sequence !== turn) return;
        if (route === 'event') {
            const button = document.querySelector('#live-save');
            if (button) {
                const saved = !!session?.saved?.includes(id);
                button.setAttribute('aria-pressed', String(saved));
                button.textContent = saved ? '\u2665 Saved' : '\u2661 Save for later';
            }
        } else if (route === 'listing') {
            const button = document.querySelector('#save-listing');
            if (button) {
                const saved = !!session?.savedListings?.includes(id);
                button.setAttribute('aria-pressed', String(saved));
                button.textContent = saved ? '\u2665 Saved' : '\u2661 Save for later';
            }
        } else if (route === 'support') {
            const form = document.querySelector('#support-form');
            for (const field of ['name', 'email']) {
                const input = form?.elements?.namedItem(field);
                if (input && !input.value && session?.user?.[field]) input.value = session.user[field];
            }
        }
    }).catch(() => {});
}
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && sessionReady) {
        void loadSession({ refresh: true }).catch(() => {});
        const [, route, id] = location.pathname.split('/');
        hydratePublicSession(route, id, turn);
    }
});
function requireUser() {
    if (session?.user) return true;
    const account = '/account?return_to=' + encodeURIComponent(location.pathname + location.search);
    page(heading('YOUR MERCURY ACCOUNT', 'Good games start<br>with <em>you.</em>', 'Sign in to save games, reserve a place or run your next session.') + `<div class="form-card account-card">${btn('Sign in', account)}<p class="fine">Browsing listings and following organizer links does not require a Mercury account once public access is enabled.</p>${btn('Browse events', '/explore', 'outline')}</div>`);
    return false;
}
function formSubmit(selector, work) {
    const form = document.querySelector(selector);
    form.onsubmit = async event => {
        event.preventDefault();
        if (form.dataset.busy) return;
        const button = event.submitter || form.querySelector('button[type=submit],button:not([type])');
        const buttons = [...form.querySelectorAll('button[type=submit],button:not([type])')];
        const disabled = buttons.map(button => button.disabled);
        const originalLabel = button.dataset.originalLabel || button.textContent;
        button.dataset.originalLabel = originalLabel;
        button.textContent = originalLabel;
        buttons.forEach(button => { button.disabled = true; });
        form.dataset.busy = '1';
        const alert = form.querySelector('[role=alert]');
        alert.textContent = '';
        alert.id ||= form.id + '-error';
        form.querySelectorAll('.field-error').forEach(node => node.remove());
        form.querySelectorAll('[aria-invalid="true"]').forEach(field => { field.removeAttribute('aria-invalid'); field.removeAttribute('aria-describedby'); });
        try {
            await work(Object.fromEntries(new FormData(form)), form, button);
        } catch (error) {
            if (error.name === 'AbortError') return;
            alert.textContent = error.message;
            if (error.fields) for (const [name, message] of Object.entries(error.fields)) {
                const field = form.elements.namedItem(name);
                if (!field?.setAttribute) continue;
                const hint = document.createElement('span');
                hint.className = 'field-error';
                hint.id = form.id + '-' + name + '-error';
                hint.textContent = message;
                field.after(hint);
                field.setAttribute('aria-invalid', 'true');
                field.setAttribute('aria-describedby', hint.id);
            }
            if (error.status >= 500 || !error.status) button.textContent = 'Retry';
            alert.focus();
        } finally {
            delete form.dataset.busy;
            buttons.forEach((button, index) => { button.disabled = disabled[index]; });
        }
    };
}
function action(selector, work) { document.querySelectorAll(selector).forEach(b => b.onclick = async () => { b.disabled = true; try {
    await work(b);
}
catch (e) {
    if (e.name !== 'AbortError') ctx.toast(e.message);
}
finally {
    b.disabled = false;
} }); }
const err = '<p class="error" role="alert" tabindex="-1"></p>';
function gameCard(e, bookingId = '') {
    const state = eventState(e);
    const media = sportPhoto(e);
    const view = bookingId ? '/booking/' + esc(bookingId) : '/event/' + esc(e.id);
    const status = bookingId ? 'Your place is confirmed'
        : state.code === 'full' ? 'Game full'
        : state.code === 'past' ? 'Game started'
        : state.code === 'cancelled' ? 'Cancelled'
        : state.canBook ? e.spots + ' places left' : '';
    const sportClass = String(e.sport || 'sport').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return '<article class="event-card directory-card photo-card mercury-card ' + sportClass + '">' +
        '<a class="photo-card-link" href="' + view + '" aria-label="' +
        (bookingId ? 'View confirmed pass for ' : 'View event details for ') + esc(e.title) + '">' +
        '<div class="listing-photo ' + sportClass + '" aria-hidden="true">' +
        '<div class="photo-fallback">' + esc(e.sport) + '</div>' +
        '<img class="sport-stock-img" src="' + esc(media.src) + '" alt="" loading="lazy" decoding="async" width="560" height="440">' +
        '<span class="photo-disclosure">' + (media.source === 'stock' ? 'Illustrative photo' : 'Organizer image') + '</span></div>' +
        '<div class="photo-card-copy"><div class="photo-card-top"><span class="photo-sport">' + esc(e.sport) +
        ' · ' + esc(e.type) + '</span>' +
        (status ? '<span class="photo-status ' + esc(state.code) + '">' + esc(status) + '</span>' : '') +
        '</div><h3>' + esc(e.title) + '</h3><div class="photo-card-facts">' +
        '<span class="photo-date">' + esc(dateLabel(e)) + ' · ' + esc(timeLabel(e)) + ' IST</span>' +
        '<span class="photo-area">' + esc(e.area) + '</span></div>' +
        '<div class="photo-card-foot"><div class="photo-price"><strong>' +
        (Number(e.price) ? '₹' + esc(e.price) : 'Free') + '</strong><small>Booked on Mercury</small></div>' +
        '<span class="photo-cta">' + (bookingId ? 'View pass' : 'View event') + ' ↗</span>' +
        '</div></div></a></article>';
}
export async function enhanceHome(main) {
    const section = main.querySelector('.discovery-section');
    try {
        const [{ events }, { listings }] = await Promise.all([api('events'), api('listings')]);
        if (!section?.isConnected) return;
        publicLineupCache = { events, listings, savedAt: Date.now() };
        const all = [...events.map(e => ({ ...e, external: false })), ...listings.map(e => ({ ...e, external: true }))].sort((a,b) => a.date.localeCompare(b.date));
        const upcoming = all.filter(e => actionable(e));
        const quickline = main.querySelector('#quickline-results');
        if (quickline) quickline.innerHTML = upcoming.length ? upcoming.slice(0, 3).map(e => `<a class="quickline-item" href="/${e.external ? 'listing' : 'event'}/${esc(e.id)}"><time datetime="${esc(e.date)}">${e.external ? listingDate(e) : dateLabel(e)}</time><strong>${esc(e.title)}</strong><span>${esc(e.sport)} · ${esc(e.area)} · ${e.external ? 'Register with organizer' : 'Book free place on Mercury'}</span></a>`).join('') : '<p>No entry-ready games are in the current lineup. Explore the calendar for details.</p>';
        const render = sport => {
            const selected = upcoming.filter(e => sport === 'All sports' || e.sport === sport).slice(0, 3);
            section.querySelector('#featured-grid').innerHTML = selected.length ? selected.map(e => e.external ? listingCard(e) : gameCard(e)).join('') : empty('No entry-ready games in this sport.', 'Try another sport or see the full calendar, including closed entries.', btn('Explore the calendar', '/explore'));
        };
        section.querySelectorAll('[data-home-sport]').forEach(b => b.onclick = () => {
            section.querySelectorAll('[data-home-sport]').forEach(x => { x.classList.toggle('selected', x === b); x.setAttribute('aria-pressed', String(x === b)); });
            render(b.dataset.homeSport);
        });
        render('All sports');
    } catch (e) { if (section?.isConnected) { section.querySelector('#featured-grid').innerHTML = notice(esc(e.message)) + btn('Try again', '/'); const quickline = main.querySelector('#quickline-results'); if (quickline) quickline.innerHTML = '<p>Upcoming games could not load. <a href="/">Try again ↗</a></p>'; } }
}
async function explore(expectedTurn) {
    // Events and curated public listings load together, never behind /api/session.
    const [{ events }, { listings }] = await Promise.all([api('events'), api('listings')]);
    if (expectedTurn !== turn) return;
    publicLineupCache = { events, listings, savedAt: Date.now() };
    renderExplore({ main: ctx.main, events, listings, gameCard });
}
async function detail(id) {
    const { event: e } = await api('events/' + id);
    trackMetric('native_detail_view');
    document.title = e.title + ' \u2014 Mercury';
    const state = eventState(e);
    page(eventDetailMarkup(e, { saved: session?.saved?.includes(id), policy }));
    action('#live-save', async () => {
        if (!sessionReady) await loadSession().catch(() => {});
        if (sessionReady && !session?.user) {
            ctx.go('/account?return_to=' + encodeURIComponent(location.pathname + location.search));
            return;
        }
        try {
            const button = document.querySelector('#live-save');
            const saved = button.getAttribute('aria-pressed') !== 'true';
            await api('saved/' + id, { saved });
            button.setAttribute('aria-pressed', String(saved));
            button.textContent = saved ? '\u2665 Saved' : '\u2661 Save for later';
            await loadSession({ refresh: true }).catch(() => {});
            ctx.toast(saved ? 'Saved to your account.' : 'Removed from saved games.');
        } catch (error) {
            if (error.status === 401 || error.status === 403) ctx.go('/account?return_to=' + encodeURIComponent(location.pathname + location.search));
            else ctx.toast(error.message);
        }
    });
    action('#live-share', async () => {
        ctx.openSheet('Bring your people.', `<label class="share-label">Game link<input readonly value="${esc(location.origin + '/event/' + id)}" onclick="this.select()"></label><p class="fine">Anyone can view this game. Sign in to register.</p>`);
    });
    if (state.canBook) {
        ctx.main.insertAdjacentHTML('beforeend', `<div class="mobile-event-cta"><div><b>${Number(e.price) ? '&#8377;' + esc(e.price) : 'Free'}</b><small>1 player</small></div>${btn('Register now', '/register/' + id)}</div>`);
        document.body.classList.add('has-event-cta');
    } else {
        ctx.main.insertAdjacentHTML('beforeend', `<div class="mobile-event-cta"><div><b>${esc(state.label)}</b><small>Booking on Mercury</small></div>${btn('Explore games', '/explore', 'outline')}</div>`);
    }
}
async function readPaymentImage(file) {
    if (!file?.size || file.size > 768000 || !['image/png','image/jpeg','image/webp'].includes(file.type)) throw Error('Choose a PNG, JPEG or WebP image under 750 KB.');
    return new Promise((resolve,reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(Error('Could not read the image.')); r.readAsDataURL(file); });
}
async function register(id) {
    if (!requireUser()) return;
    const [{event:e}, {bookings}] = await Promise.all([api('events/' + id), api('bookings')]);
    const existing = bookings.find(b => b.event_id === id && ['pending','confirmed','checked_in'].includes(b.status));
    if (existing) { ctx.go('/booking/' + existing.id); return; }
    if (e.status !== 'published' || e.startsAt <= Date.now() || !e.spots) return detail(id);
    const paid = Number(e.price) > 0;
    document.title = `Register - ${e.title} - Mercury`;
    page(`<a class="back" href="/event/${esc(id)}">Back to game</a>${heading('REGISTER', 'Make it a <em>plan.</em>', paid ? 'Approval is required before entry is confirmed.' : 'Reserve a free place.')}
    <div class="checkout-layout">${registrationFormMarkup(e, session.user)}
    <aside class="order-card"><h2>${esc(e.title)}</h2><p>${dateLabel(e)} &middot; ${timeLabel(e)} IST</p><p>${esc(e.venue)}</p><div class="total"><span>Entry fee</span><b>&#8377;${esc(e.price)}</b></div><p>${paid ? 'Pending until accepted. A screenshot is evidence for review, not automatic payment verification.' : 'Confirmation is saved to your account.'}</p></aside></div>`);
    const form = document.querySelector('#live-registration');
    mountRegistrationJourney(form);
    const key = newId();
    formSubmit('#live-registration', async d => {
        const result = await api('events/' + id + '/register', {name:d.name,level:d.level,rulesAccepted:d.rules==='on',revision:e.revision,idempotencyKey:key,paymentMethod:d.paymentMethod,paymentConsentVersion:d.paymentConsent==='on' ? '2026-11-15-direct-payments' : '',paymentProof:paid && d.paymentMethod==='upi' ? await readPaymentImage(form.elements.proof.files[0]) : ''});
        await loadSession({refresh:true}).catch(()=>{}); ctx.toast(paid ? 'Submitted. Check My games for organizer review.' : 'Your place is confirmed.'); ctx.go('/booking/' + result.id);
    });
}
async function myGames(bookingId) {
    if (!requireUser())
        return;
    const sequence = turn;
    // A pass must not depend on discovery or saved-listing services being available.
    const { bookings } = await api('bookings');
    if (sequence !== turn) return;
    if (bookingId) {
        const b = bookings.find(b => b.id === bookingId);
        if (!b)
            throw Error('This pass was not found in your account.');
        page(bookingPassMarkup(b));
        bindPassActions(ctx.main, b);
        if (passState(b).canCancel) {
            action('#cancel-pass', () => confirmAction('Cancel your place?', 'Your place will become available to another player. For direct payments, arrange any refund with the organizer.', 'Cancel my place', async () => {
                await api('bookings/' + b.id + '/cancel', {});
                await loadSession({ refresh: true });
                await myGames(bookingId);
                ctx.toast('Your place was cancelled.');
            }));
        }
        return;
    }
    const now = Date.now();
    const ongoing = b => ['confirmed', 'checked_in'].includes(b.status);
    const active = bookings.filter(b => (ongoing(b) || b.status === 'pending') && Number(b.starts_at) > now);
    const completed = bookings.filter(b => ongoing(b) && Number(b.starts_at) <= now);
    const cancelled = bookings.filter(b => !ongoing(b) && !(b.status === 'pending' && Number(b.starts_at) > now));
    const bookingCard = b => `<article class="manage-card">${bookingStamp(b.status)}<h3>${esc(b.title)}</h3><p>${dateLabel(b)} · ${timeLabel(b)} IST</p><p class="muted">${esc(b.venue)}</p><div class="action-row">${btn(['pending','rejected'].includes(b.status) ? 'View registration' : 'View pass', '/booking/' + b.id, 'outline')}${['pending','confirmed'].includes(b.status) && b.starts_at > Date.now() ? `<button class="text-link danger" data-cancel-booking="${b.id}">Cancel my place</button>` : ''}</div></article>`;
    page(heading('YOUR TIME TO PLAY', 'My <em>games.</em>', 'Registrations, bookmarks and updates in one place.') + `<div class="account-toolbar"><a class="text-link" href="/account">Your account ↗</a></div><h2>Mercury registrations</h2><div class="manage-grid">${active.length ? active.map(bookingCard).join('') : completed.length || cancelled.length ? '<p class="muted">No upcoming confirmed games. Your earlier registrations are below.</p>' : empty('Make room for your next game.', 'Find a session and your confirmed place will appear here.', btn('Find a game', '/explore'))}</div>${completed.length ? `<details ${active.length ? '' : 'open'}><summary>Started or past Mercury games (${completed.length})</summary><div class="manage-grid">${completed.map(bookingCard).join('')}</div></details>` : ''}${cancelled.length ? `<details ${active.length || completed.length ? '' : 'open'}><summary>Other registrations (${cancelled.length})</summary><div class="manage-grid">${cancelled.map(bookingCard).join('')}</div></details>` : ''}<h2 class="section-space" id="saved-mercury-heading">Saved Mercury games</h2><div class="event-grid" id="saved-mercury-games" role="group" aria-labelledby="saved-mercury-heading" aria-live="polite" tabindex="-1"></div><h2 class="section-space" id="saved-listings-heading">Saved external listings</h2><p class="fine">These are bookmarks, not registrations. Get confirmation and tickets from the organizer.</p><div class="event-grid" id="saved-external-listings" role="group" aria-labelledby="saved-listings-heading" aria-live="polite" tabindex="-1"></div><div class="section-heading section-space"><h2>Your updates</h2><button class="text-link" id="read-updates">Mark all read ✓</button></div><p class="fine">Updates appear here. Email and SMS notifications are not active.</p><div class="updates">${session.notifications.map(n => `<article class="update ${n.read_at ? '' : 'unread'}"><p>${esc(n.message)}</p><small>${new Date(n.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</small> <a href="${esc(n.actionPath || '/event/' + n.event_id)}" class="text-link">${n.actionPath?.startsWith('/participants/') ? 'Review registrations' : 'View game'} ↗</a></article>`).join('') || '<p class="muted">You’re all caught up.</p>'}</div>`);
    action('[data-cancel-booking]', async (b) => { confirmAction('Cancel your place?', 'Your place will become available to another player. For direct payments, arrange any refund with the organizer.', 'Cancel my place', async () => { await api('bookings/' + b.dataset.cancelBooking + '/cancel', {}); await loadSession({ refresh: true }); await myGames(); ctx.toast('Your place was cancelled.'); }); });
    action('#read-updates', async () => { await api('notifications/read', {}); await loadSession({ refresh: true }); await myGames(); });
    // Render registrations and updates first. Each bookmark section loads and
    // retries independently, so slow or failed discovery cannot hide a pass.
    const saved = new Set(session.saved);
    const sections = [
        { id: '#saved-mercury-games', label: 'Saved Mercury games', load: () => api('events'), render: ({ events }) => events.filter(e => saved.has(e.id)).map(e => gameCard(e, active.find(b => b.event_id === e.id)?.id)).join('') || '<p class="muted">No upcoming saved games. Tap “Save for later” on a game.</p>' },
        { id: '#saved-external-listings', label: 'Saved external listings', load: () => api('saved-listings'), render: ({ listings }) => listings.map(listingCard).join('') || '<p class="muted">No saved external listings yet.</p>' },
    ];
    sections.forEach(section => {
        const container = ctx.main.querySelector(section.id);
        const isCurrent = () => sequence === turn && container.isConnected;
        void savedGamesLoader({ ...section, container, isCurrent })();
    });
}
function confirmAction(title, body, label, work) {
    const sheet = ctx.openSheet(title, `<p>${body}</p>${err}<div class="action-row"><button class="button primary" id="confirm-action">${label}</button><button class="button outline" data-close-sheet>Keep as it is</button></div>`);
    const b = sheet.querySelector('#confirm-action');
    const sequence = turn;
    const isCurrent = () => sequence === turn && sheet.open && sheet.contains(b);
    b.onclick = async () => {
        if (b.disabled || !isCurrent()) return;
        b.disabled = true;
        try {
            await work();
            if (isCurrent()) sheet.close();
        } catch (e) {
            if (!isCurrent() || e.name === 'AbortError') return;
            sheet.querySelector('[role=alert]').textContent = e.message;
            b.disabled = false;
        }
    };
}
const input = (name, label, value = '', extra = '') => `<label>${label}<input name="${name}" value="${esc(value)}" ${extra}></label>`;
const textarea = (name, label, value = '', min = 3, max = 1000) => `<label>${label}<textarea name="${name}" minlength="${min}" maxlength="${max}" ${min > 0 ? "required" : ""} rows="3">${esc(value)}</textarea></label>`;
const select = (name, label, options, value) => `<label>${label}<select name="${name}">${options.map(o => `<option ${o === value ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
async function publicationComplete(id, title) {
    const previousTurn = turn;
    await ctx.go('/host');
    if (turn !== previousTurn + 1 || location.pathname !== '/host' || !ctx.main.querySelector('.organizer-dashboard')) return;
    const sheet = ctx.openSheet('Your tournament is live!', publicationMarkup(id, title));
    sheet.classList.add('publication-celebration');
}
async function hostDashboard() {
    const { events } = await api('organizer/events');
    page(organizerDashboardMarkup(events));
    ctx.main.querySelectorAll('[data-event-menu]').forEach(button => {
        button.onclick = () => {
            const event = events.find(event => event.id === button.dataset.eventMenu);
            const sheet = ctx.openSheet(event.title, organizerMenuMarkup(event));
            sheet.classList.add('organizer-menu-dialog');
            const copy = sheet.querySelector('[data-studio-copy]');
            if (copy) copy.onclick = async () => {
                const url = location.origin + '/event/' + encodeURIComponent(event.id);
                try { await navigator.clipboard.writeText(url); ctx.toast('Event link copied.'); }
                catch {
                    sheet.querySelector('.studio-event-menu').insertAdjacentHTML('beforeend', '<label class="share-label">Copy event link<input readonly value="' + esc(url) + '"></label>');
                    const input = sheet.querySelector('input'); input.focus(); input.select();
                }
            };
            sheet.querySelectorAll('[data-studio-action]').forEach(button => {
                button.onclick = () => {
                    const act = button.dataset.studioAction;
                    sheet.close();
                    const title = act === 'publish' ? 'Publish this event?' : act === 'cancel' ? 'Cancel this event?' : 'Return to draft?';
                    const body = act === 'publish' ? 'Players can register. Confirm your venue and payment details are ready.' : act === 'cancel' ? 'All active registrations will be cancelled. Players will see an update in My games. This cannot be undone.' : 'This event will no longer appear in discovery.';
                    confirmAction(title, body, act === 'publish' ? 'Publish event' : act === 'cancel' ? 'Cancel event' : 'Return to draft', async () => {
                        await api('organizer/events/' + event.id + '/' + act, {});
                        publicLineupCache = null;
                        if (act === 'publish') await publicationComplete(event.id, event.title);
                        else { await hostDashboard(); ctx.toast('Event updated.'); }
                    });
                };
            });
        };
    });
}
async function organizerProfile(destination) {
    const requested = destination || new URLSearchParams(location.search).get('return_to') || '/host';
    const returnTo = /^\/host(?:\/[a-zA-Z0-9-]+)?$/.test(requested) && requested !== '/host/profile' ? requested : '/host';
    const org = session.organizer;
    page('<a class="back" href="/host">← Your events</a>' + heading('YOUR ORGANIZER PROFILE', org ? 'Make it <em>yours.</em>' : 'Meet your <em>players.</em>', 'Add the organizer details players will see on your events.') +
        `<div class="organizer-profile-page"><form class="form-card" id="organizer-profile">${input('name', 'Club or organizer name', org?.name || '', 'minlength="3" maxlength="80" required')}${textarea('bio', 'About your community', org?.bio || '', 0, 500)}${input('contact', 'Public contact email (required for paid events)', org?.contact || '', 'type="email" maxlength="150"')}<p class="fine">Your name, bio and public contact appear on your events. Your sign-in email stays private.</p>${err}<button class="button primary" type="submit">${returnTo !== '/host' ? 'Save and continue' : 'Save profile'} ↗</button></form></div>`);
    formSubmit('#organizer-profile', async data => {
        await api('organizer/profile', data);
        await loadSession({ refresh: true });
        ctx.toast('Organizer profile saved.');
        await ctx.go(returnTo);
    });
}
async function host(mode) {
    if (!requireUser()) return;
    if (mode === 'profile') return organizerProfile();
    if (mode === 'new' && !session.organizer) return organizerProfile('/host/new');
    if (mode) return hostEditor(mode === 'new' ? null : mode);
    return hostDashboard();
}

async function hostEditor(editId) {
    if (!requireUser())
        return;
    const { events } = await api('organizer/events');
    const edit = editId ? events.find(e => e.id === editId) : null;
    if (editId && !edit)
        throw Error('This draft is not available in your organizer account.');
    const org = session.organizer;
    const d = edit?.draft || { sport: 'Badminton', area: 'Powai', level: 'All levels', format: 'Social play', capacity: 12, price: 0, description: "Check the event details and contact the organizer for the session format and any eligibility requirements.", included: "Contact the organizer to confirm what is included with your entry.", bring: "Bring drinking water and appropriate sportswear. Check with the organizer about any equipment you may need.", cancellation: policy };
    page('<a class="back" href="/host">← Your events</a>' + heading('MAKE YOUR NEXT MOVE', edit ? 'Your event.<br><em>Your way.</em>' : 'Make room<br>for <em>play.</em>', 'Set the details, choose how players pay, and publish when you are ready.') + `<div class="studio-layout organizer-editor"><section><form class="form-card" id="event-form"><div class="section-heading"><h2>${edit ? 'Edit your event' : 'Create your next game'}</h2>${edit ? '<a class="text-link" href="/host/new">New event ↗</a>' : ''}</div>${edit && edit.registered ? notice('Players have registered. Event details are locked to protect their confirmed plans. If the time or venue changes, cancel the event and contact players directly; Mercury updates are in-app only.') : ''}<fieldset ${edit && (edit.registered || edit.status === 'cancelled') ? 'disabled' : ''}><section class="editor-section"><h3>1. Basics</h3><div class="form-grid">${input('title', 'Event name', d.title || '', 'required minlength="4" maxlength="100"')}${select('sport', 'Sport', ['Badminton', 'Tennis', 'Pickleball'], d.sport)}${select('format', 'Format', ['Social play', 'Tournament'], d.format)}</div></section><section class="editor-section"><h3>2. Time and place</h3><div class="form-grid">${select('area', 'Neighbourhood', ['Powai', 'Chandivali', 'Andheri', 'Bandra', 'BKC', 'Borivali', 'Malad', 'Ghatkopar', 'Vile Parle', 'South Mumbai', 'Nerul, Navi Mumbai', 'Thane'], d.area)}${input('date', 'Date', d.date || '', `type="date" min="${indiaDate()}" required`)}${input('time', 'Start time (IST)', d.time || '', 'type="time" required')}</div>${input('venue', 'Venue name and full address', d.venue || '', 'minlength="4" maxlength="150" required')}<p class="fine">Confirm the venue, address and court permission before publishing.</p></section><section class="editor-section"><h3>3. Eligibility and capacity</h3><div class="form-grid">${select('level', 'Playing level', ['All levels', 'Beginner friendly', 'Intermediate', 'Advanced', 'Competitive'], d.level)}${input('capacity', 'Player capacity', d.capacity, 'type="number" min="2" max="500" required')}${input('price', 'Price per player (INR)', d.price, 'type="number" min="0" max="100000" required')}</div><p class="fine">Paid entries need organizer approval.</p></section><section class="editor-section"><h3>4. Player instructions</h3>${textarea('description', 'What will the session be like? Include any eligibility rules. (optional)', d.description || '', 0, 1500)}${textarea('included', 'What’s included (one item per line, optional)', d.included || '', 0, 500)}${textarea('bring', 'What should players bring? (optional)', d.bring || '', 0, 300)}${textarea('cancellation', 'Cancellation and organizer notes (optional)', d.cancellation || "", 0, 1000)}</section><section class="editor-section editor-review"><h3>5. Review and publish</h3><p class="fine">Sessions last 90 minutes. Free places can be cancelled before start time. Preview the public page, then publish from the final step or save a private draft.</p><label class="checkbox"><input type="checkbox" name="reviewed" required><span>I understand the <a data-event-policy href="/terms?return_to=${encodeURIComponent(edit ? "/host/" + edit.id : "/host/new")}">Terms of Service</a> and <a data-event-policy href="/privacy?return_to=${encodeURIComponent(edit ? "/host/" + edit.id : "/host/new")}">Privacy Policy</a>.</span></label>${err}<div class="action-row">${edit?.status !== "published" ? '<button class="button primary" type="submit" name="intent" value="publish">Publish event ↗</button>' : ""}<button class="button ${edit?.status === "published" ? "primary" : "outline"}" type="submit" name="intent" value="save">Save ${edit ? 'changes' : 'draft'} ↗</button><button class="button outline" type="button" id="preview-event">Preview public page</button></div><p class="fine">A saved draft stays private until you publish it.</p></section></fieldset></form></section></div>`);
    if (org) {
        const editor = document.querySelector('#event-form');
        const review = editor.querySelector('.editor-review');
        const payment = document.createElement('section');
        payment.className = 'editor-section editor-payment';
        payment.innerHTML = `<h3>Payment and publish</h3><p id="free-payment-note">This is a free event. No payment method or QR image is needed.</p><div id="paid-payment-options"><p>Payments go directly to you. Choose one or both options. Players can only use the methods you enable.</p><label class="checkbox"><input type="checkbox" name="allowUpi" ${d.paymentMethods?.includes('upi') ? 'checked' : ''}><span>UPI QR / receive payments directly</span></label><label class="checkbox"><input type="checkbox" name="allowCash" ${d.paymentMethods?.includes('cash') ? 'checked' : ''}><span>Collect payment externally (cash)</span></label><div id="upi-setup"><label>Your UPI QR (PNG, JPEG or WebP, max 750 KB)<input type="file" id="organizer-qr" accept="image/png,image/jpeg,image/webp"></label><input type="hidden" name="qrImage" value="${esc(d.qrImage || '')}"><img id="organizer-qr-preview" class="payment-image" ${d.qrImage ? `src="${esc(d.qrImage)}"` : 'hidden'} alt="Your uploaded payment QR code"><p id="qr-check-status" class="qr-check-status" role="status" aria-live="polite">${d.qrImage ? 'Saved QR image. Check it in your payment app before publishing.' : 'Readability is checked on your device after upload. The destination is never opened.'}</p></div><p class="fine">Cash does not require a QR image. Provide a public contact email in your <a href="/host/profile?return_to=${encodeURIComponent(location.pathname)}">organizer profile</a>. Verify receipts yourself and handle any refunds directly.</p></div>`;
        review.after(payment);
        payment.append(editor.querySelector('#event-form-error') || review.querySelector('[role=alert]'), review.querySelector('.action-row'));
        review.querySelector('p.fine:last-child')?.remove();
        const paymentOptions = mountPaymentOptions(editor);
        editor.__paymentOptions = paymentOptions;

    }
    if (org) {
        const eventForm = document.querySelector('#event-form');
        const journey = mountOrganizerJourney(eventForm, {
            editId: edit?.id || null, revision: edit?.revision ?? null,
            account: session.user.email, navigate: ctx.go,
            locked: Boolean(edit && (edit.registered || edit.status === 'cancelled'))
        });
        eventForm.querySelector('#preview-event').onclick = () => {
            const raw = Object.fromEntries(new FormData(eventForm));
            const reviewed = eventForm.querySelector('input[name="reviewed"]').checked;
            const qrFile = eventForm.querySelector('#organizer-qr').files[0];
            const { value: draft, errors, valid } = validateDraft(raw);
            if (!valid) {
                const problems = Object.entries(errors).map(([field, message]) => `<li><b>${esc(field)}:</b> ${esc(message)}</li>`).join('');
                ctx.openSheet('Check the event details', `<p>Complete these details before previewing the public page.</p><ul>${problems}</ul><button class="button outline" type="button" data-close-sheet>Back to editor</button>`);
                return;
            }
            const event = {
                ...draft, id: edit?.id || 'private-preview', type: draft.format,
                startsAt: Date.parse(`${draft.date}T${draft.time}:00+05:30`),
                duration: 90, spots: draft.capacity, status: 'draft',
                host: org.name, hostBio: org.bio, hostContact: org.contact,
                included: draft.included?.split('\n').filter(Boolean) || null,
            };
            page(eventDetailMarkup(event, { preview: true, policy }));
            ctx.main.querySelector('.back').onclick = async click => {
                click.preventDefault();
                await hostEditor(editId);
                const restored = document.querySelector('#event-form');
                restored.querySelectorAll('input[type=checkbox]').forEach(field => { field.checked = false; });
                if (qrFile) { const files = new DataTransfer(); files.items.add(qrFile); restored.querySelector('#organizer-qr').files = files.files; }
                for (const [name, value] of Object.entries(raw)) {
                    const field = restored.elements.namedItem(name);
                    if (field && field.type !== 'file') { if (field.type === 'checkbox') field.checked = value === 'on'; else field.value = value; }
                }
                restored.querySelector('input[name="reviewed"]').checked = reviewed;
                await restored.__paymentOptions?.refresh();
                restored.__mercuryWizard?.goTo(2);
                restored.scrollIntoView({ block: 'start' });
            };
            window.scrollTo(0, 0);
        };
        formSubmit('#event-form', async (data, form, submitter) => {
            const checked = validateDraft(data);
            if (!checked.valid) throw Object.assign(Error('Check the highlighted event details.'), { fields: checked.errors });
            const publish = submitter.value === 'publish';
            const paid = checked.value.price > 0;
            const upi = paid && data.allowUpi === 'on';
            const qrFile = form.querySelector('#organizer-qr').files[0];
            if (paid && data.allowUpi !== 'on' && data.allowCash !== 'on') throw Error('Choose UPI, cash, or both for a paid event.');
            if (upi && !qrFile && !data.qrImage) throw Error('Upload your UPI QR image, or choose cash.');
            const result = await api('organizer/events' + (edit ? '/' + edit.id : ''), {
                ...checked.value,
                paymentMethods: paid ? [upi ? 'upi' : '', data.allowCash === 'on' ? 'cash' : ''].filter(Boolean) : [],
                qrImage: upi ? (qrFile ? await readPaymentImage(qrFile) : data.qrImage || '') : '',
                revision: edit?.revision, publish
            }, edit ? 'PATCH' : 'POST');
            journey.clear();
            publicLineupCache = null;
            if (publish) await publicationComplete(edit?.id || result.id, checked.value.title);
            else { ctx.toast(edit?.status === 'published' ? 'Event changes saved.' : 'Draft saved to your account.'); await ctx.go('/host'); }
        });
    }

}
async function roster(id, filters = {}) {
    if (!requireUser()) return;
    const { event: e, attendees } = await api('organizer/events/' + id + '/attendees');
    const rows = [...attendees].sort((a, b) => {
        const order = { pending: -1, confirmed: 0, checked_in: 1 };
        return (order[a.status] ?? 2) - (order[b.status] ?? 2) ||
            String(a.player_name).localeCompare(String(b.player_name));
    });
    const checked = attendees.filter(b => b.status === 'checked_in').length;
    const row = b => '<article class="roster-row" data-status="' + esc(b.status) + '">' +
        '<div><h3>' + esc(b.player_name) + '</h3><p>' + esc(b.level) +
        ' · <code>' + esc(b.id) + '</code></p></div>' +
        '<div class="action-row">' + stamp(b.status) +
        (b.payment_method !== 'free' ? '<span>&#8377;' + esc(b.amount) + ' / ' + esc(b.payment_method) + '</span>' : '') +
        (b.has_proof ? '<a class="button outline" href="/api/bookings/' + esc(b.id) + '/proof" target="_blank" rel="noopener">View payment proof</a>' : '') +
        (b.status === 'pending' && e.status === 'published' ? '<button class="button primary" data-review="accept" data-booking="' + esc(b.id) + '">Accept</button><button class="button outline" data-review="reject" data-booking="' + esc(b.id) + '">Reject</button>' : '') +
        (b.status === 'confirmed' && e.status === 'published'
            ? '<button class="button primary" data-check-in="' + esc(b.id) + '">Check in ✓</button>' : '') +
        '</div></article>';
    page('<a class="back" href="/host">← Organizer studio</a>' +
        heading('PARTICIPANTS', esc(e.title), 'Review pending requests, verify receipts, and check in accepted players.') +
        '<div class="roster-summary participants-summary">' + stamp(e.status) +
        '<div class="participants-checkin"><b>' + checked + ' checked in</b>' +
        '<button class="studio-icon" id="refresh-roster" type="button" aria-label="Refresh participants" title="Refresh participants">' + studioIcon('refresh') + '</button>' +
        '<button class="studio-icon" id="export-roster" type="button" aria-label="Download participants CSV" title="Download participants CSV">' + studioIcon('download') + '</button></div>' +
        '<span class="participants-capacity">' + e.registered + ' active registrations / ' + e.capacity + ' places</span></div>' +
        '<div class="roster-tools">' +
        '<label for="roster-search">Find a player <input id="roster-search" type="search" autocomplete="off" placeholder="Name or pass reference"></label>' +
        '<label class="roster-pending-label"><input id="roster-unchecked" type="checkbox"> Not checked in</label>' +
        '<p id="roster-result-count" role="status" aria-live="polite"></p>' +
        '</div><div class="roster-list">' +
        (rows.map(row).join('') || empty('Your crew is on its way.', 'Registrations appear here as players join.')) +
        '</div><p class="fine">The participant list contains personal information. Keep downloads private and use them only to run this session.</p>');
    mountRosterSearch(ctx.main, filters);
    const currentFilters = () => ({
        query: ctx.main.querySelector('#roster-search')?.value || '',
        uncheckedOnly: !!ctx.main.querySelector('#roster-unchecked')?.checked
    });
    action('[data-check-in]', async b => {
        const retained = currentFilters();
        await api('organizer/events/' + id + '/check-in', { bookingId: b.dataset.checkIn });
        await roster(id, retained);
        ctx.toast('Player checked in.');
    });
    action('[data-review]', async b => {
        const decision = b.dataset.review;
        const attendee = attendees.find(a => a.id === b.dataset.booking);
        const sheet = ctx.openSheet(decision === 'accept' ? 'Accept registration' : 'Reject registration', `<form id="review-registration"><h3>${esc(attendee.player_name)}</h3><p>${esc(attendee.player_email)} &middot; ${esc(attendee.level)}</p><p>Payment: ${esc(attendee.payment_method)} &middot; &#8377;${esc(attendee.amount)}</p>${attendee.has_proof ? `<a href="/api/bookings/${encodeURIComponent(attendee.id)}/proof" target="_blank" rel="noopener noreferrer"><img class="review-payment-image" src="/api/bookings/${encodeURIComponent(attendee.id)}/proof" alt="Payment screenshot submitted by ${esc(attendee.player_name)}"></a><p class="fine">Select the receipt to open it at full size.</p>` : '<p>The organizer receives payment separately. Confirm your arrangement with this player.</p>'}<p>${decision === 'accept' ? 'Verify the receipt in your own account or confirm your cash arrangement. A screenshot alone does not verify payment.' : 'The player will receive your contact for any refund. You must handle refunds directly.'}</p><label>Message to player (optional)<textarea name="note" maxlength="500"></textarea></label>${err}<button class="button primary" type="submit">${decision === 'accept' ? 'Accept and confirm place' : 'Reject registration'}</button></form>`);
        formSubmit('#review-registration', async d => { await api('organizer/events/' + id + '/review', {bookingId:b.dataset.booking,decision,note:d.note}); sheet.close(); await roster(id,currentFilters()); ctx.toast('Registration reviewed.'); });
    });
    action('#refresh-roster', () => roster(id, currentFilters()));
    action('#export-roster', async () => {
        const cell = value => '"' + String(value ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"';
        const csv = [['Pass reference', 'Player name', 'Level', 'Status'],
            ...attendees.map(b => [b.id, b.player_name, b.level, b.status])]
            .map(items => items.map(cell).join(',')).join('\r\n');
        const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'mercury-attendees.csv';
        link.click();
        URL.revokeObjectURL(url);
    });
}

function info() { page(`<div class="prose">${heading('LESS PLANNING. MORE PLAY.','Find it. Check it.<br><em>Play it.</em>')}<h2>Discover your next game.</h2><p>Browse real events by sport, neighbourhood and format. Source links, entry units and eligibility notes help you choose.</p><h2>Register with the organizer.</h2><p>External listings open the organizer or booking provider’s website. Check current dates, category rules, fees and cancellation terms before entering. Mercury has not onboarded these organizers and does not issue their tickets. Saving a listing is a bookmark, not a booking.</p><h2>Keep your shortlist.</h2><p>Create an account to save events across devices. Check the organizer’s eligibility and entry requirements for each event.</p><h2>For free sessions booked on Mercury</h2><p>Where an event is labelled Book on Mercury, your confirmed place appears in My games. Free places can be cancelled before the start, unless already checked in. Organizer cancellations appear in My games. Email and SMS are not active; paid entries await organizer approval and payments go directly to the organizer.</p><p>Found something wrong? Use Suggest a correction or <a href="/support">contact Mercury</a>.</p>${btn('Find your game','/explore')}</div>`); }
export async function liveRoute(path, context) {
    ctx = context;
    const sequence = ++turn;
    updateAccountLink();
    if (!document.querySelector('#account-link')) {
        const a = document.createElement('a');
        a.id = 'account-link';
        a.href = '/account';
        a.className = 'account-link';
        a.textContent = 'Account';
        document.querySelector('.header-actions').prepend(a);
    }
    const [, route, id] = path.split('/');
    const knownListingTitle = route === 'listing' && id ? findListing(id)?.title : null;
    document.title = (knownListingTitle || { host: 'Organizer studio', roster: 'Participants', participants: 'Participants', account: 'Your account', admin: 'Owner desk', 'my-games': 'My games', booking: 'Your game pass', explore: 'Find a game', listing: 'Listing details', event: 'Game details', register: 'Book free place', privacy: 'Your privacy', terms: 'Terms', support: 'Help & contact', 'how-it-works': 'How Mercury works', 'for-organizers': 'For organizers', 'list-event': 'Submit a sports event' }[route] || 'Your next game starts here') + ' — Mercury';
    const sample = samples.some(e => e.id === id);
    const handled = ['explore', 'listing', 'host', 'roster', 'participants', 'account', 'my-games', 'privacy', 'terms', 'support', 'admin', 'how-it-works', 'for-organizers', 'list-event'].includes(route) || (['event', 'register'].includes(route) && !sample) || route === 'booking';
    // Demo passes are local and have a separate identity from durable game passes.
    if (!handled)
        return false;
    const initialFallback = ['explore', 'listing', 'event', 'how-it-works', 'for-organizers', 'list-event'].includes(route)
        && ctx.main.querySelector('[data-server-path]')?.getAttribute?.('data-server-path') === path
        ? ctx.main.innerHTML : null;
    // Keep useful server-rendered public content visible; pending routes use their own layout.
    if (!initialFallback && !['explore', 'support', 'privacy', 'terms', 'how-it-works', 'for-organizers', 'list-event'].includes(route))
        renderRouteLoading(ctx.main, route);
    try {
        if (route === 'privacy' || route === 'terms') { renderPolicy(path, ctx); return true; }
        if (route === 'how-it-works') { ctx.main.innerHTML = howItWorksMarkup(); return true; }
        if (route === 'for-organizers') { ctx.main.innerHTML = organizerLandingMarkup(); return true; }
        if (route === 'list-event') { ctx.main.innerHTML = eventSubmissionMarkup(new URLSearchParams(location.search).get('mode') === 'external' || new URLSearchParams(location.search).has('claim') ? 'external' : ''); mountEventSubmission(ctx.main, { navigate: ctx.go }); return true; }
        if (route === 'explore') {
            const cached = publicLineupCache && Date.now() - publicLineupCache.savedAt < PUBLIC_CACHE_MS
                ? publicLineupCache : null;
            // The initial HTML contains useful server-rendered results. On in-app
            // transitions use recent public data or the Explore layout immediately.
            if (!initialFallback) {
                if (cached) renderExplore({ main: ctx.main, ...cached, gameCard });
                else renderExploreLoading(ctx.main);
            }
            // Account state is useful for the header, but is not a dependency of browsing.
            // A session outage cannot block public discovery.
            hydratePublicSession('explore', null, sequence);
            if (!cached) await explore(sequence);
            return true;
        }
        if (route === 'listing' || route === 'event' || route === 'support') {
            hydratePublicSession(route, id, sequence);
            if (route === 'listing') await renderListing(id, { ...ctx, api, getSession: () => session, loadSession, refreshSession: () => loadSession({ refresh: true }) });
            else if (route === 'event') await detail(id);
            else renderSupport({ ...ctx, api, session });
            return true;
        }
        try {
            await loadSession();
        } catch (error) {
            if (sequence !== turn) return true;
            throw error;
        }
        if (sequence !== turn)
            return true;
        if (route === 'register')
            await register(id);
        else if (route === 'my-games' || route === 'booking')
            await myGames(id);
        else if (route === 'host')
            await host(id);
        else if (route === 'participants' || route === 'roster') {
            if (route === 'roster') history.replaceState(null, '', '/participants/' + encodeURIComponent(id) + location.search);
            await roster(id);
        }
        else if (route === 'account')
            await renderAccount({ ...ctx, api, session, refreshSession: () => loadSession({ refresh: true }) });
        else if (route === 'admin')
            await renderAdmin({ ...ctx, api, session });
        else
            info(path);
    }
    catch (e) {
        if (sequence === turn) {
            const recovery = notice(esc(e.message)) + btn('Try again', path) + ' ' + btn('Find a game', '/explore', 'outline');
            if (initialFallback) ctx.main.innerHTML = `<div class="page-width">${recovery}</div>${initialFallback}`;
            else page(heading('LET’S TRY THAT AGAIN', 'A small <em>timeout.</em>', esc(e.message)) + recovery);
        }
    }
    return true;
}
