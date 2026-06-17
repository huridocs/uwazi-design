import type { ExtractorStatus } from "../../data/settings";

const styles: Record<ExtractorStatus, { cls: string; label: string }> = {
  ready: { cls: "bg-success-light text-success", label: "Ready" },
  training: { cls: "bg-carbon-tint text-carbon", label: "Training" },
  processing: { cls: "bg-warning-light text-warning", label: "Processing" },
  error: { cls: "bg-seal-tint text-seal", label: "Error" },
};

/** Status badge for extraction / processing jobs, on our semantic tints. */
export function StatusPill({ status }: { status: ExtractorStatus }) {
  const { cls, label } = styles[status];
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md w-fit ${cls}`}>{label}</span>
  );
}
