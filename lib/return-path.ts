export function safeReturnPath(value: string | null | undefined, fallback = '/') {
  if (!value?.startsWith('/') || value.startsWith('//')) return fallback;
  try {
    const url = new URL(value, 'https://mercury.invalid');
    if (url.origin !== 'https://mercury.invalid') return fallback;
    if (['/signin', '/signout', '/auth/callback'].includes(url.pathname)) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
