import test from 'node:test';
import assert from 'node:assert/strict';
import { newEditionStarter } from '../public/repeat-edition.js';
import { findListing } from '../public/catalogue.js';
import { validateCategoryDrafts } from '../public/organizer-category-draft.js';

test('repeat-edition starter copies only public sport and category structure, never event commitments', () => {
  const original=findListing('rotary-queen-city-half-marathon-2026');
  const starter=newEditionStarter(original);
  assert.equal(starter.sport,'Running');
  assert.match(starter.sourceTitle,/Rotary Queen City/);
  assert.equal(starter.categories.length,4);
  assert.equal(starter.categories[1].name,'5K Timed');
  for (const item of starter.categories) {
    assert.equal(item.fee,'');
    assert.equal(item.notes,'');
    assert.ok(['', 'player','pair','team','category','distance'].includes(item.unit));
  }
  for (const key of ['registrationUrl','sourceUrl','date','venue','priceLabel','host','title','email','checkedOn','eligibility']) {
    assert.equal(Object.hasOwn(starter,key),false,key);
  }
  assert.ok(validateCategoryDrafts(starter.categories).errors.length);
});

test('no-category prior event cannot manufacture category fees or match guarantees', () => {
  const e=findListing('mumbai-pickleball-cup-s3');
  const starter=newEditionStarter(e);
  assert.equal(starter.sport,'Pickleball');
  assert.deepEqual(starter.categories,[]);
  assert.equal(starter.registrationUrl,undefined);
  assert.equal(starter.date,undefined);
});

test('old published fee units may be suggested, but never fees or eligibility notes', () => {
  const starter=newEditionStarter({
    sport:'Badminton', title:'Old Event',
    categories:[{name:'Open Doubles',fee:'₹1,200 per pair',notes:'Age 18+'}, {name:'Open Singles',fee:'₹900',notes:'Junior 12+'}]
  });
  assert.equal(starter.categories[0].unit,'pair');
  assert.equal(starter.categories[1].unit,'');
  assert.ok(starter.categories.every(c=>!c.fee&&!c.notes));
});

test('conflicting historical category units are discarded instead of copied', () => {
  const starter=newEditionStarter({ sport:'Badminton', categories:[
    {name:'Mixed Doubles',fee:'₹800 per player',entryUnit:'pair',notes:'Previous edition'}
  ]});
  assert.equal(starter.categories[0].unit,'');
});

test('invalid template and oversized categories fail safely', () => {
  assert.equal(newEditionStarter(null),null);
  const categories=Array.from({length:12},(_,i)=>({name:'Division '+i,fee:'₹500 per player'}));
  const starter=newEditionStarter({sport:'Tennis',title:'T'.repeat(200),categories});
  assert.equal(starter.sourceTitle.length,120);
  assert.equal(starter.categories.length,6);
});
