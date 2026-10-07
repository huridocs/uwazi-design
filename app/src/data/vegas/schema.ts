// The schema's small half, bundled: the Library's type list, the collection
// switcher and `getEntityType` need the templates before anything is loaded.
// The thesauri, the records and the references load on demand (load.ts).
import type { TemplateDef } from "../templates/types";
import type { VegasRelationType } from "./types";
import templatesJson from "./templates.json";
import relationTypesJson from "./relationTypes.json";

export const vegasTemplates = templatesJson as TemplateDef[];
export const vegasRelationTypes = relationTypesJson as VegasRelationType[];

export const vegasRelTypeName = new Map(vegasRelationTypes.map((r) => [r._id, r.name]));
export const vegasTemplateById = new Map(vegasTemplates.map((t) => [t.id, t]));

/** The collection's clock: every time in it is Las Vegas wall-clock time on
 *  Pacific daylight time, stored as given (see the build script). */
export const VEGAS_UTC_OFFSET = "UTC−07:00";
