import { useState } from "react";
import { FileText, Music, Link2, Download, Trash2, Pencil, MousePointerClick, Plus, ChevronRight } from "lucide-react";
import { DrawerTabs } from "../layout/DrawerTabs";
import { FileEntry, primaryFiles } from "../../data/files";
import { currentDocument } from "../../data/document";

const typeIcons: Record<FileEntry["type"], typeof FileText> = {
  pdf: FileText,
  audio: Music,
  link: Link2,
  document: FileText,
};

interface FileDrawerProps {
  selectedFiles: FileEntry[];
}

const drawerTabs = [
  { id: "file", label: "File" },
  { id: "translations", label: "Translations", count: 2 },
];

interface TranslationLang {
  code: string;
  name: string;
  file?: FileEntry;
}

const translationLanguages: TranslationLang[] = [
  { code: "EN", name: "English", file: primaryFiles.find((f) => f.language === "EN") },
  { code: "ES", name: "Español", file: primaryFiles.find((f) => f.language === "ES") },
  { code: "FR", name: "Français", file: primaryFiles.find((f) => f.language === "FR") },
  { code: "AR", name: "العربية" },
];

export function FileDrawer({ selectedFiles }: FileDrawerProps) {
  const [activeTab, setActiveTab] = useState("file");

  // Add "Default file" indicator next to tabs
  const defaultFile = selectedFiles.find((f) => f.isDefault);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs + Default file badge */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <div
          className="flex items-center rounded-md overflow-hidden w-fit"
          style={{
            border: "1px solid var(--border-primary)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
          }}
        >
          {drawerTabs.map((tab, i) => (
            <div key={tab.id} className="flex items-center">
              {i > 0 && <div className="w-px self-stretch bg-border" />}
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1 px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-vellum text-ink"
                    : "bg-paper text-ink-tertiary hover:text-ink-secondary"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="text-xs font-semibold text-ink-tertiary bg-warm px-1 rounded">
                    {tab.count}
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
        {defaultFile && (
          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-warning-light text-warning">
            Default
          </span>
        )}
      </div>

      {/* Tab content */}
      {activeTab === "file" ? (
        <>
          <div className="flex-1 overflow-auto p-3 space-y-3">
            {selectedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <MousePointerClick size={32} className="text-ink-muted/40" />
                <div>
                  <p className="text-sm font-medium text-ink-muted">No file selected</p>
                  <p className="text-xs text-ink-muted mt-1">
                    Click a file in the table to see its details
                  </p>
                </div>
              </div>
            ) : selectedFiles.length > 1 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-ink-tertiary mb-2">
                  {selectedFiles.length} files selected
                </p>
                {selectedFiles.map((file) => (
                  <FileCompactCard key={file.id} file={file} />
                ))}
              </div>
            ) : (
              <FileDetails file={selectedFiles[0]} />
            )}
          </div>

          {selectedFiles.length === 1 && (
            <div
              className="flex items-center justify-between h-12 px-3 shrink-0"
              style={{ borderTop: "1px solid var(--border-primary)" }}
            >
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors">
                <Pencil size={12} /> Edit
              </button>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors">
                  <Download size={12} /> Download
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-seal rounded-md hover:bg-seal/90 transition-colors">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          )}
          {selectedFiles.length > 1 && (
            <div
              className="flex items-center justify-between h-12 px-3 shrink-0"
              style={{ borderTop: "1px solid var(--border-primary)" }}
            >
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors">
                <Download size={12} /> Download all
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-seal rounded-md hover:bg-seal/90 transition-colors">
                <Trash2 size={12} /> Delete {selectedFiles.length}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex-1 overflow-auto p-3 space-y-4">
            {translationLanguages.map((lang) => (
              <div key={lang.code}>
                {/* Language header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-ink">{lang.name}</span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-vellum text-ink">
                    {lang.code}
                  </span>
                </div>

                {lang.file ? (
                  <div className="flex border border-border/50 rounded-md overflow-hidden bg-paper hover:bg-warm/50 transition-colors">
                    <div className="w-20 bg-warm flex items-center justify-center shrink-0 self-stretch">
                      <div className="bg-paper rounded shadow-sm w-14 h-16 flex items-center justify-center">
                        <span className="text-[8px] text-ink-muted">PDF</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-center gap-1">
                      <p className="text-sm font-bold text-ink truncate">{currentDocument.title}</p>
                      <p className="text-xs text-ink-muted truncate">{lang.file.name}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-ink-tertiary">Type</span>
                          <span className="text-[11px] font-medium text-ink">{lang.file.type.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-ink-tertiary">Size</span>
                          <span className="text-[11px] font-medium text-ink">{lang.file.size}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center pr-3 shrink-0">
                      <button className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-ink rounded border border-border hover:bg-parchment transition-colors">
                        <ChevronRight size={12} /> View
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Empty state */
                  <div
                    className="flex items-center justify-center gap-3 py-5 rounded-md"
                    style={{
                      border: "1.5px dashed var(--border-soft)",
                    }}
                  >
                    <Plus size={16} className="text-ink-muted" />
                    <span className="text-xs text-ink-muted">Add translation document</span>
                    <button className="px-2.5 py-1 text-[11px] font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors">
                      Add file
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Translations action bar */}
          <div
            className="flex items-center justify-between h-12 px-3 shrink-0"
            style={{ borderTop: "1px solid var(--border-primary)" }}
          >
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors">
              <Download size={12} /> Download all
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-seal rounded-md hover:bg-seal/90 transition-colors">
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function FileDetails({ file }: { file: FileEntry }) {
  const Icon = typeIcons[file.type];

  return (
    <>
      <div className="rounded-md bg-warm p-4 space-y-3">
        <h4 className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
          File metadata
        </h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Icon size={14} className="text-ink-muted" />
            <span className="text-sm font-medium text-ink">{file.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
            <Detail label="Type" value={file.type.toUpperCase()} />
            <Detail label="Size" value={file.size} />
            <Detail label="Language" value={file.language} />
            <Detail
              label="Modified"
              value={new Date(file.modified).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            />
          </div>
          {file.isDefault && (
            <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded bg-warning-light text-warning">
              Default document
            </span>
          )}
        </div>
      </div>

      <div className="rounded-md bg-warm p-4 space-y-2">
        <h4 className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
          Description
        </h4>
        <p className="text-xs text-ink-secondary leading-relaxed">
          No description available for this file.
        </p>
      </div>
    </>
  );
}

function FileCompactCard({ file }: { file: FileEntry }) {
  const Icon = typeIcons[file.type];

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-warm border border-border/40">
      <Icon size={14} className="text-ink-muted shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-ink truncate">{file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-ink-muted">{file.type.toUpperCase()}</span>
          <span className="text-[10px] text-ink-muted">{file.size}</span>
          <span className="text-[10px] text-ink-muted">{file.language}</span>
        </div>
      </div>
      {file.isDefault && (
        <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-warning-light text-warning shrink-0">
          Default
        </span>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] font-medium text-ink-muted uppercase tracking-wide">
        {label}
      </span>
      <p className="text-xs text-ink-secondary">{value}</p>
    </div>
  );
}
