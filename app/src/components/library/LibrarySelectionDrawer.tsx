import { useEffect, useMemo, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { CheckSquare } from "lucide-react";
import { deselectIdsAtom, libraryBulkEditOpenAtom, librarySelectionAtom, librarySelectionDrawerOpenAtom } from "../../atoms/library";
import { LibraryBulkEditDrawer } from "./LibraryBulkEditDrawer";
import { EntityListDrawer } from "./EntityListDrawer";

/** The multi-selection, listed in the Library drawer by the same body a map
 *  cluster uses (`EntityListDrawer`).
 *
 *  A row's hover / focus X takes it out of the selection, but the row STAYS
 *  where it is, dimmed, until the drawer is left — nothing moves under the
 *  pointer, and a Cmd/Ctrl+click adds it back. The header count is the live
 *  selection. Rows selected elsewhere while the list is open join its end.
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
  // Every id listed since the drawer opened, in the order it arrived. A Set
  // beside the array for membership: a selection can be the whole corpus, and
  // `includes` over it per render was ~19M comparisons at 4,398.
  const [listed, setListed] = useState<{ ids: string[]; has: Set<string> }>(() => ({
    ids: [...selection],
    has: new Set(selection),
  }));
  const missing: string[] = [];
  for (const id of selection) if (!listed.has.has(id)) missing.push(id);
  if (missing.length) {
    setListed((prev) => {
      const add = missing.filter((id) => !prev.has.has(id));
      return { ids: [...prev.ids, ...add], has: new Set([...prev.has, ...add]) };
    });
  }
  const ids = missing.length ? [...listed.ids, ...missing] : listed.ids;
  const bulkEdit = useAtomValue(libraryBulkEditOpenAtom);
  // The bulk form edits the live selection, in the order it was listed.
  const selected = useMemo(() => ids.filter((id) => selection.has(id)), [ids, selection]);

  // Down to one: the bulk form has ended (the list shows), and it does not
  // reopen by itself when a second entity is ticked.
  const endBulk = useSetAtom(libraryBulkEditOpenAtom);
  useEffect(() => {
    if (bulkEdit && selection.size < 2) endBulk(false);
  }, [bulkEdit, selection.size, endBulk]);

  if (bulkEdit && selection.size >= 2) return <LibraryBulkEditDrawer ids={selected} />;

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
      rowClassName={(id) => (selection.has(id) ? "" : "opacity-60")}
      onRemove={{ remove: (id) => deselect([id]), can: (id) => selection.has(id) }}
    />
  );
}
