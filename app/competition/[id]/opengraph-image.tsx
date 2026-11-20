import { ImageResponse } from 'next/og';

export const alt = 'Mercury competition fixtures and standings';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function Image({ params }: Props) {
  const { id } = await params;
  let tournament: { name?: string; sport?: string; isPublic?: boolean } | null = null;
  const base = process.env.NEXTPLAY_API_BASE_URL;
  if (/^[A-Za-z0-9_-]{6,80}$/.test(id) && base && (/^https:\/\//.test(base) || /^http:\/\/localhost(?::\d+)?\/?$/.test(base))) {
    try {
      const response = await fetch(`${base.replace(/\/$/, '')}/v1/tournaments/${encodeURIComponent(id)}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (response.ok) tournament = await response.json();
    } catch { /* An unavailable API must not invent a tournament identity. */ }
  }
  const name = tournament?.isPublic && tournament.name ? tournament.name : 'Mercury competition';
  const sport = tournament?.isPublic && tournament.sport ? tournament.sport : 'SPORTS';

  return new ImageResponse(<div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#F7F8F2', color: '#10131A', padding: '62px 72px', fontFamily: 'sans-serif' }}>
    <div style={{ display: 'flex', alignItems: 'center', color: '#3156F5', fontSize: 27, fontWeight: 800, letterSpacing: 2 }}>MERCURY</div>
    <div style={{ display: 'flex', marginTop: 70, fontSize: 21, letterSpacing: 4, color: '#3156F5', fontWeight: 700 }}>{sport.toUpperCase()} · COMPETITION</div>
    <div style={{ display: 'flex', marginTop: 22, fontSize: name.length > 38 ? 60 : 78, lineHeight: 1.07, fontWeight: 800, letterSpacing: -3, maxWidth: 1050 }}>{name}</div>
    <div style={{ display: 'flex', marginTop: 'auto', paddingTop: 25, borderTop: '2px solid #D8DCE2', justifyContent: 'space-between', fontSize: 23 }}><span>Fixtures · Standings · Path to the final</span><span style={{ color: '#3156F5', fontWeight: 700 }}>playonmercury.com ↗</span></div>
  </div>, size);
}
