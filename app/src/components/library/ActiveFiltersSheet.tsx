import { useState } from "react";
import { useSetAtom } from "jotai";
import { ChevronDown } from "lucide-react";
import { clearLibraryFiltersAtom } from "../../atoms/library";
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
  // Clears EVERYTHING this sheet lists — the search chip included. The facets-
  // only clear stays on the panel's footer button, where "Clear" sits under the
  // facet cards and doesn't look like it reaches the search box. Here it does:
  // the query chip is in the list directly beneath it, and now that emptying the
  // search box no longer drops the query, this is the button people reach for.
  const clearAll = useSetAtom(clearLibraryFiltersAtom);
  const items = useActiveFilters();
  // Counted from the LIST, not from the facet count: this sheet renders the
  // search chip too, and the facet count deliberately excludes it. Sizing off
  // the facet count would print "2" over three chips — and, worse, hide the
  // whole sheet on a search with no facets, taking the only chip that can end
  // that search down with it.
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
