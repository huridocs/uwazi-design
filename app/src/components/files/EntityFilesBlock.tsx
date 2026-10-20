import { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { ChevronDown, Download, ExternalLink, Eye, FileAudio, FileImage, FileText, FileVideo, Link2 } from "lucide-react";
import { filesAtom, documentGroupsAtom } from "../../atoms/files";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { languageName } from "../../atoms/language";
import type { DocumentGroup, FileEntry, FileKind } from "../../data/files";
import type { EntityProfile } from "../../data/entityProfiles";
import { useNotify } from "../../hooks/useNotify";
import { useResizeWidth } from "../../hooks/useResizeWidth";
import { Hint } from "../shared/Hint";
import { ListCardRow } from "../shared/ListCardRow";
import { Modal, MODAL_BUTTON, MODAL_COMMIT } from "../shared/Modal";
import { SectionLabel } from "../shared/SectionLabel";
import { BAR_GHOST } from "../shared/warmButton";
import { FileViewerBody, resolveFileUrl } from "./FileViewerModal";
import { DocumentViewer } from "../viewer/DocumentViewer";

const KIND_LABEL: Record<FileKind, string> = {
  pdf: "PDF",
  document: "Document",
  audio: "Audio",
  video: "Video",
  image: "Image",
  link: "Link",
};

const KIND_ICON: Record<FileKind, typeof FileText> = {
  pdf: FileText,
  document: FileText,
  audio: FileAudio,
  video: FileVideo,
  image: FileImage,
  link: Link2,
};

/** Below this width the row actions are icons with a Hint; above it they
 *  carry their words. */
const LABELLED_FROM = 480;

/** The record lists this many files before "Show all": a record holding a
 *  dozen translations and recordings would otherwise push its metadata a
 *  screen down. The Files menu lists every file. */
const FOLD_AFTER = 5;

/** The files an entity holds, read the way `DocumentCard` reads them: the live
 *  atoms for the focused entity (they carry file edits), the profile for any
 *  other one (a Library preview of a record that is not focused). */
export function useEntityFiles(profile: EntityProfile): { files: FileEntry[]; groups: DocumentGroup[] } {
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const liveFiles = useAtomValue(filesAtom);
  const liveGroups = useAtomValue(documentGroupsAtom);
  return profile.id === focusedId
    ? { files: liveFiles, groups: liveGroups }
    : { files: profile.files ?? [], groups: profile.documentGroups ?? [] };
}

interface Section {
  key: string;
  label: string;
  files: FileEntry[];
}

/** Primary documents first (one section per document when there are several,
 *  its translations as its rows), then the supporting files. */
function sectionsOf(files: FileEntry[], groups: DocumentGroup[]): Section[] {
  const ordered = [...groups].sort((a, b) => a.order - b.order);
  const primary = ordered.filter((g) => g.isPrimary);
  const sections: Section[] = primary.map((g) => ({
    key: g.id,
    label: primary.length > 1 ? g.title : "Primary document",
    files: files.filter((f) => f.groupId === g.id),
  }));
  const supportingIds = new Set(ordered.filter((g) => !g.isPrimary).map((g) => g.id));
  sections.push({ key: "supporting", label: "Supporting files", files: files.filter((f) => supportingIds.has(f.groupId)) });
  return sections.filter((s) => s.files.length > 0);
}

/** "PDF · 213 KB · English": only the facts the file has. CEJIL files carry
 *  no size, and a language of "—" is none. */
function factsOf(file: FileEntry): string {
  return [KIND_LABEL[file.type], file.size && file.size !== "—" ? file.size : "", file.language && file.language !== "—" ? languageName(file.language) : ""]
    .filter(Boolean)
    .join(" · ");
}

/** An entity's files, each with View and Download, and Download all when it
 *  holds more than one. One component for the record (the Metadata tab, the
 *  Library drawer preview, the entity view's Metadata drawer) and the
 *  Document tab's Files menu (`bare`), so the reader can take a file from any
 *  of them without going to the Files tab.
 *
 *  Renders nothing for an entity with no files. */
export function EntityFilesBlock({ profile, bare = false }: { profile: EntityProfile; bare?: boolean }) {
  const { files, groups } = useEntityFiles(profile);
  const notify = useNotify();
  const [labelled, setLabelled] = useState(false);
  const onWidth = useCallback((w: number) => setLabelled(w >= LABELLED_FROM), []);
  const measureRef = useResizeWidth(onWidth);
  const [previewing, setPreviewing] = useState<FileEntry | null>(null);
  const [expanded, setExpanded] = useState(false);

  const sections = sectionsOf(files, groups);
  const shown = sections.flatMap((s) => s.files);
  if (shown.length === 0) return null;
  const downloadable = shown.filter((f) => f.type !== "link" && !!resolveFileUrl(f));
  const folds = !bare && !expanded && shown.length > FOLD_AFTER + 1;
  // The sections cut at the fold, in order: the first FOLD_AFTER rows.
  let room = folds ? FOLD_AFTER : Infinity;
  const visible = sections
    .map((sec) => {
      const files = sec.files.slice(0, Math.max(0, room));
      room -= files.length;
      return { ...sec, files };
    })
    .filter((sec) => sec.files.length > 0);

  const head = (
    <div className="flex items-center gap-2 min-h-8">
      <h3 className="flex-1 min-w-0 text-meta font-semibold uppercase tracking-wider text-ink-secondary">
        Files <span className="text-ink-tertiary tabular-nums">{shown.length}</span>
      </h3>
      {downloadable.length > 1 && (
        <button
          type="button"
          onClick={() =>
            notify(
              `Download all puts the ${downloadable.length} files in one .zip on the server. This prototype has no server: download each file from its row.`,
              "info",
            )
          }
          className={`flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer`}
        >
          <Download size={13} className="text-ink-tertiary" aria-hidden />
          Download all
        </button>
      )}
    </div>
  );

  return (
    <section
      ref={measureRef}
      data-component="EntityFilesBlock"
      aria-label="Files"
      className={bare ? "" : "bg-paper border border-border/40 rounded-md overflow-hidden"}
    >
      <div className={bare ? "pb-1" : "px-4 pt-2"}>{head}</div>
      {visible.map((s) => (
        <div key={s.key}>
          <SectionLabel as="h4" className={`block truncate pt-2 pb-1 ${bare ? "" : "px-4"}`}>
            {s.label}
          </SectionLabel>
          <ul>
            {s.files.map((f) => (
              <li key={f.id}>
                <ListCardRow selected={false} className={bare ? "px-0!" : "px-4!"}>
                  <FileRow file={f} labelled={labelled} onOpen={() => setPreviewing(f)} />
                </ListCardRow>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {folds && (
        <div className="px-4 py-1.5 border-t border-border/50">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={`h-8 px-2.5 -ms-2.5 text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer tabular-nums`}
          >
            Show all {shown.length} files
          </button>
        </div>
      )}
      {previewing && <FilePreview file={previewing} onClose={() => setPreviewing(null)} />}
    </section>
  );
}

function FileRow({ file, labelled, onOpen }: { file: FileEntry; labelled: boolean; onOpen: () => void }) {
  const Icon = KIND_ICON[file.type];
  const url = resolveFileUrl(file);
  const isLink = file.type === "link";
  const href = isLink ? (file.name.startsWith("http") ? file.name : `https://${file.name}`) : url;
  const action = `flex items-center justify-center gap-1.5 h-8 ${labelled ? "px-2.5" : "w-8"} text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer`;

  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="flex items-center justify-center w-8 h-8 shrink-0 rounded-md bg-vellum" aria-hidden>
        <Icon size={14} className="text-ink-tertiary" />
      </span>
      <div className="flex-1 min-w-0">
        <p dir="ltr" title={file.name} className="text-sm font-medium text-ink truncate text-start">
          {file.name}
        </p>
        <p className="text-xs text-ink-tertiary truncate">{factsOf(file)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isLink ? (
          // A link has nothing to download: it opens where it lives.
          <Hint text="Open link in a new tab" describe={false} muted={labelled}>
            {(hint) => (
              <a {...hint} href={href} target="_blank" rel="noreferrer" aria-label={`Open ${file.name} in a new tab`} className={action}>
                <ExternalLink size={13} className="text-ink-tertiary" aria-hidden />
                {labelled && "Open"}
              </a>
            )}
          </Hint>
        ) : (
          <>
            <Hint text="View" describe={false} muted={labelled}>
              {(hint) => (
                <button {...hint} type="button" onClick={onOpen} aria-label={`View ${file.name}`} className={action}>
                  <Eye size={13} className="text-ink-tertiary" aria-hidden />
                  {labelled && "View"}
                </button>
              )}
            </Hint>
            {url ? (
              <Hint text="Download" describe={false} muted={labelled}>
                {(hint) => (
                  <a {...hint} href={url} download={file.name} aria-label={`Download ${file.name}`} className={action}>
                    <Download size={13} className="text-ink-tertiary" aria-hidden />
                    {labelled && "Download"}
                  </a>
                )}
              </Hint>
            ) : (
              <span aria-hidden className={`${labelled ? "w-[6.5rem]" : "w-8"} h-8`} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** The file on its own, with Download in the footer. Read from the row, not
 *  from `viewerFileIdAtom`, so a previewed entity that is not focused opens
 *  its own file. */
function FilePreview({ file, onClose }: { file: FileEntry; onClose: () => void }) {
  const url = resolveFileUrl(file);
  return (
    <Modal
      component="FilePreview"
      size="xl"
      onClose={onClose}
      title={<span dir="ltr">{file.name}</span>}
      subtitle={factsOf(file)}
      footer={
        <>
          <button type="button" onClick={onClose} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
            Close
          </button>
          {url && (
            <a href={url} download={file.name} aria-label={`Download ${file.name}`} className={`${MODAL_COMMIT} flex items-center gap-1.5`}>
              <Download size={13} aria-hidden /> Download
            </a>
          )}
        </>
      }
    >
      {/* A PDF in the app's own viewer, as the drawer's Files tab shows it;
          the other kinds in the shared body. */}
      {file.type === "pdf" ? (
        <div className="h-[70vh] flex flex-col min-h-0">
          <DocumentViewer showMinimap={false} hideActionBar fileOverride={{ url, language: file.language }} />
        </div>
      ) : (
        <div className="flex items-center justify-center py-4">
          <FileViewerBody file={file} url={url} />
        </div>
      )}
    </Modal>
  );
}

/** The Document tab's way to the same list: the tab's strip (or, in the
 *  Library preview, its action bar, `inBar`) has room for one button, and the
 *  page under it is the document. Hidden when the entity has no files. */
export function EntityFilesMenu({ profile, inBar = false }: { profile: EntityProfile; inBar?: boolean }) {
  const { files } = useEntityFiles(profile);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // On a phone the strip's button is not at the screen's edge, so a panel
  // aligned to it runs off the other side: there it spans the screen, on the
  // 12px gutter, under the button.
  const [phoneTop, setPhoneTop] = useState<number | null>(null);
  const toggle = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    setPhoneTop(!inBar && r && window.innerWidth < 768 ? r.bottom + 4 : null);
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element;
      // The file preview is a dialog portalled out of the popover; a click in
      // it is not a click away.
      if (wrapRef.current?.contains(t) || t.closest?.('[role="dialog"]')) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (files.length === 0) return null;
  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`Files, ${files.length}`}
        // In a bar, on the bar ladder; in the strip, the format picker's look.
        className={`flex items-center gap-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
          inBar ? `px-3 py-1.5 ${BAR_GHOST} aria-expanded:bg-warm` : "px-2 py-1 text-ink-secondary bg-warm hover:bg-parchment"
        }`}
      >
        <Download size={12} className="text-ink-tertiary" aria-hidden />
        <span className={inBar ? "" : "hidden md:inline"}>Files</span>
        <span className="tabular-nums text-ink-tertiary">{files.length}</span>
        <ChevronDown size={12} className={`text-ink-tertiary transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div
          data-gutter-host
          style={phoneTop !== null ? { position: "fixed", top: phoneTop, left: "0.75rem", right: "0.75rem", width: "auto" } : undefined}
          className={`gutter-host absolute z-30 ${inBar ? "start-0 bottom-full mb-1.5" : "end-0 top-full mt-1"} w-[min(26rem,calc(100vw-1.5rem))] max-h-[min(32rem,70vh)] overflow-auto rounded-md bg-paper border border-border shadow-xl py-2 animate-fade-in-up`}
        >
          <EntityFilesBlock profile={profile} bare />
        </div>
      )}
    </div>
  );
}
