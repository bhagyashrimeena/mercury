# Mercury — Player and organizer friction audit (10 November 2026)

## Product principles

Mercury is a **participation marketplace**: help people discover and join legitimate games and competitions, then help organizers run free sessions. It is not currently a venue-slot marketplace or a payments product.

Current production constraints:
- External listings are source-backed leads; **the organizer confirms** paid/third-party registrations.
- Free Mercury-native events require a signed-in adult account to hold a confirmed place and issue a pass. Payments and SMS/email reminders are not enabled.
- The current private pilot restricts account access; guest discovery can operate independently. This change does **not** open public sign-up.
- Native creation remains limited to the currently supported racket sports; external discovery includes Running and Chess.

## Benchmarked patterns (use ideas, not visual components)

| Source | Observed practice | Mercury interpretation |
| --- | --- | --- |
| [District Play](https://www.district.in/play/) | Select a sport, then scan nearby facilities with compact distance/sport filters | Sport and playable opportunities before long editorial marketing |
| [Playo](https://playo.co/) | Distinguishes joining ready-to-play organized games from booking venues | Show where bookings happen and whether Mercury issues the confirmation |
| [Luma event creation](https://help.luma.com/p/creating-an-event) | Starts with essential event facts; advanced registration/management follows | Break a dense organizer editor into essentials, player details, review |
| [Luma guests](https://help.luma.com/p/managing-your-guest-list) | Filters by going / checked-in status | Search by player name/pass and focus on unchecked players |
| [Eventbrite organizer](https://www.eventbrite.com/features/registration/) | Consolidates event registrations, attendance and check-in | Single obvious next action for each event's state |

## UX audit and implemented remedies

### Players
1. Home had a 560 px promotional hero ahead of its useful “What can I play?” list and search, because runtime DOM movement placed the quickline below the hero.
   - Render the upcoming-games strip and working search above the campaign artwork, reduce hero height, and remove two repetitive promotional sections. Keep the featured event grid and host CTA.
2. Public SSR cards could be replaced by a generic loading screen while a session request was in flight.
   - Preserve server-rendered public content until interactive data arrives; keep the existing error fallback on failure.
3. Browse cards still distinguish direct organizer links from Mercury free booking. No new sign-in is required to browse, and no payment capability is implied.

### Organizers
1. Five long event form sections and dozens of event-management actions appeared simultaneously.
   - 3-stage editor (essentials / participant details / review), with step-specific validation and a clear save-draft action. Review summarizes event/date/venue/capacity/cost.
2. A navigation interruption could discard an unfinished form.
   - Use tab-scoped recovery for **public event fields only**, versioned by the stored event revision; do not store user sessions, tokens or registrant data. Server save clears recovery.
3. The editor accepted only Powai, Chandivali and Andheri.
   - Broaden the area allowlist to the verified neighbourhoods in the existing MMR catalogue, plus Thane, while leaving native sport/format and fee-publishing rules intact.
4. Event cards offered edit, view, roster, publish, unpublish and cancel at the same level.
   - State-based primary action and a secondary management disclosure. Copy an event URL only for published sessions and explain pilot access.
5. Finding one person at check-in required scanning the entire list.
   - Instant client-only search by name, level or pass, “not checked in” filter, confirmed-first ordering, and preserved query after checking someone in.

## QA before release

Run in the Node 24 CI environment:

\`\`\`sh
pnpm check
pnpm test
pnpm typecheck
pnpm build
\`\`\`

Browser checks at 320, 390, 768, 1440 CSS px:
- Home displays upcoming opportunities **before** the hero and search submits the selected sport/area to Explore.
- Explore remains readable while session or event APIs are delayed; Back/Forward and any active filters still work.
- Organizer profile creation, new draft, 3 steps, keyboard focus, incomplete-step error, review summary, preview and return to step 3 without losing values.
- Unsaved form changes are recovered in the same tab, but not leaked into another draft revision; saving a server draft clears in-tab recovery.
- Draft free game publishes via existing explicit confirmation; paid draft remains unpublishable.
- Published event shows the roster as the primary action, copy link and public player page as secondary, and a disclosure for dangerous actions.
- Check-in search matches an individual by name, level and pass; “not checked in” hides checked players, and check-in preserves the filter.
- Check-in, roster export, native free registration and cancellation, and the signed-in owner boundary work with allowed pilot accounts. Test with **synthetic** attendee data only; never publish test events to real users.

## Remaining launch gates

This UX update does not make the product fully publicly launched. The owner still needs to decide when to open the private pilot, verify live Google/email authentication and booking flows on production, and keep catalogue facts fresh. Any future paid entry, verified organizer onboarding, waitlists, messaging or match recording requires separate product rules, security and user testing.

Avoid interpreting a GitHub/Vercel green build as a complete production end-to-end acceptance test.
