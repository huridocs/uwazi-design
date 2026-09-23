import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { CloudUpload, FileSpreadsheet, ChevronDown } from "lucide-react";
import { templates } from "../../data/imports";
import { BAR_GHOST } from "../shared/warmButton";
import { Modal, MODAL_BUTTON } from "../shared/Modal";
import { MODAL_LABEL, ModalSearchField } from "../shared/ModalParts";

interface NewImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (filename: string, template: string) => void;
}

export function NewImportModal({ open, onClose, onImport }: NewImportModalProps) {
  const [file, setFile] = useState<string | null>(null);
  const [template, setTemplate] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  useEffect(() => {
    if (open) {
      setFile(null);
      setTemplate(null);
      setDropdownOpen(false);
      setSearch("");
    }
  }, [open]);

  // Escape closes the dialog (`Modal`). With the template list open, Escape
  // closes the LIST first and puts focus back on its trigger; closing the whole
  // dialog from inside a popover loses the reader's place. The list's handler
  // runs first and `preventDefault`s, so the modal leaves that Escape alone.
  const onListKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || !dropdownOpen) return;
    e.preventDefault();
    setDropdownOpen(false);
    triggerRef.current?.focus();
  };

  if (!open) return null;

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const canImport = file && template;

  const simulateFileSelect = () => {
    const names = ["violations.csv", "testimonies.csv", "rulings.csv", "organizations.csv", "rights.csv"];
    setFile(names[Math.floor(Math.random() * names.length)]);
  };

  return (
    <Modal
      component="NewImportModal"
      size="lg"
      // Not dismissed by the scrim: a half-filled import isn't thrown away by a stray click.
      dismissOnScrim={false}
      onClose={onClose}
      title="New Import"
      titleId="import-modal-title"
      bodyClassName="py-4 space-y-5"
      footer={
        <>
          <button
            type="button"
            data-part="cancel"
            onClick={onClose}
            className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}
          >
            Cancel
          </button>
          <button
            type="button"
            data-part="submit"
            onClick={() => {
              if (canImport) onImport(file!, template!);
            }}
            disabled={!canImport}
            className={`${MODAL_BUTTON} ${
              canImport
                ? "bg-ink text-parchment hover:bg-ink/90 cursor-pointer"
                : "bg-warm text-ink-muted cursor-not-allowed"
            }`}
          >
            Import
          </button>
        </>
      }
    >
      {/* Dropzone */}
      {/* The title names the group, not a control: the picker is a button. */}
      <div data-part="file" role="group" aria-labelledby="import-modal-file-label">
        <span id="import-modal-file-label" className={`${MODAL_LABEL} mb-1`}>CSV File</span>
        {file ? (
          <div
            data-part="selected-file"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-warm"
            style={{ border: "1px solid var(--border-primary)" }}
          >
            <FileSpreadsheet size={18} className="text-success shrink-0" aria-hidden />
            <span className="text-sm font-medium text-ink flex-1 truncate">{file}</span>
            <button
              type="button"
              data-part="remove-file"
              aria-label={`Remove ${file}`}
              onClick={() => setFile(null)}
              className="text-xs text-ink-tertiary hover:text-ink transition-colors"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-part="dropzone"
            onClick={simulateFileSelect}
            className="flex flex-col items-center justify-center w-full py-8 rounded-lg bg-warm hover:bg-parchment transition-colors cursor-pointer"
            style={{ border: "2px dashed var(--border-soft)" }}
          >
            <CloudUpload size={32} className="text-ink-tertiary/40 mb-2" aria-hidden />
            <span className="text-sm font-medium text-ink-secondary">
              Click to select a CSV file
            </span>
            <span className="text-xs text-ink-muted mt-1">or drag and drop here</span>
          </button>
        )}
      </div>

      {/* Template Select */}
      <div ref={dropdownRef} data-part="template" data-state={dropdownOpen ? "open" : "closed"} onKeyDown={onListKeyDown}>
        <span id="import-modal-template-label" className={`${MODAL_LABEL} mb-1`}>Template</span>
        {/* A DISCLOSURE, not a listbox: the popup is a search field and a
            list of pressed buttons, with no `listbox` / `option` roles and no
            arrow-key selection. `aria-haspopup="listbox"` would promise that
            behaviour; `aria-expanded` + `aria-controls` describe what is here. */}
        <button
          ref={triggerRef}
          type="button"
          data-part="template-trigger"
          aria-labelledby="import-modal-template-label import-modal-template-value"
          aria-expanded={dropdownOpen}
          aria-controls={dropdownOpen ? "import-modal-template-list" : undefined}
          onClick={() => setDropdownOpen((o) => !o)}
          className={`flex items-center justify-between w-full h-8 px-2.5 rounded-md border border-border bg-paper text-xs transition-colors cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 ${
            template ? "text-ink" : "text-ink-muted"
          }`}
        >
          <span id="import-modal-template-value">{template || "Select a template..."}</span>
          <ChevronDown size={14} aria-hidden className={`text-ink-tertiary transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {dropdownOpen && (
          <div
            id="import-modal-template-list"
            data-part="template-popover"
            className="mt-1 w-full bg-paper border border-border rounded-lg shadow-lg overflow-hidden z-50"
          >
            <div data-part="search" role="search" className="flex px-2 py-2 border-b border-border">
              <ModalSearchField
                value={search}
                onChange={setSearch}
                placeholder="Search templates..."
                ariaLabel="Search templates"
                autoFocus
              />
            </div>
            <div data-part="options" className="max-h-48 overflow-y-auto py-1">
              {filtered.length > 0 && (
                <ul>
                  {filtered.map((t) => (
                    <li key={t.id} data-part="option">
                      <button
                        type="button"
                        aria-pressed={template === t.name}
                        onClick={() => {
                          setTemplate(t.name);
                          setDropdownOpen(false);
                          setSearch("");
                        }}
                        className={`flex items-center w-full h-9 px-3 text-start text-xs text-ink transition-colors cursor-pointer
                          focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-carbon/40 ${
                          template === t.name ? "bg-parchment" : "hover:bg-parchment"
                        }`}
                      >
                        {t.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {filtered.length === 0 && (
                <p data-part="empty" className="px-3 py-6 text-center text-xs text-ink-muted">No templates found</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
