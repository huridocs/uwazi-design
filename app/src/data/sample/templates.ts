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
// Kept as the corpus types them today (`multiline` is `markdown`, dates held
// as text stay `text`): step M4 turns `born`, `dateFiled` and the judgment date
// into dates, adds the Countries thesaurus and reconciles `e3` with Court Case.
import type { PropertyDef, PropertyType, TemplateDef } from "../templates/types";
import { commonPropertiesFor, propertyIdOf } from "../templates/types";
import { entityTypes } from "../entities";
import { relationshipFieldsByLanguage } from "../metadata";
import { V4_FIELDS } from "../sampleSeedV4";
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
    // The Sample's selects are what its Library has faceted and carded.
    ...(type === "select" || type === "multiselect" ? { showInCard: true, filter: true } : {}),
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
  properties: [
    ...nativeProperties(t.id),
    ...(t.id === "court_case" ? caseRelationships() : []),
    ...v4Relationships(t.id),
  ],
})));
