// node --test scripts/check-sync-analysis.ts
// The Las Vegas sync analysis (src/utils/syncAnalysis.ts) against the corpus,
// and against the figures the seed's own sync check published (sync-check.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analyseSync, bearingDegrees, median } from "../src/utils/syncAnalysis.ts";

const read = (n: string) => JSON.parse(readFileSync(new URL(`../public/vegas-data/${n}`, import.meta.url), "utf8"));
const entities = read("entities.json");
const references = read("relationships.json");
const sync = analyseSync(entities, references);
const clock = (t: number) => new Date(t * 1000).toISOString().slice(11, 19);

test("median and bearing", () => {
  assert.equal(median([]), null);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(Math.round(bearingDegrees({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })), 0);
  assert.equal(Math.round(bearingDegrees({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })), 90);
  assert.equal(Math.round(bearingDegrees({ lat: 0, lng: 0 }, { lat: -1, lng: 0 })), 180);
});

test("volley medians match the moments' clock and the seed's table", () => {
  const seed = ["22:06:06", "22:06:53", "22:07:21", "22:07:50", "22:09:47", "22:10:59", "22:11:34", "22:12:08", "22:12:34", "22:13:30", "22:14:50", "22:15:16"];
  const volleys = sync.moments.filter((m) => m.volley).sort((a, b) => a.volley! - b.volley!);
  assert.equal(volleys.length, 12);
  volleys.forEach((v, i) => assert.equal(clock(v.median!), seed[i], `volley ${v.volley}`));
  for (const m of sync.moments) {
    const e = entities.find((x: { sharedId: string }) => x.sharedId === m.momentId);
    assert.equal(m.median, e.metadata.clock_start[0].value, m.momentId);
  }
});

test("intervals and the comparisons", () => {
  assert.deepEqual(
    sync.intervals.map((i) => i.seconds),
    [47, 28, 29, 117, 72, 35, 34, 26, 56, 80, 26],
  );
  const byId = new Map(sync.comparisons.map((c) => [c.id, c]));
  assert.equal(byId.get("nyt-bursts")?.result, "match");
  assert.equal(byId.get("nyt-long-gaps")?.result, "match");
  assert.equal(byId.get("nyt-building-burst")?.result, "possible");
  assert.equal(byId.get("official-first-shots")?.result, "within-precision");
  assert.equal(byId.get("official-last-shots")?.result, "within-precision");
  assert.ok(sync.comparisons.every((c) => c.fromSummary));
});

test("outliers are annotations more than 2 s from their median", () => {
  for (const m of sync.moments) {
    assert.deepEqual(
      m.outliers.map((a) => a.refId).sort(),
      m.annotations.filter((a) => !a.partial && Math.abs(a.deviation!) > 2).map((a) => a.refId).sort(),
    );
    assert.equal(m.within2 + m.outliers.length, m.counted);
  }
  const v5 = sync.moments.find((m) => m.volley === 5)!;
  assert.ok(v5.outliers.some((a) => a.recordingId === "recording:yt-3qAD39vv6Cg"), "the seed's volley 5 outlier");
});

test("recordings agree with the corpus's own sync properties", () => {
  const corpusValue = (e: { metadata: Record<string, { value: unknown }[]> }, p: string) => e.metadata[p]?.map((v) => v.value);
  let n = 0;
  const confidenceOff: string[] = [];
  const flagsOff: string[] = [];
  for (const e of entities) {
    if (e.template !== "vegas_recording" || !e.metadata.sync_confidence) continue;
    n++;
    const r = sync.recordingById.get(e.sharedId)!;
    if (corpusValue(e, "sync_confidence")![0] !== r.confidence) confidenceOff.push(`${e.sharedId} ${corpusValue(e, "sync_confidence")} ≠ ${r.confidence}`);
    for (const f of ["title-mismatch", "drift"] as const) {
      const theirs = (corpusValue(e, "sync_flags") ?? []).includes(f);
      if (theirs !== r.flags.includes(f)) flagsOff.push(`${e.sharedId} ${f}: corpus ${theirs}, ours ${r.flags.includes(f)}`);
    }
  }
  console.log(`  ${n} recordings with a sync confidence; ${confidenceOff.length} differ, ${flagsOff.length} flag differences`);
  for (const s of [...confidenceOff, ...flagsOff].slice(0, 20)) console.log(`    ${s}`);
  assert.ok(n > 200);
  assert.equal(confidenceOff.length, 0, "confidence agrees with the seed's");
  // The seed checks title times given to the second only; the analysis also
  // checks a minute title ("22:08") against its whole minute.
  assert.deepEqual(flagsOff, ["recording:yt-CC2LW3Br7-g title-mismatch: corpus false, ours true"]);
});

test("every placed recording has a bearing to the source", () => {
  assert.equal(sync.source?.placeId, "place:mandalay-bay-hotel");
  const placed = entities.filter((e: { template: string; metadata: Record<string, unknown> }) => e.template === "vegas_recording" && e.metadata.camera_position);
  assert.equal(sync.bearings.length, placed.length);
  assert.ok(sync.bearings.every((b) => b.bearing >= 0 && b.bearing < 360 && b.metres > 0));
});
