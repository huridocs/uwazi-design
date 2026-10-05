import { atom, type Getter, type Setter } from "jotai";
import type { NotificationAction } from "./notifications";

/** Undo for a child removed inside an open Settings editor (a template
 *  property, a thesaurus value, a filter group, a menu link): the removal is
 *  only in the editor's draft, so it gets an Undo in the Beacon instead of a
 *  dialog per row (UX5).
 *
 *  Like the Library's undo (`atoms/entityChanges.ts`), one level: the next
 *  removal replaces it. The undo belongs to the editor that made it, and
 *  ends when that editor unmounts (saved, cancelled or navigated away), since
 *  the draft it would restore into is gone. The notification refers to it by
 *  `ref`; the editor restores from `settingsUndoRequestAtom`, a value it
 *  reads, never a callback held in an atom. */
export interface SettingsUndo {
  ref: string;
  /** The editor instance that owns the draft. */
  owner: string;
  /** What the editor needs to put the child back. */
  payload: unknown;
}

export const settingsUndoAtom = atom<SettingsUndo | null>(null);

/** Set by the Beacon's Undo; the owning editor consumes and clears it. */
export const settingsUndoRequestAtom = atom<SettingsUndo | null>(null);

let seq = 0;
export const newSettingsUndoRef = () => `sundo-${Date.now().toString(36)}-${++seq}`;

/** Undos that belong to a store, not an editor: a removal that is already
 *  saved (a relationship type and the references it moved), which stays
 *  undoable from anywhere until a later removal replaces it. The store
 *  registers how it restores, keyed by an owner name that no editor uses. */
const storeUndoHandlers = new Map<string, (get: Getter, set: Setter, payload: unknown) => void>();
export function registerStoreUndo(owner: string, restore: (get: Getter, set: Setter, payload: unknown) => void) {
  storeUndoHandlers.set(owner, restore);
}

/** Register a store-owned undo and return its Beacon action. */
export const prepareStoreUndoAtom = atom(
  null,
  (_get, set, { owner, payload }: { owner: string; payload: unknown }): NotificationAction => {
    const ref = newSettingsUndoRef();
    set(settingsUndoAtom, { ref, owner, payload });
    return { label: "Undo", kind: "settings-undo", ref };
  },
);

/** The Beacon's Undo: a store-owned undo runs here; an editor's is handed to
 *  the editor, which restores into its draft. */
export const requestSettingsUndoAtom = atom(null, (get, set, ref: string): boolean => {
  const op = get(settingsUndoAtom);
  if (!op || op.ref !== ref) return false;
  set(settingsUndoAtom, null);
  const restore = storeUndoHandlers.get(op.owner);
  if (restore) restore(get, set, op.payload);
  else set(settingsUndoRequestAtom, op);
  return true;
});
