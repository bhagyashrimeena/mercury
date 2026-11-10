// Read-only production smoke check. Never uses account tokens or changes user data.
// Run: node scripts/smoke-production.mjs [https://www.playonmercury.com]
const DEFAULT_ORIGIN = 'https://www.playonmercury.com';
const TIMEOUT_MS = 15000;

export async function auditProduction({ origin = DEFAULT_ORIGIN, request = fetch } = {}) {
  const base = new URL(origin);
  if (base.protocol !== 'https:') throw Error('Production smoke check requires an HTTPS origin.');
  const checks = [];
  const run = async (name, path, validate, critical = true) => {
    const url = new URL(path, base);
    let check = { name, status: null, verdict: 'fail', detail: '' };
    try {
      const response = await request(url.toString(), {
        method: 'GET',
        redirect: 'follow',
        headers: { 'Accept': path.startsWith('/api/') ? 'application/json' : '*/*',
          'Cache-Control': 'no-cache', 'User-Agent': 'MercuryReadOnlySmoke/1.0' },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      check.status = response.status;
      const finalUrl = new URL(response.url || url.toString());
      if (finalUrl.origin !== base.origin) {
        throw Error('Redirected away from the intended production origin.');
      }
      if (!response.ok) throw Error('Unexpected HTTP status ' + response.status);
      const value = await (path.startsWith('/api/') ? response.json() : response.text());
      const detail = validate(value);
      check = { ...check, verdict: 'pass', detail: detail || 'OK' };
    } catch (error) {
      check.detail = error instanceof Error ? error.message : 'Request failed';
      if (!critical) check.verdict = 'warning';
    }
    checks.push(check);
  };

  // HTML + browser assets prove that production serves the merged Playboard.
  await run('Explore route', '/explore', html => {
    if (typeof html !== 'string' || !html.includes('data-server-path="/explore"'))
      throw Error('Explore did not return the expected server-rendered Mercury route.');
    if (!html.includes('explore-intro') || !html.includes('Explore events'))
      throw Error('Explore does not contain the compact Playboard server fallback.');
    return 'Server-rendered Explore present';
  });
  await run('Playboard JavaScript', '/explore.js', javascript => {
    if (typeof javascript !== 'string' || !javascript.includes('rankForDiscovery') ||
        !javascript.includes('explore-sports'))
      throw Error('Production Explore script is missing the new discovery UI.');
    return 'Playboard discovery script present';
  });
  await run('Playboard styles', '/styles.css', css => {
    if (typeof css !== 'string' || !css.includes('Mercury Explore Playboard v1') ||
        !css.includes('.explore-page .directory-card'))
      throw Error('Production stylesheet does not contain compact Playboard styles.');
    return 'Compact responsive styles present';
  });

  // Public reads only. Never follow external organizer links or submit a booking.
  await run('Public listing API', '/api/listings', data => {
    if (!Array.isArray(data?.listings)) throw Error('Expected a listings array.');
    return data.listings.length + ' external listings returned';
  });
  await run('Public game API', '/api/events', data => {
    if (!Array.isArray(data?.events)) throw Error('Expected an events array.');
    return data.events.length + ' native games returned';
  });
  return { origin: base.origin, checks, passed: checks.every(c => c.verdict !== 'fail') };
}

const calledDirectly = process.argv[1] &&
  new URL(import.meta.url).pathname === new URL('file://' + process.argv[1].replace(/\\/g, '/')).pathname;
if (calledDirectly) {
  try {
    const result = await auditProduction({ origin: process.argv[2] || process.env.MERCURY_SMOKE_ORIGIN || DEFAULT_ORIGIN });
    for (const c of result.checks)
      console.log('[' + c.verdict.toUpperCase() + '] ' + c.name +
        ' · ' + (c.status ?? 'network') + ' · ' + c.detail);
    console.log(result.passed ? 'Production smoke check passed.' : 'Production smoke check failed. Keep the deployment under review.');
    if (!result.passed) process.exitCode = 1;
  } catch (error) {
    console.error('Production smoke check error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    process.exitCode = 1;
  }
}
