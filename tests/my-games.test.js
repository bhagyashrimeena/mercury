import test from 'node:test';
import assert from 'node:assert/strict';
import { savedGamesLoader } from '../public/my-games.js';

function container() {
  let html = '';
  const node = { isConnected: true, attributes: {}, focused: false, retry: null,
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() { this.focused = true; },
    querySelector(selector) { return selector === '[data-retry-saved]' ? this.retry : null; },
    get innerHTML() { return html; },
    set innerHTML(value) { html = value; this.retry = value.includes('data-retry-saved') ? {} : null; },
  };
  return node;
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('saved section failures show an accessible local retry, not an empty collection', async () => {
  const node = container();
  const refresh = savedGamesLoader({ container: node, label: 'Saved Mercury games', isCurrent: () => node.isConnected,
    load: async () => { throw Error('<private service error>'); }, render: () => 'No saved games', });
  await refresh();
  assert.match(node.innerHTML, /Saved Mercury games couldn’t load/);
  assert.match(node.innerHTML, /confirmed places and updates are still available/);
  assert.doesNotMatch(node.innerHTML, /No saved games|private service error/);
  assert.equal(node.attributes['aria-busy'], 'false');
  assert.equal(typeof node.retry.onclick, 'function');
});

test('retry loads only its own section and ignores repeated clicks while pending', async () => {
  const node = container(), response = Promise.withResolvers();
  let calls = 0;
  const refresh = savedGamesLoader({ container: node, label: 'Saved external listings', isCurrent: () => node.isConnected,
    load: async () => { if (++calls === 1) throw Error('Temporary outage'); return response.promise; },
    render: ({ listings }) => listings.join(', '), });
  await refresh();
  const retry = node.retry.onclick;
  const pending = retry();
  await retry();
  assert.equal(calls, 2);
  assert.equal(node.focused, true);
  assert.equal(node.attributes['aria-busy'], 'true');
  response.resolve({ listings: ['Recovered bookmark'] });
  await pending;
  assert.equal(node.innerHTML, 'Recovered bookmark');
  assert.equal(node.attributes['aria-busy'], 'false');
});

test('optional results and errors cannot update a disconnected or superseded page', async () => {
  for (const outcome of ['success', 'failure']) {
    const node = container(), response = Promise.withResolvers();
    let current = true;
    const refresh = savedGamesLoader({ container: node, label: 'Saved Mercury games', isCurrent: () => current && node.isConnected,
      load: () => response.promise, render: () => 'Stale content', });
    const pending = refresh();
    const before = node.innerHTML;
    current = false;
    if (outcome === 'success') response.resolve({}); else response.reject(Error('Navigation changed.'));
    await pending;
    assert.equal(node.innerHTML, before);
    assert.equal(node.retry, null);
  }
});

async function dashboardFixture(run) {
  const originals = Object.fromEntries(['document', 'location', 'fetch'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const nodes = new Map(), calls = [];
  let html = '';
  const main = {
    get innerHTML() { return html; },
    set innerHTML(value) { for (const node of nodes.values()) node.isConnected = false; nodes.clear(); html = value; },
    querySelector(selector) {
      if (!nodes.has(selector)) nodes.set(selector, container());
      return nodes.get(selector);
    },
  };
  const session = { user: { name: 'Fixture Player' }, consentAccepted: true, saved: [], notifications: [{ message: 'Fixture organizer update', created_at: '2030-11-01', event_id: 'fixture-event' }] };
  const booking = { id: 'fixture-pass', event_id: 'fixture-event', title: 'Fixture confirmed game', sport: 'Badminton', area: 'Powai', venue: 'Synthetic court', date: '2030-11-14', time: '18:00', starts_at: Date.parse('2030-11-14T18:00:00+05:30'), duration: 90, status: 'confirmed', event_status: 'published', player_name: 'Fixture Player', level: 'Beginner' };
  const replies = new Map([
    ['/api/session', () => session], ['/api/bookings', () => ({ bookings: [booking] })],
    ['/api/events', () => ({ events: [] })], ['/api/saved-listings', () => ({ listings: [] })],
  ]);
  const header = {};
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { title: '', addEventListener() {}, querySelector: () => header, querySelectorAll: () => [] } });
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { pathname: '/my-games', search: '', origin: 'https://fixture.test' } });
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async url => {
    calls.push(url);
    try { const body = await replies.get(url)(); return { ok: true, status: 200, json: async () => body }; }
    catch { return { ok: false, status: 503, json: async () => ({ error: { message: 'Fixture service unavailable' } }) }; }
  } });
  try {
    const { liveRoute } = await import('../public/live.js');
    const route = (path = '/my-games') => { location.pathname = path; return liveRoute(path, { main, toast() {}, go() {} }); };
    await run({ main, calls, replies, route, nodes });
  } finally {
    for (const [name, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
    }
  }
}

test('either optional endpoint can fail without hiding passes, updates or the other section', async () => {
  for (const [endpoint, section, other] of [
    ['/api/events', '#saved-mercury-games', '#saved-external-listings'],
    ['/api/saved-listings', '#saved-external-listings', '#saved-mercury-games'],
  ]) await dashboardFixture(async ({ main, replies, route, nodes, calls }) => {
    const healthy = replies.get(endpoint);
    replies.set(endpoint, () => { throw Error('Synthetic outage'); });
    await route();
    await tick();
    assert.match(main.innerHTML, /Fixture confirmed game/);
    assert.match(main.innerHTML, /Fixture organizer update/);
    assert.match(main.innerHTML, /href="\/booking\/fixture-pass"/);
    assert.match(nodes.get(section).innerHTML, /couldn’t load/);
    assert.match(nodes.get(other).innerHTML, /No .*saved/);
    const before = calls.length;
    replies.set(endpoint, healthy);
    await nodes.get(section).retry.onclick();
    assert.deepEqual(calls.slice(before), [endpoint]);
    assert.doesNotMatch(nodes.get(section).innerHTML, /couldn’t load/);
    assert.match(main.innerHTML, /Fixture confirmed game/);
  });
});

test('passes and updates render before slow bookmark services settle', async () => {
  await dashboardFixture(async ({ main, replies, route, nodes }) => {
    const response = Promise.withResolvers();
    replies.set('/api/events', () => response.promise);
    const pending = route();
    await tick();
    assert.match(main.innerHTML, /Fixture confirmed game/);
    assert.match(main.innerHTML, /Fixture organizer update/);
    assert.match(nodes.get('#saved-external-listings').innerHTML, /No saved external listings/);
    assert.match(nodes.get('#saved-mercury-games').innerHTML, /Loading/);
    response.resolve({ events: [] });
    await pending;
  });
});

test('late optional failures cannot overwrite a newer Mercury route', async () => {
  await dashboardFixture(async ({ main, replies, route }) => {
    const response = Promise.withResolvers();
    replies.set('/api/events', () => response.promise);
    const pending = route();
    await tick();
    await route('/how-it-works');
    const newerPage = main.innerHTML;
    assert.match(newerPage, /Find your kind of event/);
    response.reject(Error('Late service failure'));
    await pending;
    await tick();
    assert.equal(main.innerHTML, newerPage);
  });
});

test('a bookings failure remains an honest page error rather than a false empty account', async () => {
  await dashboardFixture(async ({ main, replies, route, calls }) => {
    replies.set('/api/bookings', () => { throw Error('Bookings unavailable'); });
    await route();
    assert.match(main.innerHTML, /A small <em>timeout/);
    assert.doesNotMatch(main.innerHTML, /No upcoming confirmed games/);
    assert.equal(calls.includes('/api/events'), false);
    assert.equal(calls.includes('/api/saved-listings'), false);
  });
});
