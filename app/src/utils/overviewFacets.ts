import type { DataSource } from "../atoms/dataSource";
import type { Language } from "../atoms/language";
import type { Entity } from "../data/entities";
import { entityCountries, entityInheritedValues, libraryInheritedDefs } from "./libraryFacets";

/** A facet the Overview's "Most used values" can draw. `key` is what
 *  `OverviewConfig.valueFacets` stores; `property` is the template property's
 *  name where the facet is one, which `valueFacets` may name instead. */
export interface OverviewFacetCandidate {
  key: string;
  kind: "country" | "descriptor" | "property";
  title: string;
  property?: string;
  /** Picked when `valueFacets` is empty: the facets the Filters panel lists
   *  with no template ticked. */
  byDefault: boolean;
  valuesOf: (e: Entity) => readonly string[];
}

/** Every facet of the collection the Overview can summarise, in the Filters
 *  panel's order: CEJIL's Descriptores, Countries, then the property facets. */
export function overviewFacetCandidates(source: DataSource, language: Language): OverviewFacetCandidate[] {
  const out: OverviewFacetCandidate[] = [];
  if (source === "cejil")
    out.push({ key: "descriptor", kind: "descriptor", title: "Descriptores", byDefault: true, valuesOf: (e) => e.descriptors ?? [] });
  out.push({ key: "country", kind: "country", title: "Countries", byDefault: true, valuesOf: (e) => entityCountries(e, language) });
  for (const def of libraryInheritedDefs(source, language))
    out.push({
      key: def.propId,
      kind: "property",
      title: def.label,
      property: def.property,
      byDefault: !def.templateIds || !!def.defaultFilter,
      valuesOf: (e) => entityInheritedValues(e, def, language, source),
    });
  return out;
}
