import { useMemo, useState, type ReactNode } from "react";
import { useAtom, useSetAtom } from "jotai";
import { AdaptiveSplitView } from "../components/layout/AdaptiveSplitView";
import { MainTabs } from "../components/layout/MainTabs";
import { DocMeta } from "../components/layout/DocMeta";
import { FileTable } from "../components/files/FileTable";
import { FileDrawer } from "../components/files/FileDrawer";
import { DocumentGroupCard } from "../components/files/DocumentGroupCard";
import { AddFileModal } from "../components/files/AddFileModal";
import {
  filesAtom,
  documentGroupsAtom,
  activePrimaryGroupIdAtom,
  addFileTargetAtom,
} from "../atoms/files";
import { languageAtom, type Language } from "../atoms/language";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { SelectControls } from "../components/shared/SelectControls";

interface FilesViewProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onBack?: () => void;
}

export function FilesView({ tabs, activeTab, onTabChange, onBack }: FilesViewProps) {
  const [language, setLanguage] = useAtom(languageAtom);
  const [files, setFiles] = useAtom(filesAtom);
  const [groups, setGroups] = useAtom(documentGroupsAtom);
  const [activeGroupId] = useAtom(activePrimaryGroupIdAtom);
  const setActiveGroupId = useSetAtom(activePrimaryGroupIdAtom);
  const setAddFileTarget = useSetAtom(addFileTargetAtom);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(() => {
    const firstPrimary = [...groups]
      .filter((g) => g.isPrimary)
      .sort((a, b) => a.order - b.order)[0];
    return files.find((f) => f.groupId === firstPrimary?.id)?.id ?? files[0]?.id ?? null;
  });

  /** Pending deletion state: either a single id or a batch via the action bar. */
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);

  const primaryGroups = useMemo(() => {
    // Active group floats to the top regardless of order; the rest sort
    // by their stored order. Keeps the doc the user is currently reading
    // at the head of the list every render.
    const resolvedActive = activeGroupId;
    return [...groups]
      .filter((g) => g.isPrimary)
      .sort((a, b) => {
        if (a.id === resolvedActive) return -1;
        if (b.id === resolvedActive) return 1;
        return a.order - b.order;
      });
  }, [groups, activeGroupId]);
  const supportingFiles = useMemo(() => {
    const supportingGroupIds = new Set(
      groups.filter((g) => !g.isPrimary).map((g) => g.id),
    );
    return files.filter((f) => supportingGroupIds.has(f.groupId));
  }, [files, groups]);

  const selectedFiles = files.filter((f) => selectedIds.has(f.id));
  const focusedFile = files.find((f) => f.id === focusedId) ?? null;
  const drawerFiles =
    selectedFiles.length > 0 ? selectedFiles : focusedFile ? [focusedFile] : [];

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const makeSelectAll = (subsetIds: string[]) => () => {
    const allSelected = subsetIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      subsetIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  /** Delete by id list. Removes files; deletes any group that ends up empty. */
  const performDelete = (ids: string[]) => {
    const idSet = new Set(ids);
    const remaining = files.filter((f) => !idSet.has(f.id));
    const stillUsedGroupIds = new Set(remaining.map((f) => f.groupId));
    setFiles(remaining);
    setGroups((all) => all.filter((g) => stillUsedGroupIds.has(g.id)));
    if (activeGroupId && !stillUsedGroupIds.has(activeGroupId)) {
      setActiveGroupId(null);
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    if (focusedId && idSet.has(focusedId)) {
      setFocusedId(remaining[0]?.id ?? null);
    }
  };

  const renderLeft = (menuTrigger?: ReactNode) => (
    <div className="flex flex-col h-full min-h-0 bg-paper">
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
      <div className="flex-1 overflow-auto p-4 pb-8 bg-warm">
        <h3 className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2 px-1">
          Primary documents
        </h3>
        {primaryGroups.length === 0 ? (
          <p className="text-xs italic text-ink-tertiary px-1 mb-5">
            No primary documents yet. Promote a supporting file or add a new one.
          </p>
        ) : (
          primaryGroups.map((group) => {
            const groupFiles = files.filter((f) => f.groupId === group.id);
            const resolvedActiveId =
              activeGroupId ?? primaryGroups[0]?.id ?? null;
            return (
              <DocumentGroupCard
                key={group.id}
                group={group}
                translationCount={groupFiles.length}
                active={group.id === resolvedActiveId}
              >
                <FileTable
                  files={groupFiles}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  onSelectAll={makeSelectAll(groupFiles.map((f) => f.id))}
                  focusedId={focusedId}
                  onFocus={setFocusedId}
                  onRequestDelete={(id) => setPendingDelete([id])}
                  onAddTranslation={(groupId) =>
                    setAddFileTarget({ mode: "translation", groupId })
                  }
                  embedded
                />
              </DocumentGroupCard>
            );
          })
        )}

        <h3 className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2 mt-5 px-1">
          Supporting files
        </h3>
        {supportingFiles.length === 0 ? (
          <p className="text-xs italic text-ink-tertiary px-1">
            No supporting files yet. Add a file to get started.
          </p>
        ) : (
          <FileTable
            files={supportingFiles}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectAll={makeSelectAll(supportingFiles.map((f) => f.id))}
            focusedId={focusedId}
            onFocus={setFocusedId}
            onRequestDelete={(id) => setPendingDelete([id])}
          />
        )}
      </div>
      <FilesActionBar
        selectedCount={selectedIds.size}
        totalCount={files.length}
        onAddFile={() => setAddFileTarget({ mode: "new" })}
        onSelectAll={() => setSelectedIds(new Set(files.map((f) => f.id)))}
        onDeselectAll={() => setSelectedIds(new Set())}
        onDelete={() => setPendingDelete(Array.from(selectedIds))}
        menuSlot={menuTrigger}
      />
    </div>
  );

  return (
    <>
      <AdaptiveSplitView
        mobileSections={[
          {
            id: "details",
            label:
              selectedFiles.length > 1
                ? `${selectedFiles.length} files`
                : drawerFiles[0]?.name ?? "File details",
            count: selectedFiles.length || undefined,
            content: (
              <FileDrawer
                selectedFiles={drawerFiles}
                onRequestDelete={(ids) => setPendingDelete(ids)}
                onFocusFile={setFocusedId}
                onAddTranslation={(groupId) =>
                  setAddFileTarget({ mode: "translation", groupId })
                }
              />
            ),
          },
        ]}
        left={renderLeft()}
        mobileLeft={(menuTrigger) => renderLeft(menuTrigger)}
        right={
          <FileDrawer
            selectedFiles={drawerFiles}
            onRequestDelete={(ids) => setPendingDelete(ids)}
            onFocusFile={setFocusedId}
            onAddTranslation={(groupId) => {
              // eslint-disable-next-line no-console
              console.info("Add translation requested for", groupId);
            }}
          />
        }
        defaultRightWidth={560}
        minRightWidth={460}
      />

      <AddFileModal />

      <ConfirmDialog
        open={pendingDelete !== null}
        variant="danger"
        title={
          pendingDelete && pendingDelete.length > 1
            ? `Delete ${pendingDelete.length} files?`
            : "Delete file?"
        }
        message={
          pendingDelete && pendingDelete.length > 1
            ? "Removes the selected files. Any document with no remaining translations is removed."
            : "Removes this file. If it's the last translation in its document, the document is removed too."
        }
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) performDelete(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </>
  );
}

function FilesActionBar({
  selectedCount,
  totalCount,
  onAddFile,
  onSelectAll,
  onDeselectAll,
  onDelete,
  menuSlot,
}: {
  selectedCount: number;
  totalCount: number;
  onAddFile: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => void;
  /** Mobile sheet trigger, pinned to the right of the bar. */
  menuSlot?: ReactNode;
}) {
  const hasSelection = selectedCount > 0;
  const allSelected = totalCount > 0 && selectedCount === totalCount;

  return (
    <div
      className={`flex items-center justify-between h-12 px-4 shrink-0 transition-colors ${
        hasSelection ? "bg-selected" : "bg-paper"
      }`}
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onAddFile}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
        >
          <span className="text-ink-tertiary">+</span> Add file
        </button>
        <SelectControls
          allSelected={allSelected}
          hasSelection={hasSelection}
          totalCount={totalCount}
          onSelectAll={onSelectAll}
          onDeselectAll={onDeselectAll}
        />
      </div>

      <div className="flex items-center gap-4">
        {hasSelection && (
          <>
            <span className="text-xs text-ink-secondary">
              Selected {selectedCount} of {totalCount}
            </span>
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-xs font-medium text-white bg-seal rounded-md hover:bg-seal/90 transition-colors cursor-pointer"
            >
              Delete
            </button>
          </>
        )}
        {menuSlot}
      </div>
    </div>
  );
}
