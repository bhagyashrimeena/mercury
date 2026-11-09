import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { safeReturnPath } from '../lib/return-path.ts';

const source = stripTypeScriptTypes(readFileSync(new URL('../app/signin/email-actions.ts', import.meta.url), 'utf8'))
  .replace(/^import .*?;\s*$/gm, '').replace(/^export /gm, '');

class Redirect extends Error {
  constructor(path) { super('redirect'); this.path = path; }
}

function harness({ allowed = true, sendError = false, verifyError = false, verifiedEmail = 'player@example.test' } = {}) {
  const values = new Map();
  const jar = {
    get: name => values.has(name) ? { value: values.get(name) } : undefined,
    set: (name, value) => { if (value) values.set(name, value); else values.delete(name); },
  };
  const calls = [];
  const supabase = { auth: {
    signInWithOtp: async args => { calls.push(['send', args]); return { error: sendError ? Error('send failed') : null }; },
    verifyOtp: async args => { calls.push(['verify', args]); return { error: verifyError ? Error('bad code') : null, data: { user: verifyError ? null : { email: verifiedEmail } } }; },
    signOut: async () => { calls.push(['signout']); },
  } };
  const dependencies = {
    cookies: async () => jar,
    redirect: path => { throw new Redirect(path); },
    canEnterPrivatePilot: email => allowed && email === 'player@example.test',
    EMAIL_PENDING_COOKIE: 'mercury_email_pending',
    emailCookieOptions: maxAge => ({ maxAge }),
    formReturnPath: value => typeof value === 'string' ? value : null,
    safeReturnPath,
    createSupabaseServer: async () => supabase,
  };
  const actions = new Function(...Object.keys(dependencies), `${source}\nreturn { requestEmailCode, verifyEmailCode };`)(...Object.values(dependencies));
  return { ...actions, calls, values };
}

async function redirected(action, path) {
  await assert.rejects(action, error => error instanceof Redirect && error.path === path);
}

test('email sign-in sends a code only to an allowed address and preserves the destination', async () => {
  const flow = harness();
  await redirected(flow.requestEmailCode(new FormData()), '/signin?return_to=%2Faccount&email_state=email-invalid');
  assert.equal(flow.calls.length, 0);
  const data = new FormData();
  data.set('email', ' Player@Example.Test ');
  data.set('return_to', '/my-games');
  await redirected(flow.requestEmailCode(data), '/signin?return_to=%2Fmy-games&email_state=email-sent&step=email');
  assert.deepEqual(flow.calls[0], ['send', { email: 'player@example.test', options: { shouldCreateUser: true } }]);
  assert.equal(flow.values.get('mercury_email_pending'), 'player@example.test');
});

test('email sign-in rejects uninvited addresses before contacting Supabase', async () => {
  const flow = harness({ allowed: false });
  const data = new FormData();
  data.set('email', 'player@example.test');
  await redirected(flow.requestEmailCode(data), '/signin?return_to=%2Faccount&email_state=email-access');
  assert.equal(flow.calls.length, 0);
});

test('verified email code establishes the same session and returns to the requested page', async () => {
  const flow = harness();
  flow.values.set('mercury_email_pending', 'player@example.test');
  const data = new FormData();
  data.set('code', '123456');
  data.set('return_to', '/register/game-1');
  await redirected(flow.verifyEmailCode(data), '/register/game-1');
  assert.deepEqual(flow.calls[0], ['verify', { email: 'player@example.test', token: '123456', type: 'email' }]);
  assert.equal(flow.values.has('mercury_email_pending'), false);
});

test('invalid code keeps the email step and never grants a session', async () => {
  const flow = harness({ verifyError: true });
  flow.values.set('mercury_email_pending', 'player@example.test');
  const data = new FormData();
  data.set('code', '123456');
  data.set('return_to', 'https://evil.example');
  await redirected(flow.verifyEmailCode(data), '/signin?return_to=%2Faccount&email_state=email-code&step=email');
  assert.equal(flow.values.get('mercury_email_pending'), 'player@example.test');
});
