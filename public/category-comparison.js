// Source-backed category comparison for external events.
// The comparison is read-only: it does not reserve a category or decide official eligibility.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
import { displayCategories, CATEGORY_ENTRY_UNITS } from './category-contract.js';


const present = value => typeof value === 'string' && value.trim().length > 0;

export function publishedCategories(listing) {
  return displayCategories(listing?.categories);
}

// Possible future normalized category rules are OPT-IN and require manual review.
// Never parse "Age 12+" or "all levels" out of free-text category notes to decide eligibility.
// 'matches-checked-rules' means only that the supplied attributes meet the specifically
// reviewed checks; it is NOT a confirmation that the athlete may register or that places exist.
export function categoryRuleAssessment(category, athlete = {}, asOf = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)) {
  const rules = category?.eligibilityRules;
  const unknown = reason => ({ state: 'unknown', reason });
  if (!rules || rules.reviewed !== true || rules.complete !== true)
    return unknown('The organizer must confirm this category’s full eligibility rules.');
  if (!/^https:\/\/[^\s]+$/i.test(String(rules.sourceUrl || '')) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(String(rules.checkedOn || '')) ||
      rules.checkedOn > asOf)
    return unknown('The eligibility evidence needs a fresh source review.');
  if (!Number.isFinite(Date.parse(asOf)) || !Number.isFinite(Date.parse(rules.checkedOn)) ||
      (Date.parse(asOf) - Date.parse(rules.checkedOn)) / 86400000 >= 7)
    return unknown('These eligibility rules need rechecking with the organizer.');
  const hasAge = Number.isInteger(rules.minAge) || Number.isInteger(rules.maxAge);
  const hasPartner = rules.requiresPartner === true || rules.requiresPartner === false;
  const hasRating = Number.isFinite(rules.minRating) || Number.isFinite(rules.maxRating);
  if (!hasAge && !hasPartner && !hasRating)
    return unknown('No machine-checkable organizer eligibility conditions were provided.');
  if ((rules.minAge != null && (!Number.isInteger(rules.minAge) || rules.minAge < 0 || rules.minAge > 120)) ||
      (rules.maxAge != null && (!Number.isInteger(rules.maxAge) || rules.maxAge < 0 || rules.maxAge > 120)) ||
      (hasAge && rules.minAge != null && rules.maxAge != null && rules.minAge > rules.maxAge))
    return unknown('The published age requirements need review.');
  if ((rules.minRating != null && !Number.isFinite(rules.minRating)) ||
      (rules.maxRating != null && !Number.isFinite(rules.maxRating)) ||
      (hasRating && rules.minRating != null && rules.maxRating != null && rules.minRating > rules.maxRating) ||
      (hasRating && !present(rules.ratingSystem)))
    return unknown('The skill rating requirements need review.');
  if (rules.requiresPartner != null && typeof rules.requiresPartner !== 'boolean')
    return unknown('The partner requirement needs review.');
  if (hasAge && !Number.isInteger(athlete.age))
    return unknown('The player’s age is required to check the published age range.');
  if (hasPartner && rules.requiresPartner && typeof athlete.hasPartner !== 'boolean')
    return unknown('Partner availability is needed to check this category.');
  if (hasRating && (!Number.isFinite(athlete.rating) ||
      String(athlete.ratingSystem || '').toLowerCase() !== rules.ratingSystem.trim().toLowerCase()))
    return unknown('A comparable rating in the organizer’s stated rating system is needed.');
  if ((rules.minAge != null && athlete.age < rules.minAge) ||
      (rules.maxAge != null && athlete.age > rules.maxAge) ||
      (rules.requiresPartner === true && athlete.hasPartner === false) ||
      (rules.minRating != null && athlete.rating < rules.minRating) ||
      (rules.maxRating != null && athlete.rating > rules.maxRating))
    return { state: 'not-matched', reason: 'The supplied details do not meet at least one reviewed category condition. Check the official source.' };
  return { state: 'matches-checked-rules', reason: 'The supplied details meet the recorded checks. Only the organizer can confirm full eligibility and entry.' };
}

export function categoryComparisonMarkup(listing) {
  const categories = publishedCategories(listing);
  if (!categories.length) return '';
  return '<section class="listing-categories category-comparison" aria-labelledby="listing-categories-heading">' +
    '<h2 id="listing-categories-heading">Compare published categories</h2>' +
    '<p class="category-comparison-intro">Select one to read its fee and published notes. This does not select your entry on the organizer’s website.</p>' +
    '<fieldset class="listing-category-grid category-choice-grid"><legend class="sr-only">Published event categories</legend>' +
    categories.map((category, i) => '<label class="listing-category category-choice">' +
      '<input type="radio" name="listing-category-choice" value="' + i + '"' + (i === 0 ? ' checked' : '') + '>' +
      '<span class="category-choice-copy"><b>' + esc(category.name) + '</b><strong>' + esc(category.fee) +
      '</strong><small>' + esc(category.notes) + '</small></span></label>').join('') +
    '</fieldset>' +
    '<div class="category-selection" data-category-selection aria-live="polite" aria-atomic="true">' +
    '<p class="eyebrow blue">CATEGORY DETAILS · NOT A BOOKING</p>' +
    '<h3 data-category-title>' + esc(categories[0].name) + '</h3>' +
    '<p><strong data-category-fee>' + esc(categories[0].fee) + '</strong></p>' +
    '<p data-category-notes>' + esc(categories[0].notes) + '</p>' +
    '<p class="category-entry-unit" data-category-unit>' +
    esc(categories[0].entryUnit ? 'Entry fee unit: ' + CATEGORY_ENTRY_UNITS[categories[0].entryUnit] :
      'Fee unit not specified in the reviewed listing. Confirm whether the quoted price covers a player, pair, team or category.') + '</p>' +
    '<p class="category-selection-eligibility" data-category-eligibility>Eligibility needs confirmation from the organizer. Category notes alone do not confirm you can enter.</p>' +
    '</div></section>';
}

export function mountCategoryComparison(main, listing) {
  const section = main.querySelector('.category-comparison');
  if (!section) return;
  const categories = publishedCategories(listing);
  const selected = section.querySelector('[data-category-selection]');
  section.addEventListener('change', event => {
    const input = event.target.closest('input[name="listing-category-choice"]');
    if (!input || !section.contains(input)) return;
    const index = Number(input.value);
    if (!Number.isInteger(index) || index < 0 || index >= categories.length) return;
    const category = categories[index];
    selected.querySelector('[data-category-title]').textContent = category.name;
    selected.querySelector('[data-category-fee]').textContent = category.fee;
    selected.querySelector('[data-category-notes]').textContent = category.notes;
    selected.querySelector('[data-category-unit]').textContent = category.entryUnit
      ? 'Entry fee unit: ' + CATEGORY_ENTRY_UNITS[category.entryUnit]
      : 'Fee unit not specified in the reviewed listing. Confirm whether the quoted price covers a player, pair, team or category.';
    // Real catalogue records currently do not contain manually reviewed structured rules.
    selected.querySelector('[data-category-eligibility]').textContent =
      'Eligibility needs confirmation from the organizer. Category notes alone do not confirm you can enter.';
  });
}
