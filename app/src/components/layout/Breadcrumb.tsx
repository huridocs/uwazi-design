import { ChevronRight } from "lucide-react";

interface BreadcrumbProps {
  segments: { label: string; onClick?: () => void }[];
}

export function Breadcrumb({ segments }: BreadcrumbProps) {
  return (
    <nav data-component="Breadcrumb" className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        // Same recipe as the Settings header: ancestors are tertiary links, the
        // last segment is the page title.
        const labelClass = !isLast
          ? "text-ink-tertiary hover:text-ink hover:underline transition-colors"
          : "font-semibold text-ink";
        return (
          <span key={i} data-part="segment" className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} data-part="separator" aria-hidden className="text-ink-muted" />}
            {!isLast && seg.onClick ? (
              <button type="button" onClick={seg.onClick} data-part="link" className={labelClass}>
                {seg.label}
              </button>
            ) : (
              <span data-part="current" aria-current={isLast ? "page" : undefined} className={labelClass}>{seg.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
