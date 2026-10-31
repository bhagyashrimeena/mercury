import test from "node:test";
import assert from "node:assert/strict";
import {
  events,
  filterEvents,
  bookingFor,
  readStore,
  dateLabel,
  timeLabel,
} from "../dist/data.js";
test("combines sport, neighbourhood, level and search without leaking other results", () => {
  const found = filterEvents(events, {
    sport: "Badminton",
    area: "Powai",
    type: "Tournament",
    level: "Intermediate",
    query: "weekend",
  });
  assert.deepEqual(
    found.map((x) => x.id),
    ["weekend-open"],
  );
  assert.equal(
    filterEvents(events, { sport: "Tennis", area: "Andheri" }).length,
    0,
  );
});
test("search normalizes case and surrounding whitespace", () => {
  assert.equal(
    filterEvents(events, { query: "  FIRST serve  " })[0].id,
    "first-serve",
  );
});
test("does not allow booking a full session", () =>
  assert.throws(
    () =>
      bookingFor(
        events.find((e) => e.spots === 0),
        "Player",
        "Intermediate",
      ),
    /full/,
  ));
test("validates names and playing level before creating a booking", () => {
  assert.throws(() => bookingFor(events[0], " ", "Beginner"), /name/);
  assert.throws(() => bookingFor(events[0], "Player", ""), /level/);
  const b = bookingFor(events[0], "  Ri  ", "Beginner");
  assert.equal(b.name, "Ri");
  assert.equal(b.status, "demo");
  assert.equal(b.eventId, events[0].id);
  assert.ok(b.id);
});
test("corrupt and inaccessible storage degrade safely", () => {
  assert.deepEqual(readStore({ getItem: () => "{bad" }, "x", []), []);
  assert.deepEqual(
    readStore({ getItem: () => '{"not":"array"}' }, "x", []),
    [],
  );
  assert.deepEqual(
    readStore(
      {
        getItem: () => {
          throw Error();
        },
      },
      "x",
      [],
    ),
    [],
  );
});
test("dates always display in India timezone", () => {
  assert.match(dateLabel(events[0]), /8/);
  assert.match(timeLabel(events[0]), /8:00/);
});
test("sample inventory has unique ids and valid capacities", () => {
  assert.equal(new Set(events.map((e) => e.id)).size, events.length);
  for (const e of events) {
    assert.ok(e.spots >= 0 && e.spots <= e.capacity);
    assert.ok(e.price >= 0);
    assert.ok(!Number.isNaN(Date.parse(e.date)));
  }
});
