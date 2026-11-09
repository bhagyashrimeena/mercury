import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { createSupabaseServer } from '../../lib/supabase/server';
import { oauthOrigin, publicBrowse, siteOrigin } from '../../lib/site-config';
import { safeReturnPath } from '../../lib/return-path';
import { OAUTH_CALLBACK_PATH, OAUTH_RETURN_COOKIE, oauthReturnCookieOptions } from '../../lib/oauth-redirect';
import { EMAIL_PENDING_COOKIE } from '../../lib/email-auth';
import { requestEmailCode, verifyEmailCode } from './email-actions';
import { getDatabase } from '../../db/vercel';
import { recordMetric } from '../../server/metrics.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in — Mercury', description: 'Sign in to Mercury to save games and manage free bookings.' };

type Search = { return_to?: string; error?: string; step?: string; email_state?: string };

export default async function SignIn({ searchParams }: { searchParams: Promise<Search> }) {
  const { return_to, error, step, email_state } = await searchParams;
  const destination = safeReturnPath(return_to, '/account');
  const pendingEmail = step === 'email' ? (await cookies()).get(EMAIL_PENDING_COOKIE)?.value : null;
  const message = error === 'access'
    ? 'This Google account is not on the private pilot list yet. Ask the Mercury owner to add it, or choose a different Google account.'
    : error === 'callback'
      ? 'Google sign-in could not be completed. Please try again. If it keeps happening, contact Mercury support.'
      : error === 'start'
        ? 'Google sign-in could not start. Please try again. If it keeps happening, contact Mercury support.'
      : error === 'configuration'
        ? 'Sign-in is temporarily unavailable. Please contact Mercury support.'
        : ({
          'email-invalid': 'Enter a valid email address.',
          'email-access': 'This email is not on the private pilot list yet. Ask the Mercury owner to add it, or use a different email.',
          'email-send': 'We could not send a code. Please try again in a minute or contact Mercury support.',
          'email-code': 'That code did not work. Check the latest email and try again.',
          'email-expired': 'Start again to get a new email code.',
        } as Record<string, string>)[email_state || ''] || null;

  async function beginSignIn() {
    'use server';
    let supabase;
    try { supabase = await createSupabaseServer(); } catch { /* Invalid server configuration uses the same recoverable state. */ }
    if (!supabase) redirect('/signin?' + new URLSearchParams({ return_to: destination, error: 'configuration' }));
    const requestHeaders = await headers();
    const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host');
    const origin = oauthOrigin(host, siteOrigin());
    let oauth;
    try {
      oauth = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}${OAUTH_CALLBACK_PATH}`,
          queryParams: { prompt: 'select_account' },
        },
      });
    } catch { /* Show the same recoverable state as a provider error. */ }
    if (!oauth?.data.url || oauth.error) {
      try { await recordMetric(getDatabase(), 'signin_error'); } catch { /* Analytics never blocks sign-in. */ }
      redirect('/signin?' + new URLSearchParams({ return_to: destination, error: 'start' }));
    }
    // Match the exact Supabase allowlist URL. Keep navigation state in a short-lived,
    // host-only cookie alongside the PKCE verifier instead of in redirectTo.
    const jar = await cookies();
    jar.set(OAUTH_RETURN_COOKIE, destination, oauthReturnCookieOptions(origin));
    try { await recordMetric(getDatabase(), 'signin_start'); } catch { /* Analytics never blocks sign-in. */ }
    redirect(oauth.data.url);
  }

  return (
    <main className="signin-page">
      <div className="signin-layout">
        <section className="signin-intro">
          <Link href="/" className="signin-brand" aria-label="Mercury home">
            <Image src="/assets/mark.svg" alt="" width={42} height={42} />mercury
          </Link>
          <p className="eyebrow">MUMBAI, IN PLAY</p>
          <h1>Keep your next game <em>close.</em></h1>
          <p>Explore games without an account. Sign in when you want to save a game or book a free Mercury place. External event entries are confirmed by the organizer.</p>
        </section>
        <section className="signin-panel" aria-labelledby="signin-title">
          <p className="eyebrow blue">YOUR MERCURY ACCOUNT</p>
          <h2 id="signin-title">Sign in or sign up</h2>
          <p>Use Google or your email to save games and manage your bookings.</p>
          {message && <p className="signin-error" role="alert">{message}</p>}
          <form action={beginSignIn}>
            <button className="button primary" type="submit">Continue with Google <span aria-hidden="true">↗</span></button>
          </form>
          <div className="signin-divider"><span>or</span></div>
          {pendingEmail ? <>
            <p>Enter the six-digit code sent to <strong>{pendingEmail}</strong>.</p>
            <p className="fine">If no code arrives and you previously used Google, continue with Google above.</p>
            <form action={verifyEmailCode}>
              <input type="hidden" name="return_to" value={destination} />
              <label htmlFor="signin-code">Email code</label>
              <input id="signin-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required />
              <button className="button primary" type="submit">Verify and continue</button>
            </form>
            <form action={requestEmailCode} className="signin-resend">
              <input type="hidden" name="return_to" value={destination} />
              <input type="hidden" name="email" value={pendingEmail} />
              <button className="text-link" type="submit">Send a new code</button>
            </form>
            <Link className="text-link" href={'/signin?' + new URLSearchParams({ return_to: destination })}>Use another email</Link>
          </> : <form action={requestEmailCode}>
            <input type="hidden" name="return_to" value={destination} />
            <label htmlFor="signin-email">Email address</label>
            <input id="signin-email" name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" />
            <button className="button outline" type="submit">Continue with email</button>
          </form>}
          {publicBrowse() && <>
            <Link className="button outline" href="/explore">Continue as guest</Link>
            <p className="fine">Browse without signing in. We’ll ask you to sign in if you save a game or book a place.</p>
          </>}
          <p className="fine">Mercury accounts are for adults 18 or older. A parent or guardian can browse junior events and check entry rules with the organizer.</p>
          <div className="signin-links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/support?category=Sign-in%20issue">Trouble signing in?</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
