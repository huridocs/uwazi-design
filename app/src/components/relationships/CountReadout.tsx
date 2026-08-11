import { useMemo } from "react";
import { useFilteredReferences } from "./useFilteredReferences";
import { deriveHubs, deriveRelationships } from "../../utils/relationships";

/** The relationships header counter, on the toolbar beside the search that
 *  narrows it — the ONE place this surface prints its number, now that the
 *  info rows below dropped theirs.
 *
 *  It is the AGGREGATE count (`deriveRelationships` + hubs), the same figure
 *  the old info row led with, so list, tree and graph agree on it — a list of
 *  23 reference rows under a header saying 10 relationships is the seam
 *  CLAUDE.md documents, not a bug. Both toolbar flavours (main view and drawer
 *  section) render this same component, so the count can't drift between them.
 *
 *  ALWAYS MOUNTED, fixed width, right-aligned (logical end): filters rewrite
 *  the number constantly and the controls after it must never move — growth
 *  runs into the reserve. `dir="ltr"` holds the English "N relationships" in
 *  order under RTL; the slot's own alignment stays logical. */
export function CountReadout() {
  // The same pipeline every view body consumes, so this number can never
  // disagree with the rows below it.
  const filtered = useFilteredReferences();
  const count = useMemo(
    () => deriveRelationships(filtered).length + deriveHubs(filtered).length,
    [filtered],
  );
  return (
    // `text-end` on the SLOT (which inherits the page direction), `dir="ltr"`
    // on the phrase inside it: the number stays snug against the controls at
    // the row's logical end in both directions, while "1,234 relationships"
    // itself never reorders under RTL.
    <span className="shrink-0 w-[7.5rem] text-end text-[11px] tabular-nums text-ink-tertiary">
      <span dir="ltr">
        <span className="font-semibold text-ink-secondary">{count.toLocaleString()}</span>{" "}
        {count === 1 ? "relationship" : "relationships"}
      </span>
    </span>
  );
}
