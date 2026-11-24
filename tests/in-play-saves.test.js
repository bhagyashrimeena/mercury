import test from 'node:test';
import assert from 'node:assert/strict';

test('card saves use authenticated APIs and never claim success for rejected requests', async () => {
  const names = ['document', 'location', 'fetch'];
  const originals = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  try {
    for (const [index, scenario] of ['guest', 'listing', 'event', 'failure'].entries()) {
      const listeners = [], calls = [], toasts = [], navigations = [];
      const attributes = { 'aria-pressed': 'false' };
      const button = { disabled: false, dataset: { cardSave: 'fixture-id', cardKind: scenario === 'event' ? 'event' : 'listing' },
        setAttribute: (key, value) => attributes[key] = value,
        closest: () => ({ querySelector: () => ({ textContent: 'Fixture event' }) }) };
      const session = { user: scenario === 'guest' ? null : { id: 'fixture-user' }, consentAccepted: scenario !== 'guest', saved: [], savedListings: [] };
      const globals = {
        document: { addEventListener: (type, fn) => { if (type === 'click') listeners.push(fn); }, querySelector: () => ({ textContent: '' }), querySelectorAll: () => [button] },
        location: { pathname: '/how-it-works', search: '' },
        fetch: async (url, init) => {
          calls.push({ url, body: init.body });
          if (url === '/api/session') return { ok: true, json: async () => session };
          return scenario === 'failure'
            ? { ok: false, status: 503, json: async () => ({ error: { message: 'Save failed' } }) }
            : { ok: true, json: async () => ({ ok: true }) };
        }
      };
      for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, { configurable: true, value });
      const { liveRoute } = await import('../public/live.js?card-save=' + index);
      await liveRoute('/how-it-works', { main: { querySelector: () => null, innerHTML: '' }, toast: value => toasts.push(value), go: value => navigations.push(value) });
      await listeners.at(-1)({ target: { closest: () => button }, preventDefault() {}, stopPropagation() {} });
      assert.equal(button.disabled, false);
      if (scenario === 'guest') {
        assert.equal(calls.length, 1);
        assert.match(navigations[0], /^\/account\?return_to=/);
        assert.equal(attributes['aria-pressed'], 'false');
      } else if (scenario === 'failure') {
        assert.equal(attributes['aria-pressed'], 'false');
        assert.deepEqual(toasts, ['Save failed']);
      } else {
        assert.equal(calls[1].url, scenario === 'event' ? '/api/saved/fixture-id' : '/api/listings/fixture-id/save');
        assert.deepEqual(JSON.parse(calls[1].body), { saved: true });
        assert.equal(attributes['aria-pressed'], 'true');
        assert.match(toasts[0], /No place has been reserved/);
      }
    }
  } finally {
    for (const [name, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
    }
  }
});
