# Mercury private pilot rehearsal

Use this runbook for the current Next.js site on Vercel, with Google sign-in through Supabase Auth and application records in Supabase PostgreSQL. It is a test plan for approved pilot accounts, not a record that the hosted journeys have passed. The [deployment guide](vercel-deployment.md) has the current configuration steps; the [design review index](../artifacts/design-review/README.md) records local captures and their limits.

Keep `MERCURY_PUBLIC_LAUNCH=false` during the private account pilot. Guests can browse the reviewed catalogue, while saving and booking require a pilot account. Do not add unreviewed catalogue listings or send real invitations from test events.

## Prepare the pilot

1. Check the Vercel production deployment SHA against the intended commit on `main`. A ready deployment does not prove sign-in or booking works.
2. Confirm the server has `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_DB_CA`, `MERCURY_SITE_ORIGIN=https://www.playonmercury.com`, and `MERCURY_ADMIN_EMAIL`. Keep values out of screenshots, logs and GitHub. Apply the repository PostgreSQL migrations through the documented command before relying on the owner activity counts.
3. In Supabase Auth, enable Google and allow the exact return URL `https://www.playonmercury.com/auth/callback`. The apex domain currently redirects to `www`. Add each approved Google test email to `MERCURY_ALLOWED_EMAILS`; the owner email in `MERCURY_ADMIN_EMAIL` is allowed automatically. Redeploy after changing Vercel environment variables.
4. Use at least two adult test accounts, one organizer and one player, to check ownership boundaries. Test on desktop Chrome, Android Chrome and iOS Safari where available. Keep test event names clearly marked and use a confirmed test venue/address that will not mislead visitors.

## Rehearse the player journey

1. From an external listing, select **Save for later**, complete Google sign-in and the adult account notice, and confirm that `return_to` brings you back to the listing. Refresh, unsave and save again. My games must call it a saved external listing, not a registration.
2. Open the external registration action. Confirm the destination is the named organizer or booking provider, in a new tab, and that Mercury never says the visitor is registered. The organizer's site alone confirms an external entry.
3. Starting signed out, submit a clearly marked test request at `/support` and a listing correction from **Suggest a correction**. Keep the shown request reference; no automatic email is sent.
4. From a published free Mercury event, select **Book free place on Mercury**. Check the event facts and rules, finish sign-in if needed, and verify that the return path reaches the intended event or booking step. Book with the player account, refresh My games and open the pass. The pass should show status, date, venue, player name and reference. Save a screenshot before testing at a venue with weak signal.
5. Retry the same booking and confirm that it returns the existing place without using a second capacity slot. Test the final available place with competing test accounts; exactly one should succeed. A full game must stop offering booking.
6. Cancel an un-checked-in free place before start and confirm capacity reopens and My games shows a player-cancelled history item. A checked-in or already-started place must not offer cancellation. Check the pass and My games after refresh.

## Rehearse the organizer and owner journeys

1. With the organizer account, create a profile and a clearly marked future free event. Provide venue, time in IST, eligibility, capacity, included items, arrival instructions and cancellation terms. Save a draft, preview its public page, return to the form, then publish. Paid events may remain drafts; native paid checkout and publishing are unavailable.
2. Confirm the event appears in Explore. Open the roster on a phone, check in the player's pass reference, refresh and verify that attendance remains recorded. A second tap must not create a duplicate check-in. A different account must not be able to edit the event or view its roster.
3. Once a player has registered, verify that event details cannot be silently edited or unpublished. For a separate test event, cancel it as organizer and confirm every active pass becomes **Cancelled by organizer** with an in-app update. Notify pilot participants directly if plans change; Mercury does not send email, SMS or WhatsApp alerts.
4. With the owner account, open `/admin`. Find the test support request and correction, review the source, add an internal note, and resolve only after handling them. **Reply by email** opens the owner's mail app; the site does not send a reply automatically. Check `/api/health` and the owner dashboard, noting that activity counts require the additive `site_metrics` migration.
5. Download an attendee CSV only for the rehearsal and store it privately. Do not put account exports, rosters, backups or Supabase credentials in the repository or a public link.

## Before widening access

Review every launch listing's source and registration URL by hand, including date, venue, eligibility, fee unit and deadline. Recheck imminent events, withdraw uncertain or cancelled listings, and update `checkedOn` only after a real source review. Run the mobile and accessibility tasks from the supplied design brief with people unfamiliar with the site. Confirm support coverage and a real human reply before inviting traffic.

Only the owner should deliberately enable public access after those checks. First verify staged signed-out browsing if used, then set the public launch flag and redeploy when approved. A Vercel rollback can restore compatible code, but it does not undo a PostgreSQL migration; inspect the live database state before a rollback or repair.
