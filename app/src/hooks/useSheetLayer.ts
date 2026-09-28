import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useId, useLayoutEffect, useRef } from "react";
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
  /** The name of the layer under this one ("Back to …"), when it gave one. */
  belowLabel?: string;
  /** Close EVERY layer on the stack, top first (a stacked layer's ×). */
  closeAll: () => void;
}

/** What each open layer can be closed with and called, by stack id. Module
 *  state rather than an atom: the handlers are closures, and nothing renders
 *  from them. Read only when a layer's Back or Close all is pressed. */
const layerRegistry = new Map<string, { close: () => void; label?: string }>();

/** Register a layer on the phone stack while `open`. Returns where it sits.
 *  Push on open, pop on close or unmount, in a layout effect so the stack is
 *  right before any focus or inert effect reads it. */
export function useSheetLayer(
  open: boolean,
  /** How this layer closes, and what to call it from the layer above. */
  opts: { onClose?: () => void; label?: string } = {},
): SheetLayer {
  const id = useId();
  // Latest handler and label, without re-registering on every render.
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const mobile = useAtomValue(breakpointAtom) === "mobile";
  const stack = useAtomValue(sheetStackAtom);
  const setStack = useSetAtom(sheetStackAtom);
  const active = open && mobile;

  useLayoutEffect(() => {
    if (!active) return;
    setStack((s) => (s.includes(id) ? s : [...s, id]));
    layerRegistry.set(id, {
      close: () => optsRef.current.onClose?.(),
      get label() {
        return optsRef.current.label;
      },
    });
    return () => {
      layerRegistry.delete(id);
      setStack((s) => s.filter((x) => x !== id));
    };
  }, [active, id, setStack]);

  // Top first, so each layer's own close runs while it is still the top (an
  // overlay's close pops whichever entity is on top of ITS stack).
  const closeAll = useCallback(() => {
    for (const layerId of [...stack].reverse()) layerRegistry.get(layerId)?.close();
  }, [stack]);

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
    belowLabel: index > 0 ? layerRegistry.get(stack[index - 1])?.label : undefined,
    closeAll,
  };
}

