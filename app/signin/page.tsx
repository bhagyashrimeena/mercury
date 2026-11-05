import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSupabaseServer } from '../../lib/supabase/server';
import { oauthOrigin, publicBrowse, siteOrigin } from '../../lib/site-config';
import { safeReturnPath } from '../../lib/return-path';
import { getDatabase } from '../../db/vercel';
import { recordMetric } from '../../server/metrics.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in — Mercury', description: 'Sign in to Mercury to save games and manage free bookings.' };

type Search = { return_to?: string; error?: string };

export default async function SignIn({ searchParams }: { searchParams: Promise<Search> }) {
  const { return_to, error } = await searchParams;
  const destination = safeReturnPath(return_to, '/account');
  const message = error === 'access'
    ? 'This Google account is not on the private pilot list yet. Ask the Mercury owner to add it, or choose a different Google account.'
    : error === 'callback'
      ? 'Google sign-in could not be completed. Please try again. If it keeps happening, contact Mercury support.'
      : error === 'start'
        ? 'Google sign-in could not start. Please try again. If it keeps happening, contact Mercury support.'
      : error === 'configuration'
        ? 'Sign-in is temporarily unavailable. Please contact Mercury support.'
        : null;

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
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(destination)}`,
          queryParams: { prompt: 'select_account' },
        },
      });
    } catch { /* Show the same recoverable state as a provider error. */ }
    if (!oauth?.data.url || oauth.error) {
      try { await recordMetric(getDatabase(), 'signin_error'); } catch { /* Analytics never blocks sign-in. */ }
      redirect('/signin?' + new URLSearchParams({ return_to: destination, error: 'start' }));
    }
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
          <p>Sign in with Google to save events or book free Mercury games. External event entries are confirmed by the organizer.</p>
        </section>
        <section className="signin-panel" aria-labelledby="signin-title">
          <p className="eyebrow blue">YOUR MERCURY ACCOUNT</p>
          <h2 id="signin-title">Continue with Google</h2>
          <p>Use your own Google account to save games and manage your bookings.</p>
          {message && <p className="signin-error" role="alert">{message}</p>}
          <form action={beginSignIn}>
            <button className="button primary" type="submit">Continue with Google <span aria-hidden="true">↗</span></button>
          </form>
          {publicBrowse() && <Link className="button outline" href="/explore">Continue browsing</Link>}
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
