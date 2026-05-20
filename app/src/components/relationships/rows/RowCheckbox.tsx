import { useAtom, useAtomValue } from "jotai";
import { editModeAtom, selectedRefIdsAtom } from "../../../atoms/filters";
import { Checkbox } from "../../shared/Checkbox";

/** Checkbox surfaced on every row variant when the panel is in edit mode.
 *  Returns null otherwise so layout collapses cleanly. Click stops propagation
 *  so the row's click handler doesn't fire alongside selection. For aggregate
 *  / hub rows, `refIds` covers every backing reference — toggling adds or
 *  removes the whole set atomically. */
export function RowCheckbox({ refIds }: { refIds: string[] }) {
  const editMode = useAtomValue(editModeAtom);
  const [selected, setSelected] = useAtom(selectedRefIdsAtom);
  if (!editMode) return null;
  const allChecked = refIds.length > 0 && refIds.every((id) => selected.has(id));
  const handleChange = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        for (const id of refIds) next.delete(id);
      } else {
        for (const id of refIds) next.add(id);
      }
      return next;
    });
  };
  return (
    <span
      onClick={(e) => e.stopPropagation()}
      className="flex items-center shrink-0"
    >
      <Checkbox
        checked={allChecked}
        onChange={handleChange}
        ariaLabel={refIds.length > 1 ? "Select relationship group" : "Select relationship"}
      />
    </span>
  );
}
