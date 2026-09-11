import { useCallback, useRef } from "react";

/** A callback ref that reports its node's width, live.
 *
 *  Shared by `MainTabs` and `DrawerTabs`, which fold on it: a strip compares its
 *  natural width (a hidden probe) against the width it is given, and both
 *  numbers come from here.
 *
 *  A callback ref rather than `useRef` + an effect: these nodes are not all
 *  mounted on the first render (the strip and its probe come and go with the
 *  fold), and an effect with an empty dependency list would run once against a
 *  null ref and never again — the same trap that left the Results excerpt budget
 *  at its floor. */
export function useResizeWidth(onWidth: (w: number) => void) {
  const roRef = useRef<ResizeObserver | null>(null);
  /* The REF owns the whole lifecycle, and there is no `useEffect` cleanup
     beside it. There was one, and it was the bug: React calls a mount effect's
     cleanup and re-runs the effect under StrictMode, so the cleanup disconnected
     the observer the ref callback had just attached and nothing re-observed it.
     The strip then folded on whatever width it happened to have at first paint
     and never again. React already calls a ref with `null` on unmount, which is
     the disconnect this needs and the only one. */
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
