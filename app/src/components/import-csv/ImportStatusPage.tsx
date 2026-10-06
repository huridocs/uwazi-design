import { useState } from "react";
import { useAtomValue, useStore } from "jotai";
import { ArrowLeft, Download, XCircle } from "lucide-react";
import { SettingsContent } from "../settings/SettingsContent";
import { SettingsButton } from "../settings/SettingsButton";
import { SettingsSection } from "../settings/SettingsSection";
import { SettingsTable, type Column } from "../settings/SettingsTable";
import { StatusBadge } from "../shared/StatusBadge";
import { ProgressBar } from "../shared/ProgressBar";
import { Stepper } from "../shared/Stepper";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { dataSourceAtom } from "../../atoms/dataSource";
import { templatesAtom } from "../../atoms/templates";
import { cancelCsvImport, failedRowsCsv } from "../../atoms/csvImports";
import { useSettingsNotify } from "../../hooks/useSettingsNotify";
import { CSV_STAGES, CSV_STATUS_TEXT, csvTitle, isTerminal, type CsvImport, type CsvRowError, type CsvStage } from "../../data/imports";
import { countOrDash, csvTime, processedPct, progressColor } from "./importFormat";

/** The stepper: Uwazi's stages in order, then Completed. A retry or a cancel
 *  shows as its own step where it happened. */
function steps(i: CsvImport) {
  const reached: CsvStage = i.stoppedAt ?? (i.status === "retrying" ? "entities" : (i.status as CsvStage));
  const at = i.status === "completed" ? CSV_STAGES.length : CSV_STAGES.indexOf(reached);
  const out: { label: string; state: "completed" | "active" | "upcoming" }[] = CSV_STAGES.map((s, n) => ({
    label: CSV_STATUS_TEXT[s].title,
    state: n < at ? "completed" : n === at ? (isTerminal(i.status) ? "upcoming" : "active") : "upcoming",
  }));
  if (i.retried || i.status === "retrying")
    out.splice(CSV_STAGES.length - 1, 0, { label: "Retrying", state: i.status === "retrying" ? "active" : "completed" });
  if (i.status === "cancelled") out.push({ label: "Cancelled", state: "active" });
  else if (i.status === "failed") out.push({ label: "Failed", state: "active" });
  else out.push({ label: "Completed", state: i.status === "completed" ? "completed" : "upcoming" });
  return out;
}

/** One import's status page (Uwazi's `UploadStatus`). Updates live while the
 *  job runs. Footer: Back, "Download failed rows" when rows failed, and
 *  Cancel while the job can still stop. */
export function ImportStatusPage({ entry: i, onBack }: { entry: CsvImport; onBack: () => void }) {
  const store = useStore();
  const corpus = useAtomValue(dataSourceAtom);
  const templates = useAtomValue(templatesAtom(corpus));
  const { record } = useSettingsNotify();
  const [confirm, setConfirm] = useState(false);
  const { description } = csvTitle(i);
  const pct = processedPct(i);
  const terminal = isTerminal(i.status);

  const download = () => {
    const url = URL.createObjectURL(new Blob([failedRowsCsv(i)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${i.filename.replace(/\.(csv|zip)$/i, "")}-failed-rows.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const cancel = () => {
    setConfirm(false);
    if (cancelCsvImport(store, corpus, i.id))
      record({
        method: "UPDATE",
        domain: "csv-import",
        noun: "CSV import",
        id: i.id,
        name: i.filename,
        summary: `Cancelled CSV import “${i.filename}”`,
        notify: false,
      });
  };

  const errorColumns: Column<CsvRowError>[] = [
    { id: "row", header: "Row", width: "5rem", mobile: "primary", cell: (e) => <span className="font-medium tabular-nums text-ink">{e.row}</span> },
    { id: "property", header: "Property", width: "10rem", mobile: "meta", cell: (e) => <span className="text-xs text-ink-tertiary truncate">{e.property || "-"}</span> },
    { id: "message", header: "Message", mobile: "meta", cell: (e) => <span className="text-xs text-ink-secondary text-pretty">{e.message}</span> },
  ];

  return (
    <SettingsContent component="ImportStatusPage">
      <SettingsContent.Header path={["Import CSV"]} title={<span dir="ltr">{i.filename}</span>} onBack={onBack} />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6 min-w-0">
          <div data-part="status" className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <StatusBadge status={i.status} rowsFailed={i.rowsFailed} />
              <p role="status" className="text-xs text-ink-secondary">
                {description}
              </p>
            </div>
            <dl data-part="meta" className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-secondary">
              <Meta label="Template" value={templates.find((t) => t.id === i.templateId)?.name ?? i.templateId} />
              <Meta label="Date" value={csvTime(i.created)} ltr />
              <Meta label="Last updated" value={csvTime(i.updated)} ltr />
            </dl>
          </div>

          {/* Eight stages do not fit one line: the stepper wraps, connectors
              shortened, rather than scrolling stages out of sight. */}
          <div data-part="stepper" className="[&_ol]:flex-wrap [&_ol]:gap-y-2 [&_[data-part=connector]]:w-5 [&_[data-part=connector]]:mx-2">
            <Stepper steps={steps(i)} />
          </div>

          <dl data-part="stats" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <Stat label="Entities created" value={i.entitiesCreated} />
            <Stat label="Entities updated" value={i.entitiesUpdated} />
            <Stat label="Rows processed" value={i.rowsProcessed} />
            <Stat label="Rows failed" value={i.rowsFailed} seal />
            <Stat label="Thesauri values created" value={i.thesauriValuesCreated} />
            <Stat label="Related entities created" value={i.relatedEntitiesCreated} />
          </dl>

          {i.status === "failed" && i.failure && (
            <section
              data-part="failure"
              aria-labelledby={`failure-${i.id}`}
              className="flex flex-col gap-2 rounded-lg bg-seal-tint/40 border border-border p-4"
            >
              <h3 id={`failure-${i.id}`} className="text-sm font-semibold text-ink">
                Failure details
              </h3>
              <p className="text-xs text-ink">{i.failure.message}</p>
              <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-secondary">
                <Meta label="Stage" value={i.failure.stage} />
                <Meta label="Code" value={i.failure.code} ltr />
                <Meta label="Retryable" value={i.failure.retryable ? "Yes" : "No"} />
              </dl>
            </section>
          )}

          <section data-part="progress" aria-labelledby={`progress-${i.id}`} className="flex flex-col gap-2">
            <h3 id={`progress-${i.id}`} className="text-sm font-semibold text-ink">
              Progress
            </h3>
            <ProgressBar value={pct} color={progressColor(i)} size="md" ariaLabel="Processed rows" />
            <p className="text-xs text-ink-secondary tabular-nums">Processed rows: {pct}%</p>
          </section>

          {i.rowErrors.length > 0 && (
            <SettingsSection title="Failure details" description={`${i.rowErrors.length.toLocaleString()} rows could not be imported. Row numbers count the header as row 1.`}>
              <SettingsTable columns={errorColumns} data={i.rowErrors} getRowId={(e) => `${e.row}-${e.property}`} />
            </SettingsSection>
          )}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <SettingsButton variant="ghost" size="sm" className="me-auto" icon={<ArrowLeft size={14} aria-hidden />} onClick={onBack}>
          Back
        </SettingsButton>
        {i.rowErrors.length > 0 && (
          <SettingsButton variant="secondary" size="sm" icon={<Download size={14} aria-hidden />} onClick={download}>
            Download failed rows
          </SettingsButton>
        )}
        <SettingsButton
          variant="danger"
          size="sm"
          icon={<XCircle size={14} aria-hidden />}
          disabled={terminal}
          title={terminal ? `This import is ${csvTitle(i).title.toLowerCase()} and cannot be cancelled.` : undefined}
          onClick={() => setConfirm(true)}
        >
          Cancel
        </SettingsButton>
      </SettingsContent.Footer>
      <ConfirmDialog
        open={confirm}
        title="Canceling"
        message="Cancel the import process. This will stop the creation of new entities. Already created entities will not be affected"
        confirmLabel="Cancel"
        cancelLabel="Close"
        variant="danger"
        onConfirm={cancel}
        onCancel={() => setConfirm(false)}
      />
    </SettingsContent>
  );
}

function Meta({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex gap-1.5">
      <dt>{label}:</dt>
      <dd dir={ltr ? "ltr" : undefined} className="font-medium text-ink tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function Stat({ label, value, seal = false }: { label: string; value: number; seal?: boolean }) {
  return (
    <div data-part="stat" className="rounded-lg border border-border bg-paper px-3 py-2.5 min-w-0">
      <dt className="text-meta font-semibold uppercase tracking-wider text-ink-tertiary">{label}</dt>
      <dd className={`mt-1 text-xl font-semibold tabular-nums ${seal && value ? "text-seal-label" : "text-ink"}`}>
        {countOrDash(value)}
      </dd>
    </div>
  );
}
