import type { useStore } from "jotai";
import { createScope } from "jotai-scope";
import { dataSourceAtom } from "./dataSource";
import { libraryPaneScopedAtoms, resetLibraryForSourceAtom, resetLibraryPaneAtom } from "./library";
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
  // A collection switch resets the left pane in `switchDataSource`; the right
  // pane runs the same reset through its scope, mounted or not.
  parent.sub(dataSourceAtom, () => store.set(resetLibraryForSourceAtom));
  rightPane = { parent, store };
  return store;
}

registerSettingsReset(() => rightPane?.store.set(resetLibraryPaneAtom));
