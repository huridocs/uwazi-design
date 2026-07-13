// Heavy adapter: maps CEJIL entities → the prototype's `Entity` shape for the
// Library. Imported only by the library-data atom (pulls the full entity list).
import type { Entity } from "../entities";
import type { CejilEntity } from "./types";
import type { LatLng } from "../geo";
import { cejilTemplates } from "./templates";
import { cejilDocBearingIds } from "./profile";
import { cejilCorpus, cejilLoaded, cejilRelsByEntity } from "./load";

/** template _id → ordered [{name,label,type}] for resolving display fields. */
const propsByTemplate = new Map(
  cejilTemplates.map((t) => [
    t._id,
    [...(t.commonProperties || []), ...t.properties].map((p) => ({ name: p.name, label: p.label, type: p.type })),
  ]),
);

const SKIP_TYPES = new Set(["preview", "geolocation", "image", "link", "media", "nested", "generatedtoc"]);

function formatVals(type: string, vals: { value?: unknown; label?: unknown }[]): string {
  if (SKIP_TYPES.has(type)) return "";
  if (type === "date") {
    const v = vals[0]?.value;
    return typeof v === "number" && v > 0 ? String(new Date(v * 1000).getUTCFullYear()) : "";
  }
  const labels = vals.map((v) => v?.label).filter((l): l is string => typeof l === "string" && !!l);
  if (labels.length) return labels.slice(0, 2).join(", ");
  const v = vals[0]?.value;
  if (typeof v === "string" && v.trim()) {
    const s = v.replace(/\s+/g, " ").trim();
    // Skip raw URLs / JSON blobs (media, embed configs) — not card-displayable.
    if (/^https?:\/\//.test(s) || s.startsWith("{") || s.startsWith("[")) return "";
    return s.length > 90 ? s.slice(0, 90) + "…" : s;
  }
  return "";
}

/** First few non-empty metadata fields (label + display value), in template order. */
function fieldsOf(e: { template: string; metadata?: Record<string, { value?: unknown; label?: unknown }[]> }) {
  const props = propsByTemplate.get(e.template) || [];
  const out: { label: string; value: string }[] = [];
  for (const p of props) {
    if (p.name === "title") continue;
    const vals = e.metadata?.[p.name];
    if (!vals || !vals.length) continue;
    const value = formatVals(p.type, vals);
    if (!value) continue;
    out.push({ label: p.label, value });
    if (out.length >= 3) break;
  }
  return out.length ? out : undefined;
}

/** First country label found on the entity (relationship `pa_s` value or, for a
 *  País entity, its own title). Used for the Countries facet + map geo. */
function countryOf(e: CejilEntity): string | undefined {
  if (e.templateName === "País") return e.title;
  const pais = e.metadata?.pa_s?.[0];
  return pais && typeof pais.label === "string" ? pais.label : undefined;
}

/** The entity's REAL geolocation property, if it has one.
 *
 *  CEJIL carries genuine coordinates on two keys: `ubicaci_n_geogr_fica_geolocation`
 *  (the 343 "Geolocalización de los hechos del caso" entities — where the events
 *  of a case actually happened) and `localizaci_n_geolocation` (the País entities'
 *  own centroids). 373 entities in all.
 *
 *  The map used to plot `country ? COORDS[country] : undefined` — every entity
 *  that merely NAMED a country got pinned to a hardcoded centroid, so thousands
 *  of judgments, resolutions and votes appeared as "locations". That is a
 *  country facet drawn on a map, not a geolocation. If an entity has no
 *  geolocation property, it has no place on the map. */
function geoOf(e: CejilEntity): LatLng | undefined {
  for (const key of ["ubicaci_n_geogr_fica_geolocation", "localizaci_n_geolocation"]) {
    const v = e.metadata?.[key]?.[0]?.value as { lat?: number; lon?: number } | undefined;
    if (v && typeof v.lat === "number" && typeof v.lon === "number") {
      return { lat: v.lat, lng: v.lon };
    }
  }
  return undefined;
}

/** CEJIL inherited-property facets: each maps a relationship/select metadata key
 *  to a facet label. `mecanismo` inherits the connected body's name (Corte IDH /
 *  CIDH …); `tipo` is the document's type term. Drives the Library's dynamic
 *  inherited-property filters on CEJIL (mirrors the mock Role/Region facets). */
export const cejilInheritedDefs: { propId: string; label: string }[] = [
  { propId: "mecanismo", label: "Mecanismo" },
  { propId: "tipo", label: "Tipo" },
];

function labelsOf(
  e: { metadata?: Record<string, { value?: unknown; label?: unknown }[]> },
  key: string,
): string[] {
  return (e.metadata?.[key] || [])
    .map((v) => (typeof v.label === "string" ? v.label.trim() : ""))
    .filter(Boolean);
}

function inheritedOf(e: CejilEntity): Record<string, string[]> | undefined {
  const out: Record<string, string[]> = {};
  for (const { propId } of cejilInheritedDefs) {
    const vals = labelsOf(e, propId);
    if (vals.length) out[propId] = vals;
  }
  return Object.keys(out).length ? out : undefined;
}

const DATE_KEYS = ["fecha", "presentaci_n_ante_la_corteidh", "denuncia_ante_la_cidh"];

/** A representative unix-seconds date from the metadata, → ISO, for sort-by-date. */
function ownDate(e: CejilEntity): string | undefined {
  for (const key of DATE_KEYS) {
    const v = e.metadata?.[key]?.[0]?.value;
    if (typeof v === "number" && v > 0) return new Date(v * 1000).toISOString();
  }
  return undefined;
}

/** The entity's date. A GEOLOCATED entity with no date of its own inherits its
 *  Causa's.
 *
 *  Every one of the 373 geolocated entities is undated — a "Geolocalización de
 *  los hechos del caso" carries coordinates and a país, nothing else. So any date
 *  filter emptied the map completely: narrow the timeline and every pin vanished,
 *  because the only entities that CAN be pinned were the only ones with no date.
 *
 *  They are connected to their Causa (336 of 343), and the Causa is dated. "The
 *  geolocation of the events of case X" is dated by case X, so the date comes
 *  down that relationship and map + timeline finally compose.
 *
 *  Deliberately NARROW: only geolocated entities, only from a Causa. Letting any
 *  undated entity borrow a date from any connected one would invent dates for
 *  the ~1,100 others — a Persona would silently acquire whichever document
 *  happened to be first in its relationship list. */
function createdOf(
  e: CejilEntity,
  geo: LatLng | undefined,
  causaDateBySid: Map<string, string>,
): string | undefined {
  const own = ownDate(e);
  if (own) return own;
  if (!geo) return undefined;
  for (const r of cejilRelsByEntity().get(e.sharedId) ?? []) {
    const other = r.from === e.sharedId ? r.to : r.from;
    const d = causaDateBySid.get(other);
    if (d) return d;
  }
  return undefined;
}

/** The Library entity list, built once from the loaded corpus (Spanish docs are
 *  canonical — titles/labels are richest in es). Returns [] until the corpus is
 *  fetched; the Library gates on `cejilLoaded()` and re-renders on load. */
let _libraryEntities: Entity[] | null = null;
export function cejilLibraryEntities(): Entity[] {
  if (!cejilLoaded()) return [];
  if (_libraryEntities) return _libraryEntities;
  const docBearing = cejilDocBearingIds();
  const es = cejilCorpus()!.entities.filter((e) => e.language === "es");

  // Pass 1: the CAUSA dates, so pass 2 can pull one down a geolocation's edge.
  const causaDateBySid = new Map<string, string>();
  for (const e of es) {
    if (e.templateName !== "Causa") continue;
    const d = ownDate(e);
    if (d) causaDateBySid.set(e.sharedId, d);
  }

  _libraryEntities = es
    .map((e) => {
      const country = countryOf(e);
      const geo = geoOf(e);
      return {
        id: e.sharedId,
        title: e.title.trim(),
        typeId: e.template,
        published: e.published,
        preview: docBearing.has(e.sharedId) ? ("document" as const) : undefined,
        country,
        geo,
        createdAt: createdOf(e, geo, causaDateBySid),
        fields: fieldsOf(e),
        descriptors: (e.metadata?.descriptores || [])
          .map((v) => (typeof v.label === "string" ? v.label : ""))
          .filter(Boolean),
        inherited: inheritedOf(e),
      };
    });
  return _libraryEntities;
}
