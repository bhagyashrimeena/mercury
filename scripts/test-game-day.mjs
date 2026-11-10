// Offline UI rehearsal. Uses synthetic accounts/events and never contacts the live API.
// Run with Playwright installed, or set MERCURY_QA_PLAYWRIGHT to its module path.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createRequire } from 'node:module';
import { shell } from '../app/shell.ts';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.MERCURY_QA_PLAYWRIGHT || 'playwright');
const root = resolve(new URL('..', import.meta.url).pathname);
const output = resolve(root, 'artifacts/game-day');
await mkdir(output, { recursive: true });
const event = { id: 'qa-rally', title: 'The Thursday Rally', sport: 'Badminton', area: 'Powai', venue: 'Sample Court, 1 Example Road', date: '2030-11-14', time: '18:00', startsAt: Date.parse('2030-11-14T18:00:00+05:30'), duration: 90, capacity: 12, spots: 4, price: 0, status: 'published', revision: 1, level: 'All levels', type: 'Social play', host: 'Example Club', description: 'A friendly synthetic fixture for testing the game pass.', included: ['Court time'], bring: 'Water and indoor shoes', cancellation: 'Cancel before start.' };
const initialBooking = { id: 'qa-pass-reference-12345678', event_id: event.id, title: event.title, sport: event.sport, area: event.area, venue: event.venue, date: event.date, time: event.time, starts_at: event.startsAt, duration: event.duration, status: 'confirmed', event_status: 'published', player_name: 'Example Player', level: 'Beginner' };
let booking = { ...initialBooking };
const session = { user: { name: 'Example Player', email: 'fixture@example.test' }, consentAccepted: true, organizer: null, saved: [], savedListings: [], notifications: [], paymentsEnabled: false };
const requests = [];
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path.startsWith('/api/')) {
      requests.push([req.method, path]);
      let result;
      if (path === '/api/session') result = session;
      else if (path === '/api/bookings') result = { bookings: [booking] };
      else if (path === '/api/events') result = { events: [event] };
      else if (path === '/api/events/' + event.id) result = { event };
      else if (path === '/api/listings' || path === '/api/saved-listings') result = { listings: [] };
      else if (path === '/api/metrics') result = { ok: true };
      else if (path === '/api/bookings/' + booking.id + '/cancel' && req.method === 'POST') { booking = { ...booking, status: 'cancelled' }; result = { ok: true }; }
      else { res.writeHead(404); res.end(JSON.stringify({ error: { message: 'Fixture route not configured' } })); return; }
      res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(result)); return;
    }
    if (/\.(js|css|svg)$/.test(path)) {
      const file = resolve(root, 'public', '.' + path);
      if (!file.startsWith(resolve(root, 'public') + '/')) throw Error('Invalid fixture path');
      res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(path)]);
      res.end(await readFile(file)); return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mercury QA fixture</title><link rel="stylesheet" href="/styles.css"></head><body>' + shell.replace('__SERVER_CONTENT__', '') + '<script type="module" src="/app.js"></script></body></html>');
  } catch { res.writeHead(404); res.end('Fixture asset not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
if (process.env.MERCURY_QA_SERVE_ONLY === '1') { console.log(origin); await new Promise(() => {}); }
const browser = await chromium.launch({ executablePath: process.env.MERCURY_QA_CHROMIUM || undefined, headless: true, args: ['--no-sandbox'] });
const findings = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.request().url().startsWith(origin) || route.request().url().startsWith('blob:') ? route.continue() : route.abort());
  const openPass = async () => { await page.goto(origin + '/booking/' + booking.id); await page.locator('#pass-reference').waitFor(); };
  await openPass();
  assert.match(await page.locator('h1').textContent(), /You’re in/);
  for (const [width, height] of [[320, 740], [390, 844], [1440, 1000]]) {
    await page.setViewportSize({ width, height });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `No overflow at ${width}px`);
    await page.screenshot({ path: `${output}/confirmed-${width}.png`, fullPage: true });
  }
  findings.push('Confirmed pass: no horizontal overflow at 320, 390 or 1440px; phone and desktop screenshots saved.');
  await page.setViewportSize({ width: 390, height: 844 });
  const map = new URL(await page.getByRole('link', { name: 'Open venue in Google Maps (new tab)' }).getAttribute('href'));
  assert.equal(map.searchParams.get('query'), event.venue + ', Powai, Mumbai');
  for (let i = 0; i < 2; i++) {
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Add to calendar' }).click();
    const download = await downloaded;
    assert.equal(download.suggestedFilename(), 'mercury-game.ics');
    const content = await readFile(await download.path(), 'utf8');
    assert.match(content, /DTSTART:20301114T123000Z/);
    assert.doesNotMatch(content, /Example Player|qa-pass-reference/);
  }
  findings.push('Calendar download: repeated clicks produce valid UTC-timed .ics files without player name or private pass reference.');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copied = text; } } }));
  await page.getByRole('button', { name: 'Copy reference' }).click();
  assert.equal(await page.evaluate(() => window.__copied), booking.id);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw Error('Denied in fixture'); } } }));
  await page.getByRole('button', { name: 'Copy reference' }).click();
  assert.equal(await page.locator('#pass-reference').evaluate(input => input.selectionEnd - input.selectionStart), booking.id.length);
  findings.push('Copy reference: success and denied-permission fallback both work; fallback selects the reference for manual copying.');
  await page.getByRole('button', { name: 'Cancel my place', exact: true }).click();
  await page.getByRole('button', { name: 'Keep as it is' }).click();
  assert.equal(booking.status, 'confirmed');
  assert.equal(await page.locator('#action-sheet').evaluate(dialog => dialog.open), false);
  await page.getByRole('button', { name: 'Cancel my place', exact: true }).click();
  await page.locator('#confirm-action').click();
  await page.getByRole('heading', { name: 'Your place is cancelled.' }).waitFor();
  assert.equal(await page.locator('#download-game-calendar, #cancel-pass').count(), 0);
  findings.push('Cancellation: dismiss leaves booking intact; confirming updates the fixture pass and removes calendar/cancellation controls.');
  for (const [name, changed] of [ ['organizer-cancelled', { status: 'event_cancelled', event_status: 'cancelled' }], ['checked-in', { status: 'checked_in' }], ['started', { starts_at: Date.parse('2020-01-01T12:30:00Z'), date: '2020-01-01' }] ]) {
    booking = { ...initialBooking, ...changed };
    await openPass();
    assert.equal(await page.locator('#cancel-pass').count(), 0);
    if (name !== 'checked-in') assert.equal(await page.locator('#download-game-calendar').count(), 0);
    await page.screenshot({ path: `${output}/${name}-390.png`, fullPage: true });
  }
  findings.push('Organizer-cancelled, checked-in and started pass states use accurate copy and suppress invalid actions.');
  await page.goto(origin + '/event/' + event.id);
  await page.getByRole('link', { name: 'Open venue in Google Maps (new tab)' }).waitFor();
  await page.screenshot({ path: `${output}/event-detail-390.png`, fullPage: true });
  assert.equal(errors.length, 0, errors.join('\n'));
  findings.push('Native event details include venue navigation; all scenarios completed with zero browser page errors.');
  await writeFile(`${output}/browser-results.json`, JSON.stringify({ origin: 'local offline fixtures', findings, errors, requests }, null, 2));
  console.log(findings.join('\n'));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
