// Light adapter: the Travesía templates → the prototype's EntityType shape.
// Imports only the bundled schema, so `getEntityType` (app-wide, via
// EntityPill) never pulls in the entity list.
import type { EntityType } from "../entities";
import { travesiaTemplates } from "./schema";

/** The template's own colour, as the dump has it — every one does. The
 *  label is never drawn in it raw (`typeLabelColor`), only the dot. */
export const travesiaEntityTypes: EntityType[] = travesiaTemplates.map((t) => ({
  id: t._id,
  name: t.name,
  color: t.color ?? "#6B7280",
}));

export const travesiaTypeById = new Map(travesiaEntityTypes.map((t) => [t.id, t]));
