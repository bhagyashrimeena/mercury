import type { Metadata } from 'next';
import { siteOrigin } from '../../../lib/site-config';
import CompetitionView from './CompetitionView';

export const dynamic = 'force-dynamic';

type Tournament = { id: string; name: string; sport: string; city?: string | null; locality?: string | null; status: string; isPublic: boolean };
type Slot = { displayName: string | null; registrationId: string | null; isBye?: boolean };
type Match = { id: string; status: string; slotA: Slot | null; slotB: Slot | null; scoreA?: number | null; scoreB?: number | null; winnerRegistrationId?: string | null };
type Round = { roundNumber: number; label: string; matches: Match[] };
type BracketResponse = { status: string; bracket: { rounds: Round[] } | null };
type Standing = { entityName: string; position: number; played: number; won: number; drawn: number; lost: number; points: number; sportStats: Record<string, unknown> };
type Group = { groupId: string; rows: Standing[] };
type Props = { params: Promise<{ id: string }> };

const validId = (id: string) => /^[A-Za-z0-9_-]{6,80}$/.test(id);

async function readPublic<T>(id: string, suffix: string): Promise<T | null> {
  const base = process.env.NEXTPLAY_API_BASE_URL;
  if (!base || (!/^https:\/\//.test(base) && !/^http:\/\/localhost(?::\d+)?\/?$/.test(base))) return null;
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/v1/tournaments/${encodeURIComponent(id)}${suffix}`, {
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    return response.ok ? await response.json() as T : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tournament = validId(id) ? await readPublic<Tournament>(id, '') : null;
  const title = tournament?.isPublic ? `${tournament.name} · Mercury` : 'Competition · Mercury';
  const description = tournament?.isPublic ? `Fixtures, group standings and the path to the final for ${tournament.name}.` : 'Tournament fixtures and results on Mercury.';
  return {
    title, description,
    robots: { index: false, follow: false },
    alternates: { canonical: `${siteOrigin()}/competition/${encodeURIComponent(id)}` },
    openGraph: { title, description, type: 'website', images: [`/competition/${encodeURIComponent(id)}/opengraph-image`] },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  if (!validId(id)) return <CompetitionView tournament={null} bracket={null} groups={[]} />;
  const [tournament, bracket, groups] = await Promise.all([
    readPublic<Tournament>(id, ''),
    readPublic<BracketResponse>(id, '/bracket'),
    readPublic<Group[]>(id, '/standings'),
  ]);
  return <CompetitionView tournament={tournament?.isPublic ? tournament : null}
    bracket={bracket?.status === 'published' ? bracket.bracket : null}
    groups={Array.isArray(groups) ? groups : []} />;
}
