const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function registrationFormMarkup(event, user) {
  const paid = Number(event.price) > 0;
  const methods = paid ? (event.paymentMethods || []).filter(m => ['upi','cash'].includes(m)) : [];
  const hasUpi = methods.includes('upi');
  const selected = methods.length === 1 ? methods[0] : '';
  const rules = `<label class="checkbox"><input type="checkbox" name="rules" required><span>I accept the <a href="/event/${encodeURIComponent(event.id)}" target="_blank" rel="noopener">event rules and cancellation policy</a>.</span></label>`;
  return `<form class="form-card registration-wizard" id="live-registration" novalidate>
    <nav class="registration-progress" aria-label="Registration progress"><span data-registration-progress="details" aria-current="step">01 / Player details</span>${hasUpi ? '<span data-registration-progress="payment">02 / UPI payment</span>' : ''}</nav>
    <section data-registration-panel="details"><h2>Your player details</h2>
      <label>Your name<input name="name" autocomplete="name" value="${esc(user.name === 'Player' ? '' : user.name)}" minlength="2" maxlength="80" required></label>
      <label>Email<input name="email" type="email" autocomplete="email" value="${esc(user.email)}" readonly required><small>From your verified sign-in account.</small></label>
      ${paid ? `<label>Payment method<select name="paymentMethod" required>${methods.length > 1 ? '<option value="">Choose how to pay</option>' : ''}${methods.map(m => `<option value="${m}" ${selected === m ? 'selected' : ''}>${m === 'upi' ? 'UPI / scan organizer QR' : 'Cash / pay organizer separately'}</option>`).join('')}</select></label>
        <p data-cash-registration-note ${selected === 'cash' ? '' : 'hidden'}>The organizer will receive payment separately. Register now to send your request for approval. Choosing cash does not mean you have paid.</p>
        ${rules}<label class="checkbox"><input type="checkbox" name="paymentConsent" required><span>I accept the <a href="/terms" target="_blank" rel="noopener">direct payment terms</a>. Payments and refunds are handled by the organizer. My entry remains pending until accepted.</span></label>` : '<p>No payment is required for this event.</p>' + rules}
    </section>
    ${hasUpi ? `<section data-registration-panel="payment" hidden><h2>Pay the organizer</h2>
      <p>Pay &#8377;${esc(event.price)} directly to ${esc(event.host)}. Check the recipient and amount in your UPI app.</p>
      <a href="${esc(event.qrImage)}" target="_blank" rel="noopener noreferrer"><img class="payment-image" data-registration-qr src="${esc(event.qrImage)}" alt="Organizer UPI payment QR code" loading="lazy"></a>
      <p data-qr-load-error role="status" hidden>The QR image could not load. Refresh or contact the organizer before paying. If you already paid, keep your receipt and do not pay again.</p>
      <label>Upload your UPI payment screenshot<input type="file" name="proof" accept="image/png,image/jpeg,image/webp"><small>PNG, JPEG or WebP, up to 750 KB.</small></label>
      <p class="fine registration-retry-note">Payment done but submission failed? Retry with the same receipt. Do not pay again. Contact the organizer for refund.</p>
      <button class="button outline" type="button" data-registration-back>Back to player details</button>
    </section>` : ''}
    <p class="fine">Your details are shared with this organizer.</p>
    <p class="error" role="alert" tabindex="-1"></p>
    <button class="button primary" type="submit">Register</button>
    <p class="fine">${paid ? 'Your registration will appear as pending in My games until the organizer approves it.' : 'Your place will be saved in My games.'}</p>
  </form>`;
}

export function mountRegistrationJourney(form) {
  const details = form.querySelector('[data-registration-panel="details"]');
  const payment = form.querySelector('[data-registration-panel="payment"]');
  const submit = form.querySelector('button[type=submit]');
  const method = form.elements.paymentMethod;
  const proof = form.elements.proof;
  const qr = form.querySelector('[data-registration-qr]');
  qr?.addEventListener('error', () => { form.querySelector('[data-qr-load-error]').hidden = false; });
  qr?.addEventListener('load', () => { form.querySelector('[data-qr-load-error]').hidden = true; });
  let step = 'details';
  const usesUpi = () => method?.value === 'upi';
  const show = (next, focus = false) => {
    step = next;
    details.hidden = step !== 'details';
    if (payment) payment.hidden = step !== 'payment';
    if (proof) proof.required = usesUpi();
    const cashNote = form.querySelector('[data-cash-registration-note]');
    if (cashNote) cashNote.hidden = method.value !== 'cash';
    form.querySelectorAll('[data-registration-progress]').forEach(item => {
      item.hidden = item.dataset.registrationProgress === 'payment' && !usesUpi();
      if (item.dataset.registrationProgress === step) item.setAttribute('aria-current','step'); else item.removeAttribute('aria-current');
    });
    submit.textContent = step === 'details' && usesUpi() ? 'Continue to payment' : 'Register';
    if (focus) { const title = (step === 'details' ? details : payment).querySelector('h2'); title.tabIndex = -1; title.focus(); }
  };
  const validate = panel => {
    const invalid = [...panel.querySelectorAll('input,select')].find(field => !field.disabled && !field.checkValidity());
    if (!invalid) return true;
    invalid.reportValidity(); invalid.focus(); return false;
  };
  method?.addEventListener('change', () => show('details'));
  form.querySelector('[data-registration-back]')?.addEventListener('click', () => show('details', true));
  form.addEventListener('submit', event => {
    if (step === 'details' && usesUpi()) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (validate(details)) show('payment', true);
      return;
    }
    if (!validate(details) || (usesUpi() && !validate(payment))) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
  show('details');
  return { get step() { return step; } };
}
