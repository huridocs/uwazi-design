import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";
import { useAtom } from "jotai";
import { drawerWidthAtom } from "../atoms/session";

/** One minimum for every drawer host. The width is shared across hosts, so
 *  different minimums would let one host clamp a width dragged in another. 360 is
 *  safe because `DrawerTabs` folds, connection tables stack below 28.5rem, and the
 *  metadata masonry goes single-column below 44rem. */
export const DRAWER_MIN_WIDTH = 360;

/** The right drawer's width for one host: the stored `drawerWidthAtom` (shared by
 *  every host), else the host's default, clamped into [minimum, half the container].
 *  Clamped on read, not on write, so shrinking the window does not overwrite the
 *  stored width and growing it again restores the dragged width. */
export function useDrawerWidth(
  containerRef: RefObject<HTMLElement | null>,
  {
    defaultWidth,
    minWidth,
    mainMin,
  }: {
    defaultWidth: number;
    minWidth: number;
    /** The narrowest the view beside the drawer may get, in px. Given, the
     *  drawer may take everything past it instead of half the container. */
    mainMin?: number;
  },
) {
  const [storedWidth, setStoredWidth] = useAtom(drawerWidthAtom);
  const [containerWidth, setContainerWidth] = useState(Infinity);
  const [measured, setMeasured] = useState(false);

  // Measured from the container, not the viewport, and before paint so a
  // remembered width wider than this host allows never flashes.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      // A hidden container reports 0; keep the last real width.
      if (el.clientWidth > 0) setContainerWidth(el.clientWidth);
    };
    measure();
    setMeasured(true);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  const maxWidth = mainMin === undefined ? containerWidth / 2 : containerWidth - mainMin;
  const clamp = useCallback(
    (w: number) => Math.max(minWidth, Math.min(maxWidth, w)),
    [minWidth, maxWidth],
  );

  return {
    /** The width this host shows when nothing is being dragged. Undragged, a
     *  host with `mainMin` still opens at no more than half. */
    width: clamp(storedWidth ?? (mainMin === undefined ? defaultWidth : Math.min(defaultWidth, containerWidth / 2))),
    clamp,
    /** Half the container, or what `mainMin` leaves. The divider is a
     *  `role="separator"` and needs it for `aria-valuemax`. */
    maxWidth,
    /** Whether the drawer at its minimum leaves the view its `mainMin`. */
    fits: mainMin === undefined || containerWidth >= minWidth + mainMin,
    setStoredWidth,
    /** False on the render before the container is measured, when `width` is
     *  unclamped. Hosts render no content on that pass: components that measure on
     *  mount (metadata masonry, Results excerpt budget) would otherwise paint one
     *  frame of overlapping cards at the unclamped width. */
    measured,
  };
}

/** The enclosing drawer's current width, live during a drag, provided by
 *  `SplitView`. `null` outside a drawer (mobile bottom sheets). */
const DrawerWidthContext = createContext<number | null>(null);

export const DrawerWidthProvider = DrawerWidthContext.Provider;

export function useHostDrawerWidth() {
  return useContext(DrawerWidthContext);
}

/** The drawer width as seen from either pane of a `SplitView`. The main pane sits
 *  outside `DrawerWidthProvider`, so self-measuring components there (the tab
 *  strips' fold) read this to re-measure when no ResizeObserver callback arrives,
 *  as in a hidden page. `null` outside a split. */
const SplitWidthContext = createContext<number | null>(null);

export const SplitWidthProvider = SplitWidthContext.Provider;

export function useSplitWidth() {
  return useContext(SplitWidthContext);
}

/** Whether a `SplitView` divider is being dragged. Width-sized content (the
 *  Results excerpt budget) keeps its last width until release so text does not
 *  re-wrap on every drag step. `false` outside a split. */
const SplitDraggingContext = createContext(false);

export const SplitDraggingProvider = SplitDraggingContext.Provider;

export function useSplitDragging() {
  return useContext(SplitDraggingContext);
}
