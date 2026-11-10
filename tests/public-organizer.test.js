import test from 'node:test';
import assert from 'node:assert/strict';
import {
  organizerLandingMarkup, eventSubmissionMarkup, howItWorksMarkup,
  validEventUrl, buildOrganizerMessage
} from '../public/organizer-public.js';
import { findListing, listingStatus } from '../public/catalogue.js';

test('organizers see the benefit and submission link without a sign-in gate', () => {
  const html = organizerLandingMarkup();
  assert.match(html, /We help people find it/);
  assert.match(html, /href="\/list-event"/);
  assert.match(html, /Keep your checkout/);
  assert.match(html, /not confirmed third-party sign-ups/);
  assert.doesNotMatch(html, /Verified organizers|840 event views|126 registrations/);
});

test('event submission is clear about manual review and respects privacy', () => {
  const html = eventSubmissionMarkup();
  assert.match(html, /id="public-event-submission"/);
  assert.match(html, /name="registrationUrl"/);
  assert.match(html, /name="flyerUrl"/);
  assert.match(html, /name="consent" required/);
  assert.match(html, /not published/i);
  assert.match(html, /File uploads aren't enabled/);
  assert.doesNotMatch(html, /Publish now|Upload completed/);
});

test('How it Works is fully readable HTML even when JavaScript is unavailable', () => {
  const html = howItWorksMarkup();
  assert.match(html, /Find your kind of event/);
  assert.match(html, /Check the details/);
  assert.match(html, /who confirms entry/i);
  assert.match(html, /href="\/for-organizers"/);
  assert.doesNotMatch(html, /Loading your page/);
});

test('submission links require HTTPS and are never treated as verified automatically', () => {
  assert.equal(validEventUrl('https://example.org/events/race'), true);
  assert.equal(validEventUrl('http://example.org'), false);
  assert.equal(validEventUrl('javascript:alert(1)'), false);
  assert.equal(validEventUrl('https://user:password@example.org'), false);
  assert.equal(validEventUrl('https://localhost'), false);
  assert.equal(validEventUrl('not a link'), false);
  const message = buildOrganizerMessage({
    registrationUrl:'https://example.org/race',
    title:'Sunday City Run', sport:'Running', date:'2026-12-20',
    venue:'BKC, Mumbai', fee:'From ₹700',
    claim:'rotary-queen-city-half-marathon-2026',
    flyerUrl:'https://example.org/race.jpg',
    notes:'Adults and families welcome'
  });
  assert.match(message, /manual review required/);
  assert.match(message, /Existing Mercury listing claim:/);
  assert.match(message, /Ownership is NOT verified/);
  assert.match(message, /Public flyer URL; rights to verify/);
  assert.ok(message.length <= 2000);
});

test('Rotary listing uses source-linked categories and an externally owned registration destination', () => {
  const listing = findListing('rotary-queen-city-half-marathon-2026');
  assert.equal(listing.categories.length, 4);
  assert.deepEqual(listing.categories.map(c => c.fee), ['₹700','₹900','₹1,100','₹1,300']);
  assert.match(listing.categories[1].notes, /12\+/);
  assert.match(listing.highlights.join(' '), /medical support/);
  assert.match(listing.registrationUrl, /^https:\/\/registrations\.indiarunning\.com\//);
  assert.equal(listingStatus(listing, Date.parse('2026-11-11T05:00:00Z')).code, 'check');
});
