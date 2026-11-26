import { brandHero, playSteps, playIcon, escapeHtml as esc } from './in-play.js';
const sports = ['Badminton', 'Tennis', 'Pickleball', 'Running', 'Chess'];
const options = values => values.map(value => `<option>${esc(value)}</option>`).join('');

// The same markup powers the first server paint and client-side navigation.
export function homeMarkup(cards = '') {
  return `<div class="page-width home-journey website-home">
    ${brandHero({kicker:'Sports in Mumbai', heading:'Your next game<br><span>starts here.</span>',description:'Discover tournaments, social games and sporting events across your city.',extraClass:'web-hero'})}
    <form class="web-search" id="hero-search" action="/explore" method="get" aria-label="Find sports events">
      <label><span>Your sport</span><select name="sport" aria-label="Sport">${options(['All sports', ...sports])}</select></label>
      <label><span>Where</span><select name="area" aria-label="Neighbourhood">${options(['All Mumbai','Powai','Chandivali','Andheri','Bandra','BKC','Borivali','Malad','Ghatkopar','Nityanand Nagar','Nerul, Navi Mumbai','South Mumbai','Vile Parle','Across Mumbai'])}</select></label>
      <label><span>When</span><select name="when" aria-label="Date">${options(['Any date','Today','Tomorrow','This weekend','Next 7 days'])}</select></label>
      <button class="button primary" type="submit">${playIcon('search')} Find games</button>
    </form>
    <nav class="ip-chips" aria-label="Popular ways to play"><a href="/explore?when=This%20weekend">This weekend</a><a href="/explore?fee=Free">Free events</a><a href="/explore?type=Tournament">Tournaments</a><a href="/explore?type=Social%20play">Social games</a></nav>
    <section class="discovery-section web-upcoming ip-section" aria-labelledby="upcoming-title"><div class="web-section-heading"><h2 id="upcoming-title">Coming up in <em>Mumbai.</em></h2><a class="text-link" href="/explore">Explore all ↗</a></div>
      <div class="event-grid" id="featured-grid" aria-live="polite">${cards || '<div class="web-lineup-empty"><h3>Your next game is out there.</h3><p>See the full calendar for upcoming events and current entry details.</p><a class="text-link" href="/explore">Explore the calendar ↗</a></div>'}</div>
    </section>
    <section class="web-sports ip-section" aria-labelledby="sports-title"><div class="web-section-heading"><h2 class="ip-display" id="sports-title">WHAT’S YOUR GAME?</h2><a class="text-link" href="/explore">All sports ↗</a></div>
      <div class="web-sport-grid">${sports.map(sport => `<a class="web-sport-tile" href="/explore?sport=${encodeURIComponent(sport)}"><img src="/assets/in-play/${sport.toLowerCase()}.jpg" alt="" width="357" height="266" loading="lazy"><strong>${sport.toUpperCase()}<span aria-hidden="true">↗</span></strong></a>`).join('')}</div>
    </section>
    <section class="web-how ip-section ip-band" aria-labelledby="how-title"><p class="ip-eyebrow">The Mercury mindset</p><h2 class="ip-display" id="how-title">LESS SCROLLING.<br><span>MORE PLAYING.</span></h2>${playSteps()}</section>
    <section class="web-organizers ip-section ip-band" aria-labelledby="organizers-title"><div><p class="ip-eyebrow">For the game-makers</p><h2 class="ip-display" id="organizers-title">YOU BRING THE GAME.<br><span>WE HELP PEOPLE FIND IT.</span></h2><p>Get your sporting event discovered. Keep your existing registration platform.</p></div><a class="button primary" href="/list-event">List your event</a></section>
  </div>`;
}
