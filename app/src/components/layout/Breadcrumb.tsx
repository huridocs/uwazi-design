import { ChevronRight } from "lucide-react";

interface BreadcrumbProps {
  segments: { label: string; onClick?: () => void }[];
}

export function Breadcrumb({ segments }: BreadcrumbProps) {
  const onlyOne = segments.length === 1;
  return (
    <nav className="flex items-center gap-1.5 text-[13px]" aria-label="Breadcrumb">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        // Parent segments: carbon link. Sole segment acts as a page title (also carbon).
        // Trailing segment inside a multi-segment crumb is muted.
        const labelClass = !isLast
          ? "text-carbon font-medium hover:underline"
          : onlyOne
            ? "text-carbon font-medium"
            : "text-ink-tertiary font-medium";
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} className="text-ink-muted" />}
            {!isLast && seg.onClick ? (
              <button onClick={seg.onClick} className={labelClass}>
                {seg.label}
              </button>
            ) : (
              <span className={labelClass}>{seg.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
