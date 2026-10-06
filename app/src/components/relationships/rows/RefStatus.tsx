import type { RefPeriod, Verification } from "../../../data/references";
import { VERIFICATION_LABEL, periodLabel } from "../../../utils/relationships";

/** Status tones, as `StatusBadge` draws them: confirmed green, single source
 *  neutral, disputed amber. Mixed (an aggregate whose references disagree) is
 *  neutral too; the facet says which. */
const TONE: Record<Verification | "mixed", string> = {
  confirmed: "bg-success-light text-success-label",
  "single-source": "bg-warm text-ink-secondary",
  disputed: "bg-warning-light text-warning-label",
  mixed: "bg-warm text-ink-secondary",
};

const DOT: Record<Verification, string> = {
  confirmed: "var(--success)",
  "single-source": "var(--text-muted)",
  disputed: "var(--warning)",
};

/** The facet row's marker: the status colour as a track dot. */
export function VerificationDot({ status }: { status: Verification }) {
  return (
    <span
      aria-hidden
      data-component="VerificationDot"
      className="w-1.5 h-1.5 rounded-full shrink-0"
      style={{ backgroundColor: DOT[status] ?? "var(--text-muted)" }}
    />
  );
}

/** A link's status chip and, when it is dated, the years it held. Renders
 *  nothing for a link with neither (every Sample and CEJIL row), so those rows
 *  are unchanged. */
export function RefStatus({
  verification,
  period,
}: {
  verification?: Verification | "mixed";
  period?: RefPeriod;
}) {
  const years = period ? periodLabel(period) : "";
  if (!verification && !years) return null;
  return (
    <span data-component="RefStatus" className="inline-flex items-center gap-1.5 shrink-0">
      {years && (
        <span data-part="period" className="text-meta text-ink-tertiary tabular-nums whitespace-nowrap">
          {years}
        </span>
      )}
      {verification && (
        <span
          data-part="verification"
          data-status={verification}
          className={`inline-flex w-fit px-1.5 py-px rounded-md text-meta font-medium whitespace-nowrap ${TONE[verification]}`}
        >
          {verification === "mixed" ? "Mixed" : VERIFICATION_LABEL[verification]}
        </span>
      )}
    </span>
  );
}
