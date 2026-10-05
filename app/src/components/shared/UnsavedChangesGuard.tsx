import { useEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  confirmPendingNavigationAtom,
  dirtyFormAtom,
  pendingNavigationAtom,
} from "../../atoms/dirtyGuard";
import { ConfirmDialog } from "./ConfirmDialog";

/** App-level mount for the dirty-form guard: renders the discard-confirm
 *  dialog whenever a navigation is parked in `pendingNavigationAtom`, and
 *  keeps a `beforeunload` listener attached only while something is dirty so
 *  a browser-level exit (reload, tab close) also warns. */
export function UnsavedChangesGuard() {
  const dirty = useAtomValue(dirtyFormAtom);
  const [pending, setPending] = useAtom(pendingNavigationAtom);
  const confirmPending = useSetAtom(confirmPendingNavigationAtom);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome still requires returnValue to trigger the native prompt.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  return (
    <ConfirmDialog
      open={pending !== null}
      // Uwazi's wording for every unsaved form.
      title="Discard changes?"
      message="You have unsaved changes. Do you want to continue?"
      confirmLabel="Discard changes"
      cancelLabel="Cancel"
      variant="danger"
      onConfirm={confirmPending}
      onCancel={() => setPending(null)}
    />
  );
}
