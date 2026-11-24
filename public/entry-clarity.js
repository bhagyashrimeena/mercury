// A read-only decision guide for source-backed external listings.
// This deliberately does not assert eligibility, payment confirmation, or live seats.
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const restrictedStatuses = new Set(['closed', 'stale', 'started', 'ended', 'withdrawn']);
export function externalEntryFacts(listing, status = { code: 'check' }) {
  const caution = restrictedStatuses.has(status.code) || Boolean(listing.reviewNote);
  return {
    caution,
    status: status.label || 'Entry status needs organizer confirmation',
    facts: [
      { label: 'Who can take part?', value: listing.eligibility || 'Eligibility not specified', note: 'Check the rules for your exact category.' },
      { label: 'What does entry cost?', value: listing.priceLabel || 'Fee not specified', note: listing.priceNote || 'Ask whether the fee is per player, pair, team or category.' },
      { label: 'When does entry close?', value: listing.deadlineLabel || 'Closing time not published', note: 'A listed deadline does not guarantee remaining places.' },
      { label: 'Where is it?', value: listing.venue || 'Exact venue not published', note: listing.reviewNote || 'Confirm your reporting venue and time with the organizer.' }
    ]
  };
}

export function externalEntryGuideMarkup(listing, status = { code: 'check' }) {
  const guide = externalEntryFacts(listing, status);
  const categories = Array.isArray(listing.categories) && listing.categories.length;
  return '<section class="entry-clarity" aria-labelledby="entry-clarity-heading">' +
    '<div class="entry-clarity-intro"><p class="eyebrow blue">BEFORE YOU COMMIT</p>' +
    '<h2 id="entry-clarity-heading">Is this the right event for you?</h2>' +
    '<p>Check these published details before paying or making travel plans. Mercury cannot confirm your eligibility or place in an external event.</p></div>' +
    (guide.caution ? '<p class="entry-clarity-warning" role="status"><strong>Recheck before entering.</strong> ' +
      escapeHtml(guide.status) + (listing.reviewNote ? ' · ' + escapeHtml(listing.reviewNote) : '') + '</p>' : '') +
    '<dl class="entry-clarity-grid">' +
    guide.facts.map(item => '<div class="entry-clarity-fact"><dt>' + escapeHtml(item.label) + '</dt><dd><strong>' +
      escapeHtml(item.value) + '</strong><span>' + escapeHtml(item.note) + '</span></dd></div>').join('') +
    '</dl>' +
    '<p class="entry-clarity-foot">' +
    (categories ? 'Category-specific prices and conditions are listed below when supplied by the source. ' :
      'Category-specific rules may not be available in this listing. ') +
    'Registration and any payment happen with the organizer. Following the link is not a confirmed entry.</p>' +
    '</section>';
}
