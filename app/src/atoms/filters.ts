import { atom, type Atom, type PrimitiveAtom, type SetStateAction, type WritableAtom } from "jotai";
import { filtersDrawerBase, overlayEntityBase, overlayStackBase } from "./rightPane";

/** Relationships panel view. Orthogonal to {@link relGroupByAtom}, which only
 *  applies in list. `when` lays the connected entities on time (their dated
 *  properties). */
export type View = "list" | "tree" | "graph" | "when";
/** Views that draw no groups: the collapse pair and grouping controls idle. */
export const isUngroupedView = (view: View): boolean => view === "graph" || view === "when";
export const relViewAtom = atom<View>("list");

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
export const relGroupByAtom = atom<GroupBy>(DEFAULT_GROUP_BY);

/** Secondary grouping axis ("Then by"). Any pair of axes is allowed. */
export const DEFAULT_SUB_GROUP_BY: GroupBy = "none";
export const relSubGroupByAtom = atom<GroupBy>(DEFAULT_SUB_GROUP_BY);

export const relSearchQueryAtom = atom("");

/** The last Expand all / Collapse all. Each press bumps `nonce`; a group mounted
 *  before the press obeys it, and a group mounted later obeys it only when its
 *  parent group did (the sub-groups and evidence an Expand all reveals). Scoped
 *  like the facets, so one panel's pair never drives another panel's groups. */
export type ExpansionCommand = { kind: "expand" | "collapse"; nonce: number } | null;
export const relExpansionCommandAtom = atom<ExpansionCommand>(null);
export const nextExpansionCommand =
  (kind: "expand" | "collapse") =>
  (prev: ExpansionCommand): ExpansionCommand => ({ kind, nonce: (prev?.nonce ?? 0) + 1 });

/** `evidence` puts the targets with the most backing references first. */
export type SortOrder = "none" | "appearance" | "evidence" | "asc" | "desc";
/** Default sort per view: list rows are single references (document order),
 *  tree and graph rows are aggregates (most evidence first). */
export function defaultSortFor(view: View): SortOrder {
  return view === "list" ? "appearance" : "evidence";
}
/** Explicit sort, or null for {@link defaultSortFor}, so switching views
 *  follows each view's default until the user picks a sort. */
export const relSortOrderAtom = atom<SortOrder | null>(null);

/** Every mounted group's open state, by scope (`""` = the host) then group id.
 *  The collapse pair reads its enablement from here. Each group writes its own
 *  entry and removes it on unmount, so the totals are always the groups on
 *  screen; counters adjusted by each transition drifted whenever an open group
 *  unmounted (a collapsed parent's sub-groups, a search that dropped a group).
 *  Kept out of `scopedRelStateAtom`, which the overlay clears on open. */
export const relGroupStatesAtom = atom<Record<string, Record<string, boolean>>>({});

/** IDs of refs in the expanded minimap cluster. */
export const activeClusterRefIdsAtom = atom<string[] | null>(null);

/** The When view's year range (inclusive), set from its year strip. null = every
 *  year. Scoped like the facets, so the overlay's range is its own. */
export const relWhenYearsAtom = atom<[number, number] | null>(null);

export const relTypeFiltersAtom = atom<Record<string, boolean>>({});

/** Target entity type facet. */
export const relEntityTypeFiltersAtom = atom<Record<string, boolean>>({});

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

/** Verification facet: a link's own status (`Reference.verification`). Shown
 *  only where references carry one. */
export const relVerificationFiltersAtom = atom<Record<string, boolean>>({});

/** "As of": an ISO day (yyyy-mm-dd) or "" for none. With a day set, a dated
 *  link shows only if it held on that day (`refHoldsAt`); undated links stay. */
export const relAsOfAtom = atom<string>("");

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
  set(relAtomFor(relEntityTypeFiltersAtom, scope), {});
  set(relAtomFor(relTargetCountryFiltersAtom, scope), {});
  set(relAtomFor(relTargetDescriptorFiltersAtom, scope), {});
  set(relAtomFor(relTargetDescriptorModeAtom, scope), "OR");
  set(relAtomFor(relInheritedFiltersAtom, scope), {});
  set(relAtomFor(relAnchoringFiltersAtom, scope), {});
  set(relAtomFor(relDirectionFiltersAtom, scope), {});
  set(relAtomFor(relVerificationFiltersAtom, scope), {});
  set(relAtomFor(relAsOfAtom, scope), "");
  set(relAtomFor(activeClusterRefIdsAtom, scope), null);
  set(relAtomFor(relWhenYearsAtom, scope), null);
});

/** "Clear all filters": the facets, the search box, and the sort order.
 *  Delegates to {@link resetRelFacetsAtom} so the facet list exists in one
 *  place; separate copies drift (PATTERNS §4.3). */
export const clearRelFiltersAtom = atom(null, (_get, set, scope: string | null = null) => {
  set(resetRelFacetsAtom, scope);
  set(relAtomFor(relSearchQueryAtom, scope), "");
  set(relAtomFor(relSortOrderAtom, scope), null);
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
export const relEditModeAtom = atom(false);

/** Zoom tier for grouped and tree modes. */
export type Zoom = "detail" | "compact" | "overview";
export const DEFAULT_ZOOM: Zoom = "detail";
export const relZoomAtom = atom<Zoom>(DEFAULT_ZOOM);

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
  if (get(relSearchQueryAtom).trim()) n++;
  // Sort is not counted: it changes order, not membership, and its default
  // would put a permanent "1" on the Filters badge.
  n += Object.values(get(relTypeFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(relEntityTypeFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(relTargetCountryFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(relTargetDescriptorFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(relAnchoringFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(relDirectionFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(relVerificationFiltersAtom)).filter(Boolean).length;
  if (get(relAsOfAtom)) n++;
  for (const vals of Object.values(get(relInheritedFiltersAtom)))
    n += Object.values(vals).filter(Boolean).length;
  if (get(activeClusterRefIdsAtom)) n++;
  return n;
}

export const activeFilterCountAtom = activeFilterCountFor(null);
