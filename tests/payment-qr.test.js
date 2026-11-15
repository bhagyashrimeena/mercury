import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPaymentQr } from '../public/payment-qr.js';

test('QR checks recognize UPI and supported payment addresses without accessing them', () => {
  for (const payload of ['upi://pay?pa=mercury-test@upi&pn=Mercury%20Test', 'UPI://PAY?pa=club.123@okbank&am=450', 'https://rzp.io/rzp/example', 'https://razorpay.com/payment-link/example']) {
    const result = classifyPaymentQr(payload);
    assert.equal(result.kind, 'recognized', payload);
    assert.doesNotMatch(result.message, /verified successfully|safe to pay/i);
  }
});

test('unreadable and untrusted QR payloads produce advisory warnings', () => {
  for (const payload of ['', 'not a URL', '<script>alert(1)</script>', 'javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,test',
    'https://127.0.0.1/pay', 'http://rzp.io/example', 'https://rzp.io.evil.example/pay', 'https://rzp.io@evil.example/pay',
    'https://user:password@rzp.io/pay', 'https://rzp.io:8443/pay', 'https://rzp.io/pay#fragment',
    'upi://pay?pa=invalid', 'upi://pay?pa=first@upi&pa=second@upi', 'upi://pay?pa=user%0Aname@upi',
    'https://rzp.io/pay\n', 'x'.repeat(4097), 'intent://pay#Intent;scheme=upi;end']) {
    const result = classifyPaymentQr(payload);
    assert.equal(result.kind, 'warning', payload);
    assert.match(result.message, /still save/);
  }
});
