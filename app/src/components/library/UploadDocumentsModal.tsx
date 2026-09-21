import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, X } from "lucide-react";
import type { EntityType } from "../../data/entities";
import { useFocusTrap } from "../../hooks/useFocusTrap";

const kb = (n: number) =>
  n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

/** Upload PDF, after the native file picker: one row per file with a title
 *  prefilled from its filename, and ONE template for the batch, preset to the
 *  corpus's upload default. Upload hands the batch back; the caller runs it as
 *  a single Beacon task.
 *
 *  A title per file because a filename is rarely a title ("2011-02-24_final_v3")
 *  and is the one thing an upload can't guess; one template for the batch
 *  because a batch is almost always one kind of document, and a select per row
 *  would be eight identical choices. Portalled and fixed, focus-trapped,
 *  Escape and the scrim close it. */
export function UploadDocumentsModal({
  files,
  types,
  defaultTypeId,
  onUpload,
  onClose,
}: {
  files: File[];
  types: EntityType[];
  defaultTypeId: string;
  onUpload: (batch: { typeId: string; uploads: { file: File; title: string }[] }) => void;
  onClose: () => void;
}) {
  const panelRef = useFocusTrap<HTMLDivElement>(true);
  const titleId = useId();
  const selectId = useId();
  const [typeId, setTypeId] = useState(
    types.some((t) => t.id === defaultTypeId) ? defaultTypeId : (types[0]?.id ?? defaultTypeId),
  );
  const [titles, setTitles] = useState(() => files.map((f) => f.name.replace(/\.pdf$/i, "")));
  const blank = titles.some((t) => !t.trim());
  const n = files.length;

  return createPortal(
    <div
      data-component="UploadDocumentsModal"
      data-part="scrim"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        className="w-full max-w-[32rem] max-h-[min(34rem,100%)] flex flex-col bg-paper rounded-lg border border-border shadow-lg overflow-hidden"
      >
        <header className="shrink-0 flex items-center gap-2 h-11 px-3 border-b border-border">
          <h2 id={titleId} className="text-xs font-semibold text-ink">
            Upload {n} {n === 1 ? "document" : "documents"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ms-auto p-1 rounded-md text-ink-muted hover:bg-warm hover:text-ink cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
          >
            <X size={14} />
          </button>
        </header>

        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border">
          <label htmlFor={selectId} className="text-xs font-medium text-ink-secondary">
            Template
          </label>
          <select
            id={selectId}
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            className="flex-1 min-w-0 h-8 px-2 text-xs text-ink bg-warm rounded-md cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <ul className="flex-1 overflow-auto px-3 py-2 space-y-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex flex-col gap-1">
              <label
                htmlFor={`${titleId}-t${i}`}
                className="flex items-center gap-1.5 text-meta text-ink-tertiary"
              >
                <FileText size={12} aria-hidden className="shrink-0" />
                <span className="truncate">{f.name}</span>
                <span className="shrink-0 tabular-nums">· {kb(f.size)}</span>
              </label>
              <input
                id={`${titleId}-t${i}`}
                value={titles[i]}
                onChange={(e) => setTitles((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))}
                aria-label={`Title for ${f.name}`}
                autoFocus={i === 0}
                className="h-8 px-2 text-xs text-ink bg-paper rounded-md border border-border
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
              />
            </li>
          ))}
        </ul>

        <footer className="shrink-0 h-12 flex items-center gap-2 px-3 border-t border-border">
          {/* Always mounted, contents toggling — the button beside it doesn't move. */}
          <span className="me-auto text-meta text-ink-tertiary">{blank ? "Every document needs a title." : ""}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink
              rounded-md transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={blank}
            onClick={() =>
              onUpload({ typeId, uploads: files.map((file, i) => ({ file, title: titles[i].trim() })) })
            }
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              blank ? "bg-vellum text-ink-muted cursor-not-allowed" : "bg-ink text-paper hover:bg-ink/90 cursor-pointer"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30`}
          >
            Upload
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
