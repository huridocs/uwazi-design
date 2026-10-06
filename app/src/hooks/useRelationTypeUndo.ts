import { useSetAtom } from "jotai";
import { prepareRelationTypeUndoAtom } from "../atoms/relationTypes";

/** Undo for a relationship-type delete, shared by Settings › Relationship
 *  types and the panel's Manage types. Returns `prepare(deletion)`: the Beacon
 *  action the delete's own notification carries, so one delete is one card.
 *  The undo is the registry's (`atoms/relationTypes.ts`): it works after the
 *  page closes, and the restore is logged. */
export function useRelationTypeUndo() {
  return useSetAtom(prepareRelationTypeUndoAtom);
}
