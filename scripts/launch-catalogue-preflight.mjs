// Read-only launch supply gate. This is NOT an availability, booking or payment check.
// Every passing candidate must still be verified manually against its organizer.
import { fileURLToPath } from 'node:url';
import { listings, indiaDay, listingStatus } from '../public/catalogue.js';
import { validateCatalogue } from '../server/catalogue-validation.js';

export const DEFAULT_MINIMUMS = Object.freeze({
  futureListings: 12,
  sports: 5,
  recentEntryCandidates: 8,
  freeEntryCandidates: 2,
  freeSports: 2,
});
const normalized = text => String(text ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const isDay = text => /^\d{4}-\d{2}-\d{2}$/.test(String(text || ''));
const recentDay = (now, days) => indiaDay(now - days * 86400000);

export function auditCatalogueReadiness({
  records = listings,
  now = Date.now(),
  minimums = DEFAULT_MINIMUMS,
} = {}) {
  const today = indiaDay(now);
  const inspected = validateCatalogue(records, today);
  const future = records.filter(e => isDay(e?.date) && isDay(e?.endDate) && e.date >= today && e.endDate >= today);
  const uniqueDates = new Set();
  const duplicates = [];
  for (const event of future) {
    const identity = [normalized(event.title), event.date, normalized(event.venue)].join('|');
    if (uniqueDates.has(identity)) duplicates.push(event.id);
    uniqueDates.add(identity);
  }
  const freshSince = recentDay(now, 3);
  // "check" means source-backed and not known closed, NOT registration confirmed.
  const recent = future.filter(e => listingStatus(e, now).code === 'check'
    && e.checkedOn >= freshSince && !e.reviewNote);
  const free = recent.filter(e => /^free$/i.test(String(e.priceLabel).trim()));
  const sports = new Set(future.map(e => e.sport));
  const freeSports = new Set(free.map(e => e.sport));
  const gates = [
    { key: 'structure', label: 'Valid dates, fee notes, unique IDs and HTTPS URLs', pass: inspected.valid, actual: inspected.valid ? 'valid' : inspected.errors.slice(0, 10).join('; '), required: 'valid' },
    { key: 'duplicates', label: 'No duplicated title/date/venue across upcoming entries', pass: duplicates.length === 0, actual: duplicates.length, required: 0 },
    { key: 'future', label: 'Enough future-dated opportunities', pass: future.length >= minimums.futureListings, actual: future.length, required: minimums.futureListings },
    { key: 'sports', label: 'Coverage across sports', pass: sports.size >= minimums.sports, actual: sports.size, required: minimums.sports },
    { key: 'fresh', label: 'Recently source-reviewed, entry-possible candidates', pass: recent.length >= minimums.recentEntryCandidates, actual: recent.length, required: minimums.recentEntryCandidates },
    { key: 'free', label: 'Explicitly free, recently reviewed candidates', pass: free.length >= minimums.freeEntryCandidates, actual: free.length, required: minimums.freeEntryCandidates },
    { key: 'free_sports', label: 'Free entry across different sports', pass: freeSports.size >= minimums.freeSports, actual: freeSports.size, required: minimums.freeSports },
  ];
  return {
    checkedAt: new Date(now).toISOString(),
    dateIST: today,
    passed: gates.every(gate => gate.pass),
    gates,
    snapshot: {
      totalRecords: records.length, upcoming: future.length,
      sports: [...sports].sort(), recentlyReviewedCandidates: recent.length,
      freeCandidates: free.length, freeSports: [...freeSports].sort(),
      candidates: recent.map(e => ({ id: e.id, sport: e.sport, checkedOn: e.checkedOn, fee: e.priceLabel })),
      duplicateIds: duplicates,
      staleOrHeld: future.filter(e => !recent.includes(e)).map(e => ({ id: e.id, status: listingStatus(e, now).code })),
    },
    limitation: 'This checks source metadata only, not live registration availability, eligibility, payment, or organizer verification. The release also requires the manual acceptance checklist.',
  };
}
const runDirect = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (runDirect) {
  const result = auditCatalogueReadiness();
  if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else {
    console.log('Mercury catalogue preflight — ' + result.dateIST + ' IST');
    for (const gate of result.gates) console.log((gate.pass ? '[PASS] ' : '[FAIL] ') + gate.label + ': ' + gate.actual + ' (required: ' + gate.required + ')');
    console.log(result.limitation);
  }
  if (!result.passed) process.exitCode = 1;
}
