import { useState } from "react";
import { useAtomValue } from "jotai";
import { FileSpreadsheet } from "lucide-react";
import { SettingsListPage } from "../settings/SettingsListPage";
import { SettingsTable, type Column } from "../settings/SettingsTable";
import { SettingsEmptyState } from "../settings/SettingsEmptyState";
import { SettingsButton } from "../settings/SettingsButton";
import { StatusBadge } from "../shared/StatusBadge";
import { ProgressBar } from "../shared/ProgressBar";
import type { SortDir } from "../shared/DataTable";
import { dataSourceAtom } from "../../atoms/dataSource";
import { templatesAtom } from "../../atoms/templates";
import { CSV_STAGES, csvTitle, isTerminal, type CsvImport } from "../../data/imports";
import { countOrDash, csvTime, processedPct, progressColor } from "./importFormat";

/** Uwazi's list counters: Processing is every import still running (queued
 *  included), Completed includes completed with errors, Failed includes
 *  cancelled. The three add up to the total. */
function counts(imports: CsvImport[]) {
  let processing = 0;
  let completed = 0;
  let failed = 0;
  for (const i of imports) {
    if (!isTerminal(i.status)) processing++;
    else if (i.status === "completed") completed++;
    else failed++;
  }
  return { processing, completed, failed };
}

const statusOrder = (i: CsvImport) =>
  i.status === "completed" ? 20 + (i.rowsFailed > 0 ? 1 : 0) : i.status === "failed" ? 30 : i.status === "cancelled" ? 31 : CSV_STAGES.indexOf(i.status as never);

/** The imports of the collection shown: the "CSVs" table with its counters,
 *  newest first. Only Status, Template and Date sort, as in Uwazi. */
export function ImportList({
  imports,
  onView,
  onNewImport,
}: {
  imports: CsvImport[];
  onView: (id: string) => void;
  onNewImport: () => void;
}) {
  const corpus = useAtomValue(dataSourceAtom);
  const templates = useAtomValue(templatesAtom(corpus));
  const templateName = (id: string) => templates.find((t) => t.id === id)?.name ?? id;
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "date", dir: "desc" });

  const dir = sort.dir === "asc" ? 1 : -1;
  const rows = [...imports].sort((a, b) => {
    if (sort.key === "status") return (statusOrder(a) - statusOrder(b)) * dir;
    if (sort.key === "template") return templateName(a.templateId).localeCompare(templateName(b.templateId)) * dir;
    return (a.created - b.created) * dir;
  });
  const { processing, completed, failed } = counts(imports);

  const columns: Column<CsvImport>[] = [
    {
      id: "status",
      header: "Status",
      sortKey: "status",
      width: "9.5rem",
      mobile: "meta",
      cell: (i) => <StatusBadge status={i.status} rowsFailed={i.rowsFailed} />,
    },
    {
      id: "file",
      header: "File",
      mobile: "primary",
      cell: (i) => (
        <span dir="ltr" className="font-medium text-ink truncate">
          {i.filename}
        </span>
      ),
    },
    {
      id: "template",
      header: "Template",
      sortKey: "template",
      width: "7.5rem",
      mobile: "meta",
      cell: (i) => <span className="text-ink-secondary truncate">{templateName(i.templateId)}</span>,
    },
    {
      id: "progress",
      header: "Progress",
      width: "8.5rem",
      mobile: "meta",
      cell: (i) => (
        <span className="flex items-center gap-2 min-w-0 w-full">
          <span className="flex-1 min-w-[3rem]">
            <ProgressBar value={processedPct(i)} color={progressColor(i)} ariaLabel={`Progress, ${i.filename}`} />
          </span>
          <span dir="ltr" className="text-meta text-ink-secondary tabular-nums shrink-0">
            {i.rowsProcessed.toLocaleString()}/{i.totalRows.toLocaleString()}
          </span>
        </span>
      ),
    },
    {
      id: "created",
      header: "Entities created",
      width: "6rem",
      align: "right",
      mobile: "hidden",
      cell: (i) => <span className="text-ink-secondary tabular-nums">{countOrDash(i.entitiesCreated)}</span>,
    },
    {
      id: "updated",
      header: "Entities updated",
      width: "6rem",
      align: "right",
      mobile: "hidden",
      cell: (i) => <span className="text-ink-secondary tabular-nums">{countOrDash(i.entitiesUpdated)}</span>,
    },
    {
      id: "failed",
      header: "Failed",
      width: "3.5rem",
      align: "right",
      mobile: "hidden",
      cell: (i) => (
        <span className={`tabular-nums ${i.rowsFailed ? "text-seal-label font-medium" : "text-ink-secondary"}`}>
          {countOrDash(i.rowsFailed)}
        </span>
      ),
    },
    {
      id: "date",
      header: "Date",
      sortKey: "date",
      width: "9rem",
      mobile: "meta",
      cell: (i) => (
        <span dir="ltr" className="text-xs text-ink-secondary tabular-nums">
          {csvTime(i.created)}
        </span>
      ),
    },
    {
      id: "view",
      header: <span className="sr-only">Action</span>,
      width: "4.5rem",
      align: "right",
      mobile: "actions",
      cell: (i) => (
        <SettingsButton variant="secondary" size="sm" aria-label={`View ${i.filename}`} onClick={() => onView(i.id)}>
          View
        </SettingsButton>
      ),
    },
  ];

  return (
    <SettingsListPage
      component="ImportCsvList"
      title="Import CSV"
      intro="Create or update entities in bulk from a CSV file, or a ZIP with an import.csv and its attachments."
      lead={{ label: "Import CSV", onClick: onNewImport }}
    >
      {imports.length > 0 && (
        <div data-part="summary" className="flex flex-wrap items-baseline gap-x-5 gap-y-1 mb-3">
          <h3 className="text-sm font-semibold text-ink">CSVs</h3>
          <Counter n={imports.length} label="Total imports" />
          <Counter n={processing} label="Processing" />
          <Counter n={completed} label="Completed" />
          <Counter n={failed} label="Failed" />
          {/* What a screen reader hears when a running import moves on. */}
          <span className="sr-only" aria-live="polite">
            {rows
              .filter((i) => !isTerminal(i.status))
              .map((i) => `${i.filename}: ${csvTitle(i).title}`)
              .join(". ")}
          </span>
        </div>
      )}
      <SettingsTable
        columns={columns}
        data={rows}
        getRowId={(i) => i.id}
        sort={sort}
        onSort={(key) => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }))}
        emptyState={
          <SettingsEmptyState
            icon={<FileSpreadsheet size={16} />}
            title="No CSVs yet"
            hint={<>Import CSV or ZIP files to create entities in bulk. Select&nbsp;+&nbsp;Import&nbsp;CSV to get started.</>}
            action={{ label: "Import CSV", onClick: onNewImport }}
          />
        }
      />
    </SettingsListPage>
  );
}

function Counter({ n, label }: { n: number; label: string }) {
  return (
    // The count is drawn first but read after its label.
    <dl className="flex items-baseline gap-1.5 text-xs text-ink-secondary">
      <dt>{label}</dt>
      <dd className="order-first text-sm font-semibold text-ink tabular-nums">{n.toLocaleString()}</dd>
    </dl>
  );
}
