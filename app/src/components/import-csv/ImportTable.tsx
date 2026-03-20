import { Eye } from "lucide-react";
import { StatusBadge } from "../shared/StatusBadge";
import { ProgressBar } from "../shared/ProgressBar";
import type { ImportEntry } from "../../data/imports";

interface ImportTableProps {
  imports: ImportEntry[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onView: (id: string) => void;
}

const cols = "1.75rem 5rem 1fr 7.5rem 7.5rem 4.375rem 3.75rem 5.625rem 2.75rem";

function progressColor(status: ImportEntry["status"]): "green" | "blue" | "red" {
  if (status === "failed") return "red";
  if (status === "processing" || status === "uploading") return "blue";
  return "green";
}

export function ImportTable({ imports, selectedIds, onSelect, onSelectAll, onView }: ImportTableProps) {
  const allSelected = imports.length > 0 && imports.every((i) => selectedIds.has(i.id));

  return (
    <div
      className="flex flex-col flex-1 min-h-0 rounded-md overflow-hidden bg-paper"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div
        className="grid items-center gap-3 px-4 h-10 shrink-0 text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider"
        style={{
          gridTemplateColumns: cols,
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
        <span>Status</span>
        <span>File</span>
        <span>Template</span>
        <span>Progress</span>
        <span>Entities</span>
        <span>Failed</span>
        <span>Date</span>
        <span className="text-center">View</span>
      </div>

      {/* Rows — fills available space, scrolls */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {imports.map((entry) => {
          const isSelected = selectedIds.has(entry.id);
          return (
            <div
              key={entry.id}
              role="row"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(entry.id);
                }
              }}
              className={`grid items-center gap-3 px-4 h-11 text-sm transition-colors cursor-pointer
                hover:bg-warm ${isSelected ? "bg-warm" : ""}`}
              style={{
                gridTemplateColumns: cols,
                borderBottom: "1px solid var(--border-primary)",
                boxShadow: isSelected ? "inset 3px 0 0 var(--accent-blue)" : "none",
              }}
              onClick={() => onSelect(entry.id)}
            >
              <label className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelect(entry.id)}
                  className="w-3.5 h-3.5 rounded accent-ink cursor-pointer"
                />
              </label>

              <StatusBadge status={entry.status} />

              <span className="text-xs font-medium text-ink truncate">{entry.filename}</span>
              <span className="text-xs text-ink-tertiary truncate">{entry.template}</span>

              <div className="pr-2">
                <ProgressBar value={entry.progress} color={progressColor(entry.status)} showLabel />
              </div>

              <span className="text-xs text-ink-tertiary tabular-nums">{entry.entities.toLocaleString()}</span>
              <span className={`text-xs tabular-nums ${entry.failed > 0 ? "text-seal font-medium" : "text-ink-tertiary"}`}>
                {entry.failed}
              </span>
              <span className="text-xs text-ink-tertiary">
                {new Date(entry.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onView(entry.id);
                }}
                aria-label={`View ${entry.filename}`}
                className="flex items-center justify-center p-1 rounded hover:bg-parchment transition-colors"
              >
                <Eye size={14} className="text-ink-tertiary" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 h-10 shrink-0 text-xs text-ink-muted"
        style={{
          backgroundColor: "var(--bg-warm)",
          borderTop: "1px solid var(--border-primary)",
        }}
      >
        <span>{imports.length} imports</span>
        <span>
          {imports.reduce((sum, i) => sum + i.entities, 0).toLocaleString()} total entities
        </span>
      </div>
    </div>
  );
}
