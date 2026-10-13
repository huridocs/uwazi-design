// node --test scripts/check-ref-evidence.ts
// The evidence card's arithmetic (src/utils/refEvidence.ts): independent
// publishers with copies folded, the second clock, and the status sentence.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evidenceSummary,
  independentPublishers,
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
  // Vegas: a disputed anchor is a clock offset, not a conflict of sources.
  const vegas = verificationBasis("disputed", 1, { clock: true });
  assert.doesNotMatch(vegas, /sources/);
  assert.match(vegas, /clock/);
});
