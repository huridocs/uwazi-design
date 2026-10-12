import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BAR_GHOST } from "./warmButton";

/** The page stepper at the end of a pane's bottom bar: "‹ 3 / 147 ›", set in
 *  the bar's caption type so it reads as one line with whatever sits before it
 *  (`lead`: the Library's range and page size). The Library's Cards and List
 *  and the PDF viewer's `ActionBar` draw it; the viewer draws a second one for
 *  its search matches (`onStep`).
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
 *    not drawn.
 *  - `onStep` makes it a cycle instead of a range (the PDF's search matches,
 *    `noun="match"`): `page` may be 0 before the first step, the chevrons stay
 *    on while there is anything to step and hand only the direction to
 *    `onStep`, which wraps. No first / last, no field; the readout is a
 *    status, so each step is announced. */
export function Folio({
  page,
  pageCount,
  onPage,
  compact = false,
  editable = false,
  label = "Pages",
  noun = "page",
  lead,
  onStep,
}: {
  /** 1-based; 0 only with `onStep`, before the first step. */
  page: number;
  /** 0 while unknown: the readout shows "…" (a cycle shows 0) and Next is off. */
  pageCount: number;
  onPage?: (page: number) => void;
  /** Cycle mode: the chevrons call this with the direction instead of `onPage`. */
  onStep?: (dir: -1 | 1) => void;
  /** What a chevron steps to: "Previous page", "Next match". Also prefixes
   *  the parts (`page-prev`, `match-count`). */
  noun?: string;
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
    if (next !== page) onPage?.(next);
  };
  const cycle = !!onStep;
  const atFirst = cycle ? pageCount === 0 : page <= 1;
  const atLast = pageCount === 0 || (!cycle && page >= pageCount);
  // Home / End from a chevron. The field handles its own (`edges`), so a
  // Home typed there is not read twice.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (cycle || (e.target as HTMLElement).tagName === "INPUT") return;
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
    if (onStep) onStep(dir);
    else if (e.shiftKey) go(dir < 0 ? 1 : last);
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
          data-part={`${noun}-prev`}
          onClick={step(-1)}
          aria-disabled={atFirst || undefined}
          aria-label={`Previous ${noun}`}
          aria-keyshortcuts={cycle ? undefined : "Home"}
          title={atFirst || cycle ? undefined : `Previous ${noun} · Shift-click or Home for the first`}
          className={chevron}
        >
          <ChevronLeft size={15} aria-hidden className="rtl:rotate-180" />
        </button>
        <span
          data-part={`${noun}-count`}
          dir="ltr"
          role={cycle ? "status" : undefined}
          className="flex items-center gap-0.5 tabular-nums whitespace-nowrap"
        >
          {editable && !cycle && pageCount > 0 ? (
            <PageField page={page} pageCount={pageCount} onCommit={go} />
          ) : (
            // Sized and padded as the field is, so a read-only readout sits
            // like an editable one and the chevrons hold still as the digits
            // grow.
            <span
              className="px-1 font-semibold text-ink text-end"
              style={{ minWidth: `calc(${String(Math.max(page, pageCount)).length}ch + 0.5rem)` }}
            >
              {page}
            </span>
          )}
          <span aria-hidden={editable || undefined} className="text-ink-tertiary">
            / {pageCount || cycle ? pageCount.toLocaleString() : "…"}
          </span>
        </span>
        <button
          type="button"
          data-part={`${noun}-next`}
          onClick={step(1)}
          aria-disabled={atLast || undefined}
          aria-label={`Next ${noun}`}
          aria-keyshortcuts={cycle ? undefined : "End"}
          title={atLast || cycle ? undefined : `Next ${noun} · Shift-click or End for the last`}
          className={chevron}
        >
          <ChevronRight size={15} aria-hidden className="rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
}

/** The current page as a field, sized to the widest page number so the
 *  stepper does not move as the digits change. Home and End go to the first
 *  and last page instead of moving the caret. */
function PageField({ page, pageCount, onCommit }: { page: number; pageCount: number; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState(String(page));
  useEffect(() => setDraft(String(page)), [page]);
  // Escape blurs the field; the blur that follows must not commit the draft.
  const cancelled = useRef(false);
  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const n = Number.parseInt(draft, 10);
    if (Number.isFinite(n)) onCommit(n);
    setDraft(String(page));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setDraft(String(page));
      cancelled.current = true;
      e.currentTarget.blur();
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      onCommit(page + (e.key === "ArrowUp" ? 1 : -1));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      e.stopPropagation();
      onCommit(e.key === "Home" ? 1 : pageCount);
    }
  };
  const digits = String(pageCount).length;
  return (
    <input
      type="text"
      inputMode="numeric"
      data-part="page-input"
      aria-label={`Page, of ${pageCount.toLocaleString()}`}
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
      onKeyDown={onKeyDown}
      onBlur={commit}
      onFocus={(e) => e.currentTarget.select()}
      // Reads as the numeral at rest; the warm box shows only on hover and
      // focus. `ch` + the padding: tabular digits are one `ch` each.
      style={{ width: `calc(${digits}ch + 0.5rem)` }}
      className="h-6 px-1 rounded-md bg-transparent text-end text-xs font-semibold text-ink tabular-nums
        hover:bg-warm focus:bg-warm focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 transition-colors"
    />
  );
}
