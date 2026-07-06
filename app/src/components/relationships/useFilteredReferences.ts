import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { scopedReferencesAtom } from "../../atoms/references";
import {
  searchQueryAtom,
  sortOrderAtom,
  activeClusterRefIdsAtom,
  relTypeFiltersAtom,
  entityTypeFiltersAtom,
  relTargetCountryFiltersAtom,
  relTargetDescriptorFiltersAtom,
  relTargetDescriptorModeAtom,
  relInheritedFiltersAtom,
} from "../../atoms/filters";
import { languageAtom } from "../../atoms/language";
import { getEntity } from "../../data/entities";
import { getEntityProp } from "../../data/entityMetadata";
import { inheritedFilterProps } from "../../data/metadata";
import { entityCountries } from "../../utils/libraryFacets";
import type { Reference } from "../../data/references";
import { buildMatcher } from "../../utils/searchQuery";

/** THE filter pipeline for the merged Relationships panel — cluster, relation
 *  type, target entity type, target country, target descriptors, inherited
 *  props, search, then sort. List, Tree, and Graph all consume this one hook so
 *  a facet ticked in one mode can never silently un-apply in another (the
 *  Filters badge counts them all via `activeFilterCountAtom`). */
export function useFilteredReferences({ sort = true }: { sort?: boolean } = {}): Reference[] {
  const references = useAtomValue(scopedReferencesAtom);
  const searchQuery = useAtomValue(searchQueryAtom);
  const sortOrder = useAtomValue(sortOrderAtom);
  const activeClusterRefIds = useAtomValue(activeClusterRefIdsAtom);
  const relTypeFilters = useAtomValue(relTypeFiltersAtom);
  const entityTypeFilters = useAtomValue(entityTypeFiltersAtom);
  const countryFilters = useAtomValue(relTargetCountryFiltersAtom);
  const descriptorFilters = useAtomValue(relTargetDescriptorFiltersAtom);
  const descriptorMode = useAtomValue(relTargetDescriptorModeAtom);
  const inheritedFilters = useAtomValue(relInheritedFiltersAtom);
  const language = useAtomValue(languageAtom);

  return useMemo<Reference[]>(() => {
    let result = references;
    if (activeClusterRefIds) {
      const cluster = new Set(activeClusterRefIds);
      result = result.filter((r) => cluster.has(r.id));
    }
    const activeRelTypes = Object.entries(relTypeFilters)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (activeRelTypes.length > 0) {
      const set = new Set(activeRelTypes);
      result = result.filter((r) => set.has(r.relationType));
    }
    const activeEntityTypes = Object.entries(entityTypeFilters)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (activeEntityTypes.length > 0) {
      const set = new Set(activeEntityTypes);
      result = result.filter((r) => {
        const entity = getEntity(r.targetEntityId);
        return entity ? set.has(entity.typeId) : false;
      });
    }
    const activeCountries = Object.entries(countryFilters)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (activeCountries.length > 0) {
      const set = new Set(activeCountries);
      result = result.filter((r) => {
        const entity = getEntity(r.targetEntityId);
        return entity
          ? entityCountries(entity, language).some((c) => set.has(c))
          : false;
      });
    }
    const activeDescriptors = Object.entries(descriptorFilters)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (activeDescriptors.length > 0) {
      result = result.filter((r) => {
        const ds = getEntity(r.targetEntityId)?.descriptors;
        if (!ds || ds.length === 0) return false;
        const have = new Set(ds);
        return descriptorMode === "AND"
          ? activeDescriptors.every((d) => have.has(d))
          : activeDescriptors.some((d) => have.has(d));
      });
    }
    const inheritedDefs = inheritedFilterProps(language);
    for (const [propId, vals] of Object.entries(inheritedFilters)) {
      const active = Object.entries(vals)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (active.length === 0) continue;
      const targetTypeId = inheritedDefs.find((d) => d.propId === propId)?.targetTypeId;
      const set = new Set(active);
      result = result.filter((r) => {
        const entity = getEntity(r.targetEntityId);
        if (targetTypeId && entity?.typeId !== targetTypeId) return false;
        const v = getEntityProp(r.targetEntityId, propId, language);
        return v ? set.has(v) : false;
      });
    }
    const matcher = buildMatcher(searchQuery);
    if (matcher) {
      result = result.filter((ref) => {
        const entity = getEntity(ref.targetEntityId);
        const haystack = `${ref.sourceSelection?.text ?? ""} ${entity?.title ?? ""} ${ref.relationType}`;
        return matcher(haystack);
      });
    }
    if (!sort || sortOrder === "none") {
      // Raw seed/insertion order — no sort applied.
      return result;
    }
    if (sortOrder === "appearance") {
      // Entity-level refs (no sourceSelection) sort to the top: they're not
      // tied to a passage, so they read as "header" relationships about the
      // entity overall. Anchored refs follow in page-then-top order.
      return [...result].sort((a, b) => {
        const pageA = a.sourceSelection?.page ?? -1;
        const pageB = b.sourceSelection?.page ?? -1;
        if (pageA !== pageB) return pageA - pageB;
        const topA = a.sourceSelection?.top ?? 0;
        const topB = b.sourceSelection?.top ?? 0;
        return topA - topB;
      });
    }
    const dir = sortOrder === "asc" ? 1 : -1;
    return [...result].sort((a, b) => {
      const nameA = getEntity(a.targetEntityId)?.title ?? "";
      const nameB = getEntity(b.targetEntityId)?.title ?? "";
      return nameA.localeCompare(nameB) * dir;
    });
  }, [
    references,
    searchQuery,
    sort,
    sortOrder,
    activeClusterRefIds,
    relTypeFilters,
    entityTypeFilters,
    countryFilters,
    descriptorFilters,
    descriptorMode,
    inheritedFilters,
    language,
  ]);
}
