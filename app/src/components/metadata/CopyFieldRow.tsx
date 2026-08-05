import { ArrowRight } from "lucide-react";
import type { CopyMatch } from "../../utils/copyFrom";
import { Checkbox } from "../shared/Checkbox";

/** The staged incoming value for ONE field, beside what the field holds now.
 *
 *  Uwazi copies the whole computed set in one go and shows you the source's
 *  values, never a comparison against your own (research weaknesses #1 and #3):
 *  a carefully-set value is replaced with no warning and no way to keep it. This
 *  row is the answer to both — every match is individually deselectable, and
 *  current-vs-incoming sits on the row, so an overwrite is something you read
 *  before it happens rather than discover after saving.
 *
 *  Layout note: the checkbox column and this row are mounted for EVERY field the
 *  moment a copy is staged, not per matched field, so ticking one does not
 *  reflow the ones below it. */
export function CopyFieldRow({
  match,
  checked,
  onChange,
}: {
  match: CopyMatch;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const incoming = describe(match, "incoming");
  const current = describe(match, "current");

  return (
    <div
      className={`mt-1.5 flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors ${
        checked ? "bg-parchment" : "bg-warm"
      }`}
    >
      <span className="pt-px">
        <Checkbox
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          ariaLabel={`Copy ${match.label}`}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 flex-wrap text-[11px]">
          <span className="text-ink-tertiary line-through decoration-ink-muted/60">{current}</span>
          <ArrowRight size={10} className="shrink-0 text-ink-muted" aria-hidden />
          <span className="font-medium text-ink">{incoming}</span>
        </span>
        {/* Two states worth naming rather than leaving the user to compare
            strings: a copy that would CLEAR the field (defaulted off), and one
            that would change nothing. */}
        {match.emptyOnSource && (
          <span className="mt-0.5 block text-[11px] text-warning">
            The source leaves this empty — copying clears what is here.
          </span>
        )}
        {match.unchanged && !match.emptyOnSource && (
          <span className="mt-0.5 block text-[11px] text-ink-muted">Already the same value.</span>
        )}
      </span>
    </div>
  );
}

/** Both sides of a match as one readable string, whichever way it copies.
 *  A relationship field copies its CONNECTION (the value is derived at the
 *  destination — see the matching layer's header), so it is counted, not
 *  quoted. */
function describe(match: CopyMatch, side: "current" | "incoming"): string {
  if (match.copies === "connection") {
    const ids =
      side === "incoming" ? match.sourceConnectedEntityIds : match.targetConnectedEntityIds;
    const n = ids?.length ?? 0;
    return n === 0 ? "no connections" : `${n} ${n === 1 ? "connection" : "connections"}`;
  }
  const value = side === "incoming" ? match.sourceValue : match.targetValue;
  return value?.trim() ? value : "empty";
}
