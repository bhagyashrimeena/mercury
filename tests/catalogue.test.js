import test from 'node:test';
import assert from 'node:assert/strict';
import { listings, findListing, listingStatus, currentListings } from '../public/catalogue.js';
import { filterLineup, rankForDiscovery } from '../public/explore.js';
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
  const e = { ...findListing('basch-pickleball-2026'), checkedOn: '2026-11-01' };
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

test('discovery defaults can select actionable weekend entries and separate closed or full games', () => {
  const now = at('2026-11-05T06:00:00Z');
  const base = { title: 'Rally', sport: 'Tennis', type: 'Social play', area: 'Powai', venue: 'Test court', host: 'Host', level: 'All levels' };
  const items = [
    { ...base, id: 'open', date: '2026-11-07', startsAt: at('2026-11-07T04:00:00Z'), spots: 2, status: 'published', external: false },
    { ...base, id: 'full', date: '2026-11-08', startsAt: at('2026-11-08T04:00:00Z'), spots: 0, status: 'published', external: false },
    { ...base, id: 'closed', date: '2026-11-08', external: true, availability: { code: 'closed' } },
    { ...base, id: 'external', date: '2026-11-08', external: true, availability: { code: 'check' } },
    { ...base, id: 'stale', date: '2026-11-08', external: true, availability: { code: 'stale' } },
    { ...base, id: 'later', date: '2026-11-12', external: true, availability: { code: 'check' } },
    { ...base, id: 'withdrawn', date: '2026-11-09', external: true, availability: { code: 'withdrawn' } },
    { ...base, id: 'ended', date: '2026-11-01', endDate: '2026-11-01', external: true, availability: { code: 'ended' } },
  ];
  assert.deepEqual(filterLineup(items, { availability: 'Entry possible', when: 'This weekend' }, now).map(e => e.id), ['open', 'external']);
  assert.deepEqual(filterLineup(items, { availability: 'All upcoming' }, now).map(e => e.id), ['open', 'full', 'closed', 'external', 'stale', 'later']);
  assert.deepEqual(filterLineup(items, { availability: 'Closed or full' }, now).map(e => e.id), ['full', 'closed']);
  assert.deepEqual(filterLineup(items, { availability: 'Needs source check' }, now).map(e => e.id), ['stale']);
  assert.deepEqual(filterLineup(items, { availability: 'Entry possible', when: 'Next 7 days' }, now).map(e => e.id), ['open', 'external']);
});

import { validateCatalogue } from '../server/catalogue-validation.js';
test('import rejects invented dates, duplicate IDs, unsafe links and missing fee units',()=>{
  const reviewDay = listings.reduce((latest, e) => e.checkedOn > latest ? e.checkedOn : latest, '0000-01-01');
  assert.equal(validateCatalogue(listings,reviewDay).valid,true);
  const base=structuredClone(listings[0]);
  for(const patch of [{date:'2026-02-30'},{checkedOn:'9999-01-01'},{deadline:'2026-11-03T18:00:00'},{deadline:'2026-02-30T18:00:00+05:30'},{deadline:'2026-11-03T24:00:00+05:30'},{registrationUrl:'javascript:alert(1)'},{sourceUrl:'https://user:secret@example.com/'},{registrationUrl:'https://127.0.0.1/'},{priceNote:''}]) assert.equal(validateCatalogue([{...base,...patch}],reviewDay).valid,false,JSON.stringify(patch));
  assert.equal(validateCatalogue([base,base],reviewDay).valid,false);
  assert.equal(validateCatalogue([{...base,sport:'Cricket'}],reviewDay).valid,true);
});

test('upcoming Browse remains populated after source freshness expires without implying an open entry', () => {
  const now = at('2026-11-17T05:00:00Z');
  const base = {
    title: 'Community tournament', sport: 'Tennis', type: 'Tournament',
    area: 'Powai', venue: 'Practice court', host: 'Local organizer',
    date: '2026-12-10', endDate: '2026-12-10', checkedOn: '2026-11-09', deadline: null
  };
  const stale = { ...base, id: 'stale', external: true };
  const closed = { ...base, id: 'closed', external: true, availability: { code: 'closed', label: 'Entry closed' } };
  const native = {
    ...base, id: 'free', external: false, type: 'Social play', status: 'published',
    startsAt: at('2026-12-10T05:00:00Z'), spots: 3
  };
  const items = [closed, stale, native];
  assert.equal(listingStatus(stale, now).code, 'stale');
  const upcoming = filterLineup(items, { availability: 'All upcoming' }, now);
  assert.deepEqual(upcoming.map(event => event.id), ['closed', 'stale', 'free']);
  assert.deepEqual(rankForDiscovery(upcoming, { availability: 'All upcoming' }, now).map(event => event.id),
    ['free', 'stale', 'closed']);
  assert.deepEqual(filterLineup(items, { availability: 'Entry possible' }, now).map(event => event.id),
    ['free']);
  assert.deepEqual(filterLineup(items, { availability: 'Needs source check' }, now).map(event => event.id),
    ['stale']);
});
test('source freshness never creates fake confirmed availability for external organizer listings', () => {
  const e = { ...findListing('mumbai-pickleball-cup-s3'), availability: { code: 'stale', label: 'Recheck details with organizer' } };
  const status = e.availability;
  assert.equal(status.code, 'stale');
  // Stale entries can be explored, but direct external handoff is held until the user sees the event detail page.
  assert.equal(['closed', 'started', 'ended', 'withdrawn', 'stale'].includes(status.code), true);
});
