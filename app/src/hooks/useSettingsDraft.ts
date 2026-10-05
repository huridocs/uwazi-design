import { useCallback, useState, type SetStateAction } from "react";
import { useRegisterDirtyForm } from "./useDirtyGuard";
import { deepEqual } from "../utils/deepEqual";

/** One settings form's edit session: the draft the inputs edit, and the saved
 *  value it is compared with. `dirty` is the two being structurally unequal,
 *  so undoing an edit by hand, or saving, clears it; a dialog closed with no
 *  change leaves it clear too.
 *
 *  Registers with the dirty guard while mounted (`useRegisterDirtyForm`), so
 *  the rail, the back arrow, the breadcrumb, the mobile back chevron, a corpus
 *  switch and a reload all ask before discarding. Cancel is an explicit
 *  discard and does not ask.
 *
 *  `saved` seeds both on mount. After a Save, call `markSaved()` (or
 *  `markSaved(stored)` when the store normalised the value) so a page that
 *  stays open reads clean again. */
export function useSettingsDraft<T>({ id, label, saved }: { id: string; label: string; saved: T }) {
  const [baseline, setBaseline] = useState<T>(saved);
  const [draft, setDraftState] = useState<T>(saved);
  const dirty = !deepEqual(draft, baseline);
  useRegisterDirtyForm(`settings:${id}`, label, dirty);

  const setDraft = useCallback((next: SetStateAction<T>) => setDraftState(next), []);
  /** Merge fields into an object draft. */
  const update = useCallback(
    (patch: Partial<T>) => setDraftState((d) => ({ ...d, ...patch })),
    [],
  );
  /** A `useState`-style setter for one field of an object draft, so a form
   *  that kept each field in its own state reads the same. */
  const setField = useCallback(
    <K extends keyof T>(key: K) =>
      (next: SetStateAction<T[K]>) =>
        setDraftState((d) => ({
          ...d,
          [key]: typeof next === "function" ? (next as (prev: T[K]) => T[K])(d[key]) : next,
        })),
    [],
  );
  const markSaved = useCallback(
    (next?: T) => {
      const value = next === undefined ? draft : next;
      setBaseline(value);
      setDraftState(value);
    },
    [draft],
  );
  const discard = useCallback(() => setDraftState(baseline), [baseline]);

  return { draft, setDraft, update, setField, dirty, markSaved, discard, saved: baseline };
}
