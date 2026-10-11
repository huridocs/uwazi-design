import { atom, type Getter, type Setter } from "jotai";
import { libraryPaneSideAtom } from "./paneSide";

/** A form with an open edit session. Registered while the session is mounted;
 *  `isDirty` flips live as the user edits. The label is what the confirm
 *  dialog names ("Metadata edits"). */
export interface DirtyForm {
  id: string;
  label: string;
  isDirty: boolean;
}

type Side = "left" | "right";
/** A registered form and the Split pane whose store registered it. Two panes
 *  can hold the same form (each its own "metadata-edit"), so the pane is part
 *  of the key. Outside Split every form is "left". */
type PaneForm = DirtyForm & { pane: Side };

/** Every mounted edit session, dirty or not. There's no router, so nothing
 *  else knows a form is open — this registry is how the navigation choke
 *  points find out. */
const dirtyFormsAtom = atom<PaneForm[]>([]);

/** The forms of the pane this store is (the right pane's scope reads "right"). */
const paneForms = (get: Getter) => {
  const side = get(libraryPaneSideAtom);
  return get(dirtyFormsAtom).filter((f) => f.pane === side);
};

export const registerDirtyFormAtom = atom(null, (get, set, form: DirtyForm) => {
  const pane = get(libraryPaneSideAtom);
  const entry: PaneForm = { ...form, pane };
  const forms = get(dirtyFormsAtom);
  const existing = forms.find((f) => f.id === form.id && f.pane === pane);
  if (!existing) {
    set(dirtyFormsAtom, [...forms, entry]);
  } else if (existing.isDirty !== form.isDirty || existing.label !== form.label) {
    set(
      dirtyFormsAtom,
      forms.map((f) => (f === existing ? entry : f)),
    );
  }
});

export const unregisterDirtyFormAtom = atom(null, (get, set, id: string) => {
  const pane = get(libraryPaneSideAtom);
  set(
    dirtyFormsAtom,
    get(dirtyFormsAtom).filter((f) => !(f.id === id && f.pane === pane)),
  );
});

/** The first dirty form, if any — what the guard would be protecting. Also
 *  drives the beforeunload listener in `UnsavedChangesGuard`. */
export const dirtyFormAtom = atom((get) => get(dirtyFormsAtom).find((f) => f.isDirty) ?? null);

/** Whether an edit session is mounted in this pane, dirty or not. Surfaces
 *  that can navigate away (the entity panel's "Open entity") hide that route
 *  while one is: leaving discards the form. In Split, the other pane's form is
 *  not left by it. */
export const editSessionOpenAtom = atom((get) => paneForms(get).length > 0);

/** The bulk edit form is open AND holds changes. A selection change then has
 *  to ask first: the form's set was frozen when it opened, and changing the
 *  selection under it would make Apply write to entities the reader no longer
 *  sees selected (or not write to ones they do). */
export const bulkEditDirtyAtom = atom((get) =>
  paneForms(get).some((f) => f.id === "bulk-edit" && f.isDirty),
);

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
 *  Discard runs it, Cancel drops it. Guard the handful of setters that
 *  switch surfaces (app view, entity tabs, focal entity, settings section) —
 *  not every button. */
export const guardNavigationAtom = atom(null, (get, set, run: () => void) => {
  guard(get, set, get(dirtyFormsAtom), run);
});

/** {@link guardNavigationAtom} for a navigation inside one Split pane (open a
 *  record, Back, a tab of the entity view, the pane's preview): it asks only
 *  about that pane's forms, the only ones it unmounts. Outside Split every
 *  form is the left pane's, so it asks about all of them. */
export const guardPaneNavigationAtom = atom(null, (get, set, run: () => void) => {
  guard(get, set, paneForms(get), run);
});

function guard(get: Getter, set: Setter, forms: PaneForm[], run: () => void) {
  const dirty = forms.filter((f) => f.isDirty);
  if (!dirty.length || get(guardBypassAtom)) run();
  else set(pendingNavigationAtom, { label: joinLabels(dirty.map((f) => f.label)), run });
}

/** Every dirty form, named: a page with two drafts (Account's profile and
 *  password) must not have the dialog mention only one. "A", "A and B",
 *  "A, B and C". */
function joinLabels(labels: string[]): string {
  const u = [...new Set(labels)];
  return u.length <= 1 ? (u[0] ?? "") : `${u.slice(0, -1).join(", ")} and ${u[u.length - 1]}`;
}

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
