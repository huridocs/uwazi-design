import { useState, useMemo, useCallback } from "react";
import { useAtom } from "jotai";
import { referencesAtom, toastsAtom } from "../atoms/references";
import { languageAtom, type Language } from "../atoms/language";
import { viewModeAtom, searchQueryAtom, sortOrderAtom, expandAllSignalAtom, collapseAllSignalAtom } from "../atoms/filters";
import { getEntity, getEntityType } from "../data/entities";
import { Reference, relationTypes } from "../data/references";
import { currentDocument } from "../data/document";
import { SplitView } from "../components/layout/SplitView";
import { DrawerTabs } from "../components/layout/DrawerTabs";
import { MainTabs } from "../components/layout/MainTabs";
import { DocMeta } from "../components/layout/DocMeta";
import { DocumentViewer } from "../components/viewer/DocumentViewer";
import { ReferencePanel } from "../components/references/ReferencePanel";
import { SearchBar } from "../components/references/SearchBar";
import { FiltersRow } from "../components/references/FiltersRow";
import { GroupedCard } from "../components/references/GroupedCard";
import { DensityCard } from "../components/references/DensityCard";
import { RefRow } from "../components/references/RefRow";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { EntityPickerModal } from "./EntityPickerModal";
import { ToastContainer } from "./ToastContainer";
import { FilesView } from "./FilesView";
import { MetadataView } from "./MetadataView";
import { Link2 } from "lucide-react";

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

  const tabs = mainTabs.map((t) =>
    t.id === "references" ? { ...t, count: references.length } : t
  );

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

  return (
    <>
      <SplitView
        left={
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
            <DocumentViewer />
          </div>
        }
        right={<ReferencePanel />}
        defaultRightWidth={480}
        minRightWidth={380}
        maxRightWidth={600}
      />
      <EntityPickerModal />
      <ToastContainer />
    </>
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

  const filtered = useMemo(() => {
    let result = references;
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
    if (sortOrder === "none") return result;
    const dir = sortOrder === "asc" ? 1 : -1;
    return [...result].sort((a, b) => {
      const nameA = getEntity(a.targetEntityId)?.title ?? "";
      const nameB = getEntity(b.targetEntityId)?.title ?? "";
      return nameA.localeCompare(nameB) * dir;
    });
  }, [references, searchQuery, sortOrder]);

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
    <SplitView
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
          <SearchBar />
          <FiltersRow
            onExpandAll={() => setExpandSignal((s) => s + 1)}
            onCollapseAll={() => setCollapseSignal((s) => s + 1)}
          />

          <div className="flex-1 overflow-auto pb-8 bg-warm">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Link2 size={36} className="text-ink-tertiary/40 mb-3" />
                <p className="text-sm text-ink-tertiary">No references found</p>
                <p className="text-xs text-ink-tertiary mt-1">
                  Select text in the document to create one
                </p>
              </div>
            ) : viewMode === "all" ? (
              <div className="px-4 py-3 space-y-1.5">
                {filtered.map((ref) => (
                  <RefRow key={ref.id} reference={ref} onDelete={handleDelete} />
                ))}
              </div>
            ) : viewMode === "by-entity-type" ? (
              <div className="px-4 py-3 space-y-1.5">
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
              <div className="px-4 py-3 space-y-1.5">
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
              <div className="px-4 py-3">
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
        <div className="flex flex-col h-full min-h-0">
          <DrawerTabs
            tabs={[{ id: "document", label: "Document" }]}
            activeId="document"
            onChange={() => {}}
          />
          <DocumentViewer />
        </div>
      }
      defaultRightWidth={480}
      minRightWidth={380}
      maxRightWidth={600}
    />
  );
}
