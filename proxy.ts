import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { publicBrowse } from './lib/site-config';
import { isPublicApiRequest, isPublicPage } from './lib/public-routes';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;
  if (['/signin', '/signout', '/auth/callback', '/robots.txt', '/opengraph-image', '/privacy', '/terms', '/support', '/about', '/how-it-works', '/for-organizers', '/list-event'].includes(path)) return response;
  if (publicBrowse() && (isPublicPage(path) || isPublicApiRequest(path, request.method))) return response;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  let authenticated = false;
  if (url && key) {
    try {
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
      const { data: { user }, error } = await supabase.auth.getUser();
      authenticated = !error && !!user?.id && !!user.email;
    } catch {
      // A provider outage must never grant access to private pages.
      response = NextResponse.next({ request });
    }
  }
  if (path === '/api/session' || (path === '/api/support' && request.method === 'POST')) return response;
  if (authenticated) return response;
  if (path.startsWith('/api/')) return Response.json({ error: { code: 'sign_in_required', message: 'Sign in to continue.' } }, { status: 401 });
  const destination = new URL('/signin', request.nextUrl.origin);
  destination.searchParams.set('return_to', path + request.nextUrl.search);
  const redirect = NextResponse.redirect(destination);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = { matcher: ['/((?!_next/|.*\\.[^/]+$).*)'] };
