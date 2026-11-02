import { publicLaunch, siteOrigin } from '../../lib/site-config';
export function GET() {
  const body=publicLaunch() ? `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nDisallow: /account\nDisallow: /my-games\nDisallow: /host\nDisallow: /roster/\nDisallow: /booking/\nDisallow: /register/\nDisallow: /samples\nDisallow: /demo-\nSitemap: ${siteOrigin()}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n';
  return new Response(body,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=300'}});
}
