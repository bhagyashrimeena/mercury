import { indiaDay, listingStatus } from './catalogue.js';
import { listingCard } from './discovery.js';
import { trackMetric } from './metrics.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const defaults = { query: '', sport: 'All sports', when: 'Any date', area: 'All Mumbai', type: 'All formats', source: 'All listings', level: 'Any level', availability: 'All upcoming', from: '', to: '' };
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

// Keep uncertain external entries visible with explicit warnings rather than allowing the
// seven-day source-freshness rule to empty Explore. Rank more actionable entries first.
export function rankForDiscovery(items, filters = {}, now = Date.now()) {
  if (filters.availability !== 'All upcoming') return [...items];
  const rank = event => {
    if (actionable(event, now)) return 0;
    if (event.external && (event.availability || listingStatus(event, now)).code === 'stale') return 1;
    return 2;
  };
  return [...items].sort((a, b) =>
    rank(a) - rank(b) || a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
  );
}

export function renderExplore({ main, events, listings, gameCard }) {
  trackMetric('explore_view');
  const items = [
    ...events.map(event => ({ ...event, external: false })),
    ...listings.map(event => ({ ...event, external: true }))
  ];
  const sports = [...new Set(items.map(event => event.sport).filter(Boolean))].sort();
  const options = [
    ['sport', 'Sport', ['All sports', ...sports]],
    ['when', 'When', ['Any date', 'This weekend', 'Next 7 days']],
    ['area', 'Area', ['All Mumbai', ...new Set(items.map(event => event.area).filter(Boolean).sort())]],
    ['type', 'Format', ['All formats', 'Tournament', 'League', 'Training camp', 'Social play']],
    ['source', 'Booking route', ['All listings', 'External listings', 'Book on Mercury']],
    ['level', 'Playing level', ['Any level', ...new Set(items.map(event => event.level).filter(Boolean).sort())]],
    ['availability', 'Entry status', ['Entry possible', 'All upcoming', 'Closed or full', 'Needs source check']]
  ];
  const select = ([name, label, values], extraClass = '') =>
    '<label class="directory-filter ' + extraClass + '"><span>' + esc(label) + '</span><select name="' + esc(name) + '">' +
    values.map(value => '<option value="' + esc(value) + '">' +
      esc(name === 'availability' && value === 'Entry possible' ? 'May accept entries · verify' : value) +
      '</option>').join('') +
    '</select></label>';
  const sportButton = sport =>
    '<button type="button" class="sport-pill" data-sport="' + esc(sport) + '" aria-pressed="false">' +
    '<span class="sport-dot" aria-hidden="true"></span>' + esc(sport) + '</button>';

  main.innerHTML = [
    '<div class="page-width explore-page">',
    '<header class="explore-intro" aria-labelledby="explore-title">',
    '<p class="eyebrow blue">MUMBAI, IN PLAY <span aria-hidden="true">↗</span></p>',
    '<h1 id="explore-title">Find your next <em>game.</em></h1>',
    '<p>Tournaments, leagues and sessions. Less looking, more playing.</p>',
    '</header>',
    '<section class="explore-search" aria-label="Find something to play">',
    '<div class="explore-sports" role="group" aria-label="Filter by sport">',
    ['All sports', ...sports].map(sportButton).join(''),
    '</div>',
    '<form class="filter-bar directory-filters explore-toolbar" id="directory-filters" role="search">',
    '<label class="directory-query"><span class="sr-only">Search games, clubs or areas</span>',
    '<span class="search-glyph" aria-hidden="true">⌕</span>',
    '<input type="search" name="query" placeholder="Search games, clubs or areas" autocomplete="off"></label>',
    select(options[1], 'quick-filter'),
    select(options[2], 'quick-filter'),
    '<button class="filter-toggle" id="filter-toggle" type="button" aria-controls="directory-more-panel" aria-expanded="false">Filters <span aria-hidden="true">＋</span></button>',
    '<div class="directory-extra" id="directory-more-panel" hidden>',
    '<div class="directory-more-grid">',
    [options[0], ...options.slice(3)].map(option => select(option)).join(''),
    '<label class="directory-filter"><span>From date</span><input type="date" name="from"></label>',
    '<label class="directory-filter"><span>To date</span><input type="date" name="to"></label>',
    '</div>',
    '<div class="directory-extra-actions">',
    '<p>Filters update the lineup as you choose them.</p>',
    '<button class="button primary filter-apply" type="submit">See games ↗</button>',
    '</div>',
    '</div>',
    '</form>',
    '</section>',
    '<div class="results-heading">',
    '<div><h2>On the calendar<span class="results-spark" aria-hidden="true">✳</span></h2>',
    '<p id="directory-count" role="status" aria-live="polite"></p></div>',
    '<button type="button" class="text-link" id="clear-filters">Clear filters</button>',
    '</div>',
    '<div id="active-filters" class="active-filters" role="group" aria-label="Active filters"></div>',
    '<p class="explore-freshness" id="explore-freshness" hidden></p>',
    '<div class="event-grid" id="directory-results" aria-label="Upcoming sporting opportunities"></div>',
    '<details class="explore-how"><summary>How joining a game works on Mercury</summary>',
    '<p>Some events send you to the organizer to register. For free sessions booked directly on Mercury, your confirmed place appears in <a href="/my-games">My games</a>. Saving a listing is not a booking.</p>',
    '</details>',
    '<p class="fine explore-fine">Dates follow IST. Details and entry status come from published sources, not live organizer availability. Confirm fees and eligibility before registering.</p>',
    '</div>'
  ].join('');

  const form = main.querySelector('#directory-filters');
  const panel = main.querySelector('#directory-more-panel');
  const toggle = main.querySelector('#filter-toggle');
  const sportButtons = [...main.querySelectorAll('[data-sport]')];
  const params = new URLSearchParams(location.search);
  for (const [name, value] of params) {
    const input = form.elements.namedItem(name);
    if (input && (input.tagName !== 'SELECT' || [...input.options].some(option => option.value === value)))
      input.value = value;
  }

  let solo = params.get('solo') === '1';
  let editingQuery = false;
  const values = () => ({ ...Object.fromEntries(new FormData(form)), ...(solo ? { solo: '1' } : {}) });
  const writeUrl = (filters, mode) => {
    const search = new URLSearchParams();
    for (const [name, value] of Object.entries(filters))
      if (value && value !== defaults[name]) search.set(name, value);
    const url = '/explore' + (search.size ? '?' + search : '');
    if (url !== location.pathname + location.search)
      history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
  };

  const update = (mode = 'none') => {
    const filters = values();
    const result = rankForDiscovery(filterLineup(items, filters), filters);
    const widened = result.length ? [] : filterLineup(items, {
      ...filters, query: '', area: 'All Mumbai', when: 'Any date', from: '', to: ''
    });
    const upcoming = result.length || widened.length ? [] : filterLineup(items, {
      ...filters, query: '', area: 'All Mumbai', when: 'Any date',
      from: '', to: '', availability: 'All upcoming'
    });
    sportButtons.forEach(button => {
      const selected = button.dataset.sport === filters.sport;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    const everyListingNeedsRecheck = result.length > 0 &&
      result.every(event => !actionable(event)) &&
      result.some(event => event.external &&
        (event.availability || listingStatus(event)).code === 'stale');
    const freshness = main.querySelector('#explore-freshness');
    freshness.hidden = !everyListingNeedsRecheck;
    freshness.textContent = everyListingNeedsRecheck
      ? 'Upcoming events are listed, but current entry details need checking. Confirm dates, fees and registration with the organizer before making plans.'
      : '';
    main.querySelector('#directory-count').textContent =
      result.length + ' ' + (result.length === 1 ? 'opportunity' : 'opportunities') +
      ' · ' + (filters.availability === 'All upcoming' ? 'Entry status first' : 'Soonest first');
    main.querySelector('#clear-filters').hidden = !Object.entries(filters).some(([name, value]) =>
      name === 'solo' || (value && value !== defaults[name]));
    main.querySelector('#directory-results').innerHTML = result.length
      ? result.map(event => event.external ? listingCard(event) : gameCard(event)).join('')
      : '<div class="empty explore-empty"><span aria-hidden="true">✳</span><h3>No games match those filters.</h3>' +
        '<p>' + (widened.length
          ? widened.length + ' opportunities match when the area, dates and search are widened.'
          : upcoming.length
            ? 'There are upcoming events, but their entry status needs checking with the organizer.'
            : 'Try another sport or reset your filters to browse the lineup.') + '</p>' +
        (widened.length ? '<button class="button outline" type="button" id="widen-search">Widen search</button>'
          : upcoming.length ? '<button class="button outline" type="button" id="show-upcoming">See all upcoming</button>' : '') +
        '</div>';

    const active = Object.entries(filters).filter(([name, value]) =>
      (name === 'solo' || (value && value !== defaults[name])) &&
      !['query', 'sport', 'when', 'area'].includes(name));
    main.querySelector('#active-filters').innerHTML = active.map(([name, value]) =>
      '<button type="button" class="filter-chip" data-remove-filter="' + esc(name) + '">' +
      esc(name === 'solo' ? 'Solo-friendly' : name === 'availability' ? 'Status' : name) +
      ': ' + esc(value === '1' ? 'Yes' : value) + ' <span aria-hidden="true">×</span></button>'
    ).join('');

    main.querySelector('#widen-search')?.addEventListener('click', () => {
      for (const name of ['query', 'area', 'when', 'from', 'to'])
        form.elements.namedItem(name).value = defaults[name];
      update('push');
    });
    main.querySelector('#show-upcoming')?.addEventListener('click', () => {
      for (const name of ['query', 'area', 'when', 'from', 'to'])
        form.elements.namedItem(name).value = defaults[name];
      form.elements.namedItem('availability').value = 'All upcoming';
      update('push');
    });
    if (mode !== 'none') writeUrl(filters, mode);
    return result.length;
  };

  toggle.onclick = () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.classList.toggle('is-open', open);
  };
  main.querySelector('.explore-sports').onclick = event => {
    const button = event.target.closest('button[data-sport]');
    if (!button) return;
    form.elements.namedItem('sport').value = button.dataset.sport;
    update('push');
  };
  form.addEventListener('input', event => {
    if (event.target.name !== 'query') return;
    update(editingQuery ? 'replace' : 'push');
    editingQuery = true;
  });
  form.querySelector('[name="query"]').addEventListener('blur', () => { editingQuery = false; });
  form.addEventListener('change', event => {
    if (event.target.name !== 'query') update('push');
  });
  form.onsubmit = event => {
    event.preventDefault();
    if (update('replace') === 0) trackMetric('zero_results');
    panel.hidden = true;
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    const count = main.querySelector('#directory-count');
    count.tabIndex = -1;
    count.focus({ preventScroll: true });
    count.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start'
    });
  };
  main.querySelector('#clear-filters').onclick = () => {
    form.reset(); solo = false; update('push');
  };
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
