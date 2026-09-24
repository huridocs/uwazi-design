// The Travesía corpus in the Library's shape (`Entity`): a title, the card
// lines, the search text, a place and — for a person — a portrait. The record
// in depth is profile.ts. Everything here reads the loaded corpus (load.ts), so
// callers gate on `travesiaLoaded()`.
import type { CardField, Entity } from "../entities";
import type { LatLng } from "../geo";
import { kindOfUwaziType } from "../../utils/propertyKind";
import { formatPlace } from "../../utils/geoFormat";
import { travesiaTemplateById, travesiaTemplates } from "./schema";
import { travesiaCorpus } from "./load";
import { portraitImage } from "./portrait";
import type { TravesiaEntity, TravesiaMetaValue, TravesiaProperty } from "./types";

/** Dates are epoch seconds, as Uwazi stores them; a card prints the day. */
export function fmtDay(v: unknown): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "";
  const d = new Date(v * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}
const span = (v: unknown) => {
  const r = v as { from?: number; to?: number } | undefined;
  const a = fmtDay(r?.from);
  const b = fmtDay(r?.to);
  return a && b ? `${a} – ${b}` : a || b;
};
export function latLngOf(v: unknown): LatLng | undefined {
  const o = v as { lat?: unknown; lon?: unknown } | undefined;
  return typeof o?.lat === "number" && typeof o?.lon === "number" ? { lat: o.lat, lng: o.lon } : undefined;
}

/** One property's values as display strings, whatever its type. A relationship
 *  that inherits shows what it inherited; one that doesn't, whom it connects. */
export function displayValues(p: TravesiaProperty, vals: TravesiaMetaValue[] | undefined): string[] {
  if (!vals?.length) return [];
  switch (p.type) {
    case "select":
    case "multiselect":
      return vals.map((v) => v.label ?? "").filter(Boolean);
    case "relationship":
      if (p.inherit) {
        const inner = vals.flatMap((v) => v.inheritedValue ?? []);
        return inner.map((v) => displayScalar(p.inherit!.type, v.value, v.label)).filter(Boolean);
      }
      return vals.map((v) => v.label ?? "").filter(Boolean);
    default:
      return vals.map((v) => displayScalar(p.type, v.value, v.label)).filter(Boolean);
  }
}
function displayScalar(type: string, value: unknown, label?: string): string {
  if (label) return label;
  switch (type) {
    case "date":
      return fmtDay(value);
    case "daterange":
      return span(value);
    case "multidaterange":
      return span(value);
    case "geolocation": {
      const c = latLngOf(value);
      return c ? formatPlace(c) : "";
    }
    case "link":
      return (value as { url?: string } | undefined)?.url ?? "";
    case "numeric":
      return typeof value === "number" ? String(value) : "";
    default:
      return typeof value === "string" ? value : "";
  }
}

const SKIP_CARD = new Set(["image", "markdown"]);

/** A card's lines: the properties the TEMPLATE marks `showInCard`, in its
 *  order, the way Uwazi builds a card — not every one of up to 56. */
function fieldsOf(e: TravesiaEntity, tpl: { properties: TravesiaProperty[] }): CardField[] | undefined {
  const out: CardField[] = [];
  for (const p of tpl.properties) {
    if (!p.showInCard || SKIP_CARD.has(p.type)) continue;
    const values = displayValues(p, e.metadata[p.name]);
    if (!values.length) continue;
    out.push({
      key: p.name,
      kind: kindOfUwaziType(p.type),
      label: p.label,
      value: values[0],
      ...(values.length > 1 ? { values: values.slice(0, 4), more: values.length - 1 } : {}),
    });
  }
  return out.length ? out : undefined;
}

function searchFieldsOf(e: TravesiaEntity, tpl: { properties: TravesiaProperty[] }) {
  const out: { key: string; label: string; value: string }[] = [];
  for (const p of tpl.properties) {
    if (p.type === "image") continue;
    const values = displayValues(p, e.metadata[p.name]);
    if (values.length) out.push({ key: p.name, label: p.label, value: values.join(", ") });
  }
  return out;
}

/** The person template — the one with the photograph property. */
const PERSON_TPL = travesiaTemplates.find((t) => t.properties.some((p) => p.type === "image"));
const propByLabel = (re: RegExp) => PERSON_TPL?.properties.find((p) => re.test(p.label));
const P_SEX = propByLabel(/^género$/i);
const P_AGE = propByLabel(/^edad en el momento/i);
const P_COUNTRY = propByLabel(/^país de nacimiento/i);
const P_PHOTO = PERSON_TPL?.properties.find((p) => p.type === "image");

/** A person's sex, age and country, as the portrait and the card read them. */
export function personFacts(e: TravesiaEntity) {
  const sex = P_SEX ? e.metadata[P_SEX.name]?.[0]?.label : undefined;
  const age = P_AGE ? (e.metadata[P_AGE.name]?.[0]?.value as number | undefined) : undefined;
  const country = P_COUNTRY ? e.metadata[P_COUNTRY.name]?.[0]?.label : undefined;
  return { sex: sex === "Mujer" ? "F" : sex === "Hombre" ? "M" : undefined, age, country };
}

/** The synthetic portrait of a person record, or nothing for any other. */
export function portraitOf(e: TravesiaEntity) {
  if (!P_PHOTO || e.template !== PERSON_TPL?._id || !e.metadata[P_PHOTO.name]?.length) return undefined;
  const { sex, age, country } = personFacts(e);
  return portraitImage(
    { id: e.sharedId, sex, age, darker: country === "HAITÍ" },
    `Retrato sintético de ${e.title}`,
    P_PHOTO.name,
  );
}

/** "HONDURAS" → "Honduras": the thesaurus writes countries in capitals. */
const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());

function geoOf(e: TravesiaEntity, tpl: { properties: TravesiaProperty[] }): LatLng | undefined {
  for (const p of tpl.properties) {
    if (p.type !== "geolocation") continue;
    const c = latLngOf(e.metadata[p.name]?.[0]?.value);
    if (c) return c;
  }
  return undefined;
}

/** The Library's property facets for this corpus. The templates mark 124
 *  select properties `filter`; a facet column holding them all would be a
 *  questionnaire, so these are a person's sex, origin and status, their
 *  destination, and the places. Keyed by property NAME, which is the same on
 *  every template that carries it (Género and País de nacimiento are on two). */
export const travesiaFacetDefs: { propId: string; label: string }[] = [
  { propId: "género", label: "Género" },
  { propId: "país_de_nacimiento", label: "País de nacimiento" },
  { propId: "situación_migratoria", label: "Situación migratoria" },
  { propId: "¿qué_país_tiene_como_destino_", label: "País de destino" },
  { propId: "lugar_en_donde_ocurrieron_los_hechos___estado", label: "Estado de los hechos" },
  { propId: "región", label: "Región" },
];

function facetValuesOf(e: TravesiaEntity): Record<string, string[]> | undefined {
  const out: Record<string, string[]> = {};
  for (const { propId } of travesiaFacetDefs) {
    const vals = (e.metadata[propId] ?? []).map((v) => v.label ?? "").filter(Boolean);
    if (vals.length) out[propId] = vals;
  }
  return Object.keys(out).length ? out : undefined;
}

let _entities: Entity[] | null = null;
let _byId: Map<string, Entity> | null = null;

/** The corpus as Library entities — built once, after the corpus has loaded. */
export function travesiaLibraryEntities(): Entity[] {
  const c = travesiaCorpus();
  if (!c) return [];
  if (_entities) return _entities;
  _entities = c.entities.map((e) => {
    const tpl = travesiaTemplateById.get(e.template)!;
    const image = portraitOf(e);
    const { country } = personFacts(e);
    const inherited = facetValuesOf(e);
    return {
      id: e.sharedId,
      title: e.title,
      typeId: e.template,
      createdAt: new Date(e.creationDate).toISOString().slice(0, 10),
      published: true,
      ...(image ? { preview: "image" as const, image, images: [image] } : {}),
      ...(country ? { country: titleCase(country) } : {}),
      ...(geoOf(e, tpl) ? { geo: geoOf(e, tpl) } : {}),
      ...(inherited ? { inherited } : {}),
      fields: fieldsOf(e, tpl),
      searchFields: searchFieldsOf(e, tpl),
    };
  });
  return _entities;
}

export function travesiaEntityById(): Map<string, Entity> {
  if (!_byId || _byId.size !== travesiaLibraryEntities().length)
    _byId = new Map(travesiaLibraryEntities().map((e) => [e.id, e]));
  return _byId;
}
