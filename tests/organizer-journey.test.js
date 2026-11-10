import test from 'node:test';
import assert from 'node:assert/strict';
import {
  organizerRecoveryKey, readOrganizerRecovery, writeOrganizerRecovery,
  clearOrganizerRecovery, filterRosterEntries
} from '../public/organizer-journey.js';
import { validateDraft } from '../public/domain.js';

const store = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: key => { values.delete(key); }
  };
};

test('organizer drafts recover in the same tab and never persist unexpected fields', () => {
  const memory = store(), key = organizerRecoveryKey('test-event');
  const revision = 3;
  const now = Date.parse('2026-11-10T07:00:00Z');
  assert.equal(writeOrganizerRecovery(memory, key, revision, {
    title: 'Sunday Doubles',
    date: '2026-11-22',
    venue: 'Court, Mumbai',
    password: 'must-not-store',
    email: 'private@example.test',
    price: '0'
  }, now), true);
  assert.deepEqual(readOrganizerRecovery(memory, key, revision, now + 1000), {
    title: 'Sunday Doubles', date: '2026-11-22', venue: 'Court, Mumbai', price: '0'
  });
  assert.equal(readOrganizerRecovery(memory, key, revision + 1, now + 1000), null);
  assert.equal(readOrganizerRecovery(memory, key, revision, now + 4 * 24 * 60 * 60 * 1000), null);
  clearOrganizerRecovery(memory, key);
  assert.equal(readOrganizerRecovery(memory, key, revision, now + 1000), null);
});

test('organizer recovery handles blocked browser storage and malformed data safely', () => {
  const throwing = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); }, removeItem() { throw Error('blocked'); } };
  assert.equal(readOrganizerRecovery(throwing, organizerRecoveryKey('x')), null);
  assert.equal(writeOrganizerRecovery(throwing, organizerRecoveryKey('x'), null, { title: 'A' }), false);
  assert.doesNotThrow(() => clearOrganizerRecovery(throwing, organizerRecoveryKey('x')));
  const memory = store();
  memory.setItem('bad', 'not json');
  assert.equal(readOrganizerRecovery(memory, 'bad'), null);
});

test('roster search finds name, pass reference and level without querying an API', () => {
  const entries = [
    { id: 'pass-ONE', player_name: 'Aisha Shah', status: 'confirmed', level: 'Beginner' },
    { id: 'pass-TWO', player_name: 'Kabir Mehta', status: 'checked_in', level: 'Intermediate' },
    { id: 'pass-THREE', player_name: 'Rhea Sharma', status: 'confirmed', level: 'Advanced' }
  ];
  assert.equal(filterRosterEntries(entries).length, 3);
  assert.deepEqual(filterRosterEntries(entries, 'aisha').map(e => e.id), ['pass-ONE']);
  assert.deepEqual(filterRosterEntries(entries, 'PASS-two').map(e => e.id), ['pass-TWO']);
  assert.deepEqual(filterRosterEntries(entries, 'advanced', true).map(e => e.id), ['pass-THREE']);
  assert.deepEqual(filterRosterEntries(entries, '', true).map(e => e.id), ['pass-ONE','pass-THREE']);
  assert.equal(filterRosterEntries(entries, 'not-found').length, 0);
});

test('hosted games can use supported MMR areas and more useful player levels without relaxing event checks', () => {
  const base = {
    title: 'Saturday Social Badminton', sport: 'Badminton', format: 'Social play',
    area: 'BKC', date: '2026-12-05', time: '18:00',
    venue: 'Verified community court, Bandra Kurla Complex, Mumbai',
    level: 'Advanced', capacity: '12', price: '0',
    description: 'Organized doubles games for local adult players.',
    included: 'Hosted session and court coordination', bring: 'Racket and shoes',
    cancellation: 'Cancel before the event starts at no cost.'
  };
  const now = new Date('2026-11-10T06:00:00Z');
  assert.equal(validateDraft(base, now).valid, true);
  assert.equal(validateDraft({ ...base, area: 'Nerul, Navi Mumbai', level: 'Competitive' }, now).valid, true);
  assert.ok(validateDraft({ ...base, area: 'Not a verified area' }, now).errors.area);
  assert.ok(validateDraft({ ...base, date: '2026-11-01' }, now).errors.date);
  assert.ok(validateDraft({ ...base, description: '' }, now).errors.description);
});
