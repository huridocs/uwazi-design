import { useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { CheckSquare, FileDown } from "lucide-react";
import {
  deselectIdsAtom,
  librarySelectionAtom,
  librarySelectionDrawerOpenAtom,
} from "../../atoms/library";
import { BAR_GHOST, WARM_BUTTON } from "../shared/warmButton";
import { EntityListDrawer } from "./EntityListDrawer";
import { useExportSelection } from "./LibrarySelectionBar";

/** The multi-selection, listed in the Library drawer (`EntityListDrawer`).
 *
 *  A row's hover / focus X deselects it, and the row leaves the list at once:
 *  the list IS the selection, in the order it was built (a Set keeps insertion
 *  order, so rows selected elsewhere while the list is open join its end).
 *
 *  The X closes the list without clearing the selection (Clear, in the
 *  footer bar, is the one clear); the bar's "N selected" reopens it. */
export function LibrarySelectionDrawer({
  onSelect,
  query,
}: {
  onSelect: (id: string, e?: React.MouseEvent) => void;
  /** The host's deferred query, to mark. */
  query: string;
}) {
  const selection = useAtomValue(librarySelectionAtom);
  const setOpen = useSetAtom(librarySelectionDrawerOpenAtom);
  const deselect = useSetAtom(deselectIdsAtom);
  const ids = useMemo(() => [...selection], [selection]);
  // An export here writes rows in THIS list's order.
  const exportSelection = useExportSelection(ids);

  return (
    <EntityListDrawer
      icon={<CheckSquare size={15} />}
      title="Selection"
      count={selection.size}
      ids={ids}
      onClose={() => setOpen(false)}
      closeLabel="Close selection list"
      onSelect={onSelect}
      query={query}
      onRemove={{ remove: (id) => deselect([id]), can: () => true }}
      footer={
        <>
          {/* The same footer every Library drawer body has: Close at the
              start, the work at the end. Close leaves the selection. */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            data-gutter-align="box"
            className={`px-3 py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer`}
          >
            Close
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => void exportSelection()}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${WARM_BUTTON} rounded-md transition-colors cursor-pointer`}
          >
            <FileDown size={13} className="text-ink-tertiary" aria-hidden />
            Export CSV
          </button>
        </>
      }
    />
  );
}
