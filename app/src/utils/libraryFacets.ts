import type { Language } from "../atoms/language";
import { templatesMirror } from "../data/templates/mirror";
import { entityPropertyValues } from "./propertyValues";
import type { DataSource } from "../atoms/dataSource";
import { getEntityProp } from "../data/entityMetadata";
import type { Entity } from "../data/entities";
import { inheritedFilterProps } from "../data/metadata";
import { cejilInheritedDefs } from "../data/cejil/adapt";
import { travesiaFacetDefs } from "../data/travesia/adapt";

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
  /** A facet generated from a template property flagged `filter`: the
   *  property's `name`, read by `entityPropertyValues`. */
  property?: string;
  /** Uwazi's `defaultfilter`: listed first, open. */
  defaultFilter?: boolean;
  /** The templates whose `filter` property this facet lists: with a Type
   *  selection, the facet shows only when one of them is selected (§6.4). */
  templateIds?: string[];
}

/** The inherited-property facet definitions for the active data source:
 *  CEJIL's relationship/select facets, the mock's relationship-field
 *  inheritance (Role/Region), or nothing — artworks carry flat fields only
 *  (data/artworks/adapt.ts), so there is no inherited facet to offer. */
export function libraryInheritedDefs(source: DataSource, lang: Language): LibraryInheritedDef[] {
  return withPropertyFacets(source, lang, () => curatedDefs(source, lang));
}

/** Facets the corpora hand-picked before templates were the schema. Kept as
 *  they are, so every existing facet keeps its counts. */
function curatedDefs(
  source: DataSource,
  lang: Language,
): LibraryInheritedDef[] {
  switch (source) {
    case "cejil":
      return cejilInheritedDefs;
    case "mock":
      return inheritedFilterProps(lang);
    case "travesia":
      return travesiaFacetDefs;
    case "nepal":
      return [];
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

/** Properties a fixed facet already lists (Countries, Descriptors), by corpus:
 *  not repeated as property facets. */
const FIXED_FACET_PROPERTIES: Record<DataSource, string[]> = {
  cejil: ["pa_s", "descriptores"],
  mock: ["country"],
  travesia: [],
  nepal: [],
  artworks: ["genres"],
};

/** The curated facets, then one per template property flagged `filter`
 *  (spec §6.4) that neither they nor a fixed facet already cover: the
 *  property's name as its key, its label, selects, multiselects and
 *  relationships (value lists). Properties sharing a name are one facet,
 *  Uwazi's combine rule. `defaultfilter` ones lead. Cached per template list
 *  and curated list. */
const defsCache = new WeakMap<object, Map<Language, LibraryInheritedDef[]>>();
const LISTED = new Set(["select", "multiselect", "relationship"]);
function withPropertyFacets(
  source: DataSource,
  lang: Language,
  curatedOf: () => LibraryInheritedDef[],
): LibraryInheritedDef[] {
  const templates = templatesMirror(source);
  let byLang = defsCache.get(templates);
  if (!byLang) defsCache.set(templates, (byLang = new Map()));
  const hit = byLang.get(lang);
  if (hit) return hit;
  const curated = curatedOf();
  const taken = new Set([...curated.map((d) => d.propId), ...FIXED_FACET_PROPERTIES[source]]);
  const added: LibraryInheritedDef[] = [];
  const byName = new Map<string, LibraryInheritedDef>();
  for (const t of templates)
    for (const p of t.properties) {
      if (!p.filter || !LISTED.has(p.type)) continue;
      const seen = byName.get(p.name);
      if (seen) {
        seen.templateIds!.push(t.id);
        if (p.defaultfilter) seen.defaultFilter = true;
        continue;
      }
      if (taken.has(p.name)) continue;
      taken.add(p.name);
      const def: LibraryInheritedDef = { propId: p.name, label: p.label, property: p.name, templateIds: [t.id], ...(p.defaultfilter ? { defaultFilter: true } : {}) };
      byName.set(p.name, def);
      added.push(def);
    }
  const out = [
    ...added.filter((d) => d.defaultFilter),
    ...curated,
    ...added.filter((d) => !d.defaultFilter),
  ];
  byLang.set(lang, out);
  return out;
}

/** An entity's value(s) for an inherited facet — read from the adapter-supplied
 *  `inherited` map (CEJIL) or the mock entityMetadata (type-restricted); a
 *  property facet reads the template property. */
export function entityInheritedValues(
  e: Entity,
  def: LibraryInheritedDef,
  lang: Language,
  source: DataSource,
): string[] {
  if (def.property) return entityPropertyValues(e, def.property, lang);
  switch (source) {
    case "cejil":
    case "travesia":
    case "nepal":
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
