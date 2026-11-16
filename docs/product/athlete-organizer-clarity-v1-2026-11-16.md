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
