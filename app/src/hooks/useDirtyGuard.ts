import { useCallback, useEffect } from "react";
import { useSetAtom } from "jotai";
import {
  guardNavigationAtom,
  registerDirtyFormAtom,
  unregisterDirtyFormAtom,
} from "../atoms/dirtyGuard";

/** Returns a guarded runner: `guard(() => navigate())` runs immediately when
 *  nothing is dirty, else opens the discard-confirm dialog first. Component
 *  flavour of `guardNavigationAtom` for setters that live in component state
 *  (the entity tab strip) or compound handlers (Navbar's openSettings). */
export function useDirtyGuard() {
  const guard = useSetAtom(guardNavigationAtom);
  return useCallback((run: () => void) => guard(run), [guard]);
}

/** Call from an edit-session component: registers the form while mounted,
 *  keeps its `isDirty` current, and unregisters on unmount — so save/cancel
 *  need no explicit teardown, closing the session is enough. */
export function useRegisterDirtyForm(id: string, label: string, isDirty: boolean) {
  const register = useSetAtom(registerDirtyFormAtom);
  const unregister = useSetAtom(unregisterDirtyFormAtom);
  useEffect(() => {
    register({ id, label, isDirty });
  }, [register, id, label, isDirty]);
  useEffect(() => () => unregister(id), [unregister, id]);
}
