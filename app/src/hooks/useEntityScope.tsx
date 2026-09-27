import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom, type PrimitiveAtom } from "jotai";
import {
  referencesAtom,
  referencesFor,
  scopedReferencesAtom,
  writeReferencesFor,
} from "../atoms/references";
import { focusedEntityIdAtom } from "../atoms/focusedEntity";
import {
  activeFilterCountFor,
  clearRelFiltersAtom,
  filtersDrawerOpenAtom,
  relAtomFor,
  scopedFiltersOpenAtom,
} from "../atoms/filters";
import type { Reference } from "../data/references";

/** The entity a subtree's connection surfaces belong to, when that is NOT the
 *  globally focused one.
 *
 *  Everything relationship-shaped reads `scopedReferencesAtom`, which is keyed
 *  to `focusedEntityIdAtom` — right for the entity view, and right for the
 *  Library drawer preview (which focuses the previewed entity for the duration).
 *  The entity OVERLAY is the case neither covers: it previews a connected entity
 *  on top of a view whose own focus must not move, or the surface behind it
 *  swaps entities while the reader is looking at it. So the overlay declares its
 *  entity here and the relationships subtree reads through it instead.
 *
 *  `null` (the default) means "no override — follow the focused entity". */
const EntityScopeContext = createContext<string | null>(null);

export function EntityScopeProvider({
  entityId,
  children,
}: {
  entityId: string | null;
  children: ReactNode;
}) {
  return (
    <EntityScopeContext.Provider value={entityId}>{children}</EntityScopeContext.Provider>
  );
}

/** The entity the surrounding connection surfaces are about — the scope
 *  override if one is in force, else the focused entity. */
export function useEntityScopeId(): string {
  const override = useContext(EntityScopeContext);
  const focused = useAtomValue(focusedEntityIdAtom);
  return override ?? focused;
}

/** Whether this subtree declared its own entity (the overlay, the Library
 *  drawer preview) rather than following the focused one. */
export function useIsScopedSurface(): boolean {
  return useContext(EntityScopeContext) !== null;
}

/** `scopedReferencesAtom` as a hook, honouring the scope override. Without an
 *  override it returns the atom's own value, so the un-overridden hosts keep
 *  sharing one derivation. */
export function useScopedReferences(): Reference[] {
  const override = useContext(EntityScopeContext);
  const scoped = useAtomValue(scopedReferencesAtom);
  const all = useAtomValue(referencesAtom);
  const overridden = useMemo(
    () => (override ? referencesFor(override, all) : null),
    [override, all],
  );
  return overridden ?? scoped;
}

/** The writer half: an update expressed in the scoped view, folded back into
 *  the corpus for whichever entity is in scope. */
export function useSetScopedReferences() {
  const override = useContext(EntityScopeContext);
  const setScoped = useSetAtom(scopedReferencesAtom);
  const setAll = useSetAtom(referencesAtom);
  return useMemo(
    () =>
      (update: Reference[] | ((prev: Reference[]) => Reference[])) => {
        if (!override) {
          setScoped(update);
          return;
        }
        setAll((all) => writeReferencesFor(override, all, update));
      },
    [override, setScoped, setAll],
  );
}

/** Whether THIS surface's Filters slide-over is open.
 *
 *  The same reasoning as `useScopedReferences`, applied to a boolean. There is
 *  one Filters flag, and two surfaces can render a Relationships panel at once:
 *  the host, and the connection overlay laid on top of it. Sharing the flag
 *  meant one Filters button opened two drawers — the overlay's, and the host's
 *  behind it, which is the bug this hook exists for.
 *
 *  No scope override means the host, and the host keeps the global atom: the
 *  un-overridden surfaces are never on screen together, and that atom is also
 *  the one the overlay/Filters exclusion writes (atoms/rightPane), which is
 *  right — opening an overlay should close the panel BEHIND it, and nothing
 *  else. A scoped surface gets its own entry and no coupling at all, so opening
 *  Filters inside the overlay cannot close the overlay it is inside. */
export function useFiltersDrawerOpen(): [boolean, (open: boolean) => void] {
  const override = useContext(EntityScopeContext);
  const [hostOpen, setHostOpen] = useAtom(filtersDrawerOpenAtom);
  const [scoped, setScoped] = useAtom(scopedFiltersOpenAtom);
  const setScopedOpen = useCallback(
    (open: boolean) => setScoped((prev) => ({ ...prev, [override as string]: open })),
    [override, setScoped],
  );
  if (!override) return [hostOpen, setHostOpen];
  return [!!scoped[override], setScopedOpen];
}

/** This surface's copy of a Relationships panel atom (facets, search, view,
 *  grouping, sort — see `relAtomFor`). With no scope override it IS the atom,
 *  so the entity view's panel and its drawer section keep sharing one state; a
 *  scoped surface (the overlay, the Library drawer preview) gets its own,
 *  starting from the atom's default. */
export function useRelAtom<T>(base: PrimitiveAtom<T> & { init: T }) {
  return useAtom(relAtomFor(base, useContext(EntityScopeContext)));
}
export function useRelAtomValue<T>(base: PrimitiveAtom<T> & { init: T }): T {
  return useAtomValue(relAtomFor(base, useContext(EntityScopeContext)));
}
export function useSetRelAtom<T>(base: PrimitiveAtom<T> & { init: T }) {
  return useSetAtom(relAtomFor(base, useContext(EntityScopeContext)));
}

/** The active-filter count for this surface's scope. */
export function useActiveFilterCount(): number {
  return useAtomValue(activeFilterCountFor(useContext(EntityScopeContext)));
}

/** "Clear all filters" for this surface's scope only. */
export function useClearRelFilters(): () => void {
  const scope = useContext(EntityScopeContext);
  const clear = useSetAtom(clearRelFiltersAtom);
  return useCallback(() => clear(scope), [clear, scope]);
}
