const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const statusLabel = status => ({pending_review:'Under review',rejected:'Changes requested',published:'Published',draft:'Draft',cancelled:'Cancelled'}[status] || status);

export function eventReviewQueue(events = []) {
  return `<section class="section-space" aria-labelledby="event-reviews-title"><h2 id="event-reviews-title">Mercury event reviews</h2><p class="fine">Review the details, cover and payment QR before approving. Pending submissions appear first, oldest first. Up to 100 recent submissions.</p><div class="manage-grid">${events.map(event => `<article class="form-card"><span class="state state-${esc(event.status)}">${esc(statusLabel(event.status))}</span><h3>${esc(event.title)}</h3><p>${esc(event.organizer)}</p><button class="button outline" data-event-review="${esc(event.id)}">${event.status === 'pending_review' ? 'Review submission' : 'View review'}</button></article>`).join('') || '<p class="muted">No event submissions yet.</p>'}</div></section>`;
}

export function eventReviewMarkup(event, owner) {
  const detail = (label, value) => value == null || value === '' ? '' : `<div><dt>${label}</dt><dd>${esc(Array.isArray(value) ? value.join('\n') : value)}</dd></div>`;
  const image = (label, source) => `<section><h3>${label}</h3>${source ? `<a href="${esc(source)}" target="_blank" rel="noopener"><img class="event-review-image" src="${esc(source)}" alt="Submitted ${label.toLowerCase()}"></a>` : '<p class="fine">Not provided.</p>'}</section>`;
  return `<div class="event-review-details"><p class="eyebrow blue">${esc(statusLabel(event.status))} · Revision ${esc(event.revision)}</p><dl>${detail('Organizer', event.host)}${detail('Organizer profile', event.hostBio)}${detail('Public contact', event.hostContact)}${detail('Account name', owner?.name)}${detail('Verified account email', owner?.email)}${detail('Sport', event.sport)}${detail('Format', event.type)}${detail('Date and start time (IST)', event.date + ' · ' + event.time)}${detail('Duration', event.duration + ' minutes')}${detail('Neighbourhood', event.area)}${detail('Venue', event.venue)}${detail('Capacity', event.capacity)}${detail('Price per player', 'INR ' + event.price)}${detail('Payment methods', event.price ? event.paymentMethods : 'Free entry')}${detail('Description / eligibility', event.description)}${detail('Included', event.included)}${detail('What to bring', event.bring)}${detail('Cancellation policy', event.cancellation)}${detail('Review note', event.reviewNote)}</dl>${image('Cover image', event.coverImage)}${image('Payment QR', event.qrImage)}<p class="fine">QR destinations are not opened automatically. Check the payee and payment details before approving.</p>${event.status === 'pending_review' ? `<form id="native-event-review"><label>Review note (required when requesting changes)<textarea name="note" maxlength="1000" rows="3"></textarea></label><p role="alert" class="error" tabindex="-1"></p><div class="action-row"><button type="submit" name="decision" value="approve" class="button primary">Approve and publish</button><button type="submit" name="decision" value="reject" class="button outline danger">Request changes</button></div></form>` : ''}</div>`;
}

export function mountEventReviews(ctx, refresh) {
  ctx.main.querySelectorAll('[data-event-review]').forEach(button => {
    button.onclick = async () => {
      button.disabled = true;
      try {
        const {event, owner} = await ctx.api('admin/events/' + encodeURIComponent(button.dataset.eventReview));
        if (!button.isConnected) return;
        const sheet = ctx.openSheet(event.title, eventReviewMarkup(event, owner));
        const form = sheet.querySelector('#native-event-review');
        if (!form) return;
        let busy = false;
        const images = [...sheet.querySelectorAll('.event-review-image')];
        const approve = form.querySelector('[value="approve"]');
        const imagesReady = () => images.every(image => image.complete && image.naturalWidth > 0);
        const updateImages = () => { approve.disabled = busy || !imagesReady(); };
        images.forEach(image => {
          image.addEventListener('load', updateImages, {once:true});
          image.addEventListener('error', () => {
            form.querySelector('[role="alert"]').textContent = 'An image could not be loaded. Reopen this review before approving, or request a corrected image.';
            updateImages();
          }, {once:true});
        });
        updateImages();
        form.onsubmit = async submission => {
          submission.preventDefault();
          const decision = submission.submitter?.value;
          if (busy || !sheet.open || !['approve','reject'].includes(decision) || (decision === 'approve' && !imagesReady())) return;
          busy = true;
          const buttons = [...form.querySelectorAll('button')];
          buttons.forEach(button => { button.disabled = true; });
          const alert = form.querySelector('[role="alert"]');
          alert.textContent = '';
          try {
            await ctx.api('admin/events/' + encodeURIComponent(event.id) + '/review', {decision,revision:event.revision,note:new FormData(form).get('note')});
            if (!sheet.open || !button.isConnected) return;
            sheet.close();
            ctx.toast(decision === 'approve' ? 'Event approved and published.' : 'Changes requested. The event stays private.');
            await refresh();
          } catch (error) {
            if (error.name === 'AbortError' || !sheet.open) return;
            alert.textContent = error.message;
            alert.focus();
          } finally {
            busy = false;
            buttons.forEach(button => { button.disabled = false; });
            updateImages();
          }
        };
      } catch (error) { if (error.name !== 'AbortError') ctx.toast(error.message); }
      finally { button.disabled = false; }
    };
  });
}
