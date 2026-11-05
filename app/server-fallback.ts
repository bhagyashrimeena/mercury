import { getDatabase } from '../db/vercel';
import { currentListings, listingDate, listingStatus } from '../public/catalogue.js';

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

export async function discoveryFallback(view: 'home' | 'explore') {
  const visible = await visibleListings();
  const current = visible.filter(listing => entryPossible(listingStatus(listing).code));
  const display = view === 'home' ? current.slice(0, 3) : current;
  return `<section class="page-width"><div class="page-intro"><p class="eyebrow blue">MUMBAI, IN PLAY</p><h1>${view === 'home' ? 'Find your next game in Mumbai.' : 'Explore upcoming games in Mumbai.'}</h1><p>Compare dates, area, eligibility, fee units and entry status. External events are registered with their organizers; selected free sessions can be booked on Mercury.</p></div><div class="manage-grid">${display.length ? display.map(discoveryCard).join('') : '<p>Upcoming games could not be loaded. Please try again shortly.</p>'}</div><a class="button primary" href="/explore">Explore games ↗</a><noscript><p>You can open listing details and organizer links without JavaScript.</p></noscript></section>`;
}

export function listingFallback(listing: Listing, visibility: 'visible' | 'hidden' | 'unavailable') {
  const status = visibility === 'hidden' ? { code: 'withdrawn', label: 'Listing withdrawn' }
    : visibility === 'unavailable' ? { code: 'unavailable', label: 'Details temporarily unavailable' }
    : listingStatus(listing);
  const action = visibility === 'unavailable'
    ? '<a class="button outline" href="">Try loading this listing again ↗</a>'
    : entryPossible(status.code)
    ? `<a class="button primary" href="${esc(listing.registrationUrl)}" target="_blank" rel="noopener noreferrer">Continue to ${esc(listing.sourceName)} to register ↗</a>`
    : visibility === 'hidden' ? ''
    : `<a class="button outline" href="${esc(listing.sourceUrl)}" target="_blank" rel="noopener noreferrer">Review organizer source ↗</a>`;
  return `<article class="page-width prose"><p class="eyebrow blue">${esc(listing.sport)} · ${esc(listing.type)} · External listing</p><h1>${esc(listing.title)}</h1><p class="listing-status ${esc(status.code)}">${esc(status.label)}</p><p><b>Date:</b> <time datetime="${esc(listing.date)}">${esc(listingDate(listing))}</time> · Times in IST where published</p><p><b>Venue:</b> ${esc(listing.venue)}, ${esc(listing.area)}</p><p><b>Who can enter:</b> ${esc(listing.eligibility)}</p><p><b>Fee:</b> ${esc(listing.priceLabel)} · ${esc(listing.priceNote)}</p><p><b>Entry deadline:</b> ${esc(listing.deadlineLabel)}</p><p>${esc(listing.description)}</p><p>Source checked <time datetime="${esc(listing.checkedOn)}">${esc(listing.checkedOn)}</time>. Details may have changed. Mercury has not onboarded this organizer; only the organizer confirms entry.</p>${action}<p><a href="/support?category=Listing%20correction&amp;listing=${esc(listing.id)}">Suggest a correction</a></p></article>`;
}
