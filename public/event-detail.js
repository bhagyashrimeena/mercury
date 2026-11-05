import { dateLabel, timeLabel } from './data.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const link = (label, href, kind = 'primary') => `<a class="button ${kind}" href="${esc(href)}">${label} &#8599;</a>`;

export function eventState(event, now = Date.now()) {
  if (event.status === 'cancelled') return { code: 'cancelled', label: 'Cancelled by the organizer. Existing bookings are updated in My games.', canBook: false };
  if (Number(event.startsAt) <= now) return { code: 'past', label: 'This game has started. Entry is closed.', canBook: false };
  if (Number(event.spots) <= 0) return { code: 'full', label: 'This game is full.', canBook: false };
  return { code: 'published', label: `${event.spots} of ${event.capacity} free places left`, canBook: event.status === 'published' && Number(event.price) === 0 };
}

export function eventDetailMarkup(event, { saved = false, preview = false, policy = '' } = {}) {
  const state = preview ? { code: 'draft', label: 'Private draft preview; not published', canBook: false } : eventState(event);
  const fee = Number(event.price) ? `&#8377;${Number(event.price).toLocaleString('en-IN')} <span>/ player</span>` : 'Free <span>/ player</span>';
  const bookingAction = preview
    ? '<button class="button outline" type="button" disabled>Booking unavailable in preview</button>'
    : state.canBook ? link('Book free place on Mercury', '/register/' + event.id)
    : link('Explore other games', '/explore', 'outline');
  const included = Array.isArray(event.included) ? event.included : String(event.included || '').split('\n').filter(Boolean);
  return `${preview ? '<div class="inline-notice"><b>Private preview.</b> These details are not saved or published. Booking controls are disabled.</div>' : ''}
    <a class="back" href="${preview ? '/host' : '/explore'}">&#8592; ${preview ? 'Back to editor' : 'All games'}</a>
    <div class="detail-cover"><img src="/assets/mercury-motion.svg" alt="" aria-hidden="true"><span>ILLUSTRATIVE SPORT ARTWORK</span></div>
    <div class="detail-layout"><article>
      <div class="tags"><span class="blue-tag">${esc(event.sport)}</span><span>${esc(event.type)}</span><span class="state state-${state.code}">${esc(state.code)}</span></div>
      <h1 class="detail-title">${esc(event.title)}</h1><p class="host-by">Hosted by ${esc(event.host)}</p>
      <div class="event-facts">
        <div><span aria-hidden="true">&#9677;</span><p><b>${dateLabel(event)}</b><small>${timeLabel(event)} IST &middot; ${esc(event.duration)} minutes</small></p></div>
        <div><span aria-hidden="true">&#8962;</span><p><b>${esc(event.area)}, Mumbai</b><small>${esc(event.venue)}</small></p></div>
        <div><span aria-hidden="true">&#9678;</span><p><b>${esc(event.level)}</b><small>Adults 18+ &middot; Individual entry</small></p></div>
        <div><span aria-hidden="true">&#8599;</span><p><b>${esc(event.type)}</b><small>${esc(event.capacity)} players</small></p></div>
      </div>
      <h2>A good game, a good time.</h2><p class="body-copy preserve-lines">${esc(event.description)}</p>
      <h3>What's included</h3><ul class="included">${included.map(item => `<li>&#10003; ${esc(item)}</li>`).join('')}</ul>
      <h3>What to bring</h3><p class="body-copy">${esc(event.bring)}</p>
      <div class="solo-note"><span aria-hidden="true">&#10033;</span><p>Come as you are. Respect other players, share court time fairly and tell your host if you need a break.</p></div>
      <details open><summary>Cancellation</summary><p>${esc(policy)}</p><p>${esc(event.cancellation)}</p></details>
      <details><summary>Your host</summary><p>${esc(event.hostBio || 'Your organizer will welcome you at the session.')}</p>${event.hostContact ? `<a class="text-link" href="mailto:${esc(event.hostContact)}">${esc(event.hostContact)}</a>` : '<p>No public contact email added yet.</p>'}</details>
      <p class="fine">The artwork is illustrative. Confirm the address above with your host.</p>
    </article><aside class="booking-panel">
      <p class="eyebrow blue">MAKE IT A PLAN</p><div class="price">${fee}</div>
      <p class="muted">${Number(event.price) ? 'Paid booking on Mercury is unavailable' : 'No payment required'}</p>
      <div class="booking-summary"><span>${dateLabel(event)}</span><b>${timeLabel(event)} IST</b><span>Entry</span><b>1 player &middot; 18+</b></div>
      <p class="spots">${esc(state.label)}</p>${bookingAction}
      ${preview ? '' : `<button class="button outline" id="live-save">${saved ? '&#9829; Saved' : '&#9825; Save for later'}</button><button class="button outline" id="live-share">Share game &#8599;</button><p class="fine">A confirmed registration appears in My games.</p>`}
    </aside></div>`;
}
