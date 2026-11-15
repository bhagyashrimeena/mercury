import test from 'node:test';
import assert from 'node:assert/strict';
import { eventDetailMarkup, eventState } from '../public/event-detail.js';

const event = {
  id: 'review-game', title: 'Community rally', sport: 'Badminton', type: 'Social play',
  area: 'Powai', venue: 'Sample court', date: '2026-11-12', time: '18:00',
  startsAt: Date.parse('2026-11-12T18:00:00+05:30'), duration: 90,
  capacity: 12, spots: 3, price: 0, status: 'published', level: 'All levels',
  host: 'Review host', description: 'A friendly badminton evening.',
  included: ['Court time'], bring: 'Indoor shoes', cancellation: 'Before the start.',
  image: 'badminton.jpg',
};

test('native detail offers registration for open free and paid events', () => {
  const now = Date.parse('2026-11-05T12:00:00+05:30');
  assert.equal(eventState(event, now).canBook, true);
  assert.equal(eventState({ ...event, spots: 0 }, now).code, 'full');
  assert.equal(eventState({ ...event, status: 'cancelled' }, now).code, 'cancelled');
  assert.equal(eventState({ ...event, price: 500 }, now).canBook, true);
  assert.equal(eventState(event, event.startsAt).code, 'past');
});

test('organizer preview uses public layout while keeping booking disabled and data escaped', () => {
  const preview = eventDetailMarkup({ ...event, title: '<Private> game', price: 500 }, { preview: true });
  assert.match(preview, /class="detail-layout"/);
  assert.match(preview, /&lt;Private&gt; game/);
  assert.match(preview, /Booking unavailable in preview/);
  assert.doesNotMatch(preview, /href="\/register\//);
  assert.doesNotMatch(preview, /id="live-save"/);
});

test('missing instructions render no empty sections or blanket age restriction', () => {
  for (const empty of [null, undefined, '', '  ']) {
    const html = eventDetailMarkup({ ...event, description: empty, included: empty,
      bring: empty, cancellation: empty }, { preview: true, policy: 'Platform rules' });
    assert.doesNotMatch(html, /A good game, a good time|What's included|What to bring|<summary>Cancellation|18\+|18 or older|>null</);
  }
});
