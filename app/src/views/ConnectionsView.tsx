import { useCallback, useState } from "react";
import { useAtom } from "jotai";
import { referencesAtom, toastsAtom } from "../atoms/references";
import { languageAtom, type Language } from "../atoms/language";
import {
  panelModeAtom,
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
import { SearchBar } from "../components/references/SearchBar";
import { ZoomControl } from "../components/references/ZoomControl";
import { ActiveFilterChips } from "../components/references/ActiveFilterChips";
import { RelationshipsFilterDrawer } from "../components/references/RelationshipsFilterDrawer";
import { EntityOverlay } from "../components/references/EntityOverlay";
import { FiltersButton } from "../components/shared/FiltersButton";
import { FiltersDrawer } from "../components/shared/FiltersDrawer";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { ConnectionsPanelBody } from "../components/connections/ConnectionsPanelBody";
import { PanelModeControls } from "../components/connections/PanelModeControls";

interface Props {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

/** Single main-tab surface that absorbs the old References and Relationships
 *  tabs. The panel-mode toggle inside picks the projection (list / grouped /
 *  tree / graph) over the same underlying references[]. */
export function ConnectionsView({ tabs, activeTab, onTabChange }: Props) {
  const [references, setReferences] = useAtom(referencesAtom);
  const [, setToasts] = useAtom(toastsAtom);
  const [language, setLanguage] = useAtom(languageAtom);
  const [mode] = useAtom(panelModeAtom);
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

  const clearAllFilters = () => {
    setRelTypeFilters({});
    setEntityTypeFilters({});
    setSearchQuery("");
    setSortOrder("none");
    setActiveClusterRefIds(null);
  };

  const showZoom =
    mode === "by-entity-type" ||
    mode === "by-relation-type" ||
    mode === "tree";
  const hideMinimap = mode === "graph";

  return (
    <AdaptiveSplitView
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
        {
          id: "connections",
          label: "Connections",
          count: references.length,
          content: <ConnectionsPanelBody onDelete={handleDelete} />,
        },
      ]}
      left={
        <div className="flex flex-col h-full min-h-0 bg-paper relative overflow-hidden">
          <MainTabs
            tabs={tabs}
            activeId={activeTab}
            onChange={onTabChange}
            languages={["EN", "ES", "FR", "AR"]}
            availableLanguages={["EN", "ES", "FR", "AR"]}
            activeLanguage={language}
            onLanguageChange={(lang) => setLanguage(lang as Language)}
          />
          <DocMeta showPdfSelector={false} />

          <div className="pt-2" />
          <SearchBar
            inlineSlot={<ActiveFilterChips />}
            rightSlot={
              <>
                <PanelModeControls />
                {showZoom && <ZoomControl />}
                <FiltersButton
                  activeCount={activeFilterCount}
                  onClick={() => setFiltersOpen(true)}
                  size="sm"
                />
              </>
            }
          />

          <ConnectionsPanelBody
            onDelete={handleDelete}
            scrollBgClass="bg-warm"
          />
        </div>
      }
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
  );
}
