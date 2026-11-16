import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORY_LIMIT, CATEGORY_UNITS, categoryDraftMarkup, validateCategoryDrafts,
  categoryDraftReviewText, readCategoryDraft
} from '../public/organizer-category-draft.js';
import { buildOrganizerMessage, eventSubmissionMarkup } from '../public/organizer-public.js';
import { publishedCategories } from '../public/category-comparison.js';

const singles = {
  name: 'Open Singles', fee: '₹800', unit: 'player', notes: 'Open category'
};
const doubles = {
  name: 'Open Doubles', fee: '₹1,200', unit: 'pair', notes: 'Register with your partner'
};

test('organizer categories retain their source fee unit for athlete-facing review', () => {
  const result = validateCategoryDrafts([singles, doubles]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.categories.map(c => c.fee), ['₹800 per player', '₹1,200 per pair']);
  const athlete = publishedCategories({ categories: result.categories });
  assert.deepEqual(athlete.map(c => c.name), ['Open Singles', 'Open Doubles']);
  assert.equal(athlete[1].notes, 'Register with your partner');
  assert.equal(CATEGORY_UNITS.team, 'per team');
});

test('free really means free, while unknown fee stays explicitly unknown', () => {
  const result = validateCategoryDrafts([
    { name:'Beginner Run', fee:'Free', unit:'player', notes:'' },
    { name:'Advanced Run', fee:'Fee to confirm', unit:'distance', notes:'Check with host' }
  ]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.categories[0].fee, 'Free per player');
  assert.equal(result.categories[1].fee, 'Fee to confirm per distance');
  assert.doesNotMatch(result.categories[1].fee, /^Free/);
});

test('partial or ambiguous category drafts are blocked before submission, not silently omitted', () => {
  const tests = [
    [{ name:'Doubles', fee:'₹900', unit:'', notes:'' }],
    [{ name:'', fee:'₹900', unit:'pair', notes:'' }],
    [{ name:'Doubles', fee:'900', unit:'pair', notes:'' }],
    [{ name:'Doubles', fee:'₹900', unit:'unrecognized', notes:'' }],
    [singles, { ...singles, name:'open singles' }]
  ];
  for (const rows of tests) {
    const result = validateCategoryDrafts(rows);
    assert.ok(result.errors.length, JSON.stringify(rows));
  }
  assert.deepEqual(validateCategoryDrafts([]), { categories:[], errors:[] });
});

test('at most six categories and reasonable field sizes', () => {
  const tooMany = Array.from({length:CATEGORY_LIMIT+1},(_,i)=>({...singles,name:'Category '+i}));
  assert.ok(validateCategoryDrafts(tooMany).errors.some(e=>/six categories/i.test(e)));
  assert.ok(validateCategoryDrafts([{...singles,notes:'A'.repeat(151)}]).errors.some(e=>/150/ig.test(e)));
  assert.ok(validateCategoryDrafts([{...singles,name:'A'.repeat(81)}]).errors.some(e=>/80/ig.test(e)));
});

test('submission carries structured unverified categories into existing manual-review intake', () => {
  const { categories, errors } = validateCategoryDrafts([singles,doubles]);
  assert.deepEqual(errors,[]);
  const message = buildOrganizerMessage({
    registrationUrl:'https://example.org/events/next-tournament',title:'Sunday Open',
    date:'2026-12-20',sport:'Badminton',venue:'Powai, Mumbai',
    fee:'₹800 per player · ₹1,200 per pair',notes:'Organized by our academy',
    categories
  });
  assert.match(message,/EVENT LISTING REQUEST — manual review required/);
  assert.match(message,/Proposed categories \(UNVERIFIED; verify against official source\)/);
  assert.match(message,/Open Singles \| ₹800 per player \| Open category/);
  assert.match(message,/Open Doubles \| ₹1,200 per pair \| Register with your partner/);
  assert.match(message,/Ownership is NOT verified/);
  assert.ok(message.length <= 2000);
  assert.equal(categoryDraftReviewText([]),'');
});

test('draft markup is explicit about manual review, does not publish, and leaks no player details', () => {
  const markup = eventSubmissionMarkup();
  assert.match(markup,/id="organizer-category-draft"/);
  assert.match(markup,/id="organizer-add-category"/);
  assert.match(markup,/Up to six optional categories/);
  assert.match(markup,/not published/i);
  assert.doesNotMatch(markup,/<input[^>]+name="playerEmail"/);
  assert.match(categoryDraftMarkup(),/different categories or fees/i);
  assert.deepEqual(readCategoryDraft(null),{categories:[],errors:[]});
});

test('category preview treats markup as data and stays source-unverified', () => {
  const result = validateCategoryDrafts([{name:'<img src=x onerror=alert(1)>',fee:'₹100',unit:'team',notes:'<script>alert(1)</script>'}]);
  assert.deepEqual(result.errors,[]);
  const review = categoryDraftReviewText(result.categories);
  assert.match(review,/UNVERIFIED/);
  assert.match(review,/per team/);
  assert.doesNotMatch(review, /payment confirmed|verified category/i);
});
