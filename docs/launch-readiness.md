# Mercury launch readiness — v0.5

Prepared 2 November 2026 as a historical release snapshot. For the current Vercel/Supabase setup, staged signed-out browsing, aggregate owner counts, and latest verification results, use [the deployment guide](vercel-deployment.md) and [the design review index](../artifacts/design-review/README.md). Native Mercury bookings remain free-only; the hosted site remains private until its launch settings are deliberately changed.

## Release checklist

- [x] Real catalogue with source links, last-checked dates, eligibility, fee caveats and deadline states; ended events leave discovery while bookmarks remain addressable.
- [x] Browsing and external registration links require no Mercury account at the application layer. The current Sites audience still restricts visitors.
- [x] Owner can withdraw inaccurate listings immediately, with a reason, from `/admin`; withdrawn listings lose their registration action and sitemap entry.
- [x] Public support form, abuse limits and private owner inbox; correction review and manual response workflow. No automatic support emails or alerts are claimed.
- [x] Versioned adult account notice, terms and privacy pages; no profile is written merely by reading a signed-in session.
- [x] Account-specific JSON export and discovery-account deletion. Accounts with native booking or event history use a support-assisted privacy review.
- [x] Server-side ownership checks, same-origin writes, rate limits, uncached personal responses and basic response security headers.
- [x] Owner-only database snapshot download and tested recovery into a new local SQLite database. Production/provider restoration still needs its own rehearsal.
- [x] Search metadata, canonical URLs, social preview, robots and sitemap controlled by `MERCURY_PUBLIC_LAUNCH`; private deployment remains noindex.
- [x] Tournament JSON import validates identities, dates, required details and public HTTPS links. Source verification is a separate human review.
- [x] 40 automated tests; syntax and TypeScript checks; production build. New schema-only migration applies locally after the two existing migrations.
- [ ] Hosted signed-in smoke test: login handoff, adult notice, save/unsave, correction, account export and owner inbox. Local API tests cannot verify platform identity delivery.
- [ ] Browser/device review: phone and desktop layouts, keyboard navigation, focus/dialog behavior, external links and error states. Managed browser cannot reach the preview (`ERR_CONNECTION_REFUSED` after stale preview lock repair); visual QA is unverified.
- [ ] Owner review of named operator, policy wording and support coverage. These pages describe implementation; they are not a legal compliance certification.
- [ ] Review the incoming tournament list against official sources, check live registration links and recheck existing records immediately before launch.
- [ ] Explicitly choose public access, then set `MERCURY_PUBLIC_LAUNCH=true` and redeploy. This flag controls indexing only; it never changes the Sites audience.
- [ ] Verify a logged-out visitor can browse after public access is enabled, while account and owner operations remain protected.

A custom domain, payments, automatic email/SMS and advanced analytics are not required for the first external-discovery release. Automated uptime/error alerts are not configured; use manual health checks until an alert destination/service is chosen.

## Owner rehearsal

1. Open `/account` signed in as the owner. Review the linked notices and complete account setup yourself.
2. Open a listing, save and unsave it, then refresh to confirm persistence. A correction should reach `/admin` and be resolvable there.
3. Submit a clearly marked test support request at `/support`. Verify its reference in `/admin`, add a note and resolve it. No automatic email should be expected.
4. Temporarily withdraw one listing, verify its direct detail page has no registration action, then restore it. Do this before widening access.
5. Download your own account export. Check that it contains only your account records. Account deletion is optional and destructive; use a separate test account if rehearsing it.
6. Download a private owner backup and verify it locally using the recovery command below. Never put backups in the repository, deployed assets or public links.
7. If native free events will be offered, complete the separate [pilot runbook](pilot-runbook.md), including capacity, cancellation and check-in. Do not publish test events as genuine invitations.

## Daily and weekly operations

**Daily:** inspect `/admin` for open support and corrections; reply from a team-managed mailbox using the supplied email link, record the action and resolve only after handling it. Review `/api/health` and deployment logs after incidents. Aggregate clicks are approximate counts, not unique visitors or confirmed registrations.

**Before launch and weekly:** follow each official source and registration link; verify dates, deadlines, venue, fees, age/eligibility and cancellations. Update `checkedOn` only after an actual recheck. Withdraw doubtful listings immediately. Catalogue source freshness changes after seven days; it is not an assurance of availability.

**Monthly:** review whether resolved requests/corrections can be removed. The owner-triggered housekeeping action deletes resolved support/corrections older than 90 days, click totals older than one year and expired rate buckets. It is not an automatic timer and does not erase account/event histories. Review older backups separately so deleted information does not live indefinitely in retained copies.

## Tournament intake

The user is collecting new listings. Keep their stable IDs and factual source notes. Do not call independent listings partners or verified organizers unless they have actually onboarded.

```sh
node scripts/import-listings.mjs export /absolute/review-copy.json
node scripts/import-listings.mjs check /absolute/review-copy.json
node scripts/import-listings.mjs import /absolute/review-copy.json
npm run check
npm test
npm run typecheck
```

The export is a complete example of the expected JSON shape. Keep existing records in the array to preserve bookmark identities. `deadline` must be null, a real YYYY-MM-DD date, or an exact IST timestamp ending `+05:30`. Record unknown costs/deadlines honestly in the explanatory fields. Structural validation does not establish that an event exists or registration is open. Review the diff and publish through the Sites build workflow after source checks.

## Configuration and release

- `MERCURY_ADMIN_EMAIL`: secret containing the owner account email; compared only with trusted Sites identity. Missing configuration closes owner access and support intake.
- `MERCURY_SITE_ORIGIN`: canonical HTTPS origin; update if attaching a custom domain.
- `MERCURY_PUBLIC_LAUNCH`: currently `false`; only set `true` as part of an approved public release.
- `DB`: managed D1 binding. Apply new schema migrations through Sites publication; never edit applied SQL or seed personal data in migrations.

Use the Sites source workflow to push the exact source commit, build/package it, and deploy that version. Keep the GitHub tree identical to the deployed source tree. A successful deployment is not evidence that browser login, mobile layout or customer registration has been exercised.

## Backup and incident recovery

Download a snapshot from `/admin` before risky data maintenance. Snapshots are limited to 5,000 application rows; use the provider export for larger databases. Rate-limit buckets are intentionally excluded. Store exports privately with restricted access.

```sh
node scripts/restore-backup.mjs /private/mercury-backup.json /private/NEW-recovery.sqlite
```

The recovery tool refuses an existing destination, reconstructs the schema, restores rows transactionally and checks references and SQLite integrity. Automated tests exercise this with synthetic records. It does not restore a production D1 instance.

For an incident: keep the site private or restrict access, identify the failing deployment/log entry, and export current data before data repair. Redeploy a known compatible saved version for a code rollback. Database migrations are not rolled back with code; inspect the live schema first. Arrange and verify provider-side database restoration separately if data recovery is needed. Do not improvise destructive SQL on production.

## Verification limits

The managed preview server starts, but its browser route remains unreachable. Real hosted authentication, phone rendering, keyboard use and the owner's receipt of support requests must still be checked in the owner's browser. No real user accounts were deleted and no support emails or organizer outreach were sent during implementation.
