import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Mercury Community Guidelines',
  description: 'Community guidelines for Mercury tournament groups and direct messages.',
  alternates: { canonical: '/community-rules' },
};

export default function CommunityRulesPage() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="header">
        <Link className="brand" href="/" aria-label="Mercury home">
          {/* eslint-disable-next-line @next/next/no-img-element -- the existing site wordmark is served as a static asset */}
          <img src="/assets/mercury-wordmark.png" alt="" width="154" height="55" />
        </Link>
      </header>
      <main id="main" tabIndex={-1}>
        <article className="page-width prose" aria-labelledby="community-guidelines-title">
          <p className="eyebrow blue">MERCURY</p>
          <h1 id="community-guidelines-title">Mercury Community Guidelines</h1>
          <p className="fine">Version <time dateTime="2026-11-23">2026-11-23-v1</time></p>
          <p>Keep conversations about sport respectful and relevant. Don’t share threats, harassment, bullying, hate speech, sexually explicit or exploitative content, scams, spam, or someone else’s private information without permission. Don’t impersonate others or post material you don’t have the right to share.</p>
          <p>Use the in-app report option to flag a message and block users you don’t want to hear from. Mercury may remove posts or restrict accounts that violate these rules. These guidelines apply to tournament groups and direct messages.</p>
        </article>
      </main>
    </>
  );
}
