# Approved In Play implementation

The attached `approved-in-play.html` is the visual reference. Its local demo accounts, registrations, support submissions and organizer submissions are not production features and were not copied into the application.

## Design mapping

- `app/shell.ts`: compact responsive website header, menu and footer.
- `public/in-play.css`: approved colors, typography, spacing, responsive grids and page components; loaded after existing feature styles.
- `public/in-play.js`: reusable split hero, branded/approved-photo event cover, save control, how-it-works steps, Explore banner and About content.
- `public/home.js`: hero, real URL-backed search, quick links, upcoming events, photographic sport categories, how-it-works and organizer CTA.
- `public/discovery.js`, `public/event-detail.js`, `public/live.js`: real event cards/details and account-backed saves using existing endpoints.
- `public/explore.js`: existing combined search/filter/sort engine with the approved banner and card grid.
- `public/organizer-public.js`: organizer landing, live preview and real submission form; review, ownership and consent requirements retained.
- `app/server-fallback.ts`: shared server-rendered content and existing listing visibility enforcement.
- `public/assets/in-play/`: unaltered embedded photographs extracted from the approved prototype. They are illustrative and not represented as photographs of listed events.

## Preserved behavior

Existing routes, session/authentication, saved events, free Mercury registration, external organizer handoffs, availability warnings, source dates, support submissions, organizer studio/editor/rosters, form validation, analytics, SEO and metadata remain connected to the original implementation. The actual Privacy/Terms content remains authoritative. No database schema or backend architecture changes.

Paid booking on Mercury remains unavailable. External listings register on their existing organizer sites. Public event submissions are requests for manual review, not automatic publication. Saved listings do not reserve places. Account screens retain real sign-in instead of the prototype's local demo profile.

## Run

Use Node 24 and the repository's environment configuration:

```sh
corepack pnpm install --frozen-lockfile
pnpm dev
```

Production validation:

```sh
pnpm check
pnpm test
pnpm typecheck
pnpm build
```

The editing workspace uses dependencies symlinked outside the project, which Turbopack rejects. `pnpm build --webpack` validates the local production build; GitHub Actions and Vercel validate the regular Turbopack build with normally installed dependencies.

## Visual review

The UX browser workflow covers 320px, 390px, 768px and 1440px viewports, navigation, filters, organizer form submission and editor/roster workflows. It also captures the exact approved prototype and implemented pages at matching mobile/laptop widths. Test screenshots contain explicitly synthetic review fixtures; those fixtures never enter production inventory. The reference HTML is copied into the isolated CI server only and is not served by the production website.
