import { ReactNode } from "react";
import { useAtom } from "jotai";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { currentPageAtom } from "../../atoms/selection";
import { useNotify } from "../../hooks/useNotify";
import { BAR_GHOST } from "../shared/warmButton";

/** Prev/next stepping through the search matches marked in the document. */
export interface MatchNav {
  /** 1-based position of the active match — `0` before the first step. */
  index: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
}

interface ActionBarProps {
  numPages: number;
  onScrollToPage: (page: number) => void;
  /** Optional content to render on the left side instead of the OCR button */
  leftSlot?: ReactNode;
  /** Optional trailing slot, right of the pager — hosts the mobile sheet
   *  trigger so "show more" sits at the right of the bar, not over content. */
  rightSlot?: ReactNode;
  /** Hide the OCR button + page pager (e.g. plain-text / HTML renditions that
   *  aren't paginated). The trailing slot still renders. */
  showPager?: boolean;
  /** Search-match stepper, left of the page pager. Omit when nothing is being
   *  searched — the pager steps PAGES, this steps HITS, so they're deliberately
   *  different shapes (icons vs words) sitting side by side. */
  matchNav?: MatchNav;
  /** Phones: zoom controls in place of the OCR button (M21). */
  zoom?: { percent: number; onOut: () => void; onIn: () => void; onFit: () => void; canOut: boolean; canIn: boolean };
}

export function ActionBar({ numPages, onScrollToPage, leftSlot, rightSlot, showPager = true, matchNav, zoom }: ActionBarProps) {
  const [currentPage] = useAtom(currentPageAtom);
  const notify = useNotify();

  const goTo = (page: number) => {
    onScrollToPage(page);
  };

  return (
    <div
      data-component="ActionBar"
      // No baked side padding: `bleed` takes the host pane's gutter (12 under the
      // entity and relationships views), and the rule still spans the pane.
      className="bleed flex items-center justify-between h-12 bg-paper shrink-0"
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      {/* Left: optional slot or default OCR button (PDF only) */}
      {zoom ? (
        <div data-part="zoom" role="group" aria-label="Zoom" className="flex items-center gap-0.5" data-gutter-align="box">
          <button type="button" data-part="zoom-out" onClick={zoom.onOut} disabled={!zoom.canOut} aria-label="Zoom out" className={`hit-area w-8 h-8 grid place-items-center rounded-md ${BAR_GHOST} disabled:opacity-30 transition-colors cursor-pointer`}>
            <Minus size={15} aria-hidden />
          </button>
          <span data-part="zoom-level" aria-live="polite" className="min-w-[3rem] text-center text-xs font-medium tabular-nums text-ink-secondary">
            {zoom.percent}%
          </span>
          <button type="button" data-part="zoom-in" onClick={zoom.onIn} disabled={!zoom.canIn} aria-label="Zoom in" className={`hit-area w-8 h-8 grid place-items-center rounded-md ${BAR_GHOST} disabled:opacity-30 transition-colors cursor-pointer`}>
            <Plus size={15} aria-hidden />
          </button>
          <button type="button" data-part="zoom-fit" onClick={zoom.onFit} disabled={zoom.percent === 100} className={`ms-1 h-8 px-2 rounded-md text-xs font-medium ${BAR_GHOST} disabled:opacity-30 transition-colors cursor-pointer`}>
            Fit
          </button>
        </div>
      ) : leftSlot ?? (showPager ? (
        <button
          type="button"
          data-part="ocr"
          onClick={() => notify("OCR queued")}
          data-gutter-align="box"
          className={`px-3 py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer`}
        >
          OCR PDF
        </button>
      ) : <span />)}

      {/* Right: match stepper + pager (PDF only) + optional trailing menu slot */}
      <div data-part="actions" className={`flex items-center ${zoom ? "gap-2.5" : "gap-4"}`}>
        {matchNav && (
          <div data-part="match-nav" className="flex items-center gap-1" role="group" aria-label="Search matches">
            <button
              type="button"
              data-part="match-prev"
              onClick={matchNav.onPrev}
              disabled={matchNav.count === 0}
              aria-label="Previous match"
              className="hit-area p-1 rounded-md text-ink-secondary hover:bg-parchment hover:text-ink
                disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent
                transition-colors cursor-pointer"
            >
              <ChevronUp size={14} aria-hidden="true" />
            </button>
            {/* Announced on each step, so keyboard stepping isn't silent. The
                min-width keeps the pager still as the digits grow. */}
            <span
              role="status"
              data-part="match-count"
              dir="ltr"
              className="min-w-[3.25rem] text-center text-tab font-semibold text-ink tabular-nums"
            >
              {matchNav.index} / {matchNav.count}
            </span>
            <button
              type="button"
              data-part="match-next"
              onClick={matchNav.onNext}
              disabled={matchNav.count === 0}
              aria-label="Next match"
              className="hit-area p-1 rounded-md text-ink-secondary hover:bg-parchment hover:text-ink
                disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent
                transition-colors cursor-pointer"
            >
              <ChevronDown size={14} aria-hidden="true" />
            </button>
          </div>
        )}
        {showPager && (
          <>
            <button
              type="button"
              data-part="page-prev"
              onClick={() => goTo(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              aria-label={zoom ? "Previous page" : undefined}
              className="hit-area text-tab font-medium text-ink-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:text-ink hover:underline transition-colors"
            >
              {/* With the zoom group beside it (phones) the words don't fit. */}
              {zoom ? <ChevronLeft size={16} aria-hidden className="rtl:rotate-180" /> : "Previous"}
            </button>
            <span data-part="page-count" dir="ltr" className="text-tab font-semibold text-ink tabular-nums whitespace-nowrap">
              {currentPage} / {numPages || "…"}
            </span>
            <button
              type="button"
              data-part="page-next"
              onClick={() => goTo(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
              aria-label={zoom ? "Next page" : undefined}
              className="hit-area text-tab font-medium text-ink-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:text-ink hover:underline transition-colors"
            >
              {zoom ? <ChevronRight size={16} aria-hidden className="rtl:rotate-180" /> : "Next"}
            </button>
          </>
        )}
        {rightSlot}
      </div>
    </div>
  );
}
