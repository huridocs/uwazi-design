import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  viewModeAtom,
  ViewMode,
  sortOrderAtom,
  SortOrder,
  expandedGroupCountAtom,
  totalGroupCountAtom,
  viewAtom,
  groupByAtom,
  expandAllSignalAtom,
  collapseAllSignalAtom,
} from "../../atoms/filters";

const toggleOptions: { id: ViewMode; label: string }[] = [
  { id: "all", label: "All" },
  { id: "by-entity-type", label: "Entity type" },
  { id: "by-relation-type", label: "Rel. type" },
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
              className={`px-2 ${h} text-meta font-medium transition-colors cursor-pointer ${
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
          className={`flex items-center gap-1 ${h} px-2 text-meta font-medium text-ink-secondary
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
            <div role="listbox" aria-label="Sort order" className="absolute top-full right-0 mt-1 z-20 bg-paper border border-border rounded-md shadow-lg overflow-hidden w-[6.25rem]">
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
  expandedCount: expandedProp,
  totalCount: totalProp,
}: {
  onCollapseAll?: () => void;
  onExpandAll?: () => void;
  disabled?: boolean;
  /** Override the group counts (default: the relationships-panel atoms). Pass
   *  these when reusing outside that panel — e.g. the Library Results tab, whose
   *  cards are standalone and keep their own expand state. */
  expandedCount?: number;
  totalCount?: number;
}) {
  const [expandedAtom] = useAtom(expandedGroupCountAtom);
  const [totalAtom] = useAtom(totalGroupCountAtom);
  const expandedCount = expandedProp ?? expandedAtom;
  const totalCount = totalProp ?? totalAtom;

  const collapseDisabled = disabled || expandedCount === 0;
  const expandDisabled =
    disabled || (totalCount > 0 && expandedCount >= totalCount);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onCollapseAll}
        disabled={collapseDisabled}
        className={`text-meta font-medium transition-colors px-1 ${
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
        className={`text-meta font-medium transition-colors px-1 ${
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

/** `CollapseControls` wired to the Relationships panel — the version every host
 *  on that surface should render.
 *
 *  The pair used to be wired twice, in two `ListInfoRow`s that had nothing else
 *  left to carry: the list body's and the tree's, each computing its own
 *  `showCollapse` from a different expression (`view === "list" && groupBy !==
 *  "none"` against a bare `groupBy !== "none"`) for what is one question. Both
 *  rows are gone and the controls moved to the footer, so the rule lives here
 *  once — and the answer is the same in every view because it is the same code
 *  answering.
 *
 *  Graph is the view with no groups to collapse, and it now says so with a
 *  DISABLED pair rather than by not being there: the body used to return early
 *  before the row, so the controls vanished in graph and reappeared in list,
 *  which reads as the bar losing a control rather than the view not having
 *  groups. */
export function RelationshipsCollapseControls() {
  const view = useAtomValue(viewAtom);
  const groupBy = useAtomValue(groupByAtom);
  const setExpandSignal = useSetAtom(expandAllSignalAtom);
  const setCollapseSignal = useSetAtom(collapseAllSignalAtom);

  return (
    <CollapseControls
      disabled={view === "graph" || groupBy === "none"}
      onExpandAll={() => setExpandSignal((s) => s + 1)}
      onCollapseAll={() => setCollapseSignal((s) => s + 1)}
    />
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
