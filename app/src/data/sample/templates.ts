// The Sample corpus's templates as template definitions
// (data/templates/types.ts), hand-authored from what the corpus already holds:
//   - each type of `entityTypes`;
//   - its native properties, in order, from the field table (`TYPE_FIELDS`);
//   - the case record's relationship fields (`relationshipFieldsByLanguage`),
//     which belong to Court Case.
// Main's Sample has no v4 seed (playground's extra records, hubs and dates),
// so its templates carry none of the v4 properties.
// Labels are English (decision S5); the field table's other languages are the
// Sample's translations and stay with the projection.
//
// Court Case is reconciled with the case record `e3` (step M5): its own fields
// are Court Case properties, in a reviewed order. Its country is a select on
// the Countries thesaurus (decision S3), its bench is markdown (S2), and its
// other files belong to the Files tab, not to metadata.
import type { PropertyDef, PropertyType, TemplateDef } from "../templates/types";
import { commonPropertiesFor, propertyIdOf } from "../templates/types";
import { entityTypes } from "../entities";
import { relationshipFieldsByLanguage } from "../metadata";
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
    showInCard: true,
    ...(type === "select" || type === "multiselect" ? { filter: true } : {}),
  }));
}

/** Court Case's own properties: the field table's and the case record's.
 *  On main the order keeps both records as they read today: the case record
 *  (e3) in its own order, and the other cases' fields (case number, date
 *  filed, respondent, status, region) in theirs. */
const COURT_CASE: { name: string; type: PropertyType; content?: string; label?: string }[] = [
  { name: "caseNumber", type: "text" },
  { name: "dateFiled", type: "text" },
  { name: "victim", type: "text" },
  // Text on main: there is no Countries thesaurus, and the case record keeps
  // its own country field (with its flag).
  { name: "country", type: "text" },
  { name: "place-incident", type: "text" },
  { name: "date-incident", type: "date" },
  { name: "date", type: "date", label: "Date of judgment" },
  { name: "type", type: "text" },
  { name: "series", type: "text" },
  { name: "petitioner", type: "text" },
  { name: "respondent", type: "text" },
  { name: "articles-invoked", type: "markdown" },
  { name: "mechanism", type: "text" },
  { name: "bench", type: "markdown" },
  { name: "status", type: "select", content: "t3" },
  { name: "region", type: "select", content: "t5" },
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

/** Built on first read, not at module load: the record profiles import the
 *  template store, and `data/entities` may still be loading when they do. */
let built: TemplateDef[] | null = null;
export const sampleTemplateDefs = (): TemplateDef[] => (built ??= entityTypes.map((t) => ({
  id: t.id,
  name: t.name,
  color: t.color,
  // The Sample's uploads take Document (createEntity's `uploadTemplateId`).
  isDefault: t.id === "document",
  // The published view's flag, from the type that main's published view reads
  // (`EntityType.publishedView`): one source until that reader moves here.
  ...(t.publishedView ? { publishedView: true } : {}),
  commonProperties: commonPropertiesFor(t.id),
  properties: (() => {
    // In the order main's records read: the field table's, and Court Case's
    // as declared above.
    const own = t.id === "court_case" ? courtCaseProperties() : nativeProperties(t.id);
    return [...own, ...(t.id === "court_case" ? caseRelationships() : [])];
  })(),
})));
