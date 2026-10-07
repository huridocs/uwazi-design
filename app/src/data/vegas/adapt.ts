// The Vegas corpus in the Library's shape (`Entity`): a title, the card lines,
// the search text, a time, a place and a shape. The record in depth is
// profile.ts. Everything here reads the loaded corpus (load.ts), so callers
// gate on `vegasLoaded()`.
import type { CardField, Entity } from "../entities";
import type { LatLng } from "../geo";
import type { PropertyDef, TemplateDef } from "../templates/types";
import { kindOfUwaziType } from "../../utils/propertyKind";
import { displayStrings, latLngOf } from "../../utils/templateProjection";
import { registerContentProvider, type EntityContent } from "../../utils/entityContent";
import { vegasTemplateById } from "./schema";
import { vegasCorpus, vegasEntity } from "./load";
import { formatClock } from "./links";
import type { VegasEntity } from "./types";

/** The clock properties, printed with their time of day when the record is
 *  timed to the second or the minute. Other dates (published, accessed, as
 *  of, availability checked) are days. */
const CLOCK_PROPS = new Set(["clock_start", "clock_end", "clock_start_title", "clock_start_implied", "clock_time"]);

/** Is the record's time known to the second or the minute? */
export const vegasTimed = (values: Record<string, { value: unknown }[] | undefined>): boolean => {
  const p = (values.clock_precision ?? values.precision)?.[0]?.value;
  return p === "second" || p === "minute";
};

/** Does this property print its time of day on this record? */
export const vegasTimedProp = (name: string, values: Record<string, { value: unknown }[] | undefined>): boolean =>
  CLOCK_PROPS.has(name) && vegasTimed(values);

/** One property's values as display strings. */
export const displayValues = (p: PropertyDef, e: VegasEntity): string[] =>
  displayStrings(p.type, e.metadata[p.name], vegasTimedProp(p.name, e.metadata));

/** Properties that hold geometry as GeoJSON text: drawn on the map, never a
 *  card line or search text. */
const GEOMETRY_PROPS = new Set(["camera_path", "footprint"]);

/** A card's candidate lines: every displayable property, in template order.
 *  The card shows the ones its template marks `showInCard`. */
function fieldsOf(e: VegasEntity, tpl: TemplateDef): CardField[] | undefined {
  const out: CardField[] = [];
  for (const p of tpl.properties) {
    if (GEOMETRY_PROPS.has(p.name)) continue;
    const values = displayValues(p, e);
    if (!values.length) continue;
    out.push({
      key: p.name,
      prop: p.name,
      kind: kindOfUwaziType(p.type),
      label: p.label,
      value: values[0],
      ...(values.length > 1 ? { values: values.slice(0, 4), more: values.length - 1 } : {}),
    });
  }
  return out.length ? out : undefined;
}

function searchFieldsOf(e: VegasEntity, tpl: TemplateDef) {
  const out: { key: string; label: string; value: string }[] = [];
  for (const p of tpl.properties) {
    if (GEOMETRY_PROPS.has(p.name)) continue;
    const values = displayValues(p, e);
    if (values.length) out.push({ key: p.name, label: p.label, value: values.join(", ") });
  }
  return out;
}

/** A record's place on the map: a place's own point, a recording's camera
 *  position; a moment's is the place it occurred at. Others have none. */
function geoOf(e: VegasEntity): LatLng | undefined {
  const own = latLngOf((e.metadata.geolocation ?? e.metadata.camera_position)?.[0]?.value);
  if (own) return own;
  if (e.template !== "vegas_moment") return undefined;
  for (const v of e.metadata.occurred_at ?? []) {
    const c = latLngOf(vegasEntity(v.value as string)?.metadata.geolocation?.[0]?.value);
    if (c) return c;
  }
  return undefined;
}

/** The Library's curated facet: one Verification list across the templates
 *  that carry a status (a claim calls it `verification_status`). It leads
 *  the facets, then Recording kind (the template's first `defaultfilter`). */
export const vegasFacetDefs: {
  propId: string;
  label: string;
  defaultFilter: boolean;
  multi: boolean;
  templateIds?: string[];
}[] = [{ propId: "verification", label: "Verification", defaultFilter: true, multi: false }];

function facetValuesOf(e: VegasEntity): Record<string, string[]> | undefined {
  const v = (e.metadata.verification ?? e.metadata.verification_status)?.[0]?.label;
  return v ? { verification: [v] } : undefined;
}

/** Recordings by what they hold: the 911 calls and their compilations are
 *  audio, everything else is video. All are links, all are warned. */
const AUDIO_KINDS = new Set(["911-call", "911-compilation"]);
const kindOf = (e: VegasEntity) => e.metadata.media_kind?.[0]?.value as string | undefined;

/** The Content card's answer for a Vegas record: a recording's kind, where it
 *  is (always linked) and its warning (always graphic or distressing). Nothing
 *  else in the collection carries content. */
function contentOf(id: string): EntityContent {
  const e = vegasEntity(id);
  if (!e || e.template !== "vegas_recording") return {};
  const w = e.metadata.content_warning?.[0]?.value;
  return {
    contains: [AUDIO_KINDS.has(kindOf(e) ?? "") ? "audio" : "video"],
    storage: ["linked"],
    warning: [w === "graphic" || w === "distressing" ? w : "unassessed"],
  };
}
registerContentProvider("vegas", (e) => contentOf(e.id));

/** The List's Verification column: the facet's value, shortened to fit. */
const VERIFICATION_SHORT: Record<string, string> = {
  confirmed: "Confirmed",
  "single-source": "Single source",
  disputed: "Disputed",
};

/** The List's own cells: the clock time (to the second where known), the
 *  sync confidence and the verification. */
function listCellsOf(e: VegasEntity): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  const v = (e.metadata.verification ?? e.metadata.verification_status)?.[0]?.value;
  if (typeof v === "string" && VERIFICATION_SHORT[v]) out.verification = VERIFICATION_SHORT[v];
  if (e.date !== undefined && (e.datePrecision === "second" || e.datePrecision === "minute")) {
    const t = formatClock(e.date);
    out.clock = e.datePrecision === "minute" ? t.slice(0, 5) : t;
  }
  const sync = e.metadata.sync_confidence?.[0]?.label;
  if (sync) out.syncConfidence = sync;
  return Object.keys(out).length ? out : undefined;
}

/** The card's preview: the video or audio mark for a recording, never a
 *  still. Every recording carries a graphic or distressing warning, and a
 *  card is not where a reader chooses to look (see `MediaItemCard`). */
function previewOf(e: VegasEntity): Pick<Entity, "preview"> {
  if (e.template !== "vegas_recording") return {};
  return { preview: AUDIO_KINDS.has(kindOf(e) ?? "") ? "audio" : "video" };
}

/** A record's time as a span, in ms: a timed record from its start to its
 *  end (`clock_end`) or to the end of its second or minute; a dated one over
 *  its day, month or year. */
function spanOf(e: VegasEntity): Entity["span"] {
  if (e.date === undefined) return undefined;
  const from = e.date * 1000;
  const p = e.datePrecision;
  if (p === "second" || p === "minute") {
    const end = e.metadata.clock_end?.[0]?.value;
    const to = typeof end === "number" && end * 1000 > from ? end * 1000 : from + (p === "second" ? 999 : 59_999);
    return { from, to, hour: true, ...(p === "second" ? { seconds: true } : {}) };
  }
  const d = new Date(from);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const to =
    p === "year" ? Date.UTC(y + 1, 0, 1) - 1 : p === "month" ? Date.UTC(y, m + 1, 1) - 1 : Date.UTC(y, m, d.getUTCDate() + 1) - 1;
  return { from, to };
}

/** `createdAt` as the Library reads it: the full instant for a timed record,
 *  so the date sort and the timeline order it to the second; the day for the
 *  rest. */
function createdAtOf(e: VegasEntity): string {
  const iso = new Date(e.date! * 1000).toISOString();
  return e.datePrecision === "second" || e.datePrecision === "minute" ? `${iso.slice(0, 19)}Z` : iso.slice(0, 10);
}

let _entities: Entity[] | null = null;
let _byId: Map<string, Entity> | null = null;

/** The corpus as Library entities — built once, after the corpus has loaded. */
export function vegasLibraryEntities(): Entity[] {
  const c = vegasCorpus();
  if (!c) return [];
  if (_entities) return _entities;
  _entities = c.entities.map((e) => {
    const tpl = vegasTemplateById.get(e.template)!;
    const geo = geoOf(e);
    const inherited = facetValuesOf(e);
    const listCells = listCellsOf(e);
    const precision = e.datePrecision === "month" || e.datePrecision === "year" ? e.datePrecision : "day";
    return {
      id: e.sharedId,
      title: e.title,
      typeId: e.template,
      // Places and organisations have no time and sit with the undated.
      ...(e.date !== undefined ? { createdAt: createdAtOf(e), datePrecision: precision, span: spanOf(e) } : {}),
      published: true,
      ...(geo ? { geo } : {}),
      ...(e.shape ? { shape: e.shape } : {}),
      ...(inherited ? { inherited } : {}),
      ...(listCells ? { listCells } : {}),
      ...previewOf(e),
      fields: fieldsOf(e, tpl),
      searchFields: searchFieldsOf(e, tpl),
    };
  });
  return _entities;
}

export function vegasEntityById(): Map<string, Entity> {
  if (!_byId || _byId.size !== vegasLibraryEntities().length)
    _byId = new Map(vegasLibraryEntities().map((e) => [e.id, e]));
  return _byId;
}
