import { ChevronDown } from "lucide-react";
import { currentDocument } from "../../data/document";

export function DocMeta() {
  return (
    <div
      className="flex items-center gap-2 h-10 px-4 shrink-0"
      style={{ borderBottom: "1px solid var(--border-primary)" }}
    >
      {/* Entity type pill */}
      <span className="px-1.5 py-0.5 text-xs font-semibold rounded bg-[#C4B5FD] text-[#4C1D95] shrink-0">
        Case
      </span>

      {/* Document title */}
      <span className="text-xs font-semibold text-ink truncate flex-1">
        {currentDocument.title}
      </span>

      {/* PDF dropdown */}
      <button className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-ink rounded-md bg-warm border border-border shrink-0 hover:bg-parchment transition-colors">
        PDF
        <ChevronDown size={12} className="text-ink-tertiary" />
      </button>
    </div>
  );
}
