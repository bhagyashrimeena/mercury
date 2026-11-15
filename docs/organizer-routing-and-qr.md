# Organizer event routes and payment QR checks

`/list-event` starts with two compact radio selectors. Selecting an option highlights it in light blue; navigation happens only after **Next**. The button stays disabled until a choice is selected:

- **Host exclusively on Mercury** opens `/host`. Players register on Mercury and organizers manage their registrations here.
- **Promote an event hosted elsewhere** opens `/list-event?mode=external`. The existing submission form sends the external event link for manual review. Approved external listings continue to send registration traffic to the organizer's external website; submitting the form does not automatically publish a listing. Existing `?claim=` links open this external form directly.

The native event editor has four wizard steps: essentials, player details, event review, and payment/save. The final step offers direct UPI payments, cash, or both for paid events. Cash-only and free events do not require QR images. Valid image format/size and a QR upload for UPI are still required; the QR's readability or recognized destination is advisory only.

## Offline QR inspection

The browser decodes the uploaded image using pinned `jsqr@1.4.0` inside a short-lived Web Worker. Decoding is bounded to 750 KB uploads, 24 million source pixels, 1400px scan dimensions, 4096-character decoded addresses and a six-second worker lifetime. Scans do not block form submission. Workers terminate after completion, errors or timeout, and outdated results cannot overwrite a newer selection.

UPI pay addresses require a syntactically valid, unambiguous `pa` parameter. HTTPS addresses are recognized only for a fixed set of payment-provider hostnames. Credentials, custom ports, fragments, control characters, private addresses, unknown hosts and executable schemes are not recognized. Decoded contents are never inserted into HTML, navigated to, fetched, followed through redirects, sent to analytics or submitted to the server.

Recognizing a URI format or provider hostname does not verify a bank account, recipient, short-link destination, transaction or provider approval. Messages explicitly ask organizers to check those details themselves. An unreadable QR, unsupported address, unsupported browser or decoder failure shows a non-blocking notice; organizers can keep the image and continue saving.

`scripts/sync-qr-vendor.mjs` copies the pinned decoder distribution and MIT license into ignored public assets before both dev and build. No runtime third-party CDN is used. Existing API image checks, private image access, registration review and direct-payment responsibilities continue to apply.

Tests cover supported and unsafe payloads, the initial route choice and existing external submission. An isolated browser rehearsal decodes the synthetic UPI QR in `tests/fixtures/payment-upi.png`, saves an unreadable QR without blocking, and checks native/external routes, cash-only visibility and mobile layouts. The fixture's payment address is test data; it is never opened or used for payment.

References: [jsQR](https://github.com/cozmo/jsQR), [Razorpay payment-link examples](https://github.com/razorpay/razorpay-php/blob/master/documents/paymentLink.md).
