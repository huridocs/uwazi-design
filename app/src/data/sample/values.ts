import type { Language } from "../../atoms/language";
import type { AnyMetadataField, MetadataField } from "../metadata";
import { metadataFieldsByLanguage } from "../metadata";
import { getEntityProps } from "../entityMetadata";
import { TEMPLATE_SEEDS, templateMirror } from "../templates/mirror";
import type { PropertyDef } from "../templates/types";
import { blankField, blankRelationship, fieldsOverTemplate, legacyTypeOf, propertyLabel } from "../../utils/templateProjection";
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

/** A property as the seed has it, by name: what tells a property Settings
 *  renamed or added from one it left alone. */
function seedOf(typeId: string): Map<string, PropertyDef> {
  return new Map((TEMPLATE_SEEDS.mock().find((t) => t.id === typeId)?.properties ?? []).map((p) => [p.name, p]));
}

/** The field table's label, until Settings renames the property; then the
 *  template's (spec M8: records follow template edits). */
function labelOf(p: PropertyDef, seed: Map<string, PropertyDef>, lang: Language): string {
  return seed.get(p.name)?.label === p.label ? lbl(p.name, lang) : propertyLabel("mock", p, lang);
}

function fieldOf(p: PropertyDef, seed: Map<string, PropertyDef>, value: string | undefined, lang: Language): MetadataField | null {
  if (!value) return blankField("mock", p, lang);
  const type = legacyTypeOf(p.type);
  if (!type) return null;
  return {
    id: p.name,
    label: labelOf(p, seed, lang),
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
  const seed = seedOf(typeId);
  // A relationship property Settings added: the empty connection the form
  // fills. The seed's own relationship properties stay out, as they always
  // have on main.
  const added = (p: PropertyDef) => !seed.has(p.name);
  if (entityId === MAIN_ENTITY_ID) {
    const current = new Map((template?.properties ?? []).map((p) => [p.name, p]));
    return fieldsOverTemplate("mock", template, metadataFieldsByLanguage[lang], lang, added)
      // A property Settings removed takes its field with it; one it renamed
      // relabels it.
      .filter((f) => current.has(f.id) || !seed.has(f.id))
      .map((f) => {
        const p = current.get(f.id);
        return p && seed.get(p.name)?.label !== p.label ? { ...f, label: propertyLabel("mock", p, lang) } : f;
      });
  }
  const native = getEntityProps(entityId, lang);
  const own = new Set((TYPE_FIELDS[typeId] ?? []).map((f) => f.prop));
  const out: AnyMetadataField[] = [];
  for (const p of template?.properties ?? []) {
    if (p.type === "relationship") {
      if (added(p)) out.push(blankRelationship("mock", p, lang, p.content ? templateMirror("mock", p.content) : undefined));
      continue;
    }
    const f = fieldOf(p, seed, own.has(p.name) ? native[p.name] : undefined, lang);
    if (f) out.push(f);
  }
  return out;
}
