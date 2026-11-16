import test from 'node:test';
import assert from 'node:assert/strict';
import { externalEntryFacts, externalEntryGuideMarkup } from '../public/entry-clarity.js';
import { organizerInformationChecklist, organizerSportPrompt, organizerGuidanceMarkup } from '../public/organizer-clarity.js';
import { eventSubmissionMarkup } from '../public/organizer-public.js';
import { findListing } from '../public/catalogue.js';

test('athlete entry guidance preserves source fee units, eligibility and organizer ownership', () => {
  const event = findListing('mumbai-pickleball-cup-s3');
  const facts = externalEntryFacts(event, {code: 'check', label: 'Check availability'});
  assert.equal(facts.caution, false);
  assert.equal(facts.facts[1].value, event.priceLabel);
  assert.equal(facts.facts[1].note, event.priceNote);
  const markup = externalEntryGuideMarkup(event, { code: 'check', label: 'Check availability' });
  assert.match(markup, /Who can take part/);
  assert.match(markup, /What does entry cost/);
  assert.match(markup, /Where is it/);
  assert.match(markup, /Following the link is not a confirmed entry/);
  assert.doesNotMatch(markup, /Guaranteed seat|You are eligible|Payment confirmed/);
});

test('stale or disputed athlete listing is explicitly flagged; unsafe source text is escaped', () => {
  const event = { ...findListing('ninjas-championship-2026'), eligibility: '<script>alert(1)</script>' };
  const markup = externalEntryGuideMarkup(event, {code:'stale',label:'Recheck details'});
  assert.match(markup, /Recheck before entering/);
  assert.match(markup, /Recheck details/);
  assert.match(markup, /Andheri/);
  assert.match(markup, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(markup, /<script>/);
  assert.equal(externalEntryFacts(event, {code:'stale'}).caution, true);
  assert.equal(externalEntryFacts({ ...event, reviewNote: '' }, {code:'closed'}).caution, true);
});

test('unknown categories, deadline, price and venue stay unknown instead of being invented', () => {
  const markup = externalEntryGuideMarkup({ title: 'Test', eligibility: '', priceLabel: '', deadlineLabel: '', venue: '' });
  assert.match(markup, /Eligibility not specified/);
  assert.match(markup, /Fee not specified/);
  assert.match(markup, /Closing time not published/);
  assert.match(markup, /Exact venue not published/);
  assert.match(markup, /Category-specific rules may not be available/);
});

test('organizer guidance is advisory and sport-aware, without inventing publication approval', () => {
  const partial = { registrationUrl: 'https://events.example.org/t', name:'Club', email:'events@example.org', title:'Sunday Open', sport:'Badminton', date:'2026-12-13', venue:'Powai', fee:'₹800', notes:'' };
  const checklist = organizerInformationChecklist(partial);
  assert.equal(checklist.filter(x => x.present).length, 6);
  assert.equal(checklist.find(x => x.label === 'Fee and entry unit').present, false);
  const markup = organizerGuidanceMarkup(partial);
  assert.match(markup, /6 of 8 helpful details provided/);
  assert.match(markup, /partner rules/);
  assert.match(markup, /partial request for manual review/);
  assert.doesNotMatch(markup, /Verified organizer|Publish now|Approved event/);
  assert.match(organizerSportPrompt('Running'), /distances/);
  assert.match(organizerSportPrompt('Chess'), /time control/);
});

test('organizer guidance accepts fee units and HTML-escapes organizer-provided notes', () => {
  const fields = { registrationUrl:'https://events.example.org/t', name:'Club', email:'events@example.org', title:'<img src=x onerror=alert(1)>', sport:'Pickleball', date:'2026-12-13', venue:'Andheri', fee:'₹1,200 per pair', notes:'Beginner doubles' };
  assert.equal(organizerInformationChecklist(fields).every(x=>x.present), true);
  const markup = organizerGuidanceMarkup(fields);
  assert.match(markup, /8 of 8 helpful details provided/);
  assert.match(markup, /skill or rating divisions/);
  assert.doesNotMatch(markup, /<img/);
  assert.match(eventSubmissionMarkup(), /submission-readiness/);
});

test('organizer-verified Cup S3 venue and entry fee are kept distinct from Season 2', () => {
  const cup = findListing('mumbai-pickleball-cup-s3');
  assert.equal(cup.area, 'Borivali');
  assert.match(cup.venue, /AT Arena/);
  assert.doesNotMatch(cup.venue, /Stratum Play|Malad/);
  assert.match(cup.priceNote, /₹1,200 early bird until 20 November 2026/);
  assert.match(cup.priceNote, /then ₹1,500 per category entry/);
  assert.match(cup.priceNote, /Doubles entry covers both players/);
  assert.equal(cup.checkedOn, '2026-11-16');
});
