import { validateDraft } from './domain.js';

// Keep only public event-draft fields, never sessions, passwords or attendee data.
const EVENT_FIELDS = new Set([
  'title', 'sport', 'format', 'area', 'date', 'time', 'venue',
  'level', 'capacity', 'price', 'description', 'included', 'bring', 'cancellation'
]);
const RECOVERY_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const STEPS = [
  { label: 'The essentials', indices: [0, 1] },
  { label: 'Player details', indices: [2, 3] },
  { label: 'Review & save', indices: [4] }
];
const enc = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function organizerRecoveryKey(editId) {
  return 'mercury:organizer-draft:' + String(editId || 'new').replace(/[^a-zA-Z0-9-]/g, '');
}

export function readOrganizerRecovery(store, key, revision = null, now = Date.now()) {
  try {
    const item = JSON.parse(store?.getItem(key) || 'null');
    if (!item || item.version !== 1 || item.revision !== revision ||
        typeof item.savedAt !== 'number' || now - item.savedAt > RECOVERY_MAX_AGE_MS ||
        item.savedAt > now || !item.values || typeof item.values !== 'object') return null;
    return Object.fromEntries(Object.entries(item.values).filter(([name, value]) =>
      EVENT_FIELDS.has(name) && typeof value === 'string' && value.length <= 2000));
  } catch { return null; }
}

export function writeOrganizerRecovery(store, key, revision, values, now = Date.now()) {
  try {
    if (!store?.setItem) return false;
    const safe = Object.fromEntries(Object.entries(values).filter(([name, value]) =>
      EVENT_FIELDS.has(name) && typeof value === 'string' && value.length <= 2000));
    store.setItem(key, JSON.stringify({ version: 1, revision, savedAt: now, values: safe }));
    return true;
  } catch { return false; }
}

export function clearOrganizerRecovery(store, key) {
  try { store?.removeItem(key); } catch { /* Restricted storage must not block saving. */ }
}

function errorForStep(form, panel, errors) {
  const names = new Set([...panel.querySelectorAll('[name]')].map(field => field.name));
  const entry = Object.entries(errors).find(([name]) => names.has(name));
  if (!entry) return null;
  const [name, message] = entry;
  return { field: form.elements.namedItem(name), name, message };
}

export function mountOrganizerJourney(form, {
  editId = null, revision = null, locked = false,
  storage = typeof sessionStorage === 'undefined' ? null : sessionStorage
} = {}) {
  if (!form || locked) return { goTo: () => {}, clear: () => {} };
  const fieldset = form.querySelector('fieldset');
  const sections = [...form.querySelectorAll('.editor-section')];
  if (!fieldset || sections.length !== 5) return { goTo: () => {}, clear: () => {} };
  const document = form.ownerDocument;
  const key = organizerRecoveryKey(editId);
  const recovered = readOrganizerRecovery(storage, key, revision);
  if (recovered) for (const [name, value] of Object.entries(recovered)) {
    const field = form.elements.namedItem(name);
    if (field?.tagName === 'INPUT' || field?.tagName === 'SELECT' || field?.tagName === 'TEXTAREA')
      field.value = value;
  }

  const progress = document.createElement('div');
  progress.className = 'organizer-progress';
  progress.setAttribute('aria-label', 'Event editor progress');
  const progressItems = [];
  STEPS.forEach(({ label }, i) => {
    const item = document.createElement('span');
    item.className = 'organizer-progress-item';
    item.textContent = String(i + 1).padStart(2, '0') + '  ' + label;
    progress.appendChild(item);
    progressItems.push(item);
  });
  const saveState = document.createElement('p');
  saveState.className = 'organizer-save-state';
  saveState.setAttribute('role', 'status');
  saveState.textContent = recovered
    ? 'Your unsaved edits were restored from this tab.'
    : 'Unsaved changes stay in this tab. Nothing is published until you publish a saved event.';

  const panels = STEPS.map(({ indices }, step) => {
    const panel = document.createElement('div');
    panel.className = 'organizer-step';
    panel.dataset.step = String(step);
    panel.setAttribute('aria-label', STEPS[step].label);
    for (const i of indices) panel.appendChild(sections[i]);
    fieldset.appendChild(panel);
    return panel;
  });
  fieldset.prepend(saveState);
  fieldset.prepend(progress);

  const review = document.createElement('div');
  review.className = 'organizer-review-facts';
  review.setAttribute('aria-label', 'Event summary to review');
  panels[2].prepend(review);

  const errorBox = document.createElement('p');
  errorBox.className = 'organizer-step-alert';
  errorBox.setAttribute('role', 'alert');
  errorBox.hidden = true;
  const actions = document.createElement('div');
  actions.className = 'organizer-step-actions';
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'button outline';
  back.textContent = '← Back';
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'button primary';
  next.textContent = 'Continue →';
  actions.append(back, next);
  fieldset.append(errorBox, actions);

  let step = 0;
  const clearStepError = () => {
    errorBox.textContent = '';
    errorBox.hidden = true;
    form.querySelectorAll('.organizer-step-field-error').forEach(node => node.remove());
    form.querySelectorAll('[data-organizer-invalid]').forEach(field => {
      field.removeAttribute('data-organizer-invalid');
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    });
  };
  const renderReview = () => {
    const values = Object.fromEntries(new FormData(form));
    const facts = [
      ['Game', values.title || 'Untitled'],
      ['Sport & format', [values.sport, values.format].filter(Boolean).join(' · ')],
      ['When', values.date ? values.date + ' · ' + (values.time || 'time not chosen') + ' IST' : 'Date not chosen'],
      ['Where', [values.venue, values.area].filter(Boolean).join(' · ')],
      ['Players', (values.capacity || '?') + ' places · ' + (values.level || 'All levels')],
      ['Entry', Number(values.price) === 0 ? 'Free — eligible to publish' : '₹' + (values.price || '?') + ' per player — draft only']
    ];
    review.innerHTML = '<p class="eyebrow blue">YOUR GAME AT A GLANCE</p>' +
      facts.map(([label, value]) =>
        '<div class="organizer-review-row"><span>' + enc(label) + '</span><strong>' + enc(value) + '</strong></div>'
      ).join('');
  };

  const show = (index, { focus = false, scroll = false } = {}) => {
    step = Math.min(Math.max(0, index), STEPS.length - 1);
    clearStepError();
    panels.forEach((panel, i) => { panel.hidden = i !== step; });
    progressItems.forEach((item, i) => {
      item.classList.toggle('current', i === step);
      if (i === step) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    back.hidden = step === 0;
    next.hidden = step === STEPS.length - 1;
    if (step === STEPS.length - 1) renderReview();
    if (scroll) form.scrollIntoView?.({ block: 'start', behavior: 'auto' });
    if (focus) {
      const heading = panels[step].querySelector('h3') || panels[step];
      heading.tabIndex = -1;
      heading.focus?.({ preventScroll: true });
    }
  };

  const showFieldError = error => {
    if (!error) return;
    errorBox.textContent = error.message;
    errorBox.hidden = false;
    const field = error.field;
    if (!field?.setAttribute) return;
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('data-organizer-invalid', '');
    const help = document.createElement('span');
    help.className = 'field-error organizer-step-field-error';
    help.id = 'organizer-' + error.name + '-error';
    help.textContent = error.message;
    field.after(help);
    field.setAttribute('aria-describedby', help.id);
    field.focus?.({ preventScroll: true });
  };

  const validatePanel = index => {
    clearStepError();
    const data = Object.fromEntries(new FormData(form));
    const { errors } = validateDraft(data);
    const error = errorForStep(form, panels[index], errors);
    if (error) {
      showFieldError(error);
      return false;
    }
    const invalid = [...panels[index].querySelectorAll('input,select,textarea')]
      .find(field => !field.disabled && !field.checkValidity());
    if (invalid) {
      invalid.reportValidity?.();
      invalid.focus?.();
      return false;
    }
    return true;
  };

  back.addEventListener('click', () => show(step - 1, { focus: true, scroll: true }));
  next.addEventListener('click', () => {
    if (validatePanel(step)) show(step + 1, { focus: true, scroll: true });
  });
  form.addEventListener('submit', event => {
    const { errors } = validateDraft(Object.fromEntries(new FormData(form)));
    if (!Object.keys(errors).length) return;
    const firstStep = panels.findIndex(panel => errorForStep(form, panel, errors));
    if (firstStep < 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    show(firstStep, { scroll: true });
    showFieldError(errorForStep(form, panels[firstStep], errors));
  }, true);

  const save = () => {
    const values = Object.fromEntries(new FormData(form));
    const ok = writeOrganizerRecovery(storage, key, revision, values);
    saveState.textContent = ok
      ? 'Unsaved changes kept in this tab. Save draft to keep them in your account.'
      : 'Changes are not saved on this device. Use Save draft when your details are ready.';
    if (step === STEPS.length - 1) renderReview();
  };
  form.addEventListener('input', save);
  form.addEventListener('change', save);
  show(0);
  const controller = {
    goTo: index => show(index, { focus: true, scroll: true }),
    clear: () => clearOrganizerRecovery(storage, key),
    get step() { return step; }
  };
  form.__mercuryWizard = controller;
  return controller;
}

export function filterRosterEntries(entries, query = '', uncheckedOnly = false) {
  const needle = String(query || '').trim().toLocaleLowerCase();
  return entries.filter(entry =>
    (!uncheckedOnly || entry.status === 'confirmed') &&
    (!needle || [entry.player_name, entry.id, entry.level].join(' ').toLocaleLowerCase().includes(needle)));
}

export function mountRosterSearch(root, { query = '', uncheckedOnly = false } = {}) {
  const input = root.querySelector('#roster-search');
  const pending = root.querySelector('#roster-unchecked');
  const count = root.querySelector('#roster-result-count');
  if (!input || !pending || !count) return;
  const rows = [...root.querySelectorAll('.roster-row')];
  input.value = query;
  pending.checked = uncheckedOnly;
  const update = () => {
    const needle = input.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const row of rows) {
      const matches = (!pending.checked || row.dataset.status === 'confirmed') &&
        (!needle || row.textContent.toLocaleLowerCase().includes(needle));
      row.hidden = !matches;
      if (matches) visible++;
    }
    count.textContent = visible
      ? 'Showing ' + visible + ' of ' + rows.length + ' players'
      : rows.length ? 'No players match. Try a name or pass reference.' : 'Registrations will appear here.';
  };
  input.addEventListener('input', update);
  pending.addEventListener('change', update);
  update();
}
