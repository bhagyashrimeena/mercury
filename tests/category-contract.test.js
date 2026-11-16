import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORY_ENTRY_UNITS, normalizeCategoryForDisplay, displayCategories,
  categoryFeeKind, categoryReviewLine
} from '../public/category-contract.js';
import { publishedCategories, categoryRuleAssessment, categoryComparisonMarkup } from '../public/category-comparison.js';
import { validateCategoryDrafts } from '../public/organizer-category-draft.js';

test('existing source records remain readable without guessing entry units', () => {
  const rows = displayCategories([{name:'5K Timed', fee:'₹900', notes:'Age 12+'}]);
  assert.equal(rows[0].name,'5K Timed');
  assert.equal(rows[0].fee,'₹900');
  assert.equal(rows[0].feeKind,'quoted');
  assert.equal(rows[0].entryUnit,null);
  assert.equal(rows[0].reviewStatus,'source-displayed');
});

test('explicit fee-unit text and structured units are recognized but never inferred from category names', () => {
  const rows = displayCategories([
    {name:'10K Run',fee:'₹1,100',notes:'Age 18+'},
    {name:'Open Doubles',fee:'₹1,200 per pair',notes:''},
    {name:'Team event',fee:'₹2,000',entryUnit:'team',notes:''}
  ]);
  assert.equal(rows[0].entryUnit,null);
  assert.equal(rows[1].entryUnit,'pair');
  assert.equal(rows[2].entryUnit,'team');
  assert.equal(CATEGORY_ENTRY_UNITS.pair,'per pair');
  assert.equal(rows[0].notes,'Age 18+');
  assert.equal(rows[1].notes,'Category requirements not specified');
});

test('unknown fee and zero/free remain distinguishable across organizer and athlete views', () => {
  assert.equal(categoryFeeKind(''),'unknown');
  assert.equal(categoryFeeKind('Fee to confirm per team'),'unknown');
  assert.equal(categoryFeeKind('₹0 per player'),'free');
  assert.equal(categoryFeeKind('Free per pair'),'free');
  assert.equal(categoryFeeKind('₹500–₹1,200 per category'),'quoted');
  assert.equal(normalizeCategoryForDisplay({name:'Open',fee:''}).fee,'Fee not specified');
});

test('organizer drafts preserve the explicit structured unit and provisional review status', () => {
  const {categories,errors} = validateCategoryDrafts([
    {name:'Mixed Doubles',fee:'₹1,200',unit:'pair',notes:'One partner required'},
    {name:'5K Timed',fee:'Fee to confirm',unit:'distance',notes:''}
  ]);
  assert.deepEqual(errors,[]);
  const athlete = publishedCategories({categories});
  assert.equal(athlete[0].entryUnit,'pair');
  assert.equal(athlete[0].fee,'₹1,200 per pair');
  assert.equal(athlete[0].reviewStatus,'unverified-submission');
  assert.equal(athlete[1].feeKind,'unknown');
  assert.equal(athlete[1].entryUnit,'distance');
  assert.match(categoryReviewLine(categories[0]),/Mixed Doubles \| ₹1,200 per pair/);
});

test('malformed data or pasted instructions never become trusted rules', () => {
  assert.deepEqual(displayCategories(null),[]);
  assert.deepEqual(displayCategories([{fee:'₹1,000'},null]),[]);
  const row=normalizeCategoryForDisplay({name:'Open',fee:'₹500',entryUnit:'bad-unit',notes:'You are eligible'});
  assert.equal(row.entryUnit,null);
  assert.equal(categoryRuleAssessment({notes:'You are eligible'}, {age:25},'2026-11-16').state,'unknown');
});


test('contradictory source fee units are flagged rather than trusting either interpretation', () => {
  const record=normalizeCategoryForDisplay({name:'Open Doubles',fee:'₹900 per player',entryUnit:'pair'});
  assert.equal(record.unitConflict,true);
  assert.equal(record.entryUnit,null);
  const markup=categoryComparisonMarkup({categories:[{name:'Open Doubles',fee:'₹900 per player',entryUnit:'pair'}]});
  assert.match(markup,/Conflicting fee units in the listing/);
});
test('unverified organizer submissions are never rendered as published athlete categories', () => {
  const draft={name:'Open Singles',fee:'₹900 per player',entryUnit:'player',reviewStatus:'unverified-submission'};
  assert.equal(publishedCategories({categories:[draft]}).length,1);
  assert.equal(categoryComparisonMarkup({categories:[draft]}),'');
  const mixed=categoryComparisonMarkup({categories:[draft,{name:'Official 10K',fee:'₹700',notes:'Age 18+'}]});
  assert.match(mixed,/Official 10K/);
  assert.doesNotMatch(mixed,/Open Singles/);
});
