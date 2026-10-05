// Light adapter: the Nepal templates → the prototype's EntityType shape.
// Imports only the bundled schema, so `getEntityType` (app-wide, via
// EntityPill) never pulls in the records.
import type { EntityType } from "../entities";
import { nepalTemplates } from "./schema";

export const nepalEntityTypes: EntityType[] = nepalTemplates.map((t) => ({
  id: t.id,
  name: t.name,
  color: t.color ?? "#6B7280",
}));

export const nepalTypeById = new Map(nepalEntityTypes.map((t) => [t.id, t]));
