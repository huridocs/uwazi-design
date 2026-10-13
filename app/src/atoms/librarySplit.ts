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
import { focalHistoryAtom, focusedEntityIdAtom } from "./focusedEntity";
import {
  activePrimaryGroupIdAtom,
  addFileTargetAtom,
  documentGroupsAtom,
  drawerEditFocusAtom,
  filesAtom,
  passageFileIdAtom,
  viewerFileIdAtom,
} from "./files";
import {
  activeClusterRefIdsAtom,
  relAnchoringFiltersAtom,
  relAsOfAtom,
  relConnectPathAtom,
  relDirectionFiltersAtom,
  relPublisherFiltersAtom,
  relPublisherTypeFiltersAtom,
  relReportedByAtom,
  relEditModeAtom,
  relEntityTypeFiltersAtom,
  relExpansionCommandAtom,
  relFiltersDockCountAtom,
  relFiltersTabRequestAtom,
  relGroupByAtom,
  relGroupStatesAtom,
  relInheritedFiltersAtom,
  relSearchQueryAtom,
  relSortOrderAtom,
  relSubGroupByAtom,
  relTargetCountryFiltersAtom,
  relTargetDescriptorFiltersAtom,
  relTargetDescriptorModeAtom,
  relTypeFiltersAtom,
  relVerificationFiltersAtom,
  relViewAtom,
  relWhenYearsAtom,
  relZoomAtom,
  scopedFiltersOpenAtom,
  scopedRelStateAtom,
  selectedRefIdsAtom,
} from "./filters";
import {
  activeAggregateIdAtom,
  activeRefIdAtom,
  expandGroupForRefAtom,
  manageRelationTypesOpenAtom,
  scrollToHighlightAtom,
  scrollToRefAtom,
} from "./references";
import { currentPageAtom, documentFormatAtom, entityPickerOpenAtom, pageJumpStateAtom, textSelectionAtom } from "./selection";
import { docSearchQueryAtom } from "./docSearch";
import { activeDrawerTabAtom } from "./entityDrawer";
import { fillRequestStateAtom, fillTargetAtom } from "./fillTarget";
import { entityTabRequestAtom } from "./publishedView";
import { registerSettingsReset } from "./settingsReset";

type Store = ReturnType<typeof useStore>;
type ScopeStore = ReturnType<typeof createScope>;

/* Split: two Library panes. The left pane is the root store, so whatever
   writes the Library from outside a pane (a `#view=` link, Reset demo data, a
   saved view opened from elsewhere) lands in it. The right pane is a jotai-scope
   scope over the atoms one pane owns: the Library's (`libraryPaneScopedAtoms`),
   the Network find cursor, and the preview's slide-over stack, so a record
   opened inside one pane's preview stacks only there. A record opened from a
   pane shows its entity view in that pane, so the entity view's own state is
   the pane's too (`ENTITY_VIEW_ATOMS`). */

/** What the entity view reads about the record it shows: the focus and its
 *  history, the files seeded from it, the Relationships panel, the viewer's
 *  page, rendition, passage and jumps, the drawer's tab and search, and
 *  click-to-fill. Shared data (references, relationship types, highlights,
 *  entity edits, drafts) stay global; the dirty guard keys forms by pane
 *  (`atoms/dirtyGuard.ts`). A new atom the
 *  entity view keeps per record goes here. */
const ENTITY_VIEW_ATOMS = [
  focusedEntityIdAtom,
  focalHistoryAtom,
  filesAtom,
  documentGroupsAtom,
  activePrimaryGroupIdAtom,
  drawerEditFocusAtom,
  viewerFileIdAtom,
  passageFileIdAtom,
  addFileTargetAtom,
  relViewAtom,
  relGroupByAtom,
  relSubGroupByAtom,
  relSearchQueryAtom,
  relExpansionCommandAtom,
  relSortOrderAtom,
  relGroupStatesAtom,
  activeClusterRefIdsAtom,
  relWhenYearsAtom,
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
  relReportedByAtom,
  relPublisherFiltersAtom,
  relPublisherTypeFiltersAtom,
  relConnectPathAtom,
  scopedRelStateAtom,
  scopedFiltersOpenAtom,
  selectedRefIdsAtom,
  relEditModeAtom,
  relZoomAtom,
  relFiltersDockCountAtom,
  relFiltersTabRequestAtom,
  manageRelationTypesOpenAtom,
  activeRefIdAtom,
  scrollToHighlightAtom,
  scrollToRefAtom,
  expandGroupForRefAtom,
  activeAggregateIdAtom,
  textSelectionAtom,
  entityPickerOpenAtom,
  currentPageAtom,
  documentFormatAtom,
  pageJumpStateAtom,
  docSearchQueryAtom,
  activeDrawerTabAtom,
  fillTargetAtom,
  fillRequestStateAtom,
  entityTabRequestAtom,
];

const PANE_ATOMS = [
  ...libraryPaneScopedAtoms,
  networkFindStepAtom,
  overlayEntityBase,
  overlayStackBase,
  filtersDrawerBase,
  ...ENTITY_VIEW_ATOMS,
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