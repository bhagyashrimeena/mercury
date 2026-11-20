'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './competition.module.css';

type Slot = { displayName: string | null; registrationId: string | null; isBye?: boolean };
type Match = { id: string; status: string; slotA: Slot | null; slotB: Slot | null; scoreA?: number | null; scoreB?: number | null; winnerRegistrationId?: string | null };
type Round = { roundNumber: number; label: string; matches: Match[] };
type Standing = { entityName: string; position: number; played: number; won: number; drawn: number; lost: number; points: number; sportStats: Record<string, unknown> };
type Group = { groupId: string; rows: Standing[] };
type Props = { tournament: { name: string; sport: string; city?: string | null; locality?: string | null; status: string } | null; bracket: { rounds: Round[] } | null; groups: Group[] };

function team(slot: Slot | null) { return slot?.isBye ? 'Bye' : slot?.displayName || 'To be decided'; }
function nrr(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : '—'; }

export default function CompetitionView({ tournament, bracket, groups }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'bracket' | 'standings'>('bracket');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!tournament) return;
    const timer = window.setInterval(() => router.refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [router, tournament]);

  function whatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${tournament?.name} · fixtures and results ${window.location.href}`)}`, '_blank', 'noopener,noreferrer');
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: tournament?.name, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2500); }
    } catch { /* Dismissing the native share sheet leaves the page unchanged. */ }
  }

  if (!tournament) return <main className={styles.page}><div className={styles.wrap}>
    <a href="/explore" className={styles.back}>← Mercury Explore</a>
    <div className={styles.empty}><p className={styles.kicker}>MERCURY COMPETITIONS</p><h1>Competition unavailable</h1><p>This link may be private, unpublished or temporarily unavailable.</p></div>
  </div></main>;

  const rounds = bracket?.rounds ?? [];
  const completed = rounds.flatMap(round => round.matches).filter(match => match.status === 'completed').length;
  const total = rounds.flatMap(round => round.matches).length;
  const final = rounds.at(-1)?.matches[0];
  const champion = final?.winnerRegistrationId
    ? [final.slotA, final.slotB].find(slot => slot?.registrationId === final.winnerRegistrationId)?.displayName : null;

  return <main className={styles.page}><div className={styles.wrap}>
    <header className={styles.top}><a href="/explore" className={styles.back}>← Mercury</a><div className={styles.actions}><button className={styles.share} onClick={whatsapp} type="button">WhatsApp ↗</button><button className={styles.share} onClick={share} type="button">{copied ? 'Link copied' : 'Share ↗'}</button></div></header>
    <div className={styles.hero}><p className={styles.kicker}>{tournament.sport} · {tournament.locality || tournament.city || 'Mercury competition'}</p>
      <h1>{tournament.name}</h1><p className={styles.subtitle}>The competition, as it happens.</p>
      <div className={styles.summary}><span>{tournament.status.replaceAll('_', ' ')}</span><span>{total ? `${completed} of ${total} knockout matches complete` : 'Fixtures to come'}</span></div>
    </div>
    {champion ? <div className={styles.champion}><span>CHAMPION</span><strong>{champion}</strong></div> : null}
    <nav className={styles.tabs} aria-label="Competition views">
      <button type="button" aria-current={tab === 'bracket' ? 'page' : undefined} onClick={() => setTab('bracket')}>Path to the final</button>
      <button type="button" aria-current={tab === 'standings' ? 'page' : undefined} onClick={() => setTab('standings')}>Groups & standings</button>
    </nav>
    {tab === 'bracket' ? <section aria-label="Knockout bracket" className={styles.section}>
      <div className={styles.sectionHeading}><h2>Path to the final</h2><p>Swipe across rounds →</p></div>
      {rounds.length ? <div className={styles.rounds}>{rounds.map(round => <div className={styles.round} key={round.roundNumber}>
        <h3>{round.label}</h3><div className={styles.matches}>{round.matches.map(match => <article className={styles.match} key={match.id}>
          <p className={styles.matchStatus}>{match.status.replaceAll('_', ' ')}</p>
          {([match.slotA, match.slotB] as const).map((slot, index) => <div className={styles.side} key={index} data-winner={slot?.registrationId && slot.registrationId === match.winnerRegistrationId ? 'true' : undefined}>
            <span className={styles.mark} aria-hidden="true">{team(slot).charAt(0)}</span><span className={styles.name}>{team(slot)}</span>
            <strong>{match.status === 'completed' ? (index === 0 ? match.scoreA : match.scoreB) ?? '—' : '—'}</strong>
          </div>)}</article>)}</div></div>)}</div>
        : <div className={styles.emptySmall}>The organizer has not published the knockout bracket yet.</div>}
    </section> : <section aria-label="Group standings" className={styles.section}>
      <div className={styles.sectionHeading}><h2>Groups & standings</h2><p>Updated from confirmed results</p></div>
      {groups.length ? <div className={styles.groups}>{groups.map((group, index) => <article className={styles.group} key={group.groupId}>
        <h3>Group {String.fromCharCode(65 + index)}</h3><div className={styles.tableScroll}><table><thead><tr><th scope="col">#</th><th scope="col">Team</th><th scope="col">P</th><th scope="col">W</th><th scope="col">Pts</th>{tournament.sport.toLowerCase().includes('cricket') ? <th scope="col">NRR</th> : null}</tr></thead>
          <tbody>{group.rows.map(row => <tr key={row.position + row.entityName}><td>{row.position}</td><th scope="row">{row.entityName}</th><td>{row.played}</td><td>{row.won}</td><td><strong>{row.points}</strong></td>{tournament.sport.toLowerCase().includes('cricket') ? <td>{nrr(row.sportStats?.netRunRate)}</td> : null}</tr>)}</tbody></table></div>
      </article>)}</div> : <div className={styles.emptySmall}>Standings will appear when the organizer publishes the groups.</div>}
    </section>}
    <footer className={styles.footer}><span>Mercury by NextPlay Sports</span><a href="/explore">Discover more games ↗</a></footer>
  </div></main>;
}
