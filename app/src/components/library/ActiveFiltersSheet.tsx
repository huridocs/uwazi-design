import { useState } from "react";
import { useSetAtom } from "jotai";
import { ChevronDown } from "lucide-react";
import { clearLibraryFacetsAtom } from "../../atoms/library";
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
 *  of the same state can't disagree. It is always mounted at one height, empty
 *  or not, so the facet scroller above never changes size as chips come and
 *  go; the chips wrap and scroll inside it. It can be collapsed to its handle
 *  when the facets matter more. */
export function ActiveFiltersSheet() {
  // The search is not a filter, as Search in and Match are not: the masthead
  // field holds it, and the masthead chip or Adv. Search's term chips end it.
  // So the sheet lists the facets only, and Clear all clears what it lists.
  const clearAll = useSetAtom(clearLibraryFacetsAtom);
  const items = useActiveFilters().filter((f) => f.id !== "q");
  const count = items.length;
  const [open, setOpen] = useState(true);

  return (
    <section
      data-component="ActiveFiltersSheet"
      data-state={open ? "open" : "closed"}
      aria-label="Active filters"
      className="bleed shrink-0 bg-paper"
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      <header data-part="header" className="flex items-center gap-2 h-9">
        <button
          type="button"
          data-part="toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wider
            text-ink-tertiary hover:text-ink transition-colors cursor-pointer"
        >
          <ChevronDown
            aria-hidden
            size={13}
            className={`transition-transform ${open ? "" : "-rotate-90"}`}
          />
          Active filters
          <span
            data-part="count"
            className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-meta tabular-nums"
            style={{ backgroundColor: "var(--bg-muted)", color: "var(--text-secondary)" }}
          >
            {count}
          </span>
        </button>
        <button
          type="button"
          data-part="clear-all"
          onClick={() => clearAll()}
          disabled={count === 0}
          className="ms-auto px-2 h-6 text-meta font-medium rounded-md text-ink-tertiary
            hover:bg-parchment hover:text-ink transition-colors cursor-pointer
            disabled:opacity-40 disabled:pointer-events-none"
        >
          Clear all
        </button>
      </header>

      {open && (
        <div data-part="chips" className="h-16 overflow-y-auto pb-3 flex flex-wrap gap-1.5">
          {count === 0 && <p data-part="empty" className="text-meta text-ink-muted">None</p>}
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
    </section>
  );
}
