import { renderAccount, renderSupport, renderAdmin, renderPolicy } from './service-ui.js';
import { listingCard, renderListing } from './discovery.js';
import { actionable, renderExplore } from './explore.js';
import { listingDate } from './catalogue.js';
import { events as samples, dateLabel, timeLabel } from './data.js';
import { newId, validateDraft, indiaDate } from './domain.js';
import { eventState, eventDetailMarkup } from './event-detail.js';
import { trackMetric } from './metrics.js';
let ctx, session, turn = 0;
const policy = 'Cancel your free place from My games any time before the event starts. If the organizer cancels, your registration is cancelled automatically. No payment is collected.';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
function page(html) { ctx.main.innerHTML = `<div class="page-width">${html}</div>`; }
async function api(path, body, method = body ? 'POST' : 'GET') {
    const initialPath = location.pathname + location.search;
    let res;
    try {
        res = await fetch('/api/' + path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    }
    catch {
        throw Error('You seem to be offline. Check your connection and try again.');
    }
    const result = await res.json().catch(() => ({ error: { message: 'Mercury could not load this page. Try again.' } }));
    if (initialPath !== location.pathname + location.search)
        throw Error('Navigation changed.');
    if (!res.ok)
        throw Object.assign(Error(result.error?.message || 'Please try again.'), { status: res.status, fields: result.error?.fields });
    return result;
}
async function loadSession() { session = await api('session'); const a = document.querySelector('#account-link'); if (a)
    a.textContent = session.user ? 'Account' : 'Sign in'; return session; }
function requireUser() {
    if (session?.user && session.consentAccepted) return true;
    const account = '/account?return_to=' + encodeURIComponent(location.pathname + location.search);
    page(heading('YOUR MERCURY ACCOUNT', 'Good games start<br>with <em>you.</em>', session?.user ? 'Finish your account notice to save and join games.' : 'Sign in to save games, reserve a place or run your next session.') + `<div class="form-card account-card">${btn(session?.user ? 'Finish account setup' : 'Open account', account)}<p class="fine">Browsing listings and following organizer links does not require a Mercury account once public access is enabled.</p>${btn('Browse events', '/explore', 'outline')}</div>`);
    return false;
}
function formSubmit(selector, work) {
    const form = document.querySelector(selector);
    form.onsubmit = async event => {
        event.preventDefault();
        if (form.dataset.busy) return;
        const button = form.querySelector('button[type=submit],button:not([type])');
        const originalLabel = button.dataset.originalLabel || button.textContent;
        button.dataset.originalLabel = originalLabel;
        button.textContent = originalLabel;
        button.disabled = true;
        form.dataset.busy = '1';
        const alert = form.querySelector('[role=alert]');
        alert.textContent = '';
        alert.id ||= form.id + '-error';
        form.querySelectorAll('.field-error').forEach(node => node.remove());
        form.querySelectorAll('[aria-invalid="true"]').forEach(field => { field.removeAttribute('aria-invalid'); field.removeAttribute('aria-describedby'); });
        try {
            await work(Object.fromEntries(new FormData(form)), form);
        } catch (error) {
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
            button.disabled = false;
        }
    };
}
function action(selector, work) { document.querySelectorAll(selector).forEach(b => b.onclick = async () => { b.disabled = true; try {
    await work(b);
}
catch (e) {
    ctx.toast(e.message);
}
finally {
    b.disabled = false;
} }); }
const err = '<p class="error" role="alert" tabindex="-1"></p>';
function gameCard(e, bookingId = '') {
    const state = eventState(e);
    const open = state.canBook;
    const destination = bookingId ? '/booking/' + bookingId : (open ? '/register/' : '/event/') + e.id;
    const actionText = bookingId ? 'View confirmed pass' : open ? 'Book free place on Mercury' : 'View details';
    const cardStatus = ({ cancelled: 'Cancelled by organizer', past: 'Game started · entry closed', full: 'Full · no places left' })[state.code] || `${e.spots} free places left`;
    return `<article class="event-card directory-card mercury-card"><a class="card-image" href="/event/${esc(e.id)}" aria-label="View ${esc(e.title)} details"><img src="/assets/mercury-motion.svg" alt="" aria-hidden="true" width="640" height="400" loading="lazy"><span class="image-label">${esc(e.sport)} · ${esc(e.type)}</span><small class="card-art-note">ILLUSTRATIVE ARTWORK</small></a><div class="card-content"><a class="card-main" href="/event/${esc(e.id)}"><p class="event-time">${esc(e.sport)} · ${esc(e.type)}</p><p class="card-date">${dateLabel(e)} · ${timeLabel(e)} IST</p><h3>${esc(e.title)}</h3><p class="muted">⌖ ${esc(e.area)}, Mumbai</p><p class="card-eligibility">Adults 18+ · ${esc(e.level)} · Individual entry</p></a><div class="card-price"><b>Free</b><small>Per player · no payment</small></div><p class="listing-status ${bookingId ? 'confirmed' : esc(state.code)}">${bookingId ? 'Your place is confirmed' : esc(cardStatus)}</p><p class="card-route">Booking on Mercury · confirmation in My games</p><a class="card-outbound" href="${esc(destination)}">${esc(actionText)} ↗</a></div></article>`;
}
export async function enhanceHome(main) {
    const section = main.querySelector('.discovery-section');
    try {
        const [{ events }, { listings }] = await Promise.all([api('events'), api('listings')]);
        if (!section?.isConnected) return;
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
    const [{ events }, { listings }] = await Promise.all([api('events'), api('listings')]);
    if (expectedTurn !== turn) return;
    renderExplore({ main: ctx.main, events, listings, gameCard });
}
async function detail(id) {
    const { event: e } = await api('events/' + id);
    trackMetric('native_detail_view');
    document.title = e.title + ' \u2014 Mercury';
    const state = eventState(e);
    page(eventDetailMarkup(e, { saved: session?.saved?.includes(id), policy }));
    action('#live-save', async () => {
        if (!session?.user || !session.consentAccepted) {
            ctx.go('/account?return_to=' + encodeURIComponent(location.pathname + location.search));
            return;
        }
        const saved = !session.saved.includes(id);
        await api('saved/' + id, { saved });
        await loadSession();
        document.querySelector('#live-save').textContent = saved ? '\u2665 Saved' : '\u2661 Save for later';
        ctx.toast(saved ? 'Saved to your account.' : 'Removed from saved games.');
    });
    action('#live-share', async () => {
        ctx.openSheet('Bring your people.', `<label class="share-label">Game link<input readonly value="${esc(location.origin + '/event/' + id)}" onclick="this.select()"></label><p class="fine">Mercury is currently a private pilot. Only people with site access can open this link.</p>`);
    });
    if (state.canBook) {
        ctx.main.insertAdjacentHTML('beforeend', `<div class="mobile-event-cta"><div><b>Free</b><small>1 player &middot; No payment</small></div>${btn('Book free place', '/register/' + id)}</div>`);
        document.body.classList.add('has-event-cta');
    } else {
        ctx.main.insertAdjacentHTML('beforeend', `<div class="mobile-event-cta"><div><b>${esc(state.label)}</b><small>Booking on Mercury</small></div>${btn('Explore games', '/explore', 'outline')}</div>`);
    }
}
async function register(id) { if (!requireUser())
    return; const { event: e } = await api('events/' + id); if (e.status !== 'published' || e.startsAt <= Date.now() || !e.spots)
    return detail(id); page(`<a class="back" href="/event/${id}">← Back to the game</a>${heading('YOUR NEXT GAME STARTS HERE', 'Make it a <em>plan.</em>', 'One free place. A real plan to play.')}<div class="checkout-layout"><form class="form-card" id="live-registration"><div class="step-label"><span>01</span> Player details</div><label>Your name<input name="name" autocomplete="name" value="${esc(session.user.name === 'Player' ? '' : session.user.name)}" minlength="2" maxlength="80" required></label><label>Playing level<select name="level" required><option value="">Choose your level</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><label class="checkbox"><input type="checkbox" name="adult" required><span>I am 18 or older.</span></label><label class="checkbox"><input type="checkbox" name="rules" required><span>I have read the <a class="text-link" href="/event/${id}" target="_blank">event details and rules</a>, including the cancellation policy.</span></label>${notice('Your name and playing level are shared with this organizer for attendance. Your email is not included in the attendee list.')}<p class="fine">${policy}</p>${err}<button type="submit" class="button primary">Confirm my free place ↗</button></form><aside class="order-card"><img src="/assets/${e.image}" alt="${esc(e.sport)} inspiration"><p class="eyebrow blue">YOUR GAME</p><h2>${esc(e.title)}</h2><p>${dateLabel(e)} · ${timeLabel(e)} IST</p><p>${esc(e.venue)}</p><hr><div class="total"><span>Total</span><b>₹0</b></div><p class="fine">Confirmation is saved to your account. Updates appear in My games; email and SMS are not sent.</p></aside></div>`); const key = newId(); formSubmit('#live-registration', async (d) => { const result = await api('events/' + id + '/register', { name: d.name, level: d.level, adultConfirmed: d.adult === 'on', rulesAccepted: d.rules === 'on', revision: e.revision, idempotencyKey: key }); ctx.toast(result.existing ? 'You already have a place in this game.' : 'You’re in. See you on court!'); ctx.go('/booking/' + result.id); }); }
async function myGames(bookingId) {
    if (!requireUser())
        return;
    const [{ bookings }, { events }, { listings: savedListings }] = await Promise.all([api('bookings'), api('events'), api('saved-listings')]);
    if (bookingId) {
        const b = bookings.find(b => b.id === bookingId);
        if (!b)
            throw Error('This pass was not found in your account.');
        page(heading('YOUR GAME PASS', b.status === 'confirmed' ? 'You’re <em>in.</em>' : b.status === 'checked_in' ? 'You’re checked <em>in.</em>' : 'Your registration', b.status === 'confirmed' ? 'Show this pass to your host when you arrive.' : 'See your current registration status below.') + `<article class="form-card pass-card">${stamp(b.status)}<h2>${esc(b.title)}</h2><p>${dateLabel(b)} · ${timeLabel(b)} IST</p><p>${esc(b.venue)}</p><hr><p><b>${esc(b.player_name)}</b> · ${esc(b.level)}</p><p class="fine">Pass reference</p><code class="pass-reference">${esc(b.id)}</code><p class="fine">This pass identifies your registration. Your organizer verifies attendance from their private roster.</p>${btn('View game', '/event/' + b.event_id, 'outline')} ${btn('My games', '/my-games')}</article>`);
        if (b.status === 'confirmed' && Number(b.starts_at) > Date.now()) {
            ctx.main.querySelector('.pass-card a[href^="/event/"]').insertAdjacentHTML('beforebegin', '<button class="text-link danger" id="cancel-pass">Cancel my place</button>');
            action('#cancel-pass', () => confirmAction('Cancel your place?', 'Your place will become available to another player. No fee is charged.', 'Cancel my place', async () => {
                await api('bookings/' + b.id + '/cancel', {});
                await loadSession();
                await myGames(bookingId);
                ctx.toast('Your place was cancelled.');
            }));
        }
        ctx.main.querySelector('.pass-card').insertAdjacentHTML('beforeend', '<p class="fine">Check My games for any updates. Mercury does not send email or SMS alerts for event changes.</p>');
        return;
    }
    const active = bookings.filter(b => ['confirmed', 'checked_in'].includes(b.status));
    const past = bookings.filter(b => !['confirmed', 'checked_in'].includes(b.status));
    const bookingCard = b => `<article class="manage-card">${stamp(b.status)}<h3>${esc(b.title)}</h3><p>${dateLabel(b)} · ${timeLabel(b)} IST</p><p class="muted">${esc(b.venue)}</p><div class="action-row">${btn('View pass', '/booking/' + b.id, 'outline')}${b.status === 'confirmed' && b.starts_at > Date.now() ? `<button class="text-link danger" data-cancel-booking="${b.id}">Cancel my place</button>` : ''}</div></article>`;
    page(heading('YOUR TIME TO PLAY', 'My <em>games.</em>', 'Confirmed places, bookmarks and updates in one place.') + `<div class="account-toolbar"><a class="text-link" href="/account">Your account ↗</a></div><h2>Confirmed Mercury registrations</h2><div class="manage-grid">${active.length ? active.map(bookingCard).join('') : empty('Make room for your next game.', 'Find a session and your confirmed place will appear here.', btn('Find a game', '/explore'))}</div>${past.length ? `<details><summary>Cancelled registrations (${past.length})</summary><div class="manage-grid">${past.map(bookingCard).join('')}</div></details>` : ''}<h2 class="section-space">Saved Mercury games</h2><div class="event-grid">${events.filter(e => session.saved.includes(e.id)).map(e => gameCard(e, active.find(b => b.event_id === e.id)?.id)).join('') || '<p class="muted">No upcoming saved games. Tap “Save for later” on a game.</p>'}</div><h2 class="section-space">Saved external listings</h2><p class="fine">These are bookmarks, not registrations. Get confirmation and tickets from the organizer.</p><div class="event-grid">${savedListings.map(listingCard).join('') || '<p class="muted">No saved external listings yet.</p>'}</div><div class="section-heading section-space"><h2>Your updates</h2><button class="text-link" id="read-updates">Mark all read ✓</button></div><p class="fine">Updates appear here. Email and SMS notifications are not active.</p><div class="updates">${session.notifications.map(n => `<article class="update ${n.read_at ? '' : 'unread'}"><p>${esc(n.message)}</p><small>${new Date(n.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</small> <a href="/event/${n.event_id}" class="text-link">View game ↗</a></article>`).join('') || '<p class="muted">You’re all caught up.</p>'}</div>`);
    action('[data-cancel-booking]', async (b) => { confirmAction('Cancel your place?', 'Your place will become available to another player. No fee is charged.', 'Cancel my place', async () => { await api('bookings/' + b.dataset.cancelBooking + '/cancel', {}); await loadSession(); await myGames(); ctx.toast('Your place was cancelled.'); }); });
    action('#read-updates', async () => { await api('notifications/read', {}); await loadSession(); await myGames(); });
}
function confirmAction(title, body, label, work) { const sheet = ctx.openSheet(title, `<p>${body}</p>${err}<div class="action-row"><button class="button primary" id="confirm-action">${label}</button><button class="button outline" data-close-sheet>Keep as it is</button></div>`); const b = sheet.querySelector('#confirm-action'); b.onclick = async () => { b.disabled = true; try {
    await work();
    sheet.close();
}
catch (e) {
    sheet.querySelector('[role=alert]').textContent = e.message;
    b.disabled = false;
} }; }
const input = (name, label, value = '', extra = '') => `<label>${label}<input name="${name}" value="${esc(value)}" ${extra}></label>`;
const textarea = (name, label, value = '', min = 3, max = 1000) => `<label>${label}<textarea name="${name}" minlength="${min}" maxlength="${max}" required rows="3">${esc(value)}</textarea></label>`;
const select = (name, label, options, value) => `<label>${label}<select name="${name}">${options.map(o => `<option ${o === value ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
const hostState = event => event.status === 'cancelled' ? 'cancelled'
    : event.status === 'draft' ? 'draft'
    : Number(event.startsAt) <= Date.now() ? 'past'
    : Number(event.registered) >= Number(event.capacity) ? 'full'
    : 'published';
async function host(editId) {
    if (!requireUser())
        return;
    const { events } = await api('organizer/events');
    const edit = editId ? events.find(e => e.id === editId) : null;
    if (editId && !edit)
        throw Error('This draft is not available in your organizer account.');
    const org = session.organizer;
    const d = edit?.draft || { sport: 'Badminton', area: 'Powai', level: 'All levels', format: 'Social play', capacity: 12, price: 0, cancellation: policy };
    page(heading('FOR THE GAME-MAKERS', 'Bring people<br>into <em>play.</em>', 'Your organizer studio. Draft a session, publish it, welcome your players.') + notice('Private pilot · Publish free events now. Paid events can be saved as drafts, but paid registration is not enabled.') + `<div class="studio-layout"><section><details class="profile-details" ${org ? '' : 'open'}><summary>${org ? 'Organizer profile · ' + esc(org.name) : '01 / Set up your organizer profile'}</summary><form class="form-card" id="organizer-profile">${input('name', 'Club or organizer name', org?.name || '', 'minlength="3" maxlength="80" required')}${textarea('bio', 'About your community', org?.bio || '', 0, 500)}${input('contact', 'Public contact email (optional)', org?.contact || '', 'type="email" maxlength="150"')}<p class="fine">Your name, bio and contact email appear on your events. Your account email stays private.</p>${err}<button class="button primary" type="submit">Save organizer profile ↗</button></form></details>${org ? `<form class="form-card" id="event-form"><div class="section-heading"><h2>${edit ? 'Edit your event' : 'Create your next game'}</h2>${edit ? '<a class="text-link" href="/host">New event ↗</a>' : ''}</div>${edit && edit.registered ? notice('Players have registered. Event details are locked to protect their confirmed plans. If the time or venue changes, cancel the event and contact players directly; Mercury updates are in-app only.') : ''}<fieldset ${edit && (edit.registered || edit.status === 'cancelled') ? 'disabled' : ''}><section class="editor-section"><h3>1. Basics</h3><div class="form-grid">${input('title', 'Event name', d.title || '', 'required minlength="4" maxlength="100"')}${select('sport', 'Sport', ['Badminton', 'Tennis', 'Pickleball'], d.sport)}${select('format', 'Format', ['Social play', 'Tournament'], d.format)}</div></section><section class="editor-section"><h3>2. Time and place</h3><div class="form-grid">${select('area', 'Neighbourhood', ['Powai', 'Chandivali', 'Andheri'], d.area)}${input('date', 'Date', d.date || '', `type="date" min="${indiaDate()}" required`)}${input('time', 'Start time (IST)', d.time || '', 'type="time" required')}</div>${input('venue', 'Venue name and full address', d.venue || '', 'minlength="4" maxlength="150" required')}<p class="fine">Confirm the venue, address and court permission before publishing.</p></section><section class="editor-section"><h3>3. Eligibility and capacity</h3><div class="form-grid">${select('level', 'Playing level', ['All levels', 'Beginner friendly', 'Intermediate'], d.level)}${input('capacity', 'Player capacity', d.capacity, 'type="number" min="2" max="500" required')}${input('price', 'Price per player (₹)', d.price, 'type="number" min="0" max="100000" required')}</div><p class="fine">Players must be 18 or older to book on Mercury. Paid events remain drafts until payment is enabled.</p></section><section class="editor-section"><h3>4. Player instructions</h3>${textarea('description', 'What will the session be like? Include any eligibility rules.', d.description || '', 20, 1500)}${textarea('included', 'What’s included (one item per line)', d.included || '', 5, 500)}${textarea('bring', 'What should players bring?', d.bring || '', 3, 300)}${textarea('cancellation', 'Cancellation and organizer notes', d.cancellation || policy, 15, 1000)}</section><section class="editor-section editor-review"><h3>5. Review and publish</h3><p class="fine">Sessions last 90 minutes. Free places can be cancelled before start time. Preview the public page, then save a draft. Publishing happens from Your events.</p><label class="checkbox"><input type="checkbox" required><span>I have checked the event details and can host this session.</span></label>${err}<div class="action-row"><button class="button primary" type="submit">Save ${edit ? 'changes' : 'draft'} ↗</button><button class="button outline" type="button" id="preview-event">Preview public page</button></div><p class="fine">A saved draft stays private until you publish it.</p></section></fieldset></form>` : notice('Save your organizer profile to create your first event.')}</section><aside><h2>Your events</h2><div class="host-event-list">${events.map(e => `<article class="manage-card">${stamp(hostState(e))}<h3>${esc(e.title)}</h3><p>${dateLabel(e)} · ${timeLabel(e)} IST</p><p>${e.registered} / ${e.capacity} players · ${e.price ? '₹' + e.price : 'Free'}</p><div class="action-row">${e.status !== 'cancelled' ? btn('Edit', '/host/' + e.id, 'outline') : ''}${e.status === 'published' ? btn('View', '/event/' + e.id, 'outline') : ''}${btn('Roster', '/roster/' + e.id, 'outline')}${e.status === 'draft' ? `<button class="button primary" data-event-action="publish" data-id="${e.id}" ${e.price || Number(e.startsAt) <= Date.now() ? 'disabled' : ''}>${e.price ? 'Paid publishing unavailable' : Number(e.startsAt) <= Date.now() ? 'Choose a future date to publish' : 'Publish free game ↗'}</button>` : ''}${e.status === 'published' && !e.registered ? `<button class="text-link" data-event-action="unpublish" data-id="${e.id}">Return to draft</button>` : ''}${e.status !== 'cancelled' ? `<button class="text-link danger" data-event-action="cancel" data-id="${e.id}">Cancel event</button>` : ''}</div></article>`).join('') || '<p class="muted">Your first game belongs here.</p>'}</div><p class="fine">Only your account can manage these events and their attendees.</p></aside></div>`);
    formSubmit('#organizer-profile', async (data) => { await api('organizer/profile', data); await loadSession(); ctx.toast('Organizer profile saved.'); await host(editId); });
    if (org) {
        const eventForm = document.querySelector('#event-form');
        eventForm.querySelector('#preview-event').onclick = () => {
            const raw = Object.fromEntries(new FormData(eventForm));
            const reviewed = eventForm.querySelector('input[type="checkbox"]').checked;
            const { value: draft, errors, valid } = validateDraft(raw);
            if (!valid) {
                const problems = Object.entries(errors).map(([field, message]) => `<li><b>${esc(field)}:</b> ${esc(message)}</li>`).join('');
                ctx.openSheet('Check the event details', `<p>Complete these details before previewing the public page.</p><ul>${problems}</ul><button class="button outline" type="button" data-close-sheet>Back to editor</button>`);
                return;
            }
            const image = { Badminton: 'badminton.jpg', Tennis: 'tennis.jpg', Pickleball: 'pickleball.jpg' }[draft.sport];
            const event = {
                ...draft, id: edit?.id || 'private-preview', type: draft.format,
                startsAt: Date.parse(`${draft.date}T${draft.time}:00+05:30`),
                duration: 90, spots: draft.capacity, status: 'draft',
                host: org.name, hostBio: org.bio, hostContact: org.contact,
                image, included: draft.included.split('\n').filter(Boolean),
            };
            page(eventDetailMarkup(event, { preview: true, policy }));
            ctx.main.querySelector('.back').onclick = async click => {
                click.preventDefault();
                await host(editId);
                const restored = document.querySelector('#event-form');
                for (const [name, value] of Object.entries(raw)) {
                    const field = restored.elements.namedItem(name);
                    if (field) field.value = value;
                }
                restored.querySelector('input[type="checkbox"]').checked = reviewed;
                restored.scrollIntoView({ block: 'start' });
            };
            window.scrollTo(0, 0);
        };
        formSubmit('#event-form', async (data) => { const checked = validateDraft(data); if (!checked.valid)
            throw Object.assign(Error('Check the highlighted event details.'), { fields: checked.errors }); await api('organizer/events' + (edit ? '/' + edit.id : ''), { ...checked.value, revision: edit?.revision }, edit ? 'PATCH' : 'POST'); ctx.toast('Draft saved to your account.'); ctx.go('/host'); });
    }
    action('[data-event-action]', async (b) => { const act = b.dataset.eventAction; const title = act === 'publish' ? 'Publish this game?' : act === 'cancel' ? 'Cancel this event?' : 'Return to draft?'; const body = act === 'publish' ? 'People with access to Mercury will be able to reserve a free place. Confirm your venue is ready.' : act === 'cancel' ? 'All active registrations will be cancelled. Players will see an update in My games. This cannot be undone.' : 'This event will no longer appear in discovery.'; confirmAction(title, body, act === 'publish' ? 'Publish game' : act === 'cancel' ? 'Cancel event' : 'Return to draft', async () => { await api('organizer/events/' + b.dataset.id + '/' + act, {}); await host(); ctx.toast(act === 'publish' ? 'Your game is published.' : 'Event updated.'); }); });
}
async function roster(id) { if (!requireUser())
    return; const { event: e, attendees } = await api('organizer/events/' + id + '/attendees'); page(`<a class="back" href="/host">← Organizer studio</a>${heading('WELCOME YOUR PLAYERS', esc(e.title), 'Check attendance against the player name and pass reference.')}<div class="roster-summary">${stamp(e.status)}<b>${attendees.filter(b => b.status === 'checked_in').length} checked in</b><span>${e.registered} active registrations / ${e.capacity} places</span><button class="button outline" id="refresh-roster">Refresh roster ↻</button><button class="button outline" id="export-roster">Download CSV ↓</button></div><div class="roster-list">${attendees.map(b => `<article class="roster-row"><div><h3>${esc(b.player_name)}</h3><p>${esc(b.level)} · <code>${esc(b.id)}</code></p></div><div class="action-row">${stamp(b.status)}${b.status === 'confirmed' && e.status === 'published' ? `<button class="button primary" data-check-in="${b.id}">Check in ✓</button>` : ''}</div></article>`).join('') || empty('Your crew is on its way.', 'Registrations will appear here as players join.')}</div><p class="fine">This roster contains personal information. Keep exports private and use them only to run this session.</p>`); action('[data-check-in]', async (b) => { await api('organizer/events/' + id + '/check-in', { bookingId: b.dataset.checkIn }); await roster(id); ctx.toast('Player checked in.'); }); action('#refresh-roster', () => roster(id)); action('#export-roster', async () => { const cell = v => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"'; const csv = [['Pass reference', 'Player name', 'Level', 'Status'], ...attendees.map(b => [b.id, b.player_name, b.level, b.status])].map(row => row.map(cell).join(',')).join('\r\n'); const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'mercury-attendees.csv'; a.click(); URL.revokeObjectURL(url); }); }
function info() { page(`<div class="prose">${heading('LESS PLANNING. MORE PLAY.','Find it. Check it.<br><em>Play it.</em>')}<h2>Discover your next game.</h2><p>Browse real events by sport, neighbourhood and format. Source links, entry units and eligibility notes help you choose.</p><h2>Register with the organizer.</h2><p>External listings open the organizer or booking provider’s website. Check current dates, category rules, fees and cancellation terms before entering. Mercury has not onboarded these organizers and does not issue their tickets. Saving a listing is a bookmark, not a booking.</p><h2>Keep your shortlist.</h2><p>Create an account to save events across devices. Mercury accounts are for people aged 18 or older; a parent or guardian should manage junior entries with the organizer.</p><h2>For free sessions booked on Mercury</h2><p>Where an event is labelled Book on Mercury, your confirmed place appears in My games. Free places can be cancelled before the start, unless already checked in. Organizer cancellations appear in My games. Email and SMS are not active; paid native registration is disabled.</p><p>Found something wrong? Use Suggest a correction or <a href="/support">contact Mercury</a>.</p>${btn('Find your game','/explore')}</div>`); }
export async function liveRoute(path, context) {
    ctx = context;
    const sequence = ++turn;
    if (!document.querySelector('#account-link')) {
        const a = document.createElement('a');
        a.id = 'account-link';
        a.href = '/account';
        a.className = 'account-link';
        a.textContent = 'Account';
        document.querySelector('.header-actions').prepend(a);
    }
    const [, route, id] = path.split('/');
    document.title = ({ host: 'Organizer studio', roster: 'Attendee roster', account: 'Your account', admin: 'Owner desk', 'my-games': 'My games', booking: 'Your game pass', explore: 'Find a game', privacy: 'Your privacy', terms: 'Terms', support: 'Help & contact', 'how-it-works': 'How Mercury works' }[route] || 'Mercury') + ' — Mercury';
    const sample = samples.some(e => e.id === id);
    const handled = ['explore', 'listing', 'host', 'roster', 'account', 'my-games', 'privacy', 'terms', 'support', 'admin', 'how-it-works'].includes(route) || (['event', 'register'].includes(route) && !sample) || route === 'booking';
    // Demo passes are local and have a separate identity from durable game passes.
    if (!handled)
        return false;
    const initialFallback = ['explore', 'listing', 'event'].includes(route)
        && ctx.main.querySelector('[data-server-path]')?.getAttribute('data-server-path') === path
        ? ctx.main.innerHTML : null;
    page('<section class="page-intro"><p class="eyebrow blue">MERCURY</p><h1>Getting your game ready.</h1><p role="status">Just a moment…</p></section>');
    try {
        if (route === 'privacy' || route === 'terms') { renderPolicy(path, ctx); return true; }
        try { await loadSession(); } catch (error) { if (!['support','explore','listing'].includes(route)) throw error; session = {user:null,saved:[],savedListings:[],notifications:[]}; }
        if (sequence !== turn)
            return true;
        if (route === 'explore')
            await explore(sequence);
        else if (route === 'listing')
            await renderListing(id, { ...ctx, api, session });
        else if (route === 'event')
            await detail(id);
        else if (route === 'register')
            await register(id);
        else if (route === 'my-games' || route === 'booking')
            await myGames(id);
        else if (route === 'host')
            await host(id);
        else if (route === 'roster')
            await roster(id);
        else if (route === 'account')
            await renderAccount({ ...ctx, api, session });
        else if (route === 'support')
            renderSupport({ ...ctx, api, session });
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
