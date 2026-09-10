// Heavy adapter: maps CEJIL entities → the prototype's `Entity` shape for the
// Library. Imported only by the library-data atom (pulls the full entity list).
import type { CardField, Entity } from "../entities";
import type { CejilEntity } from "./types";
import type { LatLng } from "../geo";
import { cejilTemplates } from "./templates";
import { cejilRelationTypes } from "./relationTypes";
import { cejilDocBearingIds } from "./profile";
import { cejilCorpus, cejilLoaded, cejilRelsByEntity } from "./load";
import { kindOfUwaziType, type PropertyKind } from "../../utils/propertyKind";
import { formatPlace } from "../../utils/geoFormat";
import { PLACE_INHERITED_KEY } from "./placeKey";

/** template _id → ordered [{name,label,type}] for resolving display fields. */
const propsByTemplate = new Map(
  cejilTemplates.map((t) => [
    t._id,
    [...(t.commonProperties || []), ...t.properties].map((p) => ({
      name: p.name,
      label: p.label,
      type: p.type,
      // Carried for one question only: which relation type a relationship
      // property points at, so the card can tell whether the record has a
      // group for it (see `relPropResolves`).
      relationType: (p as { relationType?: string }).relationType,
      // The inherit spec, which is how a template says a connection carries a
      // VALUE and not just a link — `Causa` declares
      // `inherit: {type: "geolocation"}` here and nothing had ever read it.
      inherit: (p as { inherit?: { type?: string } }).inherit,
    })),
  ]),
);

const SKIP_TYPES = new Set(["preview", "geolocation", "image", "link", "media", "nested", "generatedtoc"]);

/** A card-displayable value: the FIRST value, plus how many more the field held.
 *
 *  Multi-valued fields used to be joined (`labels.slice(0,2).join(", ")`), which
 *  on a field like "Documentos de la CorteIDH" printed two full document titles
 *  into one cell and made every card run several lines deep. The card renders
 *  `more` as a quiet "+N more" instead. */
function formatVals(
  type: string,
  vals: { value?: unknown; label?: unknown }[],
): { value: string; more: number; values?: string[] } {
  const none = { value: "", more: 0 };
  if (SKIP_TYPES.has(type)) return none;
  if (type === "date" || type === "datasection") {
    const v = vals[0]?.value;
    return typeof v === "number" && v > 0
      ? { value: String(new Date(v * 1000).getUTCFullYear()), more: 0 }
      : none;
  }
  /* Dates that were being dropped by ACCIDENT, not by design.
     `multidate` and `multidaterange` are on nobody's skip list — their values
     simply matched no branch and fell through to the string test below, which a
     bare epoch (`[{value: 958003200}]`) and a range object
     (`[{value: {from, to}}]`) both fail. That erased a Causa's filing dates at
     the Commission and the Court, a Medida Provisional's three MP dates and a
     judge's Mandatos: 624 entities' worth of real properties, hidden by nobody's
     decision. The years are what a card can hold; the fuller rendering is
     CardValue's business. */
  if (type === "multidate") {
    const years = vals
      .map((v) => (typeof v.value === "number" && v.value > 0 ? year(v.value) : ""))
      .filter(Boolean);
    return years.length ? { value: years[0], more: years.length - 1 } : none;
  }
  if (type === "multidaterange") {
    const spans = vals.map((v) => rangeLabel(v.value)).filter(Boolean);
    return spans.length ? { value: spans[0], more: spans.length - 1 } : none;
  }
  const labels = vals.map((v) => v?.label).filter((l): l is string => typeof l === "string" && !!l);
  if (labels.length)
    return { value: labels[0], more: labels.length - 1, values: labels.slice(0, 4) };
  const v = vals[0]?.value;
  if (typeof v === "string" && v.trim()) {
    const s = v.replace(/\s+/g, " ").trim();
    // Skip raw URLs / JSON blobs (media, embed configs) — not card-displayable.
    if (/^https?:\/\//.test(s) || s.startsWith("{") || s.startsWith("[")) return none;
    return { value: s.length > 90 ? s.slice(0, 90) + "…" : s, more: 0 };
  }
  return none;
}

/** An epoch second as a year. */
function year(v: number): string {
  return String(new Date(v * 1000).getUTCFullYear());
}

/** A `{from, to}` range as the span it is — "1980\u20131985", or an open end. */
function rangeLabel(v: unknown): string {
  if (!v || typeof v !== "object") return "";
  const r = v as { from?: unknown; to?: unknown };
  const from = typeof r.from === "number" && r.from > 0 ? year(r.from) : "";
  const to = typeof r.to === "number" && r.to > 0 ? year(r.to) : "";
  if (from && to) return from === to ? from : `${from}\u2013${to}`;
  return from ? `${from}\u2013` : to ? `\u2013${to}` : "";
}


/** The relation type NAME behind a template's relationship property. */
const relTypeName = new Map(cejilRelationTypes.map((r) => [r._id, r.name]));

/** Whether a relationship property has a field to land on in the RECORD.
 *
 *  The record builds its relationship groups from the graph — one per relation
 *  type the entity actually has edges of — so a property whose type has no edges
 *  here (`mecanismo` is stored in metadata and has none) has nothing to focus.
 *  Rather than offer a click that does nothing, the card gets no key for it and
 *  the value renders as plain text. Measured: 3,881 of 5,760 relationship card
 *  fields resolve, and the other 1,879 look exactly as they did before. */
function relPropResolves(sharedId: string, relationType: string | undefined): boolean {
  const name = relationType ? relTypeName.get(relationType) : undefined;
  if (!name) return false;
  for (const r of cejilRelsByEntity().get(sharedId) ?? []) {
    if ((r.typeName || "Relacionado") === name) return true;
  }
  return false;
}

/** The kinds that cannot be a card LINE but are worth saying an entity has.
 *
 *  A paragraph cut at ninety characters is a broken sentence on every card; a
 *  table of violated articles is a table; a media config is a player. None of
 *  them shrink into a label/value row, and all three are things you would open.
 *  They ride the footer as a glyph instead of taking a line. */
const MARK_KINDS = new Set<PropertyKind>(["long", "table", "media"]);

/** The card's properties — EVERY one that resolves, in template order — plus the
 *  mark kinds the entity carries.
 *
 *  No ceiling. There was one, and it was justified with an outlier that does not
 *  exist: the real spread here is 0-9 properties, Causa tops out at 7, and a cap
 *  of five was truncating 1,138 of 4,398 entities to save at most four lines in
 *  the worst row. Level rows come from the cards' shared subgrid tracks, not from
 *  every card carrying the same number of lines. */
function fieldsOf(
  e: {
    sharedId?: string;
    template: string;
    metadata?: Record<string, { value?: unknown; label?: unknown }[]>;
  },
  /** The entity's OWN coordinate, if it has one. */
  ownCoords?: LatLng,
  /** A coordinate reached through a connection, for an entity with none of its
   *  own — see `ConnectedPlace`. */
  connectedPlace?: ConnectedPlace,
) {
  const props = propsByTemplate.get(e.template) || [];
  const out: CardField[] = [];
  const marks: PropertyKind[] = [];
  for (const p of props) {
    if (p.name === "title") continue;
    /* The connection a place was inherited THROUGH is not also a row of its own.
       It resolved to the place row below; printing both gives one card two lines
       about the same fact, one of them naming a record whose only content is the
       coordinate the other line already shows. Same reasoning as `promotedRelType`
       in profile.ts: a connection shown as what it resolves to is shown once. */
    if (connectedPlace && p.inherit?.type === "geolocation") continue;
    const vals = e.metadata?.[p.name];
    if (!vals || !vals.length) continue;
    // A mark kind is counted as PRESENT, never as a line, and never as part of
    // the "+N more" — it is already saying itself in the footer.
    const kind = kindOfUwaziType(p.type);
    /* A PLACE. `SKIP_TYPES` still drops the raw geolocation value — it is a
       `{lat, lon}` blob and nothing downstream should read one — but the
       coordinate is lifted here in the notation a coordinate is written in.
       No place name: this entity's own title already IS the place, and printing
       it again would say "Colindres" twice on one card. */
    if (kind === "place" && ownCoords) {
      out.push({
        key: p.name,
        kind: "place",
        label: p.label,
        value: formatPlace(ownCoords),
      });
      continue;
    }
    if (kind && MARK_KINDS.has(kind) && hasAnyValue(p.type, vals)) {
      if (!marks.includes(kind)) marks.push(kind);
      continue;
    }
    const { value, more, values } = formatVals(p.type, vals);
    if (!value) continue;
    /* The KEY and the KIND travel with the value now.
       They were both in hand here and dropped one line later, which is why a
       card could not tell a coordinate from a sentence, and why a click on a
       property had no name to send the drawer: `entityScalarFields` had to
       invent `${label}-${i}`, which bears no relation to the `data-field-key`
       the record scrolls to. `p.name` is the template's own property name and
       is what `profile.ts` keys the record on, so the two ends now match. */
    const resolves =
      p.type !== "relationship" || relPropResolves(e.sharedId ?? "", p.relationType);
    out.push({
      key: resolves ? p.name : undefined,
      kind: kindOfUwaziType(p.type),
      label: p.label,
      value,
      ...(values && values.length > 1 ? { values } : {}),
      ...(more > 0 ? { more } : {}),
    });
  }
  /* THE INHERITED PLACE, appended rather than slotted into template order —
     the property it comes from is a relationship, and its position in the
     template is where the CONNECTION sits, not where a coordinate would read.
     It goes last so the card's own properties are never displaced by one it
     borrowed. */
  if (connectedPlace) {
    out.push({
      key: PLACE_INHERITED_KEY,
      kind: "place",
      label: "Lugar de los hechos",
      value: formatPlace(connectedPlace.coords, connectedPlace.name),
    });
  }
  return { fields: out.length ? out : undefined, marks: marks.length ? marks : undefined };
}

/** Does this property hold anything at all? The mark tier only needs presence —
 *  it prints no value — and `formatVals` deliberately returns nothing for the
 *  kinds that cannot be drawn as a line, so it cannot answer this. */
function hasAnyValue(type: string, vals: { value?: unknown; label?: unknown }[]): boolean {
  if (type === "nested") return vals.length > 0;
  return vals.some((v) => {
    if (typeof v.label === "string" && v.label.trim()) return true;
    if (typeof v.value === "string") return !!v.value.trim();
    return v.value != null && v.value !== "";
  });
}

/** Metadata keys the `Entity` already hoists to a field of its own — `pa_s` →
 *  `country` (never multi-valued in this corpus) and `descriptores` →
 *  `descriptors` (all values). `entitySearchFields` indexes those hoisted fields
 *  under their own stable keys, so projecting them again would double every hit
 *  and print the same excerpt twice under two labels. */
const HOISTED_KEYS = new Set(["pa_s", "descriptores"]);

/** All of a property's values as searchable text — every value, full length.
 *
 *  The search counterpart of `formatVals`: a card has a width, so it takes the
 *  first value and 90 characters; an index has neither and shouldn't inherit
 *  those limits. Non-textual types stay skipped (`SKIP_TYPES`) — a geolocation,
 *  a media config or a `nested` row of CADH article numbers carries nothing to
 *  match on. */
function searchVals(type: string, vals: { value?: unknown; label?: unknown }[]): string {
  if (SKIP_TYPES.has(type)) return "";
  if (type === "date") {
    return vals
      .map((v) =>
        typeof v.value === "number" && v.value > 0
          ? String(new Date(v.value * 1000).getUTCFullYear())
          : "",
      )
      .filter(Boolean)
      .join(", ");
  }
  const texts: string[] = [];
  for (const v of vals) {
    if (typeof v.label === "string" && v.label.trim()) {
      texts.push(v.label.trim());
      continue;
    }
    if (typeof v.value !== "string") continue;
    const s = v.value.trim();
    // Raw URLs / JSON blobs are addresses and configs, not prose — the same rule
    // the card applies, and for the same reason.
    if (!s || /^https?:\/\//.test(s) || s.startsWith("{") || s.startsWith("[")) continue;
    // NOT whitespace-collapsed: a single value is pushed through by reference,
    // so the index costs no copy of the corpus's long `resumen` texts, and the
    // excerpt cutter collapses whitespace in the window it builds anyway.
    texts.push(s);
  }
  return texts.join(", ");
}

/** EVERY non-empty metadata field (label + full text), in template order —
 *  `Entity.searchFields`. `fieldsOf` above is what the CARD shows. */
function searchFieldsOf(e: { template: string; metadata?: Record<string, { value?: unknown; label?: unknown }[]> }) {
  const props = propsByTemplate.get(e.template) || [];
  const out: { label: string; value: string }[] = [];
  for (const p of props) {
    if (p.name === "title" || HOISTED_KEYS.has(p.name)) continue;
    const vals = e.metadata?.[p.name];
    if (!vals || !vals.length) continue;
    const value = searchVals(p.type, vals);
    if (value) out.push({ label: p.label, value });
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

/** A place reached through a connection: the coordinate, and what it is called.
 *
 *  `Causa` declares its location as a RELATIONSHIP —
 *  `geolocalizaci_n_de_los_hechos`, carrying `inherit: {type: "geolocation"}` —
 *  and nothing has ever read that inherit spec, so a case has never said where
 *  it happened. The 343 entities that DO carry coordinates are the anonymous
 *  place-records hanging off it, whose own cards said only which country they
 *  were in. Both halves of that are fixed by walking the edge once. */
interface ConnectedPlace {
  coords: LatLng;
  name: string;
}

/** The relation type NAME a template inherits a geolocation through, if it
 *  declares one. Cached per template — it is a walk over a handful of props. */
const inheritedPlaceRel = new Map<string, string | undefined>();
function inheritedPlaceRelName(templateId: string): string | undefined {
  if (inheritedPlaceRel.has(templateId)) return inheritedPlaceRel.get(templateId);
  let name: string | undefined;
  for (const p of propsByTemplate.get(templateId) || []) {
    if (p.type === "relationship" && p.inherit?.type === "geolocation" && p.relationType) {
      name = relTypeName.get(p.relationType);
      break;
    }
  }
  inheritedPlaceRel.set(templateId, name);
  return name;
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

  /* Pass 1b: the same edge, walked the other way, and read off the TEMPLATE.
     `Causa` declares its location as a relationship carrying
     `inherit: {type: "geolocation"}` — the spec nothing has ever read, which is
     why a case has never said where its events happened. So the rule is the
     spec: follow THAT relation type, and take the coordinate of what is on the
     other end.

     Following any connected entity with a coordinate was the first attempt and
     it was wrong in a way worth recording: a Causa is also connected to its
     País, and a País carries a centroid, so every case in Brazil borrowed one
     identical point. That is the country facet drawn on a map — the exact
     pattern CEJIL's own adapter rewrite rejected — and it made two different
     cases print the same coordinate. */
  const placeBySid = new Map<string, ConnectedPlace>();
  const geoByEntity = new Map<string, ConnectedPlace>();
  for (const e of es) {
    const coords = geoOf(e);
    if (coords) geoByEntity.set(e.sharedId, { coords, name: e.title.trim() });
  }
  for (const e of es) {
    if (geoByEntity.has(e.sharedId)) continue; // has its own; borrows nothing
    const viaName = inheritedPlaceRelName(e.template);
    if (!viaName) continue;
    for (const r of cejilRelsByEntity().get(e.sharedId) ?? []) {
      if ((r.typeName || "Relacionado") !== viaName) continue;
      const other = r.from === e.sharedId ? r.to : r.from;
      const place = geoByEntity.get(other);
      if (place) {
        placeBySid.set(e.sharedId, place);
        break;
      }
    }
  }

  _libraryEntities = es
    .map((e) => {
      const country = countryOf(e);
      const geo = geoOf(e);
      const card = fieldsOf(e, geo, geo ? undefined : placeBySid.get(e.sharedId));
      return {
        id: e.sharedId,
        title: e.title.trim(),
        typeId: e.template,
        published: e.published,
        preview: docBearing.has(e.sharedId) ? ("document" as const) : undefined,
        country,
        geo,
        createdAt: createdOf(e, geo, causaDateBySid),
        fields: card.fields,
        marks: card.marks,
        searchFields: searchFieldsOf(e),
        descriptors: (e.metadata?.descriptores || [])
          .map((v) => (typeof v.label === "string" ? v.label : ""))
          .filter(Boolean),
        inherited: inheritedOf(e),
      };
    });
  return _libraryEntities;
}
