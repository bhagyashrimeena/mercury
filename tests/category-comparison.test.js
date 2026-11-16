import test from 'node:test';
import assert from 'node:assert/strict';
import { publishedCategories, categoryRuleAssessment, categoryComparisonMarkup } from '../public/category-comparison.js';
import { findListing } from '../public/catalogue.js';

const reviewed = {
  reviewed: true, complete: true,
  sourceUrl: 'https://organizer.example.org/official-rules',
  checkedOn: '2026-11-16'
};

test('real published race divisions retain distinct prices and age notes without inferred eligibility', () => {
  const listing = findListing('rotary-queen-city-half-marathon-2026');
  const categories = publishedCategories(listing);
  assert.equal(categories.length, 4);
  assert.deepEqual(categories.map(c => c.fee), ['₹700', '₹900', '₹1,100', '₹1,300']);
  assert.match(categories[1].notes, /12\+/);
  const html = categoryComparisonMarkup(listing);
  assert.match(html, /Compare published categories/);
  assert.match(html, /data-category-selection/);
  assert.match(html, /21K Half Marathon/);
  assert.match(html, /This does not select your entry on the organizer/);
  assert.equal(categoryRuleAssessment(listing.categories[1], { age: 21 }, '2026-11-16').state, 'unknown');
});

test('external events without category rows keep their normal detail page, not empty invented categories', () => {
  assert.equal(categoryComparisonMarkup({ categories: [] }), '');
  assert.equal(categoryComparisonMarkup({}), '');
  assert.deepEqual(publishedCategories({ categories: 'invalid' }), []);
});

test('untrusted organizer category text is HTML escaped and missing fee is not called free', () => {
  const html = categoryComparisonMarkup({ categories: [
    { name: '<svg onload=alert(1)>', fee: '', notes: '<img src=x onerror=alert(1)>' }
  ] });
  assert.match(html, /&lt;svg onload=alert\(1\)&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /Fee not specified/);
  assert.doesNotMatch(html, /<svg onload=|<img src=/);
  assert.doesNotMatch(html, /Free entry/);
});

test('reviewed structured rules may reject an explicit age or partner mismatch', () => {
  const cat = { eligibilityRules: { ...reviewed, minAge: 18, maxAge: 35, requiresPartner: true } };
  const age = categoryRuleAssessment(cat, { age: 17, hasPartner: true }, '2026-11-16');
  const partner = categoryRuleAssessment(cat, { age: 25, hasPartner: false }, '2026-11-16');
  assert.equal(age.state, 'not-matched');
  assert.equal(partner.state, 'not-matched');
  assert.match(partner.reason, /official source/);
});

test('meeting all checked conditions is not official eligibility or a confirmed entry', () => {
  const cat = { eligibilityRules: { ...reviewed, minAge: 18, requiresPartner: true } };
  const result = categoryRuleAssessment(cat, { age: 25, hasPartner: true }, '2026-11-16');
  assert.equal(result.state, 'matches-checked-rules');
  assert.match(result.reason, /Only the organizer can confirm/);
  assert.doesNotMatch(result.reason, /You are eligible|place confirmed/i);
});

test('insufficient, invalid, or stale rules always return unknown, even if notes imply eligibility', () => {
  const cases = [
    { eligibilityRules: { ...reviewed, complete: false, minAge: 18 } },
    { eligibilityRules: { ...reviewed, reviewed: false, minAge: 18 } },
    { eligibilityRules: { ...reviewed, sourceUrl: 'http://organizer.example.org/rules', minAge: 18 } },
    { eligibilityRules: { ...reviewed, checkedOn: '2026-11-17', minAge: 18 } },
    { eligibilityRules: { ...reviewed, checkedOn: '2026-11-01', minAge: 18 } },
    { eligibilityRules: { ...reviewed, minAge: 18, maxAge: 16 } },
    { eligibilityRules: { ...reviewed, minRating: 3.5 } },
    { eligibilityRules: { ...reviewed, minAge: 18 }, notes: 'Age 18+' },
    { notes: 'Age 18+', fee: '₹1,200' },
  ];
  for (const entry of cases) {
    const result = categoryRuleAssessment(entry, { age: 21 }, '2026-11-16');
    assert.equal(result.state, 'unknown', JSON.stringify(entry));
  }
});

test('rating checks require a comparable declared rating system', () => {
  const category = { eligibilityRules: { ...reviewed, minRating: 2.5, maxRating: 3.5, ratingSystem: 'DUPR' } };
  assert.equal(categoryRuleAssessment(category, { rating: 3.1, ratingSystem: 'UTR' }, '2026-11-16').state, 'unknown');
  assert.equal(categoryRuleAssessment(category, { rating: 4, ratingSystem: 'DUPR' }, '2026-11-16').state, 'not-matched');
  assert.equal(categoryRuleAssessment(category, { rating: 3.1, ratingSystem: 'DUPR' }, '2026-11-16').state, 'matches-checked-rules');
});
