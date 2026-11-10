# Mercury organizer acquisition and event-conversion release — 11 November 2026

## Product decision

Mercury's public navigation now says **For organizers**, not **Host a game**. The authenticated `/host` free-game studio remains available from the public landing page. External tournament and race organizers can submit a listing request without a Mercury account or abandoning their existing ticketing system.

New routes:
- `/for-organizers` — public value proposition, illustrative event card, explanation of review, links to submission and existing studio
- `/list-event` — no-login moderated event request with a client-side local preview. It submits to the existing rate-limited `POST /api/support` endpoint as an **Organizer enquiry** and returns a request reference. No automatic publication.
- `/how-it-works` — useful server-rendered guide for players and organizers, even before client JavaScript loads.

Existing account allowlists, free-event publishing rules, attendee privacy and paid-booking restrictions are unchanged.

## What is and is not shipped

| User action | Current implementation |
| --- | --- |
| Share existing registration or event URL without account | Supported as a moderated review request |
| Provide sport, date, venue, category fee and descriptive notes | Supported, optional where possible |
| Preview the submitted facts locally | Supported; not a public page |
| Share a publicly hosted flyer URL | Supported as a **link for human review only**; neither uploaded nor displayed automatically |
| Upload a local flyer file | **Not implemented** — requires safe object storage, media moderation, rights and ownership validation |
| Automatically extract event details from an arbitrary link/PDF/image | **Not implemented** — do not auto-fetch untrusted organizer URLs or imply fact extraction |
| Confirm event ownership and publish | **Manual Mercury review**, no automated publishing/claim grants |
| Return owner reference for submissions | Existing support ID from `/api/support`, no confirmation email |
| Owner see review requests | Existing owner dashboard, categorized Organizer enquiry with structured source details |
| Confirm registrations and payouts | **Not implemented**; Mercury only tracks outbound clicks |
| Expose verified organizer analytics | **Not implemented**, because the owner and the organizer must be validated first |

## Rotary Queen City Half Marathon data review

Checked the published [India Running event page](https://www.indiarunning.com/events/rotaryqueencityhalfmarathon2026-38601) on 11 November 2026. It lists 2.5K untimed ₹700 (no age restriction), 5K timed ₹900 (12+), 10K timed ₹1,100 (18+) and 21K timed ₹1,300 (18+). It also lists a finisher medal, T-shirt, bib, e-certificate, timing chips on timed categories, hydration and route medical support, with a charitable cause supporting children with disabilities.

The official India Running page provides a distinct [booking link](https://registrations.indiarunning.com/rotaryqueencityhalfmarathon2026-38601). Mercury points to that destination and retains the original information page as `sourceUrl`. **A URL being present on the source page does not prove a user can finish checkout or that tickets remain available.** Confirm the checkout before promoting it as open.

## Release and manual QA

After the normal Node 24 `pnpm check`, `pnpm test`, `pnpm typecheck` and `pnpm build` pass, run the browser fixture checks at 390 and 1440 px. Confirm:
- `/for-organizers` loads without a redirect for signed-out visitors, even with private-pilot account settings.
- `/how-it-works` gives meaningful server-rendered HTML, not a generic loading state.
- `/list-event` is reachable without login; filling sport, link and fee updates the local preview; submitting returns a real existing support request reference.
- Input cannot inject markup into preview; arbitrary http, javascript, credentials-in-URL and malformed URLs are rejected.
- A link such as `/list-event?claim=rotary-queen-city-half-marathon-2026` prefills the public record but **never auto-grants ownership**.
- The new event request is visible in the owner queue with its source URL and contact, and can be replied to through existing manual owner procedures.
- The existing `/host` route remains restricted to authorized accounts and free Mercury events retain their booking safeguards.
- The Rotary listing shows four categories with fees, useful highlights, and a link to the actual registration domain.
- External click counting remains only **click counting**; avoid describing it as registrations, confirmed customers or platform-sourced acquisitions.

Never enable `MERCURY_PUBLIC_LAUNCH` merely to make organizer submission work; it has been made public via route-specific allowances.
