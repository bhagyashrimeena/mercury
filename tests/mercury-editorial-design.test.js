import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaIntroMarkup } from '../public/kinetic-art.js';
import { listingHero } from '../public/discovery.js';
import { findListing } from '../public/catalogue.js';

test('Explore keeps Mercury identity while featuring a genuine illustrative photo', () => {
  const html = arenaIntroMarkup();
  assert.match(html, /FIND YOUR/);
  assert.match(html, /NEXT GAME/);
  assert.match(html, /class="arena-photo"/);
  assert.match(html, /images\.pexels\.com/);
  assert.match(html, /Illustrative sports photo/);
  assert.match(html, /class="arena-wave-svg"/);
  assert.doesNotMatch(html, /AI-generated|sora\.com|data:image\/png/i);
});

test('event hero uses one safe title, a licensed image label and a non-booking action', () => {
  const listing = findListing('rotary-queen-city-half-marathon-2026');
  assert.ok(listing);
  const html = listingHero(listing);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /Rotary Queen City Half Marathon 2026/);
  assert.match(html, /listing-stage-backdrop/);
  assert.match(html, /listing-stage-disclosure/);
  assert.match(html, /Illustrative photo · Not this event/);
  assert.match(html, /href="#registration-panel"/);
  assert.doesNotMatch(html, /Confirmed registration|Last 10 spots|Book now/i);
});

test('event title and location never create untrusted markup', () => {
  const original = findListing('rotary-queen-city-half-marathon-2026');
  const html = listingHero({
    ...original,
    title:'<img src=x onerror="alert(1)">',
    area:'<script>unsafe</script>'
  });
  assert.doesNotMatch(html, /<script>|<img src=x/);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(html, /&lt;script&gt;unsafe&lt;\/script&gt;/);
});
