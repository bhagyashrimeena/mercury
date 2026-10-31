# Mercury v0.3 verification

## Automated checks

- Syntax checks passed for the browser modules and server API.
- 26 Node tests passed, including ten SQLite-backed API integration tests using the generated migration.
- TypeScript check passed.
- Production Vinext build passed, including the final build after all application changes.
- All twelve local D1 migration statements applied successfully.

The API tests cover authentication, cross-origin writes, organizer ownership, private drafts, free publication, blocking paid publication, consent, stale revisions, event start deadlines, concurrent capacity requests, duplicate retries, one active booking per player/event, cancellation releasing places, check-in ownership/idempotency, event cancellation propagation, and account isolation for saved events and notifications. Twelve simultaneous player requests for a two-place event produced exactly two registrations and ten rejections.

These tests use SQLite with a D1-compatible adapter and transaction semantics. They do not exercise Cloudflare's distributed infrastructure or Sites' login redirects.

## Browser checks

- The actual managed preview served the homepage, live discovery and empty database state through the API.
- Account-dependent pages offered sign-in when no authenticated identity was present.
- A temporary, clearly marked UI fixture exercised the organizer edit/save → publish → event detail → free registration → account pass → roster → check-in screens. These were synthetic browser responses, separate from API integration tests, not authenticated production bookings.
- At a 390px iframe width, organizer and event content fit without horizontal overflow; mobile navigation and the sticky registration action remained accessible. The registration screen opened from that action.
- Temporary fixture files are removed before packaging. No fixture records are seeded in hosted D1.

## Limits

The private hosted site requires the owner's authenticated ChatGPT session, which the agent browser did not have. A full hosted login/account smoke test remains pending. Site access stays owner-private. Test coverage does not establish readiness for public ticket sales or verified venue availability.
