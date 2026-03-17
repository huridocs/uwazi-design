import { Reference } from "../../data/references";

interface DensityCardProps {
  references: Reference[];
  totalPages: number;
}

export function DensityCard({ references, totalPages }: DensityCardProps) {
  // Count references per page
  const pageCounts = new Map<number, number>();
  references.forEach((ref) => {
    const page = ref.sourceSelection.page;
    pageCounts.set(page, (pageCounts.get(page) || 0) + 1);
  });

  const maxCount = Math.max(...Array.from(pageCounts.values()), 1);
  const pages = Array.from({ length: Math.min(totalPages, 20) }, (_, i) => i + 1);

  return (
    <div className="px-3 py-3">
      <h4 className="text-xs font-medium text-ink-tertiary mb-3 uppercase tracking-wide">
        Reference Density by Page
      </h4>
      <div className="flex items-end gap-1 h-24">
        {pages.map((page) => {
          const count = pageCounts.get(page) || 0;
          const height = count > 0 ? Math.max(8, (count / maxCount) * 100) : 4;
          return (
            <div key={page} className="flex flex-col items-center flex-1 gap-1">
              <div
                className={`w-full rounded-t transition-all ${
                  count > 0 ? "bg-carbon" : "bg-border"
                }`}
                style={{ height: `${height}%` }}
                title={`Page ${page}: ${count} references`}
              />
              <span className="text-[9px] text-ink-muted">{page}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-ink-muted">
        <span>{references.length} references</span>
        <span>{pageCounts.size} pages with references</span>
      </div>
    </div>
  );
}
