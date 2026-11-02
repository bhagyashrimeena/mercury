import { redirect } from 'next/navigation';
import { createSupabaseServer } from '../../lib/supabase/server';
import { safeReturnPath } from '../../lib/return-path';

export const dynamic = 'force-dynamic';

export default async function SignOut({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const { return_to } = await searchParams;
  const destination = safeReturnPath(return_to);
  async function finishSignOut() {
    'use server';
    const supabase = await createSupabaseServer();
    if (supabase) await supabase.auth.signOut();
    redirect(destination);
  }
  return <main className="page-width prose"><h1>Sign out of Mercury</h1><form action={finishSignOut}><button className="button primary" type="submit">Sign out</button></form></main>;
}
