import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Checkbox } from "./Checkbox";

export type FacetMode = "AND" | "OR";

interface FacetSectionProps {
  title: string;
  total: number;
  entries: [string, number][];
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  label: (id: string) => string;
  renderMarker?: (id: string) => ReactNode;
  defaultExpanded?: boolean;
  /** ID treated as "no value for this facet" — pinned at the bottom with a
   *  divider above. Hidden if no entry matches. Mirrors Uwazi's "No label"
   *  bucket. */
  noLabelId?: string;
  /** Label shown for the pinned no-label row (default: "No label"). */
  noLabelText?: string;
  /** Show an inline search box once the facet has more than `searchThreshold`
   *  rows. For facets that get long at full-corpus scale (countries, descriptors). */
  searchable?: boolean;
  /** Row count above which the search box kicks in. Default 8. */
  searchThreshold?: number;
  /** Rows shown before a "Show all" toggle. Default 8 (Infinity = no cap). */
  collapsedCount?: number;
  /** When provided, a small AND/OR segmented control sits under the header —
   *  for multi-value facets where "match all" vs "match any" both make sense
   *  (e.g. descriptors). Omit for single-value facets (country, type). */
  mode?: FacetMode;
  onModeChange?: (mode: FacetMode) => void;
  /** Reset just this facet (clears its selections). Shown as a header "Clear"
   *  affordance whenever the facet has an active selection. */
  onClear?: () => void;
}

export function FacetSection({
  title,
  total,
  entries,
  selected,
  onToggle,
  label,
  renderMarker,
  defaultExpanded = true,
  noLabelId,
  noLabelText = "No label",
  searchable = false,
  searchThreshold = 8,
  collapsedCount = 8,
  mode,
  onModeChange,
  onClear,
}: FacetSectionProps) {
  const [open, setOpen] = useState(defaultExpanded);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const selectedCount = entries.reduce(
    (n, [id]) => n + (selected[id] ? 1 : 0),
    0,
  );

  const noLabelEntry = noLabelId
    ? entries.find(([id]) => id === noLabelId)
    : undefined;
  const allRegular = noLabelId
    ? entries.filter(([id]) => id !== noLabelId)
    : entries;

  const showSearch = searchable && allRegular.length > searchThreshold;
  const q = query.trim().toLowerCase();
  const matched = useMemo(
    () =>
      q
        ? allRegular.filter(([id]) => label(id).toLowerCase().includes(q))
        : allRegular,
    [allRegular, q, label],
  );

  // Searching reveals everything that matches; otherwise cap to collapsedCount.
  const cap = q || showAll ? Infinity : collapsedCount;
  const regularEntries = matched.slice(0, cap);
  const hiddenCount = matched.length - regularEntries.length;

  return (
    <div style={{ borderBottom: "1px solid var(--border-soft)" }}>
      <div
        className={`flex items-center gap-2 px-4 py-2.5 transition-colors ${
          open ? "" : "hover:bg-warm"
        }`}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer text-left"
        >
          <ChevronDown
            size={12}
            className={`text-ink-tertiary shrink-0 transition-transform ${
              open ? "" : "-rotate-90"
            }`}
          />
          <span className="text-xs font-semibold text-ink-secondary truncate">
            {title}
          </span>
          {selectedCount > 0 && (
            <span className="shrink-0 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-carbon/10 text-[10px] font-semibold text-carbon tabular-nums">
              {selectedCount}
            </span>
          )}
        </button>
        {selectedCount > 0 && onClear ? (
          <button
            onClick={onClear}
            className="shrink-0 inline-flex items-center gap-0.5 text-[11px] text-ink-tertiary hover:text-ink transition-colors cursor-pointer"
          >
            <X size={11} />
            Clear
          </button>
        ) : (
          <span className="shrink-0 text-[11px] text-ink-tertiary tabular-nums">
            {total}
          </span>
        )}
      </div>
      {open && (
        <div className="pb-2">
          {(showSearch || mode) && (
            <div className="px-4 pt-0.5 pb-2 space-y-2">
              {mode && onModeChange && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-ink-muted">
                    Match
                  </span>
                  <div className="inline-flex items-center gap-0.5 bg-warm rounded-md p-0.5">
                    {(["AND", "OR"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => onModeChange(m)}
                        className={`px-2 h-5 rounded text-[10px] font-bold tracking-wide transition-colors cursor-pointer ${
                          mode === m
                            ? "bg-vellum text-ink"
                            : "text-ink-tertiary hover:text-ink-secondary"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {showSearch && (
                <div className="relative flex items-center gap-1.5 h-7 px-2 bg-warm border border-border rounded-md focus-within:ring-2 focus-within:ring-carbon/20 focus-within:border-carbon/40 transition-all">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search ${title.toLowerCase()}`}
                    aria-label={`Search ${title}`}
                    className="flex-1 min-w-0 bg-transparent text-xs placeholder:text-ink-muted focus:outline-none"
                  />
                  {query ? (
                    <button
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                      className="shrink-0 text-ink-muted hover:text-ink cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  ) : (
                    <Search size={12} className="text-ink-muted shrink-0" />
                  )}
                </div>
              )}
            </div>
          )}
          {matched.length === 0 && (
            <p className="px-4 py-1.5 text-xs text-ink-muted">No matches.</p>
          )}
          {regularEntries.map(([id, count]) => {
            const checked = !!selected[id];
            return (
              <label
                key={id}
                className={`flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-colors ${
                  checked ? "bg-carbon/[0.04] hover:bg-carbon/[0.07]" : "hover:bg-warm"
                }`}
              >
                <Checkbox
                  checked={checked}
                  onChange={() => onToggle(id)}
                  ariaLabel={label(id)}
                />
                {renderMarker?.(id)}
                <span
                  className={`text-xs truncate flex-1 ${
                    checked ? "text-ink font-medium" : "text-ink-secondary"
                  }`}
                >
                  {label(id)}
                </span>
                <span className="text-[11px] text-ink-tertiary tabular-nums shrink-0">
                  {count}
                </span>
              </label>
            );
          })}
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="px-4 py-1.5 text-xs font-medium text-ink-secondary underline underline-offset-2 hover:text-ink transition-colors cursor-pointer"
            >
              Load {hiddenCount} more
            </button>
          )}
          {showAll && !q && matched.length > collapsedCount && (
            <button
              onClick={() => setShowAll(false)}
              className="px-4 py-1.5 text-xs font-medium text-ink-tertiary underline underline-offset-2 hover:text-ink transition-colors cursor-pointer"
            >
              Show less
            </button>
          )}
          {noLabelEntry && (
            <label className="flex items-center gap-2 px-4 py-1.5 cursor-pointer hover:bg-warm transition-colors border-t border-border-soft">
              <Checkbox
                checked={!!selected[noLabelEntry[0]]}
                onChange={() => onToggle(noLabelEntry[0])}
                ariaLabel={noLabelText}
              />
              <span className="text-xs italic text-ink-tertiary truncate flex-1">
                {noLabelText}
              </span>
              <span className="text-[11px] text-ink-tertiary tabular-nums shrink-0">
                {noLabelEntry[1]}
              </span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
