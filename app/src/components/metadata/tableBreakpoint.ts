/** Where a connection table stops fitting, measured rather than chosen.
 *
 *  Both connection surfaces (`ConnectionGroupCard`, `RelationshipFieldCard`)
 *  switch from a table to a stack of per-entity cards at the same width, and
 *  the width comes from the widest real content in the corpora, measured as the
 *  tables' `max-content` in the browser:
 *
 *    Jueces firmantes  (CEJIL Causa/Sentencia, 2 col: Juez · País)   344px
 *    People involved   (3 col, cell-merged: Country · Role · Person) 386px
 *    Related cases     (2 col: Court case · Region)                  450px
 *
 *  450 is the binding one, so the switch is 28.5rem (456px) — the first rem step
 *  that clears it. Not a round number on purpose: 24rem would fold a table that
 *  still fits, 32rem would leave "Related cases" scrolling for 56px.
 *
 *  Re-measure if a corpus lands with wider values; a table that scrolls is the
 *  bug this replaces, and a threshold below the content is the same bug. */
export const TABLE_MIN = {
  container: "@container",
  /** Shown only at or above the threshold. */
  tableOnly: "hidden @[28.5rem]:block",
  /** Shown only below it. */
  stackOnly: "@[28.5rem]:hidden",
} as const;
