import { useId, useRef, useState } from "react";
import { FileText, Image, Link2, Music, Plus, Video, X } from "lucide-react";
import type { FileKind } from "../../data/files";
import { fileKindOf, type DraftFile } from "../../utils/createEntity";
import { FILE_LIMIT, FILE_LIMIT_LABEL } from "../../atoms/fileUploads";
import { droppedFiles, dragHasFiles } from "../../utils/pickFiles";
import { BAR_GHOST } from "../shared/warmButton";

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

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

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

  const add = (picked: { file: File; handle?: FileSystemFileHandle }[], role: DraftFile["role"]) => {
    const taken = new Set(files.map((f) => `${f.file.name}:${f.file.size}`));
    const added: DraftFile[] = [];
    const out: string[] = [];
    let moved = 0;
    for (const { file, handle } of picked) {
      const key = `${file.name}:${file.size}`;
      if (file.size === 0) out.push(`${file.name} is empty`);
      else if (file.size > FILE_LIMIT) out.push(`${file.name} is larger than ${FILE_LIMIT_LABEL}`);
      else if (taken.has(key)) out.push(`${file.name} is already listed`);
      else {
        taken.add(key);
        const pdf = fileKindOf(file.name, file.type) === "pdf";
        if (role === "document" && !pdf) moved++;
        added.push({ key: `draft-file-${++seq}`, file, ...(handle ? { handle } : {}), role: role === "document" && !pdf ? "supporting" : role });
      }
    }
    if (added.length) onChange([...files, ...added]);
    const parts = [
      added.length ? `${plural(added.length, "file")} added` : "",
      moved ? `${plural(moved, "file")} not a PDF, listed under Supporting files` : "",
      out.length ? `Left out: ${out.join("; ")}` : "",
    ].filter(Boolean);
    setStatus(parts.join(". ") + (parts.length ? "." : ""));
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
    onChange(files.filter((x) => x !== f));
    setStatus(
      f.role === "document" && index === 0 && documents.length > 1
        ? `${f.file.name} removed. ${documents[1].file.name} is now the primary document.`
        : `${f.file.name} removed.`,
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
        help="PDF. The first is the primary document."
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
      {/* Always mounted at one line, so a message shifts nothing below it. */}
      <p role="status" aria-live="polite" className="min-h-4 text-xs text-ink-secondary">
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
      <div className="flex items-baseline gap-2">
        <span id={headingId} className="text-xs font-medium text-ink-secondary">
          {title}
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
