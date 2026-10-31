import {liveRoute, enhanceHome} from './live.js';
import {
  defaultFilters,
  parseFilters,
  filterRoute,
  orderEvents,
  newId,
  indiaDate,
  validateDraft,
  upsertDraft,
  migrateDrafts,
  readObject,
} from "./domain.js";
import {
  events,
  money,
  dateLabel,
  timeLabel,
  filterEvents,
  readStore,
  bookingFor,
} from "./data.js";
const main = document.querySelector("main");
const safeStorage = { getItem: (key) => localStorage.getItem(key) };
document.querySelector(".skip").onclick = (e) => {
  e.preventDefault();
  main.focus();
  main.scrollIntoView();
};
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let saved = readStore(safeStorage, "mercury:saved", []).filter(
  (x) => typeof x === "string",
);
let bookings = readStore(safeStorage, "mercury:bookings", []).filter(
  (x) =>
    x && typeof x.id === "string" && events.some((e) => e.id === x.eventId),
);
let drafts = migrateDrafts(readStore(safeStorage, "mercury:host-drafts", []));
let filters = parseFilters(location.pathname+location.search);
let editingDraft = null;
let undoDeleted = null;
let toastTimer;
const arrow = '<span aria-hidden="true">↗</span>';
function toast(message) {
  const t = document.querySelector("#toast");
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3500);
}
function persist(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    toast(
      "Your browser could not save this. Please allow local storage and try again.",
    );
    return false;
  }
}
function demoBanner() {
  return '<div class="demo-banner"><span class="status-dot"></span> SAMPLE LINEUP <span>Illustrative events. Demo bookings do not reserve a real place.</span></div>';
}
function card(e) {
  return `<article class="event-card"><a class="card-image" href="/event/${e.id}" aria-label="View ${esc(e.title)}"><img src="/assets/${e.image}" alt="${e.sport === "Badminton" ? "Badminton court and equipment" : "Sunlit tennis court"}" loading="lazy"><span class="image-label">${esc(e.sport)}</span>${e.spots === 0 ? '<span class="availability full">Full</span>' : e.spots < 7 ? `<span class="availability">${e.spots} sample spots</span>` : ""}</a><button class="save ${saved.includes(e.id) ? "active" : ""}" data-save="${e.id}" aria-pressed="${saved.includes(e.id)}" aria-label="${saved.includes(e.id) ? "Unsave" : "Save"} ${esc(e.title)}">${saved.includes(e.id) ? "♥" : "♡"}</button><a class="card-content" href="/event/${e.id}"><p class="event-time">${dateLabel(e)} <span>·</span> ${timeLabel(e)}</p><h3>${esc(e.title)}</h3><p class="muted">⌖ ${esc(e.area)}, Mumbai</p><div class="tags"><span>${esc(e.level)}</span><span>${e.type === "Tournament" ? "Tournament" : "Come solo"}</span></div><div class="card-bottom"><span><b>${money(e.price)}</b> <small>/ person</small></span><span class="round-arrow">↗</span></div></a></article>`;
}
function home() {
  document.title = "Mercury — Your next game starts here";
  main.innerHTML = `<div class="page-width">${demoBanner()}<section class="hero"><img class="hero-photo" src="/assets/tennis.jpg" alt="A tennis player serving on a sunlit clay court" fetchpriority="high"><div class="hero-shade"></div><div class="hero-copy"><p class="eyebrow"><span class="tiny-star">✳</span> FOR THE LOVE OF THE GAME</p><h1>Less scrolling.<br>More <span>playing.</span></h1><p>Good games. New people. That one-more-match feeling. <br>Find your next game, right around the corner.</p><a class="button lime" href="/explore">Find my game ${arrow}</a><div class="hero-note"><span class="mini-court">↗</span> Show up solo. Find your people.</div></div><div class="hero-stamp"><span>MERCURY PLAY CLUB</span><b>ALL GAME.<br>NO GATEKEEPING.</b><span>MUMBAI, INDIA ↗</span></div><div class="hero-caption">01 / THE COURT IS CALLING.</div></section><form class="search-bar" id="hero-search"><label><span class="label">WHERE</span><select name="area" aria-label="Neighbourhood"><option>All Mumbai</option><option>Powai</option><option>Chandivali</option><option>Andheri</option></select></label><label><span class="label">YOUR GAME</span><select name="sport" aria-label="Sport"><option>All sports</option><option>Badminton</option><option>Tennis</option><option>Pickleball</option></select></label><label class="search-input"><span class="label">FIND YOUR THING</span><input name="query" placeholder="A game, a club, a neighbourhood" aria-label="Search games"></label><button class="button primary">Let’s play <span>↗</span></button></form><section class="discovery-section"><div class="section-heading"><div><p class="eyebrow blue">MAKE ROOM FOR PLAY</p><h2>Your next good game.</h2><p class="muted">A little competition. A lot to look forward to.</p></div><a class="text-link" href="/explore">Explore all games ${arrow}</a></div><div class="sport-tabs" role="group" aria-label="Filter featured sports">${["All sports", "Badminton", "Tennis", "Pickleball"].map((s, i) => `<button class="sport-tab ${i === 0 ? "selected" : ""}" data-home-sport="${s}" aria-pressed="${i === 0}"><span aria-hidden="true">${["✳", "◈", "◉", "◎"][i]}</span>${s}</button>`).join("")}<span class="sample-note">SAMPLE LINEUP · MUMBAI</span></div><div class="event-grid" id="featured-grid">${events.slice(0, 3).map(card).join("")}</div></section><section class="split-feature"><div class="feature-photo"><img src="/assets/court.jpg" alt="Tennis court ready for the next game" loading="lazy"><span class="photo-caption">YOUR PEOPLE ARE OUT THERE.<br>PROBABLY ON A COURT.</span></div><div class="feature-copy"><p class="eyebrow">YOU DON’T NEED A GROUP CHAT</p><h2>Bring yourself.<br>We’ll bring<br><em>the game.</em></h2><p>New to the city? Getting back into it? Just want to play? Find a hosted session that feels like you. No full squad required.</p><a href="/explore?solo=1" class="button dark">Find a solo-friendly game ${arrow}</a><span class="handwritten">new friends come included ↗</span></div></section><section class="steps"><div class="section-heading"><div><p class="eyebrow blue">LESS FRICTION. MORE ACTION.</p><h2>From “we should” to “see you there”.</h2></div></div><div class="steps-grid"><article><span>01 ↗</span><h3>Find your game.</h3><p>Pick your sport, your neighbourhood and your kind of competition.</p></article><article><span>02 ↗</span><h3>Make it a plan.</h3><p>Know the level, the format and what to bring. No guessing games.</p></article><article><span>03 ↗</span><h3>Show up. Play. Repeat.</h3><p>Meet your people on court. Make the next game the easiest yes.</p></article></div></section><section class="host-banner"><div><p class="eyebrow">CALLING THE GAME-MAKERS</p><h2>You bring the game.<br>Let’s bring people together.</h2><p>Run a club, a tournament or a regular Sunday session?</p></div><a class="button lime" href="/host">Host on Mercury ${arrow}</a><span class="host-decoration" aria-hidden="true">✳</span></section></div>`;
  document.querySelector("#hero-search").onsubmit = (e) => {
    e.preventDefault();
    const d = new FormData(e.target);
    filters = { ...filters, ...Object.fromEntries(d) };
    location.hash = filterRoute(filters);
  };
  document.querySelectorAll("[data-home-sport]").forEach(
    (b) =>
      (b.onclick = () => {
        document.querySelectorAll("[data-home-sport]").forEach((x) => {
          x.classList.toggle("selected", x === b);
          x.setAttribute("aria-pressed", x === b);
        });
        document.querySelector("#featured-grid").innerHTML = filterEvents(
          events,
          { sport: b.dataset.homeSport },
        )
          .slice(0, 3)
          .map(card)
          .join("");
        bindSaves();
      }),
  );
  bindSaves();
}
function bindSaves() {
  document.querySelectorAll("[data-save]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.dataset.save;
        const next = saved.includes(id)
          ? saved.filter((x) => x !== id)
          : [...saved, id];
        if (!persist("mercury:saved", next)) return;
        saved = next;
        b.classList.toggle("active", saved.includes(id));
        b.setAttribute("aria-pressed", saved.includes(id));
        b.textContent = saved.includes(id) ? "♥" : "♡";
        b.setAttribute(
          "aria-label",
          `${saved.includes(id) ? "Unsave" : "Save"} ${events.find((e) => e.id === id)?.title || "game"}`,
        );
        toast(
          saved.includes(id)
            ? "Saved to My games."
            : "Removed from saved games.",
        );
        if (location.pathname === "/demo-games") myGames();
      }),
  );
}
function explore() {
  document.title = "Find a game — Mercury";
  main.innerHTML = `<div class="page-width">${demoBanner()}<section class="page-intro"><p class="eyebrow blue">GET OUT. GET INTO IT.</p><h1>Find your kind of <em>game.</em></h1><p>Local sessions. Friendly faces. A reason to close the laptop.</p></section><div class="filter-bar"><label class="search-field"><span aria-hidden="true">⌕</span><input id="query" type="search" value="${esc(filters.query)}" placeholder="Search games, clubs or areas" aria-label="Search games"></label>${[
    ["sport", "Sport", ["All sports", "Badminton", "Tennis", "Pickleball"]],
    ["area", "Area", ["All Mumbai", "Powai", "Chandivali", "Andheri"]],
    ["level", "Level", ["All levels", "Beginner friendly", "Intermediate"]],
    ["type", "Format", ["All formats", "Social play", "Tournament"]],
  ]
    .map(
      ([key, label, options]) =>
        `<label><span class="sr-only">${label}</span><select id="filter-${key}">${options.map((o) => `<option ${filters[key] === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>`,
    )
    .join(
      "",
    )}</div><div class="results-heading"><p id="result-count" role="status"></p><div class="result-controls"><label class="available-filter"><input id="available-only" type="checkbox" ${filters.available ? "checked" : ""}> Available spots</label><label class="sort-label"><span class="sr-only">Sort games</span><select id="sort-games"><option value="soonest" ${filters.sort === "soonest" ? "selected" : ""}>Soonest first</option><option value="price-low" ${filters.sort === "price-low" ? "selected" : ""}>Price: low to high</option><option value="price-high" ${filters.sort === "price-high" ? "selected" : ""}>Price: high to low</option></select></label><button class="text-link" id="clear-filters">Reset ↺</button></div></div><div class="event-grid" id="results"></div></div>`;
  const update = () => {
    const list = orderEvents(filterEvents(events, filters), filters);
    history.replaceState(null, "", filterRoute(filters).replace("#/explore","/samples"));
    document.querySelector("#result-count").textContent =
      `${list.length} sample ${list.length === 1 ? "game" : "games"} · Mumbai`;
    document.querySelector("#results").innerHTML = list.length
      ? list.map(card).join("")
      : '<div class="empty"><span>↗</span><h2>No games in this lineup yet.</h2><p>Try another sport or neighbourhood, or reset your filters.</p><button class="button primary" id="empty-reset">Show all games</button></div>';
    bindSaves();
    document.querySelector("#empty-reset")?.addEventListener("click", reset);
  };
  const reset = () => {
    filters = { ...defaultFilters };
    explore();
  };
  document.querySelector("#clear-filters").onclick = reset;
  document.querySelector("#query").oninput = (e) => {
    filters.query = e.target.value;
    update();
  };
  ["sport", "area", "level", "type"].forEach(
    (k) =>
      (document.querySelector(`#filter-${k}`).onchange = (e) => {
        filters[k] = e.target.value;
        update();
      }),
  );
  document.querySelector("#available-only").onchange = (e) => {
    filters.available = e.target.checked;
    update();
  };
  document.querySelector("#sort-games").onchange = (e) => {
    filters.sort = e.target.value;
    update();
  };
  update();
}
function detail(id) {
  const e = events.find((e) => e.id === id);
  if (!e) return notFound();
  document.title = `${e.title} — Mercury`;
  main.innerHTML = `<div class="page-width">${demoBanner()}<a class="back" href="/explore">← All games</a><div class="detail-cover"><img src="/assets/${e.image}" alt="${e.sport} session inspiration"><span>${e.tag}</span></div><div class="detail-layout"><article><div class="tags"><span class="blue-tag">${e.sport}</span><span>${e.type}</span><span>Sample event</span></div><h1 class="detail-title">${e.title}</h1><p class="host-by">Hosted by <a href="/organizer/${encodeURIComponent(e.host)}">${e.host} ↗</a></p><div class="event-facts"><div><span>◷</span><p><b>${dateLabel(e)}</b><small>${timeLabel(e)} IST · ${e.duration / 60} hours</small></p></div><div><span>⌖</span><p><b>${e.area}, Mumbai</b><small>${e.venue}</small></p></div><div><span>◎</span><p><b>${e.level}</b><small>Adults 18+ · Come solo</small></p></div><div><span>↗</span><p><b>${e.format.split(" · ")[0]}</b><small>${e.format.split(" · ")[1]}</small></p></div></div><h2>A good game, a good time.</h2><p class="body-copy">${e.description}</p><h3>What’s included</h3><ul class="included">${e.included.map((x) => `<li><span>✓</span>${x}</li>`).join("")}</ul><h3>What to bring</h3><p class="body-copy">${e.bring}</p><div class="solo-note"><span>✳</span><div><b>Coming alone? You’re in the right place.</b><p>Your host arranges the games. You just bring yourself.</p></div></div><h3>The details, upfront.</h3><details open><summary>Format & playing level</summary><p>${e.format}. ${e.level}. Players must be 18 or older. Arrive 15 minutes before the start for check-in.</p></details><details><summary>Cancellation & refunds</summary><p>This is a sample event with no real payment or reservation. You can remove your demo booking from My games. For live events, the host’s cancellation deadline, refund amounts and processing timeline must be shown here before checkout opens.</p></details><details><summary>Venue & arrival information</summary><p>${e.venue}. This is placeholder venue information, not an actual booked court. Confirmed venue addresses and directions will be provided for live events.</p></details><details><summary>Community guidelines</summary><p>Respect your opponents, partners and host. Play at the advertised level, share court time fairly, and let your host know if you need a break. Harassment and unsafe play are not welcome.</p></details></article><aside class="booking-panel"><span class="eyebrow blue">MAKE TIME FOR PLAY</span><div class="price">${money(e.price)} <span>/ person</span></div><p class="muted">Sample total · no payment collected</p><div class="booking-summary"><span>${dateLabel(e)}</span><b>${timeLabel(e)} IST</b><span>Playing level</span><b>${e.level}</b><span>Entry</span><b>1 player</b></div><div class="spots"><span class="status-dot"></span>${e.spots ? `${e.spots} of ${e.capacity} sample spots available` : "This sample session is full"}</div>${e.spots ? `<a href="/register/${e.id}" class="button primary">Try registration ${arrow}</a>` : '<button class="button primary" disabled>Session full</button>'}<button class="button outline" id="share-event">Share this game ↗</button><p class="fine">Preview only. Completing this flow will not reserve a place at a real event.</p></aside></div></div>`;
  document.querySelector("#share-event").onclick = () => shareEvent(e);
  main.insertAdjacentHTML(
    "beforeend",
    `<div class="mobile-event-cta"><div><b>${money(e.price)}</b><small>Sample total / person</small></div>${e.spots ? `<a class="button primary" href="/register/${e.id}">Join the game ↗</a>` : '<button class="button primary" disabled>Session full</button>'}</div>`,
  );
}
function register(id) {
  const e = events.find((e) => e.id === id);
  if (!e) return notFound();
  if (e.spots === 0) {
    detail(id);
    return;
  }
  document.title = `Registration — ${e.title} — Mercury`;
  main.innerHTML = `<div class="page-width narrow">${demoBanner()}<a class="back" href="/event/${e.id}">← Back to the game</a><div class="checkout-heading"><p class="eyebrow blue">YOUR NEXT GAME STARTS HERE</p><h1>Make it a <em>plan.</em></h1><p>No app download. No long profile. Just the essentials.</p></div><div class="checkout-layout"><form id="registration" class="form-card"><div class="step-label"><span>01</span> Player details</div><label>Your name<input name="name" autocomplete="name" minlength="2" maxlength="80" required placeholder="What should we call you?"></label><label>Your playing level<select name="level" required><option value="">Choose your level</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><div class="inline-notice">This demo stays in your browser. We don’t need your phone number, email or payment details.</div><label class="checkbox"><input type="checkbox" name="rules" required><span>I’m 18 or older and I’ve read the <button type="button" class="inline-link" id="read-rules">event details and rules</button>.</span></label><label class="checkbox"><input type="checkbox" name="demo" required><span>I understand this creates a demo booking, not a real reservation.</span></label><p id="form-error" class="error" role="alert"></p><button class="button primary">Create demo booking ${arrow}</button><p class="fine">Your name is only used for this local preview. You can clear it in My games.</p></form><aside class="order-card"><img src="/assets/${e.image}" alt="${e.sport} court"><p class="eyebrow blue">YOUR GAME</p><h2>${e.title}</h2><p>${dateLabel(e)} · ${timeLabel(e)} IST</p><p>${e.area}, Mumbai · 1 player</p><hr><div class="total"><span>Sample total</span><b>${money(e.price)}</b></div><p class="fine">Amount charged today: ₹0. No payment integration is active.</p></aside></div></div>`;
  document.querySelector("#read-rules").onclick = () =>
    openSheet(
      "Before you play",
      `<p class="eyebrow blue">${esc(e.title)}</p><h3>Format & level</h3><p>${esc(e.format)}. ${esc(e.level)}. Adults 18+; arrive 15 minutes before the start.</p><h3>What to bring</h3><p>${esc(e.bring)}</p><h3>Community guidelines</h3><p>Respect other players, share court time fairly and tell your host if you need a break.</p><h3>Cancellation</h3><p>This sample event does not reserve a real court or collect payment. You can remove a demo booking from My games.</p><button class="button primary" data-close-sheet>Back to my registration ↗</button>`,
    );
  const form = document.querySelector("#registration");
  try {
    const d = JSON.parse(sessionStorage.getItem(`mercury:form:${id}`));
    if (d) {
      form.elements.name.value = d.name || "";
      form.elements.level.value = d.level || "";
    }
  } catch {}
  form.oninput = () => {
    try {
      sessionStorage.setItem(
        `mercury:form:${id}`,
        JSON.stringify({
          name: form.elements.name.value,
          level: form.elements.level.value,
        }),
      );
    } catch {}
  };
  form.onsubmit = (ev) => {
    ev.preventDefault();
    try {
      const existing = bookings.find((b) => b.eventId === e.id);
      if (existing) {
        location.hash = `/demo-booking/${existing.id}`;
        return;
      }
      const b = bookingFor(
        e,
        form.elements.name.value,
        form.elements.level.value,
      );
      const next = [...bookings, b];
      if (!persist("mercury:bookings", next)) return;
      bookings = next;
      try {
        sessionStorage.removeItem(`mercury:form:${id}`);
      } catch {}
      location.hash = `/demo-booking/${b.id}`;
    } catch (error) {
      document.querySelector("#form-error").textContent = error.message;
    }
  };
}
function booking(id) {
  const b = bookings.find((x) => x.id === id);
  if (!b) return notFound();
  const e = events.find((x) => x.id === b.eventId);
  document.title = "Your demo booking — Mercury";
  main.innerHTML = `<div class="page-width narrow confirmation"><span class="success-mark">✓</span><p class="eyebrow blue">THAT WAS EASY.</p><h1>Next stop: <em>the court.</em></h1><p>${esc(b.name)}, your demo booking is saved on this device.</p><div class="ticket"><div class="ticket-top"><span class="brand">mercury</span><span>DEMO PASS</span></div><h2>${e.title}</h2><div class="event-facts"><div><p><small>WHEN</small><b>${dateLabel(e)} · ${timeLabel(e)}</b></p></div><div><p><small>WHERE</small><b>${e.area}, Mumbai</b></p></div><div><p><small>PLAYER</small><b>${esc(b.name)}</b></p></div><div><p><small>LEVEL</small><b>${esc(b.level)}</b></p></div></div><div class="ticket-bottom">NOT VALID FOR ENTRY <span>${esc(b.id.slice(0, 8).toUpperCase())}</span></div></div><div class="inline-notice">No place has been reserved and no payment was taken. To reserve a real place, choose a published free event from Find a game.</div><div class="button-row"><a class="button primary" href="/demo-games">View my games ${arrow}</a><a class="button outline" href="/explore">Keep exploring</a></div></div>`;
}
function myGames() {
  document.title = "My games — Mercury";
  main.innerHTML = `<div class="page-width">${demoBanner()}<section class="page-intro"><p class="eyebrow blue">LESS MAYBE. MORE SEE YOU THERE.</p><h1>Your next <em>moves.</em></h1><p>Saved games and demo bookings, all on this device.</p></section><div class="section-heading"><h2>My demo bookings <span class="count">${bookings.length}</span></h2>${bookings.length || saved.length || drafts.length ? '<button class="text-link" id="clear-data">Clear local demo data</button>' : ""}</div><div class="booking-list">${
    bookings.length
      ? bookings
          .map((b) => {
            const e = events.find((x) => x.id === b.eventId);
            return `<article class="booking-row"><img src="/assets/${e.image}" alt=""><div><p class="eyebrow blue">DEMO BOOKING</p><h3>${e.title}</h3><p>${dateLabel(e)} · ${timeLabel(e)} · ${e.area}</p></div><a class="button outline" href="/demo-booking/${b.id}">View pass ↗</a><button class="text-link" data-remove="${b.id}" aria-label="Remove demo booking for ${e.title}">Remove</button></article>`;
          })
          .join("")
      : '<div class="empty compact"><h3>A good game belongs here.</h3><p>Try registering for a sample session to see your demo pass.</p><a class="button primary" href="/explore">Find a game ↗</a></div>'
  }</div><div class="section-heading"><h2>Saved for later <span class="count">${saved.length}</span></h2></div><div class="event-grid">${
    saved.length
      ? events
          .filter((e) => saved.includes(e.id))
          .map(card)
          .join("")
      : '<div class="empty compact"><h3>Something catch your eye?</h3><p>Tap the heart on a game to keep it here.</p></div>'
  }</div></div>`;
  bindSaves();
  document.querySelectorAll("[data-remove]").forEach(
    (button) =>
      (button.onclick = () => {
        const next = bookings.filter((x) => x.id !== button.dataset.remove);
        if (persist("mercury:bookings", next)) {
          bookings = next;
          myGames();
          toast("Demo booking removed.");
        }
      }),
  );
  document.querySelector("#clear-data")?.addEventListener("click", () => {
    if (
      !confirm(
        "Clear saved games, demo bookings and organizer drafts on this device?",
      )
    )
      return;
    try {
      [
        "mercury:saved",
        "mercury:bookings",
        "mercury:host-drafts",
        "mercury:host-form",
      ].forEach((k) => localStorage.removeItem(k));
      events.forEach((e) => sessionStorage.removeItem(`mercury:form:${e.id}`));
      saved = [];
      bookings = [];
      drafts = [];
      editingDraft = null;
      undoDeleted = null;
      myGames();
      toast("Your Mercury demo data has been cleared.");
    } catch {
      toast("Could not clear data. Check your browser storage settings.");
    }
  });
}
function host() {
  document.title = "Organizer studio — Mercury";
  const recovery = readObject(safeStorage, "mercury:host-form");
  const selected = editingDraft
    ? drafts.find((d) => d.id === editingDraft)
    : null;
  const initial =
    recovery && (!editingDraft || recovery.editingId === editingDraft)
      ? recovery.values
      : selected;
  if (recovery?.editingId && !editingDraft) editingDraft = recovery.editingId;
  const field = (
    name,
    label,
    { type = "text", placeholder = "", max = 150, required = true } = {},
  ) =>
    `<label>${label}<input name="${name}" type="${type}" ${required ? "required" : ""} ${type === "text" ? `maxlength="${max}"` : ""} ${type === "date" ? `min="${indiaDate()}"` : ""} ${type === "number" ? `min="${name === "capacity" ? 2 : 0}" max="${name === "capacity" ? 500 : 100000}" step="1"` : ""} placeholder="${placeholder}"><span class="field-error" id="error-${name}"></span></label>`;
  const select = (name, label, options) =>
    `<label>${label}<select name="${name}">${options.map((x) => `<option>${x}</option>`).join("")}</select><span class="field-error" id="error-${name}"></span></label>`;
  const area = (name, label, placeholder, max = 500) =>
    `<label>${label}<textarea name="${name}" maxlength="${max}" rows="3" required placeholder="${placeholder}"></textarea><span class="field-error" id="error-${name}"></span></label>`;
  main.innerHTML = `<div class="page-width">${demoBanner()}<section class="studio-intro"><div><p class="eyebrow blue">THE GAME-MAKER’S CORNER</p><h1>Your game.<br>Your <em>people.</em></h1><p>Make the details clear. Give people a reason to show up.</p></div><div class="studio-stat"><span>↗</span><strong>${drafts.length}</strong><p>local event ${drafts.length === 1 ? "draft" : "drafts"}</p></div></section><div class="studio-layout"><section class="studio-editor"><div class="editor-heading"><div><p class="eyebrow blue">ORGANIZER STUDIO</p><h2>${editingDraft ? "Make it even better." : "Set your next game."}</h2></div><span id="draft-status" class="draft-status" role="status">${recovery ? "Recovered on this device" : initial ? "Saved on this device" : "Not saved yet"}</span></div><p class="muted">Nothing goes live here. Build a draft and preview exactly what players would see.</p><form id="host-draft" class="form-card" novalidate><fieldset><legend><span>01</span> The game</legend>${field("title", "Event name", { placeholder: "e.g. Sunday Social Doubles", max: 100 })}<div class="two-fields">${select("sport", "Sport", ["Badminton", "Tennis", "Pickleball"])}${select("format", "Format", ["Social play", "Tournament"])}</div>${area("description", "What’s the plan?", "Describe the format, expected playing time and what makes this game worth joining.", 1500)}<div class="two-fields">${select("level", "Playing level", ["All levels", "Beginner friendly", "Intermediate"])}${field("capacity", "Player capacity", { type: "number" })}</div></fieldset><fieldset><legend><span>02</span> The place & time</legend>${select("area", "Neighbourhood", ["Powai", "Chandivali", "Andheri"])}${field("venue", "Venue name & address", { placeholder: "Use a sample venue for this preview" })}<div class="two-fields">${field("date", "Date", { type: "date" })}${field("time", "Start time (IST)", { type: "time" })}</div></fieldset><fieldset><legend><span>03</span> No surprises</legend>${field("price", "Total price per player (₹)", { type: "number" })}${area("included", "What’s included?", "Court time, equipment, hosting… one item per line.")}${area("bring", "What should players bring?", "Racket, court shoes, water…", 300)}${area("cancellation", "Cancellation & refund policy", "State the cancellation deadline and refund amount. Use sample terms in this preview.", 1000)}</fieldset><p id="host-error-summary" class="error" role="alert"></p><div class="studio-actions"><button class="button primary" type="submit">${editingDraft ? "Save changes" : "Save draft"} ↗</button><button class="button outline" type="button" id="preview-form">Preview event ↗</button></div><p class="fine">Drafts and edits are stored only on this device. No payments or public listing are created.</p></form></section><aside class="studio-sidebar"><div class="section-heading"><h2>Your drafts</h2><button class="text-link" id="new-draft">＋ New event</button></div>${undoDeleted ? '<div class="undo-message">Draft removed. <button class="inline-link" id="undo-draft">Undo</button></div>' : ""}<div id="draft-list">${drafts.length ? drafts.map((d) => `<article class="draft-card ${editingDraft === d.id ? "editing" : ""}"><div class="draft-sport"><span>${esc(d.sport)}</span><small>${editingDraft === d.id ? "EDITING" : "LOCAL DRAFT"}</small></div><h3>${esc(d.title)}</h3><p>⌖ ${esc(d.area)} · ${esc(d.date)}</p><p>${money(Number(d.price))} / player · ${esc(d.capacity)} places</p><div class="draft-actions"><button class="button small dark" data-edit-draft="${esc(d.id)}">Edit ↗</button><button class="text-link" data-preview-draft="${esc(d.id)}">Preview</button><button class="text-link delete-draft" data-delete-draft="${esc(d.id)}" aria-label="Remove ${esc(d.title)}">Remove</button></div></article>`).join("") : '<div class="empty compact"><span>✳</span><h3>A good game starts here.</h3><p>Your saved events will appear here. You can edit them before anything goes live.</p></div>'}</div><div class="studio-tip"><p class="eyebrow blue">A GOOD INVITATION ANSWERS</p><p>Can I come alone?<br>Am I at the right level?<br>What do I need to bring?<br>What happens if I cancel?</p><b>Clear details. Confident players.</b></div></aside></div></div>`;
  const form = document.querySelector("#host-draft");
  if (initial)
    for (const [key, value] of Object.entries(initial)) {
      const control = form.elements.namedItem(key);
      if (control && typeof value !== "object")
        control.value = String(value ?? "");
    }
  let dirty = Boolean(recovery);
  const getValues = () => Object.fromEntries(new FormData(form));
  const recover = () => {
    dirty = true;
    const ok = persist("mercury:host-form", {
      editingId: editingDraft,
      values: getValues(),
    });
    document.querySelector("#draft-status").textContent = ok
      ? "Changes saved on this device"
      : "Could not save on this device";
  };
  form.oninput = recover;
  form.onchange = recover;
  const check = () => {
    const result = validateDraft(getValues());
    form.querySelectorAll("[aria-invalid]").forEach((e) => {
      e.removeAttribute("aria-invalid");
      e.removeAttribute("aria-describedby");
    });
    form.querySelectorAll(".field-error").forEach((e) => (e.textContent = ""));
    for (const [key, message] of Object.entries(result.errors)) {
      const target = form.elements.namedItem(key);
      if (target) {
        target.setAttribute("aria-invalid", "true");
        target.setAttribute("aria-describedby", `error-${key}`);
      }
      const error = form.querySelector(`#error-${key}`);
      if (error) error.textContent = message;
    }
    document.querySelector("#host-error-summary").textContent = result.valid
      ? ""
      : "A few details need your attention. Your draft is still saved on this device.";
    if (!result.valid)
      form.elements.namedItem(Object.keys(result.errors)[0])?.focus();
    return result;
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    const result = check();
    if (!result.valid) return;
    const d = {
      ...result.value,
      id: editingDraft || newId(),
      updatedAt: new Date().toISOString(),
    };
    const next = upsertDraft(drafts, d);
    if (persist("mercury:host-drafts", next)) {
      drafts = next;
      editingDraft = d.id;
      try {
        localStorage.removeItem("mercury:host-form");
      } catch {}
      dirty = false;
      host();
      toast("Draft saved. Your event is not published.");
    }
  };
  document.querySelector("#preview-form").onclick = () => {
    const result = check();
    if (result.valid) previewDraft(result.value);
  };
  const maySwitch = () =>
    !dirty ||
    confirm("Discard the unsaved changes in this form and switch drafts?");
  document.querySelector("#new-draft").onclick = () => {
    if (!maySwitch()) return;
    editingDraft = null;
    try {
      localStorage.removeItem("mercury:host-form");
    } catch {}
    host();
    document.querySelector('input[name="title"]').focus();
  };
  document.querySelectorAll("[data-edit-draft]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!maySwitch()) return;
        editingDraft = b.dataset.editDraft;
        try {
          localStorage.removeItem("mercury:host-form");
        } catch {}
        host();
        document.querySelector('input[name="title"]').focus();
      }),
  );
  document
    .querySelectorAll("[data-preview-draft]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          previewDraft(drafts.find((d) => d.id === b.dataset.previewDraft))),
    );
  document.querySelectorAll("[data-delete-draft]").forEach(
    (b) =>
      (b.onclick = () => {
        if (dirty && !maySwitch()) return;
        const d = drafts.find((d) => d.id === b.dataset.deleteDraft);
        const next = drafts.filter((x) => x.id !== d.id);
        if (persist("mercury:host-drafts", next)) {
          undoDeleted = d;
          drafts = next;
          if (editingDraft === d.id) editingDraft = null;
          try {
            localStorage.removeItem("mercury:host-form");
          } catch {}
          host();
          toast("Draft removed. You can undo this from the drafts panel.");
        }
      }),
  );
  document.querySelector("#undo-draft")?.addEventListener("click", () => {
    const next = upsertDraft(drafts, undoDeleted);
    if (persist("mercury:host-drafts", next)) {
      drafts = next;
      undoDeleted = null;
      host();
      toast("Draft restored.");
    }
  });
}
function previewDraft(d) {
  if (!d) return;
  const when =
    d.date && d.time && !Number.isNaN(Date.parse(`${d.date}T${d.time}`))
      ? `${dateLabel(d)} · ${timeLabel(d)} IST`
      : "Date not set";
  openSheet(
    "Your event, at a glance.",
    `<div class="draft-preview"><p class="eyebrow blue">LOCAL PREVIEW · NOT PUBLISHED</p><div class="tags"><span class="blue-tag">${esc(d.sport)}</span><span>${esc(d.level)}</span><span>${esc(d.format)}</span></div><h3>${esc(d.title)}</h3><p class="preview-when">${when}<br>⌖ ${esc(d.venue || d.area)}</p><div class="preview-price"><b>${money(Number(d.price))}</b><span>/ player · ${esc(d.capacity)} places</span></div><p>${esc(d.description)}</p><h4>What’s included</h4><p class="preserve-lines">${esc(d.included || "Not added yet")}</p><h4>What to bring</h4><p>${esc(d.bring || "Not added yet")}</p><h4>Cancellation policy</h4><p>${esc(d.cancellation || "Not added yet")}</p><div class="inline-notice">This draft is visible only on this device. Live publishing and registration are not enabled.</div><button class="button primary" data-close-sheet>Back to the studio ↗</button></div>`,
  );
}

function organizer(name) {
  document.title = `${name} — Mercury`;
  const list = events.filter((e) => e.host === name);
  if (!list.length) return notFound();
  main.innerHTML = `<div class="page-width">${demoBanner()}<a class="back" href="/explore">← All games</a><section class="page-intro"><p class="eyebrow blue">SAMPLE ORGANIZER</p><h1>${esc(name)}</h1><p>A sample community bringing people together through ${list[0].sport.toLowerCase()}.</p><p class="fine">Illustrative host profile. This is not a verified or onboarded organizer.</p></section><h2>The next games</h2><div class="event-grid">${list.map(card).join("")}</div></div>`;
  bindSaves();
}
function info(page) {
  const content =
    page === "privacy"
      ? [
          "Your data. Your call.",
          "This is a private development preview.",
          "Saved games, your demo player name, playing level, demo bookings and organizer drafts stay in this browser’s local storage. Organizer forms recover automatically from local storage; registration drafts temporarily use session storage. They are not sent to a Mercury database.",
          "Use My games → Clear local demo data to remove these records. This preview does not collect payments, verify identities, send notifications, or create actual reservations.",
          "Google Fonts is used for typography and may receive standard connection information. The hosting provider also processes technical requests to serve this website. Sports photos are illustrative and do not depict the sample venues.",
        ]
      : page === "how-it-works"
        ? [
            "A little less planning. A lot more play.",
            "Find your game. Make it a plan. Show up.",
            "Browse by sport, neighbourhood, level and format. Every event should tell you who it’s for, whether you can come alone, what it costs and what to bring.",
            "Open a sample game and try registration. Your demo pass appears in My games. Save interesting sessions using the heart button.",
            "For launch, real hosts, confirmed venues, secure accounts, payment verification, cancellation handling and confirmations will be connected. No real reservations are available in this preview.",
          ]
        : [
            "For the love of the game.",
            "Meet Mercury.",
            "Mercury is being built by NextPlay Sports Private Limited to help people discover sports opportunities, find their people and make playing a habit.",
            "We’re starting with a simple idea: it should be easier to go from “we should play” to actually being on court.",
            "This first preview explores discovery and participation in Mumbai using clearly marked sample events.",
          ];
  main.innerHTML = `<div class="page-width prose"><p class="eyebrow blue">MERCURY / ${esc(page.replaceAll("-", " "))}</p><h1>${content[0]}</h1><h2>${content[1]}</h2>${content
    .slice(2)
    .map((p) => `<p>${p}</p>`)
    .join(
      "",
    )}<a class="button primary" href="/explore">Explore the preview ${arrow}</a></div>`;
}
function openSheet(title, body) {
  const sheet = document.querySelector("#action-sheet");
  sheet.innerHTML = `<button class="close" aria-label="Close dialog">×</button><h2 id="sheet-title">${esc(title)}</h2><div>${body}</div>`;
  sheet.querySelector(".close").onclick = () => sheet.close();
  sheet
    .querySelectorAll("[data-close-sheet]")
    .forEach((b) => (b.onclick = () => sheet.close()));
  sheet.onclick = (e) => {
    if (e.target === sheet) sheet.close();
  };
  sheet.showModal();
  return sheet;
}
async function shareEvent(e) {
  const url = new URL(location.href);
  url.pathname = `/event/${e.id}`;
  url.search = "";
  url.hash = "";
  const text = `${e.title} · ${dateLabel(e)} · ${timeLabel(e)} IST · ${e.area}. Mercury sample event — not open for booking.`;
  if (navigator.share) {
    try {
      await navigator.share({ title: e.title, text, url: url.href });
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }
  const sheet = openSheet(
    "Bring your people.",
    `<p>Share a look at ${esc(e.title)}.</p><label class="share-label">Event link<input id="share-url" readonly value="${esc(url.href)}"></label><button id="copy-link" class="button primary">Copy event link ↗</button><p id="copy-status" role="status" class="fine">This private preview requires access through the owner’s ChatGPT account.</p>`,
  );
  sheet.querySelector("#share-url").onclick = (e) => e.target.select();
  sheet.querySelector("#copy-link").onclick = async () => {
    try {
      await navigator.clipboard.writeText(url.href);
      sheet.querySelector("#copy-status").textContent =
        "Link copied. The preview is still private.";
    } catch {
      sheet.querySelector("#share-url").focus();
      sheet.querySelector("#share-url").select();
      sheet.querySelector("#copy-status").textContent =
        "Select and copy the link above using your browser.";
    }
  };
}
function notFound() {
  main.innerHTML =
    '<div class="empty page-width"><p class="eyebrow blue">OUT OF BOUNDS</p><h1>This page isn’t in play.</h1><p>The game or booking may no longer exist on this device.</p><a class="button primary" href="/explore">Find another game ↗</a></div>';
}
async function route() {
  if(location.hash.startsWith('#/'))history.replaceState(null,'',location.hash.slice(1));
  const path = location.pathname;
  document.title = 'Mercury — Your next game starts here';
  document.body.classList.remove('has-event-cta');
  const handled=await liveRoute(path,{main,esc,toast,openSheet,go});
  if(location.pathname!==path)return;
  const [, page, id] = path.split("/");
  if(handled) {}
  else if (!page) {home();enhanceHome(main);}
  else if (page === "samples") {
    filters = parseFilters(location.pathname+location.search);
    explore();
  } else if (page === "event") detail(id);
  else if (page === "register") register(id);
  else if (page === "demo-booking") booking(id);
  else if (page === "demo-games") myGames();
  else if (page === "demo-host") host();
  else if (page === "organizer") {
    try {
      organizer(decodeURIComponent(id));
    } catch {
      notFound();
    }
  } else if (["privacy", "about", "how-it-works"].includes(page)) info(page);
  else notFound();
  document.querySelectorAll("[data-nav]").forEach((a) => {
    a.classList.toggle("current", a.dataset.nav === page);
    if (
      a.dataset.nav === (page || "home") ||
      (a.dataset.nav === "explore" && ["event", "register"].includes(page))
    )
      a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.body.classList.toggle("has-event-cta", page === "event");
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}
const dialog = document.querySelector("#location-dialog");
document.querySelector("#location-button").onclick = () => dialog.showModal();
dialog.querySelector(".close").onclick = () => dialog.close();
document.querySelector("#choose-mumbai").onclick = () => {
  dialog.close();
  toast("You’re exploring Mumbai.");
};
dialog.onclick = (e) => {
  if (e.target === dialog) dialog.close();
};
function go(url){history.pushState(null,'',url.replace(/^#/,''));route()}
document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target||a.download)return;const href=a.getAttribute('href');if(!href||href.startsWith('/signin-with-chatgpt')||href.startsWith('/signout-with-chatgpt'))return;if(href.startsWith('/')||href.startsWith('#/')){e.preventDefault();go(href)}});
window.addEventListener('popstate',route);
window.addEventListener("hashchange", route);
route();
