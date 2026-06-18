// Light adapter: maps the CEJIL templates → the prototype's EntityType shape.
// Imports ONLY the small templates module so getEntityType (used app-wide via
// EntityPill) doesn't pull in the heavy entity list.
import type { EntityType } from "../entities";
import { cejilTemplates } from "./templates";

// A calm, distinct colour per template. Uses the template's own colour when the
// dump had one, else a brand-leaning palette by index.
const PALETTE = [
  "#0891B2", "#D97706", "#059669", "#2563EB", "#8B5CF6",
  "#C03B22", "#0D9488", "#9333EA", "#65A30D", "#DB2777",
  "#0369A1", "#B45309", "#15803D", "#7C3AED", "#BE123C",
  "#1D4ED8", "#A16207", "#047857", "#6B7280",
];

export const cejilEntityTypes: EntityType[] = cejilTemplates.map((t, i) => ({
  id: t._id,
  name: t.name.trim(),
  color: t.color || PALETTE[i % PALETTE.length],
}));

export const cejilTypeById = new Map(cejilEntityTypes.map((t) => [t.id, t]));
