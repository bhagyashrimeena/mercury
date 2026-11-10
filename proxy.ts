import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { canEnterPrivatePilot } from './lib/access';
import { publicBrowse } from './lib/site-config';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  let email: string | undefined;
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
      const { data: { user } } = await supabase.auth.getUser();
      email = user?.email;
    } catch {
      // A provider outage must never grant private-pilot access or hide the sign-in page.
      response = NextResponse.next({ request });
    }
  }
  if (process.env.MERCURY_PUBLIC_LAUNCH === 'true') return response;
  const path = request.nextUrl.pathname;
  if (['/signin', '/signout', '/auth/callback', '/robots.txt', '/opengraph-image', '/privacy', '/terms', '/support', '/about', '/how-it-works'].includes(path)) return response;
  if (path === '/api/session' || (path === '/api/support' && request.method === 'POST')) return response;
  if (publicBrowse()) {
    const browsePage = path === '/' || path === '/explore' || /^\/(listing|event)\/[^/]+$/.test(path);
    const browseApi = request.method === 'GET' && (/^\/api\/(events|listings)(\/[^/]+)?$/.test(path));
    const publicCount = request.method === 'POST' && (path === '/api/metrics' || /^\/api\/listings\/[^/]+\/click$/.test(path));
    if (browsePage || browseApi || publicCount) return response;
  }
  if (canEnterPrivatePilot(email)) return response;
  if (path.startsWith('/api/')) return Response.json({ error: { code: 'sign_in_required', message: 'Sign in to continue.' } }, { status: 401 });
  const destination = new URL('/signin', request.nextUrl.origin);
  destination.searchParams.set('return_to', path + request.nextUrl.search);
  const redirect = NextResponse.redirect(destination);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = { matcher: ['/((?!_next/|.*\\.[^/]+$).*)'] };
