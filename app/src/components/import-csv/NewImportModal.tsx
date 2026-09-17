import { useState, useRef, useEffect } from "react";
import { X, CloudUpload, FileSpreadsheet, ChevronDown, Search } from "lucide-react";
import { templates } from "../../data/imports";
import { WARM_BUTTON } from "../shared/warmButton";
import { useFocusTrap } from "../../hooks/useFocusTrap";

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
  // The panel, not the scrim: Tab wraps inside it, focus moves in on open and
  // returns to the "New Import" trigger on close. `role="dialog"` +
  // `aria-modal` promised this; nothing delivered it.
  const panelRef = useFocusTrap<HTMLDivElement>(open);

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

  // Escape closes — same convention as the drawers/dialogs. With the template
  // list open, Escape closes the LIST first and puts focus back on its trigger;
  // closing the whole dialog from inside a popover loses the reader's place.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (dropdownOpen) {
        setDropdownOpen(false);
        triggerRef.current?.focus();
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, dropdownOpen]);

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
    <div
      data-component="NewImportModal"
      className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-4 bg-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div ref={panelRef} data-part="panel" className="bg-paper shadow-xl w-full md:max-w-[35rem] md:rounded-xl md:animate-fade-in-up h-full md:h-auto md:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div data-part="header" className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
          <h2 id="import-modal-title" data-part="title" className="text-base font-semibold text-ink">New Import</h2>
          <button
            type="button"
            data-part="close"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md hover:bg-parchment transition-colors"
          >
            <X size={18} className="text-ink-muted" aria-hidden />
          </button>
        </div>

        {/* Body — grows to fill the full-height mobile sheet so the footer
            pins to the bottom; scrolls if the form outgrows the cap. */}
        <div data-part="body" className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Dropzone */}
          {/* The title names the group, not a control: the picker is a button. */}
          <div data-part="file" role="group" aria-labelledby="import-modal-file-label">
            <span id="import-modal-file-label" className="text-xs font-medium text-ink-secondary mb-2 block">CSV File</span>
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
          <div ref={dropdownRef} data-part="template" data-state={dropdownOpen ? "open" : "closed"}>
            <span id="import-modal-template-label" className="text-xs font-medium text-ink-secondary mb-2 block">Template</span>
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
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                template ? "text-ink font-medium" : "text-ink-muted"
              }`}
              style={{ border: "1px solid var(--border-primary)", backgroundColor: "var(--bg-warm)" }}
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
                <div data-part="search" className="px-3 py-2" style={{ borderBottom: "1px solid var(--border-primary)" }}>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-warm" style={{ border: "1px solid var(--border-primary)" }}>
                    <Search size={13} className="text-ink-muted shrink-0" aria-hidden />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search templates..."
                      aria-label="Search templates"
                      className="flex-1 text-xs bg-transparent outline-none text-ink placeholder:text-ink-muted"
                      autoFocus
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        aria-label="Clear search"
                        className="p-0.5 rounded-full hover:bg-parchment text-ink-muted hover:text-ink cursor-pointer transition-colors shrink-0"
                      >
                        <X size={12} aria-hidden />
                      </button>
                    )}
                  </div>
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
                            className={`flex items-center w-full px-4 py-2 text-xs font-medium transition-colors ${
                              template === t.name
                                ? "text-ink bg-vellum"
                                : "text-ink-secondary hover:bg-warm"
                            }`}
                          >
                            {t.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {filtered.length === 0 && (
                    <p data-part="empty" className="px-4 py-3 text-xs text-ink-muted">No templates found</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div data-part="footer" className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid var(--border-primary)" }}>
          <button
            type="button"
            data-part="cancel"
            onClick={onClose}
            className={`px-3 py-1.5 text-xs font-medium rounded-md ${WARM_BUTTON} transition-colors cursor-pointer`}
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
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              canImport
                ? "bg-ink text-parchment hover:bg-ink/90 cursor-pointer"
                : "bg-warm text-ink-muted cursor-not-allowed"
            }`}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
