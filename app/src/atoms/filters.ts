import { atom, type Atom, type PrimitiveAtom, type SetStateAction, type WritableAtom } from "jotai";
import { filtersDrawerBase, overlayEntityBase, overlayStackBase } from "./rightPane";

/** Relationships panel view. Orthogonal to {@link groupByAtom}, which only
 *  applies in list. */
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
/** Default is relation type, not "none". Exported so the Display menu's
 *  modified-dot compares against this value rather than `"none"`. */
export const DEFAULT_GROUP_BY: GroupBy = "relation-type";
export const groupByAtom = atom<GroupBy>(DEFAULT_GROUP_BY);

/** Secondary grouping axis ("Then by"). Any pair of axes is allowed. */
export const DEFAULT_SUB_GROUP_BY: GroupBy = "none";
export const subGroupByAtom = atom<GroupBy>(DEFAULT_SUB_GROUP_BY);

export const searchQueryAtom = atom("");

/** Counters: each increment expands or collapses every group. */
export const expandAllSignalAtom = atom(0);
export const collapseAllSignalAtom = atom(0);

/** `evidence` puts the targets with the most backing references first. */
export type SortOrder = "none" | "appearance" | "evidence" | "asc" | "desc";
/** Default sort per view: list rows are single references (document order),
 *  tree and graph rows are aggregates (most evidence first). */
export function defaultSortFor(view: View): SortOrder {
  return view === "list" ? "appearance" : "evidence";
}
/** Explicit sort, or null for {@link defaultSortFor}, so switching views
 *  follows each view's default until the user picks a sort. */
export const sortOrderAtom = atom<SortOrder | null>(null);

/** Group counts that disable the collapse/expand buttons. */
export const expandedGroupCountAtom = atom(0);
export const totalGroupCountAtom = atom(0);

/** IDs of refs in the expanded minimap cluster. */
export const activeClusterRefIdsAtom = atom<string[] | null>(null);

export const relTypeFiltersAtom = atom<Record<string, boolean>>({});

/** Target entity type facet. */
export const entityTypeFiltersAtom = atom<Record<string, boolean>>({});

/** Target entity country facet. Hidden when no target has a country. */
export const relTargetCountryFiltersAtom = atom<Record<string, boolean>>({});

/** Target entity descriptor facet (CEJIL violations). */
export const relTargetDescriptorFiltersAtom = atom<Record<string, boolean>>({});

/** Descriptor match mode: "OR" = any selected descriptor, "AND" = all of them
 *  (a target can carry several). */
export const relTargetDescriptorModeAtom = atom<"AND" | "OR">("OR");

/** Facets built from the focal entity's inherited relationship properties,
 *  keyed `inheritProperty → (value → on)`, as Uwazi turns an inherited
 *  property into a filter of the inherited type. */
export const relInheritedFiltersAtom = atom<
  Record<string, Record<string, boolean>>
>({});

/** Anchoring facet: `anchored` = the reference quotes a passage (either end
 *  has a text selection), `entity` = an entity-to-entity link with no text. */
export const relAnchoringFiltersAtom = atom<Record<string, boolean>>({});

/** Direction facet: `outgoing`, `incoming`, or `both` (a target and relation
 *  type with references in each direction). See `directionClassifier`. */
export const relDirectionFiltersAtom = atom<Record<string, boolean>>({});

/* ── Scoped panel state ───────────────────────────────────────────────────────
   Two Relationships panels can be on screen at once (the host's and a connected
   entity's in the overlay or Library drawer preview), and they must not share
   filters. The atoms above belong to the un-scoped surfaces (entity view panel
   and its drawer section). A subtree under `EntityScopeProvider` reads
   `relAtomFor(base, scope)` through the `useRelAtom*` hooks: a per-scope variant
   that reads the base's initial value until written, so a scoped panel opens on
   the defaults. All variants live in one record so the overlay can drop its
   entries on open. */

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

/** Clears the relationship facets on focal-entity change: a leftover value from
 *  the previous entity can filter the new entity's rows to nothing while its
 *  facet self-hides, leaving no control to clear it. `scope` targets a scoped
 *  surface instead of the host. */
export const resetRelFacetsAtom = atom(null, (_get, set, scope: string | null = null) => {
  set(relAtomFor(relTypeFiltersAtom, scope), {});
  set(relAtomFor(entityTypeFiltersAtom, scope), {});
  set(relAtomFor(relTargetCountryFiltersAtom, scope), {});
  set(relAtomFor(relTargetDescriptorFiltersAtom, scope), {});
  set(relAtomFor(relTargetDescriptorModeAtom, scope), "OR");
  set(relAtomFor(relInheritedFiltersAtom, scope), {});
  set(relAtomFor(relAnchoringFiltersAtom, scope), {});
  set(relAtomFor(relDirectionFiltersAtom, scope), {});
  set(relAtomFor(activeClusterRefIdsAtom, scope), null);
});

/** "Clear all filters": the facets, the search box, and the sort order.
 *  Delegates to {@link resetRelFacetsAtom} so the facet list exists in one
 *  place; separate copies drift (PATTERNS §4.3). */
export const clearRelFiltersAtom = atom(null, (_get, set, scope: string | null = null) => {
  set(resetRelFacetsAtom, scope);
  set(relAtomFor(searchQueryAtom, scope), "");
  set(relAtomFor(sortOrderAtom, scope), null);
});

/** Filters-open for a subtree with its own entity scope (the connection
 *  overlay's Relationships tab), keyed by scope id so opening Filters there
 *  does not also open the host's drawer. Read through `useFiltersDrawerOpen`;
 *  reset whenever the overlay changes. */
export const scopedFiltersOpenAtom = atom<Record<string, boolean>>({});

/** Whether the filters slide-over is open. Opening it closes the connection
 *  overlay: both occupy the same right-hand region (see atoms/rightPane). */
export const filtersDrawerOpenAtom = atom(
  (get) => get(filtersDrawerBase),
  (get, set, next: boolean | ((prev: boolean) => boolean)) => {
    const open = typeof next === "function" ? next(get(filtersDrawerBase)) : next;
    set(filtersDrawerBase, open);
    if (open) {
      set(overlayEntityBase, null);
      set(overlayStackBase, []);
    }
  },
);

/** Ref IDs checked for bulk actions. An aggregate row adds all its backing
 *  refIds; a hub row adds every member's. */
export const selectedRefIdsAtom = atom<Set<string>>(new Set<string>());

/** Edit mode: per-row checkboxes plus bulk Delete and Select all. Leaving it
 *  clears the selection. */
export const editModeAtom = atom(false);

/** Zoom tier for grouped and tree modes. */
export type Zoom = "detail" | "compact" | "overview";
export const DEFAULT_ZOOM: Zoom = "detail";
export const zoomAtom = atom<Zoom>(DEFAULT_ZOOM);

export type RelationshipsViewMode = "tree" | "graph";
export const relationshipsViewModeAtom = atom<RelationshipsViewMode>("tree");

/** Active filter count per scope: facets, search and cluster. View, grouping
 *  and sort are not filters. `activeFilterCountAtom` is the un-scoped one. */
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
  // Sort is not counted: it changes order, not membership, and its default
  // would put a permanent "1" on the Filters badge.
  n += Object.values(get(relTypeFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(entityTypeFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(relTargetCountryFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(relTargetDescriptorFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(relAnchoringFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(relDirectionFiltersAtom)).filter(Boolean).length;
  for (const vals of Object.values(get(relInheritedFiltersAtom)))
    n += Object.values(vals).filter(Boolean).length;
  if (get(activeClusterRefIdsAtom)) n++;
  return n;
}

export const activeFilterCountAtom = activeFilterCountFor(null);
