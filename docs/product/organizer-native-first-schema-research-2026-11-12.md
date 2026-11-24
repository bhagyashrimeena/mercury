# Mercury Organizer Studio — native-first flow and registration schema (research proposal)

**Prepared:** 12 November 2026  
**Status:** Product research and architecture proposal only. No schema migration, booking feature, payments, or production change has been performed.  
**Product principle:** Create an event in minutes; add only the details needed; publish safely; bring players back for the next edition.

## 1. Executive decision

- Make **Create on Mercury** the primary action in For Organizers and Studio.
- Keep **Already have a registration website? Showcase it on Mercury** as a lower-emphasis, accessible alternative.
- The organizer does **not** have to fill out their profile before drafting an event. Pre-fill identity from login when available; verify ownership before publication/management.
- An event is **one public page** containing **one or more registration categories** (e.g., 5K, 10K, 21K; Under 12 Singles; Open Doubles).
- Treat paid Mercury registration as **unavailable** until payment collection, refunds, organizer settlements and webhook reconciliation exist. Existing external checkouts remain supported.
- Fields may be null in a private draft. Publishing must enforce a stricter, documented minimum. On published pages, omit absent optional information rather than rendering a dash, "null", fake "Free", zero places, or a guessed venue.

## 2. Evidence from comparable platforms

| Platform | Observed official behavior | Decision |
| --- | --- | --- |
| Luma | Starts with title, date/time, location, description and cover; advanced ticket types, questions, approval, waitlist and comms on the management page | Create the event before demanding full configuration |
| Eventbrite | Event page, tickets/categories, order form and publish configuration are separate tasks; category-specific or conditional questions supported | Keep registration configuration separate from event narrative |
| Tournify | Distinct divisions with own team/player entries and limits; registrations can include team rosters | Make category/division a first-class model |
| PlayMatches | Indian sports organizer portal offers registration, fixtures, seeding, scoring and results | Model future operations, but do not implement all at launch |
| Race Roster | Event contains sub-events for 5K/10K or fee classes; each can have different questions, rules, teams and pricing | One event ID, multiple registration options |
| Supabase | Client-facing Postgres tables must be protected with row-level security and correctly scoped grants | Keep private registrations and organizer ownership secure |

Sources:
- https://help.luma.com/p/creating-an-event
- https://help.luma.com/p/collect-registration-questions
- https://help.luma.com/p/event-registration-process
- https://www.eventbrite.com/help/en-us/articles/551351/how-to-create-an-event/
- https://www.eventbrite.com/help/en-us/articles/228823/how-to-create-custom-questions-for-attendees/
- https://help.tournifyapp.com/en/articles/8908720-open-an-online-registration-page
- https://help.tournifyapp.com/en/articles/8909431-using-divisions
- https://help.raceroster.com/en-us/knowledge-base/how-to-create-a-sub-event
- https://help.raceroster.com/en-us/knowledge-base/tips-for-taking-an-event-live
- https://playmatches.com/organizer
- https://supabase.com/docs/guides/database/postgres/row-level-security

These are representative, relevant platforms; not a claim that all tournament products were audited.

## 3. Native-first organizer experience

### Entry

For Organizers primary CTA: **Create an event on Mercury**. Secondary: **Already use a registration website? List it here**.

### Fast event creation (save as a real draft)

**Screen A — Create**
1. Event name (can be omitted until first draft save; must be present to publish).
2. Sport (one option).
3. Format (Tournament, League, Community game, Race, Camp, Training; sport-sensitive).
4. When (date or date range; can be null in draft).
5. Where (venue/city; can be null in draft).

Show instant preview on the right at desktop; mobile shows a compact preview beneath the form. The *Create draft* action must work without requiring description, capacity, fee, cancellation paragraphs, profile bio, public email or competitor information.

Start drafting before sign-in if possible (short-lived local temporary state), but **persist to the account before leaving the browser**, and authorize organizer ownership before publishing.

**Screen B — Registration**
- Prefill registration mode to `mercury` (no mandatory mode decision). Show an optional switch to existing website.
- Native: choose `Individual / Pair / Team`, `Free / Paid`, capacity and optional approval / waitlist. Paid is draft-only until supported.
- Create one default free category automatically ("General entry"). Optional **Add another category**, which reveals sport-aware fields.
- External: require a safe verified HTTPS registration URL by publish time; visitors leave Mercury to register and pay; do not create native entries.
- Never show payment collection unless a real gateway and organizer settlement path are approved.

**Screen C — Preview and publish**
- Live polished event page preview.
- A human-readable checklist of the *missing publication blockers* (not missing optional enhancements).
- Suggested non-blocking improvements: upload real cover, add directions, specify eligibility, add rules.
- Publish eligible free event or submit external event for source/ownership review; signed-in organizer permissions are mandatory.

After publishing, dashboard actions: Share link, Copy QR, View registered players, Check in, Duplicate event, Edit safely, Cancel. Analytics cannot claim confirmed external registrations from click-throughs alone.

## 4. Proposed relational schema (target state, not executable migration)

Use existing Mercury Postgres as the baseline. Keep current `events`, `bookings`, `organizers`, auth paths and public catalogue behavior working during migration.

Legend: **R** = required to publish an internally registered free event; **D** = allowed null while in draft; **O** = optional even when published; **F** = future / behind feature flag. All ownership FK columns, primary keys, timestamps and security metadata are always server-defined.

### 4.1 Organizer entity

`organizers` (existing, evolve) — `user_id` (PK/FK), `display_name` (R), `bio` (O nullable), `public_contact_email` (O nullable; explicit opt-in for visibility), `logo_asset_id` (O nullable), `website_url` (O nullable), `verification_status` (private default unverified), `created_at`, `updated_at`.

`organizer_members` (F) — `organizer_id`, `user_id`, `role` (owner/admin/editor/check-in), `created_at`. Only introduced after multi-admin/academies need it; do not block the single-owner v1.

### 4.2 Event page (one parent event)

`events` (evolve) — `id` PK, `owner_user_id` FK, `organizer_id` FK (possibly keep owner ID during transition), `slug` unique, `title` (R, D), `sport_key` (R, D), `format_key` (R, D), `description` (O nullable), `summary` (O nullable), `registration_mode` (`mercury` default / `external`), `visibility` (public/unlisted), `lifecycle_status` (draft/pending_review/published/paused/cancelled/completed), `verification_status` (separate: unverified/under_review/verified), `start_at` timestamptz (R, D), `end_at` timestamptz (O, D), `timezone` (default `Asia/Kolkata` for Mumbai), `primary_venue_id` (R for physical public bookings, D), `external_registration_url` (required only if external mode is published), `registration_opens_at` (O), `registration_closes_at` (O), `published_at` (O), `revision`, `created_at`, `updated_at`.

Keep `source_checked_at` separate from `verified_at`; an accessible source page does not prove organizer endorsement or live availability. Never use `published` to imply `verified`.

`event_venues` — `id`, `event_id`, `name` (O), `address` (O), `area` (O), `city` (O), `lat` (O), `lng` (O), `arrival_instructions` (O). For actual in-person registration, the publish validator must require enough location information to make attendance practical, even if a precise location is disclosed only to approved registrants.

`event_sessions` (F/phase 2) — `id`, `event_id`, `category_id` optional, `starts_at` (nullable until scheduled), `ends_at`, `venue_id`, `label`. Handles multi-day tournaments, multiple time windows and flexible schedules. The single-day v1 only needs event start/end.

### 4.3 Registration category — essential for sports

`event_categories` — `id` PK, `event_id` FK, `name` (R), `entry_unit` enum(`individual`,`pair`,`team`) (R), `capacity_entries` int (R for controlled native free bookings; O if organizer explicitly selects no limit and terms allow), `team_size_min` (O), `team_size_max` (O), `entry_fee_minor` integer (0=free, null=unknown, >0=paid), `currency` default INR, `registration_closes_at` (O), `age_min` (O), `age_max` (O), `level_key` (O), `rating_system` (O e.g. UTR, DUPR, FIDE), `rating_min` (O), `rating_max` (O), `distance_m` (O), `time_control` (O), `timed` boolean nullable, `description` (O), `active` boolean, `sort_order`.

Every native event starts with one `General entry` category unless organizer selects another template. When the organizer wants more categories, show **Add category**, not a giant spreadsheet. Capacity is counted by **entries**, meaning pairs/teams consume one category slot while the participant roster can contain multiple people.

### 4.4 Registration mechanics

`event_registration_settings` — `event_id` PK/FK, `approval_mode` default `auto` (auto/manual), `waitlist_enabled` default false, `registration_window_open_at` (O), `registration_window_close_at` (O), `max_entries_per_account` default 1 where applicable, `confirmation_message` (O), `cancel_policy_text` (O), `waiver_version` (O), `requires_guardian` (F). Settings are event-level; category overrides only when needed.

`registrations` — `id` PK, `event_id` FK, `category_id` FK, `account_user_id` nullable for future guest sign-up, `registrant_email` private (for future non-account flow), `status` enum(`pending`,`confirmed`,`waitlisted`,`declined`,`cancelled`,`checked_in`), `idempotency_key`, `ticket_reference`, `registered_at`, `confirmed_at` (nullable), `cancelled_at` (nullable), `check_in_at` (nullable), `policy_version`, `consent_accepted_at`, `created_at`, `updated_at`. Native free registrations only until payment is implemented. Keep the current booking unique/idempotency guarantees and atomic capacity locking.

`registration_participants` — `id`, `registration_id`, `display_name`, `member_role` (lead/partner/member), `participant_user_id` (nullable), `team_name` (nullable), `club` (nullable), `federation_id` (nullable), `skill_rating` (nullable). Do not require sensitive identifiers or exact date of birth unless explicitly necessary for a particular division. Junior entry requires a distinct guardian-compliance design before enabling native minor registration.

`registration_questions` (phase 2) — `id`, `event_id`, `category_id` nullable, `key`, `label`, `type` enum(text/textarea/single_choice/multi_choice/checkbox/terms), `required`, `options_json` nullable, `sort_order`, `active`. Field values and options must be validated on the server.

`registration_answers` (phase 2) — `registration_id`, `question_id`, `answer_json`, `answered_at`. Do not store arbitrary personal information in event detail JSON or allow custom questions to access other organizer's registrations.

`registration_consents` — `registration_id`, `policy_version`, `accepted_at`, `signer_user_id`, `consent_type` (booking terms, event waiver, separate marketing opt-in). Distinct consents must not be bundled; retention and auditing policy is required.

### 4.5 Discovery, media and auditing

`event_media` — `id`, `event_id`, `kind` (cover/poster/gallery/organizer_logo), `storage_key`, `alt_text` nullable, `rights_status` (pending/reviewed/rejected), `rights_source` nullable, `attribution` nullable, `sort_order`. Never automatically ingest third-party flyer URLs as authorized images. Preview placeholders are design graphics, not claimed event photos.

`event_external_links` — `event_id`, `kind`, `https_url`, `last_checked_at` nullable, `click_count` aggregations; do not model outbound clicks as registrations.

`event_audit_log` — `id`, `event_id`, `actor_user_id`, `action`, `revision_before`, `revision_after`, `created_at`. Protect against changing the time/venue silently after participants sign up.

`event_shares` / `event_assets` (F) — generated flyer/story/QR and campaign attribution, derived from the same event fields; don't require organizers to re-enter details.

`payment_orders`, `payment_transactions`, `refunds`, `organizer_payouts` (F only): **do not enable or expose** until the gateway contract, organizer KYC/settlement responsibilities, refunds, webhook idempotency and reconciliation are approved.

## 5. Optional/NULL rules and public renderer

```js
const hasValue = value =>
  value !== null && value !== undefined &&
  (typeof value !== 'string' || value.trim().length > 0);

// Never use if (entry_fee_minor) — zero means Free and null means unknown.
function feeLabel(amountMinor, currency) {
  if (amountMinor === 0) return 'Free';
  if (amountMinor == null) return null;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency ?? 'INR' })
    .format(amountMinor / 100);
}

const pieces = [
  hasValue(event.venue) ? { label:'Venue', text:event.venue } : null,
  hasValue(event.registration_closes_at) ? { label:'Registration closes', text:format(event.registration_closes_at) } : null,
  hasValue(event.description) ? { label:'About', text:event.description } : null
].filter(Boolean); // only render available sections
```

**Interpretation**: `null` = not provided/unknown; `0` = actually zero/free; `false` = explicitly false; `[]` = no items; `''` in old forms should be normalized to null on write for new optional fields. Blank optional sections are omitted. Never fabricate missing dates, prices, eligibility, statuses or contact details. An essential missing field should block publication and identify the exact missing fact, rather than hide a dangerous omission.

For an **external** event, entry status cannot be confirmed without live provider data; show "Register with organizer" and appropriate source/refresh disclaimers instead of "20 slots left".

## 6. Sport-specific templates (optional and conditional)

- **Tennis:** singles/doubles/mixed, partner joining, level/UTR range, age division, court surface, match format.
- **Badminton:** singles/doubles/mixed, team/pair entries, category, age group, court/venue, feather vs nylon shuttle optionally.
- **Pickleball/Padel:** singles/doubles, DUPR/level range when applicable, pair eligibility, court and categories.
- **Running/walking:** 3K/5K/10K/21K distance categories, timed vs untimed, flag-off/reporting, race kit, bib pickup, venue, hydration/safety information where published.
- **Chess:** classical/rapid/blitz, time control, rating requirements, FIDE/AICF/MCA ID if necessary, number of rounds, event format.
- **Football/team sports:** team size, maximum roster, team-captain details, divisions, match length; one team entry contains multiple participants.
- **Camps/academies:** session dates, age ranges, coach/instructor, prerequisites, capacity, kit/inclusions.

Do not show every sport's fields by default. Pick sport/format first, then add relevant fields only after the initial draft exists.

## 7. Minimum requirements by lifecycle

| Stage | Minimum | Outcome |
| --- | --- | --- |
| Start draft | Signed-in organizer OR short-lived local guest draft, optional title/sport; timestamps and owner set by server after sign-in | Save incomplete draft |
| Event preview | Draft fields only; missing information omitted or clearly signaled in the **editor**, not faked on public page | Private preview |
| Publish native free event | Verified authenticated organizer identity; real title/sport/format/start time/venue; one free category, safe capacity setting, cancellation terms and registration consent; no payment required | Active free registrations |
| Submit external event | Safe organizer URL and contact; manual source/ownership review; publication only after approval | Public showcase with external registration |
| Paid native event | Never until payment infrastructure is available | Stay draft or choose external provider |

An organizer's missing profile bio/photo is **not** a blocker. A missing event date, fee amount for a selected paid category, capacity setting, or contact/meeting information necessary for attendance **can be**.

## 8. Migration strategy for Mercury as it exists

Production uses Next.js/Vercel + Supabase PostgreSQL; the repository's legacy Drizzle `db/schema.ts` is SQLite-shaped, while `supabase/migrations/20261102_initial.sql` is the actual Postgres baseline.

Currently:
- `events` requires one sport, area, venue, date, time, starts_at, capacity, whole-rupee price, level, description, included, bring and cancellation.
- `validateDraft` also requires many details simply to **save** a draft.
- `bookings` is one user, one event, no native pairs/teams/categories; capacity is atomically enforced; native paid publishing is blocked.
- External events exist as a source-backed catalogue, not in the same rows as native organizer events.

**Safe staged migration concept:**
1. Preserve all existing IDs, `events` and `bookings` behavior. Introduce an additive registration-category model with one default category per existing free event. Define versioned server response adapters so old cards and saved bookings continue to work.
2. Introduce fields / relaxed nullable constraints for **drafts only**, while requiring a publish validator to enforce meaningful real-world essentials. Do not relax constraints on published events. Use staged migrations and backfill tested against real-shaped fixture data.
3. Extend registration records to include category/entry units and (later) pairs/teams, while retaining unique idempotency keys, atomic capacity checks, ownership isolation and existing pass behavior. Require client and server validation.
4. Gradually unify external and native discovery around one event identity, with distinct registration modes and external-source provenance. Don't mix click-throughs with confirmed sign-ups.
5. Add optional questions/consents and approved organizer imagery once the core event and division flow is proven.
6. Only then plan native paid ticketing, refunds, reconciliation and payouts.

Security: use server-enforced ownership and PostgreSQL RLS as defense in depth, restrict client role grants, index foreign keys and publish filters, and protect sensitive participant answers. Test organizer A cannot see organizer B's registrations, including through search, exports and media. Supabase's current RLS guidance calls for grants, policies and tests in exposed schemas.

## 9. Operational and quality test plan

**No blank placeholders**: all combinations of null category attributes, missing price, unknown eligibility, date-only drafts, missing images, multi-day events and zero/free prices.

**Builder UX**: first draft with 3–5 fields, back/forward preservation, no login-induced data loss, simple mobile entry, slow network/offline recovery, native default with external escape hatch, repeat previous event.

**Publishing**: fails if a critical event field is missing, free vs paid guard, approval/cancellation states, correct category capacity, protected venue modifications after real sign-ups.

**Registration**: simultaneous final-slot attempts, retry/idempotency, duplicate account/participant, team size, waitlist/approval if enabled, category switching, cancellation and check-in, no paid booking route.

**Privacy**: consent versioning, role isolation, limited retention and deletion/export behavior, age and guardian workflow gate before handling children's data in native registrations. India DPDP Act/Rules are phased; get a qualified India privacy review before collecting junior participant personal data.

**Analytics**: time to first saved draft, completion rate by screen, percentage that publish, number of registration categories used, registration conversion from Mercury, organizer return rate and first repeat event. Never describe external click totals as actual third-party registrations.

## 10. Recommended build sequence

**V1:** native-first landing, allow light draft saving, organizer profile after draft, default free category, clear basic publish checks, authentic event image optionally, publish and share, current free bookings with correct ownership/capacity.

**V1.5:** multiple categories and pair/team entries, optional registration questions and per-category eligibility, organizer roster grouped by category, duplicate last event.

**V2:** waitlist/approval, guest registration with verified email, communications, session scheduling, customizable event promotions/QR.

**V3:** paid checkout/settlements, complex tournament operations, brackets/results, advanced analytics.

**Decision needing a product spike:** whether the current `events` table should be expanded in place or introduced through a versioned compatibility layer while protecting existing booking foreign keys. Prefer additive migration and tests; avoid rewriting bookings during launch preparation.

---

**No production mutation is authorized by this document.** It is an implementation blueprint to validate before any migration or public launch.
