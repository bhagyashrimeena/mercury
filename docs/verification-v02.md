# Mercury v0.2 verification

## Automated checks

`npm run check` and `npm test`: 16 passing tests. The added coverage verifies URL filter round trips, unknown query options, immutable sorting, availability, organizer field validation, future dates in India time, free events, legacy draft migration, edit upserts and malformed recovery data.

## Browser checks

- Edited a draft created by v0.1, reloaded before saving, and verified all added fields recovered.
- Previewed the event and returned to the filled form.
- Saved the edit and confirmed the draft count remained one.
- Removed and restored the draft with Undo.
- Applied Tennis + price descending + available spots; reloaded and verified the same URL, selections and one matching event.
- Entered registration details, opened the rules sheet, closed it and verified values and focus were preserved.
- Opened the event share dialog and verified the link and private-preview disclosure.
- Inspected 360px event details and 390px organizer studio iframe viewports, with no horizontal overflow; checked mobile bottom navigation and entered registration using its fixed event CTA.

## Limits

Responsive browser checks are not physical-device or screen-reader certification. The native share chooser was not exercised on a phone. This is still a static preview: drafts, recovery, saves and demo bookings are local to the browser. Live authentication, organizer permissions, server records, payments, notifications and publishing are not implemented.

The preview remains private and noindex; no live event inventory or reservations were created.
