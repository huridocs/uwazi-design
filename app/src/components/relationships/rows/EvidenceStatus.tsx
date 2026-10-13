import { useRef, useState } from "react";
import type { RefPeriod, Reference, Verification } from "../../../data/references";
import { VERIFICATION_LABEL } from "../../../utils/relationships";
import { evidenceSummary, hasEvidence, isContested } from "../../../utils/refEvidence";
import { RefEvidenceCard } from "../RefEvidenceCard";
import { RefStatus } from "./RefStatus";

/** A row's status chip, and the way to the evidence behind it. Where the
 *  row's references carry sources or a note (Nepal, Vegas) the chip is a
 *  button that opens `RefEvidenceCard`; elsewhere it is the plain chip, and
 *  a row with no status draws nothing, as before. */
export function EvidenceStatus({
  verification,
  period,
  refs,
}: {
  verification?: Verification | "mixed";
  period?: RefPeriod;
  /** The references behind the row: one for a reference row, every backing
   *  reference for an aggregate. */
  refs: Reference[];
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const chip = <RefStatus verification={verification} period={period} />;
  if (!verification || !refs.some(hasEvidence)) return chip;
  const n = evidenceSummary(refs).sources.length;
  const label = verification === "mixed" ? "Mixed" : VERIFICATION_LABEL[verification];
  // A link that is not disputed but has something against it says so.
  const contested = verification !== "disputed" && refs.some(isContested) ? ", contested" : "";
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-component="EvidenceStatus"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Evidence: ${label}${contested}${n ? `, ${n} ${n === 1 ? "source" : "sources"}` : ""}`}
        title="Show the evidence"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="shrink-0 inline-flex rounded-md cursor-pointer hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
      >
        {chip}
      </button>
      {open && (
        // Clicks inside the card stay in it: the row under it has its own.
        <span className="contents" onClick={(e) => e.stopPropagation()}>
          <RefEvidenceCard
            refs={refs}
            onClose={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
          />
        </span>
      )}
    </>
  );
}
