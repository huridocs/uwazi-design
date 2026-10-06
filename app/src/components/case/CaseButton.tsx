import { useAtom, useAtomValue } from "jotai";
import { Pin } from "lucide-react";
import { caseOpenAtom, casePinCountAtom } from "../../atoms/caseFile";
import { CasePanel } from "./CasePanel";

/** The navbar's way into the case: the pin mark, "Case" and how many records
 *  are pinned in this collection. The count is always drawn (0 included), so
 *  the first pin does not widen the button. Phones drop the word. */
export function CaseButton({ rtl = false, compact = false }: { rtl?: boolean; compact?: boolean }) {
  const [open, setOpen] = useAtom(caseOpenAtom);
  const count = useAtomValue(casePinCountAtom);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        data-component="CaseButton"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Case, ${count} pinned`}
        className="flex items-center gap-1.5 px-2.5 h-7 text-tab font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors"
      >
        <Pin size={13} aria-hidden fill={count ? "currentColor" : "none"} className={count ? "text-ink" : ""} />
        {!compact && "Case"}
        <span data-part="count" className={`text-meta tabular-nums ${count ? "text-ink" : "text-ink-tertiary"}`}>
          {count}
        </span>
      </button>
      <CasePanel rtl={rtl} />
    </>
  );
}
