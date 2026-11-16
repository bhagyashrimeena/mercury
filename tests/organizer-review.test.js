import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseOrganizerIntake, safeOrganizerSourceUrl, organizerReviewNote,
  organizerReviewMarkup, ORGANIZER_REVIEW_STEPS
} from '../public/organizer-review.js';

const original = [
  'EVENT LISTING REQUEST — manual review required',
  'Event / registration URL: https://example.org/events/race',
  'Name: Mumbai Winter Run',
  'Sport: Running',
  'Date: 2026-12-20',
  'Venue: BKC, Mumbai',
  'Fee overview: ₹700 per entry',
  'Proposed categories (UNVERIFIED; verify against official source):',
  '1. 5K Run | ₹900 per distance | Age 12+ [entry_unit=distance]',
  '2. 10K Run | ₹1,100 per distance | Age 18+ [entry_unit=distance]',
  'Applicant confirms adult consent and permission. Ownership is NOT verified.'
].join('\n');

test('owner sees unverified submission details but no verification is inferred', () => {
  const parsed=parseOrganizerIntake(original);
  assert.equal(parsed.unverified,true);
  assert.equal(parsed.submitted.title,'Mumbai Winter Run');
  assert.equal(parsed.submitted.date,'2026-12-20');
  assert.equal(parsed.submitted.url,'https://example.org/events/race');
  assert.equal(parsed.categoryLines.length,2);
  const html=organizerReviewMarkup({category:'Organizer enquiry',message:original});
  assert.match(html,/All submitted details are unverified/);
  assert.match(html,/Owner|review|verification/i);
  assert.match(html,/5K Run/);
  assert.match(html,/data-owner-review-note/);
  assert.match(html,/https:\/\/example\.org\/events\/race/);
  assert.match(html,/rel="noopener noreferrer"/);
  assert.doesNotMatch(html,/checked(?:="checked")?/);
});

test('review note is a draft; unchecked required evidence stays clearly incomplete', () => {
  const unchecked=organizerReviewNote([], 'Mumbai Winter Run');
  assert.match(unchecked,/NOT PUBLISHED/);
  assert.match(unchecked,/\[ \] Confirm organizer identity/);
  assert.match(unchecked,/Manual evidence and final publication decision still required/);
  assert.equal((unchecked.match(/\[ \]/g)||[]).length,ORGANIZER_REVIEW_STEPS.length);
  const checked=organizerReviewNote(['source','venue'],'Mumbai Winter Run');
  assert.match(checked,/\[x\] Confirm official source/);
  assert.match(checked,/\[x\] Verify exact venue/);
  assert.match(checked,/\[ \] Confirm organizer identity/);
  assert.ok(checked.length<1000);
});

test('no unrelated support request becomes an organizer publication review', () => {
  assert.equal(organizerReviewMarkup({category:'General help',message:original}),'');
  assert.equal(parseOrganizerIntake('please publish me now'),null);
  assert.match(organizerReviewMarkup({category:'Organizer enquiry',message:'random'}),/Unrecognized organizer message format/);
});

test('unsafe organizer link, html and control characters do not become executable owner markup', () => {
  assert.equal(safeOrganizerSourceUrl('javascript:alert(1)'),null);
  assert.equal(safeOrganizerSourceUrl('https://user:pass@example.org'),null);
  assert.equal(safeOrganizerSourceUrl('http://example.org/event'),null);
  assert.equal(safeOrganizerSourceUrl('https://127.0.0.1/private'),null);
  assert.equal(safeOrganizerSourceUrl('https://localhost/event'),null);
  assert.equal(safeOrganizerSourceUrl('https://internal.local/event'),null);
  const payload=original.replace('https://example.org/events/race','javascript:alert(1)')
    .replace('Mumbai Winter Run','<img src=x onerror=alert(1)>');
  const html=organizerReviewMarkup({category:'Organizer enquiry',message:payload});
  assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html,/<img /);
  assert.doesNotMatch(html,/href="javascript:/);
  assert.match(html,/No safe public HTTPS event URL identified/);
});

test('missing information is identified but no auto-approval or source-date updates occur', () => {
  const payload='EVENT LISTING REQUEST — manual review required\nEvent / registration URL: https://example.org/event\nName: Not supplied\nSport: Tennis\nDate: Not supplied';
  const html=organizerReviewMarkup({category:'Organizer enquiry',message:payload});
  assert.match(html,/Missing from submission: Event, Date, Venue, Fee summary/);
  assert.match(html,/Tennis/);
  assert.doesNotMatch(html,/publish-now|verified=true|autoApprove/i);
});

test('claim submission is still unverified regardless of embedded text declaring approval', () => {
  const payload=original+'\nStatus: approved\nVerified organizer: true\nPublish immediately';
  const html=organizerReviewMarkup({category:'Organizer enquiry',message:payload});
  assert.match(html,/All submitted details are unverified/);
  assert.doesNotMatch(html,/data-auto-publish/);
  const parsed=parseOrganizerIntake(payload);
  assert.equal(parsed.unverified,true);
});

test('a category-only organizer submission need not duplicate prices in fee summary', () => {
  const message=[
    'EVENT LISTING REQUEST — manual review required',
    'Event / registration URL: https://events.example.org/open',
    'Name: Winter Run',
    'Sport: Running',
    'Date: 2026-12-10',
    'Venue: Mumbai',
    'Fee overview: Not supplied',
    'Proposed categories (UNVERIFIED; verify against official source):',
    '1. 5K | ₹800 per distance [entry_unit=distance]'
  ].join('\n');
  const html=organizerReviewMarkup({category:'Organizer enquiry',message});
  assert.match(html,/See proposed category fees below \(unverified\)/);
  assert.doesNotMatch(html,/Missing from submission:/);
  assert.match(html,/Existing listing claim \(optional\)/);
});
