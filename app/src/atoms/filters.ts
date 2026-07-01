import { atom } from "jotai";

export type ViewMode =
  | "all"
  | "by-entity-type"
  | "by-relation-type";

export const viewModeAtom = atom<ViewMode>("all");

/** Presentation mode in the merged Relationships panel: how the connections
 *  are shown. Orthogonal to {@link groupByAtom}, which only matters in list. */
export type View = "list" | "tree" | "graph";
export const viewAtom = atom<View>("list");

/** Grouping axis applied within the list view. Tree has implicit structure
 *  (rel type → target → refs); graph has no grouping. */
export type GroupBy =
  | "none"
  | "target-template"
  | "target-entity"
  | "source-template"
  | "source-entity"
  | "relation-type"
  | "direction"
  | "source-page";
export const groupByAtom = atom<GroupBy>("none");

/** Secondary grouping axis ("Then by"). Mirrors Uwazi's relation-type → template
 *  two-level facet pattern; the prototype lets you pick any pair. */
export const subGroupByAtom = atom<GroupBy>("none");

export const searchQueryAtom = atom("");

/** Filter by entity type ID */
export const entityTypeFilterAtom = atom<string | null>(null);

/** Filter by relation type */
export const relationTypeFilterAtom = atom<string | null>(null);

/** Expand/collapse signal: increments to trigger all groups to expand or collapse */
export const expandAllSignalAtom = atom(0);
export const collapseAllSignalAtom = atom(0);

/** Sort order for references */
export type SortOrder = "none" | "appearance" | "asc" | "desc";
export const sortOrderAtom = atom<SortOrder>("appearance");

/** Track expanded group count for greying out collapse/expand buttons */
export const expandedGroupCountAtom = atom(0);
export const totalGroupCountAtom = atom(0);

/** IDs of refs in the currently expanded cluster on the minimap track */
export const activeClusterRefIdsAtom = atom<string[] | null>(null);

/** Selected relation-type facet (used by both refs + rels surfaces). */
export const relTypeFiltersAtom = atom<Record<string, boolean>>({});

/** Selected target-entity-type facet (used by both refs + rels surfaces). */
export const entityTypeFiltersAtom = atom<Record<string, boolean>>({});

/** Selected target-entity country facet. Slices a heavily-connected entity's
 *  connections by the country of the target entity (mirrors the Library facet).
 *  Empty/hidden when no target carries a country (e.g. the mock seed). */
export const relTargetCountryFiltersAtom = atom<Record<string, boolean>>({});

/** Selected target-entity descriptor facet (CEJIL violations). Same idea as the
 *  country facet — another axis to slice connections at full-corpus scale. */
export const relTargetDescriptorFiltersAtom = atom<Record<string, boolean>>({});

/** Match mode for the descriptor facet: "OR" = target has any selected
 *  descriptor, "AND" = target has all of them. Meaningful because a target
 *  entity can carry several descriptors. */
export const relTargetDescriptorModeAtom = atom<"AND" | "OR">("OR");

/** Dynamic facets generated from the focal entity's INHERITED relationship
 *  properties (e.g. a connection that inherits each person's Role, or each
 *  case's Region). Keyed `inheritProperty → (value → on)`. Mirrors Uwazi, where
 *  an inherited relationship property becomes a filter of the inherited type. */
export const relInheritedFiltersAtom = atom<
  Record<string, Record<string, boolean>>
>({});

/** Whether the toggleable filters slide-over is open (single shared flag). */
export const filtersDrawerOpenAtom = atom(false);

/** IDs of relationship rows the user has checkbox-selected for bulk actions
 *  (delete, etc.). Aggregate rows expand to all backing refIds; hub rows to
 *  every member's refIds. */
export const selectedRefIdsAtom = atom<Set<string>>(new Set<string>());

/** When true, the Relationships panel surfaces per-row checkboxes and the
 *  action bar exposes bulk Delete + Select all. Toggled by the Edit button.
 *  Selection state is cleared when leaving edit mode. */
export const editModeAtom = atom(false);

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
  n += Object.values(get(relTargetCountryFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(relTargetDescriptorFiltersAtom)).filter(Boolean).length;
  for (const vals of Object.values(get(relInheritedFiltersAtom)))
    n += Object.values(vals).filter(Boolean).length;
  if (get(activeClusterRefIdsAtom)) n++;
  return n;
});
