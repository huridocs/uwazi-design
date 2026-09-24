// The schema's small half, bundled: the Library's type list, the source
// switcher and `getEntityType` need the templates before anything is loaded.
// The thesauri and the entities are loaded on demand (see load.ts).
import type { TravesiaRelationType, TravesiaTemplate } from "./types";
import templatesJson from "./templates.json";
import relationTypesJson from "./relationTypes.json";

export const travesiaTemplates = templatesJson as TravesiaTemplate[];
export const travesiaRelationTypes = relationTypesJson as TravesiaRelationType[];

export const travesiaRelTypeName = new Map(travesiaRelationTypes.map((r) => [r._id, r.name]));
export const travesiaTemplateById = new Map(travesiaTemplates.map((t) => [t._id, t]));
/** The template Uwazi gives a new entity by default (DATOS GENERALES). */
export const travesiaDefaultTemplateId = travesiaTemplates.find((t) => t.default)?._id;
