import { listings } from '../public/catalogue-data.js';
import { validateCatalogue } from '../server/catalogue-validation.js';

const checked = validateCatalogue(listings);
if (!checked.valid) throw new Error(`Catalogue is invalid: ${checked.errors.join('; ')}`);

const unique = new Map();
for (const listing of listings) for (const kind of ['sourceUrl', 'registrationUrl']) {
  const url = listing[kind];
  if (!unique.has(url)) unique.set(url, []);
  unique.get(url).push(`${listing.id} (${kind === 'sourceUrl' ? 'source' : 'registration'})`);
}

async function inspect(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const response = await fetch(url, { method, redirect: 'follow', signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'MercuryLinkCheck/1.0' } });
      await response.body?.cancel();
      if (method === 'HEAD' && [405, 501].includes(response.status)) continue;
      const state = [404, 410].includes(response.status) ? 'broken'
        : response.ok ? 'reachable' : 'needs manual review';
      return { state, status: response.status, finalUrl: response.url };
    } catch (error) {
      if (method === 'HEAD') continue;
      return { state: 'needs manual review', status: error?.name || 'network error', finalUrl: url };
    }
  }
  return { state: 'needs manual review', status: 'no response', finalUrl: url };
}

const entries = [...unique];
let next = 0;
const results = [];
await Promise.all(Array.from({ length: Math.min(3, entries.length) }, async () => {
  while (next < entries.length) {
    const [url, usedBy] = entries[next++];
    results.push({ url, usedBy, ...await inspect(url) });
  }
}));
results.sort((a, b) => a.url.localeCompare(b.url));
for (const result of results) {
  process.stdout.write(`${result.state}: ${result.status} ${result.url}${result.finalUrl !== result.url ? ` -> ${result.finalUrl}` : ''}\n  ${result.usedBy.join(', ')}\n`);
}
const broken = results.filter(result => result.state === 'broken');
process.stdout.write(`Checked ${results.length} distinct public URLs: ${broken.length} returned 404/410. A reachable URL does not verify event facts, registration status, or image rights.\n`);
if (broken.length) process.exitCode = 1;
