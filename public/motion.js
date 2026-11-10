/*
 * Mercury / In Motion
 * Progressive visual enhancement only. No content, route or form state is
 * controlled by this module. Everything stays visible if JS/motion fails.
 */
const root = document.getElementById('main');
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const selectors = [
  '.hero-copy h1', '.hero-copy > p:not(.eyebrow)',
  '.explore-intro h1', '.page-intro h1',
  '.listing-stage-copy', '.listing-stage-media',
  '.photo-card', '.quickline-item', '.listing-category',
  '.listing-highlights', '.organizer-benefits article',
  '.organizer-funnel-steps article', '.organizer-public-example',
  '.public-how-grid article', '.organizer-submission-preview',
  '.detail-cover', '.event-facts'
].join(', ');
const seen = new WeakSet();

function enter(element) {
  if (seen.has(element)) return;
  seen.add(element);
  if (reduced?.matches || !element.isConnected || !element.animate) return;
  const rect = element.getBoundingClientRect();
  if (rect.height === 0 || rect.width === 0) return;
  // Low-amplitude, compositor-friendly movement; no hidden elements or CLS.
  element.animate(
    [
      { opacity: 0.75, transform: 'translate3d(0, 12px, 0)' },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' }
    ],
    { duration: 480, easing: 'cubic-bezier(.19, .72, .2, 1)' }
  );
}

if (root) {
  const observer = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        enter(entry.target);
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' })
    : null;

  const scan = () => {
    root.querySelectorAll(selectors).forEach(element => {
      if (seen.has(element)) return;
      if (reduced?.matches || !observer) enter(element);
      else observer.observe(element);
    });
  };
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; scan(); });
  };
  // The app replaces route content and updates event grids after API calls.
  // Observe additions only, never attributes changed by animation itself.
  new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
  scan();

  const progress = document.createElement('div');
  progress.className = 'mercury-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);
  let scrollPending = false;
  const updateScroll = () => {
    scrollPending = false;
    const available = document.documentElement.scrollHeight - window.innerHeight;
    const fraction = available > 0 ? Math.min(1, Math.max(0, window.scrollY / available)) : 0;
    progress.style.transform = 'scaleX(' + fraction + ')';
  };
  window.addEventListener('scroll', () => {
    if (scrollPending) return;
    scrollPending = true;
    requestAnimationFrame(updateScroll);
  }, { passive: true });
  window.addEventListener('resize', updateScroll, { passive: true });
  updateScroll();
}
