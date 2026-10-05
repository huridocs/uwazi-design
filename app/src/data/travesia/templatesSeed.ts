// The Travesía templates as template definitions (data/templates/types.ts).
// The dump keeps Uwazi's property `_id`, `showInCard` and `filter`, so this is
// a direct mapping; `inherit.property` is already a target `_id`. The dump has
// no common properties, so the template gets Uwazi's three.
import type { PropertyDef, PropertyType, TemplateDef } from "../templates/types";
import { commonPropertiesFor } from "../templates/types";
import { travesiaTemplates } from "./schema";
import { travesiaTypeById } from "./typesAdapter";
import type { TravesiaProperty } from "./types";

function propertyOf(p: TravesiaProperty): PropertyDef {
  return {
    id: p._id,
    name: p.name,
    label: p.label,
    type: p.type as PropertyType,
    ...(p.showInCard ? { showInCard: true } : {}),
    ...(p.filter ? { filter: true } : {}),
    ...(p.content !== undefined ? { content: p.content } : p.type === "relationship" ? { content: "" } : {}),
    ...(p.relationType ? { relationType: p.relationType } : {}),
    ...(p.inherit ? { inherit: { property: p.inherit.property, type: p.inherit.type as PropertyType } } : {}),
    ...(p.type === "relationship" ? { x: { connectionKey: `${p.relationType}:${p.content}` } } : {}),
  };
}

export const travesiaTemplateDefs: TemplateDef[] = travesiaTemplates.map((t) => ({
  id: t._id,
  name: t.name,
  color: travesiaTypeById.get(t._id)!.color,
  isDefault: !!t.default,
  commonProperties: commonPropertiesFor(t._id),
  properties: t.properties.map(propertyOf),
}));
