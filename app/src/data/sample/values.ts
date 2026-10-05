import type { Language } from "../../atoms/language";
import type { AnyMetadataField, MetadataField, RelationshipMetadataField } from "../metadata";
import { metadataFieldsByLanguage } from "../metadata";
import { getEntityProps } from "../entityMetadata";
import { V4_DATES } from "../sampleSeedV4";
import { v4RelationshipFields } from "../sampleSeedV4Fields";
import { templateMirror } from "../templates/mirror";
import type { PropertyDef } from "../templates/types";
import { blankField, blankRelationship, propertyLabel } from "../../utils/templateProjection";
import { MAIN_ENTITY_ID } from "./mainEntity";

/** The Sample corpus's records as their templates' projection (step M5,
 *  template-schema-spec.md §4.4). The values are the ones the Sample has
 *  always held, read from where they live:
 *   - the case record's own fields (`metadataFieldsByLanguage`, `e3` only),
 *     per language;
 *   - each entity's native props (`getEntityProps`), per language;
 *   - the v4 seed's dates (`V4_DATES`) and connections (`v4RelationshipFields`).
 *  The template decides which properties exist, their order and their type;
 *  the record holds every property, empty ones included for the form. */

/** "1995-01-01" → "01/01/1995", the record's date form. */
const dmy = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

function valueOf(name: string, authored: Map<string, MetadataField> | null, native: Record<string, string>, entityId: string) {
  const a = authored?.get(name);
  if (a) {
    // Decision S2: the bench, a list of "Role: Name" lines, is markdown.
    if (a.items?.length) return a.items.map((i) => (i.label ? `${i.label}: ${i.value}` : i.value)).join("\n");
    if (a.value) return a.value;
  }
  if (native[name]) return native[name];
  return undefined;
}

function fieldOf(p: PropertyDef, value: string | undefined, entityId: string, lang: Language): MetadataField | null {
  const base = { id: p.name, label: propertyLabel("mock", p, lang), propertyType: p.type };
  const date = (V4_DATES[entityId] ?? []).find((d) => d.prop === p.name);
  if (p.type === "daterange" && date) {
    const r = { from: dmy(date.value), to: date.end ? dmy(date.end) : "" };
    return { ...base, type: "text", ranges: [r], value: r.to ? `${r.from} – ${r.to}` : r.from };
  }
  const v = value ?? (date ? date.value : undefined);
  if (!v) {
    const blank = blankField("mock", p, lang);
    return blank ? { ...blank, label: base.label } : null;
  }
  switch (p.type) {
    case "select":
    case "multiselect":
      return {
        ...base,
        type: p.type,
        ...(p.content ? { thesaurus: p.content } : {}),
        value: v,
        ...(p.type === "multiselect" ? { values: [v] } : {}),
      };
    case "markdown":
      return { ...base, type: "multiline", value: v };
    case "date":
      return { ...base, type: "date", value: v };
    case "link":
      return { ...base, type: "link", value: v, link: { label: "", url: v } };
    default:
      return { ...base, type: "text", value: v };
  }
}

/** One Sample entity's record in one language, in its template's order. */
export function sampleRecordFields(entityId: string, typeId: string, lang: Language): AnyMetadataField[] {
  const template = templateMirror("mock", typeId);
  const isCase = entityId === MAIN_ENTITY_ID;
  const authoredList = isCase ? metadataFieldsByLanguage[lang] : [];
  const authored = isCase
    ? new Map(authoredList.filter((f): f is MetadataField => f.type !== "relationship").map((f) => [f.id, f]))
    : null;
  const native = getEntityProps(entityId, lang);
  const rels = new Map<string, RelationshipMetadataField>();
  for (const f of authoredList) if (f.type === "relationship") rels.set(f.id, f);
  const v4 = v4RelationshipFields(entityId, typeId, lang);
  for (const f of v4) rels.set(f.id, f);

  const out: AnyMetadataField[] = [];
  const placed = new Set<string>();
  for (const p of template?.properties ?? []) {
    if (p.type === "relationship") {
      const f = rels.get(p.name);
      if (f) {
        out.push(f);
        placed.add(f.id);
      } else {
        // No connection yet (a property added in Settings): the empty field
        // the form's connection editor fills.
        out.push(blankRelationship("mock", p, lang, p.content ? templateMirror("mock", p.content) : undefined));
      }
      continue;
    }
    const f = fieldOf(p, valueOf(p.name, authored, native, entityId), entityId, lang);
    if (f) out.push(f);
  }
  // Connections the record derives beyond its template (the judges reached
  // through a case's judgments) follow the template's own.
  for (const f of v4) if (!placed.has(f.id)) out.push(f);
  // The description is the form's own box, not a template property.
  const description = authored?.get("description");
  if (description) out.push(description);
  return out;
}
