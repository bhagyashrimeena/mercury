import { dateLabel, timeLabel } from './data.js';
import { sportPhoto } from './sport-media.js';
import { venueMapUrl } from './game-day.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const link = (label, href, kind = 'primary') => `<a class="button ${kind}" href="${esc(href)}">${label} &#8599;</a>`;

export function eventState(event, now = Date.now()) {
  if (event.status === 'cancelled') return { code: 'cancelled', label: 'Cancelled by the organizer. Existing bookings are updated in My games.', canBook: false };
  if (Number(event.startsAt) <= now) return { code: 'past', label: 'This game has started. Entry is closed.', canBook: false };
  if (Number(event.spots) <= 0) return { code: 'full', label: 'This game is full.', canBook: false };
  return { code: 'published', label: `${event.spots} of ${event.capacity} places left`, canBook: event.status === 'published' };
}

export function eventDetailMarkup(event, { saved = false, preview = false, policy = '', coverPreview = '' } = {}) {
  const state = preview ? { code: 'draft', label: 'Private draft preview; not published', canBook: false } : eventState(event);
  const media = preview && coverPreview.startsWith('blob:')
    ? {src:coverPreview,source:'organizer',alt:'Your event cover preview'} : sportPhoto(event);
  const fee = Number(event.price) ? `&#8377;${Number(event.price).toLocaleString('en-IN')} <span>/ player</span>` : 'Free <span>/ player</span>';
  const bookingAction = preview
    ? '<button class="button outline" type="button" disabled>Booking unavailable in preview</button>'
    : state.canBook ? link('Register now', '/register/' + event.id)
    : link('Explore other games', '/explore', 'outline');
  const included = (Array.isArray(event.included) ? event.included : String(event.included || '').split('\n')).filter(item => String(item ?? '').trim());
  const organizerName = String(event.host || 'Event organizer').trim() || 'Event organizer';
  const organizerContact = String(event.hostContact || '').trim();
  const organizerPhone = String(event.hostPhone || '').trim();
  const phoneLink = /^\+?[\d\s().-]{6,25}$/.test(organizerPhone) ? organizerPhone.replace(/[^\d+]/g, '') : '';
  return `${preview ? '<div class="inline-notice"><b>Private preview.</b> These details are not saved or published. Booking controls are disabled.</div>' : ''}
    <a class="back" href="${preview ? '/host' : '/explore'}">&#8592; ${preview ? 'Back to editor' : 'All games'}</a>
    <div class="detail-cover event-photo-cover"><img class="sport-stock-img" src="${esc(media.src)}" alt="${esc(media.alt)}" width="1000" height="500" decoding="async"><span>${media.source === 'stock' ? 'ILLUSTRATIVE SPORT PHOTO · NOT THIS EVENT' : 'ORGANIZER-SUPPLIED PHOTO'}</span></div>
    <div class="detail-layout"><article>
      <div class="tags"><span class="blue-tag">${esc(event.sport)}</span><span>${esc(event.type)}</span><span class="state state-${state.code}">${esc(state.code)}</span></div>
      <h1 class="detail-title">${esc(event.title)}</h1><p class="host-by">Hosted by ${esc(event.host)}</p>
      <div class="event-facts">
        <div><span aria-hidden="true">&#9677;</span><p><b>${dateLabel(event)}</b><small>${timeLabel(event)} IST &middot; ${esc(event.duration)} minutes</small></p></div>
        <div><span aria-hidden="true">&#8962;</span><p><b>${esc(event.area)}, Mumbai</b><small>${esc(event.venue)}</small>${preview ? '' : `<a class="text-link venue-map-link" href="${esc(venueMapUrl(event))}" target="_blank" rel="noopener noreferrer" aria-label="Open venue in Google Maps (new tab)">Open venue map ↗</a>`}</p></div>
        <div><span aria-hidden="true">&#8599;</span><p><b>${esc(event.type)}</b><small>${esc(event.capacity)} players</small></p></div>
      </div>
      ${event.description?.trim() ? `<h2>A good game, a good time.</h2><p class="body-copy preserve-lines">${esc(event.description)}</p>` : ''}
      ${included.length ? `<h3>What's included</h3><ul class="included">${included.map(item => `<li>&#10003; ${esc(item)}</li>`).join('')}</ul>` : ''}
      ${event.bring?.trim() ? `<h3>What to bring</h3><p class="body-copy">${esc(event.bring)}</p>` : ''}
      <div class="solo-note"><span aria-hidden="true">&#10033;</span><p>Come as you are. Respect other players, share court time fairly and tell your host if you need a break.</p></div>
      ${event.cancellation?.trim() ? `<details open><summary>Cancellation</summary>${policy && policy !== event.cancellation ? `<p>${esc(policy)}</p>` : ''}<p>${esc(event.cancellation)}</p></details>` : ''}
      <p class="fine">${media.source === 'stock' ? 'The photo is illustrative. ' : ''}Confirm the address above with your organizer.</p>
      <section class="event-organizer" aria-label="Organizer">
        <div class="event-organizer-heading"><svg class="event-organizer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg><h3>${esc(organizerName)}</h3></div>
        ${organizerContact || phoneLink ? `<div class="event-organizer-contact"><span>Contact organizer</span><div class="event-organizer-links">${organizerContact ? `<a href="mailto:${esc(organizerContact)}">${esc(organizerContact)} ↗</a>` : ''}${phoneLink ? `<a href="tel:${esc(phoneLink)}">${esc(organizerPhone)}</a>` : ''}</div></div>` : ''}
      </section>
    </article><aside class="booking-panel">
      <p class="eyebrow blue">MAKE IT A PLAN</p><div class="price">${fee}</div>
      <p class="muted">${Number(event.price) ? 'Pay organizer directly / approval required' : 'No payment required'}</p>
      <div class="booking-summary"><span>${dateLabel(event)}</span><b>${timeLabel(event)} IST</b><span>Entry</span><b>1 player</b></div>
      <p class="spots">${esc(state.label)}</p>${bookingAction}
      ${preview ? '' : `<button class="button outline" id="live-save" ${saved === undefined ? '' : `aria-pressed="${!!saved}"`}>${saved ? '&#9829; Saved' : '&#9825; Save for later'}</button><button class="button outline" id="live-share">Share game &#8599;</button><p class="fine">A confirmed registration appears in My games.</p>`}
    </aside></div>`;
}
