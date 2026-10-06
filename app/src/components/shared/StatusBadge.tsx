import { csvTitle, type CsvStatus } from "../../data/imports";

type Tone = "running" | "neutral" | "success" | "warning" | "error";

const tones: Record<Tone, string> = {
  running: "bg-carbon-tint text-carbon-label",
  neutral: "bg-warm text-ink-secondary",
  success: "bg-success-light text-success-label",
  warning: "bg-warning-light text-warning-label",
  error: "bg-seal-tint text-seal-label",
};

function toneOf(status: CsvStatus, rowsFailed: number): Tone {
  if (status === "completed") return rowsFailed > 0 ? "warning" : "success";
  if (status === "failed") return "error";
  if (status === "queued" || status === "cancelled") return "neutral";
  return "running";
}

interface StatusBadgeProps {
  status: CsvStatus;
  /** A completed import with failed rows reads "Completed with errors". */
  rowsFailed?: number;
}

/** An import's status (Import CSV), in Uwazi's words: the stage while it
 *  runs, then Completed, Completed with errors, Failed or Cancelled. */
export function StatusBadge({ status, rowsFailed = 0 }: StatusBadgeProps) {
  return (
    <span
      data-component="StatusBadge"
      data-status={status}
      className={`inline-flex w-fit px-2 py-0.5 text-meta font-semibold rounded-md whitespace-nowrap ${tones[toneOf(status, rowsFailed)]}`}
    >
      {csvTitle({ status, rowsFailed }).title}
    </span>
  );
}
