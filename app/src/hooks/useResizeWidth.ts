import { useCallback, useRef } from "react";

/** A callback ref that reports its node's width, live.
 *
 *  `DrawerTabs` folds on it: the strip compares its natural width (a hidden
 *  probe) against the width it is given, and both numbers come from here.
 *
 *  A callback ref rather than `useRef` + an effect, and with no `useEffect`
 *  cleanup beside it. The nodes it measures are not all mounted on the first
 *  render, so an effect with an empty dependency list would run once against a
 *  null ref; and a mount effect's cleanup is run and the effect re-run under
 *  StrictMode, which would disconnect the observer this ref just attached. React
 *  already calls a ref with `null` on unmount — that is the only disconnect this
 *  needs. */
export function useResizeWidth(onWidth: (w: number) => void) {
  const roRef = useRef<ResizeObserver | null>(null);
  return useCallback(
    (el: HTMLElement | null) => {
      roRef.current?.disconnect();
      roRef.current = null;
      if (!el) return;
      const measure = () => onWidth(el.getBoundingClientRect().width);
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      roRef.current = ro;
    },
    [onWidth],
  );
}
