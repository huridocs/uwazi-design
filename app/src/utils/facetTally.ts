import type { LibraryMatch } from "./libraryFilter";

/** A keyword facet's counts, as "how many results if you tick this", in the
 *  facet's Match mode. Fed the records that pass every OTHER facet (a group's
 *  base included), one `add` per record.
 *
 *  - any: the records carrying the value, Uwazi's count. A 0 adds nothing.
 *  - all: the records that already carry every ticked value, by value.
 *  - none: the records that can carry the facet and carry none of the ticked
 *    values, less those carrying this one. Ticking the first value in `none`
 *    drops every record of a type that cannot carry it, so this count is not
 *    the value's own and a 0 is rare.
 *  - missing: the ticks are ignored (the list is inert), so the plain count.
 *
 *  A ticked value's count is the facet's current result. */
export class FacetTally {
  private readonly seen = new Map<string, number>();
  private pool = 0;
  constructor(
    private readonly mode: LibraryMatch,
    private readonly selected: ReadonlySet<string>,
  ) {}

  add(vals: readonly string[], carrier: boolean): void {
    if (this.mode === "all") {
      for (const s of this.selected) if (!vals.includes(s)) return;
    } else if (this.mode === "none") {
      if (!carrier || vals.some((v) => this.selected.has(v))) return;
      this.pool++;
    }
    for (const v of new Set(vals)) this.seen.set(v, (this.seen.get(v) ?? 0) + 1);
  }

  /** The counts for every value the card lists. */
  counts(values: Iterable<string>): Map<string, number> {
    if (this.mode !== "none") return this.seen;
    const out = new Map<string, number>();
    for (const v of values) out.set(v, this.pool - (this.seen.get(v) ?? 0));
    for (const v of this.selected) out.set(v, this.pool);
    return out;
  }
}
