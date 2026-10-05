import { atom } from "jotai";

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

/** The Beacon's Undo: hand the current undo to its editor. */
export const requestSettingsUndoAtom = atom(null, (get, set, ref: string): boolean => {
  const op = get(settingsUndoAtom);
  if (!op || op.ref !== ref) return false;
  set(settingsUndoAtom, null);
  set(settingsUndoRequestAtom, op);
  return true;
});
