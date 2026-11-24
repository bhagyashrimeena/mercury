# Mercury organizer workspace — approved no-sidebar v2

## Implemented

The attached `mercury_organizer_no_sidebar_v2(1).html` is the visual reference, retained as `approved-organizer-v2.html` for review only. It is not deployed as the application. Its fictional accounts, registrations, transactions, partners and campaigns are not imported.

- `/host`: organizer home, dark website header, Home / My events / Services / My requests navigation, three action tiles, counts calculated from owned events, event lineup and next actions.
- `/host/events`: searchable card/table views with sport and lifecycle filters; optional promotion/check-in entry intent.
- `/host/new` and `/host/:eventId`: existing validated, recoverable editor, public preview and server-saved drafts in the new full-width shell. Existing locked-event rules are preserved. External registration stays available through `/list-event`.
- `/host/new?duplicate=:eventId`: prefill an owned event's public details into a new edition. Dates are cleared; attendees, publication state and payment history are never copied. Saving is explicit.
- `/host/event/:eventId`: event overview, contextual horizontal tabs, switch-event control, publication/cancellation actions and actual registration totals.
- `/roster/:eventId`: real attendee search, unchecked-only filter, refresh, check-in and CSV export within the event workspace. `/roster/:eventId?tab=eventday` opens the same live control surface with Event day selected.
- Event Promote and Creative Studio tabs: public-link copying for published events; three editable visual templates and real 1080 × 1350 PNG poster download. Drafts and cancelled events are marked; exports do not publish content or send messages.
- Insights: actual registration status and attendance counts from the authenticated roster.
- `/host/services`: filterable service catalogue and a validated assistance enquiry form submitted to Mercury's existing support inbox.
- `/host/requests`: account-scoped organizer enquiry history and the support team's actual open/resolved status.
- `/host/settings`: existing public organizer-profile editor.
- Signed-out organizers receive an organizer-specific sign-in screen with a return destination. The original consent/authentication process remains authoritative.

## Intentionally unavailable capabilities

The reference's simulated tournament generation/scoring, paid checkout/payout/refund balances, campaign spend/reach/click simulation, sponsor pipeline and vendor bookings have no corresponding production management endpoints in the main website branch. Their relevant sections explain current availability and provide real roster or assistance actions. They do not display simulated success or fabricated data. The separate public-competition branch requires the NextPlay API and is not merged as an unrelated change.

Services are enquiries, not confirmed bookable offerings. There are no invented prices, provider guarantees, automated outreach or automatic email notifications. Requests submitted anonymously elsewhere cannot be attached to an account by matching email.

## Data and safety

No schema change or migration is required. The only new endpoint is `GET /api/organizer/requests`, which uses existing authentication and consent checks and filters `support_requests` by the authenticated user's ID and `Organizer enquiry` category. Its projection excludes internal notes, contact details and other users' records. Existing CSRF/origin checks, owner authorization, rate limits, event revisions and attendee locks remain in place. No attendee records are stored in browser persistence.

## Main files

- `public/organizer-workspace.js`: markup, navigation, filtering, assistance form and poster export.
- `public/organizer-workspace.css`: responsive no-sidebar design, scoped away from public pages.
- `public/live.js`: workspace routing and existing editor/roster integration.
- `app/layout.tsx`: stylesheet loading.
- `server/api.js`: authenticated organizer request history.
- `tests/organizer-workspace.test.js`, `tests/api.test.js`: filters, counts, escaping, bounded briefs and private request access.
- `artifacts/design-review/capture.mjs`, `.github/workflows/ux-browser.yml`: responsive interaction checks and screenshots.

## Validation and running

Use Node 24 and the repository's pinned pnpm version:

```sh
corepack pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm check
pnpm typecheck
pnpm build
```

Local verification: 124 unit tests, syntax checks, typecheck and a webpack production build passed. The normal production build and real-browser workflow also run in GitHub Actions before publication.

Screenshots from the isolated browser workflow contain explicitly synthetic review fixtures and a frozen test date. They show the implemented application, not production inventory or real private participant data. The visual reference is captured at the same widths for comparison. Public live verification is performed after deployment without creating production events or requests.

## Services discovery follow-up

Services now opens with visual goal-based browsing, instant search, an empty-state reset and direct links to event listing and the self-service poster maker. Seven assisted services use a native accessible dialog: service-specific multi-select brief, event/contact details, then a review with explicit contact consent. The page keeps Mercury’s palette and website navigation. District’s public category discovery informed the browse-first structure; no District assets or proprietary organizer behavior are copied.

Requests use the existing authenticated support endpoint and account-scoped history. The dialog preserves edits when moving backwards or reopening during the current page visit, retains input on API failure and blocks duplicate submits while pending. It stores no request/contact data in browser persistence. Enquiries remain subject to availability, scope and quote confirmation. Budget ranges are organizer preferences, not prices.

Validation adds search/category and scoped-brief tests (126 tests total). The existing CI browser harness checks all three steps at 320, 390 and 1440 pixels, keyboard Escape/focus return, editing, consent, event deep links, failed-submit retry, duplicate protection, submitted payload and mobile overflow. CI captures the browse screen and each request step with synthetic review fixtures.
