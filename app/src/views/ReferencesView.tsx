import { useState, useMemo, useCallback, useEffect, type ReactNode } from "react";
import { useAtom } from "jotai";
import { referencesAtom, toastsAtom } from "../atoms/references";
import { languageAtom, type Language } from "../atoms/language";
import {
  viewModeAtom,
  searchQueryAtom,
  sortOrderAtom,
  expandAllSignalAtom,
  collapseAllSignalAtom,
  activeClusterRefIdsAtom,
  filtersDrawerOpenAtom,
  relationshipsActiveFilterCountAtom,
  referencesActiveFilterCountAtom,
  relationshipTypeFiltersAtom,
  relationshipEntityTypeFiltersAtom,
  relationshipsViewModeAtom,
} from "../atoms/filters";
import { ListInfoRow } from "../components/shared/ListInfoRow";
import { ActiveFilterChips } from "../components/references/ActiveFilterChips";
import { getEntity, getEntityType } from "../data/entities";
import { Reference, relationTypes } from "../data/references";
import { currentDocument } from "../data/document";
import { AdaptiveSplitView } from "../components/layout/AdaptiveSplitView";
import { DrawerTabs } from "../components/layout/DrawerTabs";
import { MainTabs } from "../components/layout/MainTabs";
import { DocMeta } from "../components/layout/DocMeta";
import { DocumentViewer } from "../components/viewer/DocumentViewer";
import { ReferencePanel } from "../components/references/ReferencePanel";
import { MetadataDrawerContent } from "../components/references/MetadataDrawerContent";
import { TocDrawerContent } from "../components/references/TocDrawerContent";
import { SearchBar } from "../components/references/SearchBar";
import { ViewModeControls, CollapseControls } from "../components/references/FiltersRow";
import { GroupedCard } from "../components/references/GroupedCard";
import { DensityCard } from "../components/references/DensityCard";
import { RefRow } from "../components/references/RefRow";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { EntityPickerModal } from "./EntityPickerModal";
import { ToastContainer } from "./ToastContainer";
import { FilesView } from "./FilesView";
import { MetadataView } from "./MetadataView";
import { Link2 } from "lucide-react";
import { EntityOverlay } from "../components/references/EntityOverlay";
import { RelationshipsTreeView } from "../components/references/RelationshipsTreeView";
import { RelationshipsFilterDrawer } from "../components/references/RelationshipsFilterDrawer";
import { RelationshipsGraphView } from "../components/references/RelationshipsGraphView";
import { ZoomControl } from "../components/references/ZoomControl";
import { FiltersButton } from "../components/shared/FiltersButton";
import { FiltersDrawer } from "../components/shared/FiltersDrawer";
import { deriveRelationships } from "../utils/relationships";

const mainTabs = [
  { id: "metadata", label: "Metadata" },
  { id: "document", label: "Document" },
  { id: "references", label: "References", count: 12 },
  { id: "relationships", label: "Relationships", count: 14 },
  { id: "files", label: "Files", count: 6 },
];

export function ReferencesView() {
  const [activeTab, setActiveTab] = useState("document");
  const [references] = useAtom(referencesAtom);
  const [language, setLanguage] = useAtom(languageAtom);

  const tabs = mainTabs.map((t) => {
    if (t.id === "references") return { ...t, count: references.length };
    if (t.id === "relationships") return { ...t, count: deriveRelationships(references).length };
    return t;
  });

  if (activeTab === "metadata") {
    return (
      <>
        <MetadataView tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <ToastContainer />
      </>
    );
  }

  if (activeTab === "files") {
    return (
      <>
        <FilesView tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <ToastContainer />
      </>
    );
  }

  if (activeTab === "references") {
    return (
      <>
        <ReferencesMainView tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <EntityPickerModal />
        <ToastContainer />
      </>
    );
  }

  if (activeTab === "relationships") {
    return (
      <>
        <RelationshipsMainView tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <EntityPickerModal />
        <ToastContainer />
      </>
    );
  }

  const renderLeft = (menuTrigger?: ReactNode) => (
    <div className="flex flex-col h-full min-h-0 bg-paper">
      <MainTabs
        tabs={tabs}
        activeId={activeTab}
        onChange={setActiveTab}
        languages={["EN", "ES", "FR", "AR"]}
        availableLanguages={["EN", "ES", "FR", "AR"]}
        activeLanguage={language}
        onLanguageChange={(lang) => setLanguage(lang as Language)}
      />
      <DocMeta />
      <DocumentViewer actionBarLeft={menuTrigger} />
    </div>
  );

  return (
    <>
      <AdaptiveSplitView
        left={renderLeft()}
        mobileLeft={(menuTrigger) => renderLeft(menuTrigger)}
        right={<ReferencePanel />}
        defaultRightWidth={560}
        minRightWidth={460}
        maxRightWidth={720}
        mobileSections={[
          {
            id: "references",
            label: "References",
            count: references.length,
            content: <ReferencePanel />,
          },
          {
            id: "metadata",
            label: "Metadata",
            content: <MetadataDrawerContent />,
          },
          {
            id: "toc",
            label: "Table of contents",
            content: <TocDrawerContent />,
          },
        ]}
      />
      <EntityPickerModal />
      <ToastContainer />
    </>
  );
}

/* ── Relationships Main View ── */

interface RelationshipsMainViewProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

function RelationshipsMainView({ tabs, activeTab, onTabChange }: RelationshipsMainViewProps) {
  const [language, setLanguage] = useAtom(languageAtom);
  const [filtersOpen, setFiltersOpen] = useAtom(filtersDrawerOpenAtom);
  const [activeFilterCount] = useAtom(relationshipsActiveFilterCountAtom);
  const [viewMode, setViewMode] = useAtom(relationshipsViewModeAtom);
  const [, setRelTypeFilters] = useAtom(relationshipTypeFiltersAtom);
  const [, setEntityTypeFilters] = useAtom(relationshipEntityTypeFiltersAtom);
  const [, setSearchQuery] = useAtom(searchQueryAtom);
  const [, setSortOrder] = useAtom(sortOrderAtom);
  const [, setActiveClusterRefIds] = useAtom(activeClusterRefIdsAtom);

  // Entering the Relationships tab always starts in tree view; the Graph is
  // an opt-in escape hatch, not the default.
  useEffect(() => {
    setViewMode("tree");
  }, [setViewMode]);

  const clearAllFilters = () => {
    setRelTypeFilters({});
    setEntityTypeFilters({});
    setSearchQuery("");
    setSortOrder("none");
    setActiveClusterRefIds(null);
  };

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
                <FiltersButton
                  activeCount={activeFilterCount}
                  onClick={() => setFiltersOpen(true)}
                  size="sm"
                />
                <ZoomControl />
              </>
            }
          />

          {viewMode === "graph" ? (
            <div className="flex-1 flex flex-col min-h-0">
              <RelationshipsGraphView />
            </div>
          ) : (
            <RelationshipsTreeView />
          )}
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
          <DocumentViewer showMinimap={false} />
        </div>
      }
      defaultRightWidth={560}
      minRightWidth={460}
      maxRightWidth={720}
    />
  );
}

/* ── References Main View ── */

interface ReferencesMainViewProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

function ReferencesMainView({ tabs, activeTab, onTabChange }: ReferencesMainViewProps) {
  const [references, setReferences] = useAtom(referencesAtom);
  const [, setToasts] = useAtom(toastsAtom);
  const [language, setLanguage] = useAtom(languageAtom);
  const [viewMode] = useAtom(viewModeAtom);
  const [searchQuery] = useAtom(searchQueryAtom);
  const [sortOrder] = useAtom(sortOrderAtom);
  const [, setExpandSignal] = useAtom(expandAllSignalAtom);
  const [, setCollapseSignal] = useAtom(collapseAllSignalAtom);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [activeClusterRefIds, setActiveClusterRefIds] = useAtom(activeClusterRefIdsAtom);
  const [filtersOpen, setFiltersOpen] = useAtom(filtersDrawerOpenAtom);
  const [activeFilterCount] = useAtom(referencesActiveFilterCountAtom);
  const [relTypeFilters, setRelTypeFilters] = useAtom(relationshipTypeFiltersAtom);
  const [entityTypeFilters, setEntityTypeFilters] = useAtom(relationshipEntityTypeFiltersAtom);
  const [, setSearchQuery] = useAtom(searchQueryAtom);
  const [, setSortOrder] = useAtom(sortOrderAtom);

  const clearAllFilters = () => {
    setRelTypeFilters({});
    setEntityTypeFilters({});
    setSearchQuery("");
    setSortOrder("none");
    setActiveClusterRefIds(null);
  };

  const filtered = useMemo(() => {
    let result = references;
    if (activeClusterRefIds) {
      result = result.filter((ref) => activeClusterRefIds.includes(ref.id));
    }
    const activeRelTypes = Object.entries(relTypeFilters).filter(([, v]) => v).map(([k]) => k);
    if (activeRelTypes.length > 0) {
      const set = new Set(activeRelTypes);
      result = result.filter((r) => set.has(r.relationType));
    }
    const activeEntityTypes = Object.entries(entityTypeFilters).filter(([, v]) => v).map(([k]) => k);
    if (activeEntityTypes.length > 0) {
      const set = new Set(activeEntityTypes);
      result = result.filter((r) => {
        const entity = getEntity(r.targetEntityId);
        return entity ? set.has(entity.typeId) : false;
      });
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((ref) => {
        const entity = getEntity(ref.targetEntityId);
        return (
          ref.sourceSelection.text.toLowerCase().includes(q) ||
          entity?.title.toLowerCase().includes(q) ||
          ref.relationType.toLowerCase().includes(q)
        );
      });
    }
    if (sortOrder === "none") {
      // Default: order by appearance in document (page, then top position)
      return [...result].sort((a, b) => {
        const pageDiff = a.sourceSelection.page - b.sourceSelection.page;
        if (pageDiff !== 0) return pageDiff;
        return a.sourceSelection.top - b.sourceSelection.top;
      });
    }
    const dir = sortOrder === "asc" ? 1 : -1;
    return [...result].sort((a, b) => {
      const nameA = getEntity(a.targetEntityId)?.title ?? "";
      const nameB = getEntity(b.targetEntityId)?.title ?? "";
      return nameA.localeCompare(nameB) * dir;
    });
  }, [references, searchQuery, sortOrder, activeClusterRefIds, relTypeFilters, entityTypeFilters]);

  const handleDelete = useCallback((id: string) => {
    setDeleteTarget(id);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    setReferences((prev) => prev.filter((r) => r.id !== deleteTarget));
    setDeleteTarget(null);
    setToasts((prev) => [
      ...prev,
      { id: Date.now().toString(), message: "Reference deleted", type: "success" as const },
    ]);
  }, [deleteTarget, setReferences, setToasts]);

  const groupedByEntityType = useMemo(() => {
    const groups = new Map<string, Reference[]>();
    filtered.forEach((ref) => {
      const entity = getEntity(ref.targetEntityId);
      const typeId = entity?.typeId ?? "unknown";
      const group = groups.get(typeId) ?? [];
      group.push(ref);
      groups.set(typeId, group);
    });
    if (sortOrder === "none") return groups;
    const dir = sortOrder === "asc" ? 1 : -1;
    return new Map(
      [...groups.entries()].sort(([a], [b]) => {
        const nameA = getEntityType(a)?.name ?? a;
        const nameB = getEntityType(b)?.name ?? b;
        return nameA.localeCompare(nameB) * dir;
      })
    );
  }, [filtered, sortOrder]);

  const groupedByRelType = useMemo(() => {
    const groups = new Map<string, Reference[]>();
    filtered.forEach((ref) => {
      const group = groups.get(ref.relationType) ?? [];
      group.push(ref);
      groups.set(ref.relationType, group);
    });
    if (sortOrder === "none") return groups;
    const dir = sortOrder === "asc" ? 1 : -1;
    return new Map(
      [...groups.entries()].sort(([a], [b]) => {
        const labelA = relationTypes.find((r) => r.id === a)?.label ?? a;
        const labelB = relationTypes.find((r) => r.id === b)?.label ?? b;
        return labelA.localeCompare(labelB) * dir;
      })
    );
  }, [filtered, sortOrder]);

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
      ]}
      left={
        <div className="flex flex-col h-full min-h-0 bg-paper">
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
                <ViewModeControls />
                <FiltersButton
                  activeCount={activeFilterCount}
                  onClick={() => setFiltersOpen(true)}
                  size="sm"
                />
              </>
            }
          />
          <ListInfoRow
            count={
              <>
                <span className="font-semibold text-ink-secondary tabular-nums">
                  {filtered.length}
                </span>{" "}
                references
              </>
            }
            activeFilterCount={activeFilterCount}
            showFilterChips={false}
            rightSlot={
              <CollapseControls
                disabled={viewMode === "all" || viewMode === "density"}
                onExpandAll={() => setExpandSignal((s) => s + 1)}
                onCollapseAll={() => setCollapseSignal((s) => s + 1)}
              />
            }
          />

          <div className="flex-1 overflow-auto pb-8 bg-warm relative">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Link2 size={36} className="text-ink-tertiary/40 mb-3" />
                <p className="text-sm text-ink-tertiary">No references found</p>
                <p className="text-xs text-ink-tertiary mt-1">
                  Select text in the document to create one
                </p>
              </div>
            ) : viewMode === "all" ? (
              <div className="px-3 py-3">
                <div className="border border-border/60 rounded-md overflow-hidden bg-paper">
                  {filtered.map((ref) => (
                    <RefRow key={ref.id} reference={ref} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            ) : viewMode === "by-entity-type" ? (
              <div className="px-3 py-3 space-y-1.5">
                {Array.from(groupedByEntityType.entries()).map(([typeId, refs]) => {
                  const type = getEntityType(typeId);
                  return (
                    <GroupedCard
                      key={typeId}
                      title={type?.name ?? typeId}
                      color={type?.color}
                      references={refs}
                      onDeleteRef={handleDelete}
                    />
                  );
                })}
              </div>
            ) : viewMode === "by-relation-type" ? (
              <div className="px-3 py-3 space-y-1.5">
                {Array.from(groupedByRelType.entries()).map(([relType, refs]) => {
                  const label =
                    relationTypes.find((r) => r.id === relType)?.label ?? relType;
                  return (
                    <GroupedCard
                      key={relType}
                      title={label}
                      references={refs}
                      onDeleteRef={handleDelete}
                    />
                  );
                })}
              </div>
            ) : viewMode === "density" ? (
              <div className="px-3 py-3">
                <DensityCard
                  references={filtered}
                  totalPages={currentDocument.pages}
                />
              </div>
            ) : null}
          </div>

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
      right={
        <div className="flex flex-col h-full min-h-0 relative overflow-hidden">
          <EntityOverlay />
          <DrawerTabs
            tabs={[{ id: "document", label: "Document" }]}
            activeId="document"
            onChange={() => {}}
          />
          <DocumentViewer showMinimap={false} />
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
        </div>
      }
      defaultRightWidth={560}
      minRightWidth={460}
      maxRightWidth={720}
    />
  );
}
