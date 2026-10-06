import type { Language } from "../../atoms/language";
import type { AnyMetadataField, MetadataField } from "../metadata";
import { metadataFieldsByLanguage } from "../metadata";
import { getEntityProps } from "../entityMetadata";
import { templateMirror } from "../templates/mirror";
import type { PropertyDef } from "../templates/types";
import { blankField, fieldsOverTemplate, legacyTypeOf } from "../../utils/templateProjection";
import { lbl, TYPE_FIELDS } from "./typeFields";
import { MAIN_ENTITY_ID } from "./mainEntity";

/** The Sample corpus's records as their templates' projection (step M4,
 *  template-schema-spec.md §4.4). The template decides which properties exist,
 *  their order and their type; the values are the ones the Sample has always
 *  held, read from where they live:
 *   - the case record's own fields (`metadataFieldsByLanguage`, `e3` only),
 *     per language, laid over Court Case as they are;
 *   - every other entity's native props (`getEntityProps`), per language.
 *  The record holds every property, empty ones included for the form.
 *  Main has no v4 seed, and keeps the Sample's labels (the field table's
 *  translations), value types and values: an entity reads only the props its
 *  type's field table names, so a court case's native `country` stays out of
 *  its record, as it always has. */

function fieldOf(p: PropertyDef, value: string | undefined, lang: Language): MetadataField | null {
  if (!value) return blankField("mock", p, lang);
  const type = legacyTypeOf(p.type);
  if (!type) return null;
  return {
    id: p.name,
    label: lbl(p.name, lang),
    type,
    value,
    ...((p.type === "select" || p.type === "multiselect") && p.content ? { thesaurus: p.content } : {}),
    ...(p.type === "multiselect" ? { values: [value] } : {}),
    propertyType: p.type,
  };
}

/** One Sample entity's record in one language, in its template's order. */
export function sampleRecordFields(entityId: string, typeId: string, lang: Language): AnyMetadataField[] {
  const template = templateMirror("mock", typeId);
  if (entityId === MAIN_ENTITY_ID) return fieldsOverTemplate("mock", template, metadataFieldsByLanguage[lang], lang);
  const native = getEntityProps(entityId, lang);
  const own = new Set((TYPE_FIELDS[typeId] ?? []).map((f) => f.prop));
  const out: AnyMetadataField[] = [];
  for (const p of template?.properties ?? []) {
    if (p.type === "relationship") continue;
    const f = fieldOf(p, own.has(p.name) ? native[p.name] : undefined, lang);
    if (f) out.push(f);
  }
  return out;
}
