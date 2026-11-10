# Mercury / In Motion — UX audit (11 November 2026)

Goal: make Mercury feel like a living sports culture product without sacrificing discoverability, clarity, trust or performance.

Visual direction: electric blue, acid lime, chalk and ink; original SVG running-track curves; bold italic sports editorial typography; authentic organizer-approved images or clearly labeled licensed stock photography. No AI-generated event images.

## Page-by-page review

| Route | Essential experience | First-pass work | Remaining manual verification |
| --- | --- | --- | --- |
| Homepage / | Relevant nearby events immediately | Racing-line overlay, expressive photo hero, progressive motion | Mobile LCP, featured filters, navigation |
| Explore /explore | Filter and scan events quickly | Tactile photo cards, stronger selected filters, subtle image motion | Sort, empty results, keyboard filters, imagery fallback |
| Listing /listing/:id | Trust details, compare categories, register externally | Major photo-led editorial hero, SVG track, SSR/client parity, visible source disclosure | Closed/stale listing cases, registration handoff, 320px layout |
| Native /event/:id | Book actual available free place | Existing event photo and facts gain subtle progressive reveal | Safe-area sticky CTA, booking eligibility, preview |
| Registration /register/:id | Finish booking without confusion | Deliberately leave booking logic untouched | Error, double-submit, consent, back navigation |
| My games /my-games; /booking/:id | Distinguish saved links from confirmed places | Existing flows preserved | Pass view, cancellation, loading, calendar, check-in |
| Account /account; /signin | Reliable sign-in and guest handoff | Existing auth untouched | Email and Google callbacks, redirect destinations |
| Organizers /for-organizers | Understand Mercury's acquisition value | Graphic line motion, lifted value cards, stronger typography | Claiming, trust, authentic examples |
| List event /list-event | Submit event link quickly | More tactile preview and accessible form focus | Validation, errors, organizer approval queue |
| Host /host; /roster/:id | Manage free hosted games | Booking and owner logic unchanged | Authenticated mobile workflow, attendee search, actions |
| How it works /how-it-works | Understand real booking distinction | Section visual rhythm; SSR preserved | No-JS legibility |
| About, support, legal, admin | Reliable information and account safety | Restrained shared styling; legal and admin flows unchanged | Access control, long-form accessibility |

## Guardrails

- No source or registration availability claims introduced.
- Motion remains optional: no element is CSS-hidden until an observer activates; reduced-motion preferences honored.
- Photo labels remain honest; stock photography is not proof of the particular event.
- Navigation, authorization, pricing, capacity, payments and external registration URLs are unchanged.
- Avoid WebGL, video wallpapers, scroll-jacking and large third-party animation dependencies.

## How this was reviewed

Code and route-level inspection, visual design assessment, and GitHub CI browser tests. Complete manual clicking of all authenticated and external-provider controls on the production custom domain was not available in this chat. Do not interpret this audit as a full live E2E pass.

## Required release QA

Manually test Chrome at widths 320, 390, 768, 1024 and 1440. Use keyboard and reduced-motion. Exercise Home -> Explore -> filters -> listing -> source link; status/freshness variants; organizer submission preview; sign-in and free-booking paths; save and cancel; roster, photo fallback, mobile safe-area, and Lighthouse LCP/CLS before merging.

## Next release

Extend the editorial experience to native free-game event details, build sport-specific lightweight SVG motifs, and create authentic organizer success stories only when metrics and image rights have been verified.