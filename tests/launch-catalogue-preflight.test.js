import test from 'node:test';
import assert from 'node:assert/strict';
import { listings } from '../public/catalogue.js';
import { auditCatalogueReadiness } from '../scripts/launch-catalogue-preflight.mjs';

const now = Date.parse('2026-11-20T08:00:00Z');
const base = listings.find(e => e.id === 'mumbai-pickleball-cup-s3');
const sports = ['Tennis', 'Badminton', 'Pickleball', 'Running', 'Chess'];
function freshCatalogue() {
  return Array.from({ length: 12 }, (_, i) => ({
    ...base,
    id: 'safe-demo-' + i,
    title: 'Example event ' + i,
    sport: sports[i % sports.length],
    area: 'Powai',
    venue: 'Example stadium ' + i + ', Mumbai',
    date: '2026-12-20',
    endDate: '2026-12-20',
    deadline: null,
    deadlineLabel: 'Confirm with organizer',
    checkedOn: '2026-11-20',
    priceLabel: i < 2 ? 'Free' : '₹150',
    priceNote: i < 2 ? 'No entry fee advertised; confirm with organizer.' : 'Per player entry; confirm with organizer.',
  }));
}

test('the preflight reports all gates for a sufficient synthetic multi-sport inventory', () => {
  const result = auditCatalogueReadiness({ records: freshCatalogue(), now });
  assert.equal(result.passed, true, JSON.stringify(result.gates));
  assert.equal(result.snapshot.upcoming, 12);
  assert.equal(result.snapshot.freeCandidates, 2);
  assert.equal(result.snapshot.freeSports.length, 2);
});

test('preflight blocks expired, stale and unproven free supply instead of inflating counts', () => {
  const inventory = freshCatalogue().map((e, i) => i < 9 ? { ...e, checkedOn: '2026-11-09' } : e);
  const result = auditCatalogueReadiness({ records: inventory, now });
  assert.equal(result.passed, false);
  assert.equal(result.gates.find(g => g.key === 'fresh').pass, false);
  assert.equal(result.gates.find(g => g.key === 'free').pass, false);
  assert.equal(result.snapshot.recentlyReviewedCandidates, 3);
  const expired = auditCatalogueReadiness({
    records: freshCatalogue().map(e => ({ ...e, date: '2026-11-10', endDate: '2026-11-10' })),
    now,
  });
  assert.equal(expired.snapshot.upcoming, 0);
  assert.equal(expired.gates.find(g => g.key === 'future').pass, false);
});

test('different IDs cannot disguise a duplicate event, and review holds exclude entry candidates', () => {
  const items = freshCatalogue();
  items[2] = { ...items[2], title: items[1].title, venue: items[1].venue, date: items[1].date };
  items[3] = { ...items[3], reviewNote: 'Organizer venue has conflicting data.' };
  const result = auditCatalogueReadiness({ records: items, now });
  assert.equal(result.gates.find(g => g.key === 'duplicates').pass, false);
  assert.ok(result.snapshot.duplicateIds.includes(items[2].id));
  assert.ok(!result.snapshot.candidates.some(e => e.id === items[3].id));
});

test('current Mercury catalogue fails this separate release gate until verified events and free supply are added', () => {
  const result = auditCatalogueReadiness({ now });
  assert.equal(result.passed, false);
  assert.equal(result.gates.find(g => g.key === 'free').actual, 0);
});
