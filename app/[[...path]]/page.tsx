import Script from 'next/script';
import type { Metadata } from 'next';
import { env } from 'cloudflare:workers';
import { shell } from '../shell';
export const dynamic = 'force-dynamic';
const esc = (s: unknown) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
type Props = {
    params: Promise<{
        path?: string[];
    }>;
};
async function eventFor(path: string[]) { if (path[0] !== 'event' || !path[1] || !env.DB)
    return null; try {
    return await env.DB.prepare("SELECT id,title,description,sport,area,venue,date,time,price,status FROM events WHERE id=? AND status IN ('published','cancelled')").bind(path[1]).first<{
        id: string;
        title: string;
        description: string;
        sport: string;
        area: string;
        venue: string;
        date: string;
        time: string;
        price: number;
        status: string;
    }>();
}
catch {
    return null;
} }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { path = [] } = await params; const e = await eventFor(path); if (!e)
    return { title: path[0] === 'host' ? 'Organizer studio — Mercury' : 'Mercury — Your next game starts here' }; return { title: `${e.title} — Mercury`, description: e.description.slice(0, 160), openGraph: { title: e.title, description: `${e.date} · ${e.area}, Mumbai · ${e.price === 0 ? 'Free' : `₹${e.price}`}`, type: 'website' } }; }
export default async function Page({ params }: Props) { const { path = [] } = await params; const e = await eventFor(path); const fallback = e ? `<article class="page-width prose"><p class="eyebrow blue">${esc(e.sport)} · ${esc(e.status)}</p><h1>${esc(e.title)}</h1><p>${esc(e.description)}</p><p>${esc(e.date)} · ${esc(e.time)} IST</p><p>${esc(e.venue)}, ${esc(e.area)}</p></article>` : '<section class="page-width page-intro"><p class="eyebrow blue">MERCURY</p><h1>Your next game<br>starts here.</h1><p role="status">Loading your games…</p><noscript>JavaScript is needed to register and manage your events.</noscript></section>'; return <><div dangerouslySetInnerHTML={{ __html: shell.replace('__SERVER_CONTENT__', fallback) }}/><Script src="/app.js" type="module" strategy="afterInteractive"/></>; }
