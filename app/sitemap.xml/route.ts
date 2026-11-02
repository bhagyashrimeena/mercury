import { env } from 'cloudflare:workers';
import { publicLaunch, siteOrigin } from '../../lib/site-config';
import { currentListings } from '../../public/catalogue.js';
export async function GET() {
  const paths=['/','/explore','/about','/how-it-works','/support','/privacy','/terms'];
  if(publicLaunch() && env.DB) {
    const rows=await env.DB.prepare('SELECT listing_id FROM listing_overrides WHERE hidden=1').all<{listing_id:string}>();
    const hidden=new Set(rows.results.map(r=>r.listing_id));
    paths.push(...currentListings().filter(e=>!hidden.has(e.id)).map(e=>'/listing/'+e.id));
  }
  const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+(publicLaunch()?paths.map(path=>`<url><loc>${siteOrigin()}${path}</loc></url>`).join(''):'')+'</urlset>';
  return new Response(xml,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300'}});
}
