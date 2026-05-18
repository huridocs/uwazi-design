import { useState } from "react";
import {
  FileText,
  Music,
  Video,
  Image,
  Link2,
  Download,
  Trash2,
  MousePointerClick,
  Plus,
  Eye,
} from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { DrawerTabs } from "../layout/DrawerTabs";
import { FileEntry } from "../../data/files";
import { filesAtom, documentGroupsAtom } from "../../atoms/files";
import { FileDetailEditor } from "./FileDetailEditor";

const typeIcons: Record<FileEntry["type"], typeof FileText> = {
  pdf: FileText,
  audio: Music,
  video: Video,
  image: Image,
  link: Link2,
  document: FileText,
};

interface FileDrawerProps {
  selectedFiles: FileEntry[];
  /** Upstream confirm dialog launcher. */
  onRequestDelete?: (ids: string[]) => void;
  /** Open AddFileModal (commit 4) pre-filled with this groupId. */
  onAddTranslation?: (groupId: string) => void;
  /** Re-focus the row of a sibling translation when the user clicks a chip. */
  onFocusFile?: (id: string) => void;
}

/** Right-hand drawer for the Files tab. Hosts editable detail for a single
 *  focused file, a compact list for multi-selection, or an empty state. */
export function FileDrawer({
  selectedFiles,
  onRequestDelete,
  onAddTranslation,
  onFocusFile,
}: FileDrawerProps) {
  const [activeTab, setActiveTab] = useState("file");
  const allFiles = useAtomValue(filesAtom);
  const allGroups = useAtomValue(documentGroupsAtom);
  const setFiles = useSetAtom(filesAtom);
  const setGroups = useSetAtom(documentGroupsAtom);

  const focusedFile =
    selectedFiles.length === 1 ? selectedFiles[0] : undefined;

  // Translations tab is keyed on the focused file's group. Siblings include
  // the focused file itself so users see the full set.
  const translations = focusedFile
    ? allFiles.filter((f) => f.groupId === focusedFile.groupId)
    : [];
  const focusedGroup = focusedFile
    ? allGroups.find((g) => g.id === focusedFile.groupId)
    : undefined;

  const drawerTabs = [
    { id: "file", label: "File" },
    {
      id: "translations",
      label: "Translations",
      count: translations.length || undefined,
    },
  ];

  const handleDeleteFromTranslations = (id: string) => {
    onRequestDelete?.([id]);
  };

  // Used by the "+ Add translation" / "Add file" empty-state — AddFileModal
  // lands in commit 4, so for now we stub a placeholder file directly.
  const stubAddTranslation = (language: string) => {
    if (!focusedGroup) return;
    const id = `f-${Date.now()}`;
    setFiles((all) => [
      ...all,
      {
        id,
        groupId: focusedGroup.id,
        name: `${focusedGroup.title} (${language}).pdf`,
        type: "pdf",
        size: "0 KB",
        language,
        modified: new Date().toISOString().slice(0, 10),
        url: "/sample.pdf",
      },
    ]);
    // Make sure the group still exists (it will).
    setGroups((g) => g);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <div
          className="flex items-center rounded-md overflow-hidden w-fit"
          style={{
            border: "1px solid var(--border-primary)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
          }}
        >
          {drawerTabs.map((tab, i) => (
            <div key={tab.id} className="flex items-center">
              {i > 0 && <div className="w-px self-stretch bg-border" />}
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1 px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-vellum text-ink"
                    : "bg-paper text-ink-tertiary hover:text-ink-secondary"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="text-xs font-semibold text-ink-tertiary bg-warm px-1 rounded">
                    {tab.count}
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {activeTab === "file" ? (
        <>
          <div className="flex-1 overflow-auto p-3 pb-8 space-y-3">
            {selectedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <MousePointerClick size={32} className="text-ink-muted/40" />
                <div>
                  <p className="text-sm font-medium text-ink-muted">No file selected</p>
                  <p className="text-xs text-ink-muted mt-1">
                    Click a file in the table to see its details
                  </p>
                </div>
              </div>
            ) : selectedFiles.length > 1 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-ink-tertiary mb-2">
                  {selectedFiles.length} files selected
                </p>
                {selectedFiles.map((file) => (
                  <FileCompactCard key={file.id} file={file} />
                ))}
              </div>
            ) : (
              <FileDetailEditor
                file={selectedFiles[0]}
                onRequestDelete={(id) => onRequestDelete?.([id])}
                onAddTranslation={onAddTranslation}
                onFocusSibling={onFocusFile}
              />
            )}
          </div>

          {selectedFiles.length > 1 && (
            <div
              className="flex items-center justify-between h-12 px-3 shrink-0"
              style={{ borderTop: "1px solid var(--border-primary)" }}
            >
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors cursor-pointer">
                <Download size={12} /> Download all
              </button>
              <button
                onClick={() => onRequestDelete?.(selectedFiles.map((f) => f.id))}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-seal rounded-md hover:bg-seal/90 transition-colors cursor-pointer"
              >
                <Trash2 size={12} /> Delete {selectedFiles.length}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex-1 overflow-auto p-3 pb-8 space-y-4">
            {!focusedFile || !focusedGroup ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <MousePointerClick size={32} className="text-ink-muted/40" />
                <p className="text-xs text-ink-muted">
                  Focus a single file to see its translations
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium text-ink-secondary">
                  {focusedGroup.title}
                </p>
                {translations.length === 0 ? (
                  <p className="text-xs italic text-ink-tertiary">
                    No translations yet.
                  </p>
                ) : (
                  translations.map((sib) => (
                    <TranslationCard
                      key={sib.id}
                      file={sib}
                      onFocus={() => onFocusFile?.(sib.id)}
                      onDelete={() => handleDeleteFromTranslations(sib.id)}
                    />
                  ))
                )}
                <div
                  className="flex items-center justify-center gap-3 py-5 rounded-md"
                  style={{
                    border: "1.5px dashed var(--border-soft)",
                  }}
                >
                  <Plus size={16} className="text-ink-muted" />
                  <span className="text-xs text-ink-muted">
                    Add translation document
                  </span>
                  <button
                    onClick={() =>
                      onAddTranslation
                        ? onAddTranslation(focusedGroup.id)
                        : stubAddTranslation("EN")
                    }
                    className="px-2.5 py-1 text-[11px] font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors cursor-pointer"
                  >
                    Add file
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TranslationCard({
  file,
  onFocus,
  onDelete,
}: {
  file: FileEntry;
  onFocus: () => void;
  onDelete: () => void;
}) {
  const Icon = typeIcons[file.type];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFocus();
        }
      }}
      className="flex items-center gap-2 px-3 py-2 rounded-md bg-paper border border-border/50 hover:bg-warm transition-colors cursor-pointer"
    >
      <span className="text-[10px] font-semibold text-ink-secondary bg-vellum px-1.5 py-0.5 rounded shrink-0">
        {file.language}
      </span>
      <Icon size={14} className="text-ink-muted shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-ink truncate">{file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-ink-muted">
            {file.type.toUpperCase()}
          </span>
          <span className="text-[10px] text-ink-muted">{file.size}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onFocus();
        }}
        aria-label={`View ${file.name}`}
        className="p-1 rounded hover:bg-parchment transition-colors"
      >
        <Eye size={14} className="text-ink-tertiary" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={`Delete ${file.name}`}
        className="p-1 rounded hover:bg-seal-tint text-ink-muted hover:text-seal transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function FileCompactCard({ file }: { file: FileEntry }) {
  const Icon = typeIcons[file.type];
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-warm border border-border/40">
      <Icon size={14} className="text-ink-muted shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-ink truncate">{file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-ink-muted">
            {file.type.toUpperCase()}
          </span>
          <span className="text-[10px] text-ink-muted">{file.size}</span>
          <span className="text-[10px] text-ink-muted">{file.language}</span>
        </div>
      </div>
    </div>
  );
}
