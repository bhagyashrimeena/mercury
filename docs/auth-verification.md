# Verify local Mercury sign-in

Google sign-in can return to `http://localhost:3000`; it does not require deployment on playonmercury.com. The browser must start and finish on the same localhost origin so its Supabase PKCE cookie is available for the code exchange. Mercury sends the fixed `http://localhost:3000/auth/callback` redirect URI and keeps the post-login destination in a short-lived, HTTP-only cookie. Supabase's redirect allowlist must contain that exact local URL. Google's authorized redirect URI remains the Supabase provider callback, not the localhost URL. Keep the production Supabase Site URL unchanged.

The current sign-in page offers Google, email code, and Continue as guest when `MERCURY_PUBLIC_BROWSE=true`. Guest discovery can open without an account; saving or booking sends the visitor to Account and then sign-in. After an approved existing account signs in, Account returns to the original listing or game. A new account completes consent first, then returns.

## Local setup

1. Use the project's pinned Node and pnpm versions and an ignored `.env.local` with `MERCURY_SITE_ORIGIN=http://localhost:3000`, the Mercury Supabase URL and publishable key, and the private-pilot allowlist. Set `MERCURY_PUBLIC_BROWSE=true` to test guest browsing.
2. In Supabase **Authentication → URL Configuration → Redirect URLs**, allow `http://localhost:3000/auth/callback`. Keep the production Site URL and production redirects in place.
3. Run `npm run dev` and use `localhost` consistently, rather than switching to `127.0.0.1` during a sign-in.
4. For email code testing, follow [the email setup guide](email-signin-setup.md). The Email provider being enabled does not prove that the Magic Link template or SMTP delivery is ready.

## Local browser check

With the development server running and guest browsing enabled, run `node scripts/smoke-guest-browser.mjs`. It starts an isolated headless Chrome profile at a 390px viewport, checks all three sign-in choices, opens Explore as a guest, tries to save a listing, and verifies that the original listing path reaches the sign-in page. Set `MERCURY_CHROME_PATH` if Chrome is not on the script's default path. It never uses the owner's browser profile or signs into an account.

On 9 November 2026 this browser check passed locally, as did 89 automated tests, syntax checks, typecheck, lint with no errors, and the production build. The browser check covers the guest handoff but not a real provider round trip.

## Real provider acceptance

1. Start at `http://localhost:3000/signin?return_to=%2Fmy-games`. Use an email on the private-pilot allowlist.
2. Complete Google consent. Confirm the browser returns through localhost `/auth/callback` to `/my-games`, with an authenticated `/api/session`. Do not copy an OAuth code or session cookie between hosts.
3. Repeat with an email code after confirming the Supabase Magic Link template contains `{{ .Token }}` and delivery works for that mailbox. Check invalid, expired, and resend states.
4. Test the guest save path in a real session: Explore → listing → Save for later → Account → Sign in → original listing. A new account should complete the adult consent step first.
5. Try a cancelled Google attempt. The retry should preserve the intended destination without carrying an abandoned OAuth code.

A hosted provider round trip and email delivery are still unverified. Do not treat an OAuth start redirect, a green build, or provider settings alone as proof of completed sign-in.

References: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Google provider setup](https://supabase.com/docs/guides/auth/social-login/auth-google), [passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless).
