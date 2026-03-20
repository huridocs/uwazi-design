import type { ImportStatus } from "../../data/imports";

const config: Record<ImportStatus, { label: string; bg: string; text: string }> = {
  completed: { label: "Completed", bg: "bg-success-light", text: "text-success" },
  completed_warnings: { label: "Warnings", bg: "bg-warning-light", text: "text-warning" },
  completed_errors: { label: "Errors", bg: "bg-seal-tint", text: "text-seal" },
  processing: { label: "Processing", bg: "bg-carbon-tint", text: "text-carbon" },
  uploading: { label: "Uploading", bg: "bg-carbon-tint", text: "text-carbon" },
  failed: { label: "Failed", bg: "bg-seal-tint", text: "text-seal" },
};

interface StatusBadgeProps {
  status: ImportStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, bg, text } = config[status];
  return (
    <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${bg} ${text}`}>
      {label}
    </span>
  );
}
