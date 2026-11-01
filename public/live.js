import { listingCard, renderExplore, renderListing } from './discovery.js';
import { events as samples, dateLabel, timeLabel, filterEvents } from './data.js';
import { parseFilters, orderEvents, newId, validateDraft, indiaDate } from './domain.js';
let ctx, session, turn = 0;
const policy = 'Cancel your free place from My games any time before the event starts. If the organizer cancels, your registration is cancelled automatically. No payment is collected.';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const btn = (text, url, kind = 'primary') => `<a class="button ${kind}" href="${url}">${text} ↗</a>`;
const heading = (label, title, sub = '') => `<section class="page-intro"><p class="eyebrow blue">${label}</p><h1>${title}</h1><p>${sub}</p></section>`;
const notice = t => `<div class="inline-notice">${t}</div>`;
const empty = (title, body, action = '') => `<div class="empty"><span>✳</span><h2>${title}</h2><p>${body}</p>${action}</div>`;
const stamp = status => `<span class="state state-${status}">${esc(status.replaceAll('_', ' '))}</span>`;
function page(html) { ctx.main.innerHTML = `<div class="page-width">${html}</div>`; }
async function api(path, body, method = body ? 'POST' : 'GET') {
    const initialPath = location.pathname;
    let res;
    try {
        res = await fetch('/api/' + path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    }
    catch {
        throw Error('You seem to be offline. Check your connection and try again.');
    }
    const result = await res.json().catch(() => ({ error: { message: 'Mercury could not load this page. Try again.' } }));
    if (initialPath !== location.pathname)
        throw Error('Navigation changed.');
    if (!res.ok)
        throw Object.assign(Error(result.error?.message || 'Please try again.'), { status: res.status, fields: result.error?.fields });
    return result;
}
async function loadSession() { session = await api('session'); const a = document.querySelector('#account-link'); if (a)
    a.textContent = session.user ? 'Account' : 'Sign in'; return session; }
function requireUser() { if (session?.user)
    return true; page(heading('YOUR MERCURY ACCOUNT', 'Good games start<br>with <em>you.</em>', 'Sign in to save games, reserve a place or run your next session.') + `<div class="form-card account-card">${btn('Continue with ChatGPT', '/signin-with-chatgpt?return_to=' + encodeURIComponent(location.pathname + location.search))}<p class="fine">Your bookings follow your account across devices.</p>${btn('Browse sample games', '/samples', 'outline')}</div>`); return false; }
function formSubmit(selector, work) { const form = document.querySelector(selector); form.onsubmit = async (e) => { e.preventDefault(); if (form.dataset.busy)
    return; form.dataset.busy = '1'; const b = form.querySelector('button[type=submit],button:not([type])'); b.disabled = true; const err = form.querySelector('[role=alert]'); err.textContent = ''; try {
    await work(Object.fromEntries(new FormData(form)), form);
}
catch (error) {
    err.textContent = error.message + (error.fields ? ' ' + Object.values(error.fields).join(' ') : '');
    err.focus?.();
}
finally {
    delete form.dataset.busy;
    b.disabled = false;
} }; }
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
function gameCard(e) { return `<article class="event-card"><a class="card-image" href="/event/${e.id}"><img src="/assets/${e.image}" alt="${esc(e.sport)} inspiration" loading="lazy"><span class="image-label">${esc(e.sport)}</span>${e.spots < 7 ? `<span class="availability ${e.spots ? '' : 'full'}">${e.spots ? e.spots + ' spots left' : 'Full'}</span>` : ''}</a><a class="card-content" href="/event/${e.id}"><p class="event-time">BOOK ON MERCURY · ${dateLabel(e)} · ${timeLabel(e)} IST</p><h3>${esc(e.title)}</h3><p class="muted">⌖ ${esc(e.area)}, Mumbai</p><div class="tags"><span>${esc(e.level)}</span><span>${esc(e.type)}</span></div><div class="card-bottom"><b>Free <small>/ player</small></b><span class="round-arrow">↗</span></div></a></article>`; }
export async function enhanceHome(main) {
    const section = main.querySelector('.discovery-section');
    try {
        const [{ events }, { listings }] = await Promise.all([api('events'), api('listings')]);
        if (!section?.isConnected) return;
        const all = [...events.map(e => ({ ...e, external: false })), ...listings.map(e => ({ ...e, external: true }))].sort((a,b) => a.date.localeCompare(b.date));
        const render = sport => {
            const selected = all.filter(e => sport === 'All sports' || e.sport === sport).slice(0, 6);
            section.querySelector('#featured-grid').innerHTML = selected.length ? selected.map(e => e.external ? listingCard(e) : gameCard(e)).join('') : empty('More games are on the way.', 'Try another sport or host your own session.', btn('Host a game', '/host'));
        };
        section.querySelectorAll('[data-home-sport]').forEach(b => b.onclick = () => {
            section.querySelectorAll('[data-home-sport]').forEach(x => { x.classList.toggle('selected', x === b); x.setAttribute('aria-pressed', String(x === b)); });
            render(b.dataset.homeSport);
        });
        render('All sports');
    } catch (e) { if (section?.isConnected) section.querySelector('#featured-grid').innerHTML = notice(esc(e.message)) + btn('Try again', '/'); }
}
async function explore() {
    const [{ events }, { listings }] = await Promise.all([api('events'), api('listings')]);
    renderExplore({ main: ctx.main, events, listings, gameCard });
}
async function detail(id) { const { event: e } = await api('events/' + id); document.title = e.title + ' — Mercury'; const open = e.status === 'published' && e.startsAt > Date.now() && e.spots > 0; page(`<a class="back" href="/explore">← All games</a><div class="detail-cover"><img src="/assets/${e.image}" alt="${esc(e.sport)} inspiration"><span>MAKE TIME FOR PLAY</span></div><div class="detail-layout"><article><div class="tags"><span class="blue-tag">${esc(e.sport)}</span><span>${esc(e.type)}</span>${stamp(e.status)}</div><h1 class="detail-title">${esc(e.title)}</h1><p class="host-by">Hosted by ${esc(e.host)}</p><div class="event-facts"><div><span>◷</span><p><b>${dateLabel(e)}</b><small>${timeLabel(e)} IST · ${e.duration} minutes</small></p></div><div><span>⌖</span><p><b>${esc(e.area)}, Mumbai</b><small>${esc(e.venue)}</small></p></div><div><span>◎</span><p><b>${esc(e.level)}</b><small>Adults 18+ · Individual entry</small></p></div><div><span>↗</span><p><b>${esc(e.type)}</b><small>${e.capacity} players</small></p></div></div><h2>A good game, a good time.</h2><p class="body-copy preserve-lines">${esc(e.description)}</p><h3>What’s included</h3><ul class="included">${e.included.map(x => `<li>✓ ${esc(x)}</li>`).join('')}</ul><h3>What to bring</h3><p class="body-copy">${esc(e.bring)}</p><div class="solo-note"><span>✳</span><p>Come as you are. Respect other players, share court time fairly and tell your host if you need a break.</p></div><details open><summary>Cancellation</summary><p>${policy}</p><p>${esc(e.cancellation)}</p></details><details><summary>Your host</summary><p>${esc(e.hostBio || 'Your organizer will welcome you at the session.')}</p>${e.hostContact ? `<a class="text-link" href="mailto:${esc(e.hostContact)}">${esc(e.hostContact)}</a>` : '<p>No public contact email added yet.</p>'}</details><p class="fine">Court photos are illustrative. Confirm the address above with your host.</p></article><aside class="booking-panel"><p class="eyebrow blue">MAKE IT A PLAN</p><div class="price">Free <span>/ player</span></div><p class="muted">No payment required</p><div class="booking-summary"><span>${dateLabel(e)}</span><b>${timeLabel(e)} IST</b><span>Entry</span><b>1 player · 18+</b></div><p class="spots">${e.status === 'cancelled' ? 'This game has been cancelled.' : e.startsAt <= Date.now() ? 'Registration has closed.' : `${e.spots} of ${e.capacity} places left`}</p>${open ? btn('Join the game', '/register/' + id) : '<button class="button primary" disabled>Registration closed</button>'}<button class="button outline" id="live-save">${session?.saved?.includes(id) ? '♥ Saved' : '♡ Save for later'}</button><button class="button outline" id="live-share">Share game ↗</button><p class="fine">A confirmed registration appears in My games.</p></aside></div>`); action('#live-save', async () => { if (!session?.user) {
    ctx.go('/account');
    return;
} const saved = !session.saved.includes(id); await api('saved/' + id, { saved }); await loadSession(); document.querySelector('#live-save').textContent = saved ? '♥ Saved' : '♡ Save for later'; ctx.toast(saved ? 'Saved to your account.' : 'Removed from saved games.'); }); action('#live-share', async () => { ctx.openSheet('Bring your people.', `<label class="share-label">Game link<input readonly value="${esc(location.origin + '/event/' + id)}" onclick="this.select()"></label><p class="fine">Mercury is currently a private pilot. Only people with site access can open this link.</p>`); }); if (open) {
    ctx.main.insertAdjacentHTML('beforeend', `<div class="mobile-event-cta"><div><b>Free</b><small>1 player · No payment</small></div>${btn('Join the game', '/register/' + id)}</div>`);
    document.body.classList.add('has-event-cta');
} }
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
        return;
    }
    const active = bookings.filter(b => ['confirmed', 'checked_in'].includes(b.status));
    const past = bookings.filter(b => !['confirmed', 'checked_in'].includes(b.status));
    const bookingCard = b => `<article class="manage-card">${stamp(b.status)}<h3>${esc(b.title)}</h3><p>${dateLabel(b)} · ${timeLabel(b)} IST</p><p class="muted">${esc(b.venue)}</p><div class="action-row">${btn('View pass', '/booking/' + b.id, 'outline')}${b.status === 'confirmed' && b.starts_at > Date.now() ? `<button class="text-link danger" data-cancel-booking="${b.id}">Cancel my place</button>` : ''}</div></article>`;
    page(heading('YOUR TIME TO PLAY', 'My <em>games.</em>', 'Your registrations, saved sessions and updates — together.') + `<div class="account-toolbar"><a class="text-link" href="/account">Your account ↗</a><a class="text-link" href="/demo-games">Local demo passes ↗</a></div><h2>Your registrations</h2><div class="manage-grid">${active.length ? active.map(bookingCard).join('') : empty('Make room for your next game.', 'Find a session and your confirmed place will appear here.', btn('Find a game', '/explore'))}</div>${past.length ? `<details><summary>Cancelled registrations (${past.length})</summary><div class="manage-grid">${past.map(bookingCard).join('')}</div></details>` : ''}<h2 class="section-space">Saved for later</h2><div class="event-grid">${events.filter(e => session.saved.includes(e.id)).map(gameCard).join('') || '<p class="muted">No upcoming saved games. Tap “Save for later” on a game.</p>'}</div><h2 class="section-space">Saved external listings</h2><p class="fine">These are bookmarks, not registrations. Get confirmation and tickets from the organizer.</p><div class="event-grid">${savedListings.map(listingCard).join('') || '<p class="muted">No saved external listings yet.</p>'}</div><div class="section-heading section-space"><h2>Your updates</h2><button class="text-link" id="read-updates">Mark all read ✓</button></div><p class="fine">Updates appear here. Email and SMS notifications are not active.</p><div class="updates">${session.notifications.map(n => `<article class="update ${n.read_at ? '' : 'unread'}"><p>${esc(n.message)}</p><small>${new Date(n.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</small> <a href="/event/${n.event_id}" class="text-link">View game ↗</a></article>`).join('') || '<p class="muted">You’re all caught up.</p>'}</div>`);
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
async function account() { if (!requireUser())
    return; page(heading('YOUR MERCURY', 'Make yourself <em>at home.</em>') + `<div class="form-card account-card"><p class="fine">Signed in as ${esc(session.user.email)}</p><form id="profile"><label>Your player name<input name="name" value="${esc(session.user.name)}" minlength="2" maxlength="80" required></label>${err}<button type="submit" class="button primary">Save name ↗</button></form><hr><div class="action-row">${btn('My games', '/my-games', 'outline')}${btn('Organizer studio', '/host', 'outline')}</div><a class="text-link signout" href="/signout-with-chatgpt?return_to=/">Sign out</a><p class="fine">Read how Mercury handles your data in our <a href="/privacy">privacy information</a>.</p></div>`); formSubmit('#profile', async (d) => { await api('profile', d); await loadSession(); ctx.toast('Your name is saved.'); }); }
const input = (name, label, value = '', extra = '') => `<label>${label}<input name="${name}" value="${esc(value)}" ${extra}></label>`;
const textarea = (name, label, value = '', min = 3, max = 1000) => `<label>${label}<textarea name="${name}" minlength="${min}" maxlength="${max}" required rows="3">${esc(value)}</textarea></label>`;
const select = (name, label, options, value) => `<label>${label}<select name="${name}">${options.map(o => `<option ${o === value ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
async function host(editId) {
    if (!requireUser())
        return;
    const { events } = await api('organizer/events');
    const edit = editId ? events.find(e => e.id === editId) : null;
    if (editId && !edit)
        throw Error('This draft is not available in your organizer account.');
    const org = session.organizer;
    const d = edit?.draft || { sport: 'Badminton', area: 'Powai', level: 'All levels', format: 'Social play', capacity: 12, price: 0, cancellation: policy };
    page(heading('FOR THE GAME-MAKERS', 'Bring people<br>into <em>play.</em>', 'Your organizer studio. Draft a session, publish it, welcome your players.') + notice('Private pilot · Publish free events now. Paid events can be saved as drafts, but paid registration is not enabled.') + `<div class="studio-layout"><section><details class="profile-details" ${org ? '' : 'open'}><summary>${org ? 'Organizer profile · ' + esc(org.name) : '01 / Set up your organizer profile'}</summary><form class="form-card" id="organizer-profile">${input('name', 'Club or organizer name', org?.name || '', 'minlength="3" maxlength="80" required')}${textarea('bio', 'About your community', org?.bio || '', 0, 500)}${input('contact', 'Public contact email (optional)', org?.contact || '', 'type="email" maxlength="150"')}<p class="fine">Your name, bio and contact email appear on your events. Your account email stays private.</p>${err}<button class="button primary" type="submit">Save organizer profile ↗</button></form></details>${org ? `<form class="form-card" id="event-form"><div class="section-heading"><h2>${edit ? 'Edit your event' : 'Create your next game'}</h2>${edit ? '<a class="text-link" href="/host">New event ↗</a>' : ''}</div>${edit && edit.registered ? notice('Players have registered. Event details are locked to protect their confirmed plans. You can manage attendance or cancel the event from your list.') : ''}<fieldset ${edit && (edit.registered || edit.status === 'cancelled') ? 'disabled' : ''}><div class="form-grid">${input('title', 'Event name', d.title || '', 'required minlength="4" maxlength="100"')}${select('sport', 'Sport', ['Badminton', 'Tennis', 'Pickleball'], d.sport)}${select('area', 'Neighbourhood', ['Powai', 'Chandivali', 'Andheri'], d.area)}${input('date', 'Date', d.date || '', `type="date" min="${indiaDate()}" required`)}${input('time', 'Start time (IST)', d.time || '', 'type="time" required')}${input('capacity', 'Player capacity', d.capacity, 'type="number" min="2" max="500" required')}${input('price', 'Price per player (₹)', d.price, 'type="number" min="0" max="100000" required')}${select('level', 'Playing level', ['All levels', 'Beginner friendly', 'Intermediate'], d.level)}${select('format', 'Format', ['Social play', 'Tournament'], d.format)}</div>${input('venue', 'Venue name and full address', d.venue || '', 'minlength="4" maxlength="150" required')}${textarea('description', 'What will the session be like?', d.description || '', 20, 1500)}${textarea('included', 'What’s included (one item per line)', d.included || '', 5, 500)}${textarea('bring', 'What should players bring?', d.bring || '', 3, 300)}${textarea('cancellation', 'Cancellation and organizer notes', d.cancellation || policy, 15, 1000)}<p class="fine">Sessions last 90 minutes. Free places can always be cancelled before start time. Confirm the venue, permissions and equipment before publishing.</p><label class="checkbox"><input type="checkbox" required><span>I have checked the event details and can host this session.</span></label>${err}<button class="button primary" type="submit">Save ${edit ? 'changes' : 'draft'} ↗</button><p class="fine">A saved draft stays private until you publish it.</p></fieldset></form>` : notice('Save your organizer profile to create your first event.')}</section><aside><h2>Your events</h2><div class="host-event-list">${events.map(e => `<article class="manage-card">${stamp(e.status)}<h3>${esc(e.title)}</h3><p>${dateLabel(e)} · ${timeLabel(e)} IST</p><p>${e.registered} / ${e.capacity} players · ${e.price ? '₹' + e.price : 'Free'}</p><div class="action-row">${e.status !== 'cancelled' ? btn('Edit', '/host/' + e.id, 'outline') : ''}${e.status === 'published' ? btn('View', '/event/' + e.id, 'outline') : ''}${btn('Roster', '/roster/' + e.id, 'outline')}${e.status === 'draft' ? `<button class="button primary" data-event-action="publish" data-id="${e.id}" ${e.price ? 'disabled' : ''}>${e.price ? 'Paid publishing unavailable' : 'Publish free game ↗'}</button>` : ''}${e.status === 'published' && !e.registered ? `<button class="text-link" data-event-action="unpublish" data-id="${e.id}">Return to draft</button>` : ''}${e.status !== 'cancelled' ? `<button class="text-link danger" data-event-action="cancel" data-id="${e.id}">Cancel event</button>` : ''}</div></article>`).join('') || '<p class="muted">Your first game belongs here.</p>'}</div><p class="fine">Only your account can manage these events and their attendees.</p><a class="text-link" href="/demo-host">Open local demo drafts ↗</a></aside></div>`);
    formSubmit('#organizer-profile', async (data) => { await api('organizer/profile', data); await loadSession(); ctx.toast('Organizer profile saved.'); await host(editId); });
    if (org)
        formSubmit('#event-form', async (data) => { const checked = validateDraft(data); if (!checked.valid)
            throw Error(Object.values(checked.errors).join(' ')); await api('organizer/events' + (edit ? '/' + edit.id : ''), { ...checked.value, revision: edit?.revision }, edit ? 'PATCH' : 'POST'); ctx.toast('Draft saved to your account.'); ctx.go('/host'); });
    action('[data-event-action]', async (b) => { const act = b.dataset.eventAction; const title = act === 'publish' ? 'Publish this game?' : act === 'cancel' ? 'Cancel this event?' : 'Return to draft?'; const body = act === 'publish' ? 'People with access to Mercury will be able to reserve a free place. Confirm your venue is ready.' : act === 'cancel' ? 'All active registrations will be cancelled. Players will see an update in My games. This cannot be undone.' : 'This event will no longer appear in discovery.'; confirmAction(title, body, act === 'publish' ? 'Publish game' : act === 'cancel' ? 'Cancel event' : 'Return to draft', async () => { await api('organizer/events/' + b.dataset.id + '/' + act, {}); await host(); ctx.toast(act === 'publish' ? 'Your game is published.' : 'Event updated.'); }); });
}
async function roster(id) { if (!requireUser())
    return; const { event: e, attendees } = await api('organizer/events/' + id + '/attendees'); page(`<a class="back" href="/host">← Organizer studio</a>${heading('WELCOME YOUR PLAYERS', esc(e.title), 'Check attendance against the player name and pass reference.')}<div class="roster-summary">${stamp(e.status)}<b>${attendees.filter(b => b.status === 'checked_in').length} checked in</b><span>${e.registered} active registrations / ${e.capacity} places</span><button class="button outline" id="refresh-roster">Refresh roster ↻</button><button class="button outline" id="export-roster">Download CSV ↓</button></div><div class="roster-list">${attendees.map(b => `<article class="roster-row"><div><h3>${esc(b.player_name)}</h3><p>${esc(b.level)} · <code>${esc(b.id)}</code></p></div><div class="action-row">${stamp(b.status)}${b.status === 'confirmed' && e.status === 'published' ? `<button class="button primary" data-check-in="${b.id}">Check in ✓</button>` : ''}</div></article>`).join('') || empty('Your crew is on its way.', 'Registrations will appear here as players join.')}</div><p class="fine">This roster contains personal information. Keep exports private and use them only to run this session.</p>`); action('[data-check-in]', async (b) => { await api('organizer/events/' + id + '/check-in', { bookingId: b.dataset.checkIn }); await roster(id); ctx.toast('Player checked in.'); }); action('#refresh-roster', () => roster(id)); action('#export-roster', async () => { const cell = v => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"'; const csv = [['Pass reference', 'Player name', 'Level', 'Status'], ...attendees.map(b => [b.id, b.player_name, b.level, b.status])].map(row => row.map(cell).join(',')).join('\r\n'); const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'mercury-attendees.csv'; a.click(); URL.revokeObjectURL(url); }); }
function info(path) { const privacy = path === '/privacy'; page(`<div class="prose">${heading(privacy ? 'YOUR DATA' : 'LESS PLANNING. MORE PLAY.', privacy ? 'Your data.<br>Your <em>call.</em>' : 'Find it. Join it.<br><em>Play it.</em>')}${privacy ? `<h2>Private pilot privacy information</h2><p>Signing in connects Mercury to your site-specific account ID and email. We store your player name, organizer profile, saved events, registrations, acceptance of event rules, attendance, saved external listings and submitted corrections in Mercury’s database. External-link activations are counted per listing and day without a user identifier; these counts are not confirmed registrations.</p><p>An organizer can see the names, levels, registration status and attendance of players in their own events. Your account email is not included in their roster. Organizer profile details and any public contact email are visible on their events.</p><p>Notifications appear in My games. No payment details are collected, and no email or SMS service is active. Local sample bookings and draft forms remain in your browser; you can clear them from <a href="/demo-games">Local demo passes</a>.</p><p>Hosting and authentication providers process technical request and sign-in information. Google Fonts provides typography. Court photos are illustrative. This is a private pilot; a final retention policy, privacy contact and launch terms still need to be established before public use.</p><p>For now, contact the Mercury owner directly for account data export or removal. Cancelling a booking changes its status; it does not erase the registration record.</p>` : `<h2>One good game is all it takes.</h2><p>External listings are researched from organizer and booking websites. Open the source to check current details and register there. Mercury is not affiliated with these organizers and does not collect payment or issue entry passes for external listings. Saving an external listing is a bookmark only.</p><h3>For sessions booked on Mercury</h3><p>Browse published games by sport, neighbourhood, level and format. Open an event to see the venue, host, what’s included and cancellation details.</p><p>Sign in, confirm you’re 18 or older, and reserve one free place. Your game pass is saved in My games. Show it to the organizer when you arrive.</p><p>Plans change: cancel a free registration before the event starts. Event cancellations and other updates appear in My games.</p><p>Organizers can create a profile, save drafts, publish free sessions, see their attendee roster and check players in. Paid bookings are not enabled in this pilot. Sample games are clearly marked and never reserve a real place.</p>${btn('Find your game', '/explore')}`}</div>`); }
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
    document.title = ({ host: 'Organizer studio', roster: 'Attendee roster', account: 'Your account', 'my-games': 'My games', booking: 'Your game pass', explore: 'Find a game', privacy: 'Your privacy', 'how-it-works': 'How Mercury works' }[route] || 'Mercury') + ' — Mercury';
    const sample = samples.some(e => e.id === id);
    const handled = ['explore', 'listing', 'host', 'roster', 'account', 'my-games', 'privacy', 'how-it-works'].includes(route) || (['event', 'register'].includes(route) && !sample) || route === 'booking';
    // Demo passes are local and have a separate identity from durable game passes.
    if (!handled)
        return false;
    page('<section class="page-intro"><p class="eyebrow blue">MERCURY</p><h1>Getting your game ready.</h1><p role="status">Just a moment…</p></section>');
    try {
        await loadSession();
        if (sequence !== turn)
            return true;
        if (route === 'explore')
            await explore();
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
            await account();
        else
            info(path);
    }
    catch (e) {
        if (sequence === turn)
            page(heading('LET’S TRY THAT AGAIN', 'A small <em>timeout.</em>', esc(e.message)) + btn('Try again', path) + ' ' + btn('Find a game', '/explore', 'outline'));
    }
    return true;
}
