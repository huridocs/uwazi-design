import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BAR_GHOST } from "./warmButton";
import { PageField } from "./Pager";

/** The quiet page stepper: "‹ 3 / 147 ›", set in the bar's caption type so it
 *  reads as one line with whatever sits before it (`lead`: the Library's range
 *  and page size). Takes `Pager`'s props, so the PDF viewer's bar could draw
 *  it in place of `Pager`.
 *
 *  - The chevrons are ghost buttons: no fill or edge at rest, warm on hover.
 *    They are named "Previous page" / "Next page" and flip under RTL. At
 *    the first or last page a chevron is `aria-disabled` in `text-ink-muted`
 *    and keeps the focus.
 *  - First and last page: Home / End anywhere in the stepper (chevrons and
 *    field), or Shift-click on a chevron.
 *  - `editable`: the current page is a field that reads as the numeral at rest
 *    (`PageField`: Enter or blur goes, Escape restores, ArrowUp / ArrowDown
 *    step). Escape is consumed, so it does not reach a window-level Escape.
 *  - The readout is LTR in any direction: "3 / 147" is a numeral pair.
 *  - `compact` (phones): the chevrons take a larger hit area and the lead is
 *    not drawn. */
export function Folio({
  page,
  pageCount,
  onPage,
  compact = false,
  editable = false,
  label = "Pages",
  lead,
}: {
  /** 1-based. */
  page: number;
  /** 0 while unknown: the readout shows "…" and Next is off. */
  pageCount: number;
  onPage: (page: number) => void;
  compact?: boolean;
  editable?: boolean;
  /** The group's accessible name. */
  label?: string;
  /** Drawn before the stepper in the same group, in the same type. */
  lead?: ReactNode;
}) {
  const last = Math.max(1, pageCount);
  const go = (n: number) => {
    const next = Math.min(Math.max(1, n), last);
    if (next !== page) onPage(next);
  };
  const atFirst = page <= 1;
  const atLast = pageCount === 0 || page >= pageCount;
  // Home / End from a chevron. The field handles its own (`edges`), so a
  // Home typed there is not read twice.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    if (e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Home") go(1);
    else if (pageCount > 0) go(pageCount);
  };
  // `aria-disabled`, not `disabled`: a chevron that reaches the first or
  // last page keeps the focus instead of dropping it to the body.
  const step = (dir: -1 | 1) => (e: MouseEvent) => {
    if (dir < 0 ? atFirst : atLast) return;
    if (e.shiftKey) go(dir < 0 ? 1 : last);
    else go(page + dir);
  };
  const chevron = `${compact ? "hit-area size-8" : "size-7"} inline-flex items-center justify-center rounded-md transition-colors
    ${BAR_GHOST} aria-disabled:text-ink-muted aria-disabled:bg-transparent aria-disabled:cursor-not-allowed
    focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35`;
  return (
    <div
      data-component="Folio"
      role="group"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex items-center gap-3 text-xs text-ink-tertiary"
    >
      {!compact && lead}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          data-part="page-prev"
          onClick={step(-1)}
          aria-disabled={atFirst || undefined}
          aria-label="Previous page"
          aria-keyshortcuts="Home"
          title={atFirst ? undefined : "Previous page · Shift-click or Home for the first"}
          className={chevron}
        >
          <ChevronLeft size={15} aria-hidden className="rtl:rotate-180" />
        </button>
        <span data-part="page-count" dir="ltr" className="flex items-center gap-0.5 tabular-nums whitespace-nowrap">
          {editable && pageCount > 0 ? (
            <PageField
              page={page}
              pageCount={pageCount}
              onCommit={go}
              edges
              className="h-6 px-1 rounded-md bg-transparent text-end text-xs font-semibold text-ink tabular-nums
                hover:bg-warm focus:bg-warm focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 transition-colors"
            />
          ) : (
            <span className="font-semibold text-ink">{page}</span>
          )}
          <span aria-hidden={editable || undefined} className="text-ink-tertiary">
            / {pageCount ? pageCount.toLocaleString() : "…"}
          </span>
        </span>
        <button
          type="button"
          data-part="page-next"
          onClick={step(1)}
          aria-disabled={atLast || undefined}
          aria-label="Next page"
          aria-keyshortcuts="End"
          title={atLast ? undefined : "Next page · Shift-click or End for the last"}
          className={chevron}
        >
          <ChevronRight size={15} aria-hidden className="rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
}
