import { useState, useRef, useEffect } from "react";
import { X, CloudUpload, FileSpreadsheet, ChevronDown, Search } from "lucide-react";
import { templates } from "../../data/imports";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="bg-paper rounded-xl shadow-xl w-full max-w-[35rem] animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
          <h2 id="import-modal-title" className="text-base font-semibold text-ink">New Import</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-parchment transition-colors"
          >
            <X size={18} className="text-ink-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Dropzone */}
          <div>
            <label className="text-xs font-medium text-ink-secondary mb-2 block">CSV File</label>
            {file ? (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-warm"
                style={{ border: "1px solid var(--border-primary)" }}
              >
                <FileSpreadsheet size={18} className="text-success shrink-0" />
                <span className="text-sm font-medium text-ink flex-1 truncate">{file}</span>
                <button
                  onClick={() => setFile(null)}
                  className="text-xs text-ink-tertiary hover:text-ink transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={simulateFileSelect}
                className="flex flex-col items-center justify-center w-full py-8 rounded-lg bg-warm hover:bg-parchment transition-colors cursor-pointer"
                style={{ border: "2px dashed var(--border-soft)" }}
              >
                <CloudUpload size={32} className="text-ink-tertiary/40 mb-2" />
                <span className="text-sm font-medium text-ink-secondary">
                  Click to select a CSV file
                </span>
                <span className="text-xs text-ink-muted mt-1">or drag and drop here</span>
              </button>
            )}
          </div>

          {/* Template Select */}
          <div ref={dropdownRef}>
            <label className="text-xs font-medium text-ink-secondary mb-2 block">Template</label>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                template ? "text-ink font-medium" : "text-ink-muted"
              }`}
              style={{ border: "1px solid var(--border-primary)", backgroundColor: "var(--bg-warm)" }}
            >
              <span>{template || "Select a template..."}</span>
              <ChevronDown size={14} className={`text-ink-tertiary transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div
                className="mt-1 w-full bg-paper border border-border rounded-lg shadow-lg overflow-hidden z-50"
              >
                <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--border-primary)" }}>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-warm" style={{ border: "1px solid var(--border-primary)" }}>
                    <Search size={13} className="text-ink-muted shrink-0" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search templates..."
                      className="flex-1 text-xs bg-transparent outline-none text-ink placeholder:text-ink-muted"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {filtered.map((t) => (
                    <button
                      key={t.id}
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
                  ))}
                  {filtered.length === 0 && (
                    <p className="px-4 py-3 text-xs text-ink-muted">No templates found</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid var(--border-primary)" }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md border border-border
              text-ink-secondary hover:bg-parchment transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (canImport) onImport(file!, template!);
            }}
            disabled={!canImport}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              canImport
                ? "bg-ink text-parchment hover:bg-ink/90"
                : "bg-warm text-ink-muted cursor-not-allowed border border-border"
            }`}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
