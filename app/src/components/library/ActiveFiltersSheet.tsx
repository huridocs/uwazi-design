import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ChevronDown } from "lucide-react";
import { libraryActiveFilterCountAtom, clearLibraryFiltersAtom } from "../../atoms/library";
import { useActiveFilters } from "../../hooks/useActiveFilters";
import { ActiveFilterChip } from "../shared/ActiveFilterChip";

/** A sheet across the bottom of the Filters drawer, listing what's on.
 *
 *  The panel's twenty facet cards tell you what you COULD filter by; scrolling
 *  them to find the four boxes you ticked is not reading your query. This is the
 *  query, in one place, at the foot of the surface that owns it — chips you can
 *  drop individually, and a Clear all.
 *
 *  It shares `useActiveFilters` with the action bar's popover, so the two views
 *  of the same state can't disagree. It's a sheet, not a fixed block: it rises
 *  only when there's something to say, caps its height and scrolls, and can be
 *  collapsed to its handle when the facets below matter more. */
export function ActiveFiltersSheet() {
  const count = useAtomValue(libraryActiveFilterCountAtom);
  // Clears EVERYTHING this sheet lists — the search chip included. The facets-
  // only clear stays on the panel's footer button, where "Clear" sits under the
  // facet cards and doesn't look like it reaches the search box. Here it does:
  // the query chip is in the list directly beneath it, and now that emptying the
  // search box no longer drops the query, this is the button people reach for.
  const clearAll = useSetAtom(clearLibraryFiltersAtom);
  const items = useActiveFilters();
  const [open, setOpen] = useState(true);

  if (count === 0) return null;

  return (
    <div
      className="shrink-0 bg-paper animate-fade-in-up"
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      <div className="flex items-center gap-2 px-3.5 h-9">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide
            text-ink-tertiary hover:text-ink transition-colors cursor-pointer"
        >
          <ChevronDown
            size={13}
            className={`transition-transform ${open ? "" : "-rotate-90"}`}
          />
          Active filters
          <span
            className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] tabular-nums"
            style={{ backgroundColor: "var(--bg-muted)", color: "var(--text-secondary)" }}
          >
            {count}
          </span>
        </button>
        <button
          onClick={() => clearAll()}
          className="ms-auto px-2 h-6 text-[11px] font-medium rounded-md text-ink-tertiary
            hover:bg-parchment hover:text-ink transition-colors cursor-pointer"
        >
          Clear all
        </button>
      </div>

      {open && (
        <div className="h-16 overflow-y-auto px-3.5 pb-3 flex flex-wrap gap-1.5">
          {items.map((it) => (
            <ActiveFilterChip
              key={it.id}
              label={it.label}
              color={it.color}
              onRemove={it.remove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
