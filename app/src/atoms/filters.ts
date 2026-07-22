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
/** The axis people actually read connections by — NOT "none". Exported so the
 *  Display menu can test "is this off its default?" against the real default;
 *  hard-coding `!== "none"` there lit its modified-dot on every fresh panel. */
export const DEFAULT_GROUP_BY: GroupBy = "relation-type";
export const groupByAtom = atom<GroupBy>(DEFAULT_GROUP_BY);

/** Secondary grouping axis ("Then by"). Mirrors Uwazi's relation-type → template
 *  two-level facet pattern; the prototype lets you pick any pair. */
export const DEFAULT_SUB_GROUP_BY: GroupBy = "none";
export const subGroupByAtom = atom<GroupBy>(DEFAULT_SUB_GROUP_BY);

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
export const DEFAULT_SORT_ORDER: SortOrder = "appearance";
export const sortOrderAtom = atom<SortOrder>(DEFAULT_SORT_ORDER);

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

/** Write-only: clear the per-entity relationship facets. Fired on focal-entity
 *  change — facet values derive from the previous entity's targets, so a
 *  leftover selection can silently filter the new entity's rows to nothing
 *  while the facet UI self-hides (no visible control left to clear it). */
export const resetRelFacetsAtom = atom(null, (_get, set) => {
  set(relTypeFiltersAtom, {});
  set(entityTypeFiltersAtom, {});
  set(relTargetCountryFiltersAtom, {});
  set(relTargetDescriptorFiltersAtom, {});
  set(relInheritedFiltersAtom, {});
  set(activeClusterRefIdsAtom, null);
});

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
export const DEFAULT_ZOOM: Zoom = "detail";
export const zoomAtom = atom<Zoom>(DEFAULT_ZOOM);

/** Relationships main-view mode: tree (layered groups) vs graph (radial SVG). */
export type RelationshipsViewMode = "tree" | "graph";
export const relationshipsViewModeAtom = atom<RelationshipsViewMode>("tree");

/** Derived: active filter count across refs + rels surfaces. Counts facets +
 *  search + sort + cluster — view-mode toggles are not filters. */
export const activeFilterCountAtom = atom((get) => {
  let n = 0;
  if (get(searchQueryAtom).trim()) n++;
  // Sort is NOT a filter — it changes the order, not what's in the set — and it
  // lives in the Display menu now. Counting it (as `!== "none"`, which the
  // default "appearance" satisfies) put a permanent "1" on the Filters badge of
  // a panel with nothing filtered.
  n += Object.values(get(relTypeFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(entityTypeFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(relTargetCountryFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(relTargetDescriptorFiltersAtom)).filter(Boolean).length;
  for (const vals of Object.values(get(relInheritedFiltersAtom)))
    n += Object.values(vals).filter(Boolean).length;
  if (get(activeClusterRefIdsAtom)) n++;
  return n;
});
