'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { canEnterPrivatePilot } from '../../lib/access';
import { EMAIL_PENDING_COOKIE, emailCookieOptions, formReturnPath } from '../../lib/email-auth';
import { safeReturnPath } from '../../lib/return-path';
import { createSupabaseServer } from '../../lib/supabase/server';

function signInUrl(destination: string, state: string, step?: string) {
  const params = new URLSearchParams({ return_to: destination });
  params.set('email_state', state);
  if (step) params.set('step', step);
  return '/signin?' + params;
}

export async function requestEmailCode(formData: FormData) {
  const destination = safeReturnPath(formReturnPath(formData.get('return_to')), '/account');
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect(signInUrl(destination, 'email-invalid'));
  if (!canEnterPrivatePilot(email)) redirect(signInUrl(destination, 'email-access'));

  let supabase;
  try { supabase = await createSupabaseServer(); } catch { /* Use the same recoverable configuration state. */ }
  if (!supabase) redirect(signInUrl(destination, 'configuration'));

  let sent = false;
  try {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    sent = !error;
  } catch { /* Show a recoverable state without exposing provider details. */ }
  if (!sent) redirect(signInUrl(destination, 'email-send'));

  (await cookies()).set(EMAIL_PENDING_COOKIE, email, emailCookieOptions());
  redirect(signInUrl(destination, 'email-sent', 'email'));
}

export async function verifyEmailCode(formData: FormData) {
  const destination = safeReturnPath(formReturnPath(formData.get('return_to')), '/account');
  const jar = await cookies();
  const email = jar.get(EMAIL_PENDING_COOKIE)?.value;
  if (!email || !canEnterPrivatePilot(email)) redirect(signInUrl(destination, 'email-expired'));
  const token = String(formData.get('code') || '').trim();
  if (!/^\d{6}$/.test(token)) redirect(signInUrl(destination, 'email-code', 'email'));

  let supabase;
  try { supabase = await createSupabaseServer(); } catch { /* Use the same recoverable configuration state. */ }
  if (!supabase) redirect(signInUrl(destination, 'configuration', 'email'));

  let userEmail: string | undefined;
  try {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (!error) userEmail = data.user?.email;
  } catch { /* Expired or invalid codes use the same retry state. */ }
  if (!userEmail) redirect(signInUrl(destination, 'email-code', 'email'));
  if (userEmail.toLowerCase() !== email || !canEnterPrivatePilot(userEmail)) {
    try { await supabase.auth.signOut(); } catch { /* Access is denied independently by the proxy and API. */ }
    jar.set(EMAIL_PENDING_COOKIE, '', emailCookieOptions(0));
    redirect(signInUrl(destination, 'email-access'));
  }

  jar.set(EMAIL_PENDING_COOKIE, '', emailCookieOptions(0));
  redirect(destination);
}
