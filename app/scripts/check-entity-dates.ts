// node --test scripts/check-entity-dates.ts
// The date parsing behind the relationships When view (src/utils/entityDates.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  datesFromUwaziMetadata,
  datesFromIso,
  eventsAround,
  eventsPerYear,
  inYears,
} from "../src/utils/entityDates.ts";

const props = [
  { name: "fecha", label: "Fecha", type: "date" },
  { name: "audiencias", label: "Audiencias", type: "multidate" },
  { name: "mandatos", label: "Mandatos", type: "multidaterange" },
  { name: "titulo", label: "Título", type: "text" },
];
const s = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 1000;

test("date and multidate values are unix seconds", () => {
  const out = datesFromUwaziMetadata(
    { fecha: [{ value: s("1996-07-02") }], audiencias: [{ value: s("1995-08-16") }, { value: s("1995-08-11") }] },
    props,
  );
  assert.deepEqual(out.map((d) => [d.prop, new Date(d.t).toISOString().slice(0, 10)]), [
    ["audiencias", "1995-08-11"],
    ["audiencias", "1995-08-16"],
    ["fecha", "1996-07-02"],
  ]);
});

test("ranges keep their end; a range without a to is an instant", () => {
  const out = datesFromUwaziMetadata(
    { mandatos: [{ value: { from: s("1986-01-01"), to: s("1991-12-31") } }, { value: { from: s("1992-01-01") } }] },
    props,
  );
  assert.equal(out.length, 2);
  assert.ok(out[0].end && out[0].end > out[0].t);
  assert.equal(out[1].end, undefined);
});

test("non-date props, unknown props, zero and missing values are skipped", () => {
  const out = datesFromUwaziMetadata(
    { titulo: [{ value: 1234 }], otro: [{ value: s("2000-01-01") }], fecha: [{ value: 0 }, {}], mandatos: [{ value: { to: s("2000-01-01") } }] },
    props,
  );
  assert.deepEqual(out, []);
  assert.deepEqual(datesFromUwaziMetadata(undefined, props), []);
});

test("ISO dates and ranges parse; bad dates are dropped", () => {
  const out = datesFromIso([
    { prop: "mandate", label: "Mandate", value: "1995-01-01", end: "2003-12-31" },
    { prop: "date", label: "Date", value: "not a date" },
    { prop: "date", label: "Date", value: "1989-01-23" },
  ]);
  assert.equal(out.length, 2);
  assert.equal(new Date(out[0].t).getUTCFullYear(), 1989);
  assert.equal(new Date(out[1].end!).getUTCFullYear(), 2003);
});

test("one event per date for an entity reached through several relations; undated kept apart", () => {
  const dates: Record<string, ReturnType<typeof datesFromIso>> = {
    self: datesFromIso([{ prop: "filed", label: "Filed", value: "1993-11-18" }]),
    a: datesFromIso([{ prop: "date", label: "Date", value: "1996-07-02" }]),
  };
  const { events, undated } = eventsAround(
    "self",
    [
      { entityId: "a", via: "Cites" },
      { entityId: "a", via: "Mentions" },
      { entityId: "b", via: "Cites" },
      { entityId: "self", via: "Cites" },
    ],
    (id) => dates[id] ?? [],
  );
  assert.equal(events.length, 2);
  assert.equal(events[0].own, true);
  assert.deepEqual(events[1].via, ["Cites", "Mentions"]);
  assert.deepEqual(undated, [{ entityId: "b", via: ["Cites"] }]);
});

test("per-year counts cover the span; a year range keeps own events", () => {
  const ev = (own: boolean, iso: string) => ({ own, date: datesFromIso([{ prop: "d", label: "d", value: iso }])[0] });
  const events = [ev(true, "1990-01-01"), ev(false, "1993-05-05"), ev(false, "1993-06-06"), ev(false, "1995-01-01")];
  assert.deepEqual(eventsPerYear(events).map((y) => y.count), [1, 0, 0, 2, 0, 1]);
  assert.equal(inYears(events, [1993, 1993]).length, 3);
  assert.equal(inYears(events, null).length, 4);
});
