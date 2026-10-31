import test from "node:test";
import assert from "node:assert/strict";
import {
  parseFilters,
  filterRoute,
  orderEvents,
  validateDraft,
  upsertDraft,
  migrateDrafts,
  indiaDate,
  readObject,
} from "../dist/domain.js";
import { events } from "../dist/data.js";
const now = new Date("2026-10-31T18:00:00Z");
const valid = {
  title: "Sunday Social Doubles",
  sport: "Tennis",
  area: "Powai",
  level: "All levels",
  format: "Social play",
  date: "2026-11-07",
  time: "09:00",
  price: "0",
  capacity: "12",
  venue: "Sample court, Powai",
  description: "Friendly rotating doubles with a host to arrange partners.",
  included: "Court time and tennis balls",
  bring: "Court shoes and water",
  cancellation:
    "Cancel at least 24 hours before the session for a full refund.",
};
test("filter links preserve all selections including non-ASCII query", () => {
  const f = {
    sport: "Tennis",
    area: "Powai",
    level: "Intermediate",
    type: "Social play",
    query: "rally & café",
    sort: "price-low",
    available: true,
  };
  assert.deepEqual(parseFilters(filterRoute(f)), f);
});
test("untrusted filter options are ignored and query length bounded", () => {
  const f = parseFilters(
    "#/explore?sport=Cricket&sort=garbage&query=" + "a".repeat(200),
  );
  assert.equal(f.sport, "All sports");
  assert.equal(f.sort, "soonest");
  assert.equal(f.query.length, 150);
  assert.equal(parseFilters("#/explore?solo=1").type, "Social play");
});
test("sorting does not mutate inventory and availability removes full events", () => {
  const ids = events.map((e) => e.id);
  const list = orderEvents(events, { available: true, sort: "price-low" });
  assert.equal(list[0].price, 400);
  assert.ok(list.every((e) => e.spots > 0));
  assert.deepEqual(
    events.map((e) => e.id),
    ids,
  );
  assert.equal(orderEvents(events)[0].id, "after-work-rally");
});
test("validates full organizer draft and accepts a free event", () => {
  const r = validateDraft(valid, now);
  assert.equal(r.valid, true, JSON.stringify(r.errors));
  assert.equal(r.value.price, 0);
  assert.equal(r.value.capacity, 12);
});
test("rejects incomplete policies, whitespace names, non-integer capacity and blank prices", () => {
  const r = validateDraft(
    { ...valid, title: "   ", price: "", capacity: "2.5", cancellation: "" },
    now,
  );
  assert.equal(r.valid, false);
  for (const key of ["title", "price", "capacity", "cancellation"])
    assert.ok(r.errors[key]);
});
test("compares organizer event start time in IST, including same-day and invalid dates", () => {
  assert.ok(
    validateDraft({ ...valid, date: "2026-10-31", time: "23:00" }, now).errors
      .date,
  );
  assert.equal(
    validateDraft({ ...valid, date: "2026-10-31", time: "23:45" }, now).valid,
    true,
  );
  assert.ok(validateDraft({ ...valid, date: "2026-11-31" }, now).errors.date);
  assert.equal(indiaDate(new Date("2026-10-31T20:00:00Z")), "2026-11-01");
});
test("editing replaces the same draft rather than creating a duplicate", () => {
  const a = { ...valid, id: "one" };
  const result = upsertDraft([a], { ...a, title: "New title" });
  assert.equal(result.length, 1);
  assert.equal(result[0].title, "New title");
  assert.equal(upsertDraft(result, { ...valid, id: "two" }).length, 2);
});
test("legacy drafts remain editable with deterministic identifiers", () => {
  assert.deepEqual(
    migrateDrafts([null, { title: "Old event" }]).map((d) => [
      d.id,
      d.level,
      d.format,
    ]),
    [["legacy-0", "All levels", "Social play"]],
  );
});
test("recovery tolerates corrupt, non-object and inaccessible storage", () => {
  assert.equal(readObject({ getItem: () => "{bad" }, "draft"), null);
  assert.equal(readObject({ getItem: () => "[]" }, "draft"), null);
  assert.equal(
    readObject(
      {
        getItem: () => {
          throw Error();
        },
      },
      "draft",
    ),
    null,
  );
});
