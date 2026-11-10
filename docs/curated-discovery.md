# Mercury discovery pilot — 1 November 2026

## Release decision

Publish nine researched external listings: eight competitions/leagues and one explicitly labelled training camp. Keep them separate from Mercury-native registrations. No affiliation, organizer verification, live capacity, ticket issuance or successful registration is implied by listing an event. The site remains owner-private.

The catalogue lives in `public/catalogue.js`. Each record includes its exact source, destination, check date, eligibility caveats, fee unit and deadline evidence. Unknown details stay unknown. Category rows are grouped into one event rather than used to inflate inventory. Branded posters and third-party logos were not copied; cards use original Mercury typography and shapes.

## Sources and outreach queue

Research performed 1 November 2026. Public business contacts below were observed in the linked sources. Nothing has been sent. Reconfirm the recipient and address before outreach.

| Priority | Listing / source | Public contact route | Questions before onboarding |
| --- | --- | --- | --- |
| 1 | [Mumbai Pickleball Cup S3](https://www.mumbaipickleballcup.com/) | Contact links on official website | Category availability, future monthly dates, permission to use supplied assets |
| 1 | [BASCH](https://hudle.in/events/basch-pickleball-tournament/976895) | admin@basch.in | Entry units, rating rules, deadline and refund policy |
| 1 | [UCAN](https://ucanracket.in/) | Official website contact route | Available November categories, reporting times, schedule beyond November |
| 2 | [Racket Riders S2](https://www.khelomore.com/events/event-details/racket-riders/racket-riders-badminton-tournament-s2/1940) | KheloMore listing / organizer route | Team size, age divisions, fee unit, deadline |
| 2 | [Ninjas Championship](https://hudle.in/events/ninjas-championship/142692) | kickoffahmedabad@gmail.com | Category list, entry unit, deadline, cancellation policy |
| 2 | [Mumbai Flex League](https://app.utrsports.net/events/404791) | UTR event organizer channel | Court arrangements, entry deadline, membership / age rules |
| 3 | [Bombay Gymkhana circular](https://www.mbasso.in/webfiles/tournament/376-tournament-circular-gmba.pdf) | Official association calendar / circular query contacts | Registration process; resolve inconsistent weekday wording in circular |
| 3 | [MSLTA Masters MT400](https://www.world.tennis/en/tournament/mt400-mumbai/ind/2026/s-mt400-ind-2026-010/) | practennis@yahoo.com | Tour Zone eligibility, entry deadline and fees |
| 3 | [Barcelona Sports Academy camp](https://barcelonasportsacademy.com/en/elevate-your-game-elite-spanish-tennis-training-comes-to-mumbai/) | info@barcelonasportsacademy.com | Remaining capacity, junior requirements, final INR payment and refund terms |

The UTR India directory supplied the flex-league dates, fee range and event link; the event page itself requires client-side access. At the initial 1 November review, UCAN and KheloMore facts came from indexed official listing text whose crawl timestamps preceded the research date. Source checked means researched, not directly confirmed with the organizer. These limitations are why every CTA asks users to check the organizer and no card claims registration is currently open.

All nine records were rechecked on 9 November 2026. The evidence and remaining unknowns are recorded in [the November catalogue review](catalogue-review-2026-11-09.md). Racket Riders needed a rendered browser page because a simple fetch exposed only its client-side shell.

## Held back

- TPL: TenniStation Season 24, Champions Cup Road to 500, MDTA TPL ASA Open. Upcoming dates appeared in the official tournament index, but exact venues, category sets and usable event-specific registration destinations were not established. Obtain fact sheets before publishing. [Source](https://www.tplsport.com/tournaments).
- BSL Edition VI: event occurs later, but its stated 31 October entry deadline has passed. Do not feature it as accepting entries. [Source](https://badmintonshotsleague.com/BSL_VI/index.html).
- TriWorld December 14 and WPBL on Tour: year / calendar context was ambiguous. Exclude until a dated 2026 source is confirmed.
- November 1 events and October tournaments: excluded from the forward-looking seed selection.
- Morning Smash: short-lived social session; held for a future social-play research pass.

## Maintenance procedure

1. Review correction submissions and the events with nearest deadlines first. In Sites database overview, inspect `listing_reports`; use the event slug to locate its source record. Reports are private account-linked records, with one current report per account and listing.
2. Revisit every active source at least weekly and again near its deadline. Update `checkedOn` only after a real check. Record material changes in this document or the commit description.
3. The UI warns after seven days without a new check. That warning is automatic; source research is manual and no recurring task has been scheduled.
4. Exact timestamp deadlines close at the cutoff in IST. Date-only deadlines show “Deadline today” for that date and “passed” the following day, rather than inventing an organizer closing time.
5. Events disappear from discovery after the final date in IST. Their saved detail links remain accessible and say the event has ended. A published cancellation should be removed from active catalogue discovery in a follow-up change; this release has no upstream cancellation feed.
6. Keep source URLs as HTTPS links. Never construct arbitrary redirect destinations from a request. Registration links open directly; click measurement failing cannot block them.

## Outreach approach

Start with the community organizers in priority 1. Explain the existing discovery listing and show its source link. Ask them to confirm details and nominate a business contact. Offer corrections or removal, then ask whether they want to manage future events on Mercury. Obtain their own descriptions and authorized images. Record consent and confirmed facts before adding a partnership badge or switching booking modes.

Use the event’s current organizer link while discussing onboarding. Mercury supports free native registration; paid native checkout is disabled. Do not promise payment collection, automated payouts, email campaigns or SMS.

Track outreach status separately as: not contacted → contact confirmed → contacted → details confirmed → onboarding agreed → event published by organizer. All nine entries currently remain **not contacted**.

## Measurement and review

`listing_clicks` counts outbound registration-link activations by listing and IST date. These are approximate, non-unique clicks and can include retries or automated traffic; they are not ticket sales. No user identifier is stored in this table. `saved_listings` stores account bookmarks, not reservations. Review aggregate interest to choose which organizer to approach first, without sharing player identities.

Before opening the site to users, complete an authenticated hosted smoke test, set the pilot audience, establish privacy contact / retention terms, and give someone ownership of weekly source review. Private deployment does not complete those launch steps.

## Release verification

- 33 automated tests pass, including account isolation, duplicate saves, correction validation, click aggregation, exact IST cutoff boundaries, seven-day freshness, expiry, filtering, and preventing external listings from becoming native registrations.
- TypeScript and JavaScript syntax checks pass; production Worker builds successfully.
- Both migrations apply successfully to an empty local D1 database.
- Browser preview remains unverified: the preview daemon reports running, but the cloud browser receives `ERR_CONNECTION_REFUSED` at its assigned URL. This is an environment limitation; no alternate browser automation or access bypass was used.
- Hosted sign-in and an authenticated browser save/report round trip remain pending owner-session verification. Unit/API tests use synthetic users and do not prove the hosted sign-in flow.
