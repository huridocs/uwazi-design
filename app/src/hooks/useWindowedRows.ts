import { useCallback, useLayoutEffect, useRef, useState } from "react";

/** The nearest ancestor that scrolls vertically. */
function scrollParentOf(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if (o === "auto" || o === "scroll") return p;
  }
  return null;
}

const remPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

/** Windowing for a long list of fixed-height rows that scrolls with its
 *  page, not in a box of its own: the rows draw inside a container as tall
 *  as all of them, and only those near the scroll parent's viewport mount.
 *
 *  Below `threshold` rows every row mounts (a short list keeps plain DOM
 *  order for find-in-page and assistive tech). `rowRem` is the row height in
 *  rem. `scrollToIndex` brings a row to the top of the scroll parent. */
export function useWindowedRows(count: number, rowRem: number, { threshold = 300, overscan = 12 } = {}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const windowed = count > threshold;
  const [range, setRange] = useState<[number, number]>([0, Math.min(count, 60)]);

  useLayoutEffect(() => {
    if (!windowed) return;
    const el = ref.current;
    const sc = scrollParentOf(el);
    if (!el || !sc) return;
    const update = () => {
      const row = rowRem * remPx();
      const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top;
      const start = Math.max(0, Math.floor(-top / row) - overscan);
      const end = Math.min(count, Math.ceil((sc.clientHeight - top) / row) + overscan);
      setRange((prev) => (prev[0] === start && prev[1] === end ? prev : [start, Math.max(start, end)]));
    };
    update();
    sc.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(sc);
    return () => {
      sc.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [windowed, count, rowRem, overscan]);

  const scrollToIndex = useCallback(
    /** `offsetPx`: what sticks over the list's top (a toolbar). */
    (i: number, offsetPx = 0) => {
      const el = ref.current;
      const sc = scrollParentOf(el);
      if (!el || !sc) return;
      const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
      sc.scrollTo({ top: Math.max(0, top + i * rowRem * remPx() - offsetPx - 8) });
    },
    [rowRem],
  );

  const [start, end] = windowed ? range : [0, count];
  return { ref, windowed, start, end, scrollToIndex };
}
