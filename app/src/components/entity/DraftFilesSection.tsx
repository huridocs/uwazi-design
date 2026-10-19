import { useId, useRef, useState } from "react";
import { FileText, Image, Link2, Music, Plus, Video, X } from "lucide-react";
import type { FileKind } from "../../data/files";
import { fileKindOf, type DraftFile } from "../../utils/createEntity";
import { FILE_LIMIT, FILE_LIMIT_LABEL } from "../../atoms/fileUploads";
import { droppedFiles, dragHasFiles } from "../../utils/pickFiles";
import { BAR_GHOST } from "../shared/warmButton";
import { SectionLabel } from "../shared/SectionLabel";

const KIND_ICON: Record<FileKind, typeof FileText> = {
  pdf: FileText,
  document: FileText,
  audio: Music,
  video: Video,
  image: Image,
  link: Link2,
};

const KIND_LABEL: Record<FileKind, string> = {
  pdf: "PDF",
  document: "Document",
  audio: "Audio",
  video: "Video",
  image: "Image",
  link: "Link",
};

const sizeLabel = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`;

/** The type a row names: the extension where there is one, else the kind. */
const typeLabel = (f: File) => {
  const ext = f.name.includes(".") ? f.name.split(".").pop()!.toUpperCase() : "";
  return ext && ext.length <= 5 ? ext : KIND_LABEL[fileKindOf(f.name, f.type)];
};

// The count is bound to its noun, so a line never ends on the number.
const plural = (n: number, one: string, many = `${one}s`) => `${n}\u00a0${n === 1 ? one : many}`;

/** "2 documents and 1 supporting file"; "no files" when both are 0. */
function countLine(documents: number, supporting: number): string {
  const parts = [documents ? plural(documents, "document") : "", supporting ? plural(supporting, "supporting file") : ""].filter(Boolean);
  return parts.join(" and ") || "no files";
}

/** Names when there are one or two, else the count: the status line holds
 *  two lines at most. */
const which = (names: string[]) => (names.length <= 2 ? names.join(" and ") : plural(names.length, "file"));

let seq = 0;

/** A new entity's files, on its draft form: Documents (PDFs; the first is
 *  the primary document, which the Document tab opens) and Supporting files
 *  (any type). Nothing is uploaded here: the form holds the files, and they
 *  go to the upload queue once the entity is saved (`attachUploadsAtom`).
 *
 *  Each list takes picking and dropping on its own drop zone, a button, so
 *  the keyboard reaches it. A file that is not a PDF dropped on Documents
 *  joins Supporting files; an empty file, one over the limit or one already
 *  listed is left out. Each change is said in the status line, which is
 *  always mounted at one line's height. */
export function DraftFilesSection({ files, onChange }: { files: DraftFile[]; onChange: (next: DraftFile[]) => void }) {
  const [status, setStatus] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const documents = files.filter((f) => f.role === "document");
  const supporting = files.filter((f) => f.role === "supporting");

  /** The status line after a change: what changed, and what is listed now. */
  const listed = (next: DraftFile[]) =>
    `Listed: ${countLine(next.filter((f) => f.role === "document").length, next.filter((f) => f.role === "supporting").length)}.`;

  const add = (picked: { file: File; handle?: FileSystemFileHandle }[], role: DraftFile["role"]) => {
    const taken = new Set(files.map((f) => `${f.file.name}:${f.file.size}`));
    const added: DraftFile[] = [];
    const empty: string[] = [];
    const large: string[] = [];
    const twice: string[] = [];
    const moved: string[] = [];
    for (const { file, handle } of picked) {
      const key = `${file.name}:${file.size}`;
      if (file.size === 0) empty.push(file.name);
      else if (file.size > FILE_LIMIT) large.push(file.name);
      else if (taken.has(key)) twice.push(file.name);
      else {
        taken.add(key);
        const pdf = fileKindOf(file.name, file.type) === "pdf";
        if (role === "document" && !pdf) moved.push(file.name);
        added.push({ key: `draft-file-${++seq}`, file, ...(handle ? { handle } : {}), role: role === "document" && !pdf ? "supporting" : role });
      }
    }
    const next = added.length ? [...files, ...added] : files;
    if (added.length) onChange(next);
    const out = [
      empty.length ? `${which(empty)} (empty)` : "",
      large.length ? `${which(large)} (over ${FILE_LIMIT_LABEL})` : "",
      twice.length ? `${which(twice)} (already listed)` : "",
    ].filter(Boolean);
    setStatus(
      [
        added.length
          ? `Added ${countLine(added.filter((f) => f.role === "document").length, added.filter((f) => f.role === "supporting").length)}.`
          : "",
        moved.length ? `${which(moved)} ${moved.length === 1 ? "is not a PDF, so it is" : "are not PDFs, so they are"} under Supporting files.` : "",
        out.length ? `Left out: ${out.join(", ")}.` : "",
        added.length ? listed(next) : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
  };

  /** After a row goes, the focus moves to the next row's Remove, else the
   *  previous one's, else the list's drop zone: never to the page. */
  const focusAfterRemove = (role: DraftFile["role"], index: number) => {
    requestAnimationFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      const removes = root.querySelectorAll<HTMLButtonElement>(`[data-list="${role}"] [data-part="remove-file"]`);
      (removes[index] ?? removes[index - 1] ?? root.querySelector<HTMLButtonElement>(`[data-list="${role}"] [data-part="drop-zone"]`))?.focus();
    });
  };

  const remove = (f: DraftFile) => {
    const list = f.role === "document" ? documents : supporting;
    const index = list.indexOf(f);
    const next = files.filter((x) => x !== f);
    onChange(next);
    setStatus(
      f.role === "document" && index === 0 && documents.length > 1
        ? `Removed ${f.file.name}. ${documents[1].file.name} is now the primary document.`
        : `Removed ${f.file.name}. ${listed(next)}`,
    );
    focusAfterRemove(f.role, index);
  };

  const makePrimary = (f: DraftFile) => {
    onChange([f, ...files.filter((x) => x !== f)]);
    setStatus(`${f.file.name} is now the primary document.`);
    requestAnimationFrame(() =>
      rootRef.current?.querySelector<HTMLButtonElement>(`[data-file-key="${f.key}"] [data-part="remove-file"]`)?.focus(),
    );
  };

  return (
    <div ref={rootRef} data-component="DraftFilesSection" data-drop-owner className="space-y-3">
      <FileList
        role="document"
        title="Documents"
        help={"PDF. The\u00a0first is the primary document."}
        accept=".pdf,application/pdf"
        files={documents}
        onAdd={(picked) => add(picked, "document")}
        onRemove={remove}
        onMakePrimary={makePrimary}
      />
      <FileList
        role="supporting"
        title="Supporting files"
        help="Any type."
        files={supporting}
        onAdd={(picked) => add(picked, "supporting")}
        onRemove={remove}
      />
      <p className="text-xs text-ink-tertiary">Files upload after the entity is saved.</p>
      {/* Always mounted at two lines' height, so no message moves anything:
          it names at most two files and counts the rest. */}
      <p role="status" aria-live="polite" className="h-8 line-clamp-2 text-xs text-ink-secondary">
        {status}
      </p>
    </div>
  );
}

function FileList({
  role,
  title,
  help,
  accept,
  files,
  onAdd,
  onRemove,
  onMakePrimary,
}: {
  role: DraftFile["role"];
  title: string;
  help: string;
  accept?: string;
  files: DraftFile[];
  onAdd: (picked: { file: File; handle?: FileSystemFileHandle }[]) => void;
  onRemove: (f: DraftFile) => void;
  onMakePrimary?: (f: DraftFile) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const headingId = `${id}-title`;
  const helpId = `${id}-help`;

  return (
    <div data-list={role} role="group" aria-labelledby={headingId} className="space-y-1.5">
      {/* Sub-labels under the field's "Files" label: the caps label, as a
          field's own table header is (RelationshipFieldEditor). */}
      <div className="flex items-baseline gap-2">
        <span id={headingId}>
          <SectionLabel as="span">{title}</SectionLabel>
        </span>
        <span id={helpId} className="text-xs text-ink-tertiary">
          {help}
        </span>
      </div>
      {files.length > 0 && (
        <ul aria-labelledby={headingId} className="rounded-md border border-border divide-y divide-border-soft">
          {files.map((f, i) => {
            const kind = fileKindOf(f.file.name, f.file.type);
            const Icon = KIND_ICON[kind];
            const primary = role === "document" && i === 0;
            return (
              <li key={f.key} data-file-key={f.key} className="flex items-center gap-2 min-h-11 px-2.5 py-1.5">
                <Icon size={16} className="shrink-0 text-ink-muted" aria-hidden />
                <span className="min-w-0 flex-1 flex flex-col">
                  <span className="text-sm font-medium text-ink truncate" title={f.file.name}>
                    {f.file.name}
                  </span>
                  <span className="text-xs text-ink-tertiary tabular-nums">
                    {typeLabel(f.file)} · {sizeLabel(f.file.size)}
                  </span>
                </span>
                {role === "document" &&
                  (primary ? (
                    <span className="shrink-0 w-fit px-1.5 py-0.5 rounded-md bg-vellum text-meta font-semibold text-ink-secondary">
                      Primary
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-part="make-primary"
                      onClick={() => onMakePrimary?.(f)}
                      aria-label={`Make ${f.file.name} the primary document`}
                      className={`shrink-0 px-2 py-1 text-xs font-medium whitespace-nowrap rounded-md transition-colors cursor-pointer ${BAR_GHOST}
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30`}
                    >
                      Make primary
                    </button>
                  ))}
                <button
                  type="button"
                  data-part="remove-file"
                  onClick={() => onRemove(f)}
                  aria-label={`Remove ${f.file.name}`}
                  title="Remove"
                  className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink transition-colors cursor-pointer
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
                >
                  <X size={14} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {/* The drop zone is a button: Enter or Space opens the chooser, and a
          drop anywhere on it adds what was dropped, folders walked. */}
      <button
        type="button"
        data-part="drop-zone"
        data-state={over ? "over" : undefined}
        aria-describedby={helpId}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          if (!dragHasFiles(e.dataTransfer)) return;
          e.preventDefault();
          e.stopPropagation();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (!dragHasFiles(e.dataTransfer)) return;
          // The Library pane is a drop target too (`useLibraryDrop`): this
          // drop is the form's, not a new upload.
          e.preventDefault();
          e.stopPropagation();
          setOver(false);
          void droppedFiles(e.dataTransfer).then((picked) => picked.length && onAdd(picked));
        }}
        className={`flex items-center justify-center gap-1.5 w-full h-10 rounded-md text-xs transition-colors cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30 ${
            over ? "bg-parchment text-ink" : "bg-paper text-ink-secondary hover:bg-warm hover:text-ink"
          }`}
        style={{ border: "1.5px dashed var(--border-soft)" }}
      >
        <Plus size={14} className="text-ink-tertiary" aria-hidden />
        {over ? (
          <span>Drop to add</span>
        ) : (
          <span>
            <span className="font-medium">Add {role === "document" ? "documents" : "supporting files"}</span>
            <span className="text-ink-tertiary"> or drop them here</span>
          </span>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple
        tabIndex={-1}
        aria-label={`Choose ${role === "document" ? "documents" : "supporting files"}`}
        className="sr-only"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []).map((file) => ({ file }));
          // Cleared, so choosing the same file again still reports it.
          e.target.value = "";
          if (picked.length) onAdd(picked);
        }}
      />
    </div>
  );
}
