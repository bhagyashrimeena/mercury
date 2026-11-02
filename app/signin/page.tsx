import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSupabaseServer } from '../../lib/supabase/server';
import { siteOrigin } from '../../lib/site-config';
import { safeReturnPath } from '../../lib/return-path';

export const dynamic = 'force-dynamic';

export default async function SignIn({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const { return_to } = await searchParams;
  const destination = safeReturnPath(return_to, '/account');
  async function beginSignIn() {
    'use server';
    const supabase = await createSupabaseServer();
    if (!supabase) throw new Error('Sign-in is not configured.');
    const requestHeaders = await headers();
    const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host');
    const canonical = siteOrigin();
    const trustedHost = host && (host.endsWith('.vercel.app') || host === new URL(canonical).host || host === 'localhost:3000');
    const origin = trustedHost ? `${host === 'localhost:3000' ? 'http' : 'https'}://${host}` : canonical;
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(destination)}` } });
    if (error || !data.url) throw new Error('Could not start sign-in.');
    redirect(data.url);
  }
  return <main className="page-width prose"><h1>Sign in to Mercury</h1><p>Use your Google account to save games and manage registrations.</p><form action={beginSignIn}><button className="button primary" type="submit">Continue with Google</button></form></main>;
}
