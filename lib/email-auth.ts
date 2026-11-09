import { siteOrigin } from './site-config';

export const EMAIL_PENDING_COOKIE = 'mercury_email_pending';

export function emailCookieOptions(maxAge = 15 * 60) {
  return { httpOnly: true, sameSite: 'lax' as const, secure: siteOrigin().startsWith('https:'), path: '/signin', maxAge };
}

export function formReturnPath(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : null;
}
