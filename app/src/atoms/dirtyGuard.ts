import { atom } from "jotai";

/** A form with an open edit session. Registered while the session is mounted;
 *  `isDirty` flips live as the user edits. The label is what the confirm
 *  dialog names ("Metadata edits"). */
export interface DirtyForm {
  id: string;
  label: string;
  isDirty: boolean;
}

/** Every mounted edit session, dirty or not. There's no router, so nothing
 *  else knows a form is open — this registry is how the navigation choke
 *  points find out. */
const dirtyFormsAtom = atom<DirtyForm[]>([]);

export const registerDirtyFormAtom = atom(null, (get, set, form: DirtyForm) => {
  const forms = get(dirtyFormsAtom);
  const existing = forms.find((f) => f.id === form.id);
  if (!existing) {
    set(dirtyFormsAtom, [...forms, form]);
  } else if (existing.isDirty !== form.isDirty || existing.label !== form.label) {
    set(
      dirtyFormsAtom,
      forms.map((f) => (f.id === form.id ? form : f)),
    );
  }
});

export const unregisterDirtyFormAtom = atom(null, (get, set, id: string) => {
  set(
    dirtyFormsAtom,
    get(dirtyFormsAtom).filter((f) => f.id !== id),
  );
});

/** The first dirty form, if any — what the guard would be protecting. Also
 *  drives the beforeunload listener in `UnsavedChangesGuard`. */
export const dirtyFormAtom = atom((get) => get(dirtyFormsAtom).find((f) => f.isDirty) ?? null);

/** A navigation held back by the guard, waiting on the user's verdict.
 *  Non-null = the confirm dialog is open. */
export const pendingNavigationAtom = atom<{ label: string; run: () => void } | null>(null);

/** True only while a discarded navigation is replaying. Guarded setters
 *  compose (Navbar's openSettings runs through App's guarded handleNavigate),
 *  and the form is still mounted when Discard replays the write — without
 *  this, the inner guard would park it again and reopen the dialog. */
const guardBypassAtom = atom(false);

/** Write-only choke point: every navigation setter routes its write through
 *  this. Nothing dirty → the write runs immediately, zero cost. Something
 *  dirty → the write is parked in `pendingNavigationAtom` and the dialog asks;
 *  Discard runs it, Keep editing drops it. Guard the handful of setters that
 *  switch surfaces (app view, entity tabs, focal entity, settings section) —
 *  not every button. */
export const guardNavigationAtom = atom(null, (get, set, run: () => void) => {
  const dirty = get(dirtyFormAtom);
  if (!dirty || get(guardBypassAtom)) run();
  else set(pendingNavigationAtom, { label: dirty.label, run });
});

/** Write-only: the dialog's Discard. Clears the pending slot first (the write
 *  may unmount the dialog's own trigger), then replays the parked write with
 *  the guard bypassed. */
export const confirmPendingNavigationAtom = atom(null, (get, set) => {
  const pending = get(pendingNavigationAtom);
  set(pendingNavigationAtom, null);
  if (!pending) return;
  set(guardBypassAtom, true);
  try {
    pending.run();
  } finally {
    set(guardBypassAtom, false);
  }
});
