import { dateLabel, timeLabel } from './data.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function venueMapUrl(event) {
  const query = [event.venue, event.area, 'Mumbai'].filter(Boolean).join(', ');
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
}

export function passState(booking, now = Date.now()) {
  if (booking.status === 'cancellation_pending') return {code:'cancellation_pending',label:'Cancellation pending',title:'Cancellation requested.',message:'Your place is released. Contact the organizer to resolve your payment.',active:false,canCancel:false,canPlan:false};
  if (booking.status === 'cancelled') return {code:'cancelled',label:'Cancelled',title:'Registration cancelled.',message:'Your registration stays in My games.',active:false,canCancel:false,canPlan:false};
  if (booking.event_status === 'cancelled' || booking.status === 'event_cancelled')
    return { code: 'event_cancelled', label: 'Cancelled by organizer', title: 'A change of plans.', message: 'This game was cancelled. This pass no longer admits entry.', active: false, canCancel: false, canPlan: false };
  if (booking.status === 'pending') return {code:'pending',label:'Pending organizer review',title:'Awaiting approval.',message:'The organizer is reviewing your entry.',active:false,canCancel:Number(booking.starts_at)>now,canPlan:false};
  if (booking.status === 'rejected') return {code:'rejected',label:'Registration rejected',title:'Your registration was rejected.',message:'Contact the organizer for any refund. Mercury does not process refunds for direct payments.',active:false,canCancel:false,canPlan:false};
  const starts = Number(booking.starts_at);
  const future = Number.isFinite(starts) && starts > now;
  const duration = Number(booking.duration ?? 90);
  const inProgress = Number.isFinite(starts) && Number.isFinite(duration) && starts + duration * 60000 > now;
  if (booking.status === 'checked_in')
    return { code: 'checked_in', label: 'Checked in', title: 'You’re checked in.', message: 'Your host has recorded your arrival. Enjoy your game.', active: true, canCancel: false, canPlan: future, canNavigate: future || inProgress };
  if (booking.status === 'confirmed')
    return { code: 'confirmed', label: future ? 'Place confirmed' : 'Registration record', title: future ? 'You’re in.' : 'Your game has started.', message: future ? 'One place, reserved for you. Show your host the pass below.' : 'Your registration is saved here. New bookings and online cancellation are closed.', active: true, canCancel: future, canPlan: future, canNavigate: future || inProgress };
  return { code: 'unavailable', label: 'Check registration', title: 'Check your registration.', message: 'This pass is not confirmed. Refresh My games or contact support before travelling.', active: false, canCancel: false, canPlan: false };
}

const calendarText = value => String(value ?? '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const calendarTime = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
// RFC 5545 folds content lines at 75 UTF-8 octets, without splitting a character.
function foldLine(line) {
  const encoder = new TextEncoder();
  let output = '', length = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (length + size > 75) { output += '\r\n '; length = 1; }
    output += character;
    length += size;
  }
  return output;
}

export function bookingCalendar(booking, origin, now = Date.now()) {
  if (!passState(booking, now).canPlan) throw Error('Calendar download is available for upcoming active registrations only.');
  const site = new URL(origin);
  if (!['https:', 'http:'].includes(site.protocol) || site.username || site.password) throw Error('Invalid Mercury address.');
  const starts = Number(booking.starts_at);
  const duration = Number(booking.duration ?? 90);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 1440) throw Error('The game duration is unavailable. Check the event details.');
  const eventUrl = site.origin + '/event/' + encodeURIComponent(booking.event_id);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mercury//Game calendar//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', 'UID:' + encodeURIComponent(booking.event_id) + '@mercury-game',
    'DTSTAMP:' + calendarTime(now), 'DTSTART:' + calendarTime(starts),
    'DTEND:' + calendarTime(starts + duration * 60000), 'SUMMARY:' + calendarText(booking.title),
    'LOCATION:' + calendarText([booking.venue, booking.area, 'Mumbai'].filter(Boolean).join(', ')),
    'DESCRIPTION:' + calendarText('Place booked on Mercury. Open My games before travelling to check your pass and any organizer updates. This calendar copy does not update automatically.'),
    'URL:' + eventUrl, 'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR',
  ].map(foldLine).join('\r\n') + '\r\n';
}

export function bookingPassMarkup(booking, { now = Date.now() } = {}) {
  const state = passState(booking, now);
  const eventUrl = '/event/' + encodeURIComponent(booking.event_id);
  const contact = booking.organizer_contact || booking.current_organizer_contact || '';
  const resolution = booking.refund_resolution === 'refunded' ? 'Organizer marked the refund as sent.' : booking.refund_resolution === 'not_collected' ? 'Organizer recorded no payment received.' : '';
  return `<div class="compact-pass-page"><a class="back" href="/my-games">← My games</a>
    <header class="pass-page-heading"><p class="eyebrow blue">YOUR GAME PASS</p><h1>${esc(state.title)}</h1><p>${esc(state.message)}</p></header>
    <article class="pass-ticket" aria-labelledby="pass-game-title">
      <div class="pass-ticket-top"><div class="pass-ticket-status"><span class="state state-${state.code}">${esc(state.label)}</span><span class="pass-fee">${Number(booking.amount) ? '&#8377;' + esc(booking.amount) + ' / ' + (booking.payment_method === 'upi' ? 'UPI' : 'Cash') : 'Free'} · 1 player</span></div><h2 id="pass-game-title">${esc(booking.title)}</h2><p>${esc(booking.sport)} · ${esc(booking.area)}, Mumbai</p></div>
      <div class="pass-ticket-body"><dl class="pass-facts"><div><dt>Date</dt><dd>${dateLabel(booking)}</dd></div><div><dt>Start time</dt><dd>${timeLabel(booking)} IST</dd></div><div class="pass-fact-wide"><dt>Venue</dt><dd>${esc(booking.venue)}</dd></div><div class="pass-fact-wide"><dt>Player</dt><dd>${esc(booking.player_name)}</dd></div></dl>
      <div class="pass-reference-row"><span>Pass reference</span><code>${esc(booking.id)}</code></div>
      ${Number(booking.amount) && contact ? `<div class="pass-organizer-contact"><span>${state.code === 'cancellation_pending' ? 'Refund contact' : 'Organizer'}</span><b>${esc(booking.organizer_name || 'Event organizer')}</b><a href="mailto:${esc(contact)}">${esc(contact)}</a>${resolution ? `<p>${esc(resolution)}</p>` : ''}</div>` : ''}
      ${booking.review_note ? `<p class="pass-review-note">Organizer: ${esc(booking.review_note)}</p>` : ''}
      <div class="pass-main-actions"><a class="button outline" href="${esc(eventUrl)}">View game details ↗</a>${state.canCancel ? '<button class="button danger-outline" id="cancel-pass" type="button">Cancel registration</button>' : ''}</div>
      ${state.canNavigate ? `<div class="pass-utilities">${state.canPlan ? '<button class="text-link" id="download-game-calendar" type="button">Add to calendar ↓</button>' : ''}<a class="text-link" href="${esc(venueMapUrl(booking))}" target="_blank" rel="noopener noreferrer">Venue map ↗</a></div>` : ''}
      <p id="pass-action-status" class="pass-action-status" role="status" aria-live="polite"></p></div>
    </article><a class="text-link pass-browse" href="/explore">Find another game →</a></div>`;
}

export function bindPassActions(main, booking) {
  const status = main.querySelector('#pass-action-status');
  const download = main.querySelector('#download-game-calendar');
  if (download) download.onclick = () => {
    let url;
    try {
      const calendar = bookingCalendar(booking, location.origin);
      url = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'mercury-game.ics';
      document.body.append(link); link.click(); link.remove();
      status.textContent = 'Calendar file ready. Open the downloaded file to add your game. Check My games for changes.';
    } catch (error) { status.textContent = error.message; }
    finally { if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); }
  };
}
