# Mercury — kinetic court UI design pass

## Concept

**Sports editorial × discovery utility.** Mercury should communicate momentum and play without becoming a distracting game or a generic SaaS dashboard.

The original artwork is built in `public/kinetic-art.js` with hand-authored SVG lines, circles and paths. It is **not an AI-generated image** and does not impersonate an organizer's event photograph. Existing Pexels sports photographs remain illustrative fallbacks with their source register.

Brand palette remains electric blue `#3156F5`, lime `#D9FF38`, ink `#10131A` and chalk `#F7F8F2`.

## Surfaces

- **Explore:** compact ink arena with sweeping animated court-line waves, bouncing ball motif, lime ticker, accessible visible search, lively sports pills, quick filters and sub-220px photographic cards. No extra marketing panels appear before the event list. SSR and interactive views use the same artwork, so slow navigation preserves visual continuity.
- **Cards:** consistent genuine stock/approved organizer photographs, subtle hover movement, speed-line rings, lime confirmation of a hover target and a single visible `View event` action. Registration still happens on the relevant detail/organizer route.
- **Home:** the existing editorial hero becomes a motion-led campaign surface *after* the practical discovery panels, with original speed paths and energetic CTAs. No new data, images or exaggerated booking claims.
- **Event details:** a narrow wavy sports banner, a stronger headline, small illustrated fact tiles, a distinct price/action sidebar, accessible source and status text. No extra step to register.
- **Organizer public pages:** abstract CSS motion shapes, shaped benefit cards and legible calls to action, leaving the secure event intake and private studio untouched.
- **Reduced motion:** CSS `prefers-reduced-motion: reduce` disables recurring animations, ticker scrolling and entrance motion. All decorative SVG is `aria-hidden`.

## Performance and UX principles

- No new runtime JS frameworks, image generation endpoints, autoplay video or WebGL. Vector art is small static HTML and keyframe CSS.
- Animated elements are decorative, do not block pointer events, and do not represent live registrations, verification or current availability.
- Brand surfaces use larger, more expressive type; event facts, fees, location and registration buttons remain readable.
- Mobile layouts use a smaller arena with the same first-screen search and a single-column event listing.
- The Vercel/GitHub build passing does not prove CDN image reachability or production Google sign-in. Test public discovery, filtered search, external registration handoff, organizer intake and native booking using the existing fixtures.

## Browser QA

Tests assert: the arena wave paths and animated ticker appear, the photo cards remain under 220px high, cards begin in the first screen, no horizontal overflow at 320/390/768/1440 widths, the listing banner and four event-fact groups appear, and the existing organizer/player flows work. Chrome also takes desktop/mobile screenshots for visual inspection.

References: motion-led sports branding and editorial sports UX, but **no competitor visuals or artwork are copied**.
