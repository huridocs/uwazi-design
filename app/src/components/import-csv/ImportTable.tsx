import { useAtom } from "jotai";
import { StatusBadge } from "../shared/StatusBadge";
import { ProgressBar } from "../shared/ProgressBar";
import { Checkbox } from "../shared/Checkbox";
import { breakpointAtom } from "../../atoms/viewport";
import type { ImportEntry } from "../../data/imports";

interface ImportTableProps {
  imports: ImportEntry[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onView: (id: string) => void;
}

const cols = "1.75rem 5.25rem 1fr 7.5rem 8.5rem 4.75rem 3.75rem 6.25rem 4.25rem";

function progressColor(status: ImportEntry["status"]): "green" | "blue" | "red" | "gray" {
  if (status === "failed") return "red";
  if (status === "processing" || status === "uploading") return "blue";
  if (status === "pending") return "gray";
  return "green";
}

function progressLabel(entry: ImportEntry): string {
  const total = entry.totalRows ?? entry.entities + entry.failed;
  if (entry.status === "pending") {
    return `0/${total.toLocaleString()}`;
  }
  if (entry.status === "uploading" || entry.status === "processing") {
    const current = entry.totalRows
      ? entry.entities + entry.failed
      : Math.round((entry.progress / 100) * total);
    return `${current.toLocaleString()}/${total.toLocaleString()}`;
  }
  if (entry.status === "failed") {
    const current = entry.entities + entry.failed;
    return `${current.toLocaleString()}/${total.toLocaleString()}`;
  }
  const current = entry.entities;
  return `${current.toLocaleString()}/${total.toLocaleString()}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

export function ImportTable({ imports, selectedIds, onSelect, onSelectAll, onView }: ImportTableProps) {
  const allSelected = imports.length > 0 && imports.every((i) => selectedIds.has(i.id));
  const [breakpoint] = useAtom(breakpointAtom);
  const isMobile = breakpoint === "mobile";

  if (isMobile) {
    return (
      <>
        <div className="flex-1 overflow-y-auto min-h-0">
          {imports.map((entry) => {
            const isSelected = selectedIds.has(entry.id);
            return (
              <div
                key={entry.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(entry.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(entry.id); } }}
                className={`flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-warm ${isSelected ? "bg-warm" : ""}`}
                style={{ borderBottom: "1px solid var(--border-primary)" }}
              >
                <label className="flex items-center pt-0.5" onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={isSelected} onChange={() => onSelect(entry.id)} ariaLabel={`Select ${entry.filename}`} />
                </label>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-sm font-medium text-ink truncate">{entry.filename}</span>
                    <StatusBadge status={entry.status} />
                  </div>
                  <div className="text-[11px] text-ink-tertiary truncate mb-1.5">{entry.template}</div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex-1"><ProgressBar value={entry.progress} color={progressColor(entry.status)} /></div>
                    <span className="text-[11px] text-ink-tertiary tabular-nums">{progressLabel(entry)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-ink-tertiary">
                    <span><span className="tabular-nums">{entry.entities.toLocaleString()}</span> entities</span>
                    {entry.failed > 0 && (
                      <span className="text-seal font-medium">
                        <span className="tabular-nums">{entry.failed}</span> failed
                      </span>
                    )}
                    <span className="ml-auto tabular-nums">{formatDate(entry.date)}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onView(entry.id); }}
                  className="px-2.5 py-1 text-[11px] font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors shrink-0"
                >
                  View
                </button>
              </div>
            );
          })}
        </div>
        <PaginationFooter total={imports.length} />
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <div
        className="grid items-center gap-3 px-4 h-10 shrink-0 text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider bg-warm"
        style={{
          gridTemplateColumns: cols,
          borderBottom: "1px solid var(--border-primary)",
        }}
      >
        <label className="flex items-center justify-center">
          <Checkbox checked={allSelected} onChange={onSelectAll} ariaLabel="Select all imports" />
        </label>
        <span>Status</span>
        <span>File</span>
        <span>Template</span>
        <span>Progress</span>
        <span>Entities</span>
        <span>Failed</span>
        <span>Date</span>
        <span className="text-center">Action</span>
      </div>

      {/* Rows */}
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
              }}
              onClick={() => onSelect(entry.id)}
            >
              <label className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={isSelected} onChange={() => onSelect(entry.id)} ariaLabel={`Select ${entry.filename}`} />
              </label>

              <StatusBadge status={entry.status} />

              <span className="text-xs font-medium text-ink truncate">{entry.filename}</span>
              <span className="text-xs text-ink-tertiary truncate">{entry.template}</span>

              <div className="flex items-center gap-2 pr-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <ProgressBar value={entry.progress} color={progressColor(entry.status)} />
                </div>
                <span className="text-[11px] text-ink-tertiary tabular-nums shrink-0">{progressLabel(entry)}</span>
              </div>

              <span className="text-xs text-ink-tertiary tabular-nums">
                {entry.status === "pending" ? "—" : entry.entities.toLocaleString()}
              </span>
              <span
                className={`text-xs tabular-nums ${entry.failed > 0 ? "text-seal font-medium" : "text-ink-tertiary"}`}
              >
                {entry.status === "pending" ? "—" : entry.failed}
              </span>
              <span className="text-xs text-ink-tertiary tabular-nums">{formatDate(entry.date)}</span>

              <div className="flex items-center justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (entry.status !== "pending") onView(entry.id);
                  }}
                  disabled={entry.status === "pending"}
                  className="px-2.5 py-1 text-[11px] font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors disabled:text-ink-muted disabled:hover:bg-transparent disabled:cursor-not-allowed"
                >
                  View
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <PaginationFooter total={imports.length} />
    </>
  );
}

function PaginationFooter({ total }: { total: number }) {
  return (
    <div
      className="flex items-center justify-between px-4 h-10 shrink-0 text-xs text-ink-tertiary bg-paper"
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      <span>
        Showing <span className="tabular-nums">1-{total}</span> of{" "}
        <span className="tabular-nums">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          className="h-6 w-6 flex items-center justify-center rounded border border-border text-ink-muted cursor-not-allowed"
          aria-label="Previous page"
          disabled
        >
          ‹
        </button>
        <span className="h-6 min-w-6 px-2 flex items-center justify-center rounded border border-border text-ink font-medium tabular-nums">
          1
        </span>
        <button
          className="h-6 w-6 flex items-center justify-center rounded border border-border text-ink-muted cursor-not-allowed"
          aria-label="Next page"
          disabled
        >
          ›
        </button>
      </div>
    </div>
  );
}
