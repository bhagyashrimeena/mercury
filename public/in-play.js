import { sportPhoto } from './sport-media.js';

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const paths = {
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  ticket:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M13 5v14M3 9h3M3 15h3"/>',
  heart:'<path d="M20.8 5.8a5.4 5.4 0 0 0-7.7 0L12 6.9l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.6L12 22l8.8-8.6a5.4 5.4 0 0 0 0-7.6Z"/>',
  arrow:'<path d="M6 18 18 6M8 6h10v10"/>'
};
export const playIcon = name => `<svg class="ip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;

// Branded covers from the approved prototype; reviewed organizer images still win.
export function sportCover(event) {
  const media = sportPhoto(event);
  if (media.source === 'organizer') return `<div class="ip-cover-photo"><img src="${escapeHtml(media.src)}" alt="${escapeHtml(media.alt)}" loading="lazy" width="800" height="450"><span>Organizer image</span></div>`;
  const sport = String(event.sport || '');
  const localSports = new Set(['Badminton','Tennis','Pickleball','Running','Chess']);
  if (localSports.has(sport)) return `<div class="ip-cover-photo"><img src="/assets/in-play/${sport.toLowerCase()}.jpg" alt="Illustrative ${escapeHtml(sport.toLowerCase())} photograph" loading="lazy" width="357" height="266"><span>Illustrative photo</span></div>`;
  return `<div class="ip-art ip-art-ink" aria-hidden="true"><span class="ip-display">${escapeHtml(sport || 'Sports event')}</span></div>`;
}

export function cardSaveButton(event, external = false, saved = false) {
  return `<button type="button" class="ip-heart" data-card-save="${escapeHtml(event.id)}" data-card-kind="${external ? 'listing' : 'event'}" aria-pressed="${saved}" aria-label="${saved ? 'Remove saved event' : 'Save event'}: ${escapeHtml(event.title)}">${playIcon('heart')}</button>`;
}

export function brandHero({ kicker, heading, description, note = '', image = 'hero', extraClass = '', action = '' }) {
  return `<section class="ip-hero ${extraClass}"><div class="ip-hero-copy"><p class="ip-eyebrow">${kicker}</p><h1 class="ip-display">${heading}</h1><p>${description}</p>${note ? `<small>${note}</small>` : ''}${action}</div><figure class="ip-hero-photo"><img src="/assets/in-play/${image}.jpg" alt="Runners participating together in a sporting event" width="356" height="266" fetchpriority="high"><figcaption>Illustrative sports photo</figcaption></figure></section>`;
}

export function playSteps() {
  return `<div class="ip-steps"><article>${playIcon('search')}<h3>01. Discover</h3><p>Find a sport, event or neighbourhood that fits your plans.</p></article><article>${playIcon('calendar')}<h3>02. Choose</h3><p>Check the date, location, price and eligibility.</p></article><article>${playIcon('ticket')}<h3>03. Play</h3><p>Register with the organizer, or book an available free Mercury session.</p></article></div>`;
}

export function exploreBanner() {
  return `<header class="ip-banner explore-intro" aria-labelledby="explore-title"><p class="ip-eyebrow">Sports in Mumbai</p><h1 class="ip-display" id="explore-title">Find your next <span>game.</span></h1><p>Tournaments, races, leagues and good reasons to get out and play.</p></header>`;
}

export function aboutMarkup() {
  return `<div class="page-width ip-about">${brandHero({kicker:'For the love of the game',heading:'LIFE IS BETTER<br><span>IN PLAY.</span>',description:'More playing. Less planning.',image:'running'})}<article class="ip-doc"><h2>Meet Mercury.</h2><p>Mercury is built by NextPlay Sports Private Limited to make sports opportunities easier to find. Starting in Mumbai, the platform brings together tournaments, social games and community sporting opportunities.</p><p>Our mission is to make it easier for people to get out and play, whatever their sport or skill level.</p><p>We show organizer sources and check dates so you can confirm the details before registering. An external listing is not a partnership or a reserved place.</p><a class="button primary" href="/explore">Find your next game ↗</a></article></div>`;
}
