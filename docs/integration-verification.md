# Mercury integrated patch verification

Verified on 9 November 2026 against repository `bhagyashrimeena/mercury`, base commit `a607481849edd63c0fdf3f286fe582c9b6cd874a`, branch `codex/mercury-mumbai-ux-2026-11-05`.

## Integrated changes

- Game Day booking passes, calendar downloads, venue links and cancellation states.
- My Games loading, retry and concurrent-request resilience.
- Navigation and confirmation-dialog resilience during repeated or interrupted actions.
- Stable OAuth callback URLs, safe return destinations and short-lived return cookies.

The four reviewed patches were applied in that order to a fresh source snapshot. All 188 application, test, configuration, documentation and production-asset files retrieved for the baseline were verified against the GitHub tree's blob SHA. Historical `artifacts/` files were not copied. The original sign-in page's Unicode text and design were retained.

The earlier patch files assumed an additional trailing blank line in `public/styles.css`, `tests/api.test.js` and `README.md`. The consolidated patch resolves this context mismatch and applies directly to the exact remote baseline. It does not require applying the four original patches first.

## Completed checks

- Dependencies installed with Node 24.22.1 and the pinned pnpm 11.25.0 using `npm run install:ci` and the unchanged frozen lockfile. The normal npm registry was used, with Corepack's cache located in the writable scratch workspace. The lockfile's supply-chain policy checks passed.
- `npm run check`: passed.
- `npm test`: all 84 tests passed, including the PostgreSQL/PGlite schema test.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero errors and seven warnings in unchanged or previously warning-bearing code.
- `npm run build`: passed with Next.js 16.3.4, including compilation, TypeScript checks and page generation.

The auth tests execute the actual server action and callback bodies with offline mocks. The navigation, My Games and Game Day tests cover repeated and interrupted flows. These tests do not prove a real Google/Supabase sign-in round trip.

## Remaining verification

The existing local-only Game Day browser rehearsal could not launch Chromium. It stopped before opening a page because the environment denied a required process socket (`Operation not permitted`). No browser scenario or screenshot passed. The denied launch was not retried.

A real browser acceptance test is still required for Google sign-in, mobile layout, navigation, Game Day and My Games. The exact local callback entry `http://localhost:3000/auth/callback` must be verified in the authorized Supabase project before testing localhost OAuth. No Supabase settings, database records, production configuration or credentials were accessed or changed during this integration.

This is a locally verified patch, not a deployed release. Nothing was pushed, merged or deployed. Publishing to the currently public repository requires separate authorization.

This report records the final combined checks and supersedes missing-dependency limitations in the individual patch preparation reports.
