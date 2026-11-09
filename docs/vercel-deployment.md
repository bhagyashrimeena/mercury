# Deploy Mercury on Vercel with Supabase

The production build is native Next.js. Mercury's application rules remain in `server/api.js` and `server/operations.js`; the Vercel adapter in `db/vercel.ts` runs their parameterized SQL against Supabase PostgreSQL. Supabase Auth verifies Google and email-code sign-in sessions. The previous ChatGPT Sites/D1 files in `drizzle/`, `worker/`, and `scripts/vite/` are historical and are not used by `npm run build`.

## 1. Use the Mercury Supabase project

The Mercury project is `hocgsyllkmsmwgirjdqi` in Mumbai (`ap-south-1`). Its original 13 application tables were created without copying the old D1 records. The additive `site_metrics` table in `supabase/migrations/20261105132850_site_metrics.sql` must be applied before the aggregate owner dashboard can count traffic. `npm run db:migrate` skips tables that already exist, applies this new table when missing, and applies both migrations to a fresh database. Run it only with the intended project's private database connection; it has not been run against production in this worktree.

From **Connect**, copy the **Transaction pooler** connection URI (port 6543). It includes the database password. Keep it server-side as `SUPABASE_DB_URL`. Copy the project's API URL and publishable API key from **Project Settings → API Keys** for `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Download the database CA certificate from Database Settings → SSL Configuration and set its PEM contents as `SUPABASE_DB_CA` so the server can verify the database certificate.

Never paste the connection URI or password into GitHub or a client-side variable.

## 2. Configure Google sign-in in Supabase

Enable **Google** in Supabase Authentication → Providers. Create a Google OAuth client and use the **Supabase Auth callback URL** shown by Supabase as Google's authorized redirect URI (normally `https://PROJECT_REF.supabase.co/auth/v1/callback`). Put the Google client ID and secret in Supabase, not in Vercel.

In Supabase Authentication → URL Configuration, set the Site URL to `https://www.playonmercury.com` while the apex domain redirects there. Add `https://www.playonmercury.com/auth/callback` to allowed redirect URLs; add the apex callback only if it is deliberately used. Add exact preview callback URLs separately if preview sign-in is needed. A preview should use its own Supabase project/database if it will perform writes.

Google sign-in creates a new Supabase Auth identity. The old Sites identity and sessions are not reused. Account consent, organizer ownership and other Mercury records continue to use the verified user ID provided by Supabase. No D1 records are imported in this empty start.

For email sign-in, configure the Supabase Email provider, change the Magic Link template to include `{{ .Token }}`, and set up custom SMTP before sending codes to people outside the project team. The app verifies the code on the same origin and keeps the private-pilot email allowlist. Follow [email sign-in setup](email-signin-setup.md) and verify an actual code round trip before treating email as ready. Phone sign-in is deferred until an SMS provider and an email-compatible account model are in place.

## 3. Fill in Vercel's New Project form

| Field | Value |
| --- | --- |
| Repository | `bhagyashrimeena/mercury`, production branch `main` |
| Vercel Team | Your selected account/team; Hobby works for the initial pilot |
| Project Name | `mercury` if available |
| Root Directory | `./` |
| Application Preset | Next.js |
| Build Command | Leave default (`pnpm run build` / `next build`) |
| Output Directory | Leave Next.js default (`.next`) |
| Install Command | Leave auto-detected pnpm |

Set these environment variables for **Production** before deploying:

| Key | Value/source |
| --- | --- |
| `SUPABASE_URL` | `https://hocgsyllkmsmwgirjdqi.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable API key (`sb_publishable_...`) |
| `SUPABASE_DB_URL` | Secret Transaction pooler PostgreSQL URI (port 6543) |
| `SUPABASE_DB_CA` | Supabase database CA certificate PEM from SSL Configuration; keep server-side |
| `MERCURY_ADMIN_EMAIL` | Google email of the Mercury owner; enables the owner inbox and support intake |
| `MERCURY_PUBLIC_LAUNCH` | `false` for the private pilot; change only when deliberately launching publicly |
| `MERCURY_PUBLIC_BROWSE` | Optional `true` after the catalogue is reviewed to open discovery without search indexing; leave unset during the private pilot |
| `MERCURY_SITE_ORIGIN` | Final HTTPS production origin: `https://www.playonmercury.com` while the apex domain redirects there |

`MERCURY_ALLOWED_EMAILS` is optional: a comma-separated list of additional Google or email-code addresses allowed into the private pilot. `MERCURY_ADMIN_EMAIL` is always allowed. When `MERCURY_PUBLIC_LAUNCH=false`, the proxy rejects other visitors; that flag also keeps search indexing off. Set `MERCURY_PUBLIC_BROWSE=true` only when guest discovery is ready for review. When `MERCURY_PUBLIC_LAUNCH=true`, browsing opens publicly while account and owner API operations still require sign-in and ownership checks.

Use separate values and preferably a separate Supabase project for **Preview** and **Development**. Do not point a preview that accepts writes at the production database. `MERCURY_SITE_ORIGIN` should be the canonical URL for that environment when set. Vercel also supplies `VERCEL_URL` as a fallback.

After creating the project, set Vercel's **Function Region** near the Supabase region in Project Settings (for example `bom1` for Supabase Mumbai). Vercel's default is Washington, D.C., which adds latency to an India-hosted database.

## 4. Verify

Run `npm run check`, `npm test`, `npm run typecheck`, and `npm run build` before pushing. `npm run build` must create `.next/routes-manifest.json`; `vinext build` is no longer the deployment build.

After the first Vercel deployment, check `/api/health` while signed in as the owner, then test Google sign-in, account consent, saving a listing, a correction, support intake, and owner access. For native free events, follow `docs/pilot-runbook.md` with explicit test events. Avoid real invitations until those checks pass.

Run `npm run links:check` before a catalogue review. It reports clear 404/410 source or registration links and labels other failures for manual review. A 200 response does not establish that the event details or entry status are correct; update `checkedOn` only after a human verifies the source.

The owner dashboard's 30-day funnel uses aggregate day-and-stage counts only; no search phrases, player IDs, or IPs are stored in `site_metrics`. The public count endpoint is same-origin and rate-limited. It is best-effort: a missing metrics table does not block sign-in, saves, or bookings, and the owner view explicitly reports that counts are unavailable. Apply the additive migration before relying on those counts. Owner-triggered housekeeping removes aggregate counts older than 90 days.

If `/api/health` fails, first verify the schema was applied and `SUPABASE_DB_URL` points to the Transaction pooler. If login fails, verify Supabase's Google provider, Site URL, allowed redirect URL, and the three Supabase environment variables on the deployed Vercel environment. Updating Vercel environment variables requires a redeploy.

The Google consent email only confirms that Google shared the profile with Supabase; it does not confirm access to Mercury. The sign-in page reports the outcome: `error=access` means the Google email is missing from `MERCURY_ADMIN_EMAIL` or `MERCURY_ALLOWED_EMAILS` while the pilot is private; `error=callback` means the code exchange failed, so check the exact Supabase redirect allowlist and site origin; `error=configuration` means the server could not create the Supabase client; `error=start` means the Google OAuth flow could not be started. These failures return to the sign-in page with `return_to` preserved. Check the deployed URL after returning from Google, then redeploy after correcting environment variables. Keep `MERCURY_PUBLIC_LAUNCH=false` during this diagnosis.
