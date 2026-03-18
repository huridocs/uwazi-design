import { useState } from "react";
import { useAtom } from "jotai";
import { SplitView } from "../components/layout/SplitView";
import { MainTabs } from "../components/layout/MainTabs";
import { DocMeta } from "../components/layout/DocMeta";
import { FileTable } from "../components/files/FileTable";
import { FileDrawer } from "../components/files/FileDrawer";
import { files, primaryFiles, supportingFiles } from "../data/files";
import { languageAtom, type Language } from "../atoms/language";

interface FilesViewProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function FilesView({ tabs, activeTab, onTabChange }: FilesViewProps) {
  const [language, setLanguage] = useAtom(languageAtom);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedFiles = files.filter((f) => selectedIds.has(f.id));

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllPrimary = () => {
    const allSelected = primaryFiles.every((f) => selectedIds.has(f.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      primaryFiles.forEach((f) => (allSelected ? next.delete(f.id) : next.add(f.id)));
      return next;
    });
  };

  const handleSelectAllSupporting = () => {
    const allSelected = supportingFiles.every((f) => selectedIds.has(f.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      supportingFiles.forEach((f) => (allSelected ? next.delete(f.id) : next.add(f.id)));
      return next;
    });
  };

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
          <div className="flex-1 overflow-auto p-4 pb-8 space-y-5 bg-warm">
            <div>
              <h3 className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2 px-1">
                Primary document & translations
              </h3>
              <FileTable
                files={primaryFiles}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAllPrimary}
              />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2 px-1">
                Supporting files
              </h3>
              <FileTable
                files={supportingFiles}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAllSupporting}
              />
            </div>
          </div>
          <FilesActionBar selectedCount={selectedIds.size} totalCount={files.length} />
        </div>
      }
      right={<FileDrawer selectedFiles={selectedFiles} />}
      defaultRightWidth={480}
      minRightWidth={380}
      maxRightWidth={600}
    />
  );
}

function FilesActionBar({
  selectedCount,
  totalCount,
}: {
  selectedCount: number;
  totalCount: number;
}) {
  const hasSelection = selectedCount > 0;

  return (
    <div
      className={`flex items-center justify-between h-12 px-4 shrink-0 transition-colors ${
        hasSelection ? "bg-selected" : "bg-paper"
      }`}
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      <button
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-ink rounded-md
          border border-border hover:bg-warm transition-colors"
      >
        <span>+</span> Add file
      </button>

      {hasSelection && (
        <div className="flex items-center gap-4">
          <span className="text-xs text-ink-secondary">
            Selected {selectedCount} of {totalCount}
          </span>
          <button className="px-3 py-1.5 text-xs font-medium text-white bg-seal rounded-md hover:bg-seal/90 transition-colors">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
