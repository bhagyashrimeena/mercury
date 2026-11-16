// Local-only guidance for organizers submitting an existing event URL.
// Completing these fields is not a publication or ownership approval.
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const present = value => String(value ?? '').trim().length > 0;
const sportPrompts = {
  Badminton: 'Mention singles/doubles categories, partner rules, age or skill eligibility and whether fees are per player or pair.',
  Pickleball: 'Include skill or rating divisions, age categories, partner rules, competition format and the fee unit.',
  Tennis: 'Explain singles/doubles categories, age or rating eligibility, partner requirements and any association ID rules.',
  Running: 'List distances, start times, age requirements, race-kit details and fees for each distance.',
  Chess: 'Include time control, age or rating divisions, federation ID requirements and entry deadlines.'
};
export function organizerSportPrompt(sport) {
  return sportPrompts[sport] ||
    'Explain who can enter, the exact entry fee and unit, key category rules, and where participants register.';
}
export function organizerInformationChecklist(fields = {}) {
  return [
    { label: 'Registration page', present: present(fields.registrationUrl) },
    { label: 'Organizer name and contact', present: present(fields.name) && present(fields.email) },
    { label: 'Event name', present: present(fields.title) },
    { label: 'Sport', present: present(fields.sport) },
    { label: 'Event date', present: present(fields.date) },
    { label: 'Venue or area', present: present(fields.venue) },
    { label: 'Fee and entry unit', present: present(fields.fee) && /(?:per\s+(?:player|person|pair|team|entry|category|distance)|each|free|no fee|₹\s*0\b)/i.test(fields.fee) },
    { label: 'Category / eligibility explanation', present(fields.notes) }
  ];
}
export function organizerGuidanceMarkup(fields = {}) {
  const checklist = organizerInformationChecklist(fields);
  const supplied = checklist.filter(item => item.present).length;
  return '<div class="organizer-clarity">' +
    '<h3>Ready for a useful listing?</h3>' +
    '<p class="organizer-clarity-count" role="status">' + supplied + ' of ' + checklist.length + ' helpful details provided</p>' +
    '<ul class="organizer-clarity-list">' + checklist.map(item =>
      '<li class="' + (item.present ? 'is-supplied' : 'is-missing') + '">' +
      '<span aria-hidden="true">' + (item.present ? '✓' : '○') + '</span>' +
      escapeHtml(item.label) + '</li>').join('') + '</ul>' +
    '<p class="organizer-clarity-sport"><strong>' + escapeHtml(fields.sport || 'Sport-specific tip') + ':</strong> ' +
    escapeHtml(organizerSportPrompt(fields.sport)) + '</p>' +
    '<p class="fine">This is a preparation guide, not a verification score. You can still send a partial request for manual review. Never include private player details here.</p>' +
    '</div>';
}
