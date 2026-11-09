# Verify local Mercury Google sign-in

## What was observed

- The reported second screen was the hosted `www.playonmercury.com/signin`, not localhost. Its `return_to` contained a homepage path with an OAuth `code` query parameter. The actual code is intentionally not recorded here.
- Local `MERCURY_SITE_ORIGIN` was `http://localhost:3000`, and local source used the newer sign-in design.
- The previous source requested `/auth/callback?next=...`, although the README instructed an exact `/auth/callback` allowlist entry. Supabase's allowlist matching includes the query string. An exact callback entry will not match the former request.
- The actual Supabase URL configuration was not inspected. A missing or nonmatching local redirect entry is the leading explanation for the observed hosted fallback, not a verified settings value.
- The hosted second button was a submit button in a POST form. No captured console error explained the reported lack of response. This patch does not claim to diagnose or repair that deployed build.

## Patch behavior

The sign-in action now sends the fixed `http://localhost:3000/auth/callback` URI for this local origin. The destination after login is carried in a host-only, HTTP-only, SameSite=Lax cookie lasting ten minutes. HTTPS deployments use Secure cookies. Supabase still creates and validates its own PKCE verifier and session.

The callback consumes and clears the return cookie on success or failure. Old `next` callback links remain supported. All destinations are restricted to Mercury paths, and retry destinations drop abandoned OAuth codes/tokens. The private-pilot gate stays enabled and no database, provider, or production settings are changed by this patch.

## Apply and check

1. Apply `mercury-auth-redirect.patch` to the Mercury repository after reviewing its seven-file scope. It only changes sign-in, callback, return-path handling, documentation and tests. It does not overwrite Game Day or My Games work.
2. Use the repository's pinned Node 24 and pnpm versions. With the existing dependencies installed, run `npm run check`, `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
3. Restart the local development server using the repository's normal workflow. This patch was prepared in a separate scratch copy and has not been installed on Windows.

## Provider setting to verify manually

Open the correct Supabase project, then **Authentication → URL Configuration → Redirect URLs**. Confirm the exact entry:

`http://localhost:3000/auth/callback`

Keep the production **Site URL** unchanged. If the localhost entry is absent, add that one exact entry. Do not broaden production redirects, remove existing entries, expose credentials, or disable the private pilot. Google's authorized redirect URI remains the Supabase provider callback; localhost belongs in Supabase's allowed redirects, not as a replacement for Google's provider callback.

This exact entry is sufficient for the patched code. Before applying the patch, the old code adds a `next` query and does not match this exact entry. Supabase documents `http://localhost:3000/**` for development, but the fixed callback avoids needing that wildcard here.

## Real browser acceptance test

1. Start at `http://localhost:3000/signin?return_to=%2Fmy-games`. Use `localhost` throughout, not `127.0.0.1`, since cookies are host-specific.
2. Click Continue with Google, choose an authorized private-pilot account, and complete the provider flow. The project name on Google's consent/account chooser is expected.
3. Confirm the browser comes back through localhost `/auth/callback` and then `/my-games`, without showing the hosted sign-in page. Check a signed-in `/api/session` response and verify the My Games screen loads. Never paste the callback code, session cookies, or tokens into a report.
4. Try a normal retry after cancelling at Google, then a sign-in targeting a specific event. Confirm return destinations are preserved and visible error states work.
5. If Google still sends the browser to the hosted homepage, stop and recheck the exact local allowed redirect and the initiating origin. Do not copy an auth code between hosts. Start a fresh sign-in after any correction.

## Verification actually completed

- Sixteen focused offline auth/site-origin tests passed, including a mocked start-to-callback flow, session-cookie preservation, return-cookie cleanup, configuration and provider failures, private-pilot denial, legacy callbacks, and malicious return paths.
- `npm run check` passed. Additional syntax checks for Game Day and My Games passed.
- The available full suite ran 77 tests: 76 passed; the PostgreSQL schema test could not load the missing `@electric-sql/pglite` dependency.
- Full TypeScript checking, ESLint and Next.js build were attempted but could not start because `tsc`, `eslint` and `next` are not installed in this scratch environment.
- No real provider login, production deployment, Windows edits or provider settings changes were performed. The fix is prepared and tested offline, not live-verified.

## References

- [Supabase redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase full-URL allowlist matching and fallback implementation](https://github.com/supabase/auth/blob/master/internal/utilities/request.go)
- [Next.js cookie behavior in Server Actions and Route Handlers](https://nextjs.org/docs/app/api-reference/functions/cookies)
