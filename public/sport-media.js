// Free Pexels sport photographs used strictly as illustrative placeholders.
// The images do NOT depict or endorse any particular Mercury event/organizer.
// Source, photographer and license audit: docs/stock-photo-sources.md
const PHOTOS = Object.freeze({
  Tennis: [
    { id: 20186417, source: 'https://www.pexels.com/photo/close-up-of-a-tennis-ball-lying-on-a-tennis-court-20186417/', credit: 'Matt Webster', alt: 'Tennis ball on a blue court' },
    { id: 5739121, source: 'https://www.pexels.com/photo/tennis-ball-on-tennis-court-beside-black-and-white-tennis-racket-5739121/', credit: 'cottonbro studio', alt: 'Tennis racquet and ball on clay' },
    { id: 8224638, source: 'https://www.pexels.com/photo/tennis-ball-on-tennis-court-8224638/', credit: 'RDNE Stock project', alt: 'Tennis balls on a sunlit court' },
    { id: 20186418, source: 'https://www.pexels.com/photo/close-up-of-a-tennis-ball-lying-on-a-tennis-court-20186418/', credit: 'Matt Webster', alt: 'Tennis ball on an outdoor court' }
  ],
  Badminton: [
    { id: 8476139, source: 'https://www.pexels.com/photo/close-up-shot-of-a-shuttlecock-on-a-racket-8476139/', credit: 'Amit Rai', alt: 'Badminton shuttlecock on a racket' },
    { id: 12630113, source: 'https://www.pexels.com/photo/a-badminton-racket-near-a-shuttlecock-12630113/', credit: 'aboodi vesakaran', alt: 'Badminton racket and shuttlecock in the air' }
  ],
  Pickleball: [
    { id: 38208389, source: 'https://www.pexels.com/photo/pickleball-paddle-and-ball-on-court-38208389/', credit: 'Abdulaziz hasan', alt: 'Pickleball paddle and ball on a green court' }
  ],
  Running: [
    { id: 10313674, source: 'https://www.pexels.com/photo/people-running-on-the-road-10313674/', credit: 'RUN 4 FFWPU', alt: 'People running together on a road' },
    { id: 9686666, source: 'https://www.pexels.com/photo/people-running-a-marathon-in-the-street-9686666/', credit: 'Ruslan Alekso', alt: 'Group of runners in a street race' },
    { id: 19128857, source: 'https://www.pexels.com/photo/people-running-in-marathon-19128857/', credit: 'Row Photo', alt: 'Runners taking part in a city race' }
  ],
  Padel: [
    { id: 31012869, source: 'https://www.pexels.com/photo/padel-racket-and-ball-on-blue-court-surface-31012869/', credit: 'Marcia Salido', alt: 'Padel racket and ball on a blue court' }
  ],
  Football: [
    { id: 9519543, source: 'https://www.pexels.com/photo/soccer-balls-on-soccer-field-9519543/', credit: 'Anastasia Shuraeva', alt: 'Football balls on a playing field' }
  ],
  Fitness: [
    { id: 37156645, source: 'https://www.pexels.com/photo/group-outdoor-fitness-event-in-park-setting-37156645/', credit: 'Muhamad Guruh Budi Hartono', alt: 'People taking part in a group outdoor fitness class' }
  ],
  Chess: [
    { id: 6114998, source: 'https://www.pexels.com/photo/chess-pieces-in-a-chessboard-6114998/', credit: 'Vlada Karpovich', alt: 'Chess pieces on a board' },
    { id: 13143767, source: 'https://www.pexels.com/photo/chess-pieces-on-a-chessboard-13143767/', credit: 'M1DDL3 M7N', alt: 'Chess pieces set up on a board' }
  ]
});

const isApprovedCover = event => {
  const cover = event?.approvedCover;
  if (!cover || cover.reviewed !== true || typeof cover.url !== 'string') return false;
  try {
    const u = new URL(cover.url);
    // Only explicitly reviewed HTTPS uploads from the approved Mercury asset host.
    return u.protocol === 'https:' &&
      (u.hostname === 'www.playonmercury.com' ||
        (u.hostname.endsWith('.supabase.co') && u.pathname.startsWith('/storage/v1/object/public/')));
  } catch { return false; }
};

function chosenPhoto(event) {
  const options = PHOTOS[event?.sport] || PHOTOS.Tennis;
  // Stable variation reduces repetitive imagery across events of the same sport.
  const identity = String(event?.id || event?.title || event?.sport || '');
  let hash = 0;
  for (const char of identity) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return options[hash % options.length];
}

export function sportPhoto(event) {
  if (isApprovedCover(event)) return {
    src: event.approvedCover.url, source: 'organizer',
    alt: 'Photo provided for ' + String(event.title || 'this sports event'),
    credit: 'Organizer-supplied photograph', page: null
  };
  const photo = chosenPhoto(event);
  return {
    // Fixed Pexels CDN addresses. Do not hotlink images from unknown organizer URLs.
    src: 'https://images.pexels.com/photos/' + photo.id + '/pexels-photo-' + photo.id +
      '.jpeg?auto=compress&cs=tinysrgb&w=560&h=440&fit=crop',
    source: 'stock', alt: 'Illustrative stock photo: ' + photo.alt,
    credit: 'Photo: ' + photo.credit + ' / Pexels',
    page: photo.source
  };
}

// A conservative display label: category minimums stay qualified as "From".
// Never convert € or infer an INR rate from a published foreign-currency fee.
export function shortPrice(event) {
  const price = String(event?.priceLabel || '').trim();
  if (!price) return 'See organizer';
  if (/^\u20b9\s*[\d,]+(?:\.\d+)?\s*[–-]\s*(?:\u20b9\s*)?[\d,]+(?:\.\d+)?$/.test(price))
    return 'From ' + price.match(/^\u20b9\s*[\d,]+(?:\.\d+)?/)[0].replace(/\.00$/, '');
  return price.replace(/^(From\s*\u20b9[\d,]+)\.00$/i, '$1');
}
