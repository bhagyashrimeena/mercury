import test from 'node:test';
import assert from 'node:assert/strict';
import { organizerDashboardMarkup, organizerEventCard, organizerMenuMarkup, submissionMarkup } from '../public/organizer-studio.js';

const event = { id:'club-game',title:'<Club> tournament',status:'published',date:'2030-11-22',time:'18:00',
  startsAt:Date.parse('2030-11-22T12:30:00Z'),registered:0,capacity:12,price:250,pendingCount:0 };

test('organizer dashboard separates creation and profile editing from the event list', () => {
  const html = organizerDashboardMarkup([]);
  assert.match(html, /href="\/host\/new" aria-label="Create event"/);
  assert.match(html, /href="\/host\/profile" aria-label="Edit organizer profile"/);
  assert.match(html, /Minimalism is good/);
  assert.match(html, /Host your first tournament now/);
  assert.doesNotMatch(html, /<form|<fieldset|<textarea/);
});

test('event cards contain participants access and an anchored menu without changing the card layout', () => {
  const html = organizerEventCard(event);
  assert.match(html, /<details class="organizer-card-actions"/);
  assert.match(html, /class="organizer-card-visual" href="\/event\/club-game"/);
  assert.match(html, /href="\/participants\/club-game"/);
  assert.match(html, /&lt;Club&gt; tournament/);
  assert.doesNotMatch(html, /<dialog|More actions/);
});

test('event menus expose appropriate actions for published, registered, draft and cancelled events', () => {
  const published = organizerMenuMarkup(event);
  assert.match(published, /Copy link/);
  assert.match(published, /View page/);
  assert.match(published, /Return to draft/);
  assert.match(published, /class="danger"/);
  assert.doesNotMatch(organizerMenuMarkup({...event,registered:1}), /Return to draft/);
  const draft = organizerMenuMarkup({...event,status:'draft'});
  assert.match(draft, /Send for review/);
  assert.doesNotMatch(draft, /Copy link|View page|Return to draft/);
  assert.doesNotMatch(organizerMenuMarkup({...event,status:'cancelled'}), /data-studio-action/);
});

test('submission confirmation links to the private editor and home, escaping event content', () => {
  const html = submissionMarkup(event.id,event.title);
  assert.match(html, /href="\/host\/club-game"/);
  assert.match(html, /href="\/">Home/);
  assert.match(html, /&lt;Club&gt; tournament/);
  assert.doesNotMatch(html, /<Club>/);
});
