import test from 'node:test';
import assert from 'node:assert/strict';
import { listings } from '../public/catalogue-data.js';
import {
  buildUnpublishedCatalogueProposal, CATALOGUE_REQUIRED_FIELDS,
  PUBLICATION_REQUIRED_REVIEW
} from '../public/organizer-publication-proposal.js';
import { assessCatalogueProposal } from '../server/catalogue-proposal-review.js';
import { organizerReviewMarkup } from '../public/organizer-review.js';

const request={
  category:'Organizer enquiry', id:'synthetic-review-ref-2026',
  name:'Private Submitter', email:'person@example.org',
  status:'open',
  message:[
    'EVENT LISTING REQUEST — manual review required',
    'Event / registration URL: https://organizer.example.org/register',
    'Name: Winter City Run',
    'Sport: Running',
    'Date: 2026-12-20',
    'Venue: Bandra, Mumbai',
    'Fee overview: ₹900 per distance',
    'Proposed categories (UNVERIFIED; verify against official source):',
    '1. 5K Run | ₹900 per distance [entry_unit=distance]',
    'Applicant confirms adult consent and permission. Ownership is NOT verified.'
  ].join('\n')
};
const baseDate=new Date('2026-11-16T10:00:00Z');
const packet=()=>buildUnpublishedCatalogueProposal(request,baseDate);
const ready=()=>{
  const p=packet();
  p.state='reviewed_for_pr';
  p.review={
    verifiedBy:'Manual Reviewer',
    verifiedAt:'2026-11-16',
    officialSourceUrl:'https://www.mumbaipickleballcup.com/',
    evidenceNotes:'Human independently compared official organizer page, current event date, categories, source ownership and registration URL for this source. This is synthetic test evidence only.',
    checks:Object.fromEntries(PUBLICATION_REQUIRED_REVIEW.map(key=>[key,true]))
  };
  const previous=structuredClone(listings.find(e=>e.id==='mumbai-pickleball-cup-s3'));
  p.record={...previous,id:'fixture-proposal-new-event-2026',checkedOn:'2026-11-16',sourceUrl:p.review.officialSourceUrl,
    categories:[{name:'Open Doubles',fee:'₹1,500 per pair',notes:'Pair required. Check organizer age and skill requirements.',entryUnit:'pair'}]};
  return p;
};

test('owner export is a draft with entirely blank verified record and no private support identity',()=>{
  const p=packet();
  assert.equal(p.schema,'mercury.catalogue-proposal.v1');
  assert.equal(p.state,'needs_independent_review');
  assert.equal(p.sourceRequestId,request.id);
  assert.equal(p.unverifiedSuggestions.eventName,'Winter City Run');
  assert.match(p.unverifiedSuggestions.categories[0],/UNVERIFIED|5K Run/);
  for(const key of CATALOGUE_REQUIRED_FIELDS) assert.equal(p.record[key],null,key);
  assert.deepEqual(p.record.categories,[]);
  assert.ok(Object.values(p.review.checks).every(x=>x===false));
  const exported=JSON.stringify(p);
  assert.doesNotMatch(exported,/person@example.org|Private Submitter/);
  assert.doesNotMatch(exported,/payment confirmed|approved organizer/);
  assert.equal(p.record.deadline,null);
});

test('unrelated support messages cannot create catalogue proposals',()=>{
  assert.equal(buildUnpublishedCatalogueProposal({...request,category:'Privacy request'}),null);
  assert.equal(buildUnpublishedCatalogueProposal({...request,message:'Please approve me'}),null);
  const html=organizerReviewMarkup(request);
  assert.match(html,/data-owner-review-export/);
  assert.match(html,/Export unpublished catalogue review packet/);
  assert.doesNotMatch(html,/Publish event now/);
});

test('a generated packet can never pass the review gate without independent review',()=>{
  const result=assessCatalogueProposal(packet(),listings,'2026-11-16');
  assert.equal(result.valid,false);
  assert.ok(result.errors.some(e=>e.includes('reviewed_for_pr')));
  assert.ok(result.errors.some(e=>e.includes('Human review gate not confirmed')));
  assert.ok(result.errors.some(e=>e.includes('review.verifiedBy')));
});

test('complete synthetic packet passes structural checks but remains unmerged',()=>{
  const p=ready();
  const result=assessCatalogueProposal(p,listings,'2026-11-16');
  assert.deepEqual(result.errors,[]);
  assert.equal(result.valid,true);
  assert.equal(p.state,'reviewed_for_pr');
});

test('tampered packet, duplicate ID and mismatched source dates fail closed',()=>{
  let p=ready(); p.review.checks.authority=false;
  assert.match(assessCatalogueProposal(p,listings,'2026-11-16').errors.join(' '),/authority/);
  p=ready();p.record.id='mumbai-pickleball-cup-s3';
  assert.match(assessCatalogueProposal(p,listings,'2026-11-16').errors.join(' '),/already exists/);
  p=ready();p.record.checkedOn='2026-11-09';
  assert.match(assessCatalogueProposal(p,listings,'2026-11-16').errors.join(' '),/source review date/);
  p=ready();p.review.officialSourceUrl='https://different.example.org/events';
  assert.match(assessCatalogueProposal(p,listings,'2026-11-16').errors.join(' '),/sourceUrl must match/);
  p=ready();p.review.evidenceNotes='approved';
  assert.match(assessCatalogueProposal(p,listings,'2026-11-16').errors.join(' '),/concrete source/);
  p=ready();p.record.date='2026-09-01';p.record.endDate='2026-09-02';
  assert.match(assessCatalogueProposal(p,listings,'2026-11-16').errors.join(' '),/concluded before source review/);
  assert.equal(assessCatalogueProposal(ready(),null,'2026-11-16').valid,false);
});

test('unreviewed, conflicting or duplicate category entries cannot pass even with checked gates',()=>{
  let p=ready();p.record.categories[0].reviewStatus='unverified-submission';
  assert.match(assessCatalogueProposal(p,listings,'2026-11-16').errors.join(' '),/unverified organizer submission/);
  p=ready();p.record.categories[0].entryUnit='team';
  assert.match(assessCatalogueProposal(p,listings,'2026-11-16').errors.join(' '),/consistent, explicitly verified entry-unit/);
  p=ready();p.record.categories.push({...p.record.categories[0]});
  assert.match(assessCatalogueProposal(p,listings,'2026-11-16').errors.join(' '),/Duplicate published category/);
  p=ready();p.record.categories[0].fee='₹1,500';
  p.record.categories[0].entryUnit=null;
  assert.match(assessCatalogueProposal(p,listings,'2026-11-16').errors.join(' '),/explicitly verified entry-unit/);
});

test('unsupported review packet schema cannot be interpreted as an approvable event',()=>{
  assert.equal(assessCatalogueProposal({state:'reviewed_for_pr'},listings).valid,false);
  assert.equal(assessCatalogueProposal({},listings).valid,false);
});
