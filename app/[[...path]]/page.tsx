import { siteOrigin, publicLaunch } from '../../lib/site-config';
import { findListing, listingDate, listingStatus } from '../../public/catalogue.js';
import { discoveryFallback, listingFallback } from '../server-fallback';
import { getDatabase } from '../../db/vercel';
import { shell } from '../shell';
import Script from 'next/script';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ path?: string[] }> };
type EventSummary = {
  id: string; title: string; description: string; sport: string; area: string;
  venue: string; date: string; time: string; price: number; status: string;
  starts_at: string | number;
};
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const publicPageTitles: Record<string, string> = {
  explore: 'Explore games', about: 'About Mercury', 'how-it-works': 'How Mercury works',
  support: 'Help & contact', terms: 'Terms', privacy: 'Privacy',
  host: 'Organizer studio', account: 'Your account', admin: 'Owner desk'
};

async function listingVisibility(id: string): Promise<'visible' | 'hidden' | 'unavailable'> {
  const db = getDatabase();
  if (!db) return 'unavailable';
  try {
    const row = await db.prepare('SELECT hidden FROM listing_overrides WHERE listing_id=?').bind(id).first<{ hidden: number }>();
    return row?.hidden ? 'hidden' : 'visible';
  } catch {
    return 'unavailable';
  }
}

async function eventFor(path: string[]) {
  const db = getDatabase();
  if (path[0] !== 'event' || !path[1] || !db) return null;
  try {
    return await db.prepare("SELECT id,title,description,sport,area,venue,date,time,price,status,starts_at FROM events WHERE id=? AND status IN ('published','cancelled')")
      .bind(path[1]).first<EventSummary>();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path = [] } = await params;
  const listing = path[0] === 'listing' ? findListing(path[1]) : null;
  if (listing) {
    const visibility = await listingVisibility(listing.id);
    const status = visibility === 'hidden' ? 'Listing withdrawn' : visibility === 'unavailable' ? 'Details temporarily unavailable' : listingStatus(listing).label;
    const title = `${listing.title} — Mercury`;
    const description = `${listingDate(listing)} · ${listing.area}, Mumbai · ${listing.priceLabel}. ${status}. Register with ${listing.sourceName}; Mercury does not confirm external entries.`;
    const index = publicLaunch() && visibility === 'visible' && listingStatus(listing).code !== 'ended';
    return {
      title, description, alternates: { canonical: siteOrigin() + '/listing/' + listing.id },
      robots: { index, follow: index },
      openGraph: { title, description, type: 'website', images: ['/opengraph-image'] }
    };
  }
  const event = await eventFor(path);
  if (event) {
    const title = `${event.title} — Mercury`;
    const description = `${event.date} · ${event.area}, Mumbai · Free Mercury booking. ${event.description.slice(0, 110)}`;
    const index = publicLaunch() && event.status === 'published' && Number(event.starts_at) > Date.now();
    return {
      title, description, alternates: { canonical: siteOrigin() + '/event/' + event.id },
      robots: { index, follow: index },
      openGraph: { title, description, type: 'website', images: ['/opengraph-image'] }
    };
  }
  const segment = path[0] || '';
  const title = (publicPageTitles[segment] || 'Your next game starts here') + ' — Mercury';
  const description = segment === 'explore'
    ? 'Explore upcoming tournaments, leagues and free sessions in Mumbai. Compare dates, area, eligibility and registration routes.'
    : 'Find sports tournaments, leagues and free sessions around Mumbai. Check the details and choose where to register.';
  const index = publicLaunch() && ['', 'explore', 'about', 'how-it-works'].includes(segment);
  return {
    title, description, robots: { index, follow: index },
    alternates: { canonical: siteOrigin() + '/' + path.join('/') },
    openGraph: { title, description, type: 'website', images: ['/opengraph-image'] }
  };
}

export default async function Page({ params }: Props) {
  const { path = [] } = await params;
  const event = await eventFor(path);
  const listing = path[0] === 'listing' ? findListing(path[1]) : null;
  const fallback = listing
    ? listingFallback(listing, await listingVisibility(listing.id))
    : event
      ? `<article class="page-width prose"><p class="eyebrow blue">${esc(event.sport)} · ${esc(event.status)} · Mercury booking</p><h1>${esc(event.title)}</h1><p>${esc(event.description)}</p><p><b>Date:</b> ${esc(event.date)} · ${esc(event.time)} IST</p><p><b>Venue:</b> ${esc(event.venue)}, ${esc(event.area)}, Mumbai</p><p><b>Fee:</b> Free per player. A confirmed place appears in My games.</p></article>`
      : path.length === 0 || path[0] === 'explore'
        ? await discoveryFallback(path[0] === 'explore' ? 'explore' : 'home')
        : '<section class="page-width page-intro"><p class="eyebrow blue">MERCURY</p><h1>Your next game starts here.</h1><p role="status">Loading your page…</p><noscript>JavaScript is needed to manage your account and bookings.</noscript></section>';
  const routePath = '/' + path.join('/');
  const markedFallback = `<div data-server-path="${esc(routePath)}">${fallback}</div>`;
  return <><div dangerouslySetInnerHTML={{ __html: shell.replace('__SERVER_CONTENT__', markedFallback) }}/><Script src="/app.js" type="module" strategy="afterInteractive"/></>;
}
