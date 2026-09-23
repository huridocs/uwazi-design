import { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { deselectIdsAtom, librarySelectionAtom, selectIdsAtom } from "../../atoms/library";
import { Hint } from "../shared/Hint";

/** The tri-state "select all" for the Library footer. It shows only while a
 *  MULTIPLE selection is on (the bar's end group), so it is never seen
 *  unchecked in practice.
 *
 *  Its state is over the LOADED entities (what "Show more" has mounted): none
 *  of them selected = unchecked, some = mixed, all = checked. Unchecked or
 *  mixed, a click selects every loaded entity; checked, it deselects the
 *  loaded ones — and only those (see the click). Mixed used to deselect, which
 *  made sense while the box sat in the idle bar; shown only with a selection,
 *  it left the box no way to select at all. Selecting
 *  the rest of a larger result set is the footer readout's own offer, so this
 *  box never reaches past what the reader can see.
 *
 *  The hint carries the gestures Uwazi prints under its grid, because a
 *  checkbox is not where anyone expects to learn them. */
/** The modifier this platform calls Cmd — Ctrl everywhere but Apple's. */
const MOD =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "Cmd" : "Ctrl";

export function SelectAllBox({ loadedIds, disabled = false }: { loadedIds: readonly string[]; disabled?: boolean }) {
  const selection = useAtomValue(librarySelectionAtom);
  const selectIds = useSetAtom(selectIdsAtom);
  const deselect = useSetAtom(deselectIdsAtom);
  const ref = useRef<HTMLInputElement | null>(null);

  let picked = 0;
  for (const id of loadedIds) if (selection.has(id)) picked++;
  const all = loadedIds.length > 0 && picked === loadedIds.length;
  const mixed = picked > 0 && !all;
  const off = disabled || loadedIds.length === 0;
  // Selected beyond what is loaded: the box won't touch those, and says so
  // before the click (the bar's "N not shown" says so after).
  const beyond = selection.size - picked;
  const text =
    all && beyond > 0
      ? `Deselect the ${picked.toLocaleString()} loaded; ${beyond.toLocaleString()} more stay selected (Clear ends the selection).`
      : all
        ? "Deselect the loaded entities."
        : `Select all ${loadedIds.length.toLocaleString()} loaded. ${MOD} or Shift + click selects several; on touch, long-press.`;

  // `indeterminate` is a DOM property with no attribute.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = mixed;
  }, [mixed]);

  return (
    <Hint text={text} describe={false}>
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
            aria-label={
              all
                ? beyond > 0
                  ? `Deselect the ${picked.toLocaleString()} loaded entities; ${beyond.toLocaleString()} more stay selected`
                  : "Deselect the loaded entities"
                : "Select all loaded entities"
            }
            onChange={() => {}}
            onClick={(e) => {
              e.stopPropagation();
              if (off) {
                e.preventDefault();
                return;
              }
              // Clears only what it can see: the loaded ids. Entities picked
              // under another filter (counted "not in view") stay — Clear, in
              // the bar, is the one that ends a whole selection.
              if (all) deselect(loadedIds);
              else selectIds(loadedIds);
            }}
            className={`w-3.5 h-3.5 rounded shrink-0 accent-ink ${off ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          />
        </span>
      )}
    </Hint>
  );
}
