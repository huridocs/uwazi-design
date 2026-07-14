import { useCallback, useState, type ReactNode } from "react";
import { useAtom } from "jotai";
import { scopedReferencesAtom, toastsAtom } from "../atoms/references";
import { languageAtom, type Language } from "../atoms/language";
import { focusedEntityIdAtom } from "../atoms/focusedEntity";
import { getEntityProfile } from "../data/entityProfiles";
import { MOCK_DOCUMENT_FILE } from "../data/files";
import {
  viewAtom,
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
} from "../atoms/filters";
import { AdaptiveSplitView } from "../components/layout/AdaptiveSplitView";
import { DrawerTabs } from "../components/layout/DrawerTabs";
import { MainTabs } from "../components/layout/MainTabs";
import { DocMeta } from "../components/layout/DocMeta";
import { DocumentViewer } from "../components/viewer/DocumentViewer";
import { SearchBar } from "../components/relationships/SearchBar";
import { DisplayMenu } from "../components/relationships/DisplayMenu";
import { ActiveFilterChips } from "../components/relationships/ActiveFilterChips";
import { RelationshipsFilterDrawer } from "../components/relationships/RelationshipsFilterDrawer";
import { EntityOverlay } from "../components/relationships/EntityOverlay";
import { FiltersButton } from "../components/shared/FiltersButton";
import { FiltersDrawer } from "../components/shared/FiltersDrawer";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { RelationshipsPanelBody } from "../components/relationships/RelationshipsPanelBody";
import { ViewControls } from "../components/relationships/ViewControls";
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
  const [focusedId] = useAtom(focusedEntityIdAtom);
  const profile = getEntityProfile(focusedId);
  const [, setToasts] = useAtom(toastsAtom);
  const [language, setLanguage] = useAtom(languageAtom);
  const [view] = useAtom(viewAtom);
  const [filtersOpen, setFiltersOpen] = useAtom(filtersDrawerOpenAtom);
  const [activeFilterCount] = useAtom(activeFilterCountAtom);
  const [, setSearchQuery] = useAtom(searchQueryAtom);
  const [, setSortOrder] = useAtom(sortOrderAtom);
  const [, setActiveClusterRefIds] = useAtom(activeClusterRefIdsAtom);
  const [, setRelTypeFilters] = useAtom(relTypeFiltersAtom);
  const [, setEntityTypeFilters] = useAtom(entityTypeFiltersAtom);
  const [, setCountryFilters] = useAtom(relTargetCountryFiltersAtom);
  const [, setDescriptorFilters] = useAtom(relTargetDescriptorFiltersAtom);
  const [, setDescriptorMode] = useAtom(relTargetDescriptorModeAtom);
  const [, setInheritedFilters] = useAtom(relInheritedFiltersAtom);
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
          {/* ONE row. Search carries the active-filter chips; beside it the three
              things you actually steer with: WHICH projection (view), HOW it's
              arranged (Display — grouping, sort, density, folded away), and WHAT
              is in it (Filters). The second row of half-a-dozen "Group by: None"
              dropdowns is gone into the Display popover — same idiom as the
              Library, and the row no longer reflows when you change view. */}
          <SearchBar
            inlineSlot={<ActiveFilterChips />}
            rightSlot={
              // ONE flex child, so the controls wrap as a CLUSTER. As three
              // siblings they wrapped one at a time, and a phone got Filters
              // stranded on a line of its own.
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
          {/* The document projection only makes sense for document-bearing
              entities — otherwise the viewer falls back to the sample PDF. */}
          {profile.hasDocument && (
            <DrawerTabs
              tabs={[{ id: "document", label: "Document" }]}
              activeId="document"
              onChange={() => {}}
            />
          )}
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
          {profile.hasDocument ? (
            <DocumentViewer showMinimap={!hideMinimap} />
          ) : (
            /* No bundled document — show the shared placeholder PDF rather than a
               bare empty state (the real doc isn't shipped in this sample). */
            <DocumentViewer fileOverride={MOCK_DOCUMENT_FILE} showMinimap={false} />
          )}
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
