import { useCallback, type ReactNode } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { FileDown, X } from "lucide-react";
import {
  clearSelectionAtom,
  librarySelectedEntityIdAtom,
  librarySelectionAtom,
  librarySelectionDrawerOpenAtom,
  selectIdsAtom,
} from "../../atoms/library";
import { dataSourceAtom } from "../../atoms/dataSource";
import { languageAtom } from "../../atoms/language";
import { getEntity, type Entity } from "../../data/entities";
import { downloadCsv, exportEntitiesCsv } from "../../utils/exportCsv";
import { useNotify } from "../../hooks/useNotify";
import { BAR_GHOST } from "../shared/warmButton";
import { SelectAllBox } from "./SelectAllBox";

/** Export the selection as a CSV download — in `order` (the results', or the
 *  selection drawer's), then any selected ids that order doesn't hold. The one
 *  bulk action `main` runs: the others (edit, change template, share,
 *  permissions, delete) write through `playground`'s entity edit layer. */
export function useExportSelection(order: readonly string[]) {
  const store = useStore();
  const notify = useNotify();
  return useCallback(async () => {
    const selection = store.get(librarySelectionAtom);
    const ordered = order.filter((id) => selection.has(id));
    const shown = new Set(ordered);
    for (const id of selection) if (!shown.has(id)) ordered.push(id);
    const entities = ordered.map((id) => getEntity(id)).filter((e): e is Entity => !!e);
    const result = await exportEntitiesCsv(entities, store.get(languageAtom));
    if (!result) return;
    const filename = `uwazi-${store.get(dataSourceAtom)}-selection-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(result.csv, filename);
    notify(
      `CSV exported — ${result.rows.toLocaleString()} ${result.rows === 1 ? "row" : "rows"}.`,
      "success",
    );
  }, [order, store, notify]);
}

/** The Library footer's SELECTED state — swapped in place of the baseline
 *  actions, in the same bar at the same height.
 *
 *  The work on the selection first, at the bar's start where the idle bar
 *  keeps its own actions; then the active-filters readout; then the selection
 *  itself at the bar's logical END: the select-all box (only at 2 or more),
 *  the count with its one offer under it, and Clear.
 *
 *  This component subscribes to the selection; the view around it does not. */
export function LibrarySelectionBar({
  filteredIds,
  loadedIds,
  filtersSlot,
}: {
  /** Every id the current results hold (filters, query, match types). */
  filteredIds: readonly string[];
  /** The ids the visible view draws ("Show more" has loaded). */
  loadedIds: readonly string[];
  /** The active-filters readout, placed after the actions. */
  filtersSlot?: ReactNode;
}) {
  const selection = useAtomValue(librarySelectionAtom);
  const clear = useSetAtom(clearSelectionAtom);
  const selectIds = useSetAtom(selectIdsAtom);
  const openDrawer = useSetAtom(librarySelectionDrawerOpenAtom);
  const setPreview = useSetAtom(librarySelectedEntityIdAtom);
  const exportSelection = useExportSelection(filteredIds);

  const n = selection.size;
  // Selected but not DRAWN — filtered out, or past what "Show more" has
  // loaded. This is where that is said, not left silent.
  const drawn = new Set(loadedIds);
  let notShown = 0;
  for (const id of selection) if (!drawn.has(id)) notShown++;
  const allLoaded = loadedIds.length > 0 && loadedIds.every((id) => selection.has(id));
  const moreToSelect =
    allLoaded && filteredIds.length > loadedIds.length && filteredIds.some((id) => !selection.has(id));

  const showList = () => {
    setPreview(null);
    openDrawer(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void exportSelection()}
        className={`hidden sm:flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer`}
      >
        <FileDown size={13} className="text-ink-tertiary" aria-hidden />
        Export CSV
      </button>
      {filtersSlot}
      {/* The box is there only for a MULTIPLE selection; below two it keeps
          its slot `invisible` (out of the tab order and the accessibility
          tree), so the count doesn't move when the second item joins. The
          count and its offer share a FIXED slot: the count sits on the bar's
          midline, the offer hangs under it out of flow. */}
      <span data-part="selection-end" className="hidden sm:flex ms-auto shrink-0 items-center gap-1">
        <span className={`inline-flex shrink-0 me-2 ${n >= 2 ? "" : "invisible"}`}>
          <SelectAllBox loadedIds={loadedIds} />
        </span>
        <span className="relative shrink-0 w-[7.5rem] flex items-center text-xs tabular-nums leading-tight">
          <span role="status" aria-live="polite" className="flex min-w-0">
            <button
              type="button"
              onClick={showList}
              className="font-semibold text-ink hover:underline cursor-pointer rounded-sm truncate
                focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
            >
              {n.toLocaleString()} selected
            </button>
          </span>
          <span aria-live="polite" className="flex absolute start-0 top-full -mt-0.5 text-meta leading-none">
            {moreToSelect ? (
              <button
                type="button"
                onClick={() => selectIds(filteredIds)}
                className="text-carbon hover:underline cursor-pointer rounded-sm whitespace-nowrap
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
              >
                Select all {filteredIds.length.toLocaleString()}
              </button>
            ) : notShown > 0 ? (
              <button
                type="button"
                onClick={showList}
                className="text-carbon hover:underline cursor-pointer rounded-sm whitespace-nowrap
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
              >
                {notShown.toLocaleString()} not shown
              </button>
            ) : null}
          </span>
        </span>
        <button
          type="button"
          onClick={() => clear()}
          data-gutter-align="box"
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer`}
        >
          <X size={13} className="text-ink-tertiary" aria-hidden />
          Clear
        </button>
      </span>
      {/* Phone: the count and Clear (the drawer and the export need a wider
          screen). */}
      <span role="status" aria-live="polite" className="sm:hidden shrink-0 me-auto text-xs font-semibold text-ink tabular-nums">
        {n.toLocaleString()} selected
      </span>
      <button
        type="button"
        onClick={() => clear()}
        className={`sm:hidden shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md cursor-pointer`}
      >
        <X size={13} className="text-ink-tertiary" aria-hidden /> Clear
      </button>
    </>
  );
}
