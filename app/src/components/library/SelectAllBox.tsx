import { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { deselectIdsAtom, librarySelectionAtom, selectIdsAtom } from "../../atoms/library";
import { Hint } from "../shared/Hint";

/** The tri-state "select this page" for the Library footer's selection bar,
 *  with its words and count beside it: "This page · 30" where the view pages
 *  its results (Cards, List, Adv. Search), "All shown · 124" where it draws
 *  them all (Timeline, Map). The label is the box's click target too.
 *
 *  Its state is over the SHOWN entities: none of them selected = unchecked,
 *  some = mixed, all = checked. Unchecked or mixed, a click selects every
 *  shown entity; checked, it deselects the shown ones, and only those (see
 *  the click). Selecting the rest of a larger result set is the bar's
 *  "Select all N", so this box never reaches past what the reader can see.
 *
 *  `compact` (a folded bar) keeps the count and drops the words; the
 *  accessible name and the tooltip still say "page". */
export function SelectAllBox({
  loadedIds,
  paged = true,
  compact = false,
  disabled = false,
}: {
  loadedIds: readonly string[];
  /** The view pages its results: the box means "this page". */
  paged?: boolean;
  compact?: boolean;
  disabled?: boolean;
}) {
  const selection = useAtomValue(librarySelectionAtom);
  const selectIds = useSetAtom(selectIdsAtom);
  const deselect = useSetAtom(deselectIdsAtom);
  const ref = useRef<HTMLInputElement | null>(null);

  let picked = 0;
  for (const id of loadedIds) if (selection.has(id)) picked++;
  const all = loadedIds.length > 0 && picked === loadedIds.length;
  const mixed = picked > 0 && !all;
  const off = disabled || loadedIds.length === 0;
  const count = loadedIds.length.toLocaleString();
  const where = paged ? "on this page" : "shown";
  // Selected beyond what is shown: the box won't touch those, and says so
  // before the click.
  const beyond = selection.size - picked;
  const text = all
    ? beyond > 0
      ? `Deselect the ${count} ${where}. The\u00a0${beyond.toLocaleString()} selected elsewhere stay selected.`
      : `Deselect the ${count} ${where}.`
    : `Select the ${count} records ${where}.`;

  // `indeterminate` is a DOM property with no attribute.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = mixed;
  }, [mixed]);

  return (
    <Hint text={text} describe={false}>
      {(hint) => (
        <label
          {...hint}
          data-part="select-page"
          className={`inline-flex items-center gap-1.5 h-7 px-1.5 rounded-md text-xs whitespace-nowrap ${
            off ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-paper/60"
          }`}
        >
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
                ? `Deselect the ${count} records ${where}`
                : `Select the ${count} records ${where}`
            }
            onChange={() => {}}
            onClick={(e) => {
              e.stopPropagation();
              if (off) {
                e.preventDefault();
                return;
              }
              // Clears only what it can see: the shown ids. Entities picked
              // on another page or under another filter stay; Clear, in the
              // bar, is the one that ends a whole selection.
              if (all) deselect(loadedIds);
              else selectIds(loadedIds);
            }}
            className="w-3.5 h-3.5 rounded shrink-0 accent-ink cursor-[inherit]"
          />
          <span aria-hidden className="text-ink-secondary tabular-nums">
            {!compact && <>{paged ? "This page" : "All shown"} · </>}
            {count}
          </span>
        </label>
      )}
    </Hint>
  );
}
