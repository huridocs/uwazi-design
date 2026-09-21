import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { CheckSquare } from "lucide-react";
import { librarySelectionAtom, librarySelectionDrawerOpenAtom } from "../../atoms/library";
import { EntityListDrawer } from "./EntityListDrawer";

/** The multi-selection, listed in the Library drawer by the same body a map
 *  cluster uses (`EntityListDrawer`).
 *
 *  Unticking a row removes it from the selection, but the row STAYS where it
 *  is, dimmed, until the drawer is left — nothing moves under the pointer, and
 *  a mis-click can be ticked again. The header count is the live selection.
 *  Rows ticked elsewhere while the list is open join its end.
 *
 *  The X closes the list without clearing the selection (Clear, in the
 *  footer, is the one clear); the footer's "N selected" reopens it. */
export function LibrarySelectionDrawer({ onSelect }: { onSelect: (id: string, e?: React.MouseEvent) => void }) {
  const selection = useAtomValue(librarySelectionAtom);
  const setOpen = useSetAtom(librarySelectionDrawerOpenAtom);
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

  return (
    <EntityListDrawer
      icon={<CheckSquare size={15} />}
      title="Selection"
      count={selection.size}
      ids={ids}
      onClose={() => setOpen(false)}
      closeLabel="Close selection list"
      onSelect={onSelect}
      rowClassName={(id) => (selection.has(id) ? "" : "opacity-60")}
    />
  );
}
