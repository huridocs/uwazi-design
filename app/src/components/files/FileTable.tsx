import { FileText, Music, Link2, Eye } from "lucide-react";
import { useAtom } from "jotai";
import { FileEntry } from "../../data/files";
import { breakpointAtom } from "../../atoms/viewport";

interface FileTableProps {
  files: FileEntry[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
}

const typeIcons: Record<FileEntry["type"], typeof FileText> = {
  pdf: FileText,
  audio: Music,
  link: Link2,
  document: FileText,
};

const typeLabels: Record<FileEntry["type"], string> = {
  pdf: "PDF",
  audio: "Audio",
  link: "Link",
  document: "Document",
};

export function FileTable({ files, selectedIds, onSelect, onSelectAll }: FileTableProps) {
  const allSelected = files.length > 0 && files.every((f) => selectedIds.has(f.id));
  const [breakpoint] = useAtom(breakpointAtom);
  const isMobile = breakpoint === "mobile";

  if (isMobile) {
    return (
      <div
        className="rounded-md overflow-hidden bg-paper"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" }}
      >
        {files.map((file) => {
          const isSelected = selectedIds.has(file.id);
          const Icon = typeIcons[file.type];
          return (
            <div
              key={file.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(file.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(file.id); } }}
              className={`flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-warm ${isSelected ? "bg-warm" : ""}`}
              style={{
                borderBottom: "1px solid var(--border-primary)",
                boxShadow: isSelected ? "inset 3px 0 0 var(--accent-blue)" : "none",
              }}
            >
              <label className="flex items-center pt-0.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelect(file.id)}
                  className="w-3.5 h-3.5 rounded accent-ink cursor-pointer"
                />
              </label>
              <Icon size={16} className="text-ink-muted shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-ink truncate">{file.name}</span>
                  {file.isDefault && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-warning-light text-warning shrink-0">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-ink-tertiary">
                  <span>{typeLabels[file.type]}</span>
                  <span>•</span>
                  <span>{file.size}</span>
                  <span>•</span>
                  <span>{file.language}</span>
                </div>
                <div className="text-[10px] text-ink-muted mt-0.5">
                  {new Date(file.modified).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
              <button
                onClick={(e) => e.stopPropagation()}
                aria-label={`View ${file.name}`}
                className="flex items-center justify-center p-1.5 rounded hover:bg-parchment transition-colors shrink-0"
              >
                <Eye size={14} className="text-ink-tertiary" />
              </button>
            </div>
          );
        })}
        <div
          className="flex items-center justify-between px-3 h-10 text-xs text-ink-muted"
          style={{ backgroundColor: "var(--bg-warm)", borderTop: "1px solid var(--border-primary)" }}
        >
          <span>{files.length} files</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-md overflow-hidden bg-paper"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div
        className="grid items-center gap-3 px-4 h-10 text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider"
        style={{
          gridTemplateColumns: "28px 1fr 70px 70px 50px 90px 50px",
          backgroundColor: "var(--bg-warm)",
          borderBottom: "1px solid var(--border-primary)",
        }}
      >
        <label className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onSelectAll}
            className="w-3.5 h-3.5 rounded accent-ink cursor-pointer"
          />
        </label>
        <span>File name</span>
        <span>Type</span>
        <span>Size</span>
        <span>Lang</span>
        <span>Modified</span>
        <span>Action</span>
      </div>

      {/* Rows */}
      {files.map((file) => {
        const isSelected = selectedIds.has(file.id);
        const Icon = typeIcons[file.type];

        return (
          <div
            key={file.id}
            role="row"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(file.id); } }}
            className={`grid items-center gap-3 px-4 h-11 text-sm transition-colors cursor-pointer
              hover:bg-warm ${isSelected ? "bg-warm" : ""}`}
            style={{
              gridTemplateColumns: "28px 1fr 70px 70px 50px 90px 50px",
              borderBottom: "1px solid var(--border-primary)",
              boxShadow: isSelected ? "inset 3px 0 0 var(--accent-blue)" : "none",
            }}
            onClick={() => onSelect(file.id)}
          >
            <label className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelect(file.id)}
                className="w-3.5 h-3.5 rounded accent-ink cursor-pointer"
              />
            </label>

            <div className="flex items-center gap-2 min-w-0">
              <Icon size={14} className="text-ink-muted shrink-0" />
              <span className="text-xs font-medium text-ink truncate">{file.name}</span>
              {file.isDefault && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-warning-light text-warning shrink-0">
                  Default
                </span>
              )}
            </div>

            <span className="text-xs text-ink-tertiary">{typeLabels[file.type]}</span>
            <span className="text-xs text-ink-tertiary">{file.size}</span>
            <span className="text-xs text-ink-tertiary">{file.language}</span>
            <span className="text-xs text-ink-tertiary">
              {new Date(file.modified).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
              }}
              aria-label={`View ${file.name}`}
              className="flex items-center justify-center p-1 rounded hover:bg-parchment transition-colors"
            >
              <Eye size={14} className="text-ink-tertiary" />
            </button>
          </div>
        );
      })}

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 h-10 text-xs text-ink-muted"
        style={{
          backgroundColor: "var(--bg-warm)",
          borderTop: "1px solid var(--border-primary)",
        }}
      >
        <span>{files.length} files</span>
        <span>
          {files.filter((f) => f.type !== "link").length} documents,{" "}
          {files.filter((f) => f.type === "link").length} link
        </span>
      </div>
    </div>
  );
}
