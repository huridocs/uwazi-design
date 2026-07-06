import { useAtom } from "jotai";
import { StatusBadge } from "../shared/StatusBadge";
import { ProgressBar } from "../shared/ProgressBar";
import { Checkbox } from "../shared/Checkbox";
import { breakpointAtom } from "../../atoms/viewport";
import { useNotify } from "../../hooks/useNotify";
import { formatSlashDate } from "../../utils/dates";
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

// UTC-pinned so `YYYY-MM-DD` seeds don't render the previous day in the Americas.
const formatDate = formatSlashDate;

export function ImportTable({ imports, selectedIds, onSelect, onSelectAll, onView }: ImportTableProps) {
  const allSelected = imports.length > 0 && imports.every((i) => selectedIds.has(i.id));
  const [breakpoint] = useAtom(breakpointAtom);
  const isMobile = breakpoint === "mobile";
  const notify = useNotify();

  if (isMobile) {
    return (
      <>
        <div className="flex-1 overflow-y-auto min-h-0">
          {imports.map((entry) => {
            const isSelected = selectedIds.has(entry.id);
            return (
              <div
                key={entry.id}
                onClick={() => onSelect(entry.id)}
                className={`relative flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-warm ${isSelected ? "bg-parchment" : ""}`}
                style={{ borderBottom: "1px solid var(--border-primary)" }}
              >
                {/* Stretched primary action — the row hosts nested controls
                    (checkbox, View), so the container itself is not a button. */}
                <button
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`Select ${entry.filename}`}
                  onClick={(e) => { e.stopPropagation(); onSelect(entry.id); }}
                  className="absolute inset-0 w-full cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20"
                />
                <label className="relative flex items-center pt-0.5" onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={isSelected} onChange={() => onSelect(entry.id)} ariaLabel={`Select ${entry.filename}`} />
                </label>
                <div className="relative flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-sm font-medium text-ink truncate">{entry.filename}</span>
                    <StatusBadge status={entry.status} />
                  </div>
                  <div className="text-[11px] text-ink-tertiary truncate mb-1.5">{entry.template}</div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex-1"><ProgressBar value={entry.progress} color={progressColor(entry.status)} /></div>
                    <span dir="ltr" className="text-[11px] text-ink-tertiary tabular-nums">{progressLabel(entry)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-ink-tertiary">
                    <span><span className="tabular-nums">{entry.entities.toLocaleString()}</span> entities</span>
                    {entry.failed > 0 && (
                      <span className="text-seal font-medium">
                        <span className="tabular-nums">{entry.failed}</span> failed
                      </span>
                    )}
                    <span dir="ltr" className="ml-auto tabular-nums">{formatDate(entry.date)}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onView(entry.id); }}
                  className="relative px-2.5 py-1 text-[11px] font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors shrink-0"
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
        <SortHeader label="Status" onSort={notify} />
        <SortHeader label="File" onSort={notify} />
        <SortHeader label="Template" onSort={notify} />
        <SortHeader label="Progress" onSort={notify} />
        <SortHeader label="Entities" onSort={notify} />
        <SortHeader label="Failed" onSort={notify} />
        <SortHeader label="Date" onSort={notify} />
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
              className={`relative grid items-center gap-3 px-4 h-11 text-sm transition-colors cursor-pointer
                hover:bg-warm ${isSelected ? "bg-parchment" : ""}`}
              style={{
                gridTemplateColumns: cols,
                borderBottom: "1px solid var(--border-primary)",
              }}
              onClick={() => onSelect(entry.id)}
            >
              {/* Stretched primary action — the focusable path lives here, not
                  on the row (a focusable row wrapping the checkbox/View button
                  is invalid nesting for AT). */}
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={`Select ${entry.filename}`}
                onClick={(e) => { e.stopPropagation(); onSelect(entry.id); }}
                className="absolute inset-0 w-full cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20"
              />
              <label className="relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={isSelected} onChange={() => onSelect(entry.id)} ariaLabel={`Select ${entry.filename}`} />
              </label>

              <StatusBadge status={entry.status} />

              <span className="text-xs font-medium text-ink truncate">{entry.filename}</span>
              <span className="text-xs text-ink-tertiary truncate">{entry.template}</span>

              <div className="flex items-center gap-2 pr-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <ProgressBar value={entry.progress} color={progressColor(entry.status)} />
                </div>
                <span dir="ltr" className="text-[11px] text-ink-tertiary tabular-nums shrink-0">{progressLabel(entry)}</span>
              </div>

              <span className="text-xs text-ink-tertiary tabular-nums">
                {entry.status === "pending" ? "—" : entry.entities.toLocaleString()}
              </span>
              <span
                className={`text-xs tabular-nums ${entry.failed > 0 ? "text-seal font-medium" : "text-ink-tertiary"}`}
              >
                {entry.status === "pending" ? "—" : entry.failed}
              </span>
              <span dir="ltr" className="text-xs text-ink-tertiary tabular-nums">{formatDate(entry.date)}</span>

              <div className="relative flex items-center justify-center">
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

function SortHeader({ label, onSort }: { label: string; onSort: (msg: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSort(`Sorted by ${label.toLowerCase()}`)}
      className="text-left uppercase tracking-wider hover:text-ink transition-colors cursor-pointer"
    >
      {label}
    </button>
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
