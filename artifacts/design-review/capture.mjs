import { readFile, writeFile } from 'node:fs/promises';
import { currentListings, findListing, listingStatus, indiaDay } from '../../public/catalogue.js';

const [url, widthText, heightText, output, mode, scope] = process.argv.slice(2);
if (!url || !output) throw new Error('Usage: capture.mjs URL WIDTH HEIGHT OUTPUT');
const width = Number(widthText), height = Number(heightText);
if (!Number.isInteger(width) || !Number.isInteger(height)) throw new Error('Invalid viewport');
const pastBookingMode = ['fixture-past-games', 'fixture-expired-pass'].includes(mode);
const cancelledBookingMode = mode === 'fixture-cancelled-booking';
const fixtureDate = indiaDay(Date.now() + (pastBookingMode ? -1 : 7) * 86400000);
const fixtureEvent = {
  id: 'review-state', title: 'Review fixture: Thursday Badminton', sport: 'Badminton',
  type: 'Social play', area: 'Powai', venue: 'Sample court, Powai, Mumbai',
  date: fixtureDate, time: '18:00', startsAt: Date.parse(`${fixtureDate}T18:00:00+05:30`),
  duration: 90, capacity: 12, registered: mode === 'fixture-roster' ? 1 : ['fixture-account', 'fixture-pass', 'fixture-register', 'fixture-native-explore'].includes(mode) ? 10 : 12,
  spots: mode === 'fixture-roster' ? 11 : ['fixture-account', 'fixture-pass', 'fixture-register', 'fixture-native-explore'].includes(mode) ? 2 : 0, price: 0,
  level: 'All levels', host: 'Review fixture organizer', hostBio: 'A test organizer for visual review.',
  hostContact: '', description: 'A sample free doubles session for reviewing full and cancelled game states.',
  included: ['Court time and shuttlecocks'], bring: 'Bring a racket, indoor shoes and water.',
  cancellation: 'Cancel a free place before the session starts.', image: 'badminton.jpg',
  status: mode === 'fixture-cancelled' || cancelledBookingMode ? 'cancelled' : 'published', revision: 1,
};

const tabs = await fetch('http://127.0.0.1:9223/json').then(response => response.json());
const target = tabs.find(tab => tab.type === 'page');
if (!target) throw new Error('No Chrome page target is available');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
let nextId = 0;
const pending = new Map();
const outboundRequests = [];
const organizerFixture = ['fixture-organizer', 'fixture-preview', 'fixture-roster'].includes(mode);
const ownerFixture = mode === 'fixture-owner';
const accountFixture = ['fixture-account', 'fixture-pass', 'fixture-register'].includes(mode) || pastBookingMode || cancelledBookingMode || organizerFixture || ownerFixture;
const fixtureBooking = {
  id: 'review-pass', event_id: fixtureEvent.id, status: cancelledBookingMode ? 'event_cancelled' : 'confirmed', title: fixtureEvent.title,
  date: fixtureEvent.date, time: fixtureEvent.time, starts_at: fixtureEvent.startsAt,
  venue: fixtureEvent.venue, player_name: 'Review Player', level: 'Beginner', event_status: 'published',
};
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Network.requestWillBeSent' && /\/api\/listings\/[^/]+\/click$/.test(new URL(message.params.request.url).pathname)) outboundRequests.push(message.params.request.url);
  if (message.method === 'Runtime.exceptionThrown') process.stderr.write(`Browser exception: ${message.params.exceptionDetails.text} ${message.params.exceptionDetails.exception?.description || ''}\n`);
  if (message.method === 'Fetch.requestPaused') {
    if (mode === 'loading') return;
    if (mode === 'fixture-slow-session' && new URL(message.params.request.url).pathname === '/api/session') return;
    const request = new URL(message.params.request.url);
    const parts = request.pathname.split('/').filter(Boolean);
    let payload = { error: { message: 'No design fixture for this API route.' } };
    let status = 404;
    if (parts[1] === 'session') {
      payload = { user: accountFixture ? { name: 'Review Player', email: 'review@example.test' } : null,
        organizer: organizerFixture ? { name: 'Review fixture organizer', bio: 'A welcoming local badminton community.', contact: 'review@example.test' } : null,
        saved: accountFixture && !pastBookingMode && !cancelledBookingMode ? [fixtureEvent.id] : [],
        savedListings: accountFixture ? ['mumbai-flex-nov-2026'] : [],
        notifications: accountFixture ? [{ id: 'review-note', event_id: fixtureEvent.id, message: cancelledBookingMode ? 'Review fixture: the organizer cancelled your game.' : pastBookingMode ? 'Review fixture: your earlier registration remains in My games.' : 'Review fixture: your place is confirmed.', created_at: Date.now(), read_at: null }] : [],
        paymentsEnabled: false, consentAccepted: accountFixture, isAdmin: ownerFixture };
      status = 200;
    } else if (parts[1] === 'support' && mode === 'fixture-event-submission') {
      payload = { id: 'test-organizer-request-123', message: 'Request is in the private owner inbox.' };
      status = 200;
    } else if (parts[1] === 'support' && mode === 'fixture-support-failure') {
      payload = { error: { code: 'database_unavailable', message: 'Mercury is temporarily unavailable. Please try again.' } };
      status = 503;
    } else if (parts[1] === 'events' && parts.length === 2) {
      payload = { events: accountFixture || ['fixture-cancelled', 'fixture-full', 'fixture-native-explore'].includes(mode) ? [fixtureEvent] : [] };
      status = 200;
    } else if (parts[1] === 'events' && parts.length === 3 && parts[2] === fixtureEvent.id) {
      payload = { event: fixtureEvent };
      status = 200;
    } else if (parts[1] === 'listings' && parts.length === 2) {
      payload = { listings: currentListings().map(listing => ({ ...listing, availability: listingStatus(listing) })) };
      status = 200;
    } else if (parts[1] === 'saved-listings') {
      const listing = findListing('mumbai-flex-nov-2026');
      payload = { listings: accountFixture ? [{ ...listing, availability: listingStatus(listing) }] : [] };
      status = 200;
    } else if (parts[1] === 'bookings' && parts.length === 2) {
      payload = { bookings: accountFixture ? [fixtureBooking] : [] };
      status = 200;
    } else if (parts[1] === 'organizer' && parts[2] === 'events' && parts.length === 3) {
      payload = { events: organizerFixture ? [fixtureEvent] : [] };
      status = 200;
    } else if (parts[1] === 'organizer' && parts[2] === 'events' && parts[4] === 'attendees') {
      payload = { event: fixtureEvent, attendees: organizerFixture ? [fixtureBooking] : [] };
      status = 200;
    } else if (parts[1] === 'admin' && parts[2] === 'overview') {
      payload = { support: [], corrections: [], overrides: [], clicks: [{ listing_id: 'mumbai-flex-nov-2026', count: 9 }],
        metrics: [{ metric: 'home_view', count: 42 }, { metric: 'explore_view', count: 24 }, { metric: 'external_detail_view', count: 12 }, { metric: 'zero_results', count: 3 }, { metric: 'signin_error', count: 2 }, { metric: 'booking_confirmed', count: 1 }],
        metricsAvailable: true, saves: [], users: 5, listings: [] };
      status = 200;
    } else if (parts[1] === 'listings' && parts.length === 3) {
      const listing = findListing(parts[2]);
      if (listing) { payload = { listing: { ...listing, availability: mode === 'fixture-withdrawn' ? { code: 'withdrawn', label: 'Listing withdrawn', reason: 'Review fixture: organizer cancellation.' } : listingStatus(listing) } }; status = 200; }
    }
    send('Fetch.fulfillRequest', {
      requestId: message.params.requestId, responseCode: status,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
      body: Buffer.from(JSON.stringify(payload)).toString('base64'),
    }).catch(error => process.stderr.write(`${error.message}\n`));
    return;
  }
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(Error(message.error.message));
  else resolve(message.result);
});
function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  if (scope === 'contrast' || scope === 'axe') await send('Page.addScriptToEvaluateOnNewDocument', { source: await readFile('node_modules/.pnpm/axe-core@4.11.4/node_modules/axe-core/axe.min.js', 'utf8') });
  if (mode?.startsWith('fixture') || mode === 'loading') await send('Fetch.enable', { patterns: [{ urlPattern: '*://localhost:3002/api/*' }] });
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600, screenWidth: width, screenHeight: height });
  if (scope === 'perf') await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__mercuryPerf = { lcp: 0, cls: 0, shifts: [] };
    try { new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__mercuryPerf.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
    try { new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) { window.__mercuryPerf.cls += entry.value; window.__mercuryPerf.shifts.push({ value: entry.value, sources: entry.sources.map(source => ({ node: source.node?.tagName + '.' + source.node?.className, previous: source.previousRect, current: source.currentRect })) }); } }).observe({ type: 'layout-shift', buffered: true }); } catch {}
  ` });
  await send('Page.navigate', { url });
  await new Promise(resolve => setTimeout(resolve, mode === 'loading' ? 850 : 2400));
  if (mode === 'fixture-open-filters') {
    await send('Runtime.evaluate', { expression: 'document.querySelector("#filter-toggle")?.click()' });
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (accountFixture) {
    const destination = ['fixture-pass', 'fixture-expired-pass'].includes(mode) ? '/booking/review-pass' : mode === 'fixture-register' ? '/register/review-state' : mode === 'fixture-roster' ? '/roster/review-state' : organizerFixture ? '/host' : ownerFixture ? '/admin' : '/my-games';
    await send('Runtime.evaluate', { expression: `history.pushState(null, '', '${destination}'); dispatchEvent(new PopStateEvent('popstate'))` });
    await new Promise(resolve => setTimeout(resolve, 1100));
  }
  if (mode === 'fixture-preview') {
    const setDraft = `(() => {
      const form = document.querySelector('#event-form');
      const values = ${JSON.stringify({ title: 'Review fixture: Thursday Badminton', sport: 'Badminton', format: 'Social play', area: 'Powai', date: fixtureDate, time: '18:00', venue: 'Sample court, Powai, Mumbai', level: 'All levels', capacity: '12', price: '0', description: 'A sample free doubles session for reviewing the organizer preview.', included: 'Court time and shuttlecocks', bring: 'Bring a racket, indoor shoes and water.', cancellation: 'Cancel a free place before the session starts.' })};
      for (const [name, value] of Object.entries(values)) form.elements.namedItem(name).value = value;
      form.querySelector('#preview-event').click();
      return document.querySelector('.detail-layout')?.textContent || '';
    })()`;
    const preview = await send('Runtime.evaluate', { expression: setDraft, returnByValue: true });
    if (!preview.result.value.includes('Booking unavailable in preview')) throw new Error('Organizer preview did not render the public detail layout');
    await new Promise(resolve => setTimeout(resolve, 350));
    await send('Runtime.evaluate', { expression: 'document.querySelector(".back").click()' });
    await new Promise(resolve => setTimeout(resolve, 650));
    const restored = await send('Runtime.evaluate', { expression: 'document.querySelector("#event-form [name=title]")?.value', returnByValue: true });
    if (restored.result.value !== 'Review fixture: Thursday Badminton') throw new Error('Preview did not preserve unsaved form input');
    await send('Runtime.evaluate', { expression: 'document.querySelector("#preview-event").click()' });
    await new Promise(resolve => setTimeout(resolve, 350));
  }
  if (mode === 'fixture-support-failure') {
    await send('Runtime.evaluate', { expression: '(() => { const form=document.querySelector("#support-form");form.elements.namedItem("name").value="Review Player";form.elements.namedItem("email").value="review@example.test";form.elements.namedItem("message").value="Please check the published event details.";form.elements.namedItem("consent").checked=true;form.requestSubmit(); })()' });
    await new Promise(resolve => setTimeout(resolve, 500));
    const retained = await send('Runtime.evaluate', { expression: 'JSON.stringify({name:document.querySelector("#support-form [name=name]")?.value,email:document.querySelector("#support-form [name=email]")?.value,message:document.querySelector("#support-form [name=message]")?.value,consent:document.querySelector("#support-form [name=consent]")?.checked,button:document.querySelector("#support-form button[type=submit]")?.textContent,error:document.querySelector("#support-form [role=alert]")?.textContent})', returnByValue: true });
    const fields = JSON.parse(retained.result.value);
    if (fields.name !== 'Review Player' || fields.email !== 'review@example.test' || !fields.message || !fields.consent || fields.button !== 'Retry' || !fields.error) throw new Error(`Support failure did not preserve input: ${retained.result.value}`);
    process.stdout.write(`Support retry preserved input: ${retained.result.value}\n`);
  }
  if (pastBookingMode) {
    const reading = await send('Runtime.evaluate', {
      expression: 'JSON.stringify({heading:document.querySelector(".page-intro h1")?.textContent,history:document.querySelector("details summary")?.textContent,historyOpen:document.querySelector("details")?.open,cancel:!!document.querySelector("#cancel-pass,[data-cancel-booking]")})',
      returnByValue: true,
    });
    const state = JSON.parse(reading.result.value);
    if (mode === 'fixture-past-games' && (!state.history?.includes('Started or past Mercury games') || !state.historyOpen || state.cancel)) throw new Error(`Started game grouping is wrong: ${reading.result.value}`);
    if (mode === 'fixture-expired-pass' && (!state.heading?.includes('started') || state.cancel)) throw new Error(`Started pass state is wrong: ${reading.result.value}`);
    process.stdout.write(`Started booking state: ${reading.result.value}\n`);
  }
  if (cancelledBookingMode) {
    const reading = await send('Runtime.evaluate', {
      expression: 'JSON.stringify({history:document.querySelector("details summary")?.textContent,historyOpen:document.querySelector("details")?.open,status:document.querySelector("details .state")?.textContent,cancel:!!document.querySelector("#cancel-pass,[data-cancel-booking]")})',
      returnByValue: true,
    });
    const state = JSON.parse(reading.result.value);
    if (!state.history?.includes('Cancelled registrations') || !state.historyOpen || state.status !== 'Cancelled by organizer' || state.cancel) throw new Error(`Cancelled booking grouping is wrong: ${reading.result.value}`);
    process.stdout.write(`Cancelled booking state: ${reading.result.value}\n`);
  }
  if (mode === 'fixture-history') {
    const before = (await send('Runtime.evaluate', { expression: 'document.querySelector("#directory-count")?.textContent', returnByValue: true })).result.value;
    const changed = await send('Runtime.evaluate', {
      expression: '(() => { const field = document.querySelector("#directory-filters [name=sport]"); field.value = "Tennis"; field.dispatchEvent(new Event("change", { bubbles: true })); return JSON.stringify({ url: location.search, count: document.querySelector("#directory-count")?.textContent }); })()',
      returnByValue: true,
    });
    if (!changed.result.value.includes('sport=Tennis')) throw new Error('Filter change did not update the URL');
    await send('Runtime.evaluate', { expression: 'history.back()' });
    await new Promise(resolve => setTimeout(resolve, 900));
    const restored = await send('Runtime.evaluate', {
      expression: 'JSON.stringify({ url: location.search, sport: document.querySelector("#directory-filters [name=sport]")?.value, count: document.querySelector("#directory-count")?.textContent })',
      returnByValue: true,
    });
    const state = JSON.parse(restored.result.value);
    if (state.url || state.sport !== 'All sports' || state.count !== before) throw new Error(`Back navigation did not restore filters: ${restored.result.value}`);
    process.stdout.write(`Filter history: ${changed.result.value} -> ${restored.result.value}\n`);
  }
  const metrics = await send('Runtime.evaluate', { expression: 'JSON.stringify({url:location.href,title:document.title,viewport:innerWidth,content:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,linksBottom:document.querySelector(".signin-links")?.getBoundingClientRect().bottom})', returnByValue: true });
  const page = JSON.parse(metrics.result.value);
  if (scope === 'contrast' || scope === 'axe') {
    const run = scope === 'axe' ? 'axe.run(document)' : 'axe.run(document,{runOnly:{type:"rule",values:["color-contrast"]}})';
    const reading = await send('Runtime.evaluate', {
      expression: run + '.then(result=>JSON.stringify({url:location.href,violations:result.violations.map(rule=>({id:rule.id,impact:rule.impact,nodes:rule.nodes.map(node=>({target:node.target,text:node.html.slice(0,160),summary:node.failureSummary}))})),incomplete:result.incomplete.map(rule=>({id:rule.id,nodes:rule.nodes.map(node=>({target:node.target,text:node.html.slice(0,160),summary:node.failureSummary}))}))}))',
      awaitPromise: true, returnByValue: true,
    });
    if (!reading.result?.value) throw new Error(`Contrast audit failed: ${JSON.stringify(reading.exceptionDetails || reading)}`);
    const report = JSON.parse(reading.result.value);
    await writeFile(output, JSON.stringify(report, null, 2));
    process.stdout.write(`${output} ${JSON.stringify({violations:report.violations.reduce((n,rule)=>n+rule.nodes.length,0),incomplete:report.incomplete.reduce((n,rule)=>n+rule.nodes.length,0)})}\n`);
  } else if (scope === 'signin-failure') {
    await send('Page.bringToFront');
    await send('Runtime.evaluate', { expression: 'document.querySelector(".signin-panel form button")?.click()' });
    await new Promise(resolve => setTimeout(resolve, 1800));
    const reading = await send('Runtime.evaluate', { expression: 'JSON.stringify({path:location.pathname,returnTo:new URLSearchParams(location.search).get("return_to"),error:new URLSearchParams(location.search).get("error"),message:document.querySelector(".signin-error")?.textContent})', returnByValue: true });
    const report = JSON.parse(reading.result.value);
    if (report.path !== '/signin' || report.returnTo !== '/listing/mumbai-flex-nov-2026' || report.error !== 'configuration' || !report.message?.includes('temporarily unavailable')) throw new Error(`Sign-in failure did not preserve context: ${reading.result.value}`);
    await writeFile(output, JSON.stringify(report, null, 2));
    process.stdout.write(`${output} sign-in configuration failure returns to the intended listing\n`);
  } else if (scope === 'cardstate') {
    const reading = await send('Runtime.evaluate', { expression: 'JSON.stringify({status:document.querySelector(".mercury-card .photo-status")?.textContent,action:document.querySelector(".mercury-card .photo-cta")?.textContent,route:document.querySelector(".mercury-card .photo-card-link")?.getAttribute("href")})', returnByValue: true });
    const report = JSON.parse(reading.result.value);
    const expected = mode === 'fixture-cancelled' ? 'Cancelled' : 'Game full';
    if (report.status !== expected || !report.action?.includes('View event') || report.route !== '/event/review-state') throw new Error(`Native card state mismatch: ${reading.result.value}`);
    await writeFile(output, JSON.stringify(report, null, 2));
    process.stdout.write(`${output} native ${mode} card state passed\n`);
  } else if (scope === 'handoff') {
    await send('Runtime.evaluate', { expression: 'document.querySelector("#directory-results .photo-card-link")?.click()' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    const clicked = await send('Runtime.evaluate', { expression: '(() => { const link=document.querySelector("a[data-outbound]"); if (!link) return null; document.addEventListener("click", event => event.preventDefault(), {capture:true,once:true}); link.click(); return {listing:link.dataset.outbound,destination:link.href,page:location.pathname}; })()', returnByValue: true });
    await new Promise(resolve => setTimeout(resolve, 400));
    if (!clicked.result.value || outboundRequests.length !== 1) throw new Error(`Expected one nonblocking organizer click count: ${JSON.stringify({ clicked: clicked.result.value, outboundRequests })}`);
    const report = { ...clicked.result.value, countRequests: outboundRequests.length, countPath: new URL(outboundRequests[0]).pathname };
    await writeFile(output, JSON.stringify(report, null, 2));
    process.stdout.write(`${output} one organizer click count; external navigation remained independent\n`);
  } else if (scope === 'explore-fast') {
    // Deliberately leave /api/session pending in the fixture, to guarantee public
    // Explore does not wait for account/session setup before displaying inventory.
    const warm = new URL(url).pathname === '/';
    await send('Runtime.evaluate', {
      expression: 'history.pushState(null,"","/explore");window.dispatchEvent(new PopStateEvent("popstate"))'
    });
    const initial = await send('Runtime.evaluate', {
      expression: 'JSON.stringify({path:location.pathname,loading:!!document.querySelector(".explore-pending"),' +
        'generic:document.querySelector("#main")?.textContent.includes("Getting your game ready"),' +
        'cards:document.querySelectorAll("#directory-results .photo-card").length})',
      returnByValue: true
    });
    const immediate = JSON.parse(initial.result.value);
    if (immediate.path !== '/explore' || immediate.generic ||
        (warm && (immediate.loading || immediate.cards < 8)) ||
        (!warm && !immediate.loading && !immediate.cards))
      throw Error('Explore first paint still blocked: ' + initial.result.value);
    await new Promise(resolve => setTimeout(resolve, 900));
    const loaded = await send('Runtime.evaluate', {
      expression: 'JSON.stringify({path:location.pathname,loading:!!document.querySelector(".explore-pending"),' +
        'generic:document.querySelector("#main")?.textContent.includes("Getting your game ready"),' +
        'cards:document.querySelectorAll("#directory-results .photo-card").length,' +
        'count:document.querySelector("#directory-count")?.textContent,' +
        'overflow:document.documentElement.scrollWidth > innerWidth})',
      returnByValue: true
    });
    const result = JSON.parse(loaded.result.value);
    if (result.path !== '/explore' || result.generic || result.loading ||
        result.cards < 8 || !result.count || result.overflow)
      throw Error('Explore waited for session or layout failed: ' + loaded.result.value);
    await writeFile(output, JSON.stringify({ warm, immediate, result }, null, 2));
    process.stdout.write(output + (warm
      ? ' warm Home-to-Explore navigation rendered immediately\n'
      : ' cold navigation rendered public Explore before session reply\n'));
  } else if (scope === 'public-organizer') {
    const reading = await send('Runtime.evaluate', {
      expression: 'JSON.stringify({path:location.pathname,head:document.querySelector(".organizer-public-hero h1")?.textContent,' +
        'list:document.querySelector(".organizer-public-actions a.button.primary")?.getAttribute("href"),' +
        'host:!!document.querySelector(".organizer-public-actions a.button.outline"),' +
        'routes:document.querySelectorAll(".organizer-path-card").length,' +
        'nativeFree:document.querySelector(".organizer-availability-note")?.textContent.includes("Free bookings"),' +
        'overflow:document.documentElement.scrollWidth>innerWidth,loading:!!document.querySelector("main [role=status]")})',
      returnByValue: true
    });
    const state=JSON.parse(reading.result.value);
    if(state.path!=='/for-organizers'||!state.head?.includes('We help people find it')||state.list!=='/list-event'||!state.host||state.routes!==2||!state.nativeFree||state.overflow||state.loading)
      throw Error('Public organizer landing failed: '+reading.result.value);
    await writeFile(output, JSON.stringify(state,null,2));
    process.stdout.write(output+' public organizer landing passed\n');
  } else if (scope === 'public-how') {
    const reading=await send('Runtime.evaluate',{
      expression:'JSON.stringify({path:location.pathname,heading:document.querySelector(".public-how-intro h1")?.textContent,'+
        'sections:document.querySelectorAll(".public-how-grid article").length,organizers:!!document.querySelector(".public-how-note a.button"),'+
        'overflow:document.documentElement.scrollWidth>innerWidth})',
      returnByValue:true
    });
    const state=JSON.parse(reading.result.value);
    if(state.path!=='/how-it-works'||state.sections!==3||!state.organizers||state.overflow||!state.heading?.includes('Play it'))
      throw Error('Public guide failed: '+reading.result.value);
    await writeFile(output,JSON.stringify(state,null,2));
    process.stdout.write(output+' publicly readable How It Works passed\n');
  } else if (scope === 'public-submission') {
    const first=await send('Runtime.evaluate',{
      expression:'JSON.stringify({path:location.pathname,form:!!document.querySelector("#public-event-submission"),'+
        'signedIn:!!document.querySelector(".signin-page"),overflow:document.documentElement.scrollWidth>innerWidth})',
      returnByValue:true
    });
    const initial=JSON.parse(first.result.value);
    if(initial.path!=='/list-event'||!initial.form||initial.signedIn||initial.overflow)
      throw Error('Public form requires login or overflows: '+first.result.value);
    const fill=await send('Runtime.evaluate',{expression:'(() => { const f=document.querySelector("#public-event-submission");'+
      'f.elements.namedItem("registrationUrl").value="https://example.org/events/sunday";'+
      'f.elements.namedItem("name").value="Review Sports Organizer";'+
      'f.elements.namedItem("email").value="organizer@example.test";'+
      'f.elements.namedItem("title").value="Sunday Fun Run";'+
      'f.elements.namedItem("sport").value="Running";'+
      'f.elements.namedItem("date").value="2026-12-20";'+
      'f.elements.namedItem("consent").checked=true;'+
      'f.dispatchEvent(new Event("input",{bubbles:true}));'+
      'return JSON.stringify({preview:document.querySelector("#submission-preview-title")?.textContent,'+
      'source:document.querySelector("#submission-preview-link")?.textContent});})()',returnByValue:true});
    const state=JSON.parse(fill.result.value);
    if(state.preview!=='Sunday Fun Run'||state.source!=='example.org')
      throw Error('Preview did not update: '+fill.result.value);
    await send('Runtime.evaluate',{expression:'document.querySelector("#public-event-submission").requestSubmit()'});
    await new Promise(resolve=>setTimeout(resolve,900));
    const result=await send('Runtime.evaluate',{expression:'JSON.stringify({ref:document.querySelector("#submitted-event-ref")?.textContent,'+
      'text:document.querySelector(".organizer-submission-done")?.textContent||"",overflow:document.documentElement.scrollWidth>innerWidth})',
      returnByValue:true});
    const completed=JSON.parse(result.result.value);
    if(completed.ref!=='test-organizer-request-123'||!completed.text.includes('manual review')||completed.overflow)
      throw Error('Review intake did not finish: '+result.result.value);
    await writeFile(output,JSON.stringify({initial,preview:state,completed},null,2));
    process.stdout.write(output+' no-login organizer event submission passed\n');
  } else if (scope === 'kinetic-explore') {
    const reading=await send('Runtime.evaluate',{
      expression:'JSON.stringify({arena:!!document.querySelector(".mercury-arena"),paths:document.querySelectorAll(".arena-wave-svg .arena-line").length,'+
        'ticker:document.querySelector(".arena-ticker-track")?getComputedStyle(document.querySelector(".arena-ticker-track")).animationName:null,'+
        'photoCards:document.querySelectorAll("#directory-results .photo-card").length,'+
        'firstTop:document.querySelector("#directory-results .photo-card")?.getBoundingClientRect().top,'+
        'cardHeight:document.querySelector("#directory-results .photo-card")?.getBoundingClientRect().height,'+
        'waveRibbon:!!document.querySelector(".mercury-wave-ribbon"),'+
        'overflow:document.documentElement.scrollWidth>innerWidth})',
      returnByValue:true
    });
    const state=JSON.parse(reading.result.value);
    if(!state.arena||state.paths<3||state.ticker==='none'||state.photoCards<5||
      !(state.firstTop<height)||state.cardHeight >= (width > 700 ? 370 : 220)||!state.waveRibbon||state.overflow)
      throw Error('Kinetic Explore UI failed: '+reading.result.value);
    await writeFile(output,JSON.stringify(state,null,2));
    process.stdout.write(output+' wavy Explore motion and compact card layout passed\n');
  } else if (scope === 'kinetic-detail') {
    const reading=await send('Runtime.evaluate',{
      expression:'JSON.stringify({path:location.pathname,stripe:!!document.querySelector(".listing-flow-stripe"),'+
        'line:!!document.querySelector(".listing-flow-stripe svg path"),'+
        'title:document.querySelector(".listing-page .listing-stage h1, .listing-page .detail-title")?.textContent,'+
        'facts:document.querySelectorAll(".listing-page .event-facts>div").length,'+
        'action:!!document.querySelector(".listing-page .booking-panel .button.primary"),'+
        'overflow:document.documentElement.scrollWidth>innerWidth})',
      returnByValue:true
    });
    const state=JSON.parse(reading.result.value);
    if(!state.path.startsWith('/listing/')||!state.stripe||!state.line||!state.title||
       state.facts<4||!state.action||state.overflow)
       throw Error('Kinetic listing page failed: '+reading.result.value);
    await writeFile(output,JSON.stringify(state,null,2));
    process.stdout.write(output+' event detail motion and facts passed\n');
  } else if (scope === 'kinetic-home') {
    const reading=await send('Runtime.evaluate',{
      expression:'JSON.stringify({trail:!!document.querySelector(".home-speedlines"),'+
        'featured:document.querySelectorAll("#featured-grid .photo-card").length,'+
        'hero:!!document.querySelector(".home-journey .hero"),'+
        'overflow:document.documentElement.scrollWidth>innerWidth})',
      returnByValue:true
    });
    const state=JSON.parse(reading.result.value);
    if(!state.trail||!state.hero||!state.featured||state.overflow)
      throw Error('Kinetic homepage failed: '+reading.result.value);
    await writeFile(output,JSON.stringify(state,null,2));
    process.stdout.write(output+' animated Home hero and featured cards passed\n');
  } else if (scope === 'ux-home') {
    const reading = await send('Runtime.evaluate', {
      expression: '(() => { const root=document.querySelector(".home-journey");' +
        'const positions=[".quickline","#hero-search",".discovery-section",".hero",".host-banner"].map(s=>[...root.children].indexOf(root.querySelector(s)));' +
        'return JSON.stringify({positions,featured:document.querySelectorAll("#featured-grid .directory-card").length,overflow:document.documentElement.scrollWidth>innerWidth,location:location.pathname});})()',
      returnByValue: true
    });
    const state = JSON.parse(reading.result.value);
    if(state.location!=='/'||state.positions.some((index,i)=>index<0||(i>0&&index<=state.positions[i-1]))||
       state.featured<1||state.overflow) throw Error('Home UX failed: '+reading.result.value);
    await writeFile(output,JSON.stringify(state,null,2));
    process.stdout.write(output+' player-first Home passed\n');
  } else if (scope === 'ux-organizer') {
    const initial = await send('Runtime.evaluate', {
      expression: 'JSON.stringify({steps:document.querySelectorAll(".organizer-progress-item").length,'+
        'active:document.querySelector(".organizer-step:not([hidden])")?.dataset.step,'+
        'primary:document.querySelector(".organizer-event-card .organizer-primary-action")?.textContent,'+
        'overflow:document.documentElement.scrollWidth>innerWidth})',
      returnByValue: true
    });
    const state=JSON.parse(initial.result.value);
    if(state.steps!==3||state.active!=='0'||!state.primary?.includes('Manage players')||state.overflow)
      throw Error('Organizer editor first-screen failed: '+initial.result.value);
    const values={
      title:'Review fixture: Thursday Badminton',sport:'Badminton',format:'Social play',
      area:'Powai',date:fixtureDate,time:'18:00',venue:'Sample court, Powai, Mumbai',
      level:'All levels',capacity:'12',price:'0',
      description:'An approachable community session with enough details to make a plan.',
      included:'Court and shuttlecocks',bring:'Racket and court shoes',
      cancellation:'Cancel free before this session begins.'
    };
    const fillExpression='(() => { const form=document.querySelector("#event-form"); const values='+
      JSON.stringify(values)+'; for(const [name,value] of Object.entries(values)) form.elements.namedItem(name).value=value;'+
      'form.dispatchEvent(new Event("input",{bubbles:true}));const next=form.querySelector(".organizer-step-actions .button.primary");'+
      'next.click();const second=form.querySelector(".organizer-step:not([hidden])")?.dataset.step;'+
      'next.click();const review=form.querySelector(".organizer-step:not([hidden])")?.dataset.step;'+
      'return JSON.stringify({second,review,summary:form.querySelector(".organizer-review-facts")?.textContent,'+
      'error:form.querySelector(".organizer-step-alert")?.textContent});})()';
    const filled=await send('Runtime.evaluate',{expression:fillExpression,returnByValue:true});
    const details=JSON.parse(filled.result.value);
    if(details.second!=='1'||details.review!=='2'||!details.summary?.includes(values.title)||details.error)
      throw Error('Organizer steps failed: '+filled.result.value);
    const preview=await send('Runtime.evaluate',{expression:'(() => { document.querySelector("#preview-event").click();return JSON.stringify({detail:!!document.querySelector(".detail-layout")}); })()',returnByValue:true});
    if(!JSON.parse(preview.result.value).detail)throw Error('Organizer preview failed: '+preview.result.value);
    await send('Runtime.evaluate',{expression:'document.querySelector(".back").click()'});
    await new Promise(resolve=>setTimeout(resolve,900));
    const restored=await send('Runtime.evaluate',{
      expression:'JSON.stringify({active:document.querySelector(".organizer-step:not([hidden])")?.dataset.step,'+
        'title:document.querySelector("#event-form [name=title]")?.value,overflow:document.documentElement.scrollWidth>innerWidth})',
      returnByValue:true
    });
    const back=JSON.parse(restored.result.value);
    if(back.active!=='2'||back.title!==values.title||back.overflow)
      throw Error('Organizer preview return lost edits: '+restored.result.value);
    await writeFile(output,JSON.stringify({initial:state,details,back},null,2));
    process.stdout.write(output+' organizer editor, review and preview return passed\n');
  } else if (scope === 'ux-roster') {
    const expression='(() => { const input=document.querySelector("#roster-search"),checkbox=document.querySelector("#roster-unchecked");'+
      'if(!input||!checkbox)return JSON.stringify({present:false});input.value="not-a-player";input.dispatchEvent(new Event("input",{bubbles:true}));'+
      'const hidden=document.querySelectorAll(".roster-row:not([hidden])").length;input.value="review-pass";'+
      'input.dispatchEvent(new Event("input",{bubbles:true}));checkbox.checked=true;checkbox.dispatchEvent(new Event("change",{bubbles:true}));'+
      'return JSON.stringify({present:true,hidden,matches:document.querySelectorAll(".roster-row:not([hidden])").length,'+
      'status:document.querySelector("#roster-result-count")?.textContent,overflow:document.documentElement.scrollWidth>innerWidth});})()';
    const result=await send('Runtime.evaluate',{expression,returnByValue:true});
    const state=JSON.parse(result.result.value);
    if(!state.present||state.hidden!==0||state.matches!==1||state.overflow)
      throw Error('Rostering search failed: '+result.result.value);
    await writeFile(output,JSON.stringify(state,null,2));
    process.stdout.write(output+' organizer search and unchecked-only view passed\n');
  } else if (scope === 'explore') {
    const evaluate = async expression => {
      const reading = await send('Runtime.evaluate', { expression, returnByValue: true });
      if (reading.exceptionDetails) throw new Error(reading.exceptionDetails.text);
      return reading.result.value;
    };
    const initial = JSON.parse(await evaluate('JSON.stringify({cards:document.querySelectorAll("#directory-results .directory-card").length,firstTop:document.querySelector("#directory-results .directory-card")?.getBoundingClientRect().top,cardHeight:document.querySelector("#directory-results .directory-card")?.getBoundingClientRect().height,photo:document.querySelector("#directory-results .directory-card img")?.src,cta:document.querySelector("#directory-results .directory-card .photo-cta")?.textContent,sort:document.querySelector("#sort-results")?.value,overflow:document.documentElement.scrollWidth>innerWidth,availability:document.querySelector("#directory-filters [name=availability]")?.value,clearHidden:document.querySelector("#clear-filters")?.hidden,url:location.search})'));
    if (initial.cards < 8 || initial.firstTop >= height || initial.cardHeight > (width > 700 ? 370 : 220) || initial.overflow || !initial.photo?.includes('images.pexels.com') || !initial.cta?.includes('View event') || initial.sort !== 'Soonest first' || initial.availability !== 'All upcoming' || !initial.clearHidden || initial.url) throw new Error(`Explore initial layout failed: ${JSON.stringify(initial)}`);
    await evaluate('document.querySelector("[data-sport=Tennis]").click()');
    const sport = JSON.parse(await evaluate('JSON.stringify({url:location.search,pressed:document.querySelector("[data-sport=Tennis]").getAttribute("aria-pressed"),cards:document.querySelectorAll("#directory-results .directory-card").length})'));
    if (!sport.url.includes('sport=Tennis') || sport.pressed !== 'true' || sport.cards < 1 || sport.cards >= initial.cards) throw new Error(`Sport filter failed: ${JSON.stringify(sport)}`);
    await evaluate('document.querySelector("#clear-filters").click()');
    const reset = JSON.parse(await evaluate('JSON.stringify({url:location.search,availability:document.querySelector("#directory-filters [name=availability]").value,clearHidden:document.querySelector("#clear-filters").hidden})'));
    if (reset.url || reset.availability !== 'All upcoming' || !reset.clearHidden) throw new Error(`Filter reset failed: ${JSON.stringify(reset)}`);
    await evaluate('document.querySelector("#directory-filters [name=area]").value="Andheri";document.querySelector("#directory-filters [name=area]").dispatchEvent(new Event("change",{bubbles:true}));document.querySelector("#directory-filters [name=when]").value="Next 7 days";document.querySelector("#directory-filters [name=when]").dispatchEvent(new Event("change",{bubbles:true}))');
    const timeAndArea = JSON.parse(await evaluate('JSON.stringify({url:location.search,cards:document.querySelectorAll("#directory-results .directory-card").length,areas:[...document.querySelectorAll("#directory-results .directory-card .photo-area")].map(element=>element.textContent)})'));
    if (!timeAndArea.url.includes('area=Andheri') || !timeAndArea.url.includes('when=Next+7+days') || !timeAndArea.cards || timeAndArea.cards >= initial.cards || timeAndArea.areas.some(area=>!area.includes('Andheri'))) throw new Error(`Date and area filters failed: ${JSON.stringify(timeAndArea)}`);
    await evaluate('document.querySelector("#clear-filters").click()');
    await evaluate('document.querySelector("#directory-filters [name=query]").value="no-such-game";document.querySelector("#directory-filters [name=query]").dispatchEvent(new Event("input",{bubbles:true}))');
    const empty = JSON.parse(await evaluate('JSON.stringify({cards:document.querySelectorAll("#directory-results .directory-card").length,empty:!!document.querySelector(".explore-empty"),url:location.search})'));
    if (empty.cards || !empty.empty || !empty.url.includes('query=no-such-game')) throw new Error(`Empty search failed: ${JSON.stringify(empty)}`);
    await evaluate('document.querySelector("#clear-filters").click();document.querySelector("#filter-toggle").click()');
    const advanced = JSON.parse(await evaluate('JSON.stringify({expanded:document.querySelector("#filter-toggle").getAttribute("aria-expanded"),focus:document.activeElement?.name,hidden:document.querySelector("#directory-more-panel").hidden,cards:document.querySelectorAll("#directory-results .directory-card").length})'));
    if (advanced.expanded !== 'true' || advanced.hidden || advanced.focus !== 'sport' || advanced.cards !== initial.cards) throw new Error(`Advanced filters failed: ${JSON.stringify(advanced)}`);
    await evaluate('document.querySelector("#sort-results").value="Price: low to high";document.querySelector("#sort-results").dispatchEvent(new Event("change",{bubbles:true}))');
    const sorted = JSON.parse(await evaluate('JSON.stringify({sort:document.querySelector("#sort-results").value,url:location.search,cards:document.querySelectorAll("#directory-results .directory-card").length})'));
    if(sorted.sort!=='Price: low to high'||!sorted.url.includes('sort=Price')||sorted.cards!==initial.cards)
      throw new Error('Price sort failed: '+JSON.stringify(sorted));
    await evaluate('document.querySelector("#clear-filters").click()');
    await evaluate('document.querySelectorAll("[data-quick-name=fee]")[0].click()');
    const budget=JSON.parse(await evaluate('JSON.stringify({url:location.search,cards:document.querySelectorAll("#directory-results .directory-card").length})'));
    if(!budget.url.includes('fee=Under')||budget.cards>=initial.cards||!budget.cards)throw new Error('Quick fee filter failed: '+JSON.stringify(budget));
    await evaluate('document.querySelector("#clear-filters").click()');
    let native = null;
    if (mode === 'fixture-native-explore') {
      await evaluate('document.querySelector("#directory-filters [name=source]").value="Book on Mercury";document.querySelector("#directory-filters [name=source]").dispatchEvent(new Event("change",{bubbles:true}))');
      native = JSON.parse(await evaluate('JSON.stringify({url:location.search,cards:document.querySelectorAll("#directory-results .directory-card").length,route:document.querySelector(".mercury-card .photo-card-link")?.getAttribute("href"),action:document.querySelector(".mercury-card .photo-cta")?.textContent})'));
      if (!native.url.includes('source=Book+on+Mercury') || native.cards !== 1 || native.route !== '/event/review-state' || !native.action.includes('View event')) throw new Error(`Native booking route failed: ${JSON.stringify(native)}`);
    }
    const report = { page, initial, sport, reset, timeAndArea, empty, advanced, native };
    await writeFile(output, JSON.stringify(report, null, 2));
    process.stdout.write(`${output} Explore interaction checks passed\n`);
  } else if (scope === 'perf') {
    const reading = await send('Runtime.evaluate', { expression: 'JSON.stringify({navigation:performance.getEntriesByType("navigation")[0]?.toJSON(),lcp:window.__mercuryPerf?.lcp,cls:window.__mercuryPerf?.cls,shifts:window.__mercuryPerf?.shifts,resources:performance.getEntriesByType("resource").length,transferBytes:performance.getEntriesByType("resource").reduce((sum,entry)=>sum+entry.transferSize,0)})', returnByValue: true });
    const report = { page, ...JSON.parse(reading.result.value) };
    await writeFile(output, JSON.stringify(report, null, 2));
    process.stdout.write(`${output} ${JSON.stringify({ lcp: report.lcp, cls: report.cls, resources: report.resources, transferBytes: report.transferBytes })}\n`);
  } else if (scope === 'keyboard') {
    await send('Page.bringToFront');
    const enter = async () => {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    };
    const escape = async () => {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    };
    const state = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;
    const report = {};
    if (width >= 760) {
      await send('Runtime.evaluate', { expression: 'document.querySelector("#location-button").focus()' });
      await enter();
      const opened = await state('JSON.stringify({open:document.querySelector("#location-dialog").open,focusInside:document.querySelector("#location-dialog").contains(document.activeElement)})');
      if (!JSON.parse(opened).open || !JSON.parse(opened).focusInside) throw new Error(`Location dialog keyboard open/focus failed: ${opened}; focus: ${await state('document.activeElement?.id')}`);
      await escape();
      const closed = await state('JSON.stringify({open:document.querySelector("#location-dialog").open,focus:document.activeElement?.id})');
      if (JSON.parse(closed).open || JSON.parse(closed).focus !== 'location-button') throw new Error(`Location dialog Escape/focus return failed: ${closed}`);
      report.locationDialog = { opened: JSON.parse(opened), closed: JSON.parse(closed) };
    }
    if (new URL(url).pathname === '/explore') {
      await send('Runtime.evaluate', { expression: 'document.querySelector("#filter-toggle").focus()' });
      await enter();
      const filterOpen = await state('JSON.stringify({expanded:document.querySelector("#filter-toggle").getAttribute("aria-expanded"),focus:document.activeElement?.name})');
      if (JSON.parse(filterOpen).expanded !== 'true' || JSON.parse(filterOpen).focus !== 'sport') throw new Error(`Filter keyboard open/focus failed: ${filterOpen}`);
      await send('Runtime.evaluate', { expression: 'document.querySelector("#directory-filters [name=sport]").value="Tennis";document.querySelector("#directory-filters [name=sport]").dispatchEvent(new Event("change",{bubbles:true}));document.querySelector(".filter-apply").focus()' });
      await enter();
      const filterApplied = await state('JSON.stringify({url:location.search,expanded:document.querySelector("#filter-toggle").getAttribute("aria-expanded"),focus:document.activeElement?.id})');
      if (!JSON.parse(filterApplied).url.includes('sport=Tennis') || JSON.parse(filterApplied).expanded !== 'false' || JSON.parse(filterApplied).focus !== 'directory-count') throw new Error(`Filter keyboard apply/focus failed: ${filterApplied}`);
      report.filters = { opened: JSON.parse(filterOpen), applied: JSON.parse(filterApplied) };
    }
    if (new URL(url).pathname.startsWith('/listing/')) {
      await send('Runtime.evaluate', { expression: 'document.querySelector(".detail-layout details summary").focus()' });
      const before = await state('document.querySelector(".detail-layout details").open');
      await enter();
      const after = await state('document.querySelector(".detail-layout details").open');
      if (before === after) throw new Error('Listing source disclosure did not respond to Enter');
      await send('Runtime.evaluate', { expression: 'document.querySelector("#report-listing").focus()' });
      await enter();
      await new Promise(resolve => setTimeout(resolve, 250));
      const correctionRoute = await state('location.pathname + location.search');
      if (!correctionRoute.startsWith('/support?') || !correctionRoute.includes('listing=mumbai-flex-nov-2026')) throw new Error(`Signed-out correction did not reach contextual support: ${correctionRoute}`);
      report.listing = { sourceDisclosure: { before, after }, correctionRoute };
    }
    await writeFile(output, JSON.stringify(report, null, 2));
    process.stdout.write(`${output} keyboard checks passed\n`);
  } else if (scope === 'audit') {
    await send('Accessibility.enable');
    const { nodes } = await send('Accessibility.getFullAXTree');
    const namedRoles = new Set(['button', 'link', 'textbox', 'combobox', 'dialog', 'checkbox']);
    const unnamed = nodes.filter(node => !node.ignored && namedRoles.has(node.role?.value) && !node.name?.value?.trim())
      .map(node => ({ role: node.role.value, nodeId: node.backendDOMNodeId || null }));
    const dom = await send('Runtime.evaluate', {
      expression: 'JSON.stringify({ missingAlt:[...document.images].filter(image=>!image.hasAttribute("alt")).map(image=>image.currentSrc), invalidLabels:[...document.querySelectorAll("input,select,textarea")].filter(field=>field.type!=="hidden"&&!field.labels?.length&&!field.getAttribute("aria-label")&&!field.getAttribute("aria-labelledby")).map(field=>field.outerHTML.slice(0,160)), smallTargets:[...document.querySelectorAll("a,button,input,select,summary")].filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&r.right>0&&r.left<innerWidth&&s.visibility!=="hidden"&&s.display!=="none"&&(r.width<24||r.height<24)}).map(el=>({text:(el.getAttribute("aria-label")||el.textContent||"").trim().slice(0,60),width:Math.round(el.getBoundingClientRect().width),height:Math.round(el.getBoundingClientRect().height)})), horizontalOverflow:document.documentElement.scrollWidth>innerWidth })',
      returnByValue: true,
    });
    const report = { page, unnamed, ...JSON.parse(dom.result.value) };
    await writeFile(output, JSON.stringify(report, null, 2));
    process.stdout.write(`${output} ${JSON.stringify({ unnamed: unnamed.length, missingAlt: report.missingAlt.length, invalidLabels: report.invalidLabels.length, smallTargets: report.smallTargets.length, overflow: report.horizontalOverflow })}\n`);
  } else {
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: scope === 'full', fromSurface: true, ...(scope === 'full' ? { clip: { x: 0, y: 0, width, height: page.height, scale: 1 } } : {}) });
    await writeFile(output, Buffer.from(screenshot.data, 'base64'));
    process.stdout.write(`${output} ${metrics.result.value}\n`);
  }
} finally {
  if (mode === 'loading') await send('Fetch.disable');
  socket.close();
}
