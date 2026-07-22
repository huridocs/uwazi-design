import { useCallback, useState } from "react";
import { useAtom } from "jotai";
import { scopedReferencesAtom, toastsAtom } from "../../atoms/references";
import {
  searchQueryAtom,
  sortOrderAtom,
  activeClusterRefIdsAtom,
  filtersDrawerOpenAtom,
  activeFilterCountAtom,
  relTypeFiltersAtom,
  entityTypeFiltersAtom,
  relTargetCountryFiltersAtom,
  relTargetDescriptorFiltersAtom,
  relTargetDescriptorModeAtom,
  relInheritedFiltersAtom,
} from "../../atoms/filters";
import { SearchBar } from "./SearchBar";
import { DisplayMenu } from "./DisplayMenu";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { RelationshipsFilterDrawer } from "./RelationshipsFilterDrawer";
import { FiltersButton } from "../shared/FiltersButton";
import { FiltersDrawer } from "../shared/FiltersDrawer";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { RelationshipsPanelBody } from "./RelationshipsPanelBody";
import { ViewControls } from "./ViewControls";
import { RelationshipsActionBar } from "./RelationshipsActionBar";

/** Drawer-style connections section: toolbar + body + scoped filters drawer.
 *  Used wherever the unified Relationships panel needs to render inside a
 *  drawer (ReferencePanel sub-tab, MetadataView's relationships tab, etc.).
 *  `hideActionBar` drops the bottom RelationshipsActionBar for hosts that
 *  supply their own footer (the library preview's Close / View entity bar). */
export function RelationshipsDrawerSection({
  hideActionBar = false,
}: {
  hideActionBar?: boolean;
} = {}) {
  const [, setReferences] = useAtom(scopedReferencesAtom);
  const [, setToasts] = useAtom(toastsAtom);
  const [, setSearchQuery] = useAtom(searchQueryAtom);
  const [, setSortOrder] = useAtom(sortOrderAtom);
  const [, setActiveClusterRefIds] = useAtom(activeClusterRefIdsAtom);
  const [, setRelTypeFilters] = useAtom(relTypeFiltersAtom);
  const [, setEntityTypeFilters] = useAtom(entityTypeFiltersAtom);
  const [, setCountryFilters] = useAtom(relTargetCountryFiltersAtom);
  const [, setDescriptorFilters] = useAtom(relTargetDescriptorFiltersAtom);
  const [, setDescriptorMode] = useAtom(relTargetDescriptorModeAtom);
  const [, setInheritedFilters] = useAtom(relInheritedFiltersAtom);
  const [filtersOpen, setFiltersOpen] = useAtom(filtersDrawerOpenAtom);
  const [activeFilterCount] = useAtom(activeFilterCountAtom);
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
    setCountryFilters({});
    setDescriptorFilters({});
    setDescriptorMode("OR");
    setInheritedFilters({});
    setSearchQuery("");
    setSortOrder("appearance"); // the default, not "none" (which is a real choice)
    setActiveClusterRefIds(null);
  };

  return (
    <>
      {/* Same one-row toolbar as the main surface — search + view + Display +
          Filters. In a drawer the old second row was even worse: four dropdowns
          wrapping onto two or three lines of a 460px panel. */}
      <SearchBar
        inlineSlot={<ActiveFilterChips omitSearch />}
        rightSlot={
          // ONE flex child, so the controls wrap as a CLUSTER rather than one at
          // a time — a narrow pane was stranding Filters on its own line.
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
      <RelationshipsPanelBody onDelete={handleDelete} />
      {!hideActionBar && <RelationshipsActionBar compact />}

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
