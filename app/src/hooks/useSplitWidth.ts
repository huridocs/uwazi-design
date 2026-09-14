import { createContext, useContext } from "react";

/** The drawer width of the enclosing `SplitView`, as seen from either pane.
 *
 *  Both panes change width whenever the drawer does. A component that measures
 *  itself (the tab strips' fold) reads this so that a width change re-renders it
 *  and it measures again, even when no ResizeObserver callback arrives, as in a
 *  hidden page. `null` outside a split. */
const SplitWidthContext = createContext<number | null>(null);

export const SplitWidthProvider = SplitWidthContext.Provider;

export function useSplitWidth() {
  return useContext(SplitWidthContext);
}
