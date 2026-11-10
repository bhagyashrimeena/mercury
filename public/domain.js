// Pure application rules shared by views and tests. No browser or network access.
export const defaultFilters = Object.freeze({
  sport: "All sports",
  area: "All Mumbai",
  level: "All levels",
  type: "All formats",
  query: "",
  sort: "soonest",
  available: false,
});
const choices = {
  sport: ["All sports", "Badminton", "Tennis", "Pickleball"],
  area: ["All Mumbai", "Powai", "Chandivali", "Andheri", "Bandra", "BKC", "Borivali", "Malad", "Ghatkopar", "Vile Parle", "South Mumbai", "Nerul, Navi Mumbai", "Thane"],
  level: ["All levels", "Beginner friendly", "Intermediate", "Advanced", "Competitive"],
  type: ["All formats", "Social play", "Tournament"],
  sort: ["soonest", "price-low", "price-high"],
};
export function parseFilters(hash = "") {
  const params = new URLSearchParams(hash.split("?")[1] || "");
  const result = { ...defaultFilters };
  for (const [key, options] of Object.entries(choices)) {
    if (options.includes(params.get(key))) result[key] = params.get(key);
  }
  result.query = (params.get("query") || "").slice(0, 150);
  result.available = params.get("available") === "1";
  if (params.get("solo") === "1") result.type = "Social play";
  return result;
}
export function filterRoute(filters) {
  const p = new URLSearchParams();
  for (const key of Object.keys(defaultFilters)) {
    const value = filters[key];
    if (value !== undefined && value !== defaultFilters[key])
      p.set(key, key === "available" ? (value ? "1" : "0") : String(value));
  }
  return "#/explore" + (p.size ? "?" + p.toString() : "");
}
export function orderEvents(
  list,
  { sort = "soonest", available = false } = {},
) {
  return list
    .filter((e) => !available || e.spots > 0)
    .sort((a, b) =>
      sort === "price-low"
        ? a.price - b.price
        : sort === "price-high"
          ? b.price - a.price
          : `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
    );
}
export function newId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
}
export function indiaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function validateDraft(input, now = new Date()) {
  const d = Object.fromEntries(
    [
      "title",
      "sport",
      "area",
      "date",
      "time",
      "venue",
      "description",
      "level",
      "format",
      "included",
      "bring",
      "cancellation",
    ].map((k) => [k, String(input[k] || "").trim()]),
  );
  const errors = {};
  if (d.title.length < 4 || d.title.length > 100)
    errors.title = "Use an event name between 4 and 100 characters.";
  if (!choices.sport.slice(1).includes(d.sport))
    errors.sport = "Choose a supported sport.";
  if (!choices.area.slice(1).includes(d.area))
    errors.area = "Choose a neighbourhood.";
  if (!choices.level.includes(d.level))
    errors.level = "Choose a playing level.";
  if (!["Social play", "Tournament"].includes(d.format))
    errors.format = "Choose a format.";
  const starts = new Date(`${d.date}T${d.time}:00+05:30`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(d.date) ||
    !/^\d{2}:\d{2}$/.test(d.time) ||
    Number.isNaN(+starts) ||
    +starts <= +now ||
    indiaDate(starts) !== d.date
  )
    errors.date = "Choose a valid future date and start time (IST).";
  d.price = Number(input.price);
  d.capacity = Number(input.capacity);
  if (
    String(input.price ?? "").trim() === "" ||
    !Number.isInteger(d.price) ||
    d.price < 0 ||
    d.price > 100000
  )
    errors.price = "Enter a whole-rupee price from 0 to 100,000.";
  if (
    String(input.capacity ?? "").trim() === "" ||
    !Number.isInteger(d.capacity) ||
    d.capacity < 2 ||
    d.capacity > 500
  )
    errors.capacity = "Capacity must be a whole number from 2 to 500.";
  for (const [key, min, max, label] of [
    ["venue", 4, 150, "venue name and address"],
    ["description", 20, 1500, "event description"],
    ["included", 5, 500, "what is included"],
    ["bring", 3, 300, "what players should bring"],
    ["cancellation", 15, 1000, "cancellation policy"],
  ]) {
    if (d[key].length < min || d[key].length > max)
      errors[key] = `Add ${label} (${min}–${max} characters).`;
  }
  return { value: d, errors, valid: Object.keys(errors).length === 0 };
}
export function upsertDraft(drafts, draft) {
  return drafts.some((d) => d.id === draft.id)
    ? drafts.map((d) => (d.id === draft.id ? draft : d))
    : [draft, ...drafts];
}
export function migrateDrafts(drafts) {
  return drafts
    .filter((d) => d && typeof d.title === "string")
    .map((d, index) => ({
      ...d,
      id:
        typeof d.id === "string" && /^[a-zA-Z0-9-]+$/.test(d.id)
          ? d.id
          : `legacy-${index}`,
      level: d.level || "All levels",
      format: d.format || "Social play",
    }));
}
export function readObject(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key));
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : null;
  } catch {
    return null;
  }
}
