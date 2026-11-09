import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAccount } from '../public/service-ui.js';

test('a signed-in guest returns to the listing after the account handoff', async () => {
  const previousLocation = globalThis.location;
  globalThis.location = new URL('http://localhost:3000/account?return_to=%2Flisting%2Fmumbai-flex-nov-2026');
  const destinations = [];
  try {
    await renderAccount({ session: { user: { id: 'player' }, consentAccepted: true }, go: path => destinations.push(path) });
  } finally {
    globalThis.location = previousLocation;
  }
  assert.deepEqual(destinations, ['/listing/mumbai-flex-nov-2026']);
});
