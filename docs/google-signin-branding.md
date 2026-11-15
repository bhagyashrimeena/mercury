# Public sign-in and Google branding

Mercury accepts any verified Google or email identity, with account consent and adult eligibility required to use account features. The former application email allowlist has been removed from the proxy, callback, email actions and API identity loader. Owner permissions still use `MERCURY_ADMIN_EMAIL`; event management checks ownership. `MERCURY_PUBLIC_LAUNCH` controls indexing, not account access.

## Configure the provider for public signup

In the Supabase project `hocgsyllkmsmwgirjdqi`, allow new user signups and enable Google and Email authentication. Do not disable email verification. Supabase's default mail service only sends to pre-authorized project addresses; configure custom SMTP for public email-code delivery. In the Google Cloud project owning the client ID configured in Supabase's Google provider, use an External audience and publish the OAuth app to Production so ordinary Google accounts can sign in outside the test-user list.

## Display playonmercury.com on Google's screen

Google controls its account chooser and consent screen. Changing Mercury page titles, the Supabase project name, or the website redirect URL does not set that label. The Supabase project hostname is currently the provider callback host.

Use Google Auth Platform → Branding for the OAuth client linked to Supabase:

| Setting | Value |
| --- | --- |
| App name | `playonmercury.com` |
| App logo | Mercury logo |
| Application home page | `https://www.playonmercury.com` |
| Privacy policy | `https://www.playonmercury.com/privacy` |
| Terms of service | `https://www.playonmercury.com/terms` |
| Authorized website domain | `playonmercury.com` |
| User support / developer contacts | A monitored address controlled by the Mercury owner |

Verify ownership of `playonmercury.com` in Google Search Console with an account permitted to administer this OAuth project. Save the branding settings and submit for brand verification when required. Verification is external to the repository and may take several business days. Do not claim the chooser has changed until a new Google sign-in visibly shows the approved brand.

Keep the existing authorized provider callback `https://hocgsyllkmsmwgirjdqi.supabase.co/auth/v1/callback`. This differs from the website return callback (`/auth/callback`). Keep the exact production website callback in Supabase's redirect allowlist and `http://localhost:3000/auth/callback` for local development. Preserve the current minimal `openid`, email and profile scopes.

## Optional branded Auth hostname

If a domain in the provider URL itself is required, Supabase supports a custom hostname such as `auth.playonmercury.com`. This requires a paid plan/add-on and DNS ownership; it cannot use the website's apex domain while that domain serves Mercury. Configure the DNS and certificate in Supabase, add `https://auth.playonmercury.com/auth/v1/callback` in the same Google client before activating the domain, and then use the activated URL as `SUPABASE_URL` consistently in development, preview and production. Retain the matching project publishable key. Do not point `SUPABASE_URL` at the website or an unconfigured hostname.

No paid domain has been purchased or activated by this code change. The verified app-name route can display `playonmercury.com` without moving the existing Supabase callback.

## Verify

After deploying the code and completing the provider settings, start a new Google flow using a non-owner account. Confirm Google's label, return to the initiating website origin, and accept the Mercury account notice. Verify saving/registration works while someone else's event roster and owner desk remain inaccessible. Check a real email OTP round trip with an address outside the Supabase project team. Do not paste codes, passwords or session cookies into reports.

References: [Supabase Google branding](https://supabase.com/docs/guides/auth/social-sign-in/auth-google#setup-consent-screen-branding), [custom domains](https://supabase.com/docs/guides/platform/custom-domains), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
