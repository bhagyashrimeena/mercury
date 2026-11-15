const shape = className => `<span class="loading-shape ${className}"></span>`;
const lines = (classes = ['wide', 'medium', 'short']) =>
  `<div class="loading-lines">${classes.map(name => shape(`loading-line ${name}`)).join('')}</div>`;
const pills = count => `<div class="loading-pills">${Array.from({ length: count }, () => shape('loading-pill')).join('')}</div>`;
const intro = () => `<div class="loading-intro">${shape('loading-eyebrow')}${shape('loading-title')}${shape('loading-subtitle')}</div>`;
const card = () => `<div class="loading-card">${shape('loading-card-image')}<div class="loading-card-copy">${lines(['short', 'wide', 'medium'])}</div></div>`;

function detail() {
  return `${shape('loading-back')}${shape('loading-cover')}
    <div class="loading-detail-grid">
      <div class="loading-panel loading-detail-copy">${pills(3)}${shape('loading-heading')}${shape('loading-byline')}
        <div class="loading-facts">${Array.from({ length: 4 }, () => `<div class="loading-fact">${shape('loading-fact-icon')}${lines(['medium', 'wide'])}</div>`).join('')}</div>
        ${shape('loading-section-title')}${lines(['wide', 'wide', 'medium'])}${shape('loading-section-title')}${lines(['wide', 'short'])}
      </div>
      <aside class="loading-panel loading-side">${shape('loading-eyebrow')}${shape('loading-price')}${lines(['medium', 'short'])}${shape('loading-action')}${shape('loading-action')}${shape('loading-caption')}</aside>
    </div>`;
}

function form() {
  return `${intro()}<div class="loading-form-grid">
    <div class="loading-panel loading-form">${shape('loading-section-title')}
      ${Array.from({ length: 3 }, () => `<div class="loading-field">${shape('loading-label')}${shape('loading-input')}</div>`).join('')}
      ${shape('loading-field-tall')}${shape('loading-action')}</div>
    <aside class="loading-panel loading-form-aside">${shape('loading-card-image')}${shape('loading-section-title')}${lines(['wide', 'medium', 'short'])}</aside>
  </div>`;
}

function dashboard() {
  return `${intro()}<div class="loading-dashboard-toolbar">${shape('loading-input')}${pills(2)}</div>
    <div class="loading-card-grid">${Array.from({ length: 3 }, card).join('')}</div>
    ${shape('loading-section-title')}
    <div class="loading-card-grid">${Array.from({ length: 2 }, card).join('')}</div>`;
}

function pass() {
  return `${intro()}<div class="loading-panel loading-pass">${pills(2)}${shape('loading-heading')}
    ${lines(['medium', 'short'])}<div class="loading-facts">${Array.from({ length: 4 }, () => `<div class="loading-fact">${shape('loading-fact-icon')}${lines(['medium', 'wide'])}</div>`).join('')}</div>
    ${shape('loading-action')}${shape('loading-caption')}</div>`;
}

const content = { listing: detail, event: detail, register: form, account: form, host: dashboard, roster: dashboard, admin: dashboard, 'my-games': dashboard, booking: pass };
const labels = { listing: 'listing', event: 'game', register: 'booking form', account: 'account', host: 'organizer studio', roster: 'attendee roster', admin: 'owner desk', 'my-games': 'your games', booking: 'game pass' };

export function routeLoadingMarkup(route) {
  const key = Object.hasOwn(content, route) ? route : 'page';
  const layout = content[key] || dashboard;
  return `<span class="sr-only" role="status">Loading ${labels[key] || 'page'}.</span>
    <div class="page-width loading-view loading-${key}" aria-hidden="true">${layout()}</div>`;
}

export function renderRouteLoading(main, route) {
  main.innerHTML = routeLoadingMarkup(route);
}

export function savedLoadingMarkup(label) {
  const safeLabel = String(label).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  return `<span class="sr-only" role="status">Loading ${safeLabel}.</span><div class="saved-games-pending" aria-hidden="true">${card()}${card()}</div>`;
}
