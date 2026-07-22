import { useEffect, useRef, useState } from "react";
import { useSetAtom } from "jotai";
import { X, SlidersHorizontal } from "lucide-react";
import {
  clearLibraryFiltersAtom,
  librarySelectedEntityIdAtom,
  librarySelectedClusterAtom,
} from "../../atoms/library";
import { useActiveFilters } from "../../hooks/useActiveFilters";

/** The active-filter readout in the action bar.
 *
 *  The Filters panel is the home of filters, but the drawer swaps it out for the
 *  entity preview — so while you're reading an entity there was NO way to see
 *  what was narrowing the results. This is that way: a popover listing every
 *  active filter, each removable on its own, without closing the entity you're
 *  looking at. "Open the Filters panel" is there when you want the full surface.
 *
 *  It sits in the footer, which is always mounted and whose height never changes,
 *  so none of this moves the results.
 *
 *  The list itself comes from `useActiveFilters` — shared with the sheet at the
 *  bottom of the Filters panel, so the two can't disagree about what's on. */
export function ActiveFiltersButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const clearAll = useSetAtom(clearLibraryFiltersAtom);
  const setSelectedId = useSetAtom(librarySelectedEntityIdAtom);
  const setSelectedCluster = useSetAtom(librarySelectedClusterAtom);
  const items = useActiveFilters();
  // The readout counts what the popover LISTS — facets plus the search. The
  // facet count excludes the search by design, and this button is the only
  // place a running search is reachable while the drawer shows an entity, so
  // hiding it on a search-only state would hide the search itself.
  const count = items.length;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (count === 0) return null;

  return (
    // `flex`, not a bare block: as a block, the inline-flex button below sits in
    // a LINE BOX and gets baseline-aligned, leaving room for descenders under it.
    // The wrapper measured 25px tall around a 20px button, so the button rode
    // 2.5px low and the count fell out of line with "Showing N of M" beside it.
    <div ref={ref} className="relative flex items-center">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 px-1.5 h-5 text-[11px] font-medium rounded-md
          transition-colors cursor-pointer ${
            open ? "bg-warm text-ink" : "text-ink-secondary hover:bg-warm hover:text-ink"
          }`}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: "var(--accent-blue)" }}
        />
        {count} {count === 1 ? "filter" : "filters"}
      </button>

      {open && (
        // Opens UPWARD — the button lives in the footer.
        <div
          role="dialog"
          aria-label="Active filters"
          className="absolute bottom-full mb-1.5 start-0 z-50 w-72 bg-paper border border-border rounded-md shadow-lg
            animate-fade-in-up overflow-hidden"
        >
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ borderBottom: "1px solid var(--border-soft)" }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
              Active filters
            </span>
            <button
              onClick={() => {
                clearAll();
                setOpen(false);
              }}
              className="ms-auto px-1.5 h-5 text-[11px] font-medium rounded text-ink-tertiary hover:bg-parchment hover:text-ink transition-colors cursor-pointer"
            >
              Clear all
            </button>
          </div>

          <ul className="max-h-64 overflow-auto py-1">
            {items.map((it) => (
              <li key={it.id}>
                {/* Full-width rows, so removing one can't shift the NEXT row
                    under the cursor sideways the way a wrapping chip row did —
                    the list only ever collapses downward. */}
                <div className="group flex items-center gap-2 px-3 py-1.5 hover:bg-warm transition-colors">
                  {it.color ? (
                    <span
                      className="w-1.5 h-1.5 rounded-[2px] shrink-0"
                      style={{ backgroundColor: it.color }}
                    />
                  ) : (
                    <span className="w-1.5 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] text-ink-tertiary leading-tight">
                      {it.group}
                    </span>
                    <span className="block text-xs text-ink truncate">{it.label}</span>
                  </span>
                  {/* Always visible: this is a list OF things to remove, so
                      hiding the remove until hover would be hiding the point. */}
                  <button
                    onClick={it.remove}
                    aria-label={`Remove ${it.group}: ${it.label}`}
                    className="shrink-0 p-1 rounded text-ink-muted hover:bg-parchment hover:text-ink
                      transition-colors cursor-pointer
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
                  >
                    <X size={12} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <button
            onClick={() => {
              setSelectedId(null);
              setSelectedCluster(null);
              setOpen(false);
            }}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium text-ink-secondary
              hover:bg-warm hover:text-ink transition-colors cursor-pointer"
            style={{ borderTop: "1px solid var(--border-soft)" }}
          >
            <SlidersHorizontal size={12} className="text-ink-tertiary" />
            Open the Filters panel
          </button>
        </div>
      )}
    </div>
  );
}
