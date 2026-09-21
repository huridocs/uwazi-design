import { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { clearSelectionAtom, librarySelectionAtom, selectIdsAtom } from "../../atoms/library";
import { Hint } from "../shared/Hint";

/** The tri-state "select all" for the Library — the footer's and the list
 *  table's header cell, one action.
 *
 *  Its state is over the LOADED entities (what "Show more" has mounted): none
 *  of them selected = unchecked, some = mixed, all = checked. Unchecked, a
 *  click selects every loaded entity; mixed or checked, it clears. Selecting
 *  the rest of a larger result set is the footer readout's own offer, so this
 *  box never reaches past what the reader can see.
 *
 *  The hint carries the gestures Uwazi prints under its grid, because a
 *  checkbox is not where anyone expects to learn them. */
export function SelectAllBox({ loadedIds, disabled = false }: { loadedIds: readonly string[]; disabled?: boolean }) {
  const selection = useAtomValue(librarySelectionAtom);
  const selectIds = useSetAtom(selectIdsAtom);
  const clear = useSetAtom(clearSelectionAtom);
  const ref = useRef<HTMLInputElement | null>(null);

  let picked = 0;
  for (const id of loadedIds) if (selection.has(id)) picked++;
  const all = loadedIds.length > 0 && picked === loadedIds.length;
  const mixed = picked > 0 && !all;
  const off = disabled || loadedIds.length === 0;

  // `indeterminate` is a DOM property with no attribute.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = mixed;
  }, [mixed]);

  return (
    <Hint text="Select all loaded. Cmd or Shift + click selects several." describe={false}>
      {(hint) => (
        <span {...hint} className="inline-flex items-center">
          <input
            ref={ref}
            type="checkbox"
            data-component="Checkbox"
            data-part="select-all"
            checked={all}
            aria-checked={mixed ? "mixed" : all}
            aria-disabled={off || undefined}
            aria-label="Select all loaded entities"
            onChange={() => {}}
            onClick={(e) => {
              e.stopPropagation();
              if (off) {
                e.preventDefault();
                return;
              }
              if (picked > 0) clear();
              else selectIds(loadedIds);
            }}
            className={`w-3.5 h-3.5 rounded shrink-0 accent-ink ${off ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          />
        </span>
      )}
    </Hint>
  );
}
