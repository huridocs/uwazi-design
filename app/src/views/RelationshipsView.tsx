import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAtom } from "jotai";
import { scopedReferencesAtom, toastsAtom } from "../atoms/references";
import { languageAtom, type Language } from "../atoms/language";
import {
  viewAtom,
  groupByAtom,
  subGroupByAtom,
  searchQueryAtom,
  sortOrderAtom,
  activeClusterRefIdsAtom,
  filtersDrawerOpenAtom,
  activeFilterCountAtom,
  relTypeFiltersAtom,
  entityTypeFiltersAtom,
} from "../atoms/filters";
import { AdaptiveSplitView } from "../components/layout/AdaptiveSplitView";
import { DrawerTabs } from "../components/layout/DrawerTabs";
import { MainTabs } from "../components/layout/MainTabs";
import { DocMeta } from "../components/layout/DocMeta";
import { DocumentViewer } from "../components/viewer/DocumentViewer";
import { SearchBar } from "../components/relationships/SearchBar";
import { ZoomControl } from "../components/relationships/ZoomControl";
import { ActiveFilterChips } from "../components/relationships/ActiveFilterChips";
import { RelationshipsFilterDrawer } from "../components/relationships/RelationshipsFilterDrawer";
import { EntityOverlay } from "../components/relationships/EntityOverlay";
import { FiltersButton } from "../components/shared/FiltersButton";
import { FiltersDrawer } from "../components/shared/FiltersDrawer";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { RelationshipsPanelBody } from "../components/relationships/RelationshipsPanelBody";
import { ViewControls } from "../components/relationships/ViewControls";
import { GroupByControl } from "../components/relationships/GroupByControl";
import { SortControl } from "../components/relationships/SortControl";
import { RelationshipsActionBar } from "../components/relationships/RelationshipsActionBar";

interface Props {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onBack?: () => void;
}

/** Single main-tab surface that absorbs the old References and Relationships
 *  tabs. The panel-mode toggle inside picks the projection (list / grouped /
 *  tree / graph) over the same underlying references[]. */
export function RelationshipsView({ tabs, activeTab, onTabChange, onBack }: Props) {
  const [references, setReferences] = useAtom(scopedReferencesAtom);
  const [, setToasts] = useAtom(toastsAtom);
  const [language, setLanguage] = useAtom(languageAtom);
  const [view] = useAtom(viewAtom);
  const [groupBy] = useAtom(groupByAtom);
  const [subGroupBy, setSubGroupBy] = useAtom(subGroupByAtom);
  const [filtersOpen, setFiltersOpen] = useAtom(filtersDrawerOpenAtom);
  const [activeFilterCount] = useAtom(activeFilterCountAtom);
  const [, setSearchQuery] = useAtom(searchQueryAtom);
  const [, setSortOrder] = useAtom(sortOrderAtom);
  const [, setActiveClusterRefIds] = useAtom(activeClusterRefIdsAtom);
  const [, setRelTypeFilters] = useAtom(relTypeFiltersAtom);
  const [, setEntityTypeFilters] = useAtom(entityTypeFiltersAtom);
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

  // Snap secondary back to "none" when primary collides with it — otherwise
  // the dropdown could render a stale value that's no longer in the option list.
  useEffect(() => {
    if (groupBy !== "none" && subGroupBy === groupBy) setSubGroupBy("none");
  }, [groupBy, subGroupBy, setSubGroupBy]);

  const clearAllFilters = () => {
    setRelTypeFilters({});
    setEntityTypeFilters({});
    setSearchQuery("");
    setSortOrder("none");
    setActiveClusterRefIds(null);
  };

  const showZoom = view !== "graph";
  const hideMinimap = view === "graph";

  const renderLeft = (menuTrigger?: ReactNode) => (
        <div className="flex flex-col h-full min-h-0 bg-paper relative overflow-hidden">
          <MainTabs
            tabs={tabs}
            activeId={activeTab}
            onChange={onTabChange}
            onBack={onBack}
            languages={["EN", "ES", "FR", "AR"]}
            availableLanguages={["EN", "ES", "FR", "AR"]}
            activeLanguage={language}
            onLanguageChange={(lang) => setLanguage(lang as Language)}
          />
          <DocMeta showPdfSelector={false} />

          <div className="pt-2" />
          <SearchBar inlineSlot={<ActiveFilterChips />} />
          {/* Mobile: one row — refinement controls scroll horizontally,
              Zoom + Filters stay pinned. Desktop (md+): wrap + space-between. */}
          <div className="px-3 pb-2 flex items-center justify-between gap-2 flex-nowrap md:flex-wrap">
            <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto no-scrollbar [&>*]:shrink-0 md:flex-none md:flex-wrap md:overflow-visible">
              <ViewControls size="sm" />
              <GroupByControl
                axis="primary"
                size="sm"
                excludeOption={subGroupBy === "none" ? undefined : subGroupBy}
              />
              <GroupByControl
                axis="secondary"
                size="sm"
                disabled={view === "graph" || groupBy === "none"}
                excludeOption={groupBy === "none" ? undefined : groupBy}
              />
              <SortControl size="sm" />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <ZoomControl size="sm" disabled={!showZoom} />
              <FiltersButton
                activeCount={activeFilterCount}
                onClick={() => setFiltersOpen(true)}
                size="sm"
              />
            </div>
          </div>

          <RelationshipsPanelBody
            onDelete={handleDelete}
            scrollBgClass="bg-warm"
          />
          <RelationshipsActionBar menuSlot={menuTrigger} />
        </div>
  );

  return (
    <>
    <AdaptiveSplitView
      // On mobile the relationships panel (`left`) is already the full-screen
      // view, so we only surface the Document in a bottom sheet — a
      // "Relationships" section here would just duplicate what's behind it.
      mobileSections={[
        {
          id: "document",
          label: "Document",
          content: (
            <div className="flex flex-col h-full min-h-0 relative overflow-hidden">
              <EntityOverlay />
              <DocumentViewer />
            </div>
          ),
        },
      ]}
      left={renderLeft()}
      mobileLeft={(menuTrigger) => renderLeft(menuTrigger)}
      right={
        <div className="flex flex-col h-full min-h-0 relative overflow-hidden">
          <EntityOverlay />
          <DrawerTabs
            tabs={[{ id: "document", label: "Document" }]}
            activeId="document"
            onChange={() => {}}
          />
          <FiltersDrawer
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            width={720}
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
          <DocumentViewer showMinimap={!hideMinimap} />
          <ConfirmDialog
            open={deleteTarget !== null}
            title="Delete Reference"
            message="Are you sure you want to delete this reference? This action cannot be undone."
            confirmLabel="Delete"
            variant="danger"
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        </div>
      }
      defaultRightWidth={560}
      minRightWidth={460}
      maxRightWidth={720}
    />
    </>
  );
}
