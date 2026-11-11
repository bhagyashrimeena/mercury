import { sportPhoto } from './sport-media.js';

// The arena remains Mercury's own SVG system. Photography is licensed real stock,
// disclosed as illustrative and never presented as an image of a named event.
export function arenaIntroMarkup() {
  const photo = sportPhoto({ id: 'mercury-city-in-play', sport: 'Running' });
  const photoSrc = photo.src.replace('w=560&h=440', 'w=960&h=540');
  return '<header class="explore-intro mercury-arena" aria-labelledby="explore-title">' +
    '<div class="arena-copy">' +
    '<p class="arena-eyebrow"><span class="arena-live-dot" aria-hidden="true"></span>MUMBAI, IN PLAY <span class="arena-sup" aria-hidden="true">/ 01</span></p>' +
    '<h1 id="explore-title">FIND YOUR<br><em>NEXT GAME<span class="arena-stop">.</span></em></h1>' +
    '<p class="arena-description">Tournaments, races, leagues and good reasons to get out and play.</p>' +
    '</div>' +
    '<figure class="arena-photo"><img src="' + photoSrc.replaceAll('&','&amp;') +
    '" alt="" width="640" height="420" decoding="async" fetchpriority="high">' +
    '<figcaption><a href="' + photo.page + '" target="_blank" rel="noopener noreferrer">Illustrative sports photo · Pexels</a></figcaption></figure>' +
    '<div class="arena-art" aria-hidden="true"><svg class="arena-wave-svg" viewBox="0 0 760 258" fill="none" preserveAspectRatio="xMidYMid slice" focusable="false">' +
    '<path class="arena-line arena-line-one" d="M-44 187C72 111 119 251 260 181S448 17 580 90s133 168 229 48" stroke="#D9FF38" stroke-width="11" stroke-linecap="round"/>' +
    '<path class="arena-line arena-line-two" d="M-78 219C50 141 143 287 282 201S453 44 575 117s167 166 264 57" stroke="#3156F5" stroke-opacity=".75" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="8 13"/>' +
    '<path class="arena-line arena-line-three" d="M134 -52C210 46 371 -24 419 67s-10 153 106 206" stroke="#6993FF" stroke-width="3.5" stroke-linecap="round"/>' +
    '<circle class="arena-orbit-ring" cx="591" cy="110" r="90" stroke="#3156F5" stroke-opacity=".21" stroke-width="1.7"/>' +
    '<circle class="arena-orbit-ring arena-orbit-ring-inner" cx="591" cy="110" r="65" stroke="#3156F5" stroke-opacity=".19" stroke-width="1.7"/>' +
    '<circle class="arena-ball" cx="591" cy="110" r="25" fill="#D9FF38"/>' +
    '<path d="M580 89c20 8 28 20 28 42M603 89c-20 8-28 20-28 42" stroke="#10131A" stroke-opacity=".55" stroke-width="2.2" stroke-linecap="round"/>' +
    '</svg></div>' +
    '<div class="arena-ticker" aria-hidden="true"><div class="arena-ticker-track">' +
    '<span>TENNIS ✳ RUNNING ✳ BADMINTON ✳ PICKLEBALL ✳ CHESS ✳ MUMBAI IS MOVING ✳</span>' +
    '<span>TENNIS ✳ RUNNING ✳ BADMINTON ✳ PICKLEBALL ✳ CHESS ✳ MUMBAI IS MOVING ✳</span>' +
    '</div></div></header>';
}

export function waveRibbonMarkup() { return "<div class=\"mercury-wave-ribbon\" aria-hidden=\"true\"><div class=\"mercury-wave-ribbon-track\">\n<span>NO MORE MAYBE NEXT WEEK <b>✳</b> SHOW UP FOR THE GAME <b>✳</b> SPORT BELONGS TO EVERYONE <b>✳</b></span>\n<span>NO MORE MAYBE NEXT WEEK <b>✳</b> SHOW UP FOR THE GAME <b>✳</b> SPORT BELONGS TO EVERYONE <b>✳</b></span>\n</div></div>"; }
export function listingFlowMarkup() { return "<div class=\"listing-flow-stripe\" aria-hidden=\"true\"><span>THE CITY'S IN PLAY</span>\n<svg viewBox=\"0 0 510 42\" preserveAspectRatio=\"none\" focusable=\"false\"><path d=\"M-8 26C40 11 83 38 142 19s104-12 159 5 88 8 125-8 78-7 94 3\" stroke=\"#D9FF38\" fill=\"none\" stroke-width=\"4\" stroke-linecap=\"round\"/></svg>\n<span>GET IN THE GAME ↗</span></div>"; }
