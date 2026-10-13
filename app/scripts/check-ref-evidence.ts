// node --test scripts/check-ref-evidence.ts
// The evidence card's arithmetic (src/utils/refEvidence.ts): independent
// publishers with copies folded, the second clock, and the status sentence.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evidenceSummary,
  hasConflict,
  independentPublishers,
  noteRestatesClock,
  refReportedBy,
  verificationBasis,
} from "../src/utils/refEvidence.ts";
import type { RefSource, Reference } from "../src/data/references.ts";

const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 1000;
const src = (id: string, publisher: string, extra: Partial<RefSource> = {}): RefSource => ({ id, title: id, publisher, ...extra });
const ref = (sources: RefSource[], extra: Partial<Reference> = {}): Reference =>
  ({ id: "r", sourceEntityId: "a", targetEntityId: "b", relationType: "x", sources, createdAt: "", ...extra }) as Reference;

test("a wire copy folds into its origin", () => {
  const sources = [src("1", "AFP"), src("2", "Khaleej Times", { syndicatedFrom: "AFP" }), src("3", "Kathmandu Post")];
  assert.equal(independentPublishers(sources), 2);
  const s = evidenceSummary([ref(sources)]);
  assert.equal(s.copies, 1);
  assert.equal(s.folds, "wire");
});

test("a second story from one outlet is a fold of its own kind", () => {
  const s = evidenceSummary([ref([src("1", "Setopati"), src("2", "Setopati"), src("3", "Himal Press")])]);
  assert.equal(s.independent, 2);
  assert.equal(s.copies, 1);
  assert.equal(s.folds, "outlet");
  assert.match(verificationBasis("confirmed", 2, { folds: s.folds }), /Each publisher is counted once\./);
  assert.doesNotMatch(verificationBasis("confirmed", 2, { folds: s.folds }), /wire/);
});

test("Reported by keeps links whose sources state no date", () => {
  assert.equal(refReportedBy(ref([src("1", "Map", { accessed: day("2026-10-07") })]), day("2017-10-01")), true);
  assert.equal(refReportedBy(ref([src("1", "AFP", { published: day("2025-09-12") })]), day("2025-09-11")), false);
  assert.equal(refReportedBy(ref([src("1", "AFP", { published: day("2025-09-12") })]), day("2025-09-12")), true);
});

test("a month-precision source is compared, and printed, at the month", () => {
  const october = src("1", "SOPA Images", { published: day("2025-10-01"), datePrecision: "month" });
  // Any day in October: the day is not known.
  assert.equal(refReportedBy(ref([october]), day("2025-10-01")), true);
  assert.equal(refReportedBy(ref([october]), day("2025-09-30")), false);
  const s = evidenceSummary([ref([october])]);
  assert.equal(s.firstPrecision, "month");
  // The card prints each end at its precision (formatAtPrecision): "2025/10".
  assert.equal(s.lastPrecision, "month");
});

test("the status sentence states only what was recorded", () => {
  assert.equal(verificationBasis("confirmed", 1), "Recorded as confirmed.");
  assert.equal(verificationBasis("single-source", 1), "Single source: one independent publisher reports it.");
  // A disputed link says its sources conflict only where its contest has an
  // other side; otherwise (a clock offset, a reason only the note gives) it
  // states the status and the card says why.
  assert.equal(verificationBasis("disputed", 1), "Recorded as disputed.");
  assert.equal(verificationBasis("disputed", 2, { conflict: true }), "Recorded as disputed: the sources, or other records, conflict.");
});

const contest = (extra: Partial<NonNullable<Reference["contest"]>>) =>
  ({ opposing: [], paired: [], figures: [], competing: [], ...extra }) as NonNullable<Reference["contest"]>;

test("a conflict is an opposing link or a contradicted figure, not a clock", () => {
  // Vegas ref:vegas-01088: disputed, no contest at all.
  assert.equal(hasConflict(ref([], { verification: "disputed" })), false);
  // A Vegas anchor whose clock is off its moment.
  assert.equal(hasConflict(ref([], { contest: contest({ clock: { deviation: 3, median: 0, momentId: "m" } }) })), false);
  assert.equal(hasConflict(ref([], { contest: contest({ opposing: [{ refId: "o" } as never] }) })), true);
  assert.equal(hasConflict(ref([], { contest: contest({ figures: [{} as never] }) })), true);
});

test("a note that only restates the clock offset is recognised", () => {
  const clock = { deviation: 3, median: 0, momentId: "m" };
  const anchor = (note: string, deviation = 3) => ref([], { note, contest: contest({ clock: { ...clock, deviation } }) });
  assert.equal(noteRestatesClock(anchor("This recording's clock differs from the volley's median by +3 s.")), true);
  assert.equal(noteRestatesClock(anchor("This recording's clock differs from the volley's median by −6 s.", -6)), true);
  // Another offset, or a note with a reason of its own, stays.
  assert.equal(noteRestatesClock(anchor("This recording's clock differs from the volley's median by +7 s.")), false);
  assert.equal(noteRestatesClock(anchor("Two witnesses place the camera elsewhere.")), false);
  // Without a clock contest the note is the only place the offset is said.
  assert.equal(noteRestatesClock(ref([], { note: "This recording's clock differs from the volley's median by -6 s." })), false);
});
