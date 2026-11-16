// Downloadable owner-only review packet. This is NOT an approved public listing.
// Applicant-provided data remains unverified, and private contact details are excluded.
import { parseOrganizerIntake } from './organizer-review.js';

export const PUBLICATION_PROPOSAL_SCHEMA = 'mercury.catalogue-proposal.v1';
export const PUBLICATION_REQUIRED_REVIEW = Object.freeze([
  'source', 'authority', 'date', 'venue', 'categories', 'eligibility', 'media', 'duplicates'
]);
export const CATALOGUE_REQUIRED_FIELDS = Object.freeze([
  'id','title','sport','type','area','date','endDate','timeNote','venue','host',
  'eligibility','level','priceLabel','priceNote','description','deadlineLabel',
  'sourceName','sourceUrl','registrationUrl','registrationNote','checkedOn'
]);
const clean = value => String(value ?? '').trim().slice(0, 300);
export function buildUnpublishedCatalogueProposal(request, now = new Date()) {
  if (request?.category !== 'Organizer enquiry') return null;
  const parsed = parseOrganizerIntake(request.message);
  if (!parsed) return null;
  const submitted = parsed.submitted;
  const record = Object.fromEntries(CATALOGUE_REQUIRED_FIELDS.map(key => [key,null]));
  // An unknown deadline must remain null instead of being fabricated.
  record.deadline = null;
  record.categories = [];
  return {
    schema: PUBLICATION_PROPOSAL_SCHEMA,
    state: 'needs_independent_review',
    generatedAt: now.toISOString(),
    sourceRequestId: clean(request.id),
    // Applicant claims are NEVER copied into record; reviewer fills each record field.
    unverifiedSuggestions: {
      eventName: clean(submitted.title),
      sport: clean(submitted.sport),
      date: clean(submitted.date),
      venue: clean(submitted.venue),
      feeOverview: clean(submitted.fee),
      registrationUrl: clean(submitted.url),
      categories: parsed.categoryLines.map(clean)
    },
    review: {
      verifiedBy: null,
      verifiedAt: null,
      officialSourceUrl: null,
      evidenceNotes: null,
      checks: Object.fromEntries(PUBLICATION_REQUIRED_REVIEW.map(key => [key,false]))
    },
    record,
    instructions: [
      'Do not publish this file or paste private support messages into the catalogue.',
      'Check the official source and organizer authority independently.',
      'Enter only verified facts in record; do not copy applicant claims as fact.',
      'Run the offline catalogue proposal reviewer and open a human-reviewed PR.',
      'This file never changes the database, public catalogue, source-check date or support status.'
    ]
  };
}
