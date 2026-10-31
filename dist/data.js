export const events = [
  {
    id: "sunday-rally",
    title: "The Sunday Rally",
    sport: "Badminton",
    type: "Social play",
    area: "Powai",
    venue: "Sample indoor court · Powai",
    date: "2026-11-08",
    time: "08:00",
    duration: 120,
    level: "All levels",
    price: 450,
    spots: 6,
    capacity: 16,
    host: "The Weekend Club",
    image: "badminton.jpg",
    tag: "COME SOLO, LEAVE WITH A CREW",
    description:
      "A little friendly competition. A lot of good rallies. Join a relaxed morning of doubles, with rotating partners so everyone gets a game.",
    included: [
      "Court time for two hours",
      "Shuttles and rotating doubles",
      "A host to welcome you and arrange games",
    ],
    bring: "Bring your racket, non-marking shoes and a water bottle.",
    format: "Rotating doubles · individual entry",
    solo: true,
  },
  {
    id: "first-serve",
    title: "First Serve Social",
    sport: "Tennis",
    type: "Social play",
    area: "Chandivali",
    venue: "Sample outdoor court · Chandivali",
    date: "2026-11-07",
    time: "17:00",
    duration: 90,
    level: "Beginner friendly",
    price: 650,
    spots: 4,
    capacity: 12,
    host: "After Hours Tennis",
    image: "tennis.jpg",
    tag: "YOUR WEEKEND, WELL PLAYED",
    description:
      "Find your rhythm with friendly rallies and relaxed doubles. A social session for new and returning players who want more time on court.",
    included: [
      "90 minutes of court time",
      "Tennis balls provided",
      "Partner matching and warm-up",
    ],
    bring: "Bring your racket, court shoes and water.",
    format: "Social doubles · individual entry",
    solo: true,
  },
  {
    id: "pickleball-mix",
    title: "Pickle, Play, Repeat",
    sport: "Pickleball",
    type: "Social play",
    area: "Andheri",
    venue: "Sample community court · Andheri",
    date: "2026-11-08",
    time: "18:00",
    duration: 90,
    level: "Beginner friendly",
    price: 500,
    spots: 8,
    capacity: 16,
    host: "The Pickle People",
    image: "court.jpg",
    tag: "NEW SPORT. NEW PEOPLE.",
    description:
      "Never held a paddle? Perfect. Learn the basics, rotate through friendly games and find out why everyone wants one more point.",
    included: [
      "Paddles and balls",
      "A quick introduction to the rules",
      "90 minutes of hosted play",
    ],
    bring: "Wear comfortable sportswear and court shoes. Bring water.",
    format: "Rotating doubles · equipment included",
    solo: true,
  },
  {
    id: "weekend-open",
    title: "The Weekend Open",
    sport: "Badminton",
    type: "Tournament",
    area: "Powai",
    venue: "Sample sports hall · Powai",
    date: "2026-11-14",
    time: "09:00",
    duration: 240,
    level: "Intermediate",
    price: 900,
    spots: 12,
    capacity: 32,
    host: "The Weekend Club",
    image: "badminton.jpg",
    tag: "A LITTLE MORE COMPETITIVE",
    description:
      "Bring your best game to a recreational singles competition. Start with group games before the knockout rounds.",
    included: [
      "Minimum three group matches",
      "Shuttles and court time",
      "Results and a digital Gameprint",
    ],
    bring: "Bring a racket, non-marking shoes, water and a valid photo ID.",
    format: "Singles · group stage + knockouts",
    solo: true,
  },
  {
    id: "sunset-doubles",
    title: "Sunset Doubles Club",
    sport: "Tennis",
    type: "Social play",
    area: "Powai",
    venue: "Sample outdoor court · Powai",
    date: "2026-11-15",
    time: "16:30",
    duration: 90,
    level: "Intermediate",
    price: 700,
    spots: 0,
    capacity: 12,
    host: "After Hours Tennis",
    image: "court.jpg",
    tag: "GOOD GAMES. GOLDEN HOUR.",
    description:
      "An evening of doubles for players comfortable serving and rallying. Partners rotate throughout the session.",
    included: ["90 minutes of play", "Tennis balls", "Hosted partner rotation"],
    bring: "Bring your racket, court shoes and water.",
    format: "Doubles · individual entry",
    solo: true,
  },
  {
    id: "after-work-rally",
    title: "Clock Out. Rally On.",
    sport: "Badminton",
    type: "Social play",
    area: "Chandivali",
    venue: "Sample indoor court · Chandivali",
    date: "2026-11-06",
    time: "19:30",
    duration: 90,
    level: "All levels",
    price: 400,
    spots: 5,
    capacity: 16,
    host: "The Weekend Club",
    image: "badminton.jpg",
    tag: "CLOSE THE LAPTOP. OPEN THE GAME.",
    description:
      "Trade the group chat for a court. An easygoing after-work session with friendly doubles and a host to keep games moving.",
    included: ["90 minutes of play", "Shuttles", "Partner matching"],
    bring: "Bring a racket, non-marking shoes and water.",
    format: "Rotating doubles · individual entry",
    solo: true,
  },
];
export const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
export const dateLabel = (e) =>
  new Date(`${e.date}T${e.time}:00+05:30`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
export const timeLabel = (e) =>
  new Date(`${e.date}T${e.time}:00+05:30`).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
export function filterEvents(
  items,
  {
    sport = "All sports",
    query = "",
    level = "All levels",
    type = "All formats",
    area = "All Mumbai",
    saved = null,
  } = {},
) {
  return items.filter(
    (e) =>
      (sport === "All sports" || e.sport === sport) &&
      (level === "All levels" || e.level === level) &&
      (type === "All formats" || e.type === type) &&
      (area === "All Mumbai" || e.area === area) &&
      (!saved || saved.includes(e.id)) &&
      `${e.title} ${e.sport} ${e.area} ${e.host}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
}
export function readStore(storage, key, fallback) {
  try {
    const value = JSON.parse(storage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
export function bookingFor(e, name, level) {
  if (!e || e.spots <= 0) throw new Error("This session is full.");
  if (name.trim().length < 2) throw new Error("Please enter your name.");
  if (!["Beginner", "Intermediate", "Advanced"].includes(level))
    throw new Error("Choose your playing level.");
  return {
    id:
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
            b.toString(16).padStart(2, "0"),
          ).join(""),
    eventId: e.id,
    name: name.trim(),
    level,
    createdAt: new Date().toISOString(),
    status: "demo",
  };
}
