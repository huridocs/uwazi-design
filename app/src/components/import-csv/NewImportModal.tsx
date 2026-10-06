import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ChevronDown } from "lucide-react";
import { Dropzone } from "../shared/Dropzone";
import { BAR_GHOST } from "../shared/warmButton";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_COMMIT_DISABLED } from "../shared/Modal";
import { MODAL_LABEL, ModalSearchField } from "../shared/ModalParts";
import { FieldMessage } from "../shared/FieldMessage";
import { dataSourceAtom } from "../../atoms/dataSource";
import { templatesAtom } from "../../atoms/templates";
import { consumeFailureAtom } from "../../atoms/devSwitches";
import { useSettingsNotify } from "../../hooks/useSettingsNotify";

interface NewImportModalProps {
  open: boolean;
  onClose: () => void;
  /** The import is registered: the file and the template id. */
  onImport: (filename: string, templateId: string) => void;
}

const ACCEPTED = /\.(csv|zip)$/i;
/** How long the mocked upload takes. */
const UPLOAD_MS = 900;

/** Uwazi's `UploadFileModal`: one file (CSV or ZIP) and the template its rows
 *  become. Accept uploads, registers the import and closes; the job then runs
 *  in the background as a Beacon task. Closing discards the file; there is no
 *  dirty guard (Uwazi has none). */
export function NewImportModal({ open, onClose, onImport }: NewImportModalProps) {
  if (!open) return null;
  return <ImportForm onClose={onClose} onImport={onImport} />;
}

/** Mounted only while open, so Cancel discards the file and the template
 *  starts at the first one again. */
function ImportForm({ onClose, onImport }: Omit<NewImportModalProps, "open">) {
  const corpus = useAtomValue(dataSourceAtom);
  const templates = useAtomValue(templatesAtom(corpus));
  const consumeFailure = useSetAtom(consumeFailureAtom);
  const { fail } = useSettingsNotify();
  const [file, setFile] = useState<File | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id ?? "");
  const [listOpen, setListOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [upload, setUpload] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => () => clearInterval(timer.current), []);

  useEffect(() => {
    if (!listOpen) return;
    const onDown = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) setListOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [listOpen]);

  // With the template list open, Escape closes the list first and puts focus
  // back on its trigger; the modal leaves a prevented Escape alone.
  const onListKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || !listOpen) return;
    e.preventDefault();
    setListOpen(false);
    triggerRef.current?.focus();
  };

  const uploading = upload !== null;
  const template = templates.find((t) => t.id === templateId);
  const filtered = templates.filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase()));
  const canImport = !!file && !!template && !uploading;

  const pick = (f: File) => {
    if (!ACCEPTED.test(f.name)) {
      setRefused(`“${f.name}” is not a CSV or ZIP file.`);
      return;
    }
    setRefused(null);
    setFile(f);
  };

  const accept = () => {
    if (!canImport || !file) return;
    const started = Date.now();
    setUpload(0);
    timer.current = setInterval(() => {
      const pct = Math.min(100, Math.round(((Date.now() - started) / UPLOAD_MS) * 100));
      setUpload(pct);
      if (pct < 100) return;
      clearInterval(timer.current);
      const failure = consumeFailure("import");
      if (failure) {
        // The file and template stay, so Accept can be pressed again.
        fail(undefined, failure);
        setUpload(null);
        return;
      }
      onImport(file.name, templateId);
    }, 100);
  };

  return (
    <Modal
      component="NewImportModal"
      size="lg"
      // Not dismissed by the scrim: a chosen file isn't thrown away by a stray click.
      dismissOnScrim={false}
      onClose={() => !uploading && onClose()}
      title="Import CSV"
      titleId="import-modal-title"
      bodyClassName="py-4 space-y-5"
      footer={
        <>
          <button
            type="button"
            data-part="cancel"
            onClick={onClose}
            disabled={uploading}
            className={`${MODAL_BUTTON} ${BAR_GHOST} ${uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            Cancel
          </button>
          <button
            type="button"
            data-part="submit"
            onClick={accept}
            disabled={!canImport}
            aria-busy={uploading || undefined}
            className={`${canImport ? MODAL_COMMIT : MODAL_COMMIT_DISABLED} min-w-[7.5rem] tabular-nums`}
          >
            {uploading ? `Uploading... ${upload}%` : "Accept"}
          </button>
        </>
      }
    >
      {/* The label names the group, not a control: the picker is a button. */}
      <div data-part="file" role="group" aria-labelledby="import-modal-file-label" aria-describedby={refused ? "import-modal-file-error" : undefined}>
        <span id="import-modal-file-label" className={`${MODAL_LABEL} mb-1`}>
          File
        </span>
        <Dropzone
          onFile={pick}
          accept=".csv,.zip,text/csv,application/zip"
          title="Select a file"
          hint="CSV or ZIP"
          labelledBy="import-modal-file-label"
          file={file ? { name: file.name, detail: `${Math.max(1, Math.round(file.size / 1024)).toLocaleString()} KB` } : null}
          onRemove={uploading ? undefined : () => setFile(null)}
        />
        <FieldMessage id="import-modal-file-error" issue={refused ? { severity: "error", message: refused } : null} />
      </div>

      <div ref={listRef} data-part="template" data-state={listOpen ? "open" : "closed"} onKeyDown={onListKeyDown}>
        <span id="import-modal-template-label" className={`${MODAL_LABEL} mb-1`}>
          Template
        </span>
        {/* A disclosure, not a listbox: the popup is a search field and a list
            of pressed buttons, with no arrow-key selection. */}
        <button
          ref={triggerRef}
          type="button"
          data-part="template-trigger"
          disabled={uploading}
          aria-labelledby="import-modal-template-label import-modal-template-value"
          aria-expanded={listOpen}
          aria-controls={listOpen ? "import-modal-template-list" : undefined}
          onClick={() => setListOpen((o) => !o)}
          className="flex items-center justify-between w-full h-8 px-2.5 rounded-md border border-border bg-paper text-xs text-ink transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40"
        >
          <span id="import-modal-template-value">{template?.name ?? "No templates"}</span>
          <ChevronDown size={14} aria-hidden className={`text-ink-tertiary transition-transform ${listOpen ? "rotate-180" : ""}`} />
        </button>

        {listOpen && (
          <div
            id="import-modal-template-list"
            data-part="template-popover"
            className="mt-1 w-full bg-paper border border-border rounded-lg shadow-lg overflow-hidden z-50"
          >
            <div data-part="search" role="search" className="flex px-2 py-2 border-b border-border">
              <ModalSearchField value={search} onChange={setSearch} placeholder="Search templates…" ariaLabel="Search templates" autoFocus />
            </div>
            <div data-part="options" className="max-h-48 overflow-y-auto py-1">
              {filtered.length > 0 ? (
                <ul>
                  {filtered.map((t) => (
                    <li key={t.id} data-part="option">
                      <button
                        type="button"
                        aria-pressed={templateId === t.id}
                        onClick={() => {
                          setTemplateId(t.id);
                          setListOpen(false);
                          setSearch("");
                          triggerRef.current?.focus();
                        }}
                        className={`flex items-center w-full h-9 px-3 text-start text-xs text-ink transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-carbon/40 ${
                          templateId === t.id ? "bg-parchment" : "hover:bg-parchment"
                        }`}
                      >
                        {t.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p data-part="empty" className="px-3 py-6 text-center text-xs text-ink-secondary">
                  No templates match “{search.trim()}”
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
