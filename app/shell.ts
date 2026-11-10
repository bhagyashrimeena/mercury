export const shell = `
  <a class="skip" href="#main">Skip to content</a>
  <header class="header">
    <a href="/" class="brand" aria-label="Mercury home"><img src="/assets/mercury-wordmark.png" alt="" width="154" height="55"></a>
    <nav aria-label="Main navigation">
      <a href="/explore" data-nav="explore">Explore</a>
      <a href="/how-it-works" data-nav="how-it-works">How it works</a>
      <a href="/for-organizers" data-nav="for-organizers">For organizers</a>
    </nav>
    <div class="header-actions">
      <button class="location" id="location-button" aria-label="Choose location"><span>⌖</span> Mumbai <span>⌄</span></button>
      <a class="button small dark" href="/my-games">My games <span>↗</span></a>
    </div>
  </header>
  <nav class="mobile-nav" aria-label="Mobile navigation">
    <a href="/" data-nav="home"><span aria-hidden="true">⌂</span>Home</a>
    <a href="/explore" data-nav="explore"><span aria-hidden="true">⌕</span>Explore</a>
    <a href="/my-games" data-nav="my-games"><span aria-hidden="true">♡</span>My games</a>
    <a href="/for-organizers" data-nav="for-organizers"><span aria-hidden="true">⊕</span>Organizers</a>
  </nav>
  <dialog id="action-sheet" aria-labelledby="sheet-title"></dialog>
  <main id="main" tabindex="-1">__SERVER_CONTENT__</main>
  <footer>
    <a href="/" class="brand" aria-label="Mercury home"><img src="/assets/mercury-wordmark.png" alt="" width="136" height="49" loading="lazy"></a>
    <p>More playing. Less planning.</p>
    <div>
      <a href="/about">About Mercury</a>
      <a href="/support">Support</a>
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
      <span>© 2026 NextPlay Sports Private Limited</span>
    </div>
  </footer>
  <div id="toast" role="status" aria-live="polite"></div>
  <dialog id="location-dialog" aria-labelledby="location-title">
    <button class="close" aria-label="Close location picker">×</button>
    <p class="eyebrow">YOUR HOME COURT</p>
    <h2 id="location-title">Where do you play?</h2>
    <p>We're starting in Mumbai. Explore games in our first neighbourhoods.</p>
    <button class="button primary" id="choose-mumbai">Mumbai &amp; beyond <span>✓</span></button>
    <p class="fine">More cities will follow as real hosts join Mercury.</p>
  </dialog>
`;
