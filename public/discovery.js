import { listingDate, listingStatus } from './catalogue.js';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const external = (url, text, attributes = '') => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" ${attributes}>${text} ↗</a>`;
export function listingCard(e) {
  const status = e.availability || listingStatus(e);
  const sportClass = e.sport.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `<article class="event-card directory-card"><a class="listing-art ${sportClass}" href="/listing/${e.id}" aria-label="View ${esc(e.title)}"><span>${esc(e.sport)}</span><span class="listing-art-symbol" aria-hidden="true">${e.sport === 'Badminton' ? '◈' : e.sport === 'Tennis' ? '◉' : '◎'}</span><b>${esc(listingDate(e))}</b><small>AROUND MUMBAI ↗</small></a><a class="card-content" href="/listing/${e.id}"><p class="event-time">EXTERNAL LISTING · ${esc(e.type)}</p><h3>${esc(e.title)}</h3><p class="muted">⌖ ${esc(e.area)}</p><div class="tags"><span>${esc(e.level)}</span></div><p class="listing-status ${status.code}">${esc(status.label)}</p><div class="card-bottom"><b>${esc(e.priceLabel)}</b><span class="round-arrow">↗</span></div><p class="fine">Source checked ${esc(e.checkedOn)}</p></a></article>`;
}
export function filterLineup(items, f) {
  const q = (f.query || '').trim().toLowerCase();
  return items.filter(e =>
    (!q || [e.title, e.sport, e.area, e.venue, e.host].join(' ').toLowerCase().includes(q)) &&
    (!f.sport || f.sport === 'All sports' || e.sport === f.sport) &&
    (!f.area || f.area === 'All Mumbai' || e.area === f.area) &&
    (!f.type || f.type === 'All formats' || e.type === f.type) &&
    (!f.source || f.source === 'All listings' || (f.source === 'External listings' ? e.external : !e.external)) &&
    (!f.level || f.level === 'Any level' || e.level === f.level) &&
    (f.solo !== '1' || (!e.external && e.solo)) &&
    (f.availability !== 'Deadline not passed' || (!e.external || !['closed', 'started', 'ended', 'withdrawn'].includes((e.availability || listingStatus(e)).code)))
  ).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}
export function renderExplore({ main, events, listings, gameCard }) {
  const items = [...events, ...listings.map(e => ({ ...e, external: true }))];
  const filters = [
    ['sport', ['All sports', ...new Set(items.map(e=>e.sport).sort())]],
    ['area', ['All Mumbai', ...new Set(items.map(e => e.area).sort())]],
    ['type', ['All formats', 'Tournament', 'League', 'Training camp', 'Social play']],
    ['source', ['All listings', 'External listings', 'Book on Mercury']],
    ['level', ['Any level', ...new Set(items.map(e => e.level).sort())]],
    ['availability', ['All upcoming', 'Deadline not passed']]
  ];
  main.innerHTML = `<div class="page-width"><section class="page-intro"><p class="eyebrow blue">THE COURT IS CALLING</p><h1>Find your kind of <em>game.</em></h1><p>Real tournaments, leagues and sessions around Mumbai. Find the details, then make your next move.</p></section><div class="directory-note"><span class="tiny-star">↗</span><p><b>Discover here. Register with the organizer.</b><br>External listings link to the source. Mercury is not affiliated with these organizers. Availability, payment and refunds are handled on their websites.</p></div><form class="filter-bar directory-filters" id="directory-filters"><label class="search-field"><span class="sr-only">Search listings</span><input type="search" name="query" placeholder="A game, club or neighbourhood"></label>${filters.map(([key, values]) => `<label><span class="sr-only">${key}</span><select name="${key}">${values.map(v => `<option>${esc(v)}</option>`).join('')}</select></label>`).join('')}<button type="button" class="text-link" id="clear-filters">Clear filters</button></form><div class="results-heading"><p id="directory-count" role="status"></p><span class="fine">Soonest first · dates in IST</span></div><div class="event-grid" id="directory-results"></div><p class="fine section-space">Prices use each organizer’s entry unit. A source check confirms published details, not live availability. Past events leave this feed automatically.</p></div>`;
  const form = main.querySelector('#directory-filters'), params = new URLSearchParams(location.search);
  for (const [key, value] of params) {
    const input = form.elements.namedItem(key);
    if (input && (input.tagName !== 'SELECT' || [...input.options].some(o => o.value === value))) input.value = value;
  }
  let solo = params.get('solo') === '1';
  const update = () => {
    const f = Object.fromEntries(new FormData(form));
    if (solo) f.solo = '1';
    const result = filterLineup(items, f);
    main.querySelector('#directory-count').textContent = `${result.length} ${result.length === 1 ? 'listing' : 'listings'}${solo ? ' · solo-friendly Mercury sessions' : ' · Mumbai'}`;
    main.querySelector('#directory-results').innerHTML = result.length ? result.map(e => e.external ? listingCard(e) : gameCard(e)).join('') : '<div class="empty"><span>✳</span><h2>No matches just yet.</h2><p>Clear a filter to see more games, or check back as the calendar grows.</p></div>';
    history.replaceState(null, '', '/explore?' + new URLSearchParams(f));
  };
  form.oninput = update;
  form.onsubmit = event => event.preventDefault();
  main.querySelector('#clear-filters').onclick = () => { form.reset(); solo = false; update(); };
  update();
}

export async function renderListing(id, { main, api, session, go, toast, openSheet }) {
  const { listing: e } = await api('listings/' + id);
  const status = e.availability;
  document.title = e.title + ' — Mercury';
  main.innerHTML = `<div class="page-width"><a class="back" href="/explore">← All listings</a><div class="listing-masthead ${e.sport.toLowerCase().replace(/[^a-z0-9]+/g, '-')}"><p class="eyebrow">${esc(e.sport)} / ${esc(e.type)}</p><span aria-hidden="true">↗</span><p>${esc(listingDate(e))}<br>${esc(e.area)}, Mumbai</p></div><div class="detail-layout"><article><div class="tags"><span class="blue-tag">External listing</span><span>${esc(e.type)}</span></div><h1 class="detail-title">${esc(e.title)}</h1><p class="host-by">Listed organizer: ${esc(e.host)}</p><div class="event-facts"><div><span>◷</span><p><b>${esc(listingDate(e))}</b><small>${esc(e.timeNote)}</small></p></div><div><span>⌖</span><p><b>${esc(e.area)}, Mumbai</b><small>${esc(e.venue)}</small></p></div><div><span>◎</span><p><b>Who can enter</b><small>${esc(e.eligibility)}</small></p></div><div><span>↗</span><p><b>Entry deadline</b><small>${esc(e.deadlineLabel)}</small></p></div></div><h2>On the calendar.</h2><p class="body-copy">${esc(e.description)}</p><div class="directory-note"><p><b>Registration happens outside Mercury.</b><br>${esc(e.registrationNote)} Mercury has not onboarded this organizer and does not issue passes or collect payment for this event.</p></div><h3>Before you enter</h3><p class="body-copy">Confirm your category, reporting time, final fee and cancellation policy with the organizer. Saving a listing does not reserve a place. For junior categories, a parent or guardian should check the organizer’s requirements.</p><details open><summary>Source & freshness</summary><p>${external(e.sourceUrl, esc(e.sourceName))}</p><p>Source checked on <time datetime="${e.checkedOn}">${e.checkedOn}</time>. Details can change after a check. We do not have a live connection to the organizer’s registration system.</p></details><button class="text-link" id="report-listing">Suggest a correction ↗</button></article><aside class="booking-panel"><p class="eyebrow blue">YOUR NEXT MOVE</p><div class="price listing-price">${esc(e.priceLabel)}</div><p class="muted">${esc(e.priceNote)}</p><p class="listing-status ${status.code}" role="status">${esc(status.label)}</p>${status.code === 'withdrawn' ? '<p class="inline-notice">This listing is no longer recommended for entry. '+esc(status.reason || 'The details are under review.')+'</p>' : external(e.registrationUrl, ['closed', 'ended', 'started'].includes(status.code) ? 'View organizer details' : 'Check entry on organizer site', 'class="button primary" data-outbound="' + e.id + '"')}<button class="button outline" id="save-listing" aria-pressed="${!!session.savedListings?.includes(id)}">${session.savedListings?.includes(id) ? '♥ Saved' : '♡ Save for later'}</button><button class="button outline" id="share-listing">Share listing ↗</button><p class="fine">Opens an external website in a new tab. Entry is confirmed only by the organizer.</p></aside></div></div>`;
  const outbound = main.querySelector('[data-outbound]');
  if(outbound) outbound.onclick = () => {
    // Do not delay or gate the real link on analytics success.
    fetch('/api/listings/' + id + '/click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', keepalive: true }).catch(() => {});
  };
  const save = main.querySelector('#save-listing');
  save.onclick = async () => {
    if (!session.user || !session.consentAccepted) { go('/account'); return; }
    save.disabled = true;
    try {
      const saved = save.getAttribute('aria-pressed') !== 'true';
      await api('listings/' + id + '/save', { saved });
      save.setAttribute('aria-pressed', String(saved)); save.textContent = saved ? '♥ Saved' : '♡ Save for later';
      toast(saved ? 'Saved in My games. No place has been reserved.' : 'Removed from saved listings.');
    } catch (error) { toast(error.message); }
    finally { save.disabled = false; }
  };
  main.querySelector('#share-listing').onclick = () => openSheet('Bring your people.', `<label class="share-label">Listing link<input readonly value="${esc(location.origin + '/listing/' + id)}" onclick="this.select()"></label><p class="fine">Anyone opening this link needs access while Mercury is in private preview.</p>`);
  main.querySelector('#report-listing').onclick = () => {
    if (!session.user || !session.consentAccepted) { go('/account'); return; }
    const sheet = openSheet('Help keep the details right.', '<form id="listing-correction"><label>What needs updating?<textarea name="reason" minlength="10" maxlength="500" rows="4" required placeholder="Tell us what changed and include a source link if possible."></textarea></label><p class="error" role="alert"></p><button class="button primary" type="submit">Send correction</button><p class="fine">This goes to Mercury for review. It does not contact the organizer.</p></form>');
    const form = sheet.querySelector('form');
    form.onsubmit = async event => {
      event.preventDefault(); const button = form.querySelector('button'); button.disabled = true;
      try { await api('listings/' + id + '/report', Object.fromEntries(new FormData(form))); sheet.close(); toast('Correction saved for Mercury to review. Thank you.'); }
      catch (error) { form.querySelector('[role=alert]').textContent = error.message; button.disabled = false; }
    };
  };
}
