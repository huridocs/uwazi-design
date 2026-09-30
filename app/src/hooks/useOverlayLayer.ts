import { useSetAtom, useAtomValue } from "jotai";
import { useCallback, useId, useLayoutEffect } from "react";
import { layerStackAtom } from "../atoms/layerStack";

/** The same stack as `layerStackAtom`, kept in step outside React so an event
 *  handler reads the order at the moment of the event, not at its last render. */
let current: string[] = [];

/** Register an overlay on the layer stack while `open`. Push on open, pop on
 *  close or unmount, in a layout effect so the stack is right before the first
 *  pointer or key event can reach a document listener.
 *
 *  `isTop` is for rendering; `isTopNow()` is for document listeners, which must
 *  ignore an event while another layer sits above theirs. A layer that is not
 *  registered is never the top. */
export function useOverlayLayer(open: boolean) {
  const id = useId();
  const stack = useAtomValue(layerStackAtom);
  const setStack = useSetAtom(layerStackAtom);

  useLayoutEffect(() => {
    if (!open) return;
    if (!current.includes(id)) current = [...current, id];
    setStack(current);
    return () => {
      current = current.filter((x) => x !== id);
      setStack(current);
    };
  }, [open, id, setStack]);

  const isTopNow = useCallback(() => current[current.length - 1] === id, [id]);
  return { isTop: open && stack[stack.length - 1] === id, isTopNow };
}
