// Keep the Supabase redirect URI stable so an exact allowlist entry matches.
// The post-login destination stays on this browser's origin, not in redirectTo.
export const OAUTH_CALLBACK_PATH = '/auth/callback';
export const OAUTH_RETURN_COOKIE = 'mercury_oauth_return_to';

export function oauthReturnCookieOptions(origin: string) {
  return {
    path: OAUTH_CALLBACK_PATH,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: new URL(origin).protocol === 'https:',
    maxAge: 10 * 60,
  };
}
