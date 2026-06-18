import type { Language } from "../atoms/language";
import { getEntityProp } from "../data/entityMetadata";
import type { Entity } from "../data/entities";

/** The country names an entity is associated with: its own title if it is a
 *  country entity, plus its native `country` property (current language) if any.
 *  Used by the Countries keyword facet. */
export function entityCountries(e: Entity, lang: Language): string[] {
  const out: string[] = [];
  if (e.typeId === "country") out.push(e.title);
  // Adapter-supplied country (e.g. CEJIL) wins; else the mock native property.
  if (e.country && !out.includes(e.country)) out.push(e.country);
  const native = getEntityProp(e.id, "country", lang);
  if (native && !out.includes(native)) out.push(native);
  return out;
}

/** Does an entity pass a country selection under AND/OR semantics? */
export function matchesCountries(
  countriesOfEntity: string[],
  selected: string[],
  mode: "AND" | "OR",
): boolean {
  if (selected.length === 0) return true;
  if (countriesOfEntity.length === 0) return false;
  return mode === "AND"
    ? selected.every((c) => countriesOfEntity.includes(c))
    : selected.some((c) => countriesOfEntity.includes(c));
}
