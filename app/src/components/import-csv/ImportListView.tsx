import { RefreshCw } from "lucide-react";
import { Breadcrumb } from "../layout/Breadcrumb";
import { ImportTable } from "./ImportTable";
import { ImportEmptyState } from "./ImportEmptyState";
import type { ImportEntry } from "../../data/imports";

interface ImportListViewProps {
  imports: ImportEntry[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onView: (id: string) => void;
  onNewImport: () => void;
}

function countBy(imports: ImportEntry[]) {
  let processing = 0;
  let completed = 0;
  let failed = 0;
  for (const i of imports) {
    if (i.status === "processing" || i.status === "uploading") processing++;
    else if (i.status === "failed") failed++;
    else if (
      i.status === "completed" ||
      i.status === "completed_warnings" ||
      i.status === "completed_errors"
    )
      completed++;
  }
  return { processing, completed, failed };
}

export function ImportListView({
  imports,
  selectedIds,
  onSelect,
  onSelectAll,
  onView,
  onNewImport,
}: ImportListViewProps) {
  const { processing, completed, failed } = countBy(imports);
  const isEmpty = imports.length === 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 gap-3">
      <Breadcrumb segments={[{ label: "Import CSV" }]} />

      <section
        className="flex flex-col flex-1 min-h-0 rounded-md bg-paper overflow-hidden"
        style={{ border: "1px solid var(--border-primary)" }}
      >
        {/* Card header */}
        <header
          className="flex items-center justify-between px-4 h-12 shrink-0"
          style={{ borderBottom: isEmpty ? "none" : "1px solid var(--border-primary)" }}
        >
          <h2 className="text-sm font-bold text-ink">CSVs</h2>
          {processing > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-success">
              <RefreshCw size={12} className="animate-spin" />
              Auto-refreshing
            </span>
          )}
        </header>

        {isEmpty ? (
          <ImportEmptyState onNewImport={onNewImport} />
        ) : (
          <>
            {/* Stats breakdown row */}
            <div
              className="flex items-center gap-6 px-4 h-10 shrink-0 text-xs text-ink-tertiary"
              style={{ borderBottom: "1px solid var(--border-primary)" }}
            >
              <Stat count={imports.length} label="Total imports" tone="ink" />
              <span className="h-4 w-px bg-border" aria-hidden />
              <Stat count={processing} label="Processing" tone={processing > 0 ? "carbon" : "muted"} />
              <span className="h-4 w-px bg-border" aria-hidden />
              <Stat count={completed} label="Completed" tone={completed > 0 ? "success" : "muted"} />
              <span className="h-4 w-px bg-border" aria-hidden />
              <Stat count={failed} label="Failed" tone={failed > 0 ? "seal" : "muted"} />
            </div>

            <ImportTable
              imports={imports}
              selectedIds={selectedIds}
              onSelect={onSelect}
              onSelectAll={onSelectAll}
              onView={onView}
            />
          </>
        )}
      </section>
    </div>
  );
}

function Stat({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: "ink" | "carbon" | "success" | "seal" | "muted";
}) {
  const toneClass =
    tone === "carbon"
      ? "text-carbon"
      : tone === "success"
        ? "text-success"
        : tone === "seal"
          ? "text-seal"
          : tone === "muted"
            ? "text-ink-muted"
            : "text-ink";
  return (
    <span className="flex items-center gap-1.5">
      <span className={`text-sm font-semibold tabular-nums ${toneClass}`}>{count}</span>
      <span>{label}</span>
    </span>
  );
}
