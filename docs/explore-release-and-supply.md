# Mercury Explore — design, launch and supply review

## Product decision

Explore is a **participation-first** browse surface, not a generic venue-booking catalogue. The design prioritizes visible opportunities, sport selection, dates, area and a compact set of event facts. Eligibility, category rules, source provenance and the full organizer registration disclaimer remain on each detail page.

The compact Playboard intentionally avoids over-promising proximity, live seats or confirmed organizer availability. Current external listings are **published, source-backed leads**, not live booking inventory. Native free Mercury bookings are a different flow, with a confirmed place in My games.

## Release checks for draft PR #4

Use Node 24 and the pinned pnpm version. Before merging:

```sh
pnpm check
pnpm typecheck
pnpm test
pnpm build
pnpm catalogue:review
```

- Browse at 320, 390, 768 and 1440 CSS pixels, also at 200% browser zoom. Confirm cards have no clipped price, title, status or action and no horizontal overflow.
- Use keyboard alone: sport tabs, search, date/area selectors, expand/collapse Filters, clear chips and submit advanced filters. Focus should go into the expanded panel, then to the result count after submitting.
- Verify query-string deep links, reset and browser Back/Forward restoration with sport, date, area and advanced filters.
- Check zero results, entirely stale sources, a closed registration, a venue review hold, no listings, and a published free Mercury game with zero spaces left.
- External direct registration links must keep their existing tracked, secure new-tab handoff. Stale/closed/review-held cards link to the detail page instead of claiming they can register. Native Mercury booking must remain separate.
- Retest guest browsing, sign-in return path, My games, native booking, source-correction link and organizer flows. Confirm no changes to public/private launch flags or Supabase migrations.

A successful Vercel build is **not** evidence of the production browser, sign-in, booking, or source-check flows having been tested.

## Source-quality policy

Before adding a listing, inspect an organizer/association/authoritative event page. Record the title, sport, format, start and end date, **exact venue or honestly unknown venue**, eligibility, level, quoted fee **with units**, cancellation/entry deadline if published, organizer, source URL and actual registration destination. Do not make up times, fees or eligibility.

A reachable URL does **not** establish that a category has entry capacity or that an event is still taking registrations. If organizer pages conflict, use a `reviewNote`, avoid asserting the uncertain venue, and require verification before direct entry. Only advance `checkedOn` after a real human source review; never update it merely because a script ran.

Use `pnpm catalogue:review` to see upcoming entries, source freshness, and manual holds. This script is **report only**: no scraping, imports, automatic changes to `checkedOn`, or claims of live availability. Use `pnpm links:check` separately for transport-level link availability, not factual validation.

## Building real supply

Prioritize events that can be acted on in the next 30 days, with clear category, fee and venue information. Build primary-source coverage for Mumbai, Thane and Navi Mumbai before creating new geography/navigation promises.

Useful sources to review, *not automatically import*: Maharashtra Badminton Association, direct tennis tournament organizers and TPL Sport, UTR Sports, direct pickleball organizers, Hudle and KheloMore event listings, verified running organizers and official chess tournament sources. Use community directories only for lead discovery and confirm facts from primary sources. No event artwork/photos without documented usage rights.

Keep records unique by organizer, event and date, with explicit start/end times where supplied. Avoid publishing duplicate categories as separate events unless each has genuinely distinct registration, venue or rules. Maintain corrections via the existing owner review queue. A weekly manual review of the next 14 days is a practical first operating cadence.

## Longer-term metrics

Instrument already-supported discovery and handoff metrics before creating more homepage sections. Track discovery-to-detail, detail-to-organizer clicks, saves, zero-result queries, stale-source share, and published native bookings. Don't label an external click as a completed registration. Gather small-scale player feedback about whether people could find a relevant and eligible event within a minute.

## After deployment: read-only production smoke

Run the command below **after Vercel marks the production deployment ready**:

```sh
pnpm production:smoke
# Or explicitly target the canonical deployment origin:
node scripts/smoke-production.mjs https://www.playonmercury.com
```

The script issues only five public GET requests: Explore HTML, the browser Explore module, the stylesheet, the public listings API and the public events API. It verifies the compact Playboard markup, shipped assets and API response shapes. It does not log in, register players, click external organizers, change a database, or handle secrets.

A non-200 response, redirect away from the canonical origin, HTML in place of JSON, or an old asset fails the check. **A passing result does not prove bookings, Google OAuth or organizer flows work.** Those still need the pilot runbook and real browser QA.

If the production site intentionally requires Vercel Authentication, public GET checks may fail; that is a real access limit, not permission to turn off access controls without approval. Inspect the production protection configuration and run signed-in tests through an approved environment.
