import type { Language } from "../atoms/language";
import { getEntityProp } from "../data/entityMetadata";
import type { Entity } from "../data/entities";
import { inheritedFilterProps } from "../data/metadata";
import { cejilInheritedDefs } from "../data/cejil/adapt";

export type DataSource = "mock" | "cejil";

export interface LibraryInheritedDef {
  propId: string;
  label: string;
  /** Restrict the facet to entities of this type (mock only). */
  targetTypeId?: string;
}

/** The inherited-property facet definitions for the active data source:
 *  CEJIL's relationship/select facets, or the mock's relationship-field
 *  inheritance (Role/Region). */
export function libraryInheritedDefs(
  source: DataSource,
  lang: Language,
): LibraryInheritedDef[] {
  return source === "cejil" ? cejilInheritedDefs : inheritedFilterProps(lang);
}

/** An entity's value(s) for an inherited facet — read from the adapter-supplied
 *  `inherited` map (CEJIL) or the mock entityMetadata (type-restricted). */
export function entityInheritedValues(
  e: Entity,
  def: LibraryInheritedDef,
  lang: Language,
  source: DataSource,
): string[] {
  if (source === "cejil") return e.inherited?.[def.propId] ?? [];
  if (def.targetTypeId && e.typeId !== def.targetTypeId) return [];
  const v = getEntityProp(e.id, def.propId, lang);
  return v ? [v] : [];
}

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
