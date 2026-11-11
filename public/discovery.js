import { listingDate, listingStatus } from './catalogue.js';
import { sportPhoto, shortPrice } from './sport-media.js';
import { trackMetric } from './metrics.js';
import { listingFlowMarkup } from './kinetic-art.js';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const external = (url, text, attributes = '') => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" ${attributes}>${text} ↗</a>`;
const cardStatus = code => ({
  closed: 'Entry deadline passed',
  stale: 'Details need rechecking',
  deadline: 'Deadline today · verify time',
  withdrawn: 'Listing withdrawn',
  started: 'Event started'
})[code] || '';

export function listingCard(e) {
  const status = e.availability || listingStatus(e);
  const media = sportPhoto(e);
  const sportClass = String(e.sport || 'sport').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const href = '/listing/' + esc(e.id);
  const warning = cardStatus(status.code);
  const pricing = shortPrice(e);
  const note = String(e.priceNote || '');
  const feeHint = /^€/.test(e.priceLabel) ? 'Organizer charges INR at its own rate'
    : /\bstudent\b/i.test(note) && /from\s*₹150/i.test(pricing) ? 'Student entry'
    : '';
  return '<article class="event-card directory-card photo-card ' + sportClass + '">' +
    '<a class="photo-card-link" href="' + href + '" aria-label="View ' + esc(e.title) + ' event details">' +
    '<div class="listing-photo ' + sportClass + '" aria-hidden="true">' +
    '<div class="photo-fallback">' + esc(e.sport) + '</div>' +
    '<img class="sport-stock-img" src="' + esc(media.src) + '" alt="" loading="lazy" decoding="async" width="560" height="440">' +
    (media.source === 'stock' ? '<span class="photo-disclosure">Illustrative photo</span>' :
      '<span class="photo-disclosure">Organizer image</span>') +
    '</div>' +
    '<div class="photo-card-copy">' +
    '<div class="photo-card-top"><span class="photo-sport">' + esc(e.sport) + ' <span aria-hidden="true">·</span> ' + esc(e.type) + '</span>' +
    (warning ? '<span class="photo-status ' + esc(status.code) + '">' + esc(warning) + '</span>' : '') +
    '</div>' +
    '<h3>' + esc(e.title) + '</h3>' +
    '<div class="photo-card-facts"><span class="photo-date">' + esc(listingDate(e)) + '</span>' +
    '<span class="photo-area">' + esc(e.area) + '</span></div>' +
    '<div class="photo-card-foot"><div class="photo-price"><strong>' + esc(pricing) + '</strong>' +
    (feeHint ? '<small>' + esc(feeHint) + '</small>' : '') + '</div>' +
    '<span class="photo-cta">View event <span aria-hidden="true">↗</span></span></div>' +
    '</div></a></article>';
}

// Shared between the live route and the first server-rendered paint. An event's
// official media is shown only when approved; stock is clearly identified.
export function listingHero(e) {
  const media = sportPhoto(e);
  const category = String(e.sport || 'sport').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return '<section class="listing-stage listing-stage--' + category + '" aria-labelledby="listing-stage-title">' +
    '<div class="listing-stage-backdrop" aria-hidden="true"><img class="sport-stock-img" src="' + esc(media.src) +
    '" alt="" width="1280" height="610" decoding="async" fetchpriority="high"></div>' +
    '<div class="listing-stage-shade" aria-hidden="true"></div>' +
    '<svg class="listing-stage-swoosh" viewBox="0 0 1000 370" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    '<path d="M-80 322 C 150 85 330 405 550 166 S 845 14 1080 128" stroke="#D9FF38" stroke-width="16" stroke-linecap="round" fill="none"/>' +
    '<path d="M-80 341 C 150 104 330 424 550 185 S 845 33 1080 147" stroke="#FFFFFF" stroke-opacity=".74" stroke-width="2" stroke-dasharray="11 17" fill="none"/>' +
    '</svg>' +
    '<div class="listing-stage-copy">' +
    '<p class="listing-stage-label">' + esc(e.sport) + ' <span aria-hidden="true">·</span> ' + esc(e.type) + '</p>' +
    '<h1 id="listing-stage-title">' + esc(e.title) + '</h1>' +
    '<div class="listing-stage-facts"><span>◷ ' + esc(listingDate(e)) + '</span><span>⌖ ' + esc(e.area) + ', Mumbai</span></div>' +
    '<a class="listing-stage-action" href="#registration-panel">View entry details <span aria-hidden="true">↘</span></a>' +
    '</div>' +
    '<p class="listing-stage-disclosure">' +
    (media.source === 'stock'
      ? 'Illustrative photo · Not this event · <a href="' + esc(media.page) + '" target="_blank" rel="noopener noreferrer">' + esc(media.credit) + '</a>'
      : 'Organizer-supplied photograph') +
    '</p></section>';
}

export async function renderListing(id, { main, api, session, go, toast, openSheet }) {
  const { listing: e } = await api('listings/' + id);
  trackMetric('external_detail_view');
  const status = e.availability;
  const statusText = status.code === 'check' ? 'Entry availability is not live' : status.label;
  const categoryMarkup = Array.isArray(e.categories) && e.categories.length
    ? '<section class="listing-categories" aria-labelledby="listing-categories-heading"><h2 id="listing-categories-heading">Choose your category</h2><div class="listing-category-grid">' +
      e.categories.map(item => '<article class="listing-category"><b>' + esc(item.name) + '</b><strong>' + esc(item.fee) + '</strong><small>' + esc(item.notes) + '</small></article>').join('') + '</div></section>' : '';
  const highlightMarkup = Array.isArray(e.highlights) && e.highlights.length
    ? '<section class="listing-highlights" aria-labelledby="listing-highlights-heading"><h2 id="listing-highlights-heading">Why take part?</h2><ul>' +
      e.highlights.map(item => '<li>' + esc(item) + '</li>').join('') + '</ul></section>' : '';
  document.title = e.title + ' — Mercury';
  const stage = listingHero(e);
  main.innerHTML = `<div class="page-width listing-page"><a class="back" href="/explore">← All listings</a>${stage}${listingFlowMarkup()}<div class="detail-layout"><article><div class="tags"><span class="blue-tag">External listing</span><span>${esc(e.type)}</span></div><p class="host-by">Listed organizer: ${esc(e.host)}</p><div class="event-facts"><div><span>◷</span><p><b>${esc(listingDate(e))}</b><small>${esc(e.timeNote)} · Times in IST where published</small></p></div><div><span>⌖</span><p><b>${esc(e.area)}, Mumbai</b><small>${esc(e.venue)}</small></p></div><div><span>◎</span><p><b>Who can enter</b><small>${esc(e.eligibility)}</small></p></div><div><span>↗</span><p><b>Entry deadline</b><small>${esc(e.deadlineLabel)}</small></p></div></div><p class="listing-status ${esc(status.code)}" role="status">${esc(statusText)}</p>${categoryMarkup}${highlightMarkup}<h2>About this event</h2><p class="body-copy">${esc(e.description)}</p><div class="directory-note"><p><b>Registration happens outside Mercury.</b><br>${esc(e.registrationNote)} Mercury has not onboarded this organizer and does not issue passes or collect payment for this event.</p></div><h3>Before you enter</h3><p class="body-copy">Confirm your category, reporting time, final fee and cancellation policy with the organizer. Saving a listing does not reserve a place. For junior categories, a parent or guardian should check the organizer’s requirements.</p><details open><summary>Source & freshness</summary><p>${external(e.sourceUrl, esc(e.sourceName))}</p><p>Source checked on <time datetime="${e.checkedOn}">${e.checkedOn}</time>. Details can change after a check. We do not have a live connection to the organizer’s registration system.</p></details><button class="text-link" id="report-listing">Suggest a correction ↗</button><div class="listing-claim"><p>Organizing this event?</p><button class="text-link" id="claim-this-listing" type="button">Request to claim or update this listing ↗</button><small>Ownership is verified manually before any change.</small></div></article><aside class="booking-panel" id="registration-panel"><p class="eyebrow blue">YOUR NEXT MOVE</p><div class="price listing-price">${esc(e.priceLabel)}</div><p class="muted">${esc(e.priceNote)}</p><p class="fine">Source checked <time datetime="${esc(e.checkedOn)}">${esc(e.checkedOn)}</time>. Registration status can change.</p><p class="listing-status ${status.code}" role="status">${esc(statusText)}</p>${status.code === 'withdrawn' ? '<p class="inline-notice">This listing is no longer recommended for entry. '+esc(status.reason || 'The details are under review.')+'</p>' : external(e.registrationUrl, ['closed', 'ended', 'started', 'stale'].includes(status.code) ? 'View organizer details' : 'Continue to ' + esc(e.sourceName) + ' to register', 'class="button primary" data-outbound="' + e.id + '"')}<button class="button outline" id="save-listing" aria-pressed="${!!session.savedListings?.includes(id)}">${session.savedListings?.includes(id) ? '♥ Saved' : '♡ Save for later'}</button><button class="button outline" id="share-listing">Share listing ↗</button><p class="fine">Opens ${esc(e.sourceName)} in a new tab. Entry is confirmed only by the organizer.</p></aside></div></div>`;
  const statusMessage = main.querySelector('.detail-layout article > .listing-status');
  const facts = main.querySelector('.detail-layout .event-facts');
  facts.before(statusMessage);
  if (status.code === 'stale' && status.reason) {
    statusMessage.insertAdjacentHTML('afterend', '<p class="inline-notice" role="status">' + esc(status.reason) + '</p>');
  }
  if (status.code !== 'withdrawn') {
    const destination = e.sourceName.length > 22 ? new URL(e.registrationUrl).hostname.replace(/^www\./, '') : e.sourceName;
    const label = ['closed', 'ended', 'started', 'stale'].includes(status.code) ? 'Review organizer page' : 'Register on ' + esc(destination);
    main.insertAdjacentHTML('beforeend', `<div class="mobile-event-cta"><div><b>${esc(e.priceLabel)}</b><small>${esc(status.label)} · ${esc(e.sourceName)}</small></div>${external(e.registrationUrl, label, 'class="button primary" data-outbound="' + esc(e.id) + '" aria-label="Open ' + esc(e.sourceName) + ' to check entry (new tab)"')}</div>`);
  }
  const organizerClaim = main.querySelector('#claim-this-listing');
  if (organizerClaim) organizerClaim.addEventListener('click', () => {
    go('/list-event?claim=' + encodeURIComponent(id));
  });
  const save = main.querySelector('#save-listing');
  save.onclick = async () => {
    if (!session.user || !session.consentAccepted) { go('/account?return_to=' + encodeURIComponent(location.pathname + location.search)); return; }
    save.disabled = true;
    try {
      const saved = save.getAttribute('aria-pressed') !== 'true';
      await api('listings/' + id + '/save', { saved });
      save.setAttribute('aria-pressed', String(saved)); save.textContent = saved ? '♥ Saved' : '♡ Save for later';
      toast(saved ? 'Saved in My games. No place has been reserved.' : 'Removed from saved listings.');
    } catch (error) { toast(error.message); }
    finally { save.disabled = false; }
  };
  main.querySelector('#share-listing').onclick = () => openSheet('Bring your people.', `<label class="share-label">Listing link<input readonly value="${esc(location.origin + '/listing/' + id)}" onclick="this.select()"></label><p class="fine">During the private pilot, only approved accounts can open this link.</p>`);
  main.querySelector('#report-listing').onclick = () => {
    if (!session.user || !session.consentAccepted) { go('/support?category=Listing%20correction&listing=' + encodeURIComponent(id)); return; }
    const sheet = openSheet('Help keep the details right.', '<form id="listing-correction"><label>What needs updating?<textarea name="reason" minlength="10" maxlength="500" rows="4" required placeholder="Tell us what changed and include a source link if possible."></textarea></label><p class="error" role="alert"></p><button class="button primary" type="submit">Send correction</button><p class="fine">This goes to Mercury for review. It does not contact the organizer.</p></form>');
    const form = sheet.querySelector('form');
    form.onsubmit = async event => {
      event.preventDefault(); const button = form.querySelector('button'); button.disabled = true;
      try { await api('listings/' + id + '/report', Object.fromEntries(new FormData(form))); sheet.close(); toast('Correction saved for Mercury to review. Thank you.'); }
      catch (error) { form.querySelector('[role=alert]').textContent = error.message; button.disabled = false; }
    };
  };
}
