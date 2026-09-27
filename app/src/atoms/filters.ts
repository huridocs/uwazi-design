import { atom, type Atom, type PrimitiveAtom, type SetStateAction, type WritableAtom } from "jotai";
import { filtersDrawerBase, overlayEntityBase } from "./rightPane";

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

/* ── Scoped panel state ───────────────────────────────────────────────────────
   The atoms above are ONE panel's state, and two panels can be on screen at
   once: the host's Relationships surface and a connected entity's, in the
   overlay (or the Library drawer preview). Shared, a CorteIDH filter set on a
   Causa hid 8 of a Sentencia's 9 relationships in its overlay — the signing
   judges, the next hop the reader opened it for — and clearing the chip there
   cleared the host's.

   So each atom above is the state of the UN-scoped surfaces (the entity view's
   panel and its drawer section, which show the same entity), and a subtree that
   declares its own entity (`EntityScopeProvider`) reads a variant keyed by that
   entity: `relAtomFor(base, scope)`, through the `useRelAtom*` hooks. A variant
   holds nothing until written and reads its base's INITIAL value, so a scoped
   panel opens on the defaults, never on the host's choices. All variants live in
   one record, which is what lets the overlay drop its own entries on open. */

type Scopable<T> = PrimitiveAtom<T> & { init: T };

/** scope id → base atom key → value. Only written values are stored. */
export const scopedRelStateAtom = atom<Record<string, Record<string, unknown>>>({});

const variantCache = new Map<string, WritableAtom<unknown, [SetStateAction<unknown>], void>>();

/** The atom a surface in `scope` reads for `base`: the base itself with no
 *  scope, else a per-scope variant that starts at `base.init`. */
export function relAtomFor<T>(base: Scopable<T>, scope: string | null): PrimitiveAtom<T> {
  if (!scope) return base;
  const key = base.toString();
  const cacheKey = `${scope}\u0000${key}`;
  let variant = variantCache.get(cacheKey);
  if (!variant) {
    const read = (get: <V>(a: Atom<V>) => V): T => {
      const stored = get(scopedRelStateAtom)[scope];
      return (stored && key in stored ? stored[key] : base.init) as T;
    };
    variant = atom(read, (get, set, next: SetStateAction<unknown>) => {
      const value = typeof next === "function" ? (next as (prev: T) => T)(read(get)) : next;
      set(scopedRelStateAtom, (prev) => ({ ...prev, [scope]: { ...prev[scope], [key]: value } }));
    });
    variantCache.set(cacheKey, variant);
  }
  return variant as unknown as PrimitiveAtom<T>;
}

/** Write-only: clear the per-entity relationship facets. Fired on focal-entity
 *  change — facet values derive from the previous entity's targets, so a
 *  leftover selection can silently filter the new entity's rows to nothing
 *  while the facet UI self-hides (no visible control left to clear it).
 *  Pass a scope to clear that scoped surface's facets instead of the host's. */
export const resetRelFacetsAtom = atom(null, (_get, set, scope: string | null = null) => {
  set(relAtomFor(relTypeFiltersAtom, scope), {});
  set(relAtomFor(entityTypeFiltersAtom, scope), {});
  set(relAtomFor(relTargetCountryFiltersAtom, scope), {});
  set(relAtomFor(relTargetDescriptorFiltersAtom, scope), {});
  set(relAtomFor(relTargetDescriptorModeAtom, scope), "OR");
  set(relAtomFor(relInheritedFiltersAtom, scope), {});
  set(relAtomFor(activeClusterRefIdsAtom, scope), null);
});

/** "Clear all filters" — the facets above plus the two things the Filters badge
 *  counts that aren't facets: the search box and (as a courtesy) the sort order
 *  back to its default.
 *
 *  It delegates to {@link resetRelFacetsAtom} rather than restating the facet
 *  list, because there were THREE copies of that list: this one, hand-rolled
 *  identically in `RelationshipsView` and `RelationshipsDrawerSection`, and the
 *  focal-change reset. They already disagreed — only the hand-rolled pair reset
 *  the descriptor AND/OR mode — which is the drift the Library's two `clearAll`s
 *  went through once already (PATTERNS §4.3). One list now. */
export const clearRelFiltersAtom = atom(null, (_get, set, scope: string | null = null) => {
  set(resetRelFacetsAtom, scope);
  set(relAtomFor(searchQueryAtom, scope), "");
  set(relAtomFor(sortOrderAtom, scope), DEFAULT_SORT_ORDER);
});

/** Whether the toggleable filters slide-over is open (single shared flag).
 *
 *  Opening it closes the connection overlay, for the reason in atoms/rightPane:
 *  one right-hand region, two occupants. Takes `SetStateAction` so it is a
 *  drop-in for the primitive atom it replaced. */
/** Filters-open for a subtree that has declared its own entity scope — today,
 *  the connection overlay's Relationships tab.
 *
 *  The flag above is ONE boolean, and two surfaces read it: the host's
 *  Relationships panel and the overlay's. Opening Filters in the overlay
 *  therefore opened the host's drawer too — two drawers from one click, one of
 *  them beside a blank overlay body, which is what "opening a relationship
 *  triggers the filters" looks like from the outside. Keyed by scope id, read
 *  through `useFiltersDrawerOpen`, and reset whenever the overlay changes. */
export const scopedFiltersOpenAtom = atom<Record<string, boolean>>({});

export const filtersDrawerOpenAtom = atom(
  (get) => get(filtersDrawerBase),
  (get, set, next: boolean | ((prev: boolean) => boolean)) => {
    const open = typeof next === "function" ? next(get(filtersDrawerBase)) : next;
    set(filtersDrawerBase, open);
    if (open) set(overlayEntityBase, null);
  },
);

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
 *  search + sort + cluster — view-mode toggles are not filters. One per scope;
 *  `activeFilterCountAtom` is the un-scoped surfaces'. */
const filterCountCache = new Map<string, Atom<number>>();
export function activeFilterCountFor(scope: string | null): Atom<number> {
  const key = scope ?? "";
  let hit = filterCountCache.get(key);
  if (!hit) {
    hit = atom((get) => countFilters(<T,>(base: Scopable<T>) => get(relAtomFor(base, scope))));
    filterCountCache.set(key, hit);
  }
  return hit;
}

function countFilters(get: <T>(base: Scopable<T>) => T): number {
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
}

export const activeFilterCountAtom = activeFilterCountFor(null);
