import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { safeReturnPath } from '../../../lib/return-path';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get('next');
  const destination = safeReturnPath(next, '/account');
  const response = NextResponse.redirect(new URL(destination, url.origin));
  const supabaseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const code = url.searchParams.get('code');
  if (!supabaseUrl || !key || !code) return NextResponse.redirect(new URL('/signin', url.origin));
  const client = createServerClient(supabaseUrl, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(items: { name: string; value: string; options: CookieOptions }[]) { for (const { name, value, options } of items) response.cookies.set(name, value, options); },
    },
  });
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL('/signin', url.origin));
  return response;
}
