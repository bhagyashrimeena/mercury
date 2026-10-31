# Mercury

A fresh, responsive sports discovery website for **Mercury**, by NextPlay Sports Private Limited.

## Version 0.2: participation and organizer studio

The first release implements the discovery → event details → demo registration → saved pass journey. **All events, hosts, venues, prices and availability are illustrative. No real reservations or payments are made.**

### Included

- Light-first visual system: Mercury Blue `#3156F5`, Chalk `#F7F8F2`, Ink `#10131A`, Volt `#D9FF38`.
- Manrope UI typography, Archivo italic campaign headlines, responsive layouts.
- Search and combined sport, neighbourhood, level and format filters; useful empty states.
- Event details with formats, inclusion lists, solo entry, rules and cancellation disclosure.
- Registration validation, recoverable session drafts, duplicate booking prevention and demo passes.
- Saved games and bookings persisted in browser local storage, with removal controls.
- Organizer profiles and a local organizer studio: autosave, recovery, edit, player-facing preview, validation and removal with undo.
- Mobile bottom navigation and a persistent event registration action.
- URL-preserved search filters, price/time ordering and available-spots filtering.
- Registration rules sheet that preserves form inputs and returns keyboard focus.
- Native event sharing where supported, with a copy-link fallback.
- Keyboard focus styles, skip link, native form validation, live announcements and reduced-motion support.

## Run locally

No package installation or build is required. Serve the `dist` directory using any static server, for example:

```sh
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. Use HTTP serving rather than opening index.html directly because the JavaScript uses ES modules.

```sh
npm run check
npm test
```

Node 20 or later is required for checks. 16 tests cover filtering and URL round trips, booking validation, full sessions, malformed storage, India-time formatting, organizer validation, legacy draft migration, updates without duplication, and inventory invariants.

## Structure

- `dist/index.html` — document shell and navigation
- `dist/styles.css` — responsive design tokens and components
- `dist/app.js` — routes, views and interactions
- `dist/data.js` — sample inventory and shared logic
- `dist/domain.js` — filter URLs, sorting and organizer draft validation
- `dist/assets/` — self-hosted imagery and original provisional logo mark
- `tests/` — Node unit tests
- `.openai/hosting.json` — private Sites deployment configuration

Hash routes are deliberately used for this static preview. This is **not the final SEO architecture**. The preview is `noindex` and `robots.txt` disallows indexing. Before public launch, implement rendered event/host URLs with per-page metadata, canonical URLs, accurate event structured data and a sitemap.

## Production work still required

1. Establish real host accounts and verified inventory with confirmed venue addresses, dates, levels, capacities and refund policies.
2. Add a server API and database for events, accounts, registrations, capacity transactions and role-scoped organizer operations.
3. Connect verified sign-in, payment orders and signed idempotent payment webhooks. Never infer payment success from the browser redirect.
4. Implement cancellations/refunds, notifications, attendance, observability and privacy controls.
5. Implement SEO routes and recheck accessibility on physical mobile devices; test payment/capacity races and failures before opening bookings.
6. Add actual results and Gameprints after the first participation journey is reliable. No fabricated results are shown.

No credentials or personal production data belong in this public repository. Demo data lives on the visitor's device only. There is no server-side capacity or identity enforcement in this preview.

## Image sources

Illustrative sports photography is self-hosted from Unsplash images:
- `photo-1554068865-24cecd4e34b8` — tennis hero (`images.unsplash.com`)
- `photo-1622279457486-62dcc4a431d6` — tennis court
- `photo-1626224583764-f87db24ac4ea` — badminton

These photos are not representations of the listed sample venues. The Mercury symbol is a provisional original SVG; it is not the final previously explored logo artwork. Typography loads through Google Fonts.
