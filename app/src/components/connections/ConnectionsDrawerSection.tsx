import { useCallback, useState } from "react";
import { useAtom } from "jotai";
import { referencesAtom, toastsAtom } from "../../atoms/references";
import {
  viewAtom,
  groupByAtom,
  searchQueryAtom,
  sortOrderAtom,
  activeClusterRefIdsAtom,
  filtersDrawerOpenAtom,
  activeFilterCountAtom,
  relTypeFiltersAtom,
  entityTypeFiltersAtom,
} from "../../atoms/filters";
import { SearchBar } from "../references/SearchBar";
import { ZoomControl } from "../references/ZoomControl";
import { ActiveFilterChips } from "../references/ActiveFilterChips";
import { RelationshipsFilterDrawer } from "../references/RelationshipsFilterDrawer";
import { FiltersButton } from "../shared/FiltersButton";
import { FiltersDrawer } from "../shared/FiltersDrawer";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { ConnectionsPanelBody } from "./ConnectionsPanelBody";
import { ViewControls } from "./ViewControls";
import { GroupByControl } from "./GroupByControl";
import { SortControl } from "./SortControl";

/** Drawer-style connections section: toolbar + body + scoped filters drawer.
 *  Used wherever the unified Relationships panel needs to render inside a
 *  drawer (ReferencePanel sub-tab, MetadataView's relationships tab, etc.). */
export function ConnectionsDrawerSection() {
  const [, setReferences] = useAtom(referencesAtom);
  const [, setToasts] = useAtom(toastsAtom);
  const [, setSearchQuery] = useAtom(searchQueryAtom);
  const [, setSortOrder] = useAtom(sortOrderAtom);
  const [, setActiveClusterRefIds] = useAtom(activeClusterRefIdsAtom);
  const [, setRelTypeFilters] = useAtom(relTypeFiltersAtom);
  const [, setEntityTypeFilters] = useAtom(entityTypeFiltersAtom);
  const [filtersOpen, setFiltersOpen] = useAtom(filtersDrawerOpenAtom);
  const [activeFilterCount] = useAtom(activeFilterCountAtom);
  const [view] = useAtom(viewAtom);
  const [groupBy] = useAtom(groupByAtom);
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

  const clearAllFilters = () => {
    setRelTypeFilters({});
    setEntityTypeFilters({});
    setSearchQuery("");
    setSortOrder("none");
    setActiveClusterRefIds(null);
  };

  const showZoom = view === "tree" || (view === "list" && groupBy !== "none");

  return (
    <>
      <SearchBar inlineSlot={<ActiveFilterChips />} />
      <div className="px-3 pb-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <ViewControls size="sm" />
          <GroupByControl size="sm" disabled={view !== "list"} />
          <SortControl size="sm" />
        </div>
        <div className="flex items-center gap-1.5">
          <ZoomControl disabled={!showZoom} />
          <FiltersButton
            activeCount={activeFilterCount}
            onClick={() => setFiltersOpen(true)}
            size="sm"
          />
        </div>
      </div>
      <ConnectionsPanelBody onDelete={handleDelete} />

      <FiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        footer={
          activeFilterCount > 0 ? (
            <button
              onClick={clearAllFilters}
              className="text-[11px] font-medium text-ink-secondary hover:text-ink transition-colors cursor-pointer"
            >
              Clear all filters
            </button>
          ) : null
        }
      >
        <RelationshipsFilterDrawer />
      </FiltersDrawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Reference"
        message="Are you sure you want to delete this reference? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
