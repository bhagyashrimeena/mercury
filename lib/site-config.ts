export function siteOrigin() {
  const fallback=process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  try { const u=new URL(process.env.MERCURY_SITE_ORIGIN || fallback); return ['https:','http:'].includes(u.protocol) && !u.username && !u.password ? u.origin : fallback; }
  catch { return fallback; }
}
export function publicLaunch() { return process.env.MERCURY_PUBLIC_LAUNCH === 'true'; }
export function publicBrowse() { return publicLaunch() || process.env.MERCURY_PUBLIC_BROWSE === 'true'; }

export function oauthOrigin(hostHeader: string | null, canonical: string, vercelHost = process.env.VERCEL_URL) {
  const configured = new URL(canonical);
  const host = hostHeader?.trim().toLowerCase();
  if (!host) return configured.origin;
  const allowed = new Set([configured.host.toLowerCase()]);
  if (configured.protocol === 'https:' && !configured.port) {
    allowed.add(configured.hostname.startsWith('www.') ? configured.hostname.slice(4) : `www.${configured.hostname}`);
  }
  if (vercelHost) allowed.add(vercelHost.toLowerCase());
  if (!allowed.has(host)) return configured.origin;
  const protocol = host === configured.host.toLowerCase() ? configured.protocol : 'https:';
  return `${protocol}//${host}`;
}
