import { sportPhoto } from './sport-media.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const arrow = '<span aria-hidden="true">↗</span>';
const sports = ['Badminton', 'Tennis', 'Pickleball', 'Running', 'Chess'];
const options = values => values.map(value => `<option>${esc(value)}</option>`).join('');

// Shared first paint and client navigation: the homepage never swaps from a
// plain directory into a marketing layout when JavaScript arrives.
export function homeMarkup(cards = '') {
  return `<div class="page-width home-journey website-home">
    <section class="web-hero" aria-labelledby="home-title">
      <div class="web-hero-copy"><p class="web-kicker"><span aria-hidden="true">↗</span> MUMBAI, IN PLAY</p>
        <h1 id="home-title">Find your people.<br><em>Play your game.</em></h1>
        <p class="web-hero-description">Discover sports tournaments, social games and events around Mumbai. Your next reason to get out and play.</p>
        <a class="button primary" href="/explore">Find a game ${arrow}</a>
        <span class="web-hero-note">Open to browse. No sign-in needed.</span>
      </div>
      <figure class="web-hero-image"><img src="/assets/badminton.jpg" alt="A badminton player jumping for a smash on an indoor court" width="900" height="600" fetchpriority="high">
        <span class="web-photo-word" aria-hidden="true">GO PLAY.</span><figcaption>For the love of the game · Illustrative sports photo</figcaption>
      </figure>
    </section>
    <form class="web-search" id="hero-search" action="/explore" method="get" aria-label="Find sports events">
      <label><span>YOUR SPORT</span><select name="sport" aria-label="Sport">${options(['All sports', ...sports])}</select></label>
      <label><span>WHERE</span><select name="area" aria-label="Neighbourhood">${options(['All Mumbai', 'Powai', 'Chandivali', 'Andheri', 'Bandra', 'BKC', 'Borivali', 'Malad', 'Ghatkopar', 'Nityanand Nagar', 'Nerul, Navi Mumbai', 'South Mumbai', 'Vile Parle', 'Across Mumbai'])}</select></label>
      <label><span>WHEN</span><select name="when" aria-label="Date">${options(['Any date', 'Today', 'Tomorrow', 'This weekend', 'Next 7 days'])}</select></label>
      <button class="button primary" type="submit">Find games ${arrow}</button>
    </form>
    <section class="web-sports" aria-labelledby="sports-title"><div class="web-section-heading"><h2 id="sports-title">What’s your <em>game?</em></h2><a class="text-link" href="/explore">Explore all ${arrow}</a></div>
      <div class="web-sport-grid">${sports.map(sport => {
        const photo = sportPhoto({ sport, id: 'home-category' });
        const src = sport === 'Badminton' ? '/assets/badminton.jpg' : sport === 'Tennis' ? '/assets/tennis.jpg' : photo.src;
        return `<a class="web-sport-tile" href="/explore?sport=${encodeURIComponent(sport)}"><div class="web-sport-image"><img src="${esc(src)}" alt="" width="280" height="210" loading="lazy"></div><span>${sport} ${arrow}</span></a>`;
      }).join('')}</div>
    </section>
    <section class="discovery-section web-upcoming" aria-labelledby="upcoming-title"><div class="web-section-heading"><div><p class="web-kicker">MAKE A PLAN</p><h2 id="upcoming-title">Next up in <em>Mumbai.</em></h2><p>Find the date, check the details, get in the game.</p></div><a class="text-link" href="/explore">All upcoming events ${arrow}</a></div>
      <div class="event-grid" id="featured-grid" aria-live="polite">${cards || '<div class="web-lineup-empty"><h3>Your next game is out there.</h3><p>See the full calendar for upcoming events and current entry details.</p><a class="text-link" href="/explore">Explore the calendar ↗</a></div>'}</div>
    </section>
    <section class="web-how" aria-labelledby="how-title"><div class="web-section-heading"><h2 id="how-title">From “we should”<br>to <em>“see you there.”</em></h2><a class="text-link" href="/how-it-works">How Mercury works ${arrow}</a></div>
      <ol class="web-steps"><li><span>01</span><h3>Find your game</h3><p>Pick a sport, neighbourhood and date. Browse without creating an account.</p></li><li><span>02</span><h3>Know before you go</h3><p>Check the venue, fee, eligibility and entry deadline on the event page.</p></li><li><span>03</span><h3>Make it a plan</h3><p>Follow the organizer’s registration link, or book a free place where Mercury booking is available.</p></li></ol>
    </section>
    <section class="web-trust" aria-labelledby="trust-title"><div><p class="web-kicker">CLEAR DETAILS. BETTER PLANS.</p><h2 id="trust-title">Know who you’re<br>playing with.</h2><p>Mercury is built by NextPlay Sports Private Limited. We bring the details together so you can choose your next game.</p><a class="text-link" href="/about">Meet Mercury ${arrow}</a></div><div class="web-trust-points"><article><h3>Sources you can check</h3><p>External listings link to organizer sources, with source-check dates on event pages.</p></article><article><h3>A clear route to register</h3><p>See when you’re leaving Mercury. External entries and payments are handled by the organizer; availability can change.</p></article><article><h3>A way to put things right</h3><p>Spot an outdated detail? <a href="/support">Tell us</a> so we can review it.</p></article></div></section>
    <section class="web-organizers" aria-labelledby="organizers-title"><div><p class="web-kicker">FOR THE GAME-MAKERS</p><h2 id="organizers-title">You bring the game.<br><em>We help people find it.</em></h2><p>Running a tournament, race or regular session? Put the details in front of people looking for their next game.</p><ul><li>Keep your existing registration link</li><li>One clear page for your event details</li><li>Submit your listing for review</li></ul></div><div class="web-organizer-actions"><a class="button lime" href="/list-event">List your event ${arrow}</a><a href="/for-organizers">See how it works ${arrow}</a></div></section>
  </div>`;
}
