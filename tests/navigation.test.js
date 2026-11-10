import test from 'node:test';
import assert from 'node:assert/strict';

const tick = () => new Promise(resolve => setImmediate(resolve));

async function fixture(run) {
  const keys = ['document', 'location', 'fetch', 'window', 'history', 'localStorage'];
  const originals = Object.fromEntries(keys.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const listeners = {}, historyCalls = [], requests = [], toasts = [], navigations = [];
  let html = '', scrolls = 0;
  const simple = () => ({ textContent: '', focus() {}, scrollIntoView() {}, classList: { add() {}, remove() {}, toggle() {} } });
  const actionSheet = { ...simple(), children: new Map(), open: false, close() { this.open = false; }, showModal() { this.open = true; }, contains(node) { return [...this.children.values()].includes(node); }, querySelector(selector) { return this.children.get(selector); } };
  const openSheet = () => { actionSheet.children = new Map([['#confirm-action', { disabled: false }], ['[role=alert]', { textContent: '' }]]); actionSheet.showModal(); return actionSheet; };
  const locationDialog = { ...simple(), open: false, close() { this.open = false; }, showModal() { this.open = true; }, querySelector: () => simple() };
  const sections = new Map();
  const main = { ...simple(), get innerHTML() { return html; }, set innerHTML(value) { for (const section of sections.values()) section.isConnected = false; sections.clear(); html = value; }, insertAdjacentHTML(_position, value) { html += value; },
    querySelector(selector) {
      if (selector === '[data-server-path]' && html.includes('data-server-path="/explore"'))
        return { getAttribute: name => name === 'data-server-path' ? '/explore' : null };
      if (!['#saved-mercury-games', '#saved-external-listings'].includes(selector)) return null;
      if (!sections.has(selector)) sections.set(selector, { ...simple(), isConnected: true, innerHTML: '', setAttribute() {}, querySelector: () => null });
      return sections.get(selector);
    },
  };
  const nodes = { main, '#action-sheet': actionSheet, '#location-dialog': locationDialog };
  const session = { user: { name: 'Fixture Player' }, consentAccepted: true, saved: [], savedListings: [], notifications: [] };
  const baseBooking = { id: 'fixture-pass', event_id: 'fixture-event', title: 'Current confirmed game', sport: 'Badminton', area: 'Powai', venue: 'Synthetic court', date: '2030-11-14', time: '18:00', starts_at: Date.parse('2030-11-14T18:00:00+05:30'), duration: 90, status: 'confirmed', event_status: 'published', player_name: 'Fixture Player', level: 'Beginner' };
  const baseEvent = { ...baseBooking, id: 'fixture-event', title: 'Current event details', status: 'published', startsAt: baseBooking.starts_at, capacity: 12, spots: 4, price: 0, type: 'Social play', host: 'Fixture host', description: 'Synthetic event details.', included: ['Court'], bring: 'Water', cancellation: 'Before the start.' };
  const replies = new Map([
    ['/api/session', () => session], ['/api/bookings', () => ({ bookings: [baseBooking] })],
    ['/api/events', () => ({ events: [] })], ['/api/saved-listings', () => ({ listings: [] })],
    ['/api/events/fixture-event', () => ({ event: baseEvent })],
  ]);
  const document = { title: '', body: simple(), addEventListener(type, listener) { listeners['document:' + type] = listener; },
    querySelector(selector) { return nodes[selector] || (nodes[selector] = simple()); },
    querySelectorAll(selector) {
      if (selector === 'dialog[open]') return [actionSheet, locationDialog].filter(dialog => dialog.open);
      if (selector === '[data-cancel-booking]' && html.includes('data-cancel-booking')) return [nodes.cancel ||= { disabled: false, dataset: { cancelBooking: 'fixture-pass' } }];
      if (selector === '#live-save' && html.includes('id="live-save"')) return [this.querySelector('#live-save')];
      return [];
    },
  };
  const globals = {
    document, location: { pathname: '/how-it-works', search: '', hash: '', origin: 'https://fixture.test' },
    fetch: async url => { requests.push(url); const body = await replies.get(url)?.(); return { ok: true, status: 200, json: async () => body }; },
    window: { addEventListener(type, listener) { listeners[type] = listener; }, scrollTo() { scrolls++; } },
    history: { replaceState(...args) { historyCalls.push(['replace', ...args]); }, pushState(...args) { historyCalls.push(['push', ...args]); } },
    localStorage: { getItem: () => null },
  };
  for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, { configurable: true, value });
  try {
    const { liveRoute } = await import('../public/live.js');
    const route = (path = '/my-games') => { location.pathname = path; return liveRoute(path, { main, openSheet, toast(message) { toasts.push(message); }, go(path) { navigations.push(path); } }); };
    await run({ main, requests, replies, route, session, baseBooking, baseEvent, listeners, actionSheet, locationDialog, historyCalls, scrolls: () => scrolls, toasts, nodes, openSheet, navigations });
  } finally {
    for (const [name, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
    }
  }
}

test('returning to the same URL cannot revive an older delayed page response', async () => {
  await fixture(async ({ main, replies, route, baseEvent }) => {
    const pending = Promise.withResolvers();
    replies.set('/api/events/fixture-event', () => pending.promise);
    const older = route('/event/fixture-event');
    await tick();
    await route('/how-it-works');
    replies.set('/api/events/fixture-event', () => ({ event: baseEvent }));
    await route('/event/fixture-event');
    const latest = main.innerHTML;
    assert.match(latest, /Current event details/);
    pending.resolve({ event: { ...baseEvent, title: 'Stale cancelled game', status: 'cancelled' } });
    await older;
    await tick();
    assert.equal(main.innerHTML, latest);
  });
});

test('refreshing the same URL rejects an older response even without a path change', async () => {
  await fixture(async ({ main, replies, route, baseEvent }) => {
    const pending = Promise.withResolvers();
    replies.set('/api/events/fixture-event', () => pending.promise);
    const older = route('/event/fixture-event');
    await tick();
    replies.set('/api/events/fixture-event', () => ({ event: baseEvent }));
    await route('/event/fixture-event');
    const latest = main.innerHTML;
    pending.resolve({ event: { ...baseEvent, title: 'Stale event details' } });
    await older;
    assert.equal(main.innerHTML, latest);
  });
});

test('Back and Forward route handling dismisses old dialogs without adding history entries', async () => {
  await fixture(async ({ listeners, actionSheet, locationDialog, historyCalls }) => {
    await import('../public/app.js?navigation-dialog-test');
    await tick();
    actionSheet.open = true;
    locationDialog.open = true;
    await listeners.popstate();
    assert.equal(actionSheet.open, false);
    assert.equal(locationDialog.open, false);
    assert.deepEqual(historyCalls, []);
    actionSheet.open = true;
    await listeners.popstate();
    assert.equal(actionSheet.open, false);
  });
});

test('only the newest route completion moves focus and scroll for identical URLs', async () => {
  await fixture(async ({ listeners, scrolls }) => {
    await import('../public/app.js?navigation-generation-test');
    await tick();
    location.pathname = '/about';
    const before = scrolls();
    await Promise.all([listeners.popstate(), listeners.hashchange()]);
    assert.equal(scrolls() - before, 1);
  });
});

test('an obsolete public-route session failure cannot replace the active signed-in session', async () => {
  await fixture(async ({ replies, route, session, requests, navigations, nodes }) => {
    const pending = Promise.withResolvers();
    replies.set('/api/session', () => pending.promise);
    const older = route('/explore');
    await tick();
    replies.set('/api/session', () => session);
    replies.set('/api/saved/fixture-event', () => ({ ok: true }));
    await route('/event/fixture-event');
    pending.reject(Error('Old session request failed'));
    await older;
    await nodes['#live-save'].onclick();
    assert.equal(requests.includes('/api/saved/fixture-event'), true);
    assert.deepEqual(navigations, []);
  });
});

test('a dismissed confirmation cannot submit, and rapid confirmation repeats send one request', async () => {
  await fixture(async ({ route, nodes, actionSheet, replies, requests }) => {
    await route();
    await nodes.cancel.onclick();
    const dismissed = actionSheet.querySelector('#confirm-action');
    actionSheet.close();
    await dismissed.onclick();
    assert.equal(requests.some(path => path.endsWith('/cancel')), false);
    await nodes.cancel.onclick();
    const confirm = actionSheet.querySelector('#confirm-action');
    const pending = Promise.withResolvers();
    replies.set('/api/bookings/fixture-pass/cancel', () => pending.promise);
    const first = confirm.onclick();
    await confirm.onclick();
    assert.equal(requests.filter(path => path.endsWith('/cancel')).length, 1);
    pending.resolve({ ok: true });
    await first;
    assert.equal(actionSheet.open, false);
  });
});

test('a completed or failed old confirmation cannot close or write into a newer dialog', async () => {
  for (const outcome of ['success', 'failure']) await fixture(async ({ route, nodes, actionSheet, replies, openSheet }) => {
    await route();
    await nodes.cancel.onclick();
    const confirm = actionSheet.querySelector('#confirm-action');
    const pending = Promise.withResolvers();
    replies.set('/api/bookings/fixture-pass/cancel', () => pending.promise);
    const first = confirm.onclick();
    await tick();
    actionSheet.close();
    openSheet();
    const newConfirm = actionSheet.querySelector('#confirm-action');
    if (outcome === 'success') pending.resolve({ ok: true }); else pending.reject(Error('Synthetic failure'));
    await first;
    assert.equal(actionSheet.open, true);
    assert.equal(actionSheet.querySelector('#confirm-action'), newConfirm);
    assert.equal(actionSheet.querySelector('[role=alert]').textContent, '');
  });
});

test('Explore keeps server-rendered listings visible while session loading is delayed', async () => {
  await fixture(async ({ main, replies, route, session }) => {
    const pending = Promise.withResolvers();
    const serverView = '<div data-server-path="/explore"><h1>Find your next game</h1><article>Visible event</article></div>';
    main.innerHTML = serverView;
    replies.set('/api/session', () => pending.promise);
    replies.set('/api/listings', () => ({ listings: [] }));
    const navigation = route('/explore');
    await tick();
    assert.equal(main.innerHTML, serverView);
    pending.resolve(session);
    await navigation;
  });
});
