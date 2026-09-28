/* Which record an entity's dates come from, per corpus. The parsing is
 * `utils/entityDates.ts`; this only picks the source.
 *
 *  - Sample: the v4 seed's dated properties (`data/sampleSeedV4.ts`).
 *  - CEJIL: the raw export record, read against its template's date properties
 *    (the Library adapter keeps only a year for display; this keeps the day).
 *  - Artworks, Travesía: none yet — they return [] and the view says so. */
import type { Language } from "../atoms/language";
import { datesFromIso, datesFromUwaziMetadata, type DatePropertyDef, type EntityDate } from "../utils/entityDates";
import { V4_DATES } from "./sampleSeedV4";
import { cejilEsBySid } from "./cejil/load";
import { cejilTemplates } from "./cejil/templates";

let cejilProps: Map<string, DatePropertyDef[]> | null = null;
function cejilDateProps(templateId: string): DatePropertyDef[] {
  if (!cejilProps) {
    cejilProps = new Map(
      cejilTemplates.map((t) => [
        t._id,
        [...(t.commonProperties ?? []), ...t.properties].map((p) => ({ name: p.name, label: p.label, type: p.type })),
      ]),
    );
  }
  return cejilProps.get(templateId) ?? [];
}

const cache = new Map<string, EntityDate[]>();

/** The dated properties of one entity, sorted by time. */
export function datesOf(entityId: string, lang: Language): EntityDate[] {
  const key = `${lang}\u0000${entityId}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let out: EntityDate[] = [];
  const seed = V4_DATES[entityId];
  if (seed) {
    out = datesFromIso(seed.map((d) => ({ prop: d.prop, label: d.label[lang], value: d.value, end: d.end })));
  } else {
    const record = cejilEsBySid().get(entityId);
    // An unloaded corpus is not "no dates": don't cache the empty answer.
    if (!record) return out;
    out = datesFromUwaziMetadata(record.metadata as Record<string, { value?: unknown }[]>, cejilDateProps(record.template));
  }
  cache.set(key, out);
  return out;
}
