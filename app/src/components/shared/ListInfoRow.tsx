import { ReactNode } from "react";
import { ActiveFilterChips } from "../relationships/ActiveFilterChips";

interface ListInfoRowProps {
  /** `null` when the surface's number lives in its masthead instead — the row
   *  keeps its height and its slots, it just doesn't repeat the count. */
  count: ReactNode;
  activeFilterCount: number;
  showFilterChips?: boolean;
  /** Controls that belong WITH the count and whose own width is STABLE — the
   *  match-type toggles. They ride this row rather than a row of their own (a
   *  strip that exists only while a query does shoves the list down the moment
   *  you type), and they go BEFORE the count because the count is the part that
   *  resizes: toggling rewrites "3,996" as "1,626 of 3,996", and anything sitting
   *  after it slides out from under the cursor mid-click. Fixed things anchor the
   *  row's start; the reflowing total trails. */
  leadingSlot?: ReactNode;
  /** As `leadingSlot`, but after the count — for things that DON'T move when the
   *  count is rewritten, or that themselves change width with it. */
  inlineSlot?: ReactNode;
  rightSlot?: ReactNode;
}

/** Carries no side padding: it is rendered inside a gutter host, which sets the
 *  row's inset (see `gutter-host` in index.css). */
export function ListInfoRow({
  count,
  activeFilterCount,
  showFilterChips = true,
  leadingSlot,
  inlineSlot,
  rightSlot,
}: ListInfoRowProps) {
  return (
    <div data-component="ListInfoRow" className="pt-1 pb-2 flex items-center justify-between gap-2 flex-wrap text-meta text-ink-tertiary shrink-0">
      <div data-part="summary" className="flex items-center gap-2 flex-wrap">
        {leadingSlot}
        {count != null && (
          <span data-part="count" className="shrink-0">
            {count}
          </span>
        )}
        {inlineSlot}
        {showFilterChips && activeFilterCount > 0 && (
          <>
            <span data-part="filters-label" className="shrink-0 font-medium text-ink-secondary">
              Filters:
            </span>
            <ActiveFilterChips />
          </>
        )}
      </div>
      {rightSlot}
    </div>
  );
}
