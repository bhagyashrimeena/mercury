# Mercury Explore: remove the generic loading flash

## Root cause

`public/live.js` awaited `GET /api/session` before even beginning the public `GET /api/events` and `GET /api/listings` requests. For internal navigation to `/explore`, `public/app.js` uses client-side routing (no new server HTML fetch); the live router therefore replaced the screen with a full-page generic "Getting your game ready" message until the requests finished.

Hard refreshes do receive server-rendered public event cards in `app/server-fallback.ts`, but client navigation did not have an equivalent immediate experience. The time cost could be small while still visibly flashing because the page was emptied.

## Fix

- Public catalogue data loads independently of account/session setup; the session request runs in parallel and is allowed to fail without preventing browsing.
- On an internal visit from Home, reuse the public `/api/events` and `/api/listings` response already fetched for Home **for at most 30 seconds**. Private sessions, registration passes, support records and organizer information are never cached here.
- On a cold internal navigation, immediately render the Explore heading, search location and compact card-shaped placeholders. Replace them when the public APIs respond. Placeholders never claim a live event or registration.
- On hard refresh, retain the real server-rendered event HTML until public APIs finish; do not replace it with placeholders or a generic loader.
- Route generation checks still prevent delayed responses from overwriting the newer page.
- Never derive event availability from cached status without public API verification beyond the short time-to-live. No auth, database, payments or private-pilot settings change.

## QA

`Mercury UX browser checks` includes real-Chrome tests for both warm Home → Explore navigation and cold How It Works → Explore navigation, deliberately **stalling /api/session** to confirm public discovery does not wait for authentication. Existing Explore filtering, responsive layout, native booking, organizer and handoff checks must also pass.

If production navigation still feels slow, review network waterfall, `/api/events`/listings response time, image CDN and connection conditions separately. A green Vercel build cannot prove a real user's latency, and the tests do not set performance budgets for varied Indian mobile networks.
