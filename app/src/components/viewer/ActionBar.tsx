import { useAtom } from "jotai";
import { currentPageAtom } from "../../atoms/selection";

interface ActionBarProps {
  numPages: number;
  onScrollToPage: (page: number) => void;
}

export function ActionBar({ numPages, onScrollToPage }: ActionBarProps) {
  const [currentPage] = useAtom(currentPageAtom);

  const goTo = (page: number) => {
    onScrollToPage(page);
  };

  return (
    <div
      className="flex items-center justify-between h-12 px-4 bg-paper shrink-0"
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      {/* Left: OCR button */}
      <button className="px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors">
        OCR PDF
      </button>

      {/* Right: Pager */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => goTo(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="text-[13px] font-medium text-ink-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:text-ink hover:underline transition-colors"
        >
          Previous
        </button>
        <span className="text-[13px] font-semibold text-ink tabular-nums">
          {currentPage} / {numPages || "..."}
        </span>
        <button
          onClick={() => goTo(Math.min(numPages, currentPage + 1))}
          disabled={currentPage >= numPages}
          className="text-[13px] font-medium text-ink-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:text-ink hover:underline transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
