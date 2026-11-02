import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServer() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const jar = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return jar.getAll(); },
      setAll(items: { name: string; value: string; options: CookieOptions }[]) {
        try { for (const { name, value, options } of items) jar.set(name, value, options); }
        catch { /* Server Components cannot write cookies; the proxy refreshes them. */ }
      },
    },
  });
}
