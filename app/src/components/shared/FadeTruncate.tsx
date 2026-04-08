import { useState } from "react";
import { useTextMeasure } from "../../hooks/useTextMeasure";

interface FadeTruncateProps {
  text: string;
  maxLines?: number;
  expandable?: boolean;
  fadeTo?: string;
  className?: string;
}

export function FadeTruncate({
  text,
  maxLines = 2,
  expandable = false,
  fadeTo = "var(--bg-surface)",
  className = "",
}: FadeTruncateProps) {
  const [expanded, setExpanded] = useState(false);
  const { containerRef, isTruncated, visibleHeight } = useTextMeasure({
    text,
    maxLines,
  });

  const showFade = isTruncated && !expanded;

  return (
    <div ref={containerRef} className="relative">
      <p
        className={`overflow-hidden transition-[max-height] duration-200 ease-out ${className}`}
        style={{ maxHeight: expanded ? 1000 : visibleHeight }}
      >
        &ldquo;{text}&rdquo;
      </p>
      {showFade && (
        <div
          className="absolute bottom-0 inset-x-0 pointer-events-none"
          style={{
            height: 20,
            background: `linear-gradient(to bottom, transparent, ${fadeTo})`,
          }}
        />
      )}
      {expandable && isTruncated && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="text-[10px] font-medium text-ink-tertiary hover:text-ink-secondary mt-0.5 transition-colors"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
