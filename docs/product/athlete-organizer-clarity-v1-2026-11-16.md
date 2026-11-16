# Mercury athlete + organizer clarity slice (PR #18)

Date: 2026-11-16  
Base: `main` at `799d2270`  
Work branch: `feat/mercury-entry-clarity-2026-11-16`  
Release status: **draft only; no production merge or deployment**

## Product outcomes

This is a bounded improvement based on the November 2026 Mercury organizer/athlete research. The objective is to help athletes evaluate an external event before leaving Mercury, make public event submissions more complete without forcing a new payment system, and avoid abandoning athletes when a narrow search has no matches.

Mercury is a sports discovery and event marketplace, **not a provider of live seats for third-party tournaments**. Search results, entry links and saved events must not claim a confirmed external booking.

### Athlete: informed entry

- The external event page now displays a concise decision guide: eligibility, fee **including the published unit/caveat**, entry deadline, and venue, preserving the existing organizer/source copy.
- Missing facts are explicitly described as unpublished; we never infer age suitability, current availability, guaranteed matches or registration completion.
- Review-held or stale source pages display recheck warnings. HTML is escaped.
- This is a guide only, not automated eligibility adjudication.
- Payment and registration still occur with the third-party organizer; Mercury's native free booking flow is separate.

### Athlete: no matching results

- When Explore is empty, show up to three specific changes that return **real catalogue records**, when any exist: relax area, date, keywords, entry status, fee, format, or level.
- Preserve the chosen sport for all proposed changes; never silently change badminton to cricket, for example.
- Distinguish a public listing from a confirmed, bookable place.
- Always offer a clear reset, even when no wider search yields results.
- No new alerts, accounts, lead capture, or personal search analytics are introduced.

### Organizer: better event submissions

- `/list-event` retains the existing public link-first approach and manual review. The checklist updates locally as the form changes and shows the difference between an empty fee and a fee with a unit.
- Sport tips help hosts specify doubles partners, skill or age rules, race distance, chess time control, etc.
- A partial application can still be sent; a completion checklist is not an approval, verification score, or live listing.
- No new personally identifiable fields, automatic organizer messaging, or server-side URL retrieval are added.

### Source correction case

The `mumbai-pickleball-cup-s3` record was reviewed against the official event site on 2026-11-16. The site reports AT Arena, Borivali West for Season 3, whereas the repository contained Stratum Play, Malad West (Season 2). The corrected venue and fee schedule are source-derived and checkedOn was advanced **only after manual review**. Verify the source again before production launch, especially if event terms change.

## Coordination with Aadish and pending PRs

- Aadish is building auth, native registration and payments on `aadish/improv`. **Do not overwrite or merge those changes as part of this work.**
- PR #16 also modifies organizer landing/Studio hierarchy. The only overlapping files here are public UI modules; resolve any merge carefully.
- No changes to Supabase migrations, payment handling, secrets, organizer rosters, account access rules, production flags, or messaging.
- When merging Aadish's branch first, rebase or cherry-pick the three independent modules and deliberately reintegrate UI callsites. Run full tests.

## Quality gates

1. `pnpm check && pnpm test && pnpm typecheck && pnpm build`
2. Real Chrome: 320/390/768/1440px, mobile sticky handoff, date/area and fee filters, no-results actions, keyboard navigation and text contrast.
3. Third-party listing with explicit fee unit, unknown fee, no categories, stale source, event closed, event with conflicting venue.
4. Public organizer flow, with and without sports details; check progress changes without submission, and verify moderated submission to a mocked endpoint.
5. Native free booking, sign-in return paths, My Games, organizer ownership and check-in regression smoke.
6. Before any public release, recheck all externally sourced venue/fee/eligibility/deadline information. A green build is not a live-organizer verification.

## Future work (not implemented here)

- Verified category/eligibility rules in typed data, including three-state eligible/ineligible/unknown handling.
- Explicit opt-in notifications for unmet athlete searches.
- Organizer-owned registration lifecycle, category rosters, refunds, or actual paid conversion reporting.
- Appropriate aggregate experiment design before monetization or demand forecasting.

Key principle: **Reliable sports information and a usable decision beat a fabricated conversion metric or an elaborate agent dashboard.**


## Increment 3: source-published category comparison (2026-11-16)

### Why

The initial external catalogue supports category-specific fee and notes only for certain source-backed events; the Rotary Queen City Half Marathon has four distinct race distances with different published fees and age notes. A player should be able to scan and compare those divisions before leaving for the organizer's registration page. This is **not category selection at checkout**.

### Behavior

- When `listing.categories` contains actual published rows, render accessible radio choices and a live read-only detail panel. Selection shows the source's category name, fee and notes, with a persistent 'organizer confirms eligibility' caveat.
- A listing without published categories behaves as before: no invented rows, costs, age groups or match guarantees.
- Free-text notes (e.g. "Age 12+") are displayed verbatim, escaped for HTML safety, **never parsed into a player eligibility decision**.
- Changing the highlighted category never changes the official registration link, never preselects a category with a third party and never writes a registration.
- The detail panel uses text-only DOM updates, scoped labels and a polite live region. Touch targets, keyboard radio access and narrow-screen layout are covered.

### Future structured rules contract — no migration and no live use

`categoryRuleAssessment(category, athlete, asOf)` is a pure testable evaluator with outcomes:

- `unknown`: missing, incomplete, stale or unreviewed source rules; required athlete information not supplied; invalid age/rating/partner condition.
- `not-matched`: a *reviewed* numeric age/rating or boolean partner condition is contradicted by supplied player data.
- `matches-checked-rules`: only the explicitly reviewed and complete known checks match; this does **not** confirm official eligibility or event entry.

A rules record must be explicitly `reviewed: true`, `complete: true`, tied to a valid HTTPS source URL, and checked within the freshness window. These flags are manual review contracts, not auto-generated AI approvals. Mercury's current public categories do **not** contain reviewed structured rules, so this evaluator returns `unknown` for current records.

Player ratings must specify their rating system; DUPR and UTR values are not interchangeable. The present evaluation is not a legal or sanctioned-event eligibility authority. The native organizer registration data model should eventually own real category eligibility and capacity; coordinate with Aadish's work and PR #17 before adding migrations.

### Verification

`tests/category-comparison.test.js` covers the four published Rotary categories, escaping of untrusted content, unknown/missing categories, fail-closed rule validation, age/partner mismatches, rating-system matching and absence of guaranteed booking claims. Real Chrome adds a phone and desktop flow selecting 10K after 2.5K and checking that the published fee, age note and organizer caveat update correctly.

The website's source data is still curated and may be out of date. This comparison must not be presented as live organizer availability, federation-sanctioned eligibility or a confirmed registration.


## Increment 4: optional organizer category drafts — read-only bridge, not registration (2026-11-16)

### The interim organizer-to-athlete information contract

The public \`/list-event\` route now lets external organizers describe up to six optional categories without creating an organizer account or migrating payments.

\`\`\`mermaid
flowchart TD
  A[Organizer enters official event URL] --> B[Optional category draft editor]
  B --> C[Local unpublished preview]
  C --> D{Valid entered details?}
  D -- No --> B
  D -- Yes --> E[Existing support intake request]
  E --> F[Manual source and organizer review]
  F --> G{Approved for publication?}
  G -- No --> H[Request correction or decline]
  G -- Yes --> I[Reviewed curated category rows]
  I --> J[Athlete reads category comparison]
  J --> K[Organizer's external registration system]
\`\`\`

This bridge is **not a registration system** and **does not auto-publish categories**:

1. Organizer enters category name (e.g. Open Doubles, 10K), exact stated fee or explicit fee uncertainty, and fee unit \`player | pair | team | category | distance\`. Optional notes describe published eligibility or format.
2. A local preview reflects the inputs. If the organizer started a category, all required row fields must be complete, but the entire category section remains optional for simple events.
3. Invalid or ambiguous rows block intake with actionable errors rather than silently dropping details. The source checkout URL remains unchanged.
4. Category entries are appended to the existing **manual-review support request**, clearly marked UNVERIFIED. No new table, credentials, payment integration or data publication is introduced.
5. After independent source review, a human may add approved \`name, fee, notes\` rows to the existing curated listing pipeline. **No automatic transfer of the request into a live event.**
6. Athlete event pages display the exact reviewed category fee and notes. Selecting one does not reserve a place or assert age, rating or official eligibility.

### Safeguards and limitations

- No more than six categories or 150 characters of notes per row; fee unit is explicitly required for any entered row. "Fee to confirm" is not rendered as "Free".
- The published fee string keeps its currency (INR, EUR, GBP, USD, etc.); no automatic currency conversion or guessing.
- If the organizer types "per pair" into both the fee field and fee unit selector, intake asks them to correct the ambiguity.
- HTML input is treated as data, escaped for previews and never executed. Reviewer text is human-untrusted, not an instruction to autonomous agents.
- The existing 2,000-character support message limit still applies; excessively long combinations must be shortened before submission.
- The existing no-login event submission, manual claim/ownership check, roster privacy, native free booking, and Aadish's paid-registration work are not altered.
- Minor/guardian requirements are not validated here. The organizer's official published rules and appropriate guardian processes remain authoritative.
- Existing authenticated organizer Studio does not yet have a normalized category editor; this public intake is intentionally independent of its database migrations.

### Integration gate with Aadish

Aadish's \`aadish/improv\` branch contains native registration, payments, and Studio changes. **Do not make the public intake field set authoritative over those systems.** When his category schema is ready, map reviewed external category rows and native categories into a common *read-only display adapter* with explicit provenance; do not mutate paid checkout behavior or copy private registrations into a public catalogue.

### QA

- \`tests/organizer-category-draft.test.js\`: unit preservation, free-versus-unknown, invalid partial rows, six-category limit, duplicate category detection, optional no-category submission, and manual-review-only request serialization.
- Browser: existing public event submission with category builder; deliberately omit fee unit and assert the request is blocked; then select the unit, verify local preview and complete mocked review intake.
- Re-test \`/list-event?claim=<id>\` prefill and no-login path, plus phone/tablet/desktop overflow.


## Increment 5: shared, read-only category contract (2026-11-16)

This increment deliberately avoids migrating the database or creating a second owned-registration system. It centralizes the presentation agreement between optional external-organizer submissions and curated athlete-facing categories in `public/category-contract.js`.

**Shared display fields:** `name`, the exact published `fee` label, `notes`, explicit `entryUnit` when known (`player | pair | team | category | distance`), `feeKind` (`free | unknown | quoted`), `unitConflict`, and `reviewStatus` (`unverified-submission | source-displayed`). None is a paid booking confirmation or independently validated organizer identity.

- Legacy category rows with only `name/fee/notes` still display exactly as published. Mercury **does not infer** that a running event fee is per distance or a doubles fee is per pair just because of the category name.
- Explicit units from an organizer's reviewed fee text or structured field can be recognized. If the two disagree, Mercury marks the unit unknown and tells the athlete to confirm with the organizer.
- When no unit was recorded, the athlete view explicitly states that it is not specified. A quoted price is not a checkout total.
- Category drafts preserve a structured `entryUnit` for future integrations, but carry `reviewStatus: 'unverified-submission'`. Such rows are excluded from the athlete comparison until independent manual source review creates public catalogue rows.
- The owner intake text retains the human-readable fee and an `[entry_unit=pair]`-style key for later controlled import, while explicitly stating that every item is unverified. It is not an auto-import or event publication API.
- Existing private organizer rosters, authenticated Studio data, participant payments and the external provider registration link are unchanged.
- Currency-code entries require a concrete amount rather than accepting a bare `₹` or `USD`; the separate `Fee to confirm` state remains supported.

**Acceptance and verification:** unit tests cover legacy records, missing/known/conflicting units, free versus unknown fees, unverified draft exclusion, and source-incomplete eligibility. The real browser suite checks that an external event explicitly shows an unknown fee unit, and that an organizer's optional 10K category and structured unit reach the existing mocked manual-review request. Until a normalized native category backend is deliberately adopted, this contract remains a read-only adapter.

**Integration policy:** Only one future backend should own native category registrations. Do not treat a plain-text organizer request as a verified, published category; do not infer entry units or eligibility using an AI model without source review.


## Increment 6: editable sport-aware category starters

Public external-organizer intake now offers optional category-name suggestions based on the selected sport: singles/doubles for tennis, badminton and pickleball; distances for running; time-control-based chess groups. They are **editable starting points, not endorsed event rules**.

- No competition category is added automatically simply because a sport is selected. The organizer explicitly chooses **Add suggested category** or **Add custom category**.
- Suggestions prefill **only category name and unit**. They do **not** prefill entry fees, availability, age eligibility, timings, federation rules or a registration link.
- Organizers must still supply a real fee or an explicit unknown-fee state. Partially entered rows block submission with a clear error, while skipping the entire optional category section remains supported.
- Switching the sport after adding categories does not silently delete organizer-entered rows. Duplicated category names are rejected, and no more than six rows can be submitted.
- This experience remains on `/list-event` for existing external registration URLs; it does not create a native category, registration, organizer payout, or production event.

**Test coverage:** source-tested preset definitions contain no invented fees or rules; real-Chrome flow selects Running → 10K, verifies that name and unit are filled while fee remains blank, blocks an incomplete request, then confirms the completed fee and reviewer-only submission path.


## Increment 7: owner-only organizer submission verification worksheet

The existing public \`/list-event\` flow sends organizer requests into the private support inbox. The owner formerly saw raw messages, with no structured review workflow. This increment adds a **read-only triage worksheet** to **Organizer enquiry** cards in the existing \`/admin\` owner desk.

### The human review workflow

\`\`\`mermaid
flowchart TD
  A[Organizer submits event link and optional categories] --> B[Existing rate-limited support inbox]
  B --> C[Owner-only verification worksheet]
  C --> D[Source, organizer authority, venue, date, fees, rules, media and duplicate review]
  D --> E[Draft internal note - NOT PUBLISHED]
  E --> F[Owner checks evidence and chooses Save review]
  F --> G{Independent source and permission verification complete?}
  G -- No --> H[Leave open / contact submitter / decline]
  G -- Yes --> I[Prepare reviewed catalogue change separately]
  I --> J[Run structural and source checks plus human approval]
  J --> K[Manual code review / merge / release]
\`\`\`

The worksheet parses the **untrusted submitted message** only to display a suggested summary. It never converts a submitted URL or a checkbox into verified facts. The organizer's authority must be checked independently. A safe-looking HTTPS link is not evidence of organizer ownership or site trust.

The eight human-only checks cover official source and registration destination, organizer authority, event dates/deadline, venue, category fees and units, eligibility rules, image usage rights, and duplicates or source conflicts. All checkboxes begin unchecked; the **Draft internal review note** control only inserts an editable note into the existing private form. It does not save the note, resolve the request, update source-check timestamps, publish an event, upload imagery, or grant permissions.

**No new database migration or publication endpoint was added.** The actual approved catalogue remains source-controlled in \`public/catalogue-data.js\` and imports remain subject to \`server/catalogue-validation.js\` plus manual source review. Current admin status values are only \`open\` and \`resolved\`; they do not mean published.

### Security and privacy

- The request remains private in the owner desk. No participant contact lists or sensitive eligibility details are ingested.
- All submitted fields are escaped before insertion into the owner UI; untrusted event URLs are restricted to public-looking HTTPS URLs before rendering an optional link.
- Claimed ownership, pasted descriptions of approval, and proposed categories are **always treated as unverified claims**.
- An existing listing claim is optional, not a required field. Category-specific fee rows can satisfy the fee summary without forcing duplicate prices.
- This UI is triage, not a guarantee of a safe arbitrary external website. Never fetch arbitrary submitted URLs on the server or let AI agents act on their contents as instructions.
- Use the existing support-request retention, authenticated owner gate, and internal note limits.

### Verification

\`tests/organizer-review.test.js\` covers parsing, default-unverified state, optional claims, missing fields, safe link rendering, HTML escaping, tampered input and checklists that do not auto-approve. The Chrome owner fixture uses a synthetic organizer enquiry; it opens the worksheet, drafts a note, verifies unchecked tasks remain visible, confirms the request stays \`open\`, and checks mobile width.

**Not implemented:** event publication from the admin UI, native organizer verification, image-rights licensing automation, payment processing, duplicate-detection automation, or real organizer notifications. These require a separate audited backend design and approval gate.


## Increment 8: safe next-edition preparation (structure only)

A public event detail page now offers an optional **Hosting a new edition? Start with this event's category structure** link to \`/list-event?template=<public-listing-id>\`.

It is a **new external event submission**, not a renewal or proof that the applicant controls the old listing. The official event registration page must be newly supplied, and Mercury's owner still checks organizer authority.

The \`newEditionStarter\` adapter copies **only** the existing sport and up to six category *names* and explicitly source-stated entry units, where consistent. Every seeded category begins with no fee and no eligibility notes. The new event title, date, venue, registration URL, deadline, organizer contact, ownership identity, and previous entry fee are **not copied**. Invalid or unknown fee units remain blank. Switching sports does not silently destroy the prepared rows, and entrants may remove or edit every starter category.

Review pipeline stays:
previous public listing → structure-only draft → applicant supplies fresh details and consent → private organizer enquiry → owner verifies source/ownership and event facts → separately reviewed catalogue change. No native registration, direct publication, saved organizer relationship or historical payment transfer occurs.

This deliberately avoids the dangerous failure previously identified in the Mumbai Pickleball Cup Season 2→Season 3 venue conflict. Repeating an event must never blindly copy last edition's venue or fee.

**Verification:** \`tests/repeat-edition.test.js\` covers known source rows, explicit vs conflicting units, blank fees/eligibility, maximum category count, and omitted stale data. A real-Chrome mobile fixture opens the new-edition URL with Rotary's four public categories, asserts only structure is prefilled, and verifies blank contact, title, date, venue, fee and checkout.


## Increment 9: owner export → offline publication proposal gate

The owner review worksheet now has an **Export unpublished catalogue review packet (JSON)** action. It works only for a legitimate, owner-visible \`Organizer enquiry\` request and downloads a local packet using the existing browser download helper. It does not call a publication API, change request status, mutate the database, or send an email.

### Where each piece belongs

- \`public/organizer-publication-proposal.js\`: creates a privacy-minimized, editable draft packet. Applicant-provided event facts stay under \`unverifiedSuggestions\`. The \`record\` for eventual public publication contains null required fields, an empty categories list and a null deadline; the reviewer must independently fill it.
- \`public/organizer-review.js\`: renders owner-only review checklist and export action; the support request is retrieved from the in-memory owner-only admin response. Submission text is untrusted data.
- \`public/service-ui.js\`: uses the existing download helper to export a JSON file; includes no personal email or private contact values.
- \`server/catalogue-proposal-review.js\`: **pure offline validator**, checks source evidence, reviewer identity, reviewed date, all eight human-confirmed tasks, actual catalogue fields, source/checkedOn consistency, category entry units, duplicates and existing records.
- \`scripts/verify-catalogue-proposal.mjs\`: local read-only CLI; it **does not write** to \`public/catalogue-data.js\`, support requests, or the public website.

### Publication preparation journey

\`\`\`mermaid
flowchart TD
  A[External organizer submits request] --> B[Existing private owner support inbox]
  B --> C[Owner exports unpublished review packet]
  C --> D[Human independently checks official source and organizer authority]
  D --> E[Fill verified record and human evidence in JSON]
  E --> F[Offline catalogue proposal validator]
  F -->|Fails| D
  F -->|Structurally valid| G[Open a separate catalogue PR with evidence]
  G --> H[Human source, rights, policy and product review]
  H --> I[Normal CI, browser checks and controlled deployment]
\`\`\`

### Step-by-step owner workflow

1. Sign into the existing Mercury owner desk and find an \`Organizer enquiry\`. The owner worksheet and source link remain private.
2. Inspect the supplied source **without assuming the event URL proves organizer ownership**. Check with the organizer where authorization, categories, fees, images, deadlines or venue are ambiguous.
3. Select **Export unpublished catalogue review packet (JSON)**. No acceptance or publication occurs.
4. Open the packet in a private editor. Read \`unverifiedSuggestions\` as claims only. Enter verified facts under \`record\`, including a unique slug, true event type, Mumbai area, event and end dates, venue, time note, categories, specific fee units, public HTTPS source/registration URLs, source checked-on date, and truthful eligibility.
5. Enter \`review.verifiedBy\`, \`review.verifiedAt\` (real source-check date), \`review.officialSourceUrl\`, and detailed evidence notes. Set each check flag to true **only after real verification**. Set \`state\` to \`reviewed_for_pr\` as a manual workflow marker, not an automatic approval.
6. Run the **read-only** check on the developer's local machine:

\`\`\`sh
node scripts/verify-catalogue-proposal.mjs /absolute/path/to/unpublished-review.json
\`\`\`

7. If a gate fails, correct the underlying verified facts; never change a checkbox merely to satisfy a test. A green result means only *structural readiness for PR review*.
8. Prepare a separate PR updating the source-controlled catalogue using existing review/import procedures. A different authorized person should review the source evidence, identity, media permissions, public eligibility and potential conflicts before merge.
9. Deploy through the normal controlled release process. Never derive live availability, confirmed registrations, payment status or partnership endorsement from an approved listing alone.

### Explicit security constraints

- The exported packet excludes the support contact name/email, raw support text, account identifiers and private review notes. A \`sourceRequestId\` is kept for private audit traceability.
- The review packet is **not an event catalogue format** and must never be committed as public data. A manually completed public \`record\` must be separately reviewed.
- The CLI rejects duplicate IDs and proposals whose official source URL or verified date disagrees with the public record; it also rejects unreviewed categories, mismatched fee units and incomplete human checks.
- Even all-checked boxes plus a technically valid record **do not prove** the organizer is legitimate or that the event will actually happen. Human judgment and source verification remain necessary.
- Source freshness is changed only through an actual recorded human check; the export action never updates \`checkedOn\`.
- This version supports **new catalogue additions only**. Editing an existing listing requires an explicit old/new diff and a separate review path; no silent overwriting or reusing a prior edition's venue/fees.

### Verification

\`tests/catalogue-proposal-review.test.js\` covers PII omission, completely blank unpublished records, duplicate IDs, source/evidence/date checks, reviewed state, reviewer attestation, entry-unit conflicts, unverified category rejection and a fully synthetic structurally valid packet. The Chrome owner fixture intercepts the local download, parses its actual JSON bytes and checks that the exported proposal has no private contact email, no verified facts, no checked boxes, and leaves the organizer support request open.

**Not implemented:** automated event publication, paid native checkout, organizer-ownership grants, AI-written review attestations, remote packet storage, real event availability checks, or a server-side arbitrary-URL scraper. These remain deliberately outside this independent branch's current release gate.
