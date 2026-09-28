import { useAtomValue, useSetAtom } from "jotai";
import { useId, useLayoutEffect } from "react";
import { breakpointAtom } from "../atoms/viewport";
import { SHEET_STACK, sheetStackAtom } from "../atoms/sheetStack";

export interface SheetLayer {
  /** Stack position, 0 = the bottom sheet. -1 while not registered. */
  index: number;
  /** Layers open, this one included. */
  count: number;
  /** Layers above this one (0 = top). */
  depth: number;
  isTop: boolean;
  /** True when this layer is on a phone and registered. */
  stacked: boolean;
  /** The top edge of this layer while more than one is open, in rem. */
  offsetRem: number;
}

/** Register a layer on the phone stack while `open`. Returns where it sits.
 *  Push on open, pop on close or unmount, in a layout effect so the stack is
 *  right before any focus or inert effect reads it. */
export function useSheetLayer(open: boolean): SheetLayer {
  const id = useId();
  const mobile = useAtomValue(breakpointAtom) === "mobile";
  const stack = useAtomValue(sheetStackAtom);
  const setStack = useSetAtom(sheetStackAtom);
  const active = open && mobile;

  useLayoutEffect(() => {
    if (!active) return;
    setStack((s) => (s.includes(id) ? s : [...s, id]));
    return () => setStack((s) => s.filter((x) => x !== id));
  }, [active, id, setStack]);

  const index = active ? stack.indexOf(id) : -1;
  const count = stack.length;
  const depth = index < 0 ? 0 : count - 1 - index;
  // Only the top `visible` layers are staggered; the rest sit at the base.
  const shown = Math.max(0, index - Math.max(0, count - SHEET_STACK.visible));
  return {
    index,
    count,
    depth,
    isTop: index < 0 || depth === 0,
    stacked: index >= 0,
    offsetRem: SHEET_STACK.base + SHEET_STACK.step * shown,
  };
}

