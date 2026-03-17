import { useState } from "react";
import { FileText, Music, Link2, Download, Trash2, Pencil, Files, MousePointerClick } from "lucide-react";
import { DrawerTabs } from "../layout/DrawerTabs";
import { FileEntry } from "../../data/files";

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
  { id: "translations", label: "Translations", count: 3 },
];

export function FileDrawer({ selectedFiles }: FileDrawerProps) {
  const [activeTab, setActiveTab] = useState("file");

  return (
    <div className="flex flex-col h-full">
      <DrawerTabs tabs={drawerTabs} activeId={activeTab} onChange={setActiveTab} />

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
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <Files size={32} className="text-ink-muted/40" />
            <div>
              <p className="text-sm font-medium text-ink-muted">
                {selectedFiles.length} files selected
              </p>
              <p className="text-xs text-ink-muted mt-1">
                Select a single file to view its details
              </p>
            </div>
          </div>
        ) : (
          <FileDetails file={selectedFiles[0]} />
        )}
      </div>

      {/* Action bar */}
      {selectedFiles.length === 1 && (
        <div
          className="flex items-center justify-between h-12 px-4 shrink-0"
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
    </div>
  );
}

function FileDetails({ file }: { file: FileEntry }) {
  const Icon = typeIcons[file.type];

  return (
    <>
      {/* File metadata card */}
      <div className="rounded-lg bg-warm p-4 space-y-3">
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

      {/* Description card */}
      <div className="rounded-lg bg-warm p-4 space-y-2">
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
