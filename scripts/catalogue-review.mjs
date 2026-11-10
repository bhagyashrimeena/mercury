// Report-only quality gate. Never auto-advance checkedOn without checking the organizer.
import { currentListings, indiaDay, listingStatus } from '../public/catalogue.js';

const now = Date.now();
const today = indiaDay(now);
const dayDelta = (date) => Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
const listings = currentListings(now);
const assessed = listings.map((event) => {
  const status = listingStatus(event, now);
  const daysUntil = dayDelta(event.date);
  const priority = event.reviewNote ? 'MANUAL HOLD'
    : status.code === 'stale' ? 'RECHECK'
    : status.code === 'deadline' ? 'DEADLINE TODAY'
    : status.code === 'closed' ? 'ENTRY CLOSED'
    : 'CHECK';
  return { event, status, daysUntil, priority };
}).sort((a, b) => {
  const weight = { 'MANUAL HOLD': 0, 'RECHECK': 1, 'DEADLINE TODAY': 2, 'CHECK': 3, 'ENTRY CLOSED': 4 };
  return weight[a.priority] - weight[b.priority] || a.daysUntil - b.daysUntil || a.event.title.localeCompare(b.event.title);
});

const counts = assessed.reduce((acc, row) => {
  acc[row.priority] = (acc[row.priority] || 0) + 1;
  return acc;
}, {});

console.log('Mercury public catalogue review · ' + today + ' (IST)');
console.log(assessed.length + ' upcoming/future event records · ' +
  (counts['MANUAL HOLD'] || 0) + ' manual holds · ' +
  (counts['RECHECK'] || 0) + ' stale source checks\n');
for (const { event, status, daysUntil, priority } of assessed) {
  const when = daysUntil === 0 ? 'today' : daysUntil > 0 ? 'in ' + daysUntil + 'd' : 'already underway';
  console.log('[' + priority + '] ' + event.title);
  console.log('  ' + event.sport + ' · ' + event.date + ' (' + when + ') · ' + event.area);
  console.log('  Status: ' + status.label + ' · source reviewed: ' + event.checkedOn);
  if (event.reviewNote) console.log('  Warning: ' + event.reviewNote);
  console.log('  Verify: ' + event.sourceUrl);
  console.log('  Registration: ' + event.registrationUrl + '\n');
}
console.log('This report checks the stored metadata only; it does not contact organizers or verify live inventory.');
console.log('Review exact dates, category eligibility, fee units, venue, deadline and registration URL before editing checkedOn.');
