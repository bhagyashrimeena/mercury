import { listingDate, listingStatus } from './catalogue.js';
import { trackMetric } from './metrics.js';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const external = (url, text, attributes = '') => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" ${attributes}>${text} ↗</a>`;
export function listingCard(e) {
  const status = e.availability || listingStatus(e);
  const sportClass = e.sport.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const canEnter = !['closed', 'started', 'ended', 'withdrawn', 'stale'].includes(status.code);
  return `<article class="event-card directory-card"><a class="listing-art ${sportClass}" href="/listing/${esc(e.id)}" aria-label="View ${esc(e.title)} details"><span>${esc(e.sport)} · ${esc(e.type)}</span><span class="listing-art-symbol" aria-hidden="true">${e.sport === 'Badminton' ? '◈' : e.sport === 'Tennis' ? '◉' : '◎'}</span><b>${esc(listingDate(e))}</b><small>EDITORIAL ARTWORK · MUMBAI</small></a><div class="card-content"><a class="card-main" href="/listing/${esc(e.id)}"><p class="event-time">${esc(e.sport)} · ${esc(e.type)}</p><p class="card-date">${esc(listingDate(e))} · IST</p><h3>${esc(e.title)}</h3><p class="muted">⌖ ${esc(e.area)}</p><p class="card-eligibility">${esc(e.eligibility)}</p></a><div class="card-price"><b>${esc(e.priceLabel)}</b><small>${esc(e.priceNote)}</small></div><p class="listing-status ${esc(status.code)}">${esc(status.label)}</p><p class="card-route">Registration with organizer · ${esc(e.sourceName)}</p>${canEnter ? external(e.registrationUrl, 'Register with organizer', `class="card-outbound" data-outbound="${esc(e.id)}" aria-label="Register with organizer on ${esc(e.sourceName)} (opens new tab)"`) : '<a class="card-outbound" href="/listing/' + esc(e.id) + '">View entry details ↗</a>'}<p class="fine">Source checked <time datetime="${esc(e.checkedOn)}">${esc(e.checkedOn)}</time> · Status may change</p></div></article>`;
}
export async function renderListing(id, { main, api, session, go, toast, openSheet }) {
  const { listing: e } = await api('listings/' + id);
  trackMetric('external_detail_view');
  const status = e.availability;
  document.title = e.title + ' — Mercury';
  main.innerHTML = `<div class="page-width"><a class="back" href="/explore">← All listings</a><div class="listing-masthead ${e.sport.toLowerCase().replace(/[^a-z0-9]+/g, '-')}"><p class="eyebrow">${esc(e.sport)} / ${esc(e.type)}</p><span aria-hidden="true">↗</span><p>${esc(listingDate(e))}<br>${esc(e.area)}, Mumbai</p></div><div class="detail-layout"><article><div class="tags"><span class="blue-tag">External listing</span><span>${esc(e.type)}</span></div><h1 class="detail-title">${esc(e.title)}</h1><p class="host-by">Listed organizer: ${esc(e.host)}</p><div class="event-facts"><div><span>◷</span><p><b>${esc(listingDate(e))}</b><small>${esc(e.timeNote)} · Times in IST where published</small></p></div><div><span>⌖</span><p><b>${esc(e.area)}, Mumbai</b><small>${esc(e.venue)}</small></p></div><div><span>◎</span><p><b>Who can enter</b><small>${esc(e.eligibility)}</small></p></div><div><span>↗</span><p><b>Entry deadline</b><small>${esc(e.deadlineLabel)}</small></p></div></div><p class="listing-status ${esc(status.code)}" role="status">${esc(status.label)}</p><h2>On the calendar.</h2><p class="body-copy">${esc(e.description)}</p><div class="directory-note"><p><b>Registration happens outside Mercury.</b><br>${esc(e.registrationNote)} Mercury has not onboarded this organizer and does not issue passes or collect payment for this event.</p></div><h3>Before you enter</h3><p class="body-copy">Confirm your category, reporting time, final fee and cancellation policy with the organizer. Saving a listing does not reserve a place. For junior categories, a parent or guardian should check the organizer’s requirements.</p><details open><summary>Source & freshness</summary><p>${external(e.sourceUrl, esc(e.sourceName))}</p><p>Source checked on <time datetime="${e.checkedOn}">${e.checkedOn}</time>. Details can change after a check. We do not have a live connection to the organizer’s registration system.</p></details><button class="text-link" id="report-listing">Suggest a correction ↗</button></article><aside class="booking-panel"><p class="eyebrow blue">YOUR NEXT MOVE</p><div class="price listing-price">${esc(e.priceLabel)}</div><p class="muted">${esc(e.priceNote)}</p><p class="fine">Source checked <time datetime="${esc(e.checkedOn)}">${esc(e.checkedOn)}</time>. Registration status can change.</p><p class="listing-status ${status.code}" role="status">${esc(status.label)}</p>${status.code === 'withdrawn' ? '<p class="inline-notice">This listing is no longer recommended for entry. '+esc(status.reason || 'The details are under review.')+'</p>' : external(e.registrationUrl, ['closed', 'ended', 'started', 'stale'].includes(status.code) ? 'View organizer details' : 'Continue to ' + esc(e.sourceName) + ' to register', 'class="button primary" data-outbound="' + e.id + '"')}<button class="button outline" id="save-listing" aria-pressed="${!!session.savedListings?.includes(id)}">${session.savedListings?.includes(id) ? '♥ Saved' : '♡ Save for later'}</button><button class="button outline" id="share-listing">Share listing ↗</button><p class="fine">Opens ${esc(e.sourceName)} in a new tab. Entry is confirmed only by the organizer.</p></aside></div></div>`;
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
