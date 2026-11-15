import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { isPublicApiRequest, isPublicPage } from '../lib/public-routes.ts';

const source = file => stripTypeScriptTypes(readFileSync(new URL(file, import.meta.url), 'utf8'))
  .replace(/^import .*?;\s*$/gm, '').replace(/^export /gm, '');

test('public accounts use verified identity regardless of obsolete pilot settings', async t => {
  const keys = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'MERCURY_PUBLIC_LAUNCH', 'MERCURY_ALLOWED_EMAILS', 'MERCURY_ADMIN_EMAIL'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  t.after(() => { for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; } });
  process.env.SUPABASE_URL = 'https://auth.example.test';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'test-key';
  process.env.MERCURY_ALLOWED_EMAILS = 'invited@example.test';
  process.env.MERCURY_ADMIN_EMAIL = 'owner@example.test';
  let user = { id: 'new-user', email: 'uninvited@example.test' }, error = null;
  const cookies = () => ({ getAll: () => [], set() {} });
  const NextResponse = {
    next: () => ({ allowed: true, cookies: cookies() }),
    redirect: url => ({ redirect: String(url), cookies: cookies() }),
  };
  const createServerClient = () => ({ auth: { getUser: async () => ({ data: { user }, error }) } });
  const proxy = new Function('NextResponse', 'createServerClient', 'publicBrowse', 'isPublicPage', 'isPublicApiRequest', source('../proxy.ts') + '\nreturn proxy;')(
    NextResponse, createServerClient, () => true, isPublicPage, isPublicApiRequest);
  const getUser = new Function('createSupabaseServer', source('../app/auth-user.ts') + '\nreturn getMercuryUser;')(async () => createServerClient());
  const request = path => ({ nextUrl: new URL('https://www.playonmercury.com' + path), method: 'GET', cookies: cookies() });
  for (const launch of ['false', 'true']) {
    process.env.MERCURY_PUBLIC_LAUNCH = launch;
    user = { id: 'new-user', email: 'uninvited@example.test' }; error = null;
    assert.equal((await proxy(request('/host'))).allowed, true);
    assert.equal((await getUser()).userId, 'new-user');
    error = Error('Identity verification unavailable');
    assert.match((await proxy(request('/host'))).redirect, /\/signin\?/);
    assert.equal(await getUser(), null);
    user = null; error = null;
    assert.equal((await proxy(request('/api/bookings'))).status, 401);
    assert.match((await proxy(request('/my-games'))).redirect, /\/signin\?/);
    assert.equal((await proxy(request('/api/session'))).allowed, true);
    assert.equal((await proxy(request('/explore'))).allowed, true);
  }
});
