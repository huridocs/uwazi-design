import { useState } from "react";
import { languageName } from "../../atoms/language";
import {
  FileText,
  Music,
  Video,
  Image,
  Link2,
  Download,
  Trash2,
  MousePointerClick,
  Eye,
  ArrowLeft,
} from "lucide-react";
import { useAtom, useAtomValue } from "jotai";
import { DrawerTabs } from "../layout/DrawerTabs";
import { FileEntry } from "../../data/files";
import {
  filesAtom,
  documentGroupsAtom,
  viewerFileIdAtom,
} from "../../atoms/files";
import { useNotify } from "../../hooks/useNotify";
import { FileDetailEditor } from "./FileDetailEditor";
import { AddFileDropArea } from "./AddFileDropArea";
import { FileViewerBody, resolveFileUrl } from "./FileViewerModal";
import { DocumentViewer } from "../viewer/DocumentViewer";
import { TabCount } from "../shared/TabCount";
import { BAR_DANGER, BAR_GHOST, BAR_LEAD } from "../shared/warmButton";

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
  const notify = useNotify();
  const allFiles = useAtomValue(filesAtom);
  const allGroups = useAtomValue(documentGroupsAtom);
  const [viewerFileId, setViewerFileId] = useAtom(viewerFileIdAtom);

  const focusedFile =
    selectedFiles.length === 1 ? selectedFiles[0] : undefined;
  // Viewer mode: focused file matches the global viewer atom. Swaps the
  // drawer body from editor to inline media + action bar to back/download.
  const viewing = focusedFile && focusedFile.id === viewerFileId;

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

  return (
    <div data-component="FileDrawer" className="flex flex-col h-full">
      <div data-part="toolbar" className="flex items-center justify-between px-3 py-2 shrink-0">
        <div
          data-part="tabs"
          className="flex items-center rounded-md overflow-hidden w-fit"
          style={{
            border: "1px solid var(--border-primary)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
          }}
        >
          {drawerTabs.map((tab, i) => (
            <div key={tab.id} className="flex items-center">
              {i > 0 && <div aria-hidden className="w-px self-stretch bg-border" />}
              <button
                type="button"
                data-part="tab"
                data-state={activeTab === tab.id ? "active" : "inactive"}
                aria-pressed={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1 px-3 py-1.5 text-tab font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-vellum text-ink"
                    : "bg-paper text-ink-tertiary hover:text-ink-secondary"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && <TabCount count={tab.count} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {activeTab === "file" ? (
        <>
          <div data-part="body" className="flex-1 overflow-auto p-3 pb-8 space-y-3">
            {selectedFiles.length === 0 ? (
              <div data-part="empty" className="flex flex-col items-center justify-center h-full text-center gap-3">
                <MousePointerClick size={32} className="text-ink-muted/40" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-ink-secondary">No file selected</p>
                  <p className="text-xs text-ink-muted mt-1">
                    Click a file in the table to see its details
                  </p>
                </div>
              </div>
            ) : selectedFiles.length > 1 ? (
              <div data-part="selection" className="space-y-2">
                <p data-part="selection-count" className="text-xs font-medium text-ink-tertiary mb-2">
                  {selectedFiles.length} files selected
                </p>
                <ul data-part="rows" className="space-y-2">
                  {selectedFiles.map((file) => (
                    <li key={file.id}>
                      <FileCompactCard file={file} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : viewing ? (
              selectedFiles[0].type === "pdf" ? (
                // Match the Metadata drawer's Document tab — full page-by-page
                // viewer with highlights overlay, not a flat iframe.
                <div data-part="viewer" className="-m-3 h-full min-h-[60vh]">
                  <DocumentViewer
                    showMinimap={false}
                    fileOverride={{
                      url: resolveFileUrl(selectedFiles[0]),
                      language: selectedFiles[0].language,
                    }}
                  />
                </div>
              ) : (
                <div data-part="viewer" className="flex items-center justify-center min-h-full">
                  <FileViewerBody
                    file={selectedFiles[0]}
                    url={resolveFileUrl(selectedFiles[0])}
                  />
                </div>
              )
            ) : (
              <FileDetailEditor
                file={selectedFiles[0]}
                onRequestDelete={(id) => onRequestDelete?.([id])}
                onAddTranslation={onAddTranslation}
                onFocusSibling={onFocusFile}
              />
            )}
          </div>

          {selectedFiles.length === 1 && (
            <div
              data-part="footer"
              className="flex items-center justify-between h-12 px-3 shrink-0"
              style={{ borderTop: "1px solid var(--border-primary)" }}
            >
              {viewing ? (
                <>
                  <button
                    type="button"
                    data-part="back"
                    onClick={() => setViewerFileId(null)}
                    data-gutter-align="box"
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer`}
                  >
                    <ArrowLeft size={12} className="text-ink-tertiary" aria-hidden /> Back to details
                  </button>
                  {(() => {
                    const url = resolveFileUrl(selectedFiles[0]);
                    return url && selectedFiles[0].type !== "link" ? (
                      <a
                        href={url}
                        download
                        data-part="download"
                        target="_blank"
                        rel="noreferrer"
                        data-gutter-align="box"
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer`}
                      >
                        <Download size={12} className="text-ink-tertiary" /> Download
                      </a>
                    ) : (
                      <div />
                    );
                  })()}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-part="view"
                      onClick={() => setViewerFileId(selectedFiles[0].id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${BAR_LEAD} rounded-md transition-colors cursor-pointer`}
                    >
                      <Eye size={12} className="text-ink-tertiary" aria-hidden /> View
                    </button>
                    <button
                      type="button"
                      data-part="download"
                      onClick={() => notify("File downloaded", "success")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer`}
                    >
                      <Download size={12} className="text-ink-tertiary" /> Download
                    </button>
                  </div>
                  <button
                    type="button"
                    data-part="delete"
                    onClick={() => onRequestDelete?.([selectedFiles[0].id])}
                    data-gutter-align="box"
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${BAR_DANGER} rounded-md transition-colors cursor-pointer`}
                  >
                    <Trash2 size={12} aria-hidden /> Delete
                  </button>
                </>
              )}
            </div>
          )}
          {selectedFiles.length > 1 && (
            <div
              data-part="footer"
              className="flex items-center justify-between h-12 px-3 shrink-0"
              style={{ borderTop: "1px solid var(--border-primary)" }}
            >
              <button
                type="button"
                data-part="download"
                onClick={() => notify(`Downloading ${selectedFiles.length} files`, "success")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${BAR_LEAD} rounded-md transition-colors cursor-pointer`}
              >
                <Download size={12} className="text-ink-tertiary" /> Download all
              </button>
              <button
                type="button"
                data-part="delete"
                onClick={() => onRequestDelete?.(selectedFiles.map((f) => f.id))}
                data-gutter-align="box"
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${BAR_DANGER} rounded-md transition-colors cursor-pointer`}
              >
                <Trash2 size={12} aria-hidden /> Delete {selectedFiles.length}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div data-part="body" className="flex-1 overflow-auto p-3 pb-8 space-y-4">
            {!focusedFile || !focusedGroup ? (
              <div data-part="empty" className="flex flex-col items-center justify-center h-full text-center gap-3">
                <MousePointerClick size={32} className="text-ink-muted/40" aria-hidden />
                <p className="text-xs text-ink-muted">
                  Focus a single file to see its translations
                </p>
              </div>
            ) : (
              <>
                <p data-part="group-title" className="text-xs font-medium text-ink-secondary">
                  {focusedGroup.title}
                </p>
                {translations.length === 0 ? (
                  <p data-part="translations-empty" className="text-xs italic text-ink-tertiary">
                    No translations yet.
                  </p>
                ) : (
                  <ul data-part="rows" className="space-y-4">
                    {translations.map((sib) => (
                      <li key={sib.id}>
                        <TranslationCard
                          file={sib}
                          focused={sib.id === focusedFile?.id}
                          onFocus={() => onFocusFile?.(sib.id)}
                          onDelete={() => handleDeleteFromTranslations(sib.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                <AddFileDropArea
                  variant="compact"
                  targetGroupId={focusedGroup.id}
                  onAdded={(id) => onFocusFile?.(id)}
                />
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
  focused,
  onFocus,
  onDelete,
}: {
  file: FileEntry;
  /** This card is the file open in the drawer — the list includes it (see
   *  `translations` above). Said with `aria-pressed` and the selected fill. */
  focused: boolean;
  onFocus: () => void;
  onDelete: () => void;
}) {
  const Icon = typeIcons[file.type];
  return (
    // Not `role="button"`: the card hosts View and Delete buttons. A stretched
    // primary-action button carries the keyboard path; the content sits above
    // it (`relative`) and mouse clicks bubble to the card's plain onClick.
    <article
      data-component="TranslationCard"
      data-state={focused ? "focused" : undefined}
      onClick={onFocus}
      className={`relative flex items-center gap-2 px-3 py-2 rounded-md border border-border/50 transition-colors cursor-pointer ${
        focused ? "bg-parchment" : "bg-paper hover:bg-warm"
      }`}
    >
      <button
        type="button"
        data-part="primary-action"
        aria-pressed={focused}
        aria-label={`Focus ${file.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onFocus();
        }}
        className="absolute inset-0 w-full rounded-md cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20"
      />
      {/* A fixed badge leading a compact row: a name here would outweigh the
          filename beside it, so the code stays and is named on hover. */}
      <span
        data-part="language"
        className="relative text-meta font-semibold text-ink-secondary bg-vellum px-1.5 py-0.5 rounded shrink-0"
        title={languageName(file.language)}
        aria-label={languageName(file.language)}
      >
        {file.language}
      </span>
      <Icon size={14} className="relative text-ink-muted shrink-0" aria-hidden />
      <div data-part="content" className="relative flex-1 min-w-0">
        <h3 data-part="title" className="text-xs font-medium text-ink truncate">{file.name}</h3>
        <div data-part="meta" className="flex items-center gap-2 mt-0.5">
          <span className="text-meta text-ink-muted">
            {file.type.toUpperCase()}
          </span>
          <span className="text-meta text-ink-muted">{file.size}</span>
        </div>
      </div>
      <button
        type="button"
        data-part="view"
        onClick={(e) => {
          e.stopPropagation();
          onFocus();
        }}
        aria-label={`View ${file.name}`}
        className="relative p-1 rounded hover:bg-parchment transition-colors"
      >
        <Eye size={14} className="text-ink-tertiary" aria-hidden />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        data-part="delete"
        aria-label={`Delete ${file.name}`}
        className="relative p-1 rounded hover:bg-seal-tint text-ink-muted hover:text-seal-label transition-colors"
      >
        <Trash2 size={14} aria-hidden />
      </button>
    </article>
  );
}

function FileCompactCard({ file }: { file: FileEntry }) {
  const Icon = typeIcons[file.type];
  return (
    <article data-component="FileCompactCard" className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-warm border border-border/40">
      <Icon size={14} className="text-ink-muted shrink-0" aria-hidden />
      <div data-part="content" className="flex-1 min-w-0">
        <h3 data-part="title" className="text-xs font-medium text-ink truncate">{file.name}</h3>
        <div data-part="meta" className="flex items-center gap-2 mt-0.5">
          <span className="text-meta text-ink-muted">
            {file.type.toUpperCase()}
          </span>
          <span className="text-meta text-ink-muted">{file.size}</span>
          <span className="text-meta text-ink-muted">{languageName(file.language)}</span>
        </div>
      </div>
    </article>
  );
}
