import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { useRelAtomValue, useScopedReferences } from "../../hooks/useEntityScope";
import {
  relSearchQueryAtom,
  relSortOrderAtom,
  relViewAtom,
  defaultSortFor,
  activeClusterRefIdsAtom,
  relTypeFiltersAtom,
  relEntityTypeFiltersAtom,
  relTargetCountryFiltersAtom,
  relTargetDescriptorFiltersAtom,
  relTargetDescriptorModeAtom,
  relInheritedFiltersAtom,
  relAnchoringFiltersAtom,
  relDirectionFiltersAtom,
  relVerificationFiltersAtom,
  relAsOfAtom,
} from "../../atoms/filters";
import { anchoringOf, asOfSeconds, directionClassifier, refHoldsAt } from "../../utils/relationships";
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
  const references = useScopedReferences();
  const searchQuery = useRelAtomValue(relSearchQueryAtom);
  const view = useRelAtomValue(relViewAtom);
  const sortOrder = useRelAtomValue(relSortOrderAtom) ?? defaultSortFor(view);
  const activeClusterRefIds = useRelAtomValue(activeClusterRefIdsAtom);
  const relTypeFilters = useRelAtomValue(relTypeFiltersAtom);
  const entityTypeFilters = useRelAtomValue(relEntityTypeFiltersAtom);
  const countryFilters = useRelAtomValue(relTargetCountryFiltersAtom);
  const descriptorFilters = useRelAtomValue(relTargetDescriptorFiltersAtom);
  const descriptorMode = useRelAtomValue(relTargetDescriptorModeAtom);
  const inheritedFilters = useRelAtomValue(relInheritedFiltersAtom);
  const anchoringFilters = useRelAtomValue(relAnchoringFiltersAtom);
  const directionFilters = useRelAtomValue(relDirectionFiltersAtom);
  const verificationFilters = useRelAtomValue(relVerificationFiltersAtom);
  const asOf = useRelAtomValue(relAsOfAtom);
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
    const activeAnchoring = Object.entries(anchoringFilters)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (activeAnchoring.length > 0) {
      const set = new Set(activeAnchoring);
      result = result.filter((r) => set.has(anchoringOf(r)));
    }
    const activeVerification = Object.entries(verificationFilters)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (activeVerification.length > 0) {
      const set = new Set(activeVerification);
      result = result.filter((r) => !!r.verification && set.has(r.verification));
    }
    const asOfAt = asOfSeconds(asOf);
    if (asOfAt !== null) result = result.filter((r) => refHoldsAt(r, asOfAt));
    const activeDirections = Object.entries(directionFilters)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (activeDirections.length > 0) {
      const set = new Set(activeDirections);
      const directionOf = directionClassifier(references);
      result = result.filter((r) => set.has(directionOf(r)));
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
    if (sortOrder === "evidence") {
      // Weight = references behind the row's (target, relation type) aggregate,
      // the same key `deriveRelationships` collapses on, so aggregates come out
      // heaviest first. Ties keep document order.
      const weight = new Map<string, number>();
      const keyOf = (r: Reference) => `${r.targetEntityId}::${r.relationType}`;
      for (const r of result) weight.set(keyOf(r), (weight.get(keyOf(r)) ?? 0) + 1);
      const order = new Map(result.map((r, i) => [r.id, i]));
      return [...result].sort(
        (a, b) =>
          weight.get(keyOf(b))! - weight.get(keyOf(a))! ||
          (a.sourceSelection?.page ?? -1) - (b.sourceSelection?.page ?? -1) ||
          order.get(a.id)! - order.get(b.id)!,
      );
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
    anchoringFilters,
    directionFilters,
    verificationFilters,
    asOf,
    language,
  ]);
}
