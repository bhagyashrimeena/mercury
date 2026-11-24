// An existing publicly visible event can inspire a new edition's structure,
// but dates, fees, venue, checkout, organizer identity, and approval NEVER carry over.
import { displayCategories } from './category-contract.js';

export function newEditionStarter(listing) {
  if (!listing || typeof listing !== 'object') return null;
  const sport = typeof listing.sport === 'string' ? listing.sport.trim() : '';
  const oldCategories = displayCategories(listing.categories, 6);
  const categories = oldCategories.map(c => ({
    name: c.name,
    // Existing explicit unit is only a hint; the form requires all new facts.
    unit: c.unitConflict ? '' : (c.entryUnit || ''),
    fee: '',
    notes: ''
  }));
  return {
    sourceTitle: String(listing.title || 'Previous event').slice(0, 120),
    sport,
    categories,
    // Intentionally absent: title, date, venue, registration URL, organizer,
    // contact email, eligibility, fee, deadline, and permission to publish.
  };
}
