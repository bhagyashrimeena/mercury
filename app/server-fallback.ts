import { getDatabase } from '../db/vercel';
import { currentListings, indiaDay, listingDate, listingStatus } from '../public/catalogue.js';
import { listingCard, listingHero } from '../public/discovery.js';

type Listing = ReturnType<typeof currentListings>[number];
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const entryPossible = (code: string) => !['closed', 'started', 'ended', 'withdrawn', 'stale'].includes(code);

async function visibleListings() {
  const db = getDatabase();
  if (!db) return [];
  try {
    const { results } = await db.prepare('SELECT listing_id FROM listing_overrides WHERE hidden=1').all<{ listing_id: string }>();
    const hidden = new Set(results.map(row => row.listing_id));
    return currentListings().filter(listing => !hidden.has(listing.id));
  } catch {
    return [];
  }
}

function discoveryCard(listing: Listing) {
  const status = listingStatus(listing);
  return `<article class="manage-card"><p class="eyebrow blue">${esc(listing.sport)} · ${esc(listing.type)}</p><h3><a href="/listing/${esc(listing.id)}">${esc(listing.title)}</a></h3><p><time datetime="${esc(listing.date)}">${esc(listingDate(listing))}</time> · ${esc(listing.area)}, Mumbai</p><p>${esc(listing.eligibility)}</p><p><b>${esc(listing.priceLabel)}</b> · ${esc(listing.priceNote)}</p><p class="listing-status ${esc(status.code)}">${esc(status.label)}</p><a class="text-link" href="/listing/${esc(listing.id)}">View entry details ↗</a></article>`;
}

function compactDiscoveryCard(listing: Listing) { return listingCard(listing); }

export async function discoveryFallback(view: 'home' | 'explore') {
  const visible = await visibleListings();
  const current = visible.filter(listing => entryPossible(listingStatus(listing).code));
  // Match the interactive Explore default without hiding older source checks.
  // Home remains entry-ready focused; Explore shows all upcoming events.
  const today = indiaDay();
  const calendar = visible.filter(listing =>
    listing.date >= today && !['started', 'ended', 'withdrawn'].includes(listingStatus(listing).code)
  );
  const display = view === 'home' ? current.slice(0, 3) : calendar.sort((a, b) =>
    a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
  );
  const needsRecheck = view === 'explore' && display.length > 0 &&
    display.every(listing => !entryPossible(listingStatus(listing).code)) &&
    display.some(listing => listingStatus(listing).code === 'stale');
  if (view === 'explore') {
    return '<section class="page-width explore-page">' +
      '<header class="explore-intro"><p class="eyebrow blue">MUMBAI, IN PLAY ↗</p>' +
      '<h1>Find your next <em>game.</em></h1>' +
      '<p>Tournaments, leagues and sessions. Less looking, more playing.</p></header>' +
      '<div class="results-heading"><div><h2>Explore events</h2>' +
      '<p>' + display.length + ' events · Soonest first</p></div></div>' +
      (needsRecheck
        ? '<p class="explore-freshness">Upcoming events are listed, but current entry details need checking. Confirm dates, fees and registration with the organizer before making plans.</p>'
        : '') +
      '<div class="event-grid">' +
      (display.length
        ? display.map(compactDiscoveryCard).join('')
        : '<div class="empty explore-empty"><h3>Upcoming event details are being checked.</h3>' +
          '<p>Explore all upcoming events or return when organizers have confirmed details.</p>' +
          '<a class="button outline" href="/explore?availability=All%20upcoming">See all upcoming ↗</a></div>') +
      '</div><p class="fine explore-fine">Organizer listings are source-backed, not live inventory. Confirm final fees and eligibility before entering.</p>' +
      '<noscript><p class="fine">Listing details remain available without JavaScript. Interactive search and filters require JavaScript.</p></noscript></section>';
  }
  return `<section class="page-width"><div class="page-intro"><p class="eyebrow blue">MUMBAI, IN PLAY</p><h1>${view === 'home' ? 'Find your next game in Mumbai.' : 'Explore upcoming games in Mumbai.'}</h1><p>Compare dates, area, eligibility, fee units and entry status. External events are registered with their organizers; selected free sessions can be booked on Mercury.</p></div><div class="manage-grid">${display.length ? display.map(discoveryCard).join('') : '<p>Upcoming games could not be loaded. Please try again shortly.</p>'}</div><a class="button primary" href="/explore">Explore games ↗</a><noscript><p>You can open listing details and organizer links without JavaScript.</p></noscript></section>`;
}

export function listingFallback(listing: Listing, visibility: 'visible' | 'hidden' | 'unavailable') {
  const rich = listing as Listing & {
    categories?: { name: string; fee: string; notes: string }[];
    highlights?: string[];
  };
  const categories = Array.isArray(rich.categories) && rich.categories.length
    ? '<section class="listing-categories"><h2>Choose your category</h2><div class="listing-category-grid">' +
      rich.categories.map(category => '<article class="listing-category"><b>' + esc(category.name) +
        '</b><strong>' + esc(category.fee) + '</strong><small>' + esc(category.notes) + '</small></article>').join('') +
      '</div></section>' : '';
  const highlights = Array.isArray(rich.highlights) && rich.highlights.length
    ? '<section class="listing-highlights"><h2>Why take part?</h2><ul>' +
      rich.highlights.map(item => '<li>' + esc(item) + '</li>').join('') + '</ul></section>' : '';
  const status = visibility === 'hidden' ? { code: 'withdrawn', label: 'Listing withdrawn' }
    : visibility === 'unavailable' ? { code: 'unavailable', label: 'Details temporarily unavailable' }
    : listingStatus(listing);
  const action = visibility === 'unavailable'
    ? '<a class="button outline" href="">Try loading this listing again ↗</a>'
    : entryPossible(status.code)
    ? `<a class="button primary" href="${esc(listing.registrationUrl)}" target="_blank" rel="noopener noreferrer">Continue to ${esc(listing.sourceName)} to register ↗</a>`
    : visibility === 'hidden' ? ''
    : `<a class="button outline" href="${esc(listing.sourceUrl)}" target="_blank" rel="noopener noreferrer">Review organizer source ↗</a>`;
  const stage = listingHero(listing);
  const reviewMessage = 'reason' in status && status.reason
    ? `<p class="inline-notice">${esc(status.reason)}</p>` : '';
  return '<div class="page-width listing-experience listing-static">' +
    '<a class="back" href="/explore">← All listings</a>' + stage +
    '<div class="detail-layout"><article>' +
    '<div class="tags"><span class="blue-tag">External listing</span><span>' + esc(listing.type) + '</span></div>' +
    '<p class="host-by">Listed organizer: ' + esc(listing.host) + '</p>' +
    '<p class="listing-status ' + esc(status.code) + '" role="status">' + esc(status.label) + '</p>' +
    reviewMessage +
    '<div class="event-facts">' +
    '<div><span aria-hidden="true">◷</span><p><b>' + esc(listingDate(listing)) + '</b><small>Times in IST where published</small></p></div>' +
    '<div><span aria-hidden="true">⌖</span><p><b>' + esc(listing.area) + ', Mumbai</b><small>' + esc(listing.venue) + '</small></p></div>' +
    '<div><span aria-hidden="true">◎</span><p><b>Who can enter</b><small>' + esc(listing.eligibility) + '</small></p></div>' +
    '<div><span aria-hidden="true">↗</span><p><b>Entry deadline</b><small>' + esc(listing.deadlineLabel) + '</small></p></div>' +
    '</div>' + categories + highlights +
    '<h2>About this event</h2><p class="body-copy">' + esc(listing.description) + '</p>' +
    '<p class="fine">Source checked <time datetime="' + esc(listing.checkedOn) + '">' +
    esc(listing.checkedOn) + '</time>. Details may have changed. Mercury has not onboarded this organizer; only the organizer confirms entry.</p>' +
    '<p><a href="/support?category=Listing%20correction&amp;listing=' + esc(listing.id) + '">Suggest a correction</a></p>' +
    '<p>Organizing this event? <a href="/list-event?claim=' + esc(listing.id) +
    '">Request to claim or update it</a>. Ownership is checked manually.</p>' +
    '</article><aside class="booking-panel" id="registration-panel">' +
    '<p class="eyebrow blue">YOUR NEXT MOVE</p><p class="price listing-price">' + esc(listing.priceLabel) + '</p>' +
    '<p class="muted">' + esc(listing.priceNote) + '</p>' +
    '<p class="listing-status ' + esc(status.code) + '">' + esc(status.label) + '</p>' +
    action + '<p class="fine">Registration and payment are handled by the organizer. Availability is not live.</p>' +
    '</aside></div></div>';
}
