# Mercury design review captures

Captured from a local production build at `http://localhost:3002` with `MERCURY_PUBLIC_BROWSE=true` and the private-pilot launch flag unchanged. The capture script uses repository catalogue data and explicitly synthetic native events/accounts when the local database is unavailable. These images show UI states, not proof of live registration or Google sign-in.

## Iteration 1: discovery and sign-in

Changed code: `public/app.js`, `public/discovery.js`, `public/assets/mercury-motion.svg`, `app/signin/page.tsx`, `app/auth/callback/route.ts`, `app/[[...path]]/page.tsx`, `app/server-fallback.ts`, `app/layout.tsx`, `app/shell.ts`, `lib/site-config.ts`, `proxy.ts`, `tests/site-config.test.js`, and shared `public/styles.css`. The staged browse flag allows signed-out discovery in a review environment while the public launch flag remains false.

| Screen | Desktop | Phone |
| --- | --- | --- |
| Home | [Full page](home-desktop-full-fixture.png) | [Full page](home-phone-full-fixture.png) |
| Explore | [Full page](explore-desktop-full-fixture.png) | [Full page](explore-phone-full-fixture.png) |
| External listing | [Full page](listing-desktop-full-fixture.png) | [Full page](listing-phone-full-fixture.png) |
| Sign-in with private-pilot access error | [Full page](signin-desktop-full.png) | [Full page](signin-phone-full.png) |

The [missing-configuration sign-in check](signin-configuration-return.json) submits the Google action in a local environment without Supabase credentials, confirms the branded [phone error state](signin-configuration-phone.png), and verifies that the intended listing remains in `return_to`. A second [invalid-URL check](signin-invalid-config-return.json) confirms the proxy keeps sign-in reachable and the callback returns the same contextual error. With that invalid URL, `/account` still redirected to sign-in (307) while staged public `/explore` loaded (200). A deliberately unreachable local Auth endpoint was blocked by automatic approval review, so network failure during code exchange remains unverified. Production Google consent and callback still require access to the hosted project.

Additional states: [Explore loading](explore-loading-phone.png), [empty catalogue](explore-empty-phone.png), [zero filter results](explore-zero-phone-fixture.png), [closed external entry](listing-closed-phone-fixture.png), [withdrawn listing](listing-withdrawn-phone-fixture.png), and [unknown fee](listing-unknown-fee-phone-fixture.png).

The [failed support request](support-failed-phone-fixture.png) demonstrates that a server error leaves the player's name, email, message, and consent choice in place and changes the action to Retry.

## Iteration 2: filters, saved games, and free bookings

Changed code: `public/explore.js`, `public/live.js`, `public/event-detail.js`, `public/service-ui.js`, `public/discovery.js`, `server/api.js`, `server/operations.js`, shared `public/styles.css`, and flow tests in `tests/api.test.js`, `tests/catalogue.test.js`, and `tests/event-detail.test.js`. No native paid checkout was enabled.

[Mobile filters open](explore-phone-filters-open-fixture.png), [filter history](explore-history-phone-fixture.png), [My games on phone](my-games-phone-fixture.png), [My games on desktop](my-games-desktop-fixture.png), [confirmed pass](pass-phone-fixture.png), [full Mercury game](native-full-phone-fixture.png), [cancelled Mercury game](native-cancelled-phone-fixture.png), [full game card](native-full-card-phone.png), [cancelled game card](native-cancelled-card-phone.png), [organizer studio](organizer-studio-phone-fixture.png), [public page preview on phone](organizer-preview-phone-fixture.png), [public page preview on desktop](organizer-preview-desktop-fixture.png), and [phone roster](organizer-roster-phone-fixture.png). The account, booking, native game, and organizer images use synthetic fixtures. Native and demo game views now use Mercury's abstract sports artwork rather than repository photos with undocumented rights; the unused photo files remain in the repository for a later rights decision.

## Iteration 3: responsive and share checks

Changed code and tooling: `app/opengraph-image.tsx`, `public/metrics.js`, `server/metrics.js`, `db/schema.ts`, the additive migration and Drizzle snapshot, `scripts/migrate-postgres.mjs`, `scripts/check-listing-links.mjs`, `package.json`, `.gitignore`, `docs/vercel-deployment.md`, `docs/launch-readiness.md`, `README.md`, `tests/postgres-schema.test.js`, and this review capture set. The new count table and its migration were verified locally and are pending deployment.

[320px Home](home-320-fixture.png), [360px Home](home-360-fixture.png), [320px Explore](explore-320-fixture.png), [360px Explore](explore-360-fixture.png), [tablet Explore](explore-tablet-fixture.png), [320px listing](listing-320-fixture.png), [360px listing](listing-360-fixture.png), and [share preview image](share-preview.png).

The captures reported no horizontal document overflow at 320, 360, 390, 768, or 1440 CSS pixels. Full-page captures show the fixed mobile navigation and sticky action bar at their viewport positions.

Local browser audits: [Home accessibility](home-a11y.json), [Explore accessibility](explore-a11y.json), [listing accessibility](listing-a11y.json), [sign-in accessibility](signin-a11y.json), [organizer preview accessibility](organizer-preview-a11y.json), [desktop dialog keyboard](home-keyboard.json), [mobile filter keyboard](explore-keyboard.json), and [listing correction keyboard](listing-keyboard.json). The accessibility probe checks Chrome's accessible names for controls, image alternatives, form labels, visible targets under 24px, and horizontal overflow. It does not replace a human screen-reader session.

Axe browser reports for [Home](home-axe.json), [Explore](explore-axe.json), [external detail](listing-axe.json), [sign-in](signin-axe.json), [My games](my-games-axe.json), and [organizer preview](organizer-preview-axe.json) now show zero definite rule violations at phone width after fixing the organizer-banner text contrast, Explore filter group semantics, and Explore heading order. [Desktop Home](home-desktop-axe.json), [Explore](explore-desktop-axe.json), [detail](listing-desktop-axe.json), and [sign-in](signin-desktop-axe.json) likewise show zero definite violations. Axe could not calculate contrast for text over artwork and some decorative symbols; those remain a visual review item, not a claim of full WCAG conformance. The text threshold used here follows [W3C's WCAG 2.2 contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum).

Focused browser checks: [Home organizer handoff](home-handoff.json) and [saved-listing organizer handoff](my-games-handoff.json) each dispatched one best-effort click count without holding the link navigation; [full card status](native-full-card.json) and [cancelled card status](native-cancelled-card.json) led to a detail page rather than offering a booking. The Explore status filter now keeps ended and withdrawn listings out of “All upcoming” and separates stale source checks from closed or full entry.

The [owner activity view](owner-activity-phone-fixture.png) uses synthetic aggregate counts to show the 30-day discovery, sign-in, save, and booking funnel. Production counts require the additive `site_metrics` migration; no live database was changed during this review.
The owner correction queue now presents open reports before resolved reports so unresolved listing problems remain visible.

Local cached-browser performance samples: [Home desktop](home-desktop-lab-performance.json), [Home phone](home-phone-lab-performance.json), [Explore desktop](explore-desktop-lab-performance.json), and [Explore phone](explore-phone-lab-performance.json). Reserving the first viewport for server content reduced observed desktop layout shift from roughly 0.14 to below 0.003 in this fixture run. These local samples do not establish field Core Web Vitals or mobile network performance.

## Validation and release decisions

- `pnpm check`, `pnpm typecheck`, `pnpm test` (47 passing), and `pnpm build` passed. The same 47 tests and Next production build also passed under the declared Node 24 runtime (`v24.22.2`). ESLint passed with seven warnings and no errors.
- Local checks covered the private-pilot redirect, staged signed-out browsing, filter URL/back restoration, preview-to-editor input preservation, listing fallback when the database is unavailable, and the distinct external/native actions. Database tests cover booking capacity, cancellation, ownership, support, corrections, and organizer transitions.
- A read-only hosted check on 5 November 2026 found that `https://playonmercury.com/` redirects to `https://www.playonmercury.com/`, where both Home and Explore redirect signed-out visitors to sign-in. The hosted private-pilot gate is still active.
- Live hosted Google OAuth, Supabase data, account ownership, external provider handoff, and end-to-end organizer flows still need a permitted production or staging account. The Supabase connector denied project access during this review.
- Human review is needed for existing sports-photo rights, event facts and source freshness, pilot allowlist membership, and any decision to enable public browsing or public launch. No production flag or new catalogue row was changed here.
- The new `site_metrics` table is an additive migration, verified in local PostgreSQL tests. It has not been applied to the hosted Supabase project; apply it through the deployment runbook before relying on owner activity counts. The server keeps sign-in and bookings working if this optional count table is temporarily unavailable.
- `pnpm links:check` reached all 11 distinct catalogue URLs on 5 November 2026; none returned 404/410. This is a transport check only and leaves source-check dates unchanged.

Use `capture.mjs` with the desired URL and viewport to repeat a capture. Its `fixture*` modes intercept only the local review browser's API requests.
