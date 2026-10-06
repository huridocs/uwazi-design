import { useCallback, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { relFiltersDockCountAtom, relFiltersTabRequestAtom } from "../../atoms/filters";
import { breakpointAtom } from "../../atoms/viewport";
import { useActiveFilterCount, useClearRelFilters, useFiltersDrawerOpen, useRelScopeKey, useSetScopedReferences } from "../../hooks/useEntityScope";
import { SearchBar } from "./SearchBar";
import { RelationshipsDisplayMenu } from "./RelationshipsDisplayMenu";
import { ConnectButton } from "./ConnectToModal";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { ViewControls } from "./ViewControls";
import { RelationshipsFilterSlideOver } from "./RelationshipsFilterSlideOver";
import { FiltersButton } from "../shared/FiltersButton";
import { FiltersSlideOver } from "../shared/FiltersSlideOver";
import { FilterClearAll } from "../shared/FilterCard";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { toastsAtom } from "../../atoms/notifications";

/** The single-row toolbar over the connections panel: search carrying the
 *  active-filter chips, then the three things you steer with — WHICH projection
 *  (view), HOW it's arranged (Display: grouping, sort, density, folded away),
 *  and WHAT is in it (Filters).
 *
 *  The full-page surface and the drawer flavour rendered this row, the filters
 *  slide-over and the delete dialog as three copy-pasted blocks apiece — down to
 *  the same inline comments. They render this instead. The second row of
 *  half-a-dozen "Group by: None" dropdowns is gone into the Display popover —
 *  same idiom as the Library, and the row no longer reflows when you change
 *  view. */
export function RelationshipsToolbar() {
  const activeFilterCount = useActiveFilterCount();
  const [, setFiltersOpen] = useFiltersDrawerOpen();
  // The host scope's filters are a drawer tab wherever a drawer docks them;
  // a scoped surface (the slide-over, the Library preview) and phones open
  // the slide-over or the sheet.
  const scoped = useRelScopeKey() !== "";
  const dockCount = useAtomValue(relFiltersDockCountAtom);
  const mobile = useAtomValue(breakpointAtom) === "mobile";
  const docked = dockCount > 0 && !scoped && !mobile;
  const requestTab = useSetAtom(relFiltersTabRequestAtom);

  return (
    <SearchBar
      inlineSlot={<ActiveFilterChips omitSearch />}
      rightSlot={
        /* ONE flex child, so the controls wrap as a CLUSTER. As three siblings
           they wrapped one at a time, and a narrow pane got Filters stranded on
           a line of its own. */
        <div data-component="RelationshipsToolbar" className="flex items-center gap-2 shrink-0">
          <ViewControls />
          <RelationshipsDisplayMenu />
          <ConnectButton />
          <FiltersButton
            activeCount={activeFilterCount}
            onClick={() => (docked ? requestTab((n) => n + 1) : setFiltersOpen(true))}
          />
        </div>
      }
    />
  );
}

/** The facet slide-over and its Clear footer (the Library Filters footer). `width` is the
 *  main view's wider pane; the drawer flavour takes the default. */
export function RelationshipsFiltersPanel({ width }: { width?: number }) {
  const [filtersOpen, setFiltersOpen] = useFiltersDrawerOpen();
  const activeFilterCount = useActiveFilterCount();
  const clearAllFilters = useClearRelFilters();

  return (
    <FiltersSlideOver
      open={filtersOpen}
      onClose={() => setFiltersOpen(false)}
      width={width}
      footer={<FilterClearAll onClick={() => clearAllFilters()} disabled={activeFilterCount === 0} />}
    >
      <RelationshipsFilterSlideOver />
    </FiltersSlideOver>
  );
}

/** Single-row delete: the row's trash icon asks, this confirms, and the write
 *  goes through the scoped references so it lands on the entity in scope.
 *  (Bulk delete is the action bar's own path — see `RelationshipsActionBar`.) */
export function useReferenceDelete() {
  const setReferences = useSetScopedReferences();
  const setToasts = useSetAtom(toastsAtom);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleDelete = useCallback((id: string) => setDeleteTarget(id), []);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    setReferences((prev) => prev.filter((r) => r.id !== deleteTarget));
    setDeleteTarget(null);
    setToasts((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        message: "Relationship deleted",
        type: "success" as const,
      },
    ]);
  }, [deleteTarget, setReferences, setToasts]);

  const dialog = (
    <ConfirmDialog
      open={deleteTarget !== null}
      title="Delete relationship?"
      message="The relationship is removed from this entity. This can’t be undone."
      confirmLabel="Delete"
      variant="danger"
      onConfirm={confirmDelete}
      onCancel={() => setDeleteTarget(null)}
    />
  );

  return { handleDelete, dialog };
}
