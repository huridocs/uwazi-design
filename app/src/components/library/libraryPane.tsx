import { createContext, useContext, type RefObject } from "react";

/* Split (`views/LibrarySplitView.tsx`) mounts two Library panes. What a pane
   needs to know about being one: which side it is, and its root element, so
   its keys and touches stay inside it. Outside Split there is no pane, and
   every check below answers yes. */
export type LibraryPaneSide = "left" | "right";

export interface LibraryPaneValue {
  side: LibraryPaneSide;
  root: RefObject<HTMLElement | null>;
}

const PaneContext = createContext<LibraryPaneValue | null>(null);
export const LibraryPaneProvider = PaneContext.Provider;

/** The Library pane this subtree is in, or null outside Split. */
export function useLibraryPane(): LibraryPaneValue | null {
  return useContext(PaneContext);
}

/** The pane under the pointer, set by each pane root as the pointer enters. */
let pointerPane: LibraryPaneSide | null = null;
export function notePointerPane(side: LibraryPaneSide) {
  pointerPane = side;
}

/** Whether a key event is this pane's: the focus is inside it, or the focus is
 *  in neither pane (on the page, the navbar, a portalled popover) and the
 *  pointer is over it. Always true outside Split. */
export function paneHoldsEvent(pane: LibraryPaneValue | null, e: Event): boolean {
  if (!pane) return true;
  const root = pane.root.current;
  if (!root) return false;
  const t = e.target instanceof Element ? e.target : null;
  const inPane = t?.closest("[data-library-pane]");
  if (inPane) return inPane === root;
  return pointerPane === pane.side;
}

/* Split's masthead fold. Each pane works out the tier its own width needs (see
   the masthead fold in `LibraryView`) and reports it; both panes draw the most
   folded of the two, so the two mastheads have the same parts and the same
   height, and both bodies start at the same y. Outside Split there is no
   provider and a pane draws its own tier. */
export interface MastheadFoldValue {
  /** The tier both panes draw. */
  tier: number;
  report: (side: LibraryPaneSide, tier: number) => void;
}

const MastheadFoldContext = createContext<MastheadFoldValue | null>(null);
export const MastheadFoldProvider = MastheadFoldContext.Provider;

export function useMastheadFold(): MastheadFoldValue | null {
  return useContext(MastheadFoldContext);
}

/* Split's one footer bar. The pane that last had focus (or a press) renders
   its footer actions into `slot` through a portal, so Create, Upload and
   Import act once and Export exports that pane. The other pane renders none. */
export interface SplitFooterValue {
  slot: HTMLElement | null;
  active: LibraryPaneSide;
  /** Sync filters is on: Export names the shared set, not a pane. */
  synced: boolean;
}

const SplitFooterContext = createContext<SplitFooterValue | null>(null);
export const SplitFooterProvider = SplitFooterContext.Provider;

export function useSplitFooter(): SplitFooterValue | null {
  return useContext(SplitFooterContext);
}
