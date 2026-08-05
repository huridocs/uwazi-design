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
 *  It is a TABLE, not a sentence. The five cells sit on fixed tracks that are
 *  identical in every row, so a staged set reads down the columns — every field
 *  name at one x, every current value at another, every arrow in a line. Laid
 *  out inline with `flex-wrap` (which is how this first shipped) the arrow and
 *  the incoming value landed at a different x on every row, and a set of them
 *  could not be scanned as a comparison at all.
 *
 *  Layout constraints this holds:
 *  · Every field's row is mounted the moment a copy is staged, not just the
 *    matched ones, so ticking one never reflows the ones below it.
 *  · The note line is RESERVED on every row, whether or not that row has one.
 *    It applies to some rows only, and letting it appear would push everything
 *    under it down — the same reason the provenance slot is reserved in the edit
 *    form. Reserving it also makes every row exactly one height, which is what
 *    lets the columns be read as columns. */
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
  const note = match.emptyOnSource
    ? "The source leaves this empty — copying clears what is here."
    : match.unchanged
      ? "Already the same value."
      : "";

  return (
    <div
      className={`mt-1.5 grid grid-cols-[1.25rem_7rem_minmax(0,1fr)_0.75rem_minmax(0,1fr)]
        items-center gap-x-2 rounded-md px-2 py-1.5 transition-colors ${
          checked ? "bg-parchment" : "bg-warm"
        }`}
    >
      {/* Every first-row cell shares a 1rem line box, so the checkbox centres on
          the values it belongs to instead of being nudged onto them. */}
      <span className="h-4 flex items-center justify-center">
        <Checkbox
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          ariaLabel={`Copy ${match.label}`}
        />
      </span>

      {/* The field name, which used to reach the checkbox's accessible name and
          nowhere else — so a sighted reader saw "North America → South America"
          with no idea which field was being overwritten, and got strictly less
          than a screen-reader user did. */}
      <span
        className="h-4 leading-4 truncate text-[11px] font-medium text-ink-secondary"
        title={match.label}
      >
        {match.label}
      </span>

      {/* `leading-4` in a `h-4` box, not `flex items-center`: on a flex
          container `truncate` never fires, because the text becomes an
          anonymous flex item and `text-overflow` has nothing to apply to. The
          line box does the centring instead, and the ellipsis works.

          Values truncate with an ellipsis rather than fading or wrapping. A
          wrapped value breaks the column alignment that is the point of the row;
          a fade (FadeTruncate, the app's idiom for PROSE blocks) reads as "more
          text below", which in a one-line comparison cell is a lie. The ellipsis
          cuts at the column edge and the whole value is on the title. */}
      <span
        className="h-4 leading-4 truncate text-[11px] text-ink-tertiary
          line-through decoration-ink-muted/60"
        title={current}
      >
        {current}
      </span>
      <ArrowRight size={10} className="text-ink-muted" aria-hidden />
      <span
        className="h-4 leading-4 truncate text-[11px] font-medium text-ink"
        title={incoming}
      >
        {incoming}
      </span>

      {/* Reserved: the same 1rem whether or not this row has something to say. */}
      <span
        className="col-start-2 col-span-4 h-4 leading-4 truncate text-[11px] text-ink-tertiary"
        title={note || undefined}
      >
        {note}
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
