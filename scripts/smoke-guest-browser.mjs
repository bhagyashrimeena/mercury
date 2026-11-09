// Optional local browser smoke test. Requires Chrome and MERCURY_PUBLIC_BROWSE=true.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const origin = process.env.MERCURY_SMOKE_ORIGIN || 'http://localhost:3000';
const chrome = process.env.MERCURY_CHROME_PATH || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'google-chrome');
const profile = await mkdtemp(join(tmpdir(), 'mercury-smoke-'));
const captureDir = process.env.MERCURY_SMOKE_CAPTURE_DIR;
const checkGoogleStart = process.env.MERCURY_SMOKE_GOOGLE_START === 'true';
const child = spawn(chrome, [
  '--headless=new', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--disable-background-networking',
  `--user-data-dir=${profile}`, '--remote-debugging-port=0',
  '--window-size=390,844', `${origin}/signin`,
], { windowsHide: true, stdio: 'ignore' });
let ws;
let googleAuthorize;
let googleAccountsSeen = false;
let nextId = 1;
const pending = new Map();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, description, attempts = 100) {
  for (let i = 0; i < attempts; i++) {
    let value;
    try { value = await fn(); } catch { value = null; }
    if (value) return value;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${description}`);
}
function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evalInPage(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function capture(name) {
  if (!captureDir) return;
  await mkdir(captureDir, { recursive: true });
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(join(captureDir, `${name}.png`), Buffer.from(data, 'base64'));
}
try {
  const port = await until(async () => Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]), 'Chrome DevTools port');
  const target = await until(async () => (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(item => item.type === 'page' && item.url.startsWith(origin)), 'Mercury tab');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Network.requestWillBeSent') {
      try {
        const requestUrl = new URL(message.params.request.url);
        if (requestUrl.hostname.endsWith('.supabase.co') && requestUrl.pathname === '/auth/v1/authorize') {
          googleAuthorize = {
            provider: requestUrl.searchParams.get('provider'),
            redirectTo: requestUrl.searchParams.get('redirect_to'),
          };
        }
        if (requestUrl.hostname === 'accounts.google.com') googleAccountsSeen = true;
      } catch { /* Ignore unrelated browser requests. */ }
    }
    if (!message.id || !pending.has(message.id)) return;
    const task = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message));
    else task.resolve(message.result || {});
  });
  await until(() => ws.readyState === WebSocket.OPEN, 'DevTools connection');
  await send('Page.enable');
  if (checkGoogleStart) await send('Network.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: `${origin}/signin` });
  const signIn = await until(async () => evalInPage(`location.pathname === '/signin' && document.readyState === 'complete' && ({ url: location.href, width: innerWidth, scrollWidth: document.documentElement.scrollWidth, buttons: [...document.querySelectorAll('button,a')].map(e => e.textContent.trim()).filter(Boolean) })`), 'sign-in page');
  assert.equal(signIn.width, 390);
  assert.ok(signIn.scrollWidth <= signIn.width, 'Sign-in has horizontal overflow');
  for (const option of ['Continue with Google', 'Continue with email', 'Continue as guest'])
    assert.ok(signIn.buttons.some(label => label.includes(option)), `${option} missing`);
  console.log('Sign-in:', JSON.stringify(signIn));
  await capture('sign-in-phone');
  const clicked = await evalInPage(`(() => { const link = [...document.querySelectorAll('a')].find(e => e.textContent.includes('Continue as guest')); if (!link) return false; link.click(); return true; })()`);
  if (!clicked) throw new Error('Continue as guest link missing');
  const explore = await until(async () => evalInPage(`location.pathname === '/explore' && document.querySelectorAll('.directory-card').length > 0 && !document.body.innerText.includes('Getting your game ready') && ({ url: location.href, width: innerWidth, scrollWidth: document.documentElement.scrollWidth, cards: document.querySelectorAll('.directory-card').length, buttons: [...document.querySelectorAll('button,a')].map(e => e.textContent.trim()).filter(Boolean).slice(0,35) })`), 'loaded guest Explore');
  assert.ok(explore.scrollWidth <= explore.width, 'Explore has horizontal overflow');
  console.log('Guest Explore:', JSON.stringify(explore));
  await capture('guest-explore-phone');
  await send('Page.navigate', { url: `${origin}/listing/mumbai-flex-nov-2026` });
  await until(async () => evalInPage(`location.pathname.startsWith('/listing/') && !!document.querySelector('#save-listing')`), 'listing save button');
  await evalInPage(`document.querySelector('#save-listing').click()`);
  const prompt = await until(async () => evalInPage(`location.pathname === '/account' && [...document.querySelectorAll('a')].some(e => e.textContent.includes('Sign in to continue')) && ({ url: location.href, heading: document.querySelector('h1,h2')?.textContent, signInHref: [...document.querySelectorAll('a')].find(e => e.textContent.includes('Sign in to continue'))?.href })`), 'guest account prompt');
  if (!prompt.signInHref?.includes('mumbai-flex-nov-2026')) throw new Error('Listing return path lost during account prompt');
  console.log('Guest account prompt:', JSON.stringify(prompt));
  await capture('guest-account-prompt-phone');
  await evalInPage(`[...document.querySelectorAll('a')].find(e => e.textContent.includes('Sign in to continue')).click()`);
  const signInPrompt = await until(async () => evalInPage(`location.pathname === '/signin' && ({ url: location.href, heading: document.querySelector('h1,h2')?.textContent, returnTo: new URL(location.href).searchParams.get('return_to') })`), 'sign-in page after save attempt');
  if (!signInPrompt.returnTo?.includes('mumbai-flex-nov-2026')) throw new Error('Listing return path lost on sign-in page');
  console.log('Sign-in after save attempt:', JSON.stringify(signInPrompt));
  if (checkGoogleStart) {
    await evalInPage(`(() => { const button = [...document.querySelectorAll('button')].find(e => e.textContent.includes('Continue with Google')); if (!button) return false; button.click(); return true; })()`);
    const authorize = await until(() => googleAuthorize, 'Supabase Google authorization request', 200);
    assert.equal(authorize.provider, 'google');
    assert.equal(authorize.redirectTo, `${origin}/auth/callback`);
    await until(() => googleAccountsSeen, 'Google account chooser request', 200);
    console.log('Google OAuth start:', JSON.stringify({ ...authorize, googleReached: true }));
  }
} finally {
  ws?.close();
  child.kill();
  await wait(300);
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
}
