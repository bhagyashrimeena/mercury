# Mercury-hosted event review

The last organizer wizard button is **Send for review**. **Save draft** keeps the event private. The complete event, cover image and UPI QR remain in the database; the admin review page reads the submitted values and protected images directly.

## Admin setup and operation

Set the server-only `MERCURY_ADMIN_EMAIL` to the verified sign-in email that should approve events. Set it separately in the Vercel environment before deploying; `.env.local` only configures the local app. Restart the app after a local change, or deploy after changing Vercel configuration. Do not use a `NEXT_PUBLIC_` variable.

Sign in with that account and open `/admin`. **Mercury event reviews** appears before activity metrics and support. Open a submission to review every supplied event field, organizer details, cover and payment QR. QR destinations are never fetched or opened automatically. Uploaded images must load before the UI enables approval. **Approve and publish** makes the event public. **Request changes** requires a reason, keeps it private, and shows the reason to the organizer. The organizer receives an in-app notification for either decision.

The queue shows up to 100 submissions, prioritizing pending events oldest first. Reviewed submissions remain visible when space permits. An event whose start time has passed cannot be approved; request changes so its organizer can correct the schedule.

## State and authorization rules

- New submissions become `pending_review`; requests using the legacy `publish: true` flag or organizer `/publish` endpoint also submit for review.
- Only the configured admin can access `/api/admin/events/:id`, its revision-pinned cover and QR, or the `/review` action. Organizer and player sessions cannot approve their own events through organizer endpoints, even if the organizer account is also the configured admin.
- Public discovery, event details, covers, saved-event creation and registration require publication and recorded approval. Cancelling an unapproved submission does not make its details or images public.
- Editing a live event removes it from public view and clears approval. Saving an edit withdraws an existing pending submission to a private draft. Sending those edits for review creates a new content revision. Existing registration and paid-history edit locks still apply.
- Approval checks the reviewed revision, pending state, future start time, payment setup and public payment contact again. PostgreSQL serializes review, editing and registration using the event row lock. A review decision and its organizer notification commit together.
- Existing published and cancelled events are grandfathered by the migration. They retain their current visibility; future edits or re-submission require review.

## Database rollout

Apply `supabase/migrations/20261116020000_event_review.sql` using the existing migration runner before deploying the new application code. It adds approval/review timestamps, reviewer ID and review note, and extends the event status constraint. The migration preserves existing uploads, registrations and references. SQLite migration `0008_event_review.sql` supports tests and local recovery, and the backup restore tool supplies defaults for older backups.

Verification covers the organizer wizard, private images, rejection and correction, stale approvals, admin publication and subsequent player registration. Automated API and PostgreSQL checks cover authorization, state transitions, transaction rollback and persistence after reopening the database.
