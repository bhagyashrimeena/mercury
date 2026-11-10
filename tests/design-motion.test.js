import test from 'node:test';
import assert from 'node:assert/strict';
import { listingHero } from '../public/discovery.js';
import { findListing } from '../public/catalogue.js';

test('external listings show a photo-led, accessible, factual event hero', () => {
  const listing = findListing('rotary-queen-city-half-marathon-2026');
  assert.ok(listing, 'Rotary Queen City listing is present');
  const markup = listingHero(listing);
  assert.match(markup, /<section class="listing-stage /);
  assert.match(markup, /aria-labelledby="listing-stage-title"/);
  assert.match(markup, /<h1 id="listing-stage-title">Rotary Queen City Half Marathon 2026<\/h1>/);
  assert.match(markup, /20 Dec 2026/);
  assert.match(markup, /BKC, Mumbai/);
  assert.match(markup, /Illustrative photo — not this event/);
  assert.match(markup, /href="#registration-panel"/);
  assert.match(markup, /<svg class="listing-stage-track"/);
  assert.doesNotMatch(markup, /data-outbound/);
  assert.doesNotMatch(markup, /Registration open|Last few places/i);
});

test('event hero escapes organizer-controlled text and never invents images', () => {
  const listing = {
    ...findListing('rotary-queen-city-half-marathon-2026'),
    id: 'escape-test',
    title: '<img src=x onerror=alert(1)>',
    area: '<script>unsafe</script>'
  };
  const markup = listingHero(listing);
  assert.doesNotMatch(markup, /<script>|onerror=/);
  assert.match(markup, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(markup, /&lt;script&gt;unsafe&lt;\/script&gt;/);
  assert.match(markup, /Illustrative photo — not this event/);
  assert.equal((markup.match(/<h1\b/g) || []).length, 1);
});

test('flyer and registration trust are not conflated with decorative motion', () => {
  const markup = listingHero(findListing('rotary-queen-city-half-marathon-2026'));
  assert.match(markup, /aria-hidden="true"/);
  assert.match(markup, /Photo|photo/);
  assert.doesNotMatch(markup, /verified registration|Confirmed participants|Book on Mercury/i);
});
