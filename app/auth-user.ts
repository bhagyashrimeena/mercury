import { createSupabaseServer } from '../lib/supabase/server';
import { canEnterPrivatePilot } from '../lib/access';

export type MercuryUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

export async function getMercuryUser(): Promise<MercuryUser | null> {
  const supabase = await createSupabaseServer();
  if (!supabase) return null;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.id || !user.email || !canEnterPrivatePilot(user.email)) return null;
  const name = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;
  return { userId: user.id, displayName: name || user.email, email: user.email, fullName: name };
}
