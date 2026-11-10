import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingCalendar, bookingPassMarkup, passState, venueMapUrl } from '../public/game-day.js';

const now = Date.parse('2026-11-08T10:00:00Z');
const booking = {
  id: 'private-pass-reference-123', event_id: 'community-rally', title: 'Community rally',
  sport: 'Badminton', area: 'Powai', venue: 'Sample court, 1 Test Road',
  date: '2026-11-12', time: '18:00', starts_at: Date.parse('2026-11-12T18:00:00+05:30'),
  duration: 90, status: 'confirmed', event_status: 'published',
  player_name: 'Private Player', level: 'Beginner',
};

test('game-day controls follow registration, event and start states', () => {
  assert.equal(passState(booking, now).canPlan, true);
  assert.equal(passState(booking, now).canCancel, true);
  assert.equal(passState({ ...booking, status: 'checked_in' }, now).canCancel, false);
  for (const changed of [
    { status: 'cancelled' }, { status: 'event_cancelled' }, { event_status: 'cancelled' },
    { status: 'unknown' }, { starts_at: NaN }, { starts_at: now },
  ]) {
    const state = passState({ ...booking, ...changed }, now);
    assert.equal(state.canPlan, false);
    assert.equal(state.canCancel, false);
    const markup = bookingPassMarkup({ ...booking, ...changed }, { now });
    assert.doesNotMatch(markup, /id="download-game-calendar"|id="cancel-pass"/);
  }
  assert.match(bookingPassMarkup({ ...booking, status: 'event_cancelled' }, { now }), /remove it there too/);
  assert.equal(passState(booking, booking.starts_at).canNavigate, true);
  assert.equal(passState(booking, booking.starts_at + 90 * 60000).canNavigate, false);
  assert.equal(!!passState({ ...booking, event_status: 'cancelled' }, booking.starts_at).canNavigate, false);
  assert.match(bookingPassMarkup({ ...booking, status: 'checked_in' }, { now }), /Your host has recorded your arrival/);
});

test('pass renders useful event facts and escapes untrusted display values', () => {
  const markup = bookingPassMarkup({ ...booking, title: '<img src=x onerror=alert(1)>', player_name: '<Private>', id: '" onfocus="alert(1)' }, { now });
  assert.match(markup, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(markup, /&lt;Private&gt;/);
  assert.doesNotMatch(markup, /<img src=x|value="" onfocus=/);
  assert.match(markup, /role="status" aria-live="polite"/);
  assert.match(markup, /label for="pass-reference"/);
  assert.match(markup, /6:00 pm IST|6:00 PM IST/);
});

test('venue navigation searches the supplied address without inventing coordinates', () => {
  const url = new URL(venueMapUrl({ venue: 'Court & Club #2', area: 'Powai' }));
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.searchParams.get('query'), 'Court & Club #2, Powai, Mumbai');
  assert.equal(url.searchParams.get('api'), '1');
});

test('calendar uses UTC for the IST start, actual duration and no private pass data', () => {
  const calendar = bookingCalendar({ ...booking, duration: 120 }, 'https://www.playonmercury.com/ignored', now);
  assert.match(calendar, /DTSTART:20261112T123000Z\r\n/);
  assert.match(calendar, /DTEND:20261112T143000Z\r\n/);
  assert.match(calendar, /URL:https:\/\/www\.playonmercury\.com\/event\/community-rally/);
  assert.doesNotMatch(calendar, /private-pass-reference|Private Player|\/booking\//);
  assert.match(calendar.replace(/\r\n /g, ''), /does not update automatically/);
  assert.equal(calendar.endsWith('END:VCALENDAR\r\n'), true);
});

test('calendar escapes field injection and folds Unicode without breaking characters', () => {
  const title = 'मुंबई '.repeat(30) + ', doubles; finals\\\nEND:VEVENT\nBEGIN:VEVENT';
  const calendar = bookingCalendar({ ...booking, title }, 'https://www.playonmercury.com', now);
  const encoder = new TextEncoder();
  for (const line of calendar.split('\r\n')) assert.ok(encoder.encode(line).length <= 75);
  assert.equal(calendar.split('\r\n').filter(line => line === 'BEGIN:VEVENT').length, 1);
  assert.equal(calendar.split('\r\n').filter(line => line === 'END:VEVENT').length, 1);
  assert.match(calendar.replace(/\r\n /g, ''), /\\, doubles\\; finals\\\\\\nEND:VEVENT\\nBEGIN:VEVENT/);
  assert.doesNotMatch(calendar, /\ufffd/);
});

test('calendar refuses closed registrations, unsafe origins and invalid duration', () => {
  for (const changed of [{ status: 'cancelled' }, { event_status: 'cancelled' }, { starts_at: now }, { duration: 0 }, { duration: NaN }])
    assert.throws(() => bookingCalendar({ ...booking, ...changed }, 'https://www.playonmercury.com', now));
  for (const origin of ['javascript:alert(1)', 'https://name:password@example.test'])
    assert.throws(() => bookingCalendar(booking, origin, now));
});

test('pass actions copy references, recover from clipboard denial and download a private-data-free calendar', async () => {
  const { bindPassActions } = await import('../public/game-day.js');
  const original = Object.fromEntries(['document', 'navigator', 'location', 'setTimeout'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const oldCreate = URL.createObjectURL, oldRevoke = URL.revokeObjectURL;
  const reference = { focused: false, selected: false, focus() { this.focused = true; }, select() { this.selected = true; } };
  const status = { textContent: '' }, copy = {}, download = {};
  const nodes = { '#pass-action-status': status, '#pass-reference': reference, '#copy-pass-reference': copy, '#download-game-calendar': download };
  const links = [], blobs = [], timers = [];
  let copied, failCopy = false;
  try {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { async writeText(value) { if (failCopy) throw Error('Clipboard unavailable'); copied = value; } } } });
    Object.defineProperty(globalThis, 'location', { configurable: true, value: { origin: 'https://www.playonmercury.com' } });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { body: { append(link) { links.push(link); } }, createElement() { return { click() { this.clicked = true; }, remove() { this.removed = true; } }; } } });
    Object.defineProperty(globalThis, 'setTimeout', { configurable: true, value(callback) { timers.push(callback); } });
    URL.createObjectURL = blob => { blobs.push(blob); return 'blob:test-calendar'; };
    URL.revokeObjectURL = () => {};
    const future = { ...booking, starts_at: Date.now() + 86400000 };
    bindPassActions({ querySelector: selector => nodes[selector] }, future);
    await copy.onclick();
    assert.equal(copied, booking.id);
    assert.equal(status.textContent, 'Pass reference copied.');
    failCopy = true;
    await copy.onclick();
    assert.equal(reference.focused, true);
    assert.equal(reference.selected, true);
    assert.match(status.textContent, /Reference selected/);
    download.onclick();
    download.onclick();
    assert.equal(links.length, 2);
    assert.ok(links.every(link => link.clicked && link.removed && link.download === 'mercury-game.ics'));
    assert.doesNotMatch(await blobs[0].text(), /private-pass-reference|Private Player/);
    assert.match(status.textContent, /Open the downloaded file/);
    // A pass left open until after the start must not export a stale calendar.
    future.starts_at = 1;
    download.onclick();
    assert.equal(links.length, 2);
    assert.match(status.textContent, /upcoming active registrations only/);
    timers.forEach(callback => callback());
  } finally {
    for (const [name, descriptor] of Object.entries(original)) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
    URL.createObjectURL = oldCreate; URL.revokeObjectURL = oldRevoke;
  }
});
