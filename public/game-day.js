import { dateLabel, timeLabel } from './data.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function venueMapUrl(event) {
  const query = [event.venue, event.area, 'Mumbai'].filter(Boolean).join(', ');
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
}

export function passState(booking, now = Date.now()) {
  if (booking.event_status === 'cancelled' || booking.status === 'event_cancelled')
    return { code: 'event_cancelled', label: 'Cancelled by organizer', title: 'A change of plans.', message: 'This game was cancelled. This pass no longer admits entry.', active: false, canCancel: false, canPlan: false };
  if (booking.status === 'cancelled')
    return { code: 'cancelled', label: 'You cancelled', title: 'Your place is cancelled.', message: 'Your place has been released. This is a record of your cancelled registration.', active: false, canCancel: false, canPlan: false };
  const starts = Number(booking.starts_at);
  const future = Number.isFinite(starts) && starts > now;
  const duration = Number(booking.duration ?? 90);
  const inProgress = Number.isFinite(starts) && Number.isFinite(duration) && starts + duration * 60000 > now;
  if (booking.status === 'checked_in')
    return { code: 'checked_in', label: 'Checked in', title: 'You’re checked in.', message: 'Your host has recorded your arrival. Enjoy your game.', active: true, canCancel: false, canPlan: future, canNavigate: future || inProgress };
  if (booking.status === 'confirmed')
    return { code: 'confirmed', label: future ? 'Place confirmed' : 'Registration record', title: future ? 'You’re in.' : 'Your game has started.', message: future ? 'One free place, reserved for you. Show your host the pass below.' : 'Your registration is saved here. New bookings and online cancellation are closed.', active: true, canCancel: future, canPlan: future, canNavigate: future || inProgress };
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
    'DESCRIPTION:' + calendarText('Free place booked on Mercury. Open My games before travelling to check your pass and any organizer updates. This calendar copy does not update automatically.'),
    'URL:' + eventUrl, 'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR',
  ].map(foldLine).join('\r\n') + '\r\n';
}

export function bookingPassMarkup(booking, { now = Date.now() } = {}) {
  const state = passState(booking, now);
  const eventUrl = '/event/' + encodeURIComponent(booking.event_id);
  return `<a class="back" href="/my-games">← My games</a>
    <section class="page-intro pass-intro"><p class="eyebrow blue">YOUR GAME PASS</p><h1>${esc(state.title)}</h1><p>${esc(state.message)}</p></section>
    <div class="pass-layout"><article class="pass-ticket" aria-labelledby="pass-game-title">
      <div class="pass-ticket-top"><span class="state state-${state.code}">${esc(state.label)}</span><span class="pass-fee">FREE · 1 PLAYER</span><h2 id="pass-game-title">${esc(booking.title)}</h2><p>${esc(booking.sport)} · ${esc(booking.area)}, Mumbai</p></div>
      <div class="pass-ticket-body"><dl class="pass-facts"><div><dt>Date</dt><dd>${dateLabel(booking)}</dd></div><div><dt>Start time</dt><dd>${timeLabel(booking)} IST</dd></div><div class="pass-fact-wide"><dt>Venue</dt><dd>${esc(booking.venue)}</dd></div><div><dt>Player</dt><dd>${esc(booking.player_name)}</dd></div><div><dt>Playing level</dt><dd>${esc(booking.level)}</dd></div></dl>
      <div class="pass-reference-box"><label for="pass-reference">Pass reference</label><input id="pass-reference" class="pass-reference" readonly value="${esc(booking.id)}" spellcheck="false"><button class="text-link" id="copy-pass-reference" type="button">Copy reference</button><p class="fine">${state.active ? 'Your host verifies this reference on their private roster.' : 'Kept for your records. Not valid for entry.'}</p></div>
      <div class="action-row"><a class="button outline" href="${esc(eventUrl)}">View game details ↗</a>${!state.active ? '<a class="button primary" href="/explore">Find another game ↗</a>' : ''}</div></div>
    </article><aside class="pass-guide" aria-labelledby="pass-guide-title"><p class="eyebrow blue">${state.canNavigate ? 'BEFORE YOU GO' : 'KEEP IN MIND'}</p><h2 id="pass-guide-title">${state.canNavigate ? 'Ready for game day.' : 'Your next move.'}</h2>
      ${state.canNavigate ? `<div class="pass-planning-actions">${state.canPlan ? '<button class="button primary" id="download-game-calendar" type="button">Add to calendar ↓</button>' : ''}<a class="button outline" href="${esc(venueMapUrl(booking))}" target="_blank" rel="noopener noreferrer" aria-label="Open venue in Google Maps (new tab)">Open venue map ↗</a></div><p class="fine">${state.canPlan ? 'Downloads a calendar file to import. It does not update automatically. ' : ''}The map searches the organizer’s address; confirm the exact court before travelling.</p><ol class="pass-checklist"><li>Save a screenshot of this pass for weak signal at the venue.</li><li>Check the game details for what to bring and arrival instructions.</li><li>Open My games before you leave for the latest updates.</li></ol>` : `<p>${state.active ? 'Keep this pass as your registration record. Check the game page for organizer details.' : 'If you added this game to your calendar, remove it there too. Mercury cannot update your calendar copy.'}</p>`}
      <p class="fine">Event updates appear in My games. Mercury does not send email or SMS alerts.</p>
      ${state.canCancel ? '<div class="pass-cancellation"><h3>Plans changed?</h3><p>Cancel before the start to give another player your place. There is no fee.</p><button class="text-link danger" id="cancel-pass" type="button">Cancel my place</button></div>' : ''}
      <p id="pass-action-status" class="pass-action-status" role="status" aria-live="polite"></p>
    </aside></div>`;
}

export function bindPassActions(main, booking) {
  const status = main.querySelector('#pass-action-status');
  const reference = main.querySelector('#pass-reference');
  main.querySelector('#copy-pass-reference').onclick = async () => {
    try {
      await navigator.clipboard.writeText(booking.id);
      status.textContent = 'Pass reference copied.';
    } catch {
      reference.focus(); reference.select();
      status.textContent = 'Reference selected. Use your device’s Copy action.';
    }
  };
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
