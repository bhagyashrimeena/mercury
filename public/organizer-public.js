import { findListing } from './catalogue.js';
const LANDING = "<div class=\"page-width organizer-public-page organizer-choices-page\">\n<section class=\"organizer-public-hero\">\n  <div>\n    <p class=\"eyebrow blue\">FOR THE PEOPLE WHO MAKE SPORT HAPPEN</p>\n    <h1>You run the event.<br><em>We help people find it.</em></h1>\n    <p>Whether you already have a registration website or want players to sign up on Mercury, your event deserves to be discovered.</p>\n    <div class=\"organizer-hero-promises\" aria-label=\"How Mercury helps\"><span>Be discovered in Mumbai</span><span>Keep control of your event</span><span>Choose your registration route</span></div>\n  </div>\n  <div class=\"organizer-public-example\" aria-label=\"Illustrative event listing example\">\n    <p class=\"eyebrow\">HOW YOUR EVENT COULD APPEAR · EXAMPLE</p>\n    <span>RUNNING · RACE</span>\n    <h2>Sunday City Run</h2><p>20 Dec · BKC, Mumbai</p><strong>From ₹700</strong>\n    <div class=\"organizer-example-cta\">View event ↗</div>\n    <small>Illustrative design example, not a real tournament or live booking.</small>\n  </div>\n</section>\n<section class=\"organizer-paths-section\" aria-labelledby=\"organizer-choice-title\">\n  <p class=\"eyebrow blue\">PICK YOUR WAY TO PLAY</p>\n  <h2 id=\"organizer-choice-title\">Where should players <em>register?</em></h2>\n  <p class=\"organizer-paths-description\">You choose per event. No need to change the booking system that already works for you.</p>\n  <div class=\"organizer-public-actions organizer-path-grid\">\n    <a class=\"button primary organizer-path-card organizer-path-external\" href=\"/list-event\">\n      <span class=\"organizer-path-top\"><span class=\"organizer-path-number\">01 / SHOWCASE</span><span class=\"organizer-path-symbol\" aria-hidden=\"true\">↗</span></span>\n      <strong>Use my existing website</strong>\n      <span class=\"organizer-path-description\">Already taking entries through a website, Google Form or registration platform? List the event on Mercury and send players to your link.</span>\n      <span class=\"organizer-path-steps\">Submit a link · We review · Players register with you</span>\n      <span class=\"organizer-path-go\">Showcase my event <span aria-hidden=\"true\">↗</span></span>\n    </a>\n    <a class=\"button outline organizer-path-card organizer-path-native\" href=\"/host\">\n      <span class=\"organizer-path-top\"><span class=\"organizer-path-number\">02 / MANAGE</span><span class=\"organizer-path-symbol\" aria-hidden=\"true\">◎</span></span>\n      <strong>Register players on Mercury</strong>\n      <span class=\"organizer-path-description\">Create a free community game, publish available places and manage your player list and check-ins directly in your studio.</span>\n      <span class=\"organizer-path-steps\">Create a profile · Publish a free game · Manage players</span>\n      <span class=\"organizer-path-go\">Open organizer studio <span aria-hidden=\"true\">↗</span></span>\n    </a>\n  </div>\n  <p class=\"fine organizer-availability-note\"><b>Available today:</b> Mercury manages registrations for free adult games only. Paid events may be drafted, but Mercury checkout and organizer payouts are not enabled. External paid events can keep their own checkout. All public listings are subject to review where applicable.</p>\n</section>\n<section class=\"organizer-value\">\n  <p class=\"eyebrow blue\">LESS ADMIN. MORE SPORT.</p><h2>Get discovered without rebuilding everything.</h2>\n  <div class=\"organizer-benefits\">\n    <article><span aria-hidden=\"true\">↗</span><h3>A useful event page</h3><p>Show players dates, venue, eligibility and fees in one place. Event details are reviewed before external listing publication.</p></article>\n    <article><span aria-hidden=\"true\">◉</span><h3>Keep your checkout</h3><p>If registrations already happen elsewhere, your provider stays in charge of registrations, payment and confirmation.</p></article>\n    <article><span aria-hidden=\"true\">◎</span><h3>Track interest, not guesses</h3><p>Mercury records external registration-link clicks, not confirmed third-party sign-ups. Organizer reporting requires verified ownership.</p></article>\n  </div>\n</section>\n<section class=\"organizer-funnel\">\n  <p class=\"eyebrow blue\">HOW IT WORKS</p><h2>Start wherever you are.</h2>\n  <div class=\"organizer-funnel-steps\">\n    <article><b>01</b><h3>Choose your route</h3><p>Showcase an existing event or manage a new free game on Mercury.</p></article>\n    <article><b>02</b><h3>Make it easy to discover</h3><p>Check the event details, dates, category rules and actual registration destination.</p></article>\n    <article><b>03</b><h3>Welcome players</h3><p>External organizers confirm entries themselves; free Mercury bookings appear in the organizer roster.</p></article>\n  </div>\n  <p class=\"fine\">An external submission is a manual review request, not immediate publication. Mercury does not promise a specific number of registrations or a verified external checkout.</p>\n</section>\n<section class=\"organizer-public-bottom\">\n  <div><h2>Already using Mercury Studio?</h2><p>Pick up a draft, publish a free game or check your player list.</p></div>\n  <a href=\"/host\" class=\"button dark\">Open studio <span aria-hidden=\"true\">↗</span></a>\n</section>\n</div>";
const SUBMISSION = "<div class=\"page-width organizer-submission-page\">\n<a class=\"back\" href=\"/for-organizers\">← For organizers</a>\n<header class=\"organizer-submission-intro\"><p class=\"eyebrow blue\">SHARE YOUR EVENT</p><h1>List your <em>event.</em></h1>\n<p>Already taking entries elsewhere? Submit the link. No account or new checkout required to request a listing.</p></header>\n<div class=\"organizer-submission-layout\"><section>\n<form class=\"form-card\" id=\"public-event-submission\">\n<p class=\"organizer-form-kicker\">01 / Start with a link</p>\n<label>Event or registration website *<input name=\"registrationUrl\" type=\"url\" maxlength=\"500\" inputmode=\"url\" autocomplete=\"url\" required placeholder=\"https://your-event-page.com\"></label>\n<div class=\"form-grid\">\n<label>Organizer or club name *<input name=\"name\" type=\"text\" required minlength=\"2\" maxlength=\"80\" autocomplete=\"organization\" placeholder=\"Your organizer name\"></label>\n<label>Contact email *<input name=\"email\" type=\"email\" required maxlength=\"254\" autocomplete=\"email\" placeholder=\"you@club.com\"></label></div>\n<details class=\"submission-extra\" open><summary>Help players decide — event details (recommended)</summary>\n<div class=\"form-grid\">\n<label>Event name<input name=\"title\" maxlength=\"120\" placeholder=\"e.g. Sunday Badminton Open\"></label>\n<label>Sport<select name=\"sport\"><option value=\"\">Choose a sport</option><option>Tennis</option><option>Badminton</option><option>Pickleball</option><option>Running</option><option>Chess</option><option>Other sport</option></select></label>\n<label>Event date<input name=\"date\" type=\"date\"></label>\n<label>Venue / area<input name=\"venue\" maxlength=\"160\" placeholder=\"e.g. Andheri, Mumbai\"></label>\n<label>Category fees<input name=\"fee\" maxlength=\"140\" placeholder=\"e.g. 5K ₹900 · 10K ₹1,100\"></label>\n<label>Public flyer URL (optional)<input name=\"flyerUrl\" maxlength=\"500\" type=\"url\" inputmode=\"url\" placeholder=\"https://your-site.com/flyer.jpg\"></label>\n</div>\n<label>Eligibility and other details<textarea name=\"notes\" rows=\"3\" maxlength=\"380\" placeholder=\"Who can join? Registration deadline? What makes the event special?\"></textarea></label>\n<p class=\"fine\">File uploads aren't enabled yet. A public image link is welcome, but Mercury will review image rights before using it.</p></details>\n<label class=\"support-trap\" aria-hidden=\"true\">Website<input name=\"website\" tabindex=\"-1\" autocomplete=\"off\"></label>\n<label class=\"checkbox organizer-consent\"><input type=\"checkbox\" name=\"consent\" required>\n<span>I'm 18 or older, have permission to share these details, and agree Mercury may contact me about this request.\n<a href=\"/privacy\" target=\"_blank\" rel=\"noopener noreferrer\">Privacy notice</a>.</span></label>\n<p id=\"event-submission-error\" role=\"alert\" tabindex=\"-1\"></p>\n<div class=\"organizer-form-actions\"><button class=\"button primary\" type=\"submit\">Send for review ↗</button><small>No automatic publication or email confirmation.</small></div>\n</form></section>\n<aside class=\"organizer-submission-preview\" aria-label=\"Local preview of event information\">\n<p class=\"eyebrow blue\">LOCAL PREVIEW · NOT PUBLISHED</p><span id=\"submission-preview-sport\">SPORTS EVENT</span>\n<h2 id=\"submission-preview-title\">Your event name</h2><p id=\"submission-preview-meta\">Add a date and location</p>\n<strong id=\"submission-preview-fee\">Fee from organizer</strong><div id=\"submission-preview-link\">Your registration link appears here</div>\n<p class=\"fine\">This preview stays on your device. Sending the form puts your request in Mercury's private review inbox; it doesn't publish it.</p>\n<a href=\"/explore\" class=\"text-link\">Browse example event pages ↗</a></aside></div></div>";
const HOW = "<div class=\"page-width public-how-page\">\n<section class=\"public-how-intro\"><p class=\"eyebrow blue\">LESS PLANNING. MORE PLAY.</p>\n<h1>Find it. Check it. <em>Play it.</em></h1><p>Mercury helps people around Mumbai discover real sports tournaments, races, leagues and free games.</p></section>\n<section class=\"public-how-grid\">\n<article><b>01 / DISCOVER</b><h2>Find your kind of event.</h2><p>Search by sport, area, date and entry fee. Compare opportunities without opening ten tabs.</p><a href=\"/explore\" class=\"text-link\">Explore events ↗</a></article>\n<article><b>02 / DECIDE</b><h2>Check the details.</h2><p>See eligibility, category prices, deadlines and the published source. Illustrative stock photography isn't a photo of that tournament.</p><a href=\"/explore\" class=\"text-link\">Browse event details ↗</a></article>\n<article><b>03 / JOIN</b><h2>Know who confirms entry.</h2><p>External events register with the organizer or their booking provider. Mercury doesn't issue those tickets. Booked free Mercury games appear in My games.</p><a href=\"/my-games\" class=\"text-link\">My games ↗</a></article>\n</section>\n<section class=\"public-how-note\"><div><h2>Organizing a sports event?</h2><p>Submit your existing registration link for review, without switching ticket platforms or creating an account first.</p></div><a href=\"/for-organizers\" class=\"button primary\">For organizers ↗</a></section>\n<p class=\"fine\">Saving an external event is a bookmark, not a registration. Entry availability is confirmed by the organizer. Junior categories follow the organizer's guardian policies; Mercury account holders must be 18+.</p>\n</div>";

export function organizerLandingMarkup() { return LANDING; }
export function eventSubmissionMarkup() { return SUBMISSION; }
export function howItWorksMarkup() { return HOW; }

export function validEventUrl(value) {
  try {
    const raw = String(value || '').trim();
    const url = new URL(raw);
    return raw.length <= 500 && url.protocol === 'https:' &&
      !url.username && !url.password && url.hostname.includes('.') &&
      url.hostname !== 'localhost';
  } catch { return false; }
}

export function buildOrganizerMessage(fields) {
  return [
    'EVENT LISTING REQUEST — manual review required',
    fields.claim ? 'Existing Mercury listing claim: ' + String(fields.claim).slice(0, 100) : '',
    'Event / registration URL: ' + String(fields.registrationUrl || '').trim(),
    'Name: ' + String(fields.title || 'Not supplied').trim(),
    'Sport: ' + String(fields.sport || 'Not supplied').trim(),
    'Date: ' + String(fields.date || 'Not supplied').trim(),
    'Venue: ' + String(fields.venue || 'Not supplied').trim(),
    'Fee and categories: ' + String(fields.fee || 'Not supplied').trim(),
    fields.flyerUrl ? 'Public flyer URL; rights to verify: ' + fields.flyerUrl.trim() : '',
    'Notes: ' + String(fields.notes || 'Not supplied').trim(),
    'Applicant confirms adult consent and permission. Ownership is NOT verified.'
  ].filter(Boolean).join('\n');
}

export function mountEventSubmission(main, { request = fetch, locationObject = location } = {}) {
  const form = main.querySelector('#public-event-submission');
  if (!form) return;
  const search = new URLSearchParams(locationObject.search);
  const claim = findListing(search.get('claim')) || null;
  if (claim) {
    for (const [key, val] of Object.entries({
      registrationUrl: claim.registrationUrl, title: claim.title,
      sport: claim.sport, date: claim.date, venue: claim.venue, fee: claim.priceNote
    })) {
      const input = form.elements.namedItem(key);
      if (input && val) input.value = String(val);
    }
    main.querySelector('.organizer-submission-intro p:last-child').textContent =
      'Want to claim an existing Mercury listing? Review the details and submit them for a manual ownership check.';
  }
  const alert = main.querySelector('#event-submission-error');
  const preview = () => {
    const values = Object.fromEntries(new FormData(form));
    main.querySelector('#submission-preview-title').textContent = values.title || 'Your event name';
    main.querySelector('#submission-preview-sport').textContent = values.sport || 'SPORTS EVENT';
    main.querySelector('#submission-preview-meta').textContent =
      [values.date, values.venue].filter(Boolean).join(' · ') || 'Add a date and location';
    main.querySelector('#submission-preview-fee').textContent = values.fee || 'Fee from organizer';
    main.querySelector('#submission-preview-link').textContent = validEventUrl(values.registrationUrl)
      ? new URL(values.registrationUrl).hostname : 'Your registration link appears here';
  };
  form.addEventListener('input', preview);
  form.addEventListener('change', preview);
  preview();
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const d = Object.fromEntries(new FormData(form));
    if (!validEventUrl(d.registrationUrl) || (d.flyerUrl && !validEventUrl(d.flyerUrl))) {
      alert.textContent = 'Please provide public HTTPS URLs, not private or incomplete links.';
      alert.focus();
      return;
    }
    const message = buildOrganizerMessage({ ...d, claim: claim?.id || '' });
    if (message.length > 2000) {
      alert.textContent = 'Shorten your event notes so the request fits.';
      alert.focus();
      return;
    }
    const button = form.querySelector('button[type=submit]');
    if (button.disabled) return;
    alert.textContent = '';
    button.disabled = true;
    button.textContent = 'Sending…';
    try {
      const response = await request('/api/support', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: d.name.trim(), email: d.email.trim(), category: 'Organizer enquiry',
          message, consent: true, website: d.website || ''
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.id) throw Error(result.error?.message || 'Event submission could not be saved.');
      main.innerHTML = '<div class="page-width organizer-submission-done">' +
        '<p class="eyebrow blue">REQUEST RECEIVED</p><h1>Thanks for bringing <em>sport.</em></h1>' +
        '<p>Your event was sent for manual review. It is not verified or published yet. Mercury can reply to the contact email.</p>' +
        '<div class="organizer-request-ref"><b>Keep your request reference</b><code id="submitted-event-ref"></code></div>' +
        '<p class="fine">No automatic confirmation email is sent. Approval is not guaranteed.</p>' +
        '<a class="button primary" href="/explore">Explore events ↗</a> ' +
        '<a class="button outline" href="/for-organizers">Back to organizers ↗</a></div>';
      main.querySelector('#submitted-event-ref').textContent = result.id;
    } catch (error) {
      alert.textContent = error?.message || 'Could not submit. Please retry.';
      alert.focus();
      button.textContent = 'Send for review ↗';
      button.disabled = false;
    }
  });
}
