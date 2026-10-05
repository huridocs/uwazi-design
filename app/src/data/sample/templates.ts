// The Sample corpus's templates as template definitions
// (data/templates/types.ts), hand-authored from what the corpus already holds:
//   - each type of `entityTypes`;
//   - its native properties, in order, from the field table (`TYPE_FIELDS`);
//   - the case record's relationship fields (`relationshipFieldsByLanguage`),
//     which belong to Court Case;
//   - the v4 seed's relationship fields (`V4_FIELDS`).
// Labels are English (decision S5); the field table's other languages are the
// Sample's translations and stay with the projection.
//
// Court Case is reconciled with the case record `e3` (step M5): its own fields
// are Court Case properties, in a reviewed order. Its country is a select on
// the Countries thesaurus (decision S3), its bench is markdown (S2), and its
// other files belong to the Files tab, not to metadata. The v4 seed's dates are
// properties of the templates whose entities carry them.
import type { PropertyDef, PropertyType, TemplateDef } from "../templates/types";
import { commonPropertiesFor, propertyIdOf } from "../templates/types";
import { entities, entityTypes } from "../entities";
import { relationshipFieldsByLanguage } from "../metadata";
import { V4_DATES, V4_FIELDS } from "../sampleSeedV4";
import { lbl, TYPE_FIELDS } from "./typeFields";

const TYPE_OF: Record<string, PropertyType> = {
  text: "text",
  select: "select",
  multiselect: "multiselect",
  multiline: "markdown",
  date: "date",
  link: "link",
  media: "media",
};

function nativeProperties(typeId: string): PropertyDef[] {
  return (TYPE_FIELDS[typeId] ?? []).map(({ prop, type, thesaurus }) => ({
    id: propertyIdOf(typeId, prop),
    name: prop,
    label: lbl(prop, "EN"),
    type: TYPE_OF[type] ?? "text",
    ...(thesaurus ? { content: thesaurus } : {}),
    // Every native property is a card line, as the Sample's cards have always
    // shown; its selects are what its Library facets.
    ...(type !== "multiline" ? { showInCard: true } : {}),
    ...(type === "select" || type === "multiselect" ? { filter: true } : {}),
  }));
}

/** Court Case's own properties: the field table's and the case record's,
 *  merged in a reviewed order (identifiers and parties, place, procedure,
 *  dates, then the long texts). */
const COURT_CASE: { name: string; type: PropertyType; content?: string; label?: string }[] = [
  { name: "caseNumber", type: "text" },
  { name: "victim", type: "text" },
  { name: "petitioner", type: "text" },
  { name: "respondent", type: "text" },
  { name: "country", type: "select", content: "t6" },
  { name: "region", type: "select", content: "t5" },
  { name: "place-incident", type: "text" },
  { name: "mechanism", type: "text" },
  { name: "status", type: "select", content: "t3" },
  { name: "type", type: "text" },
  { name: "series", type: "text" },
  { name: "dateFiled", type: "date" },
  { name: "date-incident", type: "date" },
  { name: "date", type: "date", label: "Date of judgment" },
  { name: "articles-invoked", type: "markdown" },
  { name: "bench", type: "markdown" },
];

/** What a Court Case card shows: the identifiers, parties, place and dates,
 *  not the procedural detail. */
const CASE_CARD = new Set(["caseNumber", "victim", "respondent", "country", "region", "status", "dateFiled", "date"]);

function courtCaseProperties(): PropertyDef[] {
  return COURT_CASE.map((p) => ({
    id: propertyIdOf("court_case", p.name),
    name: p.name,
    label: p.label ?? lbl(p.name, "EN"),
    type: p.type,
    ...(p.content ? { content: p.content } : {}),
    ...(CASE_CARD.has(p.name) ? { showInCard: true } : {}),
    // Priority sorting needs Use as filter (ConfigPropertyPanel.tsx).
    ...(p.name === "dateFiled" || p.name === "date" ? { filter: true, prioritySorting: true } : {}),
    ...(p.type === "select" ? { filter: true } : {}),
  }));
}

/** The v4 seed's dated properties of a template, from the entities that carry
 *  them: a date, or a date range where the seed gives an end. Left out where
 *  the template already declares the name. */
function v4DateProperties(typeId: string, declared: Set<string>): PropertyDef[] {
  const typeOf = new Map(entities.map((e) => [e.id, e.typeId]));
  const out: PropertyDef[] = [];
  for (const [entityId, dates] of Object.entries(V4_DATES)) {
    if (typeOf.get(entityId) !== typeId) continue;
    for (const d of dates) {
      if (declared.has(d.prop) || out.some((p) => p.name === d.prop)) continue;
      out.push({
        id: propertyIdOf(typeId, d.prop),
        name: d.prop,
        label: d.label.EN,
        type: d.end ? "daterange" : "date",
        showInCard: true,
      });
    }
  }
  return out;
}

/** The case record's connections: People (with two inherited columns on one
 *  connection), Related cases and Rights invoked. */
function caseRelationships(): PropertyDef[] {
  return relationshipFieldsByLanguage.EN.map((f) => ({
    id: propertyIdOf("court_case", f.id),
    name: f.id,
    label: f.label,
    type: "relationship" as const,
    content: f.targetTypeId,
    relationType: f.relationType,
    ...(f.inheritProperty
      ? { inherit: { property: propertyIdOf(f.targetTypeId, f.inheritProperty), type: "text" as const } }
      : {}),
    x: {
      ...(f.connectionKey ? { connectionKey: f.connectionKey } : {}),
      ...(f.reduce ? { reduce: f.reduce } : {}),
      ...(f.inheritPath ? { inheritPath: f.inheritPath } : {}),
      ...(f.inheritLeaf ? { inheritLeaf: f.inheritLeaf } : {}),
    },
  }));
}

function v4Relationships(typeId: string): PropertyDef[] {
  return (V4_FIELDS[typeId] ?? []).map((f) => ({
    id: propertyIdOf(typeId, f.id),
    name: f.id,
    label: f.label.EN,
    type: "relationship" as const,
    content: f.targetTypeId,
    relationType: f.relationType,
  }));
}

/** Built on first read, not at module load: the record profiles import the
 *  template store, and `data/entities` may still be loading when they do. */
let built: TemplateDef[] | null = null;
export const sampleTemplateDefs = (): TemplateDef[] => (built ??= entityTypes.map((t) => ({
  id: t.id,
  name: t.name,
  color: t.color,
  // The Sample's uploads take Document (createEntity's `uploadTemplateId`).
  isDefault: t.id === "document",
  commonProperties: commonPropertiesFor(t.id),
  properties: (() => {
    const own = t.id === "court_case" ? courtCaseProperties() : nativeProperties(t.id);
    const dates = v4DateProperties(t.id, new Set(own.map((p) => p.name)));
    // Dates sit before a template's long texts (markdown), so the record reads
    // facts, then prose.
    const long = own.filter((p) => p.type === "markdown");
    return [
      ...own.filter((p) => p.type !== "markdown"),
      ...dates,
      ...long,
      ...(t.id === "court_case" ? caseRelationships() : []),
      ...v4Relationships(t.id),
    ];
  })(),
})));
