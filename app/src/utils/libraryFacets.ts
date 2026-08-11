import type { Language } from "../atoms/language";
import type { DataSource } from "../atoms/dataSource";
import { getEntityProp } from "../data/entityMetadata";
import type { Entity } from "../data/entities";
import { inheritedFilterProps } from "../data/metadata";
import { cejilInheritedDefs } from "../data/cejil/adapt";

// ONE declaration, in atoms/dataSource.ts. This module used to carry its own
// copy of the union, which is how "artworks" got added without any branch on
// DataSource being forced to answer for it. Re-exported so the util layer's
// consumers (libraryFilter, librarySnippets, Results*) keep their import site.
export type { DataSource };

export interface LibraryInheritedDef {
  propId: string;
  label: string;
  /** Restrict the facet to entities of this type (mock only). */
  targetTypeId?: string;
}

/** The inherited-property facet definitions for the active data source:
 *  CEJIL's relationship/select facets, the mock's relationship-field
 *  inheritance (Role/Region), or nothing — artworks carry flat fields only
 *  (data/artworks/adapt.ts), so there is no inherited facet to offer. */
export function libraryInheritedDefs(
  source: DataSource,
  lang: Language,
): LibraryInheritedDef[] {
  switch (source) {
    case "cejil":
      return cejilInheritedDefs;
    case "mock":
      return inheritedFilterProps(lang);
    case "artworks":
      return [];
    default: {
      // Type error on the next DataSource widening; no facets at runtime for a
      // value outside the union (the atom is storage-backed).
      const _exhaustive: never = source;
      void _exhaustive;
      return [];
    }
  }
}

/** An entity's value(s) for an inherited facet — read from the adapter-supplied
 *  `inherited` map (CEJIL) or the mock entityMetadata (type-restricted). */
export function entityInheritedValues(
  e: Entity,
  def: LibraryInheritedDef,
  lang: Language,
  source: DataSource,
): string[] {
  switch (source) {
    case "cejil":
      return e.inherited?.[def.propId] ?? [];
    case "mock": {
      if (def.targetTypeId && e.typeId !== def.targetTypeId) return [];
      const v = getEntityProp(e.id, def.propId, lang);
      return v ? [v] : [];
    }
    case "artworks":
      // No inherited defs exist for this source (see libraryInheritedDefs), so
      // nothing can ask — but the answer is still "no values", not the mock's
      // getEntityProp lookup against ids it has never heard of.
      return [];
    default: {
      const _exhaustive: never = source;
      void _exhaustive;
      return [];
    }
  }
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
