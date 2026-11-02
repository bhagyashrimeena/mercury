import { listings } from './catalogue-data.js';
export { listings };
export function indiaDay(now = Date.now()) {
  return new Date(Number(now) + 330 * 60 * 1000).toISOString().slice(0, 10);
}
export function listingStatus(e, now = Date.now()) {
  const today = indiaDay(now);
  if (today > e.endDate) return { code: 'ended', label: 'Event ended' };
  if (e.deadline && (e.deadline.length === 10 ? today > e.deadline : now >= Date.parse(e.deadline)))
    return { code: 'closed', label: 'Entry deadline passed' };
  if (today >= e.date) return { code: 'started', label: 'Event date reached · check organizer' };
  if (e.deadline?.length === 10 && today === e.deadline)
    return { code: 'deadline', label: 'Deadline today · confirm closing time' };
  if (Date.parse(today) - Date.parse(e.checkedOn) >= 7 * 86400000)
    return { code: 'stale', label: 'Recheck details with organizer' };
  return { code: 'check', label: 'Check availability' };
}
export const findListing = id => listings.find(e => e.id === id);
export const currentListings = (now = Date.now()) => listings.filter(e => listingStatus(e, now).code !== 'ended');
export function listingDate(e) {
  const fmt = d => new Date(d + 'T12:00:00+05:30').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  return (e.date === e.endDate ? fmt(e.date) : `${fmt(e.date)} – ${fmt(e.endDate)}`) + ' ' + e.date.slice(0, 4);
}
