/* An entity's dated properties, as instants — the unit of the relationships
 * When view (redesign v4 §B).
 *
 * Pure: it reads records handed to it and imports nothing with a runtime, so
 * `scripts/check-entity-dates.ts` runs it under plain Node. The corpus wiring
 * (which record, which template) lives in `data/entityDates.ts`. */

/** One dated property. `end` makes it a range (a judge's mandate); `prop` is the
 *  template's property name, `label` what the record calls it. */
export interface EntityDate {
  prop: string;
  label: string;
  t: number;
  end?: number;
}

/** A property as a template declares it: enough to know whether its values are
 *  dates, and what to call them. */
export interface DatePropertyDef {
  name: string;
  label: string;
  type: string;
}

/** Uwazi's four date kinds. `date`/`multidate` hold unix seconds;
 *  `daterange`/`multidaterange` hold `{from, to}` in unix seconds. */
const DATE_TYPES = new Set(["date", "multidate", "daterange", "multidaterange"]);

type RawValue = { value?: unknown };

const secs = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v !== 0 ? v * 1000 : null;

/** Dates from an Uwazi metadata record (`{prop: [{value}]}`) read against its
 *  template's properties. Unknown props, non-date props, empty and zero values
 *  are skipped; a range with no `from` is skipped, one with no `to` is an
 *  instant. Sorted by time. */
export function datesFromUwaziMetadata(
  metadata: Record<string, RawValue[] | undefined> | undefined,
  props: DatePropertyDef[],
): EntityDate[] {
  if (!metadata) return [];
  const out: EntityDate[] = [];
  for (const def of props) {
    if (!DATE_TYPES.has(def.type)) continue;
    const values = metadata[def.name];
    if (!Array.isArray(values)) continue;
    for (const { value } of values) {
      if (def.type === "date" || def.type === "multidate") {
        const t = secs(value);
        if (t !== null) out.push({ prop: def.name, label: def.label, t });
      } else if (value && typeof value === "object") {
        const { from, to } = value as { from?: unknown; to?: unknown };
        const t = secs(from);
        if (t === null) continue;
        const end = secs(to);
        out.push({ prop: def.name, label: def.label, t, ...(end !== null && end > t ? { end } : {}) });
      }
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

/** Dates from ISO strings (`yyyy-mm-dd`, optionally `…/yyyy-mm-dd` for a range)
 *  — the shape the Sample seed stores them in. */
export function datesFromIso(entries: { prop: string; label: string; value: string; end?: string }[]): EntityDate[] {
  const out: EntityDate[] = [];
  for (const e of entries) {
    const t = Date.parse(`${e.value}T00:00:00Z`);
    if (Number.isNaN(t)) continue;
    const end = e.end ? Date.parse(`${e.end}T00:00:00Z`) : NaN;
    out.push({ prop: e.prop, label: e.label, t, ...(!Number.isNaN(end) && end > t ? { end } : {}) });
  }
  return out.sort((a, b) => a.t - b.t);
}

/* ── Events around an entity ────────────────────────────────────────────── */

/** One row of the When view: a date of the entity itself (`own`) or of an entity
 *  connected to it. A connected entity reached through several relation types is
 *  ONE event per date, carrying all of them — not one row per type. */
export interface WhenEvent<G = string> {
  key: string;
  entityId: string;
  own: boolean;
  date: EntityDate;
  via: G[];
}

/** Every dated event around `selfId`: its own dates, then each connected
 *  entity's, with the relations that reached it. Entities with no date at all
 *  come back in `undated`, so the view can say so instead of dropping them. */
export function eventsAround<G>(
  selfId: string,
  connections: { entityId: string; via: G }[],
  datesOf: (id: string) => EntityDate[],
): { events: WhenEvent<G>[]; undated: { entityId: string; via: G[] }[] } {
  const via = new Map<string, G[]>();
  for (const c of connections) {
    if (c.entityId === selfId) continue;
    const list = via.get(c.entityId);
    if (!list) via.set(c.entityId, [c.via]);
    else if (!list.includes(c.via)) list.push(c.via);
  }
  const events: WhenEvent<G>[] = datesOf(selfId).map((d, i) => ({ key: `${selfId}:${d.prop}:${i}`, entityId: selfId, own: true, date: d, via: [] }));
  const undated: { entityId: string; via: G[] }[] = [];
  for (const [id, groups] of via) {
    const ds = datesOf(id);
    if (!ds.length) undated.push({ entityId: id, via: groups });
    ds.forEach((d, i) => events.push({ key: `${id}:${d.prop}:${i}`, entityId: id, own: false, date: d, via: groups }));
  }
  events.sort((a, b) => a.date.t - b.date.t || Number(b.own) - Number(a.own));
  return { events, undated };
}

/** UTC year of an instant. */
export const yearOf = (t: number): number => new Date(t).getUTCFullYear();

/** Events per year across the events' whole span (empty years included, so a
 *  strip of them shows the gaps). */
export function eventsPerYear(events: { date: EntityDate }[]): { year: number; count: number }[] {
  if (!events.length) return [];
  const counts = new Map<number, number>();
  for (const e of events) counts.set(yearOf(e.date.t), (counts.get(yearOf(e.date.t)) ?? 0) + 1);
  const years = [...counts.keys()];
  const out = [];
  for (let y = Math.min(...years); y <= Math.max(...years); y++) out.push({ year: y, count: counts.get(y) ?? 0 });
  return out;
}

/** Events inside an inclusive year range; the entity's own events always stay,
 *  because they are the frame the others are read against. */
export function inYears<E extends { own: boolean; date: EntityDate }>(events: E[], range: [number, number] | null): E[] {
  if (!range) return events;
  return events.filter((e) => e.own || (yearOf(e.date.t) >= range[0] && yearOf(e.date.t) <= range[1]));
}
