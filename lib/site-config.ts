import { env } from 'cloudflare:workers';
export function siteOrigin() {
  const fallback='https://mercury-play-ririi.bhagyashrimeena2004.chatgpt.site';
  try { const u=new URL(env.MERCURY_SITE_ORIGIN || fallback); return u.protocol==='https:' && !u.username && !u.password ? u.origin : fallback; }
  catch { return fallback; }
}
export function publicLaunch() { return env.MERCURY_PUBLIC_LAUNCH === 'true'; }
