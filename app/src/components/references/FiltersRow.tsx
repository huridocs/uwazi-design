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
  modes?: ViewMode[];
}

export function ViewModeControls({
  modes,
  size = "md",
}: {
  modes?: ViewMode[];
  size?: "sm" | "md";
}) {
  const visibleOptions = modes
    ? toggleOptions.filter((o) => modes.includes(o.id))
    : toggleOptions;
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const [sortOrder, setSortOrder] = useAtom(sortOrderAtom);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const activeSort = sortOptions.find((s) => s.id === sortOrder);
  const h = size === "sm" ? "h-6" : "h-8";

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`flex items-center rounded-md overflow-hidden ${h}`}
        style={{ border: "1px solid var(--border-primary)" }}
      >
        {visibleOptions.map((opt, i) => {
          const isActive = viewMode === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setViewMode(opt.id)}
              className={`px-2 ${h} text-[11px] font-medium transition-colors cursor-pointer ${
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

      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-expanded={dropdownOpen}
          aria-haspopup="listbox"
          className={`flex items-center gap-1 ${h} px-2 text-[11px] font-medium text-ink-secondary
            bg-warm border border-border rounded-md hover:bg-parchment hover:text-ink transition-colors cursor-pointer`}
        >
          {sortOrder === "none" ? "Sort" : activeSort?.label}
          <ChevronDown size={10} className="text-ink-muted" aria-hidden="true" />
        </button>
        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              aria-hidden="true"
              onClick={() => setDropdownOpen(false)}
            />
            <div role="listbox" aria-label="Sort order" className="absolute top-full right-0 mt-1 z-20 bg-paper border border-border rounded-md shadow-lg overflow-hidden w-[100px]">
              {sortOptions.map((opt) => (
                <button
                  key={opt.id}
                  role="option"
                  aria-selected={sortOrder === opt.id}
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
  );
}

export function CollapseControls({
  onCollapseAll,
  onExpandAll,
  disabled = false,
}: {
  onCollapseAll?: () => void;
  onExpandAll?: () => void;
  disabled?: boolean;
}) {
  const [expandedCount] = useAtom(expandedGroupCountAtom);
  const [totalCount] = useAtom(totalGroupCountAtom);

  const collapseDisabled = disabled || expandedCount === 0;
  const expandDisabled =
    disabled || (totalCount > 0 && expandedCount >= totalCount);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onCollapseAll}
        disabled={collapseDisabled}
        className={`text-[11px] font-medium transition-colors px-1 ${
          collapseDisabled
            ? "text-ink-muted cursor-default"
            : "text-ink hover:text-ink-secondary cursor-pointer"
        }`}
      >
        Collapse all
      </button>
      <button
        onClick={onExpandAll}
        disabled={expandDisabled}
        className={`text-[11px] font-medium transition-colors px-1 ${
          expandDisabled
            ? "text-ink-muted cursor-default"
            : "text-ink hover:text-ink-secondary cursor-pointer"
        }`}
      >
        Expand all
      </button>
    </div>
  );
}

export function FiltersRow({ onCollapseAll, onExpandAll, modes }: FiltersRowProps) {
  return (
    <div className="flex items-center justify-between px-3 pb-2">
      <ViewModeControls modes={modes} />
      <CollapseControls onCollapseAll={onCollapseAll} onExpandAll={onExpandAll} />
    </div>
  );
}
