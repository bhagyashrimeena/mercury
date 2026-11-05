# Mercury

Sports discovery and participation for Mercury, by NextPlay Sports Private Limited.

Mercury shows source-backed external sports listings and supports accounts for saving listings and submitting corrections. Organizers can also create free Mercury events, with registrations, capacity limits, attendee check-in, and in-app updates. Paid event publication and payments are disabled.

## Current deployment

Mercury runs as a Next.js app on Vercel. Supabase provides PostgreSQL and Google sign-in through Supabase Auth. The application API, ownership rules, validation, and event workflows remain in `server/api.js` and `server/operations.js`.

**Follow [the Vercel deployment guide](docs/vercel-deployment.md)** to create the Supabase project, apply the empty PostgreSQL schema, configure Google OAuth, set Vercel environment variables, and fill in the GitHub import form. The older Cloudflare D1 migrations and Sites build helpers remain only as historical development artifacts. They are not used by the production build.

The default pilot is private: `MERCURY_PUBLIC_LAUNCH=false` admits only `MERCURY_ADMIN_EMAIL` and any emails in `MERCURY_ALLOWED_EMAILS`. The flag also keeps pages out of search indexing. Decide the audience explicitly before changing it to `true`.

For a staged release after the catalogue is reviewed, set `MERCURY_PUBLIC_BROWSE=true` to let signed-out visitors open home, Explore, event and listing details while accounts and organizer tools stay protected. This stage remains `noindex` until `MERCURY_PUBLIC_LAUNCH=true` is deliberately enabled. Saving and booking still require sign-in. A production environment change requires a Vercel redeploy.

## Code map

- `app/[[...path]]/page.tsx`: server-rendered shell and event/listing metadata.
- `app/api/[...path]/route.ts`: Vercel API entry point.
- `app/auth/`, `app/signin/`, `app/signout/`, `lib/supabase/`: Supabase Auth flow.
- `db/vercel.ts`: PostgreSQL adapter for the existing API query interface.
- `supabase/migrations/`: initial PostgreSQL schema and additive aggregate-metrics migration.
- `server/api.js`, `server/operations.js`: validation, authorization, bookings, support, and owner operations.
- `public/catalogue-data.js`: external listing source data; external registration stays with organizers.
- `public/live.js`, `public/service-ui.js`, `public/app.js`: browser experience.
- `tests/`: business-rule and SQLite-backed API tests.

## Development and checks

Use Node 24 and the pinned pnpm version in `package.json`.

```sh
npm run install:ci
npm run check
npm test
npm run typecheck
npm run build
```

For local signed-in development, configure the Supabase values in an ignored `.env.local`, apply the PostgreSQL schema, add `http://localhost:3000/auth/callback` to Supabase Auth redirect URLs, and run `npm run dev`. Do not commit secrets or production data.

The 2026 pilot and launch notes in `docs/` describe the original Sites/D1 deployment and may contain historical provider instructions. Use [the Vercel guide](docs/vercel-deployment.md) for the current host and database setup.
