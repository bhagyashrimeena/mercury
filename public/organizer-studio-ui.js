// Mercury's organizer choice and private Studio introduction.
// Pure, escaped markup. Does not change registration permissions or payments.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function studioWelcomeMarkup({ organizer = null, events = [], editing = false } = {}) {
  const hasProfile = Boolean(organizer);
  const hasDraft = events.length > 0;
  const hasPublished = events.some(event => event.status === 'published');
  const title = !hasProfile
    ? 'Start with a club.<br><em>Build your first game.</em>'
    : editing
      ? 'Your next game.<br><em>Getting closer.</em>'
      : 'Your events.<br><em>In motion.</em>';
  const sub = !hasProfile
    ? 'Add your organizer identity once, then create a game and decide when to publish.'
    : 'Create, share and manage free games from one place. You control the details and your player list.';
  const pathLabel = hasProfile ? 'Continue creating a free game' : 'Set up organizer profile';
  return '<section class="host-playbook-hero" aria-labelledby="host-playbook-title">' +
    '<div class="host-playbook-copy">' +
    '<p class="eyebrow">MERCURY STUDIO / FOR THE GAME-MAKERS</p>' +
    '<h1 id="host-playbook-title">' + title + '</h1>' +
    '<p>' + sub + '</p>' +
    '<div class="host-playbook-actions">' +
    '<a href="#organizer-setup" class="button lime">' + pathLabel + ' <span aria-hidden="true">↘</span></a>' +
    '<a href="/list-event" class="host-playbook-alternative">Already have a booking website? Showcase it instead ↗</a>' +
    '</div></div>' +
    '<div class="host-playbook-art" aria-hidden="true"><svg viewBox="0 0 350 250" preserveAspectRatio="xMidYMid meet" focusable="false">' +
    '<path d="M-45 210 C45 15 105 255 191 92 S315 30 407 -26" fill="none" stroke="#D9FF38" stroke-width="24" stroke-linecap="round"/>' +
    '<path d="M-45 210 C45 15 105 255 191 92 S315 30 407 -26" fill="none" stroke="#10131A" stroke-width="2" stroke-dasharray="11 16"/>' +
    '<circle cx="200" cy="91" r="52" fill="none" stroke="#FFFFFF" stroke-opacity=".32" stroke-width="2"/>' +
    '<circle cx="200" cy="91" r="25" fill="none" stroke="#FFFFFF" stroke-opacity=".25" stroke-width="2"/>' +
    '</svg><span>01 / 02 / 03</span></div></section>' +
    '<div class="host-studio-steps" aria-label="Your organizer setup progress">' +
    '<div class="host-studio-step ' + (hasProfile ? 'is-done' : 'is-current') + '"><span>01</span><strong>Organizer profile</strong><small>' + (hasProfile ? 'Saved' : 'Start here') + '</small></div>' +
    '<div class="host-studio-step ' + (hasDraft ? 'is-done' : hasProfile ? 'is-current' : '') + '"><span>02</span><strong>Create an event</strong><small>' + (hasDraft ? 'Event created' : 'Save a private draft') + '</small></div>' +
    '<div class="host-studio-step ' + (hasPublished ? 'is-done' : '') + '"><span>03</span><strong>Welcome players</strong><small>' + (hasPublished ? 'Free game published' : 'Publish and share') + '</small></div>' +
    '</div>' +
    '<p class="host-studio-availability" role="note"><strong>Free bookings only during the pilot.</strong> Players can book free adult events on Mercury. Paid events remain private drafts; Mercury does not collect payments or issue paid passes.</p>';
}

export function studioEmptyStateMarkup({ organizer = null } = {}) {
  const hasProfile = Boolean(organizer);
  return '<div class="host-empty-events">' +
    '<div class="host-empty-mark" aria-hidden="true">↗</div>' +
    '<p class="eyebrow blue">' + (hasProfile ? 'READY FOR YOUR FIRST EVENT' : 'FIRST THINGS FIRST') + '</p>' +
    '<h3>' + (hasProfile ? 'Your first game is a draft away.' : 'Your first event starts here.') + '</h3>' +
    '<p>' + (hasProfile
      ? 'Add the venue, date and player details. Preview before publishing. Your published free games and participant lists will appear here.'
      : 'Save your organizer profile to unlock the event editor. There is no need to publish anything yet.') + '</p>' +
    (hasProfile
      ? '<a class="text-link" href="#event-form">Create your first free game ↗</a>'
      : '<a class="text-link" href="#organizer-profile">Complete organizer setup ↗</a>') +
    '</div>';
}
