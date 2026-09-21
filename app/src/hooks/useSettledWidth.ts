import { useCallback, useEffect, useRef, useState } from "react";
import { useSplitDragging } from "./useDrawerWidth";

/** An element's width, quantised to `step` px, that does NOT follow a
 *  `SplitView` divider mid-drag: it holds the last settled width while the
 *  divider is dragged and takes the new one once, on release.
 *
 *  For content sized to its pane (the Results excerpt budget): each change
 *  re-builds and re-wraps every excerpt, so following the drag moved the text
 *  under the reader at every step. Quantising alone only made the steps rarer.
 *
 *  A CALLBACK REF, not `useRef` + an effect: the measured element is often not
 *  mounted on the first render (a loading or empty branch comes first), and an
 *  effect with an empty dependency list would run once against null and never
 *  again. Returns 0 until the element is measured. */
export function useSettledWidth(step = 64): [(el: HTMLElement | null) => void, number] {
  const dragging = useSplitDragging();
  const draggingRef = useRef(dragging);
  draggingRef.current = dragging;
  const [width, setWidth] = useState(0);
  const elRef = useRef<HTMLElement | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  const measure = useCallback(() => {
    const el = elRef.current;
    if (!el || draggingRef.current) return;
    const next = Math.round(el.getBoundingClientRect().width / step) * step;
    setWidth((prev) => (next === prev ? prev : next));
  }, [step]);

  const ref = useCallback(
    (el: HTMLElement | null) => {
      roRef.current?.disconnect();
      roRef.current = null;
      elRef.current = el;
      if (!el) return;
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      roRef.current = ro;
    },
    [measure],
  );

  // The release: one measure of wherever the drag left the pane.
  useEffect(() => {
    if (!dragging) measure();
  }, [dragging, measure]);

  useEffect(() => () => roRef.current?.disconnect(), []);

  return [ref, width];
}
