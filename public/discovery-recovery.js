// Explain real alternatives when a player's precise filters yield no suitable listings.
// Each suggestion is derived from the same catalogue and filter logic as Explore.
// Never imply that an external event has live inventory or verified registration.
export function recoverySuggestions(items, filters, filterLineup, now = Date.now()) {
  const candidates = [];
  const add = (id, label, patch) => {
    const next = { ...filters, ...patch };
    const matches = filterLineup(items, next, now);
    if (matches.length) candidates.push({
      id, label, count: matches.length, patch,
      // Counts are of displayed event records, not confirmed seats or entries.
    });
  };
  if (filters.area && filters.area !== 'All Mumbai')
    add('area', 'Search across Mumbai', { area: 'All Mumbai' });
  if ((filters.when && filters.when !== 'Any date') || filters.from || filters.to)
    add('when', 'Explore other dates', { when: 'Any date', from: '', to: '' });
  if (String(filters.query || '').trim())
    add('query', 'Remove search keywords', { query: '' });
  if (filters.availability === 'Entry possible')
    add('status', 'Include events needing source checks', { availability: 'All upcoming' });
  if (filters.fee && filters.fee !== 'Any fee')
    add('fee', 'Remove entry-fee limit', { fee: 'Any fee' });
  if (filters.level && filters.level !== 'Any level')
    add('level', 'View all playing levels', { level: 'Any level' });
  if (filters.type && filters.type !== 'All formats')
    add('type', 'View all formats', { type: 'All formats' });

  // No individual relaxation produced a result: suggest a wider search
  // without changing the chosen sport or asserting availability.
  if (!candidates.length) add('broader', 'Widen this sport search', {
    query: '', area: 'All Mumbai', when: 'Any date', from: '', to: '',
    availability: 'All upcoming', fee: 'Any fee', level: 'Any level',
    type: 'All formats'
  });
  return candidates.slice(0, 3);
}
