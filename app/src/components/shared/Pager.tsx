import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Previous · "N / M" · Next, the page stepper at the end of a pane's bottom
 *  bar. The PDF viewer's `ActionBar` and the Library's pagination draw this one
 *  control, so both read and behave the same.
 *
 *  - Words ("Previous", "Next") where the bar has room; `compact` draws
 *    chevrons named "Previous page" / "Next page", flipped under RTL.
 *  - The readout is LTR in any direction: "3 / 12" is a numeral pair.
 *  - `editable`: the current page is a field. It reads like the numeral at
 *    rest; Enter or blur goes to the typed page (clamped), Escape puts the
 *    current page back, ArrowUp / ArrowDown step. Escape is consumed, so it
 *    does not also reach a window-level Escape (the Library's clear-selection).
 *  - Plain buttons otherwise: Tab, Enter and Space, nothing global. */
export function Pager({
  page,
  pageCount,
  onPage,
  compact = false,
  editable = false,
  label = "Pages",
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
}) {
  const go = (n: number) => {
    const next = Math.min(Math.max(1, n), Math.max(1, pageCount));
    if (next !== page) onPage(next);
  };
  const step =
    "hit-area text-tab font-medium text-ink-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:text-ink hover:underline transition-colors";
  return (
    <div data-component="Pager" role="group" aria-label={label} className={`flex items-center ${compact ? "gap-2.5" : "gap-4"}`}>
      <button
        type="button"
        data-part="page-prev"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label={compact ? "Previous page" : undefined}
        className={step}
      >
        {compact ? <ChevronLeft size={16} aria-hidden className="rtl:rotate-180" /> : "Previous"}
      </button>
      <span data-part="page-count" dir="ltr" className="flex items-center gap-0.5 text-tab font-semibold text-ink tabular-nums whitespace-nowrap">
        {editable && pageCount > 0 ? <PageField page={page} pageCount={pageCount} onCommit={go} /> : page}
        <span aria-hidden={editable || undefined}>/ {pageCount || "…"}</span>
      </span>
      <button
        type="button"
        data-part="page-next"
        onClick={() => go(page + 1)}
        disabled={pageCount === 0 || page >= pageCount}
        aria-label={compact ? "Next page" : undefined}
        className={step}
      >
        {compact ? <ChevronRight size={16} aria-hidden className="rtl:rotate-180" /> : "Next"}
      </button>
    </div>
  );
}

const PAGE_FIELD =
  "h-6 px-1 rounded-md bg-transparent text-end text-tab font-semibold text-ink tabular-nums hover:bg-warm focus:bg-warm focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 transition-colors";

/** The current page as a field, sized to the widest page number so the
 *  stepper does not move as the digits change. `Folio` draws it too, with its
 *  own type (`className`) and Home / End for the first and last page. */
export function PageField({
  page,
  pageCount,
  onCommit,
  className = PAGE_FIELD,
  edges = false,
}: {
  page: number;
  pageCount: number;
  onCommit: (n: number) => void;
  className?: string;
  /** Home and End go to the first and last page instead of moving the caret. */
  edges?: boolean;
}) {
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
    } else if (edges && (e.key === "Home" || e.key === "End")) {
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
      className={className}
    />
  );
}
