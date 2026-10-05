import { useRef, useState, type ReactNode } from "react";
import { CloudUpload, FileSpreadsheet } from "lucide-react";

/** The file picker the Import CSV flow uses: a dashed warm well that opens
 *  the file chooser or takes a dropped file, and, once a file is chosen,
 *  a row naming it with Remove.
 *
 *  - `onFile` receives a real `File` (thesaurus import reads it).
 *  - `onBrowse` replaces the chooser (the Import CSV demo picks a sample
 *    name instead of reading a file).
 *  - `file` is what is chosen; with it the well becomes the file row. */
export function Dropzone({
  onFile,
  onBrowse,
  onRemove,
  file,
  accept = ".csv,text/csv",
  title = "Select a CSV file",
  hint = "or drag and drop here",
  labelledBy,
}: {
  onFile?: (file: File) => void;
  onBrowse?: () => void;
  onRemove?: () => void;
  file?: { name: string; detail?: ReactNode } | null;
  accept?: string;
  title?: string;
  hint?: string;
  /** The id of the label naming the picker. */
  labelledBy?: string;
}) {
  const input = useRef<HTMLInputElement | null>(null);
  const [over, setOver] = useState(false);

  if (file)
    return (
      <div
        data-component="Dropzone"
        data-part="selected-file"
        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-warm"
        style={{ border: "1px solid var(--border-primary)" }}
      >
        <FileSpreadsheet size={18} className="text-success shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 flex flex-col">
          <span className="text-sm font-medium text-ink truncate">{file.name}</span>
          {file.detail && <span className="text-xs text-ink-tertiary truncate">{file.detail}</span>}
        </span>
        {onRemove && (
          <button
            type="button"
            data-part="remove-file"
            aria-label={`Remove ${file.name}`}
            onClick={onRemove}
            className="text-xs text-ink-tertiary hover:text-ink transition-colors cursor-pointer"
          >
            Remove
          </button>
        )}
      </div>
    );

  return (
    <div data-component="Dropzone">
      <button
        type="button"
        data-part="dropzone"
        data-state={over ? "over" : undefined}
        aria-labelledby={labelledBy}
        onClick={() => (onBrowse ? onBrowse() : input.current?.click())}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile?.(f);
        }}
        className={`flex flex-col items-center justify-center w-full py-8 rounded-lg transition-colors cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30 ${over ? "bg-parchment" : "bg-warm hover:bg-parchment"}`}
        style={{ border: "2px dashed var(--border-soft)" }}
      >
        <CloudUpload size={32} className="text-ink-tertiary/40 mb-2" aria-hidden />
        <span className="text-sm font-medium text-ink-secondary">{title}</span>
        <span className="text-xs text-ink-muted mt-1">{hint}</span>
      </button>
      {!onBrowse && (
        <input
          ref={input}
          type="file"
          accept={accept}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            // Cleared, so choosing the same file again still reports it.
            e.target.value = "";
            if (f) onFile?.(f);
          }}
        />
      )}
    </div>
  );
}
