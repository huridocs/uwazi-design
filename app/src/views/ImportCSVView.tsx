import { useState, useEffect, useCallback } from "react";
import { ImportCSVLayout } from "../components/import-csv/ImportCSVLayout";
import { ImportListView } from "../components/import-csv/ImportListView";
import { ImportDetailView } from "../components/import-csv/ImportDetailView";
import { NewImportModal } from "../components/import-csv/NewImportModal";
import { ToolsActionBar } from "../components/layout/ToolsActionBar";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { defaultImports, type ImportEntry } from "../data/imports";

type Screen = "list" | "detail";

export function ImportCSVView() {
  const [screen, setScreen] = useState<Screen>("list");
  const [imports, setImports] = useState<ImportEntry[]>(defaultImports);
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const activeEntry = imports.find((i) => i.id === activeImportId) ?? null;

  const handleView = useCallback((id: string) => {
    setActiveImportId(id);
    setScreen("detail");
  }, []);

  const handleBack = useCallback(() => {
    setScreen("list");
    setActiveImportId(null);
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected = imports.length > 0 && imports.every((i) => prev.has(i.id));
      if (allSelected) return new Set();
      return new Set(imports.map((i) => i.id));
    });
  }, [imports]);

  const handleDeleteSelected = useCallback(() => {
    setImports((prev) => prev.filter((i) => !selectedIds.has(i.id)));
    setSelectedIds(new Set());
    setDeleteConfirmOpen(false);
  }, [selectedIds]);

  const handleImport = useCallback(
    (filename: string, template: string) => {
      const newEntry: ImportEntry = {
        id: `imp-${Date.now()}`,
        filename,
        template,
        status: "uploading",
        progress: 0,
        entities: 0,
        failed: 0,
        warnings: 0,
        errors: 0,
        date: new Date().toISOString().slice(0, 10),
        issues: [],
      };
      setImports((prev) => [newEntry, ...prev]);
      setModalOpen(false);
      setActiveImportId(newEntry.id);
      setScreen("detail");
    },
    []
  );

  // Upload simulation
  useEffect(() => {
    const uploading = imports.find((i) => i.id === activeImportId && i.status === "uploading");
    if (!uploading) return;

    const interval = setInterval(() => {
      setImports((prev) =>
        prev.map((entry) => {
          if (entry.id !== activeImportId) return entry;
          if (entry.status === "uploading") {
            const next = Math.min(100, entry.progress + 3 + Math.random() * 5);
            if (next >= 100) {
              return { ...entry, status: "processing", progress: 0 };
            }
            return { ...entry, progress: next };
          }
          return entry;
        })
      );
    }, 200);

    return () => clearInterval(interval);
  }, [activeImportId, imports]);

  // Processing simulation
  useEffect(() => {
    const processing = imports.find((i) => i.id === activeImportId && i.status === "processing");
    if (!processing) return;

    const interval = setInterval(() => {
      setImports((prev) =>
        prev.map((entry) => {
          if (entry.id !== activeImportId) return entry;
          if (entry.status === "processing") {
            const next = Math.min(100, entry.progress + 2 + Math.random() * 4);
            const entities = Math.round((next / 100) * (300 + Math.random() * 200));
            if (next >= 100) {
              const willWarn = Math.random() > 0.5;
              return {
                ...entry,
                status: willWarn ? "completed_warnings" : "completed",
                progress: 100,
                entities,
                warnings: willWarn ? 3 : 0,
                issues: willWarn
                  ? [
                      { id: "w1", field: "description", issue: "Truncated to 255 characters in 3 rows", type: "warning" as const, date: entry.date },
                    ]
                  : [],
              };
            }
            return { ...entry, progress: next, entities };
          }
          return entry;
        })
      );
    }, 250);

    return () => clearInterval(interval);
  }, [activeImportId, imports]);

  return (
    <ImportCSVLayout
      actionBar={
        screen === "list" ? (
          <ToolsActionBar
            selectedCount={selectedIds.size}
            totalCount={imports.length}
            onNewImport={() => setModalOpen(true)}
            onDeleteSelected={() => setDeleteConfirmOpen(true)}
          />
        ) : undefined
      }
    >
      {screen === "list" ? (
        <ImportListView
          imports={imports}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onView={handleView}
          onNewImport={() => setModalOpen(true)}
        />
      ) : activeEntry ? (
        <ImportDetailView entry={activeEntry} onBack={handleBack} />
      ) : null}

      <NewImportModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onImport={handleImport}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Imports"
        message={`Are you sure you want to delete ${selectedIds.size} import${selectedIds.size !== 1 ? "s" : ""}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteSelected}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </ImportCSVLayout>
  );
}
