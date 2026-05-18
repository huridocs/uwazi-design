import { atom } from "jotai";
import {
  files as seedFiles,
  documentGroups as seedGroups,
  FileEntry,
  DocumentGroup,
} from "../data/files";

export const filesAtom = atom<FileEntry[]>(seedFiles);
export const documentGroupsAtom = atom<DocumentGroup[]>(seedGroups);

/** Which primary group the Document tab viewer is rendering. Falls back to
 *  the first primary group in `order` when null. Mutated when the user picks
 *  "Set as active primary" from a kebab or promotes a new group. */
export const activePrimaryGroupIdAtom = atom<string | null>(null);

/** One-shot signal: when set, the drawer detail editor auto-focuses the
 *  matching input on its next render and clears the signal. Kebab actions
 *  "Rename" and "Change language" use this to route the user directly to
 *  the field they meant to edit. */
export type DrawerEditFocus = "name" | "language";
export const drawerEditFocusAtom = atom<DrawerEditFocus | null>(null);

/** Drives `AddFileModal`. `null` = closed. A target descriptor opens the
 *  modal:
 *  - `{ mode: "new" }`           — generic flow; user picks Primary /
 *    Supporting / Translation-of-X per entry.
 *  - `{ mode: "translation", groupId }` — entries are locked to translations
 *    of the supplied primary group. Used from kebab "Add translation" and
 *    drawer "+ Add translation document". */
export type AddFileTarget =
  | { mode: "new" }
  | { mode: "translation"; groupId: string };
export const addFileTargetAtom = atom<AddFileTarget | null>(null);
