import { ReactNode } from "react";
import { useAtom } from "jotai";
import { currentPageAtom } from "../../atoms/selection";
import { useNotify } from "../../hooks/useNotify";

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
}

export function ActionBar({ numPages, onScrollToPage, leftSlot, rightSlot, showPager = true }: ActionBarProps) {
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

      {/* Right: Pager (PDF only) + optional trailing menu slot */}
      <div className="flex items-center gap-4">
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
