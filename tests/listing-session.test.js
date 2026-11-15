import test from 'node:test';
import assert from 'node:assert/strict';
import { renderListing } from '../public/discovery.js';
import { listings, listingStatus } from '../public/catalogue.js';

test('listing renders before session state and handles a save authorization race', async () => {
  const previous = { document: globalThis.document, location: globalThis.location, fetch: globalThis.fetch };
  const listing = listings[0];
  const saved = { disabled: false, textContent: '', attrs: new Map(), getAttribute(name) { return this.attrs.get(name); }, setAttribute(name, value) { this.attrs.set(name, value); } };
  const status = { before() {}, insertAdjacentHTML() {} };
  const nodes = new Map([
    ['.detail-layout article > .listing-status', status],
    ['.detail-layout .event-facts', { before() {} }],
    ['#save-listing', saved], ['#share-listing', {}], ['#report-listing', {}],
  ]);
  const main = { innerHTML: '', querySelector: selector => nodes.get(selector) || null, insertAdjacentHTML() {} };
  const destinations = [], calls = [];
  let session = null;
  globalThis.document = { title: '' };
  globalThis.location = new URL('https://fixture.test/listing/' + listing.id);
  globalThis.fetch = async () => ({ ok: true });
  try {
    await renderListing(listing.id, {
      main,
      api: async path => {
        calls.push(path);
        if (path.endsWith('/save')) throw Object.assign(Error('Sign in to continue.'), { status: 401 });
        return { listing: { ...listing, availability: listingStatus(listing) } };
      },
      getSession: () => session,
      loadSession: async () => (session = { user: null }),
      refreshSession: async () => {},
      go: path => destinations.push(path), toast() {}, openSheet() {},
    });
    assert.match(main.innerHTML, /id="save-listing"(?! aria-pressed)/);
    await saved.onclick();
    assert.deepEqual(calls, ['listings/' + listing.id]);
    session = { user: { name: 'Player' }, savedListings: [] };
    await saved.onclick();
    assert.equal(calls.at(-1), 'listings/' + listing.id + '/save');
    assert.deepEqual(destinations, Array(2).fill('/account?return_to=' + encodeURIComponent(location.pathname)));
  } finally {
    for (const [key, value] of Object.entries(previous)) globalThis[key] = value;
  }
});
