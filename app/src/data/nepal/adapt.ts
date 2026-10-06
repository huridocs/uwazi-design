// The Nepal corpus in the Library's shape (`Entity`): a title, the card lines,
// the search text, a date and a place. The record in depth is profile.ts.
// Everything here reads the loaded corpus (load.ts), so callers gate on
// `nepalLoaded()`.
import type { CardField, Entity } from "../entities";
import type { LatLng } from "../geo";
import type { PropertyDef, TemplateDef } from "../templates/types";
import { kindOfUwaziType } from "../../utils/propertyKind";
import { asset } from "../../utils/asset";
import { displayStrings, latLngOf } from "../../utils/templateProjection";
import { nepalTemplateById } from "./schema";
import { nepalCorpus, nepalDoc, nepalEntity, nepalRefsByEntity } from "./load";
import { languageName, lengthRow, quoteRows, registerContentProvider, type EntityContent } from "../../utils/entityContent";
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
export const nepalFacetDefs: { propId: string; label: string; defaultFilter: boolean; templateIds?: string[] }[] = [
  { propId: "verification", label: "Verification", defaultFilter: true },
  // From `rights`, which is not listed as itself (see "Rights, split").
  { propId: "licence", label: "Licence", defaultFilter: true, templateIds: ["nepal_media"] },
];

function facetValuesOf(e: NepalEntity): Record<string, string[]> | undefined {
  const out: Record<string, string[]> = {};
  const v = (e.metadata.verification ?? e.metadata.verification_status)?.[0]?.label;
  if (v) out.verification = [v];
  const licence = licenceOf(e);
  if (licence) out.licence = [licence];
  return Object.keys(out).length ? out : undefined;
}

/* ── Rights, split ─────────────────────────────────────────────────────────
   The seed's `rights` value says two things at once: where the item is
   (bundled here, or a link) and its licence. Storage is the Content card's
   "Where it is"; the licence is its own facet. The record still shows the
   property as the seed wrote it. */
const rightsOf = (e: NepalEntity) => e.metadata.rights?.[0]?.value as string | undefined;
const LICENCE: Record<string, string> = {
  cc0: "CC0",
  "cc-by": "CC BY",
  "cc-by-sa": "CC BY-SA",
  "public-domain": "Public domain",
  "open-government": "Open government licence",
};
function licenceOf(e: NepalEntity): string | undefined {
  const r = rightsOf(e);
  if (!r) return undefined;
  if (r === "link-only") return "Rights reserved";
  return LICENCE[r.replace(/^(bundled|linked)-/, "")];
}
function storageOf(e: NepalEntity): "stored" | "linked" | undefined {
  const r = rightsOf(e);
  if (!r) return undefined;
  return r.startsWith("bundled-") ? "stored" : "linked";
}

/** The Content card's answer for a Nepal record: its attached PDFs (stored,
 *  OCR, by language and length), a media item's kind, storage, language and
 *  warning, and the passages a source is quoted for. */
function contentOf(id: string): EntityContent {
  const e = nepalEntity(id);
  if (!e) return {};
  const out: Record<string, Set<string>> = {};
  const add = (g: string, v: string) => (out[g] ??= new Set()).add(v);
  for (const docId of e.docs ?? []) {
    const doc = nepalDoc(docId);
    add("contains", "document");
    add("storage", "stored");
    add("text", "ocr");
    if (doc) {
      add("language", languageName(doc.language));
      add("length", lengthRow(doc.pages));
    }
  }
  if (e.template === "nepal_media") {
    const kind = e.metadata.media_kind?.[0]?.value as string | undefined;
    add("contains", kind === "video" ? "video" : kind === "audio" ? "audio" : "image");
    const storage = storageOf(e);
    if (storage) add("storage", storage);
    const lang = e.metadata.language?.[0]?.value as string | undefined;
    if (lang) add("language", languageName(lang));
    // 24 audio items carry no warning: listed, so the rows add up to the media.
    const w = e.metadata.content_warning?.[0]?.value as string | undefined;
    add("warning", w === "none" || w === "distressing" || w === "graphic" ? w : "unassessed");
  }
  const quoted = (nepalRefsByEntity().get(id) ?? []).filter((r) => r.from === id && r.quote).length;
  for (const q of quoteRows(quoted)) add("quotes", q);
  return Object.fromEntries(Object.entries(out).map(([g, v]) => [g, [...v]]));
}
registerContentProvider("nepal", (e) => contentOf(e.id));

/** The List's Verification column: the facet's value, shortened to fit. */
const VERIFICATION_SHORT: Record<string, string> = {
  confirmed: "Confirmed",
  "single-source": "Single source",
  disputed: "Disputed",
  // Media items only.
  misattributed: "Misattributed",
  unverified: "Unverified",
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

/** The card's preview: page one of an attached PDF; a media item's own
 *  picture, or the video or audio mark when it is a recording. An item with a
 *  content warning shows the mark, never the picture: the card is not where a
 *  reader chooses to look (see `MediaItemCard`). */
function previewOf(e: NepalEntity): Pick<Entity, "preview" | "image"> {
  if (e.docs?.length) return { preview: "document" };
  if (e.template !== "nepal_media") return {};
  const warned = e.metadata.content_warning?.some((v) => v.value === "graphic" || v.value === "distressing");
  if (e.image && !warned) {
    const { width, height } = e.image;
    const r = width / height;
    return {
      preview: "image",
      image: {
        url: asset(e.image.url),
        width,
        height,
        aspect: Math.abs(r - 1) <= 0.05 ? "square" : r > 1 ? "landscape" : "portrait",
        alt: e.title,
        filename: e.image.url.slice(e.image.url.lastIndexOf("/") + 1),
        fieldKey: "file",
      },
    };
  }
  const kind = e.metadata.media_kind?.[0]?.value;
  if (kind === "video") return { preview: "video" };
  if (kind === "audio") return { preview: "audio" };
  return {};
}

const isoDay = (secs: number) => new Date(secs * 1000).toISOString().slice(0, 10);

/** The end of the period a time names, at a precision: the last ms of its
 *  hour, day or month. */
function endOf(ms: number, precision: string): number {
  const d = new Date(ms);
  if (precision === "hour") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours() + 1) - 1;
  if (precision === "month") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - 1;
  if (precision === "year") return Date.UTC(d.getUTCFullYear() + 1, 0, 1) - 1;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - 1;
}

/** A record's time as a span: an event's `when` (start, and end when it has
 *  one), else its date, each at the record's precision. An hour-precision end
 *  is a stated time, so it is kept as given. */
function spanOf(e: NepalEntity): Entity["span"] {
  if (e.date === undefined) return undefined;
  const precision =
    (e.metadata.precision?.[0]?.value as string | undefined) ?? e.datePrecision ?? "day";
  const when = e.metadata.when?.[0]?.value as { from?: number | null; to?: number | null } | undefined;
  const fromS = typeof when?.from === "number" ? when.from : e.date;
  const toS = typeof when?.to === "number" ? when.to : null;
  const hour = precision === "hour";
  const from = fromS * 1000;
  const to = toS === null ? endOf(from, precision) : hour ? toS * 1000 : endOf(toS * 1000, precision);
  return { from, to: Math.max(from, to), ...(hour ? { hour: true } : {}) };
}

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
    const preview = previewOf(e);
    return {
      id: e.sharedId,
      title: e.title,
      typeId: e.template,
      // The record's own date, which the timeline and "Date" sort read. People,
      // organisations and places have none and sit with the undated.
      ...(e.date !== undefined ? { createdAt: isoDay(e.date), datePrecision: e.datePrecision ?? "day" } : {}),
      ...(e.date !== undefined ? { span: spanOf(e) } : {}),
      published: true,
      ...(geo ? { geo } : {}),
      ...(inherited ? { inherited } : {}),
      ...(listCells ? { listCells } : {}),
      ...preview,
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
