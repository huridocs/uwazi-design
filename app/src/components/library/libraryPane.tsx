import { createContext, useContext, useSyncExternalStore, type RefObject } from "react";
import type { Entity } from "../../data/entities";

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
  const inPane = t?.closest("[data-library-pane], [data-library-pane-owner]");
  // Synced Split's shared rail and panel sit outside both panes; what one
  // pane portalled there is marked with its side.
  if (inPane) return inPane === root || inPane.getAttribute("data-library-pane-owner") === pane.side;
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
   Import act once. The other pane renders none. Export CSV offers the left
   pane, the right pane or both, so each pane reports its current result set
   to `results`, mounted and active or not. */
export interface SplitFooterValue {
  slot: HTMLElement | null;
  active: LibraryPaneSide;
  /** Sync filters is on: both panes hold one set, and Export exports it. */
  synced: boolean;
  results: PaneResults;
}

/** Each pane's filtered result set, outside React state: a pane writes it on
 *  every change, and only the Export button that reads a count re-renders. */
export interface PaneResults {
  get: (side: LibraryPaneSide) => readonly Entity[];
  set: (side: LibraryPaneSide, list: readonly Entity[]) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createPaneResults(): PaneResults {
  const lists: Record<LibraryPaneSide, readonly Entity[]> = { left: [], right: [] };
  const listeners = new Set<() => void>();
  return {
    get: (side) => lists[side],
    set: (side, list) => {
      if (lists[side] === list) return;
      lists[side] = list;
      for (const l of listeners) l();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** One pane's result count, kept current. */
export function usePaneResultCount(results: PaneResults, side: LibraryPaneSide): number {
  return useSyncExternalStore(results.subscribe, () => results.get(side).length);
}

const SplitFooterContext = createContext<SplitFooterValue | null>(null);
export const SplitFooterProvider = SplitFooterContext.Provider;

export function useSplitFooter(): SplitFooterValue | null {
  return useContext(SplitFooterContext);
}

/* Synced Split's shared chrome. While Sync filters is on, the two panes hold
   one filter set, so Split draws one time strip under both panes and one rail
   centred over the divider instead of one of each per pane. The left pane
   portals the rail and its panels there, so their bodies read its store. A
   pane's preview, selection list or map cluster stays in that pane, at its end.
   One panel shows at a time across the three slots: the one that opens claims
   it, and the others close theirs. */
export type SplitPanelSlot = "rail" | LibraryPaneSide;

export interface SplitSharedValue {
  /** The positioned layer over both panes the rail and its panels portal into. */
  railLayer: HTMLElement | null;
  /** The strip's slot under both panes. */
  brushSlot: HTMLElement | null;
  /** The slot whose panel is open, if any. */
  panelOwner: SplitPanelSlot | null;
  claimPanel: (slot: SplitPanelSlot) => void;
  releasePanel: (slot: SplitPanelSlot) => void;
  /** Each slot's close, through its dirty guard, for the next one to call
   *  before it opens. */
  registerPanelClose: (slot: SplitPanelSlot, close: ((next: () => void) => void) | null) => void;
  /** Close whichever other slot holds a panel, then run `next`. A dirty edit
   *  may stop the close, and then `next` does not run. */
  handOverPanel: (slot: SplitPanelSlot, next: () => void) => void;
  /** Which panes would draw a time strip; the left pane's draws the shared one,
   *  else the right pane's. */
  brushWanted: Record<LibraryPaneSide, boolean>;
  reportBrush: (side: LibraryPaneSide, wanted: boolean) => void;
}

const SplitSharedContext = createContext<SplitSharedValue | null>(null);
export const SplitSharedProvider = SplitSharedContext.Provider;

/** Synced Split's shared chrome, or null outside Split and while not synced. */
export function useSplitShared(): SplitSharedValue | null {
  return useContext(SplitSharedContext);
}
