import { useCallback, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { toastsAtom } from "../../atoms/references";
import {
  activeFilterCountAtom,
  clearRelFiltersAtom,
} from "../../atoms/filters";
import { useFiltersDrawerOpen, useSetScopedReferences } from "../../hooks/useEntityScope";
import { SearchBar } from "./SearchBar";
import { DisplayMenu } from "./DisplayMenu";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { ViewControls } from "./ViewControls";
import { RelationshipsFilterDrawer } from "./RelationshipsFilterDrawer";
import { FiltersButton } from "../shared/FiltersButton";
import { FiltersDrawer } from "../shared/FiltersDrawer";
import { ConfirmDialog } from "../shared/ConfirmDialog";

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
  const activeFilterCount = useAtomValue(activeFilterCountAtom);
  const [, setFiltersOpen] = useFiltersDrawerOpen();

  return (
    <SearchBar
      inlineSlot={<ActiveFilterChips omitSearch />}
      rightSlot={
        /* ONE flex child, so the controls wrap as a CLUSTER. As three siblings
           they wrapped one at a time, and a narrow pane got Filters stranded on
           a line of its own. */
        <div className="flex items-center gap-2 shrink-0">
          <ViewControls />
          <DisplayMenu />
          <FiltersButton
            activeCount={activeFilterCount}
            onClick={() => setFiltersOpen(true)}
          />
        </div>
      }
    />
  );
}

/** The facet slide-over and its "Clear all filters" footer. `width` is the
 *  main view's wider pane; the drawer flavour takes the default. */
export function RelationshipsFiltersPanel({ width }: { width?: number }) {
  const [filtersOpen, setFiltersOpen] = useFiltersDrawerOpen();
  const activeFilterCount = useAtomValue(activeFilterCountAtom);
  const clearAllFilters = useSetAtom(clearRelFiltersAtom);

  return (
    <FiltersDrawer
      open={filtersOpen}
      onClose={() => setFiltersOpen(false)}
      width={width}
      footer={
        activeFilterCount > 0 ? (
          <button
            onClick={() => clearAllFilters()}
            className="text-meta font-medium text-ink-secondary hover:text-ink transition-colors cursor-pointer"
          >
            Clear all filters
          </button>
        ) : null
      }
    >
      <RelationshipsFilterDrawer />
    </FiltersDrawer>
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
        message: "Reference deleted",
        type: "success" as const,
      },
    ]);
  }, [deleteTarget, setReferences, setToasts]);

  const dialog = (
    <ConfirmDialog
      open={deleteTarget !== null}
      title="Delete Reference"
      message="Are you sure you want to delete this reference? This action cannot be undone."
      confirmLabel="Delete"
      variant="danger"
      onConfirm={confirmDelete}
      onCancel={() => setDeleteTarget(null)}
    />
  );

  return { handleDelete, dialog };
}
