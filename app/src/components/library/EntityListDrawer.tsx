import { useState, type ReactNode } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { X } from "lucide-react";
import { libraryQueryAtom } from "../../atoms/library";
import { openEntityAtom } from "../../atoms/focusedEntity";
import { getEntity, type Entity } from "../../data/entities";
import { EntityCard } from "./EntityCard";
import { SelectionOrderScope } from "./EntitySelectBox";

/** Rows mounted before "Show more" — the Library grid's step. A selection can
 *  be the whole corpus; mounting 4,398 cards to list it would be the grid's
 *  cost without the grid's cap. */
const STEP = 120;

/** A list of entities in the Library drawer — ONE body with two hosts: a map
 *  cluster (`LibraryClusterDrawer`) and the multi-selection
 *  (`LibrarySelectionDrawer`). Header (icon, title, "N entities", an optional
 *  action, the close X), then `EntityCard layout="list"` rows, each with its
 *  selection checkbox.
 *
 *  A narrow-tier gutter host like every Library drawer body: the header rule
 *  and the scroll lane are `bleed` bands and nothing inside carries side
 *  padding of its own (the cluster drawer's `px-4` / `p-3` are gone).
 *
 *  Clicking a row previews it (the host's `onSelect`, the grid's handler, so
 *  a Cmd/Ctrl or Shift click selects here too); closing the preview returns
 *  to this list. Shift ranges run over THIS list's order. */
export function EntityListDrawer({
  icon,
  title,
  count,
  ids,
  onClose,
  closeLabel,
  headerAction,
  onSelect,
  rowClassName,
}: {
  icon: ReactNode;
  title: string;
  /** The "N entities" figure, when it isn't `ids.length` (the selection drawer
   *  keeps unticked rows listed while it is open). */
  count?: number;
  ids: readonly string[];
  onClose: () => void;
  closeLabel: string;
  headerAction?: ReactNode;
  onSelect: (id: string, e?: React.MouseEvent) => void;
  /** Per-row class — the selection drawer dims a row that was unticked. */
  rowClassName?: (id: string) => string;
}) {
  // Read here and passed down: the cards don't subscribe (see `EntityCard`).
  // A drawer list is never on the keystroke path, so the committed query is fine.
  const query = useAtomValue(libraryQueryAtom);
  const openEntity = useSetAtom(openEntityAtom);
  const [visible, setVisible] = useState(STEP);
  const ents = ids
    .slice(0, visible)
    .map((id) => getEntity(id))
    .filter((e): e is Entity => !!e);
  const n = count ?? ids.length;

  return (
    <div data-gutter-host data-component="EntityListDrawer" className="gutter-host flex flex-col h-full min-h-0 bg-paper">
      <div
        data-part="header"
        className="bleed shrink-0 flex items-center gap-2 py-3"
        style={{ borderBottom: "1px solid var(--border-primary)" }}
      >
        <span className="text-ink-tertiary shrink-0 flex" aria-hidden>
          {icon}
        </span>
        <span className="text-sm font-semibold text-ink truncate">{title}</span>
        <span className="text-meta text-ink-tertiary tabular-nums shrink-0">
          {n.toLocaleString()} {n === 1 ? "entity" : "entities"}
        </span>
        <span className="ms-auto flex items-center gap-1 shrink-0">
          {headerAction}
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            data-gutter-align="box"
            className="p-1.5 rounded-md hover:bg-warm text-ink-muted hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </span>
      </div>

      <div data-part="rows" className="bleed flex-1 min-h-0 overflow-auto py-3">
        <SelectionOrderScope value={ids}>
          <ul className="flex flex-col gap-2">
            {ents.map((e) => (
              <EntityCard
                key={e.id}
                as="li"
                entity={e}
                layout="list"
                query={query}
                selected={false}
                onSelect={onSelect}
                onView={(id) => openEntity(id)}
                selectable
                className={rowClassName?.(e.id) ?? ""}
              />
            ))}
          </ul>
        </SelectionOrderScope>
        {ids.length > visible && (
          <div className="flex justify-center pt-3">
            <button
              type="button"
              onClick={() => setVisible((v) => v + STEP)}
              className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
            >
              Show more — {(ids.length - visible).toLocaleString()} remaining
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
