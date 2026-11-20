# Mercury — Mumbai Public Launch Gate Checklist
**Snapshot:** 20 November 2026 · **Current decision: NO-GO** · **Release candidate:** [draft PR #20](https://github.com/bhagyashrimeena/mercury/pull/20) · **Current production main:** `799d227`

**Scope:** Website `https://www.playonmercury.com`, Supabase Mercury (India), external event discovery, free native booking, organizer intake and pilot authentication. The document is a human-controlled release checklist, not authorization to change production.

**Evidence rule:** A gate turns [x] only when it has a date, owner, test environment, artifact/log/screenshot, and the observed pass result. Green CI, a successful Vercel preview or a healthy Supabase project **does not prove production E2E**. Unknown is not pass.

## A. Critical engineering + data safety (P0)
- [ ] **Reconcile the release branch and DB schema.** Identify which commit Vercel actually serves and which Supabase project `SUPABASE_DB_URL` points to (compare project ref without exposing credentials). Inventory migration history, constraints and all payment-era columns. The live DB currently lacks `events.level` and `bookings.level` required by `main`. Record the chosen forward-compatible release.
  - **Pass:** staging clone matches all app queries, `/api/health` returns 200, and create/edit free events and register/check-in/cancel succeed with SQL assertions. **Owner:** Engineering. **Evidence:** ______
- [ ] **Backup and restore before migration.** Record Supabase backup/PITR state, restore a *production-compatible* sanitized copy to a separate instance, run the additive `docs/release/level-columns-repair.sql` only after review, test same event/booking scenarios, repeat the exercise after applying all intended migrations.
  - **Pass:** recovery point and restore steps documented, actual restored data counts/checksums agree and payment-pending records survive. Do not perform a blind live migration. **Owner:** Engineering + DB owner. **Evidence:** ______
- [ ] **Review the existing published paid/test-looking event and pending UPI booking.** Verify organizer ownership, whether a participant or payment is real, public visibility and whether the status requires manual reconciliation; no deletion or status changes without accounting review.
  - **Pass:** inappropriate public promotion is prevented; the pending booking is safely accounted for; paid checkout remains disabled unless independently approved and tested. **Owner:** Product + Payments. **Evidence:** ______
- [ ] **Merge only a reviewed release set.** PR #20 is an isolated safety patch. PRs #14–#19 and #21 have their own dependencies, design/organizer ownership changes and catalogue expiry. Resolve conflicting changes, run `pnpm check && pnpm test && pnpm typecheck && pnpm build`, plus actual browser tests. Protect `main` with required CI and review. 
  - **Pass:** clean reviewed PR, no production migration mismatch, CI and browser green on the final merged commit. **Owner:** Engineering. **Evidence:** ______

## B. User journeys and access control (P0)
- [ ] **Real organizer form → owner inbox E2E in an approved staging environment.** Browse as guest, submit `/list-event`, receive request ID, confirm the exact record in `support_requests` and `/admin/overview` as the owner. Try nonowner access, validation/rate limit, safe retry and notification/response process.
  - **Pass:** one complete persisted request is owner-readable and nonpublic; submission never auto-publishes or sends payments. Synthetic API integration tests alone are insufficient. **Owner:** QA + Product. **Evidence:** ______
- [ ] **Auth and private pilot.** On hosted preview, test Google OAuth and email OTP with real approved test mailboxes; consent + return URL; account restore after logout/login; pilot allowlisted and blocked accounts; guest browsing, privacy and support routes; no open redirect. Use `MERCURY_PUBLIC_LAUNCH=false` for all staging rehearsal.
  - **Pass:** permitted users reach their intended page, denied accounts remain denied, guest Explore and external links work and no private records leak. **Owner:** QA. **Evidence:** ______
- [ ] **Native free booking and save/ownership.** Create/publish a free event under an approved staging organizer, save as player, book, repeat same idempotency key, race the last slot, check pass/roster, cancel, check-in and notification. Verify different users cannot manage another organizer's events or see others' rosters; test pending-payment capacity separately.
  - **Pass:** durable correct state; no oversell, double registration, unauthorized access, fake confirmation or accidental paid path. **Owner:** QA + Engineering. **Evidence:** ______
- [ ] **Support and privacy.** Verify `/support`, `/privacy`, `/terms`, correction reporting, account export/deletion policy, published support contact and owner response coverage before ads/social outreach.
  - **Pass:** every support enquiry has an accountable reviewer and resolution path; privacy claims match actual storage/retention. **Owner:** Operations + Product. **Evidence:** ______

## C. Sports discovery quality (P0)
- [ ] **Source-verified Mumbai/MMR catalogue.** Proposed minimum release policy: >=12 future opportunities, >=5 sports, >=8 source-reviewed within 3 days and not known closed, including >=2 *explicitly free* opportunities across >=2 sports. Run `pnpm launch:catalogue`. These counts are **necessary, not sufficient** for marketing.
- [ ] **Manually inspect each promoted listing.** Save the official source, check date/venue/city/category/fee unit/eligibility/registration deadline, actual organizer landing link, and free-event terms. Confirm no duplicate editions, outdated early-bird claims or past event ads. A URL returning 200 is NOT evidence of available places.
- [ ] **Fix/hold known listings.** Corrected Mumbai Pickleball Cup S3 information is in PR #20 but not live. Recheck Ninjas Championship venue conflict; do not promote it as verified without organizer confirmation. PR #14's earlier free entries are mostly expired and must not be blindly merged.
- [ ] **Do not invent confirmations.** External checkout occurs on organizer sites; clicks/saves are not tickets. Native bookings require durable confirmed status. Only human-verified source evidence may update `checkedOn`.
  - **Pass:** documented dated audit sheet per promoted event and real working organizer destination, no stale/closed entries marketed as open. **Owner:** Content + QA. **Evidence:** ______

## D. Live quality, operations and rollback (P0)
- [ ] **Production domain read-only smoke.** Check homepage, `/explore`, `/list-event`, support/privacy and `/api/health` on *official domain* plus redirects and assets. Run `pnpm production:smoke` after deploy. Prior independent access failed; that is not evidence of an outage or success.
- [ ] **Mobile / accessibility / performance.** Real-device or browser at 320, 390, 768, 1440 widths; keyboard-only navigation; accessible form errors and focus; CTA contrast; no horizontal overflow; lazy image fallback; successful sign-in/booking as above. Record Core Web Vitals on deployed pages (LCP <=2.5s, CLS <=0.1, INP <=200ms as targets).
- [ ] **Security and monitoring.** No database/service-role credentials in the browser, no cross-account reads, rate limiting, safe CORS/origin, sanitized error logs, Supabase security/performance advisor review, Vercel error/health monitoring, named support on-call and rollback operator.
- [ ] **Rollback rehearsal.** Verify reversible flag configuration, previous known-good deployment ID and tested restoration method; distinguish code rollback from irreversible DB rollback. Never drop or overwrite payment data to return to a legacy release.
  - **Pass:** executable documented recovery (with evidence) and named person who can perform it. **Owner:** Engineering + Operations. **Evidence:** ______

## E. Controlled release sequence — do these only after A–D pass
- [ ] Engineering + Product explicitly sign off this checklist with final commit, schema version, staging evidence, catalogue audit date and rollback plan.
- [ ] Merge reviewed release PRs to `main` and deploy with `MERCURY_PUBLIC_LAUNCH` still **false**.
- [ ] Validate production `/api/health`, browser smoke, monitoring, content and source links without unauthorized writes.
- [ ] Receive explicit owner go-live approval to enable `MERCURY_PUBLIC_LAUNCH` and move from private pilot to public access.
- [ ] Enable controlled public release; repeat smoke, auth, browse/CTA and support checks. Begin Mumbai marketing **only** after the live release is proven healthy.
- [ ] Monitor error rate, auth errors, organizer intake, broken outgoing links, bookings and support queue; pause marketing / revert public-access flag if critical gates regress.

### Current observed evidence (20 Nov 2026)
- Draft PR #20: code CI and isolated browser CI passed on its earlier head; production `main` remains at `799d227`.
- Supabase project is healthy but lacks required `events.level` and `bookings.level`. One paid event remains published and one booking remains pending.
- No real organizer enquiry is stored. Tests can establish architecture, but do not replace hosted staging acceptance.
- Existing catalogue does not meet free/freshness release criteria. PR #14 has 38 records but three of four explicitly free items ended 14–15 Nov.
- Direct public-domain retrieval was not available in the checking environment; hosted availability, accessibility, and Core Web Vitals remain unproven.

**NO-GO until all P0 gates pass. Never treat this checklist or passing isolated CI as a launch-ready declaration.**
