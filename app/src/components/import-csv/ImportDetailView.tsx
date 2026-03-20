import { Breadcrumb } from "../layout/Breadcrumb";
import { StatsCard } from "../shared/StatsCard";
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

function progressColor(status: ImportEntry["status"]): "green" | "blue" | "red" {
  if (status === "failed") return "red";
  if (status === "processing" || status === "uploading") return "blue";
  return "green";
}

export function ImportDetailView({ entry, onBack }: ImportDetailViewProps) {
  const isInProgress = entry.status === "uploading" || entry.status === "processing";
  const isCompleted = entry.status === "completed" || entry.status === "completed_warnings" || entry.status === "completed_errors";
  const isFailed = entry.status === "failed";
  const hasWarnings = entry.status === "completed_warnings" || (entry.status === "completed_errors" && entry.warnings > 0);
  const hasErrors = entry.status === "completed_errors" || isFailed;
  const warnings = entry.issues.filter((i) => i.type === "warning");
  const errors = entry.issues.filter((i) => i.type === "error");

  const hasTable = entry.issues.length > 0 || (isCompleted && entry.entities > 0);

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 gap-4">
      {/* Fixed top content */}
      <div className="space-y-4 shrink-0">
        <Breadcrumb
          segments={[
            { label: "Import CSV", onClick: onBack },
            { label: entry.filename },
          ]}
        />

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-ink">{entry.filename}</h2>
            <StatusBadge status={entry.status} />
          </div>
          <span className="text-xs text-ink-tertiary">
            Template: <strong className="text-ink font-medium">{entry.template}</strong>
          </span>
        </div>

        {/* Stepper for in-progress */}
        {isInProgress && (
          <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-paper" style={{ border: "1px solid var(--border-primary)" }}>
            <Stepper steps={getStepperSteps(entry.status)} />
          </div>
        )}

        {/* Progress bar */}
        <div className="px-1">
          <ProgressBar value={entry.progress} color={progressColor(entry.status)} showLabel size="md" />
        </div>

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

        {/* Stats cards */}
        <div className="grid grid-cols-5 gap-3">
          <StatsCard label="Entities" value={entry.entities.toLocaleString()} accent="blue" />
          <StatsCard label="Progress" value={`${Math.round(entry.progress)}%`} />
          <StatsCard
            label="Failed"
            value={entry.failed}
            accent={entry.failed > 0 ? "red" : undefined}
          />
          <StatsCard
            label="Warnings"
            value={entry.warnings}
            accent={entry.warnings > 0 ? "amber" : undefined}
          />
          <StatsCard
            label="Errors"
            value={entry.errors}
            accent={entry.errors > 0 ? "red" : undefined}
          />
        </div>

        {/* Table section header */}
        {entry.issues.length > 0 && (
          <h3 className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider px-1">
            Issues ({entry.issues.length})
          </h3>
        )}
        {entry.issues.length === 0 && isCompleted && entry.entities > 0 && (
          <h3 className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider px-1">
            Created entities {entry.entities > 20 && <span className="normal-case font-normal">({entry.entities.toLocaleString()} total — showing first 20)</span>}
          </h3>
        )}
      </div>

      {/* Table — fills remaining space */}
      {hasTable && (
        <div className="flex flex-col flex-1 min-h-0">
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
