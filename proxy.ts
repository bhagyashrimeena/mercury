import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { canEnterPrivatePilot } from './lib/access';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  let email: string | undefined;
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(items: { name: string; value: string; options: CookieOptions }[]) {
          for (const { name, value } of items) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of items) response.cookies.set(name, value, options);
        },
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    email = user?.email;
  }
  if (process.env.MERCURY_PUBLIC_LAUNCH === 'true') return response;
  const path = request.nextUrl.pathname;
  if (path === '/signin' || path === '/signout' || path === '/auth/callback' || path === '/robots.txt') return response;
  if (canEnterPrivatePilot(email)) return response;
  if (path.startsWith('/api/')) return Response.json({ error: { code: 'sign_in_required', message: 'Sign in to continue.' } }, { status: 401 });
  const destination = new URL('/signin', request.nextUrl.origin);
  destination.searchParams.set('return_to', path + request.nextUrl.search);
  const redirect = NextResponse.redirect(destination);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = { matcher: ['/((?!_next/|.*\\.[^/]+$).*)'] };
