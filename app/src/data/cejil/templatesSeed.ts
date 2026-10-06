// The CEJIL templates as template definitions (data/templates/types.ts).
//
// The dump in the repo was imported without property `_id`, `showInCard`,
// `filter` or `required` (`cleanProp` in scripts/import-cejil.cjs). Decision
// S1: keep heuristic flags until the dump is re-imported with them, which then
// replaces this module's flag rules in place:
//   - filter: thesaurus-backed select / multiselect (what the Library has always
//     faceted), plus `pa_s`, the relationship the Country facet hoists;
//   - showInCard: every property the Library's card has always shown (all
//     but paragraphs, pictures, previews, tables and recordings, which ride the
//     card's footer as marks or are its thumbnail);
//   - required: false everywhere.
// Property ids are synthesized `${templateId}:${name}` (propertyIdOf).
import type { PropertyDef, PropertyType, TemplateDef } from "../templates/types";
import { propertyIdOf } from "../templates/types";
import { cejilTemplates } from "./templates";
import { cejilTypeById } from "./typesAdapter";
import { CEJIL_PERPETRATOR_CHAIN } from "./graph";
import type { CejilTemplateProperty } from "./types";

const COUNTRY_PROPERTY = "pa_s";
const NOT_CARDED = new Set(["markdown", "image", "preview", "nested", "media"]);

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
  const carded = !NOT_CARDED.has(p.type) && !["title", "creationDate", "editDate"].includes(p.name);
  return {
    id: propertyIdOf(templateId, p.name),
    name: p.name,
    label: p.label,
    type: typeOf(p.type),
    ...(carded ? { showInCard: true } : {}),
    // A document's date is the sort Uwazi would "pick as best fit". Priority
    // sorting needs Use as filter (ConfigPropertyPanel.tsx).
    ...(flagged || p.name === "fecha" ? { filter: true } : {}),
    ...(p.name === "fecha" ? { prioritySorting: true } : {}),
    ...(p.content ? { content: p.content } : p.type === "relationship" ? { content: "" } : {}),
    ...(p.relationType ? { relationType: p.relationType } : {}),
    ...resolveInherit(p),
  };
}

/** Juez y/o Comisionado (facts only) and Causa (a Resumen to read) open in the
 *  published view (`TemplateDef.publishedView`). */
const PUBLISHED_VIEW_TEMPLATES = new Set(["58b2f3a35d59f31e1345b4b6", "58b2f3a35d59f31e1345b48a"]);

/** The relationship chain the Library filters Causas by (`TemplateDef.chains`):
 *  Causa → Sentencia → Juez → País, exposing the signing judge (node 2) and
 *  that judge's country (node 3) as path-coupled facets. */
function chainsOf(templateId: string): Pick<TemplateDef, "chains"> {
  const c = CEJIL_PERPETRATOR_CHAIN;
  if (templateId !== c.rootTypeId) return {};
  return {
    chains: [
      {
        id: c.id,
        label: c.label,
        description: c.description,
        segments: c.segments,
        facets: [
          { segmentIndex: 2, label: "Juez firmante", property: "title" },
          { segmentIndex: 3, label: "País del juez", property: "title" },
        ],
        defaultFilter: true,
      },
    ],
  };
}

let built: TemplateDef[] | null = null;
/** Built on first read (see data/sample/templates.ts). */
export const cejilTemplateDefs = (): TemplateDef[] => (built ??= cejilTemplates.map((t) => ({
  id: t._id,
  name: t.name.trim(),
  // The typesAdapter's colour: the dump's own, else the palette by index.
  color: cejilTypeById.get(t._id)!.color,
  isDefault: !!t.default,
  commonProperties: (t.commonProperties ?? []).map((p) => propertyOf(t._id, p)),
  properties: t.properties.map((p) => propertyOf(t._id, p)),
  ...(PUBLISHED_VIEW_TEMPLATES.has(t._id) ? { publishedView: true } : {}),
  ...chainsOf(t._id),
})));
