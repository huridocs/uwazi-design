import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { useResizeWidth } from "./useResizeWidth";
import { useSplitWidth } from "./useSplitWidth";

/** The fold decision shared by `MainTabs` and `DrawerTabs`: the strip folds into
 *  a Select when its natural width (a hidden probe) is wider than the width it
 *  is given (the measured cluster).
 *
 *  Both widths used to update only from ResizeObserver callbacks. Chrome
 *  delivers none while the page is hidden, so a drawer width change in a hidden
 *  tab left a stale width: the tabs overflowed their cluster, or the Select
 *  showed where the tabs fit. So the widths are also read directly, in a layout
 *  effect with no dependency list, on every render. The component re-renders
 *  when the split's drawer width changes (`useSplitWidth`), when the viewport
 *  resizes, when fonts finish loading (label widths change) and when the page
 *  becomes visible or hidden. The ResizeObserver stays for resizes nothing
 *  re-renders for.
 *
 *  Setting a width to the value it already has is a no-op, so the effect does
 *  not loop. */
export function useStripFold() {
  const [availW, setAvailW] = useState(0);
  const [naturalW, setNaturalW] = useState(0);
  const observeAvail = useResizeWidth(setAvailW);
  const observeProbe = useResizeWidth(setNaturalW);
  const availEl = useRef<HTMLElement | null>(null);
  const probeEl = useRef<HTMLElement | null>(null);

  const availRef = useCallback(
    (el: HTMLElement | null) => {
      availEl.current = el;
      observeAvail(el);
    },
    [observeAvail],
  );
  const probeRef = useCallback(
    (el: HTMLElement | null) => {
      probeEl.current = el;
      observeProbe(el);
    },
    [observeProbe],
  );

  // Subscribes this component to the split's drawer width, so a width change
  // re-renders it and the layout effect below measures again.
  useSplitWidth();
  const [, remeasure] = useReducer((n: number) => n + 1, 0);

  useLayoutEffect(() => {
    if (availEl.current) setAvailW(availEl.current.getBoundingClientRect().width);
    if (probeEl.current) setNaturalW(probeEl.current.getBoundingClientRect().width);
  });

  useEffect(() => {
    let live = true;
    const again = () => remeasure();
    document.addEventListener("visibilitychange", again);
    // A viewport resize changes the cluster outside any split (the mobile views),
    // and no ResizeObserver callback reports it while the page is hidden.
    window.addEventListener("resize", again);
    document.fonts?.ready.then(() => {
      if (live) remeasure();
    });
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", again);
      window.removeEventListener("resize", again);
    };
  }, []);

  return {
    availRef,
    probeRef,
    folded: availW > 0 && naturalW > 0 && naturalW > availW,
  };
}
