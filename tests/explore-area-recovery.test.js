import test from 'node:test';
import assert from 'node:assert/strict';
import { filterLineup, findAreaOnlyRecovery } from '../public/explore.js';

const now = Date.parse('2026-11-19T06:00:00Z'); // Thursday; weekend is Nov 21–22 IST.
const make = (id, overrides = {}) => ({
  id, title: 'Community Rally Open', sport: 'Badminton', type: 'Tournament',
  area: 'Andheri', date: '2026-11-21', endDate: '2026-11-21',
  venue: 'Reviewed local venue', host: 'Test organizer', level: 'Intermediate',
  priceLabel: '₹900', external: true, availability: { code: 'check' },
  ...overrides
});

test('area-only recovery leaves sport, weekend, keyword, price, level, format, route and status untouched', () => {
  const filters = {
    query: 'Rally', sport: 'Badminton', when: 'This weekend', area: 'Powai',
    type: 'Tournament', source: 'External listings', level: 'Intermediate',
    availability: 'Entry possible', fee: 'Under ₹1,000', sort: 'Soonest first',
    from: '', to: ''
  };
  const original = structuredClone(filters);
  const items = [
    make('andheri'),
    make('borivali', { area: 'Borivali' }),
    make('wrong-date', { date: '2026-11-28', endDate: '2026-11-28' }),
    make('wrong-sport', { sport: 'Tennis' }),
    make('wrong-level', { level: 'Advanced' }),
    make('wrong-format', { type: 'League' }),
    make('wrong-price', { priceLabel: '₹1,500' }),
    make('unknown-price', { priceLabel: 'Fee to confirm' }),
    make('wrong-keyword', { title: 'Open Championship' }),
    make('closed', { availability: { code: 'closed' } }),
    make('stale', { availability: { code: 'stale' } }),
    make('native', {
      external: false, price: 0, status: 'published',
      startsAt: Date.parse('2026-11-21T06:00:00Z'), spots: 2
    }),
    make('powai-other-sport', { area: 'Powai', sport: 'Tennis' })
  ];
  assert.equal(filterLineup(items, filters, now).length, 0);
  assert.deepEqual(findAreaOnlyRecovery(items, filters, now).map(e => e.id), ['andheri', 'borivali']);
  assert.deepEqual(filters, original, 'helper must not mutate the athlete filters');
});

test('same explicit date range is preserved and unverified upcoming entries remain labelled, not opened', () => {
  const filters = {
    query: 'Rally', sport: 'Badminton', area: 'Powai',
    when: 'Any date', from: '2026-11-22', to: '2026-11-22',
    availability: 'All upcoming', sort: 'Soonest first'
  };
  const items = [
    make('in-range', { date: '2026-11-22', endDate: '2026-11-22' }),
    make('stale', { date: '2026-11-22', endDate: '2026-11-22', availability: { code: 'stale' } }),
    make('closed', { date: '2026-11-22', endDate: '2026-11-22', availability: { code: 'closed' } }),
    make('withdrawn', { date: '2026-11-22', endDate: '2026-11-22', availability: { code: 'withdrawn' } }),
    make('other-day', { date: '2026-11-21' })
  ];
  const widened = findAreaOnlyRecovery(items, filters, now);
  assert.deepEqual(widened.map(e => e.id), ['in-range', 'stale', 'closed']);
  assert.equal(widened.find(e => e.id === 'stale').availability.code, 'stale');
  assert.equal(widened.find(e => e.id === 'closed').availability.code, 'closed');
  assert.equal(findAreaOnlyRecovery(items, { ...filters, availability: 'Entry possible' }, now).length, 1);
});

test('text area search is not silently deleted just to produce a suggestion', () => {
  const filters = { query: 'Powai', sport: 'Badminton', area: 'Powai', availability: 'All upcoming' };
  assert.deepEqual(findAreaOnlyRecovery([make('andheri')], filters, now), []);
});

test('already broad and unspecified areas do not produce redundant area recovery actions', () => {
  const items = [make('andheri')];
  assert.deepEqual(findAreaOnlyRecovery(items, { area: 'All Mumbai', sport: 'Badminton' }, now), []);
  assert.deepEqual(findAreaOnlyRecovery(items, { sport: 'Badminton' }, now), []);
});

test('source-state filters remain strict rather than showing stale or closed entries as bookable', () => {
  const items = [
    make('check'),
    make('stale', { availability: { code: 'stale' } }),
    make('closed', { availability: { code: 'closed' } }),
  ];
  const base = { sport: 'Badminton', area: 'Powai', availability: 'Entry possible' };
  assert.deepEqual(findAreaOnlyRecovery(items, base, now).map(e => e.id), ['check']);
  assert.deepEqual(findAreaOnlyRecovery(items, { ...base, availability: 'Needs source check' }, now).map(e => e.id), ['stale']);
  assert.deepEqual(findAreaOnlyRecovery(items, { ...base, availability: 'Closed or full' }, now).map(e => e.id), ['closed']);
});
