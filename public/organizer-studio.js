import { sportPhoto } from './sport-media.js';
import { dateLabel, timeLabel } from './data.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const paths = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="m16 3 5 5-12 12-6 1 1-6L16 3Z"/><path d="m14 5 5 5"/>',
  more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 11-1l3 6M4 12l3 6a7 7 0 0 0 11-1"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  trophy: '<path d="M7 3h10v6a5 5 0 0 1-10 0V3Zm5 11v5m-4 2h8M7 5H3v3a4 4 0 0 0 5 4m9-7h4v3a4 4 0 0 1-5 4"/>'
};
export const studioIcon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.plus}</svg>`;

export function organizerDashboardMarkup(events) {
  return `<div class="organizer-dashboard"><div class="studio-heading"><section class="page-intro"><p class="eyebrow blue">FOR THE GAME-MAKERS</p><h1>Bring people<br>into <em>play.</em></h1><p>Your organizer studio. Host a tournament, welcome your players, make it a good game.</p></section><nav class="studio-toolbar" aria-label="Organizer tools"><a class="studio-icon" href="/host/new" aria-label="Create event" title="Create event">${studioIcon('plus')}</a><a class="studio-icon" href="/host/profile" aria-label="Edit organizer profile" title="Edit organizer profile">${studioIcon('edit')}</a></nav></div>
    <section class="organizer-events" aria-labelledby="your-events"><h2 id="your-events">Your events</h2>${events.length
      ? `<div class="host-event-list">${events.map(organizerEventCard).join('')}</div>`
      : `<div class="studio-empty"><span class="studio-empty-art" aria-hidden="true">✳</span><h3>Minimalism is good.<br><em>But not here.</em></h3><p>Your next tournament deserves a crowd.</p><a class="button primary" href="/host/new">Host your first tournament now ↗</a></div>`}</section></div>`;
}

export function organizerEventCard(event) {
  const state = event.status === 'cancelled' ? 'cancelled' : ['draft','pending_review','rejected'].includes(event.status) ? event.status
    : Number(event.startsAt) <= Date.now() ? 'past' : Number(event.registered) >= Number(event.capacity) ? 'full' : 'published';
  const media = sportPhoto(event);
  const publicPage = event.isPublic ?? ['published','cancelled'].includes(event.status);
  const href = (publicPage ? '/event/' : '/host/') + encodeURIComponent(event.id);
  const menuId = 'event-menu-' + encodeURIComponent(event.id);
  return `<article class="manage-card organizer-event-card"><a class="organizer-card-visual" href="${href}" aria-label="${publicPage ? 'View tournament' : 'View submission'}: ${esc(event.title)}"><img class="sport-stock-img" src="${esc(media.src)}" alt="" loading="lazy" width="560" height="440"><span class="organizer-cover-label" title="${esc(media.credit)}">${media.source === 'stock' ? 'Illustrative photo' : 'Your event photo'}</span><div class="organizer-card-copy"><div class="organizer-title-row"><h3>${esc(event.title)}</h3><span class="state state-${state}">${state === 'pending_review' ? 'Under review' : state === 'rejected' ? 'Changes requested' : state}</span></div><p class="organizer-event-meta">${esc(dateLabel(event))} · ${esc(timeLabel(event))} IST</p><p class="organizer-event-meta">${esc(event.registered)} / ${esc(event.capacity)} players · ${Number(event.price) ? '₹' + esc(event.price) + ' per player' : 'Free'}</p><p class="organizer-event-hint">${event.cancellationCount ? `${esc(event.cancellationCount)} cancellation${event.cancellationCount === 1 ? '' : 's'} to resolve` : event.pendingCount ? `${esc(event.pendingCount)} registration${event.pendingCount === 1 ? '' : 's'} awaiting your review` : event.status === 'pending_review' ? 'Mercury is reviewing your event' : event.status === 'rejected' ? esc(event.reviewNote || 'Edit your event and resubmit for review') : event.status === 'draft' ? 'Private draft' : event.status === 'cancelled' ? 'Registration is closed' : 'Bring your people. Share your event.'}</p></div></a><details class="organizer-card-actions" data-event-menu="${esc(event.id)}"><summary class="studio-icon" aria-expanded="false" aria-controls="${menuId}" aria-label="Actions for ${esc(event.title)}" title="Event actions">${studioIcon('more')}</summary><div id="${menuId}" class="studio-event-menu">${organizerMenuMarkup(event)}</div></details><div class="organizer-primary-action"><a class="button primary" href="/participants/${encodeURIComponent(event.id)}">Manage players ↗</a></div></article>`;
}

export function organizerMenuMarkup(event) {
  const id = encodeURIComponent(event.id);
  const publicPage = event.isPublic ?? ['published','cancelled'].includes(event.status);
  return `${['draft','rejected'].includes(event.status) ? '<button type="button" data-studio-action="submit">Send for review ↗</button>' : ''}
    ${publicPage ? `<button type="button" data-studio-copy>Copy link</button><a href="/event/${id}">View page ↗</a>` : ''}
    <a href="/host/${id}">${event.status === 'cancelled' ? 'View details' : 'Edit details'} ↗</a>
    ${event.status === 'published' && !Number(event.registered) ? '<button type="button" data-studio-action="unpublish">Return to draft</button>' : ''}
    ${event.status !== 'cancelled' ? '<button class="danger" type="button" data-studio-action="cancel">Cancel event</button>' : ''}<label class="share-label" data-copy-fallback hidden>Copy event link<input readonly value="/event/${id}"></label>`;
}

export function submissionMarkup(id, title) {
  return `<div class="publication-body"><div class="publication-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><span>${studioIcon('trophy')}</span></div><p class="eyebrow blue">ONE STEP CLOSER</p><p><strong>${esc(title)}</strong> has been sent to Mercury for review. We will check the event details, cover image and payment QR before it goes live. Track its status in Your events.</p><div class="publication-actions"><a class="button primary" href="/host/${encodeURIComponent(id)}">View submission ↗</a><a class="button outline" href="/">Home</a></div></div>`;
}

export function mountOrganizerMenus(root, {events, onCopy, onAction}) {
  const controller = new AbortController();
  const options = {signal:controller.signal};
  const document = root.ownerDocument;
  const menus = [...root.querySelectorAll('details[data-event-menu]')];
  const close = except => menus.forEach(menu => { if (menu !== except) menu.open = false; });
  const position = details => {
    const menu = details.querySelector('.studio-event-menu');
    const anchor = details.querySelector('summary').getBoundingClientRect();
    const view = document.defaultView;
    const width = menu.offsetWidth, height = menu.offsetHeight;
    const below = anchor.bottom + 6;
    menu.style.position = 'fixed';
    menu.style.right = 'auto';
    menu.style.left = Math.max(8, Math.min(anchor.right - width, view.innerWidth - width - 8)) + 'px';
    menu.style.top = Math.max(8, Math.min(below + height <= view.innerHeight - 8 ? below : anchor.top - height - 6, view.innerHeight - height - 8)) + 'px';
  };
  for (const details of menus) {
    const event = events.find(event => event.id === details.dataset.eventMenu);
    details.addEventListener('toggle', () => {
      details.querySelector('summary').setAttribute('aria-expanded', String(details.open));
      if (details.open) { close(details); position(details); }
    }, options);
    details.querySelector('[data-studio-copy]')?.addEventListener('click', async () => {
      if (await onCopy(event, details)) details.open = false;
      else if (details.isConnected && details.open) position(details);
    }, options);
    details.querySelectorAll('[data-studio-action]').forEach(button => button.addEventListener('click', () => {
      details.open = false;
      onAction(button.dataset.studioAction, event);
    }, options));
    details.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { details.open = false; }, options));
  }
  document.addEventListener('pointerdown', event => {
    for (const menu of menus) if (menu.open && !menu.contains(event.target)) menu.open = false;
  }, options);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const open = menus.find(menu => menu.open);
    if (open) { event.preventDefault(); open.open = false; open.querySelector('summary').focus(); }
  }, options);
  document.addEventListener('scroll', event => {
    if (!menus.some(menu => menu.open && menu.querySelector('.studio-event-menu').contains(event.target))) close();
  }, {...options,capture:true});
  document.defaultView.addEventListener('resize', () => close(), options);
  return () => { controller.abort(); close(); };
}
