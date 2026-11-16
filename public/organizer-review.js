// Read-only triage of public organizer enquiries. Submitted text is untrusted.
// An owner must verify the source and organizer before editing the curated catalogue.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);

export const ORGANIZER_REVIEW_STEPS = Object.freeze([
  { key: 'source', title: 'Confirm official source and registration destination' },
  { key: 'authority', title: 'Confirm organizer identity and authority' },
  { key: 'date', title: 'Check event date, registration deadline and time zone' },
  { key: 'venue', title: 'Verify exact venue and reporting instructions' },
  { key: 'categories', title: 'Verify each category, entry fee and fee unit' },
  { key: 'eligibility', title: 'Check eligibility, partner requirements and restrictions' },
  { key: 'media', title: 'Check image usage rights before including a flyer' },
  { key: 'duplicates', title: 'Search for duplicates and material source conflicts' }
]);
const fields = new Map([
  ['Event / registration URL','url'],
  ['Name','title'], ['Sport','sport'], ['Date','date'], ['Venue','venue'],
  ['Fee and categories','fee'], ['Fee overview','fee'], ['Notes','notes'],
  ['Existing Mercury listing claim','claim'], ['Public flyer URL; rights to verify','flyer']
]);

export function parseOrganizerIntake(message) {
  const raw = String(message ?? '').slice(0, 2000);
  if (!/^EVENT LISTING REQUEST — manual review required(?:\r?\n|$)/.test(raw))
    return null;
  const submitted = {};
  for (const line of raw.split(/\r?\n/).slice(1, 40)) {
    const split = line.indexOf(': ');
    if (split < 0) continue;
    const key = fields.get(line.slice(0,split));
    if (key && !(key in submitted)) submitted[key] = line.slice(split+2).slice(0,500).trim();
  }
  // A claimant may paste arbitrary text; this is a prompt for manual review, NOT a verified status.
  const categoryLines = raw.split(/\r?\n/)
    .filter(line => /^\d{1,2}\.\s/.test(line)).slice(0,6).map(line => line.slice(0,270));
  return { submitted, categoryLines, unverified: true };
}

export function safeOrganizerSourceUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:' || url.username || url.password ||
        !url.hostname.includes('.') ||
        url.hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) ||
        url.hostname.endsWith('.local') || url.hostname.endsWith('.internal')) return null;
    return url.href;
  } catch { return null; }
}

export function organizerReviewNote(checkedKeys = [], title = '') {
  const checked = new Set(checkedKeys);
  const label = String(title || 'Organizer event').slice(0, 65).replace(/[\r\n]+/g,' ');
  return 'Organizer enquiry review — NOT PUBLISHED\n' +
    'Submitted: ' + label + '\n' +
    ORGANIZER_REVIEW_STEPS.map(step => (checked.has(step.key) ? '[x] ' : '[ ] ') + step.title).join('\n') +
    '\nManual evidence and final publication decision still required.';
}

export function organizerReviewMarkup(request) {
  if (request?.category !== 'Organizer enquiry') return '';
  const intake = parseOrganizerIntake(request.message);
  if (!intake) return '<p class="inline-notice">Unrecognized organizer message format. Review the original request manually; do not assume any details are verified.</p>';
  const value = key => intake.submitted[key] && intake.submitted[key] !== 'Not supplied'
    ? intake.submitted[key] : 'Not supplied';
  const url = safeOrganizerSourceUrl(value('url'));
  const hasCategoryFees = intake.categoryLines.length > 0;
  const details = [
    ['Event',value('title')], ['Sport',value('sport')],
    ['Date',value('date')], ['Venue',value('venue')],
    ['Fee summary',value('fee') === 'Not supplied' && hasCategoryFees ?
      'See proposed category fees below (unverified)' : value('fee')],
    ['Existing listing claim (optional)',value('claim')]
  ];
  const missing = details.filter(([k,v])=>v==='Not supplied' &&
    k !== 'Existing listing claim (optional)').map(([k])=>k);
  return '<details class="owner-organizer-review" data-organizer-review>' +
    '<summary>Organizer verification worksheet · no automatic publication</summary>' +
    '<p class="fine"><strong>All submitted details are unverified.</strong> Check the official source and actual organizer authority. Ticking a box only prepares an internal note.</p>' +
    '<dl class="owner-organizer-review-facts">' + details.map(([k,v]) =>
      '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl>' +
    (missing.length ? '<p class="owner-organizer-missing">Missing from submission: ' + esc(missing.join(', ')) + '.</p>' : '') +
    (url ? '<a class="text-link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Inspect submitted HTTPS page (not independently verified) ↗</a>' :
      '<p class="inline-notice">No safe public HTTPS event URL identified. Do not publish until the source is confirmed.</p>') +
    (intake.categoryLines.length ? '<p class="fine">Proposed categories (unverified):</p><ul class="owner-organizer-submitted-categories">' +
      intake.categoryLines.map(line=>'<li>'+esc(line)+'</li>').join('')+'</ul>' : '') +
    '<fieldset class="owner-organizer-review-steps"><legend>Human verification checklist</legend>' +
    ORGANIZER_REVIEW_STEPS.map(step =>
      '<label><input type="checkbox" value="' + esc(step.key) + '" data-owner-review-check>' +
      '<span>' + esc(step.title) + '</span></label>').join('') + '</fieldset>' +
    '<button type="button" class="button outline" data-owner-review-note>Draft internal review note</button>' +
    '<button type="button" class="button outline" data-owner-review-export>Export unpublished catalogue review packet (JSON)</button>' +
    '<p class="fine">A reviewer must independently enter verified facts into the exported JSON and run the offline review gate. Export does not mark anything approved.</p>' +
    '<p class="fine" data-owner-review-result role="status">This does not save a review, resolve the enquiry, change source freshness, or publish an event.</p>' +
    '</details>';
}

export function mountOrganizerReviewWorksheets(main, requests = [], onExport = null) {
  main.querySelectorAll('[data-organizer-review]').forEach(section=>{
    const button = section.querySelector('[data-owner-review-note]');
    const exportButton = section.querySelector('[data-owner-review-export]');
    exportButton?.addEventListener('click', () => {
      const article = section.closest('article');
      const id = article?.querySelector('form[data-support-id]')?.dataset.supportId;
      const request = requests.find(item => item.id === id && item.category === 'Organizer enquiry');
      const status = section.querySelector('[data-owner-review-result]');
      if (!request || typeof onExport !== 'function') {
        if (status) status.textContent = 'Owner review export is currently unavailable.';
        return;
      }
      onExport(request);
      if (status) status.textContent = 'An unpublished review packet was exported locally. Nothing was saved, approved or published.';
    });
    button?.addEventListener('click',()=>{
      const article = section.closest('article');
      const note = article?.querySelector('form[data-support-id] textarea[name="note"]');
      const status = section.querySelector('[data-owner-review-result]');
      if (!note) { if(status) status.textContent='Internal note field unavailable.'; return; }
      const requestTitle = article.querySelector('.owner-organizer-review-facts dd')?.textContent || '';
      const verified = [...section.querySelectorAll('[data-owner-review-check]:checked')].map(i=>i.value);
      const draft = organizerReviewNote(verified,requestTitle);
      note.value = draft.slice(0,1000);
      note.dispatchEvent(new Event('input',{bubbles:true}));
      if(status) status.textContent='Draft inserted into the private note field. Review evidence, then save using the existing Save review action. Event remains unpublished.';
      note.focus();
    });
  });
}
