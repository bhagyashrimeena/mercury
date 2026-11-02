# First Mercury pilot

The site remains owner-private. Use the existing Mercury URL while signed in to the owning ChatGPT account.

1. Open **My games**. If prompted, continue with ChatGPT. Open **Your account**, review the Privacy and Terms pages, and complete the adult account notice before saving your player name.
2. Open **Host** / **For organizers**. Add an organizer name, bio and optional public contact email.
3. Create a future free event with a real confirmed venue, address, capacity, level, inclusion list and arrival instructions. Sessions currently last 90 minutes. Save the draft.
4. Review the draft, then choose **Publish free game**. Confirm publication. The game should appear in **Find a game**.
5. Open the event, join it as a player, and verify the pass in **My games**. Refresh the page to verify persistence. Repeating registration should return the existing pass and keep capacity unchanged.
6. Open the organizer roster and check the player in. Refresh; the status should remain checked in. The account may act as both organizer and player for this owner-private smoke test.
7. For a separate test event, cancel a player registration before check-in and verify its place reopens. Cancel the event as organizer and verify any remaining active pass becomes event-cancelled with an in-app update.

Do not publish a test event as a genuine invitation. Use explicit test titles for the pilot and cancel them when finished. Do not broaden sharing until the owner explicitly chooses who should have access.

## Operating rules

- One active place per account/event. No guest checkout or group entry.
- Free places can be cancelled online before start time unless already checked in.
- Events with registrations cannot be edited or unpublished; cancel and create a corrected event instead. This prevents silently changing a player's accepted details.
- An event cancellation is irreversible and updates all active passes in a database batch.
- In-app updates are available; email, WhatsApp and SMS are not sent. Tell pilot participants where to find updates.
- An organizer's public contact is optional, but a real pilot should provide a contact for arrival issues.
- Attendee CSVs contain personal data. Store them privately and use them only to run the session.
- Cancellation changes status and retains history. The owner can inspect data through Sites Settings; never export account data into the public GitHub repo.

## Before wider launch

Complete the hosted signed-in smoke test and a real event rehearsal. Review the implemented support/privacy policies and owner inbox; use [the v0.5 launch checklist](launch-readiness.md) for the remaining release gates. Add real inventory and confirm venue rights/arrangements. Choose sharing/public access explicitly. Review mobile behavior on physical devices.

Payments remain disabled until provider credentials, order creation, webhook verification, duplicate/retry handling, reconciliation and refunds have passed end-to-end tests. A success redirect must never be treated as proof of payment. Public indexing, sitemap/canonical configuration and custom domain should be enabled only when real inventory and the launch audience are ready.

## Deployment and rollback

Use the Sites source workflow to commit, push, build/package and publish the exact source SHA. The manifest retains the existing project ID and declares `DB`. Never expose source credentials in files or logs. Keep the GitHub source tree matched to the deployed source tree.

A failed deployment may still have applied migrations; inspect the live schema before changing migration history. Applied migrations are immutable. To roll back UI/server code, deploy a previously saved compatible version; reverting code does not roll back the database. The v0.2 static version has no database operations, so it cannot manage v0.3 registrations.
