import { atom } from "jotai";

export type ViewMode =
  | "all"
  | "by-entity-type"
  | "by-relation-type";

export const viewModeAtom = atom<ViewMode>("all");

/** Merged Relationships panel view mode. Drives the body of the unified
 *  Relationships surface introduced by the connections refactor. */
export type PanelMode =
  | "list"
  | "by-entity-type"
  | "by-relation-type"
  | "tree"
  | "graph";
export const panelModeAtom = atom<PanelMode>("tree");

export const searchQueryAtom = atom("");

/** Filter by entity type ID */
export const entityTypeFilterAtom = atom<string | null>(null);

/** Filter by relation type */
export const relationTypeFilterAtom = atom<string | null>(null);

/** Expand/collapse signal: increments to trigger all groups to expand or collapse */
export const expandAllSignalAtom = atom(0);
export const collapseAllSignalAtom = atom(0);

/** Sort order for references */
export type SortOrder = "none" | "asc" | "desc";
export const sortOrderAtom = atom<SortOrder>("none");

/** Track expanded group count for greying out collapse/expand buttons */
export const expandedGroupCountAtom = atom(0);
export const totalGroupCountAtom = atom(0);

/** IDs of refs in the currently expanded cluster on the minimap track */
export const activeClusterRefIdsAtom = atom<string[] | null>(null);

/** Selected relation-type facet (used by both refs + rels surfaces). */
export const relTypeFiltersAtom = atom<Record<string, boolean>>({});

/** Selected target-entity-type facet (used by both refs + rels surfaces). */
export const entityTypeFiltersAtom = atom<Record<string, boolean>>({});

/** Whether the toggleable filters slide-over is open (single shared flag). */
export const filtersDrawerOpenAtom = atom(false);

/** Relationships main-view zoom tier. Applies to grouped + tree modes. */
export type Zoom = "detail" | "compact" | "overview";
export const zoomAtom = atom<Zoom>("detail");

/** Relationships main-view mode: tree (layered groups) vs graph (radial SVG). */
export type RelationshipsViewMode = "tree" | "graph";
export const relationshipsViewModeAtom = atom<RelationshipsViewMode>("tree");

/** Derived: active filter count across refs + rels surfaces. Counts facets +
 *  search + sort + cluster — view-mode toggles are not filters. */
export const activeFilterCountAtom = atom((get) => {
  let n = 0;
  if (get(searchQueryAtom).trim()) n++;
  if (get(sortOrderAtom) !== "none") n++;
  n += Object.values(get(relTypeFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(entityTypeFiltersAtom)).filter(Boolean).length;
  if (get(activeClusterRefIdsAtom)) n++;
  return n;
});
