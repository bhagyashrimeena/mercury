import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { organizerLandingMarkup } from '../public/organizer-public.js';
import { studioWelcomeMarkup, studioEmptyStateMarkup } from '../public/organizer-studio-ui.js';

test('organizer landing presents two distinct real registration paths', () => {
  const html = organizerLandingMarkup();
  assert.match(html, /Where should players/);
  assert.match(html, /register\?/);
  assert.match(html, /href="\/list-event"/);
  assert.match(html, /href="\/host"/);
  assert.match(html, /Use my existing website/);
  assert.match(html, /Register players on Mercury/);
  assert.match(html, /Paid events may be drafted/);
  assert.match(html, /checkout and organizer payouts are not enabled/);
  assert.doesNotMatch(html, /Published instantly|Guaranteed registrations|Razorpay enabled/i);
});

test('new organizer gets useful setup plan and a route to showcase an existing website', () => {
  const html = studioWelcomeMarkup();
  assert.match(html, /Start with a club/);
  assert.match(html, /Set up organizer profile/);
  assert.match(html, /href="#organizer-setup"/);
  assert.match(html, /href="\/list-event"/);
  assert.match(html, /Free bookings only during the pilot/);
  assert.match(html, /Mercury does not collect payments/);
  assert.match(html, /Start here/);
  const empty = studioEmptyStateMarkup();
  assert.match(empty, /href="#organizer-profile"/);
  assert.match(empty, /Your first event starts here/);
});

test('saved profile and events update progress truthfully', () => {
  const org = { name: 'Review Club' };
  const withProfile = studioWelcomeMarkup({ organizer: org, events: [] });
  assert.match(withProfile, /Organizer profile/);
  assert.match(withProfile, /Saved/);
  assert.match(withProfile, /Save a private draft/);
  assert.doesNotMatch(withProfile, /Free game published/);
  const draft = studioWelcomeMarkup({ organizer: org, events: [{ status: 'draft' }] });
  assert.match(draft, /Event created/);
  assert.doesNotMatch(draft, /Free game published/);
  const published = studioWelcomeMarkup({ organizer: org, events: [{ status: 'published' }] });
  assert.match(published, /Free game published/);
  const blank = studioEmptyStateMarkup({ organizer: org });
  assert.match(blank, /href="#event-form"/);
  assert.match(blank, /Your first game is a draft away/);
});

test('existing host forms and booking safeguards remain wired', () => {
  const host = readFileSync(new URL('../public/live.js', import.meta.url), 'utf8');
  assert.match(host, /studioWelcomeMarkup\(\{ organizer: org, events, editing: Boolean\(edit\) \}\)/);
  assert.match(host, /studioEmptyStateMarkup\(\{ organizer: org \}\)/);
  assert.match(host, /id="organizer-profile"/);
  assert.match(host, /id="event-form"/);
  assert.match(host, /formSubmit\('#organizer-profile'/);
  assert.match(host, /formSubmit\('#event-form'/);
  assert.match(host, /mountOrganizerJourney\(eventForm/);
  assert.match(host, /href="\/list-event"/);
  assert.match(host, /requireUser\('organizer'\)/);
  assert.match(host, /Showcase an existing event instead/);
});
