// Offline gate for owner-prepared catalogue additions.
// Passing this check is NOT publication approval or source verification.
import { validateCatalogue } from './catalogue-validation.js';
import { displayCategories } from '../public/category-contract.js';
import {
  PUBLICATION_PROPOSAL_SCHEMA, PUBLICATION_REQUIRED_REVIEW
} from '../public/organizer-publication-proposal.js';

const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
const text = (s,min,max) => typeof s === 'string' && s.trim().length >= min && s.trim().length <= max;

export function assessCatalogueProposal(packet, existing = [], today = new Date().toISOString().slice(0,10)) {
  const errors=[];
  if (!packet || typeof packet !== 'object' || Array.isArray(packet) ||
      packet.schema !== PUBLICATION_PROPOSAL_SCHEMA) {
    return {valid:false,errors:['Unrecognized proposal schema. Use the owner review packet format.']};
  }
  if(packet.state !== 'reviewed_for_pr')
    errors.push('Keep the packet unpublished until the reviewer explicitly sets state=reviewed_for_pr.');
  if(!text(packet.sourceRequestId,6,100))
    errors.push('Missing original support request reference.');
  const review=packet.review && typeof packet.review==='object' ? packet.review : {};
  if(!text(review.verifiedBy,3,80)) errors.push('Add a human reviewer name to review.verifiedBy.');
  if(!day(review.verifiedAt) || review.verifiedAt > today)
    errors.push('review.verifiedAt must be a real, nonfuture date.');
  if(!text(review.evidenceNotes,40,2000))
    errors.push('Record at least 40 characters of concrete source/ownership evidence in review.evidenceNotes.');
  if(!text(review.officialSourceUrl,12,500))
    errors.push('Record the independently reviewed source in review.officialSourceUrl.');
  for (const step of PUBLICATION_REQUIRED_REVIEW)
    if (review.checks?.[step] !== true) errors.push('Human review gate not confirmed: '+step+'.');
  const record=packet.record;
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    errors.push('The verified public record is missing.');
    return {valid:false,errors};
  }
  if (record.sourceUrl !== review.officialSourceUrl)
    errors.push('record.sourceUrl must match the independently reviewed officialSourceUrl.');
  if (!day(record.checkedOn) || record.checkedOn !== review.verifiedAt)
    errors.push('record.checkedOn must match the actual human source review date.');
  if(day(record.endDate) && day(review.verifiedAt) && record.endDate < review.verifiedAt)
    errors.push('A new upcoming event cannot have concluded before source review.');
  if(!Array.isArray(existing))
    errors.push('Existing public catalogue is unavailable.');
  else {
    if (existing.some(item => item.id === record.id))
      errors.push('This event ID already exists. Review an explicit update diff instead of importing as new.');
    const checked=validateCatalogue([...existing,record],today);
    if(!checked.valid) errors.push(...checked.errors);
  }
  if(record.categories != null) {
    if(!Array.isArray(record.categories) || record.categories.length>50)
      errors.push('Categories must be an array of at most 50 source-reviewed entries.');
    else {
      const normalized=displayCategories(record.categories);
      if(normalized.length !== record.categories.length)
        errors.push('Each published category needs a nonempty name.');
      const names=new Set();
      for(const [i,cat] of normalized.entries()) {
        const index=i+1;
        const key=cat.name.toLocaleLowerCase('en-IN');
        if(names.has(key))errors.push('Duplicate published category: '+cat.name);
        names.add(key);
        if(!text(cat.name,2,80) || !text(cat.fee,2,100) || !text(cat.notes,8,250))
          errors.push('Category '+index+' requires a source-backed name, fee label, and readable notes.');
        if(cat.reviewStatus === 'unverified-submission' || record.categories[i]?.reviewStatus === 'unverified-submission')
          errors.push('Category '+index+' is an unverified organizer submission.');
        if(cat.unitConflict || !cat.entryUnit)
          errors.push('Category '+index+' needs a consistent, explicitly verified entry-unit (player/pair/team/category/distance).');
      }
    }
  }
  return {valid:errors.length===0,errors};
}
