import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { safeReturnPath } from '../lib/return-path.ts';
import { oauthOrigin } from '../lib/site-config.ts';
import { OAUTH_CALLBACK_PATH, OAUTH_RETURN_COOKIE, oauthReturnCookieOptions } from '../lib/oauth-redirect.ts';

// Execute the real action/callback bodies with offline mocks. These unit tests do
// not claim to replace a Next.js build or a real browser/provider round trip.
const pageSource = readFileSync(new URL('../app/signin/page.tsx', import.meta.url), 'utf8');
const actionSource = pageSource.slice(pageSource.indexOf('  async function beginSignIn() {'), pageSource.indexOf('\n  return ('));
const callbackSource = stripTypeScriptTypes(readFileSync(new URL('../app/auth/callback/route.ts', import.meta.url), 'utf8'))
  .replace(/^import .*?;\s*$/gm, '').replace(/^export /gm, '');

class CookieJar {
  values = new Map();
  set(name, value, options = {}) { this.values.set(name, { name, value, ...options }); }
  get(name) { return this.values.get(name); }
  getAll() { return [...this.values.values()]; }
}
class MockResponse {
  constructor(url) { this.url = String(url); this.cookies = new CookieJar(); }
  static redirect(url) { return new MockResponse(url); }
}
class Redirect extends Error {
  constructor(url) { super('redirect'); this.url = url; }
}
function loadBody(source, name, dependencies) {
  return new Function(...Object.keys(dependencies), `${source}\nreturn ${name};`)(...Object.values(dependencies));
}
function startHarness({ destination = '/account', origin = 'http://localhost:3000', failure, metricFailure = false } = {}) {
  const jar = new CookieJar();
  const calls = [];
  const dependencies = {
    destination, cookies: async () => jar,
    headers: async () => new Headers({ host: new URL(origin).host }),
    oauthOrigin, siteOrigin: () => origin, OAUTH_CALLBACK_PATH, OAUTH_RETURN_COOKIE, oauthReturnCookieOptions,
    getDatabase: () => null,
    recordMetric: async () => { if (metricFailure) throw new Error('offline'); },
    redirect: url => { throw new Redirect(url); },
    createSupabaseServer: async () => failure === 'configuration' ? null : ({ auth: { signInWithOAuth: async args => {
      calls.push(args);
      if (failure === 'throw') throw new Error('offline');
      if (failure === 'provider') return { data: { url: null }, error: new Error('provider') };
      jar.set('mock-pkce-verifier', 'mock-verifier', { path: '/' });
      return { data: { url: 'https://auth.example.test/authorize' }, error: null };
    } } }),
  };
  return { jar, calls, begin: loadBody(actionSource, 'beginSignIn', dependencies) };
}
function callbackHarness(t, { failure, allowed = true, configured = true, metricFailure = false } = {}) {
  const previous = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_PUBLISHABLE_KEY };
  process.env.SUPABASE_URL = configured ? 'https://auth.example.test' : '';
  process.env.SUPABASE_PUBLISHABLE_KEY = configured ? 'mock-publishable-key' : '';
  t.after(() => {
    if (previous.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previous.url;
    if (previous.key === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = previous.key;
  });
  const exchanges = [];
  const dependencies = {
    NextResponse: MockResponse, safeReturnPath, OAUTH_RETURN_COOKIE, oauthReturnCookieOptions,
    canEnterPrivatePilot: () => allowed, getDatabase: () => null,
    recordMetric: async () => { if (metricFailure) throw new Error('offline'); },
    createServerClient: (_url, _key, { cookies }) => {
      if (failure === 'configuration') throw new Error('invalid config');
      return { auth: { exchangeCodeForSession: async code => {
        exchanges.push({ code, cookies: cookies.getAll() });
        if (failure === 'throw') throw new Error('offline');
        if (failure === 'exchange') return { error: new Error('invalid or reused code'), data: { user: null } };
        cookies.setAll([{ name: 'mock-session', value: 'mock-session-value', options: { path: '/', httpOnly: true } }]);
        return { error: null, data: { user: { email: 'player@example.test' } } };
      } } };
    },
  };
  const get = loadBody(callbackSource, 'GET', dependencies);
  return { exchanges, request: async (url = 'http://localhost:3000/auth/callback?code=mock-code', returnPath, jar = new CookieJar()) => {
    if (returnPath !== undefined) jar.set(OAUTH_RETURN_COOKIE, returnPath);
    return get({ url, cookies: jar });
  } };
}
function assertCleared(response) {
  const cookie = response.cookies.get(OAUTH_RETURN_COOKIE);
  assert.equal(cookie.value, '');
  assert.equal(cookie.maxAge, 0);
  assert.equal(cookie.path, OAUTH_CALLBACK_PATH);
  assert.equal(cookie.httpOnly, true);
}

test('OAuth uses an exact callback URI regardless of the post-login page', async () => {
  for (const destination of ['/account', '/my-games', '/event/test?view=booking#details']) {
    const { begin, calls, jar } = startHarness({ destination });
    await assert.rejects(begin(), error => error instanceof Redirect && error.url === 'https://auth.example.test/authorize');
    assert.equal(calls[0].options.redirectTo, 'http://localhost:3000/auth/callback');
    assert.deepEqual(calls[0].options.queryParams, { prompt: 'select_account' });
    assert.equal(jar.get(OAUTH_RETURN_COOKIE).value, destination);
    assert.equal(jar.get('mock-pkce-verifier').value, 'mock-verifier');
  }
});

test('return cookie is short-lived, host-only, HTTP-only and secure on HTTPS', () => {
  const local = oauthReturnCookieOptions('http://localhost:3000');
  assert.deepEqual(local, { path: '/auth/callback', httpOnly: true, sameSite: 'lax', secure: false, maxAge: 600 });
  const hosted = oauthReturnCookieOptions('https://www.playonmercury.com');
  assert.equal(hosted.secure, true);
  assert.equal(Object.hasOwn(hosted, 'domain'), false);
});

test('configuration/provider failures preserve a visible retry destination', async () => {
  for (const failure of ['configuration', 'provider', 'throw']) {
    const { begin, jar } = startHarness({ failure, destination: '/my-games' });
    await assert.rejects(begin(), error => {
      const url = new URL(error.url, 'http://localhost:3000');
      return error instanceof Redirect && url.pathname === '/signin' && url.searchParams.get('return_to') === '/my-games' && url.searchParams.get('error') === (failure === 'configuration' ? 'configuration' : 'start');
    });
    assert.equal(jar.get(OAUTH_RETURN_COOKIE), undefined);
  }
});

test('metrics failure cannot prevent OAuth redirect', async () => {
  const { begin } = startHarness({ metricFailure: true });
  await assert.rejects(begin(), error => error instanceof Redirect && error.url === 'https://auth.example.test/authorize');
});

test('fixed callback completes with the initiating browser cookies and original destination', async t => {
  const start = startHarness({ destination: '/event/test?view=booking#details' });
  await assert.rejects(start.begin(), Redirect);
  const { request, exchanges } = callbackHarness(t);
  const response = await request('http://localhost:3000/auth/callback?code=mock-code', undefined, start.jar);
  assert.equal(response.url, 'http://localhost:3000/event/test?view=booking#details');
  assert.equal(exchanges[0].cookies.find(c => c.name === 'mock-pkce-verifier').value, 'mock-verifier');
  assert.equal(response.cookies.get('mock-session').value, 'mock-session-value');
  assertCleared(response);
});

test('old next links still work, but a new flow cookie takes precedence', async t => {
  const { request } = callbackHarness(t);
  assert.equal((await request('http://localhost:3000/auth/callback?code=mock-code&next=%2Fmy-games')).url, 'http://localhost:3000/my-games');
  const response = await request('http://localhost:3000/auth/callback?code=mock-code&next=%2Fexplore', '/my-games');
  assert.equal(response.url, 'http://localhost:3000/my-games');
  assertCleared(response);
});

test('missing return state safely defaults to account', async t => {
  const { request } = callbackHarness(t);
  assert.equal((await request()).url, 'http://localhost:3000/account');
});

test('tampered return cookies cannot redirect outside Mercury or restart OAuth', async t => {
  const { request } = callbackHarness(t);
  for (const path of ['https://evil.example', '//evil.example', '/\\evil.example', '/signin', '/auth/callback?code=x', '/signout', '/a/..//evil.example', '/.//evil.example', '/%2e//evil.example', '/a/%2e%2e//evil.example']) {
    assert.equal((await request(undefined, path)).url, 'http://localhost:3000/account');
    assert.equal((await request(`http://localhost:3000/auth/callback?code=mock-code&next=${encodeURIComponent(path)}`)).url, 'http://localhost:3000/account');
  }
});

test('missing or cancelled callbacks do not exchange and clear stale navigation state', async t => {
  const { request, exchanges } = callbackHarness(t);
  for (const suffix of ['', '?error=access_denied']) {
    const response = await request(`http://localhost:3000/auth/callback${suffix}`, '/my-games');
    const url = new URL(response.url);
    assert.equal(url.pathname, '/signin');
    assert.equal(url.searchParams.get('error'), 'callback');
    assert.equal(url.searchParams.get('return_to'), '/my-games');
    assertCleared(response);
  }
  assert.equal(exchanges.length, 0);
});

for (const failure of ['exchange', 'throw', 'configuration']) {
  test(`callback ${failure} failure is recoverable and clears the return cookie`, async t => {
    const { request } = callbackHarness(t, { failure, metricFailure: true });
    const response = await request(undefined, '/my-games');
    const url = new URL(response.url);
    assert.equal(url.pathname, '/signin');
    assert.equal(url.searchParams.get('error'), failure === 'configuration' ? 'configuration' : 'callback');
    assert.equal(url.searchParams.get('return_to'), '/my-games');
    assert.equal(response.cookies.get('mock-session'), undefined);
    assertCleared(response);
  });
}

test('private-pilot denial never issues the exchanged session cookies', async t => {
  const { request } = callbackHarness(t, { allowed: false });
  const response = await request(undefined, '/my-games');
  assert.equal(new URL(response.url).searchParams.get('error'), 'access');
  assert.equal(response.cookies.get('mock-session'), undefined);
  assertCleared(response);
});

test('missing server config stays a configuration error', async t => {
  const { request, exchanges } = callbackHarness(t, { configured: false });
  const response = await request(undefined, '/my-games');
  assert.equal(new URL(response.url).searchParams.get('error'), 'configuration');
  assert.equal(exchanges.length, 0);
  assertCleared(response);
});

test('return paths discard credentials from a provider fallback and preserve ordinary navigation', () => {
  assert.equal(safeReturnPath('/?code=stale-code'), '/');
  assert.equal(safeReturnPath('/explore?sport=Football&code=stale-code#results'), '/explore?sport=Football#results');
  assert.equal(safeReturnPath('/?access_token=mock&refresh_token=mock&provider_token=mock&provider_refresh_token=mock&id_token=mock&token_hash=mock'), '/');
  assert.equal(safeReturnPath('/#access_token=mock&refresh_token=mock'), '/');
  assert.equal(safeReturnPath('//evil.example', '/account'), '/account');
  assert.equal(safeReturnPath('/auth/callback?code=stale-code', '/account'), '/account');
});
