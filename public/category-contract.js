// Shared, read-only category display contract for curated events and submitted drafts.
// It does NOT validate organizer ownership, eligibility, payments, or live capacity.
export const CATEGORY_ENTRY_UNITS = Object.freeze({
  player: 'per player',
  pair: 'per pair',
  team: 'per team',
  category: 'per category',
  distance: 'per distance'
});

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const feeUnitPattern = /\bper\s+(player|pair|team|category|distance)(?:\s+entry)?\s*$/i;

export function categoryFeeKind(quotedFee) {
  const fee = clean(quotedFee);
  if (!fee) return 'unknown';
  if (/^(?:free|no fee)(?:\s+per\s+(?:player|pair|team|category|distance))?$/i.test(fee) ||
      /^(?:₹|rs\.?\s*|inr\s*)0(?:\.0{1,2})?(?:\s+per\s+(?:player|pair|team|category|distance))?$/i.test(fee))
    return 'free';
  if (/^(?:fee\s+to\s+confirm|to\s+confirm|not\s+published|see\s+organizer)(?:\s+per\s+(?:player|pair|team|category|distance))?$/i.test(fee))
    return 'unknown';
  return 'quoted'; // The published label is a quote, not a confirmed checkout total.
}

// Preserve published text exactly, including variable prices and currency. Only
// infer an entry unit when it was explicitly written or saved as a structured unit.
export function normalizeCategoryForDisplay(row) {
  const name = clean(row?.name);
  if (!name) return null;
  const fee = clean(row?.fee);
  const note = clean(row?.notes);
  const requestedUnit = clean(row?.entryUnit);
  const suffix = fee.match(feeUnitPattern)?.[1]?.toLowerCase() || null;
  const explicitUnit = Object.hasOwn(CATEGORY_ENTRY_UNITS, requestedUnit) ? requestedUnit : null;
  const unitConflict = Boolean(explicitUnit && suffix && explicitUnit !== suffix);
  const entryUnit = unitConflict ? null :
    (explicitUnit || (suffix && Object.hasOwn(CATEGORY_ENTRY_UNITS, suffix) ? suffix : null));
  return {
    name,
    fee: fee || 'Fee not specified',
    notes: note || 'Category requirements not specified',
    entryUnit,
    unitConflict,
    feeKind: categoryFeeKind(fee),
    // A manually submitted category is never a source-reviewed public record.
    reviewStatus: row?.reviewStatus === 'unverified-submission' ? 'unverified-submission' : 'source-displayed'
  };
}

export function displayCategories(rows, limit = 50) {
  return Array.isArray(rows)
    ? rows.slice(0, Math.max(0, limit)).map(normalizeCategoryForDisplay).filter(Boolean)
    : [];
}

export function categoryReviewLine(row) {
  const record = normalizeCategoryForDisplay(row);
  if (!record) return '';
  return [record.name, record.fee,
    record.notes === 'Category requirements not specified' ? '' : record.notes]
    .filter(Boolean).join(' | ');
}
