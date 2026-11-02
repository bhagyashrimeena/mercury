# Deploy Mercury on Vercel with Supabase

The production build is native Next.js. Mercury's application rules remain in `server/api.js` and `server/operations.js`; the Vercel adapter in `db/vercel.ts` runs their parameterized SQL against Supabase PostgreSQL. Supabase Auth verifies a Google sign-in session. The previous ChatGPT Sites/D1 files in `drizzle/`, `worker/`, and `scripts/vite/` are historical and are not used by `npm run build`.

## 1. Use the Mercury Supabase project

The Mercury project is `hocgsyllkmsmwgirjdqi` in Mumbai (`ap-south-1`). Its 13 application tables have already been created and are empty. The old D1 records were intentionally not copied. For a different Supabase project, apply `supabase/migrations/20261102_initial.sql` once with `npm run db:migrate`; do not run that command against this Mercury project because the tables already exist.

From **Connect**, copy the **Transaction pooler** connection URI (port 6543). It includes the database password. Keep it server-side as `SUPABASE_DB_URL`. Copy the project's API URL and publishable API key from **Project Settings → API Keys** for `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Download the database CA certificate from Database Settings → SSL Configuration and set its PEM contents as `SUPABASE_DB_CA` so the server can verify the database certificate.

Never paste the connection URI or password into GitHub or a client-side variable.

## 2. Configure Google sign-in in Supabase

Enable **Google** in Supabase Authentication → Providers. Create a Google OAuth client and use the **Supabase Auth callback URL** shown by Supabase as Google's authorized redirect URI (normally `https://PROJECT_REF.supabase.co/auth/v1/callback`). Put the Google client ID and secret in Supabase, not in Vercel.

In Supabase Authentication → URL Configuration, set the Site URL to the final Mercury production URL. Add `https://YOUR-VERCEL-DOMAIN/auth/callback` to allowed redirect URLs. Add exact preview callback URLs separately if preview sign-in is needed. A preview should use its own Supabase project/database if it will perform writes.

Google sign-in creates a new Supabase Auth identity. The old Sites identity and sessions are not reused. Account consent, organizer ownership and other Mercury records continue to use the verified user ID provided by Supabase. No D1 records are imported in this empty start.

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
| `MERCURY_SITE_ORIGIN` | Final HTTPS production origin, such as `https://mercury.example.com` |

`MERCURY_ALLOWED_EMAILS` is optional: a comma-separated list of additional Google emails allowed into the private pilot. `MERCURY_ADMIN_EMAIL` is always allowed. When `MERCURY_PUBLIC_LAUNCH=false`, the proxy rejects other visitors; that flag also keeps search indexing off. When set to `true`, browsing opens publicly while account and owner API operations still require sign-in and ownership checks.

Use separate values and preferably a separate Supabase project for **Preview** and **Development**. Do not point a preview that accepts writes at the production database. `MERCURY_SITE_ORIGIN` should be the canonical URL for that environment when set. Vercel also supplies `VERCEL_URL` as a fallback.

After creating the project, set Vercel's **Function Region** near the Supabase region in Project Settings (for example `bom1` for Supabase Mumbai). Vercel's default is Washington, D.C., which adds latency to an India-hosted database.

## 4. Verify

Run `npm run check`, `npm test`, `npm run typecheck`, and `npm run build` before pushing. `npm run build` must create `.next/routes-manifest.json`; `vinext build` is no longer the deployment build.

After the first Vercel deployment, check `/api/health` while signed in as the owner, then test Google sign-in, account consent, saving a listing, a correction, support intake, and owner access. For native free events, follow `docs/pilot-runbook.md` with explicit test events. Avoid real invitations until those checks pass.

If `/api/health` fails, first verify the schema was applied and `SUPABASE_DB_URL` points to the Transaction pooler. If login fails, verify Supabase's Google provider, Site URL, allowed redirect URL, and the three Supabase environment variables on the deployed Vercel environment. Updating Vercel environment variables requires a redeploy.
