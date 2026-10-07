import type { PrimitiveAtom, useStore } from "jotai";
import { createScope } from "jotai-scope";
import { dataSourceAtom } from "./dataSource";
import {
  dropSyncedMapAreaAtom,
  enterSyncedMapAreaAtom,
  leaveSyncedMapAreaAtom,
  libraryFilterSetAtoms,
  libraryOwnMapAreaAtom,
  libraryPaneScopedAtoms,
  libraryPaneSideAtom,
  resetLibraryForSourceAtom,
  resetLibraryPaneAtom,
} from "./library";
import { networkFindStepAtom } from "./network";
import { filtersDrawerBase, overlayEntityBase, overlayStackBase } from "./rightPane";
import { registerSettingsReset } from "./settingsReset";

type Store = ReturnType<typeof useStore>;
type ScopeStore = ReturnType<typeof createScope>;

/* Split: two Library panes. The left pane is the root store, so whatever
   writes the Library from outside a pane (a `#view=` link, Reset demo data, a
   saved view opened from elsewhere) lands in it. The right pane is a jotai-scope
   scope over the atoms one pane owns: the Library's (`libraryPaneScopedAtoms`),
   the Network find cursor, and the preview's slide-over stack, so a record
   opened inside one pane's preview stacks only there. */
const PANE_ATOMS = [
  ...libraryPaneScopedAtoms,
  networkFindStepAtom,
  overlayEntityBase,
  overlayStackBase,
  filtersDrawerBase,
];

/** The right pane's scope, built once per session and kept while the Library
 *  is not on screen: the entity view and Back find the pane as it was. */
let rightPane: { parent: Store; store: ScopeStore } | null = null;

export function rightPaneStore(parent: Store): ScopeStore {
  if (rightPane?.parent === parent) return rightPane.store;
  const store = createScope({
    atoms: PANE_ATOMS,
    // The store `useStore` returns is jotai's internal store under its public type.
    parentStore: parent as unknown as ScopeStore,
    name: "library-right",
  });
  store.set(libraryPaneSideAtom, "right");
  // A collection switch resets the left pane in `switchDataSource`; the right
  // pane runs the same reset through its scope, mounted or not.
  parent.sub(dataSourceAtom, () => store.set(resetLibraryForSourceAtom));
  rightPane = { parent, store };
  return store;
}

registerSettingsReset(() => rightPane?.store.set(resetLibraryPaneAtom));

/* Sync filters. While it is on, a write to any filter atom in one pane's store
   is copied into the other's, so the two keep one filter set while each keeps
   its own view, sort, display, selection and preview. The copy runs inside
   the write that caused it, so a search committed in a transition reaches the
   other pane in the same transition. A copy that finds the value already
   there stops, which ends the echo. The map area is not copied: while synced
   both panes read one shared area (`libraryMapBoundsAtom`). */
type SyncStore = Store | ScopeStore;
const FILTER_SET = libraryFilterSetAtoms as PrimitiveAtom<unknown>[];

/** Copy `from`'s filter set and map area into the other pane and keep the two
 *  in step. Returns the stop, which hands the shared map area back to the pane
 *  whose map set it. */
export function syncLibraryPanes(root: Store, right: ScopeStore, from: "left" | "right"): () => void {
  const src: SyncStore = from === "left" ? root : right;
  const dst: SyncStore = from === "left" ? right : root;
  for (const a of FILTER_SET) {
    const v = src.get(a);
    if (!Object.is(v, dst.get(a))) dst.set(a, v);
  }
  const area = src.get(libraryOwnMapAreaAtom);
  root.set(enterSyncedMapAreaAtom, area ? { bounds: area, side: from } : null);

  const copy = (a: PrimitiveAtom<unknown>, a1: SyncStore, a2: SyncStore) => () => {
    const v = a1.get(a);
    if (!Object.is(v, a2.get(a))) a2.set(a, v);
  };
  const stops = FILTER_SET.flatMap((a) => [root.sub(a, copy(a, root, right)), right.sub(a, copy(a, right, root))]);
  return () => {
    for (const stop of stops) stop();
    root.set(leaveSyncedMapAreaAtom);
    right.set(leaveSyncedMapAreaAtom);
    root.set(dropSyncedMapAreaAtom);
  };
}