# My games: keep confirmed places available

This is a separate, unpublished patch on top of the reviewed game-day-pass changes. It does not replace that patch. The original game-day snapshot is unchanged.

## Verified issue and fix

A successful bookings response was not enough to show My games: either the events or saved-listings service failing replaced the entire dashboard with a timeout page. This was reproduced with synthetic API responses. Direct pass URLs were already resilient after the preceding game-day patch.

My games now renders confirmed registrations, pass links and organizer updates as soon as bookings load. The two bookmark sections load separately. A slow service does not block the other section or the page's navigation/focus lifecycle. A failed section shows an honest error with its own retry, rather than claiming there are no saved games. Retry does not reload bookings or unrelated sections. It keeps a keyboard-focus target and announces the changing region.

Late results from a previous route or a replaced dashboard cannot update the current page. Bookings and authentication remain required; their failures are not disguised as an empty account. No account gate, service setting, database or deployment was changed.

## Validation

- Seven new dependency-free tests cover independent failures, retry recovery, repeated-click deduplication, early pass/update rendering, late responses after navigation, safe text and the required-bookings failure path.
- All 61 dependency-free tests passed, including the existing game-day tests. Syntax checks passed.
- Independent code review approved the focused patch with no blocking findings. The reviewer separately reran all seven new tests and syntax checks. This is code review, not visual or release approval.
- The full PostgreSQL schema suite, TypeScript, lint and Next build were not run. This source snapshot has no installed project dependencies or full application configuration. Run the required aggregate checks in the full checkout before publication.
- Browser screenshots and real layout/focus behavior are unverified. The earlier preview environment could not launch/reach the isolated browser fixture; this change does not claim to resolve that blocker.

## Browser review checklist

Use synthetic test data, not the hosted database:
1. Open My games at phone and desktop widths with a confirmed pass and an organizer update.
2. Delay the events response. Pass and update must appear immediately, and saved external listings must finish independently.
3. Fail each bookmark endpoint in turn. Only its own section should show a retry notice; the pass remains usable.
4. Retry by keyboard and pointer. Check visible focus, accessible announcements and one request per attempt. Recover the endpoint and verify its bookmarks appear.
5. Navigate away while requests are pending; late success or failure must not overwrite the newer page.
6. Fail bookings. The page must show an explicit error rather than a false empty account.

Hosted sign-in/account-isolation checks and real-device calendar import remain separate release gates. No push, commit or deployment was performed.
