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

/** The right drawer's width as ONE host resolves it: the remembered value
 *  (`drawerWidthAtom`, shared by every host), else the host's default, clamped
 *  into [the host's minimum, half the host's container].
 *
 *  Hosts differ only in their default and minimum, which is why the stored value
 *  is clamped on read rather than stored per host — and why the clamp lives here
 *  once. Shrinking the window pulls the drawer back to half without overwriting
 *  what was remembered, so growing it again restores the dragged width. */
export function useDrawerWidth(
  containerRef: RefObject<HTMLElement | null>,
  { defaultWidth, minWidth }: { defaultWidth: number; minWidth: number },
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

  const clamp = useCallback(
    (w: number) => Math.max(minWidth, Math.min(containerWidth / 2, w)),
    [minWidth, containerWidth],
  );

  return {
    /** The width this host shows when nothing is being dragged. */
    width: clamp(storedWidth ?? defaultWidth),
    clamp,
    setStoredWidth,
    /** False for the one render before the container is measured, when `width`
     *  is the stored value UNCLAMPED (half of an unknown container is no cap).
     *  Hosts render no content on that pass: it is re-rendered before paint, but
     *  anything that measures itself on mount (the metadata masonry, the Results
     *  excerpt budget) would measure at the unclamped width and correct only
     *  after paint — a frame of overlapping cards whenever the remembered width
     *  is wider than half this host. */
    measured,
  };
}

/** The width the enclosing drawer is drawn at right now — live during a drag —
 *  or `null` outside one (the mobile bottom sheets render the same content with
 *  no drawer around it). Provided by `SplitView`, so a panel stacked inside the
 *  drawer reads the resolved number instead of re-deriving it. */
const DrawerWidthContext = createContext<number | null>(null);

export const DrawerWidthProvider = DrawerWidthContext.Provider;

export function useHostDrawerWidth() {
  return useContext(DrawerWidthContext);
}
