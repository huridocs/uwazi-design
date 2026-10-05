import type { Language } from "../atoms/language";
import type { Corpus } from "../data/entityOverlay";
import type { AnyMetadataField, MetadataField, RelationshipMetadataField } from "../data/metadata";
import type { PropertyDef, PropertyType, TemplateDef } from "../data/templates/types";
import { allProperties } from "../data/templates/types";
import { formatPlace } from "./geoFormat";
import { lbl } from "../data/sample/typeFields";

/** The one place a template becomes the fields a form, a record, Copy From,
 *  bulk edit and Change template read (template-schema-spec.md §4.5).
 *
 *  Step M2 projects blank forms: one field per property the form can edit, in
 *  template order, empty. Records move onto it in M3 (CEJIL, Travesía) and
 *  M4 (Sample, Artworks). A field's `id` is the property's `name`, the key
 *  every key-based feature already uses; `propertyType` is the template's
 *  type, and the legacy `type` is derived from it. */

/** The editor a property type gets today. `null`: no editor yet, so a blank
 *  form leaves it out. On main the media, geolocation and image editors arrive
 *  with the typed editors (stage 2c), so those are null until then. */
const LEGACY_TYPE: Record<PropertyType, MetadataField["type"] | null> = {
  text: "text",
  markdown: "multiline",
  numeric: "text",
  date: "date",
  multidate: "text",
  daterange: "text",
  multidaterange: "text",
  select: "select",
  multiselect: "multiselect",
  link: "link",
  media: null,
  generatedid: "text",
  relationship: null,
  geolocation: null,
  image: null,
  preview: null,
  nested: null,
};

export const legacyTypeOf = (t: PropertyType) => LEGACY_TYPE[t] ?? null;

/** A property's label in a reading language. The Sample is translated, and
 *  its field table holds the other languages (decision S5 keeps the template
 *  in English; this is the translation layer's job, done here until
 *  Translations exists). The imported corpora are one-language: the label as
 *  the template has it. */
export function propertyLabel(corpus: Corpus, p: PropertyDef, lang: Language): string {
  if (corpus !== "mock" || lang === "EN") return p.label;
  const translated = lbl(p.name, lang);
  return translated === p.name ? p.label : translated;
}

/** One property as an empty form field, or null when the form has no editor
 *  for its type. */
export function blankField(corpus: Corpus, p: PropertyDef, lang: Language): MetadataField | null {
  const type = legacyTypeOf(p.type);
  if (!type) return null;
  // A select bound to no thesaurus stays a select: the form offers "New
  // thesaurus" for exactly that case.
  return {
    id: p.name,
    label: propertyLabel(corpus, p, lang),
    propertyType: p.type,
    type,
    value: "",
    ...((p.type === "select" || p.type === "multiselect") && p.content ? { thesaurus: p.content } : {}),
    ...(p.type === "multiselect" ? { values: [] } : {}),
    // A list type: the bulk form leaves it out.
    ...(p.type === "multidate" || p.type === "multidaterange" ? { list: true } : {}),
    ...(p.type === "multidate" ? { dates: [], displayValues: [] } : {}),
    ...(p.type === "daterange" || p.type === "multidaterange" ? { ranges: [], displayValues: [] } : {}),
  };
}

/** A short id for a "Generated ID" property on a new entity (Uwazi prefills
 *  it, and it stays editable). */
export const generatedId = () => Math.random().toString(36).slice(2, 10).toUpperCase();

/** A template's blank form in one language: its properties in order, the
 *  common ones (title, dates) left to the form's own header. */
export function blankFieldsFor(corpus: Corpus, template: TemplateDef | undefined, lang: Language): MetadataField[] {
  const out: MetadataField[] = [];
  for (const p of template?.properties ?? []) {
    const f = blankField(corpus, p, lang);
    if (f) out.push(f);
  }
  return out;
}

/* ── Records (step M3: CEJIL and Travesía) ──────────────────────────────── */

/** One Uwazi metadata value, as both dumps store it. */
export interface RawValue {
  value: unknown;
  label?: string;
}

/** What a corpus tells the record projection about itself. */
export interface RecordContext {
  corpus: Corpus;
  /** A relationship type's display name, by registry id. References carry it,
   *  so it is what `relationLabel` resolves (Settings renames included). */
  relationTypeName: (id: string | undefined) => string;
  /** A template of the corpus, for a relationship's target: the inherited
   *  property's name and the connected column's header. */
  template: (id: string) => TemplateDef | undefined;
}

/** Dates are epoch seconds in both dumps; the record prints dd/mm/yyyy. */
export function fmtDate(v: unknown): string {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return "";
  const d = new Date(v * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

function fmtRange(v: unknown): string {
  const r = v as { from?: unknown; to?: unknown } | undefined;
  const a = fmtDate(r?.from);
  const b = fmtDate(r?.to);
  if (a && b) return `${a} – ${b}`;
  return a ? `${a} –` : b ? `– ${b}` : "";
}

/** `{lat, lon}` as both dumps write it (`lng` accepted). */
export function latLngOf(v: unknown): { lat: number; lng: number } | undefined {
  const o = v as { lat?: unknown; lon?: unknown; lng?: unknown } | undefined;
  const lng = o?.lon ?? o?.lng;
  return typeof o?.lat === "number" && typeof lng === "number" ? { lat: o.lat, lng } : undefined;
}

/** One property's values as display strings, by its type. A thesaurus or
 *  relationship value prints its label. */
export function displayStrings(type: PropertyType, vals: RawValue[] | undefined): string[] {
  const out: string[] = [];
  for (const v of vals ?? []) {
    let s = "";
    switch (type) {
      case "date":
      case "multidate":
        s = fmtDate(v.value);
        break;
      case "daterange":
      case "multidaterange":
        s = fmtRange(v.value);
        break;
      case "geolocation": {
        const c = latLngOf(v.value);
        s = c ? formatPlace(c, (v.value as { label?: string }).label || undefined) : "";
        break;
      }
      case "link":
        s = (v.value as { url?: string } | undefined)?.url ?? (typeof v.value === "string" ? v.value : "");
        break;
      default:
        s = typeof v.label === "string" && v.label ? v.label : typeof v.value === "string" || typeof v.value === "number" ? String(v.value) : "";
    }
    if (s.trim()) out.push(s);
  }
  return out;
}

/** A relationship property as the record's connection field: the entities
 *  the record holds for it (`metadata[name]`), the inherited column resolved
 *  through the target template (by the inherited property's `name`). Read-only:
 *  the connections are the corpus's. */
function relationshipFieldOf(p: PropertyDef, vals: RawValue[], ctx: RecordContext): RelationshipMetadataField | null {
  const ids = vals.map((v) => (typeof v.value === "string" ? v.value : "")).filter(Boolean);
  if (!ids.length) return null;
  const target = p.content ? ctx.template(p.content) : undefined;
  const inherited = p.inherit && target ? allProperties(target).find((x) => x.id === p.inherit!.property) : undefined;
  return {
    id: p.name,
    label: p.label,
    type: "relationship",
    relationType: ctx.relationTypeName(p.relationType),
    targetTypeId: p.content ?? "",
    connectedEntityIds: ids,
    connectedLabels: Object.fromEntries(
      vals.filter((v) => typeof v.value === "string" && v.label).map((v) => [v.value as string, v.label as string]),
    ),
    connectionKey: p.x?.connectionKey ?? `${p.relationType}:${p.content ?? ""}`,
    ...(inherited ? { inheritProperty: inherited.name, inheritLabel: p.label } : {}),
    ...(target ? { entityLabel: target.name } : {}),
    readOnly: true,
  };
}

/** A record's fields from its template and its raw values, in template
 *  order (template-schema-spec.md §4.4): no type is flattened. Dates, ranges
 *  and places keep their type (`propertyType`); list types keep each value
 *  (`displayValues`). A property the form can edit is emitted even when empty,
 *  since the form needs it; one it cannot (a connection, a place) only when it
 *  holds a value. Images and previews are not metadata fields (the record's
 *  image card and the Document tab draw them); nested tables wait for a
 *  renderer. */
export function recordFieldsFor(
  template: TemplateDef | undefined,
  values: Record<string, RawValue[] | undefined>,
  ctx: RecordContext,
): AnyMetadataField[] {
  const out: AnyMetadataField[] = [];
  for (const p of template?.properties ?? []) {
    const vals = (values[p.name] ?? []).filter((v) => v && v.value !== null && v.value !== undefined && v.value !== "");
    if (p.type === "preview" || p.type === "nested") continue;
    if (p.type === "relationship") {
      const f = relationshipFieldOf(p, vals, ctx);
      if (f) out.push(f);
      continue;
    }
    const base = { id: p.name, label: propertyLabel(ctx.corpus, p, "EN"), propertyType: p.type };
    if (p.type === "image") {
      // The stored reference, for the form's picker. The record draws a
      // picture only for a URL; a corpus's own token (Travesía's portraits) is
      // drawn by the record's image card.
      const raw = vals[0]?.value;
      out.push({ ...base, type: "text", value: typeof raw === "string" ? raw : "" });
      continue;
    }
    if (p.type === "media") {
      // The raw value, untouched: the editor must save it byte-identical.
      const raw = vals[0]?.value;
      out.push({ ...base, type: "media", value: typeof raw === "string" ? raw : "" });
      continue;
    }
    if (p.type === "select" || p.type === "multiselect") {
      const chosen = vals.filter((v) => typeof v.label === "string" && v.label);
      const labels = chosen.map((v) => v.label as string);
      out.push({
        ...base,
        type: p.type,
        ...(p.content ? { thesaurus: p.content } : {}),
        value: labels.join(", "),
        // Labels are this language's; ids are the thesaurus's, the same in every
        // language: what lets the form tick the right row.
        valueIds: chosen.map((v) => (typeof v.value === "string" ? v.value : "")),
        ...(p.type === "multiselect" ? { values: labels } : {}),
      });
      continue;
    }
    const strings = displayStrings(p.type, vals);
    if (!strings.length) {
      const blank = blankField(ctx.corpus, p, "EN");
      if (blank) out.push({ ...blank, label: base.label });
      continue;
    }
    const multi = p.type === "multidate" || p.type === "multidaterange";
    const value = p.type === "markdown" ? strings.join("\n\n") : multi ? strings.join(" · ") : strings.join(", ");
    out.push({
      ...base,
      ...typedOf(p.type, vals),
      type:
        p.type === "markdown" || (p.type === "text" && value.length > 120)
          ? "multiline"
          : p.type === "date"
            ? "date"
            : p.type === "link"
              ? "link"
              : "text",
      value,
      ...(multi ? { list: true, displayValues: strings } : {}),
    });
  }
  return out;
}

/** The typed values a display string cannot hold (see MetadataField). */
function typedOf(type: PropertyType, vals: RawValue[]): Partial<MetadataField> {
  switch (type) {
    case "link": {
      const v = vals[0]?.value as { label?: string; url?: string } | string | undefined;
      const url = typeof v === "string" ? v : v?.url ?? "";
      return url ? { link: { label: (typeof v === "object" && v?.label) || "", url } } : {};
    }
    case "geolocation": {
      const c = latLngOf(vals[0]?.value);
      const label = (vals[0]?.value as { label?: string } | undefined)?.label;
      return c ? { geo: { lat: c.lat, lon: c.lng, ...(label ? { label } : {}) } } : {};
    }
    case "multidate":
      return { dates: vals.map((v) => fmtDate(v.value)).filter(Boolean) };
    case "daterange":
    case "multidaterange":
      return {
        ranges: vals.map((v) => {
          const r = v.value as { from?: unknown; to?: unknown } | undefined;
          return { from: fmtDate(r?.from), to: fmtDate(r?.to) };
        }),
      };
    default:
      return {};
  }
}

/** A relationship property with no connection yet: the field the form's
 *  connection editor fills (an entity picker filtered by the target template).
 *  The imported corpora keep connections read-only, as their records do. */
export function blankRelationship(corpus: Corpus, p: PropertyDef, lang: Language, target?: TemplateDef): RelationshipMetadataField {
  const inherited = p.inherit ? target?.properties.find((x) => x.id === p.inherit!.property) : undefined;
  return {
    id: p.name,
    label: propertyLabel(corpus, p, lang),
    type: "relationship",
    relationType: p.relationType ?? "",
    targetTypeId: p.content ?? "",
    connectedEntityIds: [],
    ...(inherited ? { inheritProperty: inherited.name, inheritLabel: inherited.label } : {}),
    ...(corpus === "mock" ? {} : { readOnly: true }),
  };
}

/** A saved record (an entity created or edited in this session) laid over
 *  its template as it is now: the template decides which fields there are,
 *  their order and their labels; the record gives the values, by property
 *  name. A property added since gets its blank field; one removed since
 *  (a name the template's seed had, or a template-typed field) is dropped;
 *  fields no template property describes (the Sample's description, derived
 *  connections) stay after the template's. */
export function projectRecordFields(
  corpus: Corpus,
  template: TemplateDef | undefined,
  seed: TemplateDef | undefined,
  fields: AnyMetadataField[],
  lang: Language,
  targetOf: (id: string) => TemplateDef | undefined,
): AnyMetadataField[] {
  if (!template) return fields;
  const byName = new Map(fields.map((f) => [f.id, f]));
  const current = new Set(template.properties.map((p) => p.name));
  const seeded = new Set((seed?.properties ?? []).map((p) => p.name));
  const out: AnyMetadataField[] = [];
  for (const p of template.properties) {
    const f = byName.get(p.name);
    if (f) out.push({ ...f, label: propertyLabel(corpus, p, lang) });
    else if (p.type === "relationship") out.push(blankRelationship(corpus, p, lang, p.content ? targetOf(p.content) : undefined));
    else {
      const blank = blankField(corpus, p, lang);
      if (blank) out.push(blank);
    }
  }
  for (const f of fields) {
    if (current.has(f.id)) continue;
    const removed = seeded.has(f.id) || (f.type !== "relationship" && !!(f as MetadataField).propertyType);
    if (!removed) out.push(f);
  }
  return out;
}

/** Main's Sample and Best Artworks records over their templates (stage 2b).
 *  The template decides which properties there are and their order; every
 *  value keeps the field its corpus already builds (label, type, flag, items),
 *  so nothing a record shows changes. A property with no value gets its blank
 *  field, for the form; a relationship property with no connection is left
 *  out. Fields no template property describes (the case record's description
 *  and other files) keep their place: each follows the field it followed. */
export function fieldsOverTemplate(
  corpus: Corpus,
  template: TemplateDef | undefined,
  fields: AnyMetadataField[],
  lang: Language,
): AnyMetadataField[] {
  if (!template) return fields;
  const byName = new Map(fields.map((f) => [f.id, f]));
  const declared = new Set(template.properties.map((p) => p.name));
  const out: AnyMetadataField[] = [];
  for (const p of template.properties) {
    const f = byName.get(p.name);
    if (f) out.push(f);
    else if (p.type !== "relationship") {
      const blank = blankField(corpus, p, lang);
      if (blank) out.push(blank);
    }
  }
  fields.forEach((f, i) => {
    if (declared.has(f.id)) return;
    const before = fields.slice(0, i).reverse().find((g) => out.includes(g));
    out.splice(before ? out.indexOf(before) + 1 : 0, 0, f);
  });
  return out;
}
