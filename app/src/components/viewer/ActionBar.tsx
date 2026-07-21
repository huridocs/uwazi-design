import { ReactNode } from "react";
import { useAtom } from "jotai";
import { ChevronUp, ChevronDown } from "lucide-react";
import { currentPageAtom } from "../../atoms/selection";
import { useNotify } from "../../hooks/useNotify";

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
}

export function ActionBar({ numPages, onScrollToPage, leftSlot, rightSlot, showPager = true, matchNav }: ActionBarProps) {
  const [currentPage] = useAtom(currentPageAtom);
  const notify = useNotify();

  const goTo = (page: number) => {
    onScrollToPage(page);
  };

  return (
    <div
      className="flex items-center justify-between h-12 px-4 bg-paper shrink-0"
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      {/* Left: optional slot or default OCR button (PDF only) */}
      {leftSlot ?? (showPager ? (
        <button
          onClick={() => notify("OCR queued")}
          className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
        >
          OCR PDF
        </button>
      ) : <span />)}

      {/* Right: match stepper + pager (PDF only) + optional trailing menu slot */}
      <div className="flex items-center gap-4">
        {matchNav && (
          <div className="flex items-center gap-1" role="group" aria-label="Search matches">
            <button
              onClick={matchNav.onPrev}
              disabled={matchNav.count === 0}
              aria-label="Previous match"
              className="p-1 rounded-md text-ink-secondary hover:bg-parchment hover:text-ink
                disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent
                transition-colors cursor-pointer"
            >
              <ChevronUp size={14} aria-hidden="true" />
            </button>
            {/* Announced on each step, so keyboard stepping isn't silent. The
                min-width keeps the pager still as the digits grow. */}
            <span
              role="status"
              dir="ltr"
              className="min-w-[3.25rem] text-center text-[13px] font-semibold text-ink tabular-nums"
            >
              {matchNav.index} / {matchNav.count}
            </span>
            <button
              onClick={matchNav.onNext}
              disabled={matchNav.count === 0}
              aria-label="Next match"
              className="p-1 rounded-md text-ink-secondary hover:bg-parchment hover:text-ink
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
              onClick={() => goTo(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="text-[13px] font-medium text-ink-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:text-ink hover:underline transition-colors"
            >
              Previous
            </button>
            <span dir="ltr" className="text-[13px] font-semibold text-ink tabular-nums">
              {currentPage} / {numPages || "..."}
            </span>
            <button
              onClick={() => goTo(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
              className="text-[13px] font-medium text-ink-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:text-ink hover:underline transition-colors"
            >
              Next
            </button>
          </>
        )}
        {rightSlot}
      </div>
    </div>
  );
}
