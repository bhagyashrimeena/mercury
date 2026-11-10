import test from 'node:test';
import assert from 'node:assert/strict';
import { auditProduction } from '../scripts/smoke-production.mjs';

const responses = {
  '/explore': '<div data-server-path="/explore"><header class="explore-intro">Mercury</header><h2>On the calendar</h2></div>',
  '/explore.js': 'function rankForDiscovery() {} const className = "explore-sports";',
  '/styles.css': '/* Mercury Explore Playboard v1 */ .explore-page .directory-card {}',
  '/api/listings': JSON.stringify({ listings: [{ id: 'test' }] }),
  '/api/events': JSON.stringify({ events: [] })
};
function fixtureRequest(overrides = {}) {
  const calls = [];
  const request = async (input, options) => {
    const url = new URL(input);
    calls.push({ url: url.pathname, options });
    const body = { ...responses, ...overrides }[url.pathname];
    if (body == null) return new Response('Not found', { status: 404 });
    return new Response(body, { status: 200, headers: { 'Content-Type': url.pathname.startsWith('/api/') ? 'application/json' : 'text/plain' } });
  };
  return { request, calls };
}

test('production smoke checks the shipped UI and read-only public endpoints without mutations', async () => {
  const { request, calls } = fixtureRequest();
  const result = await auditProduction({ request });
  assert.equal(result.passed, true);
  assert.equal(result.checks.length, 5);
  assert.ok(result.checks.every(check => check.verdict === 'pass'));
  assert.deepEqual(calls.map(call => call.url),
    ['/explore', '/explore.js', '/styles.css', '/api/listings', '/api/events']);
  assert.ok(calls.every(call => call.options.method === 'GET'));
  assert.ok(calls.every(call => !Object.keys(call.options.headers).some(key => /authorization/i.test(key))));
});

test('production smoke fails when an obsolete or misrouted Explore asset is served', async () => {
  const { request } = fixtureRequest({ '/explore.js': '/* previous release */' });
  const result = await auditProduction({ request });
  assert.equal(result.passed, false);
  assert.equal(result.checks.find(check => check.name === 'Playboard JavaScript').verdict, 'fail');
});

test('production smoke detects a public API returning HTML instead of expected JSON', async () => {
  const { request } = fixtureRequest({ '/api/listings': '<html>Sign in</html>' });
  const result = await auditProduction({ request });
  assert.equal(result.passed, false);
  assert.equal(result.checks.find(check => check.name === 'Public listing API').verdict, 'fail');
});

test('production smoke rejects non-HTTPS origins', async () => {
  await assert.rejects(() => auditProduction({ origin: 'http://example.org', request: async () => {} }), /HTTPS/);
});
