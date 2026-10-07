// Light adapter: the Vegas templates → the prototype's EntityType shape.
// Imports only the bundled schema, so `getEntityType` (app-wide, via
// EntityPill) never pulls in the records.
import type { EntityType } from "../entities";
import { vegasTemplates } from "./schema";

export const vegasEntityTypes: EntityType[] = vegasTemplates.map((t) => ({
  id: t.id,
  name: t.name,
  color: t.color ?? "#6B7280",
}));

export const vegasTypeById = new Map(vegasEntityTypes.map((t) => [t.id, t]));
