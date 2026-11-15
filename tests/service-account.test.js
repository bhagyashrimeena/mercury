import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAccount } from '../public/service-ui.js';

test('a signed-in guest returns to the listing after the account handoff', async () => {
  const previousLocation = globalThis.location;
  globalThis.location = new URL('http://localhost:3000/account?return_to=%2Flisting%2Fmumbai-flex-nov-2026');
  const destinations = [];
  try {
    await renderAccount({ session: { user: { id: 'player' } }, go: path => destinations.push(path) });
  } finally {
    globalThis.location = previousLocation;
  }
  assert.deepEqual(destinations, ['/listing/mumbai-flex-nov-2026']);
});

test('a new signed-in user sees account settings without consent or export controls', async () => {
  const previousLocation = globalThis.location;
  globalThis.location = new URL('http://localhost:3000/account');
  const boundForms = [];
  const main = { innerHTML: '', querySelector(selector) { boundForms.push(selector); return {}; } };
  try {
    await renderAccount({
      main, session: { user: { name: 'New Player', email: 'new@example.test' } },
      api: () => { throw Error('Account rendering must not require an onboarding request'); },
      go: () => { throw Error('Account settings should render directly'); }, toast() {},
    });
    assert.match(main.innerHTML, /Signed in as new@example.test/);
    assert.match(main.innerHTML, /Account settings/);
    assert.doesNotMatch(main.innerHTML, /account-consent|export-account|Download my data|Your choice|checkbox/);
    assert.deepEqual(boundForms, ['#profile', '#delete-account']);
  } finally { globalThis.location = previousLocation; }
});
