# Email code sign-in setup

Mercury's sign-in page offers Google, email code and guest browsing. The email form calls Supabase `signInWithOtp` and verifies the six-digit code with `verifyOtp`. Existing email-code accounts sign in; a new email creates an account. Mercury's private-pilot allowlist still applies before a code is sent and after verification. Guests can browse when `MERCURY_PUBLIC_BROWSE=true`; saving and booking require a signed-in account and consent.

An account originally created with Google may not receive an email code when it has no email identity. Supabase can return an obfuscated success response in this case. Those players should continue with Google. Do not promise that both methods work interchangeably for an existing account until this is verified in the project.

## Supabase project settings

1. In the Mercury Supabase project, enable the Email provider under **Authentication → Sign In / Providers**.
2. Under **Authentication → Email Templates → Magic Link**, make the email contain `{{ .Token }}` so Supabase sends a code instead of only a link. For example: `<p>Your Mercury sign-in code is {{ .Token }}</p>`. Keep other templates intact.
3. Configure a custom SMTP sender before inviting people outside the Supabase project team. Supabase's built-in sender is restricted and is not intended for production delivery. Review the project's email rate limits and sender reputation.
4. Keep `MERCURY_ALLOWED_EMAILS` or `MERCURY_ADMIN_EMAIL` populated during the private pilot. The email option does not open account access to everyone until `MERCURY_PUBLIC_LAUNCH=true` is deliberately enabled.

The form does not use an email callback URL: users enter the code on the same Mercury origin where they requested it. A host-only, HTTP-only cookie holds the pending email for 15 minutes. It is cleared after successful verification. The Supabase session uses the existing SSR cookies, and the safe `return_to` path takes the user back to the page they were trying to open.

## Verify

1. On `http://localhost:3000/signin`, enter an allowlisted email. Check that its inbox receives a six-digit code. Do not paste the code or session cookies into a report.
2. Enter the code, then confirm `/api/session` shows the signed-in account and the requested page opens. For a new account, complete Mercury's consent step before saving or booking.
3. Check an invalid code, an expired pending attempt, an uninvited email, and a resend after Supabase's cooldown. No code should be sent to uninvited emails.

Official guidance: [Supabase passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless), [identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
