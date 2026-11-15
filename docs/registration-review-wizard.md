# Native registration and payment review

Published native Mercury events use **Register now** on desktop and mobile. External catalogue listings continue to register on the organizer's external website.

The registration wizard pre-fills the saved player name and verified account email. Name and playing level can be supplied for this registration; the email is read-only and the server uses the verified account identity, never a client-supplied email, for organizer contact details.

| Entry method | Player flow |
| --- | --- |
| UPI | Player details → persisted organizer QR and required payment screenshot → Register |
| Cash / separate organizer payment | One player-details step with a separate-payment notice → Register |
| Free | One details step without payment controls → Register |

When both paid methods are enabled, the player's selection determines the step count. Returning to details retains entered values and the selected receipt. Pending, confirmed or checked-in registrations redirect to their existing record before showing payment again.

Paid entries are saved as pending in My games and reserve capacity. Organizers see a pending-review count in the studio and receive an in-app notification linking directly to the event roster. The review dialog shows player details, verified email, payment method, amount and the uploaded receipt image before acceptance or rejection. A receipt image does not establish bank settlement; the organizer must verify funds in their own account. Only acceptance produces a confirmed pass. Free registrations retain immediate confirmation.

## Durable storage and access

QR images are stored in `events.qr_image` and receipts in `bookings.payment_proof`, inside the existing transactional event/booking writes. No browser storage, temporary upload URL or third-party image bucket is required. API responses expose authenticated image routes instead of embedding image data into listing/roster responses. Receipt reads are limited to the player and event owner and retain private/no-store headers. Only event owners receive player contact emails in the private roster. Existing history locks prevent paid events changing their advertised payment details after registration.

No new schema migration is needed beyond the existing direct-payments migration. The PostgreSQL API regression test writes both images, reads them through authenticated endpoints, closes and reopens an on-disk PGlite database and verifies their original contents. It also checks pending counts, organizer notification routing, verified email provenance and review transitions. Browser rehearsal uses synthetic local accounts to exercise native CTA wording, profile prefill, conditional steps, missing-receipt validation, QR rendering, pending My games records, organizer receipt rendering, acceptance and cash registration at mobile/desktop sizes.

Notifications are in-app; email, SMS and browser push are not sent. The pending-review count comes directly from bookings, so the organizer can still find requests if an optional notification write is unavailable.
