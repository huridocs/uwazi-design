import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { toastsAtom, type Toast } from "../atoms/references";

let seq = 0;

/** Push a transient toast — drained into the Beacon as a notification + a brief
 *  pill flash. Use for prototype actions that have no real backing yet, so every
 *  click gives honest feedback instead of dead-ending. */
export function useNotify() {
  const setToasts = useSetAtom(toastsAtom);
  return useCallback(
    (message: string, type: Toast["type"] = "info") => {
      setToasts((p) => [...p, { id: `n-${Date.now()}-${seq++}`, message, type }]);
    },
    [setToasts],
  );
}
