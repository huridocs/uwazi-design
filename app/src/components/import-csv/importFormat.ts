import type { CsvImport } from "../../data/imports";

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-02-18 15:24:10": the date and time to the second, as Uwazi shows
 *  them, in a form that reads the same in every locale. */
export function csvTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** A count, or "-" for zero or missing (Uwazi's stat cards and table). */
export const countOrDash = (n: number | undefined) => (n ? n.toLocaleString() : "-");

/** The progress bar's colour (Uwazi's `Progress.tsx`): grey while running,
 *  warning for cancelled or completed with errors, error for failed, success
 *  for completed without failures. */
export function progressColor(i: Pick<CsvImport, "status" | "rowsFailed">): "green" | "red" | "amber" | "gray" {
  if (i.status === "failed") return "red";
  if (i.status === "cancelled") return "amber";
  if (i.status === "completed") return i.rowsFailed > 0 ? "amber" : "green";
  return "gray";
}

/** Rows processed out of the file's rows, 0–100. */
export const processedPct = (i: Pick<CsvImport, "rowsProcessed" | "totalRows">) =>
  i.totalRows ? Math.round((i.rowsProcessed / i.totalRows) * 100) : 0;
