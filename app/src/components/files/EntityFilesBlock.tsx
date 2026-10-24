import { useState } from "react";
import { useAtomValue } from "jotai";
import { Download } from "lucide-react";
import { filesAtom, documentGroupsAtom } from "../../atoms/files";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { languageName } from "../../atoms/language";
import type { DocumentGroup, FileEntry, FileKind } from "../../data/files";
import type { EntityProfile } from "../../data/entityProfiles";
import { useNotify } from "../../hooks/useNotify";
import { Hint } from "../shared/Hint";
import { ListCardRow } from "../shared/ListCardRow";
import { Modal, MODAL_BUTTON } from "../shared/Modal";
import { SectionLabel } from "../shared/SectionLabel";
import { noStrayWords } from "../../utils/typography";
import { UploadStateMark } from "../library/UploadStateMark";
import { BAR_GHOST, BAR_LEAD } from "../shared/warmButton";
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

/** The record lists this many files before "Show all": a record holding a
 *  dozen translations and recordings would otherwise push its metadata a
 *  screen down. */
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

/** The name without its extension: the kind is said once, in the facts line.
 *  A link is shown as it is. */
const shownName = (file: FileEntry) => (file.type === "link" ? file.name : file.name.replace(/\.[A-Za-z0-9]{1,5}$/, ""));

/** "PDF · 213 KB · English": only the facts the file has. CEJIL files carry
 *  no size, and a language of "—" is none. */
function factsOf(file: FileEntry): string {
  return [KIND_LABEL[file.type], file.size && file.size !== "—" ? file.size : "", file.language && file.language !== "—" ? languageName(file.language) : ""]
    .filter(Boolean)
    .join(" · ");
}

/** Phones get 44px targets: the heading's and footer's buttons grow (their
 *  line grows with them, on phones only); the row's Download grows into the
 *  row's padding, so the row keeps its height and the icon its place. */
const TOUCH_TALL = "max-md:h-11";

const linkHref = (file: FileEntry) => (file.name.startsWith("http") ? file.name : `https://${file.name}`);

/** An entity's files. The row is the View target; Download is the one control
 *  drawn on it. Download all sits in the heading when two or more files can be
 *  downloaded. One component for the record (the Metadata tab, the Library
 *  drawer preview, the entity view's Metadata drawer), so the reader can take
 *  a file without going to the Files tab. Nothing here is solid ink: no action
 *  in it is a commit.
 *
 *  Renders nothing for an entity with no files. */
export function EntityFilesBlock({ profile }: { profile: EntityProfile }) {
  const { files, groups } = useEntityFiles(profile);
  const notify = useNotify();
  const [previewing, setPreviewing] = useState<FileEntry | null>(null);
  const [expanded, setExpanded] = useState(false);

  const sections = sectionsOf(files, groups);
  const shown = sections.flatMap((s) => s.files);
  if (shown.length === 0) return null;
  const downloadable = shown.filter((f) => f.type !== "link" && !!resolveFileUrl(f));
  // A sub-label only where it tells sections apart.
  const labelled = sections.length > 1;
  const folds = !expanded && shown.length > FOLD_AFTER + 1;
  // The sections cut at the fold, in order: the first FOLD_AFTER rows.
  let room = folds ? FOLD_AFTER : Infinity;
  const visible = sections
    .map((sec) => {
      const list = sec.files.slice(0, Math.max(0, room));
      room -= list.length;
      return { ...sec, files: list };
    })
    .filter((sec) => sec.files.length > 0);

  return (
    <section
      data-component="EntityFilesBlock"
      aria-label="Files"
      className="bg-paper border border-border/40 rounded-md overflow-hidden"
    >
      <div className="flex items-center gap-2 min-h-8 max-md:min-h-11 px-4 pt-2">
        <h3 className="flex-1 min-w-0 text-meta font-semibold uppercase tracking-wider text-ink-secondary">Files</h3>
        {/* A record made by an upload, or whose files are still on their way:
            the same mark its Library card carries. */}
        <UploadStateMark entityId={profile.id} />
        {downloadable.length > 1 && (
          <button
            type="button"
            data-part="download-all"
            onClick={() =>
              notify(
                `Download all puts the ${downloadable.length} files in one .zip on the server. This prototype has no server: download each file from its row.`,
                "info",
              )
            }
            className={`h-8 ${TOUCH_TALL} px-2.5 -me-2.5 text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer`}
          >
            Download all
          </button>
        )}
      </div>
      {visible.map((s) => (
        <div key={s.key}>
          {labelled && (
            <SectionLabel as="h4" className="pt-2 pb-1 px-4">
              {/* One line on a desktop; on a phone a record's long name wraps to
                  two lines before it clamps, the whole name in the tooltip and
                  in the heading's text. */}
              <span title={s.label} className="min-w-0 md:truncate max-md:line-clamp-2">
                {noStrayWords(s.label)}
              </span>
            </SectionLabel>
          )}
          <ul>
            {s.files.map((f) => (
              <li key={f.id}>
                <FileRow file={f} onView={() => setPreviewing(f)} />
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
            className={`h-8 ${TOUCH_TALL} max-md:-my-1.5 px-2.5 -ms-2.5 text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer tabular-nums`}
          >
            Show all {shown.length} files
          </button>
        </div>
      )}
      {previewing && <FilePreview file={previewing} onClose={() => setPreviewing(null)} />}
    </section>
  );
}

/** One file: name and facts, the row a stretched View button (a link opens
 *  where it lives, in a new tab), Download its only drawn control. */
function FileRow({ file, onView }: { file: FileEntry; onView: () => void }) {
  const url = resolveFileUrl(file);
  const isLink = file.type === "link";
  return (
    <ListCardRow
      selected={false}
      toggle={false}
      onClick={isLink ? () => window.open(linkHref(file), "_blank", "noopener,noreferrer") : onView}
      ariaLabel={isLink ? `Open ${file.name} in a new tab` : `View ${file.name}`}
      className="px-4! hover:bg-warm/50"
    >
      <div className="flex items-center gap-3 min-w-0 min-h-8">
        <div className="flex-1 min-w-0">
          <p dir="ltr" title={file.name} className="text-sm font-medium text-ink truncate text-start">
            {shownName(file)}
          </p>
          <p className="text-xs text-ink-tertiary truncate">{factsOf(file)}</p>
        </div>
        {!isLink && url && (
          // Beside the icon: above it is the heading's Download all (or the
          // row before's icon), below it the next row's.
          <Hint text="Download" describe={false} placement="start">
            {(hint) => (
              <a
                {...hint}
                href={url}
                download={file.name}
                aria-label={`Download ${file.name}`}
                onClick={(e) => e.stopPropagation()}
                className={`flex items-center justify-center w-8 h-8 max-md:w-11 max-md:h-11 max-md:-my-1.5 max-md:-me-1.5 shrink-0 ${BAR_GHOST} rounded-md transition-colors cursor-pointer`}
              >
                <Download size={14} aria-hidden />
              </a>
            )}
          </Hint>
        )}
      </div>
    </ListCardRow>
  );
}

/** The file on its own, with Download in the footer. Read from the row, not
 *  from `viewerFileIdAtom`, so a previewed entity that is not focused opens
 *  its own file. Download leads by weight, not by fill: viewing was the
 *  reader's choice, and this is not a commit. */
function FilePreview({ file, onClose }: { file: FileEntry; onClose: () => void }) {
  const url = resolveFileUrl(file);
  return (
    <Modal
      component="FilePreview"
      size="xl"
      onClose={onClose}
      title={<span dir="ltr">{shownName(file)}</span>}
      subtitle={factsOf(file)}
      footer={
        <>
          <button type="button" onClick={onClose} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
            Close
          </button>
          {url && (
            <a href={url} download={file.name} aria-label={`Download ${file.name}`} className={`${MODAL_BUTTON} ${BAR_LEAD} flex items-center gap-1.5 cursor-pointer`}>
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
