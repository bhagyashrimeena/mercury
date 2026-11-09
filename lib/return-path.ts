export function safeReturnPath(value: string | null | undefined, fallback = '/') {
  if (!value?.startsWith('/') || value.startsWith('//')) return fallback;
  try {
    const url = new URL(value, 'https://mercury.invalid');
    // Dot segments can normalize a single-slash input into //host. Reject that
    // result too, before it is resolved again against the callback origin.
    if (url.origin !== 'https://mercury.invalid' || url.pathname.startsWith('//')) return fallback;
    if (['/signin', '/signout', '/auth/callback'].includes(url.pathname)) return fallback;
    // A provider fallback can land at /?code=... before the pilot gate sends the
    // browser to /signin. Never carry those credentials into a retry destination.
    const authParameters = ['code', 'access_token', 'refresh_token', 'provider_token', 'provider_refresh_token', 'id_token', 'token_hash'];
    for (const key of authParameters) {
      if (url.searchParams.has(key)) url.searchParams.delete(key);
    }
    const fragment = new URLSearchParams(url.hash.slice(1));
    if (authParameters.some(key => fragment.has(key))) url.hash = '';
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
