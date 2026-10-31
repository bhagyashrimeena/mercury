# Mercury

Sports discovery and participation for Mercury, by NextPlay Sports Private Limited.

**v0.3 is a database-backed private pilot for free events.** The blue, chalk and lime design is retained from v0.2. Real events start empty; sample games remain clearly separate and never reserve places.

## What works

- ChatGPT sign-in through Sites; account names and organizer profiles.
- Organizer-owned event drafts, edits, free publication, unpublishing and cancellation.
- Discovery filters, durable event URLs, server-rendered event summaries and metadata.
- Free registrations, server-side capacity enforcement, idempotent retries and one active place per account/event.
- Rule revision and adult consent records, account-bound passes and cancellations before start.
- Private attendee rosters, idempotent check-in and CSV export with spreadsheet-formula escaping.
- Saved games and in-app updates across devices.
- Mobile navigation, sticky registration actions, accessible labels and error states.
- Separate browser-local sample sessions, demo passes and organizer drafts.

**Paid drafts cannot be published. No payment is attempted.** Email/SMS notifications are not connected. Updates are shown inside My games. Sessions currently last 90 minutes.

## Architecture

- `app/[[...path]]/page.tsx`: rendered shell, event metadata and fallback content.
- `app/api/[...path]/route.ts`: trusted Sites identity and D1 binding adapter.
- `server/api.js`: request validation, ownership, transactions and business rules.
- `db/schema.ts` and `drizzle/`: versioned schema and schema-only migrations.
- `public/live.js`: account, organizer and player UI connected to the API.
- `public/app.js`: visual homepage and explicitly separated local sample experience.
- `public/domain.js`: shared validation and filtering rules.
- `public/styles.css`, `public/assets/`: responsive design and self-hosted imagery.
- `tests/`: 26 tests, including SQLite-backed API integration tests.

Sites provisions D1 as `DB` and applies migrations before uploading the Worker. Authentication is handled by Sites; the server uses the site-scoped authenticated ID, never an email address, as the ownership key. Client-supplied user IDs are not accepted. Writes require same-origin JSON requests. Personal API responses are not cached. The preview remains owner-private and noindex.

## Development and checks

Use Node 24 (Node 22.13+ is the runtime minimum), with the pnpm version pinned in `package.json`.

```sh
npm run install:ci
npm run check
npm test
npm run typecheck
npm run build
```

The supported Sites workflow uses the Sites plugin's dependency installer and build helper. In managed development use `sites-preview start /absolute/path/to/mercury`; do not launch a second preview server. Elsewhere `npm run dev` runs the portable development server. The starter's portable identity mock is local-only; hosted authentication is owned by Sites.

After the first build, apply migrations to the **local** database:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_damp_selene.sql
```

For future schema changes, edit `db/schema.ts`, run `npm run db:generate`, inspect and commit the new SQL and metadata. Never edit an applied migration or seed production through migrations.

GitHub CI runs syntax, domain and server integration tests without external services. Dependency-based typecheck and production build are also required before publication through Sites.

## Verification and remaining work

See [v0.3 verification](docs/verification-v03.md) and [pilot runbook](docs/pilot-runbook.md). A hosted signed-in smoke test remains necessary: the agent's browser was outside the owner's private sign-in session. Unit/API tests do not prove the platform login handoff. The private gate has not been bypassed.

Before wider launch: confirm actual hosts and venues, complete the signed-in pilot, establish the support/privacy contact and launch policies, and explicitly choose the audience. Paid events additionally need a payment provider account, server-created orders, signed idempotent webhooks and verified refund handling. Custom domain, public SEO/sitemap, real venue photos, email/SMS and results/Gameprints are later launch work; none is falsely represented as complete.

## Brand and assets

Mercury Blue `#3156F5`, Chalk `#F7F8F2`, Ink `#10131A`, Volt `#D9FF38`. Manrope interface typography and Archivo italic campaign headlines load through Google Fonts. The original SVG mark is provisional.

Illustrative sports photos are self-hosted from Unsplash images `photo-1554068865-24cecd4e34b8` (tennis), `photo-1622279457486-62dcc4a431d6` (court), and `photo-1626224583764-f87db24ac4ea` (badminton). They are not photographs of listed venues.

No production records, tokens, local database files or test-only browser fixtures belong in this repository or deployment.
