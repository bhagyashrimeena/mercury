# Direct organizer payments

Organizers can publish paid events with UPI, cash, or both. UPI requires a QR image; paid publication requires a public organizer contact email. Free entry keeps immediate confirmation. Mercury does not collect or transfer money.

## Release

Apply `supabase/migrations/20261115000000_direct_payments.sql` before deploying this code. With the database URL and trusted root certificate configured, the repository runner is:

```powershell
node --env-file=.env --env-file=.env.local scripts/migrate-postgres.mjs
```

The runner serializes and records the migration and recognizes it if already applied with Supabase tooling. SQLite uses `drizzle/0004_direct_payments.sql`, which preserves existing bookings while extending statuses and uniqueness. Back up through the database provider before release. Avoid rolling old application code back after paid registrations exist: it does not understand pending/rejected entries.

## Lifecycle

- Paid entries start pending and reserve capacity. Only owner acceptance confirms entry. Pending/rejected records are not entry passes and cannot create calendar entries.
- Owners verify UPI settlement in their bank account or agree a cash arrangement before acceptance. A screenshot alone is not payment verification.
- Review closes at event start/cancellation. Identical review retries are idempotent; conflicting decisions return 409. Registration and owner event actions share a PostgreSQL event row lock. Review and player cancellation also use conditional updates.
- Rejection/player cancellation release capacity. Old request keys cannot resurrect rejected/cancelled entries. Event cancellation includes pending entries.
- Advertised details are locked after any paid registration history. Amount and organizer contact are stored on the booking for later refund queries.
- Pending entries never become confirmed automatically. Owners must review promptly; unresolved records after start retain their pending state and refund contact.

## Images and privacy

Uploads accept PNG, JPEG and WebP up to 750 KB, with signature checks and bounded request streaming. SVG/remote URLs are rejected. Creation and registration are rate limited. Images are private database columns, committed with event/booking data, without orphan uploads or public buckets. Receipt authenticity requires organizer verification.

Only the player and relevant owner can read a receipt through authenticated endpoints with private/no-store and nosniff headers. Lists contain receipt flags/links, not image payloads. Roster CSV excludes receipts. Provider backups contain private records. Application backups above 8 MB of image data require a provider export. Retention follows registration history and privacy review through support.

The registration checkbox records direct payment terms version `2026-11-15-direct-payments`. Terms describe organizer payment/refund responsibility and payment risk, with liability limits subject to applicable law. Obtain legal review before public release; statutory rights are preserved. Reference: [Consumer Protection Act](https://www.indiacode.nic.in/bitstream/123456789/15256/5/A2019-35.pdf).

## Verification

Run `npm test`, `npm run check`, `npm run typecheck`, `npm run lint`, and `npm run build`.

Regression tests cover UPI receipts, cash, capacity, duplicate requests, owner authorization, receipt privacy, review, cancellation, and non-entry pending/rejected states. A PostgreSQL API test applies the real migrations and exercises the paid lifecycle using PGlite alongside SQLite tests.

Isolated browser rehearsal used synthetic accounts/data to create and publish a paid event, upload a UPI receipt, reject and display refund contact, and accept a cash entry. Registration and roster layouts were checked at 320, 390 and 1440px. This is not live bank or Supabase authentication verification.

Live database verification remains blocked by `SELF_SIGNED_CERT_IN_CHAIN`. Configure `SUPABASE_DB_CA` and apply the migration before testing against that database; keep TLS verification enabled.
