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
      {/* Left: OCR button + View legend */}
      <div className="flex items-center gap-4">
        <button className="px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors">
          OCR PDF
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-ink-tertiary">View:</span>
          <span className="w-3.5 h-3.5 rounded bg-[#FCE96A]" />
          <span className="w-3.5 h-3.5 rounded bg-[#FDBA8C]" />
          <span className="w-3.5 h-3.5 rounded bg-[#E74694]" />
        </div>
      </div>

      {/* Right: Pager */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => goTo(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="text-[13px] font-medium text-carbon disabled:opacity-30 disabled:cursor-not-allowed hover:underline transition-colors"
        >
          Previous
        </button>
        <span className="text-[13px] font-semibold text-ink tabular-nums">
          {currentPage} / {numPages || "..."}
        </span>
        <button
          onClick={() => goTo(Math.min(numPages, currentPage + 1))}
          disabled={currentPage >= numPages}
          className="text-[13px] font-medium text-carbon disabled:opacity-30 disabled:cursor-not-allowed hover:underline transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
