import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { safeReturnPath } from '../../../lib/return-path';
import { OAUTH_RETURN_COOKIE, oauthReturnCookieOptions } from '../../../lib/oauth-redirect';
import { canEnterPrivatePilot } from '../../../lib/access';
import { getDatabase } from '../../../db/vercel';
import { recordMetric } from '../../../server/metrics.js';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  // Accept next for flows started before this patch. New flows use the local cookie.
  const next = request.cookies.get(OAUTH_RETURN_COOKIE)?.value || url.searchParams.get('next');
  const destination = safeReturnPath(next, '/account');
  const clearReturnCookie = (response: NextResponse) => {
    response.cookies.set(OAUTH_RETURN_COOKIE, '', { ...oauthReturnCookieOptions(url.origin), maxAge: 0 });
    return response;
  };
  const signInError = async (reason: string) => {
    if (reason === 'access' || (['callback', 'configuration'].includes(reason) && url.searchParams.has('code'))) {
      try { await recordMetric(getDatabase(), 'signin_error'); } catch { /* Analytics never blocks the return path. */ }
    }
    const target = new URL('/signin', url.origin);
    target.searchParams.set('return_to', destination);
    target.searchParams.set('error', reason);
    return clearReturnCookie(NextResponse.redirect(target));
  };
  const response = NextResponse.redirect(new URL(destination, url.origin));
  const supabaseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const code = url.searchParams.get('code');
  if (!supabaseUrl || !key) return signInError('configuration');
  if (!code) return signInError('callback');
  let client;
  try {
    client = createServerClient(supabaseUrl, key, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(items: { name: string; value: string; options: CookieOptions }[]) { for (const { name, value, options } of items) response.cookies.set(name, value, options); },
      },
    });
  } catch { return signInError('configuration'); }
  let exchange;
  try { exchange = await client.auth.exchangeCodeForSession(code); }
  catch { return signInError('callback'); }
  if (exchange.error || !exchange.data.user) return signInError('callback');
  if (!canEnterPrivatePilot(exchange.data.user.email)) return signInError('access');
  return clearReturnCookie(response);
}
