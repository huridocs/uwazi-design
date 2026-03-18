import { Reference, RelationType, relationTypes } from "../../data/references";

interface DensityCardProps {
  references: Reference[];
  totalPages: number;
}

const categoryColors: Record<RelationType, string> = {
  mentions: "#7C3AED",
  relates_to: "#00B4F0",
  cites: "#D97706",
  refers_to: "#059669",
};

export function DensityCard({ references, totalPages }: DensityCardProps) {
  const pages = Array.from({ length: Math.min(totalPages, 20) }, (_, i) => i + 1);

  // Count per page per category
  const pageCategoryCounts = new Map<number, Map<RelationType, number>>();
  references.forEach((ref) => {
    const page = ref.sourceSelection.page;
    if (!pageCategoryCounts.has(page)) pageCategoryCounts.set(page, new Map());
    const cats = pageCategoryCounts.get(page)!;
    cats.set(ref.relationType, (cats.get(ref.relationType) || 0) + 1);
  });

  // Max total per page for scaling
  const maxTotal = Math.max(
    ...pages.map((p) => {
      const cats = pageCategoryCounts.get(p);
      if (!cats) return 0;
      let sum = 0;
      cats.forEach((v) => (sum += v));
      return sum;
    }),
    1
  );

  // Which categories actually appear
  const activeCategories = relationTypes.filter((rt) =>
    references.some((r) => r.relationType === rt.id)
  );

  return (
    <div className="px-3 py-3">
      <h4 className="text-xs font-medium text-ink-tertiary mb-3 uppercase tracking-wide">
        Reference Density by Page
      </h4>
      <div className="flex items-end gap-1" style={{ height: 96 }} role="img" aria-label={`Reference density chart: ${references.length} references across ${pageCategoryCounts.size} pages`}>
        {pages.map((page) => {
          const cats = pageCategoryCounts.get(page);
          const total = cats ? Array.from(cats.values()).reduce((a, b) => a + b, 0) : 0;
          const barHeight = total > 0 ? Math.max(8, Math.round((total / maxTotal) * 80)) : 3;

          return (
            <div key={page} className="flex flex-col items-center justify-end flex-1 h-full">
              {total > 0 ? (
                <div
                  className="w-full rounded-t overflow-hidden flex flex-col-reverse"
                  style={{ height: barHeight }}
                  title={`Page ${page}: ${total} references`}
                >
                  {activeCategories.map((rt) => {
                    const count = cats?.get(rt.id) || 0;
                    if (count === 0) return null;
                    const pct = (count / total) * 100;
                    return (
                      <div
                        key={rt.id}
                        style={{ height: `${pct}%`, backgroundColor: categoryColors[rt.id] }}
                      />
                    );
                  })}
                </div>
              ) : (
                <div
                  className="w-full rounded-t bg-border"
                  style={{ height: barHeight }}
                  title={`Page ${page}: 0 references`}
                />
              )}
              <span className="text-[9px] text-ink-muted mt-1 shrink-0">{page}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {activeCategories.map((rt) => (
          <div key={rt.id} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: categoryColors[rt.id] }}
            />
            <span className="text-[10px] text-ink-muted">{rt.label}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-2 text-[10px] text-ink-muted">
        <span>{references.length} references</span>
        <span>{pageCategoryCounts.size} pages with references</span>
      </div>
    </div>
  );
}
