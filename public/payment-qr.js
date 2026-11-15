const unclear = 'Your QR code might not be clearly visible. Please recheck the image. You can still save it.';
const unsupported = 'A QR code was found, but its payment address was not recognized. Please recheck it. You can still save it.';
const paymentHosts = new Set(['razorpay.com', 'rzp.io', 'paytm.me', 'paytm.com', 'phonepe.com', 'phon.pe', 'cashfree.com']);

export function classifyPaymentQr(payload) {
  if (!payload) return { kind: 'warning', message: unclear };
  if (typeof payload !== 'string' || payload.length > 4096 || /[\u0000-\u0020\u007f]/.test(payload)) return { kind: 'warning', message: unsupported };
  try {
    const url = new URL(payload);
    if (url.username || url.password || url.hash || url.port) return { kind: 'warning', message: unsupported };
    if (url.protocol === 'upi:' && url.hostname.toLowerCase() === 'pay' && ['', '/'].includes(url.pathname) &&
        url.searchParams.getAll('pa').length === 1 && /^[a-z\d._-]{2,256}@[a-z\d.-]{2,64}$/i.test(url.searchParams.get('pa') || '')) {
      return { kind: 'recognized', message: 'UPI payment code recognized. Confirm the recipient and amount in your payment app; Mercury has not verified the account.' };
    }
    if (url.protocol === 'https:' && paymentHosts.has(url.hostname) && url.pathname !== '/') {
      return { kind: 'recognized', message: 'Payment-provider address recognized. The link was not opened; confirm the recipient and destination yourself.' };
    }
  } catch { /* Untrusted QR content is never rendered or followed. */ }
  return { kind: 'warning', message: unsupported };
}

export function inspectPaymentQr(file) {
  return new Promise(resolve => {
    let worker, timer;
    const finish = result => { clearTimeout(timer); worker?.terminate(); resolve(result); };
    try {
      worker = new Worker('/payment-qr-worker.js');
      timer = setTimeout(() => finish({ kind: 'warning', message: unclear }), 6000);
      worker.onmessage = event => finish(classifyPaymentQr(event.data?.payload));
      worker.onerror = () => finish({ kind: 'warning', message: 'QR checking is unavailable in this browser. Recheck the image before publishing. You can still save it.' });
      worker.postMessage(file);
    } catch { finish({ kind: 'warning', message: unclear }); }
  });
}

export function mountPaymentOptions(form, { inspect = inspectPaymentQr } = {}) {
  const input = form.querySelector('#organizer-qr');
  const upi = form.elements.allowUpi;
  const status = form.querySelector('#qr-check-status');
  const details = form.querySelector('#upi-setup');
  const preview = form.querySelector('#organizer-qr-preview');
  let generation = 0;
  let lastFile, lastInspection;
  const refresh = async () => {
    const current = ++generation;
    const paid = Number(form.elements.price.value) > 0;
    const enabled = paid && upi.checked;
    form.querySelector('#paid-payment-options').hidden = !paid;
    form.querySelector('#free-payment-note').hidden = paid;
    details.hidden = !enabled;
    if (!enabled) return;
    const file = input.files[0];
    if (!file) {
      const saved = form.elements.qrImage.value;
      preview.hidden = !saved;
      if (saved) preview.src = saved; else preview.removeAttribute('src');
      status.textContent = saved ? 'Saved QR image. Check it in your payment app before publishing.' : 'Upload a payment QR image. Readability warnings do not prevent saving.';
      delete status.dataset.kind;
      return;
    }
    if (file.size > 768000 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      status.textContent = 'Choose a PNG, JPEG or WebP under 750 KB. QR readability itself is optional.';
      status.dataset.kind = 'warning'; return;
    }
    status.textContent = 'Checking QR readability on your device…';
    status.dataset.kind = 'checking';
    const url = URL.createObjectURL(file);
    preview.onload = preview.onerror = () => URL.revokeObjectURL(url);
    preview.src = url; preview.hidden = false;
    if (lastFile !== file) { lastFile = file; lastInspection = inspect(file); }
    const result = await lastInspection;
    if (current !== generation || !status.isConnected) return;
    status.textContent = result.message;
    status.dataset.kind = result.kind;
  };
  input.addEventListener('change', refresh);
  upi.addEventListener('change', refresh);
  form.elements.price.addEventListener('input', refresh);
  void refresh();
  return { refresh };
}
