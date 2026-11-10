# Mercury stock photo fallback — source and rights register

Mercury uses **real stock sports photographs**, never AI-generated substitute event photography.

All source pages below identify the material as a *Free Stock Photo* under the [Pexels license](https://www.pexels.com/legal-pages/license/). Pexels permits use on commercial websites without mandatory attribution, but it prohibits suggesting that depicted people, venues, companies or trademarks endorse a product. As a courtesy, the source photographer and page are retained in `public/sport-media.js` and can be surfaced on event details.

This is a **generic fallback gallery, not authenticated photos of the actual tournament**. The UI visibly says *Illustrative photo*. Never claim these people attended a Mercury event or label it an organizer photo.

| Sport | Pexels photo ID | Photographer/source |
| --- | --- | --- |
| Tennis | 20186417 | [Matt Webster](https://www.pexels.com/photo/close-up-of-a-tennis-ball-lying-on-a-tennis-court-20186417/) |
| Tennis | 5739121 | [cottonbro studio](https://www.pexels.com/photo/tennis-ball-on-tennis-court-beside-black-and-white-tennis-racket-5739121/) |
| Tennis | 8224638 | [RDNE Stock project](https://www.pexels.com/photo/tennis-ball-on-tennis-court-8224638/) |
| Tennis | 20186418 | [Matt Webster](https://www.pexels.com/photo/close-up-of-a-tennis-ball-lying-on-a-tennis-court-20186418/) |
| Badminton | 8476139 | [Amit Rai](https://www.pexels.com/photo/close-up-shot-of-a-shuttlecock-on-a-racket-8476139/) |
| Badminton | 12630113 | [aboodi vesakaran](https://www.pexels.com/photo/a-badminton-racket-near-a-shuttlecock-12630113/) |
| Pickleball | 38208389 | [Abdulaziz hasan](https://www.pexels.com/photo/pickleball-paddle-and-ball-on-court-38208389/) |
| Running | 10313674 | [RUN 4 FFWPU](https://www.pexels.com/photo/people-running-on-the-road-10313674/) |
| Running | 9686666 | [Ruslan Alekso](https://www.pexels.com/photo/people-running-a-marathon-in-the-street-9686666/) |
| Running | 19128857 | [Row Photo](https://www.pexels.com/photo/people-running-in-marathon-19128857/) |
| Chess | 6114998 | [Vlada Karpovich](https://www.pexels.com/photo/chess-pieces-in-a-chessboard-6114998/) |
| Chess | 13143767 | [M1DDL3 M7N](https://www.pexels.com/photo/chess-pieces-on-a-chessboard-13143767/) |

The images are sourced via fixed Pexels CDN URLs, resized to card resolution to reduce bandwidth; avoid fetching the original multi-megabyte images in a listing grid. If images are blocked, the website replaces them with sport-colour fallbacks.

## Priority of images

1. Rights-reviewed organizer upload (future): `approvedCover = {url, reviewed: true}` on the server response; only approved first-party or public Supabase Storage URLs are eligible.
2. Sports-appropriate **Pexels stock photo** when an event has no reviewed official/organizer image.
3. Mercury's CSS sport-colour fallback if the external image provider fails.

The repository does **not yet implement an organizer-facing photo uploader**. Do not claim uploads are supported until the server validates content, size, ownership, consent, safe file types and media rights; object storage credentials must never be sent to clients. The renderer merely reserves a safe way to display previously reviewed photos when the upload and approval workflow exists.

## Why we don't show fake event badges

- A stock photograph never establishes verified partnership or live entry availability.
- `Check availability` is not a confirmed live status. It is intentionally not repeated on each compact card.
- A listed registration deadline is not a live inventory check.
- Category-specific discounted fees are shown as **From** with eligibility disclosed on the detail page.
- Non-INR fees are not converted at an invented exchange rate.

## External dependencies

Images are served from `https://images.pexels.com` (not uploaded into the repository). This requires browser access to Pexels, a permissive site CSP and a functioning third-party CDN. An outage should not block event text, links or booking. Before full public launch, consider downloading, resizing and hosting approved fallback imagery on Mercury's own controlled storage to reduce reliance on a third-party CDN and improve Core Web Vitals.
