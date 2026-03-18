import { useAtom } from "jotai";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { viewModeAtom, ViewMode, sortOrderAtom, SortOrder, expandedGroupCountAtom, totalGroupCountAtom } from "../../atoms/filters";

const toggleOptions: { id: ViewMode; label: string }[] = [
  { id: "all", label: "All" },
  { id: "by-entity-type", label: "Entity type" },
  { id: "by-relation-type", label: "Rel. type" },
  { id: "density", label: "Density" },
];

const sortOptions: { id: SortOrder; label: string }[] = [
  { id: "none", label: "None" },
  { id: "asc", label: "A → Z" },
  { id: "desc", label: "Z → A" },
];

interface FiltersRowProps {
  onCollapseAll?: () => void;
  onExpandAll?: () => void;
}

export function FiltersRow({ onCollapseAll, onExpandAll }: FiltersRowProps) {
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const [sortOrder, setSortOrder] = useAtom(sortOrderAtom);
  const [expandedCount] = useAtom(expandedGroupCountAtom);
  const [totalCount] = useAtom(totalGroupCountAtom);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const allCollapsed = expandedCount === 0;
  const allExpanded = totalCount > 0 && expandedCount >= totalCount;
  const activeSort = sortOptions.find((s) => s.id === sortOrder);

  return (
    <div className="flex items-center justify-between px-3 pb-2">
      {/* Left: segmented toggle + sort dropdown */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center rounded overflow-hidden"
          style={{ border: "1px solid var(--border-primary)" }}
        >
          {toggleOptions.map((opt, i) => {
            const isActive = viewMode === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setViewMode(opt.id)}
                className={`px-2 h-6 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-vellum text-ink"
                    : "text-ink-tertiary hover:text-ink-secondary"
                }`}
                style={{
                  borderLeft: i > 0 ? "1px solid var(--border-primary)" : "none",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 h-6 px-2 text-[11px] font-medium text-ink-tertiary
              bg-warm border border-border rounded hover:bg-parchment hover:text-ink-secondary transition-colors"
          >
            {sortOrder === "none" ? "Sort" : activeSort?.label}
            <ChevronDown size={10} className="text-ink-muted" />
          </button>
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1 z-20 bg-paper border border-border rounded-md shadow-lg overflow-hidden w-[100px]">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSortOrder(opt.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${
                      sortOrder === opt.id
                        ? "bg-vellum text-ink"
                        : "text-ink-secondary hover:bg-warm"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: collapse/expand actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onCollapseAll}
          disabled={allCollapsed}
          className={`text-[11px] font-medium transition-colors px-1 ${
            allCollapsed
              ? "text-ink-muted cursor-default"
              : "text-ink hover:text-ink-secondary"
          }`}
        >
          Collapse all
        </button>
        <button
          onClick={onExpandAll}
          disabled={allExpanded}
          className={`text-[11px] font-medium transition-colors px-1 ${
            allExpanded
              ? "text-ink-muted cursor-default"
              : "text-ink hover:text-ink-secondary"
          }`}
        >
          Expand all
        </button>
      </div>
    </div>
  );
}
