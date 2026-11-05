import { indiaDay, listingStatus } from './catalogue.js';
import { listingCard } from './discovery.js';
import { trackMetric } from './metrics.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const defaults = { query: '', sport: 'All sports', when: 'Any date', area: 'All Mumbai', type: 'All formats', source: 'All listings', level: 'Any level', availability: 'Entry possible', from: '', to: '' };
const blocked = new Set(['closed', 'started', 'ended', 'withdrawn', 'stale']);
const addDays = (day, count) => new Date(Date.parse(day + 'T00:00:00Z') + count * 86400000).toISOString().slice(0, 10);

export function actionable(event, now = Date.now()) {
  if (event.external) return !blocked.has((event.availability || listingStatus(event, now)).code);
  return event.status === 'published' && event.startsAt > now && event.spots > 0;
}

function upcoming(event, now, today) {
  if (!event.external) return event.startsAt > now;
  const status = (event.availability || listingStatus(event, now)).code;
  return event.date >= today && !['started', 'ended', 'withdrawn'].includes(status);
}

function closedOrFull(event, now, today) {
  if (!upcoming(event, now, today)) return false;
  if (!event.external) return event.status === 'published' && event.spots <= 0;
  return (event.availability || listingStatus(event, now)).code === 'closed';
}

export function filterLineup(items, filters, now = Date.now()) {
  const query = (filters.query || '').trim().toLowerCase();
  const today = indiaDay(now);
  let start = filters.from || '', end = filters.to || '';
  if (filters.when === 'Next 7 days') { start = today; end = addDays(today, 6); }
  if (filters.when === 'This weekend') {
    const weekday = new Date(today + 'T00:00:00Z').getUTCDay();
    start = weekday === 0 ? today : addDays(today, (6 - weekday + 7) % 7);
    end = addDays(start, weekday === 0 ? 0 : 1);
  }
  return items.filter(event => {
    const eventEnd = event.endDate || event.date;
    return (!query || [event.title, event.sport, event.area, event.venue, event.host].join(' ').toLowerCase().includes(query))
      && (!filters.sport || filters.sport === 'All sports' || event.sport === filters.sport)
      && (!filters.area || filters.area === 'All Mumbai' || event.area === filters.area)
      && (!filters.type || filters.type === 'All formats' || event.type === filters.type)
      && (!filters.source || filters.source === 'All listings' || (filters.source === 'External listings' ? event.external : !event.external))
      && (!filters.level || filters.level === 'Any level' || event.level === filters.level)
      && (filters.solo !== '1' || (!event.external && event.solo))
      && (filters.availability !== 'Entry possible' || actionable(event, now))
      && (filters.availability !== 'All upcoming' || upcoming(event, now, today))
      && (filters.availability !== 'Closed or full' || closedOrFull(event, now, today))
      && (filters.availability !== 'Needs source check' || (event.external && upcoming(event, now, today) && (event.availability || listingStatus(event, now)).code === 'stale'))
      && (!start || eventEnd >= start) && (!end || event.date <= end);
  }).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export function renderExplore({ main, events, listings, gameCard }) {
  trackMetric('explore_view');
  const items = [...events.map(event => ({ ...event, external: false })), ...listings.map(event => ({ ...event, external: true }))];
  const options = [
    ['sport', 'Sport', ['All sports', ...new Set(items.map(event => event.sport).sort())]],
    ['when', 'Date', ['Any date', 'This weekend', 'Next 7 days']],
    ['area', 'Area', ['All Mumbai', ...new Set(items.map(event => event.area).sort())]],
    ['type', 'Format', ['All formats', 'Tournament', 'League', 'Training camp', 'Social play']],
    ['source', 'Registration route', ['All listings', 'External listings', 'Book on Mercury']],
    ['level', 'Playing level', ['Any level', ...new Set(items.map(event => event.level).sort())]],
    ['availability', 'Entry status', ['Entry possible', 'All upcoming', 'Closed or full', 'Needs source check']]
  ];
  const select = ([name, label, values]) => `<label class="directory-filter"><span>${label}</span><select name="${name}">${values.map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join('')}</select></label>`;
  main.innerHTML = `<div class="page-width explore-page"><section class="page-intro"><p class="eyebrow blue">THE COURT IS CALLING</p><h1>Explore <em>games.</em></h1><p>Tournaments, leagues and free sessions across Mumbai. Check the entry facts, then choose where to register.</p></section><div class="directory-note"><span class="tiny-star" aria-hidden="true">↗</span><p><b>Two routes to play.</b><br>External entries go to organizers. Free Mercury bookings appear in My games.</p></div><p class="directory-summary" id="directory-summary"></p><button class="button outline filter-toggle" id="filter-toggle" type="button" hidden aria-controls="directory-filters" aria-expanded="false">Filter games · Sport, date, area</button><form class="filter-bar directory-filters" id="directory-filters"><label class="directory-query"><span>Search games, clubs or areas</span><input type="search" name="query" placeholder="Try badminton or Andheri"></label>${options.slice(0,4).map(select).join('')}<details class="directory-more"><summary>More filters</summary><div class="directory-more-grid">${options.slice(4).map(select).join('')}<label class="directory-filter"><span>From date</span><input name="from" type="date"></label><label class="directory-filter"><span>To date</span><input name="to" type="date"></label></div></details><button class="button primary filter-apply" type="submit">Apply filters ↗</button></form><div id="active-filters" class="active-filters" role="group" aria-label="Active filters"></div><div class="results-heading"><p id="directory-count" role="status"></p><button type="button" class="text-link" id="clear-filters">Clear all</button></div><h2 class="sr-only">Game results</h2><div class="event-grid" id="directory-results"></div><p class="fine section-space">Dates are in IST. Source checks reflect published details, not live availability; confirm final rules and price with the organizer.</p></div>`;
  const form = main.querySelector('#directory-filters');
  const toggle = main.querySelector('#filter-toggle');
  toggle.hidden = false;
  if (matchMedia('(max-width:600px)').matches) form.classList.add('filter-collapsed');
  toggle.onclick = () => {
    const collapsed = form.classList.toggle('filter-collapsed');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    if (!collapsed) form.querySelector('[name="query"]').focus();
  };
  const params = new URLSearchParams(location.search);
  for (const [name, value] of params) {
    const input = form.elements.namedItem(name);
    if (input && (input.tagName !== 'SELECT' || [...input.options].some(option => option.value === value))) input.value = value;
  }
  let solo = params.get('solo') === '1';
  let editingQuery = false;
  const values = () => ({ ...Object.fromEntries(new FormData(form)), ...(solo ? { solo: '1' } : {}) });
  const writeUrl = (filters, mode) => {
    const search = new URLSearchParams();
    for (const [name, value] of Object.entries(filters)) if (value && value !== defaults[name]) search.set(name, value);
    const url = '/explore' + (search.size ? '?' + search : '');
    if (url !== location.pathname + location.search) history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
  };
  const update = (mode = 'none') => {
    const filters = values();
    const result = filterLineup(items, filters);
    const near = result.length ? [] : filterLineup(items, { ...filters, query: '', area: 'All Mumbai', when: 'Any date', from: '', to: '' });
    const count = `${result.length} ${result.length === 1 ? 'game' : 'games'} · Mumbai · soonest first`;
    main.querySelector('#directory-count').textContent = count;
    main.querySelector('#directory-summary').textContent = count;
    main.querySelector('#directory-results').innerHTML = result.length
      ? result.map(event => event.external ? listingCard(event) : gameCard(event)).join('')
      : `<div class="empty"><span aria-hidden="true">✳</span><h2>No exact matches.</h2><p>${near.length ? near.length + ' games match when area, date and search are widened.' : 'Try another sport or clear all filters to see the full lineup.'}</p>${near.length ? '<button class="button outline" type="button" id="widen-search">Show nearby dates and areas</button>' : ''}</div>`;
    const active = Object.entries(filters).filter(([name, value]) => name === 'solo' || (value && value !== defaults[name]));
    main.querySelector('#active-filters').innerHTML = active.map(([name, value]) => `<button type="button" class="filter-chip" data-remove-filter="${esc(name)}">${esc(name === 'solo' ? 'Solo-friendly' : name === 'when' ? 'Date' : name === 'availability' ? 'Status' : name)}: ${esc(value === '1' ? 'Yes' : value)} <span aria-hidden="true">×</span></button>`).join('');
    main.querySelector('#widen-search')?.addEventListener('click', () => {
      for (const name of ['query', 'area', 'when', 'from', 'to']) form.elements.namedItem(name).value = defaults[name];
      update('push');
    });
    if (mode !== 'none') writeUrl(filters, mode);
    return result.length;
  };
  form.addEventListener('input', event => {
    if (event.target.name !== 'query') return;
    update(editingQuery ? 'replace' : 'push');
    editingQuery = true;
  });
  form.querySelector('[name="query"]').addEventListener('blur', () => { editingQuery = false; });
  form.addEventListener('change', event => { if (event.target.name !== 'query') update('push'); });
  form.onsubmit = event => {
    event.preventDefault();
    if (update('replace') === 0) trackMetric('zero_results');
    form.querySelector('.directory-more').open = false;
    if (matchMedia('(max-width:600px)').matches) {
      form.classList.add('filter-collapsed');
      toggle.setAttribute('aria-expanded', 'false');
    }
    const count = main.querySelector('#directory-count');
    count.tabIndex = -1;
    count.focus({ preventScroll: true });
    count.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };
  main.querySelector('#clear-filters').onclick = () => { form.reset(); solo = false; update('push'); };
  main.querySelector('#active-filters').onclick = event => {
    const button = event.target.closest('[data-remove-filter]');
    if (!button) return;
    const name = button.dataset.removeFilter;
    if (name === 'solo') solo = false;
    else form.elements.namedItem(name).value = defaults[name];
    update('push');
  };
  update();
}
