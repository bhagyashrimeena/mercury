import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverySuggestions } from '../public/discovery-recovery.js';
import { filterLineup } from '../public/explore.js';

const now = Date.parse('2026-11-16T07:00:00Z');
const item = (overrides = {}) => ({
  id: 'tennis-event', title: 'Community Tennis Open',
  sport: 'Tennis', type: 'Tournament', area: 'Andheri',
  date: '2026-12-10', endDate: '2026-12-10', level: 'All levels',
  priceLabel: '₹1,500', external: true,
  availability: { code: 'check', label: 'Check availability' },
  ...overrides
});
const basic = {
  sport:'Tennis', area:'Powai', when:'Any date', fee:'Any fee',
  level:'Any level', type:'All formats', availability:'All upcoming',
  query:'', from:'', to:''
};

test('an area-only suggestion keeps the athlete sport and does not invent inventory', () => {
  const items = [item(), item({id:'different-sport',sport:'Badminton',area:'Powai'})];
  assert.equal(filterLineup(items,basic,now).length,0);
  const options = recoverySuggestions(items,basic,filterLineup,now);
  assert.equal(options[0].id,'area');
  assert.equal(options[0].count,1);
  const next = { ...basic, ...options[0].patch };
  assert.equal(next.sport,'Tennis');
  assert.deepEqual(filterLineup(items,next,now).map(e=>e.id),['tennis-event']);
});

test('time and search keyword relaxation each require real matches', () => {
  const items = [item()];
  const time = recoverySuggestions(items,{...basic,area:'Andheri',when:'Next 7 days'},filterLineup,now);
  assert.equal(time[0].id,'when');
  assert.equal(time[0].patch.when,'Any date');
  assert.equal(time[0].count,1);
  const search = recoverySuggestions(items,{...basic,area:'Andheri',query:'unmatched'},filterLineup,now);
  assert.equal(search[0].id,'query');
  assert.equal(search[0].patch.query,'');
});

test('stale sources are suggested only as listings needing a source check', () => {
  const stale = item({availability:{code:'stale',label:'Recheck details'}});
  const filters = {...basic,area:'Andheri',availability:'Entry possible'};
  assert.equal(filterLineup([stale],filters,now).length,0);
  const suggestions = recoverySuggestions([stale],filters,filterLineup,now);
  assert.equal(suggestions[0].id,'status');
  assert.match(suggestions[0].label,/source checks/);
  assert.equal(suggestions[0].patch.availability,'All upcoming');
  assert.equal(suggestions[0].count,1);
});

test('fee relaxation does not imply the original budget is satisfied', () => {
  const filters={...basic,area:'Andheri',fee:'Under ₹1,000'};
  const suggestions=recoverySuggestions([item()],filters,filterLineup,now);
  assert.equal(suggestions[0].id,'fee');
  assert.equal(suggestions[0].patch.fee,'Any fee');
  assert.equal(suggestions[0].count,1);
});

test('combined widening keeps requested sport, and no-match catalogues stay empty', () => {
  const filters={...basic,area:'Powai',when:'Next 7 days',query:'needle'};
  const suggestions=recoverySuggestions([item()],filters,filterLineup,now);
  assert.equal(suggestions[0].id,'broader');
  assert.equal({...filters,...suggestions[0].patch}.sport,'Tennis');
  assert.equal(suggestions[0].count,1);
  assert.deepEqual(recoverySuggestions([item({sport:'Badminton'})],filters,filterLineup,now),[]);
});

test('recovery suggestions never claim a booking or mutate the filters object', () => {
  const filters={...basic,area:'Powai'};
  const before=structuredClone(filters);
  const options=recoverySuggestions([item()],filters,filterLineup,now);
  assert.deepEqual(filters,before);
  assert.ok(options.every(x=>!/confirmed|booking|registered/i.test(x.label)));
  assert.ok(options.length<=3);
});
