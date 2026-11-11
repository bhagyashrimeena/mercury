import test from 'node:test';
import assert from 'node:assert/strict';
import { sportPhoto, shortPrice } from '../public/sport-media.js';
import { listingCard } from '../public/discovery.js';
import { filterLineup, sortForDiscovery } from '../public/explore.js';
import { listings, listingStatus } from '../public/catalogue.js';

test('illustrative stock photos are sourced from real licensed Pexels sport pages', () => {
  const sports = ['Tennis','Badminton','Pickleball','Running','Chess','Padel','Football','Fitness'];
  for (const sport of sports) {
    const photo = sportPhoto({ id: 'sample-' + sport, title: 'Demo', sport });
    assert.equal(photo.source, 'stock');
    assert.match(photo.src, /^https:\/\/images\.pexels\.com\/photos\/\d+\/pexels-photo-\d+\.jpeg\?/);
    assert.match(photo.page, /^https:\/\/www\.pexels\.com\/photo\//);
    assert.match(photo.alt, /Illustrative stock photo/);
    assert.match(photo.credit, /Pexels/);
  }
});

test('unreviewed external image links cannot replace branded stock placeholders', () => {
  const e = { id: 'tournament', title: 'Demo', sport: 'Running',
    approvedCover: { url: 'https://untrusted.example/portrait.jpg', reviewed: true } };
  assert.equal(sportPhoto(e).source, 'stock');
  assert.equal(sportPhoto({ ...e, approvedCover: { url: 'javascript:alert(1)', reviewed: true } }).source,'stock');
  assert.equal(sportPhoto({ ...e, approvedCover: { url: 'https://preview.example/1.jpg', reviewed: false } }).source,'stock');
  const approved = sportPhoto({ ...e, approvedCover: {
    url: 'https://demo.supabase.co/storage/v1/object/public/event-media/1.jpg',
    reviewed: true
  } });
  assert.equal(approved.source,'organizer');
  assert.match(approved.alt,/Photo provided for Demo/);
});

test('range prices are condensed without inventing currencies or ignoring category-specific fees', () => {
  assert.equal(shortPrice({priceLabel:'₹2,750–2,760.50'}), 'From ₹2,750');
  assert.equal(shortPrice({priceLabel:'€790'}), '€790');
  assert.equal(shortPrice({priceLabel:'From ₹150'}), 'From ₹150');
  assert.equal(shortPrice({priceLabel:'See organizer'}), 'See organizer');
});

test('each listing uses one event-details action, not an unconfirmed direct registration', () => {
  const item = { ...listings.find(e => e.id === 'nirmal-bang-malad-walkathon-2026'),
    external:true, availability: { code:'check', label:'Check availability' } };
  const html = listingCard(item);
  assert.match(html, /photo-card/);
  assert.match(html, /View event/);
  assert.match(html, /Illustrative photo/);
  assert.doesNotMatch(html, /Register with organizer/);
  assert.doesNotMatch(html, /Check availability/);
  assert.doesNotMatch(html, /data-outbound=/);
  assert.match(html, /Student entry/);
  assert.match(html, /\/listing\/nirmal-bang-malad-walkathon-2026/);
});

test('This weekend, Free, INR fee ceilings and chronology work without inventing availability', () => {
  const now = Date.parse('2026-11-10T06:00:00Z');
  const items = listings.map(e => ({ ...e, external:true, availability:listingStatus(e,now) }));
  const thisWeekend = filterLineup(items, {availability:'All upcoming', when:'This weekend'},now);
  assert.ok(thisWeekend.length >= 1);
  assert.ok(thisWeekend.every(e => e.date <= '2026-11-15' && (e.endDate || e.date) >= '2026-11-14'));
  const affordable = filterLineup(items, {availability:'All upcoming', fee:'Under ₹1,000'},now);
  assert.ok(affordable.some(e => e.id === 'nirmal-bang-malad-walkathon-2026'));
  assert.ok(affordable.every(e => !e.priceLabel.startsWith('€')));
  const free = filterLineup(items,{availability:'All upcoming',fee:'Free'},now);
  assert.ok(free.length >= 4);
  assert.ok(free.every(e => e.external && e.priceLabel === 'Free'));
  assert.ok(free.some(e => e.id === 'football-uhtend-andheri-2026'));
  const byDate = sortForDiscovery(items,'Soonest first');
  assert.ok(byDate.every((e,i)=>i===0 || byDate[i-1].date <= e.date));
  const byPrice = sortForDiscovery(items,'Price: low to high');
  assert.equal(byPrice.at(-1).priceLabel,'See organizer');
});
