// The CEJIL templates as template definitions (data/templates/types.ts).
//
// The dump in the repo was imported without property `_id`, `showInCard`,
// `filter` or `required` (`cleanProp` in scripts/import-cejil.cjs). Decision
// S1: keep heuristic flags until the dump is re-imported with them, which then
// replaces this module's flag rules in place:
//   - showInCard and filter: thesaurus-backed select / multiselect (what the
//     Library has always faceted and carded), plus `pa_s`, the relationship the
//     Country facet hoists;
//   - required: false everywhere.
// Property ids are synthesized `${templateId}:${name}` (propertyIdOf).
import type { PropertyDef, PropertyType, TemplateDef } from "../templates/types";
import { propertyIdOf } from "../templates/types";
import { cejilTemplates } from "./templates";
import { cejilTypeById } from "./typesAdapter";
import type { CejilTemplateProperty } from "./types";

const COUNTRY_PROPERTY = "pa_s";

const isThesaurusBacked = (p: CejilTemplateProperty) =>
  (p.type === "select" || p.type === "multiselect") && !!p.content;

/** CEJIL's `datasection` is a date (the record has always read it as one). */
const typeOf = (t: string): PropertyType => (t === "datasection" ? "date" : (t as PropertyType));

const byId = new Map(cejilTemplates.map((t) => [t._id, t]));

/** `inherit.property` names a target property `_id` the stripped dump cannot
 *  resolve. When the target template has exactly one property of the
 *  inherited type, that is the one; otherwise it stays unresolved and the form
 *  shows the connection without an inherited column. */
function resolveInherit(p: CejilTemplateProperty): Pick<PropertyDef, "inherit" | "x"> {
  if (!p.inherit || !p.content) return {};
  const target = byId.get(p.content);
  const sameType = (target?.properties ?? []).filter((x) => x.type === p.inherit!.type);
  if (target && sameType.length === 1)
    return { inherit: { property: propertyIdOf(target._id, sameType[0].name), type: typeOf(p.inherit.type) } };
  return { x: { inheritUnresolved: true } };
}

function propertyOf(templateId: string, p: CejilTemplateProperty): PropertyDef {
  const flagged = isThesaurusBacked(p) || p.name === COUNTRY_PROPERTY;
  return {
    id: propertyIdOf(templateId, p.name),
    name: p.name,
    label: p.label,
    type: typeOf(p.type),
    ...(flagged ? { showInCard: true, filter: true } : {}),
    ...(p.content ? { content: p.content } : p.type === "relationship" ? { content: "" } : {}),
    ...(p.relationType ? { relationType: p.relationType } : {}),
    ...resolveInherit(p),
  };
}

export const cejilTemplateDefs: TemplateDef[] = cejilTemplates.map((t) => ({
  id: t._id,
  name: t.name.trim(),
  // The typesAdapter's colour: the dump's own, else the palette by index.
  color: cejilTypeById.get(t._id)!.color,
  isDefault: !!t.default,
  commonProperties: (t.commonProperties ?? []).map((p) => propertyOf(t._id, p)),
  properties: t.properties.map((p) => propertyOf(t._id, p)),
}));
