// The Nepal corpus in the Library's shape (`Entity`): a title, the card lines,
// the search text, a date and a place. The record in depth is profile.ts.
// Everything here reads the loaded corpus (load.ts), so callers gate on
// `nepalLoaded()`.
import type { CardField, Entity } from "../entities";
import type { LatLng } from "../geo";
import type { PropertyDef, TemplateDef } from "../templates/types";
import { kindOfUwaziType } from "../../utils/propertyKind";
import { displayStrings, latLngOf } from "../../utils/templateProjection";
import { nepalTemplateById } from "./schema";
import { nepalCorpus, nepalEntity } from "./load";
import type { NepalEntity, NepalReference } from "./types";

/** One property's values as display strings. */
export const displayValues = (p: PropertyDef, e: NepalEntity): string[] => displayStrings(p.type, e.metadata[p.name]);

/** A card's candidate lines: every displayable property, in template order.
 *  The card shows the ones its template marks `showInCard`
 *  (`entityCardFields`), read at render. */
function fieldsOf(e: NepalEntity, tpl: TemplateDef): CardField[] | undefined {
  const out: CardField[] = [];
  for (const p of tpl.properties) {
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

type SearchField = { key: string; label: string; value: string };

function searchFieldsOf(e: NepalEntity, tpl: TemplateDef, quotes: SearchField[] | undefined) {
  const out: SearchField[] = [];
  for (const p of tpl.properties) {
    const values = displayValues(p, e);
    if (values.length) out.push({ key: p.name, label: p.label, value: values.join(", ") });
  }
  return quotes ? out.concat(quotes) : out;
}

/** The references' anchored quotes as search fields: on the source as
 *  "Quote", on the record it is about as "Source quote". One field per quote,
 *  so a Results snippet is cut from one quote and never runs into the next.
 *  Keyed by reference, so each field is its own group in the snippets. */
function quoteFieldsByEntity(refs: NepalReference[]): Map<string, SearchField[]> {
  const out = new Map<string, SearchField[]>();
  const add = (id: string, f: SearchField) => {
    const arr = out.get(id);
    if (arr) arr.push(f);
    else out.set(id, [f]);
  };
  for (const r of refs) {
    if (!r.quote) continue;
    add(r.from, { key: `quote:${r.id}`, label: "Quote", value: r.quote });
    if (r.to !== r.from) add(r.to, { key: `quote:${r.id}`, label: "Source quote", value: r.quote });
  }
  return out;
}

/** A record's place on the map: a location's own coordinates; an event's or a
 *  casualty's are those of the place it happened at (the first one with
 *  coordinates). The others have none. */
const PLACE_OF: Record<string, string> = { nepal_event: "occurred_at", nepal_casualty: "incident_at" };
function geoOf(e: NepalEntity): LatLng | undefined {
  const own = latLngOf(e.metadata.geolocation?.[0]?.value);
  if (own) return own;
  const via = PLACE_OF[e.template];
  for (const v of (via && e.metadata[via]) || []) {
    const c = latLngOf(nepalEntity(v.value as string)?.metadata.geolocation?.[0]?.value);
    if (c) return c;
  }
  return undefined;
}

/** The Library's curated facet: one Verification list across the templates
 *  that carry a status. Events, actions and casualty records call it
 *  `verification`; a claim's `verification_status` is the outcome of the
 *  checks on it, the same three values. It is the point of the corpus, so it
 *  leads the facets. */
export const nepalFacetDefs: { propId: string; label: string; defaultFilter: boolean }[] = [
  { propId: "verification", label: "Verification", defaultFilter: true },
];

function facetValuesOf(e: NepalEntity): Record<string, string[]> | undefined {
  const v = (e.metadata.verification ?? e.metadata.verification_status)?.[0]?.label;
  return v ? { verification: [v] } : undefined;
}

/** The List's Verification column: the facet's value, shortened to fit. */
const VERIFICATION_SHORT: Record<string, string> = {
  confirmed: "Confirmed",
  "single-source": "Single source",
  disputed: "Disputed",
};

/** The List's "Location / Publisher" column: where an event, a casualty or a
 *  place is, or who published a source. Other records have neither. */
const PLACE_OR_PUBLISHER: Record<string, string[]> = {
  nepal_source: ["publisher"],
  nepal_event: ["occurred_at"],
  nepal_casualty: ["incident_at", "district"],
  nepal_location: ["located_in"],
};

function listCellsOf(e: NepalEntity): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  const v = (e.metadata.verification ?? e.metadata.verification_status)?.[0]?.value;
  if (typeof v === "string" && VERIFICATION_SHORT[v]) out.verification = VERIFICATION_SHORT[v];
  for (const prop of PLACE_OR_PUBLISHER[e.template] ?? []) {
    const first = e.metadata[prop]?.[0];
    const text = first?.label ?? (typeof first?.value === "string" ? first.value : undefined);
    if (text) {
      out.placeOrPublisher = text;
      break;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

const isoDay = (secs: number) => new Date(secs * 1000).toISOString().slice(0, 10);

let _entities: Entity[] | null = null;
let _byId: Map<string, Entity> | null = null;

/** The corpus as Library entities — built once, after the corpus has loaded. */
export function nepalLibraryEntities(): Entity[] {
  const c = nepalCorpus();
  if (!c) return [];
  if (_entities) return _entities;
  const quotes = quoteFieldsByEntity(c.references);
  _entities = c.entities.map((e) => {
    const tpl = nepalTemplateById.get(e.template)!;
    const geo = geoOf(e);
    const inherited = facetValuesOf(e);
    const listCells = listCellsOf(e);
    return {
      id: e.sharedId,
      title: e.title,
      typeId: e.template,
      // The record's own date, which the timeline and "Date" sort read. People,
      // organisations and places have none and sit with the undated.
      ...(e.date !== undefined ? { createdAt: isoDay(e.date), datePrecision: e.datePrecision ?? "day" } : {}),
      published: true,
      ...(geo ? { geo } : {}),
      ...(inherited ? { inherited } : {}),
      ...(listCells ? { listCells } : {}),
      fields: fieldsOf(e, tpl),
      searchFields: searchFieldsOf(e, tpl, quotes.get(e.sharedId)),
    };
  });
  return _entities;
}

export function nepalEntityById(): Map<string, Entity> {
  if (!_byId || _byId.size !== nepalLibraryEntities().length)
    _byId = new Map(nepalLibraryEntities().map((e) => [e.id, e]));
  return _byId;
}
