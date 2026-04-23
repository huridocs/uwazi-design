import { Breadcrumb } from "../layout/Breadcrumb";
import { ProgressBar } from "../shared/ProgressBar";
import { StatusBadge } from "../shared/StatusBadge";
import { Stepper } from "../shared/Stepper";
import { AlertBanner } from "../shared/AlertBanner";
import { IssuesTable } from "./IssuesTable";
import { EntitiesTable } from "./EntitiesTable";
import { generateCreatedEntities, type ImportEntry } from "../../data/imports";

interface ImportDetailViewProps {
  entry: ImportEntry;
  onBack: () => void;
}

function getStepperSteps(status: ImportEntry["status"]) {
  if (status === "uploading") {
    return [
      { label: "Upload", state: "active" as const },
      { label: "Process", state: "upcoming" as const },
      { label: "Complete", state: "upcoming" as const },
    ];
  }
  if (status === "processing") {
    return [
      { label: "Upload", state: "completed" as const },
      { label: "Process", state: "active" as const },
      { label: "Complete", state: "upcoming" as const },
    ];
  }
  return [
    { label: "Upload", state: "completed" as const },
    { label: "Process", state: "completed" as const },
    { label: "Complete", state: "completed" as const },
  ];
}

function progressColor(status: ImportEntry["status"]): "green" | "blue" | "red" | "gray" {
  if (status === "failed") return "red";
  if (status === "processing" || status === "uploading") return "blue";
  if (status === "pending") return "gray";
  return "green";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

function totalRows(entry: ImportEntry): number {
  return entry.entities + entry.failed;
}

function processedRows(entry: ImportEntry): number {
  if (entry.status === "uploading" || entry.status === "processing") {
    const total = totalRows(entry) || Math.max(entry.entities, 1);
    return Math.round((entry.progress / 100) * total);
  }
  return entry.entities;
}

export function ImportDetailView({ entry, onBack }: ImportDetailViewProps) {
  const isInProgress = entry.status === "uploading" || entry.status === "processing";
  const isCompleted =
    entry.status === "completed" ||
    entry.status === "completed_warnings" ||
    entry.status === "completed_errors";
  const isFailed = entry.status === "failed";
  const hasWarnings =
    entry.status === "completed_warnings" ||
    (entry.status === "completed_errors" && entry.warnings > 0);
  const hasErrors = entry.status === "completed_errors" || isFailed;
  const warnings = entry.issues.filter((i) => i.type === "warning");
  const errors = entry.issues.filter((i) => i.type === "error");

  const source = entry.sourceKind ?? (entry.filename.endsWith(".zip") ? "ZIP" : "CSV");
  const sizeLabel =
    entry.sourceSizeKb !== undefined
      ? `${entry.sourceSizeKb.toLocaleString()} KB`
      : "—";

  const total = totalRows(entry);
  const processed = processedRows(entry);
  const progressText = total > 0 ? `${processed.toLocaleString()} / ${total.toLocaleString()} rows` : `${Math.round(entry.progress)}%`;

  const hasTable = entry.issues.length > 0 || (isCompleted && entry.entities > 0);

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 gap-4 overflow-y-auto">
      <Breadcrumb
        segments={[
          { label: "Import CSV", onClick: onBack },
          { label: entry.filename },
        ]}
      />

      {/* Title + status */}
      <div className="flex items-center gap-3">
        <h2 className="text-base font-bold text-ink font-mono">{entry.filename}</h2>
        <StatusBadge status={entry.status} />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-ink-tertiary">
        <span>
          Template: <strong className="text-ink font-medium">{entry.template}</strong>
        </span>
        <span>
          Created by: <strong className="text-ink font-medium">{entry.createdBy ?? "—"}</strong>
        </span>
        <span className="tabular-nums">
          <strong className="text-ink font-medium">{formatDate(entry.date)}</strong>
          {entry.time && <> — <strong className="text-ink font-medium">{entry.time}</strong></>}
        </span>
        <span>
          Source: <strong className="text-ink font-medium">{source}</strong>
          {" • "}
          <strong className="text-ink font-medium">{sizeLabel}</strong>
        </span>
      </div>

      {/* Stepper (only while in progress) */}
      {isInProgress && (
        <div
          className="flex items-center gap-4 px-4 py-3 rounded-md bg-paper"
          style={{ border: "1px solid var(--border-primary)" }}
        >
          <Stepper steps={getStepperSteps(entry.status)} />
        </div>
      )}

      {/* Alerts */}
      {isFailed && (
        <AlertBanner variant="error">
          Import failed — {entry.errors} error{entry.errors !== 1 ? "s" : ""} encountered.
          Review the issues below and re-import the file.
        </AlertBanner>
      )}
      {hasErrors && !isFailed && (
        <AlertBanner variant="error">
          Completed with {errors.length} error{errors.length !== 1 ? "s" : ""} —
          {" "}{entry.failed} entit{entry.failed !== 1 ? "ies" : "y"} could not be imported.
        </AlertBanner>
      )}
      {hasWarnings && (
        <AlertBanner variant="warning">
          {warnings.length} warning{warnings.length !== 1 ? "s" : ""} detected —
          review the issues below. Entities were imported but some fields may need attention.
        </AlertBanner>
      )}

      {/* Big stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatBox label="Entities Created" value={entry.entities} />
        <StatBox label="Rows Processed" value={processed} />
        <StatBox label="Rows Failed" value={entry.failed} tone={entry.failed > 0 ? "seal" : "success"} />
        <StatBox label="Thesauri Touched" value={entry.thesauriTouched ?? 0} />
        <StatBox label="Relationships" value={entry.relationshipsCreated ?? 0} />
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">Progress</span>
          <span className="text-xs text-ink-tertiary tabular-nums">{progressText}</span>
        </div>
        <ProgressBar value={entry.progress} color={progressColor(entry.status)} size="md" />
      </div>

      {/* Extraction details */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-ink">Extraction Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-2 text-xs">
          <DetailField label="Source Type" value={source} />
          <DetailField label="Upload Size" value={sizeLabel} />
          <DetailField label="Files Extracted" value={(entry.filesExtracted ?? 1).toLocaleString()} />
          <DetailField label="Thesauri Values Observed" value={(entry.thesauriObserved ?? 0).toLocaleString()} />
          <DetailField label="Thesauri Values Created" value={(entry.thesauriCreated ?? 0).toLocaleString()} />
        </div>
      </div>

      {/* Section header for table */}
      {entry.issues.length > 0 && (
        <h3 className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider px-1">
          Issues ({entry.issues.length})
        </h3>
      )}
      {entry.issues.length === 0 && isCompleted && entry.entities > 0 && (
        <h3 className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider px-1">
          Created entities{" "}
          {entry.entities > 20 && (
            <span className="normal-case font-normal">
              ({entry.entities.toLocaleString()} total — showing first 20)
            </span>
          )}
        </h3>
      )}

      {/* Table */}
      {hasTable && (
        <div className="flex flex-col min-h-0">
          {entry.issues.length > 0 ? (
            <IssuesTable issues={entry.issues} />
          ) : isCompleted && entry.entities > 0 ? (
            <EntitiesTable entities={generateCreatedEntities(entry)} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "seal" | "success";
}) {
  const valueClass =
    tone === "seal" ? "text-seal" : tone === "success" ? "text-success" : "text-ink";
  return (
    <div
      className="rounded-md bg-paper px-4 py-3"
      style={{ border: "1px solid var(--border-primary)" }}
    >
      <div className="text-[11px] text-ink-tertiary mb-1">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${valueClass}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-ink-tertiary">{label}</div>
      <div className="text-ink font-medium">{value}</div>
    </div>
  );
}
