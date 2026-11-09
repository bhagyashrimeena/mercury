# Game-day pass update

This change keeps Mercury's current visual direction and adds a ticket-style pass with a separate game-day checklist. It does not change pilot access, authentication, payments, live settings, or deployment configuration.

## Product changes

- Clear confirmed, checked-in, started, player-cancelled and organizer-cancelled registration states.
- Add-to-calendar downloads an RFC 5545 `.ics` file with the event start converted from IST to UTC and the actual event duration. It contains the public event URL, not the player name or private pass reference. The UI explains that calendar copies do not update automatically.
- Venue search opens Google Maps using the organizer-provided address, before and during the game. Native event details also include this link. No verified coordinates are invented.
- Copy-reference supports a select-and-copy fallback when the clipboard API is unavailable or denied.
- Pass loading needs only the signed-in session and booking endpoint. Discovery and saved-listing outages no longer block an existing pass.
- Responsive ticket layout uses the existing blue, chalk and lime palette, readable facts, and a game-day checklist.

## Validation

- 54 dependency-free Node 24 tests passed, including 7 game-day tests and the booking-duration/privacy regression.
- `npm run check` passed.
- Independent code review completed. Venue navigation remains available for late arrivals; the live-status region stays accessible while empty.
- Calendar tests cover UTC conversion, duration, Unicode line folding, field-injection escaping, stale/invalid registrations, repeat downloads, clipboard success and denied-permission fallback.
- PostgreSQL schema tests, TypeScript and the Next build require the full dependency-equipped checkout or CI. They were not run in the source snapshot.

## Browser review still required

`scripts/test-game-day.mjs` is an offline Playwright rehearsal using synthetic data only. It checks 320/390/1440px layouts, downloads, clipboard fallback, cancellation dismissal and confirmation, and pass states. It requires Playwright and Chromium; `MERCURY_QA_PLAYWRIGHT` and `MERCURY_QA_CHROMIUM` can specify their local paths.

The executor could not launch Chromium because a required local socket was unavailable. The cloud browser could not reach the isolated preview server and disallowed local-file URLs. No screenshots or browser passes are claimed. Run the rehearsal before treating the design as visually approved.

Hosted sign-in, account authorization and real-device calendar import remain separate pilot checks. No live data was used.
