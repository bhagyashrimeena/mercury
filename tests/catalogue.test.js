import test from 'node:test';
import assert from 'node:assert/strict';
import { listings, findListing, listingStatus, currentListings } from '../public/catalogue.js';
import { filterLineup } from '../public/discovery.js';
const at = s => Date.parse(s);
test('catalogue has unique identities, dated primary provenance and HTTPS-only destinations', () => {
  assert.equal(new Set(listings.map(e => e.id)).size, listings.length);
  for (const e of listings) {
    assert.match(e.id, /^[a-z0-9-]+$/); assert.ok(e.date <= e.endDate); assert.ok(e.checkedOn <= e.date);
    for (const key of ['sourceUrl', 'registrationUrl']) { const u = new URL(e[key]); assert.equal(u.protocol, 'https:'); assert.equal(u.username + u.password, ''); }
    for (const key of ['venue', 'host', 'eligibility', 'priceNote', 'deadlineLabel', 'registrationNote']) assert.ok(e[key].length > 5);
  }
});
test('deadline timestamp closes exactly at cutoff; date-only deadlines do not invent a time', () => {
  const state = findListing('bombay-gymkhana-state-2026');
  assert.equal(listingStatus(state, at('2026-11-02T12:29:59Z')).code, 'check');
  assert.equal(listingStatus(state, at('2026-11-02T12:30:00Z')).code, 'closed');
  const cup = findListing('mumbai-pickleball-cup-s3');
  assert.equal(listingStatus(cup, at('2026-11-27T18:29:59Z')).code, 'deadline');
  assert.equal(listingStatus(cup, at('2026-11-27T18:30:00Z')).code, 'closed');
});
test('sources go stale, ended listings leave discovery but remain addressable for saved bookmarks', () => {
  const e = findListing('basch-pickleball-2026');
  assert.equal(listingStatus(e, at('2026-11-07T18:29:59Z')).code, 'check');
  assert.equal(listingStatus(e, at('2026-11-07T18:30:00Z')).code, 'stale');
  assert.equal(listingStatus(e, at('2026-11-29T18:29:59Z')).code, 'started');
  assert.equal(listingStatus(e, at('2026-11-29T18:30:00Z')).code, 'ended');
  assert.ok(!currentListings(at('2026-11-30')).some(x => x.id === e.id));
  assert.ok(findListing(e.id));
});
test('combined discovery respects sport, source, city area, format and free-entry distinction', () => {
  const native = { id: 'native', title: 'Community rally', sport: 'Tennis', type: 'Social play', area: 'Powai', date: '2026-11-03', level: 'Beginner friendly', solo: true };
  const all = [native, ...listings.map(e => ({ ...e, external: true, availability: listingStatus(e, at('2026-11-01')) }))];
  assert.equal(filterLineup(all, { source: 'Book on Mercury' }).length, 1);
  assert.deepEqual(filterLineup(all, { level: 'All levels' }).map(e => e.id), ['mumbai-pickleball-cup-s3']);
  assert.ok(filterLineup(all, { sport: 'Badminton' }).every(e => e.sport === 'Badminton'));
  assert.equal(filterLineup(all, { type: 'Training camp', area: 'Andheri' })[0].id, 'barcelona-mumbai-camp-2026');
  assert.equal(filterLineup(all, { query: 'COOPERAGE' })[0].id, 'mslta-masters-mt400-2026');
  assert.deepEqual(filterLineup(all, { solo: '1' }).map(e => e.id), ['native']);
  assert.equal(filterLineup(all, { query: 'not-a-real-event' }).length, 0);
});
