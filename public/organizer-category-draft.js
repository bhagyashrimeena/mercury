// Optional, client-side category details for Mercury's external event intake.
// These drafts are unverified suggestions for a human reviewer, never published listings.
import { CATEGORY_ENTRY_UNITS, categoryReviewLine } from './category-contract.js';

export const CATEGORY_LIMIT = 6;
export const CATEGORY_UNITS = CATEGORY_ENTRY_UNITS;

const trim = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const esc = value => trim(value).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function categoryDraftMarkup() {
  return '<section class="organizer-category-draft" id="organizer-category-draft" aria-labelledby="organizer-category-heading">' +
    '<div class="organizer-category-heading"><div><p class="organizer-form-kicker">02 / OPTIONAL EVENT DIVISIONS</p>' +
    '<h3 id="organizer-category-heading">Different categories or fees?</h3>' +
    '<p>List each distance, singles/doubles division, or team entry separately if the rules or fees differ. Skip this if you only have one general entry.</p></div></div>' +
    '<div id="organizer-category-rows" class="organizer-category-rows"></div>' +
    '<button type="button" id="organizer-add-category" class="button outline organizer-category-add">+ Add a category</button>' +
    '<p class="fine">Up to six optional categories. A reviewer will verify every detail against your official event page before any publication.</p>' +
    '<div id="organizer-category-preview" class="organizer-category-preview" aria-live="polite" aria-atomic="true"></div>' +
    '</section>';
}

const feeHasPublishedValue = fee =>
  /(?:₹|€|£|\$|\b(?:INR|EUR|USD|GBP|Rs\.?)\b)\s*\d/i.test(fee) ||
  /\b(?:free|no fee|to confirm|not published|see organizer)\b/i.test(fee);
const containsFeeUnit = fee => /\bper\s+(?:player|person|pair|team|entry|category|distance)\b/i.test(fee);

export function validateCategoryDrafts(rows) {
  const errors = [];
  if (!Array.isArray(rows)) return { categories: [], errors: ['Category details could not be read.'] };
  if (rows.length > CATEGORY_LIMIT) errors.push('Add no more than six categories.');
  const categories = [];
  for (const [index, raw] of rows.slice(0, CATEGORY_LIMIT).entries()) {
    const name = trim(raw?.name);
    const fee = trim(raw?.fee);
    const unit = trim(raw?.unit);
    const notes = trim(raw?.notes);
    const n = index + 1;
    if (name.length < 2 || name.length > 80)
      errors.push('Category ' + n + ': enter a category or distance name (2–80 characters).');
    if (fee.length < 2 || fee.length > 65 || !feeHasPublishedValue(fee))
      errors.push('Category ' + n + ': state the currency (e.g. ₹800), Free, or Fee to confirm.');
    if (containsFeeUnit(fee))
      errors.push('Category ' + n + ': put the fee unit in the selector instead of repeating "per player/pair/team" in the amount.');
    if (!Object.hasOwn(CATEGORY_UNITS, unit))
      errors.push('Category ' + n + ': choose whether the fee covers a player, pair, team, category or distance.');
    if (notes.length > 150)
      errors.push('Category ' + n + ': shorten eligibility and format notes to 150 characters.');
    if (name.length >= 2 && name.length <= 80 && fee.length >= 2 && fee.length <= 65 &&
      Object.hasOwn(CATEGORY_UNITS, unit) && notes.length <= 150 &&
      feeHasPublishedValue(fee) && !containsFeeUnit(fee)) {
      categories.push({ name, fee: fee + ' ' + CATEGORY_UNITS[unit], notes,
        entryUnit: unit, reviewStatus: 'unverified-submission' });
    }
  }
  const names = new Set();
  for (const category of categories) {
    const key = category.name.toLocaleLowerCase('en-IN');
    if (names.has(key)) errors.push('Each category needs a distinct name.');
    names.add(key);
  }
  return { categories, errors };
}

export function categoryDraftReviewText(categories = []) {
  if (!categories.length) return '';
  return 'Proposed categories (UNVERIFIED; verify against official source):\n' +
    categories.map((item, i) => (i + 1) + '. ' + categoryReviewLine(item) +
      ' [entry_unit=' + (Object.hasOwn(CATEGORY_UNITS, item.entryUnit) ? item.entryUnit : 'unknown') + ']').join('\n');
}

export function readCategoryDraft(root) {
  if (!root) return { categories: [], errors: [] };
  const rows = [...root.querySelectorAll('.organizer-category-edit')].map(row => {
    const value = name => row.querySelector('[data-category-field="' + name + '"]')?.value ?? '';
    return { name: value('name'), fee: value('fee'), unit: value('unit'), notes: value('notes') };
  });
  return validateCategoryDrafts(rows);
}

export function mountCategoryDraft(main, onChange = () => {}) {
  const root = main.querySelector('#organizer-category-draft');
  if (!root) return;
  const rows = root.querySelector('#organizer-category-rows');
  const add = root.querySelector('#organizer-add-category');
  const preview = root.querySelector('#organizer-category-preview');
  const renderPreview = () => {
    const fields = [...rows.querySelectorAll('.organizer-category-edit')].map(row => {
      const value = name => trim(row.querySelector('[data-category-field="' + name + '"]')?.value);
      return { name: value('name'), fee: value('fee'), unit: value('unit'), notes: value('notes') };
    });
    const clean = fields.filter(row => row.name || row.fee || row.notes);
    preview.innerHTML = clean.length
      ? '<strong>Category preview · not published</strong><ul>' +
        clean.map(row => '<li><b>' + esc(row.name || 'Category name needed') + '</b> · ' +
          esc(row.fee || 'Fee needed') + (CATEGORY_UNITS[row.unit] ? ' ' + esc(CATEGORY_UNITS[row.unit]) : ' · Fee unit needed') +
          (row.notes ? '<small>' + esc(row.notes) + '</small>' : '') + '</li>').join('') +
        '</ul>'
      : '';
    add.disabled = rows.querySelectorAll('.organizer-category-edit').length >= CATEGORY_LIMIT;
    onChange();
  };
  add.addEventListener('click', () => {
    if (rows.children.length >= CATEGORY_LIMIT) return;
    const row = document.createElement('div');
    row.className = 'organizer-category-edit';
    row.innerHTML =
      '<div class="organizer-category-edit-title"><span class="organizer-category-number">Category</span>' +
      '<button type="button" class="text-link organizer-remove-category" aria-label="Remove this category">Remove</button></div>' +
      '<div class="organizer-category-fields">' +
      '<label>Category or distance<input type="text" data-category-field="name" minlength="2" maxlength="80" placeholder="e.g. Open Doubles / 10K Run"></label>' +
      '<label>Published fee<input type="text" data-category-field="fee" maxlength="65" placeholder="₹900 / Free / Fee to confirm"></label>' +
      '<label>Fee covers<select data-category-field="unit"><option value="">Select unit</option>' +
      Object.entries(CATEGORY_UNITS).map(([key, label]) => '<option value="' + key + '">' + label + '</option>').join('') +
      '</select></label></div>' +
      '<label class="organizer-category-notes">Category eligibility / format notes (optional)<input type="text" data-category-field="notes" maxlength="150" placeholder="Age 18+, doubles partner required, skill range…"></label>';
    rows.append(row);
    rows.querySelectorAll('.organizer-category-number').forEach((node, i) => {
      node.textContent = 'Category ' + (i + 1);
    });
    renderPreview();
    row.querySelector('[data-category-field="name"]').focus();
  });
  rows.addEventListener('click', event => {
    const button = event.target.closest('.organizer-remove-category');
    if (!button || !rows.contains(button)) return;
    const row = button.closest('.organizer-category-edit');
    row.remove();
    rows.querySelectorAll('.organizer-category-number').forEach((node, i) => {
      node.textContent = 'Category ' + (i + 1);
    });
    renderPreview();
    add.focus();
  });
  rows.addEventListener('input', renderPreview);
  rows.addEventListener('change', renderPreview);
  renderPreview();
}
