import { getEntityType, type Entity } from "../data/entities";

/** Time bucketing for the Library timeline surfaces (the brush strip and the
 *  timeline view bodies). One scale, shared — so the histogram, the vertical
 *  rail and the spine can never disagree about where a year sits. */

export type TimeUnit = "decade" | "year" | "quarter" | "month";

export interface TimeBucket {
  key: string;
  label: string;
  /** Inclusive start / exclusive end, in ms. */
  start: number;
  end: number;
  entities: Entity[];
}

export interface Extent {
  min: number;
  max: number;
}

const YEAR_MS = 365.2425 * 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The entity's representative date (Sample: seeded `createdAt`; CEJIL: `Fecha`
 *  and friends, mapped to `createdAt` by the adapter). null = undated. */
export function entityTime(e: Entity): number | null {
  if (!e.createdAt) return null;
  const t = Date.parse(e.createdAt);
  return Number.isNaN(t) ? null : t;
}

export function timeExtent(entities: Entity[]): Extent | null {
  let min = Infinity;
  let max = -Infinity;
  for (const e of entities) {
    const t = entityTime(e);
    if (t === null) continue;
    if (t < min) min = t;
    if (t > max) max = t;
  }
  return min === Infinity ? null : { min, max };
}

/** Bucket granularity that keeps the histogram legible at any span — a 60-year
 *  corpus (CEJIL) reads in years, an 18-month one (Sample) in months. */
export function pickUnit(spanMs: number): TimeUnit {
  const years = spanMs / YEAR_MS;
  if (years > 8) return "year";
  if (years > 2.5) return "quarter";
  return "month";
}

/** The bucket a timestamp falls in, for a unit. */
export function bucketOf(t: number, unit: TimeUnit): Omit<TimeBucket, "entities"> {
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  switch (unit) {
    case "decade": {
      const dy = Math.floor(y / 10) * 10;
      return { key: `${dy}s`, label: `${dy}s`, start: Date.UTC(dy, 0, 1), end: Date.UTC(dy + 10, 0, 1) };
    }
    case "year":
      return { key: `${y}`, label: `${y}`, start: Date.UTC(y, 0, 1), end: Date.UTC(y + 1, 0, 1) };
    case "quarter": {
      const q = Math.floor(m / 3) * 3;
      return {
        key: `${y}-Q${q / 3 + 1}`,
        label: `Q${q / 3 + 1} ${y}`,
        start: Date.UTC(y, q, 1),
        end: Date.UTC(y, q + 3, 1),
      };
    }
    default:
      return {
        key: `${y}-${m + 1}`,
        label: `${MONTHS[m]} ${y}`,
        start: Date.UTC(y, m, 1),
        end: Date.UTC(y, m + 1, 1),
      };
  }
}

/** Contiguous buckets across the extent — INCLUDING empty ones, so a quiet
 *  decade reads as a gap rather than being silently closed up. */
export function bucketSeries(entities: Entity[], unit: TimeUnit, extent: Extent): TimeBucket[] {
  const series: TimeBucket[] = [];
  const byKey = new Map<string, TimeBucket>();
  let cursor = bucketOf(extent.min, unit).start;
  // Guard: a pathological extent can't spin more than a few thousand buckets.
  for (let i = 0; cursor <= extent.max && i < 5000; i++) {
    const b = { ...bucketOf(cursor, unit), entities: [] as Entity[] };
    series.push(b);
    byKey.set(b.key, b);
    cursor = b.end;
  }
  for (const e of entities) {
    const t = entityTime(e);
    if (t === null) continue;
    byKey.get(bucketOf(t, unit).key)?.entities.push(e);
  }
  return series;
}

/** Non-empty buckets only, chronological — the grouping used by the list bodies. */
export function groupByBucket(entities: Entity[], unit: TimeUnit): TimeBucket[] {
  const byKey = new Map<string, TimeBucket>();
  for (const e of entities) {
    const t = entityTime(e);
    if (t === null) continue;
    const b = bucketOf(t, unit);
    const hit = byKey.get(b.key) ?? { ...b, entities: [] };
    hit.entities.push(e);
    byKey.set(b.key, hit);
  }
  return [...byKey.values()]
    .map((b) => ({
      ...b,
      entities: [...b.entities].sort((a, z) => (entityTime(a) ?? 0) - (entityTime(z) ?? 0)),
    }))
    .sort((a, b) => a.start - b.start);
}

export interface TypeSlice {
  typeId: string;
  name: string;
  color: string;
  n: number;
  /** Share of the set, 0–1. */
  frac: number;
}

/** Template ids ordered by how many entities each holds, across the whole set.
 *  ONE order for every bar in a chart — a stack whose segment order shuffled
 *  per-bucket would be unreadable. */
export function typeOrder(entities: Entity[]): string[] {
  const tally = new Map<string, number>();
  for (const e of entities) tally.set(e.typeId, (tally.get(e.typeId) ?? 0) + 1);
  return [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

/** Split a bucket into its template segments, in the chart's global order.
 *  This is what a stacked bar draws — composition AND volume, no plurality lie. */
export function stackByType(entities: Entity[], order: string[]): TypeSlice[] {
  const tally = new Map<string, number>();
  for (const e of entities) tally.set(e.typeId, (tally.get(e.typeId) ?? 0) + 1);
  const total = entities.length || 1;
  return order
    .filter((id) => tally.has(id))
    .map((id) => {
      const n = tally.get(id)!;
      const t = getEntityType(id);
      return {
        typeId: id,
        name: t?.name ?? id,
        color: t?.color ?? "#6B7280",
        n,
        frac: n / total,
      };
    });
}

/** The type colour that dominates a set — the bucket's dot colour. */
export function dominantColor(entities: Entity[]): string {
  const tally = new Map<string, number>();
  for (const e of entities) tally.set(e.typeId, (tally.get(e.typeId) ?? 0) + 1);
  let best = "";
  let n = 0;
  for (const [id, c] of tally) if (c > n) ((best = id), (n = c));
  return getEntityType(best)?.color ?? "#6B7280";
}

/** Distinct type colours in a set, most-common first (capped) — for stacked dots. */
export function colorSpread(entities: Entity[], cap = 4): string[] {
  const tally = new Map<string, number>();
  for (const e of entities) tally.set(e.typeId, (tally.get(e.typeId) ?? 0) + 1);
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, cap)
    .map(([id]) => getEntityType(id)?.color ?? "#6B7280");
}

export const toISODate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function formatDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "8 months", "3 years" — the size of a stretch of nothing, for the break
 *  markers a proportional axis draws where it elides one. Shared by both spines
 *  (the timeline's and the Results view's) so an elision reads the same in each. */
export function elapsed(ms: number): string {
  const days = ms / 86_400_000;
  if (days >= 730) return `${Math.round(days / 365.2425)} years`;
  if (days >= 55) return `${Math.round(days / 30.44)} months`;
  return `${Math.max(1, Math.round(days))} days`;
}
