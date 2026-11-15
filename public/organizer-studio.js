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
  const state = event.status === 'cancelled' ? 'cancelled' : event.status === 'draft' ? 'draft'
    : Number(event.startsAt) <= Date.now() ? 'past' : Number(event.registered) >= Number(event.capacity) ? 'full' : 'published';
  return `<article class="manage-card organizer-event-card"><div class="organizer-card-top"><span class="state state-${state}">${state}</span><button class="studio-icon" type="button" data-event-menu="${esc(event.id)}" aria-haspopup="dialog" aria-label="Actions for ${esc(event.title)}" title="Event actions">${studioIcon('more')}</button></div><h3 title="${esc(event.title)}">${esc(event.title)}</h3><p class="organizer-event-meta">${esc(dateLabel(event))} · ${esc(timeLabel(event))} IST</p><p class="organizer-event-meta">${esc(event.registered)} / ${esc(event.capacity)} players · ${Number(event.price) ? '₹' + esc(event.price) + ' per player' : 'Free'}</p><p class="organizer-event-hint">${event.pendingCount ? `${esc(event.pendingCount)} registration${event.pendingCount === 1 ? '' : 's'} awaiting your review` : event.status === 'draft' ? 'Private draft · publish from the event menu' : event.status === 'cancelled' ? 'Registration is closed' : 'Bring your people. Share your event.'}</p><div class="organizer-primary-action"><a class="button primary" href="/participants/${encodeURIComponent(event.id)}">Manage players ↗</a></div></article>`;
}

export function organizerMenuMarkup(event) {
  const id = encodeURIComponent(event.id);
  const publicPage = event.status !== 'draft';
  return `<div class="studio-event-menu">${event.status === 'draft' ? '<button type="button" data-studio-action="publish">Publish event ↗</button>' : ''}
    ${publicPage ? `<button type="button" data-studio-copy>Copy link</button><a href="/event/${id}">View page ↗</a>` : ''}
    <a href="/host/${id}">${event.status === 'cancelled' ? 'View details' : 'Edit details'} ↗</a>
    ${event.status === 'published' && !Number(event.registered) ? '<button type="button" data-studio-action="unpublish">Return to draft</button>' : ''}
    ${event.status !== 'cancelled' ? '<button class="danger" type="button" data-studio-action="cancel">Cancel event</button>' : ''}</div>`;
}

export function publicationMarkup(id, title) {
  return `<div class="publication-body"><div class="publication-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><span>${studioIcon('trophy')}</span></div><p class="eyebrow blue">LET THE GAMES BEGIN</p><p><strong>${esc(title)}</strong> is ready for its first players. Share it and get your people together.</p><div class="publication-actions"><a class="button primary" href="/event/${encodeURIComponent(id)}">Go to tournament ↗</a><a class="button outline" href="/">Home</a></div></div>`;
}
