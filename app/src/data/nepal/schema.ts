// The schema's small half, bundled: the Library's type list, the collection
// switcher and `getEntityType` need the templates before anything is loaded.
// The thesauri, the records and the references load on demand (load.ts).
import type { TemplateDef } from "../templates/types";
import type { NepalRelationType } from "./types";
import templatesJson from "./templates.json";
import relationTypesJson from "./relationTypes.json";

export const nepalTemplates = templatesJson as TemplateDef[];
export const nepalRelationTypes = relationTypesJson as NepalRelationType[];

export const nepalRelTypeName = new Map(nepalRelationTypes.map((r) => [r._id, r.name]));
export const nepalTemplateById = new Map(nepalTemplates.map((t) => [t.id, t]));
