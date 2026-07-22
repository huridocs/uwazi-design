import { useAtomValue, useSetAtom } from "jotai";
import { libraryActiveSearchAtom, clearLibrarySearchAtom } from "../../atoms/library";
import { ActiveFilterChip } from "../shared/ActiveFilterChip";

/** The committed search, shown where its results are, with the one affordance
 *  that ends it.
 *
 *  Until now a search could only be dropped from the Filters panel's
 *  active-filters sheet — from the page that lists what you *could* filter by,
 *  never from the page showing what the search actually returned. Emptying the
 *  box doesn't do it either (deliberately: the draft and the committed query are
 *  split so clearing the text to retype doesn't evaporate the results).
 *
 *  **One dismiss, not one dismiss per surface.** Both Results surfaces render
 *  THIS component, which owns the wiring to `clearLibrarySearchAtom` — the same
 *  write the active-filters sheet and the action-bar popover use via
 *  `useActiveFilters`. Passing an `onRemove` down to each surface would have been
 *  two call sites over one piece of state, which is precisely how the two
 *  `clearAll`s on this state drifted apart before (PATTERNS §4.3): one forgot the
 *  search box, the other forgot the AND/OR modes. There is nothing here to keep
 *  in sync, because there is only one of it.
 *
 *  Visually it IS `ActiveFilterChip`, though the search is NOT counted as a facet
 *  (the Filters tab's count and dot describe that panel's own state — see
 *  `libraryActiveSearchAtom`). Borrowing the chip is a shared VOCABULARY for
 *  "something narrowing this, with the affordance that ends it"; a chip that
 *  dropped a search while looking unlike every other droppable thing would be a
 *  second vocabulary for one idea. */
export function ActiveSearchChip() {
  // `libraryActiveSearchAtom` — the search as its own state, already trimmed and
  // already null when there is none. Reading the raw query and trimming here
  // would be a second definition of "is a search running", leaving this element
  // and the Filters tab's count to answer that question separately.
  const q = useAtomValue(libraryActiveSearchAtom);
  const clearSearch = useSetAtom(clearLibrarySearchAtom);

  // Both call sites sit inside a count row that only exists while a query does,
  // so this never renders empty in practice — but it stays defensive rather than
  // assuming its host's blank-state ordering never changes.
  if (!q) return null;

  return (
    <ActiveFilterChip
      label={`“${q}”`}
      onRemove={() => clearSearch()}
      removeLabel={`Clear search: ${q}`}
    />
  );
}
