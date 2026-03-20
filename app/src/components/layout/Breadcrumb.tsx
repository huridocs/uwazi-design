import { ChevronRight } from "lucide-react";

interface BreadcrumbProps {
  segments: { label: string; onClick?: () => void }[];
}

export function Breadcrumb({ segments }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-[13px]" aria-label="Breadcrumb">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} className="text-ink-muted" />}
            {isLast || !seg.onClick ? (
              <span className={isLast ? "text-ink-tertiary font-medium" : "text-ink font-medium"}>
                {seg.label}
              </span>
            ) : (
              <button
                onClick={seg.onClick}
                className="text-ink font-medium hover:text-carbon transition-colors"
              >
                {seg.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
