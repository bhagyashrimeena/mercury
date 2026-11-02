export function siteOrigin() {
  const fallback=process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  try { const u=new URL(process.env.MERCURY_SITE_ORIGIN || fallback); return ['https:','http:'].includes(u.protocol) && !u.username && !u.password ? u.origin : fallback; }
  catch { return fallback; }
}
export function publicLaunch() { return process.env.MERCURY_PUBLIC_LAUNCH === 'true'; }
