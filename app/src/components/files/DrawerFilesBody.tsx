import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, Check, Download, Pencil, X } from "lucide-react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { FileEntry } from "../../data/files";
import {
  filesAtom,
  documentGroupsAtom,
  activePrimaryGroupIdAtom,
  addFileTargetAtom,
  viewerFileIdAtom,
} from "../../atoms/files";
import { languageAtom } from "../../atoms/language";
import { AddFileModal } from "./AddFileModal";
import { FileViewerBody, resolveFileUrl } from "./FileViewerModal";
import { DocumentViewer } from "../viewer/DocumentViewer";
import { ViewButton } from "../shared/ViewButton";

const KNOWN_LANGUAGES = ["EN", "ES", "FR", "AR", "PT", "DE", "—"];

/** Drawer body listing every file grouped by its DocumentGroup. Mirrors the
 *  main Files view layout: one section per primary group with its
 *  translations beneath, then a flat Supporting files section. Used by both
 *  the Document tab drawer and the Metadata tab drawer so the file UI is
 *  consistent everywhere. `hideActionBar` drops the bottom "Add file" footer
 *  for hosts that supply their own (the library preview's Close / View bar). */
export function DrawerFilesBody({
  hideActionBar = false,
}: {
  hideActionBar?: boolean;
} = {}) {
  const [files, setFiles] = useAtom(filesAtom);
  const groups = useAtomValue(documentGroupsAtom);
  const activeGroupId = useAtomValue(activePrimaryGroupIdAtom);
  const language = useAtomValue(languageAtom);
  const setAddFileTarget = useSetAtom(addFileTargetAtom);
  const [viewerFileId, setViewerFileId] = useAtom(viewerFileIdAtom);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const viewingFile = viewerFileId
    ? files.find((f) => f.id === viewerFileId)
    : null;

  const commitEdit = (id: string, patch: Partial<FileEntry>) => {
    setFiles((all) => all.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    setEditingFileId(null);
  };

  const primaryGroups = [...groups]
    .filter((g) => g.isPrimary)
    .sort((a, b) => {
      // Pin the active primary to the top so the doc the viewer's showing
      // is also first in the list.
      if (a.id === activeGroupId) return -1;
      if (b.id === activeGroupId) return 1;
      return a.order - b.order;
    });
  const resolvedActiveId = activeGroupId ?? primaryGroups[0]?.id ?? null;
  const isInActivePrimary = (file: FileEntry) =>
    file.groupId === resolvedActiveId && file.language === language;

  const supportingGroupIds = new Set(
    groups.filter((g) => !g.isPrimary).map((g) => g.id),
  );
  const supportingFiles = files.filter((f) => supportingGroupIds.has(f.groupId));

  // Inline viewer mode — body swaps to the media, action bar shows
  // Back + Download in place of the file list. PDFs use the same full
  // DocumentViewer the Metadata drawer's Document sub-tab uses (page
  // rendering + highlights), so the experience matches across surfaces.
  if (viewingFile) {
    const url = resolveFileUrl(viewingFile);
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        {viewingFile.type === "pdf" ? (
          <div className="flex-1 min-h-0">
            <DocumentViewer
              showMinimap={false}
              fileOverride={{ url, language: viewingFile.language }}
            />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto bg-warm/40 flex items-center justify-center p-4">
            <FileViewerBody file={viewingFile} url={url} />
          </div>
        )}
        <div
          className="flex items-center justify-between h-12 px-3 bg-paper shrink-0"
          style={{ borderTop: "1px solid var(--border-primary)" }}
        >
          <button
            onClick={() => setViewerFileId(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
          >
            <ArrowLeft size={12} className="text-ink-tertiary" /> Back to files
          </button>
          {url && viewingFile.type !== "link" && (
            <a
              href={url}
              download
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
            >
              <Download size={12} className="text-ink-tertiary" /> Download
            </a>
          )}
        </div>
        <AddFileModal />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto px-3 py-4 pb-8">
        <SectionHeader label="Primary documents" />
        {primaryGroups.length === 0 && (
          <p className="text-xs italic text-ink-tertiary px-1 mb-5">
            No primary documents yet. Promote a supporting file or add a new one.
          </p>
        )}
        {primaryGroups.map((group) => {
          const groupFiles = files.filter((f) => f.groupId === group.id);
          return (
            <section key={group.id} className="mb-6">
              <div className="flex items-baseline justify-between px-1 mb-2">
                <h4 className="text-sm font-semibold text-ink truncate">
                  {group.title}
                </h4>
                <span className="text-[10px] text-ink-tertiary tabular-nums shrink-0">
                  {groupFiles.length} {groupFiles.length === 1 ? "file" : "files"}
                </span>
              </div>
              <div className="space-y-2">
                {groupFiles.map((file) => (
                  <DrawerFileRow
                    key={file.id}
                    file={file}
                    active={isInActivePrimary(file)}
                    thumbnail={<FileThumbnail type={file.type} />}
                    editing={editingFileId === file.id}
                    onView={() => setViewerFileId(file.id)}
                    onEdit={() => setEditingFileId(file.id)}
                    onCancelEdit={() => setEditingFileId(null)}
                    onCommit={(patch) => commitEdit(file.id, patch)}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setAddFileTarget({ mode: "translation", groupId: group.id })
                }
                className="text-[11px] font-medium text-ink-secondary hover:text-ink transition-colors cursor-pointer mt-2 pl-1"
              >
                + Add translation
              </button>
            </section>
          );
        })}

        <SectionHeader label="Supporting files" />
        {supportingFiles.length === 0 ? (
          <p className="text-xs italic text-ink-tertiary px-1">
            No supporting files yet. Add a file to get started.
          </p>
        ) : (
          <div className="space-y-2 mt-2">
            {supportingFiles.map((file) => (
              <DrawerFileRow
                key={file.id}
                file={file}
                thumbnail={<FileThumbnail type={file.type} />}
                editing={editingFileId === file.id}
                onView={() => setViewerFileId(file.id)}
                onEdit={() => setEditingFileId(file.id)}
                onCancelEdit={() => setEditingFileId(null)}
                onCommit={(patch) => commitEdit(file.id, patch)}
              />
            ))}
          </div>
        )}
      </div>

      {!hideActionBar && (
        <div
          className="flex items-center gap-3 h-12 px-3 bg-paper shrink-0"
          style={{ borderTop: "1px solid var(--border-primary)" }}
        >
          <button
            onClick={() => setAddFileTarget({ mode: "new" })}
            className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
          >
            Add file
          </button>
          <span className="text-xs text-ink-muted">
            Learn more about <span className="font-bold underline">files</span>
          </span>
        </div>
      )}
      <AddFileModal />
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <h3 className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider px-1 mb-3">
      {label}
    </h3>
  );
}

interface DrawerFileRowProps {
  file: FileEntry;
  active?: boolean;
  thumbnail: React.ReactNode;
  editing?: boolean;
  onView?: () => void;
  onEdit?: () => void;
  onCancelEdit?: () => void;
  onCommit?: (patch: Partial<FileEntry>) => void;
}

function FileThumbnail({ type }: { type: FileEntry["type"] }) {
  const wrap =
    "w-16 self-stretch flex items-center justify-center rounded-l-md shrink-0";
  if (type === "link") {
    return (
      <div className={`${wrap} bg-seal`}>
        <span className="text-[9px] font-bold text-white">YouTube</span>
      </div>
    );
  }
  // Audio and video share one play-affordance look — both are "playable
  // media", so they should read as the same kind in the list.
  if (type === "audio" || type === "video") {
    return (
      <div className={`${wrap} bg-warm`}>
        <div className="w-8 h-8 rounded-md bg-parchment flex items-center justify-center shadow-sm">
          <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[7px] border-l-ink ml-0.5" />
        </div>
      </div>
    );
  }
  // PDF, document, and image all share the same chrome — a warm tray with
  // a small white "paper" card inside. Only the label changes.
  const label =
    type === "pdf" ? "PDF" : type === "image" ? "IMG" : "DOC";
  return (
    <div className={`${wrap} bg-warm`}>
      <div
        className="bg-paper rounded shadow-sm flex items-center justify-center"
        style={{ width: "2.25rem", height: "2.75rem" }}
      >
        <span className="text-[8px] text-ink-muted">{label}</span>
      </div>
    </div>
  );
}

function DrawerFileRow({
  file,
  active,
  thumbnail,
  editing,
  onView,
  onEdit,
  onCancelEdit,
  onCommit,
}: DrawerFileRowProps) {
  const [draftName, setDraftName] = useState(file.name);
  const [draftLang, setDraftLang] = useState(file.language);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraftName(file.name);
      setDraftLang(file.language);
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [editing, file.name, file.language]);

  const save = () => {
    const trimmed = draftName.trim() || file.name;
    onCommit?.({ name: trimmed, language: draftLang });
  };

  const cancel = () => {
    setDraftName(file.name);
    setDraftLang(file.language);
    onCancelEdit?.();
  };

  const languageOptions = Array.from(
    new Set([...KNOWN_LANGUAGES, file.language]),
  );

  return (
    <div
      className={`flex items-stretch border rounded-md overflow-hidden transition-colors min-h-[58px] ${
        active
          ? "border-ink/30 bg-parchment hover:bg-parchment"
          : "border-border/50 bg-paper hover:bg-warm/50"
      }`}
    >
      {thumbnail}

      {editing ? (
        <div className="flex-1 min-w-0 px-3 py-2 flex flex-col justify-center gap-1">
          <input
            ref={nameInputRef}
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            className="w-full px-1.5 py-1 text-xs font-medium text-ink bg-paper border border-border rounded focus:outline-none focus:ring-1 focus:ring-carbon/30"
            aria-label="File name"
          />
          <div className="flex items-center gap-2">
            <div className="relative inline-flex items-center bg-paper rounded border border-border focus-within:ring-1 focus-within:ring-carbon/30">
              <select
                value={draftLang}
                onChange={(e) => setDraftLang(e.target.value)}
                className="appearance-none bg-transparent pl-2 pr-5 py-0.5 text-[10px] font-semibold text-ink-secondary focus:outline-none cursor-pointer"
                aria-label="File language"
              >
                {languageOptions.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={10}
                className="absolute right-1 text-ink-tertiary pointer-events-none"
              />
            </div>
            <span className="text-[10px] text-ink-tertiary">{file.type.toUpperCase()}</span>
            <span className="text-[10px] text-ink-tertiary">{file.size}</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0 px-3 py-2 flex flex-col justify-center gap-0.5">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium text-ink truncate">{file.name}</p>
            <span className="text-[9px] font-semibold text-ink-secondary bg-vellum px-1 py-px rounded shrink-0">
              {file.language}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-ink-tertiary">{file.type.toUpperCase()}</span>
            <span className="text-[10px] text-ink-tertiary">{file.size}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 pr-2 shrink-0">
        {editing ? (
          <>
            <button
              type="button"
              onClick={save}
              aria-label="Save changes"
              className="flex items-center justify-center w-7 h-7 rounded-md bg-warm text-ink-secondary hover:bg-parchment hover:text-ink transition-colors cursor-pointer"
            >
              <Check size={12} />
            </button>
            <button
              type="button"
              onClick={cancel}
              aria-label="Cancel edit"
              className="flex items-center justify-center w-7 h-7 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit name and language"
              className="flex items-center justify-center w-7 h-7 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink transition-colors cursor-pointer"
            >
              <Pencil size={12} />
            </button>
            <ViewButton onClick={onView} />
          </>
        )}
      </div>
    </div>
  );
}
