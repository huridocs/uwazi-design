import { useCallback, useEffect, useId, useRef } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { toastsAtom } from "../atoms/notifications";
import { newSettingsUndoRef, settingsUndoAtom, settingsUndoRequestAtom } from "../atoms/settingsUndo";

let seq = 0;

/** Removal with an Undo in the Beacon, for a child row inside an open
 *  Settings editor (UX5). Returns `offer(payload, message, detail?)`: call it
 *  after removing the row from the draft, with what `restore` needs to put
 *  it back. The undo lives while this editor is mounted and no later removal
 *  replaced it (`atoms/settingsUndo.ts`). */
export function useSettingsUndo<P>(restore: (payload: P) => void) {
  const owner = useId();
  const store = useStore();
  const restoreRef = useRef(restore);
  restoreRef.current = restore;

  const request = useAtomValue(settingsUndoRequestAtom);
  const setRequest = useSetAtom(settingsUndoRequestAtom);
  useEffect(() => {
    if (!request || request.owner !== owner) return;
    setRequest(null);
    restoreRef.current(request.payload as P);
  }, [request, owner, setRequest]);

  // The draft goes with the editor, and so does its undo.
  useEffect(
    () => () => {
      if (store.get(settingsUndoAtom)?.owner === owner) store.set(settingsUndoAtom, null);
    },
    [store, owner],
  );

  return useCallback(
    (payload: P, message: string, detail?: string) => {
      const ref = newSettingsUndoRef();
      store.set(settingsUndoAtom, { ref, owner, payload });
      store.set(toastsAtom, (p) => [
        ...p,
        {
          id: `u-${Date.now()}-${seq++}`,
          message,
          type: "success",
          ...(detail ? { detail } : {}),
          action: { label: "Undo", kind: "settings-undo", ref },
        },
      ]);
    },
    [store, owner],
  );
}
