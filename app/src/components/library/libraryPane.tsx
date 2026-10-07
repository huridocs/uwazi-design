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
