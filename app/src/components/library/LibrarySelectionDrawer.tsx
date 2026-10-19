import { useEffect, useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { CheckSquare } from "lucide-react";
import {
  deselectIdsAtom,
  libraryBulkEditIdsAtom,
  libraryBulkEditOpenAtom,
  librarySelectionAtom,
  librarySelectionDrawerOpenAtom,
} from "../../atoms/library";
import { LibraryBulkEditDrawer } from "./LibraryBulkEditDrawer";
import { SelectionActionsMenu } from "./SelectionActionsMenu";
import { useSelectionActions } from "./selectionActions";
import { dataSourceAtom } from "../../atoms/dataSource";
import { BAR_GHOST, BAR_LEAD } from "../shared/warmButton";
import { EntityListDrawer } from "./EntityListDrawer";

/** The multi-selection, listed in the Library drawer by the same body a map
 *  cluster uses (`EntityListDrawer`).
 *
 *  A row's hover / focus X deselects it, and the row leaves the list at once:
 *  the list IS the selection, in the order it was built (a Set keeps insertion
 *  order, so rows selected elsewhere while the list is open join its end).
 *  The header count is the live selection.
 *
 *  The X closes the list without clearing the selection (Clear, in the
 *  footer, is the one clear); the footer's "N selected" reopens it. */
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
  const bulkEdit = useAtomValue(libraryBulkEditOpenAtom);
  const corpus = useAtomValue(dataSourceAtom);
  // The bar's actions; an export here writes rows in THIS list's order.
  const actions = useSelectionActions({ order: ids, corpus });
  const editAction = actions.find((a) => a.id === "edit")!;
  // The bulk form edits the set FROZEN when it opened (see
  // `libraryBulkEditIdsAtom`) — passed as that array itself, so its identity
  // changes only when the set does and the form's field and value summaries
  // aren't recomputed each time the list beside it grows.
  const frozen = useAtomValue(libraryBulkEditIdsAtom);

  // Down to one: the bulk form has ended (the list shows), and it does not
  // reopen by itself when a second entity is ticked.
  const endBulk = useSetAtom(libraryBulkEditOpenAtom);
  useEffect(() => {
    if (bulkEdit && selection.size < 2) endBulk(false);
  }, [bulkEdit, selection.size, endBulk]);

  if (bulkEdit && selection.size >= 2) return <LibraryBulkEditDrawer ids={frozen} />;

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
      empty={
        <div data-part="empty" className="body-top flex flex-col gap-1">
          <p className="text-sm font-medium text-ink-secondary">Nothing selected yet</p>
          <p className="text-xs text-ink-tertiary">
            Click records in the view to add them here.{" "}
            {"Clear,\u00a0in the bar, stops selecting."}
          </p>
        </div>
      }
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
          {/* Nothing to act on yet: the actions keep their place, unseen. */}
          <span className={`flex items-center gap-2 ${selection.size === 0 ? "invisible" : ""}`}>
          <button
            type="button"
            onClick={editAction.onClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${BAR_LEAD} rounded-md transition-colors cursor-pointer`}
          >
            <span className="text-ink-tertiary">{editAction.icon}</span>
            Edit
          </button>
          <SelectionActionsMenu actions={actions.filter((a) => a.id !== "edit")} />
          </span>
        </>
      }
    />
  );
}
