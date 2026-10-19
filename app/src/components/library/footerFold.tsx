import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from "react";

/** How far the Library's bottom bar has folded to fit its own width (not the
 *  viewport's: a drawer, Split's divider or the rail decide it). Each step
 *  applies only when the one before it still overflows:
 *    0  everything with its words;
 *    1  the actions show their icons only (named, with a tooltip);
 *    2  the page size shows its number only ("30");
 *    3  the range shows the total only ("4,398");
 *    4  the stepper only ("‹ 3 / 147 ›");
 *    5  the selection's scope buttons shorten ("Page (30)", "All 4,398").
 *  `FOOTER_FOLD_MAX` is the last step. */
export type FooterFold = 0 | 1 | 2 | 3 | 4 | 5;
export const FOOTER_FOLD_MAX: FooterFold = 5;

const FooterFoldContext = createContext<FooterFold>(0);
export const FooterFoldProvider = FooterFoldContext.Provider;
/** The bar's fold; 0 outside a bar. */
export const useFooterFold = () => useContext(FooterFoldContext);

/** Measures the row that holds the bar's parts and returns its fold. A step
 *  is taken when the row's content is wider than the row; the width that step
 *  needed is kept, and the row unfolds once it is that wide again. `key`
 *  names what is in the row (a selection, the Filters button, the page
 *  group): when it changes the kept widths are dropped and measured again.
 *  Every change happens in a layout effect, so no overflowing frame paints. */
export function useFooterFoldMeasure(key: string, disabled = false) {
  const [fold, setFold] = useState<FooterFold>(0);
  const [el, setEl] = useState<HTMLElement | null>(null);
  // The row width each fold needed, as measured while it overflowed.
  const needs = useRef<(number | undefined)[]>([]);
  const lastKey = useRef(key);
  const [tick, setTick] = useState(0);

  useLayoutEffect(() => {
    if (lastKey.current !== key) {
      lastKey.current = key;
      needs.current = [];
    }
    if (disabled) {
      if (fold !== 0) setFold(0);
      return;
    }
    if (!el) return;
    const width = el.clientWidth;
    if (width === 0) return;
    const content = contentWidth(el);
    if (content > width + 0.5) {
      if (fold < FOOTER_FOLD_MAX) {
        needs.current[fold] = content;
        setFold((fold + 1) as FooterFold);
      }
      return;
    }
    if (fold > 0) {
      const need = needs.current[fold - 1];
      // Unmeasured: try the step back; if it overflows it records its need
      // and comes back here before paint.
      if (need === undefined || width >= need) setFold((fold - 1) as FooterFold);
    }
  }, [el, fold, key, tick, disabled]);

  useLayoutEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(() => setTick((t) => t + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);

  const ref = useCallback((node: HTMLElement | null) => setEl(node), []);
  return { fold: disabled ? 0 : fold, ref };
}

/** The row's parts laid end to end: their widths, their margins and the
 *  row's gaps. Not `scrollWidth`, which also counts an open popover (Active
 *  filters, a menu) and would fold the bar when it opens. A part that pushes
 *  itself to the end (`data-fold-push`, `ms-auto`) counts no margin. */
function contentWidth(row: HTMLElement) {
  const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
  let total = 0;
  let parts = 0;
  for (const child of Array.from(row.children) as HTMLElement[]) {
    const w = child.getBoundingClientRect().width;
    if (w === 0) continue;
    parts += 1;
    total += w;
    if (!child.hasAttribute("data-fold-push")) {
      const cs = getComputedStyle(child);
      total += (parseFloat(cs.marginInlineStart) || 0) + (parseFloat(cs.marginInlineEnd) || 0);
    }
  }
  return total + gap * Math.max(0, parts - 1);
}
